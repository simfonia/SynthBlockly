// js/blocks/instruments_blocks.js
// Instrument-related custom blocks
import * as Blockly from 'blockly';
import { getHelpUrl } from '../core/helpUtils.js';
import { FieldDropdownLenient, getInstrumentOptions } from '../core/blocklyUtils.js';

export function registerBlocks() {
    if (typeof Blockly === 'undefined') {
        console.error('Blockly not available');
        return false;
    }

    // 播放音符
    Blockly.Blocks['sb_play_note'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_PLAY_NOTE_MESSAGE}",
                "args0": [
                    { "type": "input_value", "name": "NOTE", "check": ["Number", "String"] },
                    { "type": "field_input", "name": "DUR", "text": "8n" },
                    { "type": "input_value", "name": "VELOCITY", "check": "Number" }
                ],
                "inputsInline": true,
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_PERFORMANCE_HUE}",
                "tooltip": "%{BKY_SB_PLAY_NOTE_TOOLTIP}"
            });
            this.setHelpUrl(getHelpUrl('performance_readme'));
        }
    };

    Blockly.Blocks['sb_play_note_and_wait'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_PLAY_NOTE_AND_WAIT_MESSAGE}",
                "args0": [
                    { "type": "input_value", "name": "NOTE", "check": ["Number", "String"] },
                    { "type": "field_input", "name": "DUR", "text": "4n" },
                    { "type": "input_value", "name": "VELOCITY", "check": "Number" }
                ],
                "inputsInline": true,
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_PERFORMANCE_HUE}",
                "tooltip": "%{BKY_SB_PLAY_NOTE_AND_WAIT_TOOLTIP}"
            });
            this.setHelpUrl(getHelpUrl('performance_readme'));
        }
    };

    Blockly.Blocks['sb_play_drum'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_PLAY_DRUM_MESSAGE_WITH_VELOCITY}",
                "args0": [
                    {
                        "type": "field_dropdown", "name": "TYPE",
                        "options": [ ["大鼓 (Kick)", "KICK"], ["小鼓 (Snare)", "SNARE"], ["腳踏鈸 (HH)", "HH"] ]
                    },
                    { "type": "input_value", "name": "VELOCITY", "check": "Number" }
                ],
                "inputsInline": true,
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_PERFORMANCE_HUE}",
                "tooltip": "%{BKY_SB_PLAY_DRUM_TOOLTIP}"
            });
        }
    };

    Blockly.Blocks['jazzkit_play_drum'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_SAMPLER_JK_PLAY_DRUM_MESSAGE}",
                "args0": [
                    {
                        "type": "field_dropdown", "name": "DRUM_TYPE",
                        "options": [
                            ['%{BKY_SB_PARAM_JK_DRUM_KICK}', 'C1'], ['%{BKY_SB_PARAM_JK_DRUM_SNARE}', 'D1'],
                            ['%{BKY_SB_PARAM_JK_DRUM_RIMSHOT}', 'C#1'], ['%{BKY_SB_PARAM_JK_DRUM_CLOSED_HIHAT}', 'F1'],
                            ['%{BKY_SB_PARAM_JK_DRUM_OPEN_HIHAT}', 'A1'], ['%{BKY_SB_PARAM_JK_DRUM_HIGH_TOM}', 'G1'],
                            ['%{BKY_SB_PARAM_JK_DRUM_MID_TOM}', 'F#1'], ['%{BKY_SB_PARAM_JK_DRUM_LOW_TOM}', 'E1'],
                            ['%{BKY_SB_PARAM_JK_DRUM_CRASH_CYMBAL}', 'G#1'], ['%{BKY_SB_PARAM_JK_DRUM_RIDE_CYMBAL}', 'A#1'],
                            ['%{BKY_SB_PARAM_JK_DRUM_HANDCLAP}', 'D#1']
                        ]
                    }, 
                    { "type": "input_value", "name": "VELOCITY", "check": "Number" }
                ],
                "inputsInline": true,
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_PERFORMANCE_HUE}",
                "tooltip": "%{BKY_SB_SAMPLER_JK_PLAY_DRUM_TOOLTIP}"
            });
        }
    };

    Blockly.Blocks['sb_create_synth_instrument'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_CREATE_SYNTH_INSTRUMENT_MESSAGE}",
                "args0": [
                    {
                        "type": "field_dropdown", "name": "TYPE",
                        "options": [
                            ["弦波 (Sine)", "SineWave"], ["三角波 (Triangle)", "TriangleWave"],
                            ["方波 (Square)", "SquareWave"], ["鋸齒波 (Sawtooth)", "SawtoothWave"],
                            ["PolySynth", "PolySynth"], ["AMSynth", "AMSynth"],
                            ["FMSynth", "FMSynth"], ["DuoSynth", "DuoSynth"]
                        ]
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_INSTRUMENTS_HUE}",
                "tooltip": "%{BKY_SB_CREATE_SYNTH_INSTRUMENT_TOOLTIP}"
            });
            this.setHelpUrl(getHelpUrl('instrument_readme'));
            this.is_sound_source_block = true;
        }
    };

    // --- V2.1 Containers ---
    Blockly.Blocks['sb_instrument_container'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_INSTRUMENT_CONTAINER_MESSAGE}",
                "args0": [
                    { "type": "field_input", "name": "NAME", "text": "MyInstrument" },
                    { "type": "input_statement", "name": "STACK" }
                ],
                "inputsInline": true,
                "colour": "%{BKY_SB_CAT_SYNTHBLOCKLY_HUE}",
                "tooltip": "%{BKY_SB_INSTRUMENT_CONTAINER_TOOLTIP}"
            });
            this.hat = 'cap';
        }
    };

    Blockly.Blocks['sb_master_container'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_MASTER_CONTAINER_MESSAGE}",
                "args0": [
                    { "type": "input_statement", "name": "STACK" }
                ],
                "inputsInline": true,
                "colour": "%{BKY_SB_CAT_TOOLS_HUE}",
                "tooltip": "%{BKY_SB_MASTER_CONTAINER_TOOLTIP}"
            });
            this.hat = 'cap';
        }
    };

    Blockly.Blocks['sb_container_adsr'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_CONTAINER_ADSR_LABEL}",
                "args0": [
                    { "type": "field_number", "name": "A", "value": 0.01, "min": 0, "max": 60, "precision": 0.01 },
                    { "type": "field_number", "name": "D", "value": 0.1, "min": 0, "max": 60, "precision": 0.01 },
                    { "type": "field_number", "name": "S", "value": 0.5, "min": 0, "max": 1, "precision": 0.01 },
                    { "type": "field_number", "name": "R", "value": 1.0, "min": 0, "max": 60, "precision": 0.01 }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_INSTRUMENTS_HUE}",
                "tooltip": "%{BKY_SB_SET_ADSR_TOOLTIP}"
            });
        }
    };

    Blockly.Blocks['sb_container_volume'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_CONTAINER_VOLUME_LABEL}",
                "args0": [
                    { "type": "input_value", "name": "VOLUME_VALUE", "check": "Number" }
                ],
                "inputsInline": true,
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_INSTRUMENTS_HUE}",
                "tooltip": "%{BKY_SB_SET_INSTRUMENT_VOLUME_TOOLTIP}"
            });
        }
    };

    Blockly.Blocks['sb_container_vibrato'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_CONTAINER_VIBRATO_LABEL}",
                "args0": [
                    { "type": "input_value", "name": "DETUNE_VALUE", "check": "Number" }
                ],
                "inputsInline": true,
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_INSTRUMENTS_HUE}",
                "tooltip": "%{BKY_SB_SET_INSTRUMENT_VIBRATO_TOOLTIP}"
            });
        }
    };

    Blockly.Blocks['sb_container_mute'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_CONTAINER_MUTE_LABEL}",
                "args0": [
                    { "type": "field_checkbox", "name": "MUTE", "checked": true }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_INSTRUMENTS_HUE}",
                "tooltip": "%{BKY_SB_SET_INSTRUMENT_MUTE_TOOLTIP}"
            });
        }
    };

    Blockly.Blocks['sb_container_solo'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_CONTAINER_SOLO_LABEL}",
                "args0": [
                    { "type": "field_checkbox", "name": "SOLO", "checked": true }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_INSTRUMENTS_HUE}",
                "tooltip": "%{BKY_SB_SET_INSTRUMENT_SOLO_TOOLTIP}"
            });
        }
    };

        Blockly.Blocks['sb_define_chord'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_DEFINE_CHORD_MESSAGE}",
                "args0": [
                    {
                        "type": "field_input",
                        "name": "NAME",
                        "text": "CM7"
                    },
                    {
                        "type": "field_input",
                        "name": "NOTES_STRING",
                        "text": "C4,E4,G4,B4"
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_PERFORMANCE_HUE}",
                "tooltip": "%{BKY_SB_DEFINE_CHORD_TOOLTIP}"
            });
            this.setHelpUrl(getHelpUrl('step_sequencer_readme'));
        }
    };

    Blockly.Blocks['sb_get_chord_name'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_GET_CHORD_NAME_MESSAGE}",
                "args0": [
                    {
                        "type": "field_dropdown", "name": "NAME",
                        "options": function() {
                            let ws = Blockly.getMainWorkspace();
                            const options = [];
                            if (ws) {
                                ws.getBlocksByType('sb_define_chord', false).forEach(block => {
                                    const name = block.getFieldValue('NAME');
                                    if (name) options.push([name, name]);
                                });
                            }
                            options.sort((a, b) => a[0].localeCompare(b[0]));
                            return options.length === 0 ? [["C", "C"]] : options;
                        }
                    }
                ],
                "output": "String",
                "colour": "%{BKY_SB_CAT_PERFORMANCE_HUE}",
                "tooltip": "%{BKY_SB_GET_CHORD_NAME_TOOLTIP}"
            });
        }
    };

    Blockly.Blocks['sb_play_chord_by_name'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_PLAY_CHORD_BY_NAME_MESSAGE}",
                "args0": [
                    {
                        "type": "field_dropdown", "name": "CHORD_NAME",
                        "options": function() {
                            let ws = Blockly.getMainWorkspace();
                            const options = [];
                            if (ws) {
                                ws.getBlocksByType('sb_define_chord', false).forEach(block => {
                                    const name = block.getFieldValue('NAME');
                                    if (name) options.push([name, name]);
                                });
                            }
                            options.sort((a, b) => a[0].localeCompare(b[0]));
                            return options.length > 0 ? options : [["C", "C"]];
                        }
                    },
                    { "type": "field_input", "name": "DUR", "text": "8n" },
                    { "type": "input_value", "name": "VELOCITY", "check": "Number" }
                ],
                "inputsInline": true,
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_PERFORMANCE_HUE}",
                "tooltip": "%{BKY_SB_PLAY_CHORD_BY_NAME_TOOLTIP}"
            });
        }
    };

    Blockly.Blocks['sb_play_chord_notes'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_PLAY_CHORD_NOTES_MESSAGE}",
                "args0": [
                    { "type": "field_input", "name": "NOTES_STRING", "text": "C4,E4,G4" },
                    { "type": "field_input", "name": "DUR", "text": "8n" },
                    { "type": "input_value", "name": "VELOCITY", "check": "Number" }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_PERFORMANCE_HUE}",
                "tooltip": "%{BKY_SB_PLAY_CHORD_NOTES_TOOLTIP}"
            });
        }
    };

    Blockly.Blocks['sb_create_layered_instrument'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_CREATE_LAYERED_INSTRUMENT_MESSAGE}",
                "args0": [
                    { "type": "field_input", "name": "NAME", "text": "MyLayeredSynth" },
                    { "type": "field_input", "name": "LAYER_LIST", "text": "BassLayer,LeadLayer" }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_INSTRUMENTS_HUE}",
                "tooltip": "%{BKY_SB_CREATE_LAYERED_INSTRUMENT_TOOLTIP}"
            });
        }
    };

    // 選定目前發聲音源 (正確實作)
    Blockly.Blocks['sb_select_current_instrument'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_SELECT_CURRENT_INSTRUMENT_MESSAGE}",
                "args0": [
                    {
                        "type": "field_dropdown_lenient",
                        "name": "NAME",
                        "options": function() { return getInstrumentOptions(false); }
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SB_CAT_PERFORMANCE_HUE}",
                "tooltip": "%{BKY_SB_SELECT_CURRENT_INSTRUMENT_TOOLTIP}"
            });
        }
    };

    // 步進音序器來源選擇器 (支援舊版 XML 相容性)
    Blockly.Blocks['sb_rhythm_source_selector'] = {
        init: function () {
            const typeDropdown = new Blockly.FieldDropdown([
                ["%{BKY_SB_PARAM_RHYTHM_SOURCE_KICK}", "KICK"],
                ["%{BKY_SB_PARAM_RHYTHM_SOURCE_SNARE}", "SNARE"],
                ["%{BKY_SB_PARAM_RHYTHM_SOURCE_HH}", "HH"],
                ["---", "SEP"],
                ["Custom Instrument...", "CUSTOM"]
            ], (val) => {
                this.updateShape_(val === 'CUSTOM');
                return val;
            });

            const customDropdown = new FieldDropdownLenient(function() {
                return getInstrumentOptions(false);
            });

            this.appendDummyInput("MAIN")
                .appendField(typeDropdown, "TYPE")
                .appendField(customDropdown, "CUSTOM_TYPE");

            this.setOutput(true, "String");
            this.setColour("%{BKY_SB_CAT_TRANSPORT_HUE}");
            this.updateShape_(false); // Default hide
        },
        updateShape_: function(isCustom) {
            const field = this.getField('CUSTOM_TYPE');
            if (field) {
                field.setVisible(isCustom);
                if (this.rendered) this.render();
            }
        },
        // To handle loading from XML where TYPE is already CUSTOM
        onchange: function(event) {
            if (event.type === Blockly.Events.BLOCK_CREATE && event.blockId === this.id) {
                this.updateShape_(this.getFieldValue('TYPE') === 'CUSTOM');
            }
        }
    };

    // 一般樂器選擇器 (用於選單嵌入)
    Blockly.Blocks['sb_instrument_selector'] = {
        init: function () {
            const dropdown = new FieldDropdownLenient(function() {
                return getInstrumentOptions(true);
            });
            this.appendDummyInput().appendField(dropdown, "NAME");
            this.setOutput(true, "String");
            this.setColour(Blockly.Msg['SB_CAT_TOOLS_HUE']);
        }
    };
}