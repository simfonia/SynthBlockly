import * as Tone from 'tone';
import { log, logKey, getMsg, clearErrorLog } from '../ui/logger.js';
import { updateAdsrGraph, triggerAdsrOn, triggerAdsrOff } from '../ui/adsrVisualizer.js';
import { requestMidiAccess } from './midiEngine.js';

export let blocklyLoops = {}; // Initialize as an exported module variable

let audioStarted = false;

/**
 * Ensures the AudioContext is running. Must be called after a user interaction.
 * @returns {Promise<boolean>} True if the audio context is started, false otherwise.
 */
export async function ensureAudioStarted() {
    if (audioStarted) return true;
    try {
        await Tone.start();
        // Resume context if it was suspended
        try { 
            if (Tone.context && Tone.context.state === 'suspended') {
                await Tone.context.resume();
            }
        } catch (e) { /* ignore */ }
        audioStarted = true;
        clearErrorLog('AUDIO'); // 啟動成功，清除舊的「音訊未啟用」警告
        logKey('LOG_AUDIO_STARTED');
        return true;
    } catch (e) {
        logKey('LOG_AUDIO_START_FAIL', 'error', e);
        return false;
    }
}

// --- Initialize Audio Nodes ---

export const analyser = new Tone.Analyser('waveform', 1024);
analyser.toDestination(); // Connect analyser to the master output

// --- Effects ---
// Effects are now dynamically managed by the audioEngine.

// --- Instruments ---
let synth = new Tone.PolySynth(Tone.Synth);
const drum = new Tone.MembraneSynth();
const hh = new Tone.NoiseSynth({ volume: -12 });
const snare = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.005, decay: 0.2, sustain: 0 },
    volume: -5
});
const jazzKit = new Tone.Sampler({
    urls: {
        'C1': 'BT0A0D0.WAV', 'C#1': 'RIM127.WAV', 'D1': 'ST7T7S7.WAV', 'D#1': 'HANDCLP2.WAV',
        'E1': 'LTAD0.WAV', 'F1': 'HHCDA.WAV', 'F#1': 'MTAD0.WAV', 'G1': 'HTAD0.WAV',
        'G#1': 'CSHDA.WAV', 'A1': 'HHODA.WAV', 'A#1': 'RIDEDA.WAV',
    },
    baseUrl: import.meta.env.BASE_URL + 'samples/jazzkit/Roland_TR-909/',
    onload: () => {
        // Ensure localization is ready before logging, or fallback
        if (typeof Tone !== 'undefined') { // Simple check context
             setTimeout(() => {
                 logKey('LOG_JAZZKIT_LOADED');
             }, 500); // Slight delay to give registerAll a chance if samples load instantly
        }
    }
});

// --- Signal Chain ---
// Instruments are now chained to the analyser. The effect chain is built dynamically.
synth.chain(analyser);
drum.chain(analyser);
hh.chain(analyser);
snare.chain(analyser);
jazzKit.chain(analyser);


// --- Audio Engine Object ---

