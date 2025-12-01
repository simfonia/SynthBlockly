// blocks/zh-hant.js — 正體中文訊息
export const MSG_ZH_HANT = {
    // Category Colors (Hex values)
    'SYNTH_ACTIONS_COLOR': '#5CB85C', // 綠色
    'SYNTH_SYNTH_COLOR': '#5BC0DE',   // 藍色
    'SYNTH_EFFECTS_COLOR': '#9B59B6', // 紫色
    'SYNTH_EVENTS_COLOR': '#F0AD4E',  // 橘色

    // Block Messages (Events)
    'SB_MIDI_NOTE_RECEIVED_MESSAGE': '當 MIDI 音符 %1 力度 %2 頻道 %3 接收時',
    'SB_MIDI_NOTE_RECEIVED_TOOLTIP': '當收到 MIDI 音符時觸發。提供音符編號、力度和頻道。',

    'SB_SERIAL_DATA_RECEIVED_MESSAGE': '當 Serial 資料 %1 接收時',
    'SB_SERIAL_DATA_RECEIVED_TOOLTIP': '當收到一行序列埠資料時觸發。提供收到的文字。',

    // Block Messages
    'SB_PLAY_NOTE_MESSAGE': '播放 音符 %1 時值 %2',
    'SB_PLAY_NOTE_TOOLTIP': '使用合成器播放音符，例如 C4, D#3',
    'SB_PLAY_DRUM_MESSAGE': '播放 鼓聲 %1',
    'SB_PLAY_DRUM_TOOLTIP': '觸發鼓聲 (Kick/Snare/HiHat)',
    'SB_SET_ADSR_MESSAGE': '設定 ADSR A %1 D %2 S %3 R %4',
    'SB_SET_ADSR_TOOLTIP': '設定合成器的 ADSR 包絡',
    'SB_CONTROLS_DO': '執行 %1',
};

