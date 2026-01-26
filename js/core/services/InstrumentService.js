import * as Tone from 'tone';
import { logKey } from '../../ui/logger.js';
import { updateAdsrGraph } from '../../ui/adsrVisualizer.js';

export class InstrumentService {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.instruments = {};
        this.layeredInstruments = {};
        this.instrumentSettings = {};
        this.currentInstrumentName = null;
        this.DEFAULT_ADSR = { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.5 };
    }

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
            case 'Sampler': i = new Tone.Sampler({ urls: { "C4": "C4.mp3" }, baseUrl: "https://tonejs.github.io/audio/salamander/" }); break;
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

    createCustomSampler(name, urls, baseUrl, settings = null) {
        if (this.instruments[name]) this.instruments[name].dispose();
        const s = new Tone.Sampler({ urls, baseUrl, onload: () => logKey('LOG_SAMPLER_SAMPLES_LOADED', 'info', name) });
        if (settings) s.set(settings);
        this.instruments[name] = s;
        this.instrumentSettings[name] = { ...(this.audioEngine.currentADSR || this.DEFAULT_ADSR) };
        if (!this.currentInstrumentName) {
            this.currentInstrumentName = name;
            this.syncAdsrToUI();
        }
        this.audioEngine._connectInstrumentToChain(name, s);
    }

    createLayeredInstrument(name, childNames) {
        this.layeredInstruments[name] = childNames;
        this.instruments[name] = { type: 'Layered', children: childNames };
    }

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

    transitionToInstrument(name) {
        const cleanName = String(name).replace(/^['"]|['"]$/g, '');
        if (!this.instruments[cleanName]) {
             logKey('LOG_SWITCH_INSTR_NOT_EXIST', 'warning', cleanName);
             return;
        }
        
        const oldInstr = this.instruments[this.currentInstrumentName];
        if (oldInstr && oldInstr.releaseAll) oldInstr.releaseAll();
        
        this.currentInstrumentName = cleanName;
        logKey('LOG_SWITCH_INSTR_SUCCESS', 'important', cleanName);
        this.syncAdsrToUI();
    }

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
