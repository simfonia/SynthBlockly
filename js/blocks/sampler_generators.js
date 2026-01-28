// js/blocks/sampler_generators.js

export function registerGenerators(Blockly, javascriptGenerator) {
    if (typeof Blockly === 'undefined' || typeof javascriptGenerator === 'undefined') {
        console.error('javascriptGenerator not available; please call registerGenerators after javascript_compressed.js has loaded');
        return false;
    }
    var G = javascriptGenerator;

    if (!G.forBlock) G.forBlock = {};

    /**
     * Helper to find the nearest container's instrument name.
     */
    function getContainerTarget(block) {
        let p = block.getSurroundParent();
        while (p) {
            if (p.type === 'sb_instrument_container') return p.getFieldValue('NAME') || 'MyInstrument';
            p = p.getSurroundParent();
        }
        return 'DefaultSynth';
    }

    G['sb_create_sampler_instrument'] = function (block) {
        const name = G.quote_(getContainerTarget(block));
        const samplerType = block.getFieldValue('SAMPLER_TYPE');
        const violinSampleMap = `JSON.parse('{"G3":"G3.wav","A3":"A3.wav","B3":"B3.wav","D4":"D4.wav","Gb4":"Gb4.wav","A4":"A4.wav","C5":"C5.wav","E5":"E5.wav","G5":"G5.wav","B5":"B5.wav","D6":"D6.wav"}')`;

        const baseSamplesPath = import.meta.env.BASE_URL + 'samples/';
        const jkPath = `${baseSamplesPath}jazzkit/Roland_TR-909/`;
        const pianoPath = `${baseSamplesPath}piano/`;

        switch (samplerType) {
            case 'DEFAULT':
                // Use local piano sample for guaranteed loading
                return `window.audioEngine.createCustomSampler(${name}, { "C4": "C4.mp3" }, "${pianoPath}", { attack: 0.02, decay: 0.5, sustain: 0.5, release: 1.0 });\n`;
            
            case 'VIOLIN_PIZZ':
                return `window.audioEngine.createCustomSampler(${name}, ${violinSampleMap}, '${baseSamplesPath}violin/violin-section-pizzicato/', { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.5 });\n`;

            case 'VIOLIN_SUSTAIN':
                return `window.audioEngine.createCustomSampler(${name}, ${violinSampleMap}, '${baseSamplesPath}violin/violin-section-vibrato-sustain/', { attack: 0.1, decay: 0.5, sustain: 1.0, release: 3.0 });\n`;

            case 'JK_KICK': return `window.audioEngine.createCustomSampler(${name}, { "C4": "BT0A0D0.WAV" }, "${jkPath}");\n`;
            case 'JK_SNARE': return `window.audioEngine.createCustomSampler(${name}, { "C4": "ST7T7S7.WAV" }, "${jkPath}");\n`;
            case 'JK_HH': return `window.audioEngine.createCustomSampler(${name}, { "C4": "HHCDA.WAV" }, "${jkPath}");\n`;
            case 'JK_OHH': return `window.audioEngine.createCustomSampler(${name}, { "C4": "HHODA.WAV" }, "${jkPath}");\n`;
            case 'JK_CLAP': return `window.audioEngine.createCustomSampler(${name}, { "C4": "HANDCLP2.WAV" }, "${jkPath}");\n`;
            case 'JK_RIM': return `window.audioEngine.createCustomSampler(${name}, { "C4": "RIM127.WAV" }, "${jkPath}");\n`;
            case 'JK_TOM_H': return `window.audioEngine.createCustomSampler(${name}, { "C4": "HTAD0.WAV" }, "${jkPath}");\n`;
            case 'JK_TOM_M': return `window.audioEngine.createCustomSampler(${name}, { "C4": "MTAD0.WAV" }, "${jkPath}");\n`;
            case 'JK_TOM_L': return `window.audioEngine.createCustomSampler(${name}, { "C4": "LTAD0.WAV" }, "${jkPath}");\n`;
            case 'JK_CRASH': return `window.audioEngine.createCustomSampler(${name}, { "C4": "CSHDA.WAV" }, "${jkPath}");\n`;
            case 'JK_RIDE': return `window.audioEngine.createCustomSampler(${name}, { "C4": "RIDEDA.WAV" }, "${jkPath}");\n`;

            case 'CUSTOM': {
                const baseUrl = G.valueToCode(block, 'BASE_URL', G.ORDER_ATOMIC) || "''";
                const sampleMapInput = block.getFieldValue('SAMPLE_MAP_JSON_FIELD') || '{}';

                let mappingCode;
                // Check if it's a URL or path
                if (sampleMapInput.trim().startsWith('http') || sampleMapInput.trim().endsWith('.json')) {
                    mappingCode = `'${sampleMapInput.trim()}'`;
                } else {
                    // It's a JSON string, escape it for the generated code
                    const escaped = sampleMapInput
                        .replace(/\\/g, '\\\\')
                        .replace(/'/g, "\\'")
                        .replace(/\n/g, '\\n');
                    mappingCode = `JSON.parse('${escaped}')`;
                }

                const code = `
try {
    const mapping = ${mappingCode};
    // Note: createCustomSampler is now async, but we don't necessarily need to await it here
    // unless we want to block the entire execution flow.
    window.audioEngine.createCustomSampler(${name}, mapping, ${baseUrl}, null);
} catch (e) {
    window.audioEngine.logKey('LOG_SAMPLER_JSON_ERR', 'error', e.message);
    console.error('Failed to process sampler mapping:', e);
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