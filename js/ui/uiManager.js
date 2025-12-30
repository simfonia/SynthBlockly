// js/ui/uiManager.js
import * as Blockly from 'blockly/core';
import { log, logKey } from './logger.js'; // Corrected import path for sibling

/**
 * Updates UI translations based on the current language.
 */
function updateUITranslations() {
    const titleElements = document.querySelectorAll('[data-lang-title]');
    titleElements.forEach(el => {
        const key = el.getAttribute('data-lang-title');
        if (Blockly.Msg[key]) {
            el.title = Blockly.Msg[key];
        }
    });

    const textElements = document.querySelectorAll('[data-lang-text]');
    textElements.forEach(el => {
        const key = el.getAttribute('data-lang-text');
        if (Blockly.Msg[key]) {
            el.textContent = Blockly.Msg[key];
        }
    });
}

/**
 * Initializes UI-related features like translations and button hover effects.
 */
export function initUIManager() {
    updateUITranslations();
    logKey("LOG_UI_TRANS_UPDATED");

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
    logKey("LOG_UI_INIT");
}
