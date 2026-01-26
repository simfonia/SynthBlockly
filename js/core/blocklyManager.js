// js/core/blocklyManager.js
import * as BlocklyModule from 'blockly';
import { javascriptGenerator } from 'blockly/javascript'; 
import { log, logKey, clearErrorLog, clearLogs } from '../ui/logger.js';
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
let hatUpdateTimer = null;
let adsrUpdateTimer = null;


function onWorkspaceChanged(event) {
    if (!workspace) return; 
    
    // --- ADSR UI Synchronization ---
    const isAdsrBlock = (b) => b && (b.type === 'sb_set_adsr' || b.type === 'sb_container_adsr');
    
    // Check for explicit selection or value change
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
        // Debounce syncing back to avoid flickering during block switching
        if (adsrUpdateTimer) clearTimeout(adsrUpdateTimer);
        adsrUpdateTimer = setTimeout(() => {
            audioEngine.syncAdsrToUI();
        }, 200);
    }

    if (event.type === BlocklyModule.Events.BLOCK_DELETE) {
         // If an ADSR block is deleted, revert to default or current instrument
         audioEngine.syncAdsrToUI();
    }

    // --- Force Redraw on Change (Fixes Shadow Block collapse) ---
    if (event.type === BlocklyModule.Events.BLOCK_CHANGE || 
        event.type === BlocklyModule.Events.BLOCK_CREATE ||
        event.type === BlocklyModule.Events.BLOCK_MOVE) {
         
         if (workspace) {
            const allBlocks = workspace.getAllBlocks(false);
            const containerOnlyTypes = [
                'sb_create_synth_instrument', 'sb_create_harmonic_synth', 'sb_create_additive_synth', 
                'sb_create_sampler_instrument', 'sb_container_adsr', 'sb_container_volume', 
                'sb_container_vibrato', 'sb_container_mute', 'sb_container_solo', 'sb_container_setup_effect'
            ];

            allBlocks.forEach(block => {
                if (containerOnlyTypes.includes(block.type)) {
                    let container = null;
                    let p = block.getSurroundParent();
                    while (p) {
                        if (p.type === 'sb_instrument_container' || p.type === 'sb_master_container') {
                            container = p;
                            break;
                        }
                        p = p.getSurroundParent();
                    }

                    // Use modern setDisabledReason for reliable UI feedback
                    if (container) {
                        if (container.type === 'sb_master_container') {
                            const masterAllowed = ['sb_container_volume', 'sb_container_mute', 'sb_container_solo', 'sb_container_setup_effect'];
                            const isAllowed = masterAllowed.includes(block.type);
                            block.setDisabledReason(!isAllowed, 'invalid_container');
                        } else {
                            block.setDisabledReason(false, 'invalid_container');
                        }
                    } else {
                        // Not inside any container - must be disabled
                        block.setDisabledReason(true, 'invalid_container');
                    }
                }
                
                if (block.rendered) {
                    block.render();
                }
            });
        }
    }

    if (event.isUiEvent && event.type !== BlocklyModule.Events.SELECTED) return; 

    // --- Hat Block Registration ---
    if (hatUpdateTimer) clearTimeout(hatUpdateTimer);
    hatUpdateTimer = setTimeout(() => {
        updateAllHatBlocks();
    }, 150); // Wait 150ms for workspace to stabilize
}

/**
 * Scans workspace for hat blocks and synchronizes event listeners.
 */
