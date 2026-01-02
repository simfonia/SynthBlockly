// js/core/blocklyManager.js
import * as BlocklyModule from 'blockly';
import { javascriptGenerator } from 'blockly/javascript'; 
import { log, logKey, clearErrorLog } from '../ui/logger.js';
import { registerAll } from '../blocks/index.js'; 
import { registerMidiListener, unregisterMidiListener } from './midiEngine.js';
import { audioEngine } from './audioEngine.js'; 
import { TOOLBOX_XML_STRING } from './toolbox.js';

// --- 手動註冊標準產生器 (解決 Vite 環境下 side-effects 失效問題) ---
const G = javascriptGenerator;
if (G) {
    if (!G.forBlock['math_number']) G.forBlock['math_number'] = b => [b.getFieldValue('NUM'), G.ORDER_ATOMIC];
    if (!G.forBlock['variables_set']) G.forBlock['variables_set'] = b => {
        const val = G.valueToCode(b, 'VALUE', G.ORDER_ASSIGNMENT) || '0';
        const name = b.workspace.getVariableMap().getVariableById(b.getFieldValue('VAR')).name;
        return name + ' = ' + val + ';\n';
    };
    if (!G.forBlock['controls_if']) G.forBlock['controls_if'] = b => {
        let n = 0;
        let code = '';
        do {
            const condition = G.valueToCode(b, 'IF' + n, G.ORDER_NONE) || 'false';
            const branch = G.statementToCode(b, 'DO' + n);
            code += (n > 0 ? ' else ' : '') + 'if (' + condition + ') {\n' + branch + '}';
            n++;
        } while (b.getInput('IF' + n));
        if (b.getInput('ELSE')) code += ' else {\n' + G.statementToCode(b, 'ELSE') + '}';
        return code + '\n';
    };
    if (!G.forBlock['text_indexOf']) G.forBlock['text_indexOf'] = b => {
        const str = G.valueToCode(b, 'VALUE', G.ORDER_MEMBER) || "''";
        const find = G.valueToCode(b, 'FIND', G.ORDER_NONE) || "''";
        return [str + '.indexOf(' + find + ') + 1', G.ORDER_MEMBER];
    };
    if (!G.forBlock['lists_split']) G.forBlock['lists_split'] = b => {
        const input = G.valueToCode(b, 'INPUT', G.ORDER_MEMBER) || "''";
        const delim = G.valueToCode(b, 'DELIM', G.ORDER_NONE) || "''";
        return [input + '.split(' + delim + ')', G.ORDER_MEMBER];
    };
    if (!G.forBlock['lists_getIndex']) G.forBlock['lists_getIndex'] = b => {
        const list = G.valueToCode(b, 'VALUE', G.ORDER_MEMBER) || '[]';
        const at = G.valueToCode(b, 'AT', G.ORDER_NONE) || '1';
        return [list + '[' + at + ' - 1]', G.ORDER_MEMBER];
    };
}

// --- 1. 建立可擴充的全域 Blockly 物件 ---
// ESM 命名空間不可擴充，建立副本以供 UMD 插件掛載屬性
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

/**
 * Robustly globalizes Blockly and registers the multiline input plugin.
 */
async function prepareBlocklyEnvironment() {
    try {
        // 動態載入插件
        await import('../plugins/field-multilineinput.js');
        
        // 檢查並註冊。使用 hasItem 避免自發性警告。
        const MultilineField = window.FieldMultilineInput || Blockly.FieldMultilineInput;
        const isRegistered = BlocklyModule.registry.hasItem(BlocklyModule.registry.Type.FIELD, 'field_multilineinput');
        
        if (MultilineField && !isRegistered) {
            BlocklyModule.fieldRegistry.register('field_multilineinput', MultilineField);
            console.log("Successfully registered field_multilineinput.");
        }
    } catch (e) {
        console.error("Failed to load or register multiline input plugin:", e);
    }
}

/**
 * Manually processes the toolbox XML string to replace i18n placeholders.
 */
function processXmlString(xmlString) {
    return xmlString.replace(/%{BKY_([^}]+)}/g, (match, key) => {
        return Blockly.Msg[key] || match;
    });
}


let workspace = null; 
const blockListeners = {};


