// Canvas scaling control panel - detached floating window for width/height scale sliders
import { SCALE_X, SCALE_Y } from '../../globals.js';
import { themeManager } from '../../themes/thememanager.js';

let scalingPanel = null;
let isScalingPanelVisible = false;

// Lazy getter for canvas element
function getCanvas() {
    return document.getElementById('mainGameRender') || null;
}

export function initPositionPanel() {
    console.log('[ScalingPanel] Initializing...');
    if (scalingPanel) {
        console.log('[ScalingPanel] Already initialized, skipping');
        return;
    }

    // Get theme colors dynamically
    const theme = themeManager.getCurrentTheme();
    const DEFAULT_BORDER = theme.border || '#FC0000';
    const DEFAULT_BACKGROUND = theme.background || '#0a0000';
    const DEFAULT_TEXT = theme.text || '#FC0000';
    const DEFAULT_BUTTON_BG = theme.buttonBg || '#1a0000';

    console.log('[ScalingPanel] Using theme colors:', { DEFAULT_BORDER, DEFAULT_BACKGROUND, DEFAULT_TEXT, DEFAULT_BUTTON_BG });

    // Create panel (use fixed positioning, not absolute)
    scalingPanel = document.createElement('div');
    scalingPanel.id = 'scaling-panel';
    scalingPanel.style.position = 'fixed';
    scalingPanel.style.bottom = '20px';
    scalingPanel.style.right = '20px';
    scalingPanel.style.width = '280px';
    scalingPanel.style.minWidth = '280px';
    scalingPanel.style.maxWidth = '280px';
    scalingPanel.style.padding = `${10 * SCALE_Y}px ${12 * SCALE_X}px`;
    scalingPanel.style.border = `2px solid ${DEFAULT_BORDER}`;
    scalingPanel.style.borderRadius = `${6 * SCALE_X}px`;
    scalingPanel.style.backgroundColor = DEFAULT_BACKGROUND;
    scalingPanel.style.color = DEFAULT_TEXT;
    scalingPanel.style.boxShadow = `0 4px 20px ${DEFAULT_BORDER}`;
    scalingPanel.style.display = 'none';
    scalingPanel.style.flexDirection = 'column';
    scalingPanel.style.gap = `${8 * SCALE_Y}px`;
    scalingPanel.style.cursor = 'default';
    scalingPanel.style.userSelect = 'none';
    scalingPanel.style.fontFamily = 'Arial, sans-serif';
    scalingPanel.style.zIndex = '2147483647';
    scalingPanel.style.pointerEvents = 'auto';
    scalingPanel.style.touchAction = 'none';
    console.log('[ScalingPanel] Panel created with styles');

    // Header with drag handle
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.cursor = 'move';
    header.style.paddingBottom = `${6 * SCALE_Y}px`;
    header.style.borderBottom = `1px solid ${DEFAULT_BORDER}`;
    header.style.marginBottom = `${6 * SCALE_Y}px`;
    header.style.marginLeft = `-${12 * SCALE_X}px`;
    header.style.marginRight = `-${12 * SCALE_X}px`;
    header.style.marginTop = `-${10 * SCALE_Y}px`;
    header.style.paddingLeft = `${12 * SCALE_X}px`;
    header.style.paddingRight = `${12 * SCALE_X}px`;
    header.style.paddingTop = `${10 * SCALE_Y}px`;

    const title = document.createElement('span');
    title.textContent = 'CANVAS SCALE';
    title.style.fontWeight = 'bold';
    title.style.fontSize = `${12 * SCALE_Y}px`;
    title.style.color = DEFAULT_TEXT;
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.padding = `${2 * SCALE_Y}px ${6 * SCALE_X}px`;
    closeBtn.style.backgroundColor = DEFAULT_BUTTON_BG;
    closeBtn.style.border = `1px solid ${DEFAULT_BORDER}`;
    closeBtn.style.color = DEFAULT_TEXT;
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.borderRadius = `${3 * SCALE_X}px`;
    closeBtn.style.fontSize = `${10 * SCALE_Y}px`;
    closeBtn.style.fontWeight = 'bold';
    closeBtn.addEventListener('click', (e) => {
        console.log('[ScalingPanel] Close button clicked');
        hidePositionPanel();
        e.stopPropagation();
    });
    header.appendChild(closeBtn);

    scalingPanel.appendChild(header);

    // Create sliders
    function createSliderControl(label, min, max, step, initialValue, onChange) {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = `${4 * SCALE_Y}px`;

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.fontSize = `${10 * SCALE_Y}px`;
        labelEl.style.fontWeight = 'bold';
        labelEl.style.color = DEFAULT_TEXT;

        const controlContainer = document.createElement('div');
        controlContainer.style.display = 'flex';
        controlContainer.style.gap = `${6 * SCALE_X}px`;
        controlContainer.style.alignItems = 'center';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = initialValue;
        slider.style.flex = '1';
        slider.style.cursor = 'pointer';
        slider.style.height = '6px';
        slider.style.appearance = 'slider-horizontal';
        slider.style.WebkitAppearance = 'slider-horizontal';
        slider.style.accentColor = DEFAULT_BORDER;
        slider.style.pointerEvents = 'auto';
        slider.style.touchAction = 'none';
        console.log('[ScalingPanel] Slider created:', label);

        const valueDisplay = document.createElement('span');
        valueDisplay.textContent = parseFloat(initialValue).toFixed(0);
        valueDisplay.style.fontSize = `${9 * SCALE_Y}px`;
        valueDisplay.style.color = DEFAULT_TEXT;
        valueDisplay.style.minWidth = '45px';
        valueDisplay.style.textAlign = 'right';
        valueDisplay.style.fontFamily = 'monospace';

        slider.addEventListener('input', (e) => {
            const newValue = parseFloat(e.target.value);
            valueDisplay.textContent = newValue.toFixed(0);
            onChange(newValue);
        });

        controlContainer.appendChild(slider);
        controlContainer.appendChild(valueDisplay);
        container.appendChild(labelEl);
        container.appendChild(controlContainer);

        return container;
    }

    // Add sliders
    let currentScaleX = 1;
    let currentScaleY = 1;
    let currentPosX = 0;
    let currentPosY = 0;

    function ensureCanvasPixelSize(canvas) {
        const w = canvas.width || 800;
        const h = canvas.height || 800;

        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
    }
    function applyTransform(canvas) {
        canvas.style.left = `${currentPosX}px`;
        canvas.style.top = `${currentPosY}px`;

        canvas.style.transformOrigin = "0 0";
        canvas.style.transform = `scale(${currentScaleX}, ${currentScaleY})`;
    }


    scalingPanel.appendChild(createSliderControl(
        'Position X',
        -2000,
        2000,
        10,
        0,
        (val) => {
            const canvas = getCanvas();
            if (canvas) {
                currentPosX = val;
                ensureCanvasPixelSize(canvas);
                applyTransform(canvas);
                console.log('[ScalingPanel] Position X updated to', val);
            }
        }
    ));

    scalingPanel.appendChild(createSliderControl(
        'Position Y',
        -2000,
        2000,
        10,
        0,
        (val) => {
            const canvas = getCanvas();
            if (canvas) {
                currentPosY = val;
                ensureCanvasPixelSize(canvas);
                applyTransform(canvas);
                console.log('[ScalingPanel] Position Y updated to', val);
            }
        }
    ));

    scalingPanel.appendChild(createSliderControl(
        'Width Scale',
        0.1,
        4,
        0.05,
        1,
        (val) => {
            const canvas = getCanvas();
            if (canvas) {
                currentScaleX = val;
                ensureCanvasPixelSize(canvas);
                applyTransform(canvas);
                console.log('[ScalingPanel] Width scale updated to', val);
            }
        }
    ));

    scalingPanel.appendChild(createSliderControl(
        'Height Scale',
        0.1,
        4,
        0.05,
        1,
        (val) => {
            const canvas = getCanvas();
            if (canvas) {
                currentScaleY = val;
                ensureCanvasPixelSize(canvas);
                applyTransform(canvas);
                console.log('[ScalingPanel] Height scale updated to', val);
            }
        }
    ));

    // Angle display
    const angleSection = document.createElement('div');
    angleSection.style.padding = `${8 * SCALE_Y}px`;
    angleSection.style.backgroundColor = DEFAULT_BUTTON_BG;
    angleSection.style.border = `1px solid ${DEFAULT_BORDER}`;
    angleSection.style.borderRadius = `${3 * SCALE_X}px`;
    angleSection.style.fontSize = `${9 * SCALE_Y}px`;
    angleSection.style.color = DEFAULT_TEXT;
    angleSection.style.textAlign = 'center';
    angleSection.style.fontFamily = 'monospace';
    angleSection.textContent = 'Canvas Ready';

    scalingPanel.appendChild(angleSection);

    document.body.appendChild(scalingPanel);
    console.log('[ScalingPanel] Panel appended to body');

    // Drag handling
    let dragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let panelStartX = 0;
    let panelStartY = 0;

    header.addEventListener('mousedown', (e) => {
        console.log('[ScalingPanel] Drag start');
        dragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        const rect = scalingPanel.getBoundingClientRect();
        panelStartX = rect.left;
        panelStartY = rect.top;
        header.style.cursor = 'grabbing';
        e.preventDefault();
    });

    const onMouseMove = (e) => {
        if (!dragging) return;
        const deltaX = e.clientX - dragStartX;
        const deltaY = e.clientY - dragStartY;
        scalingPanel.style.left = `${panelStartX + deltaX}px`;
        scalingPanel.style.top = `${panelStartY + deltaY}px`;
        scalingPanel.style.right = 'auto';
        scalingPanel.style.bottom = 'auto';
    };

    const onMouseUp = () => {
        if (dragging) {
            console.log('[ScalingPanel] Drag end');
            dragging = false;
            header.style.cursor = 'move';
        }
    };

    // Add listeners once, not on every mousedown
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // Cleanup when hiding panel
    window.__scalingPanelCleanup = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };
}

