// js/blocks/melody_blocks.js
import * as Blockly from 'blockly';

export function registerBlocks() {
    if (typeof Blockly === 'undefined') {
        console.error('Blockly not available');
        return false;
    }

    Blockly.Blocks['sb_play_melody'] = {
        init: function () {
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

            this.setHelpUrl(() => {
                const currentLang = window.currentLanguage || 'en';
                if (currentLang === 'zh-hant') {
                    return 'docs/melody_readme_zh-hant.html';
                }
                return 'docs/melody_readme_en.html';
            });
        }
    };
}
