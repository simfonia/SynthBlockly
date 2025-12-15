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
let midiAccess = null;
let lastReportedDeviceCount = -1;
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
}).connect(analyser); // This needs to be changed to connect to the effect chain instead of analyser

// --- NEW CODE STARTS HERE ---

// Create effect instances
// Tone.Distortion: 失真效果
const distortionEffect = new Tone.Distortion(0.0);
// Tone.Reverb: 混響效果
const reverbEffect = new Tone.Reverb(1.5);
// Tone.FeedbackDelay: 延遲效果
const feedbackDelayEffect = new Tone.FeedbackDelay("8n", 0.25);

// Set initial wetness to 0, meaning effects are bypassed by default.
// Use .wet.value for enabling/disabling the effect without breaking the chain.
distortionEffect.wet.value = 0;
reverbEffect.wet.value = 0;
feedbackDelayEffect.wet.value = 0;

// Chain the main synthesizers/samplers through the effects.
// All instruments will pass through this common effects chain.
// Order: Distortion -> FeedbackDelay -> Reverb -> Analyser -> Destination
synth.chain(distortionEffect, feedbackDelayEffect, reverbEffect, analyser);
drum.chain(distortionEffect, feedbackDelayEffect, reverbEffect, analyser);
hh.chain(distortionEffect, feedbackDelayEffect, reverbEffect, analyser);
snare.chain(distortionEffect, feedbackDelayEffect, reverbEffect, analyser);

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
    baseUrl: './assets/samples/jazzkit/Roland_TR-909/',
    onload: () => {
        console.log('Jazz Kit samples loaded.');
    }
}).chain(distortionEffect, feedbackDelayEffect, reverbEffect, analyser); // Also chain jazzKit

// --- END NEW CODE ---

let audioStarted = false;

