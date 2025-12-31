// js/blocks/instruments_custom_wave_blocks.js

export function registerBlocks(BlocklyInstance) {

  // --- Mutator Logic Object (to be used by the main block) ---
  const HARMONIC_PARTIALS_MUTATOR = {
    itemCount_: 1,

    mutationToDom: function() {
      const container = BlocklyInstance.utils.xml.createElement('mutation');
      container.setAttribute('items', this.itemCount_);
      return container;
    },

    domToMutation: function(xmlElement) {
      this.itemCount_ = parseInt(xmlElement.getAttribute('items'), 10) || 0;
      this.updateShape_();
    },

    decompose: function(workspace) {
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

    compose: function(containerBlock) {
      let itemBlock = containerBlock.getInputTargetBlock('STACK');
      const connections = [];
      while (itemBlock) {
        connections.push(itemBlock.valueConnection_);
        itemBlock = itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
      }

      for (let i = 0; i < this.itemCount_; i++) {
        const connection = this.getInput('PARTIAL' + i).connection.targetConnection;
        if (connection && connections.indexOf(connection) === -1) {
          connection.disconnect();
        }
      }

      this.itemCount_ = connections.length;
      this.updateShape_();

      for (let i = 0; i < this.itemCount_; i++) {
        if (connections[i]) {
            connections[i].reconnect(this, 'PARTIAL' + i);
        }
      }
    },

    saveConnections: function(containerBlock) {
        let itemBlock = containerBlock.getInputTargetBlock('STACK');
        let i = 0;
        while (itemBlock) {
            const input = this.getInput('PARTIAL' + i);
            itemBlock.valueConnection_ = input && input.connection.targetConnection;
            i++;
            itemBlock = itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
        }
    },

    updateShape_: function() {
      // Add new inputs.
      for (let i = 0; i < this.itemCount_; i++) {
        if (!this.getInput('PARTIAL' + i)) {
          const input = this.appendValueInput('PARTIAL' + i)
              .setCheck('Number');
          if (i === 0) {
            input.appendField(BlocklyInstance.Msg['MSG_FUNDAMENTAL_FIELD']);
          } else {
            input.appendField(BlocklyInstance.Msg['MSG_HARMONIC_FIELD'].replace('{0}', i + 1));
          }
        }
      }
      // Remove deleted inputs.
      let i = this.itemCount_;
      while (this.getInput('PARTIAL' + i)) {
        this.removeInput('PARTIAL' + i);
        i++;
      }
    }
  };

  // Define the new "all-in-one" synth block
  BlocklyInstance.Blocks['sb_create_harmonic_synth'] = {
    init: function() {
      this.jsonInit({
        "message0": "%{BKY_MSG_HARMONIC_ADDER_CATEGORY} 名稱 %1",
        "args0": [
          {
            "type": "field_input",
            "name": "NAME",
            "text": "MyHarmonicSynth"
          }
        ],
        "previousStatement": null,
        "nextStatement": null,
        "colour": "%{BKY_SOUND_SOURCES_HUE}",
        "tooltip": "%{BKY_MSG_HARMONIC_SYNTH_TOOLTIP}",
        "helpUrl": ""
      });

      // Manually add the mutator icon
      this.setMutator(new BlocklyInstance.icons.MutatorIcon(['sb_harmonic_partial_item'], this));
      
      // Initialize with one partial input
      this.itemCount_ = 1;
      this.updateShape_();
    },
    // Add all mutator hooks directly to the block definition
    ...HARMONIC_PARTIALS_MUTATOR
  };

  // Mutator "container" and "item" blocks are still needed for the dialog
  BlocklyInstance.defineBlocksWithJsonArray([
    {
      "type": "sb_harmonic_partial_container",
      "message0": "泛音",
      "message1": "%1",
      "args1": [{
        "type": "input_statement",
        "name": "STACK"
      }],
      "colour": "%{BKY_SOUND_SOURCES_HUE}",
      "tooltip": "為自訂波形添加、刪除或重新排序泛音。",
      "enableContextMenu": false
    },
    {
      "type": "sb_harmonic_partial_item",
      "message0": "泛音項目",
      "previousStatement": null,
      "nextStatement": null,
      "colour": "%{BKY_SOUND_SOURCES_HUE}",
      "tooltip": "泛音項目，用於設定振幅。",
      "enableContextMenu": false
    }
  ]);

  //================================================================
  //== ADDITIVE SYNTHESIZER (FREE FREQUENCY)
  //================================================================

  const ADDITIVE_SYNTH_MUTATOR = {
    itemCount_: 1,
    mutationToDom: function() {
      const container = BlocklyInstance.utils.xml.createElement('mutation');
      container.setAttribute('items', this.itemCount_);
      return container;
    },
    domToMutation: function(xmlElement) {
      this.itemCount_ = parseInt(xmlElement.getAttribute('items'), 10) || 0;
      this.updateShape_();
    },
    decompose: function(workspace) {
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
    compose: function(containerBlock) {
      let itemBlock = containerBlock.getInputTargetBlock('STACK');
      const connections = {amp: [], freq: []};
      while (itemBlock) {
        connections.amp.push(itemBlock.ampConnection_);
        connections.freq.push(itemBlock.freqConnection_);
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
        if (connections.amp[i]) {
            connections.amp[i].reconnect(this, 'AMP' + i);
        }
        if (connections.freq[i]) {
            connections.freq[i].reconnect(this, 'FREQ_RATIO' + i);
        }
      }
    },
    saveConnections: function(containerBlock) {
      let itemBlock = containerBlock.getInputTargetBlock('STACK');
      let i = 0;
      while (itemBlock) {
        const ampInput = this.getInput('AMP' + i);
        const freqInput = this.getInput('FREQ_RATIO' + i);
        itemBlock.ampConnection_ = ampInput && ampInput.connection.targetConnection;
        itemBlock.freqConnection_ = freqInput && freqInput.connection.targetConnection;
        i++;
        itemBlock = itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
      }
    },
    updateShape_: function() {
      for (let i = 0; i < this.itemCount_; i++) {
        if (!this.getInput('AMP' + i)) {
          // Add Oscillator Label
          const oscLabel = this.appendDummyInput('OSC_LABEL' + i);
          if (i === 0) {
            oscLabel.appendField(BlocklyInstance.Msg['MSG_MAIN_OSCILLATOR_FIELD']);
          } else {
            oscLabel.appendField(BlocklyInstance.Msg['MSG_OSCILLATOR_FIELD'].replace('{0}', i + 1));
          }

          // Add Amplitude Input
          this.appendValueInput('AMP' + i)
              .setCheck('Number')
              .setAlign(BlocklyInstance.ALIGN_RIGHT)
              .appendField(BlocklyInstance.Msg['MSG_AMPLITUDE_INPUT_FIELD']);
          
          // Add Frequency Ratio Input
          const freqInput = this.appendValueInput('FREQ_RATIO' + i)
              .setCheck('Number')
              .setAlign(BlocklyInstance.ALIGN_RIGHT)
              .appendField(BlocklyInstance.Msg['MSG_FREQ_RATIO_INPUT_FIELD']);
          
          // Add a shadow block with default value '1' for the first frequency ratio
          if (i === 0) {
            const shadowDom = BlocklyInstance.utils.xml.textToDom(
                '<shadow type="math_number"><field name="NUM">1</field></shadow>'
            );
            freqInput.connection.setShadowDom(shadowDom);
          }
        }
      }
      // Remove deleted inputs.
      let i = this.itemCount_;
      while (this.getInput('AMP' + i)) {
        this.removeInput('OSC_LABEL' + i);
        this.removeInput('AMP' + i);
        this.removeInput('FREQ_RATIO' + i);
        i++;
      }
    }
  };
  
  BlocklyInstance.Blocks['sb_create_additive_synth'] = {
    init: function() {
      this.jsonInit({
        "message0": "%{BKY_MSG_CREATE_ADDITIVE_SYNTH_MESSAGE}",
        "args0": [
          {
            "type": "field_input",
            "name": "NAME",
            "text": "MyAdditiveSynth"
          }
        ],
        "previousStatement": null,
        "nextStatement": null,
        "colour": "%{BKY_SOUND_SOURCES_HUE}",
        "tooltip": "%{BKY_MSG_CREATE_ADDITIVE_SYNTH_TOOLTIP}",
        "helpUrl": ""
      });
      this.setMutator(new BlocklyInstance.icons.MutatorIcon(['sb_additive_synth_item'], this));
      this.itemCount_ = 1;
      this.updateShape_();
    },
    ...ADDITIVE_SYNTH_MUTATOR
  };

  BlocklyInstance.defineBlocksWithJsonArray([
    {
      "type": "sb_additive_synth_container",
      "message0": "振盪器",
      "message1": "%1",
      "args1": [{ "type": "input_statement", "name": "STACK" }],
      "colour": "%{BKY_SOUND_SOURCES_HUE}",
      "tooltip": "為加法合成器添加、刪除或重新排序振盪器。",
      "enableContextMenu": false
    },
    {
      "type": "sb_additive_synth_item",
      "message0": "振盪器項目",
      "previousStatement": null,
      "nextStatement": null,
      "colour": "%{BKY_SOUND_SOURCES_HUE}",
      "tooltip": "一個振盪器項目。",
      "enableContextMenu": false
    }
  ]);

} // End export function registerBlocks