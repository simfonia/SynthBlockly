import * as Tone from 'tone';
import { log, logKey, getMsg, clearErrorLog } from '../ui/logger.js';
import { updateAdsrGraph, triggerAdsrOn, triggerAdsrOff } from '../ui/adsrVisualizer.js';
import { requestMidiAccess } from './midiEngine.js';
import { ensureAudioStarted } from './audioUtils.js';
import { InstrumentService } from './services/InstrumentService.js';
import { EffectService } from './services/EffectService.js';
import { SequencerService } from './services/SequencerService.js';

export { ensureAudioStarted };
export let blocklyLoops = {}; 
let audioStarted = false;

const DEFAULT_ADSR = { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.5 };

export const analyser = new Tone.Analyser('waveform', 1024);
export const fftAnalyser = new Tone.Analyser('fft', 64); // Low resolution for retro look
export const masterLimiter = new Tone.Limiter(-1); // Safety limiter at -1dB

analyser.connect(fftAnalyser);
fftAnalyser.connect(masterLimiter);
masterLimiter.toDestination();

// Internal core instruments
const _coreInstruments = {
    drum: null, hh: null, snare: null, click: null, jazzKit: null, synth: null
};

function createCoreInstruments() {
    if (_coreInstruments.drum) _coreInstruments.drum.dispose(); 
    if (_coreInstruments.hh) _coreInstruments.hh.dispose(); 
    if (_coreInstruments.snare) _coreInstruments.snare.dispose();
    if (_coreInstruments.click) _coreInstruments.click.dispose(); 
    if (_coreInstruments.jazzKit) _coreInstruments.jazzKit.dispose(); 
    if (_coreInstruments.synth) _coreInstruments.synth.dispose();

    _coreInstruments.drum = new Tone.MembraneSynth().connect(analyser);
    _coreInstruments.hh = new Tone.NoiseSynth({ volume: -12 }).connect(analyser);
    _coreInstruments.snare = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.005, decay: 0.2, sustain: 0 },
        volume: -5
    }).connect(analyser);

    _coreInstruments.click = new Tone.MonoSynth({
        oscillator: { type: "square" },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 },
        volume: 0
    }).connect(analyser);

    _coreInstruments.jazzKit = new Tone.Sampler({
        urls: {
            'C1': 'BT0A0D0.WAV', 'C#1': 'RIM127.WAV', 'D1': 'ST7T7S7.WAV', 'D#1': 'HANDCLP2.WAV',
            'E1': 'LTAD0.WAV', 'F1': 'HHCDA.WAV', 'F#1': 'MTAD0.WAV', 'G1': 'HTAD0.WAV',
            'G#1': 'CSHDA.WAV', 'A1': 'HHODA.WAV', 'A#1': 'RIDEDA.WAV',
        },
        baseUrl: import.meta.env.BASE_URL + 'samples/jazzkit/Roland_TR-909/',
        onload: () => { logKey('LOG_JAZZKIT_LOADED'); }
    }).connect(analyser);

    // Default synth starts with the project's default ADSR
    _coreInstruments.synth = new Tone.PolySynth(Tone.Synth, {
        envelope: { ...DEFAULT_ADSR, decayCurve: 'linear', releaseCurve: 'linear' }
    }).connect(analyser);
}

createCoreInstruments();

