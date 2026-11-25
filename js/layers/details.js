// LAYER: details — the one extra object. A cold ring left by a mug that is no longer here,
// set down half on the book. On paper it is a brown tide-line; on wood and calf, a dull bloom.
import { makeNoise, smoothstep, TAU, rad } from '../lib/rand.js';
import { bookToPlane } from '../lib/stage.js';

export function paintRing(canvas, L, seed = 4) {
  const { bx, by, r } = L.ring, { leafW: W, leafH: H } = L.book;
  const [cx, cy] = bookToPlane(L, bx, by);
  const size = 2 * r + 60, res = 2;
  canvas.width = canvas.height = size * res;
  Object.assign(canvas.style, { left: `${cx - size / 2}px`, top: `${cy - size / 2}px`, width: `${size}px`, height: `${size}px` });
  const ctx = canvas.getContext('2d');
  ctx.scale(res, res);
  ctx.translate(size / 2, size / 2);
  ctx.lineCap = 'round';
  const N = makeNoise(seed);

  const leaves = () => { // the paper area, in this canvas's space
    ctx.translate(L.book.x - cx, L.book.y - cy);
    ctx.rotate(rad(L.book.rot));
    ctx.rect(-W + 1, -H / 2 + 1, 2 * W - 2, H - 2);
  };
  const ring = (draw) => {
    const n = 260;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, c = Math.cos(a), s = Math.sin(a);
      const rr = r * (1 + (N.n2(c * 1.2 + 5, s * 1.2 + 5) - 0.5) * 0.05), ex = 1.04; // a mug's foot is never quite round
      const k = smoothstep(0.22, 0.62, N.n2(c * 1.3 + 9, s * 1.3 + 3)) * (0.75 + 0.5 * N.n2(c * 6 + 2, s * 6 + 8));
      const a2 = a + TAU / n + 0.004;
      draw(k, (o) => { ctx.beginPath(); ctx.ellipse(0, 0, (rr + o) * ex, rr + o, 0.4, a, a2); ctx.stroke(); });
    }
  };

  ctx.save();
  ctx.beginPath();
  leaves();
  ctx.clip();
  ctx.setTransform(res, 0, 0, res, (size / 2) * res, (size / 2) * res);
  ctx.fillStyle = 'rgba(132,100,62,0.045)';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.04, r, 0.4, 0, TAU);
  ctx.fill();
  ring((k, arc) => {
    ctx.strokeStyle = `rgba(120,88,52,${0.12 * k})`; ctx.lineWidth = 7; arc(-4.5);
    ctx.strokeStyle = `rgba(98,66,36,${0.5 * k})`; ctx.lineWidth = 1.5; arc(0);
    ctx.strokeStyle = `rgba(98,66,36,${0.16 * k})`; ctx.lineWidth = 3.2; arc(-1);
  });
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(-size, -size, 2 * size, 2 * size);
  leaves();
  ctx.clip('evenodd');
  ctx.setTransform(res, 0, 0, res, (size / 2) * res, (size / 2) * res);
  ring((k, arc) => {
    ctx.strokeStyle = `rgba(206,188,154,${0.13 * k})`; ctx.lineWidth = 3; arc(-1.2);
    ctx.strokeStyle = `rgba(12,8,5,${0.3 * k})`; ctx.lineWidth = 0.9; arc(0.8);
  });
  ctx.restore();
}
