import { ensureAudioStarted } from './audioUtils.js';
import { audioEngine } from './audioEngine.js';
import { log, logKey, getMsg, clearErrorLog } from '../ui/logger.js';

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
        btnMidi.classList.remove('active');
        btnMidi.style.backgroundColor = '';
        btnMidi.style.color = '';
        btnMidi.title = getMsg('UI_BTN_CONNECT_MIDI');
        return;
    }

    for (const input of midiAccess.inputs.values()) {
        input.onmidimessage = null;
    }

    const connectedInputs = Array.from(midiAccess.inputs.values()).filter(input => input.state === 'connected');
    const hasStateChanged = connectedInputs.length !== lastReportedDeviceCount;
    lastReportedDeviceCount = connectedInputs.length;

    if (connectedInputs.length > 0) {
        clearErrorLog('MIDI'); // 成功連線，清除舊 MIDI 警告
        connectedInputs.forEach(input => {
            if (hasStateChanged) {
                logKey('LOG_MIDI_ATTACHING', 'info', input.name);
            }
            input.onmidimessage = onMIDIMessage;
        });
        if (hasStateChanged) {
            logKey('LOG_MIDI_CONNECTED', 'info', connectedInputs.length);
        }
        
        // 變綠色 (有裝置)
        btnMidi.classList.add('active');
        btnMidi.style.backgroundColor = '#75FB4C';
        btnMidi.style.color = 'black';
        const tooltipSuffix = getMsg('LOG_MIDI_CONNECTED_TOOLTIP') || '個 MIDI 裝置已連接 (點擊重新掃描)。';
        btnMidi.title = `${connectedInputs.length} ${tooltipSuffix}`;
    } else {
        if (hasStateChanged) {
            logKey('LOG_MIDI_NOT_FOUND', 'warning');
        }
        // 回復黑色 (無裝置)
        btnMidi.classList.remove('active');
        btnMidi.style.backgroundColor = '';
        btnMidi.style.color = '';
        btnMidi.title = getMsg('UI_BTN_CONNECT_MIDI');
    }
}

/**
 * Requests MIDI access and sets up listeners. Can be called automatically.
 */
export async function requestMidiAccess() {
    if (midiAccess) return; 

    if (!navigator.requestMIDIAccess) {
        logKey('LOG_MIDI_NOT_SUPPORTED', 'error');
        return;
    }

    try {
        logKey('LOG_MIDI_REQUESTING');
        const midi = await navigator.requestMIDIAccess();
        logKey('LOG_MIDI_GRANTED');
        clearErrorLog('MIDI'); // 權限獲得，清除可能存在的 MIDI 相關警告
        midiAccess = midi;

        midiAccess.onstatechange = (e) => {
            if (e.port.state === 'disconnected') {
                setTimeout(() => _updateMIDIConnectionState(), 100);
            } else {
                _updateMIDIConnectionState();
            }
        };
        
        _updateMIDIConnectionState();
    } catch(e) {
        logKey('LOG_MIDI_CONN_FAIL', 'error', e.message);
        console.error(e);
    }
}

async function onMIDIMessage(msg) {
    const ok = await ensureAudioStarted();
    if (!ok) return;

    const [status, data1, data2] = msg.data;
    const cmd = status & 0xf0;
    const midiNoteNumber = data1;
    const channel = (status & 0x0f) + 1;
    const deviceName = (msg.target && msg.target.name) ? msg.target.name : 'External';

    if (cmd === 0x90 && data2 > 0) { // Note ON with velocity > 0
        audioEngine.logKey('LOG_MIDI_ON', 'info', deviceName, midiNoteNumber, data2, channel, audioEngine.getTransposedNote(midiNoteNumber));
        // REMOVED: audioEngine.midiAttack(midiNoteNumber, data2 / 127, channel); 
        // We now rely entirely on the Blockly "sb_midi_note_received" block to trigger sounds via "sb_midi_play".
        
        midiNoteListeners.forEach(listener => {
            try {
                // Pass raw velocity (0-127) to listeners
                listener(midiNoteNumber, data2, channel);
            } catch (e) {
                console.error('Error in MIDI listener callback:', e);
            }
        });
    } else if (cmd === 0x80 || (cmd === 0x90 && data2 === 0)) { // Note OFF
        audioEngine.logKey('LOG_MIDI_OFF', 'info', midiNoteNumber);
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
            _updateMIDIConnectionState();
            return;
        }

        await requestMidiAccess();
    });
}
