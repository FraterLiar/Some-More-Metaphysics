// Small, hand-composed texture maps on coherent 3D faces. Every surface shares
// the same book coordinates; paper edges are not offset cover rectangles.
const P = { ink:'#35291f', seam:'#544027', shadow:'#6e542c', dark:'#84672f', cloth:'#a1843c', mid:'#b39649', light:'#c6ab62', wear:'#cfb77a', paper:'#d4c398', paperLight:'#e4d5b0', paperDark:'#a48a60' };
function surface(parent, name, w, h) {
  const face=document.createElement('span'); face.className=name; face.setAttribute('aria-hidden','true');
  const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h; face.appendChild(canvas); parent.appendChild(face);
  const c=canvas.getContext('2d'); c.imageSmoothingEnabled=false;
  const r=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  return {face,canvas,c,r};
}
function board(c,r) {
  r(0,0,180,248,P.ink); r(2,1,176,246,P.shadow); r(3,2,174,243,P.cloth);
  r(6,3,168,239,P.mid); r(7,4,165,236,P.cloth);
  r(5,4,2,235,P.wear); r(8,5,1,232,P.dark); r(172,7,3,232,P.dark);
  r(12,5,2,235,P.seam); r(14,5,2,235,P.dark); // compressed hinge
  // Cloth grain is grouped at folds and the lower, shadowed side.
  for(let y=9;y<237;y+=3) for(let x=18;x<169;x+=3) {
    const fold=x<28 || x>157 || y>225;
    const patch=(Math.floor(x/12)+Math.floor(y/18))%7===0;
    if((x+2*y)%17 < (fold?5:patch?2:0)) r(x,y,2,1,fold?P.dark:P.light);
    if(fold && (x+y)%9===0) r(x+1,y+1,1,1,P.light);
  }
  // A single narrow tooling line: no nested slab-like borders.
  r(23,17,137,1,P.shadow);r(23,229,137,1,P.shadow);r(23,17,1,213,P.shadow);r(159,17,1,213,P.shadow);
  r(24,18,134,1,P.light);r(24,18,1,209,P.light);
  // Dark leather exposed at the softened fore corners.
  for(const [x,y,flip] of [[164,5,1],[164,234,-1],[5,5,1],[5,234,-1]]) {
    r(x,y,8,2,P.dark);r(x+2,y+2*flip,5,2,P.shadow);r(x+5,y+4*flip,2,2,P.dark);
    r(x,y+3*flip,2,1,P.wear);
  }
  for(const [x,y,w] of [[39,39,6],[135,58,4],[48,194,8],[135,206,5],[31,82,3]]) {r(x,y,w,1,P.dark);r(x+2,y+1,2,1,P.light);}
  // Trim the outer silhouette in deliberate pixel steps.
  c.clearRect(0,0,3,2);c.clearRect(178,0,2,4);c.clearRect(0,246,4,2);c.clearRect(177,244,3,4);
}

