/* Handrbolka Štúdio – ovládanie apky */
"use strict";
(() => {
const $ = id => document.getElementById(id);
const CFG = window.HB_CONFIG || {};
const F = HB.FORMATS;

/* ---------- šablóny ---------- */
const BASE = () => ({
  v: 1, name: '',
  blocks: [],
  layout: 'stred', align: 'center', bg: 'salvia',
  logo: { mode: 'hlavne', size: 1, sub: true, subText: 'Vzdelávanie' },
  photo: { on: false, frame: 'psik', color: 'auto', size: 1, zoom: 1, x: .5, y: .5 },
  doodles: { count: 6, size: 1, set: 'mix', seed: 3, color: 'farebne' },
  footer: { print: true, handle: true, handleText: '@lesny_klub_handrbolka', web: 'https://handrbolka.sk', ig: 'https://www.instagram.com/lesny_klub_handrbolka/', fb: 'https://www.facebook.com/Lesný-klub-Handrbolka-894716297250422' },
  titleScale: 1, textScale: 1, underline: true,
  anim: { style: 'kreslenie', dur: 4, title: true, sub: true }
});
const TEMPLATES = {
  obal: { name: 'Obálka / plagát klubu', make: s => { s.blocks = [{ type: 'citat', text: 'Malé kroky, veľké dobrodružstvá' }]; s.logo.mode = 'hlavne'; s.doodles.count = 7; s.doodles.seed = 3; } },
  podujatie: { name: 'Pozvánka na podujatie', make: s => { s.blocks = [{ type: 'nadpis', text: 'Deň otvorených dverí' }, { type: 'info', text: 'Sobota 15. 11. · 10:00 – 13:00' }, { type: 'podnadpis', text: 'Kubrická 94, Trenčín' }, { type: 'text', text: 'Príďte si s deťmi vyskúšať deň v lese.\nUkážeme vám, ako sa u nás učíme hrou.' }]; s.logo.mode = 'male'; s.logo.sub = false; s.doodles.count = 6; s.doodles.seed = 11; } },
  program: { name: 'Program so zoznamom', make: s => { s.blocks = [{ type: 'sekcia', text: 'Lesný Klub' }, { type: 'podnadpis', text: '1. - 5. ročník' }, { type: 'odrazky', text: 'vzdelávanie v malých skupinách\nrešpektujúci a individuálny prístup\nučenie cez zážitok, prax a objavovanie\nprirodzené tempo učenia bez zbytočného tlaku\nprepojenie vzdelávania s prírodou a reálnym životom' }]; s.logo.mode = 'dole'; s.logo.sub = false; s.layout = 'foto-dole'; s.photo.on = true; s.photo.frame = 'hrad'; s.doodles.count = 3; s.doodles.set = 'les'; s.doodles.seed = 5; s.textScale = 1.05; } },
  foto: { name: 'Fotka v rámiku', make: s => { s.blocks = [{ type: 'nadpis', text: 'Jablkový deň' }, { type: 'podnadpis', text: 'tvoríme, ochutnávame, objavujeme' }]; s.logo.mode = 'male'; s.logo.sub = false; s.layout = 'foto-hore'; s.photo.on = true; s.photo.frame = 'psik'; s.doodles.count = 4; s.doodles.seed = 21; } },
  zapis: { name: 'Zápis / oznam', make: s => { s.blocks = [{ type: 'sekcia', text: 'Zápis na školský rok 2027/28' }, { type: 'info', text: 'do 31. januára' }, { type: 'odrazky', text: 'Lesníčkovia 0 – 3 roky\nSúkromná materská škola 3 – 6 rokov\nLesný klub 1. – 5. ročník' }, { type: 'text', text: 'Viac na handrbolka.sk alebo na 0915 135 421' }]; s.logo.mode = 'male'; s.logo.sub = false; s.layout = 'stred'; s.doodles.count = 5; s.doodles.set = 'les'; s.doodles.seed = 8; } },
  citat: { name: 'Citát / myšlienka', make: s => { s.blocks = [{ type: 'citat', text: 'Deti sa najviac naučia, keď majú čas, priestor a dôveru.' }]; s.titleScale = 1; s.textScale = 1.35; s.logo.mode = 'dole'; s.logo.sub = false; s.bg = 'zelena'; s.doodles.count = 5; s.doodles.set = 'les'; s.doodles.seed = 14; } }
};
const fromTemplate = k => { const s = BASE(); TEMPLATES[k].make(s); return s; };

const LAYOUTS = { stred: ['Na stred', 'ako plagát'], hore: ['Odhora', 'viac textu'], 'foto-hore': ['Fotka hore', 'potom text'], 'foto-dole': ['Fotka dole', 'najprv text'] };
const LOGO_MODES = { hlavne: ['Veľké', 'dominanta'], male: ['Malé hore', ''], dole: ['Malé dole', ''], skryte: ['Bez loga', ''] };
const FRAMES = { psik: ['Psík', 'okrový'], hrad: ['Hrad', 'koralový'], ceruzka: ['Ceruzka', 'okrová'], none: ['Bez rámika', 'zaoblená'] };
const ANIMS = { kreslenie: ['Kreslenie', 'kúsok po kúsku'], vyrastanie: ['Vyrastanie', 's odrazom'], prelnutie: ['Pokojné', 'jemné prelnutie'] };
const TYPES = { nadpis: 'Nadpis', podnadpis: 'Podnadpis', sekcia: 'Nadpis s vlnovkou', info: 'Dátum / miesto', odrazky: 'Odrážky', citat: 'Citát', text: 'Malý text' };

let st = fromTemplate('obal');
let cur = 'post';
let photoImg = undefined; // HTMLImageElement | null | undefined
let photoData = null;
let photoOrig = null; // originál v plnom rozlíšení (len počas práce), pre tlač na 300 dpi
const FONT_BYTES = {}; // váha -> ArrayBuffer (pre texty ako krivky v PDF)
let currentId = null;

/* ---------- úložisko ---------- */
const Store = (() => {
  let sb = null, user = null;
  const KEY = 'hb_designs_v1';
  const local = {
    kind: 'local',
    async list() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } },
    async save(d) {
      const all = await this.list(); const i = all.findIndex(x => x.id === d.id);
      if (i >= 0) all[i] = d; else all.unshift(d);
      try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) { throw new Error('V prehliadači už nie je miesto. Zmaž staršie návrhy.'); }
      return d;
    },
    async remove(id) { const all = (await this.list()).filter(x => x.id !== id); try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) {} }
  };
  const remote = {
    kind: 'supabase',
    async list() {
      const { data, error } = await sb.from('handrbolka_designs').select('id,name,state,photo,thumb,updated_at').order('updated_at', { ascending: false });
      if (error) throw error; return data.map(r => ({ ...r, updated: r.updated_at }));
    },
    async save(d) {
      const row = { name: d.name, state: d.state, photo: d.photo, thumb: d.thumb, updated_at: new Date().toISOString() };
      if (d.id && !String(d.id).startsWith('l_')) row.id = d.id;
      const { data, error } = await sb.from('handrbolka_designs').upsert(row).select('id').single();
      if (error) throw error; d.id = data.id; return d;
    },
    async remove(id) { const { error } = await sb.from('handrbolka_designs').delete().eq('id', id); if (error) throw error; }
  };
  return {
    impl: local,
    get sb() { return sb; },
    async init() {
      if (!(CFG.supabaseUrl && CFG.supabaseKey && window.supabase)) return { needLogin: false };
      sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey);
      const { data } = await sb.auth.getSession();
      user = data.session?.user || null;
      if (user) this.impl = remote;
      return { needLogin: !user };
    },
    async login(email, pass) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) throw error; user = data.user; this.impl = remote;
    },
    async logout() { await sb.auth.signOut(); location.reload(); }
  };
})();

