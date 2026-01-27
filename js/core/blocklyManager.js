// js/core/blocklyManager.js
import * as BlocklyModule from 'blockly';
import { javascriptGenerator } from 'blockly/javascript'; 
import { log, logKey, clearErrorLog, clearLogs } from '../ui/logger.js';
import { registerAll } from '../blocks/index.js'; 
import { audioEngine } from './audioEngine.js'; 
import { TOOLBOX_XML_STRING } from './toolbox.js';
import { applyBlocklyCoreFixes, syncCustomGenerators } from './blocklyCoreFixes.js';
import { HatBlockManager } from './services/HatBlockManager.js';

// --- 1. 建立可擴充的全域 Blockly 物件 ---
const Blockly = {};
Object.assign(Blockly, BlocklyModule);

// 補完插件繼承所需的父類別
if (!Blockly.FieldTextInput) {
    const FieldInputClass = BlocklyModule.registry.getClass(BlocklyModule.registry.Type.FIELD, 'field_input');
    if (FieldInputClass) {
        Blockly.FieldTextInput = FieldInputClass;
    }
}

// 建立插件預期的子物件參照
Blockly.JavaScript = javascriptGenerator;

// 暴露至全域
window.Blockly = Blockly;
window.javascriptGenerator = javascriptGenerator;
window['Blockly.JavaScript'] = javascriptGenerator;

// --- 2. 實作 Polyfills 處理 Blockly v12+ 棄用警告 ---
// 強制攔截 Workspace 層級的變數 API 並導向 getVariableMap()
const WS_PROTO = Blockly.Workspace.prototype;
if (!WS_PROTO._original_getAllVariables) {
    WS_PROTO._original_getAllVariables = WS_PROTO.getAllVariables;
    WS_PROTO.getAllVariables = function() {
        return this.getVariableMap ? this.getVariableMap().getAllVariables() : [];
    };
}
if (!WS_PROTO._original_getVariableById) {
    WS_PROTO._original_getVariableById = WS_PROTO.getVariableById;
    WS_PROTO.getVariableById = function(id) {
        return this.getVariableMap ? this.getVariableMap().getVariableById(id) : null;
    };
}
if (!WS_PROTO._original_getVariable) {
    WS_PROTO._original_getVariable = WS_PROTO.getVariable;
    WS_PROTO.getVariable = function(name, type) {
        return this.getVariableMap ? this.getVariableMap().getVariable(name, type) : null;
    };
}

const G = javascriptGenerator;
applyBlocklyCoreFixes(Blockly, G); // Apply manual fixes for standard blocks and async support

const hatBlockManager = new HatBlockManager(audioEngine, G);

/**
 * Robustly globalizes Blockly and registers the multiline input plugin.
 */
async function prepareBlocklyEnvironment() {
    try {
        await import('../plugins/field-multilineinput.js');
        const MultilineField = window.FieldMultilineInput || Blockly.FieldMultilineInput;
        const isRegistered = BlocklyModule.registry.hasItem(BlocklyModule.registry.Type.FIELD, 'field_multilineinput');
        if (MultilineField && !isRegistered) {
            BlocklyModule.fieldRegistry.register('field_multilineinput', MultilineField);
        }
    } catch (e) {
        console.error("Failed to load or register multiline input plugin:", e);
    }
}

function processXmlString(xmlString) {
    return xmlString.replace(/%{BKY_([^}]+)}/g, (match, key) => {
        return Blockly.Msg[key] || match;
    });
}

let workspace = null; 
let hatUpdateTimer = null;
let adsrUpdateTimer = null;

