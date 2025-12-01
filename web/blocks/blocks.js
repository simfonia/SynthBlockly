// blocks/blocks.js
// 自訂積木外觀（僅定義 block 結構與欄位），使用 Blockly.Msg 作為文字來源

export function registerBlocks(Blockly) {
    if (typeof Blockly === 'undefined') {
        console.error('Blockly not available');
        return false;
    }

    // 播放音符
    Blockly.Blocks['pbsx_play_note'] = {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.PBS_PLAY_NOTE_LABEL || 'Play Note')
                .appendField(new Blockly.FieldTextInput('C4'), 'NOTE')
                .appendField(Blockly.Msg.PBS_PLAY_NOTE_DUR_LABEL || 'Dur')
                .appendField(new Blockly.FieldTextInput('8n'), 'DUR');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip(Blockly.Msg.PBS_PLAY_NOTE_TOOLTIP || 'Play a musical note');
        }
    };

    // 播放鼓聲
    Blockly.Blocks['pbsx_play_drum'] = {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.PBS_PLAY_DRUM_LABEL || 'Play Drum')
                .appendField(new Blockly.FieldDropdown([['Kick', 'KICK'], ['Snare', 'SNARE'], ['HiHat', 'HH']]), 'TYPE');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(20);
            this.setTooltip(Blockly.Msg.PBS_PLAY_DRUM_TOOLTIP || 'Trigger a drum sound');
        }
    };

    // 設定 ADSR
    Blockly.Blocks['pbsx_set_adsr'] = {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.PBS_SET_ADSR_LABEL || 'Set ADSR')
                .appendField(Blockly.Msg.PBS_SET_ADSR_A || 'A')
                .appendField(new Blockly.FieldNumber(0.01, 0, 10, 0.01), 'A')
                .appendField(Blockly.Msg.PBS_SET_ADSR_D || 'D')
                .appendField(new Blockly.FieldNumber(0.1, 0, 10, 0.01), 'D')
                .appendField(Blockly.Msg.PBS_SET_ADSR_S || 'S')
                .appendField(new Blockly.FieldNumber(0.5, 0, 1, 0.01), 'S')
                .appendField(Blockly.Msg.PBS_SET_ADSR_R || 'R')
                .appendField(new Blockly.FieldNumber(1.0, 0, 10, 0.01), 'R');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(120);
            this.setTooltip(Blockly.Msg.PBS_SET_ADSR_TOOLTIP || 'Set ADSR envelope');
        }
    };

    return true;
}