function onWorkspaceChanged(event) {
    if (!workspace) return; 
    
    if (event.type === BlocklyModule.Events.BLOCK_CHANGE && event.name && ['A', 'D', 'S', 'R'].includes(event.name)) {
        const block = workspace.getBlockById(event.blockId);
        if (block && block.type === 'sb_set_adsr') {
            const a = Number(block.getFieldValue('A')) || 0.01;
            const d = Number(block.getFieldValue('D')) || 0.1;
            const s = Number(block.getFieldValue('S')) || 0.5;
            const r = Number(block.getFieldValue('R')) || 1.0;
            audioEngine.updateADSR(a, d, s, r);
        }
    }

    if (event.isUiEvent) return; 

    const serialHats = workspace.getBlocksByType('sb_serial_data_received', false);
    const midiHats = workspace.getBlocksByType('sb_midi_note_received', false);
    const registeredIds = Object.keys(blockListeners);
    const allCurrentHats = [...serialHats, ...midiHats];
    const allCurrentHatIds = allCurrentHats.map(b => b.id);

    registeredIds.forEach(blockId => {
        if (!allCurrentHatIds.includes(blockId)) {
            if (blockListeners[blockId].type === 'serial') {
                unregisterListenerForBlock(blockId);
            } else if (blockListeners[blockId].type === 'midi') {
                unregisterListenerForMidiBlock(blockId);
            }
        }
    });

    allCurrentHats.forEach(block => {
        // 如果已經存在，檢查內容是否改變
        if (blockListeners[block.id]) {
            const current = blockListeners[block.id];
            javascriptGenerator.init(workspace);
            const newCode = javascriptGenerator.statementToCode(block, 'DO');
            javascriptGenerator.finish('');
            
            let newVarName = "";
            if (block.type === 'sb_serial_data_received') {
                const varId = block.getFieldValue('DATA');
                newVarName = block.workspace.getVariableMap().getVariableById(varId)?.name || "";
            } else if (block.type === 'sb_midi_note_received') {
                const varId = block.getFieldValue('NOTE');
                newVarName = block.workspace.getVariableMap().getVariableById(varId)?.name || "";
            }

            // 只有當程式碼或變數名稱改變時才更新
            if (current.code === newCode && current.varName === newVarName) {
                return; // 沒變，跳過
            }

            // 有變，先移除舊的
            if (current.type === 'serial') {
                unregisterListenerForBlock(block.id);
            } else {
                unregisterListenerForMidiBlock(block.id);
            }
        }

        if (block.type === 'sb_serial_data_received') {
            registerListenerForBlock(block);
        } else if (block.type === 'sb_midi_note_received') {
            registerListenerForMidiBlock(block);
        }
    });
}

