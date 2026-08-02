// ============================================================
// DIALOGUE THEME
// ============================================================
// Dialogue-specific theme object.
// Separate from the global dashboard theme.
// Dialogue uses its own component styling layer.
//
// Artists replace theme assets, not logic.
// The renderer reads from this theme object for all visuals.
// ============================================================

/**
 * Default placeholder dialogue theme.
 * Dark fantasy terminal style — a conversation window,
 * not a menu panel.
 */
export const DialogueTheme = Object.freeze({
    // ─── Textbox ──────────────────────────────────
    textbox: {
        backgroundColor: '#0a0a0a',
        borderColor: '#555555',
        borderWidth: '1px',
        borderRadius: '2px',
        textColor: '#cccccc',
        fontFamily: "'Courier New', monospace",
        padding: '16px',
        maxWidth: '90vw',
        maxHeight: '60vh',
        overflow: 'auto',
        boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
        zIndex: '2147483647',
    },

    // ─── Portrait Frame ───────────────────────────
    portrait: {
        frameBorderColor: '#444444',
        frameBorderWidth: '1px',
        framePadding: '4px',
        frameMargin: '0 0 8px 0',
        maxWidth: '120px',
        maxHeight: '120px',
        fontSize: '12px',
        lineHeight: '1.2',
        textAlign: 'center',
        color: '#aaaaaa',
    },

    // ─── Speaker Name ─────────────────────────────
    speakerName: {
        fontSize: '16px',
        fontWeight: 'bold',
        marginBottom: '8px',
        color: '#dddddd',
        fontFamily: "'Courier New', monospace",
    },

    // ─── Dialogue Text ────────────────────────────
    dialogueText: {
        fontSize: '14px',
        lineHeight: '1.6',
        marginBottom: '12px',
        color: '#cccccc',
        fontFamily: "'Courier New', monospace",
        whiteSpace: 'pre-wrap',
        maxWidth: '80%',
    },

    // ─── Choice Buttons ───────────────────────────
    choice: {
        display: 'block',
        width: '100%',
        margin: '4px 0',
        padding: '8px 12px',
        fontSize: '13px',
        color: '#cccccc',
        backgroundColor: '#1a1a1a',
        borderColor: '#555555',
        borderWidth: '1px',
        borderRadius: '2px',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: "'Courier New', monospace",
    },

    choiceHover: {
        backgroundColor: '#333333',
        color: '#ffffff',
        borderColor: '#777777',
    },

    // ─── Continue Prompt ──────────────────────────
    continuePrompt: {
        textAlign: 'center',
        marginTop: '8px',
        fontSize: '13px',
        opacity: '0.5',
        cursor: 'pointer',
        color: '#aaaaaa',
        fontFamily: "'Courier New', monospace",
    },

    // ─── Animations ───────────────────────────────
    animations: {
        fadeInDuration: '200ms',
        fadeOutDuration: '200ms',
        slideInDistance: '10px',
    },

    // ─── Typography ───────────────────────────────
    typography: {
        baseFont: "'Courier New', monospace",
        headingFont: "'Courier New', monospace",
        fontSizeSmall: '12px',
        fontSizeMedium: '14px',
        fontSizeLarge: '16px',
        fontSizeXLarge: '18px',
    },
});

/**
 * Speaker alignment configuration.
 * The renderer uses this to determine left/right positioning.
 * Can be overridden per-character in character JSON via uiPosition.
 */
export const SpeakerAlignment = Object.freeze({
    LEFT: 'left',
    RIGHT: 'right',
    CENTER: 'center',
});

/**
 * Default speaker alignment map.
 * Maps character IDs to their default alignment.
 * Can be overridden by character JSON uiPosition field.
 */
export const DefaultSpeakerAlignments = Object.freeze({
    // Characters not listed here default to LEFT alignment
});

export default DialogueTheme;