export const audioEngine = {
    isExecutionActive: false, // Flag to track if Blockly code execution is active
    currentADSR: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 1.0 },
    Tone: Tone,
    analyser: analyser, // Make analyser accessible on the global engine object
    synth: synth,
    drum: drum,
    hh: hh,
    snare: snare,
    jazzKit: jazzKit,
    effects: {},
    _activeEffects: [], // Internal array to track the current effect chain
    activeSFXPlayers: [], // Track active SFX players for stopping

    updateADSR: function(a, d, s, r) {
        this.currentADSR = { attack: a, decay: d, sustain: s, release: r };
        const isSampler = this.currentInstrumentName.toLowerCase().includes('sampler');
        updateAdsrGraph(a, d, s, r, isSampler);
    },

    rebuildEffectChain: function(effectsConfig = []) {
        // 1. Dispose of all previously active effects
        this._activeEffects.forEach(effect => {
            if (effect && typeof effect.dispose === 'function') {
                effect.dispose();
            }
        });
        this._activeEffects = [];
        logKey('LOG_EFFECT_CLEARED');

        // 2. Disconnect all instruments from their current output to prepare for re-chaining
        // Use a Set to ensure we don't process the same instrument twice (e.g., DefaultSynth)
        const instrumentSet = new Set([this.synth, this.drum, this.hh, this.snare, this.jazzKit, ...Object.values(this.instruments)]);
        const allInstruments = Array.from(instrumentSet).filter(Boolean);
        
        allInstruments.forEach(instr => {
            // For standard Tone.js instruments and our custom wrappers
            if (instr && typeof instr.disconnect === 'function') {
                instr.disconnect();
            }
        });
        
        // 3. Create new effect instances from the config
        try {
            effectsConfig.forEach(config => {
                if (!config || !config.type) return;

                let effectInstance;
                // Use a temporary object for params to avoid modifying the original config
                const params = { ...(config.params || {}) };

                switch (config.type) {
                    case 'distortion':
                        effectInstance = new Tone.Distortion(params);
                        break;
                    case 'reverb':
                        // Reverb constructor takes decay time, not an object
                        effectInstance = new Tone.Reverb(params.decay);
                        if (params.preDelay) effectInstance.preDelay = params.preDelay;
                        break;
                    case 'feedbackDelay': {
                        // --- Final Fallback: Manual Time Parsing (Expanded for Triplets) ---
                        let delayInSeconds;
                        const rawTime = params.delayTime || '8n'; 

                        if (!isNaN(parseFloat(rawTime)) && isFinite(rawTime)) {
                            delayInSeconds = parseFloat(rawTime);
                        } else if (typeof rawTime === 'string') {
                            try {
                                const bpm = (Tone.Transport && Tone.Transport.bpm && Tone.Transport.bpm.value) ? Tone.Transport.bpm.value : 120;
                                const quarterNoteTime = 60 / bpm;

                                let baseDuration;
                                const noteValue = parseInt(rawTime);

                                if (rawTime.includes('t')) { // Triplet
                                    baseDuration = (quarterNoteTime * (4 / noteValue)) * (2 / 3);
                                } else if (rawTime.includes('n')) { // Normal note
                                    baseDuration = quarterNoteTime * (4 / noteValue);
                                } else {
                                    // If no 'n' or 't', assume it's just a number in a string, but this case is mostly handled above.
                                    // However, as a fallback, we can treat it as seconds.
                                    delayInSeconds = parseFloat(rawTime);
                                }
                                
                                if(baseDuration) {
                                    delayInSeconds = baseDuration;
                                    // Handle dots
                                    if (rawTime.includes('.')) {
                                        delayInSeconds *= 1.5;
                                    }
                                }

                            } catch (e) {
                                logKey('LOG_TIME_PARSE_ERR', 'error', rawTime, e.message);
                                delayInSeconds = 0.25;
                            }
                        } else {
                            logKey('LOG_TIME_INVALID', 'error', rawTime);
                            delayInSeconds = 0.25;
                        }

                        if (isNaN(delayInSeconds) || delayInSeconds === undefined) {
                            logKey('LOG_TIME_INVALID', 'error', rawTime);
                            delayInSeconds = 0.25;
                        }
                        
                        effectInstance = new Tone.FeedbackDelay(delayInSeconds, params.feedback);
                        break;
                    }
                    case 'filter':
                        // Instantiate Filter with parameters from the config
                        effectInstance = new Tone.Filter({
                            type: params.type || 'lowpass',
                            frequency: params.frequency !== undefined ? params.frequency : 20000,
                            Q: params.Q !== undefined ? params.Q : 1,
                            rolloff: params.rolloff !== undefined ? params.rolloff : -12
                        });
                        break;
                    case 'compressor':
                        effectInstance = new Tone.Compressor(params);
                        break;
                    case 'limiter':
                        // Limiter constructor takes threshold in dB or an options object
                        effectInstance = new Tone.Limiter({
                            threshold: params.threshold !== undefined ? params.threshold : -6
                        });
                        break;
                    case 'bitCrusher':
                        effectInstance = new Tone.BitCrusher(params);
                        break;
                    case 'chorus':
                        effectInstance = new Tone.Chorus(params.frequency, params.delayTime, params.depth).start();
                        break;
                    case 'phaser':
                        effectInstance = new Tone.Phaser(params.frequency, params.octaves, params.baseFrequency);
                        break;
                    case 'autoPanner':
                        effectInstance = new Tone.AutoPanner(params.frequency, params.depth).start();
                        break;
                    default:
                        logKey('LOG_UNKNOWN_EFFECT', 'warning', config.type);
                        return;
                }
                
                // Set wet level for all applicable effects
                if (params.wet !== undefined && effectInstance.wet) {
                    effectInstance.wet.value = params.wet;
                }

                this._activeEffects.push(effectInstance);
            });
        } catch (e) {
            logKey('LOG_EFFECT_CHAIN_ERR', 'error', e.message);
            console.error(e);
            // Fallback to a clean chain if creation fails
            this._activeEffects = [];
        }

        // 4. Connect instruments to the new effect chain, ending at the analyser
        const chain = [...this._activeEffects, analyser];
        allInstruments.forEach(instr => {
            if (instr) {
                 // For standard Tone.js instruments and our custom additive synth
                if (typeof instr.chain === 'function') {
                    instr.chain(...chain);
                }
            }
        });
        logKey('LOG_EFFECT_CHAIN_REBUILT', 'info', this._activeEffects.length);
    },

    instruments: {},
    currentInstrumentName: 'DefaultSynth',
    currentSemitoneOffset: 0, // Tracks the current semitone adjustment
    pressedKeys: new Map(),
    chords: {},
    keyboardChordMap: {},
    midiChordMap: {},
    midiPressedNotes: new Map(),
    midiPlayingNotes: new Map(),
    backgroundNoise: null,

    log: log, // Original raw log function
    logKey: logKey,
    getMsg: getMsg,

    playBackgroundNoise: async function(type = 'white', volume = 0.1) {
        await ensureAudioStarted();
        this.stopBackgroundNoise(); // Stop any existing noise first
        try {
            this.backgroundNoise = new Tone.Noise(type).toDestination();
            this.backgroundNoise.volume.value = Tone.gainToDb(volume); // Convert linear gain to dB
            this.backgroundNoise.start();
            logKey('LOG_NOISE_STARTED', 'info', type, volume.toFixed(2));
        } catch (e) {
            logKey('LOG_NOISE_ERR', 'error', e.message);
            console.error(e);
        }
    },

    stopBackgroundNoise: function() {
        if (this.backgroundNoise) {
            try {
                this.backgroundNoise.stop();
                this.backgroundNoise.dispose();
                this.backgroundNoise = null;
                logKey('LOG_NOISE_STOPPED');
            } catch (e) {
                logKey('LOG_NOISE_STOP_ERR', 'error', e.message);
                console.error(e);
                this.backgroundNoise = null; // Ensure it's cleared even on error
            }
        }
    },

    createInstrument: function(name, type) {
        if (!name) {
            logKey('LOG_INSTR_NAME_EMPTY', 'error');
            return;
        }
        if (this.instruments[name]) {
            logKey('LOG_INSTR_EXISTS', 'warning', name);
            if (typeof this.instruments[name].dispose === 'function') {
                this.instruments[name].dispose();
            }
        }
        let newInstrument;
        try {
            switch(type) {
                case 'PolySynth':
                    newInstrument = new Tone.PolySynth(Tone.Synth);
                    break;
                case 'AMSynth':
                    newInstrument = new Tone.PolySynth(Tone.AMSynth);
                    break;
                case 'FMSynth':
                    newInstrument = new Tone.PolySynth(Tone.FMSynth);
                    break;
                case 'DuoSynth':
                    newInstrument = new Tone.PolySynth(Tone.DuoSynth);
                    break;
                case 'SineWave':
                    newInstrument = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sine' } });
                    break;
                case 'SquareWave':
                    newInstrument = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'square' } });
                    break;
                case 'TriangleWave':
                    newInstrument = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' } });
                    break;
                case 'SawtoothWave':
                    newInstrument = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sawtooth' } });
                    break;
                case 'Sampler':
                    newInstrument = new Tone.Sampler({
                        urls: { "C4": "C4.mp3" },
                        release: 1,
                        baseUrl: "https://tonejs.github.io/audio/salamander/"
                    });
                    newInstrument.onload = () => logKey('LOG_SAMPLER_LOADED', 'info', name);
                    break;
                default:
                    logKey('LOG_UNKNOWN_INSTR_TYPE', 'error', type);
                    return;
            }
            // All new instruments are chained through the active effect chain.
            newInstrument.chain(...this._activeEffects, analyser);
            this.instruments[name] = newInstrument;
            logKey('LOG_INSTR_CREATED', 'info', name, type);
        } catch (e) {
            logKey('LOG_INSTR_CREATE_FAIL', 'error', name, type, e.message);
            console.error(e);
        }
    },

    /**
     * Creates a custom wave instrument using partials for additive synthesis.
     * @param {string} name The name of the instrument.
     * @param {number[]} partialsArray An array of numbers representing harmonic amplitudes.
     */
    createCustomWaveInstrument: function(name, partialsArray) {
        if (!name) {
            logKey('LOG_CUSTOM_WAVE_NAME_EMPTY', 'error');
            return;
        }
        if (!Array.isArray(partialsArray) || partialsArray.length === 0) {
            logKey('LOG_PARTIALS_INVALID', 'error');
            return;
        }
        // Validate partialsArray elements are numbers
        if (partialsArray.some(isNaN)) {
            logKey('LOG_PARTIALS_NAN', 'error');
            return;
        }

        if (this.instruments[name]) {
            logKey('LOG_INSTR_EXISTS', 'warning', name);
            if (typeof this.instruments[name].dispose === 'function') {
                this.instruments[name].dispose();
            }
                        }
                
                        let newInstrument; // Declared here for proper scoping
                        try {
                            // Instantiate newInstrument as a Tone.PolySynth with OmniOscillator for custom partials
                            newInstrument = new Tone.PolySynth(Tone.Synth, {
                                oscillator: {
                                    type: 'custom',
                                    partials: partialsArray
                                }
                            });
            // New instruments are chained through the active effect chain.
            newInstrument.chain(...this._activeEffects, analyser);
            this.instruments[name] = newInstrument;
            logKey('LOG_CUSTOM_WAVE_CREATED', 'info', name, partialsArray.join(', '));
        } catch (e) {
            logKey('LOG_INSTR_CREATE_FAIL', 'error', name, 'CustomWave', e.message);
            console.error(e);
        }
    },

    createAdditiveInstrument: function(name, components) {
        if (!name) {
            logKey('LOG_ADDITIVE_NAME_EMPTY', 'error');
            return;
        }
        if (this.instruments[name]) {
            logKey('LOG_INSTR_EXISTS', 'warning', name);
            if (typeof this.instruments[name].dispose === 'function') {
                this.instruments[name].dispose();
            }
        }

        try {
            const polyphony = 8; // Max number of simultaneous voices
            const voices = [];

            // Pre-create the pool of voices
            for (let i = 0; i < polyphony; i++) {
                const envelope = new Tone.AmplitudeEnvelope({ attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.5 });
                const oscillators = [];
                components.forEach(comp => {
                    const osc = new Tone.Oscillator(0, "sine");
                    const gain = new Tone.Gain(comp.amp).connect(envelope);
                    osc.connect(gain);
                    oscillators.push({ osc: osc, freqRatio: comp.freqRatio });
                });
                voices.push({
                    note: null,
                    oscillators: oscillators,
                    envelope: envelope,
                    busy: false,
                    attackTime: 0
                });
            }

            const newInstrument = {
                type: 'AdditiveSynth',
                voices: voices,
                detune: new Tone.Signal(0), // Add a detune signal
                
                _findVoice: function(note) {
                    return this.voices.find(v => v.note === note && v.busy);
                },

                triggerAttack: function(note, time, velocity) {
                    time = time || Tone.now();
                    
                    let voiceToUse = this.voices.find(v => !v.busy);
                    if (!voiceToUse) {
                        voiceToUse = this.voices.sort((a, b) => a.attackTime - b.attackTime)[0];
                    }

                    voiceToUse.busy = true;
                    voiceToUse.note = note;
                    voiceToUse.attackTime = time;
                    
                    // Calculate frequency and apply detune
                    const baseFreq = new Tone.Frequency(note).toFrequency();
                    // detune is in cents (100 cents = 1 semitone)
                    const detuneMultiplier = Math.pow(2, this.detune.value / 1200);
                    const freq = baseFreq * detuneMultiplier;

                    voiceToUse.oscillators.forEach(item => {
                        item.osc.frequency.setValueAtTime(freq * item.freqRatio, time);
                        if (item.osc.state === 'stopped') {
                            item.osc.start(time);
                        }
                    });
                    voiceToUse.envelope.triggerAttack(time, velocity);
                },

                // --- Support ADSR and Detune via set method ---
                set: function(options) {
                    if (options.detune !== undefined) {
                        this.detune.value = options.detune;
                    }
                    // If options.envelope is passed, update all voice envelopes
                    if (options.envelope) {
                        this.voices.forEach(v => v.envelope.set(options.envelope));
                    }
                },

                triggerRelease: function(note, time) {
                    time = time || Tone.now();
                    const voiceToRelease = this._findVoice(note);
                    if (voiceToRelease) {
                        voiceToRelease.busy = false;
                        voiceToRelease.envelope.triggerRelease(time);
                        // Oscillators are stopped automatically by the envelope's release in this design
                    }
                },
                
                triggerAttackRelease: function(notes, duration, time, velocity) {
                    time = time || Tone.now();
                    this.triggerAttack(notes, time, velocity);
                    // Handle single note or array of notes for release
                    const notesArray = Array.isArray(notes) ? notes : [notes];
                    notesArray.forEach(note => {
                        this.triggerRelease(note, time + Tone.Time(duration).toSeconds());
                    });
                },

                chain: function(...args) {
                    this.voices.forEach(v => v.envelope.chain(...args));
                },

                disconnect: function() {
                    this.voices.forEach(v => v.envelope.disconnect());
                },

                dispose: function() {
                    this.voices.forEach(v => {
                        v.envelope.dispose();
                        v.oscillators.forEach(item => item.osc.dispose());
                    });
                }
            };
            
            // New instruments are chained through the active effect chain.
            newInstrument.chain(...this._activeEffects, analyser);
            this.instruments[name] = newInstrument;
            logKey('LOG_ADDITIVE_CREATED', 'info', name);

        } catch(e) {
            logKey('LOG_ADDITIVE_CREATE_FAIL', 'error', name, e.message);
            console.error(e);
        }
    },

    createCustomSampler: function(name, urls, baseUrl, envelopeSettings = null) {
        if (!name) {
            logKey('LOG_SAMPLER_NAME_EMPTY', 'error');
            return;
        }
        if (this.instruments[name]) {
            logKey('LOG_INSTR_EXISTS', 'warning', name);
            if (typeof this.instruments[name].dispose === 'function') {
                this.instruments[name].dispose();
            }
        }

        try {
            const defaultEnvelope = { // Default envelope if none provided
                attack: 0.01,
                decay: 0.1,
                sustain: 1.0,
                release: 0.5,
            };

            const sampler = new Tone.Sampler({
                urls: urls,
                baseUrl: baseUrl || '',
                volume: 0,
                attack: 0.01,
                release: 0.5,
                curve: 'exponential',
                onload: () => {
                    instrumentWrapper.loaded = true;
                    logKey('LOG_SAMPLER_SAMPLES_LOADED', 'info', name);
                },
                onerror: (e) => {
                    logKey('LOG_SAMPLER_SAMPLES_ERR', 'error', name, e);
                }
            });

            // Store the sampler
            const instrumentWrapper = {
                type: 'CustomSampler',
                sampler: sampler,
                loaded: false, 
                
                // --- Playback methods for the wrapper ---
                triggerAttack: function(notes, time, velocity) {
                    if (this.sampler && this.loaded) {
                        this.sampler.triggerAttack(notes, time, velocity); 
                    } else {
                        logKey('LOG_SAMPLER_NOT_LOADED', 'warning', name);
                    }
                },
                triggerRelease: function(notes, time) {
                    if (this.sampler && this.loaded) {
                        this.sampler.triggerRelease(notes, time);
                    }
                },
                triggerAttackRelease: function(notes, duration, time, velocity) {
                    if (this.sampler && this.loaded) {
                        this.sampler.triggerAttackRelease(notes, duration, time, velocity);
                    }
                    else {
                        logKey('LOG_SAMPLER_NOT_LOADED', 'warning', name);
                    }
                },

                // --- Configuration methods ---
                set: function(options) {
                    if (options.attack !== undefined) this.sampler.attack = options.attack;
                    if (options.release !== undefined) this.sampler.release = options.release;
                    if (options.volume !== undefined && this.sampler.volume) {
                        this.sampler.volume.value = options.volume;
                    }
                    if (options.detune !== undefined && this.sampler.detune) {
                        this.sampler.detune.value = options.detune;
                    }
                },
                chain: function(...args) {
                    this.sampler.chain(...args);
                },
                disconnect: function() {
                    if (this.sampler) this.sampler.disconnect();
                },
                dispose: function() {
                    if (this.sampler) this.sampler.dispose();
                }
            };
            
            // Chain the sampler directly
            instrumentWrapper.chain(...this._activeEffects, analyser);
            this.instruments[name] = instrumentWrapper;
            logKey('LOG_SAMPLER_CREATED', 'info', name);

        } catch (e) {
            logKey('LOG_SAMPLER_CREATE_FAIL', 'error', name, e.message);
            console.error(e);
        }
    },

    transitionToInstrument: function(newInstrumentName) {
        if (!this.instruments[newInstrumentName]) {
            logKey('LOG_SWITCH_INSTR_NOT_EXIST', 'error', newInstrumentName);
            return;
        }

        const oldInstrumentName = this.currentInstrumentName;
        if (oldInstrumentName === newInstrumentName) return; // No change

        const oldInstrument = this.instruments[oldInstrumentName];
        const newInstrument = this.instruments[newInstrumentName];

        // 1. SILENCE OLD INSTRUMENT: Release all notes currently being tracked
        if (oldInstrument) {
            // For MIDI notes
            this.midiPlayingNotes.forEach((notes, midiNoteNumber) => {
                if (typeof oldInstrument.triggerRelease === 'function') {
                    oldInstrument.triggerRelease(notes, Tone.now());
                }
            });

            // For PC keyboard notes
            this.pressedKeys.forEach((notes, keyCode) => {
                if (typeof oldInstrument.triggerRelease === 'function') {
                    oldInstrument.triggerRelease(notes, Tone.now());
                }
            });
            
            // If it's a PolySynth, use releaseAll for a clean sweep
            if (typeof oldInstrument.releaseAll === 'function') {
                oldInstrument.releaseAll();
            }
        }

        // 2. SWITCH IDENTITY
        this.currentInstrumentName = newInstrumentName;

        // 3. TRIGGER NEW INSTRUMENT: Resume notes if needed, or just clear state
        // To prevent 'ghost' notes from lingering, we clear the internal pressed maps
        // so the user must re-press keys to hear the new instrument. 
        // This is more robust than trying to transfer active voices.
        this.clearPressedKeys(); 

        if (!oldInstrument) {
            logKey('LOG_SWITCHED_TO', 'important', newInstrumentName);
            this.syncAdsrToUI();
            return;
        }

        // Apply current semitone offset to the new instrument
        if (newInstrument && newInstrument.set) {
            const targetDetune = this.currentSemitoneOffset * 100;
            newInstrument.set({ detune: targetDetune });
            logKey('LOG_DETUNE_APPLIED', 'important', targetDetune, newInstrumentName);
        } else {
            logKey('LOG_DETUNE_NOT_SUPPORTED', 'warning', newInstrumentName);
        }

        logKey('LOG_SWITCHED_TO', 'important', newInstrumentName);

        // --- SYNC ADSR VISUALIZER ---
        this.syncAdsrToUI();
    },

    /**
     * Reads current ADSR values from the active instrument and updates the visualizer.
     */
    syncAdsrToUI: function() {
        const instr = this.instruments[this.currentInstrumentName];
        if (!instr) return;

        let a = 0.01, d = 0.1, s = 1.0, r = 0.5;

        try {
            if (this.currentInstrumentName.toLowerCase().includes('sampler') || instr.type === 'CustomSampler' || instr.name === 'Sampler') {
                // For Samplers, read native attack/release
                const sampler = instr.sampler || instr;
                a = sampler.attack !== undefined ? sampler.attack : 0;
                r = sampler.release !== undefined ? sampler.release : 0.5;
                d = 0; s = 1.0; // Fixed for samplers
            } else {
                // For Synths, try to get envelope settings
                // Handle different nesting levels of Tone.js instruments
                const env = instr.envelope || (instr.get?.().envelope) || (instr.get?.().voice0?.envelope);
                if (env) {
                    a = env.attack;
                    d = env.decay;
                    s = env.sustain;
                    r = env.release;
                }
            }
            // Update the internal state and the graph
            this.currentADSR = { attack: a, decay: d, sustain: s, release: r };
            const isSampler = this.currentInstrumentName.toLowerCase().includes('sampler');
            updateAdsrGraph(a, d, s, r, isSampler);
        } catch (e) {
            console.warn('Failed to sync ADSR to UI:', e);
        }
    },

    playKick: async function(velocity = 1, time = Tone.now()) {
        const ok = await ensureAudioStarted();
        if (!ok) return;
        this.drum.triggerAttackRelease('C2', '8n', time, velocity);
    },

    playSnare: async function(velocity = 1, time = Tone.now()) {
        const ok = await ensureAudioStarted();
        if (!ok) return;
        this.snare.triggerAttackRelease('8n', time, velocity);
    },

    playJazzKitNote: async function(drumNote, velocityOverride, time, contextNote, contextVelocity) {
        const ok = await ensureAudioStarted();
        if (!ok) return;
        const finalVelocity = velocityOverride !== null ? velocityOverride : (contextVelocity !== null ? contextVelocity : 1);
        logKey('LOG_JAZZKIT_PLAY', 'info', drumNote, finalVelocity.toFixed(2));
        this.jazzKit.triggerAttackRelease(drumNote, '8n', time, finalVelocity);
    },

    /**
     * Plays a sound effect (SFX) from a URL.
     * @param {string} url The URL of the sound file.
     * @param {object} options Options: { reverse: boolean, playbackRate: number, volume: number }
     */
    playSFX: async function(url, options = {}) {
        const ok = await ensureAudioStarted();
        if (!ok || !this.isExecutionActive) return;

        // Default options
        const reverse = options.reverse || false;
        const playbackRate = options.playbackRate || 1;
        const volume = options.volume !== undefined ? options.volume : 1; // 0-1 linear gain

        try {
            this.logKey('LOG_SFX_LOADING', 'info', url);
            
            // Create a new Player for this one-shot
            const player = new Tone.Player({
                url: url,
                loop: false,
                autostart: false,
                onload: () => {
                    this.logKey('LOG_SFX_PLAYING', 'info', url);
                    // Check if execution is still active before starting
                    if (!this.isExecutionActive) {
                        player.dispose();
                        return;
                    }
                    player.start();
                },
                onerror: (e) => {
                    this.logKey('LOG_SFX_LOAD_ERR', 'error', url, e);
                    const idx = this.activeSFXPlayers.indexOf(player);
                    if (idx > -1) this.activeSFXPlayers.splice(idx, 1);
                    player.dispose();
                },
                onstop: () => {
                    // Cleanup after playback
                    const idx = this.activeSFXPlayers.indexOf(player);
                    if (idx > -1) this.activeSFXPlayers.splice(idx, 1);
                    player.dispose();
                }
            });

            // Track this player
            this.activeSFXPlayers.push(player);

            // Apply settings
            player.reverse = reverse;
            player.playbackRate = playbackRate;
            player.volume.value = Tone.gainToDb(volume);

            // Connect to effects chain
            player.chain(...this._activeEffects, analyser);

        } catch (e) {
            this.logKey('LOG_SFX_ERR', 'error', e.message);
            console.error(e);
        }
    },

    updateFilter: function(freq, q) {
        const filterEffect = this._activeEffects.find(e => e instanceof this.Tone.Filter);
        if (filterEffect) {
            if (freq !== undefined) filterEffect.frequency.value = freq;
            if (q !== undefined) filterEffect.Q.value = q;
        }
    },

    clearPressedKeys: function() {

        this.pressedKeys.clear();
        this.midiPressedNotes.clear();
        this.midiPlayingNotes.clear();
        logKey('LOG_STATE_CLEARED');
    },

    playCurrentInstrumentNote: async function(note, dur, time, velocity) {
        const ok = await ensureAudioStarted();
        if (!ok) return; // Removed !this.isExecutionActive check to allow UI testing
        const currentInstrument = this.instruments[this.currentInstrumentName];
        if (currentInstrument && currentInstrument.triggerAttackRelease) {
            if (currentInstrument instanceof Tone.Sampler && !currentInstrument.loaded) {
                logKey('LOG_SAMPLER_NOT_LOADED', 'warning', this.currentInstrumentName);
                return;
            }
            // Trigger visual
            triggerAdsrOn();
            const durSeconds = Tone.Time(dur).toSeconds();
            setTimeout(() => triggerAdsrOff(), durSeconds * 1000);

            currentInstrument.triggerAttackRelease(note, dur, time, velocity);
        } else {
            logKey('LOG_PLAY_NOTE_FAIL', 'error', this.currentInstrumentName);
        }
    },

    /**
     * Parses and plays a melody string sequentially.
     * Format: "C4Q, D4H, RE" (Note+Octave+Duration, or R+Duration for rest)
     * Durations: W=1m, H=2n, Q=4n, E=8n, S=16n, T=32n. 
     * Supports '.' for dotted and '_T' for triplet.
     * @param {string} melodyStr The melody string to play.
     */
    playMelodyString: async function(melodyStr) {
        const ok = await ensureAudioStarted();
        if (!ok || !this.isExecutionActive) return;

        const durMap = { 'W': '1m', 'H': '2n', 'Q': '4n', 'E': '8n', 'S': '16n', 'T': '32n' };
        
        // Robust splitting: Replace commas, newlines, and carriage returns with spaces first
        const cleanStr = melodyStr.replace(/[,\r\n]/g, ' ');
        const notes = cleanStr.split(/\s+/).map(s => s.trim()).filter(s => s.length > 0);

        for (const noteStr of notes) {
            if (!this.isExecutionActive) break;

            // Regex: (Rest R)? (Pitch+Accidental)? (Octave)? (Duration) (Dotted .)? (Triplet _T)?
            const match = noteStr.match(/^(R)?([A-G][#b]?)?([0-8])?([WHQEST])(\.?|_T)?$/i);
            
            if (match) {
                const isRest = !!match[1];
                let pitch = match[2] ? match[2].toUpperCase() : null;
                let octave = match[3] ? match[3] : "4";
                let durChar = match[4].toUpperCase();
                let suffix = match[5] ? match[5].toUpperCase() : "";

                let toneDur = durMap[durChar] || '4n';
                if (suffix === '.') toneDur += '.';
                if (suffix === '_T') toneDur = toneDur.replace('n', 't');

                if (isRest) {
                    // Wait for the duration of the rest
                    await new Promise(resolve => setTimeout(resolve, Tone.Time(toneDur).toMilliseconds()));
                } else {
                    const fullNote = pitch ? (pitch + octave) : ("C" + octave);
                    // Play note
                    this.playCurrentInstrumentNote(fullNote, toneDur, Tone.now(), 0.8);
                    // Wait for duration
                    await new Promise(resolve => setTimeout(resolve, Tone.Time(toneDur).toMilliseconds()));
                }
            } else {
                logKey('LOG_MELODY_PARSE_ERR', 'warning', noteStr);
            }
        }
    },

    midiAttack: async function(midiNoteNumber, velocityNormalized = 1, channel) {
        const ok = await ensureAudioStarted();
        if (!ok) return;

        const currentInstrument = this.instruments[this.currentInstrumentName];
        if (!currentInstrument || !currentInstrument.triggerAttack || !currentInstrument.triggerRelease) {
            logKey('LOG_MIDI_PLAY_FAIL', 'error', this.currentInstrumentName);
            return;
        }
        if (currentInstrument instanceof Tone.Sampler && !currentInstrument.loaded) {
            logKey('LOG_SAMPLER_NOT_LOADED', 'warning', this.currentInstrumentName);
            return;
        }

        const chordName = this.midiChordMap[midiNoteNumber];
        let notesToPlay = null;
        let notePlayedType = 'Single';

        if (chordName) {
            notesToPlay = this.chords[chordName];
            notePlayedType = 'Chord';
            if (!notesToPlay) {
                logKey('LOG_CHORD_UNDEFINED', 'error', chordName);
                return;
            }
        } else {
            notesToPlay = Tone.Midi(midiNoteNumber).toNote();
        }

        if (notesToPlay) {
            try {
                // Trigger visual
                triggerAdsrOn();
                currentInstrument.triggerAttack(notesToPlay, Tone.now(), velocityNormalized);
            } catch (e) {
                logKey('LOG_MIDI_PLAY_FAIL', 'error', this.currentInstrumentName + ": " + e.message);
                console.error(e);
            }
            this.midiPlayingNotes.set(midiNoteNumber, notesToPlay);
            logKey('LOG_MIDI_ON', 'info', notePlayedType, midiNoteNumber, (velocityNormalized*127).toFixed(0), channel, Array.isArray(notesToPlay) ? notesToPlay.join(', ') : notesToPlay);
        }
    },

    midiRelease: async function(midiNoteNumber) {
        const ok = await ensureAudioStarted();
        if (!ok) return;
        const currentInstrument = this.instruments[this.currentInstrumentName];
        if (!currentInstrument || !currentInstrument.triggerRelease) {
            logKey('LOG_MIDI_PLAY_FAIL', 'warning', this.currentInstrumentName);
            return;
        }
        if (currentInstrument instanceof Tone.Sampler && !currentInstrument.loaded) {
            logKey('LOG_SAMPLER_NOT_LOADED', 'warning', this.currentInstrumentName);
            return;
        }
        const notesToRelease = this.midiPlayingNotes.get(midiNoteNumber);
        if (notesToRelease) {
            // Trigger visual
            triggerAdsrOff();
            currentInstrument.triggerRelease(notesToRelease, Tone.now());
            this.midiPlayingNotes.delete(midiNoteNumber);
        }
    },

    /**
     * Resets the entire audio engine state, stopping all sounds, disposing of instruments and effects,
     * and clearing all mappings and loops. This should be called before loading a new project or running new code.
     */
    resetAudioEngineState: function() {
        this.isExecutionActive = false; // Mark execution as INACTIVE to stop async loops
        logKey('LOG_RESETTING_ENGINE');
        this.stopBackgroundNoise(); // Stop any background noise
        
        // Stop the transport and immediately cancel all scheduled events on the timeline
        this.Tone.Transport.stop();
        this.Tone.Transport.cancel(0); // Explicitly cancel from the beginning
        this.Tone.Transport.seconds = 0; // Reset position to 0
        logKey('LOG_TRANSPORT_STOPPED');

        // Reset Visualizer
        this.updateADSR(0.01, 0.1, 0.5, 1.0);
        triggerAdsrOff(); // Ensure playhead is idle

        // Stop all active SFX players
        this.activeSFXPlayers.forEach(player => {
            try {
                player.stop();
                player.dispose();
            } catch (e) { /* ignore */ }
        });
        this.activeSFXPlayers = [];

        // Disconnect and release all instruments
        const instrumentSet = new Set([this.synth, this.drum, this.hh, this.snare, this.jazzKit, ...Object.values(this.instruments)]);
        instrumentSet.forEach(instr => {
            if (instr) {
                if (typeof instr.releaseAll === 'function') {
                    try { instr.releaseAll(); } catch(e) {}
                }
                if (typeof instr.disconnect === 'function') {
                    try { instr.disconnect(); } catch(e) {}
                }
            }
        });

        // Dispose of all custom instruments (except DefaultSynth which we handle specially)
        for (const instrName in this.instruments) {
            if (this.instruments.hasOwnProperty(instrName) && instrName !== 'DefaultSynth') {
                const instrument = this.instruments[instrName];
                if (instrument && typeof instrument.dispose === 'function') {
                    try { instrument.dispose(); } catch(e) {}
                }
                delete this.instruments[instrName];
            }
        }
            // Re-initialize DefaultSynth if it was disposed or needs resetting
            if (this.instruments['DefaultSynth'] && typeof this.instruments['DefaultSynth'].dispose === 'function') {
                try { this.instruments['DefaultSynth'].dispose(); } catch(e) {}
            }
            // Create a BRAND NEW DefaultSynth instance
            synth = new Tone.PolySynth(Tone.Synth);
            synth.chain(analyser); // Chain to analyser so 'Test Note' works immediately
            this.synth = synth;
            this.instruments['DefaultSynth'] = synth;
            this.currentInstrumentName = 'DefaultSynth';
            logKey('LOG_INSTR_RESET');

        if (blocklyLoops) {
            for (const loopId in blocklyLoops) {
                if (blocklyLoops.hasOwnProperty(loopId) && blocklyLoops[loopId] instanceof this.Tone.Loop) {
                    window.blocklyLoops[loopId].dispose();
                }
            }
            blocklyLoops = {}; // Clear the loops object
            logKey('LOG_LOOPS_CLEARED');
        }

        // Clear all mappings and chord definitions
            this.chords = {};
            this.keyboardChordMap = {};
            this.midiChordMap = {};
            this.clearPressedKeys(); // Also clears midiPressedNotes and midiPlayingNotes
            logKey('LOG_MAPPINGS_CLEARED');
        
            // Clear active effects but don't rebuild the chain (don't re-connect instruments)
            this._activeEffects.forEach(effect => {
                if (effect && typeof effect.dispose === 'function') {
                    try { effect.dispose(); } catch(e) {}
                }
            });
            this._activeEffects = [];
            
            this.currentSemitoneOffset = 0; // Reset semitone offset
            logKey('LOG_ENGINE_RESET_DONE');
            },
    panicStopAllSounds: function() {
        logKey('LOG_PANIC_STOP');
        this.resetAudioEngineState();
        logKey('LOG_PANIC_DONE');
    },
};

/**
 * Attaches a pointerdown listener to the document body to start the AudioContext on first user interaction.
 */
export function startAudioOnFirstInteraction() {
    const oneStart = async function () {
        const ok = await ensureAudioStarted();
        if (ok) {
            requestMidiAccess(); // 自動嘗試連線 MIDI
        }
        document.body.removeEventListener('pointerdown', oneStart);
    };
    document.body.addEventListener('pointerdown', oneStart, { passive: true });
}

// Initialize default instrument and add it to the instruments map
audioEngine.instruments['DefaultSynth'] = synth;
audioEngine.currentInstrumentName = 'DefaultSynth';

// Expose to window so that Blockly-generated code can use it.
// This is a necessary evil for the current code generation strategy.
window.audioEngine = audioEngine;
window.blocklyLoops = blocklyLoops;