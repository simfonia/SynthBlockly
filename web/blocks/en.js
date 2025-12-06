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
    'SB_PLAY_NOTE_MESSAGE': 'Play Note %1 Duration %2 Velocity %3 (non-blocking)',
    'SB_PLAY_NOTE_TOOLTIP': 'Plays a note instantly without waiting for it to finish. Velocity is 0-1 (0-127 for MIDI input).',
    'SB_PLAY_NOTE_AND_WAIT_MESSAGE': 'Play Note %1 Duration %2 Velocity %3 and wait',
    'SB_PLAY_NOTE_AND_WAIT_TOOLTIP': 'Plays a note and waits for its duration before continuing. Velocity is 0-1 (0-127 for MIDI input).',
    'SB_PLAY_DRUM_MESSAGE': 'Play Drum %1',
    'SB_PLAY_DRUM_TOOLTIP': 'Trigger a drum sound (Kick / Snare / HiHat)',
    'SB_SET_ADSR_MESSAGE': 'Set ADSR A %1 D %2 S %3 R %4',
    'SB_SET_ADSR_TOOLTIP': 'Set synth ADSR envelope',
    'SB_CONTROLS_DO': 'do %1',

    // Add Jazz Kit specific messages
    'JAZZKIT_COLOR': '#E74C3C', // Reddish
    'JAZZKIT_PLAY_DRUM_MESSAGE': 'Jazz Drum: %1',
    'JAZZKIT_PLAY_DRUM_TOOLTIP': 'Play a selected jazz drum sound',

    // Jazz Kit Drum Type Options
    'JAZZKIT_DRUM_KICK': 'Kick',
    'JAZZKIT_DRUM_RIMSHOT': 'Rimshot',
    'JAZZKIT_DRUM_SNARE': 'Snare',
    'JAZZKIT_DRUM_HANDCLAP': 'Handclap',
    'JAZZKIT_DRUM_LOW_TOM': 'Low Tom',
    'JAZZKIT_DRUM_CLOSED_HIHAT': 'Closed Hi-hat',
    'JAZZKIT_DRUM_MID_TOM': 'Mid Tom',
    'JAZZKIT_DRUM_HIGH_TOM': 'High Tom',
    'JAZZKIT_DRUM_CRASH_CYMBAL': 'Crash Cymbal',
    'JAZZKIT_DRUM_OPEN_HIHAT': 'Open Hi-hat',
    'JAZZKIT_DRUM_RIDE_CYMBAL': 'Ride Cymbal',

    // --- Transport Block Messages ---
    'TRANSPORT_COLOR': '#16A085', // Teal
    'SB_TRANSPORT_SET_BPM_MESSAGE': 'Set Tempo to %1 BPM',
    'SB_TRANSPORT_SET_BPM_TOOLTIP': 'Sets the master tempo (Beats Per Minute)',
    'SB_TRANSPORT_START_STOP_MESSAGE': '%1 Transport',
    'SB_TRANSPORT_START_STOP_TOOLTIP': 'Starts or stops the master transport (the timeline)',
    'SB_TRANSPORT_ACTION_START': 'Start',
    'SB_TRANSPORT_ACTION_STOP': 'Stop',

    // --- Wait Block Messages ---
    'SB_WAIT_MUSICAL_MESSAGE': 'Wait for %1',
    'SB_WAIT_MUSICAL_TOOLTIP': 'Waits for a musical duration (e.g., 4n = quarter note), dependent on the master tempo.',

    // --- Musical Duration Options ---
    'SB_DUR_1M': '1 Measure',
    'SB_DUR_2N': 'Half Note',
    'SB_DUR_4N': 'Quarter Note',
    'SB_DUR_8N': 'Eighth Note',
    'SB_DUR_16N': 'Sixteenth Note',
};
