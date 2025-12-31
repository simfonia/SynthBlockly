import * as Tone from 'tone';

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

    G['sb_play_note'] = function (block) {
        var note = G.valueToCode(block, 'NOTE', G.ORDER_ATOMIC) || "60"; // Default to MIDI number 60 for Tone.Midi
        var dur = block.getFieldValue('DUR') || '8n';
        var velocity = G.valueToCode(block, 'VELOCITY', G.ORDER_ATOMIC) || 1;

        // Always convert note input to musical notation string using Tone.Midi().toNote()
        var processedNote = `window.audioEngine.Tone.Midi(${note}).toNote()`;

        // Ensure velocity is always a number
        velocity = `Number(${velocity})`;

        return `window.audioEngine.playCurrentInstrumentNote(${processedNote}, '${dur}', (typeof scheduledTime !== 'undefined' ? scheduledTime : window.audioEngine.Tone.now()), ${velocity});\n`;
    }.bind(G);
    try { if (Gproto) Gproto['sb_play_note'] = G['sb_play_note']; } catch (e) { } 
    try { if (GeneratorProto) GeneratorProto['sb_play_note'] = G['sb_play_note']; } catch (e) { } 
    try { if (JSConstructorProto) JSConstructorProto['sb_play_note'] = G['sb_play_note']; } catch (e) { } 
    try { G.forBlock['sb_play_note'] = G['sb_play_note']; } catch (e) { }

    G['sb_play_note_and_wait'] = function (block) {
        var note = G.valueToCode(block, 'NOTE', G.ORDER_ATOMIC) || "60"; // Default to MIDI number 60 for Tone.Midi
        var dur = block.getFieldValue('DUR') || '4n';
        var velocity = G.valueToCode(block, 'VELOCITY', G.ORDER_ATOMIC) || 1;

        // Always convert note input to musical notation string using Tone.Midi().toNote()
        var processedNote = `window.audioEngine.Tone.Midi(${note}).toNote()`;

        // Ensure velocity is always a number
        velocity = `Number(${velocity})`;

        var code = `
await window.audioEngine.playCurrentInstrumentNote(${processedNote}, '${dur}', (typeof scheduledTime !== 'undefined' ? scheduledTime : window.audioEngine.Tone.now()), ${velocity});
await new Promise(resolve => setTimeout(resolve, window.audioEngine.Tone.Time('${dur}').toMilliseconds()));
if (!window.audioEngine.isExecutionActive) return;
`;
        return code;
    }.bind(G);
    try { if (Gproto) Gproto['sb_play_note_and_wait'] = G['sb_play_note_and_wait']; } catch (e) { } 
    try { if (GeneratorProto) GeneratorProto['sb_play_note_and_wait'] = G['sb_play_note_and_wait']; } catch (e) { } 
    try { if (JSConstructorProto) JSConstructorProto['sb_play_note_and_wait'] = G['sb_play_note_and_wait']; } catch (e) { } 
    try { G.forBlock['sb_play_note_and_wait'] = G['sb_play_note_and_wait']; } catch (e) { }

    G['sb_play_drum'] = function (block) {
        var type = block.getFieldValue('TYPE');
        var velocity = G.valueToCode(block, 'VELOCITY', G.ORDER_ATOMIC) || 1; // Default to 1 (full velocity)

        // Ensure velocity is always a number
        velocity = `Number(${velocity})`;
        
        var code = '';
        if (type === 'KICK') {
            code = `window.audioEngine.playKick(${velocity}, (typeof scheduledTime !== 'undefined' ? scheduledTime : window.audioEngine.Tone.now()));`;
        } else if (type === 'SNARE') {
            code = `window.audioEngine.playSnare(${velocity}, (typeof scheduledTime !== 'undefined' ? scheduledTime : window.audioEngine.Tone.now()));`;
        } else if (type === 'HH') {
            code = `window.audioEngine.hh.triggerAttackRelease('16n', (typeof scheduledTime !== 'undefined' ? scheduledTime : window.audioEngine.Tone.now()), ${velocity});`;
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
            (function() {
                const instrName = window.audioEngine.currentInstrumentName;
                const currentInstrument = window.audioEngine.instruments[instrName];
                if (!currentInstrument) {
                    window.audioEngine.logKey('LOG_ERR_INSTR_NOT_FOUND', 'error', instrName);
                    return;
                }

                try {
                    if (currentInstrument.type === 'CustomSampler' || currentInstrument instanceof window.audioEngine.Tone.Sampler || currentInstrument.name === 'Sampler') {
                        // For samplers, we only support Release (R) control effectively
                        currentInstrument.set({ release: ${r} });
                        window.audioEngine.updateADSR(0, 0, 1, ${r}); // Visual feedback for sampler
                        window.audioEngine.logKey('LOG_SAMPLER_ADS_WARN', 'warning');
                    } else if (currentInstrument.get?.().voice0) {
                        // Special handling for PolySynth wrapping DuoSynth
                        currentInstrument.set({
                            voice0: { envelope: { attack: ${a}, decay: ${d}, sustain: ${s}, release: ${r} } },
                            voice1: { envelope: { attack: ${a}, decay: ${d}, sustain: ${s}, release: ${r} } }
                        });
                        window.audioEngine.updateADSR(${a}, ${d}, ${s}, ${r});
                        window.audioEngine.logKey('LOG_ADSR_SET_INSTR', 'info', instrName);
                    } else if (typeof currentInstrument.set === 'function') {
                        // Standard Tone.js Instruments (PolySynth, etc.)
                        currentInstrument.set({ envelope: { attack: ${a}, decay: ${d}, sustain: ${s}, release: ${r} } });
                        window.audioEngine.updateADSR(${a}, ${d}, ${s}, ${r});
                        window.audioEngine.logKey('LOG_ADSR_SET_INSTR', 'info', instrName);
                    } else {
                        window.audioEngine.logKey('LOG_ADSR_NOT_SUPPORTED_INSTR', 'error', instrName);
                    }
                } catch (e) {
                    console.error('ADSR setting failed:', e);
                    window.audioEngine.logKey('LOG_EXEC_ERR', 'error', e.message);
                }
            })();
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
        var velocityOverride = G.valueToCode(block, 'VELOCITY', G.ORDER_ATOMIC);
        var velocityOverrideCode = velocityOverride ? `Number(${velocityOverride})` : 'null'; // Pass null if not provided

        // Check if we are in a context that provides 'note' and 'velocity' variables.
        var contextNoteCode = `(typeof note !== 'undefined' ? note : null)`;
        var contextVelocityCode = `(typeof velocity !== 'undefined' ? velocity : null)`;

        var timeCode = `(typeof scheduledTime !== 'undefined' ? scheduledTime : window.audioEngine.Tone.now())`;

        return `window.audioEngine.playJazzKitNote('${drumNote}', ${velocityOverrideCode}, ${timeCode}, ${contextNoteCode}, ${contextVelocityCode});
`;
    }.bind(G);
    try { if (Gproto) Gproto['jazzkit_play_drum'] = G['jazzkit_play_drum']; } catch (e) { } 
    try { if (GeneratorProto) GeneratorProto['jazzkit_play_drum'] = G['jazzkit_play_drum']; } catch (e) { } 
    try { if (JSConstructorProto) JSConstructorProto['jazzkit_play_drum'] = G['jazzkit_play_drum']; } catch (e) { } 
    try { G.forBlock['jazzkit_play_drum'] = G['jazzkit_play_drum']; } catch (e) { }

    G['sb_create_synth_instrument'] = function (block) {
        var name = G.quote_(block.getFieldValue('NAME')); // Quote the name for string literal
        var type = block.getFieldValue('TYPE');
        
        var code = `window.audioEngine.createInstrument(${name}, '${type}');\n`;
        return code;
    }.bind(G);
    try { if (Gproto) Gproto['sb_create_synth_instrument'] = G['sb_create_synth_instrument']; } catch (e) { } 
    try { if (GeneratorProto) GeneratorProto['sb_create_synth_instrument'] = G['sb_create_synth_instrument']; } catch (e) { } 
    try { if (JSConstructorProto) JSConstructorProto['sb_create_synth_instrument'] = G['sb_create_synth_instrument']; } catch (e) { } 
    try { G.forBlock['sb_create_synth_instrument'] = G['sb_create_synth_instrument']; } catch (e) { }

    G['sb_select_current_instrument'] = function (block) {
        var name = G.quote_(block.getFieldValue('NAME')); // Quote the name for string literal
        return `window.audioEngine.transitionToInstrument(${name});\n`;
    }.bind(G);
    try { if (Gproto) Gproto['sb_select_current_instrument'] = G['sb_select_current_instrument']; } catch (e) { } 
    try { if (GeneratorProto) GeneratorProto['sb_select_current_instrument'] = G['sb_select_current_instrument']; } catch (e) { } 
    try { if (JSConstructorProto) JSConstructorProto['sb_select_current_instrument'] = G['sb_select_current_instrument']; } catch (e) { } 
    try { G.forBlock['sb_select_current_instrument'] = G['sb_select_current_instrument']; } catch (e) { }

    G['sb_set_instrument_vibrato'] = function (block) {
        var detuneValue = G.valueToCode(block, 'DETUNE_VALUE', G.ORDER_ATOMIC) || '0';
        var code = `
            (function() {
                const instrName = window.audioEngine.currentInstrumentName;
                const currentInstrument = window.audioEngine.instruments[instrName];
                if (currentInstrument) {
                    currentInstrument.set({ detune: Number(${detuneValue}) });
                    window.audioEngine.logKey('LOG_VIBRATO_SET_INSTR', 'info', instrName + " (" + ${detuneValue} + ")");
                } else {
                    window.audioEngine.logKey('LOG_VIBRATO_ERR', 'error', instrName);
                }
            })();
        `;
        return code + '\n';
    }.bind(G);
    try { if (Gproto) Gproto['sb_set_instrument_vibrato'] = G['sb_set_instrument_vibrato']; } catch (e) { } 
    try { if (GeneratorProto) GeneratorProto['sb_set_instrument_vibrato'] = G['sb_set_instrument_vibrato']; } catch (e) { } 
    try { if (JSConstructorProto) JSConstructorProto['sb_set_instrument_vibrato'] = G['sb_set_instrument_vibrato']; } catch (e) { } 
    try { G.forBlock['sb_set_instrument_vibrato'] = G['sb_set_instrument_vibrato']; } catch (e) { }

    G['sb_set_instrument_volume'] = function (block) {
        var volumeValue = G.valueToCode(block, 'VOLUME_VALUE', G.ORDER_ATOMIC) || '0';
        var code = `
            (function() {
                const instrName = window.audioEngine.currentInstrumentName;
                const currentInstrument = window.audioEngine.instruments[instrName];
                if (currentInstrument) {
                    const gain = Math.max(0, Math.min(1, Number(${volumeValue}))); // Clamp 0-1
                    const db = window.audioEngine.Tone.gainToDb(gain);
                    
                    if (currentInstrument.type === 'CustomSampler' || currentInstrument.volume) {
                        currentInstrument.set({ volume: db });
                        window.audioEngine.logKey('LOG_VOL_SET_INSTR', 'info', instrName + " (" + ${volumeValue} + ")");
                    } else {
                        window.audioEngine.logKey('LOG_VOL_NOT_SUPPORTED', 'error');
                    }
                } else {
                    window.audioEngine.logKey('LOG_VOL_ERR', 'error', instrName);
                }
            })();
        `;
        return code + '\n';
    }.bind(G);
    try { if (Gproto) Gproto['sb_set_instrument_volume'] = G['sb_set_instrument_volume']; } catch (e) { } 
    try { if (GeneratorProto) GeneratorProto['sb_set_instrument_volume'] = G['sb_set_instrument_volume']; } catch (e) { } 
    try { if (JSConstructorProto) JSConstructorProto['sb_set_instrument_volume'] = G['sb_set_instrument_volume']; } catch (e) { } 
    try { G.forBlock['sb_set_instrument_volume'] = G['sb_set_instrument_volume']; } catch (e) { }

    return true;
}