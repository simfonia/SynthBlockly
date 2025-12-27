// js/blocks/noise_blocks.js
import * as Blockly from 'blockly/core';

export function registerBlocks() {
    if (typeof Blockly === 'undefined') {
        console.error('Blockly not available');
        return false;
    }

    Blockly.Blocks['sb_play_background_noise'] = {
        init: function() {
            this.jsonInit({
                "message0": "%{BKY_SB_PLAY_BACKGROUND_NOISE_MESSAGE}",
                "args0": [
                    {
                        "type": "field_dropdown",
                        "name": "NOISE_TYPE",
                        "options": [
                            ["%{BKY_SB_NOISE_TYPE_WHITE}", "white"],
                            ["%{BKY_SB_NOISE_TYPE_PINK}", "pink"],
                            ["%{BKY_SB_NOISE_TYPE_BROWN}", "brown"]
                        ]
                    },
                    {
                        "type": "input_value",
                        "name": "VOLUME",
                        "check": "Number"
                    }
                ],
                "inputsInline": true,
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_NOISE_HUE}",
                "tooltip": "%{BKY_SB_PLAY_BACKGROUND_NOISE_TOOLTIP}",
                "helpUrl": ""
            });
            // Add shadow block for volume
            this.getInput('VOLUME').setShadowDom(Blockly.utils.xml.textToDom(
                '<shadow type="math_number"><field name="NUM">0.1</field></shadow>'
            ));
        }
    };

    Blockly.Blocks['sb_stop_background_noise'] = {
        init: function() {
            this.jsonInit({
                "message0": "%{BKY_SB_STOP_BACKGROUND_NOISE_MESSAGE}",
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_NOISE_HUE}",
                "tooltip": "%{BKY_SB_STOP_BACKGROUND_NOISE_TOOLTIP}",
                "helpUrl": ""
            });
        }
    };
}
