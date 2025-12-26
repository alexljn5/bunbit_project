export function gameLoop(renderCallback) {
    let isRunning = false;
    let rafId = null;
    let lastTime = 0;
    const targetFrameTime = 1000 / 60; // 60 FPS

    async function tick(time) {
        if (!isRunning) return;

        const deltaTime = (time - lastTime) / 1000;
        lastTime = time;
        window.deltaTime = deltaTime;

        try {
            await renderCallback(deltaTime);
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
                lastTime = performance.now();
                window.gameFrameCount = 0; // Reset on start
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
