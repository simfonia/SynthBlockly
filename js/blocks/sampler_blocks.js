// js/blocks/sampler_blocks.js
import * as Blockly from 'blockly';
import { getHelpUrl } from '../core/helpUtils.js';

const samplerBlock = {
    init: function () {
        this.jsonInit({
            "message0": "%{BKY_SB_CREATE_SAMPLER_INSTRUMENT_MESSAGE}",
            "args0": [
                {
                    "type": "field_input",
                    "name": "NAME",
                    "text": "MySampler"
                },
                {
                    "type": "field_dropdown",
                    "name": "SAMPLER_TYPE",
                    "options": [
                        ["%{BKY_SB_SAMPLER_TYPE_DEFAULT}", "DEFAULT"],
                        ["%{BKY_SB_SAMPLER_TYPE_VIOLIN_PIZZ}", "VIOLIN_PIZZ"],
                        ["%{BKY_SB_SAMPLER_TYPE_VIOLIN_SUSTAIN}", "VIOLIN_SUSTAIN"],
                        ["%{BKY_SB_SAMPLER_TYPE_CUSTOM}", "CUSTOM"]
                    ]
                }
            ],
            "previousStatement": null,
            "nextStatement": null,
            "colour": "#388E3C",
            "tooltip": "%{BKY_SB_CREATE_SAMPLER_INSTRUMENT_TOOLTIP}",
            "helpUrl": getHelpUrl('custom_sampler_readme'),
            "mutator": "sampler_type_mutator"
        });
    },
};

const samplerTypeMutator = {
    // We don't need to save any extra state to XML. The dropdown's state is saved automatically.
    mutationToDom: function() {
        return null;
    },
    domToMutation: function(xmlElement) {
        // This is called when the block is loaded from XML.
        // We trigger an update to ensure the correct inputs are shown.
        this.updateShape_(this.getFieldValue('SAMPLER_TYPE'));
    },

    // The core logic: this is called by the dropdown's onchange handler.
    updateShape_: function(samplerType) {
        // Check if the custom inputs already exist.
        const baseUrlExists = this.getInput('BASE_URL');
        const sampleMapExists = this.getInput('SAMPLE_MAP_JSON');

        if (samplerType === 'CUSTOM') {
            // If user wants custom, and inputs don't exist, add them.
            if (!baseUrlExists) {
                this.appendValueInput("BASE_URL")
                    .setCheck("String")
                    .setAlign(Blockly.ALIGN_RIGHT)
                    .appendField("%{BKY_SB_SAMPLER_BASE_URL}");
            }
            if (!sampleMapExists) {
                this.appendDummyInput("SAMPLE_MAP_JSON")
                    .setAlign(Blockly.ALIGN_RIGHT)
                    .appendField("%{BKY_SB_SAMPLER_MAP}")
                    .appendField(new Blockly.FieldTextInput('{"C4": "C4.mp3"}'), "SAMPLE_MAP_JSON_FIELD");
            }
        } else {
            // If user wants default, and inputs do exist, remove them.
            if (baseUrlExists) {
                this.removeInput('BASE_URL');
            }
            if (sampleMapExists) {
                this.removeInput('SAMPLE_MAP_JSON');
            }
        }
    }
};

// The mixin that connects the mutator logic to the block.
const samplerTypeMixin = {
    // This is called by Blockly when the block is first created.
    onchange: function(event) {
        // Listen for changes to our specific dropdown field.
        if (event.type === Blockly.Events.BLOCK_CHANGE &&
            event.element === 'field' &&
            event.name === 'SAMPLER_TYPE' &&
            event.blockId === this.id) {
            this.updateShape_(event.newValue);
        }
    }
};


export function registerBlocks() {
    if (typeof Blockly === 'undefined') {
        console.error('Blockly not available');
        return false;
    }

    // Register the mutator.
    Blockly.Extensions.registerMutator(
        'sampler_type_mutator',
        samplerTypeMutator,
        null, // No helper function needed
        ['sampler_type_mutator']
    );

    // Register the block with its mixin
    Blockly.Blocks['sb_create_sampler_instrument'] = {
        ...samplerBlock,
        ...samplerTypeMixin
    };

    // The old block definition is removed as it's replaced by the new one.
    delete Blockly.Blocks['sb_create_custom_sampler'];
}