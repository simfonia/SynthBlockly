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
        var note = Blockly.JavaScript.valueToCode(block, 'NOTE', Blockly.JavaScript.ORDER_ATOMIC) || "60"; // Default to MIDI number 60 for Tone.Midi
        var dur = block.getFieldValue('DUR') || '8n';
        var velocity = Blockly.JavaScript.valueToCode(block, 'VELOCITY', Blockly.JavaScript.ORDER_ATOMIC) || 1;

        // Always convert note input to musical notation string using Tone.Midi().toNote()
        var processedNote = `Tone.Midi(${note}).toNote()`;

        // Ensure velocity is always a number
        velocity = `Number(${velocity})`;

        return `window.audioEngine.playCurrentInstrumentNote(${processedNote}, '${dur}', (typeof scheduledTime !== 'undefined' ? scheduledTime : Tone.now()), ${velocity});\n`;
    }.bind(G);
    try { if (Gproto) Gproto['sb_play_note'] = G['sb_play_note']; } catch (e) { } 
    try { if (GeneratorProto) GeneratorProto['sb_play_note'] = G['sb_play_note']; } catch (e) { } 
    try { if (JSConstructorProto) JSConstructorProto['sb_play_note'] = G['sb_play_note']; } catch (e) { } 
    try { G.forBlock['sb_play_note'] = G['sb_play_note']; } catch (e) { }

    // --- NEW: Play Note and Wait (Blocking) Generator ---
    G['sb_play_note_and_wait'] = function (block) {
        var note = Blockly.JavaScript.valueToCode(block, 'NOTE', Blockly.JavaScript.ORDER_ATOMIC) || "60"; // Default to MIDI number 60 for Tone.Midi
        var dur = block.getFieldValue('DUR') || '4n';
        var velocity = Blockly.JavaScript.valueToCode(block, 'VELOCITY', Blockly.JavaScript.ORDER_ATOMIC) || 1;

        // Always convert note input to musical notation string using Tone.Midi().toNote()
        var processedNote = `Tone.Midi(${note}).toNote()`;

        // Ensure velocity is always a number
        velocity = `Number(${velocity})`;

        var code = `
await window.audioEngine.playCurrentInstrumentNote(${processedNote}, '${dur}', (typeof scheduledTime !== 'undefined' ? scheduledTime : Tone.now()), ${velocity});
await new Promise(resolve => setTimeout(resolve, window.audioEngine.Tone.Time('${dur}').toMilliseconds()));
`;
        return code;
    }.bind(G);
    try { if (Gproto) Gproto['sb_play_note_and_wait'] = G['sb_play_note_and_wait']; } catch (e) { } 
    try { if (GeneratorProto) GeneratorProto['sb_play_note_and_wait'] = G['sb_play_note_and_wait']; } catch (e) { } 
    try { if (JSConstructorProto) JSConstructorProto['sb_play_note_and_wait'] = G['sb_play_note_and_wait']; } catch (e) { } 
    try { G.forBlock['sb_play_note_and_wait'] = G['sb_play_note_and_wait']; } catch (e) { }

    G['sb_play_drum'] = function (block) {
        var type = block.getFieldValue('TYPE');
        var velocity = Blockly.JavaScript.valueToCode(block, 'VELOCITY', Blockly.JavaScript.ORDER_ATOMIC) || 1; // Default to 1 (full velocity)

        // Ensure velocity is always a number
        velocity = `Number(${velocity})`;
        
        var code = '';
        if (type === 'KICK') {
            code = `window.audioEngine.playKick(${velocity}, (typeof scheduledTime !== 'undefined' ? scheduledTime : Tone.now()));`;
        } else if (type === 'SNARE') {
            code = `window.audioEngine.playSnare(${velocity}, (typeof scheduledTime !== 'undefined' ? scheduledTime : Tone.now()));`;
        } else if (type === 'HH') {
            code = `window.audioEngine.hh.triggerAttackRelease('16n', (typeof scheduledTime !== 'undefined' ? scheduledTime : Tone.now()), ${velocity});`;
        }
        return code + '\n'; // Add newline for consistency
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
        
        var code = `
            const currentInstrument = window.audioEngine.instruments[window.audioEngine.currentInstrumentName];
            if (!currentInstrument) {
                window.audioEngine.log('錯誤: 無法設定 ADSR。樂器 "${window.audioEngine.currentInstrumentName}" 不存在。');
            } else if (currentInstrument instanceof Tone.PolySynth) {
                // All our synths (PolySynth, AMSynth, FMSynth, DuoSynth) are wrapped in PolySynth
                // PolySynth has a .set() method that takes envelope options
                // For DuoSynth wrapped in PolySynth, we need to target its internal voices' envelopes.
                if (currentInstrument.get().voice0 && currentInstrument.get().voice1) { // Check if it's likely a DuoSynth structure
                    currentInstrument.set({
                        voice0: {envelope: {attack: ${a}, decay: ${d}, sustain: ${s}, release: ${r}}},
                        voice1: {envelope: {attack: ${a}, decay: ${d}, sustain: ${s}, release: ${r}}}
                    });
                } else {
                    // For standard Synths (PolySynth(Tone.Synth), AMSynth, FMSynth)
                    currentInstrument.set({envelope: {attack: ${a}, decay: ${d}, sustain: ${s}, release: ${r}}});
                }
                window.audioEngine.log('ADSR 已設定到當前樂器: ' + window.audioEngine.currentInstrumentName);
            } else if (currentInstrument instanceof Tone.Sampler) {
                // Samplers don't have a direct 'envelope' property to set ADSR like synths.
                // Their 'attack' and 'release' can be set, but not full ADSR curve with sustain/decay.
                currentInstrument.set({attack: ${a}, release: ${r}}); // Set attack and release directly
                window.audioEngine.log('警告: Sampler 的 ADSR 僅支援設定 Attack 和 Release。');
                // For full ADSR on Sampler, it needs to be routed through an AmplitudeEnvelope.
            } else {
                window.audioEngine.log('錯誤: 無法設定 ADSR。樂器 "${window.audioEngine.currentInstrumentName}" 不支援 ADSR 設定。');
            }
        `;
        return code + '\n';
    }.bind(G);
    try { if (Gproto) Gproto['sb_set_adsr'] = G['sb_set_adsr']; } catch (e) { } 
    try { if (GeneratorProto) GeneratorProto['sb_set_adsr'] = G['sb_set_adsr']; } catch (e) { } 
    try { if (JSConstructorProto) JSConstructorProto['sb_set_adsr'] = G['sb_set_adsr']; } catch (e) { } 
    try { G.forBlock['sb_set_adsr'] = G['sb_set_adsr']; } catch (e) { }

    G['jazzkit_play_drum'] = function (block) {
        var drumNote = block.getFieldValue('DRUM_TYPE');
        
        // Check if a velocity value is explicitly provided to the block.
        var velocityOverride = Blockly.JavaScript.valueToCode(block, 'VELOCITY', Blockly.JavaScript.ORDER_ATOMIC);
        var velocityOverrideCode = velocityOverride ? `Number(${velocityOverride})` : 'null'; // Pass null if not provided

        // Check if we are in a context that provides 'note' and 'velocity' variables.
        var contextNoteCode = `(typeof note !== 'undefined' ? note : null)`;
        var contextVelocityCode = `(typeof velocity !== 'undefined' ? velocity : null)`;

        var timeCode = `(typeof scheduledTime !== 'undefined' ? scheduledTime : Tone.now())`;

        return `window.audioEngine.playJazzKitNote('${drumNote}', ${velocityOverrideCode}, ${timeCode}, ${contextNoteCode}, ${contextVelocityCode});
`;
    }.bind(G);
    try { if (Gproto) Gproto['jazzkit_play_drum'] = G['jazzkit_play_drum']; } catch (e) { } 
    try { if (GeneratorProto) GeneratorProto['jazzkit_play_drum'] = G['jazzkit_play_drum']; } catch (e) { } 
    try { if (JSConstructorProto) JSConstructorProto['jazzkit_play_drum'] = G['jazzkit_play_drum']; } catch (e) { } 
    try { G.forBlock['jazzkit_play_drum'] = G['jazzkit_play_drum']; } catch (e) { }

    // --- NEW: Create Synth Instrument Generator ---
    G['sb_create_synth_instrument'] = function (block) {
        var name = Blockly.JavaScript.quote_(block.getFieldValue('NAME')); // Quote the name for string literal
        var type = block.getFieldValue('TYPE');
        
        var code = `window.audioEngine.createInstrument(${name}, '${type}');\n`;
        return code;
    }.bind(G);
    try { if (Gproto) Gproto['sb_create_synth_instrument'] = G['sb_create_synth_instrument']; } catch (e) { } 
    try { if (GeneratorProto) GeneratorProto['sb_create_synth_instrument'] = G['sb_create_synth_instrument']; } catch (e) { } 
    try { if (JSConstructorProto) JSConstructorProto['sb_create_synth_instrument'] = G['sb_create_synth_instrument']; } catch (e) { } 
    try { G.forBlock['sb_create_synth_instrument'] = G['sb_create_synth_instrument']; } catch (e) { }

    // --- NEW: Select Current Instrument Generator ---
    G['sb_select_current_instrument'] = function (block) {
        var name = Blockly.JavaScript.quote_(block.getFieldValue('NAME')); // Quote the name for string literal
        return `window.audioEngine.transitionToInstrument(${name});\n`;
    }.bind(G);
    try { if (Gproto) Gproto['sb_select_current_instrument'] = G['sb_select_current_instrument']; } catch (e) { } 
    try { if (GeneratorProto) GeneratorProto['sb_select_current_instrument'] = G['sb_select_current_instrument']; } catch (e) { } 
    try { if (JSConstructorProto) JSConstructorProto['sb_select_current_instrument'] = G['sb_select_current_instrument']; } catch (e) { } 
    try { G.forBlock['sb_select_current_instrument'] = G['sb_select_current_instrument']; } catch (e) { }

    return true;
}
