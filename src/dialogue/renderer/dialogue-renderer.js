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
//
// Uses DialogueTheme for all styling.
// Speaker layout is data-driven via character uiPosition.
// ============================================================

import { DialogueTheme, SpeakerAlignment } from '../theme/dialogue-theme.js';
import { loadCharacterSpriteMetadata, parseSpriteSheetMarkdown } from '../loader/sprite-metadata-loader.js';

/**
 * Dialogue renderer component.
 * Renders dialogue data to the DOM using the DialogueTheme layer.
 */
export class DialogueRenderer {
    /**
     * @param {object} [config={}] - Renderer configuration overrides.
     */
    constructor(config = {}) {
        /** @type {object} Merged renderer configuration. */
        this.config = { ...DialogueTheme, ...config };

        /** @type {HTMLElement|null} The dialogue container element. */
        this._container = null;

        /** @type {object<string, object>} Loaded character metadata keyed by character ID. */
        this._characterMetadata = {};

        /** @type {string|null} Current character ID being displayed. */
        this._currentCharacterId = null;

        /** @type {boolean} Whether the renderer is currently visible. */
        this._visible = false;

        /** @type {function|null} Callback for choice clicks. */
        this._onChoice = null;

        /** @type {function|null} Callback for continue clicks. */
        this._onContinue = null;

        /** @type {object} Cinematic state for intro sequence. */
        this._cinematicState = {
            introActive: false,
            facesVisible: true,
            namesVisible: true,
            playerRecognized: false,
        };
    }

    // ─── Container Management ──────────────────────