// --- Create and expose a single Audio Engine object ---
const audioEngine = {
    Tone: Tone,
    synth: synth, // Keep reference to original synth, but will be primarily accessed via instruments['預設合成器']
    drum: drum,
    hh: hh,
    snare: snare,
    jazzKit: jazzKit,
    // Store the effects within audioEngine as well
    effects: {
        distortion: distortionEffect,
        reverb: reverbEffect,
        feedbackDelay: feedbackDelayEffect
    },
    instruments: {}, // NEW: Object to store dynamically created instruments
    currentInstrumentName: 'DefaultSynth', // NEW: Name of the currently selected instrument
    pressedKeys: new Map(), // NEW: Moved pressedKeys into audioEngine
    chords: {}, // NEW: Object to store user-defined chords
    keyboardChordMap: {}, // NEW: Object to store PC keyboard key-to-chord mappings
    midiChordMap: {}, // NEW: Object to store MIDI note-to-chord mappings
    midiPressedNotes: new Map(), // NEW: Map to store notes/chords currently pressed via MIDI
    midiPlayingNotes: new Map(), // NEW: Map to store notes started via Blockly MIDI Play block

    log: function(msg) {
        const d = document.getElementById('log');
        if (d) {
            d.innerText += msg + '\n';
            d.scrollTop = d.scrollHeight;
        }
    },
    // NEW: Helper to create and store instruments
    createInstrument: function(name, type) {
        if (!name) {
            this.log('錯誤: 樂器名稱不能為空。');
            return;
        }
        if (this.instruments[name]) {
            this.log(`警告: 樂器 "${name}" 已存在，將被覆蓋。`);
            this.instruments[name].dispose(); // Dispose old instance
        }
        let newInstrument;
        try {
            switch(type) {
                case 'PolySynth':
                    newInstrument = new Tone.PolySynth(Tone.Synth).connect(analyser).toDestination();
                    break;
                case 'AMSynth':
                    newInstrument = new Tone.PolySynth(Tone.AMSynth).connect(analyser).toDestination();
                    break;
                case 'FMSynth':
                    newInstrument = new Tone.PolySynth(Tone.FMSynth).connect(analyser).toDestination();
                    break;
                case 'DuoSynth':
                    newInstrument = new Tone.PolySynth(Tone.DuoSynth).connect(analyser).toDestination();
                    break;
                case 'Sampler': // Limited Sampler for now, no complex URL input
                    newInstrument = new Tone.Sampler({
                        urls: {
                            "C4": "C4.mp3", // Make this relative to baseUrl
                        },
                        release: 1,
                        baseUrl: "https://tonejs.github.io/audio/salamander/"
                    }).connect(analyser).toDestination();
                    // Sampler needs to load, so log when loaded
                    newInstrument.onload = () => this.log(`樂器 "${name}" (Sampler) 樣本已載入。`);
                    break;
                default:
                    this.log(`錯誤: 未知的樂器類型 "${type}"。`);
                    return;
            }
            this.instruments[name] = newInstrument;
            this.log(`成功創建樂器 "${name}" (${type})。`);
        } catch (e) {
            this.log(`創建樂器 "${name}" (${type}) 失敗: ${e.message}`); // Changed this line
            console.error(e); // Keep console.error for developers
        }
    },
    playKick: async function(velocity = 1, time = Tone.now()) {
        const ok = await ensureAudioStarted();
        if (ok) {
            this.drum.triggerAttackRelease('C2', '8n', time, velocity);
        }
    },
    playSnare: async function(velocity = 1, time = Tone.now()) {
        const ok = await ensureAudioStarted();
        if (ok) {
            this.snare.triggerAttackRelease('8n', time, velocity);
        }
    },
    // NEW: Function to play Jazz Kit with logging
    playJazzKitNote: async function(drumNote, velocityOverride, time, contextNote, contextVelocity) {
        const ok = await ensureAudioStarted();
        if (!ok) return;

        // Determine the final velocity. Prioritize the override from the block input.
        // If no override, use context velocity. If no context, default to 1.
        const finalVelocity = velocityOverride !== null ? velocityOverride : (contextVelocity !== null ? contextVelocity : 1);

        let logMessage = `Jazz Kit Play: note=${drumNote} vel=${finalVelocity.toFixed(2)}`;
        if (contextNote !== null) {
            logMessage += ` (triggered by MIDI ${contextNote})`;
        }
        this.log(logMessage);

        this.jazzKit.triggerAttackRelease(drumNote, '8n', time, finalVelocity);
    },
    // NEW: Function to clear pressed keys from the PC keyboard controller
    clearPressedKeys: function() {
        this.pressedKeys.clear();
        this.midiPressedNotes.clear(); // NEW: Clear MIDI pressed notes
        this.midiPlayingNotes.clear(); // NEW: Clear notes played via MIDI Blockly blocks
        this.log('PC 鍵盤及 MIDI 按下狀態已清除。');
    },
    // NEW: Function to play a note on the currently selected instrument
    playCurrentInstrumentNote: async function(note, dur, time, velocity) {
        const ok = await ensureAudioStarted();
        if (ok) {
            const currentInstrument = this.instruments[this.currentInstrumentName];
            if (currentInstrument && currentInstrument.triggerAttackRelease) {
                // NEW: If it's a Sampler, ensure it's loaded before triggering
                // Tone.Sampler's 'loaded' property is a boolean.
                if (currentInstrument instanceof Tone.Sampler && !currentInstrument.loaded) {
                    this.log(`警告: 樂器 "${this.currentInstrumentName}" (Sampler) 樣本尚未載入。`);
                    return;
                }
                currentInstrument.triggerAttackRelease(note, dur, time, velocity);
            } else {
                this.log(`錯誤: 無法播放音符。樂器 "${this.currentInstrumentName}" 不存在或不支持 triggerAttackRelease。`);
            }
        }
    },
    // NEW: Function to handle MIDI note attack from Blockly
    midiAttack: async function(midiNoteNumber, velocityNormalized = 1, channel) {
        const ok = await ensureAudioStarted();
        if (!ok) return;

        const currentInstrument = this.instruments[this.currentInstrumentName];
        if (!currentInstrument || !currentInstrument.triggerAttack || !currentInstrument.triggerRelease) {
            this.log(`錯誤: MIDI 播放失敗。樂器 "${this.currentInstrumentName}" 不存在或不支持 triggerAttack/Release。`);
            return;
        }
        if (currentInstrument instanceof Tone.Sampler && !currentInstrument.loaded) {
            this.log(`警告: MIDI 播放失敗。樂器 "${this.currentInstrumentName}" (Sampler) 樣本尚未載入。`);
            return;
        }

        // Check for MIDI Chord Mapping
        const chordName = this.midiChordMap[midiNoteNumber];
        let notesToPlay = null; // Can be a string (single note) or an array of strings (chord)
        let notePlayedType = 'Single';

        if (chordName) {
            notesToPlay = this.chords[chordName];
            notePlayedType = 'Chord';
            if (!notesToPlay) {
                this.log(`錯誤: 和弦 "${chordName}" 未定義。`);
                return;
            }
        } else {
            // If not a Chord, play single note
            notesToPlay = Tone.Midi(midiNoteNumber).toNote(); // Convert MIDI number to note string
        }

        if (notesToPlay) {
            currentInstrument.triggerAttack(notesToPlay, Tone.now(), velocityNormalized);
            this.midiPlayingNotes.set(midiNoteNumber, notesToPlay); // Store the notes that were attacked
            this.log(`MIDI In ON (${notePlayedType}): midi=${midiNoteNumber} vel=${(velocityNormalized*127).toFixed(0)} ch=${channel} -> ${Array.isArray(notesToPlay) ? notesToPlay.join(', ') : notesToPlay}`);
        }
    },

    // NEW: Function to handle MIDI note release (called by onMIDIMessage)
    midiRelease: async function(midiNoteNumber) {
        const ok = await ensureAudioStarted();
        if (!ok) return;

        const currentInstrument = this.instruments[this.currentInstrumentName];
        if (!currentInstrument || !currentInstrument.triggerRelease) {
            // Log this error, but don't stop execution. It might be a release for a note not attacked by Blockly.
            this.log(`警告: MIDI 釋放失敗。樂器 "${this.currentInstrumentName}" 不存在或不支持 triggerRelease。`);
            return;
        }
        if (currentInstrument instanceof Tone.Sampler && !currentInstrument.loaded) {
            this.log(`警告: MIDI 釋放失敗。樂器 "${this.currentInstrumentName}" (Sampler) 樣本尚未載入。`);
            return;
        }

        const notesToRelease = this.midiPlayingNotes.get(midiNoteNumber);

        if (notesToRelease) {
            currentInstrument.triggerRelease(notesToRelease, Tone.now());
            this.midiPlayingNotes.delete(midiNoteNumber); // Remove from playing map
        }
    },

    // --- NEW: Panic function to stop all sounds and reset state ---
    panicStopAllSounds: function() {
        this.log('緊急停止！正在停止所有聲音並重設狀態...');
        
        // 1. Stop the master transport
        this.Tone.Transport.stop();
        this.log('✓ 主時鐘 (Transport) 已停止');

        // 2. Release all notes on all instruments
        for (const instrName in this.instruments) {
            if (this.instruments.hasOwnProperty(instrName)) {
                const instrument = this.instruments[instrName];
                if (instrument && typeof instrument.releaseAll === 'function') {
                    instrument.releaseAll();
                }
            }
        }
        this.log('✓ 所有樂器聲音已釋放');

        // 3. Stop and dispose of all Blockly loops
        if (window.blocklyLoops) {
            for (const loopId in window.blocklyLoops) {
                if (window.blocklyLoops.hasOwnProperty(loopId) && window.blocklyLoops[loopId] instanceof this.Tone.Loop) {
                    window.blocklyLoops[loopId].dispose();
                }
            }
            window.blocklyLoops = {}; // Clear the object
            this.log('✓ 所有 Blockly 循環已停止');
        }

        // 4. Clear all input tracking states
        this.clearPressedKeys();

        this.log('緊急停止完成。');
    }
};
window.audioEngine = audioEngine;

