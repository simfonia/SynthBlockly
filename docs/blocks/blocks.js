// blocks/blocks.js
// 自訂積木外觀（僅定義 block 結構與欄位），使用 Blockly.Msg 作為文字來源

export function registerBlocks(Blockly) {
    if (typeof Blockly === 'undefined') {
        console.error('Blockly not available');
        return false;
    }

    // 播放音符
    Blockly.Blocks['sb_play_note'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_PLAY_NOTE_MESSAGE}",
                "args0": [
                    {
                        "type": "input_value",
                        "name": "NOTE",
                        "check": ["Number", "String"] // Allow either a number (MIDI note) or a string (e.g., "C4")
                    },
                    {
                        "type": "field_input",
                        "name": "DUR",
                        "text": "8n"
                    },
                    { // NEW: Velocity input
                        "type": "input_value",
                        "name": "VELOCITY",
                        "check": "Number"
                    }
                ],
                "inputsInline": true,
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SYNTHESIZERS_HUE}",
                "tooltip": "%{BKY_SB_PLAY_NOTE_TOOLTIP}"
            });
        }
    };

    // --- NEW: Play Note and Wait (Blocking) ---
    Blockly.Blocks['sb_play_note_and_wait'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_PLAY_NOTE_AND_WAIT_MESSAGE}",
                "args0": [
                    {
                        "type": "input_value",
                        "name": "NOTE",
                        "check": ["Number", "String"] // Allow either a number (MIDI note) or a string (e.g., "C4")
                    },
                    {
                        "type": "field_input",
                        "name": "DUR",
                        "text": "4n"
                    },
                    { // NEW: Velocity input
                        "type": "input_value",
                        "name": "VELOCITY",
                        "check": "Number"
                    }
                ],
                "inputsInline": true,
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SYNTHESIZERS_HUE}",
                "tooltip": "%{BKY_SB_PLAY_NOTE_AND_WAIT_TOOLTIP}"
            });
        }
    };

    // 播放鼓聲
    Blockly.Blocks['sb_play_drum'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_PLAY_DRUM_MESSAGE} 力度 %2",
                "args0": [
                    {
                        "type": "field_dropdown",
                        "name": "TYPE",
                        "options": [['Kick', 'KICK'], ['Snare', 'SNARE'], ['HiHat', 'HH']]
                    },
                    { // NEW: Velocity input
                        "type": "input_value",
                        "name": "VELOCITY",
                        "check": "Number"
                    }
                ],
                "inputsInline": true, // ADDED FOR CONSISTENCY
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SYNTHESIZERS_HUE}",
                "tooltip": "%{BKY_SB_PLAY_DRUM_TOOLTIP}"
            });
        }
    };

    // 設定 ADSR
    Blockly.Blocks['sb_set_adsr'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_SET_ADSR_MESSAGE}",
                "args0": [
                    {
                        "type": "field_number",
                        "name": "A",
                        "value": 0.01,
                        "min": 0,
                        "max": 10,
                        "precision": 0.01
                    },
                    {
                        "type": "field_number",
                        "name": "D",
                        "value": 0.1,
                        "min": 0,
                        "max": 10,
                        "precision": 0.01
                    },
                    {
                        "type": "field_number",
                        "name": "S",
                        "value": 0.5,
                        "min": 0,
                        "max": 1,
                        "precision": 0.01
                    },
                    {
                        "type": "field_number",
                        "name": "R",
                        "value": 1.0,
                        "min": 0,
                        "max": 10,
                        "precision": 0.01
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_INSTRUMENT_CONTROL_HUE}",
                "tooltip": "%{BKY_SB_SET_ADSR_TOOLTIP}"
            });
        }
    };

    // 當收到 MIDI 音符
    Blockly.Blocks['sb_midi_note_received'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_MIDI_NOTE_RECEIVED_MESSAGE}",
                "args0": [
                    {
                        "type": "field_variable",
                        "name": "NOTE",
                        "variable": "note"
                    },
                    {
                        "type": "field_variable",
                        "name": "VELOCITY",
                        "variable": "velocity"
                    },
                    {
                        "type": "field_variable",
                        "name": "CHANNEL",
                        "variable": "channel"
                    }
                ],
                "message1": "%{BKY_SB_CONTROLS_DO}",
                "args1": [
                    {
                        "type": "input_statement",
                        "name": "DO"
                    }
                ],
                "inputsInline": false,
                "output": null,
                "previousStatement": null,
                "nextStatement": true, // Hat blocks that take statements usually have nextStatement: true
                "colour": "%{BKY_MIDI_HUE}",
                "tooltip": "%{BKY_SB_MIDI_NOTE_RECEIVED_TOOLTIP}",
                "hat": true
            });
        }
    };
    // NEW MIDI Play Block
    Blockly.Blocks['sb_midi_play'] = {
        init: function() {
            this.jsonInit({
                "message0": "%{BKY_SB_MIDI_PLAY_MESSAGE}",
                "args0": [
                    {
                        "type": "input_value",
                        "name": "NOTE",
                        "check": ["Number", "String"],
                        "align": "RIGHT"
                    },
                    {
                        "type": "input_value",
                        "name": "VELOCITY",
                        "check": "Number",
                        "align": "RIGHT"
                    },
                    {
                        "type": "input_value",
                        "name": "CHANNEL",
                        "check": "Number",
                        "align": "RIGHT"
                    }
                ],
                "inputsInline": true,
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_MIDI_HUE}", // Use the new MIDI HUE
                "tooltip": "%{BKY_SB_MIDI_PLAY_TOOLTIP}"
            });
            // Add shadow blocks for variables
            // Ensure these variable names match those provided by sb_midi_note_received
            this.getInput('NOTE').setShadowDom(Blockly.utils.xml.textToDom(
                '<shadow type="variables_get"><field name="VAR" id="NOTE_VAR_ID">note</field></shadow>'
            ));
            this.getInput('VELOCITY').setShadowDom(Blockly.utils.xml.textToDom(
                '<shadow type="variables_get"><field name="VAR" id="VELOCITY_VAR_ID">velocity</field></shadow>'
            ));
            this.getInput('CHANNEL').setShadowDom(Blockly.utils.xml.textToDom(
                '<shadow type="variables_get"><field name="VAR" id="CHANNEL_VAR_ID">channel</field></shadow>'
            ));
        }
    };

    // --- NEW: Stop Default MIDI Action Block ---
    Blockly.Blocks['sb_stop_default_midi_action'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_STOP_DEFAULT_MIDI_ACTION_MESSAGE}",
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_MIDI_HUE}",
                "tooltip": "%{BKY_SB_STOP_DEFAULT_MIDI_ACTION_TOOLTIP}"
            });
        }
    };
    // 當收到 Serial 資料
    Blockly.Blocks['sb_serial_data_received'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_SERIAL_DATA_RECEIVED_MESSAGE}",
                "args0": [
                    {
                        "type": "field_variable",
                        "name": "DATA",
                        "variable": "serial_data"
                    }
                ],
                "message1": "%{BKY_SB_CONTROLS_DO}",
                "args1": [
                    {
                        "type": "input_statement",
                        "name": "DO"
                    }
                ],
                "inputsInline": false,
                "output": null,
                "previousStatement": null,
                "nextStatement": true,
                "colour": "%{BKY_SERIAL_HUE}",
                "tooltip": "%{BKY_SB_SERIAL_DATA_RECEIVED_TOOLTIP}",
                "hat": true
            });
        }
    };

    // NEW: Jazz Kit Play Drum Block
    Blockly.Blocks['jazzkit_play_drum'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_JAZZKIT_PLAY_DRUM_MESSAGE} 力度 %2",
                "args0": [
                    {
                        "type": "field_dropdown",
                        "name": "DRUM_TYPE",
                        "options": [
                            ['%{BKY_JAZZKIT_DRUM_KICK}', 'C1'],
                            ['%{BKY_JAZZKIT_DRUM_RIMSHOT}', 'C#1'],
                            ['%{BKY_JAZZKIT_DRUM_SNARE}', 'D1'],
                            ['%{BKY_JAZZKIT_DRUM_HANDCLAP}', 'D#1'],
                            ['%{BKY_JAZZKIT_DRUM_LOW_TOM}', 'E1'],
                            ['%{BKY_JAZZKIT_DRUM_CLOSED_HIHAT}', 'F1'],
                            ['%{BKY_JAZZKIT_DRUM_MID_TOM}', 'F#1'],
                            ['%{BKY_JAZZKIT_DRUM_HIGH_TOM}', 'G1'],
                            ['%{BKY_JAZZKIT_DRUM_CRASH_CYMBAL}', 'G#1'],
                            ['%{BKY_JAZZKIT_DRUM_OPEN_HIHAT}', 'A1'],
                            ['%{BKY_JAZZKIT_DRUM_RIDE_CYMBAL}', 'A#1'] // Correctly added this back
                        ]
                    }, // <-- Comma for args0 separator
                    { // NEW: Velocity input - Correctly placed as a new item in args0
                        "type": "input_value",
                        "name": "VELOCITY",
                        "check": "Number",
                        "shadow": {
                            "type": "math_number",
                            "fields": {
                                "NUM": 1
                            }
                        }
                    }
                ],
                "inputsInline": true, // Often helpful for blocks with many fields
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SAMPLERS_HUE}",
                "tooltip": "%{BKY_JAZZKIT_PLAY_DRUM_TOOLTIP}"
            });
        }
    };

    // --- NEW: Create Synth Instrument Block ---
    Blockly.Blocks['sb_create_synth_instrument'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_CREATE_SYNTH_INSTRUMENT_MESSAGE}",
                "args0": [
                    {
                        "type": "field_input",
                        "name": "NAME",
                        "text": "DefaultSynth"
                    },
                    {
                        "type": "field_dropdown",
                        "name": "TYPE",
                        "options": [
                            ["PolySynth", "PolySynth"],
                            ["AMSynth", "AMSynth"],
                            ["FMSynth", "FMSynth"],
                            ["DuoSynth", "DuoSynth"],
                            ["Sampler", "Sampler"]
                        ]
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_INSTRUMENT_CONTROL_HUE}",
                "tooltip": "%{BKY_SB_CREATE_SYNTH_INSTRUMENT_TOOLTIP}"
            });
        }
    };

    // --- NEW: Select Current Instrument Block ---
    Blockly.Blocks['sb_select_current_instrument'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_SELECT_CURRENT_INSTRUMENT_MESSAGE}",
                "args0": [
                    {
                        "type": "field_input",
                        "name": "NAME",
                        "text": "DefaultSynth"
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_INSTRUMENT_CONTROL_HUE}",
                "tooltip": "%{BKY_SB_SELECT_CURRENT_INSTRUMENT_TOOLTIP}"
            });
        }
    };


    // --- NEW: Define Chord Block ---
    Blockly.Blocks['sb_define_chord'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_DEFINE_CHORD_MESSAGE}",
                "args0": [
                    {
                        "type": "field_input",
                        "name": "NAME",
                        "text": "C Major"
                    },
                    {
                        "type": "field_input",
                        "name": "NOTES_STRING",
                        "text": "C4,E4,G4"
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_INSTRUMENT_CONTROL_HUE}",
                "tooltip": "%{BKY_SB_DEFINE_CHORD_TOOLTIP}"
            });
        }
    };

    // --- NEW: Map PC Keyboard Key to Chord Block ---
    Blockly.Blocks['sb_map_key_to_chord'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_MAP_KEY_TO_CHORD_MESSAGE}",
                "args0": [
                    {
                        "type": "field_dropdown",
                        "name": "KEY_CODE",
                        "options": [
                            ["A", "KeyA"], ["S", "KeyS"], ["D", "KeyD"], ["F", "KeyF"], ["G", "KeyG"],
                            ["H", "KeyH"], ["J", "KeyJ"], ["K", "KeyK"], ["L", "KeyL"],
                            [";", "Semicolon"], ["'", "Quote"],
                            [",", "Comma"], [".", "Period"], ["/", "Slash"],
                            ["C", "KeyC"], ["V", "KeyV"], ["B", "KeyB"], ["N", "KeyN"], ["M", "KeyM"]
                        ]
                    },
                    {
                        "type": "field_input",
                        "name": "CHORD_NAME",
                        "text": "C Major"
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_PC_KEYBOARD_HUE}",
                "tooltip": "%{BKY_SB_MAP_KEY_TO_CHORD_TOOLTIP}"
            });
        }
    };

    // --- NEW: Map MIDI Note to Chord Block ---
    Blockly.Blocks['sb_map_midi_to_chord'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_MAP_MIDI_TO_CHORD_MESSAGE}",
                "args0": [
                    {
                        "type": "field_number",
                        "name": "MIDI_NOTE",
                        "value": 60, // C4
                        "min": 0,
                        "max": 127,
                        "precision": 1
                    },
                    {
                        "type": "field_input",
                        "name": "CHORD_NAME",
                        "text": "C Major"
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_MIDI_HUE}",
                "tooltip": "%{BKY_SB_MAP_MIDI_TO_CHORD_TOOLTIP}"
            });
        }
    };


    // --- NEW: Transport Blocks ---
    Blockly.Blocks['sb_transport_set_bpm'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_TRANSPORT_SET_BPM_MESSAGE}",
                "args0": [
                    {
                        "type": "field_number",
                        "name": "BPM",
                        "value": 120,
                        "min": 20,
                        "max": 300
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_TRANSPORT_COLOR}",
                "tooltip": "%{BKY_SB_TRANSPORT_SET_BPM_TOOLTIP}"
            });
        }
    };

    Blockly.Blocks['sb_transport_start_stop'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_TRANSPORT_START_STOP_MESSAGE}",
                "args0": [
                    {
                        "type": "field_dropdown",
                        "name": "ACTION",
                        "options": [
                            ['%{BKY_SB_TRANSPORT_ACTION_START}', 'START'],
                            ['%{BKY_SB_TRANSPORT_ACTION_STOP}', 'STOP']
                        ]
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_TRANSPORT_COLOR}",
                "tooltip": "%{BKY_SB_TRANSPORT_START_STOP_TOOLTIP}"
            });
        }
    };

    // --- NEW: Musical Wait Block ---
    Blockly.Blocks['sb_wait_musical'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_WAIT_MUSICAL_MESSAGE}",
                "args0": [
                    {
                        "type": "field_dropdown",
                        "name": "DURATION",
                        "options": [
                            ['%{BKY_SB_DUR_1M}', '1m'],
                            ['%{BKY_SB_DUR_2N}', '2n'],
                            ['%{BKY_SB_DUR_4N}', '4n'],
                            ['%{BKY_SB_DUR_8N}', '8n'],
                            ['%{BKY_SB_DUR_16N}', '16n']
                        ]
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_TRANSPORT_COLOR}",
                "tooltip": "%{BKY_SB_WAIT_MUSICAL_TOOLTIP}"
            });
        }
    };

    // --- NEW: Tone.Loop Block ---
    Blockly.Blocks['sb_tone_loop'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_TONE_LOOP_MESSAGE}",
                "args0": [
                    {
                        "type": "field_dropdown",
                        "name": "INTERVAL",
                        "options": [
                            ["%{BKY_SB_DUR_1M}", "1m"],
                            ["%{BKY_SB_DUR_2N}", "2n"],
                            ["%{BKY_SB_DUR_4N}", "4n"],
                            ["%{BKY_SB_DUR_8N}", "8n"],
                            ["%{BKY_SB_DUR_16N}", "16n"]
                        ]
                    },
                    {
                        "type": "input_statement",
                        "name": "DO"
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_TRANSPORT_COLOR}",
                "tooltip": "%{BKY_SB_TONE_LOOP_TOOLTIP}",
                "hat": true // Often used for top-level event listeners / continuous processes
            });
        }
    };

    // --- NEW: Schedule At Offset Block (for Tone.Loop) ---
    Blockly.Blocks['sb_schedule_at_offset'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_SCHEDULE_AT_OFFSET_MESSAGE}",
                "args0": [
                    {
                        "type": "field_input",
                        "name": "OFFSET",
                        "text": "0" // Default offset at the start of the loop interval
                    },
                    {
                        "type": "input_statement",
                        "name": "DO"
                    }
                ],
                "previousStatement": null, // It can be chained within a loop callback
                "nextStatement": null,     // It can be chained within a loop callback
                "colour": "%{BKY_TRANSPORT_COLOR}",
                "tooltip": "%{BKY_SB_SCHEDULE_AT_OFFSET_TOOLTIP}"
            });
        }
    };

    // --- NEW: Stop All Blockly Loops Block ---

    Blockly.Blocks['sb_stop_all_blockly_loops'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_STOP_ALL_BLOCKLY_LOOPS_MESSAGE}",
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_TRANSPORT_COLOR}",
                "tooltip": "%{BKY_SB_STOP_ALL_BLOCKLY_LOOPS_TOOLTIP}"
            });
        }
    };


    // --- NEW: Toggle PC Keyboard MIDI Block ---
    Blockly.Blocks['sb_toggle_pc_keyboard_midi'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_TOGGLE_PC_KEYBOARD_MIDI_MESSAGE}",
                "args0": [
                    {
                        "type": "field_dropdown",
                        "name": "ACTION",
                        "options": [
                            ["%{BKY_SB_ACTION_ON}", "ON"],
                            ["%{BKY_SB_ACTION_OFF}", "OFF"]
                        ]
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_PC_KEYBOARD_HUE}",
                "tooltip": "%{BKY_SB_TOGGLE_PC_KEYBOARD_MIDI_TOOLTIP}"
            });
        }
    };

    // --- NEW: Setup Effect Block ---
    Blockly.Blocks['sb_setup_effect'] = {
        init: function() {
            this.jsonInit({
                "message0": "%{BKY_SB_SETUP_EFFECT_MESSAGE}",
                "args0": [
                    {
                        "type": "field_dropdown",
                        "name": "EFFECT_TYPE",
                        "options": [
                            ["Distortion", "distortion"],
                            ["Reverb", "reverb"],
                            ["FeedbackDelay", "feedbackDelay"]
                        ]
                    },
                    {
                        "type": "input_value",
                        "name": "WET",
                        "check": "Number",
                        "align": "RIGHT"
                    }
                ],
                "inputsInline": false,
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_EFFECTS_HUE}",
                "tooltip": "%{BKY_SB_SETUP_EFFECT_TOOLTIP}"
            });
            // Set initial shadow for WET input
            this.getInput('WET').setShadowDom(Blockly.utils.xml.textToDom(
                '<shadow type="math_number"><field name="NUM">0</field></shadow>'
            ));

            // Function to update the block's shape based on the selected effect
            this.updateShape_ = function() {
                var effectType = this.getFieldValue('EFFECT_TYPE');

                // Remove existing dynamic inputs
                if (this.getInput('DISTORTION_AMOUNT')) this.removeInput('DISTORTION_AMOUNT');
                if (this.getInput('OVERSAMPLE')) this.removeInput('OVERSAMPLE');
                if (this.getInput('DECAY')) this.removeInput('DECAY');
                if (this.getInput('PREDELAY')) this.removeInput('PREDELAY');
                if (this.getInput('DELAY_TIME')) this.removeInput('DELAY_TIME');
                if (this.getInput('FEEDBACK')) this.removeInput('FEEDBACK');

                // Add inputs based on effect type
                if (effectType === 'distortion') {
                    this.appendValueInput('DISTORTION_AMOUNT')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_DISTORTION_AMOUNT_FIELD}"); // Localized
                    this.getInput('DISTORTION_AMOUNT').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">0.4</field></shadow>'
                    ));
                    this.appendDummyInput('OVERSAMPLE')
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_OVERSAMPLE_FIELD}") // Localized
                        .appendField(new Blockly.FieldDropdown([
                            ["none", "none"],
                            ["2x", "2x"],
                            ["4x", "4x"]
                        ]), "OVERSAMPLE_VALUE");
                } else if (effectType === 'reverb') {
                    this.appendValueInput('DECAY')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_DECAY_FIELD}"); // Localized
                    this.getInput('DECAY').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">1.5</field></shadow>'
                    ));
                    this.appendValueInput('PREDELAY')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_PREDELAY_FIELD}"); // Localized
                    this.getInput('PREDELAY').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">0.01</field></shadow>'
                    ));
                } else if (effectType === 'feedbackDelay') {
                    this.appendValueInput('DELAY_TIME')
                        .setCheck("String") // Tone.Time can take string (e.g., "8n")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_DELAY_TIME_FIELD}"); // Localized
                    this.getInput('DELAY_TIME').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="text"><field name="TEXT">8n</field></shadow>'
                    ));
                    this.appendValueInput('FEEDBACK')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_FEEDBACK_FIELD}"); // Localized
                    this.getInput('FEEDBACK').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">0.25</field></shadow>'
                    ));
                }
            };

            // Register handler for dropdown changes
            this.onchange = function(event) {
                if (event.type === Blockly.Events.CHANGE && event.blockId === this.id && event.name === 'EFFECT_TYPE') {
                    this.updateShape_();
                }
            }.bind(this);

            // Initial shape update
            this.updateShape_();
        },
        // To handle block serialization/deserialization with dynamic inputs
        mutationToDom: function() {
            var container = Blockly.utils.xml.createElement('mutation');
            container.setAttribute('effect_type', this.getFieldValue('EFFECT_TYPE'));
            return container;
        },
        domToMutation: function(xmlElement) {
            this.setFieldValue(xmlElement.getAttribute('effect_type'), 'EFFECT_TYPE');
            this.updateShape_();
        }
    };

    return true;
}