/* ---------- fonty ---------- */
async function loadFonts() {
  if (CFG.fontsFromSupabase && Store.sb) {
    const files = { 400: 'GoldplayAltRegular.woff', 600: 'GoldplayAltSemiBold.woff', 700: 'GoldplayAltBold.woff' };
    try {
      const { data, error } = await Store.sb.from('handrbolka_assets').select('name,data').in('name', Object.values(files));
      if (error) throw error;
      const byName = Object.fromEntries((data || []).map(r => [r.name, r.data]));
      await Promise.all(Object.entries(files).map(async ([w, f]) => {
        if (!byName[f]) return;
        const bin = Uint8Array.from(atob(byName[f]), c => c.charCodeAt(0)); FONT_BYTES[w] = bin.buffer.slice(0);
        const weights = w === '600' ? ['500', '600'] : [w];
        for (const ww of weights) { const face = new FontFace('GoldplayAlt', bin.buffer.slice(0), { weight: ww }); await face.load(); document.fonts.add(face); }
      }));
    } catch (e) { console.warn('Font sa nenačítal', e); }
  }
  try { await Promise.all([400, 500, 600, 700].map(w => document.fonts.load(`${w} 40px GoldplayAlt`, 'Handrbolka ľščťžýáíé'))); } catch (e) {}
}

/* ---------- canvasy ---------- */
function drawTo(canvas, fmtKey, opts = {}) {
  const fmt = F[fmtKey]; const ctx = canvas.getContext('2d');
  const sc = canvas.width / fmt.W;
  ctx.setTransform(sc, 0, 0, sc, 0, 0); ctx.clearRect(0, 0, fmt.W, fmt.H);
  const o = { photoImg: st.photo.on || st.bg === 'foto' ? (photoImg || null) : undefined, ...opts };
  if (fmt.anim && o.t == null) o.t = st.anim.dur; // statický náhľad intra = posledný snímok
  return HB.render(ctx, fmtKey, opts.state || st, o);
}
const mainC = $('main');
function sizeMain() {
  const fmt = F[cur]; const target = 1000;
  const k = target / Math.max(fmt.W, fmt.H);
  mainC.width = Math.round(fmt.W * k); mainC.height = Math.round(fmt.H * k);
}
let playing = false, playT0 = 0, scrubT = null;
let mainL = null;
function renderMain() {
  const fmt = F[cur];
  mainL = drawTo(mainC, cur, fmt.anim ? { t: scrubT ?? st.anim.dur } : {});
  if ($('safeOn').checked && fmt.safeTop) {
    const ctx = mainC.getContext('2d'); const sc = mainC.width / fmt.W;
    ctx.setTransform(sc, 0, 0, sc, 0, 0); ctx.fillStyle = 'rgba(235,95,95,.18)';
    ctx.fillRect(0, 0, fmt.W, fmt.safeTop); ctx.fillRect(0, fmt.H - fmt.safeBot, fmt.W, fmt.safeBot);
  }
}
function buildMuts() {
  const box = $('muts'); box.innerHTML = '';
  Object.values(F).forEach(fmt => {
    const d = document.createElement('div'); d.className = 'mut' + (fmt.key === cur ? ' on' : '');
    const th = document.createElement('div'); th.className = 'th'; th.tabIndex = 0; th.setAttribute('role', 'button'); th.setAttribute('aria-label', 'Zobraziť ' + fmt.name);
    const c = document.createElement('canvas'); const k = 240 / fmt.H; c.width = Math.round(fmt.W * k); c.height = 240; c.dataset.fmt = fmt.key;
    th.appendChild(c); if (fmt.anim) { const p = document.createElement('span'); p.className = 'play'; p.textContent = '▶ video'; th.appendChild(p); }
    th.onclick = th.onkeydown = e => { if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return; selectFormat(fmt.key); };
    const nm = document.createElement('div'); nm.className = 'nm'; nm.innerHTML = `<span>${fmt.name}</span><small>${fmt.sub}</small>`;
    const ex = document.createElement('button'); ex.className = 'btn small'; ex.textContent = 'Exportovať ' + fmt.ext.toUpperCase(); ex.onclick = () => exportOne(fmt.key);
    d.append(th, nm, ex); box.appendChild(d);
  });
}
function renderMuts() { document.querySelectorAll('#muts canvas').forEach(c => drawTo(c, c.dataset.fmt)); }

let varSeed = 1;
function variantStates() {
  const out = []; const lays = Object.keys(LAYOUTS); const bgs = ['salvia', 'biela', 'zelena', 'okrova'];
  for (let i = 0; i < 6; i++) {
    const s = JSON.parse(JSON.stringify(st));
    const r = (varSeed * 31 + i * 17) % 997;
    s.doodles.seed = r + 1;
    if (i % 3 === 1) s.layout = lays[(r + i) % lays.length];
    if (!s.photo.on && (s.layout === 'foto-hore' || s.layout === 'foto-dole')) s.layout = i % 2 ? 'hore' : 'stred';
    if (i >= 2) s.bg = bgs[(r + i) % bgs.length];
    if (i === 4) s.align = s.align === 'left' ? 'center' : 'left';
    if (i === 5 && s.photo.on) s.photo.frame = ['psik', 'hrad', 'ceruzka'][r % 3];
    if (i === 3) s.doodles.set = ['les', 'rozpravka', 'deti', 'mix'][r % 4];
    out.push(s);
  }
  return out;
}
function renderVars() {
  const box = $('vars'); box.innerHTML = '';
  variantStates().forEach((s, i) => {
    const b = document.createElement('button'); b.setAttribute('aria-label', 'Použiť variáciu ' + (i + 1));
    const c = document.createElement('canvas'); const fmt = F[cur === 'reel' ? 'story' : cur === 'igvid' ? 'post' : cur]; const k = 220 / fmt.H; c.width = Math.round(fmt.W * k); c.height = 220;
    b.appendChild(c); box.appendChild(b);
    drawTo(c, fmt.key, { state: s });
    b.onclick = () => { const keep = { blocks: st.blocks, photo: { ...s.photo, zoom: st.photo.zoom, x: st.photo.x, y: st.photo.y } }; st = { ...s, ...keep }; syncUI(); renderAll(); toast('Variácia použitá'); };
  });
}
let raf = 0;
function renderAll(full = true) {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => { renderMain(); renderMuts(); if (full) renderVarsDebounced(); persistDraft(); });
}
let vt = 0; function renderVarsDebounced() { clearTimeout(vt); vt = setTimeout(renderVars, 350); }

