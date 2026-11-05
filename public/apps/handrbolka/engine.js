/* Handrbolka Štúdio – vykresľovací engine.
   Jeden stav návrhu (state) -> ľubovoľný formát. Všetko sa kreslí na canvas z vektorov v ASSETS. */
"use strict";
const HB = (() => {
  const COL = { salvia: '#BFD7D0', green: '#2F684E', ochre: '#F8B233', coral: '#EB5F5F', moss: '#3D503E', white: '#FFFFFF' };
  const FONT = 'GoldplayAlt';
  const FORMATS = {
    post:  { key: 'post',  name: 'Insta post',  sub: '1080 × 1350 px', W: 1080, H: 1350, ext: 'png', online: true },
    igvid: { key: 'igvid', name: 'Insta video', sub: '1080 × 1350 px · video', W: 1080, H: 1350, ext: 'mp4', online: true, anim: true },
    story: { key: 'story', name: 'Insta story', sub: '1080 × 1920 px', W: 1080, H: 1920, ext: 'png', online: true, safeTop: 250, safeBot: 340 },
    reel:  { key: 'reel',  name: 'Story / reel video',  sub: '1080 × 1920 px · video', W: 1080, H: 1920, ext: 'mp4', online: true, anim: true, safeTop: 250, safeBot: 360 },
    a4:    { key: 'a4',    name: 'Plagát A4',   sub: '210 × 297 mm',   W: 2480, H: 3508, ext: 'pdf', mm: [210, 297], print: true },
    a3:    { key: 'a3',    name: 'Plagát A3',   sub: '297 × 420 mm',   W: 3508, H: 4961, ext: 'pdf', mm: [297, 420], print: true }
  };
  const BGS = {
    salvia: { name: 'Šalvia',  bg: COL.salvia, ink: COL.green, soft: COL.moss, pill: 'rgba(255,255,255,.55)', map: { ochre: COL.ochre, coral: COL.coral } },
    biela:  { name: 'Biela',   bg: '#FFFFFF',  ink: COL.green, soft: COL.moss, pill: COL.salvia, map: { ochre: COL.ochre, coral: COL.coral } },
    zelena: { name: 'Lesná',   bg: COL.green,  ink: '#FFFFFF', soft: '#E7F0EC', pill: 'rgba(255,255,255,.16)', map: { ochre: COL.ochre, coral: COL.coral } },
    okrova: { name: 'Okrová',  bg: COL.ochre,  ink: COL.green, soft: COL.moss, pill: 'rgba(255,255,255,.5)', map: { ochre: '#FFFFFF', coral: COL.coral } },
    foto:   { name: 'Fotka',   bg: COL.green,  ink: '#FFFFFF', soft: '#FFFFFF', pill: 'rgba(47,104,78,.75)', map: { ochre: COL.ochre, coral: COL.coral }, photo: true }
  };
  const DOODLE_SIZE = { psik: .44, hrad: .42, tvar: .40, rytier: .42, drak2: .36, drak: .30, lego: .26, vetvicka: .26, vetvicka2: .26, panacik: .22, stromcek: .16, hriby: .15, hriby2: .15, hrib: .11, usmev: .17 };
  const DOODLE_SETS = {
    mix:    { name: 'Všetko', list: ['psik', 'hrad', 'drak', 'hriby', 'tvar', 'rytier', 'vetvicka', 'drak2', 'hrib', 'lego', 'panacik', 'hriby2', 'usmev', 'vetvicka2', 'stromcek'] },
    les:    { name: 'Les',    list: ['hriby', 'vetvicka', 'hrib', 'stromcek', 'hriby2', 'vetvicka2', 'hrib', 'hriby'] },
    rozpravka: { name: 'Rozprávka', list: ['hrad', 'drak', 'rytier', 'drak2', 'tvar', 'lego', 'panacik'] },
    deti:   { name: 'Postavičky', list: ['tvar', 'panacik', 'psik', 'usmev', 'rytier', 'hrib'] }
  };
  const SLOTS = [
    { x: .24, y: .07, dx: -.25, dy: -1 }, { x: .78, y: .08, dx: .25, dy: -1 },
    { x: .03, y: .30, dx: -1, dy: -.1 },  { x: .97, y: .34, dx: 1, dy: -.1 },
    { x: .03, y: .60, dx: -1, dy: .1 },   { x: .97, y: .64, dx: 1, dy: .1 },
    { x: .20, y: .91, dx: -.3, dy: 1 },   { x: .80, y: .90, dx: .3, dy: 1 },
    { x: .50, y: .985, dx: 0, dy: 1 },    { x: .50, y: .02, dx: 0, dy: -1 },
    { x: .02, y: .05, dx: -1, dy: -1 },   { x: .98, y: .95, dx: 1, dy: 1 }
  ];

  /* ---------- pomocné ---------- */
  const P = new Map();
  const path = d => { let p = P.get(d); if (!p) { p = new Path2D(d); p.__d = d; P.set(d, p); } return p; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = {
    out: t => 1 - Math.pow(1 - t, 3),
    inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    back: t => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  };
  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
  const font = (w, px) => `${w} ${px}px ${FONT}, "Trebuchet MS", sans-serif`;
  function wrap(ctx, text, maxW) {
    const out = [];
    String(text || '').split('\n').forEach(par => {
      const words = par.split(/\s+/).filter(Boolean);
      if (!words.length) { out.push(''); return; }
      let line = words[0];
      for (let i = 1; i < words.length; i++) {
        const t = line + ' ' + words[i];
        if (ctx.measureText(t).width <= maxW) line = t; else { out.push(line); line = words[i]; }
      }
      out.push(line);
    });
    return out;
  }
  const rectHit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  /* ---------- prvky ---------- */
  function drawLogo(ctx, x, y, w, color, anim) {
    const L = ASSETS.logo, s = w / L.w;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = color;
    const n = L.strip.length;
    L.strip.forEach((p, i) => {
      let k = 1;
      if (anim) k = anim.strip(i, n);
      if (k <= 0) return;
      ctx.save();
      if (k < 1) {
        const cx = (p.x + p.x1) / 2, by = p.y1;
        ctx.translate(cx, by); ctx.scale(anim.style === 'prelnutie' ? 1 : clamp(k, 0, 1.2), clamp(k, 0, 1.2)); ctx.translate(-cx, -by);
        ctx.globalAlpha = clamp(k * 1.6, 0, 1);
      }
      ctx.fill(path(p.d)); ctx.restore();
    });
    L.word.forEach((p, i) => {
      let k = 1;
      if (anim) k = anim.word(i, L.word.length);
      if (k <= 0) return;
      ctx.save();
      if (k < 1) { ctx.translate(0, (1 - k) * 60); ctx.globalAlpha = clamp(k * 1.4, 0, 1); }
      ctx.fill(path(p.d)); ctx.restore();
    });
    ctx.restore();
    return w * L.h / L.w;
  }
  function drawDoodle(ctx, name, cx, cy, w, rot, color) {
    const D = ASSETS.doodles[name]; if (!D) return;
    const s = w / D.w;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(s, s); ctx.translate(-D.w / 2, -D.h / 2);
    ctx.fillStyle = color; ctx.fill(path(D.d)); ctx.restore();
  }
  function drawUnderline(ctx, x, y, w, color, prog = 1) {
    const U = ASSETS.underline, s = w / U.w;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (prog < 1) { ctx.beginPath(); ctx.rect(-5, -50, U.w * prog + 5, U.h + 100); ctx.clip(); }
    ctx.strokeStyle = color; ctx.lineWidth = U.stroke; ctx.lineCap = 'round'; ctx.stroke(path(U.wave));
    ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (prog < 1) { const px = Math.max(0, U.w * prog - U.w * .985); ctx.translate(px, Math.sin(prog * 30) * 1.2); }
    ctx.fillStyle = color; ctx.fill(path(U.pencil)); ctx.restore();
    return U.h * s;
  }
  function drawPhoto(ctx, img, frameKey, x, y, w, ph, frameColor, prog = 1) {
    const F = ASSETS.frames[frameKey];
    if (!F) { // obyčajná fotka so zaoblením
      const h = w * .66; ctx.save(); roundRect(ctx, x, y, w, h, w * .04); ctx.clip();
      if (img) coverImg(ctx, img, x, y, w, h, ph); else placeholder(ctx, x, y, w, h);
      ctx.restore(); return h;
    }
    const s = w / F.w, h = F.h * s;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.save(); ctx.clip(path(F.mask));
    ctx.setTransform(ctx.getTransform()); // nech clip ostane, kreslíme v jednotkách rámika
    const mb = maskBox(F);
    if (img) coverImg(ctx, img, mb.x, mb.y, mb.w, mb.h, ph); else placeholder(ctx, mb.x, mb.y, mb.w, mb.h);
    ctx.restore();
    if (prog > 0) { ctx.globalAlpha = clamp(prog, 0, 1); ctx.fillStyle = frameColor; ctx.fill(path(F.frame)); }
    ctx.restore();
    return h;
  }
  const MB = {};
  function maskBox(F) {
    const k = F.mask.length; if (MB[k]) return MB[k];
    const n = F.mask.match(/-?[\d.]+/g).map(Number); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i + 1 < n.length; i += 2) { x0 = Math.min(x0, n[i]); x1 = Math.max(x1, n[i]); y0 = Math.min(y0, n[i + 1]); y1 = Math.max(y1, n[i + 1]); }
    return (MB[k] = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  }
  function coverImg(ctx, img, x, y, w, h, ph = {}) {
    const z = ph.zoom || 1, iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const sc = Math.max(w / iw, h / ih) * z, dw = iw * sc, dh = ih * sc;
    const ox = (ph.x ?? .5), oy = (ph.y ?? .5);
    ctx.drawImage(img, x + (w - dw) * ox, y + (h - dh) * oy, dw, dh);
  }
  function placeholder(ctx, x, y, w, h) {
    ctx.save(); ctx.fillStyle = 'rgba(47,104,78,.18)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(47,104,78,.55)'; ctx.font = font(600, h * .1); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('sem príde fotka', x + w / 2, y + h / 2); ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  function drawIcon(ctx, key, x, y, size, color) {
    const I = ASSETS.icons[key], s = size / Math.max(I.w, I.h);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = color; ctx.fill(path(I.d)); ctx.restore();
  }
  const QRC = new Map();
  function drawQR(ctx, text, x, y, size, color) {
    if (typeof qrcode !== 'function') return;
    let q = QRC.get(text);
    if (!q) { q = qrcode(0, 'M'); q.addData(unescape(encodeURIComponent(text))); q.make(); QRC.set(text, q); }
    const n = q.getModuleCount(), m = size / n;
    ctx.save(); ctx.fillStyle = color;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect(x + c * m, y + r * m, m + .6, m + .6);
    ctx.restore();
  }

  /* obrázky vložené ako samostatné prvky */
  const IMGC = new Map();
  function blockImg(src) {
    if (!src) return null;
    let im = IMGC.get(src);
    if (!im) {
      im = new Image(); im.__alpha = /^data:image\/(png|gif|webp)/.test(src);
      im.onload = () => { if (typeof api.onAsset === 'function') api.onAsset(); };
      im.src = src; IMGC.set(src, im);
    }
    return im.complete && im.naturalWidth ? im : null;
  }

  /* ---------- rozloženie ---------- */
  const BLOCK = {
    nadpis:   { w: 700, s: 104, lh: 1.04, gap: .55 },
    podnadpis:{ w: 400, s: 58,  lh: 1.15, gap: .6 },
    citat:    { w: 600, s: 40,  lh: 1.3,  gap: .9 },
    sekcia:   { w: 700, s: 62,  lh: 1.1,  gap: .5 },
    info:     { w: 600, s: 40,  lh: 1.25, gap: .8 },
    odrazky:  { w: 600, s: 33,  lh: 1.85, gap: .9 },
    text:     { w: 400, s: 32,  lh: 1.42, gap: .8 }
  };
  function showFooter(fmt, st) { return fmt.print ? st.footer.print : false; }
  function showHandle(fmt, st) { return fmt.online && !fmt.anim && st.footer.handle; }

  function layout(ctx, fmt, st, opt = {}) {
    const W = fmt.W, H = fmt.H, u = W / 1080, theme = BGS[st.bg] || BGS.salvia;
    const left = st.align === 'left';
    const side = W * .095;
    const top = Math.max(H * .065, (fmt.safeTop || 0) + H * .02);
    const botSafe = Math.max(H * .055, (fmt.safeBot || 0) + H * .015);
    const cw = W - side * 2;
    const footer = showFooter(fmt, st), handle = showHandle(fmt, st);
    const footH = footer ? W * .085 : handle ? 40 * u : 0;
    const footY = H - botSafe - footH;
    const availTop = top, availBot = footY - (footH ? H * .03 : 0);
    const availH = availBot - availTop;
    const blocks = opt.blocks || st.blocks;
    let photoImg = opt.photoImg;
    const photoInFlow = photoImg !== undefined && st.photo.on && st.bg !== 'foto';

    const elemItem = (b, k) => {
      const sz = clamp(+b.size || (b.type === 'qr' ? .32 : .5), .12, 1);
      if (b.type === 'qr') {
        if (!String(b.text || '').trim()) return null;
        const w = Math.min(cw, H * .5) * sz * k; const pad = w * .07;
        const capSize = b.cap && String(b.cap).trim() ? Math.max(22 * u, w * .11) : 0;
        return { type: 'qr', text: String(b.text).trim(), cap: capSize ? String(b.cap).trim() : '', capSize, qw: w, pad, w: w + pad * 2, tw: w + pad * 2, h: w + pad * 2 + (capSize ? capSize * 1.6 : 0), gap: 44 * u * k };
      }
      if (!b.img) return null;
      const im = blockImg(b.img);
      const ar = im ? im.naturalHeight / im.naturalWidth : 1;
      let w = cw * sz * k, h = w * ar;
      const maxH = availH * .6; if (h > maxH) { h = maxH; w = h / ar; }
      return { type: 'obrazok', img: im, w, tw: w, h, gap: 44 * u * k };
    };
    let items, total, k = 1, grown = false, freeB = [];
    for (let iter = 0; iter < 14; iter++) {
      items = []; total = 0; freeB = [];
      const add = it => { items.push(it); };
      // logo
      const lm = st.logo.mode;
      const logoItem = () => {
        if (lm === 'skryte') return;
        const big = lm === 'hlavne';
        let lw = (big ? .78 : .42) * st.logo.size * Math.min(cw, H * .62) * (big ? 1 : 1);
        lw = Math.min(lw, cw);
        const L = ASSETS.logo, lh = lw * L.h / L.w * k;
        lw *= k;
        let subH = 0, subSize = 0;
        if (st.logo.sub && st.logo.subText) { subSize = lw * .085; subH = subSize * 1.25; }
        add({ type: 'logo', h: lh + subH + (subH ? lw * .01 : 0), w: lw, lh, subSize, gap: (big ? 46 : 40) * u * k, big });
      };
      if (lm !== 'dole') logoItem();
      const photoFirst = photoInFlow && st.layout === 'foto-hore';
      const photoItem = () => {
        const F = ASSETS.frames[st.photo.frame];
        const pw = Math.min(cw * 1.08, (st.layout === 'foto-dole' || st.layout === 'foto-hore' ? 1.1 : .92) * cw) * st.photo.size * k;
        const ph = F ? pw * F.h / F.w : pw * .66;
        add({ type: 'photo', h: ph, w: pw, gap: 44 * u * k });
      };
      if (photoFirst) photoItem();
      blocks.forEach((b, i) => {
        if (b.type === 'qr' || b.type === 'obrazok') {
          if (b.free) { freeB.push([b, i]); return; }
          const it = elemItem(b, k); if (it) { it.bi = i; add(it); }
          return;
        }
        const B = BLOCK[b.type]; if (!B) return;
        if (!String(b.text || '').trim()) return;
        let size = B.s * u * k * (b.type === 'nadpis' ? st.titleScale : st.textScale);
        const weight = b.type === 'nadpis' || b.type === 'sekcia' ? 700 : b.type === 'podnadpis' || b.type === 'text' ? 400 : 600;
        let maxW = b.type === 'odrazky' ? cw * .92 : cw;
        ctx.font = font(weight, size);
        let text = b.text;
        if (b.type === 'citat') { text = text.trim(); if (!/^[„“"]/.test(text)) text = '“' + text; if (!/[”“"]$/.test(text)) text += '”'; }
        if (b.type === 'odrazky') {
          const lines = []; const bl = String(b.text).split('\n').map(s => s.replace(/^[-•·\s]+/, '')).filter(Boolean);
          const indent = size * 1.1;
          bl.forEach(t => wrap(ctx, t, maxW - indent).forEach((l, j) => lines.push({ t: l, first: j === 0 })));
          const tw = Math.max(...lines.map(l => ctx.measureText(l.t).width)) + indent;
          add({ type: b.type, lines, size, weight, h: lines.length * size * B.lh, tw, indent, gap: B.gap * 60 * u * k, lh: B.lh });
          return;
        }
        let lines = wrap(ctx, text, maxW);
        if (b.type === 'nadpis' && lines.length > 1) { // vyrovnaj riadky
          let lo = maxW * .5, hi = maxW;
          for (let j = 0; j < 8; j++) { const mid = (lo + hi) / 2; if (wrap(ctx, text, mid).length > lines.length) lo = mid; else hi = mid; }
          lines = wrap(ctx, text, hi + 1);
        }
        const tw = Math.max(...lines.map(l => ctx.measureText(l).width));
        let h = lines.length * size * B.lh;
        let extra = 0;
        if (b.type === 'sekcia' && st.underline) extra = size * .55 + (ASSETS.underline.h / ASSETS.underline.w) * Math.min(cw * .78, Math.max(tw * 1.5, cw * .55));
        if (b.type === 'info') h += size * .7;
        add({ type: b.type, lines, size, weight, h: h + extra, th: h, tw, gap: B.gap * 60 * u * k, lh: B.lh });
      });
      if (photoInFlow && !photoFirst) photoItem();
      if (lm === 'dole') logoItem();
      items.forEach((it, i) => { total += it.h + (i < items.length - 1 ? it.gap : 0); });
      if (total <= availH) {
        // veľa voľného miesta (story, plagát) -> texty trochu zväčši
        if (!grown && total < availH * .6) { grown = true; k *= Math.min(1.3, Math.sqrt(availH * .6 / total)); continue; }
        break;
      }
      k *= Math.max(.8, Math.min(.97, Math.sqrt(availH / total)));
    }
    // zvislé umiestnenie
    let y;
    const lay = st.layout;
    if (lay === 'hore' || lay === 'foto-hore') y = availTop + Math.min(H * .02, (availH - total) * .15);
    else if (lay === 'foto-dole') y = availBot - total;
    else y = availTop + (availH - total) * (fmt.print && st.logo.mode === 'hlavne' ? .42 : .5);
    const rects = [];
    items.forEach(it => {
      it.y = y;
      const w = it.type === 'logo' || it.type === 'photo' || it.type === 'qr' || it.type === 'obrazok' ? it.w : it.tw;
      it.x = left ? side : (W - w) / 2;
      rects.push({ x: it.x - W * .02, y: y - H * .008, w: w + W * .04, h: it.h + H * .016, type: it.type });
      y += it.h + it.gap;
    });
    // voľne posunuté QR kódy a obrázky (stred v pomere k šírke a výške)
    freeB.forEach(([b, i]) => {
      const it = elemItem(b, 1); if (!it) return;
      it.bi = i; it.free = true;
      it.x = clamp((+b.fx || .5) * W - it.w / 2, 0, W - it.w);
      it.y = clamp((+b.fy || .5) * H - it.h / 2, 0, H - it.h);
      items.push(it);
      rects.push({ x: it.x - W * .02, y: it.y - H * .008, w: it.w + W * .04, h: it.h + H * .016, type: it.type });
    });
    const foot = footH ? { y: footY, h: footH } : null;
    if (foot) rects.push({ x: footer ? side * .6 : W * .2, y: footY - H * .01, w: footer ? W - side * 1.2 : W * .6, h: footH + H * .02, type: 'foot' });
    return { W, H, u, side, cw, items, rects, foot, footer, handle, theme, left, k };
  }

  function placeDoodles(fmt, st, rects) {
    const W = fmt.W, H = fmt.H, out = [];
    if (!st.doodles.count) return out;
    const r = rng(st.doodles.seed * 7919 + 13);
    const set = (DOODLE_SETS[st.doodles.set] || DOODLE_SETS.mix).list.slice();
    for (let i = set.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [set[i], set[j]] = [set[j], set[i]]; }
    const slots = SLOTS.map((s, i) => ({ ...s, i }));
    for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
    const used = new Set();
    const base = Math.min(W, H * .8);
    const want = set.slice(0, Math.min(set.length, st.doodles.count + 4));
    // najprv veľké kresbičky, potom drobnosti
    want.sort((a, b) => (DOODLE_SIZE[b] || .2) - (DOODLE_SIZE[a] || .2));
    for (const name of want) {
      if (out.length >= st.doodles.count) break;
      const D = ASSETS.doodles[name]; if (!D) continue;
      const w0 = base * (DOODLE_SIZE[name] || .2) * (.9 + r() * .25) * st.doodles.size;
      const rot = (r() - .5) * .3;
      let best = null;
      for (const sl of slots) {
        if (used.has(sl.i)) continue;
        let w = w0, h = w * D.h / D.w;
        const len = Math.hypot(sl.dx, sl.dy) || 1, dx = sl.dx / len, dy = sl.dy / len;
        // začni bližšie k stredu a posúvaj von, kým nenarazíš na voľné miesto
        let cx = sl.x * W + (W / 2 - sl.x * W) * .28, cy = sl.y * H + (H / 2 - sl.y * H) * .2;
        for (let step = 0; step < 45; step++) {
          const bb = { x: cx - w * .43, y: cy - h * .43, w: w * .86, h: h * .86 };
          const hit = rects.some(rc => rectHit(bb, rc)) || out.some(o => rectHit(bb, o.bb));
          const visW = Math.max(0, Math.min(W, cx + w / 2) - Math.max(0, cx - w / 2)), visH = Math.max(0, Math.min(H, cy + h / 2) - Math.max(0, cy - h / 2));
          const vis = (visW * visH) / (w * h);
          if (!hit) { if (vis >= .38) best = { name, cx, cy, w, h, rot, dx, dy, bb, c: D.c, slot: sl.i }; break; }
          if (vis < .45) { w *= .93; h *= .93; if (w < w0 * .55) break; }
          cx += dx * W * .018; cy += dy * W * .018;
        }
        if (best) break;
      }
      if (best) { used.add(best.slot); out.push(best); }
    }
    return out;
  }

  /* ---------- hlavné kreslenie ---------- */
  function render(ctx, fmtKey, st, opt = {}) {
    const fmt = FORMATS[fmtKey];
    const W = fmt.W, H = fmt.H;
    const t = opt.t; const A = t != null ? makeAnim(st, t, opt.dur || st.anim.dur) : null;
    const bleed = opt.bleed || 0;
    const reelBlocks = fmt.anim ? reelContent(st) : null;
    if (fmt.anim) st = { ...st, logo: { ...st.logo, mode: st.logo.mode === 'skryte' ? 'skryte' : 'hlavne', sub: st.logo.sub }, layout: 'stred', align: 'center' };
    const L = layout(ctx, fmt, st, { photoImg: opt.photoImg, blocks: reelBlocks });
    const th = L.theme;
    ctx.save();
    if (bleed) ctx.translate(bleed, bleed);
    // pozadie
    ctx.fillStyle = th.bg; ctx.fillRect(-bleed, -bleed, W + bleed * 2, H + bleed * 2);
    if (st.bg === 'foto') {
      ctx.save(); ctx.beginPath(); ctx.rect(-bleed, -bleed, W + bleed * 2, H + bleed * 2); ctx.clip();
      if (opt.photoImg) coverImg(ctx, opt.photoImg, -bleed, -bleed, W + bleed * 2, H + bleed * 2, st.photo);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(25,55,42,.55)'); g.addColorStop(.45, 'rgba(25,55,42,.25)'); g.addColorStop(1, 'rgba(25,55,42,.7)');
      ctx.fillStyle = g; ctx.fillRect(-bleed, -bleed, W + bleed * 2, H + bleed * 2); ctx.restore();
    }
    // kresbičky
    const dd = placeDoodles(fmt, st, L.rects);
    ctx.save(); ctx.beginPath(); ctx.rect(-bleed, -bleed, W + bleed * 2, H + bleed * 2); ctx.clip();
    dd.forEach((d, i) => {
      let cx = d.cx, cy = d.cy, sc = 1;
      if (A) { const p = A.doodle(i, dd.length); if (p <= 0) return; cx += d.dx * (1 - p) * W * .35; cy += d.dy * (1 - p) * W * .35; sc = .6 + .4 * Math.min(1, p); }
      const col = st.doodles.color === 'mono' ? (st.bg === 'zelena' || st.bg === 'foto' ? 'rgba(255,255,255,.22)' : 'rgba(47,104,78,.16)') : th.map[d.c];
      drawDoodle(ctx, d.name, cx, cy, d.w * sc, d.rot, col);
    });
    ctx.restore();
    // obsah
    L.items.forEach((it, idx) => {
      const pa = A ? A.item(idx, L.items.length, it.type) : 1;
      if (pa <= 0 && it.type !== 'logo') return;
      ctx.save();
      if (A && it.type !== 'logo' && pa < 1) { ctx.globalAlpha = clamp(pa * 1.3, 0, 1); ctx.translate(0, (1 - ease.out(clamp(pa, 0, 1))) * 70 * L.u); }
      drawItem(ctx, it, L, st, opt, A, pa);
      ctx.restore();
    });
    // pätička
    if (L.foot) drawFooter(ctx, L, st, A);
    ctx.restore();
    return L;
  }
  function drawItem(ctx, it, L, st, opt, A, pa) {
    const th = L.theme, W = L.W;
    const cxText = (it2, line) => {
      const w = ctx.measureText(line).width;
      return L.left ? it2.x : (W - w) / 2;
    };
    switch (it.type) {
      case 'logo': {
        const lx = L.left ? it.x : (W - it.w) / 2;
        drawLogo(ctx, lx, it.y, it.w, th.ink, A ? A.logo : null);
        if (it.subSize) {
          const sp = A ? A.logoSub() : 1;
          if (sp > 0) {
            ctx.save(); ctx.globalAlpha = clamp(sp, 0, 1);
            ctx.font = font(400, it.subSize); ctx.fillStyle = th.ink; ctx.textBaseline = 'alphabetic';
            const tx = st.logo.subText; const tw = ctx.measureText(tx).width;
            const x = L.left ? lx + it.w * .145 : (W - tw) / 2;
            ctx.fillText(tx, x, it.y + it.lh + it.subSize * 1.02 + (1 - sp) * 20);
            ctx.restore();
          }
        }
        break;
      }
      case 'photo': {
        const fc = st.photo.color === 'auto' ? th.map[(ASSETS.frames[st.photo.frame] || {}).c || 'ochre'] : COL[st.photo.color] || COL.ochre;
        drawPhoto(ctx, opt.photoImg, st.photo.frame, L.left ? it.x : (W - it.w) / 2, it.y, it.w, st.photo, fc, 1);
        break;
      }
      case 'qr': {
        const x = it.x;
        ctx.fillStyle = '#FFFFFF'; roundRect(ctx, x, it.y, it.w, it.w, it.pad * 1.2); ctx.fill();
        drawQR(ctx, it.text, x + it.pad, it.y + it.pad, it.qw, COL.green);
        if (it.cap) {
          ctx.font = font(600, it.capSize); ctx.fillStyle = th.ink; ctx.textBaseline = 'alphabetic';
          const cw2 = ctx.measureText(it.cap).width;
          ctx.fillText(it.cap, L.left && !it.free ? x : x + (it.w - cw2) / 2, it.y + it.w + it.capSize * 1.25);
        }
        break;
      }
      case 'obrazok': {
        if (!it.img) break;
        const x = it.x;
        ctx.drawImage(it.img, x, it.y, it.w, it.h);
        break;
      }
      case 'odrazky': {
        ctx.font = font(it.weight, it.size); ctx.fillStyle = th.ink; ctx.textBaseline = 'alphabetic';
        const bx = L.left ? it.x : (W - it.tw) / 2;
        it.lines.forEach((l, j) => {
          const y = it.y + (j + .72) * it.size * it.lh - it.size * it.lh * .18;
          if (l.first) { ctx.beginPath(); ctx.arc(bx + it.size * .3, y - it.size * .3, it.size * .12, 0, Math.PI * 2); ctx.fill(); }
          ctx.fillText(l.t, bx + it.indent, y);
        });
        break;
      }
      case 'info': {
        ctx.font = font(it.weight, it.size);
        const padX = it.size * .9, ph = it.th, pw = it.tw + padX * 2;
        const px = L.left ? it.x - padX * .0 : (W - pw) / 2;
        ctx.fillStyle = th.pill; roundRect(ctx, px, it.y, pw, ph, ph / 2); ctx.fill();
        ctx.fillStyle = th.ink; ctx.textBaseline = 'alphabetic';
        it.lines.forEach((l, j) => {
          const w = ctx.measureText(l).width;
          ctx.fillText(l, L.left ? px + padX : (W - w) / 2, it.y + it.size * .35 + (j + .82) * it.size * it.lh);
        });
        break;
      }
      default: {
        ctx.font = font(it.weight, it.size); ctx.fillStyle = it.type === 'text' ? th.soft : th.ink; ctx.textBaseline = 'alphabetic';
        it.lines.forEach((l, j) => {
          ctx.fillText(l, cxText(it, l), it.y + (j + .8) * it.size * it.lh);
        });
        if (it.type === 'sekcia' && st.underline) {
          const uw = Math.min(L.cw * .78, Math.max(it.tw * 1.5, L.cw * .55));
          const ux = L.left ? it.x : (W - uw) / 2;
          drawUnderline(ctx, ux, it.y + it.th + it.size * .35, uw, th.ink, A ? A.underline(pa) : 1);
        }
      }
    }
  }
  function drawFooter(ctx, L, st, A) {
    const th = L.theme, W = L.W, f = L.foot;
    const p = A ? A.foot() : 1; if (p <= 0) return;
    ctx.save(); ctx.globalAlpha = clamp(p, 0, 1);
    if (L.footer) {
      const s = f.h * .78, gap = s * .18;
      const items = [['web', st.footer.web, 'Handrbolka', 'webstránka'], ['ig', st.footer.ig, 'Handrbolka', 'instagram'], ['fb', st.footer.fb, 'Handrbolka', 'facebook']].filter(i => i[1]);
      ctx.font = font(600, s * .3);
      const widths = items.map(i => s + gap + s + gap + Math.max(ctx.measureText(i[2]).width, ctx.measureText(i[3]).width));
      const totalW = widths.reduce((a, b) => a + b, 0);
      const spacing = items.length > 1 ? Math.min(s * 1.2, (W - L.side * 1.2 - totalW) / (items.length - 1)) : 0;
      let x = (W - totalW - spacing * (items.length - 1)) / 2; const y = f.y + (f.h - s) / 2;
      items.forEach((i, n) => {
        drawIcon(ctx, i[0], x, y, s, th.soft);
        drawQR(ctx, i[1], x + s + gap, y + s * .04, s * .92, th.soft);
        ctx.fillStyle = th.soft; ctx.textBaseline = 'alphabetic';
        ctx.fillText(i[2], x + s * 2 + gap * 2, y + s * .46);
        ctx.fillText(i[3], x + s * 2 + gap * 2, y + s * .84);
        x += widths[n] + spacing;
      });
    } else if (L.handle) {
      const s = f.h * .8; ctx.font = font(600, s); ctx.fillStyle = th.ink; ctx.textBaseline = 'middle';
      const t = st.footer.handleText || '@lesny_klub_handrbolka'; const w = ctx.measureText(t).width;
      ctx.fillText(t, (W - w) / 2, f.y + f.h / 2);
    }
    ctx.restore();
  }

  /* ---------- reel intro ---------- */
  function reelContent(st) {
    const out = []; const t = st.blocks.find(b => b.type === 'nadpis' && b.text.trim()) || st.blocks.find(b => b.type === 'sekcia' && b.text.trim());
    if (st.anim.title && t) out.push(t);
    const s = st.blocks.find(b => (b.type === 'podnadpis' || b.type === 'info') && b.text.trim());
    if (st.anim.sub && s) out.push(s);
    return out;
  }
  function makeAnim(st, t, dur) {
    const style = st.anim.style; // kreslenie | vyrastanie | prelnutie
    const sp = dur / 4; // tempo podľa dĺžky
    const T = { doodles: .05 * sp, strip: .25 * sp, stripLen: .95 * sp, word: 1.05 * sp, wordLen: .7 * sp, sub: 1.55 * sp, items: 1.75 * sp, foot: 2.6 * sp };
    const prog = (start, len) => clamp((t - start) / len, 0, 1);
    const shape = p => style === 'prelnutie' ? ease.inOut(p) : ease.back(p);
    return {
      style,
      doodle: (i, n) => { const p = prog(T.doodles + i * .12 * sp, .6 * sp); return p <= 0 ? 0 : style === 'prelnutie' ? ease.inOut(p) : ease.back(p); },
      logo: {
        style,
        strip: (i, n) => { const p = prog(T.strip + (i / n) * T.stripLen, .32 * sp); return p <= 0 ? 0 : p >= 1 ? 1 : shape(p); },
        word: (i, n) => { const p = prog(T.word + (i / n) * T.wordLen * .6, .45 * sp); return p <= 0 ? 0 : p >= 1 ? 1 : (style === 'prelnutie' ? ease.inOut(p) : ease.back(p)); }
      },
      logoSub: () => prog(T.sub, .4 * sp),
      item: (idx, n, type) => type === 'logo' ? 1 : prog(T.items + idx * .22 * sp, .5 * sp),
      underline: pa => ease.inOut(clamp((pa - .2) / .8, 0, 1)),
      foot: () => prog(T.foot, .4 * sp)
    };
  }

  const api = { COL, FORMATS, BGS, DOODLE_SETS, render, layout, drawLogo, drawUnderline, drawDoodle, font, blockImg, onAsset: null };
  return api;
})();