// Small, hand-set bitmap letters keep the cover title sharp at every angle.
// Only the front board receives the title; the back keeps its existing texture.
function coverTitle(r) {
  const glyphs = {
    ' ': ['000','000','000','000','000','000','000'],
    ',': ['000','000','000','000','000','010','100'],
    S: ['011','100','100','010','001','001','110'],
    M: ['101','111','111','101','101','101','101'],
    L: ['100','100','100','100','100','100','111'],
    a: ['000','000','110','001','111','101','111'],
    b: ['100','100','110','101','101','101','110'],
    c: ['000','000','011','100','100','100','011'],
    e: ['000','000','010','101','111','100','011'],
    h: ['100','100','110','101','101','101','101'],
    i: ['010','000','110','010','010','010','111'],
    m: ['000','000','110','111','101','101','101'],
    o: ['000','000','010','101','101','101','010'],
    p: ['000','110','101','101','110','100','100'],
    r: ['000','000','110','101','100','100','100'],
    s: ['000','000','011','100','010','001','110'],
    t: ['010','010','111','010','010','010','001'],
    y: ['000','000','101','101','011','001','110'],
  };
  const scale=2;
  for (const [text,y] of [['Some More',84],['Metaphysics,',106],['by a Liar',132]]) {
    const width=(text.length*4-1)*scale;
    const x0=Math.round((92-width/2)/scale)*scale;
    for (let i=0;i<text.length;i++) {
      const glyph=glyphs[text[i]];
      for (let row=0;row<glyph.length;row++) for (let col=0;col<3;col++) {
        if (glyph[row][col]==='1') {
          // The offset light pixel suggests lettering pressed into the cloth.
          r(x0+i*8+col*scale+1,y+row*scale+1,scale,scale,P.light);
          r(x0+i*8+col*scale,y+row*scale,scale,scale,P.seam);
        }
      }
    }
  }
}
export function buildPhysicalBook(book) {
  book.replaceChildren();
  const back=surface(book,'grimoire-back-board',180,248);board(back.c,back.r);
  const paper=surface(book,'grimoire-pages',180,248);
  paper.r(0,0,180,248,P.paperDark);paper.r(3,2,174,243,P.paper);paper.r(8,4,165,237,P.paperLight);
  paper.r(0,0,10,248,P.paperDark);paper.r(10,0,3,248,'#bca779');
  // Broken miniature strokes suggest an old hand without spelling out text.
  paper.r(24,20,125,1,'#b29a71');
  for (let line=0;line<15;line++) {
    const y=32+line*11, end=140-(line%4===3?28:line%5===0?14:0);
    for(let x=27;x<end;) {
      const n=(line*17+x*11)%23, length=2+n%5;
      paper.r(x,y+(n%3===0?1:0),length,1,n%5===0?'#9b805e':'#795f45');
      if(n%4===0) paper.r(x+1,y-2,1,3,'#795f45');
      if(n%7===0) paper.r(x+length-1,y+1,1,2,'#9b805e');
      x+=length+2+n%4;
    }
  }
  paper.r(24,210,125,1,'#b29a71');
  const near=surface(book,'grimoire-paper-bottom',180,54);
  const fore=surface(book,'grimoire-paper-right',54,248);
  // 216 suggested sheets, grouped into 54 irregular signatures. The common
  // thickness coordinate makes the fore-edge lines meet the tail-edge lines.
  for(let z=0;z<54;z++) {
    const colors=[P.paper,P.paperLight,P.paper,'#beaa80']; const color=colors[z%4];
    const inset=z%13===0?2:z%7===0?1:0;
    near.r(inset,z,180-inset*2,1,color);fore.r(z,inset,1,248-inset*2,color);
    for(let k=0;k<7;k++) {
      const x=8+k*25+(z%3)*2;
      if((k+z)%3===0)near.r(x,z,8+(k%3)*3,1,z%4===0?P.paperDark:'#c9b68b');
      const y=12+k*32+(z%4)*2;
      if((k+z)%4===0)fore.r(z,y,1,11+(k%3)*4,z%4===0?P.paperDark:'#bba578');
    }
    near.r(0,z,9,1,z%3?P.paperDark:P.seam);
  }
  for(const [name,w,h] of [['grimoire-front-board-edge',180,5],['grimoire-back-board-edge',180,5]]) {
    const f=surface(book,name,w,h);f.r(0,0,w,h,P.seam);f.r(2,1,w-4,1,P.dark);f.r(4,2,w-8,1,P.light);
  }
  // Twelve narrow planar facets approximate a rounded leather spine. Their
  // positions form one semicircle, from the top board to the bottom board.
  const facets=12;
  for(let i=0;i<facets;i++) {
    const a=i*Math.PI/facets,b=(i+1)*Math.PI/facets;
    const x0=-30*Math.sin(a),z0=32+32*Math.cos(a),x1=-30*Math.sin(b),z1=32+32*Math.cos(b);
    const dx=x1-x0,dz=z1-z0,len=Math.hypot(dx,dz);
    const f=surface(book,'grimoire-spine-facet',5,248);
    f.face.style.width=`${len+.5}px`;
    f.face.style.transform=`translate3d(${x0}px,0,${z0}px) rotateY(${Math.atan2(-dz,dx)*180/Math.PI}deg)`;
    const shade=[P.dark,P.cloth,P.mid,P.cloth,P.dark,P.shadow,P.shadow,P.seam,P.seam,P.ink,P.ink,P.ink][i];
    f.r(0,0,5,248,shade);
    for(const y of [38,88,152,206]) { f.r(0,y,5,2,P.seam);f.r(0,y+2,5,3,i<5?P.light:P.dark);f.r(0,y+5,5,2,P.shadow); }
    for(let y=15;y<235;y+=11) if((y+i)%3===0)f.r(i%3,y,2,2,i<4?P.light:P.dark);
  }
  // Close the lower end of the rounded spine with a solid, stepped leather cap.
  const cap=surface(book,'grimoire-spine-cap',30,64);
  for(let y=0;y<64;y++) {
    const half=Math.sqrt(Math.max(0,1-((y-31.5)/32)**2));
    const left=Math.max(0,Math.round(30-30*half));
    cap.r(left,y,30-left,1,P.seam);
    if(left+3<29) cap.r(left+2,y,Math.max(1,28-left),1,y<24?P.dark:y<43?P.shadow:P.seam);
    if(left+5<29 && y%5===0) cap.r(left+4,y,2,1,P.cloth);
  }
  const cover=surface(book,'grimoire-cover',180,248);board(cover.c,cover.r);coverTitle(cover.r);
  const inside=document.createElement('span');inside.className='grimoire-cover-inside';cover.face.appendChild(inside);
}
