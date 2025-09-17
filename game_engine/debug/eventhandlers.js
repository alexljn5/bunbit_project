// File: game_engine/debug/eventhandlers.js

import { SCALE_Y, SCALE_X } from '../globals.js';
import { togglePerfMonitor } from './memcpu.js';
import { debugCanvas, debugContainer, buttons, resizeArea, HEADER_HEIGHT, resizeDebugCanvas, updateFilteredLogs, drawDebugTerminal } from './debughandler.js';

// --- Local state variables ---
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let containerStartX = 0;
let containerStartY = 0;

let isResizing = false;
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartWidth = 0;
let resizeStartHeight = 0;

// --- Handle mouse down ---
export function handleMouseDown(e) {
    e.preventDefault();
    const rect = debugCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check resize
    if (mx >= resizeArea.x && mx < resizeArea.x + resizeArea.w &&
        my >= resizeArea.y && my < resizeArea.y + resizeArea.h) {
        isResizing = true;
        resizeStartX = e.clientX;
        resizeStartY = e.clientY;
        resizeStartWidth = debugCanvas.width;
        resizeStartHeight = debugCanvas.height;
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
            const type = clickedButton.type;
            if (type === 'perf') {
                togglePerfMonitor();
            } else if (type === 'clear') {
                // clear logs
                window.debugAPI?.clearLogs?.(); // optional hook
                updateFilteredLogs();
                drawDebugTerminal();
            } else {
                // toggle filter
                window.debugAPI?.toggleFilter?.(type);
                updateFilteredLogs();
                drawDebugTerminal();
            }
            return;
        }

        // Start drag if not on button
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        const contRect = debugContainer.getBoundingClientRect();
        containerStartX = contRect.left;
        containerStartY = contRect.top;
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', stopDrag);
    }
}

// --- Handle mouse move ---
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

// --- Handle resize ---
export function handleResize(e) {
    if (!isResizing) return;

    const dx = e.clientX - resizeStartX;
    const dy = e.clientY - resizeStartY;

    const newWidth = Math.max(300, resizeStartWidth + dx);
    const newHeight = Math.max(200, resizeStartHeight + dy);

    resizeDebugCanvas(newWidth, newHeight);
}

// --- Stop resize ---
export function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
}

// --- Handle drag ---
export function handleDrag(e) {
    if (!isDragging) return;

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    debugContainer.style.left = `${containerStartX + dx}px`;
    debugContainer.style.top = `${containerStartY + dy}px`;
    debugContainer.style.right = 'auto';
    debugContainer.style.bottom = 'auto';
}

// --- Stop drag ---
export function stopDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', stopDrag);
}
