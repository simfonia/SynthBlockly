// js/blocks/melody_generators.js

export function registerGenerators(Blockly, javascriptGenerator) {
    if (typeof Blockly === 'undefined' || typeof javascriptGenerator === 'undefined') {
        console.error('javascriptGenerator not available');
        return false;
    }
    
    if (!javascriptGenerator.forBlock) { javascriptGenerator.forBlock = {}; }
    const G = javascriptGenerator;

    function getContainerTarget(block) {
        let p = block.getSurroundParent();
        while (p) {
            if (p.type === 'sb_instrument_container') return p.getFieldValue('NAME') || 'MyInstrument';
            p = p.getSurroundParent();
        }
        return null; 
    }

    javascriptGenerator.forBlock['sb_select_current_instrument'] = function (block) {
        const name = G.quote_(block.getFieldValue('NAME'));
        return `
            (function() {
                const targetName = ${name};
                window.audioEngine.transitionToInstrument(targetName);
                window.audioEngine.logKey('LOG_SWITCH_INSTR_SUCCESS', 'important', targetName);
            })();
        `;
    };

    javascriptGenerator.forBlock['sb_play_melody'] = function (block) {
        const melodyString = block.getFieldValue('MELODY_STRING') || '';
        const escapedMelody = JSON.stringify(melodyString);
        let target = block.getFieldValue('TARGET');
        if (!target || target === 'CURRENT') { target = getContainerTarget(block); }
        const targetArg = (target && target !== 'CURRENT') ? G.quote_(target) : 'undefined';
        const timeArg = "(typeof scheduledTime === 'number' ? scheduledTime : undefined)";
        return `await window.audioEngine.playMelodyString(${escapedMelody}, ${targetArg}, ${timeArg});\n`;
    };

    return true;
}

