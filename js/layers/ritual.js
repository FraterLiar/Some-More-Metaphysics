// Pixel-art practice room with book-like pages for practice instructions.
import { mulberry32 } from '../lib/rand.js';
import { renderMarkdown } from '../lib/markdown.js';

export function buildRitualRoom(root, copy, onBack) {
  root.innerHTML = '';

  const floor = document.createElement('canvas');
  floor.className = 'ritual-floor';
  root.appendChild(floor);

  const light = document.createElement('div');
  light.className = 'ritual-light';
  root.appendChild(light);

  // Center candle seen from above
  const candle = document.createElement('div');
  candle.className = 'ritual-candle';
  candle.setAttribute('aria-hidden', 'true');
  candle.innerHTML = `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true">
    <path fill="#302722" d="M9 1h14v2h4v4h4v18h-4v4h-4v2H9v-2H5v-4H1V7h4V3h4z"/>
    <path fill="#a49275" d="M10 3h12v2h4v4h2v14h-2v4h-4v2H10v-2H6v-4H4V9h2V5h4z"/>
    <path fill="#dfcfaa" d="M10 5h12v2h4v4h1v8h-2v4h-4v2H10v-2H7v-4H5v-8h2V7h3z"/>
    <path fill="#89765c" d="M10 9h12v2h2v10h-3v2H11v-2H8V11h2z"/>
    <path fill="#332822" d="M14 13h4v6h-4z"/><path class="ritual-flame" fill="#efaa38" d="M15 9h2v2h2v4h-2v2h-2v-2h-2v-3h2z"/>
    <path fill="#ffe28a" d="M15 12h2v3h-2z"/>
  </svg>`;
  root.appendChild(candle);

  // Each arrow reveals the existing practice prompt.
  const nav = document.createElement('nav');
  nav.className = 'ritual-nav';
  nav.setAttribute('aria-label', copy.title);

  const positions = ['pos-nw', 'pos-ne', 'pos-s'];
  const practices = copy.practices || [];
  const buttons = [];
  practices.forEach((p, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `ritual-link ${positions[idx] || ''}`;
    const arrow = document.createElement('span');
    arrow.className = 'ritual-link-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '▶';
    btn.append(arrow, document.createTextNode(p.title));
    buttons.push(btn);
    nav.appendChild(btn);
  });
  root.appendChild(nav);

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'ritual-back';
  back.textContent = copy.back;
  back.addEventListener('click', onBack);
  root.appendChild(back);

  const reader = document.createElement('div');
  reader.className = 'grimoire-overlay ritual-manual-overlay';
  reader.hidden = true;
  reader.innerHTML = `<section class="ritual-manual-spread" role="dialog" aria-modal="true" aria-labelledby="ritual-practice-heading" tabindex="-1">
    <div class="grimoire-left-page ritual-manual-left" aria-hidden="true"><div class="grimoire-eyebrow ritual-manual-folio"></div></div>
    <div class="grimoire-right-page ritual-manual-right">
      <div class="grimoire-content ritual-manual-content">
        <div class="grimoire-eyebrow">A PRACTICE</div>
        <h2 id="ritual-practice-heading" class="grimoire-essay-heading"></h2>
        <button type="button" class="ritual-manual-close">← Back to the ritual room</button>
        <div class="grimoire-essay ritual-manual-instructions"></div>
        <div class="ritual-manual-pagination">
          <button type="button" class="ritual-manual-previous">← Previous</button>
          <button type="button" class="ritual-manual-next">Next →</button>
        </div>
      </div>
    </div>
  </section>`;
  root.appendChild(reader);
  const closeReader = reader.querySelector('.ritual-manual-close');
  const practiceHeading = reader.querySelector('#ritual-practice-heading');
  const folio = reader.querySelector('.ritual-manual-folio');
  const instructions = reader.querySelector('.ritual-manual-instructions');
  const previous = reader.querySelector('.ritual-manual-previous');
  const next = reader.querySelector('.ritual-manual-next');
  let practiceIndex = 0;
  let returnFocus = null;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function showPractice(index) {
    practiceIndex = index;
    const practice = practices[index];
    practiceHeading.textContent = practice.title;
    folio.textContent = `PRACTICE ${String(index + 1).padStart(2, '0')}`;
    renderMarkdown(instructions, practice.instructions || practice.stub || '');
    previous.disabled = index === 0;
    next.disabled = index === practices.length - 1;
  }

  function openPractice(index, trigger) {
    if (!practices[index]) return;
    returnFocus = trigger;
    showPractice(index);
    nav.inert = true;
    back.inert = true;
    reader.hidden = false;
    requestAnimationFrame(() => {
      reader.classList.add('is-open');
      closeReader.focus({ preventScroll: true });
    });
  }

  function closePractice() {
    if (reader.hidden) return;
    reader.classList.remove('is-open');
    setTimeout(() => {
      reader.hidden = true;
      nav.inert = false;
      back.inert = false;
      returnFocus?.focus({ preventScroll: true });
    }, reduced() ? 0 : 300);
  }

  function turnPage(direction) {
    const target = practiceIndex + direction;
    if (target < 0 || target >= practices.length) return;
    showPractice(target);
  }

  buttons.forEach((button, index) => button.addEventListener('click', () => openPractice(index, button)));
  closeReader.addEventListener('click', closePractice);
  previous.addEventListener('click', () => turnPage(-1));
  next.addEventListener('click', () => turnPage(1));
  reader.addEventListener('click', event => { if (event.target === reader) closePractice(); });
  document.addEventListener('keydown', event => {
    if (reader.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      closePractice();
    }
    if (event.key === 'Tab') {
      const focusable = [closeReader, previous, next].filter(button => !button.disabled);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }, true);

  let painted = false;
  function ensureFloor() {
    if (painted) return;
    painted = true;
    // Low-resolution floorboard illustration with hard-edged grain clusters.
    const w = 320, h = 220, ctx = floor.getContext('2d');
    floor.width = w; floor.height = h;
    const R = mulberry32(47);
    ctx.fillStyle = '#261c18'; ctx.fillRect(0, 0, w, h);
    for (let x = 0, i = 0; x < w; x += 42, i++) {
      const palette = i % 3 === 0 ? ['#604935', '#6b523b', '#493729'] : i % 3 === 1 ? ['#584230', '#644a34', '#413125'] : ['#684d37', '#70553b', '#4a372a'];
      ctx.fillStyle = palette[0]; ctx.fillRect(x + 1, 0, 40, h);
      ctx.fillStyle = palette[1]; ctx.fillRect(x + 3, 0, 3, h);
      ctx.fillStyle = palette[2]; ctx.fillRect(x + 38, 0, 3, h);
      for (let n = 0; n < 65; n++) {
        const gx = x + 5 + Math.floor(R() * 32), gy = Math.floor(R() * h);
        ctx.fillStyle = n % 4 === 0 ? '#796048' : n % 3 === 0 ? '#3c2b21' : '#503a2a';
        ctx.fillRect(gx, gy, 1, 2 + Math.floor(R() * 14));
      }
      for (const y of [25, 190]) {
        ctx.fillStyle = '#30231b'; ctx.fillRect(x + 5, y, 2, 2); ctx.fillRect(x + 34, y, 2, 2);
      }
    }
  }

  function enter() {
    ensureFloor();
  }

  return { enter, backButton: back };
}
