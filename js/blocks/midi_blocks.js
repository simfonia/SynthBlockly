// js/blocks/midi_blocks.js
// MIDI-related custom blocks
import * as Blockly from 'blockly';

export function registerBlocks() {
    if (typeof Blockly === 'undefined') {
        console.error('Blockly not available');
        return false;
    }

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
    Blockly.Blocks['sb_midi_play'] = {
        init: function () {
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
                "colour": "%{BKY_MIDI_HUE}",
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
}
