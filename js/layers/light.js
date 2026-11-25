// LAYER: light — real lighting pass over the desk plane (multiply darkness + warm lit layer
// + soft cast shadows from candle and book). Driven by flame intensity, flicker, and lean.
import { clamp, rad } from '../lib/rand.js';

export function createLightLayer(shadowCanvas, multCanvas, warmCanvas, L) {
  const { w, h } = L.plane;
  const res = 0.25;
  const W = Math.round(w * res), H = Math.round(h * res);
  for (const cv of [shadowCanvas, multCanvas, warmCanvas]) {
    cv.width = W;
    cv.height = H;
    Object.assign(cv.style, { left: '0px', top: '0px', width: `${w}px`, height: `${h}px` });
  }
  const sctx = shadowCanvas.getContext('2d');
  const mctx = multCanvas.getContext('2d');
  const wctx = warmCanvas.getContext('2d');

  // Precompute book polygon in desk-plane coords for cast shadow
  const { x: bx, y: by, rot, leafW, leafH } = L.book;
  const a = rad(rot), ca = Math.cos(a), sa = Math.sin(a);
  const bPt = (lx, ly) => [bx + lx * ca - ly * sa, by + lx * sa + ly * ca];
  const corners = [
    bPt(-leafW - 18, -leafH / 2 - 12),
    bPt(leafW + 20, -leafH / 2 - 12),
    bPt(leafW + 20, leafH / 2 + 28),
    bPt(-leafW - 18, leafH / 2 + 28),
  ];

  let lastKey = '';

  return function updateLight(I, leanX, leanY, force = false) {
    // Quantise slightly when idle? No, 60fps at 600x425 is ~0.3ms in Canvas2D.
    const lx = L.candle.x + leanX * 42;
    const ly = L.candle.y + leanY * 26;
    const key = `${I.toFixed(3)},${lx.toFixed(1)},${ly.toFixed(1)}`;
    if (!force && key === lastKey) return;
    lastKey = key;

    const k = clamp(I, 0, 1.35);

    // 1. Soft cast shadows (on desk plane, below book/candle or between desk and book)
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, W, H);
    if (k > 0.01) {
      sctx.setTransform(res, 0, 0, res, 0, 0);

      // Book shadow onto desk: offset away from candle
      const dxB = bx - lx, dyB = by - ly;
      const dB = Math.hypot(dxB, dyB) || 1;
      const sx = (dxB / dB) * 34, sy = (dyB / dB) * 34;

      sctx.save();
      sctx.filter = 'blur(8px)';
      sctx.fillStyle = `rgba(6, 4, 2, ${0.72 * Math.min(k, 1)})`;
      sctx.beginPath();
      corners.forEach(([cx, cy], i) => {
        if (i === 0) sctx.moveTo(cx + sx, cy + sy);
        else sctx.lineTo(cx + sx, cy + sy);
      });
      sctx.closePath();
      sctx.fill();

      // Saucer + candle base shadow
      const scx = L.candle.x - leanX * 14, scy = L.candle.y - leanY * 10;
      const cg = sctx.createRadialGradient(scx, scy, L.candle.saucer * 0.55, scx, scy, L.candle.saucer * 1.48);
      cg.addColorStop(0, `rgba(6, 4, 2, ${0.78 * Math.min(k, 1)})`);
      cg.addColorStop(0.7, `rgba(6, 4, 2, ${0.35 * Math.min(k, 1)})`);
      cg.addColorStop(1, 'rgba(6, 4, 2, 0)');
      sctx.fillStyle = cg;
      sctx.beginPath();
      sctx.arc(scx, scy, L.candle.saucer * 1.48, 0, Math.PI * 2);
      sctx.fill();

      // Subtle elongated shadow cast by the candle body toward the book's near-left edge
      const castX = L.candle.x + (L.candle.x - lx) * 1.8;
      const castY = L.candle.y + (L.candle.y - ly) * 1.8;
      const bg = sctx.createRadialGradient(castX, castY, L.candle.r * 0.6, castX, castY, L.candle.r * 2.1);
      bg.addColorStop(0, `rgba(8, 5, 3, ${0.32 * Math.min(k, 1)})`);
      bg.addColorStop(1, 'rgba(8, 5, 3, 0)');
      sctx.fillStyle = bg;
      sctx.beginPath();
      sctx.arc(castX, castY, L.candle.r * 2.1, 0, Math.PI * 2);
      sctx.fill();
      sctx.restore();
    }

    // 2. Multiply pass: darkness everywhere, lifted by distance from the flame.
    // Right leaf (TOC) sits ~700-1200 desk units from the candle in landscape, so we tune
    // the falloff radius so the TOC stays clearly legible (WCAG AA) while far edges drop to near-black.
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    mctx.fillStyle = '#030202';
    mctx.fillRect(0, 0, W, H);

    if (k > 0.005) {
      mctx.setTransform(res, 0, 0, res, 0, 0);
      const Rmax = (L.name === 'portrait' ? 1480 : 1620) * (0.38 + 0.62 * Math.pow(k, 0.72));
      const mg = mctx.createRadialGradient(lx, ly, 20, lx, ly, Rmax);
      const peak = clamp(0.90 * Math.min(k * 1.04, 1.06), 0, 1);
      // Amber illumination falls into warmer, deeper shadows toward the edges.
      mg.addColorStop(0, `rgba(${Math.round(255 * peak)}, ${Math.round(226 * peak)}, ${Math.round(182 * peak)}, 1)`);
      mg.addColorStop(0.28, `rgba(${Math.round(244 * peak)}, ${Math.round(205 * peak)}, ${Math.round(158 * peak)}, 1)`);
      mg.addColorStop(0.56, `rgba(${Math.round(206 * peak)}, ${Math.round(163 * peak)}, ${Math.round(116 * peak)}, 1)`);
      mg.addColorStop(0.78, `rgba(${Math.round(112 * peak)}, ${Math.round(79 * peak)}, ${Math.round(50 * peak)}, 1)`);
      mg.addColorStop(0.93, `rgba(${Math.round(28 * peak)}, ${Math.round(22 * peak)}, ${Math.round(16 * peak)}, 1)`);
      mg.addColorStop(1, 'rgba(3, 2, 2, 1)');
      mctx.fillStyle = mg;
      mctx.fillRect(0, 0, w, h);
    }

    // 3. Warm, restrained bounce around the candle.
    wctx.setTransform(1, 0, 0, 1, 0, 0);
    wctx.clearRect(0, 0, W, H);
    if (k > 0.02) {
      wctx.setTransform(res, 0, 0, res, 0, 0);
      const Rw = (L.name === 'portrait' ? 980 : 1120) * (0.45 + 0.55 * k);
      const wg = wctx.createRadialGradient(lx, ly, 10, lx, ly, Rw);
      wg.addColorStop(0, `rgba(255, 193, 63, ${0.22 * Math.min(k, 1.25)})`);
      wg.addColorStop(0.35, `rgba(238, 166, 54, ${0.13 * Math.min(k, 1.2)})`);
      wg.addColorStop(0.75, `rgba(190, 126, 35, ${0.045 * Math.min(k, 1.1)})`);
      wg.addColorStop(1, 'rgba(140, 96, 52, 0)');
      wctx.fillStyle = wg;
      wctx.fillRect(0, 0, w, h);
    }
  };
}
