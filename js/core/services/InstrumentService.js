import * as Tone from 'tone';
import { logKey } from '../../ui/logger.js';
import { updateAdsrGraph } from '../../ui/adsrVisualizer.js';

/**
 * Service responsible for managing instrument lifecycle, ADSR settings, and routing.
 */
export class InstrumentService {
    /**
     * @param {Object} audioEngine - Reference to the main AudioEngine.
     */
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.instruments = {};
        this.layeredInstruments = {};
        this.instrumentSettings = {};
        this.currentInstrumentName = null;
        this.DEFAULT_ADSR = { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.5 };
    }

    /**
     * Creates a standard synth instrument.
     * @param {string} name - Unique instrument name.
     * @param {string} type - Synth type (e.g., 'PolySynth', 'AMSynth', 'FMSynth').
     */
    createInstrument(name, type) {
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
            case 'Sampler': 
                // Enhanced Piano Sampler with full multisampling (A, C, Ds, Fs)
                i = new Tone.Sampler({ 
                    urls: { 
                        "A1": "A1.mp3", "A2": "A2.mp3", "A3": "A3.mp3", "A4": "A4.mp3", "A5": "A5.mp3", "A6": "A6.mp3", "A7": "A7.mp3",
                        "C1": "C1.mp3", "C2": "C2.mp3", "C3": "C3.mp3", "C4": "C4.mp3", "C5": "C5.mp3", "C6": "C6.mp3", "C7": "C7.mp3",
                        "D#1": "Ds1.mp3", "D#2": "Ds2.mp3", "D#3": "Ds3.mp3", "D#4": "Ds4.mp3", "D#5": "Ds5.mp3", "D#6": "Ds6.mp3",
                        "F#1": "Fs1.mp3", "F#2": "Fs2.mp3", "F#3": "Fs3.mp3", "F#4": "Fs4.mp3", "F#5": "Fs5.mp3", "F#6": "Fs6.mp3"
                    }, 
                    baseUrl: import.meta.env.BASE_URL + "samples/piano/",
                    onload: () => console.log("Piano multisamples loaded successfully.")
                }); 
                break;
        }
        if (i) {
            try {
                const adsr = this.audioEngine.currentADSR || this.DEFAULT_ADSR;
                i.set({
                    envelope: { ...adsr, decayCurve: 'linear', releaseCurve: 'linear' }
                });
                if (i.get().voice0) { 
                    i.set({
                        voice0: { envelope: { ...adsr, decayCurve: 'linear', releaseCurve: 'linear' } },
                        voice1: { envelope: { ...adsr, decayCurve: 'linear', releaseCurve: 'linear' } }
                    });
                }
            } catch(e) {}
            
            this.instruments[name] = i;
            this.instrumentSettings[name] = { ...(this.audioEngine.currentADSR || this.DEFAULT_ADSR) };
            if (!this.currentInstrumentName) {
                this.currentInstrumentName = name;
                this.syncAdsrToUI();
            }
            this.audioEngine._connectInstrumentToChain(name, i);
        }
    }

    /**
     * Creates a custom sampler instrument.
     * @param {string} name - Unique instrument name.
     * @param {Object|string} urls - Map of note to URL, or a URL pointing to a JSON file.
     * @param {string} baseUrl - Base URL for samples.
     * @param {Object} [settings=null] - Optional settings.
     */
    async createCustomSampler(name, urls, baseUrl, settings = null) {
        if (this.instruments[name]) this.instruments[name].dispose();
        
        let finalUrls = urls;
        
        // If urls is a string and starts with http or looks like a path, fetch it
        if (typeof urls === 'string' && (urls.startsWith('http') || urls.endsWith('.json'))) {
            try {
                const response = await fetch(urls);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                finalUrls = await response.json();
                logKey('LOG_SAMPLER_LOADED', 'info', name);
            } catch (e) {
                logKey('LOG_SAMPLER_JSON_ERR', 'error', e.message);
                return;
            }
        }

        const s = new Tone.Sampler({ 
            urls: finalUrls, 
            baseUrl, 
            onload: () => logKey('LOG_SAMPLER_SAMPLES_LOADED', 'info', name) 
        });
        
        if (settings) s.set(settings);
        this.instruments[name] = s;
        this.instrumentSettings[name] = { ...(this.audioEngine.currentADSR || this.DEFAULT_ADSR) };
        if (!this.currentInstrumentName) {
            this.currentInstrumentName = name;
            this.syncAdsrToUI();
        }
        this.audioEngine._connectInstrumentToChain(name, s);
    }

    /**
     * Creates a layered instrument (container for multiple instruments).
     * @param {string} name - Name of the layered instrument.
     * @param {string[]} childNames - List of child instrument names.
     */
    createLayeredInstrument(name, childNames) {
        this.layeredInstruments[name] = childNames;
        this.instruments[name] = { type: 'Layered', children: childNames };
    }

    /**
     * Creates a custom harmonic synth instrument.
     * @param {string} name - Instrument name.
     * @param {number[]} partials - Array of partial amplitudes.
     */
    createCustomWaveInstrument(name, partials) {
        if (this.instruments[name]) this.instruments[name].dispose();
        try {
            const validPartials = partials.map(p => Number(p) || 0);
            const adsr = this.audioEngine.currentADSR || this.DEFAULT_ADSR;
            const synth = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'custom', partials: validPartials },
                envelope: { ...adsr, decayCurve: 'linear', releaseCurve: 'linear' }
            });
            this.instruments[name] = synth;
            this.instrumentSettings[name] = { ...adsr };
            if (!this.currentInstrumentName) {
                this.currentInstrumentName = name;
                this.syncAdsrToUI();
            }
            this.audioEngine._connectInstrumentToChain(name, synth);
            logKey('LOG_CUSTOM_WAVE_CREATED', 'info', name, validPartials.join(', '));
        } catch (e) {
            logKey('LOG_INSTR_CREATE_FAIL', 'error', name, e.message);
        }
    }

    /**
     * Creates an additive synth instrument.
     * @param {string} name - Instrument name.
     * @param {Object[]} components - Array of oscillator configurations.
     */
    createAdditiveInstrument(name, components) {
        if (this.instruments[name]) this.instruments[name].dispose();
        
        let totalAmp = 0;
        components.forEach(c => { totalAmp += (Number(c.amp) || 0); });
        const scaleFactor = totalAmp > 1.0 ? (1.0 / totalAmp) : 1.0;

        const self = this;
        class AdditiveVoice extends Tone.Synth {
            constructor(options) {
                super(options);
                this.name = "AdditiveVoice";
                if (this.oscillator) { this.oscillator.stop(); this.oscillator.disconnect(); }
                this.additiveOscillators = [];
                components.forEach(c => {
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
                this.envelope.cancel(time);
                super.triggerRelease(time);
            }
            dispose() {
                this.additiveOscillators.forEach(item => { item.osc.stop(); item.osc.dispose(); });
                super.dispose();
                return this;
            }
        }

        try {
            const adsr = this.audioEngine.currentADSR || this.DEFAULT_ADSR;
            const synth = new Tone.PolySynth(AdditiveVoice, { maxPolyphony: 16 });
            synth.set({ envelope: { ...adsr, decayCurve: 'linear', releaseCurve: 'linear' } });
            this.instruments[name] = synth;
            this.instrumentSettings[name] = { ...adsr };
            if (!this.currentInstrumentName) {
                this.currentInstrumentName = name;
                this.syncAdsrToUI();
            }
            this.audioEngine._connectInstrumentToChain(name, synth);
            logKey('LOG_ADDITIVE_CREATED', 'info', name);
        } catch (e) {
            logKey('LOG_ADDITIVE_CREATE_FAIL', 'error', name, e.message);
        }
    }

    /**
     * Switches the current active instrument.
     * @param {string} name - Instrument name.
     */
    transitionToInstrument(name) {
        const cleanName = String(name || '').replace(/^['"]|['"]$/g, '');
        
        // Handle common invalid targets or 'NONE' from UI fallback
        if (!cleanName || cleanName === 'NONE' || !this.instruments[cleanName]) {
             // If we have instruments, try to pick 'DefaultSynth' or the first available one
             const fallback = this.instruments['DefaultSynth'] ? 'DefaultSynth' : Object.keys(this.instruments)[0];
             if (fallback && fallback !== cleanName) {
                 this.currentInstrumentName = fallback;
                 this.syncAdsrToUI();
                 return;
             }
             if (cleanName && cleanName !== 'NONE') {
                 logKey('LOG_SWITCH_INSTR_NOT_EXIST', 'warning', cleanName);
             }
             return;
        }
        
        const oldInstr = this.instruments[this.currentInstrumentName];
        if (oldInstr && oldInstr.releaseAll) oldInstr.releaseAll();
        
        this.currentInstrumentName = cleanName;
        logKey('LOG_SWITCH_INSTR_SUCCESS', 'important', cleanName);
        this.syncAdsrToUI();
    }

    /**
     * Syncs the current instrument's ADSR settings to the UI visualizer.
     */
    syncAdsrToUI() {
        let settings = this.instrumentSettings[this.currentInstrumentName];
        
        if (!settings) {
            let instr = this.instruments[this.currentInstrumentName];
            if (instr && instr.get) {
                try {
                    const live = instr.get();
                    let env = live.envelope || (live.voice0 && live.voice0.envelope) || (live.voices && live.voices[0] && live.voices[0].envelope);
                    if (env) settings = { attack: env.attack, decay: env.decay, sustain: env.sustain, release: env.release };
                } catch(e) {}
            }
        }

        if (!settings) settings = this.audioEngine.currentADSR || this.DEFAULT_ADSR;

        updateAdsrGraph(settings.attack, settings.decay, settings.sustain, settings.release, 
            this.currentInstrumentName && this.currentInstrumentName.toLowerCase().includes('sampler'));
    }

    /**
     * Disposes all instruments.
     */
    disposeAll() {
        for (const name in this.instruments) {
            if (this.instruments[name] && this.instruments[name].dispose) {
                this.instruments[name].dispose();
            }
        }
        this.instruments = {};
        this.layeredInstruments = {};
        this.instrumentSettings = {};
        this.currentInstrumentName = null;
    }
}
