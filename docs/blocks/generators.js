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

    G['sb_midi_note_received'] = function (block) {
        // This hat block is handled by a live event listener in main.js.
        // It should not generate any code for the 'Run Blocks' button.
        return '';
    }.bind(G);
    try { if (Gproto) Gproto['sb_midi_note_received'] = G['sb_midi_note_received']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_midi_note_received'] = G['sb_midi_note_received']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_midi_note_received'] = G['sb_midi_note_received']; } catch (e) { }

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
    try { G.forBlock['sb_midi_note_received'] = G['sb_midi_note_received']; } catch (e) { } // Ensure sb_midi_note_received is also in forBlock if it wasn't already

    // --- NEW: Stop Default MIDI Action Generator ---
    G['sb_stop_default_midi_action'] = function (block) {
        return 'window.audioEngine.isDefaultMidiActionCancelled = true;\n';
    }.bind(G);

    G['sb_serial_data_received'] = function (block) {
        // This hat block is handled by a live event listener in main.js.
        // It should not generate any code for the 'Run Blocks' button.
        return '';
    };

    // NEW: Jazz Kit Play Drum Generator
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

    // --- NEW: Define Chord Generator ---
    G['sb_define_chord'] = function (block) {
        var name = Blockly.JavaScript.quote_(block.getFieldValue('NAME')); // Quote the chord name
        var notesString = Blockly.JavaScript.quote_(block.getFieldValue('NOTES_STRING')); // Quote the note string
        
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

    // --- NEW: Map PC Keyboard Key to Chord Generator ---
    G['sb_map_key_to_chord'] = function (block) {
        var keyCode = Blockly.JavaScript.quote_(block.getFieldValue('KEY_CODE')); // Quote the key code
        var chordName = Blockly.JavaScript.quote_(block.getFieldValue('CHORD_NAME')); // Quote the chord name
        
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

    // --- NEW: Transport Generators ---
    G['sb_transport_set_bpm'] = function (block) {
        var bpm = Number(block.getFieldValue('BPM')) || 120;
        return `window.audioEngine.Tone.Transport.bpm.value = ${bpm};\n`;
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

    // --- NEW: Musical Wait Generator ---
    G['sb_wait_musical'] = function (block) {
        var duration = block.getFieldValue('DURATION');
        // The conversion to milliseconds must happen at runtime, because BPM can change.
        return `await new Promise(resolve => setTimeout(resolve, window.audioEngine.Tone.Time('${duration}').toMilliseconds()));\n`;
    }.bind(G);
    try { if (Gproto) Gproto['sb_wait_musical'] = G['sb_wait_musical']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_wait_musical'] = G['sb_wait_musical']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_wait_musical'] = G['sb_wait_musical']; } catch (e) { }
    try { G.forBlock['sb_wait_musical'] = G['sb_wait_musical']; } catch (e) { }
    
    // --- NEW: Tone.Loop Generator ---
    G['sb_tone_loop'] = function (block) {
        var loopId = 'loop_' + block.id; // Unique ID for each loop instance
        var interval = block.getFieldValue('INTERVAL');
        var doCode = Blockly.JavaScript.statementToCode(block, 'DO');

        // Ensure the global loops object exists in the definitions_ section
        G.definitions_['loops_global_init'] = 'window.blocklyLoops = window.blocklyLoops || {};';

        // Generate code to create and start the loop
        var code = `
// Clear existing loop for this block ID if it exists
if (window.blocklyLoops['${loopId}']) {
    window.blocklyLoops['${loopId}'].dispose();
}
window.blocklyLoops['${loopId}'] = new window.audioEngine.Tone.Loop(async (time) => {
    // Make 'time' available to inner blocks if they need it (e.g., for scheduling children)
    // Note: Inner blocks usually trigger instantly relative to the callback,
    //       but 'time' could be used for advanced relative scheduling.
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

    // --- NEW: Stop All Blockly Loops Generator ---
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

    // --- NEW: Select Current Instrument Generator ---
    G['sb_select_current_instrument'] = function (block) {
        var name = Blockly.JavaScript.quote_(block.getFieldValue('NAME')); // Quote the name for string literal
        
        var code = `
if (window.audioEngine.instruments[${name}]) {
    window.audioEngine.currentInstrumentName = ${name};
    window.audioEngine.log('當前樂器已設定為: ' + ${name});
    window.audioEngine.clearPressedKeys(); // NEW: Clear pressed keys on instrument switch
} else {
    window.audioEngine.log('錯誤: 樂器 ' + ${name} + ' 不存在。');
}
`;
        return code;
    }.bind(G);
    try { if (Gproto) Gproto['sb_select_current_instrument'] = G['sb_select_current_instrument']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_select_current_instrument'] = G['sb_select_current_instrument']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_select_current_instrument'] = G['sb_select_current_instrument']; } catch (e) { }
    try { G.forBlock['sb_select_current_instrument'] = G['sb_select_current_instrument']; } catch (e) { }

    // --- NEW: Schedule At Offset Generator ---
    G['sb_schedule_at_offset'] = function (block) {
        var offset = block.getFieldValue('OFFSET');
        var doCode = Blockly.JavaScript.statementToCode(block, 'DO');

        var code = `
{ // Create a new scope for scheduledTime
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

    // --- NEW: Toggle PC Keyboard MIDI Generator ---
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

    // --- NEW: Setup Effect Generator ---
    G['sb_setup_effect'] = function (block) {
        var effectType = block.getFieldValue('EFFECT_TYPE');
        var wet = Blockly.JavaScript.valueToCode(block, 'WET', Blockly.JavaScript.ORDER_ATOMIC) || '0';

        var code = '';
        if (!effectType) return '';

        // Set wet value (always present)
        code += `window.audioEngine.effects.${effectType}.wet.value = ${wet};\n`;

        if (effectType === 'distortion') {
            var distortionAmount = Blockly.JavaScript.valueToCode(block, 'DISTORTION_AMOUNT', Blockly.JavaScript.ORDER_ATOMIC) || '0';
            var oversample = block.getFieldValue('OVERSAMPLE_VALUE');
            code += `window.audioEngine.effects.distortion.distortion = ${distortionAmount};\n`;
            code += `window.audioEngine.effects.distortion.oversample = '${oversample}';\n`;
            code += `window.audioEngine.log('Distortion 效果已設定。');\n`;
        } else if (effectType === 'reverb') {
            var decay = Blockly.JavaScript.valueToCode(block, 'DECAY', Blockly.JavaScript.ORDER_ATOMIC) || '1.5';
            var predelay = Blockly.JavaScript.valueToCode(block, 'PREDELAY', Blockly.JavaScript.ORDER_ATOMIC) || '0.01';
            // Reverb needs to be stopped and started for decay and predelay to take effect
            code += `
                window.audioEngine.effects.reverb.decay = ${decay};
                window.audioEngine.effects.reverb.preDelay = ${predelay};
                window.audioEngine.effects.reverb.stop();
                window.audioEngine.effects.reverb.start();
            `; // Reverb starts on its own after setting decay
            code += `window.audioEngine.log('Reverb 效果已設定。');\n`;
        } else if (effectType === 'feedbackDelay') {
            var delayTime = Blockly.JavaScript.valueToCode(block, 'DELAY_TIME', Blockly.JavaScript.ORDER_ATOMIC) || '"8n"';
            var feedback = Blockly.JavaScript.valueToCode(block, 'FEEDBACK', Blockly.JavaScript.ORDER_ATOMIC) || '0.25';
            code += `window.audioEngine.effects.feedbackDelay.delayTime.value = ${delayTime};\n`;
            code += `window.audioEngine.effects.feedbackDelay.feedback.value = ${feedback};\n`;
            code += `window.audioEngine.log('FeedbackDelay 效果已設定。');\n`;
        }

        return code;
    }.bind(G);

    // Expose a global fallback for legacy code that expects window.registerSBGenerators
    try { window.registerSBGenerators = function (b) { return registerGenerators(b || Blockly); }; } catch (e) { }
    return true;
}
