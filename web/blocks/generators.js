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
        return "synth.triggerAttackRelease('" + note + "','" + dur + "');\n";
    };
    try { if (Gproto) Gproto['sb_play_note'] = G['sb_play_note']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_play_note'] = G['sb_play_note']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_play_note'] = G['sb_play_note']; } catch (e) { }
    try { G.forBlock['sb_play_note'] = G['sb_play_note']; } catch (e) { }

    G['sb_play_drum'] = function (block) {
        var type = block.getFieldValue('TYPE');
        var code = '';
        if (type === 'KICK') code = 'playKick();\n';
        else if (type === 'HH') code = "hh.triggerAttackRelease('16n');\n";
        else if (type === 'SNARE') code = "(function(){ var sn = new Tone.NoiseSynth({volume:-6}).toDestination(); sn.triggerAttackRelease('8n'); })();\n";
        return code;
    };
    try { if (Gproto) Gproto['sb_play_drum'] = G['sb_play_drum']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_play_drum'] = G['sb_play_drum']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_play_drum'] = G['sb_play_drum']; } catch (e) { }
    try { G.forBlock['sb_play_drum'] = G['sb_play_drum']; } catch (e) { }

    G['sb_set_adsr'] = function (block) {
        var a = Number(block.getFieldValue('A')) || 0.01;
        var d = Number(block.getFieldValue('D')) || 0.1;
        var s = Number(block.getFieldValue('S')) || 0.5;
        var r = Number(block.getFieldValue('R')) || 1.0;
        return "synth.set({envelope: {attack: " + a + ", decay: " + d + ", sustain: " + s + ", release: " + r + "}});\n";
    };
    try { if (Gproto) Gproto['sb_set_adsr'] = G['sb_set_adsr']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_set_adsr'] = G['sb_set_adsr']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_set_adsr'] = G['sb_set_adsr']; } catch (e) { }
    try { G.forBlock['sb_set_adsr'] = G['sb_set_adsr']; } catch (e) { }

    G['sb_midi_note_received'] = function (block) {
        const functionName = this.nameDB_.getName(block.id, Blockly.Names.NameType.PROCEDURE);

        // Correct way to get variable names in Blockly v9+
        const noteVarId = block.getFieldValue('NOTE');
        const velocityVarId = block.getFieldValue('VELOCITY');
        const channelVarId = block.getFieldValue('CHANNEL');

        const noteVar = block.workspace.getVariableMap().getVariableById(noteVarId);
        const velocityVar = block.workspace.getVariableMap().getVariableById(velocityVarId);
        const channelVar = block.workspace.getVariableMap().getVariableById(channelVarId);

        if (!noteVar || !velocityVar || !channelVar) {
            return `// Error: One or more variables not found for MIDI event block.\n`;
        }
        
        const varNote = noteVar.name;
        const varVelocity = velocityVar.name;
        const varChannel = channelVar.name;

        const statements = Blockly.JavaScript.statementToCode(block, 'DO');

        const midiEventHandlerCode = `
var ${functionName} = function(${varNote}, ${varVelocity}, ${varChannel}) {
    ${statements}
};
`;
        Blockly.JavaScript.definitions_['midi_event_handler_' + block.id] = midiEventHandlerCode;
        Blockly.JavaScript.setups_['midi_listener_' + block.id] = `window.registerMidiNoteListener(${functionName});`;

        return ''; // Hat blocks usually don't return code themselves
    }.bind(G);
    try { if (Gproto) Gproto['sb_midi_note_received'] = G['sb_midi_note_received']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_midi_note_received'] = G['sb_midi_note_received']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_midi_note_received'] = G['sb_midi_note_received']; } catch (e) { }
    try { G.forBlock['sb_midi_note_received'] = G['sb_midi_note_received']; } catch (e) { }

    G['sb_serial_data_received'] = function (block) {
        const functionName = this.nameDB_.getName(block.id, Blockly.Names.NameType.PROCEDURE);
        
        // Correct way to get variable name in Blockly v9+
        const variableId = block.getFieldValue('DATA');
        const variable = block.workspace.getVariableMap().getVariableById(variableId);
        if (!variable) {
            return `// Error: variable with ID "${variableId}" not found.\n`;
        }
        const varData = variable.name;

        const statements = Blockly.JavaScript.statementToCode(block, 'DO');

        const serialEventHandlerCode = `
var ${functionName} = function(${varData}) {
    ${statements}
};
`;
        Blockly.JavaScript.definitions_['serial_event_handler_' + block.id] = serialEventHandlerCode;
        Blockly.JavaScript.setups_['serial_listener_' + block.id] = `window.registerSerialDataListener(${functionName});`;

        return ''; // Hat blocks usually don't return code themselves
    }.bind(G);
    try { if (Gproto) Gproto['sb_serial_data_received'] = G['sb_serial_data_received']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_serial_data_received'] = G['sb_serial_data_received']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_serial_data_received'] = G['sb_serial_data_received']; } catch (e) { }
    try { G.forBlock['sb_serial_data_received'] = G['sb_serial_data_received']; } catch (e) { }
    
    // Expose a global fallback for legacy code that expects window.registerSBGenerators
    try { window.registerSBGenerators = function (b) { return registerGenerators(b || Blockly); }; } catch (e) { }
    return true;
}
