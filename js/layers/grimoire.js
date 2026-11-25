import { buildPhysicalBook } from './grimoire-art.js?v=titled-cover';

// Closed pixel-art cover and an accessible reading spread, driven by the same
// content data as the original book. No destinations are invented here.
export function createGrimoire(stage, viewport, copy, onOpen) {
  const book = document.createElement('button');
  book.type = 'button';
  book.className = 'grimoire-trigger';
  book.dataset.state = 'closed';
  book.dataset.phase = 'resting';
  book.setAttribute('aria-label', 'Open the grimoire');
  book.setAttribute('aria-haspopup', 'dialog');
  const flight=document.createElement('span'); flight.className='grimoire-flight';
  const lift=document.createElement('span'); lift.className='grimoire-hover-lift';
  const pose=document.createElement('span'); pose.className='grimoire-pose';
  const model=document.createElement('span'); model.className='grimoire-model';
  buildPhysicalBook(model);
  // The board's thin tail face belongs to the hinge, not the stationary pages.
  const hinge=model.querySelector('.grimoire-cover');
  hinge.appendChild(model.querySelector('.grimoire-front-board-edge'));
  pose.appendChild(model); lift.appendChild(pose); flight.appendChild(lift); book.appendChild(flight);
  stage.appendChild(book);

  const overlay = document.createElement('div');
  overlay.className = 'grimoire-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `<section class="grimoire-spread" role="dialog" aria-modal="true" aria-labelledby="grimoire-heading" tabindex="-1">
    <button class="grimoire-close" type="button" aria-label="Return to the desk">← <span>Return to the desk</span></button>
    <div class="grimoire-left-page" aria-hidden="true"></div><div class="grimoire-right-page"><div class="grimoire-content"></div></div></section>`;
  viewport.appendChild(overlay);
  const spread = overlay.querySelector('.grimoire-spread');
  const close = overlay.querySelector('.grimoire-close');
  const content = overlay.querySelector('.grimoire-content');
  let state = 'closed';
  let timers = [];
  let background = [];
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const setState = value => { state=value; book.dataset.state=value; };
  const cancelTimers = () => { timers.forEach(clearTimeout); timers=[]; };
  const later = (ms, action) => { timers.push(setTimeout(action, reduced()?0:ms)); };
  const lockBackground = () => {
    background=[...viewport.children].filter(el=>el!==overlay).map(el=>[el,el.inert]);
    background.forEach(([el])=>{el.inert=true;});
  };
  const unlockBackground = () => { background.forEach(([el,inert])=>{el.inert=inert;}); background=[]; };
  // Chapter numbers are generated from their order, including beyond XII.
  function romanNumeral(value) {
    const parts = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
    let result = '';
    for (const [amount, glyph] of parts) while (value >= amount) { result += glyph; value -= amount; }
    return result;
  }
  function contents() {
    content.replaceChildren();
    const eyebrow=document.createElement('div'); eyebrow.className='grimoire-eyebrow'; eyebrow.textContent='A TABLE OF';
    const heading=document.createElement('h2'); heading.id='grimoire-heading'; heading.textContent='CONTENTS';
    const nav=document.createElement('nav'); nav.setAttribute('aria-label','Table of contents'); nav.className='grimoire-chapters';
    let number=0;
    for (const entry of copy.contents.entries) {
      if (entry.struck) continue;
      const button=document.createElement('button'); button.type='button'; button.className='grimoire-chapter';
      const title=document.createElement('span'); title.textContent=entry.title;
      const dots=document.createElement('span'); dots.className='grimoire-dots'; dots.setAttribute('aria-hidden','true');
      const numeral=document.createElement('span'); numeral.className='grimoire-number'; numeral.textContent=romanNumeral(++number);
      button.append(title,dots,numeral); button.addEventListener('click',()=>essay(entry)); nav.appendChild(button);
    }
    const footer=document.createElement('div'); footer.className='grimoire-page-number'; footer.textContent='—  1  —';
    content.append(eyebrow,heading,nav,footer);
  }
  function essay(entry) {
    content.replaceChildren();
    const eyebrow=document.createElement('div'); eyebrow.className='grimoire-eyebrow'; eyebrow.textContent='FROM THE GRIMOIRE';
    const heading=document.createElement('h2'); heading.id='grimoire-heading'; heading.className='grimoire-essay-heading'; heading.textContent=entry.title;
    const text=document.createElement('div'); text.className='grimoire-essay';
    for (const paragraph of entry.essay.split(/\r?\n\s*\r?\n/)) {
      const p=document.createElement('p'); p.textContent=paragraph; text.appendChild(p);
    }
    const back=document.createElement('button'); back.className='grimoire-back'; back.type='button'; back.textContent='← Return to the contents'; back.addEventListener('click',()=>{contents(); content.querySelector('button')?.focus();});
    content.append(eyebrow,heading,text,back); back.focus();
  }
  function show() {
    if(state!=='closed') return;
    cancelTimers(); setState('opening'); book.dataset.phase='lift';
    book.setAttribute('aria-expanded','true'); onOpen(); contents();
    later(180,()=>{book.dataset.phase='unfold';});
    later(760,()=>{
      overlay.hidden=false;
      requestAnimationFrame(()=>{if(state==='opening'||state==='open')overlay.classList.add('is-open');});
      lockBackground(); close.focus();
    });
    later(1050,()=>{
      setState('open'); book.dataset.phase='reading'; book.classList.add('is-covered');
    });
  }
  function hide() {
    if(state!=='open' && state!=='opening')return;
    cancelTimers(); setState('closing');
    overlay.classList.remove('is-open');
    book.classList.remove('is-covered');
    book.setAttribute('aria-expanded','false');
    later(220,()=>{
      overlay.hidden=true; unlockBackground(); book.dataset.phase='resting';
    });
    later(940,()=>{
      setState('closed'); book.dataset.phase='resting'; book.focus({preventScroll:true});
    });
  }
  book.setAttribute('aria-expanded','false'); book.addEventListener('click',show); close.addEventListener('click',hide);
  overlay.addEventListener('click',e=>{if(e.target===overlay)hide();});
  document.addEventListener('keydown',e=>{
    if(state==='closed')return;
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();hide();}
    if(e.key==='Tab'&&!overlay.hidden){const focus=[...spread.querySelectorAll('button')]; if(e.shiftKey&&document.activeElement===focus[0]){e.preventDefault();focus.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===focus.at(-1)){e.preventDefault();focus[0].focus();}}
  },true);
  return { layout(fit, project) {
    const L=fit.L, p=project(L.book.x,L.book.y,10);
    book.dataset.layout=L.name;
    const w=(L.name==='portrait'? 430:460)*p.s*.78*1.06, h=(L.name==='portrait'? 630:620)*p.s*.78*1.06;
    // The portrait layout puts the old open book partly beyond the stage. The
    // closed book needs its own inset so its whole cover stays reachable.
    const x=Math.max(w*.6+16, Math.min(L.stageW-w*.6-16,p.x));
    const y=Math.max(h*.45+16, Math.min(fit.H-h*.45-25,p.y));
    // Center the whole unfolding spread, which extends left of the hinge.
    const openingInset=L.name==='portrait'?220:70;
    book.style.setProperty('--travel-x', `${(L.stageW/2-x+w*.45)*.6+openingInset}px`);
    book.style.setProperty('--travel-y', `${(fit.H/2-y)*.3-12}px`);
    Object.assign(book.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`});
  }};
}
