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

export { ensureKeyframes, DASHBOARD_ID };
