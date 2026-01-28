// js/blocks/transport_blocks.js
// Transport-related custom blocks
import * as Blockly from 'blockly';
import { getHelpUrl } from '../core/helpUtils.js';

export function registerBlocks() {
    if (typeof Blockly === 'undefined') {
        console.error('Blockly not available');
        return false;
    }

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
                "colour": "%{BKY_SB_CAT_TRANSPORT_HUE}",
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
                            ['%{BKY_SB_PARAM_TRANSPORT_START}', 'START'],
                            ['%{BKY_SB_PARAM_TRANSPORT_STOP}', 'STOP']
                        ]
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_TRANSPORT_HUE}",
                "tooltip": "%{BKY_SB_TRANSPORT_START_STOP_TOOLTIP}"
            });
        }
    };

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
                            ['%{BKY_SB_DUR_2M}', '2m'],
                            ['%{BKY_SB_DUR_4M}', '4m'],
                            ['%{BKY_SB_DUR_8M}', '8m'],
                            ['%{BKY_SB_DUR_2N}', '2n'],
                            ['%{BKY_SB_DUR_4N}', '4n'],
                            ['%{BKY_SB_DUR_8N}', '8n'],
                            ['%{BKY_SB_DUR_16N}', '16n']
                        ]
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_TRANSPORT_HUE}",
                "tooltip": "%{BKY_SB_WAIT_MUSICAL_TOOLTIP}"
            });
        }
    };

    Blockly.Blocks['sb_tone_loop'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_TONE_LOOP_MESSAGE}",
                "args0": [
                    {
                        "type": "field_input",
                        "name": "INTERVAL",
                        "text": "1m"
                    },
                    {
                        "type": "input_statement",
                        "name": "DO"
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_TRANSPORT_HUE}",
                "tooltip": "%{BKY_SB_TONE_LOOP_TOOLTIP}",
                "hat": true
            });
        }
    };

    Blockly.Blocks['sb_schedule_at_offset'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_SCHEDULE_AT_OFFSET_MESSAGE}",
                "args0": [
                    {
                        "type": "field_input",
                        "name": "OFFSET",
                        "text": "0"
                    },
                    {
                        "type": "input_statement",
                        "name": "DO"
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_TRANSPORT_HUE}",
                "tooltip": "%{BKY_SB_SCHEDULE_AT_OFFSET_TOOLTIP}"
            });
            this.setHelpUrl(getHelpUrl('transport_readme'));
        }
    };

    Blockly.Blocks['sb_stop_all_blockly_loops'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_STOP_ALL_BLOCKLY_LOOPS_MESSAGE}",
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_TRANSPORT_HUE}",
                "tooltip": "%{BKY_SB_STOP_ALL_BLOCKLY_LOOPS_TOOLTIP}"
            });
        }
    };

    Blockly.Blocks['sb_transport_count_in'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_TRANSPORT_COUNT_IN_MESSAGE}",
                "args0": [
                    { "type": "field_number", "name": "MEASURES", "value": 1, "min": 1, "max": 4 },
                    { "type": "field_number", "name": "BEATS", "value": 4, "min": 1, "max": 16 },
                    { "type": "field_number", "name": "BEAT_VALUE", "value": 4, "min": 1, "max": 16 },
                    { "type": "input_value", "name": "VOLUME", "check": "Number" }
                ],
                "inputsInline": true,
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_TRANSPORT_HUE}",
                "tooltip": "%{BKY_SB_TRANSPORT_COUNT_IN_TOOLTIP}"
            });
        }
    };

    Blockly.Blocks['sb_rhythm_sequence'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_RHYTHM_SEQUENCE_MESSAGE}",
                "args0": [
                    { "type": "input_value", "name": "SOURCE", "check": "String" },
                    { "type": "input_value", "name": "MEASURE", "check": "Number" },
                    { "type": "field_input", "name": "SEQUENCE", "text": "x--- x--- x--- x---" }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_TRANSPORT_HUE}",
                "tooltip": "%{BKY_SB_RHYTHM_SEQUENCE_TOOLTIP}"
            });

            // Add the chord toggle as a dummy input
            this.appendDummyInput("CHORD_ROW")
                .appendField(new Blockly.FieldCheckbox("FALSE"), "IS_CHORD")
                .appendField("%{BKY_SB_PARAM_RHYTHM_IS_CHORD}");

            this.setInputsInline(true);
            this.setHelpUrl(getHelpUrl('step_sequencer_readme'));
        }
    };
}