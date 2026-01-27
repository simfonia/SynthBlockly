import * as Blockly from 'blockly';
import { getHelpUrl } from '../core/helpUtils.js';
import { getInstrumentOptions } from '../core/blocklyUtils.js';

export function registerBlocks() {
    if (typeof Blockly === 'undefined') {
        console.error('Blockly not available');
        return false;
    }

    // NOTE: sb_select_current_instrument is now defined in instruments_blocks.js
    // to centralize instrument management logic.

    Blockly.Blocks['sb_play_melody'] = {
        init: function () {
            // Add Instrument Target selector (Move to top)
            this.appendDummyInput('TARGET_ROW')
                .appendField(Blockly.Msg['SB_SELECT_CURRENT_INSTRUMENT_MESSAGE'].split('%1')[0])
                .appendField(new Blockly.FieldDropdown(function() {
                    const options = getInstrumentOptions(false);
                    return [["(當前音源)", "CURRENT"], ...options];
                }), "TARGET");

            this.jsonInit({
                "message0": "%{BKY_SB_PLAY_MELODY_MESSAGE}",
                "args0": [
                    {
                        "type": "field_multilineinput",
                        "name": "MELODY_STRING",
                        "text": "C4Q, D4Q, E4Q, F4Q, G4H"
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_PERFORMANCE_HUE}",
                "tooltip": "%{BKY_SB_PLAY_MELODY_TOOLTIP}"
            });

            this.setHelpUrl(getHelpUrl('melody_readme'));
        }
    };
}
