// js/blocks/melody_generators.js

export function registerGenerators(Blockly, javascriptGenerator) {
    if (typeof Blockly === 'undefined' || typeof javascriptGenerator === 'undefined') {
        console.error('javascriptGenerator not available');
        return false;
    }
    
    if (!javascriptGenerator.forBlock) {
        javascriptGenerator.forBlock = {};
    }

    javascriptGenerator.forBlock['sb_play_melody'] = function (block, generator) {
        const melodyString = block.getFieldValue('MELODY_STRING') || '';
        
        // Use JSON.stringify to safely escape newlines and special characters
        const escapedMelody = JSON.stringify(melodyString);
        
        return `await window.audioEngine.playMelodyString(${escapedMelody});\n`;
    };

    return true;
}

