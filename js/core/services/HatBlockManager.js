// js/core/services/HatBlockManager.js
import { syncCustomGenerators } from '../blocklyCoreFixes.js';
import { logKey } from '../../ui/logger.js';
import { registerMidiListener, unregisterMidiListener } from '../midiEngine.js';

export class HatBlockManager {
    constructor(audioEngine, javascriptGenerator) {
        this.audioEngine = audioEngine;
        this.G = javascriptGenerator;
        this.workspace = null;
        this.blockListeners = {};
    }

    setWorkspace(ws) {
        this.workspace = ws;
    }

    updateAll(ws) {
        if (ws) this.workspace = ws;
        if (!this.workspace) return;

        const serialHats = this.workspace.getBlocksByType('sb_serial_data_received', false);
        const midiHats = this.workspace.getBlocksByType('sb_midi_note_received', false);
        const keyActionHats = this.workspace.getBlocksByType('sb_key_action_event', false);
        const registeredIds = Object.keys(this.blockListeners);
        const allCurrentHats = [...serialHats, ...midiHats, ...keyActionHats];
        const allCurrentHatIds = allCurrentHats.map(b => b.id);

        // 1. Unregister hats that no longer exist
        registeredIds.forEach(blockId => {
            if (!allCurrentHatIds.includes(blockId)) {
                this.unregisterById(blockId);
            }
        });

        // 2. Register or Update existing hats
        allCurrentHats.forEach(block => {
            if (this.blockListeners[block.id]) {
                const current = this.blockListeners[block.id];
                
                this.G.init(this.workspace);
                syncCustomGenerators(this.G); 
                const newCode = this.G.statementToCode(block, 'DO');
                this.G.finish('');
                
                let changed = false;
                if (block.type === 'sb_serial_data_received') {
                    const varId = block.getFieldValue('DATA');
                    const newVarName = block.workspace.getVariableMap().getVariableById(varId)?.name || "";
                    if (current.code !== newCode || current.varName !== newVarName) changed = true;
                } else if (block.type === 'sb_midi_note_received') {
                    const varId = block.getFieldValue('NOTE');
                    const newVarName = block.workspace.getVariableMap().getVariableById(varId)?.name || "";
                    if (current.code !== newCode || current.varName !== newVarName) changed = true;
                } else if (block.type === 'sb_key_action_event') {
                    const newKeyCode = block.getFieldValue('KEY_CODE');
                    const newTriggerMode = block.getFieldValue('TRIGGER_MODE');
                    if (current.code !== newCode || current.keyCode !== newKeyCode || current.triggerMode !== newTriggerMode) changed = true;
                }

                if (!changed) return; 
                this.unregisterById(block.id);
            }

            // Register the hat
            if (block.type === 'sb_serial_data_received') this.registerSerial(block);
            else if (block.type === 'sb_midi_note_received') this.registerMidi(block);
            else if (block.type === 'sb_key_action_event') this.registerKeyAction(block);
        });
    }

    unregisterById(blockId) {
        const entry = this.blockListeners[blockId];
        if (!entry) return;

        if (entry.type === 'serial') {
            window.unregisterSerialDataListener(entry.listener);
            logKey('LOG_SERIAL_UNREGISTERED', 'info', blockId);
        } else if (entry.type === 'midi') {
            unregisterMidiListener(entry.listener);
            logKey('LOG_MIDI_UNREGISTERED', 'info', blockId);
        } else if (entry.type === 'key_action') {
            if (this.audioEngine.keyActionMap[entry.keyCode]) {
                delete this.audioEngine.keyActionMap[entry.keyCode];
            }
        }
        delete this.blockListeners[blockId];
    }

