// LAYER: candle — the saucer lies on the desk plane; the wax body, its carving and the
// flame stand upright and are drawn in stage space using the same projection as the plane.
import { makeNoise, mulberry32, clamp, lerp, TAU, rad } from '../lib/rand.js';

const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export function paintSaucer(canvas, L, seed = 21) {
  const c = L.candle, R0 = c.saucer, size = 2 * (R0 + 8), res = 1.5;
  canvas.width = canvas.height = Math.round(size * res);
  Object.assign(canvas.style, { left: `${c.x - size / 2}px`, top: `${c.y - size / 2}px`, width: `${size}px`, height: `${size}px` });
  const ctx = canvas.getContext('2d');
  ctx.scale(res, res);
  ctx.translate(size / 2, size / 2);
  const R = mulberry32(seed), N = makeNoise(seed);

  // glazed earthenware, a dull off-white
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R0);
  for (const [t, r, gg, b] of [[0, 140, 133, 120], [0.55, 150, 143, 130], [0.6, 110, 103, 91], [0.65, 160, 153, 140], [0.9, 171, 165, 152], [0.965, 188, 182, 170], [1, 134, 127, 114]]) g.addColorStop(t, `rgb(${r},${gg},${b})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, R0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 90; i++) { // pinholes and specks in the glaze
    const a = R() * TAU, r = Math.sqrt(R()) * R0;
    ctx.fillStyle = `rgba(70,60,48,${0.1 + R() * 0.25})`;
    ctx.fillRect(Math.cos(a) * r, Math.sin(a) * r, 0.6 + R() * 1.1, 0.6 + R() * 1.1);
  }
  ctx.restore();

  // the chip: a bite out of the rim showing the clay body, and the crack that will finish the job
  const a0 = L.name === 'portrait' ? 2.35 : 0.72, half = 0.15;
  const bite = (depth, jag) => {
    const p = new Path2D();
    for (let i = 0; i <= 10; i++) { const a = a0 - half + (2 * half * i) / 10; p.lineTo(Math.cos(a) * (R0 + 2), Math.sin(a) * (R0 + 2)); }
    for (let i = 10; i >= 0; i--) {
      const u = (i / 10) * 2 - 1, a = a0 + half * u;
      const r = R0 - depth * Math.pow(1 - u * u, 0.6) - (N.n1(i * 1.7 + depth) - 0.5) * jag;
      p.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    p.closePath();
    return p;
  };
  ctx.fillStyle = 'rgb(124,101,80)';
  ctx.fill(bite(13, 3));
  ctx.strokeStyle = 'rgba(60,46,34,0.55)';
  ctx.lineWidth = 0.8;
  ctx.stroke(bite(13, 3));
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fill(bite(6.5, 2.5));
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'rgba(58,48,38,0.5)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (let i = 0; i <= 8; i++) {
    const r = R0 - 12 - i * 5.5, a = a0 + 0.03 + (N.n1(i * 0.9) - 0.5) * 0.09;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.stroke();

  // spilled wax pooled round the foot, with one run toward the rim
  const runA = L.name === 'portrait' ? 0.9 : 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * TAU;
    const r = c.r * (1.1 + 0.1 * N.n2(Math.cos(a) * 1.4 + 3, Math.sin(a) * 1.4 + 3)) + c.r * 0.5 * Math.exp(-Math.pow(angDiff(a, runA) / 0.3, 2));
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgb(200,188,162)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(70,56,40,0.35)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  const ao = ctx.createRadialGradient(0, 0, c.r * 0.9, 0, 0, c.r * 1.5);
  ao.addColorStop(0, 'rgba(22,15,9,0.55)');
  ao.addColorStop(1, 'rgba(22,15,9,0)');
  ctx.fillStyle = ao;
  ctx.fillRect(-R0, -R0, 2 * R0, 2 * R0);
}

export function candleGeometry(L, project) {
  const c = L.candle, b = project(c.x, c.y, 0), t = project(c.x, c.y, c.h), cosT = Math.cos(rad(L.tilt));
  return {
    bx: b.x, by: b.y, tx: t.x, ty: t.y, h: c.h, r: c.r, s: t.s, sinT: Math.sin(rad(L.tilt)), cosT,
    rxB: c.r * b.s, ryB: c.r * b.s * cosT, rxT: c.r * t.s, ryT: c.r * t.s * cosT,
  };
}

// An intentionally small palette shared by the wax, engraving and embers.
const WAX = {
  ink: '#292322', shadow: '#403431', dark: '#554640', mid: '#6d5a4f',
  wax: '#887463', light: '#ac9880', pale: '#cdbc9e', rim: '#ddcfb1',
  rust: '#7e3025', ember: '#d65a32', emberLight: '#f5a358',
};

// Draw polygons and lines directly on a small, integer grid. The shading bands,
// texture clusters and drips are composed on that grid rather than filtering a
// smooth drawing. The result is enlarged with nearest-neighbour interpolation.
export function paintCandle(canvas, carve, g) {
  const box = {
    x: Math.min(g.tx - g.rxT, g.bx - g.rxB) - 26,
    y: g.ty - g.ryT - 18,
    w: Math.max(g.tx + g.rxT, g.bx + g.rxB) - Math.min(g.tx - g.rxT, g.bx - g.rxB) + 52,
    h: g.by + g.ryB - (g.ty - g.ryT - 18) + 12,
  };
  const pixel = 2.5 * g.s;
  const width = Math.ceil(box.w / pixel), height = Math.ceil(box.h / pixel);
  for (const cv of [canvas, carve]) {
    cv.width = width;
    cv.height = height;
    Object.assign(cv.style, { left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px` });
  }
  const ctx = canvas.getContext('2d'), glow = carve.getContext('2d');
  const pt = (x, y) => [Math.round((x - box.x) / pixel), Math.round((y - box.y) / pixel)];
  const px = (c, x, y, color, w = 1, h = 1) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), w, h); };
  const line = (c, a, b, color, thickness = 1) => {
    let [x, y] = a, [x1, y1] = b;
    const dx = Math.abs(x1 - x), dy = Math.abs(y1 - y), sx = x < x1 ? 1 : -1, sy = y < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      px(c, x, y, color, thickness, thickness);
      if (x === x1 && y === y1) break;
      const e = 2 * err;
      if (e > -dy) { err -= dy; x += sx; }
      if (e < dx) { err += dx; y += sy; }
    }
  };
  const polygon = (c, points, color) => {
    const minY = Math.min(...points.map(p => p[1])), maxY = Math.max(...points.map(p => p[1]));
    for (let y = minY; y <= maxY; y++) {
      const xs = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) px(c, Math.ceil(xs[i]), y, color, Math.max(1, Math.floor(xs[i + 1]) - Math.ceil(xs[i]) + 1));
    }
  };
  const outline = (c, points, color) => points.forEach((p, i) => line(c, p, points[(i + 1) % points.length], color));
  const ellipse = (c, cx, cy, rx, ry, color) => {
    for (let y = -ry; y <= ry; y++) {
      const x = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2)));
      px(c, cx - x, cy + y, color, x * 2 + 1);
    }
  };
  const surf = (phi, z) => {
    const t = z / g.h;
    return [lerp(g.tx, g.bx, t) + lerp(g.rxT, g.rxB, t) * Math.sin(phi), lerp(g.ty, g.by, t) + lerp(g.ryT, g.ryB, t) * Math.cos(phi)];
  };
  const S = (phi, z) => pt(...surf(phi, z));

  // Tapered, tilted silhouette: the front of the lower ellipse and the back of
  // the upper rim follow the same projection as the original candle.
  const body = [];
  for (let i = 0; i <= 24; i++) body.push(S(-Math.PI / 2 + Math.PI * i / 24, g.h));
  for (let i = 0; i <= 24; i++) body.push(S(Math.PI / 2 + Math.PI * i / 24, 0));
  polygon(ctx, body, WAX.shadow);

  // Narrow, overlapping stepped bands make the wax feel cylindrical; ordered
  // clusters at their boundaries suggest etched stipple without noisy specks.
  const bands = [
    { a: -1.12, b: -0.78, color: WAX.dark },
    { a: -0.78, b: -0.34, color: WAX.mid },
    { a: -0.34, b: 0.14, color: WAX.wax },
    { a: 0.14, b: 0.52, color: WAX.mid },
    { a: 0.52, b: 0.90, color: WAX.dark },
  ];
  for (const band of bands) {
    const points = [];
    for (let z = 0; z <= g.h; z += 8) points.push(S(band.a, z));
    for (let z = g.h; z >= 0; z -= 8) points.push(S(band.b, z));
    polygon(ctx, points, band.color);
  }
  for (const phi of [-0.78, -0.34, 0.14, 0.52, 0.9]) {
    for (let z = 20; z < g.h - 10; z += 8) {
      const [x, y] = S(phi, z);
      if (Math.floor(z / 8) % 3 !== 1) {
        px(ctx, x + (Math.floor(z / 8) % 2), y, WAX.dark);
        if (Math.floor(z / 8) % 4 === 0) px(ctx, x + 2, y + 1, WAX.light);
      }
    }
  }
  // Short vertical scratches, placed in clusters rather than random noise.
  for (const [phi, z, len, col] of [[-1.04,85,53,WAX.mid],[-0.57,212,79,WAX.wax],[-0.18,250,52,WAX.light],[0.37,223,92,WAX.dark],[0.73,205,55,WAX.mid],[0.96,270,63,WAX.ink]]) {
    line(ctx, S(phi, z), S(phi + 0.025, z + len), col);
  }
  outline(ctx, body, WAX.ink);

  // A broken, stepped rim surrounds the recessed pool. Concentric pixel ellipses
  // use flat values instead of gradients, with a few asymmetrical chips.
  const [cx, cy] = pt(g.tx, g.ty);
  const rx = Math.max(3, Math.round(g.rxT / pixel)), ry = Math.max(3, Math.round(g.ryT / pixel));
  ellipse(ctx, cx, cy, rx, ry, WAX.ink);
  ellipse(ctx, cx, cy - 1, rx - 1, ry - 1, WAX.light);
  ellipse(ctx, cx - 1, cy - 2, rx - 3, ry - 3, WAX.rim);
  ellipse(ctx, cx, cy + 1, Math.max(2, rx - 6), Math.max(2, ry - 6), WAX.shadow);
  ellipse(ctx, cx, cy, Math.max(2, rx - 7), Math.max(2, ry - 7), WAX.mid);
  ellipse(ctx, cx - 1, cy - 1, Math.max(2, rx - 9), Math.max(2, ry - 9), WAX.wax);
  for (let i = -5; i <= 5; i += 2) { px(ctx, cx + i * 2, cy + ry - 5 - Math.abs(i) / 2, WAX.pale); }
  px(ctx, cx - rx + 4, cy + 1, WAX.rim, 3, 2);
  px(ctx, cx + rx - 6, cy - 4, WAX.pale, 3, 2);
  px(ctx, cx - 3, cy + 1, WAX.dark, 7, 2);
  px(ctx, cx - 1, cy - 1, WAX.ink, 3, 3);

  // The mark is a true five-point engraving. Its separate ember-colored copy
  // is revealed by the existing hover/focus handlers and uses the same bounds.
  const zc = 152, radius = 53, verts = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * TAU / 5;
    verts.push([radius * Math.cos(a), radius * Math.sin(a)]);
  }
  const star = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (let i = 0; i < 5; i++) {
    const A = verts[i], B = verts[(i + 2) % 5];
    let previous = null;
    for (let j = 0; j <= 20; j++) {
      const u = j / 20;
      const world = surf(lerp(A[0], B[0], u) / g.r, zc + lerp(A[1], B[1], u));
      star.x0 = Math.min(star.x0, world[0]); star.x1 = Math.max(star.x1, world[0]);
      star.y0 = Math.min(star.y0, world[1]); star.y1 = Math.max(star.y1, world[1]);
      const point = pt(...world);
      if (previous) {
        line(ctx, [previous[0]+1, previous[1]+1], [point[0]+1, point[1]+1], WAX.light);
        line(ctx, previous, point, WAX.ink, 2);
        line(ctx, previous, point, WAX.pale);
        line(glow, previous, point, '#17375f', 2);
        line(glow, previous, point, '#83baff');
      }
      previous = point;
    }
  }
  return { box, star: { x: star.x0 - 16, y: star.y0 - 14, w: star.x1 - star.x0 + 32, h: star.y1 - star.y0 + 28 }, wick: [g.tx, g.ty + 4 * g.s] };
}

