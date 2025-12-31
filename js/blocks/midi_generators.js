// js/blocks/midi_generators.js

export function registerGenerators(Blockly, javascriptGenerator) {
    if (typeof Blockly === 'undefined' || typeof javascriptGenerator === 'undefined') {
        console.error('javascriptGenerator not available');
        return false;
    }

    // Ensure forBlock exists
    if (!javascriptGenerator.forBlock) {
        javascriptGenerator.forBlock = {};
    }

    javascriptGenerator.forBlock['sb_midi_note_received'] = function (block, generator) {
        // Handled by live listener
        return '';
    };

    javascriptGenerator.forBlock['sb_midi_play'] = function (block, generator) {
        var note = generator.valueToCode(block, 'NOTE', generator.ORDER_ATOMIC) || "60";
        var velocity = generator.valueToCode(block, 'VELOCITY', generator.ORDER_ATOMIC) || "1";
        var channel = generator.valueToCode(block, 'CHANNEL', generator.ORDER_ATOMIC) || "1";
        return `window.audioEngine.midiAttack(${note}, Number(${velocity}), ${channel});\n`;
    };

    javascriptGenerator.forBlock['sb_map_midi_to_chord'] = function (block, generator) {
        var midiNote = block.getFieldValue('MIDI_NOTE');
        var chordNameRaw = block.getFieldValue('CHORD_NAME');
        var chordName = generator.quote_(chordNameRaw.trim());

        return `
        {
            let nameToMap = ${chordName};
            if (window.audioEngine.chords[nameToMap]) {
                window.audioEngine.midiChordMap[${midiNote}] = nameToMap;
                window.audioEngine.logKey('LOG_MIDI_MAPPED', 'info', ${midiNote}, nameToMap);
            } else {
                window.audioEngine.logKey('LOG_MIDI_MAP_ERR', 'error', nameToMap, ${midiNote});
            }
        }
        `;
    };

    return true;
}
