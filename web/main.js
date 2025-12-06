// main.js - 主要初始化腳本，採用 5-pass 加載策略解決時序問題

import { loadModule } from './module_loader.js';

// ============================================================================
// --- Blockly 12 棄用 API Polyfill ---
// ============================================================================
// Suppress Blockly 12 deprecation warnings by monkey-patching console.warn
const originalWarn = console.warn;
console.warn = function (...args) {
    if (args[0] && typeof args[0] === 'string') {
        // Suppress specific deprecation warnings from Blockly v12
                    if (args[0].includes('getAllVariables') || args[0].includes('getVariableById') || args[0].includes('getVariable')) {            return; // Do not log this warning
        }
    }
    originalWarn.apply(console, args);
};

// ============================================================================
// --- 全域變數初始化 ---
// ============================================================================
let workspace = null;
const analyser = new Tone.Analyser('waveform', 1024);

// Connect the analyser to the output destination
analyser.toDestination();

// Create audio nodes and connect them to the analyser
const synth = new Tone.PolySynth(Tone.Synth).connect(analyser);
const drum = new Tone.MembraneSynth().connect(analyser);
const hh = new Tone.NoiseSynth({ volume: -12 }).connect(analyser);
const snare = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.005, decay: 0.2, sustain: 0 },
    volume: -5
}).connect(analyser);

// --- NEW: Jazz Kit Sampler ---
const jazzKit = new Tone.Sampler({
    urls: {
        'C1': 'BT0A0D0.WAV',      // Kick
        'C#1': 'RIM127.WAV',       // Rimshot
        'D1': 'ST7T7S7.WAV',      // Snare
        'D#1': 'HANDCLP2.WAV',     // Handclap
        'E1': 'LTAD0.WAV',        // Low Tom
        'F1': 'HHCDA.WAV',        // Closed Hi-hat
        'F#1': 'MTAD0.WAV',        // Mid Tom
        'G1': 'HTAD0.WAV',        // High Tom
        'G#1': 'CSHDA.WAV',        // Crash Cymbal
        'A1': 'HHODA.WAV',        // Open Hi-hat
        'A#1': 'RIDEDA.WAV',       // Ride Cymbal
    },
    baseUrl: './assets/samples/jazzkit/Roland TR-909/',
    onload: () => {
        console.log('Jazz Kit samples loaded.');
    }
}).connect(analyser);

let audioStarted = false;

// --- Create and expose a single Audio Engine object ---
const audioEngine = {
    Tone: Tone,
    synth: synth,
    drum: drum,
    hh: hh,
    snare: snare,
    jazzKit: jazzKit, // Expose the new sampler
    log: function(msg) {
        const d = document.getElementById('log');
        if (d) {
            d.innerText += msg + '\n';
            d.scrollTop = d.scrollHeight;
        }
    },
    playKick: async function() {
        const ok = await ensureAudioStarted();
        if (ok) {
            // this.log('playKick() called!');
            this.drum.triggerAttackRelease('C2', '8n');
        }
    },
    playSnare: async function() {
        const ok = await ensureAudioStarted();
        if (ok) {
            this.snare.triggerAttackRelease('8n');
        }
    }
};
window.audioEngine = audioEngine;

const log = audioEngine.log; // Keep a local reference for functions outside the engine

// --- Resizer Global Variables ---
let isHResizing = false;

// --- Resizer Helper Functions ---
function onHMouseMove(e) {
    if (!isHResizing) return;
    const container = document.getElementById('container');
    const leftPanel = document.getElementById('left');
    const hResizer = document.getElementById('h-resizer');

    const containerWidth = container.offsetWidth;
    let newLeftWidth = e.clientX - container.getBoundingClientRect().left;

    // Add constraints for minimum panel widths
    const minWidth = 150; // Minimum width for left and right panels
    if (newLeftWidth < minWidth) newLeftWidth = minWidth;
    if (containerWidth - newLeftWidth - hResizer.offsetWidth < minWidth) {
        newLeftWidth = containerWidth - minWidth - hResizer.offsetWidth;
    }

    leftPanel.style.flexBasis = `${newLeftWidth}px`;
    if (workspace) {
        // Let Blockly and p5 know that a resize happened.
        window.dispatchEvent(new Event('resize'));
    }
}