// Each digit is a heat level; spaces are the broken edges and dark channels.
// The tall, separated tongues and scattered lettering follow the reference's
// retro text-art silhouette. Characters are real DOM text, never canvas pixels.
const FLAME_MASK = [
  '       1           1       ',
  '       11          1       ',
  '       21         21       ',
  '       221        21       ',
  '       231  1    221       ',
  '      1231  1    231       ',
  '      12321 21  1231       ',
  '      12431 21  12421      ',
  '     112431 231 12431      ',
  '     123431 231 13431      ',
  '     123432 341 134321     ',
  '    1123442 341 234321     ',
  '    1234542 342 234432     ',
  '    123454323432344432     ',
  '   112344433 4323443211    ',
  '   123344432 4323444321    ',
  '  1123344432343234443211   ',
  '  1233444433443334444321   ',
  ' 123334443 4543 34444321  ',
  ' 12344443324543223444321  ',
  '  123444434554433444321   ',
  '   1234444555544444321    ',
  '    12334445544444321     ',
  '     12334445444321       ',
  '      123344444321        ',
  '        123344321         ',
  '          12321           ',
];
const FLAME_COLORS = ['', '#850b08', '#c71c08', '#f34806', '#ff9410', '#ffe34f'];
const FLAME_GLYPHS = ['/', 'L', 'F', '$', 'X', '%', '#', ':', '+', '*', 'Y', 'S', '7', '.'];

