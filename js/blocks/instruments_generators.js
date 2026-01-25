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

        return `window.audioEngine.playCurrentInstrumentNote(${processedNote}, '${dur}', (typeof scheduledTime !== 'undefined' ? scheduledTime : undefined), ${velocity});\n`;
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
        var velocity = G.valueToCode(block, 'VELOCITY', G.ORDER_ATOMIC) || "1"; // Ensure default string "1"

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
        let targetName = block.getFieldValue('TARGET');
        // Fallback for old blocks
        if (!targetName) targetName = 'ALL';

        const getNum = (name, def) => {
            const val = block.getFieldValue(name);
            return (val === null || val === "" || isNaN(val)) ? def : Number(val);
        };
        var a = getNum('A', 0.01);
        var d = getNum('D', 0.1);
        var s = getNum('S', 0.5);
        var r = getNum('R', 1.0);
        
        var code = `
            (function() {
                const target = '${targetName}';
                const a = ${a}, d = ${d}, s = ${s}, r = ${r};
                
                const envelopeParams = { 
                    attack: a, decay: d, sustain: s, release: r,
                    decayCurve: 'linear', releaseCurve: 'linear' 
                };

                const applyToInstr = (name, instr) => {
                    if (!instr) return;
                    try {
                        if (instr.type === 'CustomSampler' || instr instanceof window.audioEngine.Tone.Sampler || instr.name === 'Sampler') {
                            instr.set({ release: r });
                        } else {
                            // Standard Synth / PolySynth
                            instr.set({ envelope: envelopeParams });
                            
                            // Extra robustness for PolySynth in some contexts
                            if (instr.name === 'PolySynth' || instr instanceof window.audioEngine.Tone.PolySynth) {
                                instr.set({ envelope: envelopeParams }); 
                            }

                            // Handling specific synth types with multiple voices (like DuoSynth)
                            if (instr.get && instr.get().voice0) {
                                instr.set({
                                    voice0: { envelope: envelopeParams },
                                    voice1: { envelope: envelopeParams }
                                });
                            }
                        }
                    } catch (e) { console.warn('ADSR apply failed:', name, e); }
                };

                if (target === 'ALL') {
                    window.audioEngine.updateADSR(a, d, s, r);
                    
                    // Apply to system default
                    applyToInstr('DefaultSynth_System', window.audioEngine.synth);
                    
                    // Apply to all user instruments
                    if (window.audioEngine.instruments) {
                        for (const name in window.audioEngine.instruments) {
                            applyToInstr(name, window.audioEngine.instruments[name]);
                        }
                    }
                    window.audioEngine.logKey('LOG_ADSR_SET_INSTR', 'important', 'Global (All)');
                } else {
                    // Specific Target Logic Fix:
                    // Priority 1: Check user-defined instruments (even if named 'DefaultSynth')
                    // Priority 2: Fallback to system default synth if target is 'DefaultSynth'
                    
                    let instr = null;
                    if (window.audioEngine.instruments && window.audioEngine.instruments[target]) {
                        instr = window.audioEngine.instruments[target];
                    } else if (target === 'DefaultSynth') {
                        instr = window.audioEngine.synth;
                    }

                    if (instr) {
                        applyToInstr(target, instr);
                        window.audioEngine.logKey('LOG_ADSR_SET_INSTR', 'info', target);
                        
                        // Sync UI if targeting DefaultSynth or the currently active instrument
                        const currentName = window.audioEngine.currentInstrumentName || 'DefaultSynth';
                        if (target === 'DefaultSynth' || target === currentName) {
                             window.audioEngine.updateADSR(a, d, s, r);
                        }
                    } else {
                        console.warn('Instrument not found for ADSR:', target);
                        window.audioEngine.logKey('LOG_ERR_INSTR_NOT_FOUND', 'warning', target);
                    }
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

    G['sb_set_instrument_vibrato'] = function (block) {
        let targetName = block.getFieldValue('TARGET') || 'ALL';
        var detuneValue = G.valueToCode(block, 'DETUNE_VALUE', G.ORDER_ATOMIC) || '0';
        
        var code = `
            (function() {
                const target = '${targetName}';
                const detune = Number(${detuneValue});
                const engine = window.audioEngine;

                const applyVibrato = (name, instr) => {
                    if (!instr) return;
                    try {
                        if (instr.type === 'CustomSampler' || instr instanceof engine.Tone.Sampler) {
                            // Samplers usually don't support direct detune in the same way as oscillators
                            engine.logKey('LOG_SAMPLER_DETUNE_WARN', 'warning', name);
                        } else {
                            instr.set({ detune: detune });
                        }
                    } catch (e) { console.warn('Vibrato apply failed:', name, e); }
                };

                if (target === 'ALL') {
                    applyVibrato('DefaultSynth', engine.synth);
                    applyVibrato('KICK', engine.drum);
                    applyVibrato('SNARE', engine.snare);
                    applyVibrato('HH', engine.hh);
                    applyVibrato('JazzKit', engine.jazzKit);
                    if (engine.instruments) {
                        for (const name in engine.instruments) {
                            applyVibrato(name, engine.instruments[name]);
                        }
                    }
                    engine.logKey('LOG_VIBRATO_SET_INSTR', 'info', 'Global (All) -> ' + detune);
                } else {
                    let instr = null;
                    if (engine.instruments && engine.instruments[target]) {
                        instr = engine.instruments[target];
                    } else if (target === 'DefaultSynth') {
                        instr = engine.synth;
                    } else if (target === 'KICK') {
                        instr = engine.drum;
                    } else if (target === 'SNARE') {
                        instr = engine.snare;
                    } else if (target === 'HH') {
                        instr = engine.hh;
                    } else if (target === 'JAZZKIT') {
                        instr = engine.jazzKit;
                    }

                    if (instr) {
                        applyVibrato(target, instr);
                        engine.logKey('LOG_VIBRATO_SET_INSTR', 'info', target + " (" + detune + ")");
                    } else {
                        engine.logKey('LOG_VIBRATO_ERR', 'error', target);
                    }
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
        let targetName = block.getFieldValue('TARGET') || 'ALL';
        var volumeValue = G.valueToCode(block, 'VOLUME_VALUE', G.ORDER_ATOMIC) || '0';
        
        var code = `
            (function() {
                const target = '${targetName}';
                // Clamp minimum gain to 0.0001 (-80dB) to avoid -Infinity issues with Tone.js mute/unmute restoration
                const gain = Math.max(0.0001, Math.min(1, Number(${volumeValue})));
                const engine = window.audioEngine;
                const db = engine.Tone.gainToDb(gain);

                const applyVolume = (name) => {
                    const chan = engine._getOrCreateChannel(name);
                    if (chan && chan.volume) {
                        chan.volume.value = db;
                    }
                };

                if (target === 'ALL') {
                    // System instruments
                    ['DefaultSynth', 'KICK', 'SNARE', 'HH', 'JAZZKIT'].forEach(applyVolume);
                    // User instruments
                    if (engine.instruments) {
                        for (const name in engine.instruments) {
                            applyVolume(name);
                        }
                    }
                    engine.logKey('LOG_VOL_SET_INSTR', 'info', 'Global (All) -> ' + Number(${volumeValue}));
                } else {
                    applyVolume(target);
                    engine.logKey('LOG_VOL_SET_INSTR', 'info', target + " (" + Number(${volumeValue}) + ")");
                }
            })();
        `;
        return code + '\n';
    }.bind(G);
    try { if (Gproto) Gproto['sb_set_instrument_volume'] = G['sb_set_instrument_volume']; } catch (e) { } 
    try { if (GeneratorProto) GeneratorProto['sb_set_instrument_volume'] = G['sb_set_instrument_volume']; } catch (e) { } 
    try { if (JSConstructorProto) JSConstructorProto['sb_set_instrument_volume'] = G['sb_set_instrument_volume']; } catch (e) { } 
    try { G.forBlock['sb_set_instrument_volume'] = G['sb_set_instrument_volume']; } catch (e) { }

    G['sb_set_instrument_mute'] = function (block) {
        const target = block.getFieldValue('TARGET') || 'DefaultSynth';
        const mute = block.getFieldValue('MUTE') === 'TRUE';
        return `
            (function() {
                const chan = window.audioEngine._getOrCreateChannel('${target}');
                if (chan) {
                    chan.mute = ${mute};
                    window.audioEngine.logKey('LOG_CONSOLE_LOG_MSG', 'info', 'Mute ${target}: ${mute}');
                }
            })();
        \n`;
    }.bind(G);
    try { G.forBlock['sb_set_instrument_mute'] = G['sb_set_instrument_mute']; } catch (e) { }

    G['sb_set_instrument_solo'] = function (block) {
        const target = block.getFieldValue('TARGET') || 'DefaultSynth';
        const solo = block.getFieldValue('SOLO') === 'TRUE';
        return `
            (function() {
                const chan = window.audioEngine._getOrCreateChannel('${target}');
                if (chan) {
                    chan.solo = ${solo};
                    window.audioEngine.logKey('LOG_CONSOLE_LOG_MSG', 'info', 'Solo ${target}: ${solo}');
                }
            })();
        \n`;
    }.bind(G);
    try { G.forBlock['sb_set_instrument_solo'] = G['sb_set_instrument_solo']; } catch (e) { }

        G['sb_create_layered_instrument'] = function (block) {

            var name = G.quote_(block.getFieldValue('NAME'));

            var layers = block.getFieldValue('LAYER_LIST') || "";

            var layersArray = JSON.stringify(layers.split(',').map(s => s.trim()).filter(s => s.length > 0));

            

            return `window.audioEngine.createLayeredInstrument(${name}, ${layersArray});\n`;

        }.bind(G);

        try { if (Gproto) Gproto['sb_create_layered_instrument'] = G['sb_create_layered_instrument']; } catch (e) { } 

        try { if (GeneratorProto) GeneratorProto['sb_create_layered_instrument'] = G['sb_create_layered_instrument']; } catch (e) { } 

        try { if (JSConstructorProto) JSConstructorProto['sb_create_layered_instrument'] = G['sb_create_layered_instrument']; } catch (e) { } 

        try { G.forBlock['sb_create_layered_instrument'] = G['sb_create_layered_instrument']; } catch (e) { }

    G['sb_play_chord_by_name'] = function (block) {
        var chordName = G.quote_(block.getFieldValue('CHORD_NAME'));
        var duration = G.quote_(block.getFieldValue('DUR'));
        var velocity = G.valueToCode(block, 'VELOCITY', G.ORDER_ATOMIC) || '1';

        // Ensure velocity is always a number
        velocity = `Number(${velocity})`;

        // Call audioEngine.playChordByName(name, duration, velocity)
        var code = `window.audioEngine.playChordByName(${chordName}, ${duration}, ${velocity});\n`;
        return code;
    };
    try { if (Gproto) Gproto['sb_play_chord_by_name'] = G['sb_play_chord_by_name']; } catch (e) { } 
    try { if (GeneratorProto) GeneratorProto['sb_play_chord_by_name'] = G['sb_play_chord_by_name']; } catch (e) { } 
    try { if (JSConstructorProto) JSConstructorProto['sb_play_chord_by_name'] = G['sb_play_chord_by_name']; } catch (e) { } 
    try { G.forBlock['sb_play_chord_by_name'] = G['sb_play_chord_by_name']; } catch (e) { }

    G['sb_play_chord_notes'] = function (block) {
        var notesStr = block.getFieldValue('NOTES_STRING') || "";
        var duration = G.quote_(block.getFieldValue('DUR'));
        var velocity = G.valueToCode(block, 'VELOCITY', G.ORDER_ATOMIC) || '1';

        // Parse CSV string to array of strings
        var notesArray = notesStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
        var notesJson = JSON.stringify(notesArray);

        // Ensure velocity is always a number
        velocity = `Number(${velocity})`;

        // Directly call triggerAttackRelease with array (Tone.js supports this)
        // We use playCurrentInstrumentNote logic but need to handle array input if playCurrentInstrumentNote doesn't.
        // Wait, playCurrentInstrumentNote calls instr.triggerAttackRelease. 
        // Tone.js PolySynth.triggerAttackRelease supports array of notes.
        // So we can just reuse playCurrentInstrumentNote!
        
        var code = `window.audioEngine.playCurrentInstrumentNote(${notesJson}, ${duration}, (typeof scheduledTime !== 'undefined' ? scheduledTime : window.audioEngine.Tone.now()), ${velocity});\n`;
        return code;
    };
    try { if (Gproto) Gproto['sb_play_chord_notes'] = G['sb_play_chord_notes']; } catch (e) { } 
    try { if (GeneratorProto) GeneratorProto['sb_play_chord_notes'] = G['sb_play_chord_notes']; } catch (e) { } 
    try { if (JSConstructorProto) JSConstructorProto['sb_play_chord_notes'] = G['sb_play_chord_notes']; } catch (e) { } 
    try { G.forBlock['sb_play_chord_notes'] = G['sb_play_chord_notes']; } catch (e) { }

    G['sb_define_chord'] = function (block) {
        var name = block.getFieldValue('NAME');
        var notesStr = block.getFieldValue('NOTES_STRING') || "";
        var notesArray = notesStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
        var notesJson = JSON.stringify(notesArray);

        var code = `
            (function() { 
                window.audioEngine.chords['${name}'] = ${notesJson}; 
                window.audioEngine.logKey('LOG_CHORD_DEFINED', 'info', '${name}', '${notesStr}');
            })();
        `;
        return code + '\n';
    };
    try { if (Gproto) Gproto['sb_define_chord'] = G['sb_define_chord']; } catch (e) { } 
    try { if (GeneratorProto) GeneratorProto['sb_define_chord'] = G['sb_define_chord']; } catch (e) { } 
    try { if (JSConstructorProto) JSConstructorProto['sb_define_chord'] = G['sb_define_chord']; } catch (e) { } 
    try { G.forBlock['sb_define_chord'] = G['sb_define_chord']; } catch (e) { }

    G['sb_get_chord_name'] = function (block) {
        var name = block.getFieldValue('NAME');
        var code = `'${name}'`;
        return [code, G.ORDER_ATOMIC];
    };
    try { if (Gproto) Gproto['sb_get_chord_name'] = G['sb_get_chord_name']; } catch (e) { } 
    try { if (GeneratorProto) GeneratorProto['sb_get_chord_name'] = G['sb_get_chord_name']; } catch (e) { } 
    try { if (JSConstructorProto) JSConstructorProto['sb_get_chord_name'] = G['sb_get_chord_name']; } catch (e) { } 
    try { G.forBlock['sb_get_chord_name'] = G['sb_get_chord_name']; } catch (e) { }

    return true;
}

    