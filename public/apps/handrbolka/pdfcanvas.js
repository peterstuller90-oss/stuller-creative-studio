/* PDFCanvas: podmnožina Canvas 2D API, ktorá zapisuje vektorový PDF obsah cez jsPDF.
   Kresbičky, logo, QR a podčiarknutia ostanú krivky, texty sa prevedú na krivky (opentype.js),
   fotky sa vložia ako obrázky prepočítané na 300 dpi pri skutočnej veľkosti na papieri. */
(function () {
  const N = v => { const r = Math.round(v * 10000) / 10000; return (Object.is(r, -0) ? 0 : r).toString(); };
  const mul = (a, b) => [ // a * b (b sa aplikuje prvé)
    a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
  const inv = m => { const d = m[0] * m[3] - m[1] * m[2]; return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d, (m[2] * m[5] - m[3] * m[4]) / d, (m[1] * m[4] - m[0] * m[5]) / d]; };
  const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const isId = m => m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0;

  const norm = document.createElement('canvas').getContext('2d');
  const colCache = new Map();
  function parseColor(c) {
    if (colCache.has(c)) return colCache.get(c);
    norm.fillStyle = '#000'; norm.fillStyle = c; const s = norm.fillStyle; let r = 0, g = 0, b = 0, a = 1, m;
    if (s[0] === '#') { r = parseInt(s.slice(1, 3), 16); g = parseInt(s.slice(3, 5), 16); b = parseInt(s.slice(5, 7), 16); }
    else if ((m = s.match(/rgba?\(([^)]+)\)/))) { const p = m[1].split(',').map(Number); [r, g, b] = p; a = p.length > 3 ? p[3] : 1; }
    const out = { r: r / 255, g: g / 255, b: b / 255, a }; colCache.set(c, out); return out;
  }

  const svgCache = new Map();
  function svgToPdf(d) { // cesty z assetov majú len absolútne M L C Z
    let s = svgCache.get(d); if (s) return s;
    const out = []; const re = /([MLCZmlcz])([^MLCZmlcz]*)/g; let m;
    while ((m = re.exec(d))) {
      const n = (m[2].match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []).map(Number);
      const c = m[1].toUpperCase();
      if (c === 'M') { out.push(N(n[0]) + ' ' + N(n[1]) + ' m'); for (let i = 2; i + 1 < n.length; i += 2) out.push(N(n[i]) + ' ' + N(n[i + 1]) + ' l'); }
      else if (c === 'L') for (let i = 0; i + 1 < n.length; i += 2) out.push(N(n[i]) + ' ' + N(n[i + 1]) + ' l');
      else if (c === 'C') for (let i = 0; i + 5 < n.length; i += 6) out.push(n.slice(i, i + 6).map(N).join(' ') + ' c');
      else if (c === 'Z') out.push('h');
    }
    s = out.join('\n'); svgCache.set(d, s); return s;
  }

  class Grad {
    constructor(x0, y0, x1, y1) { Object.assign(this, { x0, y0, x1, y1 }); this.stops = []; }
    addColorStop(o, c) { this.stops.push({ o, c: parseColor(c) }); this.stops.sort((a, b) => a.o - b.o); }
    at(t) {
      const s = this.stops; if (!s.length) return { r: 0, g: 0, b: 0, a: 0 };
      if (t <= s[0].o) return s[0].c; if (t >= s[s.length - 1].o) return s[s.length - 1].c;
      for (let i = 1; i < s.length; i++) if (t <= s[i].o) {
        const a = s[i - 1], b = s[i], k = (t - a.o) / (b.o - a.o || 1);
        return { r: a.c.r + (b.c.r - a.c.r) * k, g: a.c.g + (b.c.g - a.c.g) * k, b: a.c.b + (b.c.b - a.c.b) * k, a: a.c.a + (b.c.a - a.c.a) * k };
      }
    }
  }

  class PDFCanvas {
    /* opts: base = matica z pixelov plátna do PDF bodov (PDF súradnice, y hore), pageH v bodoch,
       fonts = {400: opentype.Font, 500, 600, 700}, dpi = cieľové rozlíšenie fotiek */
    constructor(doc, opts) {
      this.doc = doc; this.base = opts.base; this.pageH = opts.pageH; this.fonts = opts.fonts || {}; this.dpi = opts.dpi || 300;
      this.measure = document.createElement('canvas').getContext('2d');
      this.s = { fillStyle: '#000000', strokeStyle: '#000000', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter', globalAlpha: 1, font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic', m: [1, 0, 0, 1, 0, 0] };
      this.stack = []; this.path = []; this.gs = new Map();
      this.report = { images: [], missingFont: false };
      this.canvas = { width: opts.width || 0, height: opts.height || 0 };
    }
    w(str) { this.doc.internal.write(str); }
    // stav
    get fillStyle() { return this.s.fillStyle; } set fillStyle(v) { this.s.fillStyle = v; }
    get strokeStyle() { return this.s.strokeStyle; } set strokeStyle(v) { this.s.strokeStyle = v; }
    get lineWidth() { return this.s.lineWidth; } set lineWidth(v) { this.s.lineWidth = v; }
    get lineCap() { return this.s.lineCap; } set lineCap(v) { this.s.lineCap = v; }
    get lineJoin() { return this.s.lineJoin; } set lineJoin(v) { this.s.lineJoin = v; }
    get globalAlpha() { return this.s.globalAlpha; } set globalAlpha(v) { this.s.globalAlpha = v; }
    get font() { return this.s.font; } set font(v) { this.s.font = v; }
    get textAlign() { return this.s.textAlign; } set textAlign(v) { this.s.textAlign = v; }
    get textBaseline() { return this.s.textBaseline; } set textBaseline(v) { this.s.textBaseline = v; }
    save() { this.stack.push({ ...this.s, m: this.s.m.slice() }); this.w('q'); }
    restore() { if (!this.stack.length) return; this.s = this.stack.pop(); this.w('Q'); }
    // transformácie
    transform(a, b, c, d, e, f) { const t = [a, b, c, d, e, f]; if (isId(t)) return; this.s.m = mul(this.s.m, t); this.w(t.map(N).join(' ') + ' cm'); }
    translate(x, y) { if (x || y) this.transform(1, 0, 0, 1, x, y); }
    scale(x, y) { this.transform(x, 0, 0, y, 0, 0); }
    rotate(r) { if (r) { const c = Math.cos(r), s = Math.sin(r); this.transform(c, s, -s, c, 0, 0); } }
    getTransform() { const m = this.s.m; return new DOMMatrix([m[0], m[1], m[2], m[3], m[4], m[5]]); }
    setTransform(a, b, c, d, e, f) {
      const t = typeof a === 'object' ? [a.a, a.b, a.c, a.d, a.e, a.f] : [a, b, c, d, e, f];
      const delta = mul(inv(this.s.m), t);
      if (!isId(delta.map(v => Math.round(v * 1e9) / 1e9))) this.w(delta.map(N).join(' ') + ' cm');
      this.s.m = t;
    }
    resetTransform() { this.setTransform(1, 0, 0, 1, 0, 0); }
    // cesty
    beginPath() { this.path = []; this.cur = null; }
    moveTo(x, y) { this.path.push(N(x) + ' ' + N(y) + ' m'); this.cur = [x, y]; this.start = [x, y]; }
    lineTo(x, y) { if (!this.cur) return this.moveTo(x, y); this.path.push(N(x) + ' ' + N(y) + ' l'); this.cur = [x, y]; }
    bezierCurveTo(a, b, c, d, x, y) { if (!this.cur) this.moveTo(a, b); this.path.push([a, b, c, d, x, y].map(N).join(' ') + ' c'); this.cur = [x, y]; }
    quadraticCurveTo(qx, qy, x, y) {
      if (!this.cur) this.moveTo(qx, qy); const [x0, y0] = this.cur;
      this.bezierCurveTo(x0 + 2 / 3 * (qx - x0), y0 + 2 / 3 * (qy - y0), x + 2 / 3 * (qx - x), y + 2 / 3 * (qy - y), x, y);
    }
    closePath() { this.path.push('h'); if (this.start) this.cur = this.start.slice(); }
    rect(x, y, w, h) { this.path.push([x, y, w, h].map(N).join(' ') + ' re'); this.cur = [x, y]; this.start = [x, y]; }
    arc(cx, cy, r, a0, a1, ccw) {
      let sweep = a1 - a0;
      if (!ccw && sweep < 0) sweep = sweep % (2 * Math.PI) + 2 * Math.PI; if (ccw && sweep > 0) sweep = sweep % (2 * Math.PI) - 2 * Math.PI;
      if (Math.abs(a1 - a0) >= 2 * Math.PI) sweep = ccw ? -2 * Math.PI : 2 * Math.PI;
      const sx = cx + r * Math.cos(a0), sy = cy + r * Math.sin(a0);
      this.cur ? this.lineTo(sx, sy) : this.moveTo(sx, sy);
      const segs = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2))), da = sweep / segs, k = 4 / 3 * Math.tan(da / 4);
      let a = a0;
      for (let i = 0; i < segs; i++) {
        const c0 = Math.cos(a), s0 = Math.sin(a), c1 = Math.cos(a + da), s1 = Math.sin(a + da);
        this.bezierCurveTo(cx + r * (c0 - k * s0), cy + r * (s0 + k * c0), cx + r * (c1 + k * s1), cy + r * (s1 - k * c1), cx + r * c1, cy + r * s1);
        a += da;
      }
    }
    roundRect(x, y, w, h, r) {
      r = Array.isArray(r) ? r[0] : (r || 0); r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
      if (!r) return this.rect(x, y, w, h);
      this.moveTo(x + r, y); this.lineTo(x + w - r, y); this.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
      this.lineTo(x + w, y + h - r); this.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
      this.lineTo(x + r, y + h); this.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
      this.lineTo(x, y + r); this.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5); this.closePath();
    }
    pathOps(p) { return p && p.__d ? svgToPdf(p.__d) : this.path.join('\n'); }
    // farby a priehľadnosť
    alpha(a) {
      a = Math.round(Math.max(0, Math.min(1, a)) * 1000) / 1000;
      let g = this.gs.get(a); if (!g) { g = new this.doc.GState({ opacity: a, 'stroke-opacity': a }); this.gs.set(a, g); }
      this.doc.setGState(g);
    }
    setFill(c) { this.alpha(c.a * this.s.globalAlpha); this.w([c.r, c.g, c.b].map(N).join(' ') + ' rg'); }
    setStroke(c) { this.alpha(c.a * this.s.globalAlpha); this.w([c.r, c.g, c.b].map(N).join(' ') + ' RG'); }
    fill(p) {
      const ops = this.pathOps(typeof p === 'object' ? p : null); if (!ops) return;
      if (this.s.fillStyle instanceof Grad) { this.save(); this.w(ops + '\nW n'); this.gradRect(this.s.fillStyle); this.restore(); return; }
      this.setFill(parseColor(this.s.fillStyle)); this.w(ops + '\nf');
    }
    stroke(p) {
      const ops = this.pathOps(p); if (!ops) return;
      this.setStroke(parseColor(this.s.strokeStyle));
      this.w(N(this.s.lineWidth) + ' w ' + ({ butt: 0, round: 1, square: 2 }[this.s.lineCap] || 0) + ' J ' + ({ miter: 0, round: 1, bevel: 2 }[this.s.lineJoin] || 0) + ' j');
      this.w(ops + '\nS');
    }
    clip(p) { const ops = this.pathOps(typeof p === 'object' ? p : null); if (ops) this.w(ops + '\nW n'); }
    fillRect(x, y, w, h) {
      if (this.s.fillStyle instanceof Grad) { this.save(); this.w([x, y, w, h].map(N).join(' ') + ' re W n'); this.gradRect(this.s.fillStyle, x, y, w, h); this.restore(); return; }
      this.setFill(parseColor(this.s.fillStyle)); this.w([x, y, w, h].map(N).join(' ') + ' re f');
    }
    createLinearGradient(x0, y0, x1, y1) { return new Grad(x0, y0, x1, y1); }
    gradRect(g) { // zvislý prechod ako jemné pásy (v tlači nevidno schodíky)
      const steps = 96, y0 = g.y0, y1 = g.y1, span = y1 - y0, ext = 1e5;
      for (let i = 0; i < steps; i++) {
        const t = (i + .5) / steps, c = g.at(t);
        const top = i === 0 ? y0 - ext : y0 + span * i / steps, bot = i === steps - 1 ? y1 + ext : y0 + span * (i + 1) / steps + .5;
        this.setFill(c); this.w([-ext, top, 2 * ext, bot - top].map(N).join(' ') + ' re f');
      }
    }
    // text ako krivky
    fontInfo() {
      const m = this.s.font.match(/(\d{3}|bold|normal)?\s*([\d.]+)px/); const wt = m && m[1] ? (m[1] === 'bold' ? 700 : m[1] === 'normal' ? 400 : +m[1]) : 400;
      return { weight: wt, size: m ? +m[2] : 10, f: this.fonts[wt] || this.fonts[wt >= 600 ? 700 : 400] };
    }
    measureText(t) { this.measure.font = this.s.font; return this.measure.measureText(t); }
    fillText(text, x, y) {
      text = String(text); if (!text) return;
      const fi = this.fontInfo(); if (!fi.f) { this.report.missingFont = true; return; }
      const opt = { kerning: true };
      const w = fi.f.getAdvanceWidth(text, fi.size, opt);
      const al = this.s.textAlign; if (al === 'center') x -= w / 2; else if (al === 'right' || al === 'end') x -= w;
      if (this.s.textBaseline !== 'alphabetic') {
        const me = this.measure; me.font = this.s.font;
        me.textBaseline = 'alphabetic'; const a1 = me.measureText('H').actualBoundingBoxAscent;
        me.textBaseline = this.s.textBaseline; const a2 = me.measureText('H').actualBoundingBoxAscent; me.textBaseline = 'alphabetic';
        y += a1 - a2;
      }
      const cmds = fi.f.getPath(text, x, y, fi.size, opt).commands; const ops = [];
      let cx = 0, cy = 0;
      for (const c of cmds) {
        if (c.type === 'M') { ops.push(N(c.x) + ' ' + N(c.y) + ' m'); cx = c.x; cy = c.y; }
        else if (c.type === 'L') { ops.push(N(c.x) + ' ' + N(c.y) + ' l'); cx = c.x; cy = c.y; }
        else if (c.type === 'C') { ops.push([c.x1, c.y1, c.x2, c.y2, c.x, c.y].map(N).join(' ') + ' c'); cx = c.x; cy = c.y; }
        else if (c.type === 'Q') { ops.push([cx + 2 / 3 * (c.x1 - cx), cy + 2 / 3 * (c.y1 - cy), c.x + 2 / 3 * (c.x1 - c.x), c.y + 2 / 3 * (c.y1 - c.y), c.x, c.y].map(N).join(' ') + ' c'); cx = c.x; cy = c.y; }
        else if (c.type === 'Z') ops.push('h');
      }
      if (!ops.length) return;
      this.setFill(parseColor(this.s.fillStyle)); this.w(ops.join('\n') + '\nf');
    }
    // fotky: 300 dpi pri skutočnej veľkosti na papieri
    drawImage(img, dx, dy, dw, dh) {
      const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height; if (!iw || !ih) return;
      if (dw == null) { dw = iw; dh = ih; }
      const T = mul(this.base, this.s.m);
      const p0 = apply(T, dx, dy), p1 = apply(T, dx + dw, dy + dh);
      const x0 = Math.min(p0[0], p1[0]), x1 = Math.max(p0[0], p1[0]), y0 = Math.min(p0[1], p1[1]), y1 = Math.max(p0[1], p1[1]);
      const wIn = (x1 - x0) / 72, hIn = (y1 - y0) / 72;
      const tw = Math.ceil(wIn * this.dpi), th = Math.ceil(hIn * this.dpi);
      let src = img, sw = iw, sh = ih;
      if (iw > tw * 1.05 || ih > th * 1.05) { sw = tw; sh = th; }
      const c = document.createElement('canvas'); c.width = sw; c.height = sh; const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high'; if (!img.__alpha) { g.fillStyle = '#fff'; g.fillRect(0, 0, sw, sh); } g.drawImage(src, 0, 0, sw, sh);
      const fmtI = img.__alpha ? 'PNG' : 'JPEG';
      const data = img.__alpha ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', .92);
      this.report.images.push({ ppi: Math.round(Math.min(sw / wIn, sh / hIn)), source: Math.round(Math.min(iw / wIn, ih / hIn)), w: sw, h: sh });
      this.w('q'); this.w(inv(T).map(N).join(' ') + ' cm');
      this.doc.addImage(data, fmtI, x0, this.pageH - y1, x1 - x0, y1 - y0, 'img' + this.report.images.length, img.__alpha ? 'FAST' : 'NONE');
      this.w('Q');
    }
  }
  window.PDFCanvas = PDFCanvas;
})();
