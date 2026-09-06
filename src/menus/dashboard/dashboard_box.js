import { SCALE_X, SCALE_Y } from '../../globals.js';
import { themeManager } from '../../themes/thememanager.js';
import { DASHBOARD_ID } from './dashboard_keyframes.js';

function ensureDashboardBox() {
    let el = document.getElementById(DASHBOARD_ID);
    if (el) return el;

    el = document.createElement('div');
    el.id = DASHBOARD_ID;

    // Match the old "debug panel spanning box" positioning model.
    // This is intentionally independent of bunbit-debug-panel.
    const edgeGap = 20;
    el.style.position = 'fixed';
    el.style.left = `${edgeGap}px`;
    el.style.top = `${edgeGap}px`;
    el.style.right = `${edgeGap}px`;
    el.style.bottom = `${edgeGap}px`;

    // Visual container frame
    el.style.pointerEvents = 'none';
    el.style.userSelect = 'none';
    el.style.zIndex = '2147483645';
    el.style.overflow = 'hidden';
    el.style.borderRadius = `${8 * SCALE_X}px`;
    el.style.border = `${2 * SCALE_X}px solid rgba(252,0,0,0.95)`;
    el.style.boxShadow = `0 6px 30px rgba(252,0,0,0.35)`;
    el.style.isolation = 'isolate';

    document.body.appendChild(el);
    return el;
}

export function applyTheme(box) {
    try {
        const t = themeManager?.getCurrentTheme?.();
        if (t?.border) box.style.borderColor = t.border;
    } catch (_) { }
}

export { ensureDashboardBox, DASHBOARD_ID };
