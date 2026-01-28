// js/blocks/effects_blocks.js
// Effects-related custom blocks (Container Version)
import * as Blockly from 'blockly';
import { getHelpUrl } from '../core/helpUtils.js';
import { getInstrumentOptions, FieldDropdownLenient } from '../core/blocklyUtils.js';

export function registerBlocks() {
    if (typeof Blockly === 'undefined') {
        console.error('Blockly not available');
        return false;
    }

    // Register custom lenient dropdown for JSON usage
    // Use Blockly.registry if available (v9+), otherwise fallback or skip check (it throws if duplicate)
    // Here assuming modern Blockly where fieldRegistry is available via registry
    if (Blockly.registry && Blockly.registry.hasItem) {
        if (!Blockly.registry.hasItem(Blockly.registry.Type.FIELD, 'field_dropdown_lenient')) {
            Blockly.fieldRegistry.register('field_dropdown_lenient', FieldDropdownLenient);
        }
    } else {
        // Fallback for older versions or if registry API differs
        // Try to register, catch if already exists
        try {
            Blockly.fieldRegistry.register('field_dropdown_lenient', FieldDropdownLenient);
        } catch (e) {
            // Ignore error if already registered
        }
    }

    Blockly.Blocks['sb_container_setup_effect'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_CONTAINER_SETUP_EFFECT_MESSAGE}",
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
                            ["%{BKY_SB_EFFECT_AUTOPANNER_TYPE_FIELD}", "autoPanner"],
                            ["%{BKY_SB_EFFECT_TREMOLO_TYPE_FIELD}", "tremolo"]
                        ]
                    }
                ],
                "inputsInline": false,
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_EFFECTS_HUE}",
                "tooltip": "%{BKY_SB_SETUP_EFFECT_TOOLTIP}"
            });

            this.setHelpUrl(getHelpUrl('effect_readme'));

            this.updateShape_ = function () {
                var effectType = this.getFieldValue('EFFECT_TYPE');
                const dynamicInputs = [
                    'WET', 'DISTORTION_AMOUNT', 'OVERSAMPLE', 'DECAY', 'PREDELAY',
                    'DELAY_TIME', 'FEEDBACK', 'FILTER_TYPE', 'FILTER_FREQ', 'FILTER_Q',
                    'FILTER_ROLLOFF', 'THRESHOLD', 'RATIO', 'ATTACK', 'RELEASE',
                    'BITDEPTH', 'CHORUS_FREQUENCY', 'CHORUS_DELAY_TIME', 'CHORUS_DEPTH',
                    'PHASER_FREQUENCY', 'PHASER_OCTAVES', 'PHASER_BASE_FREQUENCY',
                    'AUTOPANNER_FREQUENCY', 'AUTOPANNER_DEPTH',
                    'TREMOLO_FREQUENCY', 'TREMOLO_DEPTH'
                ];
                dynamicInputs.forEach(inputName => { if (this.getInput(inputName)) this.removeInput(inputName); });

                if (['distortion', 'reverb', 'feedbackDelay', 'lofi', 'chorus', 'phaser', 'autoPanner', 'tremolo'].includes(effectType)) {
                    this.appendValueInput('WET').setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_WET}");
                    this.getInput('WET').setShadowDom(Blockly.utils.xml.textToDom('<shadow type="math_number"><field name="NUM">0.5</field></shadow>'));
                }

                if (effectType === 'distortion') {
                    this.appendValueInput('DISTORTION_AMOUNT').setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_DISTORTION}");
                    this.getInput('DISTORTION_AMOUNT').setShadowDom(Blockly.utils.xml.textToDom('<shadow type="math_number"><field name="NUM">0.4</field></shadow>'));
                    this.appendDummyInput('OVERSAMPLE').setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_EFFECT_OVERSAMPLE_FIELD}").appendField(new Blockly.FieldDropdown([["none", "none"], ["2x", "2x"], ["4x", "4x"]]), "OVERSAMPLE_VALUE");
                } else if (effectType === 'reverb') {
                    this.appendValueInput('DECAY').setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_DECAY}");
                    this.getInput('DECAY').setShadowDom(Blockly.utils.xml.textToDom('<shadow type="math_number"><field name="NUM">1.5</field></shadow>'));
                    this.appendValueInput('PREDELAY').setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_EFFECT_PREDELAY_FIELD}");
                    this.getInput('PREDELAY').setShadowDom(Blockly.utils.xml.textToDom('<shadow type="math_number"><field name="NUM">0.01</field></shadow>'));
                } else if (effectType === 'feedbackDelay') {
                    this.appendValueInput('DELAY_TIME').setCheck("String").setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_DELAY_TIME}");
                    this.getInput('DELAY_TIME').setShadowDom(Blockly.utils.xml.textToDom('<shadow type="text"><field name="TEXT">8n</field></shadow>'));
                    this.appendValueInput('FEEDBACK').setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_FEEDBACK}");
                    this.getInput('FEEDBACK').setShadowDom(Blockly.utils.xml.textToDom('<shadow type="math_number"><field name="NUM">0.25</field></shadow>'));
                } else if (effectType === 'filter') {
                    this.appendDummyInput('FILTER_TYPE').setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_FILTER_MODE}").appendField(new Blockly.FieldDropdown([["lowpass", "lowpass"], ["highpass", "highpass"], ["bandpass", "bandpass"], ["lowshelf", "lowshelf"], ["highshelf", "highshelf"], ["notch", "notch"], ["allpass", "allpass"], ["peaking", "peaking"]]), "FILTER_TYPE_VALUE");
                    this.appendValueInput('FILTER_FREQ').setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_FILTER_FREQ}");
                    this.getInput('FILTER_FREQ').setShadowDom(Blockly.utils.xml.textToDom('<shadow type="math_number"><field name="NUM">20000</field></shadow>'));
                    this.appendValueInput('FILTER_Q').setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_Q}");
                    this.getInput('FILTER_Q').setShadowDom(Blockly.utils.xml.textToDom('<shadow type="math_number"><field name="NUM">1</field></shadow>'));
                    this.appendDummyInput('FILTER_ROLLOFF').setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_ROLLOFF}").appendField(new Blockly.FieldDropdown([["-12", "-12"], ["-24", "-24"], ["-48", "-48"]]), "FILTER_ROLLOFF_VALUE");
                } else if (effectType === 'compressor') {
                    this.appendValueInput('THRESHOLD').setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_THRESHOLD}");
                    this.getInput('THRESHOLD').setShadowDom(Blockly.utils.xml.textToDom('<shadow type="math_number"><field name="NUM">-24</field></shadow>'));
                    this.appendValueInput('RATIO').setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_RATIO}");
                    this.getInput('RATIO').setShadowDom(Blockly.utils.xml.textToDom('<shadow type="math_number"><field name="NUM">12</field></shadow>'));
                    this.appendValueInput('ATTACK').setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_ATTACK}");
                    this.getInput('ATTACK').setShadowDom(Blockly.utils.xml.textToDom('<shadow type="math_number"><field name="NUM">0.003</field></shadow>'));
                    this.appendValueInput('RELEASE').setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_RELEASE}");
                    this.getInput('RELEASE').setShadowDom(Blockly.utils.xml.textToDom('<shadow type="math_number"><field name="NUM">0.25</field></shadow>'));
                } else if (effectType === 'limiter') {
                    this.appendValueInput('THRESHOLD').setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_THRESHOLD}");
                    this.getInput('THRESHOLD').setShadowDom(Blockly.utils.xml.textToDom('<shadow type="math_number"><field name="NUM">-6</field></shadow>'));
                } else if (effectType === 'lofi') {
                    this.appendDummyInput('BITDEPTH').setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_BITS}").appendField(new Blockly.FieldDropdown([["4", "4"], ["8", "8"], ["12", "12"], ["16", "16"]]), "BITDEPTH_VALUE");
                } else if (effectType === 'chorus') {
                    this.appendValueInput('CHORUS_FREQUENCY').setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_CHORUS_FREQ}");
                    this.getInput('CHORUS_FREQUENCY').setShadowDom(Blockly.utils.xml.textToDom('<shadow type="math_number"><field name="NUM">1.5</field></shadow>'));
                    this.appendValueInput('CHORUS_DELAY_TIME').setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_DELAY_TIME}");
                    this.getInput('CHORUS_DELAY_TIME').setShadowDom(Blockly.utils.xml.textToDom('<shadow type="math_number"><field name="NUM">3.5</field></shadow>'));
                    this.appendValueInput('CHORUS_DEPTH').setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_DEPTH}");
                    this.getInput('CHORUS_DEPTH').setShadowDom(Blockly.utils.xml.textToDom('<shadow type="math_number"><field name="NUM">0.7</field></shadow>'));
                } else if (effectType === 'phaser') {
                    this.appendValueInput('PHASER_FREQUENCY').setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_PHASER_FREQ}");
                    this.getInput('PHASER_FREQUENCY').setShadowDom(Blockly.utils.xml.textToDom('<shadow type="math_number"><field name="NUM">15</field></shadow>'));
                    this.appendValueInput('PHASER_OCTAVES').setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_EFFECT_OCTAVES_FIELD}");
                    this.getInput('PHASER_OCTAVES').setShadowDom(Blockly.utils.xml.textToDom('<shadow type="math_number"><field name="NUM">3</field></shadow>'));
                    this.appendValueInput('PHASER_BASE_FREQUENCY').setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_BASE_FREQ}");
                    this.getInput('PHASER_BASE_FREQUENCY').setShadowDom(Blockly.utils.xml.textToDom('<shadow type="math_number"><field name="NUM">200</field></shadow>'));
                } else if (effectType === 'autoPanner') {
                    this.appendValueInput('AUTOPANNER_FREQUENCY').setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_AUTOPANNER_FREQ}");
                    this.getInput('AUTOPANNER_FREQUENCY').setShadowDom(Blockly.utils.xml.textToDom('<shadow type="math_number"><field name="NUM">1</field></shadow>'));
                    this.appendValueInput('AUTOPANNER_DEPTH').setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_AUTOPANNER_DEPTH}");
                    this.getInput('AUTOPANNER_DEPTH').setShadowDom(Blockly.utils.xml.textToDom('<shadow type="math_number"><field name="NUM">0.5</field></shadow>'));
                } else if (effectType === 'tremolo') {
                    this.appendValueInput('TREMOLO_FREQUENCY').setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_TREMOLO_FREQ}");
                    this.getInput('TREMOLO_FREQUENCY').setShadowDom(Blockly.utils.xml.textToDom('<shadow type="math_number"><field name="NUM">10</field></shadow>'));
                    this.appendValueInput('TREMOLO_DEPTH').setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_DEPTH}");
                    this.getInput('TREMOLO_DEPTH').setShadowDom(Blockly.utils.xml.textToDom('<shadow type="math_number"><field name="NUM">0.5</field></shadow>'));
                }
            };

            this.onchange = function (event) {
                if (event.type === Blockly.Events.CHANGE && event.blockId === this.id && event.name === 'EFFECT_TYPE') {
                    this.updateShape_();
                }
            }.bind(this);

            this.updateShape_();
        },
        mutationToDom: function () {
            var container = Blockly.utils.xml.createElement('mutation');
            var effectType = this.getFieldValue('EFFECT_TYPE');
            container.setAttribute('effect_type', effectType);
            if (effectType === 'distortion') container.setAttribute('oversample_value', this.getFieldValue('OVERSAMPLE_VALUE'));
            else if (effectType === 'filter') {
                container.setAttribute('filter_type_value', this.getFieldValue('FILTER_TYPE_VALUE'));
                container.setAttribute('filter_rolloff_value', this.getFieldValue('FILTER_ROLLOFF_VALUE'));
            } else if (effectType === 'lofi') container.setAttribute('bitdepth_value', this.getFieldValue('BITDEPTH_VALUE'));
            return container;
        },
        domToMutation: function (xmlElement) {
            var effectType = xmlElement.getAttribute('effect_type');
            if (effectType) {
                this.setFieldValue(effectType, 'EFFECT_TYPE');
                this.updateShape_(); // Create the dynamic inputs based on the type
                
                // After shape is updated, we can safely set other field values from mutation
                if (effectType === 'distortion') {
                    const os = xmlElement.getAttribute('oversample_value');
                    if (os) this.setFieldValue(os, 'OVERSAMPLE_VALUE');
                } else if (effectType === 'filter') {
                    const ft = xmlElement.getAttribute('filter_type_value');
                    const fr = xmlElement.getAttribute('filter_rolloff_value');
                    if (ft) this.setFieldValue(ft, 'FILTER_TYPE_VALUE');
                    if (fr) this.setFieldValue(fr, 'FILTER_ROLLOFF_VALUE');
                } else if (effectType === 'lofi') {
                    const bd = xmlElement.getAttribute('bitdepth_value');
                    if (bd) this.setFieldValue(bd, 'BITDEPTH_VALUE');
                }
            }
        }
    };

    Blockly.Blocks['sb_clear_effects'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_CLEAR_EFFECTS_MESSAGE}",
                "args0": [
                    {
                        "type": "input_value",
                        "name": "TARGET",
                        "check": "String"
                    }
                ],
                "inputsInline": true,
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_EFFECTS_HUE}",
                "tooltip": "%{BKY_SB_CLEAR_EFFECTS_TOOLTIP}"
            });
            this.setHelpUrl(getHelpUrl('effect_readme'));
        }
    };

    Blockly.Extensions.register('dynamic_effect_param_extension', function() {
        this.setOnChange(function(changeEvent) {
            if (changeEvent.type === Blockly.Events.BLOCK_CHANGE && 
                changeEvent.blockId === this.id && 
                changeEvent.name === 'EFFECT_TYPE') {
                this.updateParamOptions_();
            }
        });

        this.updateParamOptions_ = function() {
            const effectType = this.getFieldValue('EFFECT_TYPE');
            const paramField = this.getField('PARAM_NAME');
            if (!paramField) return;

            // Helper to safely get localized string
            const getMsg = (key) => Blockly.Msg[key] || key;

            let options = [];
            // Common wet option for most effects
            const wetOpt = [getMsg("SB_PARAM_WET"), "wet"];

            switch (effectType) {
                case 'filter':
                    options = [
                        [getMsg("SB_PARAM_FREQ"), "frequency"],
                        [getMsg("SB_PARAM_Q"), "Q"],
                        wetOpt
                    ];
                    break;
                case 'distortion':
                    options = [
                        [getMsg("SB_PARAM_DISTORTION"), "distortion"],
                        wetOpt
                    ];
                    break;
                case 'reverb':
                    options = [
                        [getMsg("SB_PARAM_DECAY"), "decay"],
                        [getMsg("SB_EFFECT_PREDELAY_FIELD"), "preDelay"],
                        wetOpt
                    ];
                    break;
                case 'feedbackDelay':
                    options = [
                        [getMsg("SB_PARAM_DELAY_TIME"), "delayTime"],
                        [getMsg("SB_PARAM_FEEDBACK"), "feedback"],
                        wetOpt
                    ];
                    break;
                case 'compressor':
                    options = [
                        [getMsg("SB_PARAM_THRESHOLD"), "threshold"],
                        [getMsg("SB_PARAM_RATIO"), "ratio"],
                        [getMsg("SB_PARAM_ATTACK"), "attack"],
                        [getMsg("SB_PARAM_RELEASE"), "release"]
                    ];
                    break;
                case 'limiter':
                    options = [
                        [getMsg("SB_PARAM_THRESHOLD"), "threshold"]
                    ];
                    break;
                case 'lofi':
                    options = [
                        [getMsg("SB_PARAM_BITS"), "bits"],
                        wetOpt
                    ];
                    break;
                case 'chorus':
                    options = [
                        [getMsg("SB_PARAM_FREQ"), "frequency"],
                        [getMsg("SB_PARAM_DELAY_TIME"), "delayTime"],
                        [getMsg("SB_PARAM_DEPTH"), "depth"],
                        wetOpt
                    ];
                    break;
                case 'phaser':
                    options = [
                        [getMsg("SB_PARAM_FREQ"), "frequency"],
                        [getMsg("SB_EFFECT_OCTAVES_FIELD"), "octaves"],
                        [getMsg("SB_PARAM_BASE_FREQ"), "baseFrequency"],
                        wetOpt
                    ];
                    break;
                case 'autoPanner':
                case 'tremolo':
                    options = [
                        [getMsg("SB_PARAM_FREQ"), "frequency"],
                        [getMsg("SB_PARAM_DEPTH"), "depth"],
                        wetOpt
                    ];
                    break;
                default:
                    options = [["---", "none"]];
            }

            const currentVal = paramField.getValue();
            paramField.menuGenerator_ = options;
            
            const isValid = options.some(opt => opt[1] === currentVal);
            if (!isValid && options.length > 0) {
                paramField.setValue(options[0][1]);
            }
        };
    });

    Blockly.Blocks['sb_set_effect_param'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_SET_EFFECT_PARAM_MESSAGE}",
                "args0": [
                    {
                        "type": "field_dropdown",
                        "name": "TARGET",
                        "options": function() { return getInstrumentOptions(true); }
                    },
                    {
                        "type": "field_number",
                        "name": "INDEX",
                        "value": 1,
                        "min": 1,
                        "precision": 1
                    },
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
                            ["%{BKY_SB_EFFECT_AUTOPANNER_TYPE_FIELD}", "autoPanner"],
                            ["%{BKY_SB_EFFECT_TREMOLO_TYPE_FIELD}", "tremolo"]
                        ]
                    },
                    {
                        "type": "field_dropdown_lenient",
                        "name": "PARAM_NAME",
                        "options": [
                            ["%{BKY_SB_PARAM_FREQ}", "frequency"],
                            ["%{BKY_SB_PARAM_Q}", "Q"],
                            ["%{BKY_SB_PARAM_WET}", "wet"]
                        ]
                    },
                    {
                        "type": "input_value",
                        "name": "VALUE",
                        "check": "Number"
                    }
                ],
                "inputsInline": true,
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_EFFECTS_HUE}",
                "tooltip": "%{BKY_SB_SET_EFFECT_PARAM_TOOLTIP}",
                "extensions": ["dynamic_effect_param_extension"]
            });
            this.setHelpUrl(getHelpUrl('effect_readme'));
            
            // Ensure options are correct on load
            if (this.updateParamOptions_) this.updateParamOptions_();
        }
    };
}