function onHMouseUp() {
    isHResizing = false;
    document.removeEventListener('mousemove', onHMouseMove);
    document.removeEventListener('mouseup', onHMouseUp);
}

// ============================================================================
// --- Audio 管理 ---
// ============================================================================
async function ensureAudioStarted() {
    if (audioStarted) return true;
    try {
        await Tone.start();
        try { if (Tone.context && Tone.context.state === 'suspended') await Tone.context.resume(); } catch (e) { }
        audioStarted = true;
        log('AudioContext 已啟動');
        return true;
    } catch (e) {
        log('無法啟動 AudioContext: ' + e);
        return false;
    }
}

// ============================================================================
// --- MIDI & Serial 連線 ---
// ============================================================================
let midiNoteListeners = []; // Array to hold registered MIDI note callbacks

// Function to register MIDI note event listeners for Blockly
window.registerMidiNoteListener = function (callback) {
    if (typeof callback === 'function') {
        midiNoteListeners.push(callback);
    }
};

// Function to unregister MIDI note event listeners
window.unregisterMidiNoteListener = function (callback) {
    midiNoteListeners = midiNoteListeners.filter(listener => listener !== callback);
};

async function connectMIDI() {
    if (!navigator.requestMIDIAccess) { log('瀏覽器不支援 Web MIDI'); return; }
    try {
        const midi = await navigator.requestMIDIAccess();
        for (let input of midi.inputs.values()) {
            input.onmidimessage = onMIDIMessage;
            log('MIDI input ready: ' + input.name);
        }
        midi.onstatechange = (e) => log('MIDI state: ' + e.port.name + ' ' + e.port.state);
    } catch (e) { log('MIDI 連線失敗: ' + e); }
}

async function onMIDIMessage(msg) {
    const ok = await ensureAudioStarted();
    if (!ok) return;

    const [status, data1, data2] = msg.data;
    const cmd = status & 0xf0;
    const channel = (status & 0x0f) + 1; // Extract MIDI channel (1-16)

    if (cmd === 0x90 && data2 > 0) { // Note ON
        const midiNote = data1;
        const velocity = data2; // Keep original 0-127 velocity

        log(`Note ON midi=${midiNote} vel=${velocity} ch=${channel}`);

        // Dispatch to all registered Blockly listeners
        midiNoteListeners.forEach(listener => {
            try {
                listener(midiNote, velocity, channel);
            } catch (e) {
                console.error('Error in MIDI listener callback:', e);
            }
        });

    } else if (cmd === 0x80 || (cmd === 0x90 && data2 === 0)) { // Note OFF
        const midiNote = data1;
        const velocity = 0;
        const channel = (status & 0x0f) + 1;
        log(`Note OFF midi=${midiNote} ch=${channel}`);
        // Optionally, dispatch Note OFF events as well
        // midiNoteListeners.forEach(listener => {
        //     try {
        //         listener(midiNote, velocity, channel);
        //     } catch (e) {
        //         console.error('Error in MIDI listener callback:', e);
        //     }
        // });
    }
}

let serialPort = null;
let serialReader = null;
let serialBuffer = '';
let serialDataListeners = []; // Array to hold registered Serial data callbacks

// Function to register Serial data event listeners for Blockly
window.registerSerialDataListener = function (callback) {
    if (typeof callback === 'function') {
        serialDataListeners.push(callback);
    }
};

// Function to unregister Serial data event listeners
window.unregisterSerialDataListener = function (callback) {
    serialDataListeners = serialDataListeners.filter(listener => listener !== callback);
};

async function connectSerial() {
    if (!('serial' in navigator)) { log('瀏覽器不支援 Web Serial'); return; }
    try {
        serialPort = await navigator.serial.requestPort();
        await serialPort.open({ baudRate: 9600 }); // Match Arduino's baud rate
        log('Serial opened');
        const decoder = new TextDecoderStream();
        serialPort.readable.pipeTo(decoder.writable);
        serialReader = decoder.readable.getReader();
        readSerialLoop();
    } catch (e) { log('Serial error: ' + e); }
}

async function readSerialLoop() {
    try {
        while (true) {
            const { value, done } = await serialReader.read();
            if (done) break;
            if (value) {
                serialBuffer += value;
                let newlineIndex;
                // Process all complete lines in the buffer
                while ((newlineIndex = serialBuffer.indexOf('\n')) !== -1) {
                    const line = serialBuffer.substring(0, newlineIndex).trim();
                    serialBuffer = serialBuffer.substring(newlineIndex + 1);
                    if (line) { // Don't process empty lines
                        handleSerialLine(line);
                    }
                }
            }
        }
    } catch (e) { 
        log('Serial read error: ' + e); 
        serialBuffer = ''; // Reset buffer on error
    }
}