function selectFormat(k) {
  cur = k; $('mainName').textContent = F[k].name; $('mainMeta').textContent = F[k].sub;
  $('playerCard').hidden = !F[k].anim; scrubT = null; stopPlay();
  $('scrub').max = st.anim.dur;
  document.querySelectorAll('.mut').forEach((m, i) => m.classList.toggle('on', Object.keys(F)[i] === k));
  document.querySelectorAll('#fmtChips button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.fmt === k)));
  sizeMain(); renderMain(); renderVarsDebounced();
}

/* QR kódy a obrázky sa dajú potiahnuť priamo v náhľade */
let drag = null;
function hitElem(pt) {
  if (!mainL || F[cur].anim) return null;
  const r = mainC.getBoundingClientRect(), fmt = F[cur];
  const x = (pt.clientX - r.left) / r.width * fmt.W, y = (pt.clientY - r.top) / r.height * fmt.H;
  const its = mainL.items.filter(it => (it.type === 'qr' || it.type === 'obrazok') && it.bi != null);
  for (let j = its.length - 1; j >= 0; j--) { const it = its[j]; if (x >= it.x && x <= it.x + it.w && y >= it.y && y <= it.y + it.h) return { it, x, y }; }
  return null;
}
mainC.addEventListener('touchstart', e => { if (e.touches.length === 1 && hitElem(e.touches[0])) e.preventDefault(); }, { passive: false });
mainC.addEventListener('pointerdown', e => {
  const h = hitElem(e); if (!h) return;
  const b = st.blocks[h.it.bi]; if (!b) return;
  e.preventDefault(); mainC.setPointerCapture(e.pointerId);
  drag = { b, ox: h.x - (h.it.x + h.it.w / 2), oy: h.y - (h.it.y + h.it.h / 2), moved: false };
  mainC.style.cursor = 'grabbing';
});
mainC.addEventListener('pointermove', e => {
  if (!drag) { mainC.style.cursor = hitElem(e) ? 'grab' : ''; return; }
  const r = mainC.getBoundingClientRect();
  const fx = (e.clientX - r.left) / r.width - drag.ox / F[cur].W, fy = (e.clientY - r.top) / r.height - drag.oy / F[cur].H;
  drag.b.free = true; drag.b.fx = Math.max(0, Math.min(1, fx)); drag.b.fy = Math.max(0, Math.min(1, fy)); drag.moved = true;
  renderAll(false);
});
const endDrag = () => { if (!drag) return; const m = drag.moved; drag = null; mainC.style.cursor = ''; if (m) { buildBlocks(); renderVarsDebounced(); } };
mainC.addEventListener('pointerup', endDrag); mainC.addEventListener('pointercancel', endDrag);

/* mobil: rýchly prepínač formátu a veľkosti v pripnutom náhľade */
Object.values(F).forEach(fmt => {
  const b = document.createElement('button'); b.dataset.fmt = fmt.key; b.textContent = { post: 'Post', igvid: 'Post video', story: 'Story', reel: 'Story video', a4: 'A4', a3: 'A3' }[fmt.key] || fmt.name; b.setAttribute('aria-pressed', 'false');
  b.onclick = () => selectFormat(fmt.key); $('fmtChips').appendChild(b);
});
$('bigPrev').onclick = () => {
  const big = $('mainwrap').classList.toggle('big');
  $('bigPrev').textContent = big ? '⤡' : '⤢'; const l = big ? 'Zmenšiť náhľad' : 'Zväčšiť náhľad'; $('bigPrev').title = l; $('bigPrev').setAttribute('aria-label', l);
};
if (window.visualViewport) { // pri otvorenej klávesnici náhľad zmenšiť, aby bolo vidno aj písané pole
  const kb = () => document.body.classList.toggle('kb', visualViewport.height < innerHeight * .78);
  visualViewport.addEventListener('resize', kb);
}

/* ---------- prehrávanie intra ---------- */
function stopPlay() { playing = false; $('playBtn').textContent = '▶'; $('playBtn').setAttribute('aria-label', 'Prehrať'); }
function play() {
  if (!F[cur].anim) selectFormat('reel');
  playing = true; playT0 = performance.now(); $('playBtn').textContent = '❚❚'; $('playBtn').setAttribute('aria-label', 'Pozastaviť');
  const step = now => {
    if (!playing) return;
    const t = (now - playT0) / 1000; scrubT = Math.min(t, st.anim.dur);
    $('scrub').value = scrubT; $('tOut').textContent = scrubT.toFixed(1).replace('.', ',') + ' s';
    renderMain();
    if (t < st.anim.dur + .6) requestAnimationFrame(step); else { stopPlay(); }
  };
  requestAnimationFrame(step);
}
$('playBtn').onclick = () => playing ? stopPlay() : play();
$('goReel').onclick = play;
$('scrub').oninput = e => { stopPlay(); scrubT = +e.target.value; $('tOut').textContent = scrubT.toFixed(1).replace('.', ',') + ' s'; renderMain(); };

/* ---------- panel: obsah ---------- */
const ELEMS = { qr: 'QR kód', obrazok: 'Obrázok' };
function moveIcons(i) {
  const up = mkIco('↑', 'Posunúť vyššie', () => { if (i > 0) { [st.blocks[i - 1], st.blocks[i]] = [st.blocks[i], st.blocks[i - 1]]; buildBlocks(); renderAll(); } });
  const dn = mkIco('↓', 'Posunúť nižšie', () => { if (i < st.blocks.length - 1) { [st.blocks[i + 1], st.blocks[i]] = [st.blocks[i], st.blocks[i + 1]]; buildBlocks(); renderAll(); } });
  const del = mkIco('×', 'Odstrániť', () => { st.blocks.splice(i, 1); buildBlocks(); renderAll(); });
  return [up, dn, del];
}
function sizeSlider(b, i, def) {
  const l = document.createElement('label'); l.className = 'f'; l.textContent = 'Veľkosť';
  const r = document.createElement('input'); r.type = 'range'; r.min = .12; r.max = 1; r.step = .01; r.value = b.size || def; r.id = 'bs' + i;
  r.oninput = () => { b.size = +r.value; renderAll(false); renderVarsDebounced(); };
  l.appendChild(r); return l;
}
function buildBlocks() {
  const box = $('blocks'); box.innerHTML = '';
  st.blocks.forEach((b, i) => {
    const el = document.createElement('div'); el.className = 'block';
    const bh = document.createElement('div'); bh.className = 'bh'; const sp = document.createElement('span'); sp.className = 'sp';
    if (ELEMS[b.type]) {
      el.classList.add('elem');
      const nm = document.createElement('b'); nm.className = 'enm'; nm.textContent = ELEMS[b.type];
      bh.append(nm, sp, ...moveIcons(i)); el.appendChild(bh);
      const pos = document.createElement('div'); pos.className = 'row';
      const ph = document.createElement('span'); ph.className = 'hint'; ph.style.flex = '1';
      ph.textContent = b.free ? 'Umiestnený voľne. Potiahni ho v náhľade.' : 'Je v poradí s textami. Môžeš ho potiahnuť v náhľade kamkoľvek.';
      pos.appendChild(ph);
      if (b.free) { const rb = document.createElement('button'); rb.className = 'btn small'; rb.textContent = 'Vrátiť medzi texty'; rb.onclick = () => { b.free = false; delete b.fx; delete b.fy; buildBlocks(); renderAll(); }; pos.appendChild(rb); }
      if (b.type === 'qr') {
        const u = document.createElement('input'); u.type = 'text'; u.id = 'bx' + i; u.value = b.text || ''; u.placeholder = 'Odkaz, napr. https://handrbolka.sk'; u.setAttribute('aria-label', 'Odkaz v QR kóde'); u.inputMode = 'url';
        u.oninput = () => { b.text = u.value; renderAll(false); renderVarsDebounced(); };
        const c = document.createElement('input'); c.type = 'text'; c.value = b.cap || ''; c.placeholder = 'Popis pod kódom (nepovinné)'; c.setAttribute('aria-label', 'Popis pod QR kódom');
        c.oninput = () => { b.cap = c.value; renderAll(false); renderVarsDebounced(); };
        el.append(u, c, sizeSlider(b, i, .32), pos);
      } else {
        const row = document.createElement('div'); row.className = 'drop';
        const im = document.createElement('img'); im.alt = ''; if (b.img) im.src = b.img; else im.hidden = true;
        const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.hidden = true;
        const bt = document.createElement('button'); bt.className = 'btn small'; bt.textContent = b.img ? 'Zmeniť obrázok' : 'Vybrať obrázok'; bt.onclick = () => fi.click();
        const tx = document.createElement('div'); tx.style.flex = '1'; tx.append('Logo partnera, nálepka, kresba… PNG s priehľadným pozadím ostane priehľadné. ', bt);
        fi.onchange = () => readElemImage(fi.files[0], data => { b.img = data; buildBlocks(); renderAll(); });
        row.append(im, tx, fi); el.append(row, sizeSlider(b, i, .5), pos);
      }
      box.appendChild(el); return;
    }
    const sel = document.createElement('select'); sel.id = 'bt' + i; sel.setAttribute('aria-label', 'Typ textu');
    Object.entries(TYPES).forEach(([k, n]) => { const o = document.createElement('option'); o.value = k; o.textContent = n; if (k === b.type) o.selected = true; sel.appendChild(o); });
    sel.onchange = () => { b.type = sel.value; renderAll(); };
    bh.append(sel, sp, ...moveIcons(i));
    const ta = document.createElement('textarea'); ta.id = 'bx' + i; ta.value = b.text; ta.rows = b.type === 'odrazky' ? 5 : Math.min(4, Math.max(1, b.text.split('\n').length)); ta.setAttribute('aria-label', TYPES[b.type]);
    ta.oninput = () => { b.text = ta.value; renderAll(false); renderVarsDebounced(); };
    el.append(bh, ta); box.appendChild(el);
  });
}
/* obrázok ako prvok: zmenšiť na max 2000 px (na plagáte A3 to stačí na 300 dpi pri šírke do 17 cm), priehľadnosť ostáva */
function readElemImage(file, done) {
  if (!file || !file.type.startsWith('image/')) { toast('Toto nie je obrázok. Vyber JPG alebo PNG.'); return; }
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const m = 2000, k = Math.min(1, m / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
      let alpha = false;
      if (/png|gif|webp|svg/.test(file.type)) { const d = g.getImageData(0, 0, c.width, c.height).data; for (let j = 3; j < d.length; j += 16) if (d[j] < 250) { alpha = true; break; } }
      done(alpha ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', .9));
    };
    img.onerror = () => toast('Obrázok sa nepodarilo načítať.');
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}
HB.onAsset = () => renderAll(false);
function mkIco(t, label, fn) { const b = document.createElement('button'); b.className = 'ico'; b.textContent = t; b.title = label; b.setAttribute('aria-label', label); b.onclick = fn; return b; }
document.querySelectorAll('[data-add]').forEach(b => b.onclick = () => {
  const t = b.dataset.add;
  if (t === 'qr') { st.blocks.push({ type: 'qr', text: 'https://handrbolka.sk', cap: '', size: .32 }); buildBlocks(); renderAll(); const u = $('bx' + (st.blocks.length - 1)); if (u) { u.focus(); u.select(); } return; }
  if (t === 'obrazok') {
    const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*';
    fi.onchange = () => readElemImage(fi.files[0], data => { st.blocks.push({ type: 'obrazok', img: data, size: .5, text: '' }); buildBlocks(); renderAll(); toast('Obrázok pridaný. Veľkosť a poradie zmeníš v jeho bloku.'); });
    fi.click(); return;
  }
  const ex = { nadpis: 'Nový nadpis', podnadpis: 'Podnadpis', sekcia: 'Nadpis sekcie', info: 'Piatok 21. 11. · 16:00', odrazky: 'prvá odrážka\ndruhá odrážka', citat: 'Malé kroky, veľké dobrodružstvá', text: 'Krátky text.' }[t];
  st.blocks.push({ type: t, text: ex }); buildBlocks(); renderAll();
  const ta = $('bx' + (st.blocks.length - 1)); if (ta) { ta.focus(); ta.select(); }
});
function cards(boxId, map, get, set) {
  const box = $(boxId); box.innerHTML = '';
  Object.entries(map).forEach(([k, [n, s]]) => {
    const b = document.createElement('button'); b.innerHTML = n + (s ? `<small>${s}</small>` : ''); b.dataset.k = k;
    b.onclick = () => { set(k); markCards(boxId, get()); renderAll(); }; box.appendChild(b);
  });
  markCards(boxId, get());
}
const markCards = (boxId, v) => document.querySelectorAll('#' + boxId + ' button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === String(v))));
function swatches(boxId, list, get, set) {
  const box = $(boxId); box.innerHTML = '';
  list.forEach(([k, color, label]) => {
    const b = document.createElement('button'); b.style.background = color; b.dataset.k = k; b.title = label; b.setAttribute('aria-label', label);
    if (k === 'foto') b.style.background = `linear-gradient(135deg,${HB.COL.green} 0 50%,${HB.COL.salvia} 50%)`;
    if (k === 'auto') b.style.background = `conic-gradient(${HB.COL.ochre} 0 50%,${HB.COL.coral} 0)`;
    b.onclick = () => { set(k); markCards(boxId, get()); renderAll(); }; box.appendChild(b);
  });
  markCards(boxId, get());
}
function bind(id, get, set, ev = 'input') {
  const el = $(id); const isC = el.type === 'checkbox';
  el[isC ? 'checked' : 'value'] = get();
  el['on' + ev] = el.onchange = () => { set(isC ? el.checked : el.type === 'range' ? +el.value : el.value); afterBind(id); renderAll(); };
}
function afterBind(id) { if (id === 'photoOn') $('photoCtl').hidden = !st.photo.on; }

function syncUI() {
  buildBlocks();
  cards('logoModes', LOGO_MODES, () => st.logo.mode, v => st.logo.mode = v);
  bind('logoSub', () => st.logo.sub, v => st.logo.sub = v, 'change');
  bind('logoSubText', () => st.logo.subText, v => st.logo.subText = v);
  bind('logoSize', () => st.logo.size, v => st.logo.size = v);
  bind('photoOn', () => st.photo.on, v => st.photo.on = v, 'change');
  bind('photoSize', () => st.photo.size, v => st.photo.size = v);
  bind('photoZoom', () => st.photo.zoom, v => st.photo.zoom = v);
  bind('photoX', () => st.photo.x, v => st.photo.x = v);
  bind('photoY', () => st.photo.y, v => st.photo.y = v);
  $('photoCtl').hidden = !st.photo.on;
  bind('footPrint', () => st.footer.print, v => st.footer.print = v, 'change');
  bind('footHandle', () => st.footer.handle, v => st.footer.handle = v, 'change');
  bind('handleText', () => st.footer.handleText, v => st.footer.handleText = v);
  cards('layouts', LAYOUTS, () => st.layout, v => { st.layout = v; if ((v === 'foto-hore' || v === 'foto-dole') && !st.photo.on) { st.photo.on = true; $('photoOn').checked = true; $('photoCtl').hidden = false; } });
  document.querySelectorAll('#aligns button').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.align === st.align)); b.onclick = () => { st.align = b.dataset.align; syncUI(); renderAll(); }; });
  swatches('bgs', Object.entries(HB.BGS).map(([k, v]) => [k, v.bg, v.name]), () => st.bg, v => { st.bg = v; bgHint(); });
  bgHint();
  cards('dsets', Object.fromEntries(Object.entries(HB.DOODLE_SETS).map(([k, v]) => [k, [v.name, '']])), () => st.doodles.set, v => st.doodles.set = v);
  bind('dCount', () => st.doodles.count, v => st.doodles.count = v);
  bind('dSize', () => st.doodles.size, v => st.doodles.size = v);
  bind('dMono', () => st.doodles.color === 'mono', v => st.doodles.color = v ? 'mono' : 'farebne', 'change');
  cards('frames', FRAMES, () => st.photo.frame, v => st.photo.frame = v);
  swatches('frameColors', [['auto', '', 'Podľa rámika'], ['ochre', HB.COL.ochre, 'Okrová'], ['coral', HB.COL.coral, 'Koralová'], ['green', HB.COL.green, 'Lesná zelená'], ['white', '#FFFFFF', 'Biela']], () => st.photo.color, v => st.photo.color = v);
  bind('titleScale', () => st.titleScale, v => st.titleScale = v);
  bind('textScale', () => st.textScale, v => st.textScale = v);
  bind('underline', () => st.underline, v => st.underline = v, 'change');
  cards('animStyles', ANIMS, () => st.anim.style, v => st.anim.style = v);
  const durs = $('durs'); durs.innerHTML = '';
  [3, 4, 6].forEach(d => { const b = document.createElement('button'); b.textContent = d + ' s'; b.setAttribute('aria-pressed', String(st.anim.dur === d)); b.onclick = () => { st.anim.dur = d; $('scrub').max = d; syncUI(); renderAll(); }; durs.appendChild(b); });
  bind('animTitle', () => st.anim.title, v => st.anim.title = v, 'change');
  bind('animSub', () => st.anim.sub, v => st.anim.sub = v, 'change');
}
function bgHint() { $('bgHint').textContent = st.bg === 'foto' ? 'Na pozadí bude tvoja fotka, stmavená do zelena, aby bol text čitateľný.' : ''; if (st.bg === 'foto' && !photoImg) $('bgHint').textContent += ' Najprv vyber fotku v záložke Obsah.'; }

