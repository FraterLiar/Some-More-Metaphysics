import { makeNoise, mulberry32, clamp, lerp, smoothstep, smoothPath } from './lib/rand.js';
import { fitStage, placePlane, projector, reducedMotion, stagePoint } from './lib/stage.js';
import { paintDesk } from './layers/desk.js';
import { paintPaper, paintBookBase, bookBaseBox } from './layers/book.js';
import { paintSaucer, candleGeometry, paintCandle, drawFlame, createAsciiFlame } from './layers/candle.js?v=blue-pentagram';
import { paintRing } from './layers/details.js';
import { createLightLayer } from './layers/light.js';
import { buildRitualRoom } from './layers/ritual.js?v=ritual-back-near-title';
import { createGrimoire } from './layers/grimoire.js?v=essay-formatting-20261125';

const $ = (id) => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const SESSION_KEY = 'grimoire_intro_seen';

const els = {
  stage: $('stage'),
  plane: $('plane'),
  bioCoin: $('bio-coin'),
  desk: $('desk-canvas'),
  shadow: $('shadow-canvas'),
  saucer: $('saucer-canvas'),
  book: $('book'),
  bookBase: $('book-base'),
  leafLeft: $('leaf-left'),
  leafEssay: $('leaf-essay'),
  leafToc: $('leaf-toc'),
  paperLeft: $('paper-left'),
  paperRight: $('paper-right'),
  paperBack: $('paper-back'),
  paperEssay: $('paper-essay'),
  marginNote: $('margin-note'),
  idleNote: $('idle-note'),
  tocHeading: $('toc-heading'),
  tocNav: $('toc-nav'),
  essayTitle: $('essay-title'),
  essayText: $('essay-text'),
  essayBack: $('essay-back'),
  ring: $('ring-canvas'),
  lightMult: $('light-mult'),
  lightWarm: $('light-warm'),
  candleBody: $('candle-body'),
  candleCarve: $('candle-carve'),
  candleFlame: $('candle-flame'),
  asciiFlame: $('ascii-flame'),
  pentagramBtn: $('pentagram-btn'),
  veil: $('veil'),
  ritual: $('ritual'),
};

const state = {
  copy: null,
  fit: null,
  g: null,
  candleInfo: null,
  updateLight: null,
  flameCtx: null,
  flameBox: null,
  ascii: null,
  noise: makeNoise(73),
  ritual: null,
  grimoire: null,

  // Animation & interaction state
  mode: 'intro', // 'intro' | 'desk' | 'essay' | 'snuff' | 'ritual'
  introStart: 0,
  snuffStart: 0,
  I: 0,
  ember: 0,
  leanX: 0,
  leanY: 0,
  targetLeanX: 0,
  targetLeanY: 0,
  hoverTargetStage: null,
  lastActivity: performance.now(),
  idleShown: false,
  lastLayoutName: null,
};

