// blocks/generators.js
// 自訂積木的 JavaScript 產生器（將輸出可執行的 Tone.js 代碼）

export function registerGenerators(Blockly) {
    if (typeof Blockly === 'undefined' || typeof Blockly.JavaScript === 'undefined') {
        console.error('Blockly.JavaScript not available; please call registerGenerators after javascript_compressed.js has loaded');
        return false;
    }
    var G = Blockly.JavaScript;
    // Also attempt to attach generators to the generator's prototype/constructor prototype.
    // Some Blockly builds call blockToCode with a different `this` binding (an instance),
    // so ensuring the functions exist on the prototype avoids "unknown block type" errors.
    var Gproto = Object.getPrototypeOf(Blockly.JavaScript) || (Blockly.JavaScript.constructor && Blockly.JavaScript.constructor.prototype) || null;
    var GeneratorProto = (Blockly && Blockly.Generator && Blockly.Generator.prototype) ? Blockly.Generator.prototype : null;
    var JSConstructorProto = (Blockly && Blockly.JavaScript && Blockly.JavaScript.constructor && Blockly.JavaScript.constructor.prototype) ? Blockly.JavaScript.constructor.prototype : null;
    // Initialize forBlock if needed (Blockly 12+ uses this structure for lookup)
    if (!G.forBlock) G.forBlock = {};

    G['pbsx_play_note'] = function (block) {
        var note = block.getFieldValue('NOTE') || 'C4';
        var dur = block.getFieldValue('DUR') || '8n';
        return "synth.triggerAttackRelease('" + note + "','" + dur + "');\n";
    };
    try { if (Gproto) Gproto['pbsx_play_note'] = G['pbsx_play_note']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['pbsx_play_note'] = G['pbsx_play_note']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['pbsx_play_note'] = G['pbsx_play_note']; } catch (e) { }
    try { G.forBlock['pbsx_play_note'] = G['pbsx_play_note']; } catch (e) { }

    G['pbsx_play_drum'] = function (block) {
        var type = block.getFieldValue('TYPE');
        var code = '';
        if (type === 'KICK') code = 'playKick();\n';
        else if (type === 'HH') code = "hh.triggerAttackRelease('16n');\n";
        else if (type === 'SNARE') code = "(function(){ var sn = new Tone.NoiseSynth({volume:-6}).toDestination(); sn.triggerAttackRelease('8n'); })();\n";
        return code;
    };
    try { if (Gproto) Gproto['pbsx_play_drum'] = G['pbsx_play_drum']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['pbsx_play_drum'] = G['pbsx_play_drum']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['pbsx_play_drum'] = G['pbsx_play_drum']; } catch (e) { }
    try { G.forBlock['pbsx_play_drum'] = G['pbsx_play_drum']; } catch (e) { }

    G['pbsx_set_adsr'] = function (block) {
        var a = Number(block.getFieldValue('A')) || 0.01;
        var d = Number(block.getFieldValue('D')) || 0.1;
        var s = Number(block.getFieldValue('S')) || 0.5;
        var r = Number(block.getFieldValue('R')) || 1.0;
        return "synth.set({envelope: {attack: " + a + ", decay: " + d + ", sustain: " + s + ", release: " + r + "}});\n";
    };
    try { if (Gproto) Gproto['pbsx_set_adsr'] = G['pbsx_set_adsr']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['pbsx_set_adsr'] = G['pbsx_set_adsr']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['pbsx_set_adsr'] = G['pbsx_set_adsr']; } catch (e) { }
    try { G.forBlock['pbsx_set_adsr'] = G['pbsx_set_adsr']; } catch (e) { }

    // Expose a global fallback for legacy code that expects window.registerPBSGenerators
    try { window.registerPBSGenerators = function (b) { return registerGenerators(b || Blockly); }; } catch (e) { }
    return true;
}