function updateAllHatBlocks() {
    if (!workspace) return;

    const serialHats = workspace.getBlocksByType('sb_serial_data_received', false);
    const midiHats = workspace.getBlocksByType('sb_midi_note_received', false);
    const keyActionHats = workspace.getBlocksByType('sb_key_action_event', false);
    const registeredIds = Object.keys(blockListeners);
    const allCurrentHats = [...serialHats, ...midiHats, ...keyActionHats];
    const allCurrentHatIds = allCurrentHats.map(b => b.id);

    // 1. Unregister hats that no longer exist
    registeredIds.forEach(blockId => {
        if (!allCurrentHatIds.includes(blockId)) {
            if (blockListeners[blockId].type === 'serial') {
                unregisterListenerForBlock(blockId);
            } else if (blockListeners[blockId].type === 'midi') {
                unregisterListenerForMidiBlock(blockId);
            } else if (blockListeners[blockId].type === 'key_action') {
                unregisterListenerForKeyActionBlock(blockId);
            }
        }
    });

    // 2. Register or Update existing hats
    allCurrentHats.forEach(block => {
        if (blockListeners[block.id]) {
            const current = blockListeners[block.id];
            
            // Check if code or parameters changed
            javascriptGenerator.init(workspace);
            applyAsyncProcedureOverrides(javascriptGenerator); 
            const newCode = javascriptGenerator.statementToCode(block, 'DO');
            javascriptGenerator.finish('');
            
            let changed = false;
            
            if (block.type === 'sb_serial_data_received') {
                const varId = block.getFieldValue('DATA');
                const newVarName = block.workspace.getVariableMap().getVariableById(varId)?.name || "";
                if (current.code !== newCode || current.varName !== newVarName) changed = true;
            } else if (block.type === 'sb_midi_note_received') {
                const varId = block.getFieldValue('NOTE');
                const newVarName = block.workspace.getVariableMap().getVariableById(varId)?.name || "";
                if (current.code !== newCode || current.varName !== newVarName) changed = true; // Simplified check
            } else if (block.type === 'sb_key_action_event') {
                const newKeyCode = block.getFieldValue('KEY_CODE');
                const newTriggerMode = block.getFieldValue('TRIGGER_MODE');
                if (current.code !== newCode || current.keyCode !== newKeyCode || current.triggerMode !== newTriggerMode) changed = true;
            }

            if (!changed) return; // No changes

            // Code changed, unregister old one
            if (current.type === 'serial') unregisterListenerForBlock(block.id);
            else if (current.type === 'midi') unregisterListenerForMidiBlock(block.id);
            else if (current.type === 'key_action') unregisterListenerForKeyActionBlock(block.id);
        }

        // Register the hat
        if (block.type === 'sb_serial_data_received') registerListenerForBlock(block);
        else if (block.type === 'sb_midi_note_received') registerListenerForMidiBlock(block);
        else if (block.type === 'sb_key_action_event') registerListenerForKeyActionBlock(block);
    });
}

