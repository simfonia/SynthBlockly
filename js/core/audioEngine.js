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
export const fftAnalyser = new Tone.Analyser('fft', 64); 
export const masterLimiter = new Tone.Limiter(-1); 

analyser.connect(fftAnalyser);
fftAnalyser.connect(masterLimiter);
masterLimiter.toDestination();

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
    messageListeners: {}, 
    log, logKey, getMsg,

    broadcast: function(msg) {
        if (this.messageListeners[msg]) {
            Promise.resolve().then(() => {
                this.messageListeners[msg].forEach(listener => {
                    if (typeof listener === 'function') listener();
                });
            });
        }
    },

    registerMessageListener: function(msg, callback) {
        if (!this.messageListeners[msg]) this.messageListeners[msg] = [];
        this.messageListeners[msg].push(callback);
    },

    clearMessageListeners: function() {
        this.messageListeners = {};
    },

    initServices: function() {
        this.instrumentService = new InstrumentService(this);
        this.effectService = new EffectService(this);
        this.sequencerService = new SequencerService(this);
    },

    registerKeyAction: function(keyCode, onDown, onUp = null) {
        this.keyActionMap[keyCode] = { down: onDown, up: onUp };
        this.logKey('LOG_KEY_ACTION_REGISTERED', 'info', keyCode);
    },

    clearKeyActions: function() { this.keyActionMap = {}; },

    waitForSamples: async function() { 
        await Tone.loaded(); 
        const samplers = Object.values(this.instruments).filter(i => 
            i && (i instanceof Tone.Sampler || i.name === 'Sampler' || typeof i.loaded === 'boolean')
        );
        if (samplers.length > 0) {
            await Promise.all(samplers.map(s => {
                if (s.loaded) return Promise.resolve();
                return new Promise(resolve => {
                    const check = setInterval(() => {
                        if (s.loaded) { clearInterval(check); resolve(); }
                    }, 50);
                    setTimeout(() => { clearInterval(check); resolve(); }, 10000);
                });
            }));
        }
        return true;
    },

    getTransposedNote: function(note) {
        if (!note) return 'C4';
        if (this.currentSemitoneOffset === 0) return (typeof note === 'number') ? Tone.Midi(note).toNote() : note;
        try {
            const freq = (typeof note === 'number') ? Tone.Midi(note) : Tone.Frequency(note);
            return freq.transpose(this.currentSemitoneOffset).toNote();
        } catch (e) { return note; }
    },

    updateADSR: function(a, d, s, r) {
        const settings = { attack: a, decay: d, sustain: s, release: r };
        this.currentADSR = { ...settings };
        if (this.currentInstrumentName) { this.instrumentSettings[this.currentInstrumentName] = { ...settings }; }
        this.updateADSRUI(a, d, s, r);
    },

    updateADSRUI: function(a, d, s, r) {
        const isSampler = this.currentInstrumentName && this.currentInstrumentName.toLowerCase().includes('sampler');
        updateAdsrGraph(a, d, s, r, isSampler);
    },

    _getOrCreateChannel: function(name) {
        if (!this.channels[name]) { this.channels[name] = new Tone.Channel().connect(this.analyser); }
        return this.channels[name];
    },

    _connectInstrumentToChain: function(name, instr) {
        if (!instr) return;
        const localEffects = this.instrumentEffects[name] || [];
        const chan = this._getOrCreateChannel(name);
        if (instr.disconnect) instr.disconnect();
        if (instr.chain) instr.chain(...localEffects, chan);
        const masterChain = [...this._activeEffects, this.analyser];
        if (chan.disconnect) chan.disconnect();
        chan.chain(...masterChain);
    },

    _reconnectAll: function() {
        const masterChain = [...this._activeEffects, analyser];
        const core = this._coreInstruments;
        [core.drum, core.hh, core.snare, core.click, core.jazzKit].forEach(i => {
             if (i && i.chain) { i.disconnect(); i.chain(...masterChain); }
        });
        for (const [name, instr] of Object.entries(this.instruments)) {
             if (!instr || instr.type === 'Layered') continue;
             if (instr.disconnect) instr.disconnect();
             const localEffects = this.instrumentEffects[name] || [];
             const chan = this._getOrCreateChannel(name);
             if (instr.chain) {
                 instr.chain(...localEffects, chan);
                 chan.disconnect(); chan.chain(...masterChain);
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

    playCurrentInstrumentNote: function(note, dur, time, velocity) {
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

    playCurrentInstrumentNoteAttack: function(note, velocity) {
        this.syncAdsrToUI();
        const finalNote = this.getTransposedNote(note);
        const instr = this.instruments[this.currentInstrumentName] || this._coreInstruments.synth;
        if (instr && instr.triggerAttack) {
            if (instr instanceof Tone.Sampler && !instr.loaded) return null; 
            instr.triggerAttack(finalNote, Tone.now(), velocity);
            return triggerAdsrOn(); 
        }
        return null;
    },

    playCurrentInstrumentNoteRelease: function(note, noteId) {
        const finalNote = (typeof note === 'string' || typeof note === 'number') ? this.getTransposedNote(note) : note;
        const instr = this.instruments[this.currentInstrumentName] || this._coreInstruments.synth;
        if (instr && instr.triggerRelease) {
            instr.triggerRelease(finalNote, Tone.now());
            triggerAdsrOff(noteId); 
        }
    },

    playKick: function(v, t) { this.sequencerService.playKick(v, t); },
    playSnare: function(v, t) { this.sequencerService.playSnare(v, t); },
    playJazzKitNote: function(note, vel, time) { this.sequencerService.playJazzKitNote(note, vel, time); },
    playRhythmSequence: function(src, steps, time, m, isChord) { this.sequencerService.playRhythmSequence(src, steps, time, m, isChord); },
    playMelodyString: async function(str, target, startTime) { await this.sequencerService.playMelodyString(str, target, startTime); },
    playChordByName: function(name, dur, vel, time, target) { this.sequencerService.playChordByName(name, dur, vel, time, target); },

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

    playSFX: async function(url, options = {}) {
        await ensureAudioStarted();
        const p = new Tone.Player({ url, onload: () => { if (this.isExecutionActive) p.start(); }, onstop: () => p.dispose() });
        p.chain(...this._activeEffects, analyser);
    },

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
        for (const id in blocklyLoops) { 
            if (blocklyLoops[id]) {
                if (blocklyLoops[id].stop) blocklyLoops[id].stop(); 
                blocklyLoops[id].dispose(); 
            }
        } 
        blocklyLoops = {}; window.blocklyLoops = {};
        for (const name in this.instruments) {
            const instr = this.instruments[name];
            if (instr && instr.releaseAll) instr.releaseAll();
        }
        this.currentADSR = { ...DEFAULT_ADSR };
        createCoreInstruments(); 
        if (this.instrumentService) { this.instrumentService.disposeAll(); }
        for (const name in this.channels) { if (this.channels[name] && this.channels[name].dispose) this.channels[name].dispose(); }
        this.channels = {};
        this.clearMessageListeners();
        this.chords = {}; this.keyboardChordMap = {}; this.midiChordMap = {}; this.clearPressedKeys();
        if (this.effectService) { this.effectService.disposeAll(); }
        this.currentSemitoneOffset = 0;
        this.currentInstrumentName = 'DefaultSynth';
        logKey('LOG_ENGINE_RESET_DONE');
    },

    panicStopAllSounds: async function() { 
        this.resetAudioEngineState();
        await new Promise(r => setTimeout(r, 300));
    },
};

audioEngine.initServices(); 

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