// js/core/blocklyUtils.js
import * as Blockly from 'blockly';

/**
 * A custom Dropdown field that accepts values even if they are not in the options list.
 * Useful for loading projects with saved values that might not be currently available
 * in the dynamic options (e.g. missing instruments).
 */
export class FieldDropdownLenient extends Blockly.FieldDropdown {
    constructor(menuGenerator, validator) {
        super(menuGenerator, validator);
    }
    
    static fromJson(options) {
        if (!options) {
            throw new Error('options parameter is missing.');
        }
        return new FieldDropdownLenient(options['options'], undefined, options);
    }

    doClassValidation_(newValue) {
        if (typeof newValue !== 'string') return null;
        return newValue;
    }
    getOptions(opt_useCache) {
        const options = super.getOptions(opt_useCache);
        const val = this.getValue();
        if (val && typeof val === 'string') {
            const exists = options.some(opt => opt[1] === val);
            if (!exists) options.push([val, val]);
        }
        return options;
    }
}

/**
 * Shared helper to find all instrument names defined in any workspace.
 * Scans for 'sb_instrument_container' blocks and extracts their names.
 * @param {boolean} includeMaster - Whether to include "Master" in the options.
 * @returns {Array<[string, string]>} Array of [label, value] pairs for Dropdown.
 */
export function getInstrumentOptions(includeMaster = false) {
    const options = includeMaster ? [['Master', 'Master']] : [];
    
    // Safety check: Blockly might not be fully initialized when this is first called during loading
    if (!Blockly.getMainWorkspace) return options;

    let ws = Blockly.getMainWorkspace();
    if (ws) {
        const foundNames = [];
        // The second argument 'false' means don't sort blocks by position, which is faster
        const blocks = ws.getBlocksByType('sb_instrument_container', false);
        
        blocks.forEach(block => {
            const name = block.getFieldValue('NAME');
            if (name && !foundNames.includes(name)) {
                foundNames.push(name);
            }
        });
        
        foundNames.sort().forEach(name => {
            options.push([name, name]);
        });
    }
    
    // Final fallback to ensure the dropdown doesn't crash Blockly with empty options
    if (options.length === 0) {
        options.push(['(No Instruments)', 'NONE']);
    }
    return options;
}
