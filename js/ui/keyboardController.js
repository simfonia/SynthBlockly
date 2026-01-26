// js/ui/keyboardController.js
import { log, logKey } from './logger.js';
import { audioEngine } from '../core/audioEngine.js'; // Note: audioEngine contains the pressedKeys, chords, etc.
import { ensureAudioStarted } from '../core/audioUtils.js';
import { triggerAdsrOn, triggerAdsrOff } from './adsrVisualizer.js';

const KEY_TO_NOTE_MAP = {
    'KeyQ': 'C', 'Digit2': 'C#', 'KeyW': 'D', 'Digit3': 'D#', 'KeyE': 'E',
    'KeyR': 'F', 'Digit5': 'F#', 'KeyT': 'G', 'Digit6': 'G#', 'KeyY': 'A',
    'Digit7': 'A#', 'KeyU': 'B',
    'KeyI': 'C', 'Digit9': 'C#', 'KeyO': 'D', 'Digit0': 'D#', 'KeyP': 'E',
    'BracketLeft': 'F', 'BracketRight': 'G', 'Backslash': 'A'
};

let isPcKeyboardMidiEnabled = false;

const updateLogTransposition = () => {
    logKey('LOG_SEMITONE_ADJUSTED', 'important', audioEngine.currentSemitoneOffset, audioEngine.currentSemitoneOffset * 100);
};

const shiftTransposition = (semitones) => {
    audioEngine.currentSemitoneOffset += semitones;
    updateLogTransposition();
};

const getBaseNoteForKeyCode = (keyCode) => {
    const baseNote = KEY_TO_NOTE_MAP[keyCode];
    if (!baseNote) return null;

    // Fixed base octave 4. The actual pitch will be handled by global transposition.
    let octave = 4;
    const nextOctaveKeys = ['KeyI', 'Digit9', 'KeyO', 'Digit0', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash'];

    if (nextOctaveKeys.includes(keyCode)) {
        octave = 5;
    }

    return `${baseNote}${octave}`;
};

/**
 * Switches to the next or previous instrument in the list.
 * @param {number} direction -1 for previous, 1 for next.
 */
const switchInstrument = (direction) => {
    // Get currently active instrument names from the engine
    const instrumentNames = Object.keys(audioEngine.instruments);
    
    if (instrumentNames.length === 0) {
        audioEngine.logKey('LOG_ERR_INSTR_NOT_FOUND', 'warning', 'Any');
        return;
    }
    if (instrumentNames.length < 2) {
        audioEngine.logKey('LOG_SWITCH_INSTR_NOT_EXIST', 'warning', 'Alternative');
        return; 
    }

    let currentIndex = instrumentNames.indexOf(audioEngine.currentInstrumentName);
    // If current instrument is somehow lost or not in list, start from 0
    if (currentIndex === -1) currentIndex = 0;

    const newIndex = (currentIndex + direction + instrumentNames.length) % instrumentNames.length;
    const newInstrumentName = instrumentNames[newIndex];
    
    audioEngine.transitionToInstrument(newInstrumentName);
};

const handleKeyDown = async (e) => {
    // Ignore events when IME is active, or if the key is a repeat.
    if (e.isComposing || !isPcKeyboardMidiEnabled || e.repeat) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // --- Instrument Switching ---
    if (e.code === 'ArrowLeft') {
        switchInstrument(-1);
        e.preventDefault();
        return;
    }
    if (e.code === 'ArrowRight') {
        switchInstrument(1);
        e.preventDefault();
        return;
    }

    // --- Octave Switching (mapped to global offset) ---
    if (e.code === 'ArrowDown') {
        shiftTransposition(-12);
        e.preventDefault();
        return;
    }
    if (e.code === 'ArrowUp') {
        shiftTransposition(12);
        e.preventDefault();
        return;
    }

    // --- Semitone Adjustment ---
    if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
        shiftTransposition(-1);
        e.preventDefault();
        return;
    } 
    if (e.code === 'Equal' || e.code === 'NumpadAdd') {
        shiftTransposition(1);
        e.preventDefault();
        return;
    }

    // --- Reset Transposition ---
    if (e.code === 'Backspace') {
        audioEngine.currentSemitoneOffset = 0;
        audioEngine.logKey('LOG_SEMITONE_RESET', 'important');
        e.preventDefault();
        return;
    }

    // --- 1. Custom Key Actions (Highest Priority) ---
    const action = audioEngine.keyActionMap[e.code];
    if (action) {
        if (typeof action.down === 'function') action.down();
        else if (typeof action === 'function') action(); // Backward compatibility if simple function
        e.preventDefault();
        return;
    }

    // --- 2. Chord Mapping ---
    let notesToPlay = null;
    let notePlayedType = 'Single';

    const chordName = audioEngine.keyboardChordMap[e.code];
    if (chordName) {
        if (audioEngine.chords[chordName]) {
            if (!audioEngine.pressedKeys.has(e.code)) {
                await ensureAudioStarted();
                // Store ID if chord attack returns one (currently chords logic might not return ID properly, handled separately or TODO)
                // For now, assume chords don't interfere with single note visualizer logic as heavily or are handled globally
                audioEngine.playChordByNameAttack(chordName, 0.7);
                audioEngine.pressedKeys.set(e.code, { type: 'chord', name: chordName });
            }
        } else {
            audioEngine.logKey('LOG_CHORD_UNDEFINED', 'error', chordName);
        }
        e.preventDefault();
        return;
    } else {
        notesToPlay = getBaseNoteForKeyCode(e.code);
        if (!notesToPlay) return;
    }

    if (notesToPlay && !audioEngine.pressedKeys.has(e.code)) {
        const ok = await ensureAudioStarted();
        if (!ok) return;

        const noteId = audioEngine.playCurrentInstrumentNoteAttack(notesToPlay, 0.7);
        audioEngine.pressedKeys.set(e.code, { type: 'note', name: notesToPlay, noteId: noteId });
        e.preventDefault();
    }
};

