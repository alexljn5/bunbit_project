// ============================================================
// DIALOGUE RENDERER
// ============================================================
// Responsible for:
//   - Drawing the dialogue box
//   - Displaying speaker name
//   - Displaying expression (ASCII art from metadata)
//   - Displaying dialogue text
//   - Displaying choices
//
// Does NOT:
//   - Decide next node
//   - Modify flags
//   - Trigger gameplay
// ============================================================

import { loadCharacterSpriteMetadata, parseSpriteSheetMarkdown } from '../loader/sprite-metadata-loader.js';

/**
 * Default dialogue box configuration.
 */
const DEFAULT_CONFIG = {
    containerId: 'bunbit-dialogue-container',
    width: '600px',
    padding: '20px',
    borderColor: '#FC0000',
    backgroundColor: '#0a0000',
    textColor: '#FC0000',
    fontFamily: "'Courier New', monospace",
    fontSize: '16px',
    speakerFontSize: '18px',
    expressionFontSize: '14px',
    choiceFontSize: '14px',
    zIndex: '2147483647',
};

/**
 * Dialogue renderer.
 * Renders dialogue data to the DOM.
 */
export class DialogueRenderer {
    constructor(config = {}) {
        /** @type {object} Renderer configuration. */
        this.config = { ...DEFAULT_CONFIG, ...config };

        /** @type {HTMLElement|null} The dialogue container element. */
        this._container = null;

        /** @type {object|null} Loaded character metadata (expression sprites). */
        this._characterMetadata = null;

        /** @type {string|null} Current character ID being displayed. */
        this._currentCharacterId = null;

        /** @type {boolean} Whether the renderer is currently visible. */
        this._visible = false;
    }

    // ─── Container Management ──────────────────────

    /**
     * Creates the dialogue container in the DOM.
     */
    createContainer() {
        // Remove existing container if present
        this.destroyContainer();

        const container = document.createElement('div');
        container.id = this.config.containerId;
        container.dataset.dialogueRenderer = '1';
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.width = this.config.width;
        container.style.padding = this.config.padding;
        container.style.backgroundColor = this.config.backgroundColor;
        container.style.border = `2px solid ${this.config.borderColor}`;
        container.style.borderRadius = '4px';
        container.style.color = this.config.textColor;
        container.style.fontFamily = this.config.fontFamily;
        container.style.zIndex = this.config.zIndex;
        container.style.boxShadow = '0 4px 20px rgba(255,0,0,0.3)';
        container.style.display = 'none';
        container.style.pointerEvents = 'auto';

        this._container = container;
        document.body.appendChild(container);
    }

    /**
     * Removes the dialogue container from the DOM.
     */
    destroyContainer() {
        if (this._container && this._container.parentNode) {
            this._container.parentNode.removeChild(this._container);
        }
        this._container = null;
        this._visible = false;
    }

    /**
     * Shows the dialogue container.
     */
    show() {
        if (this._container) {
            this._container.style.display = 'block';
            this._visible = true;
        }
    }

    /**
     * Hides the dialogue container.
     */
    hide() {
        if (this._container) {
            this._container.style.display = 'none';
            this._visible = false;
        }
    }

    /**
     * Returns whether the renderer is visible.
     * @returns {boolean}
     */
    get isVisible() {
        return this._visible;
    }

    // ─── Character Metadata ─────────────────────────

    /**
     * Loads character metadata for expression rendering.
     * @param {object} characterDef - Character metadata object.
     * @returns {Promise<void>}
     */
    async loadCharacterMetadata(characterDef) {
        this._characterMetadata = await loadCharacterSpriteMetadata(characterDef);
        this._currentCharacterId = characterDef.id;
    }

    /**
     * Loads character metadata from a raw markdown content string.
     * Useful when the sprite sheet is already fetched.
     * @param {object} characterDef - Character metadata object.
     * @param {string} markdownContent - Raw markdown content of the sprite sheet.
     */
    loadCharacterMetadataFromMarkdown(characterDef, markdownContent) {
        const expressionSprites = parseSpriteSheetMarkdown(markdownContent);
        this._characterMetadata = {
            id: characterDef.id,
            displayName: characterDef.displayName,
            defaultExpression: characterDef.defaultExpression,
            expressions: characterDef.expressions,
            expressionSprites,
        };
        this._currentCharacterId = characterDef.id;
    }

