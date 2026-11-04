// Chalk Story Board — stickers are DOM nodes (cheap transforms, CSS-background effects, no canvas taint),
// chalk lives on one canvas; the in-progress stroke is redrawn on a preview canvas and committed on release.
const $ = s => document.querySelector(s);
const board = $('#board'), itemsEl = $('#items'), ink = $('#ink'), prev = $('#preview');
const ictx = ink.getContext('2d'), pctx = prev.getContext('2d');
const panel = $('#panel'), grid = $('#grid');
const KEY = 'chalk-story.v1';
const COLORS = ['#f6f6ef', '#ffe27a', '#ff8fb1', '#8fd3ff', '#a8f0a0', '#ffb36b', '#ff6b6b'];
const dpr = Math.min(devicePixelRatio || 1, 2);
let tool = 'select', color = COLORS[0], size = 6, sel = null, cat = null;

/* ---------------- sticker library ---------------- */
const imgUrl = (u, s) => { const [p, a, f] = u.split('|'); return `${cat.prefixes[p]}${a}/${s}/${f}`; };
let index = [], results = [], shown = 0, catMask = 0;
const sentinel = Object.assign(document.createElement('div'), { className: 'more' });

async function loadCatalog() {
  cat = await (await fetch('catalog.json')).json();
  // one lowercase haystack per sticker: JP title + JP/EN labels + EN title tags + romaji file name
  index = cat.items.map(([t, l, u, m, g]) => ({
    t, u, m,
    s: ' ' + [t, ...l.map(i => cat.labels[i].join(' ')), ...g.map(i => cat.tags[i]), u.split('|')[2].replace(/\.\w+$/, '')]
      .join(' ').toLowerCase().replace(/[_\-]/g, ' '),
  }));
  $('#cats').replaceChildren(...[['', 'All', '✨'], ...cat.cats].map(([id, name, icon], b) => {
    const btn = Object.assign(document.createElement('button'), { textContent: `${icon} ${name}`, className: b ? '' : 'on' });
    btn.onclick = () => {
      catMask = b ? 1 << (b - 1) : 0;
      document.querySelectorAll('#cats button').forEach(x => x.classList.toggle('on', x === btn));
      search();
    };
    return btn;
  }));
  search();
  restore();
}

function search() {
  const toks = $('#search').value.toLowerCase().trim().split(/\s+/).filter(Boolean);
  // latin words match at a word start ("cat" ≠ "education"); Japanese matches anywhere
  const tests = toks.map(t => /^[\x00-\x7f]+$/.test(t) ? s => s.includes(' ' + t) : s => s.includes(t));
  results = [];
  for (let i = 0; i < index.length; i++) {
    const it = index[i];
    if ((!catMask || it.m & catMask) && tests.every(f => f(it.s))) results.push(i);
  }
  shown = 0;
  grid.replaceChildren(sentinel);
  grid.scrollTop = 0;
  more();
  $('#count').textContent = `${results.length.toLocaleString()} stickers — drag onto the board or click to add`;
}

function more() {
  const frag = document.createDocumentFragment();
  for (const end = Math.min(shown + 120, results.length); shown < end; shown++) {
    const it = index[results[shown]];
    const f = document.createElement('figure');
    f.draggable = true; f.title = it.t; f.dataset.i = results[shown];
    f.innerHTML = `<img loading="lazy" decoding="async" alt="">`;
    f.firstChild.src = imgUrl(it.u, 's160');
    frag.append(f);
  }
  grid.insertBefore(frag, sentinel);
}
new IntersectionObserver(e => e[0].isIntersecting && more(), { root: grid, rootMargin: '600px' }).observe(sentinel);
let searchT;
$('#search').oninput = () => { clearTimeout(searchT); searchT = setTimeout(search, 120); };

grid.addEventListener('dragstart', e => {
  const f = e.target.closest('figure');
  e.dataTransfer.setData('text/x-sticker', f.dataset.i);
  e.dataTransfer.effectAllowed = 'copy';
});
grid.addEventListener('click', e => {
  const f = e.target.closest('figure');
  if (!f) return;
  const r = ink.getBoundingClientRect();
  addSticker(+f.dataset.i, r.width / 2 + (Math.random() - .5) * 120, r.height / 2 + (Math.random() - .5) * 80);
});
board.addEventListener('dragover', e => {
  if (!e.dataTransfer.types.includes('text/x-sticker')) return;
  e.preventDefault(); board.classList.add('drop');
});
board.addEventListener('dragleave', () => board.classList.remove('drop'));
board.addEventListener('drop', e => {
  board.classList.remove('drop');
  const i = e.dataTransfer.getData('text/x-sticker');
  if (i === '') return;
  e.preventDefault();
  const r = ink.getBoundingClientRect();
  addSticker(+i, e.clientX - r.left, e.clientY - r.top);
});

