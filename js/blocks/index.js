// js/blocks/index.js - Block-related registration manager
import * as Blockly from 'blockly/core';
import * as libraryBlocks from 'blockly/blocks';
import { javascriptGenerator } from 'blockly/javascript';

// --- i18n ---
// Locales are now loaded dynamically. See loadBlocklyLocale function.
// Import custom project-specific locales, as these are part of our source code.
import * as CustomLangZH from './lang/zh-hant.js';

// import 'blockly/blocks/field_textinput'; // Ensure FieldTextInput is loaded
// import 'blockly/blocks/mutator'; // Ensure Mutator is loaded

import { registerBlocks as registerInstrumentBlocks } from './instruments_blocks.js';
import { registerBlocks as registerMidiBlocks } from './midi_blocks.js';
import { registerBlocks as registerSerialBlocks } from './serial_blocks.js';
import { registerBlocks as registerKeyboardBlocks } from './keyboard_blocks.js';
import { registerBlocks as registerTransportBlocks } from './transport_blocks.js';
import { registerBlocks as registerEffectsBlocks } from './effects_blocks.js';
import { registerBlocks as registerMathBlocks } from './math_blocks.js';
import { registerBlocks as registerCustomWaveBlocks } from './instruments_custom_wave_blocks.js'; // NEW

import { registerGenerators as registerInstrumentGenerators } from './instruments_generators.js';
import { registerGenerators as registerMidiGenerators } from './midi_generators.js';
import { registerGenerators as registerSerialGenerators } from './serial_generators.js';
import { registerGenerators as registerKeyboardGenerators } from './keyboard_generators.js';
import { registerGenerators as registerTransportGenerators } from './transport_generators.js';
import { registerGenerators as registerEffectsGenerators } from './effects_generators.js';
import { registerGenerators as registerMathGenerators } from './math_generators.js';
import { registerGenerators as registerCustomWaveGenerators } from './instruments_custom_wave_generators.js'; // NEW

// --- End of Imports ---

/**
 * Dynamically loads a Blockly locale from the /locales/ public directory.
 * @param {string} localeCode The locale code, e.g., 'zh-hant'.
 */
async function loadBlocklyLocale(localeCode) {
    // This function now fetches locale data as JSON and pre-merges it before setting.
    const fetchLocale = async (code) => {
        const path = `${import.meta.env.BASE_URL}locales/${code}.json`;
        // console.log(`[Diag] Fetching locale from: ${path}`);
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to fetch locale data: ${response.status} ${response.statusText}`);
        }
        return response.json();
    };

    try {
        // Fetch the base locale data
        const baseLocaleData = await fetchLocale(localeCode);
        // console.log(`[Diag] Fetched base locale data. Sample (ADD_COMMENT):`, baseLocaleData.ADD_COMMENT);

        // Pre-merge base and custom locales into a single object
        const finalLocale = { ...baseLocaleData, ...CustomLangZH.MSG_ZH_HANT };
        // console.log(`[Diag] Merged custom locale data. Sample (MSG_SYNTHBLOCKLY_CATEGORY):`, finalLocale.MSG_SYNTHBLOCKLY_CATEGORY);

        // console.log('[Diag] Before Blockly.setLocale() with final merged object.');
        Blockly.setLocale(finalLocale);
        // console.log('[Diag] After Blockly.setLocale()');
        
        // console.log(`[Diag] Successfully fetched, merged, and set locale: ${localeCode}`);

    } catch (error) {
        console.error(`[Diag] CRITICAL: Failed to load locale ${localeCode}:`, error);
        // Fallback to English if loading fails
        try {
            const fallbackData = await fetchLocale('en');
            // Also merge custom messages for the fallback
            const finalFallbackLocale = { ...fallbackData, ...CustomLangZH.MSG_ZH_HANT };
            Blockly.setLocale(finalFallbackLocale);
            // console.log('[Diag] Fell back to English locale with custom messages.');
        } catch (fallbackError) {
            console.error('[Diag] CRITICAL: Failed to load even the fallback English locale:', fallbackError);
        }
    }
}


/**
 * Registers all blocks, generators, and languages.
 */
export async function registerAll() {
  try {
    // 1. Load language first
    await loadBlocklyLocale('zh-hant');

    // 2. Register built-in blocks
    Blockly.common.defineBlocks(libraryBlocks);

    // 3. Register Custom Blocks
    registerInstrumentBlocks(Blockly);
    registerMidiBlocks(Blockly);
    registerSerialBlocks(Blockly);
    registerKeyboardBlocks(Blockly);
    registerTransportBlocks(Blockly);
    registerEffectsBlocks(Blockly);
    registerMathBlocks(Blockly);
    registerCustomWaveBlocks(Blockly); // NEW: Register custom wave blocks
    console.log('Blocks registered.');

    // 4. Register Custom Generators
    registerInstrumentGenerators(Blockly, javascriptGenerator);
    registerMidiGenerators(Blockly, javascriptGenerator);
    registerSerialGenerators(Blockly, javascriptGenerator);
    registerKeyboardGenerators(Blockly, javascriptGenerator);
    registerTransportGenerators(Blockly, javascriptGenerator);
    registerEffectsGenerators(Blockly, javascriptGenerator);
    registerMathGenerators(Blockly, javascriptGenerator);
    registerCustomWaveGenerators(Blockly, javascriptGenerator); // NEW: Register custom wave generators
    console.log('Generators registered.');

  } catch (e) {
    console.error('Error during block registration process:', e);
  }
}