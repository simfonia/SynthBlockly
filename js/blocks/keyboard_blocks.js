// js/blocks/keyboard_blocks.js
// PC Keyboard-related custom blocks
import * as Blockly from 'blockly';

const ALL_KEYS = [
    ["A", "KeyA"], ["B", "KeyB"], ["C", "KeyC"], ["D", "KeyD"], ["E", "KeyE"],
    ["F", "KeyF"], ["G", "KeyG"], ["H", "KeyH"], ["I", "KeyI"], ["J", "KeyJ"],
    ["K", "KeyK"], ["L", "KeyL"], ["M", "KeyM"], ["N", "KeyN"], ["O", "KeyO"],
    ["P", "KeyP"], ["Q", "KeyQ"], ["R", "KeyR"], ["S", "KeyS"], ["T", "KeyT"],
    ["U", "KeyU"], ["V", "KeyV"], ["W", "KeyW"], ["X", "KeyX"], ["Y", "KeyY"],
    ["Z", "KeyZ"], ["0", "Digit0"], ["1", "Digit1"], ["2", "Digit2"], ["3", "Digit3"],
    ["4", "Digit4"], ["5", "Digit5"], ["6", "Digit6"], ["7", "Digit7"], ["8", "Digit8"],
    ["9", "Digit9"], [";", "Semicolon"], ["'", "Quote"], [",", "Comma"], 
    [".", "Period"], ["/", "Slash"], ["[", "BracketLeft"], ["]", "BracketRight"], 
    ["\\", "Backslash"], ["Tab", "Tab"], ["Space", "Space"]
];

function getAvailableKeyOptions(currentBlock) {
    const ws = Blockly.getMainWorkspace();
    if (!ws) return ALL_KEYS;

    // If currentBlock is null (e.g. during initialization before attachment), return all keys
    if (!currentBlock) return ALL_KEYS;

    // Find all blocks that map keys
    const mappingBlocks = ws.getAllBlocks(false).filter(b => 
        ['sb_map_key_to_chord', 'sb_map_key_to_action', 'sb_map_key_to_note'].includes(b.type)
    );

    const usedKeys = new Set();
    mappingBlocks.forEach(b => {
        if (b.id !== currentBlock.id) { // Don't count self
            const key = b.getFieldValue('KEY_CODE');
            if (key) usedKeys.add(key);
        }
    });

    // Return options that are NOT used, plus the one currently selected by this block
    // Safe check for getFieldValue availability
    const currentKey = (currentBlock.getFieldValue) ? currentBlock.getFieldValue('KEY_CODE') : null;
    return ALL_KEYS.filter(opt => !usedKeys.has(opt[1]) || (currentKey && opt[1] === currentKey));
}

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
                        "options": function() { return getAvailableKeyOptions(this.sourceBlock_); }
                    },
                    {
                        "type": "field_input",
                        "name": "CHORD_NAME",
                        "text": "CM7"
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_PC_KEYBOARD_HUE}",
                "tooltip": "%{BKY_SB_MAP_KEY_TO_CHORD_TOOLTIP}"
            });
        }
    };

    Blockly.Blocks['sb_key_action_event'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_KEY_ACTION_EVENT_MESSAGE}",
                "args0": [
                    {
                        "type": "field_dropdown",
                        "name": "KEY_CODE",
                        "options": function() { return getAvailableKeyOptions(this.sourceBlock_); }
                    },
                    {
                        "type": "field_dropdown",
                        "name": "TRIGGER_MODE",
                        "options": [
                            ["%{BKY_SB_KEY_PRESS}", "PRESS"],
                            ["%{BKY_SB_KEY_RELEASE}", "RELEASE"]
                        ]
                    }
                ],
                "message1": "%1",
                "args1": [
                    {
                        "type": "input_statement",
                        "name": "DO"
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_PC_KEYBOARD_HUE}",
                "tooltip": "%{BKY_SB_KEY_ACTION_EVENT_TOOLTIP}"
            });
        }
    };

    Blockly.Blocks['sb_map_key_to_note'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_MAP_KEY_TO_NOTE_MESSAGE}",
                "args0": [
                    {
                        "type": "field_dropdown",
                        "name": "KEY_CODE",
                        "options": function() { return getAvailableKeyOptions(this.sourceBlock_); }
                    },
                    {
                        "type": "input_value",
                        "name": "INSTRUMENT"
                    },
                    {
                        "type": "field_input",
                        "name": "NOTE",
                        "text": "C4"
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_PC_KEYBOARD_HUE}",
                "tooltip": "%{BKY_SB_MAP_KEY_TO_NOTE_TOOLTIP}"
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
                "colour": "%{BKY_SB_CAT_PC_KEYBOARD_HUE}",
                "tooltip": "%{BKY_SB_TOGGLE_PC_KEYBOARD_MIDI_TOOLTIP}"
            });
        }
    };
}