/* ---------- zadanie -> návrh (Claude) ---------- */
const BRIEF_SCHEMA = `Vráť IBA JSON objekt s týmito kľúčmi:
{
 "blocks": [ {"type": "nadpis|podnadpis|sekcia|info|odrazky|citat|text", "text": "..."} ],
 "layout": "stred|hore|foto-hore|foto-dole",
 "align": "center|left",
 "bg": "salvia|biela|zelena|okrova|foto",
 "logo": {"mode": "hlavne|male|dole|skryte", "sub": true|false, "subText": "Vzdelávanie"},
 "photo": {"on": true|false, "frame": "psik|hrad|ceruzka|none"},
 "doodles": {"count": 0-9, "set": "mix|les|rozpravka|deti"},
 "anim": {"style": "kreslenie|vyrastanie|prelnutie", "dur": 3|4|6},
 "poznamka": "1-2 vety po slovensky, prečo si to takto rozložil"
}`;
const BRIEF_RULES = `Si grafik Lesného klubu Handrbolka (lesná škôlka a lesný klub v Trenčíne-Kubrici, handrbolka.sk).
Z voľného zadania priprav podklady pre jeden grafický návrh (Insta post, story, plagát A4/A3 a intro na reels sa z neho vyrobia samé).
Pravidlá:
- Texty píš po slovensky, správne s diakritikou, krátko a vecne, priateľským tónom klubu. Nevymýšľaj fakty, ktoré v zadaní nie sú (dátumy, ceny, adresy).
- "nadpis" = hlavný nadpis (max 5 slov). "sekcia" = nadpis s vlnovkou (pre programy a zoznamy). "info" = dátum/čas/miesto v štítku, jeden riadok. "podnadpis" = krátky doplnok. "odrazky" = zoznam, každá položka na novom riadku (\n), max 6 položiek, každá max 7 slov. "citat" = myšlienka bez úvodzoviek. "text" = 1-2 krátke vety.
- Spolu najviac 6 blokov. Pozvánka: nadpis, info, podnadpis alebo odrážky, text. Program: sekcia, podnadpis, odrazky. Citát: citat.
- Logo "hlavne" len pre všeobecné plagáty o klube bez veľa textu; inak "male" alebo "dole". "sub" (Vzdelávanie) iba pri "hlavne".
- Ak zadanie spomína fotku, photo.on=true a layout foto-hore alebo foto-dole. psik = hravé, deti, zvieratá; hrad = škola, program, rozprávka; ceruzka = ateliér, tvorenie.
- Pozadie: salvia je predvolené; zelena pre citáty a vážnejšie oznamy; biela pre veľa textu; okrova pre jeseň a slávnosti; foto len keď chce fotku cez celé pozadie.
- Kresbičky: les = príroda, jeseň; rozpravka = rozprávky, karneval; deti = postavičky; mix inak. Pri veľa texte 3-4, inak 5-7.
- Anim: kreslenie predvolené, vyrastanie pre veselé podujatia, prelnutie pre pokojné/vážne.`;
let sampleFn = null;
async function aiBackend() {
  if (Store.sb && CFG.briefFunction !== false) return 'supabase';
  if (sampleFn === null && window.claude?.use) { try { sampleFn = await window.claude.use('sample'); } catch (e) { sampleFn = false; } }
  return sampleFn ? 'sample' : null;
}
function parseJSON(t) { const m = String(t).match(/\{[\s\S]*\}/); return JSON.parse(m ? m[0] : t); }
async function askClaude(brief) {
  const be = await aiBackend();
  const prompt = BRIEF_RULES + '\n\n' + BRIEF_SCHEMA + '\n\nZadanie:\n"""' + brief + '"""';
  if (be === 'sample') return await sampleFn.json(prompt, { modelTier: 'default', cache: false });
  if (be === 'supabase') {
    try {
      const { data, error } = await Store.sb.functions.invoke(CFG.briefFunction || 'handrbolka-brief', { body: { prompt } });
      if (error) throw error; return typeof data === 'string' ? parseJSON(data) : (data.json || parseJSON(data.text));
    } catch (e) { console.warn('Brief cez Supabase zlyhal, použijem jednoduchý režim', e); return localBrief(brief); }
  }
  return localBrief(brief);
}
/* bez Clauda: jednoduché rozpoznanie zo zadania */
function localBrief(brief) {
  const lines = brief.split(/\n+/).map(s => s.trim()).filter(Boolean);
  const first = (lines[0] || '').split(/[.!?:]/)[0].trim();
  const date = brief.match(/(pondelok|utorok|stred[au]|štvrtok|piatok|sobot[au]|nedeľ[au])?\s*\d{1,2}\.\s*\d{1,2}\.(\s*\d{4})?(\s*(o|od)?\s*\d{1,2}[:.]\d{2}(\s*[–-]\s*\d{1,2}[:.]\d{2})?)?/i);
  const blocks = [{ type: 'nadpis', text: first.split(' ').slice(0, 6).join(' ') || 'Handrbolka' }];
  if (date) blocks.push({ type: 'info', text: date[0].trim() });
  const rest = lines.slice(1).join(' ');
  if (rest) blocks.push({ type: 'text', text: rest.slice(0, 160) });
  const foto = /fotk|foto/i.test(brief);
  return { blocks, layout: foto ? 'foto-hore' : 'stred', logo: { mode: 'male', sub: false }, photo: { on: foto, frame: 'psik' }, doodles: { count: 6, set: /jese|tekv|les|príro/i.test(brief) ? 'les' : 'mix' }, poznamka: 'Pripravené bez Clauda, len z prvej vety a dátumu v zadaní. Texty si dolaď v blokoch nižšie.' };
}
function applyBrief(r) {
  const s = BASE();
  const pick = (v, list, d) => list.includes(v) ? v : d;
  const types = Object.keys(TYPES);
  s.blocks = (Array.isArray(r.blocks) ? r.blocks : []).filter(b => b && types.includes(b.type) && String(b.text || '').trim()).slice(0, 7).map(b => ({ type: b.type, text: String(b.text).trim() }));
  if (!s.blocks.length) s.blocks = [{ type: 'nadpis', text: 'Handrbolka' }];
  st.blocks.filter(b => ELEMS[b.type]).forEach(b => s.blocks.push(b)); // vložené QR kódy a obrázky ostávajú
  s.layout = pick(r.layout, Object.keys(LAYOUTS), 'stred');
  s.align = pick(r.align, ['center', 'left'], 'center');
  s.bg = pick(r.bg, Object.keys(HB.BGS), 'salvia');
  const lg = r.logo || {}; s.logo.mode = pick(lg.mode, Object.keys(LOGO_MODES), 'male'); s.logo.sub = lg.sub === true && s.logo.mode === 'hlavne'; if (lg.subText) s.logo.subText = String(lg.subText).slice(0, 30);
  const ph = r.photo || {}; s.photo.on = !!ph.on; s.photo.frame = pick(ph.frame, Object.keys(FRAMES), 'psik');
  if (!s.photo.on && (s.layout === 'foto-hore' || s.layout === 'foto-dole')) s.layout = 'stred';
  if (s.bg === 'foto') s.photo.on = false;
  const dd = r.doodles || {}; s.doodles.count = clampN(dd.count, 0, 9, 6); s.doodles.set = pick(dd.set, Object.keys(HB.DOODLE_SETS), 'mix'); s.doodles.seed = 1 + Math.floor(Math.random() * 900);
  const an = r.anim || {}; s.anim.style = pick(an.style, Object.keys(ANIMS), 'kreslenie'); s.anim.dur = [3, 4, 6].includes(an.dur) ? an.dur : 4;
  // fotka, ktorú už mala nahratú, ostáva
  if (photoImg && (s.photo.on || s.bg === 'foto')) { s.photo.zoom = st.photo.zoom; s.photo.x = st.photo.x; s.photo.y = st.photo.y; }
  return s;
}
const clampN = (v, a, b, d) => Number.isFinite(+v) ? Math.max(a, Math.min(b, Math.round(+v))) : d;
$('briefBtn').onclick = async () => {
  const brief = $('brief').value.trim();
  if (brief.length < 8) { toast('Napíš do zadania aspoň jednu vetu.'); $('brief').focus(); return; }
  $('briefBtn').disabled = true; $('briefState').textContent = 'Claude pripravuje návrh…'; $('briefNote').hidden = true;
  try {
    const r = await askClaude(brief);
    st = applyBrief(r || {}); currentId = null; syncSave();
    syncUI(); renderAll(); selectFormat(F[cur].anim ? 'post' : cur);
    $('briefNote').textContent = (r && r.poznamka ? r.poznamka + ' ' : '') + (st.photo.on && !photoImg ? 'Nahraj ešte fotku nižšie.' : 'Čokoľvek nižšie môžeš zmeniť.');
    $('briefNote').hidden = false; $('briefState').textContent = '';
    try { localStorage.setItem('hb_brief', brief); } catch (e) {}
  } catch (e) {
    console.error(e);
    const code = e && e.code;
    $('briefState').textContent = code === 'rate_limited' ? 'Claude je teraz vyťažený, skús o chvíľu.' : code === 'not_granted' ? 'Bez povolenia pre Clauda pripravím návrh jednoduchšie.' : 'Návrh sa nepodarilo pripraviť: ' + (e.message || code || e);
    if (code === 'not_granted') { st = applyBrief(localBrief(brief)); syncUI(); renderAll(); }
  }
  $('briefBtn').disabled = false;
};
try { const b = localStorage.getItem('hb_brief'); if (b) $('brief').value = b; } catch (e) {}

