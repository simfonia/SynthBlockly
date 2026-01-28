// js/blocks/transport_blocks.js
// Transport-related custom blocks
import * as Blockly from 'blockly';
import { getHelpUrl } from '../core/helpUtils.js';

export function registerBlocks() {
    if (typeof Blockly === 'undefined') {
        console.error('Blockly not available');
        return false;
    }

    Blockly.Blocks['sb_transport_set_bpm'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_TRANSPORT_SET_BPM_MESSAGE}",
                "args0": [
                    {
                        "type": "field_number",
                        "name": "BPM",
                        "value": 120,
                        "min": 20,
                        "max": 300
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_TRANSPORT_HUE}",
                "tooltip": "%{BKY_SB_TRANSPORT_SET_BPM_TOOLTIP}"
            });
        }
    };

    Blockly.Blocks['sb_transport_start_stop'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_TRANSPORT_START_STOP_MESSAGE}",
                "args0": [
                    {
                        "type": "field_dropdown",
                        "name": "ACTION",
                        "options": [
                            ['%{BKY_SB_TRANSPORT_ACTION_START}', 'START'],
                            ['%{BKY_SB_TRANSPORT_ACTION_STOP}', 'STOP']
                        ]
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_TRANSPORT_HUE}",
                "tooltip": "%{BKY_SB_TRANSPORT_START_STOP_TOOLTIP}"
            });
        }
    };

    Blockly.Blocks['sb_wait_musical'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_WAIT_MUSICAL_MESSAGE}",
                "args0": [
                    {
                        "type": "field_dropdown",
                        "name": "DURATION",
                        "options": [
                            ['%{BKY_SB_DUR_1M}', '1m'],
                            ['%{BKY_SB_DUR_2M}', '2m'],
                            ['%{BKY_SB_DUR_4M}', '4m'],
                            ['%{BKY_SB_DUR_8M}', '8m'],
                            ['%{BKY_SB_DUR_2N}', '2n'],
                            ['%{BKY_SB_DUR_4N}', '4n'],
                            ['%{BKY_SB_DUR_8N}', '8n'],
                            ['%{BKY_SB_DUR_16N}', '16n']
                        ]
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_TRANSPORT_HUE}",
                "tooltip": "%{BKY_SB_WAIT_MUSICAL_TOOLTIP}"
            });
        }
    };

    Blockly.Blocks['sb_tone_loop'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_TONE_LOOP_MESSAGE}",
                "args0": [
                    {
                        "type": "field_input",
                        "name": "INTERVAL",
                        "text": "1m"
                    },
                    {
                        "type": "input_statement",
                        "name": "DO"
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_TRANSPORT_HUE}",
                "tooltip": "%{BKY_SB_TONE_LOOP_TOOLTIP}",
                "hat": true // Often used for top-level event listeners / continuous processes
            });
        }
    };

    Blockly.Blocks['sb_schedule_at_offset'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_SCHEDULE_AT_OFFSET_MESSAGE}",
                "args0": [
                    {
                        "type": "field_input",
                        "name": "OFFSET",
                        "text": "0" // Default offset at the start of the loop interval
                    },
                    {
                        "type": "input_statement",
                        "name": "DO"
                    }
                ],
                "previousStatement": null, // It can be chained within a loop callback
                "nextStatement": null,     // It can be chained within a loop callback
                "colour": "%{BKY_SB_CAT_TRANSPORT_HUE}",
                "tooltip": "%{BKY_SB_SCHEDULE_AT_OFFSET_TOOLTIP}"
            });

            this.setHelpUrl(getHelpUrl('transport_readme'));
        }
    };

    Blockly.Blocks['sb_stop_all_blockly_loops'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_STOP_ALL_BLOCKLY_LOOPS_MESSAGE}",
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_TRANSPORT_HUE}",
                "tooltip": "%{BKY_SB_STOP_ALL_BLOCKLY_LOOPS_TOOLTIP}"
            });
        }
    };

    // 預備拍積木
    Blockly.Blocks['sb_transport_count_in'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_TRANSPORT_COUNT_IN_MESSAGE}",
                "args0": [
                    {
                        "type": "field_number",
                        "name": "MEASURES",
                        "value": 1,
                        "min": 1,
                        "max": 4,
                        "precision": 1
                    },
                    {
                        "type": "field_number",
                        "name": "BEATS",
                        "value": 4,
                        "min": 1,
                        "max": 16,
                        "precision": 1
                    },
                    {
                        "type": "field_number",
                        "name": "BEAT_VALUE",
                        "value": 4,
                        "min": 1,
                        "max": 16,
                        "precision": 1
                    },
                    {
                        "type": "input_value",
                        "name": "VOLUME",
                        "check": "Number"
                    }
                ],
                "inputsInline": true,
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_TRANSPORT_HUE}",
                "tooltip": "%{BKY_SB_TRANSPORT_COUNT_IN_TOOLTIP}"
            });
        }
    };

    // 步進音序器 來源選擇器 (Shadow Block)
    Blockly.Blocks['sb_rhythm_source_selector'] = {
        init: function () {
            this.appendDummyInput('MAIN_ROW')
                .appendField(new Blockly.FieldDropdown([
                    [Blockly.Msg['SB_RHYTHM_SOURCE_KICK'] || "合成音源：大鼓", "KICK"],
                    [Blockly.Msg['SB_RHYTHM_SOURCE_SNARE'] || "合成音源：小鼓", "SNARE"],
                    [Blockly.Msg['SB_RHYTHM_SOURCE_HH'] || "合成音源：腳踏鈸", "HH"],
                    [Blockly.Msg['SB_SAMPLER_TYPE_DEFAULT_LABEL'] || "鋼琴", "CURRENT"],
                    ["自訂樂器...", "CUSTOM"]
                ]), "TYPE");

            this.appendDummyInput('CUSTOM_ROW')
                .appendField("↳")
                .appendField(new Blockly.FieldDropdown(function() {
                    try {
                        let workspace = null;
                        if (this.sourceBlock_) {
                            workspace = this.sourceBlock_.workspace;
                        } else if (this.workspace) {
                            workspace = this.workspace;
                        }

                        const options = [];
                        
                        // IMPORTANT: Add the current value of the field to the options 
                        // to prevent "unavailable option" errors during XML loading.
                        const currentValue = this.getValue();
                        if (currentValue && currentValue !== 'MyInstrument') {
                            options.push([currentValue, currentValue]);
                        }

                        const targetBlockTypes = [
                            'sb_create_synth_instrument',
                            'sb_create_harmonic_synth',
                            'sb_create_additive_synth',
                            'sb_create_layered_instrument',
                            'sb_create_sampler_instrument'
                        ];

                        if (workspace) {
                            targetBlockTypes.forEach(type => {
                                const blocks = workspace.getBlocksByType(type, false);
                                blocks.forEach(block => {
                                    const name = block.getFieldValue('NAME');
                                    if (name && !options.some(opt => opt[1] === name)) {
                                        options.push([name, name]);
                                    }
                                });
                            });
                        }
                        
                        options.sort((a, b) => a[0].localeCompare(b[0]));
                        if (options.length === 0) return [["MyInstrument", "MyInstrument"]];
                        return options;
                    } catch (e) {
                        return [["MyInstrument", "MyInstrument"]];
                    }
                }), "CUSTOM_TYPE");

            this.setOutput(true, "String");
            this.setColour(Blockly.Msg['TRANSPORT_HUE'] || "#16A085");
            this.setTooltip(function() {
                return Blockly.Msg['SB_RHYTHM_SOURCE_SELECTOR_TOOLTIP'];
            });
            
            this.updateShape_();
        },

        mutationToDom: function () {
            var container = Blockly.utils.xml.createElement('mutation');
            container.setAttribute('is_custom', this.getFieldValue('TYPE') === 'CUSTOM');
            return container;
        },

        domToMutation: function (xmlElement) {
            const isCustom = xmlElement.getAttribute('is_custom') === 'true';
            this.is_custom_state_ = isCustom; 
            this.updateShape_();
        },

        onchange: function (event) {
            if (!this.workspace || this.workspace.isDragging()) return;
            if (event.type === Blockly.Events.BLOCK_CHANGE && event.blockId === this.id && event.name === 'TYPE') {
                this.is_custom_state_ = (this.getFieldValue('TYPE') === 'CUSTOM');
                this.updateShape_();
            }
        },

        updateShape_: function () {
            const isCustom = (this.is_custom_state_ !== undefined) ? this.is_custom_state_ : (this.getFieldValue('TYPE') === 'CUSTOM');
            const customRow = this.getInput('CUSTOM_ROW');
            if (customRow) {
                customRow.setVisible(isCustom);
            }
            if (this.rendered) {
                this.render();
            }
        }
    };

    // 步進音序器積木 (含 Mutation 與舊版相容支援)
    Blockly.Blocks['sb_rhythm_sequence'] = {
        init: function () {
            this.appendValueInput('SOURCE')
                .setCheck('String')
                .appendField(Blockly.Msg['SB_RHYTHM_SEQUENCE_MESSAGE'].split('%1')[0]);

            this.appendDummyInput()
                .appendField(new Blockly.FieldCheckbox("FALSE"), "IS_CHORD")
                .appendField("%{BKY_SB_PARAM_RHYTHM_IS_CHORD}");

            this.appendValueInput('MEASURE')
                .setCheck('Number')
                .appendField(Blockly.Msg['SB_RHYTHM_SEQUENCE_MESSAGE'].split('%2')[0].split('%1')[1] || "第");

            this.appendDummyInput('MAIN_ROW')
                .appendField(Blockly.Msg['SB_RHYTHM_SEQUENCE_MESSAGE'].split('%3')[0].split('%2')[1] || "小節 序列")
                .appendField(new Blockly.FieldTextInput("x . . . | x . . . | x . . . | x . . ."), "SEQUENCE");

            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(Blockly.Msg['TRANSPORT_HUE'] || "#16A085");
            this.setTooltip(Blockly.Msg['SB_RHYTHM_SEQUENCE_TOOLTIP']);
            this.setInputsInline(true);
            
            this.setHelpUrl(getHelpUrl('step_sequencer_readme'));
        }
    };
}