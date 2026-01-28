// js/core/blocklyManager.js
import * as BlocklyModule from 'blockly';
import { javascriptGenerator } from 'blockly/javascript'; 
import { log, logKey, clearErrorLog, clearLogs } from '../ui/logger.js';
import { registerAll } from '../blocks/index.js'; 
import { audioEngine } from './audioEngine.js'; 
import { TOOLBOX_XML_STRING } from './toolbox.js';
import { applyBlocklyCoreFixes, syncCustomGenerators } from './blocklyCoreFixes.js';
import { HatBlockManager } from './services/HatBlockManager.js';

const Blockly = {};
Object.assign(Blockly, BlocklyModule);

if (!Blockly.FieldTextInput) {
    const FieldInputClass = BlocklyModule.registry.getClass(BlocklyModule.registry.Type.FIELD, 'field_input');
    if (FieldInputClass) { Blockly.FieldTextInput = FieldInputClass; }
}

Blockly.JavaScript = javascriptGenerator;
window.Blockly = Blockly;
window.javascriptGenerator = javascriptGenerator;
window['Blockly.JavaScript'] = javascriptGenerator;

const WS_PROTO = Blockly.Workspace.prototype;
if (!WS_PROTO._original_getAllVariables) {
    WS_PROTO._original_getAllVariables = WS_PROTO.getAllVariables;
    WS_PROTO.getAllVariables = function() { return this.getVariableMap ? this.getVariableMap().getAllVariables() : []; };
}
if (!WS_PROTO._original_getVariableById) {
    WS_PROTO._original_getVariableById = WS_PROTO.getVariableById;
    WS_PROTO.getVariableById = function(id) { return this.getVariableMap ? this.getVariableMap().getVariableById(id) : null; };
}

const G = javascriptGenerator;
applyBlocklyCoreFixes(Blockly, G); 

export const hatBlockManager = new HatBlockManager(audioEngine, G);

async function prepareBlocklyEnvironment() {
    try {
        await import('../plugins/field-multilineinput.js');
        const MultilineField = window.FieldMultilineInput || Blockly.FieldMultilineInput;
        if (MultilineField && !BlocklyModule.registry.hasItem(BlocklyModule.registry.Type.FIELD, 'field_multilineinput')) {
            BlocklyModule.fieldRegistry.register('field_multilineinput', MultilineField);
        }
    } catch (e) { console.error("Multiline plugin failed:", e); }
}

function processXmlString(xmlString) {
    return xmlString.replace(/%{BKY_([^}]+)}/g, (match, key) => Blockly.Msg[key] || match);
}

/**
 * Automatically disables/enables blocks based on their context (e.g., must be inside a container).
 */
function updateContextualBlocks(ws) {
    if (!ws) return;
    const blocks = ws.getAllBlocks(false);
    // Types that MUST be inside sb_instrument_container or sb_master_container
    const containerRequiredTypes = [
        'sb_create_synth_instrument', 
        'sb_create_harmonic_synth', 
        'sb_create_additive_synth', 
        'sb_create_sampler_instrument', 
        'sb_create_layered_instrument',
        'sb_container_adsr', 
        'sb_container_volume', 
        'sb_container_vibrato', 
        'sb_container_mute', 
        'sb_container_solo',
        'sb_container_setup_effect'
    ];
    
    blocks.forEach(block => {
        if (containerRequiredTypes.includes(block.type)) {
            let parent = block.getSurroundParent();
            let inContainer = false;
            while (parent) {
                if (parent.type === 'sb_instrument_container' || parent.type === 'sb_master_container') {
                    inContainer = true;
                    break;
                }
                parent = parent.getSurroundParent();
            }
            if (block.isEnabled() !== inContainer) {
                // Use setDisabledReason for modern Blockly compatibility
                // (disabled: boolean, reason: string)
                block.setDisabledReason(!inContainer, 'NOT_IN_CONTAINER');
            }
        }
    });
}

let workspace = null; 
let hatUpdateTimer = null;

function setupDefaultWorkspace() {
    if (!workspace || workspace.getAllBlocks(false).length > 0) return;
    const defaultXml = `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="sb_master_container" x="50" y="50">
    <statement name="STACK">
      <block type="sb_container_setup_effect">
        <mutation effect_type="limiter"></mutation>
        <field name="EFFECT_TYPE">limiter</field>
        <value name="THRESHOLD">
          <shadow type="math_number"><field name="NUM">-1</field></shadow>
        </value>
      </block>
    </statement>
  </block>
  <block type="sb_instrument_container" x="50" y="200">
    <field name="NAME">DefaultSynth</field>
    <statement name="STACK">
      <block type="sb_create_synth_instrument">
        <field name="TYPE">PolySynth</field>
        <next>
          <block type="sb_container_adsr">
            <field name="A">0.01</field><field name="D">0.1</field><field name="S">0.5</field><field name="R">1</field>
          </block>
        </next>
      </block>
    </statement>
  </block>
</xml>`;
    try {
        const dom = BlocklyModule.utils.xml.textToDom(defaultXml);
        BlocklyModule.Xml.domToWorkspace(dom, workspace);
        updateContextualBlocks(workspace);
    } catch (e) { console.warn("Default template failed:", e); }
}