function onWorkspaceChanged(event) {
    if (!workspace) return; 
    
    // --- ADSR UI Synchronization ---
    const isAdsrBlock = (b) => b && (b.type === 'sb_set_adsr' || b.type === 'sb_container_adsr');
    let targetBlock = null;
    if (event.type === BlocklyModule.Events.SELECTED && event.newElementId) {
        targetBlock = workspace.getBlockById(event.newElementId);
    } else if (event.type === BlocklyModule.Events.BLOCK_CHANGE && event.element === 'field') {
        targetBlock = workspace.getBlockById(event.blockId);
    }

    if (isAdsrBlock(targetBlock)) {
        if (adsrUpdateTimer) clearTimeout(adsrUpdateTimer);
        adsrUpdateTimer = setTimeout(() => {
            const getNum = (name, def) => {
                const val = targetBlock.getFieldValue(name);
                return (val === null || val === "" || isNaN(val)) ? def : Number(val);
            };
            audioEngine.updateADSRUI(getNum('A', 0.01), getNum('D', 0.1), getNum('S', 0.5), getNum('R', 1.0));
        }, 50);
    } else if (event.type === BlocklyModule.Events.SELECTED || event.type === BlocklyModule.Events.BLOCK_DELETE) {
        if (adsrUpdateTimer) clearTimeout(adsrUpdateTimer);
        adsrUpdateTimer = setTimeout(() => { audioEngine.syncAdsrToUI(); }, 200);
    }

    // --- Container Constraint & Shadow Fix ---
    if (event.type === BlocklyModule.Events.BLOCK_CHANGE || event.type === BlocklyModule.Events.BLOCK_CREATE || event.type === BlocklyModule.Events.BLOCK_MOVE) {
        const containerOnlyTypes = [
            'sb_create_synth_instrument', 'sb_create_harmonic_synth', 'sb_create_additive_synth', 
            'sb_create_sampler_instrument', 'sb_container_adsr', 'sb_container_volume', 
            'sb_container_vibrato', 'sb_container_mute', 'sb_container_solo', 'sb_container_setup_effect'
        ];
        workspace.getAllBlocks(false).forEach(block => {
            if (containerOnlyTypes.includes(block.type)) {
                let p = block.getSurroundParent();
                let container = null;
                while (p) {
                    if (p.type === 'sb_instrument_container' || p.type === 'sb_master_container') { container = p; break; }
                    p = p.getSurroundParent();
                }
                if (container) {
                    const masterAllowed = ['sb_container_volume', 'sb_container_mute', 'sb_container_solo', 'sb_container_setup_effect'];
                    block.setDisabledReason(container.type === 'sb_master_container' && !masterAllowed.includes(block.type), 'invalid_container');
                } else {
                    block.setDisabledReason(true, 'invalid_container');
                }
            }
            if (block.rendered) block.render();
        });
    }

    if (event.isUiEvent && event.type !== BlocklyModule.Events.SELECTED) return; 

    // --- Hat Block Registration (Delegated) ---
    if (hatUpdateTimer) clearTimeout(hatUpdateTimer);
    hatUpdateTimer = setTimeout(() => {
        hatBlockManager.updateAll(workspace);
    }, 150);
}

function setupDefaultWorkspace() {
    if (!workspace || workspace.getAllBlocks(false).length > 0) return;
    const defaultXml = `
        <xml xmlns="https://developers.google.com/blockly/xml">
            <block type="sb_instrument_container" x="50" y="50">
                <field name="NAME">DefaultSynth</field>
                <statement name="STACK">
                    <block type="sb_create_synth_instrument">
                        <field name="TYPE">PolySynth</field>
                        <next>
                            <block type="sb_container_adsr">
                                <field name="A">0.01</field><field name="D">0.1</field><field name="S">0.5</field><field name="R">1.0</field>
                            </block>
                        </next>
                    </block>
                </statement>
            </block>
            <block type="sb_master_container" x="50" y="250">
                <statement name="STACK">
                    <block type="sb_container_setup_effect">
                        <field name="EFFECT_TYPE">limiter</field>
                        <mutation effect_type="limiter"></mutation>
                        <value name="THRESHOLD"><shadow type="math_number"><field name="NUM">-1</field></shadow></value>
                    </block>
                </statement>
            </block>
        </xml>`;
    try {
        BlocklyModule.Xml.domToWorkspace(BlocklyModule.utils.xml.textToDom(defaultXml), workspace);
    } catch (e) { console.warn("Failed to inject default workspace template:", e); }
}

/**
 * Initializes the Blockly environment, including injecting the workspace,
 * loading plugins, and setting up event listeners.
 */
export async function initBlocklyManager() {
    try {
        await prepareBlocklyEnvironment();
        await registerAll();
        logKey('LOG_BLOCKLY_INIT'); 
        audioEngine.resetAudioEngineState();
        workspace = BlocklyModule.inject('blocklyDiv', {
            toolbox: processXmlString(TOOLBOX_XML_STRING),
            grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
            zoom: { controls: true, wheel: true, startScale: 1.0 },
            move: { scrollbars: true, drag: true, wheel: true },
            comments: true,
            media: import.meta.env.BASE_URL + 'blockly/media/'
        });
        workspace.addChangeListener(onWorkspaceChanged);
        setupDefaultWorkspace();
    } catch (e) {
        logKey('LOG_BLOCKLY_INIT_FAIL', 'error', e.message);
    }
}

