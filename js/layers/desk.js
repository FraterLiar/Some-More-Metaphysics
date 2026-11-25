// LAYER: desk — procedural wood, painted flat-lit (the light layer darkens it).
// Also used for the ritual room's floorboards.
import { makeNoise, mulberry32, clamp, lerp, smoothstep } from '../lib/rand.js';

export function paintWood(canvas, o) {
  const {
    w, h, res = 0.5, seed = 7, dir = 'h', boardW = 470, seamOffset = 0.37,
    base = [104, 78, 55], dark = [46, 32, 22], knots = [], gap = 2.2, scratches = 16,
  } = o;
  const W = Math.round(w * res), H = Math.round(h * res);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H), d = img.data;
  const N = makeNoise(seed), R = mulberry32(seed * 31 + 5);
  const boards = new Map();
  const board = (i) => {
    let b = boards.get(i);
    if (!b) {
      b = { shift: R() * 4000, tone: 0.84 + R() * 0.28, phase: R() * 50, warm: (R() - 0.5) * 0.07 };
      boards.set(i, b);
    }
    return b;
  };
  let k = 0;
  for (let py = 0; py < H; py++) {
    const y = py / res;
    for (let px = 0; px < W; px++, k += 4) {
      const x = px / res;
      const a = dir === 'h' ? x : y, b = dir === 'h' ? y : x; // along / across the grain
      const bf = b / boardW + seamOffset, bi = Math.floor(bf), B = board(bi);
      const bl = (bf - bi) * boardW;
      const al = a + B.shift;
      let bw = b + (N.fbm(al * 0.0013, b * 0.005 + B.phase, 3) - 0.5) * 130;
      let knot = 0;
      for (const kn of knots) {
        const da = (a - (dir === 'h' ? kn.x : kn.y)) / kn.len, db = (b - (dir === 'h' ? kn.y : kn.x)) / kn.r;
        const e = Math.exp(-(da * da + db * db));
        bw -= Math.sign(db) * e * kn.r * 0.85 * (1 - Math.exp(-Math.abs(db) * 2.5)); // grain flows round it
        knot = Math.max(knot, Math.exp(-(da * da * 9 + db * db) * 3.2));
      }
      const bands = N.fbm(al * 0.0011, bw * 0.02 + B.phase, 3);
      const rc = bw * 0.058 + N.n2(al * 0.0035, bw * 0.018 + B.phase) * 2.2;
      const fr = rc - Math.floor(rc);
      const ring = Math.pow(Math.abs(fr * 2 - 1), 6);
      const fine = N.n2(al * 0.011, bw * 0.6);
      const pore = smoothstep(0.64, 0.9, N.n2(al * 0.075, bw * 1.3));
      let v = clamp(0.16 + bands * 0.82 + (fine - 0.5) * 0.3 - ring * 0.36 - pore * 0.24 - knot * 0.7);
      let tone = B.tone;
      const seam = Math.min(bl, boardW - bl);
      if (seam < gap) tone *= 0.22 + 0.3 * (seam / gap);
      else if (seam < gap + 5) tone *= 0.86 + 0.14 * ((seam - gap) / 5);
      d[k] = lerp(dark[0], base[0], v) * tone * (1 + B.warm);
      d[k + 1] = lerp(dark[1], base[1], v) * tone;
      d[k + 2] = lerp(dark[2], base[2], v) * tone * (1 - B.warm);
      d[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // use: a few fine scratches, mostly across the grain where things were dragged
  ctx.scale(res, res);
  ctx.lineCap = 'round';
  for (let i = 0; i < scratches; i++) {
    const x = R() * w, y = R() * h, ang = (R() - 0.5) * 1.1 + (R() < 0.3 ? 1.3 : 0), len = 30 + R() * R() * 260;
    ctx.strokeStyle = R() < 0.7 ? `rgba(214,192,160,${0.03 + R() * 0.06})` : `rgba(14,9,5,${0.1 + R() * 0.15})`;
    ctx.lineWidth = 0.7 + R() * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(ang) * len * 0.5 + (R() - 0.5) * 12, y + Math.sin(ang) * len * 0.5 + (R() - 0.5) * 12, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }
}

export function paintDesk(canvas, L) {
  const p = L.plane;
  paintWood(canvas, {
    w: p.w, h: p.h, res: 0.6, seed: 11, dir: 'h', boardW: 520,
    knots: [{ x: L.book.x + 520, y: L.book.y - 470, r: 30, len: 120 }],
  });
}
