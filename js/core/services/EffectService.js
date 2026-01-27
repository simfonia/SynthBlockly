import * as Tone from 'tone';

/**
 * Service responsible for managing audio effects and filter chains.
 */
export class EffectService {
    /**
     * @param {Object} audioEngine - Reference to the main AudioEngine.
     */
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this._activeEffects = []; // Global master effects
        this.instrumentEffects = {}; // Effects per instrument track
    }

    /**
     * Internal factory to create Tone.js effect instances from config.
     * @param {Object} config - Effect configuration object.
     * @returns {Tone.Effect|null}
     */
    _createEffectInstance(config) {
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
    }

    /**
     * Rebuilds the effect chain based on a list of configurations.
     * @param {Object[]} effectsConfig - List of effect configurations.
     */
    rebuildEffectChain(effectsConfig = []) {
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
        
        this.audioEngine._reconnectAll();
    }

    /**
     * Adds a single effect to the chain.
     * @param {Object} config - Effect configuration.
     */
    addEffectToChain(config) {
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
                
            this.audioEngine._reconnectAll();
        }
    }

    /**
     * Clears all effects for a specific target.
     * @param {string} target - 'Master' or instrument name.
     */
    clearEffects(target) {
        const cleanTarget = String(target || 'Master').replace(/^['"]|['"]$/g, '');
        
        if (cleanTarget === 'Master') {
            this._activeEffects.forEach(e => { if (e && e.dispose) e.dispose(); });
            this._activeEffects = [];
        } else {
            if (this.instrumentEffects[cleanTarget]) {
                this.instrumentEffects[cleanTarget].forEach(e => { if (e && e.dispose) e.dispose(); });
                delete this.instrumentEffects[cleanTarget];
            }
        }
        this.audioEngine._reconnectAll();
    }

    /**
     * Updates filter parameters directly.
     * @deprecated Use updateEffectParam instead.
     */
    updateFilter(targetName, freq, q) {
        if (typeof targetName === 'number' && (typeof freq === 'number' || freq === undefined)) {
            q = freq;
            freq = targetName;
            targetName = 'Master';
        }

        const cleanTarget = String(targetName || 'Master').replace(/^['"]|['"]$/g, '');

        let chain;
        if (cleanTarget === 'Master') {
            chain = this._activeEffects;
        } else {
            chain = this.instrumentEffects[cleanTarget];
        }

        if (!chain) return;

        const filter = chain.find(e => {
            return (e instanceof Tone.Filter) || (e.name === 'Filter') || (e.toString && e.toString().includes('Filter'));
        });

        if (filter) {
            if (freq !== undefined && freq !== null && !isNaN(freq)) {
                const safeFreq = Math.max(10, Math.min(20000, Number(freq)));
                if (filter.frequency && filter.frequency.rampTo) {
                    filter.frequency.rampTo(safeFreq, 0.05);
                } else {
                     filter.frequency = safeFreq;
                }
            }
            if (q !== undefined && q !== null && !isNaN(q)) {
                 if (filter.Q && filter.Q.value !== undefined) {
                     filter.Q.value = Math.max(0, Number(q));
                 }
            }
        }
    }

    /**
     * Updates an effect parameter in real-time.
     * @param {string} targetName - Instrument name or 'Master'.
     * @param {string} effectType - Type of effect (e.g., 'filter').
     * @param {string} paramName - Parameter name (e.g., 'frequency').
     * @param {number} value - New value.
     * @param {number} [index=0] - Index of the effect instance if multiple exist.
     */
    updateEffectParam(targetName, effectType, paramName, value, index = 0) {
        const cleanTarget = String(targetName || 'Master').replace(/^['"]|['"]$/g, '');
        let chain = (cleanTarget === 'Master') ? this._activeEffects : this.instrumentEffects[cleanTarget];
        if (!chain) return;

        const typeMap = {
            'distortion': 'Distortion', 'reverb': 'Reverb', 'feedbackDelay': 'FeedbackDelay',
            'filter': 'Filter', 'compressor': 'Compressor', 'limiter': 'Limiter',
            'bitCrusher': 'BitCrusher', 'lofi': 'BitCrusher',
            'chorus': 'Chorus', 'phaser': 'Phaser', 'autoPanner': 'AutoPanner', 'tremolo': 'Tremolo'
        };
        const targetClass = typeMap[effectType];
        if (!targetClass) return;

        // Find ALL matching effects
        const matchingEffects = chain.filter(e => e.name === targetClass || (e.toString && e.toString().includes(targetClass)));
        
        // Pick the one at the specified index
        const effect = matchingEffects[index];
        
        if (effect) {
             const val = Number(value);
             if (isNaN(val)) return;

             let targetParam = paramName;
             if (effectType === 'lofi' && paramName === 'bits') targetParam = 'bits'; 

             if (effect[targetParam] !== undefined) {
                 if (effect[targetParam] && effect[targetParam].value !== undefined && effect[targetParam].rampTo) {
                     effect[targetParam].rampTo(val, 0.05);
                 } else {
                     effect[targetParam] = val;
                 }
             } else {
                 this.audioEngine.logKey('LOG_EFFECT_PARAM_ERR', 'warning', effectType, paramName);
             }
        }
    }

    /**
     * Disposes all effects.
     */
    disposeAll() {
        this._activeEffects.forEach(e => { if (e && e.dispose) e.dispose(); });
        this._activeEffects = [];
        Object.values(this.instrumentEffects).forEach(chain => {
            chain.forEach(e => { if (e && e.dispose) e.dispose(); });
        });
        this.instrumentEffects = {};
    }
}