/* šablóny */
Object.entries(TEMPLATES).forEach(([k, t]) => { const o = document.createElement('option'); o.value = k; o.textContent = t.name; $('tpl').appendChild(o); });
$('tpl').onchange = e => { if (!e.target.value) return; const keepPhoto = st.photo; st = fromTemplate(e.target.value); if (photoImg) st.photo = { ...st.photo, zoom: keepPhoto.zoom, x: keepPhoto.x, y: keepPhoto.y }; currentId = null; syncSave(); e.target.value = ''; syncUI(); renderAll(); toast('Šablóna načítaná'); };

/* záložky */
document.querySelectorAll('[role=tab]').forEach(t => t.onclick = () => {
  document.querySelectorAll('[role=tab]').forEach(x => x.setAttribute('aria-selected', String(x === t)));
  document.querySelectorAll('[data-pane]').forEach(p => p.hidden = p.dataset.pane !== t.dataset.tab);
  if (t.dataset.tab === 'anim' && !F[cur].anim) selectFormat('reel');
});

/* fotka */
function setPhoto(dataUrl, orig = null) {
  photoData = dataUrl; photoOrig = orig;
  if (!dataUrl) { photoImg = null; $('photoPrev').hidden = true; $('photoDel').hidden = true; renderAll(); return; }
  const img = new Image(); img.onload = () => { photoImg = img; $('photoPrev').src = dataUrl; $('photoPrev').hidden = false; $('photoDel').hidden = false; bgHint(); renderAll(); }; img.src = dataUrl;
}
function readPhoto(file) {
  if (!file || !file.type.startsWith('image/')) { toast('Toto nie je obrázok. Vyber JPG alebo PNG.'); return; }
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => { // zmenšiť na max 2400 px, aby sa dal návrh uložiť
      const m = 2400, k = Math.min(1, m / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      st.photo.on = true; st.photo.zoom = 1; st.photo.x = .5; st.photo.y = .5; syncUI();
      setPhoto(c.toDataURL('image/jpeg', .86), k < 1 ? img : null);
    };
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}
$('photoBtn').onclick = () => $('photoIn').click();
$('photoIn').onchange = e => readPhoto(e.target.files[0]);
$('photoDel').onclick = () => { st.photo.on = false; syncUI(); setPhoto(null); };
const drop = $('drop');
drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
drop.ondragleave = () => drop.classList.remove('over');
drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); readPhoto(e.dataTransfer.files[0]); };