const handleKeyUp = async (e) => {
    // Ignore events when IME is active.
    if (e.isComposing || !isPcKeyboardMidiEnabled) return;

    // Ignore special control keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Minus', 'Equal', 'NumpadSubtract', 'NumpadAdd', 'Backspace'].includes(e.code)) return;

    // --- 1. Custom Key Actions ---
    const action = audioEngine.keyActionMap[e.code];
    if (action && typeof action.up === 'function') {
        action.up();
        e.preventDefault();
        return;
    }

    const playedInfo = audioEngine.pressedKeys.get(e.code);
    if (playedInfo) {
        const ok = await ensureAudioStarted();
        if (!ok) {
            audioEngine.pressedKeys.delete(e.code);
            return;
        }

        if (playedInfo.type === 'chord') {
            audioEngine.playChordByNameRelease(playedInfo.name);
        } else {
            audioEngine.playCurrentInstrumentNoteRelease(playedInfo.name, playedInfo.noteId); // Pass noteId
        }

        audioEngine.pressedKeys.delete(e.code);
        e.preventDefault();
    }
};

/**
 * Initializes the PC Keyboard MIDI controller.
 */
export function initKeyboardController() {
    audioEngine.enablePcKeyboardMidi = () => {
        if (!isPcKeyboardMidiEnabled) {
            window.addEventListener('keydown', handleKeyDown);
            window.addEventListener('keyup', handleKeyUp);
            isPcKeyboardMidiEnabled = true;
            logKey('LOG_KEYBOARD_MIDI_ON');
            updateLogTransposition();
        }
    };

    audioEngine.disablePcKeyboardMidi = () => {
        if (isPcKeyboardMidiEnabled) {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            isPcKeyboardMidiEnabled = false;
            logKey('LOG_KEYBOARD_MIDI_OFF');
            audioEngine.pressedKeys.clear();
        }
    };
    
    audioEngine.disablePcKeyboardMidi();
    logKey("LOG_KEYBOARD_INIT");
}
