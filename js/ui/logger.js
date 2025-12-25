// js/ui/logger.js

const MAX_LOG_LINES = 200; // Set a cap on the number of log lines

/**
 * Logs a message to the UI log panel.
 * @param {string} msg The message to log.
 */
let logCount = 0; // Module-scoped counter

/**
 * Logs a message to the UI log panel.
 * @param {string} msg The message to log.
 */
export function log(msg, type = 'info') { // ADD type parameter
  const logDiv = document.getElementById('log');
  if (logDiv) {
    logCount++;
    const messageElement = document.createElement('div');
    messageElement.textContent = msg;
    messageElement.classList.add('log-message');
    messageElement.classList.add(logCount % 2 === 0 ? 'log-even' : 'log-odd');
    if (type !== 'info') { // Add type-specific class
        messageElement.classList.add(`log-${type}`);
    }
    
    logDiv.appendChild(messageElement);

    // Prune old log entries if the limit is exceeded
    while (logDiv.children.length > MAX_LOG_LINES) {
        logDiv.removeChild(logDiv.firstChild);
    }

    logDiv.scrollTop = logDiv.scrollHeight;
  }
}

/**
 * Initializes the logger functionality, such as the clear button.
 */
export function initLogger() {
  const clearLogBtn = document.getElementById('btnClearLog');
  if (clearLogBtn) {
    clearLogBtn.addEventListener('click', () => {
      const logDiv = document.getElementById('log');
      if (logDiv) {
        logDiv.innerText = '';
      }
    });
  }
}