$('shuffle').onclick = $('shuffle2').onclick = () => { st.doodles.seed = (st.doodles.seed * 13 + 7) % 9973; renderAll(); };
$('moreVars').onclick = () => { varSeed++; renderVars(); };
$('safeOn').onchange = renderMain;

/* ---------- export ---------- */
let dl = null;
async function saveFile(name, blob) {
  if (dl === null && window.claude?.use) { try { dl = await window.claude.use('downloads'); } catch (e) { dl = false; } }
  if (dl) {
    try { await dl.save({ filename: name, data: blob }); toast('Uložené: ' + name); }
    catch (e) { toast(e.code === 'declined' ? 'Sťahovanie zrušené' : 'Súbor sa nepodarilo uložiť (' + (e.message || e.code) + ')'); }
    return;
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); toast('Stiahnuté: ' + name);
}
const slug = () => (st.blocks.find(b => b.text.trim())?.text || 'handrbolka').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'handrbolka';
function fullCanvas(fmtKey, bleedPx = 0) {
  const fmt = F[fmtKey]; const c = document.createElement('canvas'); c.width = fmt.W + bleedPx * 2; c.height = fmt.H + bleedPx * 2;
  const ctx = c.getContext('2d');
  HB.render(ctx, fmtKey, st, { photoImg: st.photo.on || st.bg === 'foto' ? (photoImg || null) : undefined, bleed: bleedPx });
  return c;
}
const toBlob = (c, type, q) => new Promise(r => c.toBlob(r, type, q));
/* PNG pre sociálne siete: 72 dpi v hlavičke (pHYs), rozmer v pixeloch podľa Instagramu */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u => { let c = 0xffffffff; for (const b of u) c = CRC_T[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
async function pngDpi(blob, dpi) {
  const u = new Uint8Array(await blob.arrayBuffer()); const ppm = Math.round(dpi / .0254);
  const chunk = new Uint8Array(21), dv = new DataView(chunk.buffer);
  dv.setUint32(0, 9); chunk.set([112, 72, 89, 115], 4); dv.setUint32(8, ppm); dv.setUint32(12, ppm); chunk[16] = 1;
  dv.setUint32(17, crc32(chunk.subarray(4, 17)));
  const at = 33; // za IHDR
  return new Blob([u.subarray(0, at), chunk, u.subarray(at)], { type: 'image/png' });
}
async function makePNG(k) { return pngDpi(await toBlob(fullCanvas(k), 'image/png'), 72); }

/* Tlačové PDF: vektory ostanú vektormi, texty ako krivky, fotky na 300 dpi,
   voliteľne spadávka 3 mm, orezové značky a TrimBox/BleedBox */
const PDF_FONT_FILES = { 400: 'GoldplayAltRegular', 500: 'GoldplayAltMedium', 600: 'GoldplayAltSemiBold', 700: 'GoldplayAltBold' };
let pdfFontCache = null;
async function pdfFonts() {
  if (pdfFontCache) return pdfFontCache;
  if (!window.opentype) return null;
  const out = {};
  for (const [w, f] of Object.entries(PDF_FONT_FILES)) {
    let buf = FONT_BYTES[w];
    if (!buf) { try { const r = await fetch('fonts/' + f + '.woff'); if (r.ok) buf = await r.arrayBuffer(); } catch (e) {} }
    if (buf) { try { out[w] = opentype.parse(buf); } catch (e) { console.warn('Font pre PDF', f, e); } }
  }
  if (!out[500] && out[600]) out[500] = out[600];
  if (!out[400] || !out[700]) return null;
  return (pdfFontCache = out);
}
let lastPdfReport = null;
async function makePDF(k) {
  const fmt = F[k]; const withBleed = $('bleed').checked;
  const { jsPDF } = window.jspdf;
  const PT = 72 / 25.4, bleedMm = withBleed ? 3 : 0, slugMm = withBleed ? 10 : 0;
  const pxPerMm = fmt.W / fmt.mm[0], bleedPx = bleedMm * pxPerMm;
  const pw = (fmt.mm[0] + 2 * (bleedMm + slugMm)) * PT, ph = (fmt.mm[1] + 2 * (bleedMm + slugMm)) * PT;
  const doc = new jsPDF({ unit: 'pt', format: [pw, ph], orientation: 'portrait', compress: true, putOnlyUsedFonts: true });
  const fonts = await pdfFonts();
  if (!fonts || !window.PDFCanvas) throw new Error('Písmo pre tlač sa nenačítalo. Obnov stránku a skús znova.');
  const s = PT / pxPerMm, o = slugMm * PT; // pixel plátna -> bod PDF
  const base = [s, 0, 0, -s, o, ph - o];
  doc.internal.write('q'); doc.internal.write(base.map(v => +v.toFixed(6)).join(' ') + ' cm');
  const pc = new PDFCanvas(doc, { base, pageH: ph, fonts, dpi: 300, width: fmt.W + bleedPx * 2, height: fmt.H + bleedPx * 2 });
  const img = st.photo.on || st.bg === 'foto' ? (photoOrig || photoImg || null) : undefined;
  HB.render(pc, k, st, { photoImg: img, bleed: bleedPx });
  doc.internal.write('Q');
  const info = doc.internal.getPageInfo(1).pageContext;
  const box = (x0, y0, x1, y1) => ({ bottomLeftX: x0, bottomLeftY: y0, topRightX: x1, topRightY: y1 });
  const tx0 = (slugMm + bleedMm) * PT, ty0 = tx0, tx1 = pw - tx0, ty1 = ph - ty0;
  info.trimBox = box(tx0, ty0, tx1, ty1);
  if (withBleed) {
    info.bleedBox = box(slugMm * PT, slugMm * PT, pw - slugMm * PT, ph - slugMm * PT);
    // orezové značky: 0,25 pt, dĺžka 5 mm, začínajú 3 mm od orezu (mimo spadávky)
    doc.setLineWidth(.25); doc.setDrawColor(0, 0, 0);
    const off = bleedMm * PT, L = 5 * PT;
    const X = [tx0, tx1], Y = [ph - ty1, ph - ty0]; // jsPDF: y zhora
    X.forEach((x, i) => Y.forEach((y, j) => {
      const sx = i ? 1 : -1, sy = j ? 1 : -1;
      doc.line(x + sx * off, y, x + sx * (off + L), y);
      doc.line(x, y + sy * off, x, y + sy * (off + L));
    }));
  }
  doc.setProperties({ title: 'Handrbolka – ' + fmt.name, creator: 'Handrbolka Štúdio' });
  lastPdfReport = pc.report;
  return doc.output('blob');
}
function pdfNote() {
  const r = lastPdfReport; if (!r) return '';
  const low = r.images.filter(i => i.ppi < 280);
  if (low.length) return ` Pozor: fotka má pri tejto veľkosti len ${Math.min(...low.map(i => i.ppi))} dpi (na tlač treba 300). Nahraj väčšiu fotku.`;
  return r.images.length ? ' Fotka je v 300 dpi.' : '';
}
async function makeVideo(k, onProg) {
  const fmt = F[k], fps = 30, dur = st.anim.dur + .8, frames = Math.round(dur * fps);
  const c = document.createElement('canvas'); c.width = fmt.W; c.height = fmt.H; const ctx = c.getContext('2d');
  const frame = t => { ctx.setTransform(1, 0, 0, 1, 0, 0); HB.render(ctx, k, st, { photoImg: st.bg === 'foto' ? (photoImg || null) : undefined, t }); };
  if (window.VideoEncoder && window.Mp4Muxer) {
    try {
      const sup = await VideoEncoder.isConfigSupported({ codec: 'avc1.640028', width: fmt.W, height: fmt.H, bitrate: 8e6, framerate: fps });
      if (sup.supported) {
        const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: 'avc', width: fmt.W, height: fmt.H }, fastStart: 'in-memory' });
        let err = null;
        const enc = new VideoEncoder({ output: (ch, meta) => muxer.addVideoChunk(ch, meta), error: e => err = e });
        enc.configure({ codec: 'avc1.640028', width: fmt.W, height: fmt.H, bitrate: 8e6, framerate: fps });
        for (let i = 0; i < frames; i++) {
          frame(i / fps);
          const vf = new VideoFrame(c, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
          enc.encode(vf, { keyFrame: i % 60 === 0 }); vf.close();
          if (enc.encodeQueueSize > 8) await new Promise(r => setTimeout(r, 5));
          if (i % 10 === 0) { onProg?.(i / frames); await new Promise(r => setTimeout(r, 0)); }
          if (err) throw err;
        }
        await enc.flush(); muxer.finalize();
        return { blob: new Blob([muxer.target.buffer], { type: 'video/mp4' }), ext: 'mp4' };
      }
    } catch (e) { console.warn('MP4 sa nepodarilo, skúšam WebM', e); }
  }
  // záloha: nahrávanie v reálnom čase
  const stream = c.captureStream(fps); const mime = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
  if (!mime) throw new Error('Tento prehliadač nevie nahrať video. Skús Chrome alebo Safari.');
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8e6 }); const parts = [];
  rec.ondataavailable = e => e.data.size && parts.push(e.data);
  const done = new Promise(r => rec.onstop = r); rec.start();
  const t0 = performance.now();
  await new Promise(res => { const step = () => { const t = (performance.now() - t0) / 1000; frame(Math.min(t, dur)); onProg?.(t / dur); if (t < dur) requestAnimationFrame(step); else res(); }; step(); });
  rec.stop(); await done;
  return { blob: new Blob(parts, { type: mime.split(';')[0] }), ext: mime.includes('mp4') ? 'mp4' : 'webm' };
}
/* názvy súborov: krátka téma + formát, napr. „den otv. dveri - ig.png“ */
const SUFFIX = { post: 'ig', igvid: 'ig vid', story: 'igs', reel: 'igs vid', a4: 'a4 plagat', a3: 'a3 plagat' };
const STOP = new Set(['a', 'i', 'v', 'vo', 'na', 's', 'so', 'z', 'zo', 'do', 'pre', 'k', 'ku', 'o', 'u', 'od', 'pri', 'za', 'sa', 'si', 'handrbolka', 'handrbolke', 'handrbolky', 'handrbolku', 'handrbolkou']);
const plain = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function shortWord(w) {
  if (w.length <= 6 || /\d/.test(w)) return w;
  const V = /[aeiouy]/; let i = 0;
  while (i < w.length && !V.test(w[i])) i++;
  const maxC = i >= 2 ? 1 : 2; // škol., slav. / otv., tekv.
  while (i < w.length && V.test(w[i])) i++;
  let c = 0; while (i < w.length && !V.test(w[i]) && c < maxC) { i++; c++; }
  return w.slice(0, Math.max(3, i)) + '.';
}
function autoTheme() {
  const src = (st.blocks.find(b => (b.type === 'nadpis' || b.type === 'sekcia') && (b.text || '').trim()) || st.blocks.find(b => !ELEMS[b.type] && (b.text || '').trim()) || {}).text || 'handrbolka';
  const words = plain(src.split('\n')[0]).replace(/\//g, '-').replace(/[^a-z0-9\- ]+/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w));
  return words.slice(0, 4).map(shortWord).join(' ') || 'handrbolka';
}
const theme = () => plain(st.fileTheme || '').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 40) || autoTheme();
const fileName = (k, ext) => `${theme()} - ${SUFFIX[k] || k}${F[k].print && $('bleed').checked ? ' 3mm spad' : ''}.${ext}`;
function syncTheme() { const i = $('fileTheme'); i.placeholder = autoTheme(); if (document.activeElement !== i) i.value = st.fileTheme || ''; $('fileEx').textContent = fileName(cur, F[cur].ext); }
$('fileTheme').oninput = e => { st.fileTheme = e.target.value; syncTheme(); persistDraft(); };
$('bleed').addEventListener('change', syncTheme);
async function build(k) {
  if (F[k].ext === 'png') return { blob: await makePNG(k), name: fileName(k, 'png') };
  if (F[k].ext === 'pdf') return { blob: await makePDF(k), name: fileName(k, 'pdf') };
  const v = await makeVideo(k, p => toast('Vyrábam ' + F[k].name.toLowerCase() + '… ' + Math.round(p * 100) + ' %', true));
  return { blob: v.blob, name: fileName(k, v.ext) };
}
let busy = false;
async function exportOne(k) {
  if (busy) return; busy = true; setBusy(true); toast('Pripravujem ' + F[k].name + '…', true);
  try { lastPdfReport = null; const r = await build(k); await saveFile(r.name, r.blob); const n = F[k].ext === 'pdf' ? pdfNote() : ''; if (n) setTimeout(() => toast(n.trim()), 1800); }
  catch (e) { console.error(e); toast('Export sa nepodaril: ' + (e.message || e)); }
  busy = false; setBusy(false);
}
async function exportAll() {
  if (busy) return; busy = true; setBusy(true);
  try {
    const zip = new JSZip();
    for (const k of Object.keys(F)) { toast('Pripravujem ' + F[k].name + '…', true); const r = await build(k); zip.file(r.name, r.blob); }
    toast('Balím ZIP…', true);
    await saveFile(`${theme()} - vsetky formaty.zip`, await zip.generateAsync({ type: 'blob' }));
  } catch (e) { console.error(e); toast('Export sa nepodaril: ' + (e.message || e)); }
  busy = false; setBusy(false);
}
function setBusy(b) { ['expBtn', 'expMain'].forEach(id => $(id).disabled = b); }
$('expBtn').onclick = e => { e.stopPropagation(); const p = $('expPop'); p.hidden = !p.hidden; if (!p.hidden) syncTheme(); $('expBtn').setAttribute('aria-expanded', String(!p.hidden)); };
document.addEventListener('click', e => { if (!$('expPop').hidden && !e.target.closest('.menu')) { $('expPop').hidden = true; $('expBtn').setAttribute('aria-expanded', 'false'); } });
document.querySelectorAll('[data-exp]').forEach(b => b.onclick = () => { $('expPop').hidden = true; b.dataset.exp === 'all' ? exportAll() : exportOne(b.dataset.exp); });
$('expMain').onclick = () => exportOne(cur);

