// js/blocks/effects_blocks.js
// Effects-related custom blocks

export function registerBlocks(Blockly) {
    if (typeof Blockly === 'undefined') {
        console.error('Blockly not available');
        return false;
    }

    // --- NEW: Setup Effect Block ---
    Blockly.Blocks['sb_setup_effect'] = {
        init: function() {
            this.jsonInit({
                "message0": "%{BKY_SB_SETUP_EFFECT_MESSAGE}",
                "args0": [
                    {
                        "type": "field_dropdown",
                        "name": "EFFECT_TYPE",
                        "options": [
                            ["Distortion", "distortion"],
                            ["Reverb", "reverb"],
                            ["FeedbackDelay", "feedbackDelay"]
                        ]
                    },
                    {
                        "type": "input_value",
                        "name": "WET",
                        "check": "Number",
                        "align": "RIGHT"
                    }
                ],
                "inputsInline": false,
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_EFFECTS_HUE}",
                "tooltip": "%{BKY_SB_SETUP_EFFECT_TOOLTIP}"
            });
            // Set initial shadow for WET input
            this.getInput('WET').setShadowDom(Blockly.utils.xml.textToDom(
                '<shadow type="math_number"><field name="NUM">0</field></shadow>'
            ));

            // Function to update the block's shape based on the selected effect
            this.updateShape_ = function() {
                var effectType = this.getFieldValue('EFFECT_TYPE');

                // Remove existing dynamic inputs
                if (this.getInput('DISTORTION_AMOUNT')) this.removeInput('DISTORTION_AMOUNT');
                if (this.getInput('OVERSAMPLE')) this.removeInput('OVERSAMPLE');
                if (this.getInput('DECAY')) this.removeInput('DECAY');
                if (this.getInput('PREDELAY')) this.removeInput('PREDELAY');
                if (this.getInput('DELAY_TIME')) this.removeInput('DELAY_TIME');
                if (this.getInput('FEEDBACK')) this.removeInput('FEEDBACK');

                // Add inputs based on effect type
                if (effectType === 'distortion') {
                    this.appendValueInput('DISTORTION_AMOUNT')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_DISTORTION_AMOUNT_FIELD}"); // Localized
                    this.getInput('DISTORTION_AMOUNT').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">0.4</field></shadow>'
                    ));
                    this.appendDummyInput('OVERSAMPLE')
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_OVERSAMPLE_FIELD}") // Localized
                        .appendField(new Blockly.FieldDropdown([
                            ["none", "none"],
                            ["2x", "2x"],
                            ["4x", "4x"]
                        ]), "OVERSAMPLE_VALUE");
                } else if (effectType === 'reverb') {
                    this.appendValueInput('DECAY')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_DECAY_FIELD}"); // Localized
                    this.getInput('DECAY').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">1.5</field></shadow>'
                    ));
                    this.appendValueInput('PREDELAY')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_PREDELAY_FIELD}"); // Localized
                    this.getInput('PREDELAY').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">0.01</field></shadow>'
                    ));
                } else if (effectType === 'feedbackDelay') {
                    this.appendValueInput('DELAY_TIME')
                        .setCheck("String") // Tone.Time can take string (e.g., "8n")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_DELAY_TIME_FIELD}"); // Localized
                    this.getInput('DELAY_TIME').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="text"><field name="TEXT">8n</field></shadow>'
                    ));
                    this.appendValueInput('FEEDBACK')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_FEEDBACK_FIELD}"); // Localized
                    this.getInput('FEEDBACK').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">0.25</field></shadow>'
                    ));
                }
            };

            // Register handler for dropdown changes
            this.onchange = function(event) {
                if (event.type === Blockly.Events.CHANGE && event.blockId === this.id && event.name === 'EFFECT_TYPE') {
                    this.updateShape_();
                }
            }.bind(this);

            // Initial shape update
            this.updateShape_();
        },
        // To handle block serialization/deserialization with dynamic inputs
        mutationToDom: function() {
            var container = Blockly.utils.xml.createElement('mutation');
            container.setAttribute('effect_type', this.getFieldValue('EFFECT_TYPE'));
            return container;
        },
        domToMutation: function(xmlElement) {
            this.setFieldValue(xmlElement.getAttribute('effect_type'), 'EFFECT_TYPE');
            this.updateShape_();
        }
    };
}
