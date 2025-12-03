// blocks/generators.js
// 自訂積木的 JavaScript 產生器（將輸出可執行的 Tone.js 代碼）

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

    G['sb_play_note'] = function (block) {
        var note = block.getFieldValue('NOTE') || 'C4';
        var dur = block.getFieldValue('DUR') || '8n';
        return "window.audioEngine.synth.triggerAttackRelease('" + note + "','" + dur + "');\n";
    }.bind(G);
    try { if (Gproto) Gproto['sb_play_note'] = G['sb_play_note']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_play_note'] = G['sb_play_note']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_play_note'] = G['sb_play_note']; } catch (e) { }
    try { G.forBlock['sb_play_note'] = G['sb_play_note']; } catch (e) { }

    G['sb_play_drum'] = function (block) {
        var type = block.getFieldValue('TYPE');
        var code = '';
        if (type === 'KICK') code = 'window.audioEngine.playKick();';
        else if (type === 'SNARE') code = 'window.audioEngine.playSnare();';
        else if (type === 'HH') code = "window.audioEngine.hh.triggerAttackRelease('16n');";
        return code;
    }.bind(G);
    try { if (Gproto) Gproto['sb_play_drum'] = G['sb_play_drum']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_play_drum'] = G['sb_play_drum']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_play_drum'] = G['sb_play_drum']; } catch (e) { }
    try { G.forBlock['sb_play_drum'] = G['sb_play_drum']; } catch (e) { }

    G['sb_set_adsr'] = function (block) {
        var a = Number(block.getFieldValue('A')) || 0.01;
        var d = Number(block.getFieldValue('D')) || 0.1;
        var s = Number(block.getFieldValue('S')) || 0.5;
        var r = Number(block.getFieldValue('R')) || 1.0;
        return "window.audioEngine.synth.set({envelope: {attack: " + a + ", decay: " + d + ", sustain: " + s + ", release: " + r + "}});\n";
    }.bind(G);
    try { if (Gproto) Gproto['sb_set_adsr'] = G['sb_set_adsr']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_set_adsr'] = G['sb_set_adsr']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_set_adsr'] = G['sb_set_adsr']; } catch (e) { }
    try { G.forBlock['sb_set_adsr'] = G['sb_set_adsr']; } catch (e) { }

    G['sb_midi_note_received'] = function (block) {
        // This hat block is handled by a live event listener in main.js.
        // It should not generate any code for the 'Run Blocks' button.
        return '';
    }.bind(G);
    try { if (Gproto) Gproto['sb_midi_note_received'] = G['sb_midi_note_received']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_midi_note_received'] = G['sb_midi_note_received']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_midi_note_received'] = G['sb_midi_note_received']; } catch (e) { }

    G['sb_serial_data_received'] = function (block) {
        // This hat block is handled by a live event listener in main.js.
        // It should not generate any code for the 'Run Blocks' button.
        return '';
    };
    
    // Expose a global fallback for legacy code that expects window.registerSBGenerators
    try { window.registerSBGenerators = function (b) { return registerGenerators(b || Blockly); }; } catch (e) { }
    return true;
}