// Diagnostic helper to determine stacking / pointer-event issues and inspect current theme
function runInteractivityDiagnostics() {
    try {
        if (!scalingPanel) {
            console.log('[ScalingPanel][Diag] scalingPanel not present, initializing for diagnostics');
            initPositionPanel();
        }
        const rect = scalingPanel.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const elemAtPoint = document.elementFromPoint(cx, cy);

        console.log('[ScalingPanel][Diag] boundingRect:', rect);
        console.log('[ScalingPanel][Diag] elementFromPoint at center:', elemAtPoint);

        // Walk up the ancestor chain from the hit element and report pointer-events/z-index
        let el = elemAtPoint;
        const ancestry = [];
        while (el) {
            const s = window.getComputedStyle(el);
            ancestry.push({ tag: el.tagName, id: el.id || null, class: el.className || null, pointerEvents: s.pointerEvents, zIndex: s.zIndex, position: s.position, transform: s.transform });
            el = el.parentElement;
            if (ancestry.length > 20) break;
        }
        console.log('[ScalingPanel][Diag] ancestry (top->root):', ancestry);

        // Report themeManager state
        try {
            const theme = (typeof themeManager !== 'undefined' && themeManager.getCurrentTheme) ? themeManager.getCurrentTheme() : null;
            console.log('[ScalingPanel][Diag] themeManager.getCurrentTheme():', theme);
        } catch (err) {
            console.warn('[ScalingPanel][Diag] Error reading themeManager:', err);
        }

        // Ensure panel can receive events and force a very-high z-index temporarily for testing
        const prevZ = scalingPanel.style.zIndex;
        const prevOutline = scalingPanel.style.outline;
        scalingPanel.style.pointerEvents = 'auto';
        scalingPanel.style.zIndex = '9999999999';
        scalingPanel.style.outline = '3px solid yellow';

        // After a short delay, revert visual test but keep pointer-events & high z-index if needed
        setTimeout(() => {
            scalingPanel.style.outline = prevOutline || '';
            // keep z-index elevated for a while to allow manual testing in devtools
            setTimeout(() => {
                scalingPanel.style.zIndex = prevZ || '2147483647';
            }, 2500);
        }, 1200);

    } catch (e) {
        console.error('[ScalingPanel][Diag] diagnostics failed:', e);
    }
}

