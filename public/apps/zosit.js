/* Zošit – spoločná plocha na písanie perom (Slovina, Matika, Anglina). Označené TEST.
   - Riadky ako v linajkovom zošite (riadkovanie približne 8 mm na iPade), píše sa perom alebo prstom.
     Keď appka raz zachytí pero, dotyky prstom/dlaňou ignoruje (opretá ruka nekreslí).
   - Rozpoznávanie rukopisu: ťahy pera sa pošlú do Google Input Tools (rozpoznávanie písma, zadarmo, bez kľúča),
     každý riadok zvlášť, vráti sa až 10 kandidátov. Odpoveď sa uzná, ak sa s očakávanou PRESNE zhoduje
     aspoň jeden kandidát. Tolerancia k rukopisu je teda v kandidátoch, nie v pravopise (skutočná chyba sa neuzná).
       'en'  – veľké/malé písmená sa ignorujú,
       'sk'  – presne vrátane diakritiky (veľké/malé písmená sa ignorujú),
       'num' – len číslice a desatinná čiarka, medzery sa ignorujú.
   - ok = null: rukopis sa nepodarilo prečítať (bez internetu, chyba služby). Vtedy rozhodne rodič.
   API:
     Zosit.open({ title, prompt, expect, lang, lines, onDone(result) })   – okno s plochou a tlačidlami
     Zosit.mount(el, { lang, lines }) -> pad                              – len plocha (vlastné rozloženie)
     Zosit.check(pad, expect) -> Promise<result>
     result = { ok: true|false|null, text, candidates, image }            – image = PNG kresby (dataURL) */
