// js/blocks/sampler_blocks.js
import * as Blockly from 'blockly';
import { getHelpUrl } from '../core/helpUtils.js';

const samplerBlock = {
    init: function () {
        this.jsonInit({
            "message0": "%{BKY_SB_CREATE_SAMPLER_INSTRUMENT_MESSAGE}",
            "args0": [
                {
                    "type": "field_dropdown",
                    "name": "SAMPLER_TYPE",
                    "options": [
                        ["%{BKY_SB_PARAM_SAMPLER_TYPE_DEFAULT}", "DEFAULT"],
                        ["%{BKY_SB_PARAM_SAMPLER_TYPE_VIOLIN_PIZZ}", "VIOLIN_PIZZ"],
                        ["%{BKY_SB_PARAM_SAMPLER_TYPE_VIOLIN_SUSTAIN}", "VIOLIN_SUSTAIN"],
                        ["%{BKY_SB_PARAM_SAMPLER_TYPE_JK_KICK}", "JK_KICK"],
                        ["%{BKY_SB_PARAM_SAMPLER_TYPE_JK_SNARE}", "JK_SNARE"],
                        ["%{BKY_SB_PARAM_SAMPLER_TYPE_JK_HH}", "JK_HH"],
                        ["%{BKY_SB_PARAM_SAMPLER_TYPE_JK_OHH}", "JK_OHH"],
                        ["%{BKY_SB_PARAM_SAMPLER_TYPE_JK_CLAP}", "JK_CLAP"],
                        ["%{BKY_SB_PARAM_SAMPLER_TYPE_JK_RIM}", "JK_RIM"],
                        ["%{BKY_SB_PARAM_SAMPLER_TYPE_JK_TOM_H}", "JK_TOM_H"],
                        ["%{BKY_SB_PARAM_SAMPLER_TYPE_JK_TOM_M}", "JK_TOM_M"],
                        ["%{BKY_SB_PARAM_SAMPLER_TYPE_JK_TOM_L}", "JK_TOM_L"],
                        ["%{BKY_SB_PARAM_SAMPLER_TYPE_JK_CRASH}", "JK_CRASH"],
                        ["%{BKY_SB_PARAM_SAMPLER_TYPE_JK_RIDE}", "JK_RIDE"],
                        ["%{BKY_SB_PARAM_SAMPLER_TYPE_CUSTOM}", "CUSTOM"]
                    ]
                }
            ],
            "previousStatement": null,
            "nextStatement": null,
            "colour": "%{BKY_SB_CAT_INSTRUMENTS_HUE}",
            "tooltip": "%{BKY_SB_CREATE_SAMPLER_INSTRUMENT_TOOLTIP}",
            "helpUrl": getHelpUrl('custom_sampler_readme'),
            "mutator": "sampler_type_mutator"
        });
        this.is_sound_source_block = true;
    },
};

const samplerTypeMutator = {
    mutationToDom: function() { return null; },
    domToMutation: function(xmlElement) { this.updateShape_(this.getFieldValue('SAMPLER_TYPE')); },
    updateShape_: function(samplerType) {
        const baseUrlExists = this.getInput('BASE_URL');
        const sampleMapExists = this.getInput('SAMPLE_MAP_JSON');
        if (samplerType === 'CUSTOM') {
            if (!baseUrlExists) {
                this.appendValueInput("BASE_URL").setCheck("String").setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_SAMPLER_BASE_URL}");
            }
            if (!sampleMapExists) {
                this.appendDummyInput("SAMPLE_MAP_JSON").setAlign(Blockly.ALIGN_RIGHT).appendField("%{BKY_SB_PARAM_SAMPLER_MAP}").appendField(new Blockly.FieldTextInput('{"C4": "C4.mp3"}'), "SAMPLE_MAP_JSON_FIELD");
            }
        } else {
            if (baseUrlExists) this.removeInput('BASE_URL');
            if (sampleMapExists) this.removeInput('SAMPLE_MAP_JSON');
        }
    }
};

const samplerTypeMixin = {
    onchange: function(event) {
        if (event.type === Blockly.Events.BLOCK_CHANGE && event.element === 'field' && event.name === 'SAMPLER_TYPE' && event.blockId === this.id) {
            this.updateShape_(event.newValue);
        }
    }
};

export function registerBlocks() {
    if (typeof Blockly === 'undefined') return false;
    Blockly.Extensions.registerMutator('sampler_type_mutator', samplerTypeMutator, null, ['sampler_type_mutator']);
    Blockly.Blocks['sb_create_sampler_instrument'] = { ...samplerBlock, ...samplerTypeMixin };
}