function registerListenerForKeyActionBlock(block) {
    if (!block || blockListeners[block.id]) return;
    
    const keyCode = block.getFieldValue('KEY_CODE');
    const triggerMode = block.getFieldValue('TRIGGER_MODE');
    
    javascriptGenerator.init(workspace);
    const code = javascriptGenerator.statementToCode(block, 'DO');
    javascriptGenerator.finish('');
    
    if (!code) return;

    // --- EFFECT_CONFIG handling similar to other hats ---
    const configMatches = code.match(/\/\* EFFECT_CONFIG:(.*?) \*\//g);
    if (configMatches) {
        try {
            const configs = configMatches.map(comment => {
                const jsonStr = comment.match(/EFFECT_CONFIG:(.*?) \*\//)[1];
                return JSON.parse(jsonStr);
            });
            audioEngine.rebuildEffectChain(configs);
        } catch (e) {
            console.warn("Failed to parse effect config:", e);
        }
    }

    let cleanCode = code.replace(/\/\* EFFECT_CONFIG:.*? \*\//g, "").trim();
    cleanCode = cleanCode.replace(/window\.audioEngine\.addEffectToChain\(.*?\);\n?/g, "").trim();

    try {
        const functionBody = 
            "return (async () => { " +
            "  try { " +
            cleanCode + 
            "  } catch (e) { " +
            "    console.error('Error executing Key Action Code:', e); " +
            "  } " +
            "})();";

        const executeCode = new Function(functionBody);
        
        // Register to AudioEngine
        if (triggerMode === 'PRESS') {
            audioEngine.registerKeyAction(keyCode, executeCode, null);
        } else if (triggerMode === 'RELEASE') {
            audioEngine.registerKeyAction(keyCode, null, executeCode);
        }
        
        blockListeners[block.id] = { 
            type: 'key_action', 
            keyCode: keyCode, 
            triggerMode: triggerMode, 
            code: code 
        };
        // logKey('LOG_KEY_ACTION_REGISTERED', 'info', keyCode); // Handled by audioEngine
        
    } catch (e) {
        logKey('LOG_EXEC_ERR', 'error', e.message);
    }
}

function unregisterListenerForKeyActionBlock(blockId) {
    const listenerEntry = blockListeners[blockId];
    if (listenerEntry && listenerEntry.type === 'key_action') {
        // We can't easily unregister a specific callback from keyActionMap if multiple blocks target same key (though UI should prevent it)
        // For now, assume AudioEngine's registerKeyAction overwrites.
        // To strictly "unregister", we might need delete, but since we overwrite on register, maybe just delete from blockListeners is enough metadata-wise.
        // Ideally AudioEngine should have unregisterKeyAction. 
        // Let's assume re-registering or full clear handles conflicts.
        // For clean up:
        // audioEngine.keyActionMap[listenerEntry.keyCode] = undefined; // This removes ALL actions for that key
        // But if we have multiple blocks (press vs release), this is tricky.
        // Simplified: The update logic unregisters THEN registers.
        // If the block is deleted, we should remove the action.
        
        // Check if there are other blocks using this key? No, dynamic options prevent it.
        // So safe to remove.
        if (audioEngine.keyActionMap[listenerEntry.keyCode]) {
             delete audioEngine.keyActionMap[listenerEntry.keyCode];
        }

        delete blockListeners[blockId];
        // logKey('LOG_KEY_ACTION_UNREGISTERED', 'info', blockId);
    }
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

    // --- 強制讓所有 Blockly 函式支援 Async/Await ---
    javascriptGenerator.forBlock['procedures_defnoreturn'] = function(block) {
        const funcName = javascriptGenerator.nameDB_.getName(block.getFieldValue('NAME'), 'PROCEDURE');
        let xfix1 = '';
        if (javascriptGenerator.STATEMENT_PREFIX) {
            xfix1 += javascriptGenerator.injectId(javascriptGenerator.STATEMENT_PREFIX, block);
        }
        if (javascriptGenerator.TERMINATOR) {
            xfix1 += javascriptGenerator.TERMINATOR;
        }
        const branch = javascriptGenerator.statementToCode(block, 'STACK');
        let returnValue = javascriptGenerator.valueToCode(block, 'RETURN', javascriptGenerator.ORDER_NONE) || '';
        let xfix2 = '';
        if (returnValue && javascriptGenerator.STATEMENT_SUFFIX) {
            xfix2 += javascriptGenerator.injectId(javascriptGenerator.STATEMENT_SUFFIX, block);
        }
        if (returnValue) {
            returnValue = javascriptGenerator.INDENT + 'return ' + returnValue + ';\n';
        }
        const args = [];
        const variables = block.getVars();
        for (let i = 0; i < variables.length; i++) {
            args[i] = javascriptGenerator.nameDB_.getName(variables[i], 'VARIABLE');
        }
        // 關鍵：加入 async 關鍵字
        let code = 'async function ' + funcName + '(' + args.join(', ') + ') {\n' + xfix1 + branch + xfix2 + returnValue + '}';
        code = javascriptGenerator.scrub_(block, code);
        javascriptGenerator.definitions_['%' + funcName] = code;
        return null;
    };

    javascriptGenerator.forBlock['procedures_defreturn'] = javascriptGenerator.forBlock['procedures_defnoreturn'];

    javascriptGenerator.forBlock['procedures_callnoreturn'] = function(block) {
        const funcName = javascriptGenerator.nameDB_.getName(block.getFieldValue('NAME'), 'PROCEDURE');
        const args = [];
        const variables = block.getVars();
        for (let i = 0; i < variables.length; i++) {
            args[i] = javascriptGenerator.valueToCode(block, 'ARG' + i, javascriptGenerator.ORDER_NONE) || 'null';
        }
        // 關鍵：呼叫時加入 await
        const code = 'await ' + funcName + '(' + args.join(', ') + ');\n';
        return code;
    };

    javascriptGenerator.forBlock['procedures_callreturn'] = function(block) {
        const funcName = javascriptGenerator.nameDB_.getName(block.getFieldValue('NAME'), 'PROCEDURE');
        const args = [];
        const variables = block.getVars();
        for (let i = 0; i < variables.length; i++) {
            args[i] = javascriptGenerator.valueToCode(block, 'ARG' + i, javascriptGenerator.ORDER_NONE) || 'null';
        }
        // 關鍵：呼叫時加入 await
        const code = 'await ' + funcName + '(' + args.join(', ') + ')';
        return [code, javascriptGenerator.ORDER_AWAIT || 0];
    };

    javascriptGenerator.init(workspace);
    const rawCode = javascriptGenerator.statementToCode(block, 'DO');
    javascriptGenerator.finish('');
    
    // --- 關鍵修正：先提取 EFFECT_CONFIG 註解來建立效果鏈，再將其從程式碼中移除 ---
    // 這確保了即使效果器積木放在事件內部，也能在監聽器註冊時初始化效果器實例 (雖然參數可能是 NaN/變數名)
    // 後續的 updateFilter 等執行碼會負責在運行時更新正確的數值
    const configMatches = rawCode.match(/\/\* EFFECT_CONFIG:(.*?) \*\//g);
    if (configMatches) {
        try {
            const configs = configMatches.map(comment => {
                const jsonStr = comment.match(/EFFECT_CONFIG:(.*?) \*\//)[1];
                return JSON.parse(jsonStr);
            });
            // 重建效果鏈
            audioEngine.rebuildEffectChain(configs);
        } catch (e) {
            console.warn("Failed to parse effect config from event block:", e);
        }
    }

    // --- 移除註解，避免干擾執行 ---
    // 這些註解是給 rebuildEffectChain 看的，放在監聽器 Function 內只會增加語法解析錯誤的風險
    let code = rawCode.replace(/\/\* EFFECT_CONFIG:.*? \*\//g, "").trim();
    
    // --- 關鍵修正：移除 addEffectToChain 呼叫 ---
    // 在事件處理器中，我們不希望重複建立效果器 (這已由 forceRebuildHatEffects 完成)
    // 我們只希望執行 updateFilter 等即時更新邏輯
    code = code.replace(/window\.audioEngine\.addEffectToChain\(.*?\);\n?/g, "").trim();

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

// --- 強制讓所有 Blockly 函式支援 Async/Await 的覆寫函式 ---
function applyAsyncProcedureOverrides(javascriptGenerator) {
    javascriptGenerator.forBlock['procedures_defnoreturn'] = function(block) {
        const funcName = javascriptGenerator.nameDB_.getName(block.getFieldValue('NAME'), 'PROCEDURE');
        const branch = javascriptGenerator.statementToCode(block, 'STACK');
        const args = [];
        const variables = block.getVars();
        for (let i = 0; i < variables.length; i++) {
            args[i] = javascriptGenerator.nameDB_.getName(variables[i], 'VARIABLE');
        }
        // 核心修正：強制使用 async function
        let code = 'async function ' + funcName + '(' + args.join(', ') + ') {\n' + branch + '}';
        code = javascriptGenerator.scrub_(block, code);
        javascriptGenerator.definitions_['%' + funcName] = code;
        return null;
    };

    javascriptGenerator.forBlock['procedures_defreturn'] = function(block) {
        const funcName = javascriptGenerator.nameDB_.getName(block.getFieldValue('NAME'), 'PROCEDURE');
        const branch = javascriptGenerator.statementToCode(block, 'STACK');
        let returnValue = javascriptGenerator.valueToCode(block, 'RETURN', javascriptGenerator.ORDER_NONE) || '';
        if (returnValue) {
            returnValue = javascriptGenerator.INDENT + 'return ' + returnValue + ';\n';
        }
        const args = [];
        const variables = block.getVars();
        for (let i = 0; i < variables.length; i++) {
            args[i] = javascriptGenerator.nameDB_.getName(variables[i], 'VARIABLE');
        }
        let code = 'async function ' + funcName + '(' + args.join(', ') + ') {\n' + branch + returnValue + '}';
        code = javascriptGenerator.scrub_(block, code);
        javascriptGenerator.definitions_['%' + funcName] = code;
        return null;
    };

    javascriptGenerator.forBlock['procedures_callnoreturn'] = function(block) {
        const funcName = javascriptGenerator.nameDB_.getName(block.getFieldValue('NAME'), 'PROCEDURE');
        const args = [];
        const variables = block.getVars();
        for (let i = 0; i < variables.length; i++) {
            args[i] = javascriptGenerator.valueToCode(block, 'ARG' + i, javascriptGenerator.ORDER_NONE) || 'null';
        }
        // 核心修正：呼叫時強制使用 await
        return 'await ' + funcName + '(' + args.join(', ') + ');\n';
    };

    javascriptGenerator.forBlock['procedures_callreturn'] = function(block) {
        const funcName = javascriptGenerator.nameDB_.getName(block.getFieldValue('NAME'), 'PROCEDURE');
        const args = [];
        const variables = block.getVars();
        for (let i = 0; i < variables.length; i++) {
            args[i] = javascriptGenerator.valueToCode(block, 'ARG' + i, javascriptGenerator.ORDER_NONE) || 'null';
        }
        return ['await ' + funcName + '(' + args.join(', ') + ')', 0];
    };
}

/**
 * Injects a default setup (Instrument + Master) if the workspace is empty.
 */
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
                                <field name="A">0.01</field>
                                <field name="D">0.1</field>
                                <field name="S">0.5</field>
                                <field name="R">1.0</field>
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
                        <value name="THRESHOLD">
                            <shadow type="math_number">
                                <field name="NUM">-1</field>
                            </shadow>
                        </value>
                    </block>
                </statement>
            </block>
        </xml>
    `;
    
    try {
        const dom = BlocklyModule.utils.xml.textToDom(defaultXml);
        BlocklyModule.Xml.domToWorkspace(dom, workspace);
    } catch (e) {
        console.warn("Failed to inject default workspace template:", e);
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
            comments: true, // 啟用積木註解
            media: import.meta.env.BASE_URL + 'blockly/media/'
        });
        logKey('LOG_WORKSPACE_INJECTED');
        workspace.addChangeListener(onWorkspaceChanged);
        logKey('LOG_LISTENERS_ATTACHED');

        // V2.1: Setup default template
        setupDefaultWorkspace();

    } catch (e) {
        console.error('Blockly initialization failed:', e);
        logKey('LOG_BLOCKLY_INIT_FAIL', 'error', e.message);
    }
}

function forceRebuildHatEffects() {
    if (!workspace) return;
    
    // Scan all Hat blocks
    const serialHats = workspace.getBlocksByType('sb_serial_data_received', false);
    const midiHats = workspace.getBlocksByType('sb_midi_note_received', false);
    const allCurrentHats = [...serialHats, ...midiHats];
    
    // For each Hat, extract EFFECT_CONFIG and rebuild chain
    // Since rebuildEffectChain overwrites previous chain, only the last block with effects will win.
    // This is consistent with current architecture.
    allCurrentHats.forEach(block => {
        javascriptGenerator.init(workspace);
        const rawCode = javascriptGenerator.statementToCode(block, 'DO');
        javascriptGenerator.finish('');
        
        const configMatches = rawCode.match(/\/\* EFFECT_CONFIG:(.*?) \*\//g);
        if (configMatches) {
            try {
                const configs = configMatches.map(comment => {
                    const jsonStr = comment.match(/EFFECT_CONFIG:(.*?) \*\//)[1];
                    return JSON.parse(jsonStr);
                });
                audioEngine.rebuildEffectChain(configs);
                // console.log("Restored effects for block:", block.id);
            } catch (e) {
                console.warn("Failed to restore effects:", e);
            }
        }
    });
}

/**
 * Generates code from the Blockly workspace.
 * V2.0: Separates Definition blocks from Execution blocks.
 */
export async function getBlocksCode() {
    if (!workspace) {
        logKey('LOG_WORKSPACE_NOT_INIT', 'error');
        return '';
    }
    
    clearErrorLog('EXEC');
    clearErrorLog('EFFECT');

    if (typeof javascriptGenerator === 'undefined') {
        logKey('LOG_GENERATOR_NOT_READY', 'error');
        return '';
    }
    
    audioEngine.resetAudioEngineState();
    forceRebuildHatEffects(); 
    
    try {
        applyAsyncProcedureOverrides(javascriptGenerator);
        javascriptGenerator.init(workspace);
        
        const topBlocks = workspace.getTopBlocks(true);
        
        const instrumentBlockTypes = [
            'sb_instrument_container',
            'sb_define_chord'
        ];

        const setupBlockTypes = [
            'sb_master_container',
            'sb_rhythm_sequence'
        ];

        let instrumentCode = '';
        let setupCode = '';
        let executionCode = '';

        topBlocks.forEach(block => {
            // Hat blocks are handled by event listeners, ignore here
            if (block.type === 'sb_serial_data_received' || block.type === 'sb_midi_note_received') return;

            let currentBlock = block;
            
            // Determine category based on the top block type
            let category = 'EXECUTION';
            if (instrumentBlockTypes.includes(block.type)) {
                category = 'INSTRUMENT';
            } else if (setupBlockTypes.includes(block.type)) {
                category = 'SETUP';
            }

            // Generate code for the entire chain starting from this top block
            let chainCode = '';
            while (currentBlock) {
                // Temporarily disconnect the next block to generate code for THIS block only
                const nextBlock = currentBlock.getNextBlock();
                let nextConnection = null;
                let nextTargetConnection = null;

                if (nextBlock) {
                    nextConnection = currentBlock.nextConnection;
                    nextTargetConnection = nextBlock.previousConnection;
                    // Safely disconnect
                    if (nextConnection && nextTargetConnection) {
                        try {
                            if (BlocklyModule.Events.isEnabled()) BlocklyModule.Events.disable();
                            nextConnection.disconnect();
                        } finally {
                            if (!BlocklyModule.Events.isEnabled()) BlocklyModule.Events.enable();
                        }
                    }
                }

                // Generate code
                chainCode += javascriptGenerator.blockToCode(currentBlock);

                // Reconnect
                if (nextBlock && nextConnection && nextTargetConnection) {
                    try {
                        if (BlocklyModule.Events.isEnabled()) BlocklyModule.Events.disable();
                        nextConnection.connect(nextTargetConnection);
                    } finally {
                        if (!BlocklyModule.Events.isEnabled()) BlocklyModule.Events.enable();
                    }
                }

                currentBlock = nextBlock;
            }

            if (category === 'INSTRUMENT') {
                instrumentCode += chainCode;
            } else if (category === 'SETUP') {
                setupCode += chainCode;
            } else {
                executionCode += chainCode;
            }
        });

        // Extract definitions (variables, functions) from the generator
        const variableDefs = [];
        const funcDefs = [];
        const otherDefs = [];
        
        for (let name in javascriptGenerator.definitions_) {
            const def = javascriptGenerator.definitions_[name];
            if (name.startsWith('variable')) {
                variableDefs.push(def);
            } else if (name.startsWith('%')) { 
                funcDefs.push(def);
            } else {
                otherDefs.push(def);
            }
        }
        
        javascriptGenerator.definitions_ = Object.create(null);
        
        // Assemble final code
        let code = [
            '// Variable Declarations',
            variableDefs.join('\n'),
            '// Other Definitions',
            otherDefs.join('\n'),
            '// Function Definitions',
            funcDefs.join('\n\n'),
            '// Instrument Creation',
            instrumentCode,
            '// Setup & Configuration',
            setupCode,
            '// Main Execution',
            executionCode
        ].join('\n\n');
        
        if (!code || code.trim() === '' || (instrumentCode.trim() === '' && setupCode.trim() === '' && executionCode.trim() === '')) {
            logKey('LOG_CODE_EMPTY', 'warning');
        } else {
            logKey('LOG_CODE_GENERATED');
        }
        
        return code;
    } catch (e) {
        // ... (備援模式保留不變)

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
                if (t === 'sb_instrument_container') {
                    const name = block.getFieldValue('NAME') || 'MyInstrument';
                    let branch = '';
                    let inner = block.getInputTargetBlock('STACK');
                    while (inner) {
                        branch += genBlock(inner);
                        inner = inner.getNextBlock();
                    }
                    return `/* INSTRUMENT_DEFINITION:${name} */\n${branch}\n`;
                } else if (t === 'sb_master_container') {
                    let branch = '';
                    let inner = block.getInputTargetBlock('STACK');
                    while (inner) {
                        branch += genBlock(inner);
                        inner = inner.getNextBlock();
                    }
                    return `/* MASTER_DEFINITION */\n${branch}\n`;
                } else if (t === 'sb_create_synth_instrument') {
                    // Fallback for inner block - need name from parent
                    let name = 'DefaultSynth';
                    let p = block.getSurroundParent();
                    if (p && p.type === 'sb_instrument_container') name = p.getFieldValue('NAME');
                    const type = block.getFieldValue('TYPE') || 'PolySynth';
                    return `window.audioEngine.createInstrument('${name}', '${type}');\n`;
                } else if (t === 'sb_play_note') {
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
 * @param {boolean} skipTemplate Whether to skip re-injecting the default template.
 */
export function resetWorkspaceAndAudio(skipTemplate = false) {
    if (workspace) {
        workspace.clear();
        workspace.clearUndo();
        logKey('LOG_WORKSPACE_CLEARED');
        // V2.1: Re-inject default template unless loading a file
        if (!skipTemplate) {
            setupDefaultWorkspace();
        }
    }
    audioEngine.resetAudioEngineState();
    clearLogs(); // Clear ALL logs (both info and error)
    logKey('LOG_ENGINE_RESTARTED');
}