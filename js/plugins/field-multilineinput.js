/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Multiline text field plugin refactored for ESM/Browser.
 */

// Directly use the global or passed Blockly object
const Blockly = window.Blockly;

class FieldMultilineInput extends Blockly.FieldTextInput {
    constructor(value, validator, config) {
        super(Blockly.Field.SKIP_SETUP);
        this.textGroup = null;
        this.maxLines_ = Infinity;
        this.isOverflowedY_ = false;
        if (value !== Blockly.Field.SKIP_SETUP) {
            if (config) this.configure_(config);
            this.setValue(value);
            if (validator) this.setValidator(validator);
        }
    }

    configure_(config) {
        super.configure_(config);
        if (config.maxLines) this.setMaxLines(config.maxLines);
    }

    toXml(element) {
        element.textContent = this.getValue().replace(/\n/g, '&#10;');
        return element;
    }

    fromXml(element) {
        this.setValue(element.textContent.replace(/&#10;/g, '\n'));
    }

    saveState() {
        return this.getValue();
    }

    loadState(state) {
        this.setValue(state);
    }

    initView() {
        this.createBorderRect_();
        this.textGroup = Blockly.utils.dom.createSvgElement(
            Blockly.utils.Svg.G,
            { 'class': 'blocklyEditableField' },
            this.fieldGroup_
        );
    }

    getDisplayText_() {
        const block = this.getSourceBlock();
        if (!block) throw new Error('Field not attached to block.');
        let text = this.getText();
        if (!text) return Blockly.Field.NBSP;
        const lines = text.split('\n');
        text = '';
        const numLines = this.isOverflowedY_ ? this.maxLines_ : lines.length;
        for (let i = 0; i < numLines; i++) {
            let line = lines[i];
            if (line.length > this.maxDisplayLength) {
                line = line.substring(0, this.maxDisplayLength - 4) + '...';
            } else if (this.isOverflowedY_ && i === numLines - 1) {
                line = line.substring(0, line.length - 3) + '...';
            }
            line = line.replace(/\s/g, Blockly.Field.NBSP);
            text += line;
            if (i !== numLines - 1) text += '\n';
        }
        if (block.RTL) text += '\u200F';
        return text;
    }

    doValueUpdate_(newValue) {
        super.doValueUpdate_(newValue);
        if (this.value_ !== null) {
            this.isOverflowedY_ = this.value_.split('\n').length > this.maxLines_;
        }
    }

    render_() {
        const block = this.getSourceBlock();
        if (!block) throw new Error('Field not attached to block.');
        let child;
        while ((child = this.textGroup.firstChild)) {
            this.textGroup.removeChild(child);
        }
        const constants = this.getConstants();
        if (!constants) throw Error('Constants not found');
        const lines = this.getDisplayText_().split('\n');
        let y = 0;
        for (let i = 0; i < lines.length; i++) {
            const lineHeight = constants.FIELD_TEXT_HEIGHT + constants.FIELD_BORDER_RECT_Y_PADDING;
            Blockly.utils.dom.createSvgElement(
                Blockly.utils.Svg.TEXT,
                {
                    'class': 'blocklyText blocklyMultilineText',
                    'x': constants.FIELD_BORDER_RECT_X_PADDING,
                    'y': y + constants.FIELD_BORDER_RECT_Y_PADDING,
                    'dy': constants.FIELD_TEXT_BASELINE
                },
                this.textGroup
            ).appendChild(document.createTextNode(lines[i]));
            y += lineHeight;
        }
        if (this.isBeingEdited_) {
            const htmlInput = this.htmlInput_;
            if (this.isOverflowedY_) {
                Blockly.utils.dom.addClass(htmlInput, 'blocklyHtmlTextAreaInputOverflowedY');
            } else {
                Blockly.utils.dom.removeClass(htmlInput, 'blocklyHtmlTextAreaInputOverflowedY');
            }
        }
        this.updateSize_();
        if (this.isBeingEdited_) {
            if (block.RTL) {
                setTimeout(this.resizeEditor_.bind(this), 0);
            } else {
                this.resizeEditor_();
            }
            const htmlInput = this.htmlInput_;
            if (this.isTextValid_) {
                Blockly.utils.dom.removeClass(htmlInput, 'blocklyInvalidInput');
                Blockly.utils.aria.setState(htmlInput, Blockly.utils.aria.State.INVALID, false);
            } else {
                Blockly.utils.dom.addClass(htmlInput, 'blocklyInvalidInput');
                Blockly.utils.aria.setState(htmlInput, Blockly.utils.aria.State.INVALID, true);
            }
        }
    }

    updateSize_() {
        const constants = this.getConstants();
        if (!constants) throw Error('Constants not found');
        const nodes = this.textGroup.childNodes;
        const fontSize = constants.FIELD_TEXT_FONTSIZE;
        const fontWeight = constants.FIELD_TEXT_FONTWEIGHT;
        const fontFamily = constants.FIELD_TEXT_FONTFAMILY;
        let width = 0;
        let height = 0;
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const nodeWidth = Blockly.utils.dom.getFastTextWidth(node, fontSize, fontWeight, fontFamily);
            if (nodeWidth > width) width = nodeWidth;
            height += constants.FIELD_TEXT_HEIGHT + (i > 0 ? constants.FIELD_BORDER_RECT_Y_PADDING : 0);
        }
        if (this.isBeingEdited_) {
            const lines = String(this.value_).split('\n');
            const dummyText = Blockly.utils.dom.createSvgElement(Blockly.utils.Svg.TEXT, { 'class': 'blocklyText blocklyMultilineText' });
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i];
                if (line.length > this.maxDisplayLength) line = line.substring(0, this.maxDisplayLength);
                dummyText.textContent = line;
                const lineWidth = Blockly.utils.dom.getFastTextWidth(dummyText, fontSize, fontWeight, fontFamily);
                if (lineWidth > width) width = lineWidth;
            }
            const htmlInput = this.htmlInput_;
            width += htmlInput.offsetWidth - htmlInput.clientWidth;
        }
        if (this.borderRect_) {
            height += 2 * constants.FIELD_BORDER_RECT_Y_PADDING;
            width += 2 * constants.FIELD_BORDER_RECT_X_PADDING + 1;
            this.borderRect_.setAttribute('width', `${width}`);
            this.borderRect_.setAttribute('height', `${height}`);
        }
        this.size_.width = width;
        this.size_.height = height;
        this.positionBorderRect_();
    }

    showEditor_(e, quiet) {
        super.showEditor_(e, quiet);
        this.forceRerender();
    }

    widgetCreate_() {
        const div = Blockly.WidgetDiv.getDiv();
        const scale = this.workspace_.getScale();
        const constants = this.getConstants();
        if (!constants) throw Error('Constants not found');
        const htmlInput = document.createElement('textarea');
        htmlInput.className = 'blocklyHtmlInput blocklyHtmlTextAreaInput';
        htmlInput.setAttribute('spellcheck', String(this.spellcheck_));
        const fontSize = constants.FIELD_TEXT_FONTSIZE * scale + 'pt';
        div.style.fontSize = fontSize;
        htmlInput.style.fontSize = fontSize;
        const borderRadius = Blockly.FieldTextInput.BORDERRADIUS * scale + 'px';
        htmlInput.style.borderRadius = borderRadius;
        const paddingX = constants.FIELD_BORDER_RECT_X_PADDING * scale;
        const paddingY = constants.FIELD_BORDER_RECT_Y_PADDING * scale / 2;
        htmlInput.style.padding = `${paddingY}px ${paddingX}px ${paddingY}px ${paddingX}px`;
        const lineHeight = constants.FIELD_TEXT_HEIGHT + constants.FIELD_BORDER_RECT_Y_PADDING;
        htmlInput.style.lineHeight = lineHeight * scale + 'px';
        div.appendChild(htmlInput);
        htmlInput.value = htmlInput.defaultValue = this.getEditorText_(this.value_);
        htmlInput.setAttribute('data-untyped-default-value', String(this.value_));
        htmlInput.setAttribute('data-old-value', '');
        if (Blockly.utils.userAgent.GECKO) {
            setTimeout(this.resizeEditor_.bind(this), 0);
        } else {
            this.resizeEditor_();
        }
        this.bindInputEvents_(htmlInput);
        return htmlInput;
    }

    setMaxLines(maxLines) {
        if (typeof maxLines === 'number' && maxLines > 0 && maxLines !== this.maxLines_) {
            this.maxLines_ = maxLines;
            this.forceRerender();
        }
    }

    getMaxLines() {
        return this.maxLines_;
    }

    onHtmlInputKeyDown_(e) {
        if (e.key !== 'Enter') {
            super.onHtmlInputKeyDown_(e);
        }
    }

    static fromJson(config) {
        return new this(Blockly.utils.parsing.replaceMessageReferences(config.text), undefined, config);
    }
}

