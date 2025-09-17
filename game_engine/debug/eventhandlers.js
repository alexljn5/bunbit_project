// File: game_engine/debug/eventhandlers.js

import { SCALE_Y, SCALE_X } from '../globals.js';  // Adjust path if needed
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
} from './debughandler.js';  // Import shared functions and variables
import { EvilUIState } from '../themes/eviltheme.js';  // Shared UI state

// --- Handle mouse down (using EvilUIState) ---
export function handleMouseDown(e) {
    e.preventDefault();
    console.log('Mouse down on debug canvas:', e.clientX, e.clientY); // Debug log
    const rect = debugCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check resize
    if (mx >= resizeArea.x && mx < resizeArea.x + resizeArea.w &&
        my >= resizeArea.y && my < resizeArea.y + resizeArea.h) {
        console.log('Starting resize'); // Debug log
        EvilUIState.isResizing = true;
        EvilUIState.resizeStartX = e.clientX;
        EvilUIState.resizeStartY = e.clientY;
        EvilUIState.resizeStartWidth = DEBUG_WIDTH;
        EvilUIState.resizeStartHeight = DEBUG_HEIGHT;
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
        return;
    }

    // Check header for drag or button
    if (my < HEADER_HEIGHT) {
        const clickedButton = buttons.find(
            btn => mx >= btn.x && mx < btn.x + btn.w && my >= btn.y && my < btn.y + btn.h
        );

        if (clickedButton) {
            console.log('Button clicked:', clickedButton.type); // Debug log
            const type = clickedButton.type;
            if (type === 'perf') {
                try {
                    togglePerfMonitor();
                } catch (err) {
                    console.error('Failed to toggle perf monitor:', err);
                }
            } else if (type === 'clear') {
                logBuffer.length = 0;  // Clear the array in-place
                updateFilteredLogs();
                scrollOffsetX = 0;
                virtualScrollY = 0;
                drawDebugTerminal();
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
        console.log('Starting drag'); // Debug log
        EvilUIState.isDragging = true;
        EvilUIState.dragOffsetX = e.clientX;
        EvilUIState.dragOffsetY = e.clientY;

        const contRect = debugContainer.getBoundingClientRect();
        EvilUIState.containerStartX = contRect.left;
        EvilUIState.containerStartY = contRect.top;
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', stopDrag);
    }
}

// --- Handle mouse move (using EvilUIState) ---
export function handleMouseMove(e) {
    const rect = debugCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

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

// --- Handle mouse leave ---
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

// --- Handle resize (using EvilUIState) ---
export function handleResize(e) {
    if (!EvilUIState.isResizing) return;

    console.log('Resizing:', e.clientX, e.clientY); // Debug log
    const dx = e.clientX - EvilUIState.resizeStartX;
    const dy = e.clientY - EvilUIState.resizeStartY;

    const newWidth = Math.max(MIN_WIDTH, EvilUIState.resizeStartWidth + dx);
    const newHeight = Math.max(MIN_HEIGHT, EvilUIState.resizeStartHeight + dy);

    resizeDebugCanvas(newWidth, newHeight);
}

// --- Stop resize ---
export function stopResize() {
    console.log('Stopping resize'); // Debug log
    EvilUIState.isResizing = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
}

// --- Handle drag (using EvilUIState) ---
export function handleDrag(e) {
    if (!EvilUIState.isDragging) return;

    console.log('Dragging:', e.clientX, e.clientY); // Debug log
    const dx = e.clientX - EvilUIState.dragOffsetX;
    const dy = e.clientY - EvilUIState.dragOffsetY;

    debugContainer.style.left = `${EvilUIState.containerStartX + dx}px`;
    debugContainer.style.top = `${EvilUIState.containerStartY + dy}px`;
    debugContainer.style.right = 'auto';
    debugContainer.style.bottom = 'auto';
}

// --- Stop drag ---
export function stopDrag() {
    console.log('Stopping drag'); // Debug log
    EvilUIState.isDragging = false;
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', stopDrag);
}