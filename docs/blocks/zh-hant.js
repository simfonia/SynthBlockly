// blocks/zh-hant.js — 正體中文訊息
export const MSG_ZH_HANT = {
    // --- UI Button Tooltips ---
    'UI_BTN_START_AUDIO': '啟動音訊',
    'UI_BTN_CONNECT_MIDI': '連接 MIDI 設備',
    'UI_BTN_CONNECT_SERIAL': '連接序列埠設備',
    'UI_BTN_PLAY_TEST_NOTE': '播放測試音 (C4)',
    'UI_BTN_SAVE_PROJECT': '儲存專案 (XML)',
    'UI_BTN_LOAD_PROJECT': '載入專案 (XML)',
    'UI_BTN_RUN_BLOCKS': '執行積木',
    'UI_BTN_EXPORT_CODE': '匯出程式碼並複製',
    'UI_BTN_CLEAR_LOG': '清除日誌',

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
    'SB_PLAY_NOTE_MESSAGE': '播放 音符 %1 時值 %2 力度 %3 (非阻塞)',
    'SB_PLAY_NOTE_TOOLTIP': '立即播放音符，不等待其結束。力度範圍 0-1 (MIDI 輸入為 0-127)。時值符號可使用 "4n" (四分音符), "8n." (附點八分音符), "8t" (八分三連音) 等。',
    'SB_PLAY_NOTE_AND_WAIT_MESSAGE': '播放 音符 %1 時值 %2 力度 %3 並等待',
    'SB_PLAY_NOTE_AND_WAIT_TOOLTIP': '播放一個音符，並等待其時值結束後才繼續執行。力度範圍 0-1 (MIDI 輸入為 0-127)。時值符號可使用 "4n" (四分音符), "8n." (附點八分音符), "8t" (八分三連音) 等。',
    'SB_PLAY_DRUM_MESSAGE': '播放 鼓聲 %1',
    'SB_PLAY_DRUM_TOOLTIP': '觸發鼓聲 (Kick/Snare/HiHat)',
    'SB_SET_ADSR_MESSAGE': '設定 ADSR A %1 D %2 S %3 R %4',
    'SB_SET_ADSR_TOOLTIP': '設定合成器的 ADSR 包絡',
    'SB_CONTROLS_DO': '執行 %1',

    // Add Jazz Kit specific messages
    'JAZZKIT_COLOR': '#E74C3C', // 紅橙色 (Reddish)
    'JAZZKIT_PLAY_DRUM_MESSAGE': '爵士鼓(Roland TR-909): %1',
    'JAZZKIT_PLAY_DRUM_TOOLTIP': '播放選定的爵士鼓音效',

    // Jazz Kit Drum Type Options (Using English as per user request)
    'JAZZKIT_DRUM_KICK': 'Kick',
    'JAZZKIT_DRUM_RIMSHOT': 'Rimshot',
    'JAZZKIT_DRUM_SNARE': 'Snare',
    'JAZZKIT_DRUM_HANDCLAP': 'Handclap',
    'JAZZKIT_DRUM_LOW_TOM': 'Low Tom',
    'JAZZKIT_DRUM_CLOSED_HIHAT': 'Closed Hi-hat',
    'JAZZKIT_DRUM_MID_TOM': 'Mid Tom',
    'JAZZKIT_DRUM_HIGH_TOM': 'High Tom',
    'JAZZKIT_DRUM_CRASH_CYMBAL': 'Crash Cymbal',
    'JAZZKIT_DRUM_OPEN_HIHAT': 'Open Hi-hat',
    'JAZZKIT_DRUM_RIDE_CYMBAL': 'Ride Cymbal',

    // --- Transport Block Messages ---
    'TRANSPORT_COLOR': '#16A085', // 藍綠色 (Teal)
    'SB_TRANSPORT_SET_BPM_MESSAGE': '設定速度為 %1 BPM',
    'SB_TRANSPORT_SET_BPM_TOOLTIP': '設定主速度 (每分鐘幾拍)',
    'SB_TRANSPORT_START_STOP_MESSAGE': '%1 指揮',
    'SB_TRANSPORT_START_STOP_TOOLTIP': '開始或停止主時鐘 (時間軸)',
    'SB_TRANSPORT_ACTION_START': '開始',
    'SB_TRANSPORT_ACTION_STOP': '停止',

    // --- Wait Block Messages ---
    'SB_WAIT_MUSICAL_MESSAGE': '等待 %1',
    'SB_WAIT_MUSICAL_TOOLTIP': '等待一段音樂時值（例如 4n = 四分音符），時間長度依據主速度而定。',
    
    // --- Musical Duration Options ---
    'SB_DUR_1M': '1 小節 (1m)',
    'SB_DUR_2N': '二分音符 (2n)',
    'SB_DUR_4N': '四分音符 (4n)',
    'SB_DUR_8N': '八分音符 (8n)',
    'SB_DUR_16N': '十六分音符 (16n)',
};

