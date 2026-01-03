// js/blocks/sfx_blocks.js
import * as Blockly from 'blockly';

// Dynamically import all audio files from the public/samples/sound directory
// We use eager: true to get the list immediately, and as: 'url' to get the paths
const sfxModules = import.meta.glob('../../public/samples/sound/*.{wav,mp3,ogg,m4a}', { eager: true, query: '?url' });

/**
 * Generate dropdown options from the imported modules
 */
function getSfxOptions() {
    const options = [];
    
    // Process each matched file
    Object.keys(sfxModules).forEach(filePath => {
        // Extract filename from path (e.g., "../../public/samples/sound/Explosion-1.wav" -> "Explosion-1.wav")
        const fileName = filePath.split('/').pop();
        const ext = fileName.split('.').pop();
        const baseName = fileName.substring(0, fileName.lastIndexOf('.'));
        
        // Format display name: "Explosion-1" -> "Explosion 1"
        let displayName = baseName
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
            
        // Add extension hint if not wav
        if (ext.toLowerCase() !== 'wav') {
            displayName += ` (${ext.toUpperCase()})`;
        }
        
        // Value used by the engine (relative to public root)
        const value = `samples/sound/${fileName}`;
        
        options.push([displayName, value]);
    });
    
    // Sort alphabetically by display name
    options.sort((a, b) => a[0].localeCompare(b[0]));
    
    // Always add the Custom option at the end
    options.push(["%{BKY_SB_SF_CUSTOM_OPTION}", "CUSTOM"]);
    
    return options.length > 1 ? options : [["(No sounds found)", "NONE"], ["%{BKY_SB_SF_CUSTOM_OPTION}", "CUSTOM"]];
}

export function registerBlocks() {
    if (typeof Blockly === 'undefined') {
        console.error('Blockly not available');
        return false;
    }

    Blockly.Blocks['sb_play_sfx'] = {
        init: function () {
            const sfxOptions = getSfxOptions();
            
            this.jsonInit({
                "message0": "%{BKY_SB_PLAY_SFX_MESSAGE}",
                "args0": [
                    {
                        "type": "field_dropdown",
                        "name": "FILENAME",
                        "options": sfxOptions
                    }
                ],
                "message1": "%{BKY_SB_SFX_CUSTOM_URL_LABEL} %1",
                "args1": [
                    {
                        "type": "input_value",
                        "name": "CUSTOM_URL",
                        "check": "String"
                    }
                ],
                "message2": "%{BKY_SB_PLAY_SFX_REVERSE_FIELD}",
                "args2": [
                    {
                        "type": "field_checkbox",
                        "name": "REVERSE",
                        "checked": false
                    }
                ],
                "message3": "%{BKY_SB_PLAY_SFX_SPEED_FIELD}",
                "args3": [
                    {
                        "type": "input_value",
                        "name": "SPEED",
                        "check": "Number"
                    }
                ],
                "message4": "%{BKY_SB_PLAY_SFX_VOLUME_FIELD}",
                "args4": [
                    {
                        "type": "input_value",
                        "name": "VOLUME",
                        "check": "Number"
                    }
                ],
                "previousStatement": null,
                "nextStatement": null,
                "colour": "%{BKY_SFX_HUE}",
                "tooltip": "%{BKY_SB_PLAY_SFX_TOOLTIP}"
            });

            // Force multi-line layout (External Inputs)
            this.setInputsInline(false);

            // Align labels to the right for a clean vertical line
            this.getInput('CUSTOM_URL').setAlign(Blockly.ALIGN_RIGHT);
            this.getInput('SPEED').setAlign(Blockly.ALIGN_RIGHT);
            this.getInput('VOLUME').setAlign(Blockly.ALIGN_RIGHT);

            this.updateShape_();
        },

        mutationToDom: function () {
            var container = Blockly.utils.xml.createElement('mutation');
            var filename = this.getFieldValue('FILENAME');
            container.setAttribute('filename', filename);
            return container;
        },

        domToMutation: function (xmlElement) {
            // Note: Field values are restored after domToMutation, 
            // but we can force an update here if needed.
            this.updateShape_(); 
        },

        updateShape_: function () {
            var filename = this.getFieldValue('FILENAME');
            var customUrlInput = this.getInput('CUSTOM_URL');
            
            if (customUrlInput) {
                // Show URL input only if CUSTOM is selected
                customUrlInput.setVisible(filename === 'CUSTOM');
            }

            // Force a re-render to ensure shadow blocks and sockets are positioned correctly
            if (this.rendered) {
                this.render();
            }
        },

        onchange: function (event) {
            if (event.type === Blockly.Events.BLOCK_CHANGE &&
                event.blockId === this.id &&
                event.name === 'FILENAME') {
                this.updateShape_();
            }
        }
    };
}