// js/ui/logger.js

/**
 * Logs a message to the UI log panel.
 * @param {string} msg The message to log.
 */
export function log(msg) {
  const logDiv = document.getElementById('log');
  if (logDiv) {
    logDiv.innerText += msg + '\n';
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

