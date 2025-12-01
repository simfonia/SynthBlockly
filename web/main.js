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
const synth = new Tone.PolySynth(Tone.Synth).toDestination();
const analyser = new Tone.Analyser('waveform', 1024);
synth.connect(analyser);

const drum = new Tone.MembraneSynth().toDestination();
const hh = new Tone.NoiseSynth({ volume: -12 }).toDestination();

let audioStarted = false;

function log(msg) {
    const d = document.getElementById('log');
    d.innerText += msg + '\n';
    d.scrollTop = d.scrollHeight;
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
    const ok = await ensureAudioStarted();
    if (!ok) return;

    log('Serial: ' + line);
    log('Calling serial listeners...'); // Debug log
    // Dispatch to all registered Blockly Serial listeners
    serialDataListeners.forEach(listener => {
        try {
            listener(line);
        } catch (e) {
            console.error('Error in Serial listener callback:', e);
        }
    });
}

function playKick() {
    log('playKick() called!'); // Debug log
    drum.triggerAttackRelease('C2', '8n');
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
                const pbsxGens = ['play_note', 'sb_play_drum', 'sb_set_adsr'];
                for (const name of pbsxGens) {
                    if (Blockly.JavaScript[name] && !Blockly.JavaScript.forBlock[name]) {
                        Blockly.JavaScript.forBlock[name] = Blockly.JavaScript[name];
                    }
                }
            }
        } catch (e) { console.warn('forBlock sync failed', e); }

        const code = Blockly.JavaScript.workspaceToCode(workspace);
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

    document.getElementById('btnTestDrum').addEventListener('click', async () => {
        const ok = await ensureAudioStarted();
        if (ok) playKick();
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
            try {
                const runner = new Function('Tone', 'synth', 'drum', 'hh', 'playKick', 'log', code + '\n');
                runner(Tone, synth, drum, hh, playKick, log);
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
