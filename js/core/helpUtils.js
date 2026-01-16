/**
 * Help URL Utility for SynthBlockly
 * Handles language switching and Vite base URL resolution for documentation links.
 */

/**
 * Returns a function that generates the correct Help URL based on the current language.
 * 
 * @param {string} baseFilename - The base filename of the documentation (e.g., "effect_readme").
 *                                Do not include language suffix or extension.
 * @returns {function} A function to be passed to block.setHelpUrl().
 */
export function getHelpUrl(baseFilename) {
    return function() {
        const lang = window.currentLanguage || 'en';
        // Mapping logic: 'zh-hant' -> '_zh-hant.html', others -> '_en.html'
        const suffix = (lang === 'zh-hant') ? '_zh-hant' : '_en';
        
        // Construct full URL using Vite's BASE_URL
        // Example: /base/path/docs/effect_readme_zh-hant.html
        return `${import.meta.env.BASE_URL}docs/${baseFilename}${suffix}.html`;
    };
}
