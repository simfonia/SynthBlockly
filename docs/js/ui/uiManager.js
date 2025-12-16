// js/ui/uiManager.js
import { log } from '../ui/logger.js'; // Assuming log is needed here

/**
 * Updates UI translations based on the current language.
 */
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

/**
 * Initializes UI-related features like translations and button hover effects.
 */
export function initUIManager() {
    updateUITranslations();
    log("UI Translations updated.");

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
    log("UI Manager initialized (translations and button effects).");
}
