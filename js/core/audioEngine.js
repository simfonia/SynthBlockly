import * as Tone from 'tone';
import { log, logKey, getMsg, clearErrorLog } from '../ui/logger.js';
import { updateAdsrGraph, triggerAdsrOn, triggerAdsrOff } from '../ui/adsrVisualizer.js';
import { requestMidiAccess } from './midiEngine.js';

export let blocklyLoops = {}; 
let audioStarted = false;

const DEFAULT_ADSR = { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.5 };

export async function ensureAudioStarted() {
    if (audioStarted) return true;
    try {
        await Tone.start();
        if (Tone.context && Tone.context.state === 'suspended') await Tone.context.resume();
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
export const fftAnalyser = new Tone.Analyser('fft', 64); // Low resolution for retro look
export const masterLimiter = new Tone.Limiter(-1); // Safety limiter at -1dB

analyser.connect(fftAnalyser);
fftAnalyser.connect(masterLimiter);
masterLimiter.toDestination();

let drum, hh, snare, click, jazzKit, synth;

function createCoreInstruments() {
    if (drum) drum.dispose(); if (hh) hh.dispose(); if (snare) snare.dispose();
    if (click) click.dispose(); if (jazzKit) jazzKit.dispose(); if (synth) synth.dispose();

    drum = new Tone.MembraneSynth().connect(analyser);
    hh = new Tone.NoiseSynth({ volume: -12 }).connect(analyser);
    snare = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.005, decay: 0.2, sustain: 0 },
        volume: -5
    }).connect(analyser);

    click = new Tone.MonoSynth({
        oscillator: { type: "square" },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 },
        volume: 0
    }).connect(analyser);

    jazzKit = new Tone.Sampler({
        urls: {
            'C1': 'BT0A0D0.WAV', 'C#1': 'RIM127.WAV', 'D1': 'ST7T7S7.WAV', 'D#1': 'HANDCLP2.WAV',
            'E1': 'LTAD0.WAV', 'F1': 'HHCDA.WAV', 'F#1': 'MTAD0.WAV', 'G1': 'HTAD0.WAV',
            'G#1': 'CSHDA.WAV', 'A1': 'HHODA.WAV', 'A#1': 'RIDEDA.WAV',
        },
        baseUrl: import.meta.env.BASE_URL + 'samples/jazzkit/Roland_TR-909/',
        onload: () => { logKey('LOG_JAZZKIT_LOADED'); }
    }).connect(analyser);

    // Default synth starts with the project's default ADSR
    synth = new Tone.PolySynth(Tone.Synth, {
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
    get synth() { return synth; }, get drum() { return drum; }, get hh() { return hh; },
    get snare() { return snare; }, get click() { return click; }, get jazzKit() { return jazzKit; },
    
    effects: {}, _activeEffects: [], instrumentEffects: {}, activeSFXPlayers: [],
    instruments: {}, layeredInstruments: {}, channels: {},
    currentInstrumentName: 'DefaultSynth',
    currentSemitoneOffset: 0,
    pressedKeys: new Map(), chords: {}, keyboardChordMap: {}, midiChordMap: {},
    midiPressedNotes: new Map(), midiPlayingNotes: new Map(), backgroundNoise: null,
    log, logKey, getMsg,

    waitForSamples: async function() { 
        return Tone.loaded(); 
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
        this.currentADSR = { attack: a, decay: d, sustain: s, release: r };
        this.updateADSRUI(a, d, s, r);
    },

    updateADSRUI: function(a, d, s, r) {
        updateAdsrGraph(a, d, s, r, this.currentInstrumentName.toLowerCase().includes('sampler'));
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

    _createEffectInstance: function(config) {
        if (!config || !config.type) return null;
        let instance = null; 
        const p = config.params || {};
        
        const safeNum = (val, def) => {
            const n = Number(val);
            return isNaN(n) ? def : n;
        };

        try {
            switch (config.type) {
                case 'distortion': instance = new Tone.Distortion(safeNum(p.distortion, 0)); break;
                case 'reverb': instance = new Tone.Reverb(safeNum(p.decay, 1.5)); break;
                case 'feedbackDelay': 
                    const dt = Tone.Time(p.delayTime || '8n').toSeconds();
                    instance = new Tone.FeedbackDelay(isNaN(dt) ? 0.25 : dt, safeNum(p.feedback, 0.25)); 
                    break;
                case 'filter': instance = new Tone.Filter(safeNum(p.frequency, 1000), p.type || 'lowpass'); break;
                case 'compressor': instance = new Tone.Compressor(p); break;
                case 'limiter': instance = new Tone.Limiter(safeNum(p.threshold, -6)); break;
                case 'bitCrusher': instance = new Tone.BitCrusher(safeNum(p.bits, 4)); break;
                case 'chorus': instance = new Tone.Chorus(safeNum(p.frequency, 1.5), safeNum(p.delayTime, 3.5), safeNum(p.depth, 0.7)).start(); break;
                case 'phaser': instance = new Tone.Phaser(safeNum(p.frequency, 15), safeNum(p.octaves, 3), safeNum(p.baseFrequency, 350)); break;
                case 'autoPanner': instance = new Tone.AutoPanner(safeNum(p.frequency, 1), safeNum(p.depth, 1)).start(); break;
                case 'tremolo': instance = new Tone.Tremolo(safeNum(p.frequency, 10), safeNum(p.depth, 0.5)).start(); break;
            }
            if (instance) {
                if (p.wet !== undefined && instance.wet) instance.wet.value = safeNum(p.wet, 1);
            }
        } catch (e) {
            console.error("Effect creation error:", e);
        }
        return instance;
    },

    _reconnectAll: function() {
        const masterChain = [...this._activeEffects, analyser];
        
        // Core (Hidden) Instruments -> Master
        [drum, hh, snare, click, jazzKit].forEach(i => {
             if (i) { 
                 if (i.disconnect) i.disconnect(); 
                 // Note: We could add channels for core instruments too, but DefaultSynth covers most user needs.
                 if (i.chain) i.chain(...masterChain); 
             }
        });

        // Registered Instruments (includes DefaultSynth)
        for (const [name, instr] of Object.entries(this.instruments)) {
             if (!instr || instr.type === 'Layered') continue;
             if (instr.disconnect) instr.disconnect();
             
             const localEffects = this.instrumentEffects[name] || [];
             const chan = this._getOrCreateChannel(name);
             
             // Chain: Instr -> Local Effects -> Channel -> Master Chain
             if (instr.chain) {
                 instr.chain(...localEffects, chan);
                 // Channel connects to Master Chain
                 chan.disconnect();
                 chan.chain(...masterChain);
             }
        }
    },

    rebuildEffectChain: function(effectsConfig = []) {
        // Dispose global effects
        this._activeEffects.forEach(e => { if (e && e.dispose) e.dispose(); });
        this._activeEffects = [];
        
        // Dispose local effects
        Object.values(this.instrumentEffects || {}).forEach(chain => {
             chain.forEach(e => { if (e && e.dispose) e.dispose(); });
        });
        this.instrumentEffects = {}; 

        try {
            effectsConfig.forEach(config => {
                const instance = this._createEffectInstance(config);
                if (instance) {
                    const target = config.target || 'Master';
                    const cleanTarget = String(target).replace(/^['"]|['"]$/g, '');

                    if (cleanTarget === 'Master') {
                        this._activeEffects.push(instance);
                    } else {
                        if (!this.instrumentEffects[cleanTarget]) this.instrumentEffects[cleanTarget] = [];
                        this.instrumentEffects[cleanTarget].push(instance);
                    }
                }
            });
        } catch (e) { console.error(e); }
        
        this._reconnectAll();
    },

    updateFilter: function(targetName, freq, q) {
        // Handle overload: updateFilter(freq, q) -> target='Master'
        if (typeof targetName === 'number' && (typeof freq === 'number' || freq === undefined)) {
            q = freq;
            freq = targetName;
            targetName = 'Master';
        }

        const cleanTarget = String(targetName || 'Master').replace(/^['"]|['"]$/g, '');

        // Find chain
        let chain;
        if (cleanTarget === 'Master') {
            chain = this._activeEffects;
        } else {
            chain = this.instrumentEffects[cleanTarget];
        }

        if (!chain) return;

        // Find the first active filter and update it
        const filter = chain.find(e => {
            return (e instanceof Tone.Filter) || (e.name === 'Filter') || (e.toString && e.toString().includes('Filter'));
        });

        if (filter) {
            if (freq !== undefined && freq !== null && !isNaN(freq)) {
                // Smooth ramp to prevent clicking, but keep it snappy
                const safeFreq = Math.max(10, Math.min(20000, Number(freq)));
                // Check if frequency is a signal
                if (filter.frequency && filter.frequency.rampTo) {
                    filter.frequency.rampTo(safeFreq, 0.05);
                } else {
                     filter.frequency = safeFreq; // Fallback
                }
            }
            if (q !== undefined && q !== null && !isNaN(q)) {
                 if (filter.Q && filter.Q.value !== undefined) {
                     filter.Q.value = Math.max(0, Number(q));
                 }
            }
        }
    },

    addEffectToChain: function(config) {
        if (!config || !config.type) return;
        
        const instance = this._createEffectInstance(config);

        if (instance) {
            const target = config.target || 'Master';
            const cleanTarget = String(target).replace(/^['"]|['"]$/g, '');

            if (cleanTarget === 'Master') {
                this._activeEffects.push(instance);
            } else {
                if (!this.instrumentEffects[cleanTarget]) this.instrumentEffects[cleanTarget] = [];
                this.instrumentEffects[cleanTarget].push(instance);
            }
                
            // Re-chain everything
            this._reconnectAll();
        }
    },

    createInstrument: function(name, type) {
        if (!name) return;
        if (this.instruments[name]) this.instruments[name].dispose();
        let i;
        switch(type) {
            case 'PolySynth': i = new Tone.PolySynth(Tone.Synth); break;
            case 'AMSynth': i = new Tone.PolySynth(Tone.AMSynth); break;
            case 'FMSynth': i = new Tone.PolySynth(Tone.FMSynth); break;
            case 'DuoSynth': i = new Tone.PolySynth(Tone.DuoSynth); break;
            case 'SineWave': i = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sine' } }); break;
            case 'SquareWave': i = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'square' } }); break;
            case 'TriangleWave': i = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' } }); break;
            case 'SawtoothWave': i = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sawtooth' } }); break;
            case 'Sampler': i = new Tone.Sampler({ urls: { "C4": "C4.mp3" }, baseUrl: "https://tonejs.github.io/audio/salamander/" }); break;
        }
        if (i) {
            // Correctly apply ADSR to PolySynth or DuoSynth structure
            try {
                i.set({
                    envelope: { ...this.currentADSR, decayCurve: 'linear', releaseCurve: 'linear' }
                });
                if (i.get().voice0) { // DuoSynth special handling
                    i.set({
                        voice0: { envelope: { ...this.currentADSR, decayCurve: 'linear', releaseCurve: 'linear' } },
                        voice1: { envelope: { ...this.currentADSR, decayCurve: 'linear', releaseCurve: 'linear' } }
                    });
                }
            } catch(e) {}
            
            this.instruments[name] = i;
            this._connectInstrumentToChain(name, i);
        }
    },

    createCustomSampler: function(name, urls, baseUrl, settings = null) {
        if (this.instruments[name]) this.instruments[name].dispose();
        const s = new Tone.Sampler({ urls, baseUrl, onload: () => logKey('LOG_SAMPLER_SAMPLES_LOADED', 'info', name) });
        if (settings) s.set(settings);
        this.instruments[name] = s;
        this._connectInstrumentToChain(name, s);
    },

    createLayeredInstrument: function(name, childNames) {
        this.layeredInstruments[name] = childNames;
        this.instruments[name] = { type: 'Layered', children: childNames };
    },

    createCustomWaveInstrument: function(name, partials) {
        if (this.instruments[name]) this.instruments[name].dispose();
        try {
            const validPartials = partials.map(p => Number(p) || 0);
            const synth = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'custom', partials: validPartials },
                envelope: { ...this.currentADSR, decayCurve: 'linear', releaseCurve: 'linear' }
            });
            this.instruments[name] = synth;
            this._connectInstrumentToChain(name, synth);
            logKey('LOG_CUSTOM_WAVE_CREATED', 'info', name, validPartials.join(', '));
        } catch (e) {
            logKey('LOG_INSTR_CREATE_FAIL', 'error', name, e.message);
        }
    },

    createAdditiveInstrument: function(name, components) {
        if (this.instruments[name]) this.instruments[name].dispose();
        
        const self = this;

        // --- Normalization Logic ---
        // Sum up all amplitudes to check if they exceed 1.0 (0dB)
        let totalAmp = 0;
        components.forEach(c => { totalAmp += (Number(c.amp) || 0); });
        
        // If total is too high, calculate a scaling factor
        const scaleFactor = totalAmp > 1.0 ? (1.0 / totalAmp) : 1.0;

        class AdditiveVoice extends Tone.Synth {
            constructor(options) {
                super(options);
                this.name = "AdditiveVoice";
                if (this.oscillator) { this.oscillator.stop(); this.oscillator.disconnect(); }
                this.additiveOscillators = [];
                components.forEach(c => {
                    // Apply normalization scale factor to each component's amplitude
                    const normalizedAmp = (Number(c.amp) || 0) * scaleFactor;
                    
                    const osc = new Tone.Oscillator({
                        type: c.waveform || 'sine',
                        volume: Tone.gainToDb(normalizedAmp)
                    }).connect(this.envelope);
                    this.additiveOscillators.push({ osc, ratio: Number(c.freqRatio) || 1 });
                    osc.start();
                });
            }
                        triggerAttack(note, time, velocity) {
                            const freq = Tone.Frequency(note).toFrequency();
                            this.additiveOscillators.forEach(item => {
                                item.osc.frequency.setValueAtTime(freq * item.ratio, time);
                            });
                            super.triggerAttack(note, time, velocity);
                        }
            
                                    triggerRelease(time) {
                                        // Correctly cancel ongoing Decay/Sustain transitions using .cancel()
                                        this.envelope.cancel(time);
                                        super.triggerRelease(time);
                                    }            dispose() {
                this.additiveOscillators.forEach(item => { item.osc.stop(); item.osc.dispose(); });
                super.dispose();
                return this;
            }
        }

        try {
            const synth = new Tone.PolySynth(AdditiveVoice, { maxPolyphony: 16 });
            synth.set({ envelope: { ...this.currentADSR, decayCurve: 'linear', releaseCurve: 'linear' } });
            this.instruments[name] = synth;
            this._connectInstrumentToChain(name, synth);
            logKey('LOG_ADDITIVE_CREATED', 'info', name);
        } catch (e) {
            logKey('LOG_ADDITIVE_CREATE_FAIL', 'error', name, e.message);
        }
    },

    transitionToInstrument: function(name) {
        if (name !== 'DefaultSynth' && !this.instruments[name]) {
             logKey('LOG_ERR_INSTR_NOT_FOUND', 'warning', name);
             return;
        }
        const old = this.instruments[this.currentInstrumentName] || (this.currentInstrumentName === 'DefaultSynth' ? synth : null);
        if (old && old.releaseAll) old.releaseAll();
        this.currentInstrumentName = name;
        this.syncAdsrToUI();
    },

    syncAdsrToUI: function() {
        let instr = this.instruments[this.currentInstrumentName] || (this.currentInstrumentName === 'DefaultSynth' ? synth : null);
        if (!instr) return;
        if (instr.type === 'Layered') instr = this.instruments[instr.children[0]];
        if (!instr) return;
        let a=0.01, d=0.1, s=1, r=0.5;
        try {
            const settings = instr.get();
            const env = settings.envelope || (settings.voice0 && settings.voice0.envelope);
            if (env) { a=env.attack; d=env.decay; s=env.sustain; r=env.release; }
            updateAdsrGraph(a,d,s,r, this.currentInstrumentName.toLowerCase().includes('sampler'));
        } catch(e){}
    },

    playCurrentInstrumentNote: function(note, dur, time, velocity) {
        // If we were previewing a block, sync back to real instrument state before playing
        if (time === undefined) this.syncAdsrToUI();

        const t = (time !== undefined) ? time : Tone.now() + 0.1;
        const finalNote = (typeof note === 'string' || typeof note === 'number') ? this.getTransposedNote(note) : note;
        const instr = this.instruments[this.currentInstrumentName] || (this.currentInstrumentName === 'DefaultSynth' ? synth : null);
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
        const finalNote = (typeof note === 'string' || typeof note === 'number') ? this.getTransposedNote(note) : note;
        const instr = this.instruments[this.currentInstrumentName] || (this.currentInstrumentName === 'DefaultSynth' ? synth : null);
        if (instr && instr.triggerAttack) {
            if (instr instanceof Tone.Sampler && !instr.loaded) return null; 
            instr.triggerAttack(finalNote, Tone.now(), velocity);
            return triggerAdsrOn(); 
        }
        return null;
    },

    playCurrentInstrumentNoteRelease: function(note, noteId) {
        const finalNote = (typeof note === 'string' || typeof note === 'number') ? this.getTransposedNote(note) : note;
        const instr = this.instruments[this.currentInstrumentName] || (this.currentInstrumentName === 'DefaultSynth' ? synth : null);
        if (instr && instr.triggerRelease) {
            instr.triggerRelease(finalNote, Tone.now());
            triggerAdsrOff(noteId); 
        }
    },

    playChordByNameAttack: function(name, velocity) {
        const notes = this.chords[name];
        const instr = this.instruments[this.currentInstrumentName] || (this.currentInstrumentName === 'DefaultSynth' ? synth : null);
        if (notes && instr && instr.triggerAttack) {
            if (instr instanceof Tone.Sampler && !instr.loaded) return;
            instr.triggerAttack(notes.map(n => this.getTransposedNote(n)), Tone.now(), velocity);
            triggerAdsrOn();
        }
    },

    playChordByNameRelease: function(name) {
        const notes = this.chords[name];
        const instr = this.instruments[this.currentInstrumentName] || (this.currentInstrumentName === 'DefaultSynth' ? synth : null);
        if (notes && instr && instr.triggerRelease) {
            instr.triggerRelease(notes.map(n => this.getTransposedNote(n)), Tone.now());
            triggerAdsrOff();
        }
    },

    playKick: function(v = 1, time) { 
        const t = (time !== undefined) ? time : (Tone.now() + 0.05);
        drum.triggerAttackRelease('C2', '8n', t, v); 
    },
    playSnare: function(v = 1, time) { 
        const t = (time !== undefined) ? time : (Tone.now() + 0.05);
        snare.triggerAttackRelease('8n', t, v); 
    },

    playCountIn: async function(measures = 1, beats = 4, beatValue = 4, volume = 0.8) {
        await ensureAudioStarted();
        const boosted = volume * 10;
        const dur = Tone.Time(beatValue + 'n').toSeconds();
        for (let m = 0; m < measures; m++) {
            for (let b = 0; b < beats; b++) {
                const t = Tone.now() + 0.05;
                if (b === 0) click.triggerAttackRelease("C6", "16n", t, boosted);
                else click.triggerAttackRelease("G5", "16n", t, boosted * 0.5);
                await new Promise(r => setTimeout(r, dur * 1000));
                if (!this.isExecutionActive) return;
            }
        }
    },

    playJazzKitNote: function(note, vel, time) {
        if (jazzKit.loaded) {
            const t = (time !== undefined) ? time : (Tone.now() + 0.05);
            jazzKit.triggerAttackRelease(note, '8n', t, vel || 1);
        }
    },

    playRhythmSequence: function(soundSource, steps, time, measure = 1, isChord = false) {
        if (!steps || !Array.isArray(steps) || time === undefined) return;
        
        const mDur = Tone.Time('1m').toSeconds();
        const sTime = mDur / 16;
        const mStart = time + (measure - 1) * mDur;

        // Determine the target instrument ONCE at scheduling time
        // This solves the issue where changing currentInstrument later affects already scheduled notes
        const targetInstr = this.instruments[soundSource] || this.instruments[this.currentInstrumentName] || synth;

        for (let i = 0; i < Math.min(steps.length, 16); i++) {
            const c = steps[i]; 
            if (c === '.' || c === '-') continue;
            
            // Apply 0.05s look-ahead margin
            const t = mStart + (i * sTime) + 0.05;
            
            // Mode A: Chord Sequence (e.g., c="C7")
            if (isChord) {
                const chordNotes = this.chords[c];
                if (chordNotes && targetInstr && targetInstr.triggerAttackRelease) {
                    if (targetInstr instanceof Tone.Sampler && !targetInstr.loaded) continue;
                    targetInstr.triggerAttackRelease(chordNotes.map(n => this.getTransposedNote(n)), '16n', t, 0.8);
                }
                continue;
            }

            // Mode B: Rhythm/Note Sequence
            // Check if soundSource is actually a defined Chord Name (Legacy support or explicit chord source)
            if (this.chords[soundSource]) {
                 this.playChordByName(soundSource, '16n', 0.8, t); 
                 // Note: playChordByName still uses currentInstrument, but this path is less likely used now
                 continue;
            }

            if (c.toLowerCase() === 'x') {
                if (soundSource === 'KICK') this.playKick(1, t);
                else if (soundSource === 'SNARE') this.playSnare(1, t);
                else if (soundSource === 'HH') hh.triggerAttackRelease('16n', t, 1);
                else if (soundSource === 'CLAP') { if(jazzKit.loaded) jazzKit.triggerAttackRelease('D#1', '8n', t, 1); }
                else {
                    // Play default note C4 on target instrument
                    if (targetInstr && targetInstr.triggerAttackRelease) {
                        targetInstr.triggerAttackRelease(this.getTransposedNote('C4'), '16n', t, 0.8);
                    }
                }
            } else {
                if (['KICK','SNARE','HH','CLAP'].includes(soundSource)) {
                    if (soundSource === 'KICK') this.playKick(1, t);
                    else if (soundSource === 'SNARE') this.playSnare(1, t);
                    else if (soundSource === 'HH') hh.triggerAttackRelease('16n', t, 1);
                    else if (soundSource === 'CLAP') { if(jazzKit.loaded) jazzKit.triggerAttackRelease('D#1', '8n', t, 1); }
                } else {
                    // Specific Note (e.g. "C2") on target instrument
                    if (targetInstr && targetInstr.triggerAttackRelease) {
                        if (targetInstr instanceof Tone.Sampler && !targetInstr.loaded) continue;
                        targetInstr.triggerAttackRelease(this.getTransposedNote(c), '16n', t, 0.8);
                    }
                }
            }
        }
    },

    _playSpecificInstrumentNote: function(name, note, dur, time, velocity) {
        const instr = this.instruments[name] || (name === 'DefaultSynth' ? synth : null);
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

    playChordByName: function(name, dur, vel, time) {
        const notes = this.chords[name];
        const instr = this.instruments[this.currentInstrumentName] || (this.currentInstrumentName === 'DefaultSynth' ? synth : null);
        if (notes && instr) {
            if (instr instanceof Tone.Sampler && !instr.loaded) return;
            const t = (time !== undefined) ? time : Tone.now() + 0.1;
            instr.triggerAttackRelease(notes.map(n => this.getTransposedNote(n)), dur, t, vel);
        }
    },

    playMelodyString: async function(str) {
        await ensureAudioStarted();
        const durMap = { 'W': '1m', 'H': '2n', 'Q': '4n', 'E': '8n', 'S': '16n', 'T': '32n' };
        const notes = str.split(',').join(' ').split('\n').join(' ').split('\r').join(' ').split(' ').filter(s => s.trim().length > 0);
        for (const n of notes) {
            if (!this.isExecutionActive) break;
            const m = n.match(/^(R)?([A-G][#b]?)?([0-8])?([WHQEST])(\.?|_T)?$/i);
            if (m) {
                let d = durMap[m[4].toUpperCase()] || '4n';
                if (m[5] === '.') d += '.'; if (m[5] === '_T') d = d.replace('n', 't');
                if (m[1]) { await new Promise(r => setTimeout(r, Tone.Time(d).toMilliseconds())); } 
                else {
                    this.playCurrentInstrumentNote((m[2]||"C")+(m[3]||"4"), d, undefined, 0.8);
                    await new Promise(r => setTimeout(r, Tone.Time(d).toMilliseconds()));
                }
            }
        }
    },

    midiAttack: async function(note, vel, ch) {
        await ensureAudioStarted();
        const chord = this.midiChordMap[note];
        const toPlay = chord ? this.chords[chord].map(n => this.getTransposedNote(n)) : this.getTransposedNote(note);
        const instr = this.instruments[this.currentInstrumentName] || (this.currentInstrumentName === 'DefaultSynth' ? synth : null);
        if (instr && instr.triggerAttack) {
            if (instr instanceof Tone.Sampler && !instr.loaded) return;
            instr.triggerAttack(toPlay, Tone.now(), vel);
            const noteId = triggerAdsrOn();
            this.midiPlayingNotes.set(note, { notes: toPlay, id: noteId });
        }
    },

    midiRelease: async function(note) {
        const entry = this.midiPlayingNotes.get(note);
        if (!entry) return;
        const toRel = entry.notes || entry;
        const noteId = entry.id;
        const instr = this.instruments[this.currentInstrumentName] || (this.currentInstrumentName === 'DefaultSynth' ? synth : null);
        if (instr && instr.triggerRelease) {
            instr.triggerRelease(toRel, Tone.now());
            this.midiPlayingNotes.delete(note);
            triggerAdsrOff(noteId);
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
        for (const name in this.instruments) { if (this.instruments[name] && this.instruments[name].dispose) this.instruments[name].dispose(); delete this.instruments[name]; } 
        
        // Clear Channels
        for (const name in this.channels) {
            if (this.channels[name] && this.channels[name].dispose) this.channels[name].dispose();
            delete this.channels[name];
        }

        this.currentInstrumentName = 'DefaultSynth';
        this.instruments['DefaultSynth'] = synth;
        this.chords = {}; this.keyboardChordMap = {}; this.midiChordMap = {}; this.clearPressedKeys();
        
        // Clear Global Effects
        this._activeEffects.forEach(e => { if (e && e.dispose) e.dispose(); }); 
        this._activeEffects = [];
        
        // Clear Instrument Effects
        Object.values(this.instrumentEffects || {}).forEach(chain => {
             chain.forEach(e => { if (e && e.dispose) e.dispose(); });
        });
        this.instrumentEffects = {};

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

window.audioEngine = audioEngine;
window.blocklyLoops = blocklyLoops;
