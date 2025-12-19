// js/ui/keyboardController.js
import { log } from './logger.js';
import { audioEngine, ensureAudioStarted } from '../core/audioEngine.js'; // Note: audioEngine contains the pressedKeys, chords, etc.

const KEY_TO_NOTE_MAP = {
    'KeyQ': 'C', 'Digit2': 'C#', 'KeyW': 'D', 'Digit3': 'D#', 'KeyE': 'E',
    'KeyR': 'F', 'Digit5': 'F#', 'KeyT': 'G', 'Digit6': 'G#', 'KeyY': 'A',
    'Digit7': 'A#', 'KeyU': 'B',
    'KeyI': 'C', 'Digit9': 'C#', 'KeyO': 'D', 'Digit0': 'D#', 'KeyP': 'E',
    'BracketLeft': 'F', 'BracketRight': 'G', 'Backslash': 'A'
};

let isPcKeyboardMidiEnabled = false;
let currentOctave = 4;
const MIN_OCTAVE = 0;
const MAX_OCTAVE = 8;

const updateLogOctave = () => {
    log(`當前八度: ${currentOctave}`);
};

const shiftOctave = (direction) => {
    currentOctave += direction;
    if (currentOctave < MIN_OCTAVE) currentOctave = MIN_OCTAVE;
    if (currentOctave > MAX_OCTAVE) currentOctave = MAX_OCTAVE;
    updateLogOctave();
};

const getNoteForKeyCode = (keyCode) => {
    const baseNote = KEY_TO_NOTE_MAP[keyCode];
    if (!baseNote) return null;

    let noteOctave = currentOctave;
    const baseOctaveKeys = ['KeyQ', 'Digit2', 'KeyW', 'Digit3', 'KeyE', 'KeyR', 'Digit5', 'KeyT', 'Digit6', 'KeyY', 'Digit7', 'KeyU'];
    const nextOctaveKeys = ['KeyI', 'Digit9', 'KeyO', 'Digit0', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash'];

    if (nextOctaveKeys.includes(keyCode)) {
        noteOctave = currentOctave + 1;
    }

    return `${baseNote}${noteOctave}`;
};

const handleKeyDown = async (e) => {
    if (!isPcKeyboardMidiEnabled || e.repeat) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if ((e.code === 'KeyZ' || e.code === 'Minus' || e.code === 'NumpadSubtract') && currentOctave > MIN_OCTAVE) {
        shiftOctave(-1);
        e.preventDefault();
        return;
    }
    if ((e.code === 'KeyX' || e.code === 'Equal' || e.code === 'NumpadAdd') && currentOctave < MAX_OCTAVE) {
        shiftOctave(1);
        e.preventDefault();
        return;
    }

    let notesToPlay = null;
    let notePlayedType = 'Single';

    const chordName = audioEngine.keyboardChordMap[e.code];
    if (chordName) {
        notesToPlay = audioEngine.chords[chordName];
        notePlayedType = 'Chord';
        if (!notesToPlay) {
            audioEngine.log(`錯誤: 和弦 "${chordName}" 未定義。`);
            return;
        }
    } else {
        notesToPlay = getNoteForKeyCode(e.code);
        if (!notesToPlay) return;
    }

    if (notesToPlay && !audioEngine.pressedKeys.has(e.code)) {
        const ok = await ensureAudioStarted();
        if (!ok) return;

        const currentInstrument = audioEngine.instruments[audioEngine.currentInstrumentName];
        if (!currentInstrument || !currentInstrument.triggerAttack) {
            audioEngine.log(`錯誤: PC鍵盤無法播放。樂器 "${audioEngine.currentInstrumentName}" 不存在或不支持 triggerAttack。`);
            return;
        }
        if (currentInstrument instanceof audioEngine.Tone.Sampler && !currentInstrument.loaded) {
            audioEngine.log(`警告: PC鍵盤無法播放。樂器 "${audioEngine.currentInstrumentName}" (Sampler) 樣本尚未載入。`);
            return;
        }

        const velocity = 0.7;
        try {
            currentInstrument.triggerAttack(notesToPlay, audioEngine.Tone.now(), velocity);
        } catch (e) {
            audioEngine.log(`triggerAttack failed for keyboard: ${e.message}`);
            console.error(e);
        }
        audioEngine.pressedKeys.set(e.code, notesToPlay);
        audioEngine.log(`Keyboard ON (${notePlayedType}): ${Array.isArray(notesToPlay) ? notesToPlay.join(', ') : notesToPlay}`);
        e.preventDefault();
    }
};

const handleKeyUp = async (e) => {
    if (!isPcKeyboardMidiEnabled) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'KeyZ' || e.code === 'KeyX' || e.code === 'Minus' || e.code === 'Equal' || e.code === 'NumpadSubtract' || e.code === 'NumpadAdd') return;

    const note = audioEngine.pressedKeys.get(e.code);
    if (note) {
        const ok = await ensureAudioStarted();
        if (!ok) {
            audioEngine.pressedKeys.delete(e.code);
            return;
        }

        const currentInstrument = audioEngine.instruments[audioEngine.currentInstrumentName];
        if (!currentInstrument || !currentInstrument.triggerRelease) {
            audioEngine.log(`錯誤: PC鍵盤無法釋放。樂器 "${audioEngine.currentInstrumentName}" 不存在或不支持 triggerRelease。`);
            audioEngine.pressedKeys.delete(e.code);
            return;
        }
        if (currentInstrument instanceof audioEngine.Tone.Sampler && !currentInstrument.loaded) {
            audioEngine.log(`警告: PC鍵盤無法釋放。樂器 "${audioEngine.currentInstrumentName}" (Sampler) 樣本尚未載入。`);
            audioEngine.pressedKeys.delete(e.code);
            return;
        }

        currentInstrument.triggerRelease(note, audioEngine.Tone.now());
        audioEngine.pressedKeys.delete(e.code);
        audioEngine.log(`Keyboard OFF: ${e.code} -> ${note}`);
        e.preventDefault();
    }
};

/**
 * Initializes the PC Keyboard MIDI controller.
 * Exposes enable/disable functions via window.audioEngine for Blockly blocks.
 */
export function initKeyboardController() {
    // Expose functions to enable/disable PC Keyboard MIDI
    audioEngine.enablePcKeyboardMidi = () => {
        if (!isPcKeyboardMidiEnabled) {
            document.addEventListener('keydown', handleKeyDown);
            document.addEventListener('keyup', handleKeyUp);
            isPcKeyboardMidiEnabled = true;
            log('PC 鍵盤 MIDI 功能已開啟');
            updateLogOctave();
        }
    };

    audioEngine.disablePcKeyboardMidi = () => {
        if (isPcKeyboardMidiEnabled) {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            isPcKeyboardMidiEnabled = false;
            log('PC 鍵盤 MIDI 功能已關閉');
            audioEngine.pressedKeys.clear(); // Clear any lingering pressed keys
        }
    };
    
    // Default to disabled
    audioEngine.disablePcKeyboardMidi();
    log("PC Keyboard MIDI Controller initialized (defaulting to disabled).");
}
