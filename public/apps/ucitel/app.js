/* Učiteľ 2.0 – diktáty z vybraných slov pre Ota. Bez prihlásenia; výsledky a peniaze sa ukladajú do Supabase
   (projekt „stullers home“ ako celé Creative Studio, tabuľky diktat_results a diktat_payouts),
   a keď cloud nie je dostupný, do tohto zariadenia.
   Režimy: diktát na papier (potom správny text s klikateľnými slovami) a doplňovačka na tablete.
   Každý dokončený diktát sa uloží. Peniaze sa pripíšu, keď je diktát bez chyby alebo keď si Oto vypočuje
   vysvetlenie každej svojej chyby (oprava), a rodič to potvrdí kódom. Potom ide diktát do „Hotové cvičenia“. */
(() => {
  const E = window.UCITEL_ENGINE;
  const $app = document.getElementById('app');

  const CHILD = 'Oto';
  const SUPA_URL = 'https://vupzrryhxnninttjyges.supabase.co';
  const SUPA_KEY = 'sb_publishable_lTU6RvAAgtRVeyvmx7BBeg_ag4_TZXX';
  const SPEEDS = {
    pomaly: { label: 'Pomaly', rate: 0.85, perChar: 430 },
    normal: { label: 'Normálne', rate: 0.97, perChar: 310 },
    rychlo: { label: 'Rýchlo', rate: 1.07, perChar: 210 },
  };
  const TALK = 1.04; // rýchlosť bežnej reči (nie diktovania)
  const MASCOT = 'mascot.png';
  // Kód rodiča nie je v kóde stránky čitateľne, porovnáva sa jeho SHA-256 odtlačok.
  const CODE_HASH = '408311ba9b03d5d2d41463f1b49280625f826a70a7dc5ccd92d0b41b93b26be2';
  async function codeOk(v) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(v).trim()));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('') === CODE_HASH;
    } catch { return false; }
  }

  // ---------------- pomocné ----------------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const euro = (c) => `${(c / 100).toFixed(2).replace('.', ',')} €`;
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* bez úložiska */ } };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16)));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const okienok = (n) => (n === 1 ? 'okienko' : n >= 2 && n <= 4 ? 'okienka' : 'okienok');

  // ---------------- stav ----------------
  const prefs = lsGet('ucitel2-prefs', {});
  const S = {
    view: 'setup',
    length: prefs.length || 'kratky',
    letters: new Set(prefs.letters || E.LETTERS),
    mode: prefs.mode === 'doplnanie' ? 'doplnanie' : 'papier',
    speed: prefs.speed || 'normal',
    sayPunct: prefs.sayPunct ?? false,
    voiceURI: prefs.voiceURI || '',
    hard: !!prefs.hard,
    dict: null, plan: null, gaps: {}, checked: null, gate: null, rewarded: false, attempts: 0, celebrate: false,
    marked: new Set(), heard: new Set(), wrongGaps: new Set(), doneSaved: false, openDone: null,
    pending: lsGet('ucitel2-pending', []),
  };
  const savePrefs = () => lsSet('ucitel2-prefs', { hard: S.hard, length: S.length, letters: [...S.letters], mode: S.mode, speed: S.speed, sayPunct: S.sayPunct, voiceURI: S.voiceURI });

  // ---------------- úložisko (Supabase + zariadenie) ----------------
  const Store = {
    data: lsGet('ucitel2-data', { results: [], payouts: [], pending: [] }),
    cloud: 'unknown',
    save() { lsSet('ucitel2-data', this.data); },
    async api(path, opts = {}) {
      const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
        ...opts,
        headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
      });
      if (!r.ok) throw new Error(`${r.status}`);
      return r.status === 204 || r.status === 201 ? null : r.json();
    },
    async sync() {
      await this.flush();
      try {
        const [res, pay] = await Promise.all([
          this.api(`diktat_results?select=id,created_at,child,length,mode,stars,mistakes,reward_cents,text,details&child=eq.${CHILD}&order=created_at.desc&limit=500`),
          this.api(`diktat_payouts?select=id,created_at,child,amount_cents&child=eq.${CHILD}&order=created_at.desc&limit=500`),
        ]);
        const pendingIds = new Set(this.data.pending.map((p) => p.row.id));
        this.data.results = [...res, ...this.data.results.filter((r) => pendingIds.has(r.id))];
        this.data.payouts = [...pay, ...this.data.payouts.filter((r) => pendingIds.has(r.id))];
        this.cloud = this.data.pending.length ? 'pending' : 'ok';
        this.save();
      } catch { this.cloud = 'off'; }
    },
    async flush() {
      for (const p of [...this.data.pending]) {
        try {
          await this.api(p.table, { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(p.row) });
          this.data.pending = this.data.pending.filter((x) => x !== p);
          this.save();
        } catch { this.cloud = 'off'; return; }
      }
      if (!this.data.pending.length && this.cloud !== 'off') this.cloud = 'ok';
    },
    async add(table, row, short) {
      this.data[table === 'diktat_results' ? 'results' : 'payouts'].unshift(short);
      this.data.pending.push({ table, row });
      this.save();
      await this.flush();
      if (this.data.pending.length) this.cloud = 'pending';
    },
    balance() {
      const earned = this.data.results.filter((r) => r.child === CHILD).reduce((a, r) => a + (r.reward_cents || 0), 0);
      const paid = this.data.payouts.filter((r) => r.child === CHILD).reduce((a, r) => a + (r.amount_cents || 0), 0);
      return earned - paid;
    },
  };

  // ---------------- hlas ----------------
  const Voice = {
    voices: [],
    ok: 'speechSynthesis' in window,
    load() {
      if (!this.ok) return;
      const score = (v) => (/premium|enhanced|vylepš|neural|natural|online/i.test(v.name) ? 4 : 0) + (/google|microsoft/i.test(v.name) ? 2 : 0) + (/laura/i.test(v.name) ? 1 : 0);
      this.voices = speechSynthesis.getVoices().filter((v) => /^sk/i.test(v.lang)).sort((a, b) => score(b) - score(a));
    },
    current() { return this.voices.find((v) => v.voiceURI === S.voiceURI) || this.voices[0] || null; },
    token: 0,
    stop() { this.token++; if (this.ok) speechSynthesis.cancel(); },
    /** Povie text; Promise sa splní po dohovorení (aj keď prehliadač zabudne poslať „end“). */
    say(text, rate = TALK, talk = true) {
      return new Promise((resolve) => {
        if (!this.ok) { setTimeout(resolve, 400); return; }
        const u = new SpeechSynthesisUtterance(text);
        const v = this.current();
        if (v) u.voice = v;
        u.lang = 'sk-SK'; u.rate = rate; u.pitch = talk ? 1.12 : 1.02;
        let done = false;
        const finish = () => { if (!done) { done = true; clearTimeout(t); resolve(); } };
        const t = setTimeout(finish, 1800 + text.length * 95 / rate);
        u.onend = finish; u.onerror = finish;
        this.keep = u; // Safari zahodí neodkázané vety
        speechSynthesis.speak(u);
      });
    },
    chat(text) { this.stop(); return this.say(text, TALK, true); },
  };
  if (Voice.ok) { Voice.load(); speechSynthesis.addEventListener?.('voiceschanged', () => { Voice.load(); if (S.view === 'setup') render(); }); }
  const wait = (ms, tok) => new Promise((r) => setTimeout(() => r(tok === Voice.token), ms));

  // kamarátske vety (striedajú sa, aby hlas neznel stále rovnako)
  const LINES = {
    hello: ['Ahoj Oto! Tak čo, ideme na to?', 'Čau Oto! Poďme na diktát.', 'Ahoj Oto! Dnes to dáme, uvidíš.'],
    helloHard: ['Ahoj Oto! Dnes je to náročný diktát, plný chytákov. Dávaj dobrý pozor!', 'Čau Oto! Pozor, toto je náročný diktát. Ale ty to zvládneš.'],
    paper: ['Priprav si papier a pero.', 'Zober si papier a pero, nech môžeš písať.'],
    gaps: ['Budeš dopĺňať i alebo y do okienok.', 'Text vidíš na tablete, ty len doplníš i alebo y.'],
    listenFirst: ['Najprv ti ho celý prečítam. Ty len počúvaj, ešte nepíš.', 'Najprv si ho celý vypočuj. Zatiaľ nič nepíš.'],
    nowWrite: ['Tak, a teraz píš. Budem diktovať po kúskoch.', 'Super. Teraz začni písať, ja idem pomaly po kúskoch.'],
    between: ['Super, ide ti to.', 'Výborne, pokračujeme.', 'Dobre, ďalšia veta.', 'Paráda, ideme ďalej.', 'Pekne. Tak ďalej.'],
    last: ['A posledná veta.', 'Už len posledná veta.'],
    recheck: ['A teraz ti to prečítam ešte raz celé. Skontroluj si, či ti nič nechýba.', 'Ešte raz celý diktát. Pozri sa, či máš všetko.'],
    endPaper: ['Hotovo! Ťukni na Ukázať správny diktát a porovnaj si to.', 'Máme to! Teraz si pozri správny diktát.'],
    endGaps: ['Hotovo! Keď budeš mať všetky okienka, ťukni na Skontrolovať.', 'Máme to! Skontroluj okienka a ťukni na Skontrolovať.'],
    perfect: ['Paráda, Oto! Bez jedinej chyby! Zavolaj ocka, nech to potvrdí.', 'Wau, bez chyby! Si borec! Teraz zavolaj ocka.'],
    oops: ['Skoro! Pár okienok je ešte zle. Ťukni na otáznik a poviem ti prečo.', 'Ešte to nie je ono. Ťukni na otáznik pri červenom okienku a oprav ho.'],
    review: ['Tu je správny diktát. Porovnaj ho so svojím papierom. Keď nájdeš chybu, ťukni na to slovo a vysvetlím ti ju.'],
    fixed: ['Výborne! Všetky chyby máš vysvetlené. Zavolaj ocka, nech to potvrdí kódom.', 'Super, opravené! Teraz už len ocko zadá kód.'],
    win: ['Paráda! Peniaze sú pripísané a diktát je medzi hotovými cvičeniami.', 'Hotovo! Zarobil si peniaze. Si šikovný, Oto!'],
  };

  // ---------------- diktovanie ----------------
  const PUNCT_WORDS = { ',': 'čiarka', '.': 'bodka', '?': 'otáznik', '!': 'výkričník' };
  function buildScript() {
    const sp = SPEEDS[S.speed];
    const gapMode = S.mode === 'doplnanie';
    const steps = [];
    const sentences = S.dict.sentences;
    let chunkNo = 0;
    steps.push({ kind: 'intro', say: `${pick(S.dict.hard ? LINES.helloHard : LINES.hello)} ${pick(gapMode ? LINES.gaps : LINES.paper)} ${pick(LINES.listenFirst)}`, rate: TALK, talk: true, pause: 500 });
    sentences.forEach((s) => steps.push({ kind: 'listen', say: s, rate: sp.rate, pause: 600 }));
    steps.push({ kind: 'intro2', say: pick(LINES.nowWrite), rate: TALK, talk: true, pause: 800 });
    sentences.forEach((s, si) => {
      if (si > 0) steps.push({ kind: 'cheer', say: si === sentences.length - 1 && sentences.length > 2 ? pick(LINES.last) : pick(LINES.between), rate: TALK, talk: true, pause: 400, si });
      steps.push({ kind: 'sentence', say: s, rate: sp.rate, pause: 900, si });
      for (const c of E.chunks(s)) {
        const last = c.slice(-1);
        const text = S.sayPunct && PUNCT_WORDS[last] ? `${c.replace(/[.,?!]$/, '')}, ${PUNCT_WORDS[last]}` : c;
        const pause = gapMode ? 900 + c.length * sp.perChar * 0.3 : 1000 + c.length * sp.perChar;
        steps.push({ kind: 'chunk', say: text, rate: sp.rate * 0.95, pause, chunk: chunkNo++, si });
      }
    });
    steps.push({ kind: 'check', say: pick(LINES.recheck), rate: TALK, talk: true, pause: 500 });
    sentences.forEach((s) => steps.push({ kind: 'recheck', say: s, rate: sp.rate, pause: gapMode ? 1200 : 2600 }));
    steps.push({ kind: 'end', say: pick(gapMode ? LINES.endGaps : LINES.endPaper), rate: TALK, talk: true, pause: 0 });
    return { steps, chunks: chunkNo };
  }

  const P = { steps: [], chunks: 0, i: 0, playing: false, started: false, finished: false };

  async function runPlayer() {
    const tok = ++Voice.token;
    P.playing = true; P.started = true; updatePlayer();
    while (P.i < P.steps.length) {
      const st = P.steps[P.i];
      updatePlayer();
      await Voice.say(st.say, st.rate, !!st.talk);
      if (tok !== Voice.token) return;
      if (!(await wait(st.pause, tok))) return;
      P.i++;
    }
    P.playing = false; P.finished = true; updatePlayer();
  }
  function pausePlayer() { Voice.stop(); P.playing = false; updatePlayer(); }
  function repeatChunk() {
    let j = Math.min(P.i, P.steps.length - 1);
    while (j > 0 && P.steps[j].kind !== 'chunk' && P.steps[j].kind !== 'sentence') j--;
    Voice.stop(); P.i = j; P.finished = false; runPlayer();
  }
  function skipIntro() {
    const j = P.steps.findIndex((s) => s.kind === 'sentence');
    Voice.stop(); P.i = j; runPlayer();
  }

  const STATUS = {
    intro: ['Počúvaj', 'Najprv celý diktát. Ešte nepíš.'],
    listen: ['Počúvaj', 'Najprv celý diktát. Ešte nepíš.'],
    intro2: ['Priprav sa', 'O chvíľu začneme písať.'],
    cheer: ['Píš', ''], sentence: ['Píš', ''], chunk: ['Píš', ''],
    check: ['Kontrola', 'Čítam to ešte raz celé.'],
    recheck: ['Kontrola', 'Čítam to ešte raz celé.'],
    end: ['Hotovo', ''],
  };

  function updatePlayer() {
    const el = document.getElementById('player');
    if (!el) return;
    const st = P.steps[Math.min(P.i, P.steps.length - 1)] || {};
    let [title, sub] = P.started ? STATUS[st.kind] || ['', ''] : ['Pripravený?', 'Ťukni na veľké tlačidlo a začneme.'];
    if (P.started && st.si !== undefined && ['cheer', 'sentence', 'chunk'].includes(st.kind)) sub = `Veta ${st.si + 1} z ${S.dict.sentences.length}`;
    if (P.finished) [title, sub] = ['Hotovo', S.mode === 'papier' ? 'Ťukni na Ukázať správny diktát.' : 'Skontroluj okienka a ťukni na Skontrolovať.'];
    else if (P.started && !P.playing) { title = 'Pauza'; sub = 'Ťukni na tlačidlo a pokračujeme.'; }
    el.querySelector('.status').textContent = title;
    el.querySelector('.substatus').textContent = sub;
    el.querySelector('.play').innerHTML = P.playing ? ICON.pause : ICON.play;
    el.querySelector('.play').setAttribute('aria-label', P.playing ? 'Pauza' : 'Spustiť diktovanie');
    const cur = st.kind === 'chunk' ? st.chunk : -1;
    const passed = P.steps.slice(0, P.i).filter((s) => s.kind === 'chunk').length;
    el.querySelector('.dots').innerHTML = Array.from({ length: P.chunks }, (_, n) => `<i class="dot ${n === cur ? 'now' : n < passed ? 'done' : ''}"></i>`).join('');
    const skip = el.querySelector('[data-act="skip"]');
    if (skip) skip.hidden = !(P.started && P.steps[P.i] && ['intro', 'listen', 'intro2'].includes(P.steps[P.i].kind));
  }

  // ---------------- ikony ----------------
  const ICON = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4.5" height="14" rx="1.5" fill="currentColor"/><rect x="13.5" y="5" width="4.5" height="14" rx="1.5" fill="currentColor"/></svg>',
    speaker: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
    star: (on) => `<svg class="star ${on ? 'on' : ''}" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4l6 13 14 1.5-10.5 9.5 3 14L24 35l-12.5 7 3-14L4 18.5 18 17z"/></svg>`,
  };

  // ---------------- ohňostroj ----------------
  function fireworks() {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const c = document.createElement('canvas');
    c.className = 'fx';
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = (c.width = innerWidth * dpr), H = (c.height = innerHeight * dpr);
    const colors = ['#F66C85', '#FFE1A8', '#A1F3FF', '#FFD3EE', '#5B4B7A', '#2A9A5D'];
    const parts = [];
    const burst = (x, y) => {
      const col = pick(colors);
      for (let k = 0; k < 70; k++) {
        const a = Math.random() * Math.PI * 2, v = (2 + Math.random() * 6) * dpr;
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 60 + Math.random() * 40, col: Math.random() < 0.7 ? col : pick(colors), r: (2 + Math.random() * 3) * dpr });
      }
    };
    const shots = [[0.25, 0.3, 0], [0.75, 0.25, 250], [0.5, 0.18, 500], [0.2, 0.45, 900], [0.8, 0.42, 1150], [0.5, 0.35, 1500]];
    shots.forEach(([x, y, t]) => setTimeout(() => burst(x * W, y * H), t));
    const start = performance.now();
    const tick = (now) => {
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        if (p.life <= 0) continue;
        p.x += p.vx; p.y += p.vy; p.vy += 0.09 * dpr; p.vx *= 0.985; p.vy *= 0.985; p.life--;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 40));
        ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      if (now - start < 3600) requestAnimationFrame(tick); else c.remove();
    };
    requestAnimationFrame(tick);
  }

  // ---------------- obrazovky ----------------
  function topBar() {
    return `<header class="top">
      <div class="brand"><img src="${MASCOT}" alt=""><div><b>Učiteľ 2.0</b><small>Diktáty pre Ota</small></div></div>
      <button class="pill" data-act="done" aria-label="Hotové cvičenia">Hotové</button>
      <button class="pill" data-act="wallet" aria-label="Peňaženka"><span class="coin"></span>${euro(Store.balance())}</button>
    </header>`;
  }

  function cloudLine() {
    const t = { ok: 'Uložené v cloude.', pending: 'Niečo ešte čaká na odoslanie do cloudu.', off: 'Cloud je teraz nedostupný. Ukladá sa v tomto zariadení.', unknown: '' }[Store.cloud];
    return t ? `<p class="cloud">${t}</p>` : '';
  }

  const lengthLabel = (d) => `${E.LENGTHS[d.length]?.label || ''}${d.hard ? ', náročný' : ''}`;

  function pendingCard() {
    if (!S.pending.length) return '';
    return `<section class="card wait">
      <h2>Čaká na ocka</h2>
      <p class="hint">Tieto diktáty sú hotové a opravené. Ocko ich potvrdí kódom a pripíšu sa peniaze.</p>
      ${S.pending.map((p, n) => `<div class="wait-row"><span>${esc(lengthLabel(p))} · ${p.mistakes ? `${p.mistakes} ${p.mistakes === 1 ? 'chyba' : p.mistakes <= 4 ? 'chyby' : 'chýb'}, opravené` : 'bez chyby'}</span>
        <b>${euro(E.LENGTHS[p.length].cents)}</b><button class="btn small" data-act="confirmPending" data-n="${n}">Potvrdiť kódom</button></div>`).join('')}
      ${S.gate && S.gate.kind === 'pending' ? gateBox() : ''}
    </section>`;
  }

  function viewSetup() {
    const allOn = S.letters.size === E.LETTERS.length;
    const voices = Voice.voices;
    return `${topBar()}
    ${pendingCard()}
    <section class="card">
      <div class="step-head"><span class="num">1</span><h2>Ako budeš písať?</h2></div>
      <div class="choices two">
        <button class="choice" data-act="mode" data-v="papier" aria-pressed="${S.mode === 'papier'}"><b>Diktát na papier</b><span>Počúvaš a píšeš perom na papier. Potom si pozrieš správny diktát.</span></button>
        <button class="choice" data-act="mode" data-v="doplnanie" aria-pressed="${S.mode === 'doplnanie'}"><b>Doplňovačka na tablete</b><span>Text vidíš a perom dopĺňaš i, í, y, ý do okienok.</span></button>
      </div>
    </section>
    <section class="card">
      <div class="step-head"><span class="num">2</span><h2>Aký dlhý?</h2></div>
      <div class="choices">${Object.entries(E.LENGTHS).map(([key, c]) => `<button class="choice" data-act="length" data-v="${key}" aria-pressed="${S.length === key}">
        <b>${c.label}</b><span>${c.sentences} ${c.sentences < 5 ? 'vety' : 'viet'}</span><span class="money"><span class="coin"></span>${euro(c.cents)}</span></button>`).join('')}</div>
    </section>
    <section class="card">
      <div class="step-head"><span class="num">3</span><h2>Aký náročný?</h2></div>
      <div class="choices two">
        <button class="choice" data-act="hard" data-v="0" aria-pressed="${!S.hard}"><b>Bežný</b><span>Vybrané slová, iné slová s mäkkým i a pár výnimiek.</span></button>
        <button class="choice" data-act="hard" data-v="1" aria-pressed="${S.hard}"><b>Náročný</b><span>Veľa výnimiek, ťažké slová a chytáky ako biť a byť alebo výr a vír.</span></button>
      </div>
    </section>
    <section class="card">
      <div class="step-head"><span class="num">4</span><h2>Ktoré vybrané slová?</h2></div>
      <div class="letters">
        ${E.LETTERS.map((l) => `<button class="letter" data-act="letter" data-v="${l}" aria-pressed="${S.letters.has(l)}" aria-label="Vybrané slová po ${l.toUpperCase()}">${l.toUpperCase()}</button>`).join('')}
        <button class="letter all" data-act="allLetters" aria-pressed="${allOn}">Všetky</button>
      </div>
      <p class="hint">Vždy tam budú aj iné slová s mäkkým i a výnimky, napríklad kino, diktát, bicykel.</p>
    </section>
    <section class="card">
      <div class="step-head"><span class="num">5</span><h2>Ako rýchlo diktovať?</h2></div>
      <div class="row">
        <div class="seg" role="group" aria-label="Rýchlosť">${Object.entries(SPEEDS).map(([k, v]) => `<button data-act="speed" data-v="${k}" aria-pressed="${S.speed === k}">${v.label}</button>`).join('')}</div>
        <button class="btn small" data-act="sample">${ICON.speaker} Vypočuť hlas</button>
      </div>
      <div class="row">
        <label class="switch"><input type="checkbox" id="sayPunct" ${S.sayPunct ? 'checked' : ''}> Diktovať aj čiarky a bodky</label>
        ${voices.length > 1 ? `<label class="switch">Hlas <select id="voice">${voices.map((v) => `<option value="${esc(v.voiceURI)}" ${Voice.current() === v ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></label>` : ''}
      </div>
      ${Voice.ok && !voices.length ? '<p class="notice">Na tomto zariadení chýba slovenský hlas. Na iPade ho pridáš v Nastaveniach: Prístupnosť → Hovorený obsah → Hlasy → Slovenčina → Laura (Vylepšená).</p>' : ''}
      ${!Voice.ok ? '<p class="notice">Tento prehliadač nevie čítať nahlas. Skús Safari na iPade.</p>' : ''}
    </section>
    <p class="hint center">Peniaze dostaneš, keď máš diktát bez chyby, alebo keď si opravíš chyby tak, že si vypočuješ vysvetlenie ku každej. Potom ocko potvrdí kódom.</p>
    <button class="btn primary big" data-act="generate" ${S.letters.size ? '' : 'disabled'}>Vygenerovať diktát</button>
    ${cloudLine()}`;
  }

  function viewReady() {
    const d = S.dict;
    const words = E.tokenize(d.text).length;
    const exc = d.sentences.map((s) => E.tagSentence(s)).filter((t) => t.exc).length;
    return `${topBar()}
    <section class="card ready">
      <img src="${MASCOT}" alt="">
      <h1>Diktát je pripravený</h1>
      <div class="chips">
        <span class="chip sun">${S.mode === 'papier' ? 'Na papier' : 'Doplňovačka'}</span>
        ${d.hard ? '<span class="chip pink">Náročný</span>' : ''}
        <span class="chip">${d.sentences.length} ${d.sentences.length < 5 ? 'vety' : 'viet'} · ${words} slov</span>
        <span class="chip">Po ${d.letters.map((l) => l.toUpperCase()).join(', ')}</span>
        <span class="chip pink">Výnimky: ${exc}</span>
        <span class="chip sun">${euro(E.LENGTHS[d.length].cents)}</span>
      </div>
      <p>${S.mode === 'papier' ? 'Priprav si papier a pero.' : 'Budeš dopĺňať okienka perom.'} Najprv si diktát celý vypočuješ, potom ho budeš písať po kúskoch.</p>
      <button class="btn primary big" data-act="start">Začať diktát</button>
      <button class="btn" data-act="regen">Iné zadanie</button>
      <details class="peek"><summary>Pre rodiča: ukázať text diktátu</summary><p>${esc(d.text)}</p></details>
    </section>
    <button class="btn ghost back" data-act="setup">‹ Späť na výber</button>`;
  }

  function playerCard() {
    return `<section class="card player" id="player">
      <button class="play" data-act="play" aria-label="Spustiť diktovanie">${ICON.play}</button>
      <div class="player-main"><div class="status"></div><div class="substatus"></div><div class="dots"></div></div>
      <div class="player-side">
        <button class="btn small" data-act="repeat">Zopakuj</button>
        <button class="btn small ghost" data-act="skip" hidden>Preskočiť</button>
      </div>
    </section>`;
  }

  function viewPaper() {
    return `${playerCard()}
    <section class="card paper-hint">
      <img src="${MASCOT}" alt="">
      <div><h2>Píš na papier</h2><p>Počúvaj a píš perom. Keď niečo nestihneš, ťukni na Zopakuj.</p></div>
    </section>
    <div class="row" style="justify-content:space-between">
      <button class="btn ghost" data-act="quit">‹ Zrušiť</button>
      <button class="btn small mobile-only" data-act="repeat">Zopakuj</button>
      <button class="btn primary" data-act="showCorrect">Ukázať správny diktát</button>
    </div>`;
  }

  /** Text, v ktorom sa dá ťuknúť na každé slovo s i/y. Slová označené ako chyba sú červené. */
  function clickableText(text) {
    let out = ''; let last = 0;
    for (const m of text.matchAll(E.WORD_RE)) {
      out += esc(text.slice(last, m.index));
      const info = E.wordInfo(m[0]);
      const key = `${m.index}`;
      const mk = S.marked.has(key) ? ` marked${S.heard.has(key) ? ' heard' : ''}` : '';
      out += info.cls ? `<button class="w ${info.cls}${mk}" data-act="word" data-w="${esc(m[0])}" data-k="${key}">${esc(m[0])}</button>` : esc(m[0]);
      last = m.index + m[0].length;
    }
    return out + esc(text.slice(last));
  }

  const paperReady = () => [...S.marked].every((k) => S.heard.has(k));

  function viewReview() {
    const n = S.marked.size;
    const heard = [...S.marked].filter((k) => S.heard.has(k)).length;
    const words = [...S.marked].map((k) => ({ k, w: S.dict.text.slice(+k).match(E.WORD_RE)[0] }));
    return `${topBar()}
    <section class="card">
      <h1>Správny diktát</h1>
      <p class="hint">Porovnaj ho so svojím papierom. Ťukni na slovo a dozvieš sa, prečo je tam i alebo y. Keď si ho mal zle, v okne ťukni na „Toto som mal zle“.</p>
      <div class="legend"><span class="w vs">vybrané slovo</span><span class="w exc">výnimka</span><span class="w iy">iné i/y</span><span class="w iy marked">moja chyba</span></div>
      <p class="correct">${clickableText(S.dict.text)}</p>
    </section>
    ${S.rewarded ? successCard() : `<section class="card">
      <h2>${n ? 'Moje chyby' : 'Mal si všetko správne?'}</h2>
      ${n ? `<div class="mistake-chips">${words.map((x) => `<button class="mchip ${S.heard.has(x.k) ? 'ok' : ''}" data-act="word" data-w="${esc(x.w)}" data-k="${x.k}">${S.heard.has(x.k) ? '✓ ' : ''}${esc(x.w)}</button>`).join('')}</div>
        <p class="progress-line">Vypočuté vysvetlenia: <b>${heard} z ${n}</b>${paperReady() ? ' · všetko opravené!' : '. Ťukni na každú chybu a vypočuj si prečo.'}</p>`
        : '<p>Ak máš na papieri všetko správne, zavolaj ocka. Ak máš chybu, ťukni na to slovo v texte a označ ho.</p>'}
      <button class="btn primary big" data-act="callParent" ${paperReady() ? '' : 'disabled'}>${n ? 'Opravené, zavolaj ocka' : 'Bez chyby, zavolaj ocka'}</button>
      ${S.gate && S.gate.kind === 'confirm' ? gateBox() : ''}
      ${paperReady() && !S.gate ? '<button class="btn ghost" data-act="later">Ocko potvrdí neskôr</button>' : ''}
    </section>`}
    <button class="btn ghost back" data-act="setup">‹ Nový diktát</button>
    ${cloudLine()}`;
  }

  function gateBox() {
    return `<div class="gate"><p>Ocko, zadaj kód:</p>
      <div class="row"><input id="gateIn" type="password" inputmode="numeric" maxlength="8" autocomplete="off" aria-label="Kód rodiča"><button class="btn primary" data-act="gateCheck">Potvrdiť</button><button class="btn ghost" data-act="gateCancel">Zrušiť</button></div>
      ${S.gate.wrong ? '<p class="hint">Nesprávny kód, skús znova.</p>' : ''}</div>`;
  }

  function successCard() {
    const c = E.LENGTHS[S.dict.length].cents;
    return `<section class="card win">
      <div class="stars">${[1, 2, 3].map((k) => ICON.star(k <= (S.lastMistakes === 0 ? 3 : 2))).join('')}</div>
      <h1>${S.lastMistakes === 0 ? 'Bez chyby!' : 'Opravené!'}</h1>
      <div class="earned"><span class="coin"></span>+${euro(c)}</div>
      <p>Diktát je uložený v Hotových cvičeniach. V peňaženke máš ${euro(Store.balance())}.</p>
      <button class="btn primary big" data-act="setup">Ďalší diktát</button>
    </section>`;
  }

  const gapsReady = () => S.checked && Object.values(S.checked).every((x) => x === true) && [...S.wrongGaps].every((g) => S.heard.has(`g${g}`));

  function viewGaps() {
    const ck = S.checked;
    const text = S.plan.map((p) => {
      if (p.gap === undefined) return esc(p.t);
      const st = ck ? ck[p.gap] : null;
      const val = S.gaps[p.gap] || '';
      const cls = st === true ? 'ok' : st === false ? 'bad' : '';
      const showWhy = S.wrongGaps.has(p.gap);
      return `<input class="gap ${cls}" id="g${p.gap}" data-gap="${p.gap}" value="${esc(val)}" maxlength="2" ${st === true ? 'readonly' : ''} autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Doplň i alebo y v slove ${esc(p.word.slice(0, p.idx))}_${esc(p.word.slice(p.idx + 1))}">${showWhy ? `<button class="why ${S.heard.has(`g${p.gap}`) ? 'heard' : ''}" data-act="gapWhy" data-gap="${p.gap}" aria-label="Prečo?">${S.heard.has(`g${p.gap}`) ? '✓' : '?'}</button>` : ''}`;
    }).join('');
    const bad = ck ? Object.values(ck).filter((x) => x === false).length : 0;
    const unheard = [...S.wrongGaps].filter((g) => !S.heard.has(`g${g}`)).length;
    let note = '';
    if (ck && bad) note = `<p class="notice bad-note">${bad} ${okienok(bad)} ${bad >= 2 && bad <= 4 ? 'sú' : 'je'} ešte zle. Ťukni na otáznik, vypočuj si prečo, oprav okienko a skontroluj znova.</p>`;
    else if (ck && unheard) note = `<p class="notice">Okienka sú správne. Ešte si vypočuj vysvetlenie pri každom otázniku (zostáva ${unheard}).</p>`;
    return `${S.rewarded ? topBar() : playerCard()}
    ${note}
    ${S.rewarded ? successCard() : ''}
    <div class="paper nolines"><div class="gaptext" id="gaptext">${S.rewarded ? clickableText(S.dict.text) : text}</div></div>
    ${S.rewarded ? '' : gapsReady() ? `<section class="card"><h2>${S.wrongGaps.size ? 'Všetko opravené!' : 'Bez chyby!'}</h2>
        <button class="btn primary big" data-act="callParent">Zavolaj ocka</button>${S.gate && S.gate.kind === 'confirm' ? gateBox() : ''}</section>
      <button class="btn ghost back" data-act="later">‹ Ocko potvrdí neskôr</button>`
      : `<div class="keys" id="keys">${['i', 'í', 'y', 'ý'].map((c) => `<button data-key="${c}" aria-label="Doplniť ${c}">${c}</button>`).join('')}</div>
    <div class="row" style="justify-content:space-between">
      <button class="btn ghost" data-act="quit">‹ Zrušiť</button>
      <button class="btn small mobile-only" data-act="repeat">Zopakuj</button>
      <button class="btn primary" data-act="checkGaps">Skontrolovať</button>
    </div>`}
    ${cloudLine()}`;
  }

  function viewDone() {
    const rows = Store.data.results.filter((r) => r.child === CHILD && r.details?.kind === 'confirmed');
    const date = (t) => new Date(t).toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric' });
    return `${topBar()}
    <button class="btn ghost back" data-act="setup">‹ Späť</button>
    <h1>Hotové cvičenia</h1>
    <p class="hint">Diktáty, ktoré ocko potvrdil kódom: ${rows.length}</p>
    ${rows.length ? `<div class="done-list">${rows.map((r) => `<section class="card done-item">
      <button class="done-head" data-act="toggleDone" data-id="${esc(r.id)}">
        <span class="done-date">${date(r.created_at)}</span>
        <span class="done-name">${r.mode === 'doplnanie' ? 'Doplňovačka' : 'Diktát na papier'} · ${esc(lengthLabel({ length: r.length, hard: r.details?.hard }))}</span>
        <span class="done-res">${r.mistakes ? `${r.mistakes} ${r.mistakes === 1 ? 'chyba' : r.mistakes <= 4 ? 'chyby' : 'chýb'}, opravené` : 'bez chyby'}</span>
        <b>+${euro(r.reward_cents)}</b>
      </button>
      ${S.openDone === r.id && r.text ? `<p class="correct small">${clickableText(r.text)}</p>` : ''}
    </section>`).join('')}</div>` : '<section class="card"><p>Zatiaľ tu nič nie je. Prvý hotový diktát sa objaví tu.</p></section>'}
    ${cloudLine()}`;
  }

  function viewWallet() {
    const rows = [
      ...Store.data.results.filter((r) => r.child === CHILD && r.reward_cents).map((r) => ({ t: r.created_at, txt: `Diktát ${E.LENGTHS[r.length]?.label.toLowerCase() || ''}`, c: r.reward_cents })),
      ...Store.data.payouts.filter((r) => r.child === CHILD).map((r) => ({ t: r.created_at, txt: 'Vyplatené', c: -r.amount_cents })),
    ].sort((a, b) => (a.t < b.t ? 1 : -1)).slice(0, 10);
    const date = (t) => new Date(t).toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' });
    const bal = Store.balance();
    const g = S.gate && (S.gate.kind === 'pay' || S.gate.kind === 'payOk') ? S.gate : null;
    return `${topBar()}
    <button class="btn ghost back" data-act="setup">‹ Späť</button>
    <section class="card purse">
      <h1>Otova peňaženka</h1>
      <div class="amount"><span class="coin"></span>${euro(bal)}</div>
      <p class="hint">Za diktát: krátky 0,25 €, stredný 0,50 €, dlhý 1 €.</p>
      ${g ? (g.kind === 'payOk' ? `<div class="gate"><p>Odovzdal si Otovi ${euro(bal)}?</p><div class="row"><button class="btn primary" data-act="payConfirm">Áno, odovzdal som</button><button class="btn ghost" data-act="gateCancel">Nie</button></div></div>` : gateBox())
        : `<button class="btn ${bal > 0 ? 'primary' : ''}" data-act="pay" ${bal > 0 ? '' : 'disabled'}>Vyplatiť ${euro(bal)}</button>`}
      <div class="history">${rows.map((r) => `<div class="hrow ${r.c < 0 ? 'pay' : ''}"><span>${date(r.t)}</span><span>${esc(r.txt)}</span><b>${r.c > 0 ? '+' : '−'}${euro(Math.abs(r.c))}</b></div>`).join('') || '<p class="hint">Zatiaľ žiadne zarobené peniaze.</p>'}</div>
    </section>
    ${cloudLine()}`;
  }

  // vysvetlenie slova (spodná karta); key = miesto v texte (na značenie chýb), gap = okienko doplňovačky
  function openWhy(word, opts = {}) {
    const info = E.wordInfo(word);
    const list = opts.idx === undefined ? info.list : info.list.filter((x) => x.i === opts.idx);
    if (!list.length) return;
    const heardKey = opts.gap !== undefined ? `g${opts.gap}` : opts.key;
    const markable = S.view === 'review' && !S.rewarded && opts.key !== undefined;
    const marked = () => S.marked.has(opts.key);
    const letters = [...word].map((ch, i) => (list.some((x) => x.i === i) ? `<mark>${esc(ch)}</mark>` : esc(ch))).join('');
    const label = { 'vybrané': 'vybrané slovo', 'výnimka': 'výnimka', 'koncovka': 'koncovka', 'mäkká': 'mäkká spoluhláska', 'tvrdá': 'tvrdá spoluhláska' };
    const items = list.map((x) => {
      const y = 'yý'.includes(x.ch.toLowerCase());
      return `<div class="why-item"><h3>Prečo ${y ? 'tvrdé' : 'mäkké'} ${esc(x.ch.toLowerCase())}?</h3><span class="tag ${esc(x.kind.split(' ')[0])}">${esc(label[x.kind] || x.kind)}</span><p>${esc(x.text)}</p></div>`;
    }).join('');
    closeWhy();
    const el = document.createElement('div');
    el.className = 'sheet-wrap';
    const markBtn = () => (markable ? `<button class="btn ${marked() ? '' : 'mark'}" data-sheet="mark">${marked() ? 'Mal som to dobre' : 'Toto som mal zle'}</button>` : '');
    el.innerHTML = `<div class="sheet" role="dialog" aria-label="Vysvetlenie">
      <div class="sheet-word">${letters}</div>${items}
      <p class="sheet-status" hidden></p>
      <div class="row"><button class="btn small" data-sheet="say">${ICON.speaker} Prečítaj znova</button><span class="mark-slot">${markBtn()}</span><button class="btn primary" data-sheet="close">Rozumiem</button></div></div>`;
    document.body.appendChild(el);
    const status = el.querySelector('.sheet-status');
    const speak = () => {
      Voice.stop();
      const tok = Voice.token;
      Voice.say(`${word}. ${list.map((x) => `Prečo ${'yý'.includes(x.ch.toLowerCase()) ? 'tvrdé ypsilon' : 'mäkké i'}? ${x.text}`).join(' ')}`, TALK, true)
        .then(() => {
          if (tok !== Voice.token || !heardKey) return;
          S.heard.add(heardKey);
          if (!markable || marked()) { status.hidden = false; status.textContent = 'Vypočuté ✓'; }
        });
    };
    el.addEventListener('click', (e) => {
      const a = e.target.closest('[data-sheet]')?.dataset.sheet;
      if (a === 'say') speak();
      if (a === 'mark') {
        if (marked()) S.marked.delete(opts.key); else { S.marked.add(opts.key); if (!S.heard.has(opts.key)) speak(); }
        status.hidden = !(marked() && S.heard.has(opts.key)); status.textContent = 'Vypočuté ✓';
        el.querySelector('.mark-slot').innerHTML = markBtn();
      }
      if (a === 'close' || e.target === el) { Voice.stop(); closeWhy(); render(); }
    });
    speak();
  }
  function closeWhy() { document.querySelector('.sheet-wrap')?.remove(); }

  function render() {
    const v = { setup: viewSetup, ready: viewReady, paper: viewPaper, review: viewReview, gaps: viewGaps, wallet: viewWallet, done: viewDone }[S.view];
    const y = window.scrollY;
    $app.innerHTML = v();
    const changed = render.last !== S.view; render.last = S.view;
    if (S.view === 'paper' || (S.view === 'gaps' && !S.rewarded)) updatePlayer();
    window.scrollTo({ top: changed ? 0 : y });
    if (S.celebrate) { S.celebrate = false; fireworks(); }
  }

  // ---------------- akcie ----------------
  function generate() {
    const recent = lsGet('ucitel2-recent', []);
    S.dict = { ...E.generate(S.length, [...S.letters], recent, S.hard), id: uid() };
    lsSet('ucitel2-recent', [...S.dict.ids, ...recent].slice(0, 45));
    S.rewarded = false; S.attempts = 0;
    S.view = 'ready'; render();
  }

  function startDictation() {
    S.plan = S.mode === 'doplnanie' ? E.gapPlan(S.dict.text) : null;
    S.gaps = {}; S.checked = null; S.gate = null;
    S.marked = new Set(); S.heard = new Set(); S.wrongGaps = new Set(); S.doneSaved = false;
    const sc = buildScript();
    Object.assign(P, { steps: sc.steps, chunks: sc.chunks, i: 0, playing: false, started: false, finished: false });
    S.view = S.mode === 'papier' ? 'paper' : 'gaps'; render();
    runPlayer(); // spustené ťuknutím, takže iPad dovolí zvuk
    if (S.mode === 'doplnanie') document.getElementById('g0')?.focus({ preventScroll: true });
  }

  const modeDb = (m) => (m === 'papier' ? 'pisanie' : 'doplnanie');

  /** Každý dokončený diktát sa uloží (kind: done), aj keď ešte nie je potvrdený. */
  function saveDone(mistakes, iy, words, answer) {
    if (S.doneSaved) return;
    S.doneSaved = true;
    const d = S.dict; const id = uid();
    Store.add('diktat_results', {
      id, child: CHILD, length: d.length, letters: d.letters.join(''), mode: modeDb(S.mode), speed: S.speed, text: d.text,
      answer: (answer || '').slice(0, 6000), words, mistakes, iy_mistakes: iy, stars: 0, reward_cents: 0,
      details: { kind: 'done', dict: d.id, hard: !!d.hard },
    }, { id, created_at: new Date().toISOString(), child: CHILD, length: d.length, mode: modeDb(S.mode), mistakes, reward_cents: 0, text: d.text, details: { kind: 'done', dict: d.id, hard: !!d.hard } });
  }

  /** Rodič potvrdil kódom: pripíšu sa peniaze a diktát ide do Hotových cvičení. */
  function confirmDict(p) {
    const id = uid();
    const cents = E.LENGTHS[p.length].cents;
    const details = { kind: 'confirmed', dict: p.dictId, hard: !!p.hard, fixed: p.mistakes > 0, wrong: p.wrong || [] };
    Store.add('diktat_results', {
      id, child: CHILD, length: p.length, letters: p.letters || '', mode: modeDb(p.mode), speed: S.speed, text: p.text,
      words: E.tokenize(p.text).length, mistakes: p.mistakes, iy_mistakes: p.mistakes, stars: p.mistakes === 0 ? 3 : 2, reward_cents: cents, details,
    }, { id, created_at: new Date().toISOString(), child: CHILD, length: p.length, mode: modeDb(p.mode), mistakes: p.mistakes, reward_cents: cents, text: p.text, details })
      .then(() => { const c = document.querySelector('.cloud'); if (c) c.outerHTML = cloudLine() || '<span></span>'; });
    S.pending = S.pending.filter((x) => x.dictId !== p.dictId);
    lsSet('ucitel2-pending', S.pending);
  }

  /** Aktuálny diktát pripravený na potvrdenie (aj keď ocko príde neskôr, ostane v „Čaká na ocka“). */
  function currentPending() {
    const d = S.dict;
    const wrong = S.mode === 'papier'
      ? [...S.marked].map((k) => d.text.slice(+k).match(E.WORD_RE)[0])
      : [...S.wrongGaps].map((g) => S.plan.find((x) => x.gap === g).word);
    return { dictId: d.id, length: d.length, hard: !!d.hard, letters: d.letters.join(''), mode: S.mode, text: d.text, mistakes: wrong.length, wrong };
  }
  function rememberPending() {
    const p = currentPending();
    S.pending = [...S.pending.filter((x) => x.dictId !== p.dictId), p];
    lsSet('ucitel2-pending', S.pending);
  }

  function checkGaps() {
    document.querySelectorAll('.gap').forEach((g) => { S.gaps[g.dataset.gap] = g.value; });
    const r = E.gradeGaps(S.plan, S.gaps);
    S.checked = Object.fromEntries(r.items.map((x) => [x.gap, x.ok]));
    r.items.filter((x) => !x.ok).forEach((x) => S.wrongGaps.add(x.gap));
    Voice.stop(); P.playing = false;
    const answer = S.plan.map((p) => (p.gap === undefined ? p.t : (S.gaps[p.gap] || '_'))).join('');
    saveDone(r.mistakes, r.iy, r.words, answer);
    render();
    if (r.mistakes === 0 && !S.wrongGaps.size) Voice.chat(pick(LINES.perfect));
    else if (r.mistakes === 0) Voice.chat(gapsReady() ? pick(LINES.fixed) : 'Okienka sú správne. Ešte si vypočuj vysvetlenia pri otáznikoch.');
    else { Voice.chat(pick(LINES.oops)); document.querySelector('.gap.bad')?.focus({ preventScroll: false }); }
  }

  async function gateCheck() {
    const v = document.getElementById('gateIn')?.value || '';
    if (!(await codeOk(v))) { S.gate.wrong = true; render(); document.getElementById('gateIn')?.focus(); return; }
    const g = S.gate; S.gate = null;
    if (g.kind === 'confirm') {
      const p = currentPending();
      S.lastMistakes = p.mistakes;
      confirmDict(p);
      S.rewarded = true; S.celebrate = true; render(); Voice.chat(pick(LINES.win));
    } else if (g.kind === 'pending') {
      const p = S.pending[g.n];
      if (p) { confirmDict(p); S.celebrate = true; }
      render(); Voice.chat(pick(LINES.win));
    } else if (g.kind === 'pay') { S.gate = { kind: 'payOk' }; render(); }
  }

  $app.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act], [data-key]');
    if (!b) return;
    if (b.dataset.key) { fillGap(b.dataset.key); return; }
    const act = b.dataset.act; const v = b.dataset.v;
    const openGate = (g) => { S.gate = g; render(); document.getElementById('gateIn')?.focus(); };
    switch (act) {
      case 'length': S.length = v; savePrefs(); render(); break;
      case 'hard': S.hard = v === '1'; savePrefs(); render(); break;
      case 'letter': S.letters.has(v) ? S.letters.delete(v) : S.letters.add(v); savePrefs(); render(); break;
      case 'allLetters': S.letters = S.letters.size === E.LETTERS.length ? new Set() : new Set(E.LETTERS); savePrefs(); render(); break;
      case 'mode': S.mode = v; savePrefs(); render(); break;
      case 'speed': S.speed = v; savePrefs(); render(); break;
      case 'sample': Voice.stop(); Voice.say('Ahoj Oto! Ja ti budem diktovať. Takto rýchlo:', TALK, true).then(() => Voice.say('Rýchly rys beží lesom.', SPEEDS[S.speed].rate, false)); break;
      case 'generate': case 'regen': generate(); break;
      case 'start': startDictation(); break;
      case 'play': if (P.playing) pausePlayer(); else { if (P.finished) { P.i = 0; P.finished = false; } runPlayer(); } break;
      case 'repeat': repeatChunk(); break;
      case 'skip': skipIntro(); break;
      case 'showCorrect': Voice.stop(); P.playing = false; saveDone(0, 0, E.tokenize(S.dict.text).length, ''); S.view = 'review'; render(); Voice.chat(pick(LINES.review)); break;
      case 'word': openWhy(b.dataset.w, { key: b.dataset.k }); break;
      case 'gapWhy': { const p = S.plan.find((x) => x.gap === +b.dataset.gap); openWhy(p.word, { idx: p.idx, gap: p.gap }); break; }
      case 'checkGaps': checkGaps(); break;
      case 'later': rememberPending(); Voice.stop(); S.gate = null; S.view = 'setup'; render(); break;
      case 'callParent': rememberPending(); openGate({ kind: 'confirm' }); break;
      case 'confirmPending': openGate({ kind: 'pending', n: +b.dataset.n }); break;
      case 'gateCheck': gateCheck(); break;
      case 'gateCancel': S.gate = null; render(); break;
      case 'quit': Voice.stop(); S.view = 'ready'; render(); break;
      case 'setup': Voice.stop(); closeWhy(); S.gate = null; S.view = 'setup'; render(); break;
      case 'done': Voice.stop(); S.gate = null; S.view = 'done'; render(); Store.sync().then(() => S.view === 'done' && render()); break;
      case 'toggleDone': S.openDone = S.openDone === b.dataset.id ? null : b.dataset.id; render(); break;
      case 'wallet': Voice.stop(); S.gate = null; S.view = 'wallet'; render(); Store.sync().then(() => S.view === 'wallet' && render()); break;
      case 'pay': openGate({ kind: 'pay' }); break;
      case 'payConfirm': {
        const amount = Store.balance();
        if (amount > 0) {
          const id = uid();
          Store.add('diktat_payouts', { id, child: CHILD, amount_cents: amount }, { id, created_at: new Date().toISOString(), child: CHILD, amount_cents: amount }).then(() => S.view === 'wallet' && render());
        }
        S.gate = null; render(); Voice.chat('Hotovo. Oto, užívaj si zarobené peniaze!'); break;
      }
      default: break;
    }
  });
  $app.addEventListener('change', (e) => {
    if (e.target.id === 'sayPunct') { S.sayPunct = e.target.checked; savePrefs(); }
    if (e.target.id === 'voice') { S.voiceURI = e.target.value; savePrefs(); }
  });
  $app.addEventListener('keydown', (e) => { if (e.target.id === 'gateIn' && e.key === 'Enter') gateCheck(); });

  // doplňovačka: po napísaní písmena skok na ďalšie voľné okienko
  let lastGap = null;
  $app.addEventListener('focusin', (e) => { if (e.target.classList?.contains('gap')) lastGap = e.target; });
  $app.addEventListener('input', (e) => {
    const g = e.target;
    if (!g.classList?.contains('gap')) return;
    const ch = [...g.value.toLowerCase()].filter((c) => 'iíyý'.includes(c)).pop() || '';
    g.value = ch; S.gaps[g.dataset.gap] = ch;
    if (ch) focusNext(g);
  });
  function fillGap(c) {
    const g = lastGap && document.body.contains(lastGap) && !lastGap.readOnly ? lastGap : document.querySelector('.gap:not([readonly])');
    if (!g) return;
    g.value = c; S.gaps[g.dataset.gap] = c; focusNext(g);
  }
  function focusNext(g) {
    const all = [...document.querySelectorAll('.gap:not([readonly])')];
    const next = all[all.indexOf(g) + 1];
    if (next) { next.focus({ preventScroll: false }); lastGap = next; }
  }

  render();
  Store.sync().then(() => { if (['setup', 'wallet', 'done'].includes(S.view)) render(); });
})();