// Text cells are built once, including the gaps so the flame's edges can move.
export function createAsciiFlame(root) {
  const cells = [], rows = [];
  const motion = makeNoise(178);
  for (let row = 0; row < FLAME_MASK.length; row++) {
    const line = document.createElement('span');
    line.className = 'ascii-flame-row';
    rows.push(line);
    const mask = FLAME_MASK[row].padEnd(27, ' ');
    for (let col = 0; col < mask.length; col++) {
      const cell = document.createElement('span');
      cell.className = 'ascii-flame-cell';
      line.appendChild(cell);
      cells.push({ cell, row, col });
    }
    root.appendChild(line);
  }
  let lastFrame = -1;
  return {
    update({ I, leanX, leanY, t, heightLimit = 1 }) {
      const strength = clamp(I, 0, 1.2);
      root.style.opacity = String(clamp(strength * 2));
      root.style.visibility = strength < 0.015 ? 'hidden' : 'visible';
      // Keep the bottom anchored to the wick while the whole flame leans and gutters.
      const height = 0.24 + 0.76 * Math.pow(Math.min(strength, 1), 0.7);
      root.style.transform = `translate(-50%, -100%) skewX(${-leanX * 10}deg) scale(${0.48 * (0.94 + 0.06 * Math.min(strength, 1))}, ${Math.min(heightLimit, height * 0.62 * (1 + leanY * 0.05))})`;
      // Independent, layered noise bends the upper tongues without moving the wick.
      rows.forEach((line, row) => {
        const rise = 1 - row / (rows.length - 1);
        const slow = motion.n2(row * 0.13, t * 1.9) - 0.5;
        const quick = motion.n2(row * 0.26 + 40, t * 5.2 + 9) - 0.5;
        const sway = (slow * 0.35 + quick * 0.12) * rise;
        line.style.transform = `translateX(${sway.toFixed(3)}em)`;
      });
      // The text cells update at 12 fps; their movement between updates remains
      // smooth, while the broken silhouette and bright clusters flicker freely.
      const frame = Math.floor(t * 12);
      if (frame === lastFrame) return;
      lastFrame = frame;
      for (const { cell, row, col } of cells) {
        const drift = motion.n2(row * 0.15 + 8, frame * 0.12) - 0.5;
        const shift = row < 22 ? Math.round(drift * 2) : 0;
        const level = Number(FLAME_MASK[row][col - shift]) || 0;
        if (!level) {
          cell.textContent = ' ';
          cell.style.backgroundColor = 'transparent';
          continue;
        }
        const seed = (row * 37 + col * 19 + row * col * 3) % 101;
        const flicker = seed % 4 === 0 ? Math.floor(motion.n1(frame * 0.22 + seed) * 8) : 0;
        cell.textContent = FLAME_GLYPHS[(seed + flicker) % FLAME_GLYPHS.length];
        const heatNoise = motion.n2(col * 0.33 + row * 0.09, frame * 0.14 + row * 0.08);
        const heat = Math.max(1, Math.min(5, level + (heatNoise > 0.7 ? 1 : heatNoise < 0.27 ? -1 : 0)));
        // Group some cells into flat, hot islands with contrasting glyphs, as in
        // old terminal artwork. Other characters and empty cells keep the edge broken.
        const island = level > 1 && motion.n2(col * 0.37 + frame * 0.045, row * 0.24 - frame * 0.06) > 0.42;
        cell.style.backgroundColor = island ? FLAME_COLORS[heat] : 'transparent';
        cell.style.color = island ? (heat >= 4 ? '#a72a0a' : '#ffbd2e') : FLAME_COLORS[heat];
      }
    },
  };
}

// The wick and brief ember remain on the existing canvas, beneath the text flame.
export function drawFlame(ctx, f) {
  const { s } = f;
  const wickTop = [f.leanX * 5 * s + 2 * s, -15 * s];
  ctx.save();
  ctx.fillStyle = WAX.ink;
  ctx.fillRect(-2 * s, -7 * s, 4 * s, 8 * s);
  ctx.fillRect(-1 * s, -12 * s, 4 * s, 6 * s);
  ctx.fillRect(wickTop[0] - 1.5 * s, wickTop[1], 3 * s, 4 * s);
  if (f.ember > 0.01) {
    ctx.globalAlpha = f.ember;
    ctx.fillStyle = WAX.emberLight;
    ctx.fillRect(wickTop[0] - 2 * s, wickTop[1] - 2 * s, 4 * s, 4 * s);
  }
  ctx.restore();
}
