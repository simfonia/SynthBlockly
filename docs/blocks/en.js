// blocks/en.js — English messages
export const MSG_EN = {
    // --- UI Button Tooltips ---
    'UI_BTN_START_AUDIO': 'Start Audio Context',
    'UI_BTN_CONNECT_MIDI': 'Connect MIDI Device',
    'UI_BTN_CONNECT_SERIAL': 'Connect Serial Device',
    'UI_BTN_PLAY_TEST_NOTE': 'Play Test Note (C4)',
    'UI_BTN_SAVE_PROJECT': 'Save Project (XML)',
    'UI_BTN_LOAD_PROJECT': 'Load Project (XML)',
    'UI_BTN_RUN_BLOCKS': 'Run Blocks',
    'UI_BTN_EXPORT_CODE': 'Export Code to File & Clipboard',
    'UI_BTN_CLEAR_LOG': 'Clear Log',
    
    // --- Category Names and Colors ---
    // Standard Blockly Categories
    'MSG_LOGIC_CATEGORY': 'Logic',
    'LOGIC_HUE': '#5C81A6',
    'MSG_LOOPS_CATEGORY': 'Loops',
    'LOOPS_HUE': '#5CA65C',
    'MSG_MATH_CATEGORY': 'Math',
    'MATH_HUE': '#5C68A6',
    'MSG_TEXT_CATEGORY': 'Text',
    'TEXT_HUE': '#A65C81',
    'MSG_LISTS_CATEGORY': 'Lists',
    'LISTS_HUE': '#745CA6',
    'MSG_VARIABLES_CATEGORY': 'Variables',
    'VARIABLES_HUE': '#A6745C',
    'MSG_FUNCTIONS_CATEGORY': 'Functions',
    'FUNCTIONS_HUE': '#995CA6',

    // SynthBlockly Custom Categories
    'MSG_SYNTHBLOCKLY_CATEGORY': 'SynthBlockly',
    'SYNTHBLOCKLY_HUE': '#5CA6A6',
    'MSG_INSTRUMENTS_CATEGORY': 'Instruments',
    'INSTRUMENTS_HUE': '#685CA6',
    'MSG_INSTRUMENT_CONTROL_CATEGORY': 'Instrument Control',
    'INSTRUMENT_CONTROL_HUE': '#5BC0DE', // Same as SYNTH_SYNTH_COLOR
    'MSG_SYNTHESIZERS_CATEGORY': 'Synthesizers',
    'SYNTHESIZERS_HUE': '#5CB85C', // Same as SYNTH_ACTIONS_COLOR
    'MSG_SAMPLERS_CATEGORY': 'Samplers',
    'SAMPLERS_HUE': '#E74C3C', // Same as JAZZKIT_COLOR
    'MSG_TRANSPORT_CATEGORY': 'Transport',
    'TRANSPORT_HUE': '#16A085',
    'MSG_EFFECTS_CATEGORY': 'Effects',
    'EFFECTS_HUE': '#9B59B6',
    'MSG_MIDI_CATEGORY': 'MIDI',
    'MIDI_HUE': '#5B67E7',
    'MSG_PC_KEYBOARD_CATEGORY': 'PC Keyboard',
    'PC_KEYBOARD_HUE': '#F0B429',
    'MSG_SERIAL_CATEGORY': 'Serial',
    'SERIAL_HUE': '#D9534F',
    
    // Legacy Color definitions (can be deprecated later)
    'SYNTH_ACTIONS_COLOR': '#5CB85C',
    'SYNTH_SYNTH_COLOR': '#5BC0DE',
    'JAZZKIT_COLOR': '#E74C3C',

    // Block Messages (Events)
    'SB_MIDI_NOTE_RECEIVED_MESSAGE': 'When MIDI Note %1 Velocity %2 Channel %3 Received',
    'SB_MIDI_NOTE_RECEIVED_TOOLTIP': 'Triggers when a MIDI note is received. Provides the note number, velocity, and channel.',

    // NEW MIDI Play Block
    'SB_MIDI_PLAY_MESSAGE': 'Trigger MIDI Sound %1 Velocity %2 Channel %3',
    'SB_MIDI_PLAY_TOOLTIP': 'Triggers sound based on the incoming MIDI note number. If the note has been mapped to a chord, the entire chord will be played; otherwise, a single note will be played.',

    // NEW MIDI Category Name
    'MSG_MIDI_CATEGORY': 'MIDI',

    // NEW PC Keyboard Category Name and Color
    'PC_KEYBOARD_HUE': '#F0B429', // Yellow for PC Keyboard
    'MSG_PC_KEYBOARD_CATEGORY': 'PC Keyboard',

    // NEW Serial Category Name and Color
    'SERIAL_HUE': '#D9534F', // Red/Orange for Serial (reusing a hue for a distinct category)
    'MSG_SERIAL_CATEGORY': 'Serial',

    'SB_SERIAL_DATA_RECEIVED_MESSAGE': 'When Serial Data %1 Received',
    'SB_SERIAL_DATA_RECEIVED_TOOLTIP': 'Triggers when a line of serial data is received. Provides the received text.',

    // Block Messages
    'SB_PLAY_NOTE_MESSAGE': 'Play Note %1 Duration %2 Velocity %3 (non-blocking)',
    'SB_PLAY_NOTE_TOOLTIP': 'Plays a note instantly without waiting for it to finish. Velocity is 0-1 (0-127 for MIDI input). Duration symbols include "4n" (quarter note), "8n." (dotted eighth note), "8t" (eighth note triplet), etc.',
    'SB_PLAY_NOTE_AND_WAIT_MESSAGE': 'Play Note %1 Duration %2 Velocity %3 and wait',
    'SB_PLAY_NOTE_AND_WAIT_TOOLTIP': 'Plays a note and waits for its duration before continuing. Velocity is 0-1 (0-127 for MIDI input). Duration symbols include "4n" (quarter note), "8n." (dotted eighth note), "8t" (eighth note triplet), etc.',
    'SB_PLAY_DRUM_MESSAGE': 'Play Drum %1',
    'SB_PLAY_DRUM_TOOLTIP': 'Trigger a drum sound (Kick / Snare / HiHat)',
    'SB_SET_ADSR_MESSAGE': 'Set ADSR A %1 D %2 S %3 R %4',
    'SB_SET_ADSR_TOOLTIP': 'Set synth ADSR envelope',
    'SB_CONTROLS_DO': 'do %1',

    // Add Jazz Kit specific messages
    'JAZZKIT_COLOR': '#E74C3C', // Reddish
    'JAZZKIT_PLAY_DRUM_MESSAGE': 'Jazz Drum(Roland TR-909): %1',
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
    
        // --- New Tone.Loop Block ---
        'SB_TONE_LOOP_MESSAGE': 'Every %1 do %2',
            'SB_TONE_LOOP_TOOLTIP': 'Repeats the inner blocks at the specified interval when the master transport is running.',
        
            // --- NEW: Schedule At Offset Block ---
            'SB_SCHEDULE_AT_OFFSET_MESSAGE': 'At loop offset %1 do %2',
            'SB_SCHEDULE_AT_OFFSET_TOOLTIP': 'Schedules inner blocks to execute at the specified time offset within the loop callback. Must be placed inside a "Loop: every [duration] do [blocks]" block.',
        
            // --- NEW: Stop All Blockly Loops Block ---
            'SB_STOP_ALL_BLOCKLY_LOOPS_MESSAGE': 'Stop All Loops (Blockly)',    'SB_STOP_ALL_BLOCKLY_LOOPS_TOOLTIP': 'Stops and disposes all Tone.Loop instances created by Blockly loop blocks.',

    // --- NEW: Toggle PC Keyboard MIDI Block ---
    'SB_TOGGLE_PC_KEYBOARD_MIDI_MESSAGE': 'PC Keyboard as MIDI %1',
    'SB_TOGGLE_PC_KEYBOARD_MIDI_TOOLTIP': 'Enables or disables the PC keyboard as a MIDI keyboard.',
    'SB_ACTION_ON': 'ON',
    'SB_ACTION_OFF': 'OFF',

    // --- NEW: Create Synth Instrument Block ---
    'SB_CREATE_SYNTH_INSTRUMENT_MESSAGE': 'Create Instrument %1 Type %2',
    'SB_CREATE_SYNTH_INSTRUMENT_TOOLTIP': 'Creates a named synthesizer or sampler instrument of a specified type for later use.',

    // --- NEW: Select Current Instrument Block ---
    'SB_SELECT_CURRENT_INSTRUMENT_MESSAGE': 'Select Current Instrument as %1',
    'SB_SELECT_CURRENT_INSTRUMENT_TOOLTIP': 'Sets the default instrument to be used for subsequent note playback.',

    // --- NEW: Define Chord Block ---
    'SB_DEFINE_CHORD_MESSAGE': 'Define Chord %1 Notes as %2',
    'SB_DEFINE_CHORD_TOOLTIP': 'Defines a named chord containing a comma-separated list of notes (e.g., C4,E4,G4).',

    // --- NEW: Map PC Keyboard Key to Chord Block ---
    'SB_MAP_KEY_TO_CHORD_MESSAGE': 'Map Keyboard Key %1 to Chord %2',
    'SB_MAP_KEY_TO_CHORD_TOOLTIP': 'Maps a PC keyboard key to a defined chord name. Pressing the key will trigger the chord.',

    // --- NEW: Map MIDI Note to Chord Block ---
    'SB_MAP_MIDI_TO_CHORD_MESSAGE': 'Map MIDI Note %1 to Chord %2',
    'SB_MAP_MIDI_TO_CHORD_TOOLTIP': 'Maps a MIDI note number to a defined chord name. Pressing the MIDI note will trigger the chord.',
        
        // --- Musical Duration Options ---    'SB_DUR_1M': '1 Measure',
    'SB_DUR_2N': 'Half Note',
    'SB_DUR_4N': 'Quarter Note',
    'SB_DUR_8N': 'Eighth Note',
    'SB_DUR_16N': 'Sixteenth Note',
};
