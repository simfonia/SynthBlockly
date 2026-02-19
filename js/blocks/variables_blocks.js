// js/blocks/variables_blocks.js
import * as Blockly from 'blockly';

export function registerBlocks(Blockly) {
    if (typeof Blockly === 'undefined') {
        console.error('Blockly not available');
        return false;
    }
    // Override standard variable get block to use custom color
    Blockly.Blocks['variables_get'] = {
        init: function() {
            this.jsonInit({
                "message0": "%1",
                "args0": [
                    {
                        "type": "field_variable",
                        "name": "VAR",
                        "variable": "%{BKY_VARIABLES_DEFAULT_NAME}"
                    }
                ],
                "output": null,
                "colour": "%{BKY_SB_CAT_VARIABLES_HUE}",
                "tooltip": "%{BKY_VARIABLES_GET_TOOLTIP}",
                "helpUrl": "%{BKY_VARIABLES_GET_HELPURL}"
            });
            // Standard Blockly behavior for variable context menu
            this.contextMenuMsg_ = Blockly.Msg['VARIABLES_GET_CREATE_SET'];
        },
        contextMenuType_: 'variables_set'
    };

    // Override standard variable set block to use custom color
    Blockly.Blocks['variables_set'] = {
        init: function() {
            this.jsonInit({
                "message0": "%{BKY_VARIABLES_SET}",
                "args0": [
                    {
                        "type": "field_variable",
                        "name": "VAR",
                        "variable": "%{BKY_VARIABLES_DEFAULT_NAME}"
                    },
                    {
                        "type": "input_value",
                        "name": "VALUE"
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_VARIABLES_HUE}",
                "tooltip": "%{BKY_VARIABLES_SET_TOOLTIP}",
                "helpUrl": "%{BKY_VARIABLES_SET_HELPURL}"
            });
            // Standard Blockly behavior for variable context menu
            this.contextMenuMsg_ = Blockly.Msg['VARIABLES_SET_CREATE_GET'];
        },
        contextMenuType_: 'variables_get'
    };

    // Override standard math_change block (i = i + 1) to use variable color
    Blockly.Blocks['math_change'] = {
        init: function() {
            this.jsonInit({
                "message0": "%{BKY_MATH_CHANGE_TITLE}",
                "args0": [
                    {
                        "type": "field_variable",
                        "name": "VAR",
                        "variable": "%{BKY_VARIABLES_DEFAULT_NAME}"
                    },
                    {
                        "type": "input_value",
                        "name": "DELTA",
                        "check": "Number"
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_VARIABLES_HUE}",
                "helpUrl": "%{BKY_MATH_CHANGE_HELPURL}",
                "tooltip": "%{BKY_MATH_CHANGE_TOOLTIP}"
            });
        }
    };
}
