// js/core/audioEngine.js
import * as Tone from 'tone';
import { log } from '../ui/logger.js';

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
        log('AudioContext 已啟動');
        return true;
    } catch (e) {
        log('無法啟動 AudioContext: ' + e);
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
        log('Jazz Kit samples loaded.');
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
    Tone: Tone,
    analyser: analyser, // Make analyser accessible on the global engine object
    synth: synth,
    drum: drum,
    hh: hh,
    snare: snare,
    jazzKit: jazzKit,
    effects: {},
    _activeEffects: [], // Internal array to track the current effect chain

    rebuildEffectChain: function(effectsConfig = []) {
        // 1. Dispose of all previously active effects
        this._activeEffects.forEach(effect => {
            if (effect && typeof effect.dispose === 'function') {
                effect.dispose();
            }
        });
        this._activeEffects = [];
        this.log('舊效果器鏈已清除。');

        // 2. Disconnect all instruments from their current output to prepare for re-chaining
        const allInstruments = [this.synth, this.drum, this.hh, this.snare, this.jazzKit, ...Object.values(this.instruments)];
        allInstruments.forEach(instr => {
            // For standard Tone.js instruments and our custom additive synth
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
                    case 'feedbackDelay':
                        // FeedbackDelay constructor takes delay time and feedback ratio
                        effectInstance = new Tone.FeedbackDelay(params.delayTime, params.feedback);
                        break;
                    case 'filter':
                        effectInstance = new Tone.Filter(params.frequency, params.type || 'lowpass');
                        if (params.Q) effectInstance.Q.value = params.Q;
                        if (params.rolloff) effectInstance.rolloff = params.rolloff;
                        break;
                    case 'compressor':
                        effectInstance = new Tone.Compressor(params);
                        break;
                    case 'limiter':
                        // Limiter constructor takes threshold in dB
                        effectInstance = new Tone.Limiter(params.threshold);
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
                        this.log(`警告: 未知的效果器類型 "${config.type}"。`);
                        return;
                }
                
                // Set wet level for all applicable effects
                if (params.wet !== undefined && effectInstance.wet) {
                    effectInstance.wet.value = params.wet;
                }

                this._activeEffects.push(effectInstance);
            });
        } catch (e) {
            this.log(`創建效果器鏈時出錯: ${e.message}`);
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
        this.log(`已重建效果器鏈，包含 ${this._activeEffects.length} 個效果器。`);
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

    log: log, // Use the imported log function

    playBackgroundNoise: async function(type = 'white', volume = 0.1) {
        await ensureAudioStarted();
        this.stopBackgroundNoise(); // Stop any existing noise first
        try {
            this.backgroundNoise = new Tone.Noise(type).toDestination();
            this.backgroundNoise.volume.value = Tone.gainToDb(volume); // Convert linear gain to dB
            this.backgroundNoise.start();
            this.log(`背景雜訊 (${type}) 已開始播放，音量 ${volume.toFixed(2)}。`);
        } catch (e) {
            this.log(`播放背景雜訊時出錯: ${e.message}`);
            console.error(e);
        }
    },

    stopBackgroundNoise: function() {
        if (this.backgroundNoise) {
            try {
                this.backgroundNoise.stop();
                this.backgroundNoise.dispose();
                this.backgroundNoise = null;
                this.log('背景雜訊已停止。');
            } catch (e) {
                this.log(`停止背景雜訊時出錯: ${e.message}`);
                console.error(e);
                this.backgroundNoise = null; // Ensure it's cleared even on error
            }
        }
    },

    createInstrument: function(name, type) {
        if (!name) {
            this.log('錯誤: 樂器名稱不能為空。');
            return;
        }
        if (this.instruments[name]) {
            this.log(`警告: 樂器 "${name}" 已存在，將被覆蓋。`);
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
                case 'Sampler':
                    newInstrument = new Tone.Sampler({
                        urls: { "C4": "C4.mp3" },
                        release: 1,
                        baseUrl: "https://tonejs.github.io/audio/salamander/"
                    });
                    newInstrument.onload = () => this.log(`樂器 "${name}" (Sampler) 樣本已載入。`);
                    break;
                default:
                    this.log(`錯誤: 未知的樂器類型 "${type}"。`);
                    return;
            }
            // All new instruments are chained through the active effect chain.
            newInstrument.chain(...this._activeEffects, analyser);
            this.instruments[name] = newInstrument;
            this.log(`成功創建樂器 "${name}" (${type})。`);
        } catch (e) {
            this.log(`創建樂器 "${name}" (${type}) 失敗: ${e.message}`);
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
            this.log('錯誤: 自訂波形樂器名稱不能為空。');
            return;
        }
        if (!Array.isArray(partialsArray) || partialsArray.length === 0) {
            this.log('錯誤: 泛音陣列無效，必須是非空的數字陣列。');
            return;
        }
        // Validate partialsArray elements are numbers
        if (partialsArray.some(isNaN)) {
            this.log('錯誤: 泛音陣列中包含非數字值。');
            return;
        }

        if (this.instruments[name]) {
            this.log(`警告: 樂器 "${name}" 已存在，將被覆蓋。`);
            if (typeof this.instruments[name].dispose === 'function') {
                this.instruments[name].dispose();
            }
                        }
                
                        let newInstrument; // Declared here for proper scoping
                        try {
                            // Instantiate newInstrument as a Tone.PolySynth with OmniOscillator for custom partials
                            newInstrument = new Tone.PolySynth(Tone.Synth, {
                                oscillator: {
                                    partials: partialsArray
                                }
                            });
            // New instruments are chained through the active effect chain.
            newInstrument.chain(...this._activeEffects, analyser);
            this.instruments[name] = newInstrument;
            this.log(`成功創建自訂波形樂器 "${name}"，泛音: [${partialsArray.join(', ')}]。`);
        } catch (e) {
            this.log(`創建自訂波形樂器 "${name}" 失敗: ${e.message}`);
            console.error(e);
        }
    },

    createAdditiveInstrument: function(name, components) {
        if (!name) {
            this.log('錯誤: 加法合成器名稱不能為空。');
            return;
        }
        if (this.instruments[name]) {
            this.log(`警告: 樂器 "${name}" 已存在，將被覆蓋。`);
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
                voices: voices,
                
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
                    
                    const freq = new Tone.Frequency(note).toFrequency();

                    voiceToUse.oscillators.forEach(item => {
                        item.osc.frequency.setValueAtTime(freq * item.freqRatio, time);
                        if (item.osc.state === 'stopped') {
                            item.osc.start(time);
                        }
                    });
                    voiceToUse.envelope.triggerAttack(time, velocity);
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
            this.log(`成功創建加法合成器 "${name}"。`);

        } catch(e) {
            this.log(`創建加法合成器 "${name}" 失敗: ${e.message}`);
            console.error(e);
        }
    },

    createCustomSampler: function(name, urls, baseUrl, envelopeSettings = null) {
        if (!name) {
            this.log('Error: Custom sampler name cannot be empty.');
            return;
        }
        if (this.instruments[name]) {
            this.log(`Warning: Instrument "${name}" already exists and will be overwritten.`);
            if (typeof this.instruments[name].dispose === 'function') {
                this.instruments[name].dispose();
            }
        }

        try {
            const defaultEnvelope = { // Default envelope if none provided
                attack: 0.01,
                decay: 0.2,
                sustain: 0.5,
                release: 1.0,
            };

            const sampler = new Tone.Sampler({
                urls: urls,
                baseUrl: baseUrl || '',
                volume: 6, // Increased to boost the sampler's output volume by 10dB
                release: 0, // Ensure sampler itself has no long release, controlled by its internal envelope
                envelope: envelopeSettings || defaultEnvelope, // Use provided settings or default
                onload: () => {
                    instrumentWrapper.loaded = true;
                    // Sampler will connect its internal voices to the main sampler output
                    // and then the sampler output chains to the effects.
                    audioEngine.log(`Custom sampler "${name}" samples loaded successfully.`);
                },
                onerror: (e) => {
                    audioEngine.log(`Error loading samples for custom sampler "${name}": ${e}`);
                }
            });

            // Store the sampler
            const instrumentWrapper = {
                type: 'CustomSampler',
                sampler: sampler,
                loaded: false, // Sampler's own loaded status
                
                // --- Playback methods for the wrapper ---
                triggerAttack: function(notes, time, velocity) {
                    if (this.sampler && this.loaded) {
                        // Explicitly release any currently playing instances of these notes to prevent stacking
                        this.sampler.triggerRelease(notes, time); 
                        this.sampler.triggerAttack(notes, time, velocity);
                    } else {
                        audioEngine.log(`Warning: Sampler "${name}" is not loaded yet.`);
                    }
                },
                triggerRelease: function(notes, time) {
                    if (this.sampler && this.loaded) {
                        // Rely on Sampler's internal envelope for release; do not call sampler.triggerRelease directly here.
                        // Sampler's internal envelope release is triggered by the lack of further triggerAttack calls.
                        // If we truly need to 'release' via the envelope for held notes,
                        // this is handled by the Sampler's internal envelope setting.
                        // The explicit `triggerRelease` on sampler is more for ending the sample source.
                        // Let's rely on the envelope's release param set in constructor.
                    }
                },
                triggerAttackRelease: function(notes, duration, time, velocity) {
                    if (this.sampler && this.loaded) {
                        // Explicitly release any currently playing instances of these notes to prevent stacking
                        this.sampler.triggerRelease(notes, time); 
                        this.sampler.triggerAttackRelease(notes, duration, time, velocity);
                    } else {
                        audioEngine.log(`Warning: Sampler "${name}" is not loaded yet.`);
                    }
                },

                // --- Configuration methods ---
                set: function(options) {
                    // Sampler's set method can take detune, volume, and envelope settings
                    this.sampler.set(options);
                    if (options.detune !== undefined) audioEngine.log('Warning: Custom samplers do not currently support global detune.'); // Already handled by sampler.set
                },
                chain: function(...args) {
                    this.sampler.chain(...args);
                },
                dispose: function() {
                    if (this.sampler) this.sampler.dispose();
                }
            };
            
            // Chain the sampler directly
            instrumentWrapper.chain(...this._activeEffects, analyser);
            this.instruments[name] = instrumentWrapper;
            this.log(`Successfully created custom sampler instrument "${name}".`);

        } catch (e) {
            this.log(`Failed to create custom sampler "${name}": ${e.message}`);
            console.error(e);
        }
    },

    transitionToInstrument: function(newInstrumentName) {
        if (!this.instruments[newInstrumentName]) {
            this.log(`錯誤: 無法切換，樂器 "${newInstrumentName}" 不存在。`);
            return;
        }

        const oldInstrumentName = this.currentInstrumentName;
        if (oldInstrumentName === newInstrumentName) return; // No change

        const oldInstrument = this.instruments[oldInstrumentName];
        const newInstrument = this.instruments[newInstrumentName];

        if (!oldInstrument) {
            // This case is unlikely if currentInstrumentName is managed properly, but as a fallback...
            this.currentInstrumentName = newInstrumentName;
            this.log(`已切換到樂器: ${newInstrumentName} (沒有舊樂器可供轉換)。`, 'instrument');
            return;
        }

        // For MIDI notes that are currently playing
        this.midiPlayingNotes.forEach((notes, midiNoteNumber) => {
            oldInstrument.triggerRelease(notes, Tone.now());
            // We need the original velocity, but we don't store it. Use a default for now.
            // This is a limitation to improve upon later if needed.
            const velocity = 0.8;
            newInstrument.triggerAttack(notes, Tone.now(), velocity);
        });

        // For PC keyboard notes that are currently held down
        this.pressedKeys.forEach((notes, keyCode) => {
            oldInstrument.triggerRelease(notes, Tone.now());
            const velocity = 0.7; // Default keyboard velocity
            newInstrument.triggerAttack(notes, Tone.now(), velocity);
        });

        // Apply current semitone offset to the new instrument
        if (newInstrument && newInstrument.set) { // Check only for the .set method, as it handles parameters robustly
            const targetDetune = this.currentSemitoneOffset * 100;
            newInstrument.set({ detune: targetDetune });
            this.log(`將當前半音偏移 (${targetDetune} 音分) 應用到新樂器 ${newInstrumentName}。`);
        } else {
            this.log(`警告: 樂器 "${newInstrumentName}" 不支援 detune 調整。`);
        }


        this.currentInstrumentName = newInstrumentName;
        this.log(`已切換到樂器: ${newInstrumentName}，並轉換了正在彈奏的音符。`, 'instrument');
    },

    playKick: async function(velocity = 1, time = Tone.now()) {
        const ok = await ensureAudioStarted();
        if (ok) this.drum.triggerAttackRelease('C2', '8n', time, velocity);
    },

    playSnare: async function(velocity = 1, time = Tone.now()) {
        const ok = await ensureAudioStarted();
        if (ok) this.snare.triggerAttackRelease('8n', time, velocity);
    },

    playJazzKitNote: async function(drumNote, velocityOverride, time, contextNote, contextVelocity) {
        const ok = await ensureAudioStarted();
        if (!ok) return;
        const finalVelocity = velocityOverride !== null ? velocityOverride : (contextVelocity !== null ? contextVelocity : 1);
        let logMessage = `Jazz Kit Play: note=${drumNote} vel=${finalVelocity.toFixed(2)}`;
        if (contextNote !== null) logMessage += ` (triggered by MIDI ${contextNote})`;
        this.log(logMessage);
        this.jazzKit.triggerAttackRelease(drumNote, '8n', time, finalVelocity);
    },

    clearPressedKeys: function() {
        this.pressedKeys.clear();
        this.midiPressedNotes.clear();
        this.midiPlayingNotes.clear();
        this.log('PC 鍵盤及 MIDI 按下狀態已清除。');
    },

    playCurrentInstrumentNote: async function(note, dur, time, velocity) {
        const ok = await ensureAudioStarted();
        if (!ok) return;
        const currentInstrument = this.instruments[this.currentInstrumentName];
        if (currentInstrument && currentInstrument.triggerAttackRelease) {
            if (currentInstrument instanceof Tone.Sampler && !currentInstrument.loaded) {
                this.log(`警告: 樂器 "${this.currentInstrumentName}" (Sampler) 樣本尚未載入。`);
                return;
            }
            currentInstrument.triggerAttackRelease(note, dur, time, velocity);
        } else {
            this.log(`錯誤: 無法播放音符。樂器 "${this.currentInstrumentName}" 不存在或不支持 triggerAttackRelease。`);
        }
    },

    midiAttack: async function(midiNoteNumber, velocityNormalized = 1, channel) {
        const ok = await ensureAudioStarted();
        if (!ok) return;

        const currentInstrument = this.instruments[this.currentInstrumentName];
        if (!currentInstrument || !currentInstrument.triggerAttack || !currentInstrument.triggerRelease) {
            this.log(`錯誤: MIDI 播放失敗。樂器 "${this.currentInstrumentName}" 不存在或不支持 triggerAttack/Release。`);
            return;
        }
        if (currentInstrument instanceof Tone.Sampler && !currentInstrument.loaded) {
            this.log(`警告: MIDI 播放失敗。樂器 "${this.currentInstrumentName}" (Sampler) 樣本尚未載入。`);
            return;
        }

        const chordName = this.midiChordMap[midiNoteNumber];
        let notesToPlay = null;
        let notePlayedType = 'Single';

        if (chordName) {
            notesToPlay = this.chords[chordName];
            notePlayedType = 'Chord';
            if (!notesToPlay) {
                this.log(`錯誤: 和弦 "${chordName}" 未定義。`);
                return;
            }
        } else {
            notesToPlay = Tone.Midi(midiNoteNumber).toNote();
        }

        if (notesToPlay) {
            try {
                currentInstrument.triggerAttack(notesToPlay, Tone.now(), velocityNormalized);
            } catch (e) {
                this.log(`triggerAttack failed for MIDI: ${e.message}`);
                console.error(e);
            }
            this.midiPlayingNotes.set(midiNoteNumber, notesToPlay);
            this.log(`MIDI In ON (${notePlayedType}): midi=${midiNoteNumber} vel=${(velocityNormalized*127).toFixed(0)} ch=${channel} -> ${Array.isArray(notesToPlay) ? notesToPlay.join(', ') : notesToPlay}`);
        }
    },

    midiRelease: async function(midiNoteNumber) {
        const ok = await ensureAudioStarted();
        if (!ok) return;
        const currentInstrument = this.instruments[this.currentInstrumentName];
        if (!currentInstrument || !currentInstrument.triggerRelease) {
            this.log(`警告: MIDI 釋放失敗。樂器 "${this.currentInstrumentName}" 不存在或不支持 triggerRelease。`);
            return;
        }
        if (currentInstrument instanceof Tone.Sampler && !currentInstrument.loaded) {
            this.log(`警告: MIDI 釋放失敗。樂器 "${this.currentInstrumentName}" (Sampler) 樣本尚未載入。`);
            return;
        }
        const notesToRelease = this.midiPlayingNotes.get(midiNoteNumber);
        if (notesToRelease) {
            currentInstrument.triggerRelease(notesToRelease, Tone.now());
            this.midiPlayingNotes.delete(midiNoteNumber);
        }
    },

    /**
     * Resets the entire audio engine state, stopping all sounds, disposing of instruments and effects,
     * and clearing all mappings and loops. This should be called before loading a new project or running new code.
     */
    resetAudioEngineState: function() {
        this.log('正在重設音訊引擎狀態...');
        this.stopBackgroundNoise(); // Stop any background noise
        this.Tone.Transport.stop();
        this.log('✓ 主時鐘 (Transport) 已停止');

        // Dispose of all custom instruments
        for (const instrName in this.instruments) {
            if (this.instruments.hasOwnProperty(instrName) && instrName !== 'DefaultSynth') {
                const instrument = this.instruments[instrName];
                // If the instrument has a releaseAll method (like PolySynth), call it.
                if (instrument && typeof instrument.releaseAll === 'function') {
                    instrument.releaseAll();
                }
                if (instrument && typeof instrument.dispose === 'function') {
                    instrument.dispose();
                }
                delete this.instruments[instrName];
            }
        }
            // Re-initialize DefaultSynth if it was disposed or needs resetting
            if (this.instruments['DefaultSynth'] && typeof this.instruments['DefaultSynth'].dispose === 'function') {
                this.instruments['DefaultSynth'].dispose(); // Dispose the old DefaultSynth
            }
            // Create a BRAND NEW DefaultSynth instance and update the top-level 'synth' variable
            synth = new Tone.PolySynth(Tone.Synth);
            synth.chain(analyser); // Re-chain it directly to the analyser
            this.instruments['DefaultSynth'] = synth; // Assign the NEW instance
            this.currentInstrumentName = 'DefaultSynth';
            this.log('✓ 所有自訂樂器已釋放並重設為預設。');

        if (blocklyLoops) {
            for (const loopId in blocklyLoops) {
                if (blocklyLoops.hasOwnProperty(loopId) && blocklyLoops[loopId] instanceof this.Tone.Loop) {
                    window.blocklyLoops[loopId].dispose();
                }
            }
            blocklyLoops = {}; // Clear the loops object
            this.log('✓ 所有 Blockly 循環已停止並清除。');
        }

        // Clear all mappings and chord definitions
            this.chords = {};
            this.keyboardChordMap = {};
            this.midiChordMap = {};
            this.clearPressedKeys(); // Also clears midiPressedNotes and midiPlayingNotes
            this.log('✓ 所有和弦、鍵盤及 MIDI 映射已清除。');
        
            // Reset the effect chain by rebuilding it with an empty configuration.
            this.rebuildEffectChain([]);
            this.currentSemitoneOffset = 0; // Reset semitone offset
            this.log('音訊引擎狀態重設完成。');
            },
    panicStopAllSounds: function() {
        this.log('緊急停止！正在停止所有聲音並重設狀態...');
        this.resetAudioEngineState();
        this.log('緊急停止完成。');
    },
};

/**
 * Attaches a pointerdown listener to the document body to start the AudioContext on first user interaction.
 */
export function startAudioOnFirstInteraction() {
    const oneStart = async function () {
        await ensureAudioStarted();
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