// NEW: Initialize default synth as an instrument and set it as current
audioEngine.instruments['DefaultSynth'] = synth;
audioEngine.currentInstrumentName = 'DefaultSynth';
// --- Button Event Listeners ---
// ... (previous button listeners) ...

const btnPanicStop = document.getElementById('btnPanicStop');
if (btnPanicStop) {
    btnPanicStop.addEventListener('click', () => {
        window.audioEngine.panicStopAllSounds();
    });
}


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

/**
 * Updates the MIDI connection button UI and input listeners based on the current state.
 * @param {MIDIAccess} midi - The global MIDIAccess object.
 */
function _updateMIDIConnectionState(midi) {
    const btnMidi = document.getElementById('btnMidi');
    if (!btnMidi) return; // UI not ready

    if (!midi) {
        btnMidi.disabled = false;
        btnMidi.title = '連接 MIDI';
        log('錯誤: MIDIAccess 物件不存在。');
        return;
    }

    // Clean up all previous onmidimessage handlers to avoid duplicates
    for (const input of midi.inputs.values()) {
        input.onmidimessage = null;
    }

    const connectedInputs = Array.from(midi.inputs.values()).filter(input => input.state === 'connected');

    const hasStateChanged = connectedInputs.length !== lastReportedDeviceCount;
    lastReportedDeviceCount = connectedInputs.length;

    if (connectedInputs.length > 0) {
        connectedInputs.forEach(input => {
            if (hasStateChanged) {
                log(`正在為裝置附加監聽器: ${input.name}`);
            }
            input.onmidimessage = onMIDIMessage;
        });
        if (hasStateChanged) {
            log(`${connectedInputs.length} 個 MIDI 裝置已連接。`);
        }
        btnMidi.disabled = true;
        btnMidi.title = `${connectedInputs.length} 個 MIDI 裝置已連接。`;
    } else {
        if (hasStateChanged) {
            log('沒有偵測到 MIDI 裝置。');
        }
        btnMidi.disabled = false;
        btnMidi.title = '連接 MIDI';
    }
}


