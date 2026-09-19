// Entity Editor Debug Preview
// Debug-only module that creates a canvas overlay for visualising
// game entities. This is a consumer of the actual entity implementations
// — not a second implementation.
//
// The preview canvas is designed so it can later be embedded or
// overlaid onto the actual game rendering.
//
// Architecture:
//   Debug Menu
//     |
//     +--> Entity Editor (this module)
//              |
//              +--> EntityEditor (reusable editor class)
//                       |
//                       +--> JimHate entity (real implementation)
//                       +--> JimHate renderer
//                       +--> JimHate animation/state

import { EntityEditor } from './entityeditor.js';
import { getAllEntityDescriptors } from '../entities/entityregistry.js';
import { themeManager } from '../themes/thememanager.js';
import { GENERIC_ENTITY_CONFIG } from '../entities/generic-entity/GenericEntityConfig.js';

let editor = null;
let previewContainer = null;
let entitySelector = null;
let previewActive = false;

/**
 * Toggle the Entity Editor window.
 */
export function toggleEntityEditor() {
    if (previewActive) {
        closePreview();
    } else {
        openPreview();
    }
}

/**
 * Open the Entity Editor window.
 */
function openPreview() {
    if (previewActive) return;
    previewActive = true;

    // Create the preview container with bunbit- prefixed IDs (STANDARDISATION.md)
    previewContainer = document.createElement('div');
    previewContainer.id = 'bunbit-entity-editor-preview';
    previewContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 2147483651;
        background: var(--bunbit-editor-bg, #0a0000);
        border: 2px solid var(--bunbit-editor-accent, #8b0000);
        border-radius: 8px;
        padding: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        max-width: 95vw;
        max-height: 95vh;
        overflow: auto;
    `;

    // Title bar
    const titleBar = document.createElement('div');
    titleBar.id = 'bunbit-entity-editor-preview-title';
    titleBar.style.cssText = `
        color: var(--bunbit-editor-fg, #ff0000);
        font: bold 14px monospace;
        width: 100%;
        text-align: center;
        cursor: move;
    `;
    titleBar.textContent = 'ENTITY EDITOR';
    previewContainer.appendChild(titleBar);

    // Entity selector dropdown
    entitySelector = document.createElement('select');
    entitySelector.id = 'bunbit-entity-selector';
    entitySelector.style.cssText = `
        margin: 4px 0;
        padding: 4px 8px;
        font: bold 11px monospace;
        background: var(--bunbit-editor-button-bg, #1a0000);
        color: var(--bunbit-editor-fg, #ff0000);
        border: 1px solid var(--bunbit-editor-accent, #8b0000);
        border-radius: 4px;
        cursor: pointer;
    `;

    const entities = getAllEntityDescriptors();
    entities.forEach(entity => {
        const option = document.createElement('option');
        option.value = entity.id;
        option.textContent = entity.label;
        entitySelector.appendChild(option);
    });

    entitySelector.addEventListener('change', () => {
        switchEntity(entitySelector.value);
    });

    previewContainer.appendChild(entitySelector);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.id = 'bunbit-entity-editor-preview-close';
    closeBtn.className = 'bunbit-editor-button';
    closeBtn.textContent = 'X';
    closeBtn.style.cssText = `
        position: absolute;
        top: 4px;
        right: 8px;
        background: var(--bunbit-editor-button-bg, #1a0000);
        color: var(--bunbit-editor-fg, #ff0000);
        border: 1px solid var(--bunbit-editor-accent, #8b0000);
        cursor: pointer;
        font: bold 12px monospace;
    `;
    closeBtn.addEventListener('click', closePreview);
    previewContainer.appendChild(closeBtn);

    document.body.appendChild(previewContainer);

    // Create the EntityEditor with the container and theme manager
    // Defaults to Generic Entity (placeholder) so the placeholder system
    // is visible immediately; select Jim Hate from the dropdown to preview it
    editor = new EntityEditor({
        container: previewContainer,
        themeManager: themeManager,
        entityType: 'generic-entity',
        entityConfig: GENERIC_ENTITY_CONFIG,
    });

    // Initialise the editor (creates canvas, entity, controls, starts loop)
    editor.init();

    // Apply theme immediately
    _applyTheme();
}

/**
 * Switch the editor to a different entity type.
 */
function switchEntity(entityType) {
    if (!editor) return;

    // Get the entity descriptor for config
    const entities = getAllEntityDescriptors();
    const entityDef = entities.find(e => e.id === entityType);
    if (!entityDef) return;

    // Switch the editor to the selected entity
    editor.switchEntity(entityType, entityDef.config);
}

/**
 * Apply theme styling to the preview container.
 */
function _applyTheme() {
    if (!previewContainer) return;

    const theme = themeManager.getCurrentTheme();
    if (!theme) return;

    previewContainer.style.setProperty('--bunbit-editor-bg', theme.background || '#0a0000');
    previewContainer.style.setProperty('--bunbit-editor-fg', theme.text || '#ff0000');
    previewContainer.style.setProperty('--bunbit-editor-accent', theme.border || '#8b0000');
    previewContainer.style.setProperty('--bunbit-editor-button-bg', theme.buttonBg || '#1a0000');
}

/**
 * Close the Entity Editor window.
 */
function closePreview() {
    if (!previewActive) return;
    previewActive = false;

    if (editor) {
        editor.destroy();
        editor = null;
    }

    if (previewContainer) {
        previewContainer.remove();
        previewContainer = null;
    }

    entitySelector = null;
}
