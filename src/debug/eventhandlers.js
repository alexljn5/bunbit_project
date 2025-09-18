import { SCALE_Y, SCALE_X } from '../globals.js';
import { togglePerfMonitor } from './memcpu.js';
import {
    updateFilteredLogs,
    drawDebugTerminal,
    buttons,
    resizeArea,
    logBuffer,
    logFilters,
    debugCanvas,
    debugContainer,
    virtualScrollY,
    scrollOffsetX,
    DEBUG_WIDTH,
    DEBUG_HEIGHT,
    MIN_WIDTH,
    MIN_HEIGHT,
    HEADER_HEIGHT
} from './debughandler.js';
import { EvilUIState } from '../themes/eviltheme.js';
import { themeManager } from '../themes/thememanager.js';
import { fullscreenHandler } from './fullscreenhandler.js';

// Handle mouse down
export function handleMouseDown(e) {
    e.preventDefault();
    console.log('Mouse down on debug canvas:', e.clientX, e.clientY);
    const rect = debugCanvas.getBoundingClientRect();
    const scaleFactor = fullscreenHandler.getScaleFactor();
    const mx = (e.clientX - rect.left) / scaleFactor;
    const my = (e.clientY - rect.top) / scaleFactor;

    // Check resize
    if (mx >= resizeArea.x && mx < resizeArea.x + resizeArea.w &&
        my >= resizeArea.y && my < resizeArea.y + resizeArea.h) {
        console.log('Starting resize');
        EvilUIState.isResizing = true;
        EvilUIState.resizeStartX = e.clientX / scaleFactor;
        EvilUIState.resizeStartY = e.clientY / scaleFactor;
        EvilUIState.resizeStartWidth = DEBUG_WIDTH;
        EvilUIState.resizeStartHeight = DEBUG_HEIGHT;
        document.addEventListener('mousemove', handleResize, { capture: true });
        document.addEventListener('mouseup', stopResize, { capture: true });
        return;
    }

    // Check header for drag or button
    if (my < HEADER_HEIGHT) {
        const clickedButton = buttons.find(
            btn => mx >= btn.x && mx < btn.x + btn.w && my >= btn.y && my < btn.y + btn.h
        );

        if (clickedButton) {
            console.log('Button clicked:', clickedButton.type);
            const type = clickedButton.type;
            if (type === 'perf') {
                try {
                    togglePerfMonitor();
                } catch (err) {
                    console.error('Failed to toggle perf monitor:', err);
                }
            } else if (type === 'clear') {
                logBuffer.length = 0;
                updateFilteredLogs();
                scrollOffsetX = 0;
                virtualScrollY = 0;
                drawDebugTerminal();
            } else if (type === 'theme') {
                themeManager.toggleTheme();
            } else {
                logFilters[type] = !logFilters[type];
                updateFilteredLogs();
                const lineHeight = 18 * SCALE_Y;
                const logAreaHeight = debugCanvas.height - HEADER_HEIGHT;
                const maxScrollY = Math.max(0, filteredLogs.length * lineHeight - logAreaHeight);
                virtualScrollY = Math.min(virtualScrollY, maxScrollY);
                drawDebugTerminal();
            }
            return;
        }

        // Start drag if not on button
        console.log('Starting drag');
        EvilUIState.isDragging = true;
        EvilUIState.dragOffsetX = e.clientX / scaleFactor;
        EvilUIState.dragOffsetY = e.clientY / scaleFactor;

        const contRect = debugContainer.getBoundingClientRect();
        EvilUIState.containerStartX = contRect.left / scaleFactor;
        EvilUIState.containerStartY = contRect.top / scaleFactor;
        document.addEventListener('mousemove', handleDrag, { capture: true });
        document.addEventListener('mouseup', stopDrag, { capture: true });
    }
}

// Handle mouse move
export function handleMouseMove(e) {
    const rect = debugCanvas.getBoundingClientRect();
    const scaleFactor = fullscreenHandler.getScaleFactor();
    const mx = (e.clientX - rect.left) / scaleFactor;
    const my = (e.clientY - rect.top) / scaleFactor;

    let needsRedraw = false;

    // Update button hovers
    buttons.forEach(btn => {
        const isHovered = mx >= btn.x && mx < btn.x + btn.w && my >= btn.y && my < btn.y + btn.h;
        if (isHovered !== btn.hovered) {
            btn.hovered = isHovered;
            needsRedraw = true;
        }
    });

    // Update resize hover
    const isResizeHovered = mx >= resizeArea.x && mx < resizeArea.x + resizeArea.w &&
        my >= resizeArea.y && my < resizeArea.y + resizeArea.h;
    if (isResizeHovered !== resizeArea.hovered) {
        resizeArea.hovered = isResizeHovered;
        needsRedraw = true;
    }

    if (needsRedraw) {
        drawDebugTerminal();
    }

    // Set cursor
    if (isResizeHovered) {
        debugCanvas.style.cursor = 'nwse-resize';
    } else if (buttons.some(btn => btn.hovered)) {
        debugCanvas.style.cursor = 'pointer';
    } else if (my < HEADER_HEIGHT) {
        debugCanvas.style.cursor = 'move';
    } else {
        debugCanvas.style.cursor = 'default';
    }
}

// Handle mouse leave
export function handleMouseLeave() {
    let needsRedraw = false;
    buttons.forEach(btn => {
        if (btn.hovered) {
            btn.hovered = false;
            needsRedraw = true;
        }
    });
    if (resizeArea.hovered) {
        resizeArea.hovered = false;
        needsRedraw = true;
    }
    if (needsRedraw) {
        drawDebugTerminal();
    }
    debugCanvas.style.cursor = 'default';
}

// Handle resize
export function handleResize(e) {
    if (!EvilUIState.isResizing) return;

    console.log('Resizing:', e.clientX, e.clientY);
    const scaleFactor = fullscreenHandler.getScaleFactor();
    const dx = (e.clientX / scaleFactor) - EvilUIState.resizeStartX;
    const dy = (e.clientY / scaleFactor) - EvilUIState.resizeStartY;

    const newWidth = Math.max(MIN_WIDTH, EvilUIState.resizeStartWidth + dx);
    const newHeight = Math.max(MIN_HEIGHT, EvilUIState.resizeStartHeight + dy);

    resizeDebugCanvas(newWidth, newHeight);
}

// Stop resize
export function stopResize() {
    console.log('Stopping resize');
    EvilUIState.isResizing = false;
    document.removeEventListener('mousemove', handleResize, { capture: true });
    document.removeEventListener('mouseup', stopResize, { capture: true });
}

// Handle drag
export function handleDrag(e) {
    if (!EvilUIState.isDragging) return;

    console.log('Dragging:', e.clientX, e.clientY);
    const scaleFactor = fullscreenHandler.getScaleFactor();
    const dx = (e.clientX / scaleFactor) - EvilUIState.dragOffsetX;
    const dy = (e.clientY / scaleFactor) - EvilUIState.dragOffsetY;

    debugContainer.style.left = `${EvilUIState.containerStartX + dx}px`;
    debugContainer.style.top = `${EvilUIState.containerStartY + dy}px`;
    debugContainer.style.right = 'auto';
    debugContainer.style.bottom = 'auto';
}

// Stop drag
export function stopDrag() {
    console.log('Stopping drag');
    EvilUIState.isDragging = false;
    document.removeEventListener('mousemove', handleDrag, { capture: true });
    document.removeEventListener('mouseup', stopDrag, { capture: true });
}