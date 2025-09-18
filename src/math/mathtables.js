// -------------------- ULTRA-FAST MATH TABLES --------------------
export const SIN_TABLE_SIZE = 1024;           // 2^10 for masking
export const FIXED_POINT_SHIFT = 16;          // 16-bit fractional
export const SIN_TABLE_MASK = SIN_TABLE_SIZE - 1;
export const ANGLE_SCALE = (SIN_TABLE_SIZE << FIXED_POINT_SHIFT) / (2 * Math.PI) | 0; // fixed-point scale

// Float tables for rendering (optional: can switch to fixed-point Int32Array if desired)
export const sinTable = new Float32Array(SIN_TABLE_SIZE);
export const cosTable = new Float32Array(SIN_TABLE_SIZE);

for (let i = 0; i < SIN_TABLE_SIZE; i++) {
    const angle = (i * 2 * Math.PI) / SIN_TABLE_SIZE;
    sinTable[i] = Math.sin(angle);
    cosTable[i] = Math.cos(angle);
}

// -------------------- FAST SIN/COS --------------------
// Branchless table indexing with bit shifts
export function fastSin(angle) {
    const idx = ((angle * ANGLE_SCALE) | 0) >>> FIXED_POINT_SHIFT & SIN_TABLE_MASK;
    return sinTable[idx];
}

export function fastCos(angle) {
    const idx = ((angle * ANGLE_SCALE) | 0) >>> FIXED_POINT_SHIFT & SIN_TABLE_MASK;
    return cosTable[idx];
}

// -------------------- ULTRA-FAST INVERSE SQRT --------------------
// Single typed array buffer reused to avoid allocation per call
const buf = new ArrayBuffer(4);
const f = new Float32Array(buf);
const i = new Uint32Array(buf);

export function Q_rsqrt(number) {
    const x2 = number * 0.5;
    f[0] = number;
    i[0] = 0x5f3759df - (i[0] >> 1); // Quake III magic number
    f[0] = f[0] * (1.5 - x2 * f[0] * f[0]); // 1 NR iteration for speed
    return f[0];
}
