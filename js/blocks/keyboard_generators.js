export function registerGenerators(Blockly, javascriptGenerator) {
    if (typeof Blockly === 'undefined' || typeof javascriptGenerator === 'undefined') { // Check javascriptGenerator instead
        console.error('javascriptGenerator not available; please call registerGenerators after javascript_compressed.js has loaded');
        return false;
    }
    var G = javascriptGenerator;

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
    var Gproto = Object.getPrototypeOf(G) || (G.constructor && G.constructor.prototype) || null; // Use G for prototype
    var GeneratorProto = (Blockly && Blockly.Generator && Blockly.Generator.prototype) ? Blockly.Generator.prototype : null;
    var JSConstructorProto = (Blockly && G && G.constructor && G.constructor.prototype) ? G.constructor.prototype : null; // Use G for constructor
    // Initialize forBlock if needed (Blockly 12+ uses this structure for lookup)
    if (!G.forBlock) G.forBlock = {};

    G['sb_define_chord'] = function (block) {
        var name = G.quote_(block.getFieldValue('NAME')); // Quote the chord name
        var notesString = G.quote_(block.getFieldValue('NOTES_STRING')); // Quote the note string

        var code = `
        const chordNotesArray = ${notesString}.split(',').map(note => note.trim());
        if (chordNotesArray.length > 0 && chordNotesArray[0] !== '') {
            window.audioEngine.chords[${name}] = chordNotesArray;
            window.audioEngine.log('和弦 ' + ${name} + ' 已定義: ' + chordNotesArray.join(', '));
        } else {
            window.audioEngine.log('錯誤: 無法定義和弦 ' + ${name} + '。請提供有效的音符列表。');
        }
    `;
        return code + '\n';
    }.bind(G);
    try { if (Gproto) Gproto['sb_define_chord'] = G['sb_define_chord']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_define_chord'] = G['sb_define_chord']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_define_chord'] = G['sb_define_chord']; } catch (e) { }
    try { G.forBlock['sb_define_chord'] = G['sb_define_chord']; } catch (e) { }

    G['sb_map_key_to_chord'] = function (block) {
        var keyCode = G.quote_(block.getFieldValue('KEY_CODE')); // Quote the key code
        var chordName = G.quote_(block.getFieldValue('CHORD_NAME')); // Quote the chord name

        var code = `
        if (window.audioEngine.chords[${chordName}]) {
            window.audioEngine.keyboardChordMap[${keyCode}] = ${chordName};
            window.audioEngine.log('鍵盤按鍵 ' + ${keyCode} + ' 已映射到和弦 ' + ${chordName} + '。');
        } else {
            window.audioEngine.log('錯誤: 和弦 ' + ${chordName} + ' 不存在。無法映射按鍵 ' + ${keyCode} + '。');
        }
    `;
        return code + '\n';
    }.bind(G);
    try { if (Gproto) Gproto['sb_map_key_to_chord'] = G['sb_map_key_to_chord']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_map_key_to_chord'] = G['sb_map_key_to_chord']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_map_key_to_chord'] = G['sb_map_key_to_chord']; } catch (e) { }
    try { G.forBlock['sb_map_key_to_chord'] = G['sb_map_key_to_chord']; } catch (e) { }

    G['sb_toggle_pc_keyboard_midi'] = function (block) {
        var action = block.getFieldValue('ACTION');
        var code = '';
        if (action === 'ON') {
            code = 'window.audioEngine.enablePcKeyboardMidi();\n';
        } else { // 'OFF'
            code = 'window.audioEngine.disablePcKeyboardMidi();\n';
        }
        return code;
    }.bind(G);
    try { if (Gproto) Gproto['sb_toggle_pc_keyboard_midi'] = G['sb_toggle_pc_keyboard_midi']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_toggle_pc_keyboard_midi'] = G['sb_toggle_pc_keyboard_midi']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_toggle_pc_keyboard_midi'] = G['sb_toggle_pc_keyboard_midi']; } catch (e) { }
    try { G.forBlock['sb_toggle_pc_keyboard_midi'] = G['sb_toggle_pc_keyboard_midi']; } catch (e) { }

    return true;
}