function addSticker(i, cx, cy) {
  const s = index[i];
  const it = makeItem({ type: 'img', u: s.u, title: s.t, w: 180, x: cx - 90, y: cy - 90 });
  select(it); save();
}

/* ---------------- board items ---------------- */
function makeItem(d) {
  const it = { type: 'img', x: 0, y: 0, w: 180, fs: 40, rot: 0, flip: false, name: '', anim: '', mode: 'loop', text: '', color, ...d };
  const el = document.createElement('div');
  el.className = 'item ' + it.type;
  el.innerHTML = '<div class="tag"></div><div class="body"></div><div class="handle h-rot" title="Rotate"></div><div class="handle h-scale" title="Resize"></div>';
  it.el = el; it.body = el.children[1]; el._it = it;
  if (it.type === 'img') {
    const img = new Image();
    img.draggable = false; img.alt = it.title; img.decoding = 'async';
    img.src = imgUrl(it.u, 's512');
    it.body.append(img);
  } else {
    it.body.textContent = it.text;
  }
  render(it);
  itemsEl.append(el);
  bindItem(it);
  startAnim(it);
  return it;
}

function render(it) {
  const { el, body } = it;
  el.style.transform = `translate(${it.x}px,${it.y}px) rotate(${it.rot}deg)`;
  el.classList.toggle('flip', it.flip);
  el.classList.toggle('has-tag', !!it.name);
  el.firstChild.textContent = it.name;
  if (it.type === 'img') body.style.width = it.w + 'px';
  else { body.style.fontSize = it.fs + 'px'; body.style.color = it.color; }
}

function bindItem(it) {
  const { el, body } = it;
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0 || body.isContentEditable) return;
    if (tool === 'text' && it.type === 'text') { e.preventDefault(); return editText(it); }
    e.preventDefault(); e.stopPropagation();
    select(it);
    const h = e.target.closest('.handle');
    const mode = !h ? 'move' : h.classList.contains('h-rot') ? 'rot' : 'scale';
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const st = { x: e.clientX, y: e.clientY, ix: it.x, iy: it.y, w: it.w, fs: it.fs, rot: it.rot,
      d: Math.hypot(e.clientX - cx, e.clientY - cy) || 1, a: Math.atan2(e.clientY - cy, e.clientX - cx),
      bx: it.x + el.offsetWidth / 2, by: it.y + el.offsetHeight / 2 };
    let moved = false;
    try { el.setPointerCapture(e.pointerId); } catch {} // throws for synthetic events
    const move = ev => {
      if (Math.hypot(ev.clientX - st.x, ev.clientY - st.y) > 3) moved = true;
      if (mode === 'move') { it.x = st.ix + ev.clientX - st.x; it.y = st.iy + ev.clientY - st.y; }
      else if (mode === 'rot') {
        it.rot = st.rot + (Math.atan2(ev.clientY - cy, ev.clientX - cx) - st.a) * 180 / Math.PI;
        if (ev.shiftKey) it.rot = Math.round(it.rot / 15) * 15;
      } else {
        const k = Math.hypot(ev.clientX - cx, ev.clientY - cy) / st.d;
        if (it.type === 'img') it.w = Math.max(30, Math.min(1400, st.w * k)); else it.fs = Math.max(12, Math.min(320, st.fs * k));
        render(it);
        it.x = st.bx - el.offsetWidth / 2; it.y = st.by - el.offsetHeight / 2; // scale around the center
      }
      render(it); placePanel();
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      if (moved) save(); else if (mode === 'move' && it.mode === 'click') trigger(it);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  });
  el.addEventListener('dblclick', () => it.type === 'text' ? editText(it) : $('#pName').focus());
}

function editText(it) {
  const b = it.body;
  select(it);
  b.contentEditable = 'true';
  b.focus();
  getSelection().selectAllChildren(b);
  b.addEventListener('blur', () => {
    b.contentEditable = 'false';
    it.text = b.innerText.replace(/\n$/, '');
    if (!it.text.trim()) removeItem(it); else save();
  }, { once: true });
}

