export function registerGenerators(Blockly, javascriptGenerator) {
    if (typeof Blockly === 'undefined' || typeof javascriptGenerator === 'undefined') {
        console.error('javascriptGenerator not available');
        return false;
    }
    var G = javascriptGenerator;

    if (!G.definitions_) { G.definitions_ = Object.create(null); }
    if (!G.setups_) { G.setups_ = Object.create(null); }

    var Gproto = Object.getPrototypeOf(G) || (G.constructor && G.constructor.prototype) || null;
    if (!G.forBlock) G.forBlock = {};

    G['sb_transport_set_bpm'] = function (block) {
        var bpm = block.getFieldValue('BPM') || '120';
        return `window.audioEngine.Tone.Transport.bpm.value = ${bpm};
`;
    }.bind(G);
    try { G.forBlock['sb_transport_set_bpm'] = G['sb_transport_set_bpm']; } catch (e) { }

    G['sb_transport_start_stop'] = function (block) {
        var action = block.getFieldValue('ACTION');
        return (action === 'START') ? 'window.audioEngine.Tone.Transport.start();\n' : 'window.audioEngine.Tone.Transport.stop();\n';
    }.bind(G);
    try { G.forBlock['sb_transport_start_stop'] = G['sb_transport_start_stop']; } catch (e) { }

    G['sb_wait_musical'] = function (block) {
        var duration = block.getFieldValue('DURATION');
        return `
await new Promise(resolve => setTimeout(resolve, window.audioEngine.Tone.Time('${duration}').toMilliseconds()));
if (!window.audioEngine.isExecutionActive) return;
`;
    }.bind(G);
    try { G.forBlock['sb_wait_musical'] = G['sb_wait_musical']; } catch (e) { }

    G['sb_tone_loop'] = function (block) {
        var interval = block.getFieldValue('INTERVAL');
        // REMOVE 'await' from the inner code generation to allow parallel scheduling
        var doCode = G.statementToCode(block, 'DO').replace(/await /g, '');
        var loopId = block.id;
        return `
{
    if (window.blocklyLoops['${loopId}'])
 {
        window.blocklyLoops['${loopId}'].stop();
        window.blocklyLoops['${loopId}'].dispose();
    }
    window.blocklyLoops['${loopId}'] = new window.audioEngine.Tone.Loop(async (scheduledTime) => {
        if (!window.audioEngine.isExecutionActive) return;
        ${doCode}
    }, '${interval}').start(0);
}
`;
    }.bind(G);
    try { G.forBlock['sb_tone_loop'] = G['sb_tone_loop']; } catch (e) { }

    G['sb_stop_all_blockly_loops'] = function (block) {
        return `
if (window.blocklyLoops) {
    for (const loopId in window.blocklyLoops) {
        if (window.blocklyLoops.hasOwnProperty(loopId) && window.blocklyLoops[loopId] instanceof window.audioEngine.Tone.Loop) {
            window.blocklyLoops[loopId].dispose();
        }
    }
    window.blocklyLoops = {}; 
}
`;
    }.bind(G);
    try { G.forBlock['sb_stop_all_blockly_loops'] = G['sb_stop_all_blockly_loops']; } catch (e) { }

    G['sb_schedule_at_offset'] = function (block) {
        var offset = block.getFieldValue('OFFSET');
        var doCode = G.statementToCode(block, 'DO');
        return `
{
    const _calcOffset = (new window.audioEngine.Tone.Time('${offset}')).toSeconds();
    const _baseTime = (typeof scheduledTime === 'number') ? scheduledTime : window.audioEngine.Tone.now();
    const _newTime = _baseTime + _calcOffset;
    {
        const scheduledTime = _newTime; 
        ${doCode}
    }
}
`;
    }.bind(G);
    try { G.forBlock['sb_schedule_at_offset'] = G['sb_schedule_at_offset']; } catch (e) { }

    G['sb_transport_count_in'] = function (block) {
        var measures = Number(block.getFieldValue('MEASURES')) || 1;
        var beats = Number(block.getFieldValue('BEATS')) || 4;
        var beatValue = Number(block.getFieldValue('BEAT_VALUE')) || 4;
        var volume = G.valueToCode(block, 'VOLUME', G.ORDER_ATOMIC) || '0.8';
        return `await window.audioEngine.playCountIn(${measures}, ${beats}, ${beatValue}, ${volume});\n`;
    }.bind(G);
    try { G.forBlock['sb_transport_count_in'] = G['sb_transport_count_in']; } catch (e) { }

    G['sb_instrument_selector'] = function (block) {
        var name = block.getFieldValue('NAME');
        return [`'${name}'`, G.ORDER_ATOMIC];
    }.bind(G);
    try { G.forBlock['sb_instrument_selector'] = G['sb_instrument_selector']; } catch (e) { }

    G['sb_rhythm_source_selector'] = function (block) {
        var type = block.getFieldValue('TYPE');
        var customType = block.getFieldValue('CUSTOM_TYPE');
        var soundType = (type === 'CUSTOM') ? `'${customType}'` : ((type === 'CURRENT') ? "'C4'" : `'${type}'`);
        return [soundType, G.ORDER_ATOMIC];
    }.bind(G);
    try { G.forBlock['sb_rhythm_source_selector'] = G['sb_rhythm_source_selector']; } catch (e) { }

    G['sb_rhythm_sequence'] = function (block) {
        var soundType = G.valueToCode(block, 'SOURCE', G.ORDER_ATOMIC) || "'KICK'";
        var measure = G.valueToCode(block, 'MEASURE', G.ORDER_ATOMIC) || "1";
        var sequence = block.getFieldValue('SEQUENCE') || "";
        var isChord = block.getFieldValue('IS_CHORD') === 'TRUE';
        const steps = sequence.match(/([A-Za-z0-9#b_]+|[xX]|[.])/g) || [];
        const stepsJson = JSON.stringify(steps);
        return `window.audioEngine.playRhythmSequence(${soundType}, ${stepsJson}, (typeof scheduledTime !== 'undefined' ? scheduledTime : window.audioEngine.Tone.now()), ${measure}, ${isChord});\n`;
    }.bind(G);
    try { G.forBlock['sb_rhythm_sequence'] = G['sb_rhythm_sequence']; } catch (e) { }

    return true;
}