/* ---------- uloženie návrhov ---------- */
function thumb() { const c = document.createElement('canvas'); c.width = 360; c.height = 450; drawTo(c, 'post'); return c.toDataURL('image/jpeg', .8); }
async function saveDesign(asNew) {
  const base = (st.blocks.find(b => (b.text || '').trim())?.text || 'Návrh').split('\n')[0].slice(0, 50);
  let name = base;
  if (asNew && currentId) { // nový variant vedľa pôvodného
    let n = 2; try { const list = await Store.impl.list(); const re = new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' · variant (\\d+)$'); list.forEach(d => { const m = (d.name || '').match(re); if (m) n = Math.max(n, +m[1] + 1); }); } catch (e) {}
    name = base + ' · variant ' + n;
  }
  const id = asNew || !currentId ? 'l_' + Date.now() : currentId;
  const d = { id, name, state: st, photo: photoData, thumb: thumb(), updated: new Date().toISOString() };
  try { await Store.impl.save(d); currentId = d.id; savedName = name; syncSave(); toast(asNew ? 'Uložené ako nový návrh: ' + name : 'Zmeny uložené'); } catch (e) { toast('Uloženie sa nepodarilo: ' + (e.message || e)); }
}
let savedName = '';
function syncSave() {
  $('saveBtn').textContent = currentId ? 'Uložiť zmeny' : 'Uložiť';
  $('saveNewBtn').hidden = !currentId;
}
$('saveBtn').onclick = () => saveDesign(false);
$('saveNewBtn').onclick = () => saveDesign(true);
async function showSaved() {
  const g = $('sgrid'); g.innerHTML = '<p class="hint">Načítavam…</p>';
  $('savedHint').textContent = Store.impl.kind === 'supabase' ? 'Návrhy sú uložené online, uvidíš ich na každom zariadení.' : 'Návrhy sú uložené len v tomto prehliadači.';
  let list = [];
  try { list = await Store.impl.list(); } catch (e) { g.innerHTML = '<p class="err">Návrhy sa nepodarilo načítať: ' + (e.message || e) + '</p>'; return; }
  g.innerHTML = '';
  if (!list.length) { g.innerHTML = '<div class="empty">Zatiaľ tu nič nie je. V Návrh uprav texty a klikni na Uložiť.</div>'; return; }
  list.forEach(d => {
    const it = document.createElement('div'); it.className = 'sitem';
    const img = document.createElement('img'); img.src = d.thumb || ''; img.alt = '';
    const b = document.createElement('b'); b.textContent = d.name || 'Návrh';
    const sm = document.createElement('small'); sm.textContent = new Date(d.updated || d.updated_at).toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const row = document.createElement('div'); row.className = 'row';
    const open = document.createElement('button'); open.className = 'btn small primary'; open.textContent = 'Otvoriť';
    open.onclick = () => { st = Object.assign(BASE(), d.state); st.logo = { ...BASE().logo, ...d.state.logo }; st.footer = { ...BASE().footer, ...d.state.footer }; currentId = d.id; savedName = d.name; syncSave(); setPhoto(d.photo || null); syncUI(); setView('edit'); renderAll(); toast('Otvorený návrh. Uložiť ako nový ho neprepíše.'); };
    const copy = document.createElement('button'); copy.className = 'btn small'; copy.textContent = 'Kópia';
    copy.onclick = async () => { await Store.impl.save({ ...d, id: 'l_' + Date.now(), name: d.name + ' (kópia)', updated: new Date().toISOString() }); showSaved(); };
    const del = document.createElement('button'); del.className = 'btn small'; del.textContent = 'Zmazať';
    del.onclick = async () => { if (del.dataset.sure) { await Store.impl.remove(d.id); if (currentId === d.id) { currentId = null; syncSave(); } showSaved(); } else { del.dataset.sure = 1; del.textContent = 'Naozaj zmazať?'; } };
    row.append(open, copy, del); it.append(img, b, sm, row); g.appendChild(it);
  });
}
function setView(v) {
  $('editView').hidden = v !== 'edit'; $('savedView').hidden = v !== 'saved';
  $('vEdit').setAttribute('aria-pressed', String(v === 'edit')); $('vSaved').setAttribute('aria-pressed', String(v === 'saved'));
  if (v === 'saved') showSaved();
}
$('vEdit').onclick = () => setView('edit');
$('vSaved').onclick = () => setView('saved');

