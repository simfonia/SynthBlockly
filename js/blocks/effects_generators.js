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

    G['sb_setup_effect'] = function (block) {
        var effectType = block.getFieldValue('EFFECT_TYPE');
        var code = '';
        if (!effectType) return '';

        // Handle WET parameter only for effects that support it
        if (['distortion', 'reverb', 'feedbackDelay'].includes(effectType)) {
            var wet = block.getInput('WET') ? G.valueToCode(block, 'WET', G.ORDER_ATOMIC) || '0' : '0';
            code += `window.audioEngine.effects.${effectType}.wet.value = ${wet};
`;
        }

        if (effectType === 'distortion') {
            var distortionAmount = G.valueToCode(block, 'DISTORTION_AMOUNT', G.ORDER_ATOMIC) || '0';
            var oversample = block.getFieldValue('OVERSAMPLE_VALUE');
            code += `window.audioEngine.effects.distortion.distortion = ${distortionAmount};
`;
            code += `window.audioEngine.effects.distortion.oversample = '${oversample}';
`;
            code += `window.audioEngine.log('Distortion 效果已設定。');
`;
        } else if (effectType === 'reverb') {
            var decay = G.valueToCode(block, 'DECAY', G.ORDER_ATOMIC) || '1.5';
            var predelay = G.valueToCode(block, 'PREDELAY', G.ORDER_ATOMIC) || '0.01';
            // Reverb needs to be stopped and started for decay and predelay to take effect
            code += `
                window.audioEngine.effects.reverb.decay = ${decay};
                window.audioEngine.effects.reverb.preDelay = ${predelay};
                window.audioEngine.effects.reverb.stop();
                window.audioEngine.effects.reverb.start();
            `; // Reverb starts on its own after setting decay
            code += `window.audioEngine.log('Reverb 效果已設定。');
`;
        } else if (effectType === 'feedbackDelay') {
            var delayTime = G.valueToCode(block, 'DELAY_TIME', G.ORDER_ATOMIC) || '"8n"';
            var feedback = G.valueToCode(block, 'FEEDBACK', G.ORDER_ATOMIC) || '0.25';
            code += `window.audioEngine.effects.feedbackDelay.delayTime.value = ${delayTime};
`;
            code += `window.audioEngine.effects.feedbackDelay.feedback.value = ${feedback};
`;
            code += `window.audioEngine.log('FeedbackDelay 效果已設定。');
`;
        } else if (effectType === 'filter') {
            var filterType = block.getFieldValue('FILTER_TYPE_VALUE');
            var filterFreq = block.getInput('FILTER_FREQ') ? G.valueToCode(block, 'FILTER_FREQ', G.ORDER_ATOMIC) || '20000' : '20000';
            var filterQ = block.getInput('FILTER_Q') ? G.valueToCode(block, 'FILTER_Q', G.ORDER_ATOMIC) || '1' : '1';
            var filterRolloff = block.getFieldValue('FILTER_ROLLOFF_VALUE');

            code += `window.audioEngine.effects.filter.type = '${filterType}';
`;
            code += `window.audioEngine.effects.filter.frequency.value = ${filterFreq};
`;
            code += `window.audioEngine.effects.filter.Q.value = ${filterQ};
`;
            code += `window.audioEngine.effects.filter.rolloff = ${filterRolloff};
`;
            code += `window.audioEngine.log('Filter 效果已設定。');
`;
        } else if (effectType === 'compressor') {
            var threshold = G.valueToCode(block, 'THRESHOLD', G.ORDER_ATOMIC) || '-24';
            var ratio = G.valueToCode(block, 'RATIO', G.ORDER_ATOMIC) || '12';
            var attack = G.valueToCode(block, 'ATTACK', G.ORDER_ATOMIC) || '0.003';
            var release = G.valueToCode(block, 'RELEASE', G.ORDER_ATOMIC) || '0.25';
            code += `window.audioEngine.effects.compressor.threshold.value = ${threshold};
`;
            code += `window.audioEngine.effects.compressor.ratio.value = ${ratio};
`;
            code += `window.audioEngine.effects.compressor.attack.value = ${attack};
`;
            code += `window.audioEngine.effects.compressor.release.value = ${release};
`;
            code += `window.audioEngine.log('Compressor 效果已設定。');
`;
        } else if (effectType === 'limiter') {
            var threshold = G.valueToCode(block, 'THRESHOLD', G.ORDER_ATOMIC) || '-6';
            code += `window.audioEngine.effects.limiter.threshold.value = ${threshold};
`;
            code += `window.audioEngine.log('Limiter 效果已設定。');
`;
        }

        return code;
    }.bind(G);
    try { if (Gproto) Gproto['sb_setup_effect'] = G['sb_setup_effect']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_setup_effect'] = G['sb_setup_effect']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_setup_effect'] = G['sb_setup_effect']; } catch (e) { }
    try { G.forBlock['sb_setup_effect'] = G['sb_setup_effect']; } catch (e) { }

    return true;
}