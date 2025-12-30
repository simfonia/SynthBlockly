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

    G['sb_transport_set_bpm'] = function (block) {
        var bpm = Number(block.getFieldValue('BPM')) || 120;
        return `window.audioEngine.Tone.Transport.bpm.value = ${bpm};
`;
    }.bind(G);
    try { if (Gproto) Gproto['sb_transport_set_bpm'] = G['sb_transport_set_bpm']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_transport_set_bpm'] = G['sb_transport_set_bpm']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_transport_set_bpm'] = G['sb_transport_set_bpm']; } catch (e) { }
    try { G.forBlock['sb_transport_set_bpm'] = G['sb_transport_set_bpm']; } catch (e) { }

    G['sb_transport_start_stop'] = function (block) {
        var action = block.getFieldValue('ACTION');
        if (action === 'START') {
            return 'window.audioEngine.Tone.Transport.start();\n';
        } else {
            return 'window.audioEngine.Tone.Transport.stop();\n';
        }
    }.bind(G);
    try { if (Gproto) Gproto['sb_transport_start_stop'] = G['sb_transport_start_stop']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_transport_start_stop'] = G['sb_transport_start_stop']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_transport_start_stop'] = G['sb_transport_start_stop']; } catch (e) { }
    try { G.forBlock['sb_transport_start_stop'] = G['sb_transport_start_stop']; } catch (e) { }

    G['sb_wait_musical'] = function (block) {
        var duration = block.getFieldValue('DURATION');
        // The conversion to milliseconds must happen at runtime, because BPM can change.
        return `
await new Promise(resolve => setTimeout(resolve, window.audioEngine.Tone.Time('${duration}').toMilliseconds()));
if (!window.audioEngine.isExecutionActive) return;
`;
    }.bind(G);
    try { if (Gproto) Gproto['sb_wait_musical'] = G['sb_wait_musical']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_wait_musical'] = G['sb_wait_musical']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_wait_musical'] = G['sb_wait_musical']; } catch (e) { }
    try { G.forBlock['sb_wait_musical'] = G['sb_wait_musical']; } catch (e) { }

    G['sb_tone_loop'] = function (block) {
        var interval = block.getFieldValue('INTERVAL'); // FIX: Get interval value from block
        var loopId = 'loop_' + block.id; // Unique ID for each loop instance
        var doCode = G.statementToCode(block, 'DO');

        // Ensure the global loops object exists in the definitions_ section
        G.definitions_['loops_global_init'] = 'window.blocklyLoops = window.blocklyLoops || {};';

        // Generate code to create and start the loop
        var code = `
// Clear existing loop for this block ID if it exists
if (window.blocklyLoops['${loopId}']) {
    window.blocklyLoops['${loopId}'].dispose();
}
window.blocklyLoops['${loopId}'] = new window.audioEngine.Tone.Loop(async (time) => {
    if (!window.audioEngine.isExecutionActive) return;
    // Make 'time' available to inner blocks if they need it (e.g., for scheduling children)
    ${doCode}
}, '${interval}');
window.blocklyLoops['${loopId}'].start(0); // Start the loop from the beginning of the Transport
`;
        return code;
    }.bind(G);
    try { if (Gproto) Gproto['sb_tone_loop'] = G['sb_tone_loop']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_tone_loop'] = G['sb_tone_loop']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_tone_loop'] = G['sb_tone_loop']; } catch (e) { }
    try { G.forBlock['sb_tone_loop'] = G['sb_tone_loop']; } catch (e) { }

    G['sb_stop_all_blockly_loops'] = function (block) {
        var code = `
if (window.blocklyLoops) {
    for (const loopId in window.blocklyLoops) {
        if (window.blocklyLoops.hasOwnProperty(loopId) && window.blocklyLoops[loopId] instanceof window.audioEngine.Tone.Loop) {
            window.blocklyLoops[loopId].dispose();
        }
    }
    window.blocklyLoops = {}; // Clear the object
}
`;
        return code;
    }.bind(G);
    try { if (Gproto) Gproto['sb_stop_all_blockly_loops'] = G['sb_stop_all_blockly_loops']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_stop_all_blockly_loops'] = G['sb_stop_all_blockly_loops']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_stop_all_blockly_loops'] = G['sb_stop_all_blockly_loops']; } catch (e) { }
    try { G.forBlock['sb_stop_all_blockly_loops'] = G['sb_stop_all_blockly_loops']; } catch (e) { }

    G['sb_schedule_at_offset'] = function (block) {
        var offset = block.getFieldValue('OFFSET');
        var doCode = G.statementToCode(block, 'DO');

        var code = `
{
    // 'time' (from Tone.Loop callback) is a number (seconds)
    // 'offset' (from block field) is a string (e.g., '8n', '0:0:2')

    // First, convert the string offset into seconds.
    // This requires creating a Tone.Time object and then calling .toSeconds().
    // We confirmed 'new Tone.Time()' creates an object, even if .add() is missing.
    // We assume .toSeconds() will work correctly.
    const offsetInSeconds = (new window.audioEngine.Tone.Time('${offset}')).toSeconds(); 
    
    // Calculate the scheduled time by adding the base time (in seconds) and the offset (in seconds).
    const scheduledTime = time + offsetInSeconds;
    
    // Original code, assuming scheduledTime is a number (seconds)
    ${doCode}
}
`;
        return code;
    }.bind(G);
    try { if (Gproto) Gproto['sb_schedule_at_offset'] = G['sb_schedule_at_offset']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_schedule_at_offset'] = G['sb_schedule_at_offset']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_schedule_at_offset'] = G['sb_schedule_at_offset']; } catch (e) { }
    try { G.forBlock['sb_schedule_at_offset'] = G['sb_schedule_at_offset']; } catch (e) { }

    return true;
}
