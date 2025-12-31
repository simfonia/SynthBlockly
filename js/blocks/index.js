// js/blocks/index.js - Block-related registration manager
import * as Blockly from 'blockly/core';
import * as libraryBlocks from 'blockly/blocks';
import { javascriptGenerator } from 'blockly/javascript';

// --- i18n ---
// Locales are now loaded dynamically. See loadBlocklyLocale function.
// NO hardcoded import for custom project-specific locales here anymore.

// import 'blockly/blocks/field_textinput'; // Ensure FieldTextInput is loaded
// import 'blockly/blocks/mutator'; // Ensure Mutator is loaded

import { registerBlocks as registerInstrumentBlocks } from './instruments_blocks.js';
import { registerBlocks as registerMidiBlocks } from './midi_blocks.js';
import { registerBlocks as registerSerialBlocks } from './serial_blocks.js';
import { registerBlocks as registerKeyboardBlocks } from './keyboard_blocks.js';
import { registerBlocks as registerTransportBlocks } from './transport_blocks.js';
import { registerBlocks as registerEffectsBlocks } from './effects_blocks.js';
import { registerBlocks as registerMathBlocks } from './math_blocks.js';
import { registerBlocks as registerNoiseBlocks } from './noise_blocks.js';
import { registerBlocks as registerCustomWaveBlocks } from './instruments_custom_wave_blocks.js'; // NEW
import { registerBlocks as registerSamplerBlocks } from './sampler_blocks.js'; // NEW
import { registerBlocks as registerSfxBlocks } from './sfx_blocks.js'; // NEW

import { registerGenerators as registerInstrumentGenerators } from './instruments_generators.js';
import { registerGenerators as registerMidiGenerators } from './midi_generators.js';
import { registerGenerators as registerSerialGenerators } from './serial_generators.js';
import { registerGenerators as registerKeyboardGenerators } from './keyboard_generators.js';
import { registerGenerators as registerTransportGenerators } from './transport_generators.js';
import { registerGenerators as registerEffectsGenerators } from './effects_generators.js';
import { registerGenerators as registerMathGenerators } from './math_generators.js';
import { registerGenerators as registerNoiseGenerators } from './noise_generators.js';
import { registerGenerators as registerCustomWaveGenerators } from './instruments_custom_wave_generators.js'; // NEW
import { registerGenerators as registerSamplerGenerators } from './sampler_generators.js'; // NEW
import { registerGenerators as registerSfxGenerators } from './sfx_generators.js'; // NEW

// --- End of Imports ---

/**
 * Dynamically loads a Blockly locale from the /locales/ public directory and merges
 * it with SynthBlockly's custom language strings.
 * @param {string} currentLang The detected language code from window.currentLanguage (e.g., 'zh-hant', 'en').
 */
async function loadBlocklyLocale(currentLang) {
    // Determine which base Blockly locale to load from the public folder
    const blocklyLocaleCode = currentLang;

    // Fetch the base Blockly locale data
    const fetchBaseLocale = async (code) => {
        const path = `${import.meta.env.BASE_URL}locales/${code}.json`;
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to fetch base Blockly locale data: ${response.status} ${response.statusText}`);
        }
        return response.json();
    };

    // Dynamically import SynthBlockly's custom language data (e.g., ./lang/zh-hant.js)
    const fetchCustomLocale = async (code) => {
        try {
            const module = await import(`./lang/${code}.js`);
            // Custom language modules export an object like MSG_ZH_HANT or MSG_EN
            return module[`MSG_${code.toUpperCase().replace('-', '_')}`];
        } catch (error) {
            console.warn(`Failed to load custom locale for ${code}. Falling back to 'en' for custom strings.`, error);
            // If specific custom locale fails, try to load custom 'en' as fallback
            const enModule = await import(`./lang/en.js`);
            return enModule.MSG_EN;
        }
    };


    try {
        const baseLocaleData = await fetchBaseLocale(blocklyLocaleCode);
        const customLocaleData = await fetchCustomLocale(blocklyLocaleCode); // Use blocklyLocaleCode for custom too

        // Merge base Blockly and custom SynthBlockly locales
        const finalLocale = { ...baseLocaleData, ...customLocaleData };
        Blockly.setLocale(finalLocale);
        
        console.log(`Successfully fetched, merged, and set locale: ${blocklyLocaleCode} (custom: ${blocklyLocaleCode})`);

    } catch (error) {
        console.error(`CRITICAL: Failed to load locale ${blocklyLocaleCode}:`, error);
        // Fallback to English if any part of loading (base or custom) fails
        try {
            const fallbackBaseData = await fetchBaseLocale('en');
            const fallbackCustomData = await fetchCustomLocale('en'); // Use 'en' for custom fallback
            const finalFallbackLocale = { ...fallbackBaseData, ...fallbackCustomData };
            Blockly.setLocale(finalFallbackLocale);
            console.log('Fell back to English locale with custom messages.');
        } catch (fallbackError) {
            console.error('CRITICAL: Failed to load even the fallback English locale:', fallbackError);
        }
    }
}


/**
 * Registers all blocks, generators, and languages.
 */
export async function registerAll() {
  try {
    // 1. Load language first, using window.currentLanguage
    // window.currentLanguage is set in index.html, defaulting to 'en' if not detected.
    await loadBlocklyLocale(window.currentLanguage || 'en'); 

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
    registerNoiseBlocks(Blockly);
    registerCustomWaveBlocks(Blockly); // NEW
    registerSamplerBlocks(Blockly); // NEW
    registerSfxBlocks(Blockly); // NEW
    console.log('Blocks registered.');

    // 4. Register Custom Generators
    registerInstrumentGenerators(Blockly, javascriptGenerator);
    registerMidiGenerators(Blockly, javascriptGenerator);
    registerSerialGenerators(Blockly, javascriptGenerator);
    registerKeyboardGenerators(Blockly, javascriptGenerator);
    registerTransportGenerators(Blockly, javascriptGenerator);
    registerEffectsGenerators(Blockly, javascriptGenerator);
    registerMathGenerators(Blockly, javascriptGenerator);
    registerNoiseGenerators(Blockly, javascriptGenerator);
    registerCustomWaveGenerators(Blockly, javascriptGenerator); // NEW
    registerSamplerGenerators(Blockly, javascriptGenerator); // NEW
    registerSfxGenerators(Blockly, javascriptGenerator); // NEW
    console.log('Generators registered.');

  } catch (e) {
    console.error('Error during block registration process:', e);
  }
}