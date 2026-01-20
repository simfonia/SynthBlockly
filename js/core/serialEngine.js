// js/core/serialEngine.js
import { ensureAudioStarted } from './audioEngine.js';
import { log, logKey, clearErrorLog, getMsg } from '../ui/logger.js';

let serialPort = null;
let serialReader = null;
let serialBuffer = '';

// Function to register Serial data event listeners for Blockly
window.registerSerialDataListener = function (callback) {
    if (typeof callback === 'function') {
        if (!window.__synthBlocklySerialListeners) window.__synthBlocklySerialListeners = [];
        if (!window.__synthBlocklySerialListeners.includes(callback)) {
            window.__synthBlocklySerialListeners.push(callback);
        }
    }
};

// Function to unregister Serial data event listeners
window.unregisterSerialDataListener = function (callback) {
    if (window.__synthBlocklySerialListeners) {
        window.__synthBlocklySerialListeners = window.__synthBlocklySerialListeners.filter(listener => listener !== callback);
    }
};

async function disconnectSerial() {
    if (serialReader) {
        try {
            await serialReader.cancel();
            serialReader.releaseLock();
            serialReader = null;
        } catch (e) { console.error("Error cancelling serial reader:", e); }
    }
    if (serialPort) {
        try {
            await serialPort.close();
        } catch (e) { 
            // Ignore 'The port is already closed' error
            console.warn("Serial close warning:", e); 
        } finally {
            serialPort = null;
        }
    }
    updateSerialButton(false);
    logKey('LOG_SERIAL_DISCONNECTED');
}

function updateSerialButton(isConnected) {
    const btnSerial = document.getElementById('btnSerial');
    if (!btnSerial) return;

    if (isConnected) {
        btnSerial.classList.add('active');
        btnSerial.style.backgroundColor = '#75FB4C'; // 使用指定綠色
        btnSerial.style.color = 'black'; // 淺綠色建議配黑色文字
        btnSerial.title = getMsg('UI_BTN_DISCONNECT_SERIAL');
    } else {
        btnSerial.classList.remove('active');
        btnSerial.style.backgroundColor = ''; // 回復預設 (黑色)
        btnSerial.style.color = '';
        btnSerial.title = getMsg('UI_BTN_CONNECT_SERIAL');
    }
}

async function connectSerial() {
    clearErrorLog('SERIAL');
    if (!('serial' in navigator)) {
        logKey('LOG_SERIAL_NOT_SUPPORTED', 'error');
        return;
    }
    try {
        serialPort = await navigator.serial.requestPort();
        await serialPort.open({ baudRate: 9600 });
        logKey('LOG_SERIAL_OPENED');
        updateSerialButton(true);
        
        // 直接從 port 讀取以避免 pipeTo 鎖定問題
        serialReader = serialPort.readable.getReader();
        readSerialLoop();
    } catch (e) {
        // Reset port on failure to avoid "port is already closed" on next click
        if (serialPort) {
             // Try to close if it was partially opened, though usually not needed if open() failed
             try { await serialPort.close(); } catch(err) {}
             serialPort = null;
        }

        if (e.name === 'NetworkError') {
            logKey('LOG_SERIAL_PORT_BUSY', 'error');
        } else if (e.name === 'NotFoundError') {
             // User cancelled the dialog
        } else {
            logKey('LOG_SERIAL_ERR', 'error', e.message || e);
        }
    }
}

async function readSerialLoop() {
    const decoder = new TextDecoder();
    try {
        while (true) {
            const { value, done } = await serialReader.read();
            if (done) {
                break;
            }
            if (value) {
                serialBuffer += decoder.decode(value);
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
        if (serialPort) { // 只有在不是主動斷開的情況下才報錯
            logKey('LOG_SERIAL_READ_ERR', 'error', e);
        }
        serialBuffer = ''; 
    } finally {
        if (serialReader) {
            serialReader.releaseLock();
        }
    }
}

async function handleSerialLine(line) {
    logKey('LOG_SERIAL_MSG', 'info', line);
    const ok = await ensureAudioStarted();
    if (!ok) {
        logKey('LOG_AUDIO_NOT_ENABLED', 'warning');
        return;
    }

    const listeners = window.__synthBlocklySerialListeners || [];
    listeners.forEach(listener => {
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
        if (serialPort) {
            await disconnectSerial();
        } else {
            const ok = await ensureAudioStarted();
            if (ok) {
                connectSerial();
            }
        }
    });
}
