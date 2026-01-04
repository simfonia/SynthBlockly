import * as Tone from 'tone';
import { log, logKey, getMsg, clearErrorLog } from '../ui/logger.js';
import { updateAdsrGraph, triggerAdsrOn, triggerAdsrOff } from '../ui/adsrVisualizer.js';
import { requestMidiAccess } from './midiEngine.js';

export let blocklyLoops = {}; 

let audioStarted = false;

export async function ensureAudioStarted() {
    if (audioStarted) return true;
    try {
        await Tone.start();
        if (Tone.context && Tone.context.state === 'suspended') {
            await Tone.context.resume();
        }
        audioStarted = true;
        clearErrorLog('AUDIO');
        logKey('LOG_AUDIO_STARTED');
        return true;
    } catch (e) {
        logKey('LOG_AUDIO_START_FAIL', 'error', e);
        return false;
    }
}

export const analyser = new Tone.Analyser('waveform', 1024);
analyser.toDestination();

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
        if (typeof Tone !== 'undefined') {
             setTimeout(() => { logKey('LOG_JAZZKIT_LOADED'); }, 500);
        }
    }
});

synth.chain(analyser);
drum.chain(analyser);
hh.chain(analyser);
snare.chain(analyser);
jazzKit.chain(analyser);

export const audioEngine = {
    isExecutionActive: false,
    currentADSR: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 1.0 },
    Tone: Tone,
    analyser: analyser,
    synth: synth,
    drum: drum,
    hh: hh,
    snare: snare,
    jazzKit: jazzKit,
    effects: {},
    _activeEffects: [],
    activeSFXPlayers: [],
    instruments: {},
    layeredInstruments: {},
    currentInstrumentName: 'DefaultSynth',
    currentSemitoneOffset: 0,
    pressedKeys: new Map(),
    chords: {},
    keyboardChordMap: {},
    midiChordMap: {},
    midiPressedNotes: new Map(),
    midiPlayingNotes: new Map(),
    backgroundNoise: null,
    log: log,
    logKey: logKey,
    getMsg: getMsg,

    getTransposedNote: function(note) {
        try {
            const freq = (typeof note === 'number') ? Tone.Midi(note) : Tone.Frequency(note);
            return freq.transpose(this.currentSemitoneOffset).toNote();
        } catch (e) {
            return typeof note === 'number' ? Tone.Midi(note).toNote() : note;
        }
    },

    updateADSR: function(a, d, s, r) {
        this.currentADSR = { attack: a, decay: d, sustain: s, release: r };
        const isSampler = this.currentInstrumentName.toLowerCase().includes('sampler');
        updateAdsrGraph(a, d, s, r, isSampler);
    },

    rebuildEffectChain: function(effectsConfig = []) {
        this._activeEffects.forEach(effect => { if (effect && effect.dispose) effect.dispose(); });
        this._activeEffects = [];
        logKey('LOG_EFFECT_CLEARED');

        const instrumentSet = new Set([this.synth, this.drum, this.hh, this.snare, this.jazzKit, ...Object.values(this.instruments)]);
        const allInstruments = Array.from(instrumentSet).filter(Boolean);
        
        allInstruments.forEach(instr => { if (instr && typeof instr.disconnect === 'function') instr.disconnect(); });
        
        try {
            effectsConfig.forEach(config => {
                if (!config || !config.type) return;
                let effectInstance;
                const params = { ...(config.params || {}) };

                switch (config.type) {
                    case 'distortion': effectInstance = new Tone.Distortion(params); break;
                    case 'reverb':
                        effectInstance = new Tone.Reverb(params.decay);
                        if (params.preDelay) effectInstance.preDelay = params.preDelay;
                        break;
                    case 'feedbackDelay': {
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
                                if (rawTime.includes('t')) { baseDuration = (quarterNoteTime * (4 / noteValue)) * (2 / 3); }
                                else if (rawTime.includes('n')) { baseDuration = quarterNoteTime * (4 / noteValue); }
                                else { delayInSeconds = parseFloat(rawTime); }
                                if(baseDuration) {
                                    delayInSeconds = baseDuration;
                                    if (rawTime.includes('.')) delayInSeconds *= 1.5;
                                }
                            } catch (e) { delayInSeconds = 0.25; }
                        } else { delayInSeconds = 0.25; }
                        effectInstance = new Tone.FeedbackDelay(delayInSeconds, params.feedback);
                        break;
                    }
                    case 'filter':
                        effectInstance = new Tone.Filter({
                            type: params.type || 'lowpass',
                            frequency: params.frequency !== undefined ? params.frequency : 20000,
                            Q: params.Q !== undefined ? params.Q : 1,
                            rolloff: params.rolloff !== undefined ? params.rolloff : -12
                        });
                        break;
                    case 'compressor': effectInstance = new Tone.Compressor(params); break;
                    case 'limiter': effectInstance = new Tone.Limiter({ threshold: params.threshold !== undefined ? params.threshold : -6 }); break;
                    case 'bitCrusher': effectInstance = new Tone.BitCrusher(params); break;
                    case 'chorus': effectInstance = new Tone.Chorus(params.frequency, params.delayTime, params.depth).start(); break;
                    case 'phaser': effectInstance = new Tone.Phaser(params.frequency, params.octaves, params.baseFrequency); break;
                    case 'autoPanner': effectInstance = new Tone.AutoPanner(params.frequency, params.depth).start(); break;
                    default: logKey('LOG_UNKNOWN_EFFECT', 'warning', config.type); return;
                }
                if (params.wet !== undefined && effectInstance.wet) effectInstance.wet.value = params.wet;
                this._activeEffects.push(effectInstance);
            });
        } catch (e) { logKey('LOG_EFFECT_CHAIN_ERR', 'error', e.message); }

        const chain = [...this._activeEffects, analyser];
        allInstruments.forEach(instr => {
            if (instr && typeof instr.chain === 'function') instr.chain(...chain);
        });
        logKey('LOG_EFFECT_CHAIN_REBUILT', 'info', this._activeEffects.length);
    },

    updateFilter: function(freq, q) {
        const filterEffect = this._activeEffects.find(e => e instanceof Tone.Filter);
        if (filterEffect) {
            if (freq !== undefined) filterEffect.frequency.value = freq;
            if (q !== undefined) filterEffect.Q.value = q;
        }
    },

    createInstrument: function(name, type) {
        if (!name) return;
        let newInstrument;
        switch(type) {
            case 'PolySynth': newInstrument = new Tone.PolySynth(Tone.Synth); break;
            case 'AMSynth': newInstrument = new Tone.PolySynth(Tone.AMSynth); break;
            case 'FMSynth': newInstrument = new Tone.PolySynth(Tone.FMSynth); break;
            case 'DuoSynth': newInstrument = new Tone.PolySynth(Tone.DuoSynth); break;
            case 'SineWave': newInstrument = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sine' } }); break;
            case 'SquareWave': newInstrument = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'square' } }); break;
            case 'TriangleWave': newInstrument = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' } }); break;
            case 'SawtoothWave': newInstrument = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sawtooth' } }); break;
            case 'Sampler': newInstrument = new Tone.Sampler({ urls: { "C4": "C4.mp3" }, baseUrl: "https://tonejs.github.io/audio/salamander/" }); break;
        }
        if (newInstrument) {
            newInstrument.chain(...this._activeEffects, analyser);
            this.instruments[name] = newInstrument;
        }
    },

    transitionToInstrument: function(newInstrumentName) {
        if (!this.instruments[newInstrumentName]) return;
        if (this.instruments[this.currentInstrumentName] && this.instruments[this.currentInstrumentName].releaseAll) {
            this.instruments[this.currentInstrumentName].releaseAll();
        }
        this.currentInstrumentName = newInstrumentName;
        this.syncAdsrToUI();
    },

    syncAdsrToUI: function() {
        let instr = this.instruments[this.currentInstrumentName];
        if (!instr) return;
        let a = 0.01, d = 0.1, s = 1.0, r = 0.5;
        try {
            const env = instr.envelope || (instr.get?.().envelope) || (instr.get?.().voice0?.envelope);
            if (env) { a = env.attack; d = env.decay; s = env.sustain; r = env.release; }
            updateAdsrGraph(a, d, s, r, this.currentInstrumentName.toLowerCase().includes('sampler'));
        } catch (e) {}
    },

    playCurrentInstrumentNote: async function(note, dur, time, velocity) {
        const ok = await ensureAudioStarted();
        if (!ok) return; 
        const finalNote = (typeof note === 'string' || typeof note === 'number') ? this.getTransposedNote(note) : note;
        const instr = this.instruments[this.currentInstrumentName];
        if (instr && instr.triggerAttackRelease) {
            triggerAdsrOn();
            instr.triggerAttackRelease(finalNote, dur, time, velocity);
            setTimeout(() => triggerAdsrOff(), Tone.Time(dur).toSeconds() * 1000);
        }
    },

    playCurrentInstrumentNoteAttack: async function(note, velocity) {
        const ok = await ensureAudioStarted();
        if (!ok) return; 
        const finalNote = (typeof note === 'string' || typeof note === 'number') ? this.getTransposedNote(note) : note;
        const instr = this.instruments[this.currentInstrumentName];
        if (instr && instr.triggerAttack) {
            triggerAdsrOn();
            instr.triggerAttack(finalNote, Tone.now(), velocity);
        }
    },

    playCurrentInstrumentNoteRelease: function(note) {
        const finalNote = (typeof note === 'string' || typeof note === 'number') ? this.getTransposedNote(note) : note;
        const instr = this.instruments[this.currentInstrumentName];
        if (instr && instr.triggerRelease) {
            triggerAdsrOff();
            instr.triggerRelease(finalNote, Tone.now());
        }
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
        this.jazzKit.triggerAttackRelease(drumNote, '8n', time, finalVelocity);
    },

    playSFX: async function(url, options = {}) {
        const ok = await ensureAudioStarted();
        if (!ok || !this.isExecutionActive) return;
        try {
            const player = new Tone.Player({
                url: url,
                onload: () => { if (this.isExecutionActive) player.start(); },
                onstop: () => {
                    const idx = this.activeSFXPlayers.indexOf(player);
                    if (idx > -1) this.activeSFXPlayers.splice(idx, 1);
                    player.dispose();
                }
            });
            this.activeSFXPlayers.push(player);
            player.reverse = options.reverse || false;
            player.playbackRate = options.playbackRate || 1;
            player.volume.value = Tone.gainToDb(options.volume || 1);
            player.chain(...this._activeEffects, analyser);
        } catch (e) { console.error(e); }
    },

    playChordByName: async function(chordName, duration, velocity) {
        const notes = this.chords[chordName];
        if (notes) {
            const transposed = notes.map(n => this.getTransposedNote(n));
            const instr = this.instruments[this.currentInstrumentName];
            if (instr && instr.triggerAttackRelease) {
                triggerAdsrOn();
                instr.triggerAttackRelease(transposed, duration, Tone.now(), velocity);
                setTimeout(() => triggerAdsrOff(), Tone.Time(duration).toSeconds() * 1000);
            }
        }
    },

    playChordByNameAttack: async function(chordName, velocity) {
        const notes = this.chords[chordName];
        if (notes) {
            const transposed = notes.map(n => this.getTransposedNote(n));
            const instr = this.instruments[this.currentInstrumentName];
            if (instr && instr.triggerAttack) {
                triggerAdsrOn();
                instr.triggerAttack(transposed, Tone.now(), velocity);
            }
        }
    },

    playChordByNameRelease: function(chordName) {
        const notes = this.chords[chordName];
        if (notes) {
            const transposed = notes.map(n => this.getTransposedNote(n));
            const instr = this.instruments[this.currentInstrumentName];
            if (instr && instr.triggerRelease) {
                triggerAdsrOff();
                instr.triggerRelease(transposed, Tone.now());
            }
        }
    },

    midiAttack: async function(midiNoteNumber, velocityNormalized = 1, channel) {
        const ok = await ensureAudioStarted();
        if (!ok) return;
        const chordName = this.midiChordMap[midiNoteNumber];
        let notesToPlay = chordName ? (this.chords[chordName] || []).map(n => this.getTransposedNote(n)) : this.getTransposedNote(midiNoteNumber);
        const instr = this.instruments[this.currentInstrumentName];
        if (instr && instr.triggerAttack) {
            triggerAdsrOn();
            instr.triggerAttack(notesToPlay, Tone.now(), velocityNormalized);
            this.midiPlayingNotes.set(midiNoteNumber, notesToPlay);
        }
    },

    midiRelease: async function(midiNoteNumber) {
        const notesToRelease = this.midiPlayingNotes.get(midiNoteNumber);
        const instr = this.instruments[this.currentInstrumentName];
        if (notesToRelease && instr && instr.triggerRelease) {
            triggerAdsrOff();
            instr.triggerRelease(notesToRelease, Tone.now());
            this.midiPlayingNotes.delete(midiNoteNumber);
        }
    },

    clearPressedKeys: function() { this.pressedKeys.clear(); this.midiPlayingNotes.clear(); },

    resetAudioEngineState: function() {
        this.isExecutionActive = false;
        logKey('LOG_RESETTING_ENGINE');

        // Stop the transport and cancel all events
        Tone.Transport.stop(); 
        Tone.Transport.cancel(0);
        Tone.Transport.seconds = 0;

        // Reset Visuals
        this.updateADSR(0.01, 0.1, 0.5, 1.0); 
        triggerAdsrOff();

        // Stop all active SFX players
        this.activeSFXPlayers.forEach(p => { try { p.stop(); p.dispose(); } catch(e){} });
        this.activeSFXPlayers = [];

        // Stop and release all instruments
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

        // Dispose of custom instruments (except DefaultSynth handled below)
        for (const name in this.instruments) {
            if (name !== 'DefaultSynth') {
                const instrument = this.instruments[name];
                if (instrument && typeof instrument.dispose === 'function') {
                    try { instrument.dispose(); } catch(e) {}
                }
                delete this.instruments[name];
            }
        }

        // Re-initialize default synth
        if (this.instruments['DefaultSynth'] && typeof this.instruments['DefaultSynth'].dispose === 'function') {
            try { this.instruments['DefaultSynth'].dispose(); } catch(e) {}
        }
        synth = new Tone.PolySynth(Tone.Synth).chain(analyser);
        this.synth = synth; 
        this.instruments['DefaultSynth'] = synth; 
        this.currentInstrumentName = 'DefaultSynth';

        // CRITICAL FIX: Dispose of all Blockly Loops
        if (blocklyLoops) {
            for (const loopId in blocklyLoops) {
                if (blocklyLoops.hasOwnProperty(loopId) && blocklyLoops[loopId] instanceof Tone.Loop) {
                    try {
                        blocklyLoops[loopId].stop();
                        blocklyLoops[loopId].dispose();
                    } catch(e) {}
                }
            }
            // Clear the object
            for (const key in blocklyLoops) delete blocklyLoops[key];
            logKey('LOG_LOOPS_CLEARED');
        }

        this.chords = {}; 
        this.keyboardChordMap = {}; 
        this.midiChordMap = {}; 
        this.clearPressedKeys();
        
        this._activeEffects.forEach(e => { if (e && typeof e.dispose === 'function') e.dispose(); });
        this._activeEffects = []; 
        
        this.currentSemitoneOffset = 0;
        logKey('LOG_ENGINE_RESET_DONE');
    },

    panicStopAllSounds: function() { this.resetAudioEngineState(); },
};

export function startAudioOnFirstInteraction() {
    const oneStart = async function () {
        const ok = await ensureAudioStarted();
        if (ok) requestMidiAccess();
        document.body.removeEventListener('pointerdown', oneStart);
    };
    document.body.addEventListener('pointerdown', oneStart, { passive: true });
}

audioEngine.instruments['DefaultSynth'] = synth;
window.audioEngine = audioEngine;
window.blocklyLoops = blocklyLoops;