function registerListenerForBlock(block) {
    if (!block || blockListeners[block.id]) return;

    // --- 確保所有產生器都已掛載至 javascriptGenerator.forBlock ---
    const pbsxGens = [
        'sb_play_note', 'sb_play_note_and_wait', 'sb_play_drum', 'sb_set_adsr', 
        'jazzkit_play_drum', 'sb_create_synth_instrument', 'sb_select_current_instrument',
        'sb_set_instrument_vibrato', 'sb_set_instrument_volume', 'math_map'
    ];
    pbsxGens.forEach(name => {
        if (javascriptGenerator[name] && !javascriptGenerator.forBlock[name]) {
            javascriptGenerator.forBlock[name] = javascriptGenerator[name];
        }
    });

    // --- 確保標準產生器存在 ---
    if (!javascriptGenerator.forBlock['logic_compare']) {
        javascriptGenerator.forBlock['logic_compare'] = function(block) {
            const op = block.getFieldValue('OP');
            const order = (op === 'EQ' || op === 'NEQ') ? javascriptGenerator.ORDER_EQUALITY : javascriptGenerator.ORDER_RELATIONAL;
            const argument0 = javascriptGenerator.valueToCode(block, 'A', order) || '0';
            const argument1 = javascriptGenerator.valueToCode(block, 'B', order) || '0';
            return [argument0 + ' ' + (op === 'EQ' ? '==' : '!=') + ' ' + argument1, order];
        };
    }
    if (!javascriptGenerator.forBlock['text']) {
        javascriptGenerator.forBlock['text'] = function(block) {
            return [javascriptGenerator.quote_(block.getFieldValue('TEXT')), javascriptGenerator.ORDER_ATOMIC];
        };
    }
    if (!javascriptGenerator.forBlock['variables_get']) {
        javascriptGenerator.forBlock['variables_get'] = function(block) {
            const varId = block.getFieldValue('VAR');
            const variable = block.workspace.getVariableMap().getVariableById(varId);
            return [variable ? variable.name : 'undefined', javascriptGenerator.ORDER_ATOMIC];
        };
    }

    javascriptGenerator.init(workspace);
    const rawCode = javascriptGenerator.statementToCode(block, 'DO');
    javascriptGenerator.finish('');
    
    // --- 關鍵修正：過濾掉 /* EFFECT_CONFIG:... */ 註解 ---
    // 這些註解是給 rebuildEffectChain 看的，放在監聽器 Function 內只會增加語法解析錯誤的風險
    const code = rawCode.replace(/\/\* EFFECT_CONFIG:.*? \*\//g, "").trim();

    if (!code) return;
    const variableId = block.getFieldValue('DATA');
    const variable = block.workspace.getVariableMap().getVariableById(variableId);
    if (!variable) return;
    const varData = variable.name;
    try {
        // --- 關鍵修正：改用傳統字串拼接，避免樣板字串的巢狀解析問題 ---
        const functionBody = 
            "return (async () => { " +
            "  try { " +
            code + 
            "  } catch (e) { " +
            "    console.error('Error executing Blockly Serial Code:', e); " +
            "  } " +
            "})();";

        const executeCode = new Function(varData, functionBody);

        const listenerFunction = async (line) => {
            const cleanedLine = (typeof line === 'string') ? line.trim() : line;
            await executeCode(cleanedLine);
        };
        window.registerSerialDataListener(listenerFunction);
        blockListeners[block.id] = { type: 'serial', listener: listenerFunction, code: code, varName: varData };
        logKey('LOG_SERIAL_REGISTERED', 'info', block.id);
    } catch (e) {
        logKey('LOG_EXEC_ERR', 'error', e.message);
    }
}

function unregisterListenerForBlock(blockId) {
    const listenerToRemove = blockListeners[blockId];
    if (listenerToRemove && listenerToRemove.type === 'serial') {
        window.unregisterSerialDataListener(listenerToRemove.listener);
        delete blockListeners[blockId];
        logKey('LOG_SERIAL_UNREGISTERED', 'info', blockId);
    }
}

function registerListenerForMidiBlock(block) {
    if (!block || blockListeners[block.id]) return;
    javascriptGenerator.init(workspace);
    const code = javascriptGenerator.statementToCode(block, 'DO');
    javascriptGenerator.finish('');
    if (!code) return;
    const noteVarId = block.getFieldValue('NOTE');
    const velocityVarId = block.getFieldValue('VELOCITY');
    const channelVarId = block.getFieldValue('CHANNEL');
    const noteVar = block.workspace.getVariableMap().getVariableById(noteVarId);
    const velocityVar = block.workspace.getVariableMap().getVariableById(velocityVarId);
    const channelVar = block.workspace.getVariableMap().getVariableById(channelVarId);
    if (!noteVar || !velocityVar || !channelVar) {
        logKey('LOG_MIDI_VAR_ERR', 'error');
        return;
    }
    const varNote = noteVar.name;
    const varVelocity = velocityVar.name;
    const varChannel = channelVar.name;
    try {
        const listenerFunction = new Function(varNote, '_rawVelocity', varChannel, `(async () => {
            const ${varVelocity} = _rawVelocity / 127; 
            ${code}
        })();`);
        registerMidiListener(listenerFunction);
        blockListeners[block.id] = { type: 'midi', listener: listenerFunction };
        logKey('LOG_MIDI_REGISTERED', 'info', block.id);
    } catch (e) {
        logKey('LOG_EXEC_ERR', 'error', e.message);
    }
}

function unregisterListenerForMidiBlock(blockId) {
    const listenerEntry = blockListeners[blockId];
    if (listenerEntry && listenerEntry.type === 'midi') {
        unregisterMidiListener(listenerEntry.listener);
        delete blockListeners[blockId];
        logKey('LOG_MIDI_UNREGISTERED', 'info', blockId);
    }
}

/**
 * Initializes Blockly workspace and registers blocks/generators.
 */
export async function initBlocklyManager() {
    try {
        // 1. 準備全域環境與外掛 (優先執行)
        await prepareBlocklyEnvironment();

        // 2. 定義積木
        await registerAll();

        logKey('LOG_BLOCKLY_INIT'); 
        logKey('LOG_MODULES_LOADED');
        audioEngine.resetAudioEngineState();

        // 3. 處理工具箱並注入
        const processedToolboxXml = processXmlString(TOOLBOX_XML_STRING);
        logKey('LOG_TOOLBOX_PROCESSED');

        workspace = BlocklyModule.inject('blocklyDiv', {
            toolbox: processedToolboxXml,
            grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
            zoom: { controls: true, wheel: true, startScale: 1.0 },
            move: { scrollbars: true, drag: true, wheel: true },
            media: import.meta.env.BASE_URL + 'blockly/media/'
        });
        logKey('LOG_WORKSPACE_INJECTED');
        workspace.addChangeListener(onWorkspaceChanged);
        logKey('LOG_LISTENERS_ATTACHED');

    } catch (e) {
        console.error('Blockly initialization failed:', e);
        logKey('LOG_BLOCKLY_INIT_FAIL', 'error', e.message);
    }
}

/**
 * Generates code from the Blockly workspace.
 */
export async function getBlocksCode() {
    if (!workspace) {
        logKey('LOG_WORKSPACE_NOT_INIT', 'error');
        return '';
    }
    
    // 清除舊的執行期與效果器錯誤
    clearErrorLog('EXEC');
    clearErrorLog('EFFECT');

    if (typeof javascriptGenerator === 'undefined') {
        logKey('LOG_GENERATOR_NOT_READY', 'error');
        return '';
    }
    audioEngine.resetAudioEngineState();
    try {
        try {
            if (javascriptGenerator && typeof javascriptGenerator.init === 'function') {
                javascriptGenerator.init(workspace);
            }
        } catch (e) { } // Ignore errors during init

        try {
            if (javascriptGenerator && javascriptGenerator.forBlock) {
                const pbsxGens = ['play_note', 'sb_play_drum', 'sb_set_adsr', 'sb_midi_note_received', 'sb_serial_data_received'];
                for (const name of pbsxGens) {
                    if (javascriptGenerator[name] && !javascriptGenerator.forBlock[name]) {
                        javascriptGenerator.forBlock[name] = javascriptGenerator[name];
                    }
                }
            }
        } catch (e) { } // Ignore errors during forBlock assignment

        const effectConfigs = [];
        let effectBlocks = workspace.getBlocksByType('sb_setup_effect', false);
        effectBlocks.sort((a, b) => a.getRelativeToSurfaceXY().y - b.getRelativeToSurfaceXY().y);
        const configRegex = /\/\* EFFECT_CONFIG:(.*?) \*\//;

        effectBlocks.forEach(block => {
            try {
                const blockCode = javascriptGenerator.blockToCode(block, true);
                if (blockCode) {
                    const match = blockCode.match(configRegex);
                    if (match && match[1]) {
                        effectConfigs.push(JSON.parse(match[1]));
                    }
                }
            } catch (err) {
                logKey('LOG_EFFECT_BLOCK_ERR', 'error', block.id, err.message);
            }
        });

        audioEngine.rebuildEffectChain(effectConfigs);
        let code = javascriptGenerator.workspaceToCode(workspace);
        code = javascriptGenerator.finish(code);
        if (!code || code.trim() === '') logKey('LOG_CODE_EMPTY', 'warning');
        else logKey('LOG_CODE_GENERATED');
        return code;
    } catch (e) {
        logKey('LOG_FALLBACK_MODE');
        try {
            javascriptGenerator.init(workspace);
            const top = workspace.getTopBlocks(true);
            let out = '';
            const genBlock = function (block) {
                if (!block) return '';
                const t = block.type;
                try {
                    if (javascriptGenerator && javascriptGenerator.forBlock && typeof javascriptGenerator.forBlock[t] === 'function') {
                        return javascriptGenerator.forBlock[t].call(javascriptGenerator, block) || '';
                    }
                } catch (err) { } // Ignore errors during block generation
                if (t === 'sb_play_note') {
                    const note = block.getFieldValue('NOTE') || 'C4';
                    const dur = block.getFieldValue('DUR') || '8n';
                    return "synth.triggerAttackRelease('" + note + "','" + dur + "');\n";
                } else if (t === 'sb_play_drum') {
                    const type = block.getFieldValue('TYPE');
                    if (type === 'KICK') return 'playKick();\n';
                    if (type === 'HH') return "hh.triggerAttackRelease('16n');\n";
                    if (type === 'SNARE') return "(function(){ var sn = new Tone.NoiseSynth({volume:-6}).toDestination(); sn.triggerAttackRelease('8n'); })();\n";
                    return '';
                } else if (t === 'sb_set_adsr') {
                    const a = Number(block.getFieldValue('A')) || 0.01;
                    const d = Number(block.getFieldValue('D')) || 0.1;
                    const s = Number(block.getFieldValue('S')) || 0.5;
                    const r = Number(block.getFieldValue('R')) || 1.0;
                    return "synth.set({envelope: {attack: " + a + ", decay: " + d + ", sustain: " + s + ", release: " + r + "}});\n";
                } else {
                    return '// 不支援的積木類型: ' + t + '\n';
                }
            };
            top.forEach(b => {
                let outLine = genBlock(b);
                if (outLine) out += outLine;
                let cur = b.getNextBlock();
                while (cur) {
                    out += genBlock(cur);
                    cur = cur.getNextBlock();
                }
            });
            if (out.trim() === '') logKey('LOG_FALLBACK_EMPTY', 'warning');
            else logKey('LOG_FALLBACK_SUCCESS');
            out = javascriptGenerator.finish(out);
            logKey('LOG_FALLBACK_DONE');
            return out;
        } catch (err) {
            logKey('LOG_FALLBACK_ERR', 'error', err);
            return '';
        }
    }
}

/**
 * Clears the Blockly workspace and resets the audio engine state.
 */
export function resetWorkspaceAndAudio() {
    if (workspace) {
        workspace.clear();
        workspace.clearUndo();
        logKey('LOG_WORKSPACE_CLEARED');
    }
    audioEngine.resetAudioEngineState();
    logKey('LOG_ENGINE_RESTARTED');
}