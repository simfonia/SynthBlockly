// js/blocks/transport_blocks.js
// Transport-related custom blocks

export function registerBlocks(Blockly) {
    if (typeof Blockly === 'undefined') {
        console.error('Blockly not available');
        return false;
    }

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
}
