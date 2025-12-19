// js/blocks/math_generators.js
// Generators for custom math-related blocks

export function registerGenerators(Blockly, javascriptGenerator) {
    if (typeof Blockly === 'undefined' || typeof javascriptGenerator === 'undefined') {
        console.error('Blockly or javascriptGenerator not available');
        return false;
    }

    javascriptGenerator.forBlock['math_map'] = function(block) {
        const value = javascriptGenerator.valueToCode(block, 'VALUE', javascriptGenerator.ORDER_ATOMIC) || '0';
        const fromLow = javascriptGenerator.valueToCode(block, 'FROM_LOW', javascriptGenerator.ORDER_ATOMIC) || '0';
        const fromHigh = javascriptGenerator.valueToCode(block, 'FROM_HIGH', javascriptGenerator.ORDER_ATOMIC) || '1023';
        const toLow = javascriptGenerator.valueToCode(block, 'TO_LOW', javascriptGenerator.ORDER_ATOMIC) || '0';
        const toHigh = javascriptGenerator.valueToCode(block, 'TO_HIGH', javascriptGenerator.ORDER_ATOMIC) || '100';

        const code = `((${value} - ${fromLow}) * (${toHigh} - ${toLow}) / (${fromHigh} - ${fromLow}) + ${toLow})`;
        return [code, javascriptGenerator.ORDER_ATOMIC];
    };
}
