import * as Tone from 'tone';
import { ensureAudioStarted } from '../audioUtils.js';

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

    /**
     * Plays a step sequence (rhythm).
     * @param {string} soundSource - Source name or keyword (KICK, SNARE, HH, CLAP).
     * @param {string} steps - The sequence string (e.g. "x . x .").
     * @param {number} time - Start time.
     * @param {number} measure - Measure number.
     * @param {boolean} isChord - Whether the steps represent chords.
     */
    playRhythmSequence(soundSource, steps, time, measure = 1, isChord = false) {
        if (!steps || !Array.isArray(steps) || time === undefined) return;
        
        const mDur = Tone.Time('1m').toSeconds();
        const sTime = mDur / 16;
        const mStart = time + (measure - 1) * mDur;

        // Use delegated properties from audioEngine
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

    /**
     * Parses and plays a melody string.
     * @param {string} str - The melody string (e.g. "C4Q, D4H").
     */
    async playMelodyString(str) {
            await ensureAudioStarted();
            const durMap = { 'W': '1m', 'H': '2n', 'Q': '4n', 'E': '8n', 'S': '16n', 'T': '32n' };
            const tokens = str.split(/[,\s\n\r]+/).filter(s => s.trim().length > 0);
            
            for (const token of tokens) {            if (!this.audioEngine.isExecutionActive) break;
            
            let prefix = token;
            let d = '4n'; 
            const mDur = token.match(/([WHQEST])(\.?|_T)?$/i);
            
            if (mDur) {
                const durPart = mDur[0];
                const durCode = mDur[1].toUpperCase();
                const modifier = mDur[2] || '';
                let baseDur = durMap[durCode] || '4n';
                if (modifier === '.') baseDur += '.'; 
                else if (modifier === '_T') baseDur = baseDur.replace('n', 't');
                d = baseDur;
                prefix = token.slice(0, -durPart.length);
            }
            
            const ms = Tone.Time(d).toMilliseconds();
            const uprefix = prefix.toUpperCase();

            if (uprefix === 'R' || (prefix === '' && mDur)) {
                await new Promise(r => setTimeout(r, ms));
            } else {
                const isStrictNote = prefix.match(/^[A-G][#b]?[0-8]$/i);
                
                if (isStrictNote) {
                    this.audioEngine.playCurrentInstrumentNote(prefix, d, undefined, 0.8);
                } else if (this.audioEngine.chords[prefix]) {
                    this.audioEngine.playChordByName(prefix, d, 0.8, undefined);
                } else {
                    const isLooseNote = prefix.match(/^[A-G][#b]?$/i);
                    if (isLooseNote) {
                        this.audioEngine.playCurrentInstrumentNote(prefix + "4", d, undefined, 0.8);
                    } else {
                         this.audioEngine.logKey('LOG_MELODY_PARSE_ERR', 'warning', prefix);
                    }
                }
                await new Promise(r => setTimeout(r, ms));
            }
        }
    }
}
