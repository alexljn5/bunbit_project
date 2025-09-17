// File: game_engine/debug/fullscreenhandler.js
export class FullscreenHandler {
    constructor() {
        this.isFullscreen = false;
        this.scaleFactor = window.devicePixelRatio || 1;
        this.originalPositions = new Map();
    }

    init() {
        this.setupEventListeners();
        this.detectFullscreen();
    }

    setupEventListeners() {
        const events = [
            'fullscreenchange',
            'webkitfullscreenchange',
            'mozfullscreenchange',
            'MSFullscreenChange'
        ];

        events.forEach(event => {
            document.addEventListener(event, () => {
                this.handleFullscreenChange();
            });
        });

        // Also listen for resize which might affect fullscreen
        window.addEventListener('resize', () => {
            setTimeout(() => this.handleFullscreenChange(), 100);
        });
    }

    detectFullscreen() {
        this.isFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );
    }

    handleFullscreenChange() {
        const wasFullscreen = this.isFullscreen;
        this.detectFullscreen();

        if (this.isFullscreen && !wasFullscreen) {
            console.log('Entered fullscreen, adjusting debug elements *chao chao*');
            this.enterFullscreen();
        } else if (!this.isFullscreen && wasFullscreen) {
            console.log('Exited fullscreen, restoring debug elements *twirls*');
            this.exitFullscreen();
        }
    }

    enterFullscreen() {
        this.scaleFactor = window.devicePixelRatio || 1;

        // Store original positions
        this.storeOriginalPositions();

        // Adjust all debug elements
        this.adjustDebugElements();
    }

    exitFullscreen() {
        this.scaleFactor = 1;
        this.restoreOriginalPositions();
    }

    storeOriginalPositions() {
        const elements = [
            'debugTerminalContainer',
            'perfMonitorContainer',
            'bunbit-debug-panel'
        ];

        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                this.originalPositions.set(id, {
                    left: element.style.left,
                    top: element.style.top,
                    right: element.style.right,
                    bottom: element.style.bottom,
                    zIndex: element.style.zIndex
                });
            }
        });
    }

    restoreOriginalPositions() {
        this.originalPositions.forEach((position, id) => {
            const element = document.getElementById(id);
            if (element) {
                Object.assign(element.style, position);
            }
        });
        this.originalPositions.clear();
    }

    adjustDebugElements() {
        const elements = [
            'debugTerminalContainer',
            'perfMonitorContainer',
            'bunbit-debug-panel'
        ];

        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.zIndex = '2147483647'; // Max z-index
                element.style.pointerEvents = 'auto';

                // Convert current position to fullscreen coordinates if needed
                const rect = element.getBoundingClientRect();
                if (element.style.left && element.style.left !== 'auto') {
                    element.style.left = `${parseFloat(element.style.left) / this.scaleFactor}px`;
                }
                if (element.style.top && element.style.top !== 'auto') {
                    element.style.top = `${parseFloat(element.style.top) / this.scaleFactor}px`;
                }
            }
        });
    }

    getScaleFactor() {
        return this.scaleFactor;
    }

    isFullscreenMode() {
        return this.isFullscreen;
    }
}

export const fullscreenHandler = new FullscreenHandler();