async function handleSerialLine(line) {
    log('Serial: ' + line);
    const ok = await ensureAudioStarted();
    if (!ok) {
        log('無法處理音效：音訊尚未由使用者手動啟用（請點擊頁面上任一按鈕）。');
        return;
    }

    // Dispatch to all registered Blockly Serial listeners
    serialDataListeners.forEach(listener => {
        try {
            listener(line);
        } catch (e) {
            console.error('Error in Serial listener callback:', e);
        }
    });
}

// --- Workspace Event Handlers (New Architecture) ---
const blockListeners = {}; // Object to hold listeners for specific blocks, enabling dynamic un-registration

function onWorkspaceChanged(event) {
    if (!workspace) return;
    if (event.isUiEvent) return; // Don't run on UI events like zoom or selection

    // A block was changed, moved, created, or deleted.
    // This is a broad but effective net to catch any changes that might
    // affect the code inside a hat block.
    // Let's find all hat blocks and re-sync their listeners.

    // Find all hat blocks on the workspace
    const serialHats = workspace.getBlocksByType('sb_serial_data_received', false);
    const midiHats = workspace.getBlocksByType('sb_midi_note_received', false);

    // Get a list of all currently registered listener block IDs
    const registeredIds = Object.keys(blockListeners);

    // Combine all current hat blocks
    const allCurrentHats = [...serialHats, ...midiHats];
    const allCurrentHatIds = allCurrentHats.map(b => b.id);

    // Unregister listeners for any hat blocks that have been deleted
    registeredIds.forEach(blockId => {
        if (!allCurrentHatIds.includes(blockId)) {
            if (blockListeners[blockId].type === 'serial') {
                unregisterListenerForBlock(blockId);
            } else if (blockListeners[blockId].type === 'midi') {
                unregisterListenerForMidiBlock(blockId);
            }
        }
    });

    // Re-register all current hat blocks to update their code
    allCurrentHats.forEach(block => {
        // Unregister the old listener for this block ID before registering the new one
        if (blockListeners[block.id]) {
            if (blockListeners[block.id].type === 'serial') {
                unregisterListenerForBlock(block.id);
            } else if (blockListeners[block.id].type === 'midi') {
                unregisterListenerForMidiBlock(block.id);
            }
        }
        
        // Register the new listener
        if (block.type === 'sb_serial_data_received') {
            registerListenerForBlock(block);
        } else if (block.type === 'sb_midi_note_received') {
            registerListenerForMidiBlock(block);
        }
    });
}

function registerListenerForBlock(block) {
    if (!block || blockListeners[block.id]) return; // Already registered

    // --- FIX: Initialize the generator before use ---
    Blockly.JavaScript.init(workspace);

    const code = Blockly.JavaScript.statementToCode(block, 'DO');
    
    // --- FIX: Clean up the generator state after use ---
    Blockly.JavaScript.finish(''); 

    if (!code) return; // No blocks inside the hat

    const variableId = block.getFieldValue('DATA');
    const variable = block.workspace.getVariableMap().getVariableById(variableId);
    if (!variable) return;
    const varData = variable.name;

    try {
        // Wrap the code in an async IIFE to allow await inside the listener
        const listenerFunction = new Function(varData, `(async () => { ${code} })();`);
        window.registerSerialDataListener(listenerFunction);
        blockListeners[block.id] = { type: 'serial', listener: listenerFunction }; // Store type
        log(`即時註冊了積木 ${block.id} 的序列埠監聽器。`);
    } catch (e) {
        console.error("Failed to create or register listener function:", e);
        log(`建立監聽器失敗: ${e.message}`);
    }
}

function unregisterListenerForBlock(blockId) {
    const listenerToRemove = blockListeners[blockId];
    if (listenerToRemove && listenerToRemove.type === 'serial') {
        window.unregisterSerialDataListener(listenerToRemove.listener);
        delete blockListeners[blockId];
        log(`註銷了積木 ${blockId} 的序列埠監聽器。`);
    }
}

