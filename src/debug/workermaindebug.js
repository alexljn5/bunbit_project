// src/debug/workermaindebug.js
// Main-thread side worker debug logging helper (throttled).
//
// Keeps [WORKER DEBUG] logging consistent and avoids console spam from
// high-frequency worker messages. Isolated and easy to revert: delete this
// file and remove the `import { ... }` lines from the worker-creation files.

import { WORKER_DEBUG_LOGS } from '../globals.js';

const _wmLastLog = new Map();

function _throttle(key, ms) {
    const now = Date.now();
    const last = _wmLastLog.get(key) || 0;
    if (now - last >= ms) {
        _wmLastLog.set(key, now);
        return true;
    }
    return false;
}

// Log a one-off worker event (creation, startup, error). Not throttled.
export function wdMainEvent(name, msg, ...extra) {
    if (!WORKER_DEBUG_LOGS) return;
    try {
        console.log('[WORKER DEBUG]', name, msg, ...extra);
    } catch (e) { /* ignore */ }
}

// Log that a worker sent a message back to the main thread (throttled to 2s per type).
export function wdMainMessage(name, type) {
    if (!WORKER_DEBUG_LOGS) return;
    if (_throttle('msg:' + name + ':' + type, 2000)) {
        try {
            console.log('[WORKER DEBUG]', name, 'sent message:', type);
        } catch (e) { /* ignore */ }
    }
}

// Log a worker error (not throttled).
export function wdMainError(name, ...args) {
    if (!WORKER_DEBUG_LOGS) return;
    try {
        console.error('[WORKER DEBUG]', name, 'ERROR:', ...args);
    } catch (e) { /* ignore */ }
}
