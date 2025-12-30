// js/ui/keyboardController.js
import { log, logKey } from './logger.js';
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
    logKey('LOG_KEYBOARD_OCTAVE', 'info', currentOctave);
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

/**
 * Switches to the next or previous instrument in the list.
 * @param {number} direction -1 for previous, 1 for next.
 */
const switchInstrument = (direction) => {
    const instrumentNames = Object.keys(audioEngine.instruments);
    if (instrumentNames.length < 2) {
        audioEngine.logKey('LOG_SWITCH_INSTR_NOT_EXIST', 'warning', 'Other');
        return; // Not enough instruments to switch
    }
    const currentIndex = instrumentNames.indexOf(audioEngine.currentInstrumentName);
    // The + instrumentNames.length is a robust way to handle negative results from modulo
    const newIndex = (currentIndex + direction + instrumentNames.length) % instrumentNames.length;
    const newInstrumentName = instrumentNames[newIndex];
    
    // Call the existing transition function
    audioEngine.transitionToInstrument(newInstrumentName);
};

const handleKeyDown = async (e) => {
    // Ignore events when IME is active, or if the key is a repeat.
    if (e.isComposing || !isPcKeyboardMidiEnabled || e.repeat) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // --- Octave and Instrument Switching ---
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
    if (e.code === 'ArrowDown' && currentOctave > MIN_OCTAVE) { // Removed NumpadSubtract
        shiftOctave(-1);
        e.preventDefault();
        return;
    }
    if (e.code === 'ArrowUp' && currentOctave < MAX_OCTAVE) { // Removed NumpadAdd
        shiftOctave(1);
        e.preventDefault();
        return;
    }

    // --- Semitone Adjustment ---
    const currentInstrument = audioEngine.instruments[audioEngine.currentInstrumentName];
    if (currentInstrument && currentInstrument.set) { // Check if the instrument supports .set()
        let detuneChange = 0;
        if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
            detuneChange = -100; // -1 semitone = -100 cents
        } else if (e.code === 'Equal' || e.code === 'NumpadAdd') {
            detuneChange = 100; // +1 semitone = +100 cents
        }

        if (detuneChange !== 0) {
            audioEngine.currentSemitoneOffset += (detuneChange / 100); // Store in semitones
            currentInstrument.set({ detune: audioEngine.currentSemitoneOffset * 100 });
            audioEngine.log(`Semitone adjusted to ${audioEngine.currentSemitoneOffset}. Detune: ${audioEngine.currentSemitoneOffset * 100} cents.`);
            e.preventDefault();
            return;
        }

        // --- Reset Semitone Adjustment ---
        if (e.code === 'Backspace') {
            audioEngine.currentSemitoneOffset = 0;
            currentInstrument.set({ detune: 0 });
            audioEngine.log('Semitone offset reset to 0.');
            e.preventDefault();
            return;
        }

        // --- Reset Semitone Adjustment ---
        if (e.code === 'Backspace') {
            audioEngine.currentSemitoneOffset = 0;
            currentInstrument.set({ detune: 0 });
            audioEngine.log('Semitone offset reset to 0.');
            e.preventDefault();
            return;
        }
    }

    let notesToPlay = null;
    let notePlayedType = 'Single';

    const chordName = audioEngine.keyboardChordMap[e.code];
    if (chordName) {
        notesToPlay = audioEngine.chords[chordName];
        notePlayedType = 'Chord';
        if (!notesToPlay) {
            audioEngine.logKey('LOG_CHORD_UNDEFINED', 'error', chordName);
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
            audioEngine.logKey('LOG_PLAY_NOTE_FAIL', 'error', audioEngine.currentInstrumentName);
            return;
        }
        if (currentInstrument instanceof audioEngine.Tone.Sampler && !currentInstrument.loaded) {
            audioEngine.logKey('LOG_SAMPLER_NOT_LOADED', 'warning', audioEngine.currentInstrumentName);
            return;
        }

        const velocity = 0.7;
        try {
            currentInstrument.triggerAttack(notesToPlay, audioEngine.Tone.now(), velocity);
        } catch (e) {
            audioEngine.logKey('LOG_PLAY_NOTE_FAIL', 'error', audioEngine.currentInstrumentName + ": " + e.message);
            console.error(e);
        }
        audioEngine.pressedKeys.set(e.code, notesToPlay);
        audioEngine.log(`Keyboard ON (${notePlayedType}): ${Array.isArray(notesToPlay) ? notesToPlay.join(', ') : notesToPlay}`);
        e.preventDefault();
    }
};

const handleKeyUp = async (e) => {
    // Ignore events when IME is active.
    if (e.isComposing || !isPcKeyboardMidiEnabled) return;

    if (e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'Minus' || e.code === 'Equal' || e.code === 'NumpadSubtract' || e.code === 'NumpadAdd') return;

    const note = audioEngine.pressedKeys.get(e.code);
    if (note) {
        const ok = await ensureAudioStarted();
        if (!ok) {
            audioEngine.pressedKeys.delete(e.code);
            return;
        }

        const currentInstrument = audioEngine.instruments[audioEngine.currentInstrumentName];
        if (!currentInstrument || !currentInstrument.triggerRelease) {
            audioEngine.logKey('LOG_PLAY_NOTE_FAIL', 'error', audioEngine.currentInstrumentName);
            audioEngine.pressedKeys.delete(e.code);
            return;
        }
        if (currentInstrument instanceof audioEngine.Tone.Sampler && !currentInstrument.loaded) {
            audioEngine.logKey('LOG_SAMPLER_NOT_LOADED', 'warning', audioEngine.currentInstrumentName);
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
            window.addEventListener('keydown', handleKeyDown);
            window.addEventListener('keyup', handleKeyUp);
            isPcKeyboardMidiEnabled = true;
            logKey('LOG_KEYBOARD_MIDI_ON');
            updateLogOctave();
        }
    };

    audioEngine.disablePcKeyboardMidi = () => {
        if (isPcKeyboardMidiEnabled) {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            isPcKeyboardMidiEnabled = false;
            logKey('LOG_KEYBOARD_MIDI_OFF');
            audioEngine.pressedKeys.clear(); // Clear any lingering pressed keys
        }
    };
    
    // Default to disabled
    audioEngine.disablePcKeyboardMidi();
    logKey("LOG_KEYBOARD_INIT");
}
