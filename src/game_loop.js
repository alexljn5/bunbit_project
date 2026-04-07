export function gameLoop(renderCallback) {
    let isRunning = false;
    let rafId = null;
    let lastTime = 0;
    const targetFrameTime = 1000 / 60; // 60 FPS

    async function tick(time) {
        if (!isRunning) return;

        // Compute delta in milliseconds, but expose delta in seconds to consumers
        const rawDeltaMs = (lastTime ? (time - lastTime) : targetFrameTime);
        lastTime = time;
        const deltaSeconds = rawDeltaMs / 1000;
        // Expose deltaTime in seconds (debug tools expect seconds)
        window.deltaTime = deltaSeconds;

        try {
            await renderCallback(deltaSeconds);
            // Increment game frame counter for accurate FPS tracking
            window.gameFrameCount = (window.gameFrameCount || 0) + 1;
        } catch (error) {
            console.error("Render error:", error);
        }
        rafId = requestAnimationFrame(tick);
    }

    return {
        start: () => {
            if (!isRunning) {
                isRunning = true;
                // Initialize lastTime to now to prevent a very large first-frame delta
                lastTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
                rafId = requestAnimationFrame(tick);
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