function registerListenerForMidiBlock(block) {
    if (!block || blockListeners[block.id]) return; // Already registered

    // Initialize the generator before use
    Blockly.JavaScript.init(workspace);

    const code = Blockly.JavaScript.statementToCode(block, 'DO');
    // Clean up the generator state after use
    Blockly.JavaScript.finish('');

    if (!code) return; // No blocks inside the hat

    const noteVarId = block.getFieldValue('NOTE');
    const velocityVarId = block.getFieldValue('VELOCITY');
    const channelVarId = block.getFieldValue('CHANNEL');

    const noteVar = block.workspace.getVariableMap().getVariableById(noteVarId);
    const velocityVar = block.workspace.getVariableMap().getVariableById(velocityVarId);
    const channelVar = block.workspace.getVariableMap().getVariableById(channelVarId);

    if (!noteVar || !velocityVar || !channelVar) {
        log(`建立 MIDI 監聽器失敗: 變數未找到。`);
        return;
    }
    
    const varNote = noteVar.name;
    const varVelocity = velocityVar.name;
    const varChannel = channelVar.name;

    try {
        // Wrap the code in an async IIFE to allow await inside the listener
        const listenerFunction = new Function(varNote, '_rawVelocity', varChannel, `(async () => {
            const ${varVelocity} = _rawVelocity / 127; // Normalize velocity from 0-127 to 0-1 for Tone.js
            ${code}
        })();`);
        window.registerMidiNoteListener(listenerFunction);
        blockListeners[block.id] = { type: 'midi', listener: listenerFunction }; // Store type
        log(`即時註冊了積木 ${block.id} 的 MIDI 監聽器。`);
    } catch (e) {
        console.error("Failed to create or register MIDI listener function:", e);
        log(`建立 MIDI 監聽器失敗: ${e.message}`);
    }
}

function unregisterListenerForMidiBlock(blockId) {
    const listenerEntry = blockListeners[blockId];
    if (listenerEntry && listenerEntry.type === 'midi') {
        window.unregisterMidiNoteListener(listenerEntry.listener);
        delete blockListeners[blockId];
        log(`註銷了積木 ${blockId} 的 MIDI 監聽器。`);
    }
}

// ============================================================================
// --- 主要初始化邏輯：5-Pass 加載策略 ---
// ============================================================================
async function initializeBlockly() {
    log('開始初始化 Blockly...');

    try {
        // ========================================================================
        // PASS 1: 載入所有模組（非同步 fetch）
        // ========================================================================
        log('Pass 1: 載入模組...');

        const [blocksRes, generatorsRes, enRes, zhRes] = await Promise.all([
            loadModule('./blocks/blocks.js'),
            loadModule('./blocks/generators.js'),
            loadModule('./blocks/en.js'),
            loadModule('./blocks/zh-hant.js')
        ]);

        const blocksModule = blocksRes && blocksRes.module ? blocksRes.module : null;
        const generatorsModule = generatorsRes && generatorsRes.module ? generatorsRes.module : null;
        const enModule = enRes && enRes.module ? enRes.module : null;
        const zhModule = zhRes && zhRes.module ? zhRes.module : null;

        log('✓ 所有模組已載入');

        // ========================================================================
        // PASS 2: 合併語言消息到 Blockly.Msg
        // ========================================================================
        log('Pass 2: 註冊語言消息...');

        if (enModule && enModule.MSG_EN) {
            Object.assign(Blockly.Msg, enModule.MSG_EN);
        }
        if (zhModule && zhModule.MSG_ZH_HANT) {
            Object.assign(Blockly.Msg, zhModule.MSG_ZH_HANT);
        }

        log('✓ 語言消息已註冊');

        // ========================================================================
        // PASS 3: 註冊 Blocks 和 Generators
        // ========================================================================
        log('Pass 3: 註冊積木和生成器...');

        if (blocksModule && typeof blocksModule.registerBlocks === 'function') {
            blocksModule.registerBlocks(Blockly);
            log('✓ Blocks registered');
        }

        if (generatorsModule && typeof generatorsModule.registerGenerators === 'function') {
            generatorsModule.registerGenerators(Blockly);
            log('✓ Generators registered');
        }

        // ========================================================================
        // PASS 3.5: 獲取 Toolbox XML
        // ========================================================================
        log('Pass 3.5: 獲取 Toolbox XML...');
        let toolboxXml;
        try {
            const response = await fetch('./blocks/toolbox.xml');
            if (!response.ok) {
                throw new Error(`Toolbox fetch failed: ${response.statusText}`);
            }
            toolboxXml = await response.text();
            log('✓ Toolbox XML 已獲取');
        } catch (e) {
            console.error('Failed to fetch toolbox:', e);
            log('❌ 無法獲取 toolbox.xml: ' + e.message);
            // Fallback to a minimal toolbox if fetch fails
            toolboxXml = '<xml><category name="Error" colour="0"><label text="Toolbox load failed"></label></category></xml>';
        }

        // ========================================================================
        // PASS 4: 注入 Blockly 工作區
        // ========================================================================
        log('Pass 4: 注入 Blockly 工作區...');

        workspace = Blockly.inject('blocklyDiv', {
            toolbox: toolboxXml,
            grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
            zoom: {
                controls: true,  // 顯示縮放按鈕（+/-）
                wheel: true,     // 啟用滑鼠滾輪縮放
                startScale: 1.0
            },
            move: {
                scrollbars: true,  // 顯示捲軸
                drag: true,        // 允許拖曳移動
                wheel: true        // 啟用滑鼠滾輪垂直捲動
            }
        });
        log('✓ Blockly workspace 已注入');

        // --- NEW ARCHITECTURE: Attach live event listener ---
        workspace.addChangeListener(onWorkspaceChanged);
        log('✓ 已附加工作區即時事件監聽器。');

    } catch (e) {
        console.error('Blockly initialization failed:', e);
        log('❌ Blockly 初始化失敗: ' + e.message);
    }
}

