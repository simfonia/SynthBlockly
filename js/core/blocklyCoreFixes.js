// js/core/blocklyCoreFixes.js
/**
 * Applies manual fixes to the Blockly JavaScript generator to resolve issues
 * specific to the Vite environment and to support advanced features like Async/Await.
 */
export function applyBlocklyCoreFixes(Blockly, G) {
    if (!G) return;

    // --- 1. Manually Register Standard Generators (Vite side-effects fix) ---
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

    if (!G.forBlock['text']) {
        G.forBlock['text'] = function(block) {
            return [G.quote_(block.getFieldValue('TEXT')), G.ORDER_ATOMIC];
        };
    }

    if (!G.forBlock['variables_get']) {
        G.forBlock['variables_get'] = function(block) {
            const varId = block.getFieldValue('VAR');
            const variable = block.workspace.getVariableMap().getVariableById(varId);
            return [variable ? variable.name : 'undefined', G.ORDER_ATOMIC];
        };
    }

    if (!G.forBlock['logic_compare']) {
        G.forBlock['logic_compare'] = function(block) {
            const op = block.getFieldValue('OP');
            const order = (op === 'EQ' || op === 'NEQ') ? G.ORDER_EQUALITY : G.ORDER_RELATIONAL;
            const argument0 = G.valueToCode(block, 'A', order) || '0';
            const argument1 = G.valueToCode(block, 'B', order) || '0';
            return [argument0 + ' ' + (op === 'EQ' ? '==' : '!=') + ' ' + argument1, order];
        };
    }

    // --- 2. Enforce Async/Await support for all Procedures ---
    G.forBlock['procedures_defnoreturn'] = function(block) {
        const funcName = G.nameDB_.getName(block.getFieldValue('NAME'), 'PROCEDURE');
        let xfix1 = '';
        if (G.STATEMENT_PREFIX) {
            xfix1 += G.injectId(G.STATEMENT_PREFIX, block);
        }
        if (G.TERMINATOR) {
            xfix1 += G.TERMINATOR;
        }
        const branch = G.statementToCode(block, 'STACK');
        let returnValue = '';
        if (block.getInput('RETURN')) {
            returnValue = G.valueToCode(block, 'RETURN', G.ORDER_NONE) || '';
        }
        let xfix2 = '';
        if (returnValue && G.STATEMENT_SUFFIX) {
            xfix2 += G.injectId(G.STATEMENT_SUFFIX, block);
        }
        if (returnValue) {
            returnValue = G.INDENT + 'return ' + returnValue + ';\n';
        }
        const args = [];
        const variables = block.getVars();
        for (let i = 0; i < variables.length; i++) {
            args[i] = G.nameDB_.getName(variables[i], 'VARIABLE');
        }
        // Key: Add 'async' keyword
        let code = 'async function ' + funcName + '(' + args.join(', ') + ') {\n' + xfix1 + branch + xfix2 + returnValue + '}';
        code = G.scrub_(block, code);
        G.definitions_['%' + funcName] = code;
        return null;
    };

    G.forBlock['procedures_defreturn'] = G.forBlock['procedures_defnoreturn'];

    G.forBlock['procedures_callnoreturn'] = function(block) {
        const funcName = G.nameDB_.getName(block.getFieldValue('NAME'), 'PROCEDURE');
        const args = [];
        const variables = block.getVars();
        for (let i = 0; i < variables.length; i++) {
            args[i] = G.valueToCode(block, 'ARG' + i, G.ORDER_NONE) || 'null';
        }
        // Key: Call with 'await'
        const code = 'await ' + funcName + '(' + args.join(', ') + ');\n';
        return code;
    };

    G.forBlock['procedures_callreturn'] = function(block) {
        const funcName = G.nameDB_.getName(block.getFieldValue('NAME'), 'PROCEDURE');
        const args = [];
        const variables = block.getVars();
        for (let i = 0; i < variables.length; i++) {
            args[i] = G.valueToCode(block, 'ARG' + i, G.ORDER_NONE) || 'null';
        }
        // Key: Call with 'await'
        const code = 'await ' + funcName + '(' + args.join(', ') + ')';
        return [code, G.ORDER_AWAIT || 0];
    };
}

/**
 * Ensures all custom SB generators are mounted to the generator instance.
 */
export function syncCustomGenerators(G) {
    const pbsxGens = [
        'sb_play_note', 'sb_play_note_and_wait', 'sb_play_drum', 'sb_set_adsr', 
        'jazzkit_play_drum', 'sb_create_synth_instrument', 'sb_select_current_instrument',
        'sb_set_instrument_vibrato', 'sb_set_instrument_volume', 'math_map',
        'sb_define_chord', 'sb_map_key_to_chord', 'sb_key_action_event', 'sb_map_key_to_note',
        'sb_play_melody', 'sb_play_chord_by_name', 'sb_play_chord_notes', 'sb_get_chord_name',
        'sb_transport_set_bpm', 'sb_transport_count_in', 'sb_rhythm_sequence', 
        'sb_transport_start_stop', 'sb_wait_musical', 'sb_tone_loop', 'sb_stop_all_blockly_loops', 
        'sb_schedule_at_offset', 'sb_container_setup_effect', 'sb_clear_effects',
        'sb_play_sfx', 'sb_play_background_noise', 'sb_stop_background_noise',
        'sb_midi_play', 'sb_map_midi_to_chord', 'sb_serial_check_key_mask',
        'sb_comment', 'sb_console_log', 'sb_instrument_container', 'sb_master_container',
        'sb_container_adsr', 'sb_container_volume', 'sb_container_vibrato', 
        'sb_container_mute', 'sb_container_solo'
    ];
    pbsxGens.forEach(name => {
        if (G[name] && !G.forBlock[name]) {
            G.forBlock[name] = G[name];
        }
    });
}
