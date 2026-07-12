// src/debug/workerdebug.js
// Shared worker-side debug + heartbeat instrumentation helper (ES module).
//
// Used by module-type workers (raycast, wallprecompute, light, renderengine, textureloader).
// Classic workers (horizon) inline an equivalent block because they cannot `import`.
//
// This file is intentionally isolated and easy to revert:
//   - delete this file
//   - remove the `import { createWorkerDebug }` line from each worker
//   - remove the `wd.*` calls added next to message handlers
//
// Heartbeats are posted on the existing BroadcastChannel('perf_monitor') so the
// performance monitor (memcpu.js) can track worker liveness without a new channel.

const WD_CHANNEL_NAME = 'perf_monitor';

import { WORKER_DEBUG_LOGS } from '../globals.js';

function getPerfChannel() {
    if (typeof BroadcastChannel === 'undefined') return null;
    try {
        return new BroadcastChannel(WD_CHANNEL_NAME);
    } catch (e) {
        return null;
    }
}

/**
 * Create a debug/heartbeat handle for a worker.
 * @param {string} baseName - base identifier, e.g. 'raycast-worker'
 * @returns {object} API: setName, markTask, heartbeat, log, logError, post, name
 */
export function createWorkerDebug(baseName) {
    let name = baseName || 'worker';
    let tasksProcessed = 0;
    let lastExecTime = 0;
    let debugEnabled = WORKER_DEBUG_LOGS;
    const channel = getPerfChannel();

    // Allow the performance monitor to toggle worker-side logs at runtime.
    if (channel) {
        channel.onmessage = (e) => {
            try {
                if (e.data && e.data.type === 'worker_debug_toggle') debugEnabled = !!e.data.enabled;
            } catch (err) { /* ignore */ }
        };
    }

    function post(payload) {
        try {
            if (channel) channel.postMessage(payload);
            else if (typeof self !== 'undefined' && self.postMessage) self.postMessage(payload);
        } catch (e) {
            // best-effort
        }
    }

    function log(...args) {
        if (!debugEnabled) return;
        try {
            console.log('[WORKER DEBUG]', name + ':', ...args);
        } catch (e) { /* ignore */ }
    }

    function logError(...args) {
        if (!debugEnabled) return;
        try {
            console.error('[WORKER DEBUG]', name + ' ERROR:', ...args);
        } catch (e) { /* ignore */ }
    }

    function setName(n) {
        if (n != null) name = String(n);
    }

    function markTask() {
        tasksProcessed++;
        lastExecTime = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    }

    function heartbeat() {
        const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
        const interval = lastExecTime ? Math.round(now - lastExecTime) : null;
        post({
            type: 'worker_heartbeat',
            name,
            alive: true,
            tasksProcessed,
            timestamp: Date.now(),
            lastExecutionInterval: interval
        });
    }

    // Periodic heartbeat so the main thread can confirm the worker is alive.
    // (No immediate heartbeat: the worker renames itself on init, and we don't
    // want a stray base-name entry before the real id is known.)
    const heartbeatTimer = setInterval(heartbeat, 1000);
    if (heartbeatTimer && typeof heartbeatTimer.unref === 'function') {
        try { heartbeatTimer.unref(); } catch (e) { /* node only */ }
    }

    return {
        setName,
        markTask,
        heartbeat,
        log,
        logError,
        post,
        get name() { return name; }
    };
}
