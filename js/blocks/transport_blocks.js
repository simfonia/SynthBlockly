// js/blocks/transport_blocks.js
// Transport-related custom blocks
import * as Blockly from 'blockly';

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
                "colour": "%{BKY_TRANSPORT_HUE}",
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
                "colour": "%{BKY_TRANSPORT_HUE}",
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
                "colour": "%{BKY_TRANSPORT_HUE}",
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
                        "type": "field_dropdown",
                        "name": "INTERVAL",
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
                    },
                    {
                        "type": "input_statement",
                        "name": "DO"
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_TRANSPORT_HUE}",
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
                "colour": "%{BKY_TRANSPORT_HUE}",
                "tooltip": "%{BKY_SB_SCHEDULE_AT_OFFSET_TOOLTIP}"
            });

            this.setHelpUrl(() => {
                const currentLang = window.currentLanguage || 'en';
                return `docs/transport_readme_${currentLang}.html`;
            });
        }
    };

    Blockly.Blocks['sb_stop_all_blockly_loops'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_STOP_ALL_BLOCKLY_LOOPS_MESSAGE}",
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_TRANSPORT_HUE}",
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
                "colour": "%{BKY_TRANSPORT_HUE}",
                "tooltip": "%{BKY_SB_TRANSPORT_COUNT_IN_TOOLTIP}"
            });
        }
    };

    // 步進音序器積木 (含 Mutation 與舊版相容支援)
    Blockly.Blocks['sb_rhythm_sequence'] = {
        init: function () {
            this.appendDummyInput('MAIN_ROW')
                .appendField(Blockly.Msg['SB_RHYTHM_SEQUENCE_MESSAGE'].split('%1')[0])
                .appendField(new Blockly.FieldDropdown([
                    [Blockly.Msg['JAZZKIT_DRUM_KICK'] || "大鼓", "KICK"],
                    [Blockly.Msg['JAZZKIT_DRUM_SNARE'] || "小鼓", "SNARE"],
                    [Blockly.Msg['JAZZKIT_DRUM_CLOSED_HIHAT'] || "腳踏鈸", "HH"],
                    [Blockly.Msg['JAZZKIT_DRUM_HANDCLAP'] || "擊掌", "CLAP"],
                    [Blockly.Msg['SB_SAMPLER_TYPE_DEFAULT'] || "目前音色", "CURRENT"],
                    ["自訂樂器/音符...", "CUSTOM"]
                ]), "TYPE")
                .appendField(Blockly.Msg['SB_RHYTHM_SEQUENCE_MESSAGE'].split('%2')[0].split('%1')[1] || "第")
                .appendField(new Blockly.FieldNumber(1, 1, 16, 1), "MEASURE")
                .appendField(Blockly.Msg['SB_RHYTHM_SEQUENCE_MESSAGE'].split('%3')[0].split('%2')[1] || "小節 序列")
                .appendField(new Blockly.FieldTextInput("x . . . | x . . . | x . . . | x . . ."), "SEQUENCE");

            this.appendDummyInput('CUSTOM_ROW')
                .appendField("↳")
                .appendField(new Blockly.FieldTextInput("Piano"), "CUSTOM_TYPE");

            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(Blockly.Msg['TRANSPORT_HUE'] || "#16A085");
            this.setTooltip(Blockly.Msg['SB_RHYTHM_SEQUENCE_TOOLTIP']);
            
            this.setHelpUrl(() => {
                const currentLang = window.currentLanguage || 'en';
                return `docs/step_sequencer_readme_${currentLang}.html`;
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
            // We store the state temporarily because field values aren't set yet
            this.is_custom_state_ = isCustom; 
            this.updateShape_();
        },

        onchange: function (event) {
            if (!this.workspace || this.workspace.isDragging()) return;
            
            if (event.type === Blockly.Events.BLOCK_CHANGE && event.blockId === this.id && event.name === 'TYPE') {
                this.is_custom_state_ = (this.getFieldValue('TYPE') === 'CUSTOM');
                this.updateShape_();
            }
            
            // 處理舊版載入相容 (如果是直接從舊版 XML 載入，沒有 mutation 屬性時)
            if (event.type === Blockly.Events.BLOCK_CREATE && event.blockId === this.id && this.is_custom_state_ === undefined) {
                const typeField = this.getField('TYPE');
                const currentValue = typeField.getValue();
                const options = typeField.getOptions().map(opt => opt[1]);
                
                if (!options.includes(currentValue)) {
                    const oldVal = currentValue;
                    typeField.setValue('CUSTOM');
                    this.setFieldValue(oldVal, 'CUSTOM_TYPE');
                    this.is_custom_state_ = true;
                    this.updateShape_();
                }
            }
        },

        updateShape_: function () {
            // Priority: 1. Temporary state from domToMutation, 2. Current field value
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
}