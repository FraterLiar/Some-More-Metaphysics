export const TAU = Math.PI * 2;
export const rad = (deg) => (deg * Math.PI) / 180;
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeNoise(seed = 1) {
  const rnd = mulberry32(seed);
  const perm = new Uint8Array(512);
  const val = new Float32Array(256);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0;
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  for (let i = 0; i < 256; i++) val[i] = rnd();

  const n1 = (x) => {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return val[perm[i & 255]] * (1 - u) + val[perm[(i + 1) & 255]] * u;
  };
  const n2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = perm[xi & 255], b = perm[(xi + 1) & 255], y0 = yi & 255, y1 = (yi + 1) & 255;
    const v00 = val[perm[a + y0]], v10 = val[perm[b + y0]], v01 = val[perm[a + y1]], v11 = val[perm[b + y1]];
    return (v00 + (v10 - v00) * u) * (1 - v) + (v01 + (v11 - v01) * u) * v;
  };
  const fbm = (x, y, oct = 3) => {
    let s = 0, a = 0.5, n = 0;
    for (let i = 0; i < oct; i++) {
      s += a * n2(x, y);
      n += a;
      x = x * 2.03 + 17.1;
      y = y * 2.03 + 9.7;
      a *= 0.5;
    }
    return s / n;
  };
  return { n1, n2, fbm, rnd };
}

export const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// A wobbly open path through points, as an SVG path string (quadratic through midpoints).
export function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const l = pts[pts.length - 1];
  return d + ` L${l[0].toFixed(1)} ${l[1].toFixed(1)}`;
}
