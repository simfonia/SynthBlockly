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

    G['sb_serial_data_received'] = function (block) {
        // This hat block is handled by a live event listener in main.js.
        // It should not generate any code for the 'Run Blocks' button.
        return '';
    };
    try { if (Gproto) Gproto['sb_serial_data_received'] = G['sb_serial_data_received']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_serial_data_received'] = G['sb_serial_data_received']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_serial_data_received'] = G['sb_serial_data_received']; } catch (e) { }
    try { G.forBlock['sb_serial_data_received'] = G['sb_serial_data_received']; } catch (e) { }

    return true;
}