/**
 * Generates JavaScript code from the current Blockly workspace.
 * Uses a multi-pass approach to handle instrument definitions, setup, and execution logic.
 * @returns {Promise<string>} The generated JavaScript code.
 */
export async function getBlocksCode() {
    if (!workspace) { logKey('LOG_WORKSPACE_NOT_INIT', 'error'); return ''; }
    clearErrorLog('EXEC'); clearErrorLog('EFFECT');
    audioEngine.resetAudioEngineState();
    hatBlockManager.forceRebuildEffects(); 
    
    try {
        syncCustomGenerators(G);
        G.init(workspace);
        const topBlocks = workspace.getTopBlocks(true);
        const instrumentBlockTypes = ['sb_instrument_container', 'sb_define_chord'];
        const setupBlockTypes = ['sb_master_container', 'sb_rhythm_sequence'];

        let instrumentCode = '', setupCode = '', executionCode = '';

        topBlocks.forEach(block => {
            if (['sb_serial_data_received', 'sb_midi_note_received', 'sb_key_action_event'].includes(block.type)) return;
            let currentBlock = block;
            let category = instrumentBlockTypes.includes(block.type) ? 'INSTRUMENT' : (setupBlockTypes.includes(block.type) ? 'SETUP' : 'EXECUTION');
            let chainCode = '';
            while (currentBlock) {
                const nextBlock = currentBlock.getNextBlock();
                if (nextBlock) {
                    try {
                        if (BlocklyModule.Events.isEnabled()) BlocklyModule.Events.disable();
                        currentBlock.nextConnection.disconnect();
                    } finally { if (!BlocklyModule.Events.isEnabled()) BlocklyModule.Events.enable(); }
                }
                chainCode += G.blockToCode(currentBlock);
                if (nextBlock) {
                    try {
                        if (BlocklyModule.Events.isEnabled()) BlocklyModule.Events.disable();
                        currentBlock.nextConnection.connect(nextBlock.previousConnection);
                    } finally { if (!BlocklyModule.Events.isEnabled()) BlocklyModule.Events.enable(); }
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
        
        logKey('LOG_CODE_GENERATED');
        return [
            '// Variable Declarations', variableDefs.join('\n'),
            '// Other Definitions', otherDefs.join('\n'),
            '// Function Definitions', funcDefs.join('\n\n'),
            '// Instrument Creation', instrumentCode,
            '// Setup & Configuration', setupCode,
            '// Main Execution', executionCode
        ].join('\n\n');
    } catch (e) {
        console.error("Main generator failed, falling back:", e);
        logKey('LOG_FALLBACK_MODE');
        try {
            syncCustomGenerators(G); G.init(workspace);
            const top = workspace.getTopBlocks(true);
            let out = '';
            const genBlock = function (block) {
                if (!block) return '';
                const t = block.type;
                try {
                    if (G.forBlock[t]) {
                        const code = G.forBlock[t].call(G, block, G);
                        if (code !== null && code !== undefined) return code;
                    }
                } catch (err) { console.warn(`Error in fallback: ${t}`, err); }
                
                if (t === 'sb_instrument_container' || t === 'sb_master_container') {
                    let branch = '';
                    let inner = block.getInputTargetBlock('STACK');
                    while (inner) { branch += genBlock(inner); inner = inner.getNextBlock(); }
                    return branch;
                }
                return `// 不支援: ${t}\n`;
            };
            top.forEach(b => {
                out += genBlock(b);
                let cur = b.getNextBlock();
                while (cur) { out += genBlock(cur); cur = cur.getNextBlock(); }
            });
            return G.finish(out);
        } catch (err) { logKey('LOG_FALLBACK_ERR', 'error', err); return ''; }
    }
}

/**
 * Resets the workspace and the audio engine to their default states.
 * @param {boolean} [skipTemplate=false] - If true, skips injecting the default blocks.
 */
export function resetWorkspaceAndAudio(skipTemplate = false) {
    if (workspace) { workspace.clear(); workspace.clearUndo(); logKey('LOG_WORKSPACE_CLEARED'); if (!skipTemplate) setupDefaultWorkspace(); }
    audioEngine.resetAudioEngineState();
    clearLogs();
    logKey('LOG_ENGINE_RESTARTED');
}
