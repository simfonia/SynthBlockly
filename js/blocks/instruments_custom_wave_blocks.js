// js/blocks/instruments_custom_wave_blocks.js
import { getHelpUrl } from '../core/helpUtils.js';

export function registerBlocks(BlocklyInstance) {

  const HARMONIC_PARTIALS_MUTATOR = {
    itemCount_: 1,
    mutationToDom: function () {
      const container = BlocklyInstance.utils.xml.createElement('mutation');
      container.setAttribute('items', this.itemCount_);
      return container;
    },
    domToMutation: function (xmlElement) {
      this.itemCount_ = parseInt(xmlElement.getAttribute('items'), 10) || 0;
      this.updateShape_();
    },
    decompose: function (workspace) {
      const containerBlock = workspace.newBlock('sb_harmonic_partial_container');
      containerBlock.initSvg();
      let connection = containerBlock.getInput('STACK').connection;
      for (let i = 0; i < this.itemCount_; i++) {
        const itemBlock = workspace.newBlock('sb_harmonic_partial_item');
        itemBlock.initSvg();
        connection.connect(itemBlock.previousConnection);
        connection = itemBlock.nextConnection;
      }
      return containerBlock;
    },
    compose: function (containerBlock) {
      let itemBlock = containerBlock.getInputTargetBlock('STACK');
      const connections = [];
      while (itemBlock) {
        connections.push(itemBlock.valueConnection_);
        itemBlock = itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
      }
      for (let i = 0; i < this.itemCount_; i++) {
        const connection = this.getInput('PARTIAL' + i).connection.targetConnection;
        if (connection && connections.indexOf(connection) === -1) connection.disconnect();
      }
      this.itemCount_ = connections.length;
      this.updateShape_();
      for (let i = 0; i < this.itemCount_; i++) {
        if (connections[i]) connections[i].reconnect(this, 'PARTIAL' + i);
      }
    },
    saveConnections: function (containerBlock) {
      let itemBlock = containerBlock.getInputTargetBlock('STACK');
      let i = 0;
      while (itemBlock) {
        const input = this.getInput('PARTIAL' + i);
        itemBlock.valueConnection_ = input && input.connection.targetConnection;
        i++;
        itemBlock = itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
      }
    },
    updateShape_: function () {
      for (let i = 0; i < this.itemCount_; i++) {
        if (!this.getInput('PARTIAL' + i)) {
          const input = this.appendValueInput('PARTIAL' + i).setCheck('Number');
          if (i === 0) input.appendField(BlocklyInstance.Msg['SB_PARAM_FUNDAMENTAL_LABEL']);
          else input.appendField(BlocklyInstance.Msg['SB_PARAM_HARMONIC_LABEL'].replace('{0}', i + 1));
          input.connection.setShadowDom(BlocklyInstance.utils.xml.textToDom('<shadow type="math_number"><field name="NUM">0.5</field></shadow>'));
        }
      }
      let i = this.itemCount_;
      while (this.getInput('PARTIAL' + i)) { this.removeInput('PARTIAL' + i); i++; }
    }
  };

  BlocklyInstance.Blocks['sb_create_harmonic_synth'] = {
    init: function () {
      this.jsonInit({
        "message0": "%{BKY_SB_CAT_HARMONIC_ADDER}",
        "args0": [],
        "previousStatement": null,
        "nextStatement": null,
        "colour": "%{BKY_SB_CAT_INSTRUMENTS_HUE}",
        "tooltip": "%{BKY_SB_CREATE_HARMONIC_SYNTH_TOOLTIP}"
      });
      this.setHelpUrl(getHelpUrl('instrument_readme'));
      this.setMutator(new BlocklyInstance.icons.MutatorIcon(['sb_harmonic_partial_item'], this));
      this.itemCount_ = 1;
      this.updateShape_();
      this.is_sound_source_block = true;
    },
    ...HARMONIC_PARTIALS_MUTATOR
  };

  const ADDITIVE_SYNTH_MUTATOR = {
    itemCount_: 1,
    mutationToDom: function () {
      const container = BlocklyInstance.utils.xml.createElement('mutation');
      container.setAttribute('items', this.itemCount_);
      return container;
    },
    domToMutation: function (xmlElement) {
      this.itemCount_ = parseInt(xmlElement.getAttribute('items'), 10) || 0;
      this.updateShape_();
    },
    decompose: function (workspace) {
      const containerBlock = workspace.newBlock('sb_additive_synth_container');
      containerBlock.initSvg();
      let connection = containerBlock.getInput('STACK').connection;
      for (let i = 0; i < this.itemCount_; i++) {
        const itemBlock = workspace.newBlock('sb_additive_synth_item');
        itemBlock.initSvg();
        connection.connect(itemBlock.previousConnection);
        connection = itemBlock.nextConnection;
      }
      return containerBlock;
    },
    compose: function (containerBlock) {
      let itemBlock = containerBlock.getInputTargetBlock('STACK');
      const connections = { amp: [], freq: [], wave: [] };
      while (itemBlock) {
        connections.amp.push(itemBlock.ampConnection_);
        connections.freq.push(itemBlock.freqConnection_);
        connections.wave.push(itemBlock.waveValue_);
        itemBlock = itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
      }
      for (let i = 0; i < this.itemCount_; i++) {
        if (!connections.amp[i] || !connections.freq[i]) {
          this.removeInput('OSC_LABEL' + i, true);
          this.removeInput('AMP' + i, true);
          this.removeInput('FREQ_RATIO' + i, true);
        }
      }
      this.itemCount_ = connections.amp.length;
      this.updateShape_();
      for (let i = 0; i < this.itemCount_; i++) {
        if (connections.amp[i]) connections.amp[i].reconnect(this, 'AMP' + i);
        if (connections.freq[i]) connections.freq[i].reconnect(this, 'FREQ_RATIO' + i);
        if (connections.wave[i]) this.setFieldValue(connections.wave[i], 'WAVE' + i);
      }
    },
    saveConnections: function (containerBlock) {
      let itemBlock = containerBlock.getInputTargetBlock('STACK');
      let i = 0;
      while (itemBlock) {
        const ampInput = this.getInput('AMP' + i);
        const freqInput = this.getInput('FREQ_RATIO' + i);
        itemBlock.ampConnection_ = ampInput && ampInput.connection.targetConnection;
        itemBlock.freqConnection_ = freqInput && freqInput.connection.targetConnection;
        itemBlock.waveValue_ = this.getFieldValue('WAVE' + i);
        i++;
        itemBlock = itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
      }
    },
    updateShape_: function () {
      const waveOptions = [
        [BlocklyInstance.Msg['SB_PARAM_WAVE_SINE'] || "弦波 (Sine)", "sine"],
        [BlocklyInstance.Msg['SB_PARAM_WAVE_SQUARE'] || "方波 (Square)", "square"],
        [BlocklyInstance.Msg['SB_PARAM_WAVE_TRIANGLE'] || "三角波 (Triangle)", "triangle"],
        [BlocklyInstance.Msg['SB_PARAM_WAVE_SAWTOOTH'] || "鋸齒波 (Sawtooth)", "sawtooth"]
      ];
      for (let i = 0; i < this.itemCount_; i++) {
        if (!this.getInput('AMP' + i)) {
          const oscLabel = this.appendDummyInput('OSC_LABEL' + i);
          const labelText = (i === 0) ? BlocklyInstance.Msg['SB_PARAM_MAIN_OSCILLATOR_LABEL'] : BlocklyInstance.Msg['SB_PARAM_OSCILLATOR_LABEL'].replace('{0}', i + 1);
          oscLabel.appendField(labelText).appendField(new BlocklyInstance.FieldDropdown(waveOptions), 'WAVE' + i);
          const ampInput = this.appendValueInput('AMP' + i).setCheck('Number').setAlign(Blockly.ALIGN_RIGHT).appendField(BlocklyInstance.Msg['SB_SLIDER_AMPLITUDE'] || "振幅");
          ampInput.connection.setShadowDom(BlocklyInstance.utils.xml.textToDom('<shadow type="math_number"><field name="NUM">0.5</field></shadow>'));
          const freqInput = this.appendValueInput('FREQ_RATIO' + i).setCheck('Number').setAlign(Blockly.ALIGN_RIGHT).appendField(BlocklyInstance.Msg['SB_PARAM_FREQ_RATIO_LABEL']);
          freqInput.connection.setShadowDom(BlocklyInstance.utils.xml.textToDom('<shadow type="math_number"><field name="NUM">1</field></shadow>'));
        }
      }
      let i = this.itemCount_;
      while (this.getInput('AMP' + i)) { this.removeInput('OSC_LABEL' + i); this.removeInput('AMP' + i); this.removeInput('FREQ_RATIO' + i); i++; }
    }
  };

  BlocklyInstance.Blocks['sb_create_additive_synth'] = {
    init: function () {
      this.jsonInit({
        "message0": "%{BKY_SB_CREATE_ADDITIVE_SYNTH_MESSAGE}",
        "args0": [],
        "previousStatement": null,
        "nextStatement": null,
        "colour": "%{BKY_SB_CAT_INSTRUMENTS_HUE}",
        "tooltip": "%{BKY_SB_CREATE_ADDITIVE_SYNTH_TOOLTIP}"
      });
      this.setHelpUrl(getHelpUrl('instrument_readme'));
      this.setMutator(new BlocklyInstance.icons.MutatorIcon(['sb_additive_synth_item'], this));
      this.itemCount_ = 1;
      this.updateShape_();
      this.is_sound_source_block = true;
    },
    ...ADDITIVE_SYNTH_MUTATOR
  };

  BlocklyInstance.defineBlocksWithJsonArray([
    { "type": "sb_harmonic_partial_container", "message0": "%{BKY_SB_MUTATOR_HARMONIC_CONTAINER}", "message1": "%1", "args1": [{ "type": "input_statement", "name": "STACK" }], "colour": "%{BKY_SB_CAT_INSTRUMENTS_HUE}", "enableContextMenu": false },
    { "type": "sb_harmonic_partial_item", "message0": "%{BKY_SB_MUTATOR_HARMONIC_ITEM}", "previousStatement": null, "nextStatement": null, "colour": "%{BKY_SB_CAT_INSTRUMENTS_HUE}", "enableContextMenu": false },
    { "type": "sb_additive_synth_container", "message0": "%{BKY_SB_MUTATOR_ADDITIVE_CONTAINER}", "message1": "%1", "args1": [{ "type": "input_statement", "name": "STACK" }], "colour": "%{BKY_SB_CAT_INSTRUMENTS_HUE}", "enableContextMenu": false },
    { "type": "sb_additive_synth_item", "message0": "%{BKY_SB_MUTATOR_ADDITIVE_ITEM}", "previousStatement": null, "nextStatement": null, "colour": "%{BKY_SB_CAT_INSTRUMENTS_HUE}", "enableContextMenu": false }
  ]);

}
