// js/blocks/index.js - Block-related registration manager

// Import from the original location for now. We will refactor these files later.
import { MSG_EN } from './lang/en.js';
import { MSG_ZH_HANT } from './lang/zh-hant.js';

import { registerBlocks as registerInstrumentBlocks } from './instruments_blocks.js';
import { registerBlocks as registerMidiBlocks } from './midi_blocks.js';
import { registerBlocks as registerSerialBlocks } from './serial_blocks.js';
import { registerBlocks as registerKeyboardBlocks } from './keyboard_blocks.js';
import { registerBlocks as registerTransportBlocks } from './transport_blocks.js';
import { registerBlocks as registerEffectsBlocks } from './effects_blocks.js';

import { registerGenerators as registerInstrumentGenerators } from './instruments_generators.js';
import { registerGenerators as registerMidiGenerators } from './midi_generators.js';
import { registerGenerators as registerSerialGenerators } from './serial_generators.js';
import { registerGenerators as registerKeyboardGenerators } from './keyboard_generators.js';
import { registerGenerators as registerTransportGenerators } from './transport_generators.js';
import { registerGenerators as registerEffectsGenerators } from './effects_generators.js';

/**
 * Registers all blocks, generators, and languages, and fetches the toolbox XML.
 * This replaces the old 5-pass loading system in main.js.
 * @returns {Promise<string>} A promise that resolves with the toolbox XML content.
 */
export async function registerAll() {
  try {
    // 1. Register Language Messages
    Object.assign(Blockly.Msg, MSG_EN);
    Object.assign(Blockly.Msg, MSG_ZH_HANT);
    console.log('Languages registered.');

    // 2. Register Custom Blocks
    registerInstrumentBlocks(Blockly);
    registerMidiBlocks(Blockly);
    registerSerialBlocks(Blockly);
    registerKeyboardBlocks(Blockly);
    registerTransportBlocks(Blockly);
    registerEffectsBlocks(Blockly);
    console.log('Blocks registered.');
    
    // 3. Register Custom Generators
    registerInstrumentGenerators(Blockly);
    registerMidiGenerators(Blockly);
    registerSerialGenerators(Blockly);
    registerKeyboardGenerators(Blockly);
    registerTransportGenerators(Blockly);
    registerEffectsGenerators(Blockly);
    console.log('Generators registered.');

    // 4. Fetch Toolbox XML
    const response = await fetch('/docs/toolbox.xml');
    if (!response.ok) {
        throw new Error(`Toolbox fetch failed: ${response.statusText}`);
    }
    const toolboxXml = await response.text();
    console.log('Toolbox XML fetched.');
    
    return toolboxXml;

  } catch (e) {
    console.error('Error during block registration process:', e);
    // Return a fallback toolbox on error
    return '<xml><category name="Error" colour="0"><label text="Toolbox load failed"></label></category></xml>';
  }
}
