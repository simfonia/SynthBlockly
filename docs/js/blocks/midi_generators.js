export function registerGenerators(Blockly) {
    if (typeof Blockly === 'undefined' || typeof Blockly.JavaScript === 'undefined') {
        console.error('Blockly.JavaScript not available; please call registerGenerators after javascript_compressed.js has loaded');
        return false;
    }
    var G = Blockly.JavaScript;

    // Manually initialize setups_ and definitions_ as they are not default properties
    // on the global generator object in some Blockly versions. This is the key fix.
    if (!G.definitions_) {
        G.definitions_ = Object.create(null);
    }
    if (!G.setups_) {
        G.setups_ = Object.create(null);
    }

    // Also attempt to attach generators to the generator's prototype/constructor prototype.
    // Some Blockly builds call blockToCode with a different `this` binding (an instance),
    // so ensuring the functions exist on the prototype avoids "unknown block type" errors.
    var Gproto = Object.getPrototypeOf(Blockly.JavaScript) || (Blockly.JavaScript.constructor && Blockly.JavaScript.constructor.prototype) || null;
    var GeneratorProto = (Blockly && Blockly.Generator && Blockly.Generator.prototype) ? Blockly.Generator.prototype : null;
    var JSConstructorProto = (Blockly && Blockly.JavaScript && Blockly.JavaScript.constructor && Blockly.JavaScript.constructor.prototype) ? Blockly.JavaScript.constructor.prototype : null;
    // Initialize forBlock if needed (Blockly 12+ uses this structure for lookup)
    if (!G.forBlock) G.forBlock = {};

    G['sb_midi_note_received'] = function (block) {
        // This hat block is handled by a live event listener in main.js.
        // It should not generate any code for the 'Run Blocks' button.
        return '';
    }.bind(G);
    try { if (Gproto) Gproto['sb_midi_note_received'] = G['sb_midi_note_received']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_midi_note_received'] = G['sb_midi_note_received']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_midi_note_received'] = G['sb_midi_note_received']; } catch (e) { }
    try { G.forBlock['sb_midi_note_received'] = G['sb_midi_note_received']; } catch (e) { }

    // NEW: MIDI Play Generator
    G['sb_midi_play'] = function(block) {
        var note = Blockly.JavaScript.valueToCode(block, 'NOTE', Blockly.JavaScript.ORDER_ATOMIC) || "60"; // Default to MIDI number 60
        var velocity = Blockly.JavaScript.valueToCode(block, 'VELOCITY', Blockly.JavaScript.ORDER_ATOMIC) || "1"; // Default to 1 (full velocity)
        var channel = Blockly.JavaScript.valueToCode(block, 'CHANNEL', Blockly.JavaScript.ORDER_ATOMIC) || "1"; // Default to MIDI channel 1

        // Ensure velocity is always a number (normalized 0-1)
        velocity = `Number(${velocity})`;

        // The midiAttack function in audioEngine will handle note/chord mapping and actual Tone.js attack
        return `window.audioEngine.midiAttack(${note}, ${velocity}, ${channel});\n`;
    }.bind(G);
    try { if (Gproto) Gproto['sb_midi_play'] = G['sb_midi_play']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_midi_play'] = G['sb_midi_play']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_midi_play'] = G['sb_midi_play']; } catch (e) { }
    try { G.forBlock['sb_midi_play'] = G['sb_midi_play']; } catch (e) { }

    // --- NEW: Map MIDI Note to Chord Generator ---
    G['sb_map_midi_to_chord'] = function (block) {
        var midiNote = block.getFieldValue('MIDI_NOTE'); // MIDI Note number (0-127)
        var chordName = Blockly.JavaScript.quote_(block.getFieldValue('CHORD_NAME')); // Quote the chord name
        
        var code = `
        if (window.audioEngine.chords[${chordName}]) {
            window.audioEngine.midiChordMap[${midiNote}] = ${chordName};
            window.audioEngine.log('MIDI 音符 ' + ${midiNote} + ' 已映射到和弦 ' + ${chordName} + '。');
        } else {
            window.audioEngine.log('錯誤: 和弦 ' + ${chordName} + ' 不存在。無法映射 MIDI 音符 ' + ${midiNote} + '。');
        }
    `;
        return code + '\n';
    }.bind(G);
    try { if (Gproto) Gproto['sb_map_midi_to_chord'] = G['sb_map_midi_to_chord']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_map_midi_to_chord'] = G['sb_map_midi_to_chord']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_map_midi_to_chord'] = G['sb_map_midi_to_chord']; } catch (e) { }
    try { G.forBlock['sb_map_midi_to_chord'] = G['sb_map_midi_to_chord']; } catch (e) { }

    return true;
}
