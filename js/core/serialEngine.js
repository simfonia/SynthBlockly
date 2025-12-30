// js/core/serialEngine.js
import { ensureAudioStarted } from './audioEngine.js';
import { log, logKey } from '../ui/logger.js';

let serialPort = null;
let serialReader = null;
let serialBuffer = '';
let serialDataListeners = [];

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
    if (!('serial' in navigator)) {
        logKey('LOG_SERIAL_NOT_SUPPORTED', 'error');
        return;
    }
    try {
        serialPort = await navigator.serial.requestPort();
        await serialPort.open({ baudRate: 9600 });
        logKey('LOG_SERIAL_OPENED');
        const decoder = new TextDecoderStream();
        serialPort.readable.pipeTo(decoder.writable);
        serialReader = decoder.readable.getReader();
        readSerialLoop();
    } catch (e) {
        logKey('LOG_SERIAL_ERR', 'error', e);
    }
}

async function readSerialLoop() {
    try {
        while (true) {
            const { value, done } = await serialReader.read();
            if (done) break;
            if (value) {
                serialBuffer += value;
                let newlineIndex;
                while ((newlineIndex = serialBuffer.indexOf('\n')) !== -1) {
                    const line = serialBuffer.substring(0, newlineIndex).trim();
                    serialBuffer = serialBuffer.substring(newlineIndex + 1);
                    if (line) {
                        handleSerialLine(line);
                    }
                }
            }
        }
    } catch (e) {
        logKey('LOG_SERIAL_READ_ERR', 'error', e);
        serialBuffer = ''; // Reset buffer on error
    }
}

async function handleSerialLine(line) {
    logKey('LOG_SERIAL_MSG', 'info', line);
    const ok = await ensureAudioStarted();
    if (!ok) {
        logKey('LOG_AUDIO_NOT_ENABLED', 'warning');
        return;
    }

    serialDataListeners.forEach(listener => {
        try {
            listener(line);
        } catch (e) {
            console.error('Error in Serial listener callback:', e);
        }
    });
}

/**
 * Initializes the Serial engine, including the connect button listener.
 */
export function initSerial() {
    const btnSerial = document.getElementById('btnSerial');
    if (!btnSerial) return;

    btnSerial.addEventListener('click', async () => {
        const ok = await ensureAudioStarted();
        if (ok) {
            connectSerial();
        }
    });
}
