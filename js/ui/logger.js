import * as Blockly from 'blockly/core';

/**
 * Retrieves a translated message from Blockly.Msg and replaces placeholders (%1, %2, etc.) with provided arguments.
 * @param {string} key The translation key.
 * @param {...any} args Arguments to replace placeholders.
 * @returns {string} The translated and formatted message.
 */
export function getMsg(key, ...args) {
    let msg = Blockly.Msg[key] || key;
    args.forEach((arg, index) => {
        msg = msg.replace(`%${index + 1}`, arg);
    });
    return msg;
}

/**
 * Logs a translated message to the appropriate UI log panel.
 * @param {string} key The translation key.
 * @param {string} type The type of log ('info', 'error', 'warning').
 * @param {...any} args Arguments for the translated message.
 */
export function logKey(key, type = 'info', ...args) {
    const msg = getMsg(key, ...args);
    log(msg, type);
}

/**
 * Logs a message to the appropriate UI log panel based on type.
 * @param {string} msg The message to log.
 * @param {string} type The type of log ('info', 'error', etc.).
 */
export function log(msg, type = 'info') {
    let targetDiv;
    let effectiveType = type;

    // Map 'instrument' to 'error' for semantic clarity
    if (type === 'instrument') {
        effectiveType = 'error';
    }

    if (effectiveType === 'error' || effectiveType === 'warning') {
        targetDiv = document.getElementById('error-log');
    } else {
        targetDiv = document.getElementById('log');
    }

    if (targetDiv) {
        const messageElement = document.createElement('div');
        messageElement.textContent = msg;
        messageElement.classList.add('log-message');
        
        // Apply striping to both logs
        const logCount = targetDiv.children.length;
        messageElement.classList.add(logCount % 2 === 0 ? 'log-even' : 'log-odd');

        // Add type-specific class (e.g., for color)
        messageElement.classList.add(`log-${effectiveType}`);
        
        targetDiv.appendChild(messageElement);

        // Prune old log entries if the limit is exceeded
        const limit = (effectiveType === 'error' || effectiveType === 'warning') ? 50 : 100;
        while (targetDiv.children.length > limit) {
            targetDiv.removeChild(targetDiv.firstChild);
        }

        targetDiv.scrollTop = targetDiv.scrollHeight;
    }
}

/**
 * Clears all log entries from both general and error log panels.
 */
export function clearLogs() {
    const logDiv = document.getElementById('log');
    const errorLogDiv = document.getElementById('error-log');
    if (logDiv) logDiv.innerHTML = '';
    if (errorLogDiv) errorLogDiv.innerHTML = '';
}

/**
 * Initializes the logger functionality, such as the clear button.
 */
export function initLogger() {
    const clearLogBtn = document.getElementById('btnClearLog');
    if (clearLogBtn) {
        clearLogBtn.addEventListener('click', clearLogs);
    }
}

