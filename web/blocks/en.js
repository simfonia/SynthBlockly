// blocks/en.js — English messages
export const MSG_EN = {
    // Category Colors (Hex values)
    'SYNTH_ACTIONS_COLOR': '#5CB85C', // Green
    'SYNTH_SYNTH_COLOR': '#5BC0DE',   // Blue
    'SYNTH_EFFECTS_COLOR': '#9B59B6', // Purple
    'SYNTH_EVENTS_COLOR': '#F0AD4E',  // Orange

    // Block Messages (Events)
    'SB_MIDI_NOTE_RECEIVED_MESSAGE': 'When MIDI Note %1 Velocity %2 Channel %3 Received',
    'SB_MIDI_NOTE_RECEIVED_TOOLTIP': 'Triggers when a MIDI note is received. Provides the note number, velocity, and channel.',

    'SB_SERIAL_DATA_RECEIVED_MESSAGE': 'When Serial Data %1 Received',
    'SB_SERIAL_DATA_RECEIVED_TOOLTIP': 'Triggers when a line of serial data is received. Provides the received text.',

    // Block Messages
    'SB_PLAY_NOTE_MESSAGE': 'Play Note %1 Duration %2',
    'SB_PLAY_NOTE_TOOLTIP': 'Play a note with the synth, e.g. C4, D#3',
    'SB_PLAY_DRUM_MESSAGE': 'Play Drum %1',
    'SB_PLAY_DRUM_TOOLTIP': 'Trigger a drum sound (Kick / Snare / HiHat)',
    'SB_SET_ADSR_MESSAGE': 'Set ADSR A %1 D %2 S %3 R %4',
    'SB_SET_ADSR_TOOLTIP': 'Set synth ADSR envelope',
    'SB_CONTROLS_DO': 'do %1',
};