export const audioEngine = {
    isExecutionActive: false,
    currentADSR: { ...DEFAULT_ADSR },
    Tone: Tone,
    analyser: analyser,
    fftAnalyser: fftAnalyser,
    _coreInstruments: _coreInstruments,
    
    effects: {}, 
    activeSFXPlayers: [],
    channels: {}, 
    
    // Getters for delegated properties
    get instruments() { return this.instrumentService.instruments; },
    get layeredInstruments() { return this.instrumentService.layeredInstruments; },
    get instrumentSettings() { return this.instrumentService.instrumentSettings; },
    get currentInstrumentName() { return this.instrumentService.currentInstrumentName; },
    set currentInstrumentName(val) { this.instrumentService.currentInstrumentName = val; },

    get _activeEffects() { return this.effectService._activeEffects; },
    get instrumentEffects() { return this.effectService.instrumentEffects; },

    currentSemitoneOffset: 0,
    pressedKeys: new Map(), chords: {}, keyboardChordMap: {}, keyActionMap: {}, midiChordMap: {},
    midiPressedNotes: new Map(), midiPlayingNotes: new Map(), backgroundNoise: null,
    log, logKey, getMsg,

    /**
     * Initializes the core services (Instrument, Effect, Sequencer).
     */
    initServices: function() {
        this.instrumentService = new InstrumentService(this);
        this.effectService = new EffectService(this);
        this.sequencerService = new SequencerService(this);
    },

    /**
     * Registers a custom action for a specific key press/release.
     * @param {string} keyCode - The key code (e.g., 'KeyA').
     * @param {Function} onDown - Callback for key down.
     * @param {Function} [onUp=null] - Callback for key up.
     */
    registerKeyAction: function(keyCode, onDown, onUp = null) {
        this.keyActionMap[keyCode] = { down: onDown, up: onUp };
        this.logKey('LOG_KEY_ACTION_REGISTERED', 'info', keyCode);
    },

    /**
     * Clears all registered key actions.
     */
    clearKeyActions: function() {
        this.keyActionMap = {};
    },

    /**
     * Waits for Tone.js to load all samples.
     * @returns {Promise<boolean>}
     */
    waitForSamples: async function() { 
        return Tone.loaded(); 
    },

    /**
     * Transposes a note based on the current global semitone offset.
     * @param {string|number} note - The input note (e.g., 'C4' or MIDI number).
     * @returns {string|number} - The transposed note.
     */
    getTransposedNote: function(note) {
        if (!note) return 'C4';
        if (this.currentSemitoneOffset === 0) return (typeof note === 'number') ? Tone.Midi(note).toNote() : note;
        try {
            const freq = (typeof note === 'number') ? Tone.Midi(note) : Tone.Frequency(note);
            return freq.transpose(this.currentSemitoneOffset).toNote();
        } catch (e) { return note; }
    },

    /**
     * Updates the ADSR envelope settings for the current instrument and UI.
     * @param {number} a - Attack time.
     * @param {number} d - Decay time.
     * @param {number} s - Sustain level.
     * @param {number} r - Release time.
     */
    updateADSR: function(a, d, s, r) {
        const settings = { attack: a, decay: d, sustain: s, release: r };
        this.currentADSR = { ...settings };
        if (this.currentInstrumentName) {
            this.instrumentSettings[this.currentInstrumentName] = { ...settings };
        }
        this.updateADSRUI(a, d, s, r);
    },

    /**
     * Updates the ADSR visualizer UI.
     */
    updateADSRUI: function(a, d, s, r) {
        const isSampler = this.currentInstrumentName && this.currentInstrumentName.toLowerCase().includes('sampler');
        updateAdsrGraph(a, d, s, r, isSampler);
    },

    _getOrCreateChannel: function(name) {
        if (!this.channels[name]) {
            // Channel handles volume, mute, solo, and pan.
            // Initially connect to analyser (which eventually goes to Master)
            this.channels[name] = new Tone.Channel().connect(this.analyser);
        }
        return this.channels[name];
    },

    _connectInstrumentToChain: function(name, instr) {
        if (!instr) return;
        
        // 1. Get Local Effects
        const localEffects = this.instrumentEffects[name] || [];
        
        // 2. Get/Create Channel
        const chan = this._getOrCreateChannel(name);
        
        // 3. Chain: Instr -> Local Effects -> Channel
        if (instr.disconnect) instr.disconnect();
        if (instr.chain) instr.chain(...localEffects, chan);
        
        // 4. Chain: Channel -> Master Effects -> Analyser
        // Note: Channel might already be connected, but we ensure it matches current global state
        const masterChain = [...this._activeEffects, this.analyser];
        if (chan.disconnect) chan.disconnect();
        chan.chain(...masterChain);
    },

    _reconnectAll: function() {
        const masterChain = [...this._activeEffects, analyser];
        
        // Core (Hidden) Instruments -> Master
        const core = this._coreInstruments;
        [core.drum, core.hh, core.snare, core.click, core.jazzKit].forEach(i => {
             if (i && i.chain) { i.disconnect(); i.chain(...masterChain); }
        });

        // Registered Instruments
        for (const [name, instr] of Object.entries(this.instruments)) {
             if (!instr || instr.type === 'Layered') continue;
             if (instr.disconnect) instr.disconnect();
             
             const localEffects = this.instrumentEffects[name] || [];
             const chan = this._getOrCreateChannel(name);
             
             if (instr.chain) {
                 instr.chain(...localEffects, chan);
                 chan.disconnect();
                 chan.chain(...masterChain);
             }
        }
    },

    rebuildEffectChain: function(effectsConfig = []) { this.effectService.rebuildEffectChain(effectsConfig); },
    addEffectToChain: function(config) { this.effectService.addEffectToChain(config); },
    clearEffects: function(target) { this.effectService.clearEffects(target); },
    updateFilter: function(targetName, freq, q) { this.effectService.updateFilter(targetName, freq, q); },
    updateEffectParam: function(target, type, param, val, index) { this.effectService.updateEffectParam(target, type, param, val, index); },
    _createEffectInstance: function(config) { return this.effectService._createEffectInstance(config); },

    createInstrument: function(name, type) { this.instrumentService.createInstrument(name, type); },
    createCustomSampler: function(name, urls, baseUrl, settings = null) { this.instrumentService.createCustomSampler(name, urls, baseUrl, settings); },
    createLayeredInstrument: function(name, childNames) { this.instrumentService.createLayeredInstrument(name, childNames); },
    createCustomWaveInstrument: function(name, partials) { this.instrumentService.createCustomWaveInstrument(name, partials); },
    createAdditiveInstrument: function(name, components) { this.instrumentService.createAdditiveInstrument(name, components); },
    transitionToInstrument: function(name) { this.instrumentService.transitionToInstrument(name); },
    syncAdsrToUI: function() { this.instrumentService.syncAdsrToUI(); },

    /**
     * Plays a note on the current instrument.
     * @param {string} note - Note name (e.g., 'C4').
     * @param {string|number} dur - Duration.
     * @param {number} [time] - Scheduled time.
     * @param {number} [velocity] - Velocity (0-1).
     */
    playCurrentInstrumentNote: function(note, dur, time, velocity) {
        // Force UI sync back to real instrument state when playing (unless it's a scheduled note)
        if (time === undefined) this.syncAdsrToUI();

        const t = (time !== undefined) ? time : Tone.now() + 0.1;
        const finalNote = this.getTransposedNote(note);
        const instr = this.instruments[this.currentInstrumentName];
        if (instr && instr.triggerAttackRelease) {
            if (instr instanceof Tone.Sampler && !instr.loaded) return; 
            instr.triggerAttackRelease(finalNote, dur, t, velocity);
            if (time === undefined) { 
                const noteId = triggerAdsrOn(); 
                setTimeout(() => triggerAdsrOff(noteId), Tone.Time(dur).toSeconds()*1000); 
            }
        }
    },

    /**
     * Triggers the attack phase for the current instrument.
     */
    playCurrentInstrumentNoteAttack: function(note, velocity) {
        this.syncAdsrToUI();
        const finalNote = this.getTransposedNote(note);
        const instr = this.instruments[this.currentInstrumentName];
        if (instr && instr.triggerAttack) {
            if (instr instanceof Tone.Sampler && !instr.loaded) return null; 
            instr.triggerAttack(finalNote, Tone.now(), velocity);
            return triggerAdsrOn(); 
        }
        return null;
    },

    /**
     * Triggers the release phase for the current instrument.
     */
    playCurrentInstrumentNoteRelease: function(note, noteId) {
        const finalNote = (typeof note === 'string' || typeof note === 'number') ? this.getTransposedNote(note) : note;
        const instr = this.instruments[this.currentInstrumentName];
        if (instr && instr.triggerRelease) {
            instr.triggerRelease(finalNote, Tone.now());
            triggerAdsrOff(noteId); 
        }
    },

    playChordByNameAttack: function(name, velocity) {
        const notes = this.chords[name];
        const instr = this.instruments[this.currentInstrumentName];
        if (notes && instr && instr.triggerAttack) {
            if (instr instanceof Tone.Sampler && !instr.loaded) return;
            instr.triggerAttack(notes.map(n => this.getTransposedNote(n)), Tone.now(), velocity);
            triggerAdsrOn();
        }
    },

    playChordByNameRelease: function(name) {
        const notes = this.chords[name];
        const instr = this.instruments[this.currentInstrumentName];
        if (notes && instr && instr.triggerRelease) {
            if (instr instanceof Tone.Sampler && !instr.loaded) return;
            instr.triggerRelease(notes.map(n => this.getTransposedNote(n)), Tone.now());
            triggerAdsrOff();
        }
    },

    playKick: function(v, t) { this.sequencerService.playKick(v, t); },
    playSnare: function(v, t) { this.sequencerService.playSnare(v, t); },
    playJazzKitNote: function(note, vel, time) { this.sequencerService.playJazzKitNote(note, vel, time); },
    playRhythmSequence: function(src, steps, time, m, isChord) { this.sequencerService.playRhythmSequence(src, steps, time, m, isChord); },
    playMelodyString: async function(str) { await this.sequencerService.playMelodyString(str); },

    /**
     * Plays a metronome count-in.
     */
    playCountIn: async function(measures = 1, beats = 4, beatValue = 4, volume = 0.8) {
        await ensureAudioStarted();
        const boosted = volume * 10;
        const dur = Tone.Time(beatValue + 'n').toSeconds();
        for (let m = 0; m < measures; m++) {
            for (let b = 0; b < beats; b++) {
                const t = Tone.now() + 0.05;
                if (b === 0) _coreInstruments.click.triggerAttackRelease("C6", "16n", t, boosted);
                else _coreInstruments.click.triggerAttackRelease("G5", "16n", t, boosted * 0.5);
                await new Promise(r => setTimeout(r, dur * 1000));
                if (!this.isExecutionActive) return;
            }
        }
    },
    
    _playSpecificInstrumentNote: function(name, note, dur, time, velocity) {
        const instr = this.instruments[name];
        if (instr && instr.triggerAttackRelease) {
            if (instr instanceof Tone.Sampler && !instr.loaded) return;
            const t = (time !== undefined) ? time : Tone.now() + 0.05;
            instr.triggerAttackRelease(this.getTransposedNote(note), dur, t, velocity);
        }
    },

    playSpecificInstrumentNoteAttack: function(name, note, velocity = 1) {
        const instr = this.instruments[name];
        if (instr && instr.triggerAttack) {
            if (instr instanceof Tone.Sampler && !instr.loaded) return null;
            instr.triggerAttack(this.getTransposedNote(note), Tone.now(), velocity);
            return triggerAdsrOn();
        }
        return null;
    },

    playSpecificInstrumentNoteRelease: function(name, note, noteId) {
        const instr = this.instruments[name];
        if (instr && instr.triggerRelease) {
            instr.triggerRelease(this.getTransposedNote(note), Tone.now());
            triggerAdsrOff(noteId);
        }
    },
            
    playSFX: async function(url, options = {}) {
        await ensureAudioStarted();
        const p = new Tone.Player({ url, onload: () => { if (this.isExecutionActive) p.start(); }, onstop: () => p.dispose() });
        p.chain(...this._activeEffects, analyser);
    },

    playChordByName: function(name, dur, vel, time) {
        const notes = this.chords[name];
        const instr = this.instruments[this.currentInstrumentName];
        if (notes && instr) {
            if (instr instanceof Tone.Sampler && !instr.loaded) return;
            const t = (time !== undefined) ? time : Tone.now() + 0.1;
            instr.triggerAttackRelease(notes.map(n => this.getTransposedNote(n)), dur, t, vel);
        }
    },

    /**
     * Handles MIDI note on events.
     * @param {number} note - MIDI note number.
     * @param {number} vel - Velocity (0-1).
     * @param {number} ch - MIDI channel.
     */
    midiAttack: async function(note, vel, ch) {
        await ensureAudioStarted();
        const chord = this.midiChordMap[note];
        const toPlay = chord ? this.chords[chord].map(n => this.getTransposedNote(n)) : this.getTransposedNote(note);
        const instr = this.instruments[this.currentInstrumentName];
        if (instr && instr.triggerAttack) {
            if (instr instanceof Tone.Sampler && !instr.loaded) return;
            instr.triggerAttack(toPlay, Tone.now(), vel);
            this.midiPlayingNotes.set(note, { notes: toPlay, id: triggerAdsrOn() });
        }
    },

    /**
     * Handles MIDI note off events.
     * @param {number} note - MIDI note number.
     */
    midiRelease: async function(note) {
        const entry = this.midiPlayingNotes.get(note);
        if (!entry) return;
        const instr = this.instruments[this.currentInstrumentName];
        if (instr && instr.triggerRelease) {
            instr.triggerRelease(entry.notes, Tone.now());
            this.midiPlayingNotes.delete(note);
            triggerAdsrOff(entry.id);
        }
    },

    clearPressedKeys: function() { this.pressedKeys.clear(); this.midiPlayingNotes.clear(); },

    resetAudioEngineState: function() {
        this.isExecutionActive = false;
        Tone.Transport.stop(); Tone.Transport.cancel(0); Tone.Transport.seconds = 0;
        triggerAdsrOff();
        for (const id in blocklyLoops) { if (blocklyLoops[id].stop) blocklyLoops[id].stop(); blocklyLoops[id].dispose(); } 
        for (const k in blocklyLoops) delete blocklyLoops[k];
        this.currentADSR = { ...DEFAULT_ADSR };
        createCoreInstruments(); 
        
        if (this.instrumentService) {
            this.instrumentService.disposeAll();
        }
        
        for (const name in this.channels) {
            if (this.channels[name] && this.channels[name].dispose) this.channels[name].dispose();
        }
        this.channels = {};

        this.chords = {}; this.keyboardChordMap = {}; this.midiChordMap = {}; this.clearPressedKeys();
        
        if (this.effectService) {
            this.effectService.disposeAll();
        }

        this.currentSemitoneOffset = 0;
        logKey('LOG_ENGINE_RESET_DONE');
    },

    panicStopAllSounds: function() { this.resetAudioEngineState(); },
};

audioEngine.initServices(); // Initialize services immediately

export function startAudioOnFirstInteraction() {
    const oneStart = async function () {
        const ok = await ensureAudioStarted();
        if (ok) requestMidiAccess();
        document.body.removeEventListener('pointerdown', oneStart);
    };
    document.body.addEventListener('pointerdown', oneStart, { passive: true });
}

window.audioEngine = audioEngine;
window.blocklyLoops = blocklyLoops;
