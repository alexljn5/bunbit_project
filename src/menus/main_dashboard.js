import { SCALE_X, SCALE_Y } from '../globals.js';
import { themeManager } from '../themes/thememanager.js';

const DASHBOARD_ID = 'bunbit-main-dashboard';

function ensureKeyframes() {
    if (document.getElementById('bunbit-sigil-spin-style')) return;
    const style = document.createElement('style');
    style.id = 'bunbit-sigil-spin-style';
    style.textContent = `
@keyframes bunbit-sigil-spin {
  from { transform: translate(-50%, 0) rotate(0deg); }
  to { transform: translate(-50%, 0) rotate(360deg); }
}
`;
    document.head.appendChild(style);
}

function ensureDashboardBox() {
    let el = document.getElementById(DASHBOARD_ID);
    if (el) return el;

    el = document.createElement('div');
    el.id = DASHBOARD_ID;

    // Match the old “debug panel spanning box” positioning model.
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

function mountDashboardContent(container) {
    // Prevent double-mount
    if (container.querySelector('[data-dashboard-content="1"]')) return;

    const content = document.createElement('div');
    content.dataset.dashboardContent = '1';
    content.style.position = 'absolute';
    content.style.inset = '0';
    content.style.pointerEvents = 'none';
    content.style.zIndex = '0';

    // === Pillars (real textures when available in your repo) ===
    const pillarSrc = 'img/menu/main/pillar.png';

    const pillarOffsetFactor = 0.35;
    function createPillarImg(side) {
        const img = document.createElement('img');
        img.src = pillarSrc;
        img.alt = '';
        img.style.position = 'absolute';
        img.style.top = '0%';
        img.style.bottom = '0%';
        img.style.width = '512px';
        img.style.height = '100%';
        img.style.maxWidth = '60%';
        img.style.transform = 'translate(-50%, 0)';

        img.style.filter = 'brightness(4.90) contrast(10.15) saturate(10.2)';
        img.style.mixBlendMode = 'overlay';
        img.style.borderRadius = '18%';
        img.style.clipPath = 'ellipse(48% 40% at 50% 50%)';
        img.style.boxShadow = '0 12px 40px rgba(0,0,0,0.55)';
        img.style.pointerEvents = 'none';
        img.style.opacity = '0.94';
        img.style.zIndex = '0';

        const direction = side === 'left' ? -1 : 1;
        img.style.left = `calc(50% + (${direction} * ${pillarOffsetFactor} * 60vw))`;
        return img;
    }

    const pillarLeftEl = createPillarImg('left');
    const pillarRightEl = createPillarImg('right');

    // === Stairs texture ===
    const stairsSrc = 'img/menu/main/stairs.png';
    const stairsEl = document.createElement('img');
    stairsEl.src = stairsSrc;
    stairsEl.alt = '';
    stairsEl.style.position = 'absolute';
    stairsEl.style.left = '50%';
    stairsEl.style.bottom = '8%';
    stairsEl.style.transform = 'translate(-50%, 0) perspective(600px) rotateX(12deg)';
    stairsEl.style.width = '640px';
    stairsEl.style.height = 'auto';
    stairsEl.style.maxWidth = '45%';
    stairsEl.style.zIndex = '1';
    stairsEl.style.filter = 'brightness(4.90) contrast(10.15) saturate(10.2)';
    stairsEl.style.mixBlendMode = 'overlay';
    stairsEl.style.opacity = '0.85';
    stairsEl.style.pointerEvents = 'none';

    // === Sigil spinning + bunny face ===
    const sigilSrc = 'img/logo/logo-ascii-transparent-sigil-blend.png';
    const faceSrc = 'img/logo/logo-ascii.png';

    const sigilEl = document.createElement('img');
    sigilEl.src = sigilSrc;
    sigilEl.alt = '';
    Object.assign(sigilEl.style, {
        position: 'absolute',
        left: '50%',
        top: '30%',
        transform: 'translate(-50%, 0)',
        width: '320px',
        height: '320px',
        maxWidth: '50%',
        filter: 'brightness(4.90) contrast(10.15) saturate(10.2)',
        mixBlendMode: 'overlay',
        clipPath: 'ellipse(50% 50% at 50% 50%)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
        pointerEvents: 'none',
        zIndex: '0'
    });
    sigilEl.style.animation = 'bunbit-sigil-spin 25s linear infinite';

    const faceEl = document.createElement('img');
    faceEl.src = faceSrc;
    faceEl.alt = '';
    Object.assign(faceEl.style, {
        position: 'absolute',
        left: '50%',
        top: '38%',
        transform: 'translate(-50%, 0)',
        width: '128px',
        height: '128px',
        maxWidth: '55%',
        filter: 'brightness(105.5) contrast(120) saturate(18)',
        mixBlendMode: 'overlay',
        boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
        pointerEvents: 'none',
        opacity: '1.7',
        zIndex: '1'
    });

    content.appendChild(sigilEl);
    content.appendChild(faceEl);
    content.appendChild(pillarLeftEl);
    content.appendChild(pillarRightEl);
    content.appendChild(stairsEl);

    container.appendChild(content);
}

export function initMainDashboard() {
    if (typeof document === 'undefined') return;
    ensureKeyframes();
    const box = ensureDashboardBox();
    mountDashboardContent(box);

    // Theme tint
    const applyTheme = () => {
        try {
            const t = themeManager?.getCurrentTheme?.();
            if (t?.border) box.style.borderColor = t.border;
        } catch (_) { }
    };
    applyTheme();
    window.addEventListener('themeChanged', applyTheme);

    // Recreate if removed
    const obs = new MutationObserver(() => {
        if (!document.getElementById(DASHBOARD_ID)) {
            initMainDashboard();
        }
    });
    obs.observe(document.body, { childList: true, subtree: false });

    return box;
}

// Auto-initialize on page load
if (typeof document !== 'undefined') {
    const initWithRetry = () => {
        if (!document.body) {
            setTimeout(initWithRetry, 100);
            return;
        }
        initMainDashboard();
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWithRetry);
    } else {
        initWithRetry();
    }
}