function makeBracketSVG() {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'focus-bracket');
  svg.setAttribute('viewBox', '0 0 200 40');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <path d="M9 4 C4 8, 4 32, 9 36"/>
    <path d="M191 4 C196 9, 196 31, 191 36"/>`;
  return svg;
}

function makeWobblyUnderline(seed) {
  const R = mulberry32(seed);
  const pts = [];
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * 240;
    const y = 4.5 + (R() - 0.5) * 2.4 + Math.sin((i / n) * Math.PI) * (R() - 0.5) * 1.4;
    pts.push([x, y]);
  }
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'toc-underline');
  svg.setAttribute('viewBox', '0 0 240 9');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', smoothPath(pts));
  svg.appendChild(path);
  return { svg, path };
}

function makeStrikeSVG(seed) {
  const R = mulberry32(seed);
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'toc-strike-svg');
  svg.setAttribute('viewBox', '0 0 200 24');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    pts.push([(i / 8) * 200, 12.5 + (R() - 0.5) * 3.2 - (i / 8) * 1.4]);
  }
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', smoothPath(pts));
  svg.appendChild(path);
  return svg;
}

// Per-glyph subtle opacity & vertical jitter for hand-printed metal type feel
function setInkedText(el, text, seed) {
  el.textContent = '';
  const R = mulberry32(seed);
  const frag = document.createDocumentFragment();
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === ' ') {
      frag.appendChild(document.createTextNode(' '));
      continue;
    }
    const span = document.createElement('span');
    span.textContent = ch;
    const op = 0.84 + R() * 0.16;
    const dy = (R() - 0.5) * 0.7;
    span.style.opacity = op.toFixed(2);
    if (Math.abs(dy) > 0.18) {
      span.style.display = 'inline-block';
      span.style.transform = `translateY(${dy.toFixed(2)}px)`;
    }
    frag.appendChild(span);
  }
  el.appendChild(frag);
}

function renderContent(copy) {
  document.title = copy.site.title;
  els.tocHeading.textContent = copy.contents.heading;
  els.essayBack.textContent = copy.contents.back;
  els.essayBack.appendChild(makeBracketSVG());
  els.pentagramBtn.setAttribute('aria-label', copy.pentagram.label);

  // Left leaf margin note
  els.marginNote.innerHTML = copy.leftLeaf.marginNote.join('<br>');

  // TOC entries
  els.tocNav.innerHTML = '';
  const R = mulberry32(404);
  copy.contents.entries.forEach((entry, idx) => {
    const row = document.createElement('div');
    row.className = 'toc-row';
    // Slight irregular baseline & rotation per line
    const dy = (R() - 0.5) * 2.2;
    const rot = (R() - 0.5) * 0.45;
    row.style.transform = `translateY(${dy.toFixed(2)}px) rotate(${rot.toFixed(2)}deg)`;

    if (entry.struck) {
      row.classList.add('toc-row-struck');
      const struck = document.createElement('span');
      struck.className = 'toc-struck-text';
      setInkedText(struck, entry.title, 700 + idx * 17);
      struck.appendChild(makeStrikeSVG(800 + idx));
      const note = document.createElement('span');
      note.className = 'hand-second toc-struck-note';
      note.textContent = entry.note || '';
      row.append(struck, note);
    } else {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toc-link';
      btn.dataset.slug = entry.slug;

      const title = document.createElement('span');
      title.className = 'toc-title';
      setInkedText(title, entry.title, 100 + idx * 31);

      const { svg: uSvg, path: uPath } = makeWobblyUnderline(500 + idx * 19);
      title.appendChild(uSvg);

      const leaders = document.createElement('span');
      leaders.className = 'toc-leaders';
      leaders.setAttribute('aria-hidden', 'true');
      // Uneven dot leaders
      const dots = Array.from({ length: 28 }, () => (R() < 0.22 ? '. ' : '.')).join('');
      leaders.textContent = dots;

      const page = document.createElement('span');
      page.className = 'toc-page';
      page.textContent = entry.page;

      btn.append(title, leaders, page, makeBracketSVG());

      // Prepare stroke-dash for wobbly underline
      requestAnimationFrame(() => {
        const len = uPath.getTotalLength();
        uPath.style.strokeDasharray = `${len}`;
        uPath.style.strokeDashoffset = `${len}`;
        btn.addEventListener('pointerenter', () => {
          uPath.style.strokeDashoffset = '0';
          const r = btn.getBoundingClientRect();
          state.hoverTargetStage = stagePoint(els.stage, r.left + r.width * 0.35, r.top + r.height * 0.5, state.fit.scale);
        });
        btn.addEventListener('pointerleave', () => {
          uPath.style.strokeDashoffset = `${len}`;
          state.hoverTargetStage = null;
        });
        btn.addEventListener('focus', () => {
          uPath.style.strokeDashoffset = '0';
          const r = btn.getBoundingClientRect();
          state.hoverTargetStage = stagePoint(els.stage, r.left + r.width * 0.35, r.top + r.height * 0.5, state.fit.scale);
        });
        btn.addEventListener('blur', () => {
          uPath.style.strokeDashoffset = `${len}`;
          state.hoverTargetStage = null;
        });
      });

      btn.addEventListener('click', () => openEssay(entry));
      row.appendChild(btn);
    }

    els.tocNav.appendChild(row);
  });
}

function layoutBook(L, copy) {
  const { x, y, rot, leafW, leafH } = L.book;
  Object.assign(els.book.style, {
    left: `${x}px`,
    top: `${y}px`,
    width: '0px',
    height: '0px',
    transform: `rotate(${rot}deg)`,
  });

  const box = bookBaseBox(L);
  Object.assign(els.bookBase.style, {
    left: `${box.x}px`,
    top: `${box.y}px`,
    width: `${box.w}px`,
    height: `${box.h}px`,
  });
  paintBookBase(els.bookBase, L, 5);

  for (const lf of [els.leafLeft, els.leafEssay, els.leafToc]) {
    lf.style.top = `${-leafH / 2}px`;
    lf.style.width = `${leafW}px`;
    lf.style.height = `${leafH}px`;
  }

  const showLines = copy.leftLeaf.showThrough.map((text, i) => ({
    text,
    size: i === 0 ? 30 : i < 3 ? 22 : 18,
    sc: i === 0,
    italic: i === 1 || i >= 5,
    gap: text === '' ? 28 : undefined,
  }));

  paintPaper(els.paperLeft, {
    w: leafW, h: leafH, seed: 12, gutter: 'right', res: 1.5,
    showThrough: showLines, showAt: [leafW * 0.5, leafH * 0.27],
  });
  paintPaper(els.paperRight, { w: leafW, h: leafH, seed: 27, gutter: 'left', res: 1.5 });
  paintPaper(els.paperBack, { w: leafW, h: leafH, seed: 28, gutter: 'right', res: 1.2, foxing: 0.8 });
  paintPaper(els.paperEssay, { w: leafW, h: leafH, seed: 39, gutter: 'left', res: 1.5 });
}

function rebuildScene(forceRepaint = false) {
  const fit = fitStage(els.stage);
  document.documentElement.style.setProperty('--stage-left', `${els.stage.getBoundingClientRect().left}px`);
  state.fit = fit;
  const { L } = fit;
  placePlane(els.plane, fit);
  const coin = L.name === 'portrait'
    ? { x: 850, y: 1470, size: 150 }
    : { x: 820, y: 1100, size: 150 };
  Object.assign(els.bioCoin.style, {
    left: `${coin.x}px`,
    top: `${coin.y}px`,
    width: `${coin.size}px`,
  });
  const project = projector(fit);
  if (state.grimoire) state.grimoire.layout(fit, project);

  // Repaint procedural surfaces when layout changes (landscape <-> portrait) or first mount
  if (forceRepaint || state.lastLayoutName !== L.name) {
    state.lastLayoutName = L.name;
    paintDesk(els.desk, L);
    paintSaucer(els.saucer, L, 21);
    layoutBook(L, state.copy);
    paintRing(els.ring, L, 4);
    state.updateLight = createLightLayer(els.shadow, els.lightMult, els.lightWarm, L);
  }

  // Upright candle depends on projection (and stage height in portrait)
  const g = candleGeometry(L, project);
  state.g = g;
  const info = paintCandle(els.candleBody, els.candleCarve, g, 33);
  state.candleInfo = info;

  // Position pentagram hit target right over the carved star
  // Stage coordinates scale with the viewport, so keep the physical touch area
  // at least 44 CSS pixels even on narrow screens.
  const hitW = Math.max(info.star.w, 44 / fit.scale);
  const hitH = Math.max(info.star.h, 44 / fit.scale);
  Object.assign(els.pentagramBtn.style, {
    left: `${info.star.x - (hitW - info.star.w) / 2}px`,
    top: `${info.star.y - (hitH - info.star.h) / 2}px`,
    width: `${hitW}px`,
    height: `${hitH}px`,
  });

  // Flame canvas sits around the wick
  const fW = Math.round(280 * g.s), fH = Math.round(310 * g.s);
  const fx = info.wick[0] - fW / 2, fy = info.wick[1] - fH * 0.78;
  const res = 2;
  els.candleFlame.width = fW * res;
  els.candleFlame.height = fH * res;
  Object.assign(els.candleFlame.style, {
    left: `${fx}px`,
    top: `${fy}px`,
    width: `${fW}px`,
    height: `${fH}px`,
  });
  state.flameCtx = els.candleFlame.getContext('2d');
  state.flameBox = { x: fx, y: fy, w: fW, h: fH, ox: info.wick[0] - fx, oy: info.wick[1] - fy, res };
  Object.assign(els.asciiFlame.style, {
    left: `${info.wick[0]}px`,
    top: `${info.wick[1] - 14 * g.s}px`,
    fontSize: `${10 * g.s}px`,
  });
  // The portrait candle sits close to the top of the stage. Keep the full
  // text flame visible without moving the candle or its controls.
  state.flameHeightLimit = Math.min(1, Math.max(0.2, (info.wick[1] - 14 * g.s - 6) / (27 * 8.4 * g.s)));

  if (state.updateLight) state.updateLight(state.I, state.leanX, state.leanY, true);
}

// =========================================================
// Intro sequence (~5s, skippable, skipped on return in session)
// =========================================================
function finishIntro() {
  if (state.mode !== 'intro') return;
  state.mode = 'desk';
  state.I = 1;
  state.ember = 0;
  els.stage.classList.remove('is-intro');
  els.veil.classList.remove('is-dark');
  els.tocHeading.classList.add('is-sunk');
  els.tocNav.querySelectorAll('.toc-row').forEach((r) => r.classList.add('is-sunk'));
  try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
}

function startIntro() {
  let seen = false;
  try { seen = sessionStorage.getItem(SESSION_KEY) === '1'; } catch {}
  if (seen || reducedMotion()) {
    state.mode = 'intro';
    finishIntro();
    return;
  }
  state.mode = 'intro';
  state.introStart = performance.now();
  state.I = 0;
  state.ember = 0;
  els.stage.classList.add('is-intro');
  els.veil.classList.add('is-dark');
  els.tocHeading.classList.remove('is-sunk');
  els.tocNav.querySelectorAll('.toc-row').forEach((r) => r.classList.remove('is-sunk'));
}

// =========================================================
// Essay page-turn (stub)
// =========================================================
function openEssay(entry) {
  if (state.mode === 'snuff' || state.mode === 'ritual') return;
  markActivity();
  els.essayTitle.textContent = entry.title;
  els.essayText.textContent = entry.essay;
  els.leafEssay.setAttribute('aria-hidden', 'false');
  els.leafToc.classList.add('is-turning');
  requestAnimationFrame(() => {
    els.leafToc.classList.add('is-turned');
  });
  setTimeout(() => {
    els.leafToc.classList.remove('is-turning');
    els.essayBack.focus({ preventScroll: true });
  }, reducedMotion() ? 20 : 1050);
  state.mode = 'essay';
  try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
}

function closeEssay() {
  if (state.mode !== 'essay') return;
  markActivity();
  els.leafToc.classList.add('is-turning');
  els.leafToc.classList.remove('is-turned');
  setTimeout(() => {
    els.leafToc.classList.remove('is-turning');
    els.leafEssay.setAttribute('aria-hidden', 'true');
  }, reducedMotion() ? 20 : 1050);
  state.mode = 'desk';
}

// =========================================================
// Pentagram -> gutter out -> darkness beat -> ritual room
// =========================================================
function enterRitual() {
  if (state.mode === 'snuff' || state.mode === 'ritual') return;
  markActivity();
  try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}

  if (reducedMotion()) {
    state.mode = 'ritual';
    els.ritual.setAttribute('aria-hidden', 'false');
    els.ritual.classList.add('is-open');
    state.ritual.enter(true);
    state.ritual.backButton.focus({ preventScroll: true });
    return;
  }

  state.mode = 'snuff';
  state.snuffStart = performance.now();
  els.veil.classList.add('is-dark');
  setTimeout(() => {
    if (state.mode !== 'snuff') return;
    state.mode = 'ritual';
    els.ritual.setAttribute('aria-hidden', 'false');
    els.ritual.classList.add('is-open');
    state.ritual.enter(false);
    state.ritual.backButton.focus({ preventScroll: true });
  }, 360);
}

function leaveRitual() {
  if (state.mode !== 'ritual') return;
  els.ritual.classList.remove('is-open');
  els.ritual.setAttribute('aria-hidden', 'true');
  state.mode = 'desk';
  state.I = 1;
  state.ember = 0;
  els.veil.classList.remove('is-dark');
  markActivity();
  els.pentagramBtn.focus({ preventScroll: true });
}

// =========================================================
// Idle quirk (25s idle -> dry marginal note in second hand)
// =========================================================
function markActivity() {
  state.lastActivity = performance.now();
}

function checkIdle(now) {
  if (state.idleShown || state.mode !== 'desk') return;
  if (now - state.lastActivity > 25000) {
    state.idleShown = true;
    const notes = state.copy.idleNotes;
    els.idleNote.textContent = notes[Math.floor(Math.random() * notes.length)];
    els.idleNote.classList.add('is-shown');
  }
}

// =========================================================
// Main 60fps animation loop (noise-driven flicker + flame lean + lighting)
// =========================================================
function tick(now) {
  const t = now * 0.001;
  const calm = reducedMotion();
  const N = state.noise;

  // Compute flame intensity I and ember
  let baseI = 1;
  if (state.mode === 'intro') {
    const dt = (now - state.introStart) * 0.001;
    // 0..0.4s black, 0.4..0.95s wick catches (ember), 0.8..2.6s light rises, 1.8..4.6s TOC sinks in
    state.ember = smoothstep(0.35, 0.75, dt) * (1 - smoothstep(1.1, 1.8, dt));
    baseI = smoothstep(0.7, 2.5, dt);
    if (dt > 0.55) els.veil.classList.remove('is-dark');

    if (dt > 1.75) els.tocHeading.classList.add('is-sunk');
    const rows = els.tocNav.querySelectorAll('.toc-row');
    rows.forEach((row, i) => {
      if (dt > 2.0 + i * 0.28) row.classList.add('is-sunk');
    });
    if (dt >= 4.95) finishIntro();
  } else if (state.mode === 'snuff') {
    const dt = (now - state.snuffStart) * 0.001;
    baseI = 1 - smoothstep(0, 0.34, dt);
    state.ember = smoothstep(0.35, 0.55, dt) * (1 - smoothstep(0.6, 1.05, dt));
  } else if (state.mode === 'ritual') {
    baseI = 0;
    state.ember = 0;
  } else {
    state.ember = 0;
  }

  // Irregular noise-driven flicker (layered low + mid + occasional breath)
  const nSlow = N.n1(t * 1.45) - 0.5;
  const nMid = N.n1(t * 4.7 + 19.3) - 0.5;
  const nFast = N.n1(t * 11.3 + 5.1) - 0.5;
  const flickAmt = calm ? 0.015 : 0.055;
  const flicker = 1 + (nSlow * 0.55 + nMid * 0.35 + nFast * 0.2) * flickAmt * 2;
  state.I = baseI * flicker;

  // Flame leans toward hovered TOC line or cursor
  const target = state.hoverTargetStage;
  if (target && state.candleInfo && !calm) {
    const dx = target[0] - state.candleInfo.wick[0];
    const dy = target[1] - state.candleInfo.wick[1];
    const dist = Math.hypot(dx, dy) || 1;
    const pull = smoothstep(40, 520, dist) * (state.hoverTargetStage ? 0.16 : 0.1);
    state.targetLeanX = (dx / dist) * pull;
    state.targetLeanY = (dy / dist) * pull * 0.5;
  } else {
    state.targetLeanX = 0;
    state.targetLeanY = 0;
  }
  const breeze = calm ? 0 : (N.n1(t * 2.1 + 41) - 0.5) * 0.035;
  state.leanX = lerp(state.leanX, state.targetLeanX + breeze, 0.08);
  state.leanY = lerp(state.leanY, state.targetLeanY, 0.08);

  // Draw flame
  if (state.flameCtx && state.g && state.mode !== 'ritual') {
    const fb = state.flameBox;
    const ctx = state.flameCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, els.candleFlame.width, els.candleFlame.height);
    ctx.setTransform(fb.res, 0, 0, fb.res, fb.ox * fb.res, fb.oy * fb.res);
    drawFlame(ctx, {
      s: state.g.s,
      sinT: state.g.sinT,
      I: state.I,
      leanX: state.leanX,
      leanY: state.leanY,
      t: calm ? t * 0.25 : t,
      ember: state.ember,
    }, N);
  }
  if (state.ascii && state.g) {
    state.ascii.update({
      I: state.mode === 'ritual' ? 0 : state.I,
      leanX: state.leanX,
      leanY: state.leanY,
      t: calm ? 0 : t,
      heightLimit: state.flameHeightLimit,
    });
  }

  // Update desk lighting pass & cast shadows
  if (state.updateLight && state.mode !== 'ritual') {
    state.updateLight(state.I, state.leanX, state.leanY);
  }

  checkIdle(now);
  requestAnimationFrame(tick);
}

// =========================================================
// Events & boot
// =========================================================
function bindEvents() {
  window.addEventListener('pointermove', () => {
    markActivity();
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    markActivity();
    if (e.key === 'Escape') {
      if (state.mode === 'essay') closeEssay();
      else if (state.mode === 'ritual') leaveRitual();
      else if (state.mode === 'intro') finishIntro();
    }
  });

  els.essayBack.addEventListener('click', closeEssay);

  const setPentagramGlow = on => els.candleCarve.classList.toggle('is-lit', on);
  els.pentagramBtn.addEventListener('pointerenter', () => setPentagramGlow(true));
  els.pentagramBtn.addEventListener('pointerleave', () => setPentagramGlow(false));
  els.pentagramBtn.addEventListener('focus', () => setPentagramGlow(true));
  els.pentagramBtn.addEventListener('blur', () => setPentagramGlow(false));
  els.pentagramBtn.addEventListener('click', enterRitual);

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => rebuildScene(false), 60);
  });
}

async function boot() {
  const res = await fetch('./content.json?v=essay-publication-20261125');
  state.copy = await res.json();
  state.ascii = createAsciiFlame(els.asciiFlame);
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
  renderContent(state.copy);
  els.book.inert = true;
  els.book.setAttribute('aria-hidden', 'true');
  state.grimoire = createGrimoire(els.stage, document.getElementById('viewport'), state.copy, () => {
    if (state.mode === 'intro') finishIntro();
    markActivity();
  });
  state.ritual = buildRitualRoom(els.ritual, state.copy.ritual, leaveRitual);
  rebuildScene(true);
  bindEvents();
  startIntro();
  window.__ready = true;
  requestAnimationFrame(tick);
}

boot();