// Register the field
Blockly.fieldRegistry.register('field_multilinetext', FieldMultilineInput);

// CSS styles
Blockly.Css.register(`
.blocklyHtmlTextAreaInput {
  font-family: monospace;
  resize: none;
  overflow: hidden;
  height: 100%;
  text-align: left;
}

.blocklyHtmlTextAreaInputOverflowedY {
  overflow-y: scroll;
}
`);

// Register blocks and generators
const BLOCK_NAME = 'text_multiline';
Blockly.common.defineBlocksWithJsonArray([{
    "type": BLOCK_NAME,
    "message0": "%1 %2",
    "args0": [
        {
            "type": "field_image",
            "src": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAARCAYAAADpPU2iAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAdhgAAHYYBXaITgQAAABh0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMS42/U4J6AAAAP1JREFUOE+Vks0KQUEYhjmRIja4ABtZ2dm5A3t3Ia6AUm7CylYuQRaUhZSlLZJiQbFAyRnPN33y01HOW08z8873zpwzM4F3GWOCruvGIE4/rLaV+Nq1hVGMBqzhqlxgCys4wJA65xnogMHsQ5lujnYHTejBBCK2mE4abjCgMGhNxHgDFWjDSG07kdfVa2pZMf4ZyMAdWmpZMfYOsLiDMYMjlMB+K613QISRhTnITnsYg5yUd0DETmEoMlkFOeIT/A58iyK5E18BuTBfgYXfwNJv4P9/oEBerLylOnRhygmGdPpTTBZAPkde61lbQe4moWUvYUZYLfUNftIY4zwA5X2Z9AYnQrEAAAAASUVORK5CYII=",
            "width": 12,
            "height": 17,
            "alt": "¶"
        },
        {
            "type": "field_multilinetext",
            "name": "TEXT",
            "text": ""
        }
    ],
    "output": "String",
    "style": "text_blocks",
    "helpUrl": "%{BKY_TEXT_TEXT_HELPURL}",
    "tooltip": "%{BKY_TEXT_TEXT_TOOLTIP}",
    "extensions": ["parent_tooltip_when_inline"]
}]);

// Generator logic
const G = window.javascriptGenerator;
if (G) {
    G.forBlock[BLOCK_NAME] = function(block, generator) {
        const value = generator.multiline_quote_(block.getFieldValue('TEXT'));
        const order = value.indexOf('+') !== -1 ? G.Order.ADDITION : G.Order.ATOMIC;
        return [value, order];
    };
}

// Expose to global scope for blocklyManager.js access
window.FieldMultilineInput = FieldMultilineInput;
export { FieldMultilineInput };
