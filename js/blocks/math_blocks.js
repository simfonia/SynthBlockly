// js/blocks/math_blocks.js
// Custom math-related blocks

export function registerBlocks(Blockly) {
    if (typeof Blockly === 'undefined') {
        console.error('Blockly not available');
        return false;
    }

    Blockly.Blocks['math_map'] = {
        init: function() {
            this.jsonInit({
                "message0": "%{BKY_MATH_MAP_MESSAGE}",
                "args0": [
                    { "type": "input_value", "name": "VALUE", "check": "Number" },
                    { "type": "input_value", "name": "FROM_LOW", "check": "Number" },
                    { "type": "input_value", "name": "FROM_HIGH", "check": "Number" },
                    { "type": "input_value", "name": "TO_LOW", "check": "Number" },
                    { "type": "input_value", "name": "TO_HIGH", "check": "Number" }
                ],
                "inputsInline": true,
                "output": "Number",
                "colour": "%{BKY_MATH_HUE}",
                "tooltip": "%{BKY_MATH_MAP_TOOLTIP}",
                "helpUrl": ""
            });
        }
    };

    // 限制範圍 (Constrain)
    Blockly.Blocks['math_constrain'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_MATH_CONSTRAIN_MESSAGE}",
                "args0": [
                    {
                        "type": "input_value",
                        "name": "VALUE",
                        "check": "Number"
                    },
                    {
                        "type": "input_value",
                        "name": "LOW",
                        "check": "Number"
                    },
                    {
                        "type": "input_value",
                        "name": "HIGH",
                        "check": "Number"
                    }
                ],
                "output": "Number",
                "inputsInline": true,
                "colour": "%{BKY_MATH_HUE}",
                "tooltip": "%{BKY_MATH_CONSTRAIN_TOOLTIP}"
            });
        }
    };
}
