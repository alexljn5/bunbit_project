export function gameLoop(renderCallback) {
    let isRunning = false;
    let lastTime = null;
    let rafId = null;

    function tick() {
        if (!isRunning) return;

        const currentTime = performance.now();
        const deltaTime = (currentTime - (lastTime || currentTime)) / 1000;
        lastTime = currentTime;
        //console.log(deltaTime);
        window.deltaTime = deltaTime
        renderCallback(deltaTime);
        rafId = requestAnimationFrame(tick);
    }

    return {
        start: () => {
            if (!isRunning) {
                isRunning = true;
                lastTime = null;
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