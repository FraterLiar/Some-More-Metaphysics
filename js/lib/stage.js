import { clamp, rad } from './rand.js';

// All scene coordinates are "desk units": pixels on the un-tilted desk plane.
// The plane is tilted with CSS 3D; project() reproduces that maths so upright
// things (the candle) can be placed in stage space.
export const LAYOUTS = {
  landscape: {
    name: 'landscape',
    stageW: 1600, stageH: [900, 900], anchorDy: 0,
    tilt: 38, perspective: 3000, zoom: 1,
    plane: { w: 2400, h: 1700, ox: 1200, oy: 850 },
    candle: { x: 676, y: 936, r: 70, h: 400, saucer: 122 },
    book: { x: 1362, y: 842, rot: -3.5, leafW: 520, leafH: 680 },
    ring: { bx: -548, by: 372, r: 78 },
  },
  portrait: {
    name: 'portrait',
    stageW: 800, stageH: [1500, 1800], anchorDy: 65,
    tilt: 32, perspective: 3000, zoom: 1.08,
    plane: { w: 2000, h: 2400, ox: 1000, oy: 1200 },
    candle: { x: 815, y: 660, r: 70, h: 400, saucer: 122 },
    book: { x: 780, y: 1310, rot: 3, leafW: 520, leafH: 880 },
    ring: { bx: 392, by: 486, r: 78 },
  },
};

export function fitStage(stage, pick = (vw, vh) => (vw / vh < 0.8 ? 'portrait' : 'landscape')) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const L = LAYOUTS[pick(vw, vh)];
  const H = clamp((L.stageW * vh) / vw, L.stageH[0], L.stageH[1]);
  const scale = Math.min(vw / L.stageW, vh / H);
  const anchor = [L.stageW / 2, H / 2 + L.anchorDy];
  const s = stage.style;
  s.width = `${L.stageW}px`;
  s.height = `${H}px`;
  s.transform = `translate(${(vw - L.stageW * scale) / 2}px, ${(vh - H * scale) / 2}px) scale(${scale})`;
  s.perspective = `${L.perspective}px`;
  s.perspectiveOrigin = `${anchor[0]}px ${anchor[1]}px`;
  stage.dataset.layout = L.name;
  return { L, H, scale, anchor };
}

export function placePlane(plane, fit) {
  const { L, anchor } = fit;
  const s = plane.style;
  s.width = `${L.plane.w}px`;
  s.height = `${L.plane.h}px`;
  s.left = `${anchor[0] - L.plane.ox}px`;
  s.top = `${anchor[1] - L.plane.oy}px`;
  s.transformOrigin = `${L.plane.ox}px ${L.plane.oy}px`;
  s.transform = `rotateX(${L.tilt}deg) scale(${L.zoom})`;
}

// desk units (+ height above the desk) -> stage pixels, plus local scale
export function projector(fit) {
  const { L, anchor } = fit;
  const c = Math.cos(rad(L.tilt)), s = Math.sin(rad(L.tilt)), P = L.perspective, k = L.zoom;
  return (x, y, h = 0) => {
    const dx = (x - L.plane.ox) * k, dy = (y - L.plane.oy) * k, hz = h * k;
    const Y = dy * c - hz * s, Z = dy * s + hz * c, f = P / (P - Z);
    return { x: anchor[0] + dx * f, y: anchor[1] + Y * f, s: f * k };
  };
}

// book-local (origin at the gutter's centre) -> desk units
export function bookToPlane(L, bx, by) {
  const a = rad(L.book.rot), c = Math.cos(a), s = Math.sin(a);
  return [L.book.x + bx * c - by * s, L.book.y + bx * s + by * c];
}

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function stagePoint(stage, clientX, clientY, scale) {
  const r = stage.getBoundingClientRect();
  return [(clientX - r.left) / scale, (clientY - r.top) / scale];
}
