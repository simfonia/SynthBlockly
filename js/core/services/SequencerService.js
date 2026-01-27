import * as Tone from 'tone';
import { ensureAudioStarted } from '../audioUtils.js';
import { triggerAdsrOn, triggerAdsrOff } from '../../ui/adsrVisualizer.js';

/**
 * Service responsible for sequencing, rhythm playback, and melody parsing.
 */
export class SequencerService {
    /**
     * @param {Object} audioEngine - Reference to the main AudioEngine.
     */
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
    }

    playKick(v = 1, time) {
        const t = (time !== undefined) ? time : (Tone.now() + 0.05);
        if (this.audioEngine._coreInstruments.drum) {
            this.audioEngine._coreInstruments.drum.triggerAttackRelease('C2', '8n', t, v);
        }
    }

    playSnare(v = 1, time) {
        const t = (time !== undefined) ? time : (Tone.now() + 0.05);
        if (this.audioEngine._coreInstruments.snare) {
            this.audioEngine._coreInstruments.snare.triggerAttackRelease('8n', t, v);
        }
    }

    playJazzKitNote(note, vel, time) {
        const kit = this.audioEngine._coreInstruments.jazzKit;
        if (kit && kit.loaded) {
            const t = (time !== undefined) ? time : (Tone.now() + 0.05);
            kit.triggerAttackRelease(note, '8n', t, vel || 1);
        }
    }

    playRhythmSequence(soundSource, steps, time, measure = 1, isChord = false) {
        if (!steps || !Array.isArray(steps) || time === undefined) return;
        const mDur = Tone.Time('1m').toSeconds();
        const sTime = mDur / 16;
        const mStart = time + (measure - 1) * mDur;
        const targetInstr = this.audioEngine.instruments[soundSource] || this.audioEngine.instruments[this.audioEngine.currentInstrumentName];
        for (let i = 0; i < Math.min(steps.length, 16); i++) {
            const c = steps[i]; 
            if (c === '.' || c === '-') continue;
            const t = mStart + (i * sTime) + 0.05;
            if (isChord) {
                const chordNotes = this.audioEngine.chords[c];
                if (chordNotes && targetInstr && targetInstr.triggerAttackRelease) {
                    if (targetInstr instanceof Tone.Sampler && !targetInstr.loaded) continue;
                    targetInstr.triggerAttackRelease(chordNotes.map(n => this.audioEngine.getTransposedNote(n)), '16n', t, 0.8);
                }
                continue;
            }
            if (this.audioEngine.chords[soundSource]) {
                 this.audioEngine.playChordByName(soundSource, '16n', 0.8, t); 
                 continue;
            }
            if (c.toLowerCase() === 'x') {
                if (soundSource === 'KICK') this.playKick(1, t);
                else if (soundSource === 'SNARE') this.playSnare(1, t);
                else if (soundSource === 'HH') {
                    if (this.audioEngine._coreInstruments.hh) this.audioEngine._coreInstruments.hh.triggerAttackRelease('16n', t, 1);
                }
                else if (soundSource === 'CLAP') { this.playJazzKitNote('D#1', 1, t); }
                else if (targetInstr && targetInstr.triggerAttackRelease) {
                    targetInstr.triggerAttackRelease(this.audioEngine.getTransposedNote('C4'), '16n', t, 0.8);
                }
            } else {
                if (['KICK','SNARE','HH','CLAP'].includes(soundSource)) {
                    if (soundSource === 'KICK') this.playKick(1, t);
                    else if (soundSource === 'SNARE') this.playSnare(1, t);
                    else if (soundSource === 'HH') {
                        if (this.audioEngine._coreInstruments.hh) this.audioEngine._coreInstruments.hh.triggerAttackRelease('16n', t, 1);
                    }
                    else if (soundSource === 'CLAP') { this.playJazzKitNote('D#1', 1, t); } 
                } else if (targetInstr && targetInstr.triggerAttackRelease) {
                    if (targetInstr instanceof Tone.Sampler && !targetInstr.loaded) continue;
                    targetInstr.triggerAttackRelease(this.audioEngine.getTransposedNote(c), '16n', t, 0.8);
                }
            }
        }
    }

    playChordByName(name, dur, vel, time, target) {
        const notes = this.audioEngine.chords[name];
        const finalTarget = target || this.audioEngine.currentInstrumentName;
        const instr = this.audioEngine.instruments[finalTarget];
        if (notes && instr) {
            if (instr instanceof Tone.Sampler && !instr.loaded) return;
            const t = (time !== undefined) ? time : Tone.now() + 0.1;
            const transposed = notes.map(n => this.audioEngine.getTransposedNote(n));
            if (instr.triggerAttackRelease) {
                instr.triggerAttackRelease(transposed, dur, t, vel);
                if (time === undefined) {
                    const noteId = triggerAdsrOn();
                    setTimeout(() => { if (this.audioEngine.isExecutionActive) triggerAdsrOff(noteId); }, Tone.Time(dur).toSeconds() * 1000);
                }
            }
        }
    }

    async playMelodyString(str, target, startTime) {
        await ensureAudioStarted();
        const tokens = str.split(/[,\s\n\r]+/).filter(s => s.trim().length > 0);
        const durMap = { 'W': '1m', 'H': '2n', 'Q': '4n', 'E': '8n', 'S': '16n', 'T': '32n' };
        let currentTimeOffset = 0;
        const isScheduled = (typeof startTime === 'number');

        for (const token of tokens) {
            if (this.audioEngine.isExecutionActive === false) break;
            let prefix = token;
            let d = '4n'; 
            const mDur = token.match(/([WHQEST])(\.?|_T)?$/i);
            if (mDur) {
                const durPart = mDur[0];
                const modifier = mDur[2] || '';
                let baseDur = durMap[mDur[1].toUpperCase()] || '4n';
                if (modifier === '.') baseDur += '.'; 
                else if (modifier === '_T') baseDur = baseDur.replace('n', 't');
                d = baseDur;
                prefix = token.slice(0, -durPart.length);
            }
            const durSeconds = Tone.Time(d).toSeconds();
            const uprefix = prefix.toUpperCase();

            if (uprefix === 'R' || (prefix === '' && mDur)) {
                if (isScheduled) currentTimeOffset += durSeconds;
                else await new Promise(r => setTimeout(r, durSeconds * 1000));
            } else {
                const isStrictNote = prefix.match(/^[A-G][#b]?[0-8]$/i);
                const isLooseNote = prefix.match(/^[A-G][#b]?$/i);
                const playFunc = async () => {
                    const finalTarget = target || this.audioEngine.currentInstrumentName;
                    const instr = this.audioEngine.instruments[finalTarget];
                    if (!instr) return;
                    if (instr instanceof Tone.Sampler && !instr.loaded) {
                        let retry = 0;
                        while (!instr.loaded && retry < 10) { 
                            if (this.audioEngine.isExecutionActive === false) return;
                            await new Promise(r => setTimeout(r, 50)); retry++; 
                        }
                        if (!instr.loaded) return;
                    }
                    const noteTime = isScheduled ? (startTime + currentTimeOffset) : undefined;
                    if (isStrictNote || isLooseNote) {
                        const noteToPlay = isStrictNote ? prefix : (prefix + "4");
                        if (target) this.audioEngine._playSpecificInstrumentNote(target, noteToPlay, d, noteTime, 0.8);
                        else this.audioEngine.playCurrentInstrumentNote(noteToPlay, d, noteTime, 0.8);
                    } else if (this.audioEngine.chords[prefix]) {
                        const transposed = this.audioEngine.chords[prefix].map(n => this.audioEngine.getTransposedNote(n));
                        if (instr.triggerAttackRelease) instr.triggerAttackRelease(transposed, d, (noteTime || Tone.now() + 0.05), 0.8);
                    }
                };

                if (isScheduled) {
                    playFunc(); // Fire instantly for scheduling
                    currentTimeOffset += durSeconds;
                } else {
                    await playFunc();
                    if (this.audioEngine.isExecutionActive === false) break;
                    await new Promise(r => setTimeout(r, durSeconds * 1000));
                }
            }
        }
    }
}
