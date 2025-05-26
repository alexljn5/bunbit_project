export function gameLoop(renderCallback) {
    let isRunning = false;
    let rafId = null;

    function tick(time) {
        if (!isRunning) return;
        const deltaTime = rafId ? (time - rafId) / 1000 : 0;
        rafId = time;
        window.deltaTime = deltaTime; // Expose for debugging
        renderCallback(deltaTime);
        requestAnimationFrame(tick);
    }

    return {
        start: () => {
            if (!isRunning) {
                isRunning = true;
                requestAnimationFrame(tick);
            }
        },
        stop: () => {
            isRunning = false;
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        }
    };
}