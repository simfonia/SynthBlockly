// js/blocks/tools_blocks.js
import * as Blockly from 'blockly';

export function registerBlocks() {
    if (typeof Blockly === 'undefined') {
        console.error('Blockly not available');
        return false;
    }

    // 註解積木 (不產生代碼)
    Blockly.Blocks['sb_comment'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_COMMENT_MESSAGE}",
                "args0": [
                    {
                        "type": "field_multilineinput",
                        "name": "COMMENT",
                        "text": "在這裡輸入說明..."
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_TOOLS_HUE}",
                "tooltip": "%{BKY_SB_COMMENT_TOOLTIP}"
            });
        }
    };

    // Console Log Block
    Blockly.Blocks['sb_console_log'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_CONSOLE_LOG_MESSAGE}",
                "args0": [
                    {
                        "type": "input_value",
                        "name": "MSG"
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_TOOLS_HUE}",
                "tooltip": "%{BKY_SB_CONSOLE_LOG_TOOLTIP}",
                "helpUrl": ""
            });
        }
    };
}
