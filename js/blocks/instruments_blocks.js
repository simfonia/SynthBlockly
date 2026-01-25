// js/blocks/instruments_blocks.js
// Instrument-related custom blocks
import * as Blockly from 'blockly';
import { getHelpUrl } from '../core/helpUtils.js';

/**
 * A custom Dropdown field that accepts values even if they are not in the options list.
 * This is crucial for loading XML files where instrument definitions might appear
 * after their usage (forward references).
 */
class FieldDropdownLenient extends Blockly.FieldDropdown {
    constructor(menuGenerator, validator) {
        super(menuGenerator, validator);
    }
    
    doClassValidation_(newValue) {
        // Standard FieldDropdown checks if newValue is in getOptions().
        // We override this to allow ANY string, while still providing the menu.
        if (typeof newValue !== 'string') {
            return null;
        }
        return newValue;
    }

    getOptions(opt_useCache) {
        // Get standard options
        const options = super.getOptions(opt_useCache);
        
        // Ensure the current value is always present in the list
        // This fixes the issue where the block loads with a value (e.g. "MyLead")
        // that isn't in the generated list yet (because definitions are later in XML),
        // causing Blockly to display the default value (e.g. "DefaultSynth") instead.
        const val = this.getValue();
        if (val && typeof val === 'string') {
            // Check if it's already there (checking value, which is index 1)
            const exists = options.some(opt => opt[1] === val);
            if (!exists) {
                // Add it to the top or bottom? 
                // Adding to the top (after Master/Default) usually makes sense for "current selection"
                // but purely for display mapping, position doesn't strictly matter.
                // We'll push it to ensure it's available.
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
    // 播放音符
    Blockly.Blocks['sb_play_note'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_PLAY_NOTE_MESSAGE}",
                "args0": [
                    {
                        "type": "input_value",
                        "name": "NOTE",
                        "check": ["Number", "String"] // Allow either a number (MIDI note) or a string (e.g., "C4")
                    },
                    {
                        "type": "field_input",
                        "name": "DUR",
                        "text": "8n"
                    },
                    { // Velocity input
                        "type": "input_value",
                        "name": "VELOCITY",
                        "check": "Number"
                    }
                ],
                "inputsInline": true,
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_PERFORMANCE_HUE}",
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
                    {
                        "type": "input_value",
                        "name": "NOTE",
                        "check": ["Number", "String"] // Allow either a number (MIDI note) or a string (e.g., "C4")
                    },
                    {
                        "type": "field_input",
                        "name": "DUR",
                        "text": "4n"
                    },
                    { // Velocity input
                        "type": "input_value",
                        "name": "VELOCITY",
                        "check": "Number"
                    }
                ],
                "inputsInline": true,
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_PERFORMANCE_HUE}",
                "tooltip": "%{BKY_SB_PLAY_NOTE_AND_WAIT_TOOLTIP}"
            });

            this.setHelpUrl(getHelpUrl('performance_readme'));
        }
    };

    // 播放鼓聲
    Blockly.Blocks['sb_play_drum'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_PLAY_DRUM_MESSAGE_WITH_VELOCITY}",
                "args0": [
                    {
                        "type": "field_dropdown",
                        "name": "TYPE",
                        "options": [['Kick', 'KICK'], ['Snare', 'SNARE'], ['HiHat', 'HH']]
                    },
                    { // Velocity input
                        "type": "input_value",
                        "name": "VELOCITY",
                        "check": "Number"
                    }
                ],
                "inputsInline": true, // ADDED FOR CONSISTENCY
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_PERFORMANCE_HUE}",
                "tooltip": "%{BKY_SB_PLAY_DRUM_TOOLTIP}"
            });
        }
    };

    // 設定 ADSR
    Blockly.Blocks['sb_set_adsr'] = {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg['SB_SET_ADSR_MESSAGE'].split('%1')[0])
                .appendField(new FieldDropdownLenient(function() {
                    let workspace = null;
                    if (this.sourceBlock_) {
                        workspace = this.sourceBlock_.workspace;
                    } else if (this.workspace) {
                        workspace = this.workspace;
                    }

                    const allLabel = Blockly.Msg['SB_TARGET_ALL_INSTRUMENTS'] || "All Instruments";
                    const options = [[allLabel, 'ALL']];
                    options.push(['DefaultSynth', 'DefaultSynth']);

                    if (workspace) {
                        const targetBlockTypes = [
                            'sb_create_synth_instrument',
                            'sb_create_harmonic_synth',
                            'sb_create_additive_synth',
                            'sb_create_layered_instrument',
                            'sb_create_sampler_instrument'
                        ];
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

                    // Add current value if missing (for UI consistency after load)
                    const currentValue = this.getValue();
                    if (currentValue && !options.some(opt => opt[1] === currentValue)) {
                        options.push([currentValue, currentValue]);
                    }
                    return options;
                }), "TARGET")
                .appendField(Blockly.Msg['SB_SET_ADSR_MESSAGE'].split('%2')[0].split('%1')[1] || "A")
                .appendField(new Blockly.FieldNumber(0.01, 0, 60, 0.01), "A")
                .appendField(Blockly.Msg['SB_SET_ADSR_MESSAGE'].split('%3')[0].split('%2')[1] || "D")
                .appendField(new Blockly.FieldNumber(0.1, 0, 60, 0.01), "D")
                .appendField(Blockly.Msg['SB_SET_ADSR_MESSAGE'].split('%4')[0].split('%3')[1] || "S")
                .appendField(new Blockly.FieldNumber(0.5, 0, 1, 0.01), "S")
                .appendField(Blockly.Msg['SB_SET_ADSR_MESSAGE'].split('%5')[0].split('%4')[1] || "R")
                .appendField(new Blockly.FieldNumber(1.0, 0, 60, 0.01), "R");

            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(Blockly.Msg['SOUND_SOURCES_HUE']);
            this.setTooltip(Blockly.Msg['SB_SET_ADSR_TOOLTIP']);
        }
    };

    Blockly.Blocks['jazzkit_play_drum'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_JAZZKIT_PLAY_DRUM_MESSAGE_WITH_VELOCITY}",
                "args0": [
                    {
                        "type": "field_dropdown",
                        "name": "DRUM_TYPE",
                        "options": [
                            ['%{BKY_JAZZKIT_DRUM_KICK}', 'C1'],
                            ['%{BKY_JAZZKIT_DRUM_SNARE}', 'D1'],
                            ['%{BKY_JAZZKIT_DRUM_RIMSHOT}', 'C#1'],
                            ['%{BKY_JAZZKIT_DRUM_CLOSED_HIHAT}', 'F1'],
                            ['%{BKY_JAZZKIT_DRUM_OPEN_HIHAT}', 'A1'],
                            ['%{BKY_JAZZKIT_DRUM_HIGH_TOM}', 'G1'],
                            ['%{BKY_JAZZKIT_DRUM_MID_TOM}', 'F#1'],
                            ['%{BKY_JAZZKIT_DRUM_LOW_TOM}', 'E1'],
                            ['%{BKY_JAZZKIT_DRUM_CRASH_CYMBAL}', 'G#1'],
                            ['%{BKY_JAZZKIT_DRUM_RIDE_CYMBAL}', 'A#1'],
                            ['%{BKY_JAZZKIT_DRUM_HANDCLAP}', 'D#1']
                        ]
                    }, 
                    { 
                        "type": "input_value",
                        "name": "VELOCITY",
                        "check": "Number",
                        "shadow": {
                            "type": "math_number",
                            "fields": {
                                "NUM": 1
                            }
                        }
                    }
                ],
                "inputsInline": true,
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_PERFORMANCE_HUE}",
                "tooltip": "%{BKY_JAZZKIT_PLAY_DRUM_TOOLTIP}"
            });
        }
    };

    Blockly.Blocks['sb_create_synth_instrument'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_CREATE_SYNTH_INSTRUMENT_MESSAGE}",
                "args0": [
                    {
                        "type": "field_input",
                        "name": "NAME",
                        "text": "DefaultSynth"
                    },
                    {
                        "type": "field_dropdown",
                        "name": "TYPE",
                        "options": [
                            ["弦波 (Sine)", "SineWave"],
                            ["三角波 (Triangle)", "TriangleWave"],
                            ["方波 (Square)", "SquareWave"],
                            ["鋸齒波 (Sawtooth)", "SawtoothWave"],
                            ["PolySynth", "PolySynth"],
                            ["AMSynth", "AMSynth"],
                            ["FMSynth", "FMSynth"],
                            ["DuoSynth", "DuoSynth"]
                        ]
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SOUND_SOURCES_HUE}",
                "tooltip": "%{BKY_SB_CREATE_SYNTH_INSTRUMENT_TOOLTIP}"
            });

            this.setHelpUrl(getHelpUrl('instrument_readme'));
        }
    };

    Blockly.Blocks['sb_set_instrument_vibrato'] = {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg['SB_SET_INSTRUMENT_VIBRATO_MESSAGE'].split('%1')[0])
                .appendField(new FieldDropdownLenient(function() {
                    let workspace = null;
                    if (this.sourceBlock_) workspace = this.sourceBlock_.workspace;
                    else if (this.workspace) workspace = this.workspace;

                    const allLabel = Blockly.Msg['SB_TARGET_ALL_INSTRUMENTS'] || "All Instruments";
                    const options = [[allLabel, 'ALL']];
                    options.push(['DefaultSynth', 'DefaultSynth']);
                    options.push([Blockly.Msg['JAZZKIT_DRUM_KICK'] || '大鼓 (Kick)', 'KICK']);
                    options.push([Blockly.Msg['JAZZKIT_DRUM_SNARE'] || '小鼓 (Snare)', 'SNARE']);
                    options.push([Blockly.Msg['JAZZKIT_DRUM_CLOSED_HIHAT'] || '腳踏鈸 (HH)', 'HH']);
                    options.push(['爵士鼓組 (JazzKit)', 'JAZZKIT']);

                    if (workspace) {
                        const targetBlockTypes = ['sb_create_synth_instrument', 'sb_create_harmonic_synth', 'sb_create_additive_synth', 'sb_create_layered_instrument', 'sb_create_sampler_instrument'];
                        targetBlockTypes.forEach(type => {
                            workspace.getBlocksByType(type, false).forEach(block => {
                                const name = block.getFieldValue('NAME');
                                if (name && !options.some(opt => opt[1] === name)) options.push([name, name]);
                            });
                        });
                    }

                    const currentValue = this.getValue();
                    if (currentValue && !options.some(opt => opt[1] === currentValue)) {
                        options.push([currentValue, currentValue]);
                    }
                    return options;
                }), "TARGET")
                .appendField(Blockly.Msg['SB_SET_INSTRUMENT_VIBRATO_MESSAGE'].split('%2')[0].split('%1')[1] || "Vibrato");
                
            this.appendValueInput("DETUNE_VALUE").setCheck("Number");
            
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(Blockly.Msg['SOUND_SOURCES_HUE']);
            this.setTooltip(Blockly.Msg['SB_SET_INSTRUMENT_VIBRATO_TOOLTIP']);
        }
    };

    Blockly.Blocks['sb_set_instrument_volume'] = {
        init: function () {
             this.appendDummyInput()
                .appendField(Blockly.Msg['SB_SET_INSTRUMENT_VOLUME_MESSAGE'].split('%1')[0])
                .appendField(new FieldDropdownLenient(function() {
                    let workspace = null;
                    if (this.sourceBlock_) workspace = this.sourceBlock_.workspace;
                    else if (this.workspace) workspace = this.workspace;

                    const allLabel = Blockly.Msg['SB_TARGET_ALL_INSTRUMENTS'] || "All Instruments";
                    const options = [[allLabel, 'ALL']];
                    options.push(['DefaultSynth', 'DefaultSynth']);
                    options.push([Blockly.Msg['JAZZKIT_DRUM_KICK'] || '大鼓 (Kick)', 'KICK']);
                    options.push([Blockly.Msg['JAZZKIT_DRUM_SNARE'] || '小鼓 (Snare)', 'SNARE']);
                    options.push([Blockly.Msg['JAZZKIT_DRUM_CLOSED_HIHAT'] || '腳踏鈸 (HH)', 'HH']);
                    options.push(['爵士鼓組 (JazzKit)', 'JAZZKIT']);

                    if (workspace) {
                        const targetBlockTypes = ['sb_create_synth_instrument', 'sb_create_harmonic_synth', 'sb_create_additive_synth', 'sb_create_layered_instrument', 'sb_create_sampler_instrument'];
                        targetBlockTypes.forEach(type => {
                            workspace.getBlocksByType(type, false).forEach(block => {
                                const name = block.getFieldValue('NAME');
                                if (name && !options.some(opt => opt[1] === name)) options.push([name, name]);
                            });
                        });
                    }
                    const currentValue = this.getValue();
                    if (currentValue && !options.some(opt => opt[1] === currentValue)) {
                        options.push([currentValue, currentValue]);
                    }
                    return options;
                }), "TARGET")
                .appendField(Blockly.Msg['SB_SET_INSTRUMENT_VOLUME_MESSAGE'].split('%2')[0].split('%1')[1] || "Volume");

            this.appendValueInput("VOLUME_VALUE").setCheck("Number");
            
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(Blockly.Msg['SOUND_SOURCES_HUE']);
            this.setTooltip(Blockly.Msg['SB_SET_INSTRUMENT_VOLUME_TOOLTIP']);
        }
    };

    Blockly.Blocks['sb_set_instrument_mute'] = {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg['SB_SET_INSTRUMENT_MUTE_MESSAGE'].split('%1')[0])
                .appendField(new FieldDropdownLenient(function() {
                    let workspace = null;
                    if (this.sourceBlock_) workspace = this.sourceBlock_.workspace;
                    else if (this.workspace) workspace = this.workspace;
                    const options = [['DefaultSynth', 'DefaultSynth']];
                    if (workspace) {
                        const targetBlockTypes = ['sb_create_synth_instrument', 'sb_create_harmonic_synth', 'sb_create_additive_synth', 'sb_create_layered_instrument', 'sb_create_sampler_instrument'];
                        targetBlockTypes.forEach(type => {
                            workspace.getBlocksByType(type, false).forEach(block => {
                                const name = block.getFieldValue('NAME');
                                if (name && !options.some(opt => opt[1] === name)) options.push([name, name]);
                            });
                        });
                    }
                    const currentValue = this.getValue();
                    if (currentValue && !options.some(opt => opt[1] === currentValue)) {
                        options.push([currentValue, currentValue]);
                    }
                    return options;
                }), "TARGET")
                .appendField(Blockly.Msg['SB_SET_INSTRUMENT_MUTE_MESSAGE'].split('%2')[0].split('%1')[1] || "Mute")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "MUTE");

            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(Blockly.Msg['SOUND_SOURCES_HUE']);
            this.setTooltip(Blockly.Msg['SB_SET_INSTRUMENT_MUTE_TOOLTIP']);
        }
    };

    Blockly.Blocks['sb_set_instrument_solo'] = {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg['SB_SET_INSTRUMENT_SOLO_MESSAGE'].split('%1')[0])
                .appendField(new FieldDropdownLenient(function() {
                    let workspace = null;
                    if (this.sourceBlock_) workspace = this.sourceBlock_.workspace;
                    else if (this.workspace) workspace = this.workspace;
                    const options = [['DefaultSynth', 'DefaultSynth']];
                    if (workspace) {
                        const targetBlockTypes = ['sb_create_synth_instrument', 'sb_create_harmonic_synth', 'sb_create_additive_synth', 'sb_create_layered_instrument', 'sb_create_sampler_instrument'];
                        targetBlockTypes.forEach(type => {
                            workspace.getBlocksByType(type, false).forEach(block => {
                                const name = block.getFieldValue('NAME');
                                if (name && !options.some(opt => opt[1] === name)) options.push([name, name]);
                            });
                        });
                    }
                    const currentValue = this.getValue();
                    if (currentValue && !options.some(opt => opt[1] === currentValue)) {
                        options.push([currentValue, currentValue]);
                    }
                    return options;
                }), "TARGET")
                .appendField(Blockly.Msg['SB_SET_INSTRUMENT_SOLO_MESSAGE'].split('%2')[0].split('%1')[1] || "Solo")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "SOLO");

            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(Blockly.Msg['SOUND_SOURCES_HUE']);
            this.setTooltip(Blockly.Msg['SB_SET_INSTRUMENT_SOLO_TOOLTIP']);
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
                        "text": "C"
                    },
                    {
                        "type": "field_input",
                        "name": "NOTES_STRING",
                        "text": "C4,E4,G4"
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_PERFORMANCE_HUE}",
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
                        "type": "field_dropdown",
                        "name": "NAME",
                        "options": function() {
                            let workspace = null;
                            if (this.sourceBlock_) {
                                workspace = this.sourceBlock_.workspace;
                            } else if (this.workspace) {
                                workspace = this.workspace;
                            }

                            const options = [];
                            if (workspace) {
                                const blocks = workspace.getBlocksByType('sb_define_chord', false);
                                blocks.forEach(block => {
                                    const name = block.getFieldValue('NAME');
                                    if (name) {
                                        options.push([name, name]);
                                    }
                                });
                            }
                            
                            options.sort((a, b) => a[0].localeCompare(b[0]));

                            if (options.length === 0) {
                                return [["C", "C"]];
                            }
                            return options;
                        }
                    }
                ],
                "output": "String",
                "colour": "%{BKY_PERFORMANCE_HUE}",
                "tooltip": "%{BKY_SB_GET_CHORD_NAME_TOOLTIP}"
            });
        }
    };

    // 建立疊加樂器
    Blockly.Blocks['sb_create_layered_instrument'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_CREATE_LAYERED_INSTRUMENT_MESSAGE}",
                "args0": [
                    {
                        "type": "field_input",
                        "name": "NAME",
                        "text": "MyLayeredSynth"
                    },
                    {
                        "type": "field_input",
                        "name": "LAYER_LIST",
                        "text": "BassLayer,LeadLayer"
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SOUND_SOURCES_HUE}",
                "tooltip": "%{BKY_SB_CREATE_LAYERED_INSTRUMENT_TOOLTIP}"
            });
        }
    };

    // 播放指定名稱的和弦
    Blockly.Blocks['sb_play_chord_by_name'] = {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg['SB_PLAY_CHORD_BY_NAME_MESSAGE'].split('%1')[0])
                .appendField(new FieldDropdownLenient(function() {
                    let workspace = null;
                    if (this.sourceBlock_) workspace = this.sourceBlock_.workspace;
                    else if (this.workspace) workspace = this.workspace;

                    const options = [];
                    if (workspace) {
                        const blocks = workspace.getBlocksByType('sb_define_chord', false);
                        blocks.forEach(block => {
                            const name = block.getFieldValue('NAME');
                            if (name && !options.some(opt => opt[1] === name)) {
                                options.push([name, name]);
                            }
                        });
                    }
                    options.sort((a, b) => a[0].localeCompare(b[0]));
                    const currentValue = this.getValue();
                    if (currentValue && !options.some(opt => opt[1] === currentValue)) {
                        options.push([currentValue, currentValue]);
                    }
                    return options.length > 0 ? options : [["C", "C"]];
                }), "CHORD_NAME")
                .appendField(Blockly.Msg['SB_PLAY_CHORD_BY_NAME_MESSAGE'].split('%2')[0].split('%1')[1] || "Duration")
                .appendField(new Blockly.FieldTextInput("8n"), "DUR");

            this.appendValueInput("VELOCITY").setCheck("Number");

            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(Blockly.Msg['PERFORMANCE_HUE']);
            this.setTooltip(Blockly.Msg['SB_PLAY_CHORD_BY_NAME_TOOLTIP']);
        }
    };

    // 直接播放音符列表的和弦 (無需定義)
    Blockly.Blocks['sb_play_chord_notes'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_PLAY_CHORD_NOTES_MESSAGE}",
                "args0": [
                    {
                        "type": "field_input",
                        "name": "NOTES_STRING",
                        "text": "C4,E4,G4"
                    },
                    {
                        "type": "field_input",
                        "name": "DUR",
                        "text": "8n"
                    },
                    {
                        "type": "input_value",
                        "name": "VELOCITY",
                        "check": "Number"
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_PERFORMANCE_HUE}",
                "tooltip": "%{BKY_SB_PLAY_CHORD_NOTES_TOOLTIP}"
            });
        }
    };
}