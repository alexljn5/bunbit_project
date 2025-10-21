// Calm theme: minimal glitches, muted colors
export const CALM_THEME = {
    background: '#0b1f2b',
    headerBg: '#12303c',
    border: '#2a5361',
    text: '#dff3f5',
    danger: '#ff9f1c',
    warning: '#ffd166',
    good: '#7bd389',
    graphBg: 'rgba(47,79,79,0.08)',
    resizeHandle: '#2a5361',
    resizeBorder: '#2a5361',
    scanlines: 'rgba(255,255,255,0.02)',
    corruption: 'rgba(0,0,0,0)',
    buttonBg: '#12303c',
    buttonHover: '#0f3b45',
    smear: 'rgba(255,255,255,0.02)',
    glow: false
};

export function getLogColor(type) {
    return ({ debug: '#7bd389', error: '#ff9f1c', warn: '#ffd166', info: '#dff3f5', log: '#dff3f5' }[type] || '#dff3f5');
}

export function getPerformanceColor(value, thresholds = [70, 85]) {
    if (value < thresholds[0]) return '#7bd389';
    if (value < thresholds[1]) return '#ffd166';
    return '#ff9f1c';
}
