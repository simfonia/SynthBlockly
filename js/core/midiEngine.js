// js/core/midiEngine.js
import { ensureAudioStarted, audioEngine } from './audioEngine.js';
import { log, logKey } from '../ui/logger.js';

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
        logKey('LOG_MIDI_ACCESS_MISSING', 'error');
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
                logKey('LOG_MIDI_ATTACHING', 'info', input.name);
            }
            input.onmidimessage = onMIDIMessage;
        });
        if (hasStateChanged) {
            logKey('LOG_MIDI_CONNECTED', 'info', connectedInputs.length);
        }
        btnMidi.disabled = true;
        btnMidi.title = `${connectedInputs.length} 個 MIDI 裝置已連接。`;
    } else {
        if (hasStateChanged) {
            logKey('LOG_MIDI_NOT_FOUND', 'warning');
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
        audioEngine.midiAttack(midiNoteNumber, data2 / 127, channel);
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
            logKey('LOG_MIDI_RECHECKING');
            if (Array.from(midiAccess.inputs.values()).filter(input => input.state === 'connected').length === 0) {
                logKey('LOG_MIDI_NOT_FOUND', 'warning');
            }
            _updateMIDIConnectionState();
            return;
        }

        logKey('LOG_MIDI_REQUESTING');
        btnMidi.disabled = true;

        if (!navigator.requestMIDIAccess) {
            logKey('LOG_MIDI_NOT_SUPPORTED', 'error');
            btnMidi.disabled = false;
            return;
        }

        try {
            const midi = await navigator.requestMIDIAccess();
            logKey('LOG_MIDI_GRANTED');
            midiAccess = midi;

            midiAccess.onstatechange = (e) => {
                logKey('LOG_MIDI_STATE_CHANGE', 'info', e.port.name, e.port.state);
                // 針對斷線狀態，加入短暫延遲，確保瀏覽器有時間更新 midiAccess.inputs
                if (e.port.state === 'disconnected') {
                    setTimeout(() => _updateMIDIConnectionState(), 100);
                }
                else {
                    _updateMIDIConnectionState();
                }
            };
            
            _updateMIDIConnectionState();

        } catch(e) {
            logKey('LOG_MIDI_CONN_FAIL', 'error', e.message);
            console.error(e);
            btnMidi.disabled = false;
        }
    });
}