/* rozpracovaný návrh si pamätáme v prehliadači */
let pt = 0;
function persistDraft() { clearTimeout(pt); pt = setTimeout(() => { try { localStorage.setItem('hb_draft_v1', JSON.stringify({ st, currentId })); } catch (e) {} }, 600); }
function restoreDraft() { try { const d = JSON.parse(localStorage.getItem('hb_draft_v1') || 'null'); if (d && d.st && d.st.v === 1) { st = Object.assign(BASE(), d.st); currentId = d.currentId; } } catch (e) {} }

let tt = 0;
function toast(msg, stay) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(tt); if (!stay) tt = setTimeout(() => t.hidden = true, 2600); }

function brand() { const c = $('brandLogo'), ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height); const dark = matchMedia('(prefers-color-scheme: dark)').matches && document.documentElement.dataset.theme !== 'light' || document.documentElement.dataset.theme === 'dark'; HB.drawLogo(ctx, 2, 2, 176, dark ? '#9FD0B6' : HB.COL.green); }

/* ---------- štart ---------- */
async function start() {
  const auth = await Store.init().catch(e => { console.warn(e); return { needLogin: false }; });
  if (auth.needLogin) {
    $('editView').hidden = true; document.querySelector('.top').hidden = true; $('loginView').hidden = false;
    const go = async () => {
      $('lgErr').hidden = true; $('lgBtn').disabled = true;
      try { await Store.login($('lgEmail').value.trim(), $('lgPass').value); location.reload(); }
      catch (e) { $('lgErr').textContent = 'Prihlásenie sa nepodarilo. Skontroluj e-mail a heslo.'; $('lgErr').hidden = false; $('lgBtn').disabled = false; }
    };
    $('lgBtn').onclick = go; $('lgPass').onkeydown = e => { if (e.key === 'Enter') go(); };
    return;
  }
  $('storeHint').textContent = Store.impl.kind === 'supabase' ? 'Návrhy sa ukladajú online do Supabase.' : 'Návrhy sa ukladajú v tomto prehliadači.';
  await loadFonts();
  restoreDraft();
  brand();
  syncSave(); syncUI(); buildMuts(); selectFormat('post'); renderMuts(); renderVars();
}
window.HBApp = { build, fullCanvas, pdfNote, get pdfReport() { return lastPdfReport; } }; // pre testy
start();
})();
