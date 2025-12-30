// js/blocks/sampler_generators.js

export function registerGenerators(Blockly, javascriptGenerator) {
    if (typeof Blockly === 'undefined' || typeof javascriptGenerator === 'undefined') {
        console.error('javascriptGenerator not available; please call registerGenerators after javascript_compressed.js has loaded');
        return false;
    }
    var G = javascriptGenerator;

    if (!G.forBlock) G.forBlock = {};

    G['sb_create_sampler_instrument'] = function (block) {
        const name = G.quote_(block.getFieldValue('NAME'));
        const samplerType = block.getFieldValue('SAMPLER_TYPE');
        const violinSampleMap = `JSON.parse('{"G3":"G3.wav","A3":"A3.wav","B3":"B3.wav","D4":"D4.wav","Gb4":"Gb4.wav","A4":"A4.wav","C5":"C5.wav","E5":"E5.wav","G5":"G5.wav","B5":"B5.wav","D6":"D6.wav"}')`;
        // const violinSampleMap = `JSON.parse('{"C5":"C5.wav"}')`;

        switch (samplerType) {
            case 'DEFAULT':
                // Default Piano ADSR
                // Call createCustomSampler for default piano
                return `window.audioEngine.createCustomSampler(${name}, { "C4": "C4.mp3" }, "https://tonejs.github.io/audio/salamander/", { attack: 0.02, decay: 0.5, sustain: 0.5, release: 1.0 });\n`;
            
            case 'VIOLIN_PIZZ':
                // Pizzicato ADSR (short)
                return `window.audioEngine.createCustomSampler(${name}, ${violinSampleMap}, '${import.meta.env.BASE_URL}samples/violin/violin-section-pizzicato/', { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.5 });\n`;

            case 'VIOLIN_SUSTAIN':
                // Sustain ADSR (long)
                return `window.audioEngine.createCustomSampler(${name}, ${violinSampleMap}, '${import.meta.env.BASE_URL}samples/violin/violin-section-vibrato-sustain/', { attack: 0.1, decay: 0.5, sustain: 1.0, release: 3.0 });\n`;

            case 'CUSTOM': {
                const baseUrl = G.valueToCode(block, 'BASE_URL', G.ORDER_ATOMIC) || "''";
                const sampleMapJson = block.getFieldValue('SAMPLE_MAP_JSON_FIELD'); // Note the field name change

                const escapedSampleMapJson = (sampleMapJson || '{}')
                    .replace(/\\/g, '\\\\')
                    .replace(/'/g, "\\'")
                    .replace(/\n/g, '\\n');

                const code = `
try {
    const sampleMap = JSON.parse('${escapedSampleMapJson}');
    // No specific envelope settings passed for CUSTOM, will use default in createCustomSampler
    window.audioEngine.createCustomSampler(${name}, sampleMap, ${baseUrl}, null);
} catch (e) {
    window.audioEngine.logKey('LOG_SAMPLER_JSON_ERR', 'error', e.message);
    console.error('Failed to parse sampler JSON:', e);
}
`;
                return code;
            }
        }
    }.bind(G);

    // Make sure the generator is correctly registered for different Blockly versions/builds
    try {
        const Gproto = Object.getPrototypeOf(G) || (G.constructor && G.constructor.prototype) || null;
        if (Gproto) Gproto['sb_create_sampler_instrument'] = G['sb_create_sampler_instrument'];
        if (Blockly.Generator.prototype) Blockly.Generator.prototype['sb_create_sampler_instrument'] = G['sb_create_sampler_instrument'];
        G.forBlock['sb_create_sampler_instrument'] = G['sb_create_sampler_instrument'];
    } catch (e) { /* ignore */ }

    // Clean up the old generator
    delete G['sb_create_custom_sampler'];
    try {
        delete G.forBlock['sb_create_custom_sampler'];
    } catch(e) { /* ignore */ }
}