export function showPositionPanel() {
    console.log('[ScalingPanel] Show called');
    if (!scalingPanel) initPositionPanel();
    if (scalingPanel) {
        // Reapply theme colors when showing
        const theme = themeManager.getCurrentTheme();
        scalingPanel.style.borderColor = theme.border;
        scalingPanel.style.backgroundColor = theme.background;
        scalingPanel.style.color = theme.text;
        scalingPanel.style.boxShadow = `0 4px 20px ${theme.border}`;

        scalingPanel.style.display = 'flex';
        isScalingPanelVisible = true;
        console.log('[ScalingPanel] Now visible with theme:', theme);

        // Run diagnostics to help identify interactivity or theming issues at runtime
        setTimeout(() => runInteractivityDiagnostics(), 50);
    }
}

export function hidePositionPanel() {
    console.log('[ScalingPanel] Hide called');
    if (scalingPanel) {
        scalingPanel.style.display = 'none';
        isScalingPanelVisible = false;
        console.log('[ScalingPanel] Now hidden');
    }
}

export function togglePositionPanel() {
    console.log('[ScalingPanel] Toggle called, currently visible:', isScalingPanelVisible);
    if (isScalingPanelVisible) {
        hidePositionPanel();
    } else {
        showPositionPanel();
    }
}

// Listen for theme changes
window.addEventListener('themeChanged', () => {
    console.log('[ScalingPanel] Theme changed event received');
    if (scalingPanel && scalingPanel.parentElement) {
        const theme = themeManager.getCurrentTheme();
        scalingPanel.style.borderColor = theme.border;
        scalingPanel.style.backgroundColor = theme.background;
        scalingPanel.style.color = theme.text;
        scalingPanel.style.boxShadow = `0 4px 20px ${theme.border}`;

        // Update all child elements with theme colors
        scalingPanel.querySelectorAll('input[type="range"]').forEach(slider => {
            slider.style.accentColor = theme.border;
        });
        scalingPanel.querySelectorAll('div').forEach(div => {
            if (div.textContent.includes('Canvas')) {
                div.style.backgroundColor = theme.buttonBg || '#1a0000';
                div.style.borderColor = theme.border;
                div.style.color = theme.text;
            }
        });
        scalingPanel.querySelectorAll('button').forEach(btn => {
            btn.style.backgroundColor = theme.buttonBg || '#1a0000';
            btn.style.borderColor = theme.border;
            btn.style.color = theme.text;
        });
        scalingPanel.querySelectorAll('label').forEach(label => {
            label.style.color = theme.text;
        });
        scalingPanel.querySelectorAll('span').forEach(span => {
            span.style.color = theme.text;
        });

        console.log('[ScalingPanel] Theme updated to:', theme);
    }
});
