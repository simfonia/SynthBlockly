// js/blocks/serial_blocks.js
// Serial-related custom blocks
import * as Blockly from 'blockly';

export function registerBlocks() {
    if (typeof Blockly === 'undefined') {
        console.error('Blockly not available');
        return false;
    }

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
                "colour": "%{BKY_SERIAL_HUE}",
                "tooltip": "%{BKY_SB_SERIAL_DATA_RECEIVED_TOOLTIP}",
                "hat": "cap"
            });
        }
    };

    // 檢查位元遮罩 (Polyphony)
    Blockly.Blocks['sb_serial_check_key_mask'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_SERIAL_CHECK_KEY_MASK_MESSAGE}",
                "args0": [
                    {
                        "type": "input_value",
                        "name": "DATA",
                        "check": "String"
                    },
                    {
                        "type": "field_number",
                        "name": "KEY",
                        "value": 1,
                        "min": 1,
                        "max": 16
                    }
                ],
                "output": "Boolean",
                "colour": "%{BKY_SERIAL_HUE}",
                "tooltip": "%{BKY_SB_SERIAL_CHECK_KEY_MASK_TOOLTIP}"
            });
        }
    };
}