    /**
     * Creates the dialogue container in the DOM.
     * Uses theme values for all styling.
     */
    createContainer() {
        this.destroyContainer();

        const theme = this.config;
        const container = document.createElement('div');
        container.id = 'bunbit-dialogue-container';
        container.dataset.dialogueRenderer = '1';

        // Apply textbox theme styles
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.left = '0';
        container.style.right = '0';
        container.style.margin = '0 auto';
        container.style.width = '90vw';
        container.style.maxWidth = '900px';
        container.style.padding = theme.textbox.padding;
        container.style.backgroundColor = theme.textbox.backgroundColor;
        container.style.border = `${theme.textbox.borderWidth} solid ${theme.textbox.borderColor}`;
        container.style.borderRadius = theme.textbox.borderRadius;
        container.style.color = theme.textbox.textColor;
        container.style.fontFamily = theme.textbox.fontFamily;
        container.style.zIndex = theme.textbox.zIndex;
        container.style.boxShadow = theme.textbox.boxShadow;
        container.style.display = 'none';
        container.style.pointerEvents = 'auto';
        container.style.boxSizing = 'border-box';

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

    // ─── Cinematic State ──────────────────────────

    /**
     * Sets the cinematic state for intro sequences.
     * When facesVisible is false, character portraits are hidden.
     * @param {object} state - Cinematic state object.
     * @param {boolean} [state.facesVisible=true] - Whether character faces should be rendered.
     * @param {boolean} [state.namesVisible=true] - Whether speaker names should be rendered.
     * @param {boolean} [state.introActive=false] - Whether the intro cinematic is active.
     * @param {boolean} [state.playerRecognized=false] - Whether the player has been recognized.
     */
    setCinematicState(state) {
        if (state.facesVisible !== undefined) {
            this._cinematicState.facesVisible = state.facesVisible;
        }
        if (state.namesVisible !== undefined) {
            this._cinematicState.namesVisible = state.namesVisible;
        }
        if (state.introActive !== undefined) {
            this._cinematicState.introActive = state.introActive;
        }
        if (state.playerRecognized !== undefined) {
            this._cinematicState.playerRecognized = state.playerRecognized;
        }

        // Apply CSS class to container for face visibility
        if (this._container) {
            if (state.facesVisible === false) {
                this._container.classList.add('cinematic-hide-faces');
                this._container.classList.remove('cinematic-show-faces');
            } else {
                this._container.classList.remove('cinematic-hide-faces');
                this._container.classList.add('cinematic-show-faces');
            }
        }
    }

    // ─── Character Metadata ─────────────────────────

    /**
     * Loads character metadata for expression rendering.
     * Stores metadata per character ID so multiple characters can be rendered.
     * @param {object} characterDef - Character metadata object.
     * @returns {Promise<void>}
     */
    async loadCharacterMetadata(characterDef) {
        const resolved = await loadCharacterSpriteMetadata(characterDef);
        this._characterMetadata[resolved.id] = resolved;
        this._currentCharacterId = resolved.id;
    }

    /**
     * Loads character metadata from a raw markdown content string.
     * Useful when the sprite sheet is already fetched.
     * @param {object} characterDef - Character metadata object.
     * @param {string} markdownContent - Raw markdown content of the sprite sheet.
     */
    loadCharacterMetadataFromMarkdown(characterDef, markdownContent) {
        const expressionSprites = parseSpriteSheetMarkdown(markdownContent);
        this._characterMetadata[characterDef.id] = {
            id: characterDef.id,
            displayName: characterDef.displayName,
            defaultExpression: characterDef.defaultExpression,
            expressions: characterDef.expressions,
            expressionSprites,
            uiPosition: characterDef.uiPosition,
        };
        this._currentCharacterId = characterDef.id;
    }

    /**
     * Returns the alignment for a speaker based on character metadata.
     * Falls back to LEFT if no uiPosition is specified.
     * @param {object} node - The dialogue node.
     * @returns {string} SpeakerAlignment value.
     */
    _getSpeakerAlignment(node) {
        if (!node.speaker) return SpeakerAlignment.LEFT;

        const metadata = this._characterMetadata[node.speaker];
        if (metadata && metadata.uiPosition) {
            return metadata.uiPosition;
        }

        // Fallback to default alignments from theme
        const defaults = this.config.defaultSpeakerAlignments || {};
        return defaults[node.speaker] || SpeakerAlignment.LEFT;
    }

    /**
     * Returns the display name for a speaker.
     * Uses the character metadata displayName if available,
     * otherwise falls back to the speaker ID.
     * @param {string} speakerId - The speaker character ID.
     * @returns {string} The display name.
     */
    _getSpeakerDisplayName(speakerId) {
        if (!speakerId) return speakerId;
        const metadata = this._characterMetadata[speakerId];
        if (metadata && metadata.displayName) {
            return metadata.displayName;
        }
        return speakerId;
    }

    // ─── Component Builders ─────────────────────────

    /**
     * Creates a portrait container element for a character's expression.
     * @param {object} node - The dialogue node.
     * @param {object} metadata - Character metadata with expression sprites.
     * @returns {HTMLElement|null}
     */
    _createPortrait(node, metadata) {
        // Hide faces during cinematic intro until player is recognized
        if (!this._cinematicState.facesVisible) {
            return null;
        }

        if (!node.expression || !metadata || !metadata.expressionSprites) {
            return null;
        }

        const expressionSprite = metadata.expressionSprites[node.expression]
            || metadata.expressionSprites['default'];

        if (!expressionSprite) return null;

        const theme = this.config.portrait;
        const portrait = document.createElement('div');
        portrait.dataset.dialoguePortrait = '1';
        portrait.style.padding = theme.framePadding;
        portrait.style.margin = theme.frameMargin;
        portrait.style.maxWidth = theme.maxWidth;
        portrait.style.maxHeight = theme.maxHeight;
        portrait.style.fontSize = theme.fontSize;
        portrait.style.lineHeight = theme.lineHeight;
        portrait.style.textAlign = theme.textAlign;
        portrait.style.color = theme.color;
        portrait.style.whiteSpace = 'pre';
        portrait.style.fontFamily = 'monospace';
        portrait.textContent = expressionSprite;

        return portrait;
    }

    /**
     * Creates a speaker name element.
     * @param {object} node - The dialogue node.
     * @returns {HTMLElement|null}
     */
    _createSpeakerName(node) {
        if (!node.speaker) return null;

        // Hide speaker names during the cinematic intro until names are revealed.
        // The player does not know the characters' names before recognition.
        if (!this._cinematicState.namesVisible) return null;

        const theme = this.config.speakerName;
        const speakerDiv = document.createElement('div');
        speakerDiv.dataset.dialogueSpeaker = '1';
        speakerDiv.style.fontSize = theme.fontSize;
        speakerDiv.style.fontWeight = theme.fontWeight;
        speakerDiv.style.marginBottom = theme.marginBottom;
        speakerDiv.style.color = theme.color;
        speakerDiv.style.fontFamily = theme.fontFamily;
        speakerDiv.textContent = this._getSpeakerDisplayName(node.speaker);

        return speakerDiv;
    }

    /**
     * Creates a dialogue text element.
     * @param {object} node - The dialogue node.
     * @returns {HTMLElement|null}
     */
    _createDialogueText(node) {
        if (!node.text) return null;

        const theme = this.config.dialogueText;
        const textDiv = document.createElement('div');
        textDiv.dataset.dialogueText = '1';
        textDiv.style.fontSize = theme.fontSize;
        textDiv.style.lineHeight = theme.lineHeight;
        textDiv.style.marginBottom = theme.marginBottom;
        textDiv.style.color = theme.color;
        textDiv.style.fontFamily = theme.fontFamily;
        textDiv.style.whiteSpace = theme.whiteSpace;
        textDiv.style.maxWidth = theme.maxWidth;
        textDiv.textContent = node.text;

        return textDiv;
    }

    /**
     * Creates a choice container with choice buttons.
     * @param {object} node - The dialogue node.
     * @param {function} onChoice - Callback when a choice is clicked.
     * @returns {HTMLElement|null}
     */
    _createChoices(node, onChoice) {
        if (!node.choices || node.choices.length === 0) return null;

        const theme = this.config.choice;
        const hoverTheme = this.config.choiceHover;
        const choicesDiv = document.createElement('div');
        choicesDiv.dataset.dialogueChoices = '1';
        choicesDiv.style.marginTop = '8px';
        choicesDiv.style.width = '100%';

        node.choices.forEach((choice, index) => {
            const choiceBtn = document.createElement('button');
            choiceBtn.textContent = choice.text;
            choiceBtn.dataset.choiceIndex = index;
            choiceBtn.dataset.choiceNext = choice.next || '';

            // Apply theme styles
            choiceBtn.style.display = theme.display;
            choiceBtn.style.width = theme.width;
            choiceBtn.style.margin = theme.margin;
            choiceBtn.style.padding = theme.padding;
            choiceBtn.style.fontSize = theme.fontSize;
            choiceBtn.style.color = theme.color;
            choiceBtn.style.backgroundColor = theme.backgroundColor;
            choiceBtn.style.border = `${theme.borderWidth} solid ${theme.borderColor}`;
            choiceBtn.style.borderRadius = theme.borderRadius;
            choiceBtn.style.cursor = theme.cursor;
            choiceBtn.style.textAlign = theme.textAlign;
            choiceBtn.style.fontFamily = theme.fontFamily;

            // Hover effects from theme
            choiceBtn.addEventListener('mouseenter', () => {
                choiceBtn.style.backgroundColor = hoverTheme.backgroundColor;
                choiceBtn.style.color = hoverTheme.color;
                choiceBtn.style.borderColor = hoverTheme.borderColor;
            });
            choiceBtn.addEventListener('mouseleave', () => {
                choiceBtn.style.backgroundColor = theme.backgroundColor;
                choiceBtn.style.color = theme.color;
                choiceBtn.style.borderColor = theme.borderColor;
            });

            // Click handler
            choiceBtn.addEventListener('click', () => {
                if (typeof onChoice === 'function') {
                    onChoice(choice);
                }
            });

            choicesDiv.appendChild(choiceBtn);
        });

        return choicesDiv;
    }

    /**
     * Creates a continue prompt element.
     * @param {function} onContinue - Callback when continue is clicked.
     * @returns {HTMLElement|null}
     */
    _createContinuePrompt(onContinue) {
        const theme = this.config.continuePrompt;
        const prompt = document.createElement('div');
        prompt.dataset.dialogueContinue = '1';
        prompt.style.textAlign = theme.textAlign;
        prompt.style.marginTop = theme.marginTop;
        prompt.style.fontSize = theme.fontSize;
        prompt.style.opacity = theme.opacity;
        prompt.style.cursor = theme.cursor;
        prompt.style.color = theme.color;
        prompt.style.fontFamily = theme.fontFamily;
        prompt.textContent = '[Continue]';

        prompt.addEventListener('click', () => {
            if (typeof onContinue === 'function') {
                onContinue();
            }
        });

        return prompt;
    }

    // ─── Main Render ────────────────────────────────

    /**
     * Renders a dialogue node.
     * Uses theme values for all styling.
     * Speaker layout is determined by character metadata uiPosition field.
     *
     * @param {object} node - The dialogue node data.
     * @param {object} [options={}] - Rendering options.
     * @param {object} [options.characterMetadata] - Optional character metadata override.
     * @param {function} [options.onChoice] - Callback when a choice is clicked.
     * @param {function} [options.onContinue] - Callback when continue is clicked.
     */
    renderNode(node, options = {}) {
        if (!this._container) {
            this.createContainer();
        }

        // Look up metadata by speaker ID, or use override
        let metadata = null;
        if (options.characterMetadata) {
            metadata = options.characterMetadata;
        } else if (node.speaker && this._characterMetadata[node.speaker]) {
            metadata = this._characterMetadata[node.speaker];
        } else if (this._currentCharacterId && this._characterMetadata[this._currentCharacterId]) {
            metadata = this._characterMetadata[this._currentCharacterId];
        }

        // Clear container
        this._container.innerHTML = '';

        // Determine speaker alignment from data (not hardcoded)
        const alignment = this._getSpeakerAlignment(node);

        // Build the dialogue content
        const content = document.createElement('div');
        content.style.padding = '0';
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.width = '100%';

        // Apply alignment from data (Patches left, Vesper right, etc.)
        if (alignment === SpeakerAlignment.RIGHT) {
            content.style.alignItems = 'flex-end';
        } else if (alignment === SpeakerAlignment.CENTER) {
            content.style.alignItems = 'center';
        } else {
            content.style.alignItems = 'flex-start';
        }

        // Component: Portrait (expression ASCII art)
        const portrait = this._createPortrait(node, metadata);
        if (portrait) {
            content.appendChild(portrait);
        }

        // Component: Speaker name
        const speakerName = this._createSpeakerName(node);
        if (speakerName) {
            content.appendChild(speakerName);
        }

        // Component: Dialogue text
        const dialogueText = this._createDialogueText(node);
        if (dialogueText) {
            content.appendChild(dialogueText);
        }

        // Component: Choices
        const choices = this._createChoices(node, options.onChoice || null);
        if (choices) {
            content.appendChild(choices);
        }

        this._container.appendChild(content);
        this.show();
    }

    /**
     * Renders a continue prompt (for linear dialogue nodes).
     * @param {function} [onContinue] - Callback when continue is clicked.
     */
    renderContinuePrompt(onContinue) {
        if (!this._container) return;

        const prompt = this._createContinuePrompt(onContinue || null);
        if (prompt) {
            this._container.appendChild(prompt);
        }
    }

    /**
     * Clears the renderer content.
     */
    clear() {
        if (this._container) {
            this._container.innerHTML = '';
        }
    }

    /**
     * Sets the choice click callback.
     * @param {function} callback - Function called with the choice object.
     */
    setOnChoice(callback) {
        this._onChoice = callback;
    }

    /**
     * Sets the continue click callback.
     * @param {function} callback - Function called when continue is clicked.
     */
    setOnContinue(callback) {
        this._onContinue = callback;
    }
}

// Singleton instance for engine-wide use
export const dialogueRenderer = new DialogueRenderer();

export default DialogueRenderer;
