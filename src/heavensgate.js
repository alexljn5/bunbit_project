// Tauri entry point for Bunbit Game Engine
// This file handles the intro flow and initialization
// Previously: Electron main process (now handled by Rust backend)

// Check if running in Tauri
const isTauri = typeof window !== 'undefined' && window.__TAURI__ !== undefined;

// Lazy load Tauri API
let tauriInvoke = null;
async function initTauriAPI() {
    if (isTauri && !tauriInvoke) {
        const core = await import('@tauri-apps/api/core');
        tauriInvoke = core.invoke;
    }
}

// Write crash log to Tauri backend
async function writeCrashLog(error, context = 'General') {
    if (isTauri) {
        await initTauriAPI();
        if (tauriInvoke) {
            try {
                await tauriInvoke('write_crash_log', {
                    error: error?.message || error,
                    context
                });
            } catch (e) {
                console.error('Failed to write crash log:', e);
            }
        }
    } else {
        console.error(`[${context}] Crash:`, error);
    }
}

// Handle uncaught errors
if (typeof window !== 'undefined') {
    window.addEventListener('error', (e) => {
        writeCrashLog(e.error, 'WindowError');
    });

    window.addEventListener('unhandledrejection', (e) => {
        writeCrashLog(e.reason, 'UnhandledRejection');
    });
}

// Export for use in other modules
export { isTauri, writeCrashLog };