function removeItem(it) {
  stopAnim(it);
  it.el.remove();
  if (sel === it) select(null);
  save();
}

/* ---------------- selection panel ---------------- */
const pName = $('#pName'), pAnim = $('#pAnim'), pMode = $('#pMode');
function select(it) {
  sel?.el.classList.remove('sel');
  sel = it;
  panel.hidden = !it;
  if (!it) return;
  it.el.classList.add('sel');
  pName.hidden = it.type !== 'img';
  pName.value = it.name;
  for (const o of pAnim.options) o.disabled = it.type === 'text' && !!FX[o.value]?.imgOnly;
  pAnim.value = it.anim; pMode.value = it.mode;
  placePanel();
}
function placePanel() {
  if (!sel) return;
  const r = sel.el.getBoundingClientRect(), pw = panel.offsetWidth, ph = panel.offsetHeight;
  let top = r.bottom + 14;
  if (top + ph > innerHeight - 8) top = Math.max(8, r.top - ph - (sel.name ? 52 : 18));
  panel.style.top = top + 'px';
  panel.style.left = Math.max(8, Math.min(innerWidth - pw - 8, r.left + r.width / 2 - pw / 2)) + 'px';
}
pName.oninput = () => { sel.name = pName.value; render(sel); save(); };
pAnim.onchange = () => { sel.anim = pAnim.value; startAnim(sel); save(); };
pMode.onchange = () => { sel.mode = pMode.value; startAnim(sel); save(); };
$('#pPlay').onclick = () => trigger(sel);
$('#pFlip').onclick = () => { sel.flip = !sel.flip; render(sel); save(); };
$('#pFront').onclick = () => { itemsEl.append(sel.el); save(); };
$('#pDup').onclick = () => {
  const { el, body, ...d } = sel;
  for (const k of Object.keys(d)) if (k[0] === '_') delete d[k];
  select(makeItem({ ...d, x: d.x + 30, y: d.y + 30 })); save();
};
$('#pDel').onclick = () => removeItem(sel);
addEventListener('resize', placePanel);

/* ---------------- 10 animations ---------------- */
// Motion effects animate the .body (loop forever, or 2 rounds on click).
// Break effects take the picture apart; on click they toggle broken/restored, in loop mode they cycle.
const motion = (label, kf, o) => ({ label, kf, o });
const FX = {
  bounce: motion('Bounce (jump)', [
    { transform: 'translateY(0) scale(1)' }, { transform: 'translateY(0) scale(1.1,.9)', offset: .12 },
    { transform: 'translateY(-28%) scale(.95,1.05)', offset: .45 }, { transform: 'translateY(0) scale(1.08,.92)', offset: .82 },
    { transform: 'translateY(0) scale(1)' }], { duration: 760, easing: 'ease-in-out' }),
  shake: motion('Shake (angry / scared)', [
    { transform: 'translate(0) rotate(0)' }, { transform: 'translate(-6px,1px) rotate(-3deg)' }, { transform: 'translate(5px,-1px) rotate(3deg)' },
    { transform: 'translate(-4px,0) rotate(-2deg)' }, { transform: 'translate(4px,1px) rotate(2deg)' }, { transform: 'translate(0) rotate(0)' }],
    { duration: 380, n: 3 }),
  float: motion('Float', [
    { transform: 'translateY(0) rotate(-2deg)' }, { transform: 'translateY(-14px) rotate(2deg)' }, { transform: 'translateY(0) rotate(-2deg)' }],
    { duration: 2600, easing: 'ease-in-out', n: 1 }),
  spin: motion('Spin', [{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: 1100, n: 1 }),
  heartbeat: motion('Heartbeat', [
    { transform: 'scale(1)' }, { transform: 'scale(1.16)', offset: .14 }, { transform: 'scale(1)', offset: .28 },
    { transform: 'scale(1.12)', offset: .42 }, { transform: 'scale(1)', offset: .7 }], { duration: 1100 }),
  talk: motion('Talk (chatter)', [
    { transform: 'scale(1) rotate(0)' }, { transform: 'scale(1.03,.95) rotate(-2deg)', offset: .3 },
    { transform: 'scale(.98,1.03) rotate(1.5deg)', offset: .65 }, { transform: 'scale(1) rotate(0)' }], { duration: 340, n: 5 }),
  strike: { label: 'Strike through', play: strike },
  explode: { label: 'Blow to bits', play: explode, imgOnly: true },
  melt: { label: 'Melt', play: melt, imgOnly: true },
  poof: { label: 'Poof (vanish in smoke)', play: poof },
};
for (const [k, f] of Object.entries(FX)) pAnim.add(new Option(f.label, k));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const done = anims => Promise.all(anims.map(a => a.finished)).catch(() => {});
const R = (a, b) => a + Math.random() * (b - a);

// Cut the picture into a grid of <i> tiles that each show their part of the image as a CSS background.
function slice(it, cols, rows) {
  const img = it.body.querySelector('img'), w = img.clientWidth, h = img.clientHeight;
  const wrap = Object.assign(document.createElement('div'), { className: 'bits' });
  const tiles = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = document.createElement('i'), x = c * w / cols, y = r * h / rows;
    Object.assign(i.style, { left: x + 'px', top: y + 'px', width: w / cols + .6 + 'px', height: h / rows + .6 + 'px',
      backgroundImage: `url("${img.src}")`, backgroundSize: `${w}px ${h}px`, backgroundPosition: `${-x}px ${-y}px` });
    wrap.append(i);
    tiles.push({ i, cx: x + w / cols / 2, cy: y + h / rows / 2 });
  }
  it.body.append(wrap);
  img.style.visibility = 'hidden';
  return { tiles, w, h };
}

