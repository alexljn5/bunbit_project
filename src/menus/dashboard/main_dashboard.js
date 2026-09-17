import { SCALE_X, SCALE_Y } from '../../globals.js';
import { themeManager } from '../../themes/thememanager.js';
import { ensureKeyframes, DASHBOARD_ID } from './dashboard_keyframes.js';
import { ensureDashboardBox, applyTheme } from './dashboard_box.js';
import { mountDashboardContent } from './dashboard_content.js';

export function initMainDashboard() {
    if (typeof document === 'undefined') return;
    ensureKeyframes();
    const box = ensureDashboardBox();
    mountDashboardContent(box);

    // Theme tint
    applyTheme(box);
    window.addEventListener('themeChanged', () => applyTheme(box));

    // Recreate if removed
    const obs = new MutationObserver(() => {
        if (!document.getElementById(DASHBOARD_ID)) {
            initMainDashboard();
        }
    });
    obs.observe(document.body, { childList: true, subtree: false });

    return box;
}

// Auto-initialization removed. The engine controller (src/engine/engine.js)
// now manages dashboard lifecycle via the DASHBOARD state handler in src/ui/dashboard.js.
// Call initMainDashboard() manually if needed outside the engine flow.
