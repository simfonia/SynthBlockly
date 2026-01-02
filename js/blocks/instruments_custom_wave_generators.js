// js/blocks/instruments_custom_wave_generators.js

import { javascriptGenerator } from 'blockly/javascript';

export function registerGenerators(BlocklyInstance, javascriptGeneratorInstance) {

  // Generator for the new all-in-one sb_create_harmonic_synth block
  javascriptGeneratorInstance.forBlock['sb_create_harmonic_synth'] = function(block, generator) {
    const instrumentName = generator.quote_(block.getFieldValue('NAME'));

    // Logic moved from the old 'sb_harmonic_partials' generator
    const partials = [];
    // The itemCount_ is now on this block itself
    for (let i = 0; i < block.itemCount_; i++) {
      const partialValue = generator.valueToCode(block, 'PARTIAL' + i, generator.ORDER_ATOMIC) || '0';
      partials.push(partialValue);
    }
    const partialsArray = '[' + partials.join(', ') + ']';

    const code = `
        window.audioEngine.createCustomWaveInstrument(${instrumentName}, ${partialsArray});
    `;
    return code;
  };

  // Generator for sb_create_additive_synth block
  javascriptGeneratorInstance.forBlock['sb_create_additive_synth'] = function(block, generator) {
    const instrumentName = generator.quote_(block.getFieldValue('NAME'));
    
    const components = [];
    for (let i = 0; i < block.itemCount_; i++) {
      const amp = generator.valueToCode(block, 'AMP' + i, generator.ORDER_ATOMIC) || '0';
      const freqRatio = generator.valueToCode(block, 'FREQ_RATIO' + i, generator.ORDER_ATOMIC) || '1';
      const waveform = block.getFieldValue('WAVE' + i) || 'sine';
      components.push(`{amp: ${amp}, freqRatio: ${freqRatio}, waveform: '${waveform}'}`);
    }
    const componentsArrayString = '[' + components.join(', ') + ']';

    const code = `
        window.audioEngine.createAdditiveInstrument(${instrumentName}, ${componentsArrayString});
    `;
    return code;
  };

}
