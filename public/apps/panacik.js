/* Panáčik – malý panáčik z čiarok v appkách Slovina, Matika, Anglina.
   Kým sa nepracuje, sedí na svojom tlačidle (lavičke) a neprekáža:
     notebook (široká obrazovka) – vľavo dole, mimo obsahu,
     iPad a telefón – vpravo dole, tesne nad spodnou lištou/klávesnicou.
   Vybehne, až keď Oto aktívne pracuje (ťukne na písmeno, číslo alebo odpoveď, alebo príde výsledok),
   nosí písmenká/číslice tam, kam ich Oto doplňuje, a po chvíli bez práce sa vráti a sadne si.

   Použitie v appke:
     Panacik.carry(text, odkialElement, () => cielovyElement)  – donesie text (len animácia, stav si appka uloží sama)
     Panacik.flush()  – okamžite dokončí všetko nosenie (napr. pred kontrolou)
     Panacik.cheer()  – oslava (salto + tanec)
     Panacik.sad()    – krútenie hlavou
     Panacik.jump(el) – vybehne k prvku a poskočí (napr. po výbere odpovede)
   Kým nesie znak do cieľa, cieľ má triedu .pan-wait (appka ju môže použiť na skrytie textu). */
(() => {
  if (window.Panacik) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SC = 1.3;               // zväčšenie (viewBox 80×90 → 104×117 px)
  const css = document.createElement('style');
  css.textContent = `
  #panacik{position:fixed;left:0;top:0;width:${80 * SC}px;height:${90 * SC}px;z-index:9000;pointer-events:none;overflow:visible;will-change:transform;
    color:#0B1033;transition:color .25s ease;
    filter:drop-shadow(0 0 1.4px #fff) drop-shadow(0 0 1.4px #fff) drop-shadow(0 2px 2px rgba(0,0,0,.35))}
  #panacik.dark{color:#fff;filter:drop-shadow(0 0 1.4px #0B1033) drop-shadow(0 0 1.4px #0B1033) drop-shadow(0 2px 2px rgba(0,0,0,.45))}
  .pan-letter{position:fixed;left:0;top:0;z-index:9001;pointer-events:none;min-width:30px;height:32px;padding:0 6px;line-height:28px;text-align:center;
    font:800 24px 'Baloo 2','Arial Rounded MT Bold','Arial Black',sans-serif;color:#0B1033;background:#FFCF1F;border:2px solid #0B1033;border-radius:8px;box-shadow:0 2px 0 #0B1033}
  .pan-perch{position:fixed;left:0;top:0;z-index:8999;width:52px;height:14px;padding:0;border:2px solid #0B1033;border-radius:7px;
    background:#FFCF1F;box-shadow:0 3px 0 #0B1033;cursor:pointer;-webkit-tap-highlight-color:transparent}
  .pan-perch:focus-visible{outline:3px solid #45C3FF;outline-offset:2px}
  .pan-wait{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}
  .pan-wait *{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}
  @media print{#panacik,.pan-letter,.pan-perch{display:none!important}}`;
  document.head.appendChild(css);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.id = 'panacik'; svg.setAttribute('viewBox', '-40 -80 80 90'); svg.setAttribute('aria-hidden', 'true');
  for (const [k, v] of Object.entries({ fill: 'none', stroke: 'currentColor', 'stroke-width': '3.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })) svg.setAttribute(k, v);
  const el = {};
  for (const [id, tag] of [['legB', 'polyline'], ['armB', 'polyline'], ['body', 'line'], ['head', 'circle'], ['legF', 'polyline'], ['armF', 'polyline']]) {
    el[id] = document.createElementNS(NS, tag); svg.appendChild(el[id]);
  }
  el.head.setAttribute('r', '6.5');
  const perch = document.createElement('button');
  perch.type = 'button'; perch.className = 'pan-perch'; perch.setAttribute('aria-label', 'Panáčikova lavička – ťukni a zamáva ti');
  const mount = () => { document.body.appendChild(perch); document.body.appendChild(svg); };
  document.body ? mount() : document.addEventListener('DOMContentLoaded', mount);

  /* ---------- KOSTRA ----------
     Uhly v stupňoch od zvislice (0 = visí dole), kladné = dopredu.
     t = stehno, k = ohnutie kolena, s = rameno, e = ohnutie lakťa. */
  const L = { torso: 17, neck: 3, head: 6.5, thigh: 11.5, shin: 11.5, up: 9, fore: 9 };
  const P = (o) => Object.assign({ lean: 0, head: 0, tL: 3, kL: 3, tR: -3, kR: 3, sL: 6, eL: 12, sR: -6, eR: 12, air: 0, rot: 0, seat: 0 }, o);
  const POSE = {
    stand: P({}),
    crouch: P({ lean: 32, tL: 72, kL: 122, tR: 66, kR: 116, sL: -45, eL: 10, sR: -40, eR: 12 }),
    air: P({ lean: -4, tL: 6, kL: 8, tR: -6, kR: 14, sL: 145, eL: 18, sR: 128, eR: 24, air: 30 }),
    tuck: P({ lean: 35, tL: 112, kL: 150, tR: 106, kR: 146, sL: 70, eL: 70, sR: 65, eR: 70, air: 44 }),
    pick: P({ lean: 72, head: 20, tL: 22, kL: 44, tR: 10, kR: 30, sL: 8, eL: 0, sR: 2, eR: 0 }),
    lift: P({ lean: -3, sL: 140, eL: 28, sR: 150, eR: 22 }),
    throw: P({ lean: 16, sL: 95, eL: 4, sR: 90, eR: 4 }),
    sit: P({ lean: -14, head: -8, tL: 88, kL: 12, tR: 84, kR: 20, sL: -38, eL: 0, sR: -42, eR: 0 }),
    stretch: P({ lean: -6, head: -14, sL: 152, eL: 6, sR: 140, eR: 10 }),
    // sedí na lavičke, nohy mu visia dole
    seat: P({ seat: 1, lean: -4, tL: 84, kL: 82, tR: 78, kR: 76, sL: 24, eL: 40, sR: 18, eR: 40 }),
  };
  const KEYS = Object.keys(POSE.stand);
  const D = Math.PI / 180;
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (a, b, t) => { const o = {}; for (const k of KEYS) o[k] = lerp(a[k], b[k], t); return o; };
  let cur = P({}), want = P({});

  function walkPose(ph, run, carry) {
    const sn = Math.sin(ph), cs = Math.cos(ph);
    const o = run
      ? P({ lean: 14, tL: 15 + 42 * sn, kL: 25 + 75 * Math.max(0, cs), tR: 15 - 42 * sn, kR: 25 + 75 * Math.max(0, -cs), sL: -45 * sn, eL: 88, sR: 45 * sn, eR: 88, air: 3 * Math.abs(cs) })
      : P({ lean: 4, tL: 24 * sn, kL: 6 + 38 * Math.max(0, cs), tR: -24 * sn, kR: 6 + 38 * Math.max(0, -cs), sL: -20 * sn, eL: 16 + 10 * Math.max(0, -sn), sR: 20 * sn, eR: 16 + 10 * Math.max(0, sn) });
    if (carry) { o.sL = 140; o.eL = 28 + 6 * sn; o.sR = 150; o.eR = 22 - 6 * sn; o.lean = run ? 6 : 0; }
    return o;
  }

  let face = 1, pos = { x: innerWidth * 0.15, y: innerHeight * 0.9 }, handTop = { x: 0, y: -60 };
  function draw(p) {
    const v = (a, len) => [Math.sin(a * D) * len * face, Math.cos(a * D) * len];
    const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
    const hip = [0, 0];
    const up = (len, a) => [Math.sin(a * D) * len * face, -Math.cos(a * D) * len];
    const neck = add(hip, up(L.torso, p.lean));
    const sh = add(hip, up(L.torso - 2, p.lean));
    const head = add(neck, up(L.neck + L.head, p.lean + p.head));
    const leg = (t, k) => { const knee = add(hip, v(t, L.thigh)); const s = t - k; const ank = add(knee, v(s, L.shin));
      return [hip, knee, ank, add(ank, [Math.cos(s * D) * 4.5 * face, -Math.sin(s * D) * 4.5])]; };
    const arm = (s, e) => { const a = s + p.lean * 0.3; const elb = add(sh, v(a, L.up)); return [sh, elb, add(elb, v(a + e, L.fore))]; };
    const lL = leg(p.tL, p.kL), lR = leg(p.tR, p.kR), aL = arm(p.sL, p.eL), aR = arm(p.sR, p.eR);
    let low = -Infinity; for (const q of [...lL, ...lR, aL[2], aR[2], head, hip]) low = Math.max(low, q[1]);
    const lift = (1 - p.seat) * -low - p.air;     // najnižší bod tela stojí na zemi; keď sedí, boky sú na lavičke
    const cx = neck[0] / 2, cy = neck[1] / 2, r = p.rot * D * face, c = Math.cos(r), s = Math.sin(r);
    const T = (q) => { const x = q[0] - cx, y = q[1] - cy; return [cx + x * c - y * s, cy + x * s + y * c + lift]; };
    const str = (arr) => arr.map(T).map((q) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ');
    el.legB.setAttribute('points', str(lR)); el.legF.setAttribute('points', str(lL));
    el.armB.setAttribute('points', str(aR)); el.armF.setAttribute('points', str(aL));
    const n2 = T(neck), h2 = T(hip), hd = T(head);
    el.body.setAttribute('x1', h2[0]); el.body.setAttribute('y1', h2[1]); el.body.setAttribute('x2', n2[0]); el.body.setAttribute('y2', n2[1]);
    el.head.setAttribute('cx', hd[0]); el.head.setAttribute('cy', hd[1]);
    const hA = T(aL[2]), hB = T(aR[2]); handTop = { x: (hA[0] + hB[0]) / 2, y: Math.min(hA[1], hB[1]) };
    svg.style.transform = `translate(${pos.x - 40 * SC}px, ${pos.y - 80 * SC}px)`;
  }

  /* ---------- POHYB ---------- */
  let ph = 0, target = null, carryOn = false, seq = null, last = performance.now(), carried = null;
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const play = (frames) => new Promise((res) => { seq = { frames, i: 0, from: { ...cur }, start: performance.now(), res }; });
  // cieľ môže byť bod alebo funkcia, ktorá vráti bod (cieľ sa môže hýbať pri prekreslení/scrollovaní)
  const goTo = (pt, run, sp) => new Promise((res) => { target = { pt, run, sp, res }; });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const stopMove = () => { if (target) { const r = target.res; target = null; r('stop'); } };
  const stopSeq = () => { if (seq) { const r = seq.res; seq = null; r('stop'); } };

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    let smooth = 14;
    if (seq) {
      const f = seq.frames[seq.i], e = (now - seq.start) / f.ms, tt = ease(Math.min(1, e));
      const g = { ...(typeof f.pose === 'string' ? POSE[f.pose] : f.pose), ...(f.set || {}) };
      want = mix(seq.from, g, tt); smooth = 40;
      if (e >= 1) { seq.from = { ...g }; seq.i++; seq.start = now; if (seq.i >= seq.frames.length) { const r = seq.res; seq = null; r(); } }
    } else if (target) {
      const pt = typeof target.pt === 'function' ? target.pt() : target.pt;
      if (!pt) { stopMove(); }
      else {
        const dx = pt.x - pos.x, dy = pt.y - pos.y, d = Math.hypot(dx, dy);
        const sp = target.sp || (target.run ? 650 : 85);
        if (Math.abs(dx) > 3) face = dx < 0 ? -1 : 1;
        if (d < sp * dt || d < 1) { pos.x = pt.x; pos.y = pt.y; want = carryOn ? { ...POSE.lift } : { ...POSE.stand }; const r = target.res; target = null; r(); }
        else { pos.x += (dx / d) * sp * dt; pos.y += (dy / d) * sp * dt; ph += ((sp * dt) / (target.run ? 30 : 19)) * Math.PI; want = walkPose(ph, target.run, carryOn); smooth = target.run ? 30 : 20; }
      }
    } else if (home) {
      // sedí na lavičke: pomaly hompáľa nohami a obzerá sa
      const sw = Math.sin(now / 520) * 14;
      want = { ...POSE.seat, kL: 82 + sw, kR: 76 - sw, head: Math.sin(now / 2100) * 10 };
      if (perchPt) { pos.x = perchPt.x; pos.y = perchPt.y; face = perchPt.face; }
    } else if (!carryOn) {
      const b = Math.sin(now / 600);   // dýchanie v stoji
      want = { ...POSE.stand, lean: 1 + b * 1.2, sL: 6 + b * 2, sR: -6 - b * 2, head: Math.sin(now / 1700) * 4 };
    }
    cur = mix(cur, want, 1 - Math.exp(-smooth * dt));
    if (seq) cur.rot = want.rot;
    // drž sa v obrazovke (napr. po otočení iPadu)
    pos.x = Math.max(20, Math.min(innerWidth - 20, pos.x)); pos.y = Math.max(70, Math.min(innerHeight - 4, pos.y));
    if (svg.isConnected) draw(cur);
    if (carried) carried.style.transform = `translate(${pos.x + handTop.x * SC - carried.offsetWidth / 2}px, ${pos.y + handTop.y * SC - 34}px)`;
    // ciele, do ktorých práve niečo nesie, nech ukazujú prázdno, kým to nedonesie
    for (const j of jobs) { const t = j.to(); if (t && !t.classList.contains('pan-wait')) t.classList.add('pan-wait'); }
    if (now - lastPerch > 400 || !perchPt) { lastPerch = now; placePerch(); }
    if (now - lastBg > 150) { lastBg = now; svg.classList.toggle('dark', isDarkAt(pos.x, pos.y - 30 * SC)); }
    requestAnimationFrame(frame);
  }

  /* ---------- LAVIČKA (miesto, kde sedí) ---------- */
  let home = true, homing = false, tok = 0, lastWork = 0, lastPerch = 0, perchPt = null;
  function placePerch() {
    const w = innerWidth, h = innerHeight;
    let x, y, f;
    if (w >= 1100) { x = 70; y = h - 40; f = 1; }               // notebook: vľavo dole
    else {
      // iPad / telefón: vpravo dole, nad spodnou lištou alebo klávesnicou, ak tam nejaká je
      let bottom = h;
      perch.style.pointerEvents = 'none';           // nech sa pri hľadaní lišty nenájde samotná lavička
      const probe = document.elementFromPoint(w - 30, h - 2);
      perch.style.pointerEvents = '';
      for (let e = probe; e && e.nodeType === 1; e = e.parentElement) {
        const ps = getComputedStyle(e).position;
        if (ps === 'fixed' || ps === 'sticky') { const r = e.getBoundingClientRect(); if (r.height < h * 0.5) bottom = Math.min(bottom, r.top); break; }
      }
      const phone = w < 600;
      x = w - (phone ? 36 : 50); y = bottom - (phone ? 12 : 18); f = -1;
    }
    perchPt = { x, y, face: f };
    perch.style.transform = `translate(${x - 26}px, ${y}px)`;
  }
  // začne sa pracovať: vstane z lavičky
  function wake() { tok++; homing = false; home = false; lastWork = performance.now(); }
  async function goHome() {
    const my = ++tok; homing = true;
    const r = await goTo(() => perchPt, true, 700);
    if (my !== tok || r === 'stop') return;
    face = perchPt.face;
    const r2 = await play([{ pose: 'crouch', ms: 160 }, { pose: 'seat', ms: 320 }]);
    if (my !== tok || r2 === 'stop') return;
    home = true; homing = false;
  }
  perch.addEventListener('click', async () => {
    if (!home || seq) return;
    const S2 = (e) => ({ ...POSE.seat, sR: 150, eR: e, head: -8 });
    const my = tok;
    await play([{ pose: S2(30), ms: 220 }, { pose: S2(75), ms: 180 }, { pose: S2(30), ms: 180 }, { pose: S2(75), ms: 180 }, { pose: 'seat', ms: 260 }]);
    if (my === tok) home = true;
  });

  /* ---------- FARBA PODĽA POZADIA ----------
     Pozrie, čo je pod panáčikom: na tmavej ploche je biely, na svetlej tmavý. */
  let lastBg = 0;
  const parseRGBA = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
  const lum = (c) => (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
  function isDarkAt(x, y) {
    let e = document.elementFromPoint(Math.max(0, Math.min(innerWidth - 1, x)), Math.max(0, Math.min(innerHeight - 1, y)));
    while (e && e.nodeType === 1) {
      const cs = getComputedStyle(e);
      const c = parseRGBA(cs.backgroundColor);
      if (c && c.a > 0.5) return lum(c) < 0.5;
      const g = cs.backgroundImage && cs.backgroundImage !== 'none' && parseRGBA((cs.backgroundImage.match(/rgba?\([^)]+\)/) || [])[0]);
      if (g && g.a > 0.5) return lum(g) < 0.5;   // plocha s prechodom farieb
      e = e.parentElement;
    }
    return true;   // nič nenašiel = pozadie appky (tmavomodré)
  }

  /* ---------- SRANDY ---------- */
  const W = (s, e) => P({ sR: 140, eR: e, sL: 6, eL: 12, head: s });
  const TRICKS = {
    skok: [{ pose: 'crouch', ms: 260 }, { pose: 'air', ms: 230 }, { pose: 'crouch', ms: 240 }, { pose: 'stand', ms: 300 }],
    salto: [{ pose: 'crouch', ms: 300 }, { pose: 'air', ms: 170, set: { air: 22 } }, { pose: 'tuck', ms: 260, set: { rot: -180 } }, { pose: 'tuck', ms: 230, set: { rot: -330, air: 24 } },
      { pose: 'air', ms: 120, set: { rot: -360, air: 8 } }, { pose: 'crouch', ms: 200, set: { rot: -360 } }, { pose: 'stand', ms: 320, set: { rot: -360 } }, { pose: 'stand', ms: 1 }],
    mavanie: [{ pose: W(0, 30), ms: 260 }, { pose: W(-6, 70), ms: 200 }, { pose: W(-6, 25), ms: 200 }, { pose: W(-6, 70), ms: 200 }, { pose: W(-6, 25), ms: 200 }, { pose: 'stand', ms: 300 }],
    sad: [{ pose: P({ tL: 40, kL: 70, tR: 36, kR: 66, lean: 20, sL: 40, sR: 36 }), ms: 350 }, { pose: 'sit', ms: 450 }, { pose: 'sit', ms: 1600, set: { head: -16 } },
      { pose: P({ lean: 40, tL: 80, kL: 120, tR: 76, kR: 118, sL: 40, sR: 40 }), ms: 400 }, { pose: 'stand', ms: 400 }],
    natiahnutie: [{ pose: 'stretch', ms: 500 }, { pose: 'stretch', ms: 350, set: { lean: -12 } }, { pose: P({ lean: 58, head: 20, sL: 20, eL: 0, sR: 15, eR: 0, tL: -4, tR: -6 }), ms: 600 }, { pose: 'stand', ms: 450 }],
    tanec: [0, 1, 2, 3, 4, 5].map((i) => ({ pose: P({ lean: i % 2 ? 6 : -6, tL: i % 2 ? 28 : -4, kL: i % 2 ? 48 : 6, tR: i % 2 ? -4 : 28, kR: i % 2 ? 6 : 48,
      sL: i % 2 ? 150 : 30, eL: i % 2 ? 30 : 90, sR: i % 2 ? 30 : 150, eR: i % 2 ? 90 : 30, head: i % 2 ? 8 : -8 }), ms: 210 })).concat([{ pose: 'stand', ms: 300 }]),
    drepy: [{ pose: 'crouch', ms: 380, set: { sL: 90, eL: 0, sR: 90, eR: 0, lean: 20 } }, { pose: 'stand', ms: 380, set: { sL: 90, eL: 0, sR: 90, eR: 0 } },
      { pose: 'crouch', ms: 380, set: { sL: 90, eL: 0, sR: 90, eR: 0, lean: 20 } }, { pose: 'stand', ms: 420 }],
  };
  // radosť a smútok (reakcie na výsledok)
  const UP = (o) => P({ sL: 150, eL: 20, sR: 150, eR: 20, ...o });
  TRICKS.jupi = [{ pose: 'crouch', ms: 220 }, { pose: UP({ air: 34, tL: 20, kL: 60, tR: -10, kR: 30 }), ms: 220 }, { pose: 'crouch', ms: 200 },
    { pose: UP({ air: 30, tL: -10, kL: 30, tR: 20, kR: 60 }), ms: 220 }, { pose: 'crouch', ms: 200 }, { pose: 'stand', ms: 250 }];
  TRICKS.pest = [{ pose: P({ sR: 120, eR: 110, head: -6, lean: -4 }), ms: 220 }, { pose: P({ sR: 165, eR: 20, head: -10, lean: -6, air: 6 }), ms: 180 },
    { pose: P({ sR: 120, eR: 110, head: -6, lean: -4 }), ms: 200 }, { pose: P({ sR: 165, eR: 20, head: -10, lean: -6, air: 6 }), ms: 180 }, { pose: 'stand', ms: 260 }];
  TRICKS.tlieskanie = [0, 1, 2, 3, 4, 5].map((i) => ({ pose: P({ sL: 80, eL: i % 2 ? 50 : 20, sR: 80, eR: i % 2 ? 50 : 20, head: -6 }), ms: 140 })).concat([{ pose: 'stand', ms: 220 }]);
  TRICKS.smutny = [{ pose: P({ lean: 18, head: 35, sL: -6, eL: 4, sR: 4, eR: 4, kL: 10, kR: 10 }), ms: 500 }, { pose: P({ lean: 22, head: 40, sL: -8, eL: 4, sR: 6, eR: 4, kL: 12, kR: 12 }), ms: 1100 }];
  TRICKS.krcenie = [{ pose: P({ lean: 8, head: -20, sL: -10, sR: 10 }), ms: 200 }, { pose: P({ lean: 8, head: 20, sL: -10, sR: 10 }), ms: 200 },
    { pose: P({ lean: 8, head: -20, sL: -10, sR: 10 }), ms: 200 }, { pose: P({ lean: 8, head: 20, sL: -10, sR: 10 }), ms: 200 }];
  TRICKS.nevadi = [{ pose: 'crouch', ms: 300 }, { pose: 'stand', ms: 300 }, { pose: P({ sR: 140, eR: 30, sL: 6 }), ms: 260 }, { pose: P({ sR: 140, eR: 70, sL: 6 }), ms: 200 },
    { pose: P({ sR: 140, eR: 30, sL: 6 }), ms: 200 }, { pose: 'stand', ms: 300 }];
  let busy = false;
  const jobs = [];           // čakajúce nosenia {text, from, to, done}

  // Keď nepracuje: chvíľu počká pri práci (občas malá sranda na mieste), potom sa vráti na lavičku.
  const SMALL = ['skok', 'drepy', 'natiahnutie', 'mavanie'];
  async function idle() {
    while (true) {
      await wait(250);
      if (busy || jobs.length || home || homing || seq || target) continue;
      if (performance.now() - lastWork > 7000) { goHome(); continue; }
      if (!reduced && Math.random() < 0.05) { const my = tok; await play(TRICKS[SMALL[Math.floor(Math.random() * SMALL.length)]]); if (my !== tok) continue; }
    }
  }

  const center = (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }; };
  function finish(j) {
    const i = jobs.indexOf(j); if (i >= 0) jobs.splice(i, 1);
    if (!jobs.some((o) => o.to() === j.to())) j.to()?.classList.remove('pan-wait');
    j.done = true;
  }

  async function runJob(j) {
    wake(); busy = true; stopSeq(); stopMove();
    const fast = () => (jobs.length > 1 ? 1500 : 1000);
    const f = j.from;
    const side = pos.x < f.x ? -1 : 1;
    await goTo({ x: f.x + side * 24, y: f.y + 8 }, true, fast());
    if (j.done) return;
    face = -side;
    await play([{ pose: 'pick', ms: jobs.length > 1 ? 90 : 160 }]);
    if (j.done) return;
    carried = document.createElement('div'); carried.className = 'pan-letter'; carried.textContent = j.text; document.body.appendChild(carried);
    carryOn = true;
    await play([{ pose: 'lift', ms: jobs.length > 1 ? 100 : 180 }]);
    let s2 = 1;
    const spot = () => { const t = j.to(); if (!t) return null; const c = center(t); s2 = pos.x < c.x ? -1 : 1; return { x: c.x + s2 * 30, y: c.r.bottom + 62 }; };
    await goTo(spot, true, fast());
    if (j.done) return;
    face = -s2;
    await play([{ pose: 'throw', ms: 110 }]);
    carryOn = false;
    const c = carried; carried = null;
    const t = j.to();
    if (c && t) {
      const tc = center(t);
      c.style.transition = 'transform .18s ease-out';
      c.style.transform = `translate(${tc.x - c.offsetWidth / 2}px, ${tc.y - 16}px) scale(.8)`;
      await wait(180);
    }
    c?.remove();
    finish(j);
    lastWork = performance.now();
    busy = false;
  }

  async function worker() {
    while (true) {
      if (!jobs.length) { await wait(40); continue; }
      const j = jobs[0];
      await runJob(j);
      if (!j.done) finish(j);
      busy = false;
    }
  }

  window.Panacik = {
    carry(text, fromEl, toFn) {
      if (!fromEl) return;
      const c = center(fromEl);
      jobs.push({ text: String(text), from: { x: c.x, y: c.r.top }, to: () => { try { return toFn(); } catch (e) { return null; } }, done: false });
      while (jobs.length > 4) { const o = jobs[1] || jobs[0]; finish(o); }   // pri veľmi rýchlom ťukaní nečakaj donekonečna
    },
    flush() {
      for (const j of [...jobs]) finish(j);
      stopMove(); stopSeq();
      carried?.remove(); carried = null; carryOn = false;
      document.querySelectorAll('.pan-wait').forEach((e) => e.classList.remove('pan-wait'));
    },
    // celá reakcia: dobehne doprostred obrazovky, aby ho Oto videl, a zahrá to
    async react(list) {
      this.flush(); while (busy) await wait(40); wake(); busy = true; stopMove(); stopSeq();
      await goTo({ x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.62 }, true, 900);
      for (const n of list) await play(TRICKS[n]);
      lastWork = performance.now();
      busy = false;
    },
    cheer() { return this.react(reduced ? ['tlieskanie'] : ['jupi', 'salto', 'tanec', 'pest']); },
    sad() { return this.react(['krcenie', 'smutny', 'nevadi']); },
    // výsledok cvičenia: 0 chýb = veľká oslava, 1–2 chyby = „skoro!“, viac = smutný, ale povzbudí
    result(mistakes) {
      if (!mistakes) return this.cheer();
      if (mistakes <= 2) return this.react(['krcenie', 'tlieskanie', 'nevadi']);
      return this.sad();
    },
    async jump(nearEl) {
      if (busy || jobs.length) return;
      const c = nearEl ? center(nearEl) : null;
      wake(); busy = true; stopMove(); stopSeq();
      if (c && c.r.width) await goTo({ x: c.x + (pos.x < c.x ? -1 : 1) * (c.r.width / 2 + 22), y: c.r.bottom }, true, 1000);
      await play(TRICKS.skok);
      lastWork = performance.now(); busy = false;
    },
  };
  requestAnimationFrame(frame); idle(); worker();
})();