    // ─── Rendering ─────────────────────────────────

    /**
     * Renders a dialogue node.
     * @param {object} node - The dialogue node data.
     * @param {object} [options={}] - Rendering options.
     * @param {object} [options.characterMetadata] - Optional character metadata override.
     */
    renderNode(node, options = {}) {
        if (!this._container) {
            this.createContainer();
        }

        const metadata = options.characterMetadata || this._characterMetadata;

        // Clear container
        this._container.innerHTML = '';

        // Build the dialogue content
        const content = document.createElement('div');
        content.style.padding = '0';

        // Expression display (ASCII art)
        if (node.expression && metadata && metadata.expressionSprites) {
            const expressionSprite = metadata.expressionSprites[node.expression];
            if (expressionSprite) {
                const exprDiv = document.createElement('div');
                exprDiv.style.whiteSpace = 'pre';
                exprDiv.style.fontFamily = 'monospace';
                exprDiv.style.fontSize = this.config.expressionFontSize;
                exprDiv.style.lineHeight = '1';
                exprDiv.style.textAlign = 'center';
                exprDiv.style.marginBottom = '8px';
                exprDiv.style.color = this.config.textColor;
                exprDiv.textContent = expressionSprite;
                content.appendChild(exprDiv);
            }
        }

        // Speaker name
        if (node.speaker) {
            const speakerDiv = document.createElement('div');
            speakerDiv.style.fontSize = this.config.speakerFontSize;
            speakerDiv.style.fontWeight = 'bold';
            speakerDiv.style.marginBottom = '8px';
            speakerDiv.style.textAlign = 'center';
            speakerDiv.textContent = node.speaker;
            content.appendChild(speakerDiv);
        }

        // Dialogue text
        if (node.text) {
            const textDiv = document.createElement('div');
            textDiv.style.fontSize = this.config.fontSize;
            textDiv.style.lineHeight = '1.5';
            textDiv.style.marginBottom = '12px';
            textDiv.style.whiteSpace = 'pre-wrap';
            textDiv.textContent = node.text;
            content.appendChild(textDiv);
        }

        // Choices
        if (node.choices && node.choices.length > 0) {
            const choicesDiv = document.createElement('div');
            choicesDiv.style.marginTop = '8px';

            node.choices.forEach((choice, index) => {
                const choiceBtn = document.createElement('button');
                choiceBtn.textContent = choice.text;
                choiceBtn.dataset.choiceIndex = index;
                choiceBtn.style.cssText = `
                    display: block;
                    width: 100%;
                    margin: 4px 0;
                    padding: 8px 12px;
                    font-family: ${this.config.fontFamily};
                    font-size: ${this.config.choiceFontSize};
                    color: ${this.config.textColor};
                    background: #1a0000;
                    border: 1px solid ${this.config.borderColor};
                    border-radius: 3px;
                    cursor: pointer;
                    text-align: left;
                `;
                choiceBtn.addEventListener('mouseenter', () => {
                    choiceBtn.style.background = this.config.borderColor;
                    choiceBtn.style.color = this.config.backgroundColor;
                });
                choiceBtn.addEventListener('mouseleave', () => {
                    choiceBtn.style.background = '#1a0000';
                    choiceBtn.style.color = this.config.textColor;
                });

                choicesDiv.appendChild(choiceBtn);
            });

            content.appendChild(choicesDiv);
        }

        this._container.appendChild(content);
        this.show();
    }

    /**
     * Renders a continue prompt (for linear dialogue nodes).
     */
    renderContinuePrompt() {
        if (!this._container) return;

        const prompt = document.createElement('div');
        prompt.style.textAlign = 'center';
        prompt.style.marginTop = '8px';
        prompt.style.fontSize = this.config.fontSize;
        prompt.style.opacity = '0.7';
        prompt.style.cursor = 'pointer';
        prompt.dataset.dialogueContinue = '1';
        prompt.textContent = '[Continue]';
        this._container.appendChild(prompt);
    }

    /**
     * Clears the renderer content.
     */
    clear() {
        if (this._container) {
            this._container.innerHTML = '';
        }
    }
}

// Singleton instance for engine-wide use
export const dialogueRenderer = new DialogueRenderer();

export default DialogueRenderer;
