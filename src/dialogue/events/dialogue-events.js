// ============================================================
// DIALOGUE EVENTS
// ============================================================
// Handles event triggers from dialogue nodes.
// Events are data-driven — the engine does not hardcode
// what events exist. New event types are registered at runtime.
// ============================================================

/**
 * Built-in event type handlers.
 * Each handler receives the event data and the current flags,
 * and returns an updated flags object.
 */
const builtInHandlers = {
    /**
     * Sets a flag to a specific value.
     * @param {object} event - Event data.
     * @param {string} event.flag - Flag name.
     * @param {*} event.value - Value to set.
     * @param {object} flags - Current flags.
     * @returns {object} Updated flags.
     */
    SET_FLAG(event, flags) {
        if (!event.flag) return flags;
        return { ...flags, [event.flag]: event.value !== undefined ? event.value : true };
    },

    /**
     * Removes a flag from the flags object.
     * @param {object} event - Event data.
     * @param {string} event.flag - Flag name to remove.
     * @param {object} flags - Current flags.
     * @returns {object} Updated flags.
     */
    REMOVE_FLAG(event, flags) {
        if (!event.flag) return flags;
        const { [event.flag]: _, ...remaining } = flags;
        return remaining;
    },

    /**
     * Increments a numeric flag by a value.
     * @param {object} event - Event data.
     * @param {string} event.flag - Flag name.
     * @param {number} [event.value=1] - Amount to increment.
     * @param {object} flags - Current flags.
     * @returns {object} Updated flags.
     */
    INCREMENT_FLAG(event, flags) {
        if (!event.flag) return flags;
        const current = flags[event.flag] || 0;
        const amount = typeof event.value === 'number' ? event.value : 1;
        return { ...flags, [event.flag]: current + amount };
    },

    /**
     * Emits a custom event on the window event bus.
     * @param {object} event - Event data.
     * @param {string} event.type - Event type name.
     * @param {object} [event.payload] - Event payload.
     * @param {object} flags - Current flags (unused, but kept for interface consistency).
     * @returns {object} Unchanged flags.
     */
    EMIT_EVENT(event, flags) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent(event.type || 'dialogue:event', {
                detail: event.payload || {},
            }));
        }
        return flags;
    },

    // --- Cinematic Event Handlers --------------------------

    FADE_OUT(event, flags) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('dialogue:cinematic', {
                detail: { action: 'FADE_OUT', duration: event.duration || 1000 },
            }));
        }
        return flags;
    },

    FADE_IN(event, flags) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('dialogue:cinematic', {
                detail: { action: 'FADE_IN', duration: event.duration || 1000 },
            }));
        }
        return flags;
    },

    FADE_TO_BLACK(event, flags) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('dialogue:cinematic', {
                detail: { action: 'FADE_TO_BLACK', duration: event.duration || 1000 },
            }));
        }
        return flags;
    },

    FADE_ENVIRONMENT(event, flags) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('dialogue:cinematic', {
                detail: { action: 'FADE_ENVIRONMENT', duration: event.duration || 1500 },
            }));
        }
        return flags;
    },

    SHOW_SIGIL(event, flags) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('dialogue:cinematic', {
                detail: { action: 'SHOW_SIGIL', target: event.target || 'sigil_ancient' },
            }));
        }
        return flags;
    },

    SIGIL_EXPAND(event, flags) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('dialogue:cinematic', {
                detail: { action: 'SIGIL_EXPAND', duration: event.duration || 1500 },
            }));
        }
        return flags;
    },

    HIDE_SIGIL(event, flags) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('dialogue:cinematic', {
                detail: { action: 'HIDE_SIGIL' },
            }));
        }
        return flags;
    },

    SHOW_EXPRESSIONS(event, flags) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('dialogue:cinematic', {
                detail: { action: 'SHOW_EXPRESSIONS', characters: event.characters || [] },
            }));
        }
        return flags;
    },

    HIDE_EXPRESSIONS(event, flags) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('dialogue:cinematic', {
                detail: { action: 'HIDE_EXPRESSIONS' },
            }));
        }
        return flags;
    },

    CAMERA_ZOOM(event, flags) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('dialogue:cinematic', {
                detail: { action: 'CAMERA_ZOOM', target: event.target || 'sigil', duration: event.duration || 2000 },
            }));
        }
        return flags;
    },

    // --- Player Recognition Event --------------------------

    PLAYER_RECOGNIZED(event, flags) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('dialogue:cinematic', {
                detail: { action: 'PLAYER_RECOGNIZED', characters: event.characters || ['patches', 'vesper'] },
            }));
        }
        return { ...flags, playerRecognized: true, facesVisible: true };
    },
};

/**
 * Dialogue event system.
 * Supports registering custom event handlers and executing events from dialogue nodes.
 */
class DialogueEventSystem {
    constructor() {
        /** @type {Map<string, Function>} Registered event handlers. */
        this.handlers = new Map();

        // Register built-in handlers
        for (const [type, handler] of Object.entries(builtInHandlers)) {
            this.handlers.set(type, handler);
        }
    }

    /**
     * Registers a custom event handler.
     * @param {string} type - Event type name.
     * @param {Function} handler - Handler function (event, flags) => newFlags.
     */
    registerHandler(type, handler) {
        this.handlers.set(type, handler);
    }

    /**
     * Removes a registered event handler.
     * @param {string} type - Event type name.
     */
    unregisterHandler(type) {
        this.handlers.delete(type);
    }

    /**
     * Executes a list of events sequentially.
     * @param {object[]} events - Array of event objects.
     * @param {object} flags - Current game flags.
     * @returns {object} Updated flags after all events are processed.
     */
    executeEvents(events, flags) {
        if (!Array.isArray(events)) return flags;

        let currentFlags = { ...flags };
        for (const event of events) {
            const handler = this.handlers.get(event.type);
            if (handler) {
                try {
                    currentFlags = handler(event, currentFlags);
                } catch (e) {
                    console.error(`[DialogueEvents] Error executing event type "${event.type}":`, e);
                }
            } else {
                console.warn(`[DialogueEvents] No handler registered for event type "${event.type}".`);
            }
        }
        return currentFlags;
    }

    /**
     * Executes a single event.
     * @param {object} event - Event object.
     * @param {object} flags - Current game flags.
     * @returns {object} Updated flags.
     */
    executeEvent(event, flags) {
        return this.executeEvents([event], flags);
    }
}

// Singleton instance
export const dialogueEventSystem = new DialogueEventSystem();

export default DialogueEventSystem;
