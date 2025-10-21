// Hacky theme: neon / hacker aesthetic with mild glitches
export const HACKY_THEME = {
    background: '#071821',
    headerBg: '#0b3b3f',
    border: '#39ff14',
    text: '#00ff9f',
    danger: '#ff006e',
    warning: '#ffd400',
    good: '#00ff9f',
    graphBg: 'rgba(57,255,20,0.06)',
    resizeHandle: '#39ff14',
    resizeBorder: '#39ff14',
    scanlines: 'rgba(57,255,20,0.04)',
    corruption: 'rgba(57,255,20,0.08)',
    buttonBg: '#001220',
    buttonHover: '#002933',
    smear: 'rgba(57,255,20,0.12)',
    glow: true
};

export function getLogColor(type) {
    return ({ debug: '#00ff9f', error: '#ff006e', warn: '#ffd400', info: '#00ff9f', log: '#00ff9f' }[type] || '#00ff9f');
}

export function getPerformanceColor(value, thresholds = [70, 85]) {
    if (value < thresholds[0]) return '#00ff9f';
    if (value < thresholds[1]) return '#ffd400';
    return '#ff006e';
}