    _extractAndApplyEffects(code) {
        const configMatches = code.match(/\/\* EFFECT_CONFIG:(.*?) \*\//g);
        if (configMatches) {
            try {
                const configs = configMatches.map(comment => {
                    const jsonStr = comment.match(/EFFECT_CONFIG:(.*?) \*\//)[1];
                    return JSON.parse(jsonStr);
                });
                this.audioEngine.rebuildEffectChain(configs);
            } catch (e) {
                console.warn("Failed to parse effect config from event block:", e);
            }
        }
        // Return cleaned code
        let cleanCode = code.replace(/\/\* EFFECT_CONFIG:.*? \*\//g, "").trim();
        cleanCode = cleanCode.replace(/window\.audioEngine\.addEffectToChain\(.*\);\n?/g, "").trim();
        return cleanCode;
    }

    registerSerial(block) {
        if (!block || this.blockListeners[block.id]) return;
        syncCustomGenerators(this.G);
        this.G.init(this.workspace);
        const rawCode = this.G.statementToCode(block, 'DO');
        this.G.finish('');
        
        const cleanCode = this._extractAndApplyEffects(rawCode);
        if (!cleanCode) return;

        const variableId = block.getFieldValue('DATA');
        const variable = block.workspace.getVariableMap().getVariableById(variableId);
        if (!variable) return;
        const varData = variable.name;

        try {
            const functionBody = "return (async () => { try { " + cleanCode + " } catch (e) { console.error('Error executing Serial Code:', e); } })();";
            const executeCode = new Function(varData, functionBody);
            const listenerFunction = async (line) => { await executeCode((typeof line === 'string') ? line.trim() : line); };
            
            window.registerSerialDataListener(listenerFunction);
            this.blockListeners[block.id] = { type: 'serial', listener: listenerFunction, code: cleanCode, varName: varData };
            logKey('LOG_SERIAL_REGISTERED', 'info', block.id);
        } catch (e) { logKey('LOG_EXEC_ERR', 'error', e.message); }
    }

    registerMidi(block) {
        if (!block || this.blockListeners[block.id]) return;
        syncCustomGenerators(this.G);
        this.G.init(this.workspace);
        const rawCode = this.G.statementToCode(block, 'DO');
        this.G.finish('');
        
        const cleanCode = this._extractAndApplyEffects(rawCode);
        if (!cleanCode) return;

        const noteVar = block.workspace.getVariableMap().getVariableById(block.getFieldValue('NOTE'))?.name;
        const velocityVar = block.workspace.getVariableMap().getVariableById(block.getFieldValue('VELOCITY'))?.name;
        const channelVar = block.workspace.getVariableMap().getVariableById(block.getFieldValue('CHANNEL'))?.name;
        
        if (!noteVar || !velocityVar || !channelVar) {
            logKey('LOG_MIDI_VAR_ERR', 'error');
            return;
        }

        try {
            const listenerFunction = new Function(noteVar, '_rawVelocity', channelVar, `(async () => {
                const ${velocityVar} = _rawVelocity / 127; 
                ${cleanCode}
            })();`);
            registerMidiListener(listenerFunction);
            this.blockListeners[block.id] = { type: 'midi', listener: listenerFunction, code: cleanCode };
            logKey('LOG_MIDI_REGISTERED', 'info', block.id);
        } catch (e) { logKey('LOG_EXEC_ERR', 'error', e.message); }
    }

    registerKeyAction(block) {
        if (!block || this.blockListeners[block.id]) return;
        const keyCode = block.getFieldValue('KEY_CODE');
        const triggerMode = block.getFieldValue('TRIGGER_MODE');
        
        syncCustomGenerators(this.G);
        this.G.init(this.workspace);
        const rawCode = this.G.statementToCode(block, 'DO');
        this.G.finish('');
        
        const cleanCode = this._extractAndApplyEffects(rawCode);
        if (!cleanCode) return;

        try {
            const functionBody = "return (async () => { try { " + cleanCode + " } catch (e) { console.error('Error executing Key Action Code:', e); } })();";
            const executeCode = new Function(functionBody);
            
            if (triggerMode === 'PRESS') this.audioEngine.registerKeyAction(keyCode, executeCode, null);
            else if (triggerMode === 'RELEASE') this.audioEngine.registerKeyAction(keyCode, null, executeCode);
            
            this.blockListeners[block.id] = { type: 'key_action', keyCode, triggerMode, code: cleanCode };
        } catch (e) { logKey('LOG_EXEC_ERR', 'error', e.message); }
    }

    forceRebuildEffects() {
        if (!this.workspace) return;
        const serialHats = this.workspace.getBlocksByType('sb_serial_data_received', false);
        const midiHats = this.workspace.getBlocksByType('sb_midi_note_received', false);
        const keyHats = this.workspace.getBlocksByType('sb_key_action_event', false);
        
        [...serialHats, ...midiHats, ...keyHats].forEach(block => {
            this.G.init(this.workspace);
            const rawCode = this.G.statementToCode(block, 'DO');
            this.G.finish('');
            this._extractAndApplyEffects(rawCode); // This will call rebuildEffectChain
        });
    }
}