function explode(it) {
  const { tiles, w, h } = slice(it, 9, 9);
  it.body.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], 140);
  return tiles.map(({ i, cx, cy }) => {
    const a = Math.atan2(cy - h / 2, cx - w / 2) + R(-.5, .5), d = R(.5, 1.5) * Math.max(w, h);
    return i.animate([{ transform: 'none', opacity: 1 },
      { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d - h * .15}px) rotate(${R(-500, 500)}deg) scale(.35)`, opacity: 0 }],
      { duration: R(650, 1150), easing: 'cubic-bezier(.12,.8,.3,1)', fill: 'both' });
  });
}

function melt(it) {
  const { tiles, h } = slice(it, 22, 1);
  return tiles.map(({ i }) => {
    i.style.transformOrigin = '50% 0';
    return i.animate([{ transform: 'none', opacity: 1, filter: 'blur(0)' },
      { transform: `translateY(${h * R(.12, .3)}px) scaleY(${R(1.1, 1.5)})`, opacity: .9, filter: 'blur(.5px)', offset: .55 },
      { transform: `translateY(${h * R(.35, .7)}px) scaleY(${R(1.4, 2.1)})`, opacity: 0, filter: 'blur(2px)' }],
      { duration: R(1300, 1900), delay: R(0, 450), easing: 'cubic-bezier(.55,0,.85,.6)', fill: 'both' });
  });
}

function strike(it) {
  const target = it.body.querySelector('img') || it.body;
  it.el.insertAdjacentHTML('beforeend', `<svg class="fx-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
    <path d="M10 ${R(55, 62)} Q 50 ${R(44, 52)} 90 ${R(36, 44)}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"
      fill="none" stroke="#ff6b6b" stroke-width="9" stroke-linecap="round" vector-effect="non-scaling-stroke" opacity=".92"/></svg>`);
  const path = it.el.lastChild.firstElementChild;
  return [
    path.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 380, easing: 'ease-out', fill: 'both' }),
    target.animate([{ filter: 'none', opacity: 1 }, { filter: 'grayscale(1) brightness(.85)', opacity: .55 }], { duration: 380, fill: 'both' }),
  ];
}

function poof(it) {
  const w = it.el.offsetWidth, h = it.el.offsetHeight, s = Math.max(w, h) * .45;
  for (let k = 0; k < 10; k++) {
    const p = Object.assign(document.createElement('div'), { className: 'puff' });
    Object.assign(p.style, { width: s + 'px', height: s + 'px', left: w / 2 - s / 2 + R(-w / 4, w / 4) + 'px', top: h / 2 - s / 2 + R(-h / 4, h / 4) + 'px' });
    it.el.append(p);
    p.animate([{ transform: 'scale(.2)', opacity: .95 },
      { transform: `translate(${R(-w, w) * .5}px,${R(-h, h) * .5 - 20}px) scale(${R(1.2, 1.9)})`, opacity: 0 }],
      { duration: R(600, 1000), easing: 'ease-out', fill: 'forwards' }).onfinish = () => p.remove();
  }
  return [it.body.animate([{ transform: 'scale(1)', filter: 'blur(0)', opacity: 1 },
    { transform: 'scale(1.35)', filter: 'blur(10px)', opacity: 0 }], { duration: 480, easing: 'ease-out', fill: 'both' })];
}

// Hard reset: kill every animation on the item and drop effect overlays.
function stopAnim(it) { it._token = null; it._busy = false; clearFx(it); }
function clearFx(it) {
  it._broken = null;
  it.el.getAnimations({ subtree: true }).forEach(a => a.cancel());
  it.el.querySelectorAll('.bits, .fx-svg, .puff').forEach(n => n.remove());
  const img = it.body.querySelector('img');
  if (img) img.style.visibility = '';
}

async function breakIt(it, f) { it._broken = f.play(it); await done(it._broken); }
async function restoreIt(it) {
  const anims = it._broken;
  if (!anims) return;
  anims.forEach(a => a.reverse());
  await done(anims);
  if (it._broken === anims) clearFx(it);
}

function startAnim(it) {
  stopAnim(it);
  const f = FX[it.anim];
  if (!f || it.mode !== 'loop') return;
  if (f.kf) {
    const a = it.body.animate(f.kf, { ...f.o, iterations: Infinity });
    a.currentTime = Math.random() * f.o.duration; // desync neighbours
    return;
  }
  const token = it._token = {};
  (async () => {
    await sleep(R(0, 600));
    while (it._token === token) {
      await breakIt(it, f); await sleep(1100);
      if (it._token !== token) break;
      await restoreIt(it); await sleep(900);
    }
  })();
}

async function trigger(it) {
  const f = FX[it?.anim];
  if (!f || it._busy) return;
  if (f.kf) {
    if (it.mode === 'loop') return;
    it.body.getAnimations().forEach(a => a.cancel());
    it.body.animate(f.kf, { ...f.o, iterations: f.o.n || 2 });
    return;
  }
  if (it.mode === 'loop') return;
  it._busy = true;
  if (it._broken) await restoreIt(it); else await breakIt(it, f);
  it._busy = false;
}

/* ---------------- chalk ---------------- */
const patterns = {};
function grain(col) { // speckled tile = chalk texture
  if (patterns[col]) return patterns[col];
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = col;
  for (let i = 0; i < 9000; i++) {
    x.globalAlpha = R(.25, 1);
    const s = Math.random() < .85 ? 1 : 2;
    x.fillRect(Math.random() * 128 | 0, Math.random() * 128 | 0, s, s);
  }
  const p = pctx.createPattern(c, 'repeat');
  p.setTransform(new DOMMatrix().scale(1 / dpr));
  return patterns[col] = p;
}

function chalk(ctx, pts, col, w) {
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 1) ctx.lineTo(pts[0].x + .1, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const m = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 };
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, m.x, m.y);
  }
  if (pts.length > 1) ctx.lineTo(pts.at(-1).x, pts.at(-1).y);
  ctx.globalAlpha = .22; ctx.strokeStyle = col; ctx.stroke();
  ctx.globalAlpha = 1; ctx.strokeStyle = grain(col); ctx.stroke();
}

function ellipsePts(a, b) { // hand-drawn: slightly wobbly and overshoots its start
  const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, rx = Math.abs(b.x - a.x) / 2, ry = Math.abs(b.y - a.y) / 2;
  const pts = [], n = 64, start = -2.2, seed = (a.x * 7 + a.y * 13) % 6;
  for (let i = 0; i <= n * 1.08; i++) {
    const t = start + i / n * Math.PI * 2, k = 1 + .025 * Math.sin(t * 3 + seed) + (i / n) * .04;
    pts.push({ x: cx + Math.cos(t) * rx * k, y: cy + Math.sin(t) * ry * k });
  }
  return pts;
}

function arrow(ctx, a, b, col, w) {
  chalk(ctx, [a, b], col, w);
  const ang = Math.atan2(b.y - a.y, b.x - a.x), L = Math.max(16, w * 3.2);
  for (const s of [-1, 1]) chalk(ctx, [b, { x: b.x - L * Math.cos(ang + s * .45), y: b.y - L * Math.sin(ang + s * .45) }], col, w);
}

let cssW = 0, cssH = 0;
function fit() {
  const r = ink.getBoundingClientRect();
  if (!r.width || (r.width === cssW && r.height === cssH)) return;
  const keep = document.createElement('canvas');
  keep.width = ink.width; keep.height = ink.height;
  if (ink.width && ink.height) keep.getContext('2d').drawImage(ink, 0, 0);
  cssW = r.width; cssH = r.height;
  for (const c of [ink, prev]) { c.width = Math.round(cssW * dpr); c.height = Math.round(cssH * dpr); }
  if (keep.width && keep.height) ictx.drawImage(keep, 0, 0);
  ictx.setTransform(dpr, 0, 0, dpr, 0, 0);
  pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
new ResizeObserver(fit).observe(board);

const undoStack = [];
function snapshot() { undoStack.push(createImageBitmap(ink)); if (undoStack.length > 25) undoStack.shift(); }
function commit() {
  snapshot();
  ictx.save(); ictx.setTransform(1, 0, 0, 1, 0, 0); ictx.drawImage(prev, 0, 0); ictx.restore();
  pctx.clearRect(0, 0, cssW, cssH);
  save();
}
async function undo() {
  const p = undoStack.pop();
  if (!p) return;
  const bm = await p;
  ictx.save(); ictx.setTransform(1, 0, 0, 1, 0, 0); ictx.clearRect(0, 0, ink.width, ink.height); ictx.drawImage(bm, 0, 0); ictx.restore();
  save();
}

ink.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  const r = ink.getBoundingClientRect(), P = ev => ({ x: ev.clientX - r.left, y: ev.clientY - r.top });
  const a = P(e), pts = [a];
  try { ink.setPointerCapture(e.pointerId); } catch {}
  if (tool === 'eraser') snapshot();
  let raf = 0, last = a;
  const draw = () => {
    raf = 0;
    if (tool === 'eraser') return;
    pctx.clearRect(0, 0, cssW, cssH);
    if (tool === 'chalk') chalk(pctx, pts, color, size);
    else if (tool === 'circle') chalk(pctx, ellipsePts(a, last), color, size);
    else if (tool === 'arrow') arrow(pctx, a, last, color, size);
  };
  const move = ev => {
    const co = ev.getCoalescedEvents?.();
    for (const ce of co?.length ? co : [ev]) {
      const p = P(ce);
      if (tool === 'eraser') {
        ictx.save(); ictx.globalCompositeOperation = 'destination-out'; ictx.lineCap = 'round'; ictx.lineWidth = size * 4;
        ictx.beginPath(); ictx.moveTo(last.x, last.y); ictx.lineTo(p.x, p.y); ictx.stroke(); ictx.restore();
      } else if (tool === 'chalk') pts.push(p);
      last = p;
    }
    raf ||= requestAnimationFrame(draw);
  };
  const up = () => {
    ink.removeEventListener('pointermove', move);
    ink.removeEventListener('pointerup', up);
    ink.removeEventListener('pointercancel', up);
    cancelAnimationFrame(raf); draw();
    if (tool === 'eraser') save();
    else if (tool === 'chalk' || Math.hypot(last.x - a.x, last.y - a.y) > 4) commit();
    else pctx.clearRect(0, 0, cssW, cssH);
  };
  ink.addEventListener('pointermove', move);
  ink.addEventListener('pointerup', up);
  ink.addEventListener('pointercancel', up);
  draw();
});

// empty board: deselect, or place text with the Text tool
board.addEventListener('pointerdown', e => {
  if (e.target !== board && e.target !== itemsEl) return;
  if (document.activeElement?.isContentEditable) return document.activeElement.blur();
  select(null);
  if (tool !== 'text') return;
  e.preventDefault();
  const r = ink.getBoundingClientRect();
  const it = makeItem({ type: 'text', text: 'Text', fs: 40, x: e.clientX - r.left - 10, y: e.clientY - r.top - 25 });
  editText(it);
});

/* ---------------- toolbar ---------------- */
function setTool(t) {
  tool = t;
  board.dataset.tool = t;
  board.classList.toggle('drawing', ['chalk', 'circle', 'arrow', 'eraser'].includes(t));
  document.querySelectorAll('#tools button').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  if (t !== 'select' && t !== 'text') select(null);
  if (!board.classList.contains('drawing')) brush.hidden = true;
  setSize(size); // eraser ring is 4× the brush
}
document.querySelectorAll('#tools button').forEach(b => b.onclick = () => setTool(b.dataset.tool));
$('#colors').replaceChildren(...COLORS.map((c, i) => {
  const b = Object.assign(document.createElement('button'), { className: 'swatch' + (i ? '' : ' on'), title: 'Chalk color' });
  b.setAttribute('aria-label', 'Chalk color ' + c);
  b.style.background = c;
  b.onclick = () => {
    color = c;
    $('#sizeDot').style.setProperty('--c', c);
    document.querySelectorAll('.swatch').forEach(x => x.classList.toggle('on', x === b));
    if (sel?.type === 'text') { sel.color = c; render(sel); save(); }
  };
  return b;
}));
// brush size: slider, Ctrl+scroll on the board, and a ring cursor that shows the real size
const brush = $('#brush'), sizeIn = $('#size');
function setSize(n) {
  size = Math.max(+sizeIn.min, Math.min(+sizeIn.max, Math.round(n)));
  sizeIn.value = size;
  $('#sizeVal').value = size;
  $('#sizeDot').style.setProperty('--d', size + 'px');
  const d = tool === 'eraser' ? size * 4 : size;
  brush.style.width = brush.style.height = Math.max(4, d) + 'px';
}
sizeIn.oninput = () => setSize(+sizeIn.value);
board.addEventListener('wheel', e => {
  if (!e.ctrlKey) return;
  e.preventDefault(); // stop browser zoom
  setSize(size + Math.sign(-e.deltaY) * (size >= 12 ? 2 : 1));
}, { passive: false });
board.addEventListener('pointermove', e => {
  brush.hidden = !board.classList.contains('drawing');
  if (brush.hidden) return;
  const r = ink.getBoundingClientRect();
  brush.style.transform = `translate(${e.clientX - r.left}px,${e.clientY - r.top}px)`;
});
board.addEventListener('pointerleave', () => brush.hidden = true);
$('#undo').onclick = undo;
$('#clearInk').onclick = () => { snapshot(); ictx.clearRect(0, 0, cssW, cssH); save(); };
$('#clearAll').onclick = () => {
  if (!confirm('Clear the whole board (stickers, text and chalk)?')) return;
  [...itemsEl.children].forEach(el => removeItem(el._it));
  snapshot(); ictx.clearRect(0, 0, cssW, cssH); save();
};

addEventListener('keydown', e => {
  // only real text entry swallows hotkeys; a focused dropdown, slider or button does not
  if (e.target.closest('textarea, [contenteditable="true"], input:not([type="range"])')) {
    if (e.key === 'Escape') e.target.blur();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); return undo(); }
  if ((e.key === 'Delete' || e.key === 'Backspace') && sel) { e.preventDefault(); return removeItem(sel); }
  if (e.key === 'Escape') { e.target.blur?.(); return select(null); }
  const t = { v: 'select', b: 'chalk', c: 'circle', a: 'arrow', t: 'text', e: 'eraser' }[e.key.toLowerCase()];
  if (t && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault(); // stops a focused <select> from jumping to the option starting with that letter
    e.target.blur?.();
    setTool(t);
  }
});

/* ---------------- save / restore (this browser only) ---------------- */
const FIELDS = ['type', 'u', 'title', 'x', 'y', 'w', 'fs', 'rot', 'flip', 'name', 'anim', 'mode', 'text', 'color'];
let saveT, restored = false;
function save() {
  if (!restored) return;
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    const items = [...itemsEl.children].map(el => Object.fromEntries(FIELDS.map(k => [k, el._it[k]])));
    try { localStorage.setItem(KEY, JSON.stringify({ items, ink: ink.toDataURL(), dpr })); } catch { /* storage full or blocked: board still works */ }
  }, 400);
}
function restore() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(KEY)); } catch {}
  restored = true;
  if (!data) return;
  for (const d of data.items || []) if (d.type === 'text' || d.u) makeItem(d);
  if (data.ink) {
    const img = new Image();
    img.onload = () => ictx.drawImage(img, 0, 0, img.width / data.dpr, img.height / data.dpr);
    img.src = data.ink;
  }
}

setTool('select');
fit();
loadCatalog().catch(err => { $('#count').textContent = 'Could not load catalog.json: ' + err.message; restore(); });
