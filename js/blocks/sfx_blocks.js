// js/blocks/sfx_blocks.js
import * as Blockly from 'blockly';

export function registerBlocks() {
    if (typeof Blockly === 'undefined') {
        console.error('Blockly not available');
        return false;
    }

    Blockly.Blocks['sb_play_sfx'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_PLAY_SFX_MESSAGE}",
                "args0": [
                    {
                        "type": "field_dropdown",
                        "name": "FILENAME",
                        "options": [
                            ["Explosion 1", "samples/sound/Explosion-1.wav"],
                            ["Explosion 2", "samples/sound/Explosion-2.wav"],
                            ["Explosion 3", "samples/sound/Explosion-3.wav"],
                            ["Explosion 4 (MP3)", "samples/sound/explosion-4.mp3"],
                            ["Suck 1", "samples/sound/suck-1.wav"],
                            ["Suck 2", "samples/sound/suck-2.wav"],
                            ["Suck 3", "samples/sound/suck-3.wav"],
                            ["Suck 4", "samples/sound/suck-4.wav"],
                            ["Windchimes 1", "samples/sound/windchimes-1.wav"],
                            ["Windchimes 2", "samples/sound/windchimes-2.wav"],
                            ["%{BKY_SB_SF_CUSTOM_OPTION}", "CUSTOM"]
                        ]
                    }
                ],
                "message1": "%{BKY_SB_SFX_CUSTOM_URL_LABEL} %1",
                "args1": [
                    {
                        "type": "input_value",
                        "name": "CUSTOM_URL",
                        "check": "String"
                    }
                ],
                "message2": "%{BKY_SB_PLAY_SFX_REVERSE_FIELD}",
                "args2": [
                    {
                        "type": "field_checkbox",
                        "name": "REVERSE",
                        "checked": false
                    }
                ],
                "message3": "%{BKY_SB_PLAY_SFX_SPEED_FIELD}",
                "args3": [
                    {
                        "type": "input_value",
                        "name": "SPEED",
                        "check": "Number"
                    }
                ],
                "message4": "%{BKY_SB_PLAY_SFX_VOLUME_FIELD}",
                "args4": [
                    {
                        "type": "input_value",
                        "name": "VOLUME",
                        "check": "Number"
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SFX_HUE}",
                "tooltip": "%{BKY_SB_PLAY_SFX_TOOLTIP}"
            });

            // Force multi-line layout (External Inputs)
            this.setInputsInline(false);

            // Align labels to the right for a clean vertical line
            this.getInput('CUSTOM_URL').setAlign(Blockly.ALIGN_RIGHT);
            this.getInput('SPEED').setAlign(Blockly.ALIGN_RIGHT);
            this.getInput('VOLUME').setAlign(Blockly.ALIGN_RIGHT);

            this.updateShape_();
        },

        mutationToDom: function () {
            var container = Blockly.utils.xml.createElement('mutation');
            var filename = this.getFieldValue('FILENAME');
            container.setAttribute('filename', filename);
            return container;
        },

        domToMutation: function (xmlElement) {
            // Note: Field values are restored after domToMutation, 
            // but we can force an update here if needed.
            this.updateShape_(); 
        },

        updateShape_: function () {
            var filename = this.getFieldValue('FILENAME');
            var customUrlInput = this.getInput('CUSTOM_URL');
            
            if (customUrlInput) {
                // Show URL input only if CUSTOM is selected
                customUrlInput.setVisible(filename === 'CUSTOM');
            }

            // Force a re-render to ensure shadow blocks and sockets are positioned correctly
            if (this.rendered) {
                this.render();
            }
        },

        onchange: function (event) {
            if (event.type === Blockly.Events.BLOCK_CHANGE &&
                event.blockId === this.id &&
                event.name === 'FILENAME') {
                this.updateShape_();
            }
        }
    };
}