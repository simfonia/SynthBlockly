// js/blocks/keyboard_blocks.js
// PC Keyboard-related custom blocks
import * as Blockly from 'blockly';

export function registerBlocks() {
    if (typeof Blockly === 'undefined') {
        console.error('Blockly not available');
        return false;
    }

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
}
