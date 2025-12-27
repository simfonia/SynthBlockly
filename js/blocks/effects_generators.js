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
        let effectType = block.getFieldValue('EFFECT_TYPE');
        if (!effectType) return null;

        const params = {};

        // Helper to get numeric value from input
        const getNumericValue = (inputName, defaultValue) => {
            const value = G.valueToCode(block, inputName, G.ORDER_ATOMIC);
            const num = parseFloat(value);
            return isNaN(num) ? defaultValue : num;
        };
        
        // Helper to get string value from input (for time values like '8n')
        const getStringValue = (inputName, defaultValue) => {
            let value = G.valueToCode(block, inputName, G.ORDER_ATOMIC) || defaultValue;
            // remove quotes from string if they exist
            if (value && value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1);
            }
            return value;
        };


        // Collect parameters based on effect type
        if (['distortion', 'reverb', 'feedbackDelay', 'lofi', 'chorus', 'phaser', 'autoPanner'].includes(effectType)) {
            if (block.getInput('WET')) {
                params.wet = getNumericValue('WET', 0);
            }
        }

        if (effectType === 'distortion') {
            params.distortion = getNumericValue('DISTORTION_AMOUNT', 0);
            params.oversample = block.getFieldValue('OVERSAMPLE_VALUE');
        } else if (effectType === 'reverb') {
            params.decay = getNumericValue('DECAY', 1.5);
            params.preDelay = getNumericValue('PREDELAY', 0.01);
        } else if (effectType === 'feedbackDelay') {
            params.delayTime = getStringValue('DELAY_TIME', '8n');
            params.feedback = getNumericValue('FEEDBACK', 0.25);
        } else if (effectType === 'filter') {
            // For filter, the 'type' in the config is the specific filter type from the dropdown
            effectType = block.getFieldValue('FILTER_TYPE_VALUE');
            params.frequency = getNumericValue('FILTER_FREQ', 20000);
            params.Q = getNumericValue('FILTER_Q', 1);
            params.rolloff = parseInt(block.getFieldValue('FILTER_ROLLOFF_VALUE'), 10);
            // The type of filter is now the main effectType for the config object
        } else if (effectType === 'compressor') {
            params.threshold = getNumericValue('THRESHOLD', -24);
            params.ratio = getNumericValue('RATIO', 12);
            params.attack = getNumericValue('ATTACK', 0.003);
            params.release = getNumericValue('RELEASE', 0.25);
        } else if (effectType === 'limiter') {
            params.threshold = getNumericValue('THRESHOLD', -6);
        } else if (effectType === 'lofi') {
            effectType = 'bitCrusher'; // Use the Tone.js effect name internally
            params.bits = parseInt(block.getFieldValue('BITDEPTH_VALUE'), 10);
        } else if (effectType === 'chorus') {
            params.frequency = getNumericValue('CHORUS_FREQUENCY', 1.5);
            params.delayTime = getNumericValue('CHORUS_DELAY_TIME', 3.5);
            params.depth = getNumericValue('CHORUS_DEPTH', 0.7);
        } else if (effectType === 'phaser') {
            params.frequency = getNumericValue('PHASER_FREQUENCY', 15);
            params.octaves = getNumericValue('PHASER_OCTAVES', 3);
            params.baseFrequency = getNumericValue('PHASER_BASE_FREQUENCY', 200);
        } else if (effectType === 'autoPanner') {
            params.frequency = getNumericValue('AUTOPANNER_FREQUENCY', 1);
            params.depth = getNumericValue('AUTOPANNER_DEPTH', 0.5);
        }

        const config = {
            type: effectType,
            params: params
        };

        // Return a JSON string wrapped in a comment. This is data to be collected, not executed.
        return `/* EFFECT_CONFIG:${JSON.stringify(config)} */`;
    }.bind(G);
    try { if (Gproto) Gproto['sb_setup_effect'] = G['sb_setup_effect']; } catch (e) { }
    try { if (GeneratorProto) GeneratorProto['sb_setup_effect'] = G['sb_setup_effect']; } catch (e) { }
    try { if (JSConstructorProto) JSConstructorProto['sb_setup_effect'] = G['sb_setup_effect']; } catch (e) { }
    try { G.forBlock['sb_setup_effect'] = G['sb_setup_effect']; } catch (e) { }

    return true;
}