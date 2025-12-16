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

    // --- NEW: Setup Effect Generator ---
    G['sb_setup_effect'] = function (block) {
        var effectType = block.getFieldValue('EFFECT_TYPE');
        var wet = Blockly.JavaScript.valueToCode(block, 'WET', Blockly.JavaScript.ORDER_ATOMIC) || '0';

        var code = '';
        if (!effectType) return '';

        // Set wet value (always present)
        code += `window.audioEngine.effects.${effectType}.wet.value = ${wet};
`;

        if (effectType === 'distortion') {
            var distortionAmount = Blockly.JavaScript.valueToCode(block, 'DISTORTION_AMOUNT', Blockly.JavaScript.ORDER_ATOMIC) || '0';
            var oversample = block.getFieldValue('OVERSAMPLE_VALUE');
            code += `window.audioEngine.effects.distortion.distortion = ${distortionAmount};
`;
            code += `window.audioEngine.effects.distortion.oversample = '${oversample}';
`;
            code += `window.audioEngine.log('Distortion 效果已設定。');
`;
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
            code += `window.audioEngine.log('Reverb 效果已設定。');
`;
        } else if (effectType === 'feedbackDelay') {
            var delayTime = Blockly.JavaScript.valueToCode(block, 'DELAY_TIME', Blockly.JavaScript.ORDER_ATOMIC) || '"8n"';
            var feedback = Blockly.JavaScript.valueToCode(block, 'FEEDBACK', Blockly.JavaScript.ORDER_ATOMIC) || '0.25';
            code += `window.audioEngine.effects.feedbackDelay.delayTime.value = ${delayTime};
`;
            code += `window.audioEngine.effects.feedbackDelay.feedback.value = ${feedback};
`;
            code += `window.audioEngine.log('FeedbackDelay 效果已設定。');
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
