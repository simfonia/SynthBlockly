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
const distortionEffect = new Tone.Distortion(0.0);
const reverbEffect = new Tone.Reverb(1.5);
const feedbackDelayEffect = new Tone.FeedbackDelay("8n", 0.25);
const filterEffect = new Tone.Filter(20000, "lowpass"); // Default to open lowpass
filterEffect.Q.value = 1;

distortionEffect.wet.value = 0;
reverbEffect.wet.value = 0;
feedbackDelayEffect.wet.value = 0;

// --- Instruments ---
const synth = new Tone.PolySynth(Tone.Synth);
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
// Chain instruments through effects to the analyser, with filter first
synth.chain(filterEffect, distortionEffect, feedbackDelayEffect, reverbEffect, analyser);
drum.chain(filterEffect, distortionEffect, feedbackDelayEffect, reverbEffect, analyser);
hh.chain(filterEffect, distortionEffect, feedbackDelayEffect, reverbEffect, analyser);
snare.chain(filterEffect, distortionEffect, feedbackDelayEffect, reverbEffect, analyser);
jazzKit.chain(filterEffect, distortionEffect, feedbackDelayEffect, reverbEffect, analyser);


// --- Audio Engine Object ---

export const audioEngine = {
    Tone: Tone,
    analyser: analyser, // Make analyser accessible on the global engine object
    synth: synth,
    drum: drum,
    hh: hh,
    snare: snare,
    jazzKit: jazzKit,
    effects: {
        distortion: distortionEffect,
        reverb: reverbEffect,
        feedbackDelay: feedbackDelayEffect,
        filter: filterEffect // ADD THIS
    },
    instruments: {},
    currentInstrumentName: 'DefaultSynth',
    pressedKeys: new Map(),
    chords: {},
    keyboardChordMap: {},
    midiChordMap: {},
    midiPressedNotes: new Map(),
    midiPlayingNotes: new Map(),

    log: log, // Use the imported log function

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
            // All new instruments must also be chained through the filter first, then other effects and analyser
            newInstrument.chain(filterEffect, distortionEffect, feedbackDelayEffect, reverbEffect, analyser);
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

        try {
            const newInstrument = new Tone.PolySynth(Tone.Synth, {
                oscillator: {
                    type: "custom", // Set oscillator type to custom
                    partials: partialsArray // Use the provided partials array
                }
            });

            newInstrument.chain(filterEffect, distortionEffect, feedbackDelayEffect, reverbEffect, analyser);
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
            // --- Manual Polyphonic Instrument using an array of oscillators and a shared envelope ---
            const envelope = new Tone.AmplitudeEnvelope({ attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.5 });
            const oscillators = [];

            components.forEach(comp => {
                const osc = new Tone.Oscillator(0, "sine");
                const gain = new Tone.Gain(comp.amp).connect(envelope);
                osc.connect(gain);
                oscillators.push({ osc: osc, freqRatio: comp.freqRatio });
            });

            const newInstrument = {
                oscillators: oscillators,
                envelope: envelope,
                activeNotes: new Map(), // To track which note is playing on which oscillator set

                triggerAttack: function(note, time, velocity) {
                    const freq = new Tone.Frequency(note).toFrequency();
                    // In this simple model, we just overwrite. A true poly version would manage voices.
                    // For now, this acts like a mono synth that can be re-triggered.
                    this.oscillators.forEach(item => {
                        item.osc.frequency.setValueAtTime(freq * item.freqRatio, time);
                        if(item.osc.state === 'stopped') {
                            item.osc.start(time);
                        }
                    });
                    this.envelope.triggerAttack(time, velocity);
                },
                triggerRelease: function(note, time) {
                    // In this model, any release call releases the envelope.
                    this.envelope.triggerRelease(time);
                },
                triggerAttackRelease: function(notes, duration, time, velocity) {
                    time = time || Tone.now();
                    this.triggerAttack(notes, time, velocity);
                    this.triggerRelease(time + Tone.Time(duration).toSeconds());
                },
                chain: function(...args) {
                    // The output of this instrument is the envelope
                    this.envelope.chain(...args);
                },
                dispose: function() {
                    this.envelope.dispose();
                    this.oscillators.forEach(item => item.osc.dispose());
                }
            };
            
            newInstrument.chain(filterEffect, distortionEffect, feedbackDelayEffect, reverbEffect, analyser);
            this.instruments[name] = newInstrument;
            this.log(`成功創建加法合成器 "${name}"。`);

        } catch(e) {
            this.log(`創建加法合成器 "${name}" 失敗: ${e.message}`);
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
            this.log(`已切換到樂器: ${newInstrumentName} (沒有舊樂器可供轉換)。`);
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

        this.currentInstrumentName = newInstrumentName;
        this.log(`已切換到樂器: ${newInstrumentName}，並轉換了正在彈奏的音符。`);
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

    panicStopAllSounds: function() {
        this.log('緊急停止！正在停止所有聲音並重設狀態...');
        this.Tone.Transport.stop();
        this.log('✓ 主時鐘 (Transport) 已停止');
        for (const instrName in this.instruments) {
            if (this.instruments.hasOwnProperty(instrName)) {
                const instrument = this.instruments[instrName];
                if (instrument && typeof instrument.dispose === 'function') {
                    instrument.dispose();
                }
            }
        }
        this.log('✓ 所有樂器聲音已釋放');
        if (blocklyLoops) {
            for (const loopId in blocklyLoops) {
                if (blocklyLoops.hasOwnProperty(loopId) && blocklyLoops[loopId] instanceof this.Tone.Loop) {
                    window.blocklyLoops[loopId].dispose();
                }
            }
            blocklyLoops = {};
            this.log('✓ 所有 Blockly 循環已停止');
        }
        this.clearPressedKeys();
        this.log('緊急停止完成。');
    }
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