export async function initBlocklyManager() {
    try {
        await prepareBlocklyEnvironment();
        await registerAll();
        workspace = BlocklyModule.inject('blocklyDiv', {
            toolbox: processXmlString(TOOLBOX_XML_STRING),
            grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
            zoom: { controls: true, wheel: true, startScale: 1.0 },
            move: { scrollbars: true, drag: true, wheel: true },
            comments: true,
            media: import.meta.env.BASE_URL + 'blockly/media/'
        });
        workspace.addChangeListener((event) => {
            // Update Hat Blocks (Events)
            if (hatUpdateTimer) clearTimeout(hatUpdateTimer);
            hatUpdateTimer = setTimeout(() => hatBlockManager.updateAll(workspace), 150);

            // Update Context (Graying out)
            if (event.type === BlocklyModule.Events.BLOCK_MOVE || 
                event.type === BlocklyModule.Events.BLOCK_CREATE ||
                event.type === BlocklyModule.Events.BLOCK_CHANGE) {
                updateContextualBlocks(workspace);
            }
        });
        setupDefaultWorkspace();
    } catch (e) { logKey('LOG_BLOCKLY_INIT_FAIL', 'error', e.message); }
}

export async function getBlocksCode() {
    if (!workspace) return '';
    clearErrorLog('EXEC'); clearErrorLog('EFFECT');
    hatBlockManager.forceRebuildEffects(); 
    
    try {
        syncCustomGenerators(G);
        G.init(workspace);
        const topBlocks = workspace.getTopBlocks(true);
        const instrumentBlockTypes = ['sb_instrument_container', 'sb_define_chord'];
        const setupBlockTypes = ['sb_master_container', 'sb_rhythm_sequence'];

        let instrumentCode = '', setupCode = '', executionCode = '';

        topBlocks.forEach(block => {
            if (['sb_serial_data_received', 'sb_midi_note_received', 'sb_key_action_event', 'sb_when_broadcast_received'].includes(block.type)) return;
            let currentBlock = block;
            let category = instrumentBlockTypes.includes(block.type) ? 'INSTRUMENT' : (setupBlockTypes.includes(block.type) ? 'SETUP' : 'EXECUTION');
            let chainCode = '';
            while (currentBlock) {
                const nextBlock = currentBlock.getNextBlock();
                if (nextBlock) {
                    try {
                        BlocklyModule.Events.disable();
                        currentBlock.nextConnection.disconnect();
                    } finally { BlocklyModule.Events.enable(); }
                }
                chainCode += G.blockToCode(currentBlock);
                if (nextBlock) {
                    try {
                        BlocklyModule.Events.disable();
                        currentBlock.nextConnection.connect(nextBlock.previousConnection);
                    } finally { BlocklyModule.Events.enable(); }
                }
                currentBlock = nextBlock;
            }
            if (category === 'INSTRUMENT') instrumentCode += chainCode;
            else if (category === 'SETUP') setupCode += chainCode;
            else executionCode += chainCode;
        });

        const variableDefs = [], funcDefs = [], otherDefs = [];
        for (let name in G.definitions_) {
            const def = G.definitions_[name];
            if (name.startsWith('variable')) variableDefs.push(def);
            else if (name.startsWith('%')) funcDefs.push(def);
            else otherDefs.push(def);
        }
        G.definitions_ = Object.create(null);
        
        return [
            '// Variable Declarations\n' + variableDefs.join('\n'),
            '// Other Definitions\n' + otherDefs.join('\n'),
            '// Function Definitions\n' + funcDefs.join('\n\n'),
            '// Instrument Creation\n' + instrumentCode,
            '// Wait for all samples to load\n' + 'await window.audioEngine.waitForSamples();',
            '// Setup & Configuration\n' + setupCode,
            '// Main Execution\n' + executionCode
        ].join('\n\n');
    } catch (e) {
        console.error("Generator failed:", e);
        return '';
    }
}

export function resetWorkspaceAndAudio(skipTemplate = false) {
    if (workspace) { workspace.clear(); workspace.clearUndo(); if (!skipTemplate) setupDefaultWorkspace(); }
    audioEngine.panicStopAllSounds();
    hatBlockManager.reset(); 
    clearLogs();
}