// ============================================================================
// --- 程式碼生成和執行 ---
// ============================================================================
async function getBlocksCode() {
    if (!workspace) {
        log('Blockly workspace 尚未初始化');
        return '';
    }
    if (typeof Blockly.JavaScript === 'undefined') {
        log('Blockly.JavaScript 產生器尚未就緒');
        return '';
    }

    try {
        // Ensure the code generator is initialized for this workspace (prevents "init was not called" issues)
        try {
            if (Blockly && Blockly.JavaScript && typeof Blockly.JavaScript.init === 'function') {
                try { Blockly.JavaScript.init(workspace); } catch (e) { console.warn('Blockly.JavaScript.init threw', e); }
            }
        } catch (e) { }

        // Ensure custom generators are in forBlock (Blockly 12+ lookup structure)
        try {
            if (Blockly && Blockly.JavaScript && Blockly.JavaScript.forBlock) {
                const pbsxGens = ['play_note', 'sb_play_drum', 'sb_set_adsr', 'sb_midi_note_received', 'sb_serial_data_received'];
                for (const name of pbsxGens) {
                    if (Blockly.JavaScript[name] && !Blockly.JavaScript.forBlock[name]) {
                        Blockly.JavaScript.forBlock[name] = Blockly.JavaScript[name];
                    }
                }
            }
        } catch (e) { console.warn('forBlock sync failed', e); }

        let code = Blockly.JavaScript.workspaceToCode(workspace);
        code = Blockly.JavaScript.finish(code);

        if (!code || code.trim() === '') {
            log('產生的程式碼為空');
        } else {
            log('✓ 程式碼已產生（原生 Blockly 產生器）');
        }
        return code;
    } catch (e) {
        console.warn('原生 Blockly 產生器失敗:', e);
        log('備援模式：手動遍歷積木...');
        try {
            Blockly.JavaScript.init(workspace); // Re-initialize the generator for the fallback
            const top = workspace.getTopBlocks(true);
            let out = '';
            const genBlock = function (block) {
                if (!block) return '';
                const t = block.type;
                // 優先嘗試使用 forBlock 中的原生或已註冊產生器
                try {
                    if (Blockly && Blockly.JavaScript && Blockly.JavaScript.forBlock && typeof Blockly.JavaScript.forBlock[t] === 'function') {
                        return Blockly.JavaScript.forBlock[t].call(Blockly.JavaScript, block) || '';
                    }
                } catch (err) { console.warn('forBlock generator failed for', t, err); }
                // 備援：手動實現自訂積木
                if (t === 'sb_play_note') {
                    const note = block.getFieldValue('NOTE') || 'C4';
                    const dur = block.getFieldValue('DUR') || '8n';
                    return "synth.triggerAttackRelease('" + note + "','" + dur + "');\n";
                } else if (t === 'sb_play_drum') {
                    const type = block.getFieldValue('TYPE');
                    if (type === 'KICK') return 'playKick();\n';
                    if (type === 'HH') return "hh.triggerAttackRelease('16n');\n";
                    if (type === 'SNARE') return "(function(){ var sn = new Tone.NoiseSynth({volume:-6}).toDestination(); sn.triggerAttackRelease('8n'); })();\n";
                    return '';
                } else if (t === 'sb_set_adsr') {
                    const a = Number(block.getFieldValue('A')) || 0.01;
                    const d = Number(block.getFieldValue('D')) || 0.1;
                    const s = Number(block.getFieldValue('S')) || 0.5;
                    const r = Number(block.getFieldValue('R')) || 1.0;
                    return "synth.set({envelope: {attack: " + a + ", decay: " + d + ", sustain: " + s + ", release: " + r + "}});\n";
                } else {
                    return '// 不支援的積木類型: ' + t + '\n';
                }
            };
            top.forEach(b => {
                let cur = b;
                while (cur) {
                    out += genBlock(cur);
                    cur = cur.getNextBlock ? cur.getNextBlock() : null;
                }
            });
            if (out.trim() === '') log('備援產生器：產生的程式碼為空');
            else log('✓ 備援產生器成功產生程式碼');
            
            // Call finish() to prepend definitions and setup code
            out = Blockly.JavaScript.finish(out);
            log('✓ 備援產生器完成最終程式碼組合');

            return out;
        } catch (err) {
            console.error('備援產生器錯誤', err);
            log('❌ 備援產生器錯誤: ' + err);
            return '';
        }
    }
}