(() => {
  if (window.Zosit) return;
  const LINE_MM = 8;
  const PX_PER_MM = 5.2; // iPad: 132 CSS px na palec
  const LINE_PX = Math.round(LINE_MM * PX_PER_MM);

  const css = `
  .zs-wrap{position:fixed;inset:0;z-index:60;background:rgba(10,5,30,.62);display:flex;align-items:center;justify-content:center;padding:12px;padding-bottom:max(12px,env(safe-area-inset-bottom,0px))}
  .zs-sheet{width:100%;max-width:760px;max-height:96vh;overflow:auto;background:#FFFDF5;color:#0B1033;border:3px solid #0B1033;border-radius:24px;box-shadow:0 6px 0 #0B1033;padding:16px;display:flex;flex-direction:column;gap:12px;font-family:'Nunito',system-ui,sans-serif}
  .zs-head{display:flex;align-items:center;gap:10px}
  .zs-head h3{flex:1;margin:0;font:800 22px/1.1 'Baloo 2','Arial Rounded MT Bold',sans-serif;text-transform:uppercase}
  .zs-test{flex:none;background:#FF9A3C;color:#0B1033;border:2px solid #0B1033;border-radius:999px;font:800 13px/1 'Baloo 2',sans-serif;padding:4px 10px;letter-spacing:.06em}
  .zs-prompt{text-align:center}
  .zs-pad{position:relative;border:3px solid #0B1033;border-radius:16px;background:#fff;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none}
  .zs-pad canvas{display:block;width:100%;touch-action:none}
  .zs-row{display:flex;gap:10px;flex-wrap:wrap}
  .zs-btn{flex:1 1 140px;border:3px solid #0B1033;border-radius:16px;min-height:54px;font:800 20px/1 'Baloo 2',sans-serif;text-transform:uppercase;box-shadow:0 5px 0 #0B1033;background:#fff;color:#0B1033;cursor:pointer}
  .zs-btn:active{transform:translateY(3px);box-shadow:0 2px 0 #0B1033}
  .zs-btn.go{background:linear-gradient(180deg,#7FF0AE 0 45%,#2FCB61 45%)}
  .zs-btn.dark{background:linear-gradient(180deg,#3A57C9,#22399B);color:#fff}
  .zs-btn[disabled]{filter:grayscale(.8) brightness(.8);pointer-events:none}
  .zs-msg{text-align:center;font-weight:800;min-height:1.3em;margin:0}
  .zs-hint{text-align:center;color:#3B4673;font-size:15px;margin:0}`;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  function mount(el, opts = {}) {
    const lines = Math.max(1, opts.lines || 3);
    const pad = { lang: opts.lang || 'en', strokes: [], cur: null, penSeen: false, el };
    const box = document.createElement('div'); box.className = 'zs-pad';
    const cv = document.createElement('canvas'); box.appendChild(cv); el.appendChild(box);
    const H = LINE_PX * (lines + 1);
    const g = cv.getContext('2d');
    let W = 0; let dpr = 1;
    function size() {
      W = box.clientWidth || 600; dpr = Math.min(3, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + 'px';
      draw();
    }
    function draw() {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      g.strokeStyle = '#B9C6E8'; g.lineWidth = 1.2;
      for (let i = 1; i <= lines; i++) { const y = Math.round(i * LINE_PX + LINE_PX * 0.35) + 0.5; g.beginPath(); g.moveTo(10, y); g.lineTo(W - 10, y); g.stroke(); }
      g.strokeStyle = '#F2A7AE'; g.beginPath(); g.moveTo(34.5, 0); g.lineTo(34.5, H); g.stroke(); // okraj
      g.strokeStyle = '#0B1033'; g.lineWidth = 2.6; g.lineCap = 'round'; g.lineJoin = 'round';
      for (const s of pad.strokes) path(s);
      if (pad.cur) path(pad.cur);
    }
    function path(s) { if (!s.x.length) return; g.beginPath(); g.moveTo(s.x[0], s.y[0]); for (let i = 1; i < s.x.length; i++) g.lineTo(s.x[i], s.y[i]); if (s.x.length === 1) g.lineTo(s.x[0] + 0.1, s.y[0]); g.stroke(); }
    const pt = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const t0 = Date.now();
    cv.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'pen') pad.penSeen = true;
      else if (pad.penSeen && e.pointerType === 'touch') return; // dlaň
      e.preventDefault(); cv.setPointerCapture?.(e.pointerId);
      const [x, y] = pt(e); pad.cur = { x: [x], y: [y], t: [Date.now() - t0], id: e.pointerId }; draw();
    });
    cv.addEventListener('pointermove', (e) => {
      if (!pad.cur || e.pointerId !== pad.cur.id) return;
      e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ce of evs) { const [x, y] = pt(ce); pad.cur.x.push(x); pad.cur.y.push(y); pad.cur.t.push(Date.now() - t0); }
      draw();
    });
    const end = (e) => { if (!pad.cur || e.pointerId !== pad.cur.id) return; pad.strokes.push(pad.cur); pad.cur = null; draw(); opts.onChange?.(); };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    // Safari: zabráni posúvaniu stránky pri písaní
    cv.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    cv.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    window.addEventListener('resize', size);
    pad.clear = () => { pad.strokes = []; pad.cur = null; draw(); opts.onChange?.(); };
    pad.undo = () => { pad.strokes.pop(); draw(); opts.onChange?.(); };
    pad.isEmpty = () => pad.strokes.length === 0;
    pad.image = () => { try { return cv.toDataURL('image/png'); } catch { return ''; } };
    pad.lineOf = (s) => { const cy = (Math.min(...s.y) + Math.max(...s.y)) / 2; return Math.max(0, Math.min(lines - 1, Math.floor((cy - LINE_PX * 0.35) / LINE_PX))); };
    pad.size = () => ({ W, H });
    pad.destroy = () => window.removeEventListener('resize', size);
    requestAnimationFrame(size); size();
    return pad;
  }

  /** Pošle ťahy jedného riadku do rozpoznávača, vráti zoznam kandidátov. */
  async function recognize(strokes, lang, W, H) {
    const ink = strokes.map((s) => [s.x.map((v) => Math.round(v)), s.y.map((v) => Math.round(v)), s.t]);
    const body = { options: 'enable_pre_space', requests: [{ writing_guide: { writing_area_width: Math.round(W), writing_area_height: Math.round(H) }, ink, language: lang === 'sk' ? 'sk' : 'en', max_num_results: 10, max_completions: 0 }] };
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 9000);
    try {
      const r = await fetch('https://inputtools.google.com/request?ime=handwriting&app=zosit&dbg=0&cs=1&oe=UTF-8', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
      const j = await r.json();
      if (j[0] !== 'SUCCESS') throw new Error('rozpoznávanie zlyhalo');
      return (j[1]?.[0]?.[1]) || [];
    } finally { clearTimeout(timer); }
  }

  const norm = (s, lang) => {
    let t = String(s ?? '').normalize('NFC').trim();
    if (lang === 'num') return t.replace(/[\s ]/g, '').replace(/\./g, ',');
    t = t.replace(/[‘’]/g, "'").replace(/[‐-―]/g, '-').replace(/\s+/g, ' ').replace(/\s*([.,!?])$/, '$1');
    return t.toLowerCase();
  };
  /** Kombinácie kandidátov po riadkoch (najviac 10 × 10 × …, obmedzené na 60). */
  function combine(perLine) {
    let acc = [''];
    for (const c of perLine) {
      const next = [];
      for (const a of acc) for (const b of c.slice(0, 10)) next.push(a ? `${a} ${b}` : b);
      acc = next.slice(0, 60);
    }
    return acc;
  }

  async function check(pad, expect) {
    const exp = (Array.isArray(expect) ? expect : [expect]).filter((x) => x != null && x !== '');
    const image = pad.image();
    if (pad.isEmpty()) return { ok: false, text: '', candidates: [], image };
    const { W, H } = pad.size();
    const byLine = new Map();
    for (const s of pad.strokes) { const l = pad.lineOf(s); if (!byLine.has(l)) byLine.set(l, []); byLine.get(l).push(s); }
    const lineIds = [...byLine.keys()].sort((a, b) => a - b);
    try {
      const perLine = [];
      for (const l of lineIds) perLine.push(await recognize(byLine.get(l), pad.lang, W, H));
      if (perLine.some((c) => !c.length)) return { ok: null, text: '', candidates: [], image };
      const candidates = combine(perLine);
      const want = new Set(exp.map((e) => norm(e, pad.lang)));
      const strip = (x) => x.replace(/[.!?]$/, '');
      const hit = candidates.find((c) => want.has(norm(c, pad.lang)) || [...want].some((w) => strip(w) === strip(norm(c, pad.lang))));
      return { ok: !!hit, text: hit || candidates[0] || '', candidates, image };
    } catch (err) {
      return { ok: null, text: '', candidates: [], image, error: String(err && err.message || err) };
    }
  }

  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  /** Okno: zadanie hore, pod ním plocha ako zošit, Zmazať / Späť / Hotovo. */
  function open(o = {}) {
    const wrap = document.createElement('div'); wrap.className = 'zs-wrap';
    wrap.innerHTML = `<div class="zs-sheet" role="dialog" aria-modal="true" aria-label="${esc(o.title || 'Píš perom')}">
      <div class="zs-head"><h3>${esc(o.title || 'Píš perom')}</h3><span class="zs-test">TEST</span></div>
      <div class="zs-prompt">${o.prompt || ''}</div>
      <div class="zs-area"></div>
      <p class="zs-hint">Píš perom do riadkov ako do zošita. Pokojne, čitateľne.</p>
      <p class="zs-msg" aria-live="polite"></p>
      <div class="zs-row"><button class="zs-btn" data-z="undo">↶ Späť</button><button class="zs-btn" data-z="clear">Zmazať</button>${o.cancel === false ? '' : '<button class="zs-btn dark" data-z="close">Zavrieť</button>'}<button class="zs-btn go" data-z="done" disabled>Hotovo</button></div>
    </div>`;
    document.body.appendChild(wrap);
    const done = wrap.querySelector('[data-z="done"]'); const msg = wrap.querySelector('.zs-msg');
    const pad = mount(wrap.querySelector('.zs-area'), { lang: o.lang, lines: o.lines || 3, onChange: () => { done.disabled = pad.isEmpty(); } });
    const close = () => { pad.destroy(); wrap.remove(); };
    wrap.addEventListener('click', async (ev) => {
      const b = ev.target.closest('[data-z]'); if (!b) return;
      const z = b.dataset.z;
      if (z === 'undo') pad.undo();
      else if (z === 'clear') pad.clear();
      else if (z === 'close') { close(); o.onCancel?.(); }
      else if (z === 'done') {
        done.disabled = true; msg.textContent = 'Čítam, čo si napísal…';
        const res = await check(pad, o.expect);
        close(); o.onDone?.(res);
      }
    });
    return { close, pad };
  }

  window.Zosit = { open, mount, check, LINE_PX };
})();
