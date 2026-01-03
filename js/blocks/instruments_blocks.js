// js/blocks/instruments_blocks.js
// Instrument-related custom blocks
import * as Blockly from 'blockly';

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

            this.setHelpUrl(() => {
                const currentLang = window.currentLanguage || 'en';
                if (currentLang === 'zh-hant') {
                    return 'docs/performance_readme_zh-hant.html';
                }
                return 'docs/performance_readme_en.html';
            });
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

            this.setHelpUrl(() => {
                const currentLang = window.currentLanguage || 'en';
                if (currentLang === 'zh-hant') {
                    return 'docs/performance_readme_zh-hant.html';
                }
                return 'docs/performance_readme_en.html';
            });
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
            this.jsonInit({
                "message0": "%{BKY_SB_SET_ADSR_MESSAGE}",
                "args0": [
                    {
                        "type": "field_number",
                        "name": "A",
                        "value": 0.01,
                        "min": 0,
                        "max": 10,
                        "precision": 0.01
                    },
                    {
                        "type": "field_number",
                        "name": "D",
                        "value": 0.1,
                        "min": 0,
                        "max": 10,
                        "precision": 0.01
                    },
                    {
                        "type": "field_number",
                        "name": "S",
                        "value": 0.5,
                        "min": 0,
                        "max": 1,
                        "precision": 0.01
                    },
                    {
                        "type": "field_number",
                        "name": "R",
                        "value": 1.0,
                        "min": 0,
                        "max": 10,
                        "precision": 0.01
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_INSTRUMENT_CONTROL_HUE}",
                "tooltip": "%{BKY_SB_SET_ADSR_TOOLTIP}"
            });
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
                            ['%{BKY_JAZZKIT_DRUM_RIMSHOT}', 'C#1'],
                            ['%{BKY_JAZZKIT_DRUM_SNARE}', 'D1'],
                            ['%{BKY_JAZZKIT_DRUM_HANDCLAP}', 'D#1'],
                            ['%{BKY_JAZZKIT_DRUM_LOW_TOM}', 'E1'],
                            ['%{BKY_JAZZKIT_DRUM_CLOSED_HIHAT}', 'F1'],
                            ['%{BKY_JAZZKIT_DRUM_MID_TOM}', 'F#1'],
                            ['%{BKY_JAZZKIT_DRUM_HIGH_TOM}', 'G1'],
                            ['%{BKY_JAZZKIT_DRUM_CRASH_CYMBAL}', 'G#1'],
                            ['%{BKY_JAZZKIT_DRUM_OPEN_HIHAT}', 'A1'],
                            ['%{BKY_JAZZKIT_DRUM_RIDE_CYMBAL}', 'A#1'] // Correctly added this back
                        ]
                    }, // <-- Comma for args0 separator
                    { // Velocity input - Correctly placed as a new item in args0
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
                "inputsInline": true, // Often helpful for blocks with many fields
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

            this.setHelpUrl(() => {
                const currentLang = window.currentLanguage || 'en';
                if (currentLang === 'zh-hant') {
                    return 'docs/instrument_readme_zh-hant.html';
                }
                return 'docs/instrument_readme_en.html';
            });
        }
    };

    Blockly.Blocks['sb_select_current_instrument'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_SELECT_CURRENT_INSTRUMENT_MESSAGE}",
                "args0": [
                    {
                        "type": "field_input",
                        "name": "NAME",
                        "text": "DefaultSynth"
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_INSTRUMENT_CONTROL_HUE}",
                "tooltip": "%{BKY_SB_SELECT_CURRENT_INSTRUMENT_TOOLTIP}"
            });
        }
    };

    Blockly.Blocks['sb_set_instrument_vibrato'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_SET_INSTRUMENT_VIBRATO_MESSAGE}",
                "args0": [
                    {
                        "type": "input_value",
                        "name": "DETUNE_VALUE",
                        "check": "Number"
                    }
                ],
                "inputsInline": true,
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_INSTRUMENT_CONTROL_HUE}",
                "tooltip": "%{BKY_SB_SET_INSTRUMENT_VIBRATO_TOOLTIP}"
            });
        }
    };

    Blockly.Blocks['sb_set_instrument_volume'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_SET_INSTRUMENT_VOLUME_MESSAGE}",
                "args0": [
                    {
                        "type": "input_value",
                        "name": "VOLUME_VALUE",
                        "check": "Number"
                    }
                ],
                "inputsInline": true,
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_INSTRUMENT_CONTROL_HUE}",
                "tooltip": "%{BKY_SB_SET_INSTRUMENT_VOLUME_TOOLTIP}"
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


                            "text": "C Major"


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


    }


    