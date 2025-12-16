// js/blocks/serial_blocks.js
// Serial-related custom blocks

export function registerBlocks(Blockly) {
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
                "output": null,
                "previousStatement": null,
                "nextStatement": true,
                "colour": "%{BKY_SERIAL_HUE}",
                "tooltip": "%{BKY_SB_SERIAL_DATA_RECEIVED_TOOLTIP}",
                "hat": true
            });
        }
    };
}
