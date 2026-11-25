// LAYER: book — cover boards, page blocks and paper leaves, painted flat-lit.
import { makeNoise, mulberry32, clamp, lerp, smoothstep, TAU } from '../lib/rand.js';

const FELL = '"IM Fell English", serif';
const FELL_SC = '"IM Fell English SC", "IM Fell English", serif';

// o: { w, h, res, seed, gutter: 'left'|'right', showThrough: [{text, size, sc, italic}], showAt: [x, y], lineGap }
export function paintPaper(canvas, o) {
  const { w, h, seed, gutter = 'left', res = 1.5 } = o;
  const lw = Math.round(w), lh = Math.round(h);
  const low = document.createElement('canvas');
  low.width = lw;
  low.height = lh;
  const lctx = low.getContext('2d');
  const img = lctx.createImageData(lw, lh), d = img.data;
  const N = makeNoise(seed), R = mulberry32(seed + 99);
  const base = o.base || [205, 195, 170], brown = [142, 118, 88];
  const rTop = 5 + R() * 9, rBot = 9 + R() * 16; // fore-edge corners, worn by thumbs
  let k = 0;
  for (let y = 0; y < lh; y++) {
    for (let x = 0; x < lw; x++, k += 4) {
      const gx = gutter === 'right' ? w - x : x, ox = w - gx; // from gutter / from fore-edge
      const ey = Math.min(y, h - y);
      let e = Math.min(ox, ey);
      const rr = y < h / 2 ? rTop : rBot;
      if (ox < rr && ey < rr) e = rr - Math.hypot(rr - ox, rr - ey);
      const rag = (N.n2(x * 0.085, y * 0.085) - 0.5) * 3.2 + (N.n2(x * 0.45, y * 0.45) - 0.5) * 1.1;
      const alpha = smoothstep(0, 1.5, Math.min(e + rag - 1.1, gx < 2 ? 9 : 99));
      const eb = Math.min(e, gx * 2.4 + 26);
      const mott = N.fbm(x * 0.0052, y * 0.0052, 4) * 0.55 + N.fbm(x * 0.031, y * 0.031, 2) * 0.3 + N.n2(x * 0.22, y * 0.22) * 0.15;
      const tone = Math.exp(-eb / 44) * (0.5 + 1.0 * N.n2(x * 0.011 + 40, y * 0.011));
      const t = clamp(tone * 0.6 + (0.5 - mott) * 0.24);
      const l = 0.93 + mott * 0.11;
      d[k] = lerp(base[0] * l, brown[0], t);
      d[k + 1] = lerp(base[1] * l, brown[1], t);
      d[k + 2] = lerp(base[2] * l, brown[2], t);
      d[k + 3] = alpha * 255;
    }
  }
  lctx.putImageData(img, 0, 0);

  canvas.width = Math.round(w * res);
  canvas.height = Math.round(h * res);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(low, 0, 0, canvas.width, canvas.height);
  ctx.scale(res, res);
  ctx.globalCompositeOperation = 'source-atop'; // everything below stays inside the sheet

  // chain lines of the mould, barely there
  for (let x = 19 + R() * 20; x < w; x += 46.5) {
    ctx.fillStyle = 'rgba(110,90,62,0.05)';
    ctx.fillRect(x, 0, 1.3, h);
  }
  // fibres
  ctx.lineCap = 'round';
  const fibres = Math.round((w * h) / 380);
  for (let i = 0; i < fibres; i++) {
    const x = R() * w, y = R() * h, a = R() * TAU, len = 2.5 + R() * R() * 15;
    ctx.strokeStyle = R() < 0.62 ? `rgba(84,64,40,${0.05 + R() * 0.09})` : `rgba(244,236,214,${0.07 + R() * 0.1})`;
    ctx.lineWidth = 0.35 + R() * 0.45;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a + 0.5) * len * 0.5, y + Math.sin(a + 0.5) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  // foxing: mostly near the edges, plus one colony
  const spot = (x, y, r, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(126,88,52,${a})`);
    g.addColorStop(0.55, `rgba(132,96,60,${a * 0.55})`);
    g.addColorStop(1, 'rgba(132,96,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  const colony = [w * (0.2 + R() * 0.6), h * (0.15 + R() * 0.7)];
  const count = Math.round(30 * (o.foxing ?? 1));
  for (let i = 0; i < count; i++) {
    let x = R() * w, y = R() * h;
    if (i % 5 === 0) { x = colony[0] + (R() - 0.5) * 70; y = colony[1] + (R() - 0.5) * 60; }
    else if (R() < 0.6) {
      const dEdge = R() * R() * 110;
      const side = R();
      if (side < 0.45) x = gutter === 'right' ? dEdge : w - dEdge;
      else if (side < 0.72) y = dEdge;
      else y = h - dEdge;
    }
    spot(x, y, 1.3 + R() * R() * R() * 11, 0.1 + R() * 0.26);
  }

  // ink of the other side, showing through in mirror
  if (o.showThrough?.length) {
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.textAlign = o.showAlign || 'center';
    ctx.textBaseline = 'alphabetic';
    const [sx, sy] = o.showAt || [w / 2, h * 0.24];
    let y = sy;
    for (const line of o.showThrough) {
      const size = line.size || 24;
      ctx.font = `${line.italic ? 'italic ' : ''}${size}px ${line.sc ? FELL_SC : FELL}`;
      const x = sx + (line.dx || 0);
      for (let pass = 0; pass < 5; pass++) { // cheap blur: the ink has spread through the sheet
        ctx.fillStyle = `rgba(66,48,30,${(o.showAlpha ?? 0.034) * (0.7 + R() * 0.6)})`;
        ctx.fillText(line.text, x + (R() - 0.5) * 1.5, y + (R() - 0.5) * 1.5);
      }
      y += line.gap ?? size * 1.5;
    }
    ctx.restore();
  }

  // the sheet dips into the gutter
  const gx0 = gutter === 'right' ? w : 0, gx1 = gutter === 'right' ? w - 70 : 70;
  const g = ctx.createLinearGradient(gx0, 0, gx1, 0);
  g.addColorStop(0, 'rgba(58,42,26,0.42)');
  g.addColorStop(0.35, 'rgba(58,42,26,0.14)');
  g.addColorStop(1, 'rgba(58,42,26,0)');
  ctx.fillStyle = g;
  ctx.fillRect(Math.min(gx0, gx1), 0, 70, h);
}

// Cover boards and the stacks of pages under the two open leaves.
// Canvas origin is the gutter's centre; the thin stack is on the left (we are near the front of the book).
export function bookBaseBox(L) {
  const { leafW: W, leafH: H } = L.book;
  return { x: -W - 44, y: -H / 2 - 40, w: 2 * W + 88, h: H + 90 };
}

export function paintBookBase(canvas, L, seed = 5) {
  const { leafW: W, leafH: H } = L.book;
  const box = bookBaseBox(L), res = 1.5;
  canvas.width = Math.round(box.w * res);
  canvas.height = Math.round(box.h * res);
  const ctx = canvas.getContext('2d');
  ctx.scale(res, res);
  ctx.translate(-box.x, -box.y);
  const R = mulberry32(seed), N = makeNoise(seed);
  const top = -H / 2, bot = H / 2;

  // boards: dark calf, rubbed pale at the corners and along the edges
  const cx0 = -W - 17, cx1 = W + 19, cy0 = top - 11, cy1 = bot + 27;
  const boards = new Path2D();
  boards.roundRect(cx0, cy0, cx1 - cx0, cy1 - cy0, 6);
  ctx.fillStyle = 'rgb(47,37,31)';
  ctx.fill(boards);
  ctx.save();
  ctx.clip(boards);
  for (let i = 0; i < 2600; i++) {
    const x = cx0 + R() * (cx1 - cx0), y = cy0 + R() * (cy1 - cy0);
    const edge = Math.min(x - cx0, cx1 - x, y - cy0, cy1 - y);
    const corner = Math.min(Math.hypot(x - cx0, y - cy1), Math.hypot(x - cx1, y - cy1), Math.hypot(x - cx0, y - cy0), Math.hypot(x - cx1, y - cy0));
    const rub = Math.exp(-edge / 3.5) * 0.5 + Math.exp(-corner / 16) * 0.8;
    ctx.fillStyle = R() < rub ? `rgba(128,104,80,${0.25 + R() * 0.4})` : `rgba(${R() < 0.5 ? '20,14,10' : '74,58,46'},${0.08 + R() * 0.14})`;
    ctx.fillRect(x, y, 0.8 + R() * 2.2, 0.8 + R() * 1.6);
  }
  // the spine, seen in the gap at head and tail
  const sg = ctx.createLinearGradient(-22, 0, 22, 0);
  sg.addColorStop(0, 'rgba(10,6,4,0)');
  sg.addColorStop(0.5, 'rgba(10,6,4,0.7)');
  sg.addColorStop(1, 'rgba(10,6,4,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(-22, cy0, 44, cy1 - cy0);
  ctx.restore();

  // page blocks: left is a few leaves, right is nearly the whole book
  const block = (x0, x1, y1, foreW, left) => {
    ctx.fillStyle = 'rgb(168,152,122)';
    ctx.beginPath();
    ctx.roundRect(left ? x0 - foreW : x0, top + 1.5, x1 - x0 + foreW, y1 - top - 1.5, 2);
    ctx.fill();
    // fore-edge: each leaf sits a hair further out
    for (let i = 0; i < foreW / 1.25; i++) {
      const x = left ? x0 - i * 1.25 : x1 + i * 1.25;
      ctx.fillStyle = `rgba(${i % 2 ? '96,80,58' : '196,182,152'},${0.5 + R() * 0.4})`;
      ctx.fillRect(x - (left ? 1.25 : 0), top + 2 + i * 0.5 + N.n1(i * 0.7) * 1.5, 1.25, y1 - top - 3 - i * 0.8);
    }
    // tail edge: the near face of the stack
    for (let y = bot; y < y1; y += 1.3) {
      ctx.fillStyle = `rgba(${Math.round(y * 10) % 2 ? '92,76,54' : '186,170,138'},${0.45 + R() * 0.45})`;
      const inset = (y - bot) * 0.6;
      ctx.fillRect(left ? x0 - foreW + inset : x0, y, x1 - x0 + foreW - inset, 1.3);
    }
    const sh = ctx.createLinearGradient(0, bot, 0, y1);
    sh.addColorStop(0, 'rgba(30,20,12,0.05)');
    sh.addColorStop(1, 'rgba(30,20,12,0.5)');
    ctx.fillStyle = sh;
    ctx.fillRect(left ? x0 - foreW : x0, bot, x1 - x0 + foreW, y1 - bot);
  };
  block(-W, 0, bot + 6, 4, true);
  block(0, W, bot + 17, 13, false);
}
