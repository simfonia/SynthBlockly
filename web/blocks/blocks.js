// blocks/blocks.js
// 自訂積木外觀（僅定義 block 結構與欄位），使用 Blockly.Msg 作為文字來源

export function registerBlocks(Blockly) {
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
                        "type": "field_input",
                        "name": "NOTE",
                        "text": "C4"
                    },
                    {
                        "type": "field_input",
                        "name": "DUR",
                        "text": "8n"
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SYNTH_ACTIONS_COLOR}",
                "tooltip": "%{BKY_SB_PLAY_NOTE_TOOLTIP}"
            });
        }
    };

    // 播放鼓聲
    Blockly.Blocks['sb_play_drum'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_PLAY_DRUM_MESSAGE}",
                "args0": [
                    {
                        "type": "field_dropdown",
                        "name": "TYPE",
                        "options": [['Kick', 'KICK'], ['Snare', 'SNARE'], ['HiHat', 'HH']]
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SYNTH_ACTIONS_COLOR}",
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
                "colour": "%{BKY_SYNTH_SYNTH_COLOR}",
                "tooltip": "%{BKY_SB_SET_ADSR_TOOLTIP}"
            });
        }
    };

    // 當收到 MIDI 音符
    Blockly.Blocks['sb_midi_note_received'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_MIDI_NOTE_RECEIVED_MESSAGE}",
                "args0": [
                    {
                        "type": "field_variable",
                        "name": "NOTE",
                        "variable": "note"
                    },
                    {
                        "type": "field_variable",
                        "name": "VELOCITY",
                        "variable": "velocity"
                    },
                    {
                        "type": "field_variable",
                        "name": "CHANNEL",
                        "variable": "channel"
                    }
                ],
                "message1": "%{BKY_SB_CONTROLS_DO}",
                "args1": [
                    {
                        "type": "input_statement",
                        "name": "DO"
                    }
                ],
                "inputsInline": false,
                "output": null,
                "previousStatement": null,
                "nextStatement": true, // Hat blocks that take statements usually have nextStatement: true
                "colour": "%{BKY_SYNTH_EVENTS_COLOR}",
                "tooltip": "%{BKY_SB_MIDI_NOTE_RECEIVED_TOOLTIP}",
                "hat": true
            });
        }
    };
    // 當收到 Serial 資料
    Blockly.Blocks['sb_serial_data_received'] = {
        init: function () {
            this.jsonInit({
                "message0": "%{BKY_SB_SERIAL_DATA_RECEIVED_MESSAGE}",
                "args0": [
                    {
                        "type": "field_variable",
                        "name": "DATA",
                        "variable": "serial_data"
                    }
                ],
                "message1": "%{BKY_SB_CONTROLS_DO}",
                "args1": [
                    {
                        "type": "input_statement",
                        "name": "DO"
                    }
                ],
                "inputsInline": false,
                "output": null,
                "previousStatement": null,
                "nextStatement": true,
                "colour": "%{BKY_SYNTH_EVENTS_COLOR}",
                "tooltip": "%{BKY_SB_SERIAL_DATA_RECEIVED_TOOLTIP}",
                "hat": true
            });
        }
    };
    return true;
}