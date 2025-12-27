// js/blocks/noise_generators.js
export function registerGenerators(Blockly, javascriptGenerator) {
    if (typeof Blockly === 'undefined' || typeof javascriptGenerator === 'undefined') {
        console.error('javascriptGenerator not available');
        return false;
    }
    const G = javascriptGenerator;

    G.forBlock['sb_play_background_noise'] = function(block) {
        const noiseType = block.getFieldValue('NOISE_TYPE');
        const volume = G.valueToCode(block, 'VOLUME', G.ORDER_ATOMIC) || '0.1';
        const code = `window.audioEngine.playBackgroundNoise('${noiseType}', ${volume});\n`;
        return code;
    };

    G.forBlock['sb_stop_background_noise'] = function(block) {
        const code = `window.audioEngine.stopBackgroundNoise();\n`;
        return code;
    };
}
