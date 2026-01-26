// js/blocks/keyboard_generators.js

export function registerGenerators(Blockly, javascriptGenerator) {
    if (typeof Blockly === 'undefined' || typeof javascriptGenerator === 'undefined') {
        console.error('javascriptGenerator not available');
        return false;
    }

    // Ensure forBlock exists
    if (!javascriptGenerator.forBlock) {
        javascriptGenerator.forBlock = {};
    }

    javascriptGenerator.forBlock['sb_define_chord'] = function (block, generator) {
        var nameRaw = block.getFieldValue('NAME');
        var name = generator.quote_(nameRaw.trim()); // Trim whitespace
        var notesString = generator.quote_(block.getFieldValue('NOTES_STRING')); 

        return `
        {
            var chordNotesArray = ${notesString}.split(',').map(note => note.trim());
            if (chordNotesArray.length > 0 && chordNotesArray[0] !== '') {
                window.audioEngine.chords[${name}] = chordNotesArray;
                window.audioEngine.logKey('LOG_CHORD_DEFINED', 'info', ${name}, chordNotesArray.join(', '));
            } else {
                window.audioEngine.logKey('LOG_CHORD_ERR', 'error', ${name});
            }
        }
        `;
    };

    javascriptGenerator.forBlock['sb_map_key_to_chord'] = function (block, generator) {
        var keyCode = generator.quote_(block.getFieldValue('KEY_CODE'));
        var chordNameRaw = block.getFieldValue('CHORD_NAME');
        var chordName = generator.quote_(chordNameRaw.trim()); // Trim whitespace

        return `
        {
            let nameToMap = ${chordName};
            if (window.audioEngine.chords[nameToMap]) {
                window.audioEngine.keyboardChordMap[${keyCode}] = nameToMap;
                window.audioEngine.logKey('LOG_KEY_MAPPED', 'info', ${keyCode}, nameToMap);
            } else {
                window.audioEngine.logKey('LOG_KEY_MAP_ERR', 'error', nameToMap, ${keyCode});
            }
        }
        `;
    };

    javascriptGenerator.forBlock['sb_key_action_event'] = function (block, generator) {
        // The code is handled dynamically by blocklyManager.js
        // We just return the inner statements for context if needed, 
        // but primarily the manager extracts this.
        const branch = generator.statementToCode(block, 'DO');
        return branch;
    };

    javascriptGenerator.forBlock['sb_map_key_to_note'] = function (block, generator) {
        var keyCode = generator.quote_(block.getFieldValue('KEY_CODE'));
        var instrument = generator.valueToCode(block, 'INSTRUMENT', generator.ORDER_ATOMIC) || "'DefaultSynth'";
        var note = generator.quote_(block.getFieldValue('NOTE'));

        return `
        window.audioEngine.registerKeyAction(
            ${keyCode}, 
            () => window.audioEngine.playSpecificInstrumentNoteAttack(${instrument}, ${note}), 
            () => { /* Release handled by noteId tracking in controller if needed, currently generic release */ 
                    window.audioEngine.playSpecificInstrumentNoteRelease(${instrument}, ${note}); 
            }
        );\n`;
    };

    javascriptGenerator.forBlock['sb_toggle_pc_keyboard_midi'] = function (block, generator) {
        var action = block.getFieldValue('ACTION');
        return action === 'ON' ? 'window.audioEngine.enablePcKeyboardMidi();\n' : 'window.audioEngine.disablePcKeyboardMidi();\n';
    };

    return true;
}
