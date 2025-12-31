// js/blocks/sfx_generators.js

export function registerGenerators(Blockly, javascriptGenerator) {
    if (typeof Blockly === 'undefined' || typeof javascriptGenerator === 'undefined') {
        console.error('javascriptGenerator not available');
        return false;
    }
    
    // Ensure forBlock exists (Blockly 10+)
    if (!javascriptGenerator.forBlock) {
        javascriptGenerator.forBlock = {};
    }

    javascriptGenerator.forBlock['sb_play_sfx'] = function (block) {
        var dropdown_filename = block.getFieldValue('FILENAME');
        var url;

        // Use javascriptGenerator.valueToCode instead of G
        if (dropdown_filename === 'CUSTOM') {
            url = javascriptGenerator.valueToCode(block, 'CUSTOM_URL', javascriptGenerator.ORDER_ATOMIC) || "''";
        } else {
            url = `'${import.meta.env.BASE_URL}${dropdown_filename}'`;
        }

        var checkbox_reverse = block.getFieldValue('REVERSE') === 'TRUE';
        var value_speed = javascriptGenerator.valueToCode(block, 'SPEED', javascriptGenerator.ORDER_ATOMIC) || '1';
        var value_volume = javascriptGenerator.valueToCode(block, 'VOLUME', javascriptGenerator.ORDER_ATOMIC) || '1';

        var code = `window.audioEngine.playSFX(${url}, { 
    reverse: ${checkbox_reverse}, 
    playbackRate: Number(${value_speed}), 
    volume: Number(${value_volume}) 
});\n`;
        return code;
    };

    console.log("SFX generator registered for sb_play_sfx");
    return true;
}
