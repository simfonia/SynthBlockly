// js/blocks/melody_blocks.js
import * as Blockly from 'blockly';
import { getHelpUrl } from '../core/helpUtils.js';

class FieldDropdownLenient extends Blockly.FieldDropdown {
    constructor(menuGenerator, validator) {
        super(menuGenerator, validator);
    }
    
    doClassValidation_(newValue) {
        if (typeof newValue !== 'string') return null;
        return newValue;
    }

    getOptions(opt_useCache) {
        const options = super.getOptions(opt_useCache);
        const val = this.getValue();
        if (val && typeof val === 'string') {
            const exists = options.some(opt => opt[1] === val);
            if (!exists) {
                options.push([val, val]);
            }
        }
        return options;
    }
}

export function registerBlocks() {
    if (typeof Blockly === 'undefined') {
        console.error('Blockly not available');
        return false;
    }

    Blockly.Blocks['sb_select_current_instrument'] = {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg['SB_SELECT_CURRENT_INSTRUMENT_MESSAGE'].split('%1')[0])
                .appendField(new FieldDropdownLenient(function() {
                    let workspace = null;
                    if (this.sourceBlock_) workspace = this.sourceBlock_.workspace;
                    else if (this.workspace) workspace = this.workspace;

                    const options = [["DefaultSynth", "DefaultSynth"]];
                    if (workspace) {
                        const targetBlockTypes = ['sb_create_synth_instrument', 'sb_create_harmonic_synth', 'sb_create_additive_synth', 'sb_create_layered_instrument', 'sb_create_sampler_instrument'];
                        targetBlockTypes.forEach(type => {
                            workspace.getBlocksByType(type, false).forEach(block => {
                                const name = block.getFieldValue('NAME');
                                if (name && !options.some(opt => opt[1] === name)) options.push([name, name]);
                            });
                        });
                    }
                    const defaultOpt = options.shift();
                    options.sort((a, b) => a[0].localeCompare(b[0]));
                    options.unshift(defaultOpt);
                    
                    const currentValue = this.getValue();
                    if (currentValue && !options.some(opt => opt[1] === currentValue)) {
                        options.push([currentValue, currentValue]);
                    }
                    return options;
                }), "NAME");
            
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(Blockly.Msg['PERFORMANCE_HUE']);
            this.setTooltip(Blockly.Msg['SB_SELECT_CURRENT_INSTRUMENT_TOOLTIP']);
        }
    };

    Blockly.Blocks['sb_play_melody'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_PLAY_MELODY_MESSAGE}",
                "args0": [
                    {
                        "type": "field_multilineinput",
                        "name": "MELODY_STRING",
                        "text": "C4Q, D4Q, E4Q, F4Q, G4H"
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_PERFORMANCE_HUE}",
                "tooltip": "%{BKY_SB_PLAY_MELODY_TOOLTIP}"
            });

            this.setHelpUrl(getHelpUrl('melody_readme'));
        }
    };
}