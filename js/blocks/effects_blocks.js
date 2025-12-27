// js/blocks/effects_blocks.js
// Effects-related custom blocks
import * as Blockly from 'blockly';

export function registerBlocks() {
    if (typeof Blockly === 'undefined') {
        console.error('Blockly not available');
        return false;
    }

    Blockly.Blocks['sb_setup_effect'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_SETUP_EFFECT_MESSAGE}",
                "args0": [
                    {
                        "type": "field_dropdown",
                        "name": "EFFECT_TYPE",
                        "options": [
                            ["%{BKY_SB_EFFECT_DISTORTION_TYPE_FIELD}", "distortion"],
                            ["%{BKY_SB_EFFECT_REVERB_TYPE_FIELD}", "reverb"],
                            ["%{BKY_SB_EFFECT_FEEDBACKDELAY_TYPE_FIELD}", "feedbackDelay"],
                            ["%{BKY_SB_EFFECT_FILTER_TYPE_FIELD}", "filter"],
                            ["%{BKY_SB_EFFECT_COMPRESSOR_TYPE_FIELD}", "compressor"],
                            ["%{BKY_SB_EFFECT_LIMITER_TYPE_FIELD}", "limiter"],
                            ["%{BKY_SB_EFFECT_LOFI_TYPE_FIELD}", "lofi"],
                            ["%{BKY_SB_EFFECT_CHORUS_TYPE_FIELD}", "chorus"],
                            ["%{BKY_SB_EFFECT_PHASER_TYPE_FIELD}", "phaser"],
                            ["%{BKY_SB_EFFECT_AUTOPANNER_TYPE_FIELD}", "autoPanner"]
                        ]
                    }
                ],
                "inputsInline": false,
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_EFFECTS_HUE}",
                "tooltip": "%{BKY_SB_SETUP_EFFECT_TOOLTIP}"
            });

            this.setHelpUrl(() => {
                const currentLang = window.currentLanguage || 'en';
                if (currentLang === 'zh-hant') {
                    return 'docs/effect_readme_zh-hant.html';
                }
                return 'docs/effect_readme_en.html';
            });

            // Function to update the block's shape based on the selected effect
            this.updateShape_ = function () {
                var effectType = this.getFieldValue('EFFECT_TYPE');

                // Remove existing dynamic inputs
                if (this.getInput('WET')) this.removeInput('WET');
                if (this.getInput('DISTORTION_AMOUNT')) this.removeInput('DISTORTION_AMOUNT');
                if (this.getInput('OVERSAMPLE')) this.removeInput('OVERSAMPLE');
                if (this.getInput('DECAY')) this.removeInput('DECAY');
                if (this.getInput('PREDELAY')) this.removeInput('PREDELAY');
                if (this.getInput('DELAY_TIME')) this.removeInput('DELAY_TIME');
                if (this.getInput('FEEDBACK')) this.removeInput('FEEDBACK');
                if (this.getInput('FILTER_TYPE')) this.removeInput('FILTER_TYPE');
                if (this.getInput('FILTER_FREQ')) this.removeInput('FILTER_FREQ');
                if (this.getInput('FILTER_Q')) this.removeInput('FILTER_Q');
                if (this.getInput('FILTER_ROLLOFF')) this.removeInput('FILTER_ROLLOFF');
                if (this.getInput('THRESHOLD')) this.removeInput('THRESHOLD');
                if (this.getInput('RATIO')) this.removeInput('RATIO');
                if (this.getInput('ATTACK')) this.removeInput('ATTACK');
                if (this.getInput('RELEASE')) this.removeInput('RELEASE');
                if (this.getInput('BITDEPTH')) this.removeInput('BITDEPTH');
                if (this.getInput('CHORUS_FREQUENCY')) this.removeInput('CHORUS_FREQUENCY');
                if (this.getInput('CHORUS_DELAY_TIME')) this.removeInput('CHORUS_DELAY_TIME');
                if (this.getInput('CHORUS_DEPTH')) this.removeInput('CHORUS_DEPTH');
                if (this.getInput('PHASER_FREQUENCY')) this.removeInput('PHASER_FREQUENCY');
                if (this.getInput('PHASER_OCTAVES')) this.removeInput('PHASER_OCTAVES');
                if (this.getInput('PHASER_BASE_FREQUENCY')) this.removeInput('PHASER_BASE_FREQUENCY');
                if (this.getInput('AUTOPANNER_FREQUENCY')) this.removeInput('AUTOPANNER_FREQUENCY');
                if (this.getInput('AUTOPANNER_DEPTH')) this.removeInput('AUTOPANNER_DEPTH');

                // Add WET input for specific effects
                if (['distortion', 'reverb', 'feedbackDelay', 'lofi', 'chorus', 'phaser', 'autoPanner'].includes(effectType)) {
                    this.appendValueInput('WET')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_WET_FIELD}");
                    this.getInput('WET').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">0.5</field></shadow>'
                    ));
                }

                // Add inputs based on effect type
                if (effectType === 'distortion') {
                    this.appendValueInput('DISTORTION_AMOUNT')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_DISTORTION_AMOUNT_FIELD}");
                    this.getInput('DISTORTION_AMOUNT').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">0.4</field></shadow>'
                    ));
                    this.appendDummyInput('OVERSAMPLE')
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_OVERSAMPLE_FIELD}")
                        .appendField(new Blockly.FieldDropdown([
                            ["none", "none"],
                            ["2x", "2x"],
                            ["4x", "4x"]
                        ]), "OVERSAMPLE_VALUE");
                } else if (effectType === 'reverb') {
                    this.appendValueInput('DECAY')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_DECAY_FIELD}");
                    this.getInput('DECAY').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">1.5</field></shadow>'
                    ));
                    this.appendValueInput('PREDELAY')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_PREDELAY_FIELD}");
                    this.getInput('PREDELAY').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">0.01</field></shadow>'
                    ));
                } else if (effectType === 'feedbackDelay') {
                    this.appendValueInput('DELAY_TIME')
                        .setCheck("String")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_DELAY_TIME_FIELD}");
                    this.getInput('DELAY_TIME').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="text"><field name="TEXT">8n</field></shadow>'
                    ));
                    this.appendValueInput('FEEDBACK')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_FEEDBACK_FIELD}");
                    this.getInput('FEEDBACK').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">0.25</field></shadow>'
                    ));
                } else if (effectType === 'filter') {
                    this.appendDummyInput('FILTER_TYPE')
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_FILTER_INTERNAL_TYPE_FIELD}")
                        .appendField(new Blockly.FieldDropdown([
                            ["lowpass", "lowpass"],
                            ["highpass", "highpass"],
                            ["bandpass", "bandpass"],
                            ["lowshelf", "lowshelf"],
                            ["highshelf", "highshelf"],
                            ["notch", "notch"],
                            ["allpass", "allpass"],
                            ["peaking", "peaking"]
                        ]), "FILTER_TYPE_VALUE");
                    this.appendValueInput('FILTER_FREQ')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_FILTER_FREQ_FIELD}");
                    this.getInput('FILTER_FREQ').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">20000</field></shadow>'
                    ));
                    this.appendValueInput('FILTER_Q')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_FILTER_Q_FIELD}");
                    this.getInput('FILTER_Q').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">1</field></shadow>'
                    ));
                    this.appendDummyInput('FILTER_ROLLOFF')
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_ROLLOFF_FIELD}")
                        .appendField(new Blockly.FieldDropdown([
                            ["-12", "-12"],
                            ["-24", "-24"],
                            ["-48", "-48"]
                        ]), "FILTER_ROLLOFF_VALUE");
                } else if (effectType === 'compressor') {
                    this.appendValueInput('THRESHOLD')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_THRESHOLD_FIELD}");
                    this.getInput('THRESHOLD').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">-24</field></shadow>'
                    ));
                    this.appendValueInput('RATIO')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_RATIO_FIELD}");
                    this.getInput('RATIO').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">12</field></shadow>'
                    ));
                    this.appendValueInput('ATTACK')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_ATTACK_FIELD}");
                    this.getInput('ATTACK').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">0.003</field></shadow>'
                    ));
                    this.appendValueInput('RELEASE')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_RELEASE_FIELD}");
                    this.getInput('RELEASE').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">0.25</field></shadow>'
                    ));
                } else if (effectType === 'limiter') {
                    this.appendValueInput('THRESHOLD')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_THRESHOLD_FIELD}");
                    this.getInput('THRESHOLD').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">-6</field></shadow>'
                    ));
                } else if (effectType === 'lofi') {
                    this.appendDummyInput('BITDEPTH')
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_BITDEPTH_FIELD}")
                        .appendField(new Blockly.FieldDropdown([
                            ["4", "4"],
                            ["8", "8"],
                            ["12", "12"],
                            ["16", "16"]
                        ]), "BITDEPTH_VALUE");
                } else if (effectType === 'chorus') {
                    this.appendValueInput('CHORUS_FREQUENCY')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_CHORUS_FREQUENCY_FIELD}");
                    this.getInput('CHORUS_FREQUENCY').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">1.5</field></shadow>'
                    ));
                    this.appendValueInput('CHORUS_DELAY_TIME')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_DELAY_TIME_FIELD}");
                    this.getInput('CHORUS_DELAY_TIME').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">3.5</field></shadow>'
                    ));
                    this.appendValueInput('CHORUS_DEPTH')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_DEPTH_FIELD}");
                    this.getInput('CHORUS_DEPTH').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">0.7</field></shadow>'
                    ));
                } else if (effectType === 'phaser') {
                    this.appendValueInput('PHASER_FREQUENCY')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_PHASER_FREQUENCY_FIELD}"); // Now uses its own key
                    this.getInput('PHASER_FREQUENCY').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">15</field></shadow>'
                    ));
                    this.appendValueInput('PHASER_OCTAVES')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_OCTAVES_FIELD}");
                    this.getInput('PHASER_OCTAVES').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">3</field></shadow>'
                    ));
                    this.appendValueInput('PHASER_BASE_FREQUENCY')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_BASE_FREQUENCY_FIELD}");
                    this.getInput('PHASER_BASE_FREQUENCY').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">200</field></shadow>'
                    ));
                } else if (effectType === 'autoPanner') {
                    this.appendValueInput('AUTOPANNER_FREQUENCY')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_AUTOPANNER_FREQUENCY_FIELD}");
                    this.getInput('AUTOPANNER_FREQUENCY').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">1</field></shadow>'
                    ));
                    this.appendValueInput('AUTOPANNER_DEPTH')
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("%{BKY_SB_EFFECT_AUTOPANNER_DEPTH_FIELD}");
                    this.getInput('AUTOPANNER_DEPTH').setShadowDom(Blockly.utils.xml.textToDom(
                        '<shadow type="math_number"><field name="NUM">0.5</field></shadow>'
                    ));
                }
            };

            // Register handler for dropdown changes
            this.onchange = function (event) {
                if (event.type === Blockly.Events.CHANGE && event.blockId === this.id && event.name === 'EFFECT_TYPE') {
                    this.updateShape_();
                }
            }.bind(this);

            // Initial shape update
            this.updateShape_();
        },
        // To handle block serialization/deserialization with dynamic inputs
        mutationToDom: function () {
            var container = Blockly.utils.xml.createElement('mutation');
            var effectType = this.getFieldValue('EFFECT_TYPE');
            container.setAttribute('effect_type', effectType);

            if (effectType === 'distortion') {
                container.setAttribute('oversample_value', this.getFieldValue('OVERSAMPLE_VALUE'));
            } else if (effectType === 'filter') {
                container.setAttribute('filter_type_value', this.getFieldValue('FILTER_TYPE_VALUE'));
                container.setAttribute('filter_rolloff_value', this.getFieldValue('FILTER_ROLLOFF_VALUE'));
            } else if (effectType === 'lofi') {
                container.setAttribute('bitdepth_value', this.getFieldValue('BITDEPTH_VALUE'));
            }
            return container;
        },
        domToMutation: function (xmlElement) {
            var effectType = xmlElement.getAttribute('effect_type');
            this.setFieldValue(effectType, 'EFFECT_TYPE');
            this.updateShape_(); // This will create inputs for the selected type

            // Load values for dropdowns/dummy inputs after updateShape_
            if (effectType === 'distortion') {
                this.setFieldValue(xmlElement.getAttribute('oversample_value'), 'OVERSAMPLE_VALUE');
            } else if (effectType === 'filter') {
                this.setFieldValue(xmlElement.getAttribute('filter_type_value'), 'FILTER_TYPE_VALUE');
                this.setFieldValue(xmlElement.getAttribute('filter_rolloff_value'), 'FILTER_ROLLOFF_VALUE');
            } else if (effectType === 'lofi') {
                this.setFieldValue(xmlElement.getAttribute('bitdepth_value'), 'BITDEPTH_VALUE');
            }
        }
    };
}