// ============================================================================
// --- DOM 事件監聽 ---
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    // 初始化 Blockly（包含 5-pass 加載）
    await initializeBlockly();

    // --- Language & UI ---
    // Update tooltips after modules are loaded and DOM is ready
    function updateUITranslations() {
        const userLang = navigator.language || navigator.userLanguage;
        const messages = (userLang.includes('zh')) ? Blockly.Msg : Blockly.Msg; // Assuming MSG_EN is the default
        
        const elements = document.querySelectorAll('[data-lang-title]');
        elements.forEach(el => {
            const key = el.getAttribute('data-lang-title');
            if (messages[key]) {
                el.title = messages[key];
            }
        });
    }
    updateUITranslations();

    // Handle icon button hover effects
    const iconButtons = document.querySelectorAll('.icon-button');
    iconButtons.forEach(button => {
        const img = button.querySelector('img');
        if (img) {
            const originalSrc = img.src;
            const hoverSrc = originalSrc.replace('_1F1F1F.png', '_FE2F89.png');
            
            button.addEventListener('mouseover', () => { img.src = hoverSrc; });
            button.addEventListener('mouseout', () => { img.src = originalSrc; });
        }
    });

    // --- Resizer Event Listeners ---
    const hResizer = document.getElementById('h-resizer');
    hResizer.addEventListener('mousedown', (e) => {
        isHResizing = true;
        document.addEventListener('mousemove', onHMouseMove);
        document.addEventListener('mouseup', onHMouseUp);
        e.preventDefault();
    });

    // Resize handler
    window.addEventListener('resize', () => {
        if (workspace && workspace.svgResize) workspace.svgResize();
    });

    // 按鈕事件
    document.getElementById('btnMidi').addEventListener('click', async () => {
        const ok = await ensureAudioStarted();
        if (ok) connectMIDI();
    });

    document.getElementById('btnSerial').addEventListener('click', async () => {
        const ok = await ensureAudioStarted();
        if (ok) connectSerial();
    });

    document.getElementById('btnTestNote').addEventListener('click', async () => {
        const ok = await ensureAudioStarted();
        if (ok) synth.triggerAttackRelease('C4', '8n');
    });

    const startBtn = document.getElementById('btnStartAudio');
    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            try {
                await Tone.start();
                if (Tone.context && Tone.context.state === 'suspended') await Tone.context.resume();
                audioStarted = true;
                log('Audio 已由使用者手動啟動');
            } catch (e) {
                log('啟動 Audio 失敗: ' + e);
            }
        });
    }

    // Run Blocks
    const runBtn = document.getElementById('btnRunBlocks');
    if (runBtn) {
        runBtn.addEventListener('click', async () => {
            const ok = await ensureAudioStarted();
            if (!ok) return;
            const code = await getBlocksCode();
            if (!code) { log('沒有程式碼可執行'); return; }
            log('執行積木程式碼...');
            log('--- 產生的程式碼 ---'); // Debug log
            log(code);                  // Debug log: print the code
            log('--------------------'); // Debug log
            try {
                // Wrap the user's code in an async IIFE to allow top-level await
                const runner = new Function(`(async () => { ${code} })();`);
                runner();
                log('程式執行完畢');
            } catch (e) {
                console.error('RunBlocks execution error', e);
                log('執行積木程式發生錯誤: ' + e);
            }
        });
    }

    // Export Code
    const exportBtn = document.getElementById('btnExportCode');
    const codeOut = document.getElementById('codeOut');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            const code = await getBlocksCode();
            if (!code) { log('沒有程式碼可匯出'); return; }
            codeOut.style.display = 'block';
            codeOut.innerText = code;
            try { await navigator.clipboard.writeText(code); log('程式碼已複製到剪貼簿'); } catch (e) { log('複製失敗: ' + e); }
            try {
                const blob = new Blob([code], { type: 'text/javascript' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const ts = new Date().toISOString().replace(/[:.]/g, '-');
                a.href = url;
                a.download = `blockly_export_${ts}.js`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                log('已下載 blockly_export_*.js');
            } catch (e) { log('下載失敗: ' + e); }
        });
    }

    // Clear Log
    const clearLogBtn = document.getElementById('btnClearLog');
    if (clearLogBtn) {
        clearLogBtn.addEventListener('click', () => {
            const logDiv = document.getElementById('log');
            if (logDiv) logDiv.innerText = '';
        });
    }

    // Save Workspace to XML
    const saveXmlBtn = document.getElementById('btnSaveXml');
    if (saveXmlBtn) {
        saveXmlBtn.addEventListener('click', () => {
            if (!workspace) {
                log('Workspace not ready.');
                return;
            }
            try {
                const xml = Blockly.Xml.workspaceToDom(workspace);
                const xmlText = Blockly.Xml.domToText(xml);

                const blob = new Blob([xmlText], { type: 'text/xml' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const ts = new Date().toISOString().replace(/[:.]/g, '-');
                a.href = url;
                a.download = `synthblockly_workspace_${ts}.xml`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                log('Workspace saved to XML file.');
            } catch (e) {
                log('Error saving workspace: ' + e);
                console.error('Error saving workspace', e);
            }
        });
    }

    // Load Workspace from XML
    const loadXmlBtn = document.getElementById('btnLoadXml');
    if (loadXmlBtn) {
        loadXmlBtn.addEventListener('click', () => {
            if (!workspace) {
                log('Workspace not ready.');
                return;
            }
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.xml,text/xml';
            input.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (!file) {
                    return;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    const xmlText = e.target.result;
                    try {
                        workspace.clear();
                        const xml = Blockly.utils.xml.textToDom(xmlText);
                        Blockly.Xml.domToWorkspace(xml, workspace);
                        log(`Workspace loaded from ${file.name}`);
                    } catch (err) {
                        log(`Error loading workspace: ${err}`);
                        console.error('Error loading workspace', err);
                    }
                };
                reader.readAsText(file);
            });
            input.click();
        });
    }

    // p5.js 波形
    new p5((p) => {
        p.setup = function () {
            const container = p.select('#waveformContainer');
            const c = p.createCanvas(container.width, container.height);
            c.parent('waveformContainer');
        };
        p.windowResized = function () {
            const container = p.select('#waveformContainer');
            p.resizeCanvas(container.width, container.height);
        };
        p.draw = function () {
            p.background(16);
            p.noFill();
            p.stroke(0, 200, 255);
            p.strokeWeight(2);
            const vals = analyser.getValue();
            if (!vals) return;
            const h = p.height;
            const w = p.width;
            p.beginShape();
            for (let i = 0; i < vals.length; i++) {
                const x = p.map(i, 0, vals.length, 0, w);
                const y = p.map(vals[i], -1, 1, h, 0);
                p.vertex(x, y);
            }
            p.endShape();
        };
    });

    const oneStart = async function () {
        await ensureAudioStarted();
        document.body.removeEventListener('pointerdown', oneStart);
    };
    document.body.addEventListener('pointerdown', oneStart, { passive: true });
});
