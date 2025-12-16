// js/core/midiEngine.js
import { ensureAudioStarted, audioEngine } from './audioEngine.js';
import { log } from '../ui/logger.js';

let midiAccess = null;
let lastReportedDeviceCount = -1;
let midiNoteListeners = [];

// Function to register MIDI note event listeners for Blockly
export function registerMidiListener(callback) {
    if (typeof callback === 'function') {
        midiNoteListeners.push(callback);
    }
}

// Function to unregister MIDI note event listeners
export function unregisterMidiListener(callback) {
    midiNoteListeners = midiNoteListeners.filter(listener => listener !== callback);
}

/**
 * Updates the MIDI connection button UI and input listeners based on the current state.
 */
function _updateMIDIConnectionState() {
    const btnMidi = document.getElementById('btnMidi');
    if (!btnMidi) return;

    if (!midiAccess) {
        btnMidi.disabled = false;
        btnMidi.title = '連接 MIDI';
        log('錯誤: MIDIAccess 物件不存在。');
        return;
    }

    for (const input of midiAccess.inputs.values()) {
        input.onmidimessage = null;
    }

    const connectedInputs = Array.from(midiAccess.inputs.values()).filter(input => input.state === 'connected');
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
    const midiNoteNumber = data1;
    const channel = (status & 0x0f) + 1;

    if (cmd === 0x90 && data2 > 0) { // Note ON with velocity > 0
        audioEngine.log(`MIDI In ON: note=${midiNoteNumber} vel=${data2} ch=${channel}`);
        midiNoteListeners.forEach(listener => {
            try {
                // Pass raw velocity (0-127) to listeners
                listener(midiNoteNumber, data2, channel);
            } catch (e) {
                console.error('Error in MIDI listener callback:', e);
            }
        });
    } else if (cmd === 0x80 || (cmd === 0x90 && data2 === 0)) { // Note OFF
        audioEngine.log(`MIDI In OFF: note=${midiNoteNumber}`);
        audioEngine.midiRelease(midiNoteNumber);
    }
}

/**
 * Initializes the MIDI engine, including the connect button listener.
 */
export function initMidi() {
    const btnMidi = document.getElementById('btnMidi');
    if (!btnMidi) return;

    btnMidi.addEventListener('click', async () => {
        const ok = await ensureAudioStarted();
        if (!ok) return;

        if (midiAccess) {
            log('重新檢查 MIDI 裝置...');
            if (Array.from(midiAccess.inputs.values()).filter(input => input.state === 'connected').length === 0) {
                log('沒有偵測到 MIDI 裝置。');
            }
            _updateMIDIConnectionState();
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
            midiAccess = midi;

            midiAccess.onstatechange = (e) => {
                log(`MIDI 裝置狀態變更: ${e.port.name}, 狀態: ${e.port.state}`);
                _updateMIDIConnectionState();
            };
            
            _updateMIDIConnectionState();

        } catch(e) {
            log('MIDI 連接失敗: ' + e.message);
            console.error(e);
            btnMidi.disabled = false;
        }
    });
}