async function onMIDIMessage(msg) {
    const ok = await ensureAudioStarted();
    if (!ok) return;

    const [status, data1, data2] = msg.data;
    const cmd = status & 0xf0;
    const midiNoteNumber = data1; // MIDI note number (0-127)
    const channel = (status & 0x0f) + 1; // Extract MIDI channel (1-16)

    if (cmd === 0x90 && data1 > 0) { // Note ON
        window.audioEngine.log(`MIDI In ON: note=${midiNoteNumber} vel=${data2} ch=${channel}`);
        midiNoteListeners.forEach(listener => {
            try {
                listener(midiNoteNumber, data2, channel);
            } catch (e) {
                console.error('Error in MIDI listener callback:', e);
            }
        });
    } else if (cmd === 0x80 || (cmd === 0x90 && data1 === 0)) { // Note OFF
        window.audioEngine.log(`MIDI In OFF: note=${midiNoteNumber}`);
        window.audioEngine.midiRelease(midiNoteNumber); // Call midiRelease for sustained notes
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
            
            button.addEventListener('mouseover', () => {
                if (!button.disabled) {
                    img.src = hoverSrc;
                }
            });
            button.addEventListener('mouseout', () => {
                img.src = originalSrc;
            });
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
    const btnMidi = document.getElementById('btnMidi');
    btnMidi.addEventListener('click', async () => {
        const ok = await ensureAudioStarted();
        if (!ok) return;

        // If we already have access, just run the update logic.
        // This handles cases where the user clicks the button after a device was unplugged.
                if (midiAccess) {
                    log('重新檢查 MIDI 裝置...');
                    if (Array.from(midiAccess.inputs.values()).filter(input => input.state === 'connected').length === 0) {
                         log('沒有偵測到 MIDI 裝置。');
                    }
                    _updateMIDIConnectionState(midiAccess);
                    return;
                }
        log('正在請求 MIDI 連接權限...');
        btnMidi.disabled = true;

        if (!navigator.requestMIDIAccess) {
            log('錯誤: 您的瀏覽器不支援 Web MIDI API。');
            btnMidi.disabled = false;
            return;
        }

        try {
            const midi = await navigator.requestMIDIAccess();
            log('MIDI 存取權限已授予。');
            midiAccess = midi; // Store the access object globally

            // Set a persistent state change handler
            midiAccess.onstatechange = (e) => {
                log(`MIDI 裝置狀態變更: ${e.port.name}, 狀態: ${e.port.state}`);
                _updateMIDIConnectionState(midiAccess);
            };
            
            // Perform the initial check and update UI
            _updateMIDIConnectionState(midiAccess);

        } catch(e) {
            log('MIDI 連接失敗: ' + e.message);
            console.error(e);
            btnMidi.disabled = false; // Re-enable on failure
        }
    });

    document.getElementById('btnSerial').addEventListener('click', async () => {
        const ok = await ensureAudioStarted();
        if (ok) connectSerial();
    });

    document.getElementById('btnTestNote').addEventListener('click', async () => {
        const ok = await ensureAudioStarted();
        if (ok) synth.triggerAttackRelease('A4', '8n');
    });

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

    // --- NEW: PC Keyboard as MIDI Controller ---
    const KEY_TO_NOTE_MAP = {
        // Main Octave (e.g., C4 to B4)
        'KeyQ': 'C', 'Digit2': 'C#', 'KeyW': 'D', 'Digit3': 'D#', 'KeyE': 'E',
        'KeyR': 'F', 'Digit5': 'F#', 'KeyT': 'G', 'Digit6': 'G#', 'KeyY': 'A',
        'Digit7': 'A#', 'KeyU': 'B',

        // Next octave relative to currentOctave + 1
        'KeyI': 'C',      // C of next octave
        'Digit9': 'C#',   // C# of next octave
        'KeyO': 'D',      // D of next octave
        'Digit0': 'D#',   // D# of next octave
        'KeyP': 'E',      // E of next octave
        'BracketLeft': 'F', // F of next octave
        'BracketRight': 'G', // G of next octave
        'Backslash': 'A'    // A of next octave
    };
    // const HIGH_C_KEY = 'KeyI'; // No longer needed


    let isPcKeyboardMidiEnabled = false;
    let currentOctave = 4; // Starting octave
    const MIN_OCTAVE = 0;
    const MAX_OCTAVE = 8; // Tone.js usually supports C0 to C8

    const updateLogOctave = () => {
        log(`當前八度: ${currentOctave}`);
    };

    const shiftOctave = (direction) => { // direction: 1 for up, -1 for down
        currentOctave += direction;
        if (currentOctave < MIN_OCTAVE) currentOctave = MIN_OCTAVE;
        if (currentOctave > MAX_OCTAVE) currentOctave = MAX_OCTAVE;
        updateLogOctave();
    };

    const getNoteForKeyCode = (keyCode) => {
        const baseNote = KEY_TO_NOTE_MAP[keyCode];
        if (!baseNote) return null;

        let noteOctave = currentOctave;
        
        // Determine if the key belongs to the base octave block or the next octave block
        const baseOctaveKeys = ['KeyQ', 'Digit2', 'KeyW', 'Digit3', 'KeyE', 'KeyR', 'Digit5', 'KeyT', 'Digit6', 'KeyY', 'Digit7', 'KeyU'];
        const nextOctaveKeys = ['KeyI', 'Digit9', 'KeyO', 'Digit0', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash']; // Keys for the next octave

        if (nextOctaveKeys.includes(keyCode)) {
            noteOctave = currentOctave + 1;
        }

        return `${baseNote}${noteOctave}`;
    };

    const handleKeyDown = async (e) => {
        if (!isPcKeyboardMidiEnabled || e.repeat) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        // Octave Shift Keys
        if ((e.code === 'KeyZ' || e.code === 'Minus' || e.code === 'NumpadSubtract') && currentOctave > MIN_OCTAVE) {
            shiftOctave(-1);
            e.preventDefault();
            return;
        }
        if ((e.code === 'KeyX' || e.code === 'Equal' || e.code === 'NumpadAdd') && currentOctave < MAX_OCTAVE) {
            shiftOctave(1);
            e.preventDefault();
            return;
        }

        let notesToPlay = null; // Can be a string (single note) or an array of strings (chord)
        let notePlayedType = 'Single';

        // 1. Check for Chord Mapping first
        const chordName = window.audioEngine.keyboardChordMap[e.code];
        if (chordName) {
            notesToPlay = window.audioEngine.chords[chordName];
            notePlayedType = 'Chord';
            if (!notesToPlay) {
                window.audioEngine.log(`錯誤: 和弦 "${chordName}" 未定義。`);
                return;
            }
        } else {
            // 2. If not a Chord, check for Single Note Mapping
            notesToPlay = getNoteForKeyCode(e.code); // This returns a single note string
            if (!notesToPlay) return; // Not a mapped key
        }

        // Only proceed if a note/chord is found and not already pressed
        if (notesToPlay && !window.audioEngine.pressedKeys.has(e.code)) {
            const ok = await ensureAudioStarted();
            if (!ok) return;

            const currentInstrument = window.audioEngine.instruments[window.audioEngine.currentInstrumentName];
            if (!currentInstrument || !currentInstrument.triggerAttack) {
                window.audioEngine.log(`錯誤: PC鍵盤無法播放。樂器 "${window.audioEngine.currentInstrumentName}" 不存在或不支持 triggerAttack。`);
                return;
            }
            if (currentInstrument instanceof Tone.Sampler && !currentInstrument.loaded) {
                window.audioEngine.log(`警告: PC鍵盤無法播放。樂器 "${window.audioEngine.currentInstrumentName}" (Sampler) 樣本尚未載入。`);
                return;
            }

            const velocity = 0.7;
            currentInstrument.triggerAttack(notesToPlay, Tone.now(), velocity); // Trigger attack with note or array of notes
            window.audioEngine.pressedKeys.set(e.code, notesToPlay); // Store the note/chord with the key code
            window.audioEngine.log(`Keyboard ON (${notePlayedType}): ${Array.isArray(notesToPlay) ? notesToPlay.join(', ') : notesToPlay}`);
            e.preventDefault();
        }
    };

    const handleKeyUp = async (e) => {
        if (!isPcKeyboardMidiEnabled) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        // Prevent release for octave shift keys
        if (e.code === 'KeyZ' || e.code === 'KeyX' || e.code === 'Minus' || e.code === 'Equal' || e.code === 'NumpadSubtract' || e.code === 'NumpadAdd') return;

        const note = window.audioEngine.pressedKeys.get(e.code);
        if (note) {
            const ok = await ensureAudioStarted();
            if (!ok) {
                window.audioEngine.pressedKeys.delete(e.code);
                return;
            }

            const currentInstrument = window.audioEngine.instruments[window.audioEngine.currentInstrumentName];
            if (!currentInstrument || !currentInstrument.triggerRelease) {
                window.audioEngine.log(`錯誤: PC鍵盤無法釋放。樂器 "${window.audioEngine.currentInstrumentName}" 不存在或不支持 triggerRelease。`);
                window.audioEngine.pressedKeys.delete(e.code); // Clear the pressed key even if release fails
                return;
            }
            // NEW: Sampler loaded check
            if (currentInstrument instanceof Tone.Sampler && !currentInstrument.loaded) {
                window.audioEngine.log(`警告: PC鍵盤無法釋放。樂器 "${window.audioEngine.currentInstrumentName}" (Sampler) 樣本尚未載入。`);
                window.audioEngine.pressedKeys.delete(e.code); // Clear the pressed key even if release fails
                return;
            }

            currentInstrument.triggerRelease(note, Tone.now());
            window.audioEngine.pressedKeys.delete(e.code);
            window.audioEngine.log(`Keyboard OFF: ${e.code} -> ${note}`);
            e.preventDefault();
        }
    };

    // Expose functions to enable/disable PC Keyboard MIDI
    window.audioEngine.enablePcKeyboardMidi = () => {
        if (!isPcKeyboardMidiEnabled) {
            document.addEventListener('keydown', handleKeyDown);
            document.addEventListener('keyup', handleKeyUp);
            isPcKeyboardMidiEnabled = true;
            log('PC 鍵盤 MIDI 功能已開啟');
            updateLogOctave(); // Log current octave when enabled
        }
    };

    window.audioEngine.disablePcKeyboardMidi = () => {
        if (isPcKeyboardMidiEnabled) {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            isPcKeyboardMidiEnabled = false;
            log('PC 鍵盤 MIDI 功能已關閉');
            pressedKeys.clear(); // Clear any lingering pressed keys
        }
    };
    
    // Default to disabled
    window.audioEngine.disablePcKeyboardMidi(); 
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
