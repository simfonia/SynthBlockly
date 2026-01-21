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
            // Start immediately. The 0.05s look-ahead built into playback functions 
            // will handle the necessary scheduling margin.
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
        var interval = block.getFieldValue('INTERVAL'); 
        var loopId = 'loop_' + block.id; 
        var doCode = G.statementToCode(block, 'DO');

        G.definitions_['loops_global_init'] = 'window.blocklyLoops = window.blocklyLoops || {};';

        var code = `
if (window.blocklyLoops['${loopId}']) {
    window.blocklyLoops['${loopId}'].dispose();
}
window.blocklyLoops['${loopId}'] = new window.audioEngine.Tone.Loop(async (scheduledTime) => {
    if (!window.audioEngine.isExecutionActive) return;
    ${doCode}
}, '${interval}');
window.blocklyLoops['${loopId}'].start(0);
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
    window.blocklyLoops = {}; 
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
    const _calcOffset = (new window.audioEngine.Tone.Time('${offset}')).toSeconds();
    const _baseTime = (typeof scheduledTime !== 'undefined') ? scheduledTime : window.audioEngine.Tone.now();
    const _newTime = _baseTime + _calcOffset;
    {
        const scheduledTime = _newTime; // Shadow 'scheduledTime' for nested blocks
        ${doCode}
    }
}
`;
        return code;
    }.bind(G);
    try { if (Gproto) Gproto['sb_schedule_at_offset'] = G['sb_schedule_at_offset']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_schedule_at_offset'] = G['sb_schedule_at_offset']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_schedule_at_offset'] = G['sb_schedule_at_offset']; } catch (e) { }
    try { G.forBlock['sb_schedule_at_offset'] = G['sb_schedule_at_offset']; } catch (e) { }

    G['sb_transport_count_in'] = function (block) {
        var measures = Number(block.getFieldValue('MEASURES')) || 1;
        var beats = Number(block.getFieldValue('BEATS')) || 4;
        var beatValue = Number(block.getFieldValue('BEAT_VALUE')) || 4;
        var volume = G.valueToCode(block, 'VOLUME', G.ORDER_ATOMIC) || '0.8';
        return `await window.audioEngine.playCountIn(${measures}, ${beats}, ${beatValue}, ${volume});\n`;
    }.bind(G);
    try { if (Gproto) Gproto['sb_transport_count_in'] = G['sb_transport_count_in']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_transport_count_in'] = G['sb_transport_count_in']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_transport_count_in'] = G['sb_transport_count_in']; } catch (e) { }
    try { G.forBlock['sb_transport_count_in'] = G['sb_transport_count_in']; } catch (e) { }

    G['sb_instrument_selector'] = function (block) {
        var name = block.getFieldValue('NAME');
        return [`'${name}'`, G.ORDER_ATOMIC];
    }.bind(G);
    try { if (Gproto) Gproto['sb_instrument_selector'] = G['sb_instrument_selector']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_instrument_selector'] = G['sb_instrument_selector']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_instrument_selector'] = G['sb_instrument_selector']; } catch (e) { }
    try { G.forBlock['sb_instrument_selector'] = G['sb_instrument_selector']; } catch (e) { }

    G['sb_rhythm_source_selector'] = function (block) {
        var type = block.getFieldValue('TYPE');
        var customType = block.getFieldValue('CUSTOM_TYPE');
        
        var soundType;
        if (type === 'CUSTOM') {
            soundType = `'${customType}'`;
        } else {
            soundType = (type === 'CURRENT') ? "'C4'" : `'${type}'`;
        }
        return [soundType, G.ORDER_ATOMIC];
    }.bind(G);
    try { if (Gproto) Gproto['sb_rhythm_source_selector'] = G['sb_rhythm_source_selector']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_rhythm_source_selector'] = G['sb_rhythm_source_selector']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_rhythm_source_selector'] = G['sb_rhythm_source_selector']; } catch (e) { }
    try { G.forBlock['sb_rhythm_source_selector'] = G['sb_rhythm_source_selector']; } catch (e) { }

    G['sb_rhythm_sequence'] = function (block) {
        var soundType = G.valueToCode(block, 'SOURCE', G.ORDER_ATOMIC) || "'KICK'";
        var measure = G.valueToCode(block, 'MEASURE', G.ORDER_ATOMIC) || "1";
        var sequence = block.getFieldValue('SEQUENCE') || "";
        var isChord = block.getFieldValue('IS_CHORD') === 'TRUE';
        
        // Robust Musical Token Extraction:
        // This regex ignores spaces, pipes (|), and other separators.
        // It ONLY captures:
        // 1. Chords/Notes (Alphanumeric starting with letter, e.g., Dm7, C4, Cmin_aug)
        // 2. Trigger (x, X)
        // 3. Silence (.)
        // 4. Sustain (-)
        const steps = sequence.match(/([A-Za-z0-9#b_]+|[xX]|[.\-])/g) || [];
        const stepsJson = JSON.stringify(steps);

        // Validation check for the 16-step rule
        var validationCode = `
            if (${steps.length} !== 16) {
                window.audioEngine.logKey('LOG_MELODY_PARSE_ERR', 'warning', 'Measure ' + ${measure} + ': Expected 16 steps, found ${steps.length}. Current sequence: "' + "${sequence}" + '"');
            }
        `;

        return validationCode + `window.audioEngine.playRhythmSequence(${soundType}, ${stepsJson}, (typeof scheduledTime !== 'undefined' ? scheduledTime : window.audioEngine.Tone.now()), ${measure}, ${isChord});\n`;
    }.bind(G);
    try { if (Gproto) Gproto['sb_rhythm_sequence'] = G['sb_rhythm_sequence']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_rhythm_sequence'] = G['sb_rhythm_sequence']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_rhythm_sequence'] = G['sb_rhythm_sequence']; } catch (e) { }
    try { G.forBlock['sb_rhythm_sequence'] = G['sb_rhythm_sequence']; } catch (e) { }

    return true;
}
