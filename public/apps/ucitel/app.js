/* Učiteľ 2.0 – diktáty z vybraných slov pre Ota. Bez prihlásenia; výsledky a peniaze sa ukladajú do Supabase
   (projekt „stullers home“ ako celé Creative Studio, tabuľky diktat_results a diktat_payouts),
   a keď cloud nie je dostupný, do tohto zariadenia.
   Režimy: diktát na papier (potom správny text s klikateľnými slovami) a doplňovačka na tablete.
   Peniaze iba za 0 chýb; dá sa opraviť a skúsiť znova, odmena za jeden diktát sa pripíše iba raz. */
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
    dict: null, plan: null, gaps: {}, checked: null, gate: null, rewarded: false, attempts: 0, celebrate: false,
  };
  const savePrefs = () => lsSet('ucitel2-prefs', { length: S.length, letters: [...S.letters], mode: S.mode, speed: S.speed, sayPunct: S.sayPunct, voiceURI: S.voiceURI });

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
          this.api(`diktat_results?select=id,created_at,child,length,stars,mistakes,reward_cents&child=eq.${CHILD}&order=created_at.desc&limit=500`),
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
    paper: ['Priprav si papier a pero.', 'Zober si papier a pero, nech môžeš písať.'],
    gaps: ['Budeš dopĺňať i alebo y do okienok.', 'Text vidíš na tablete, ty len doplníš i alebo y.'],
    listenFirst: ['Najprv ti ho celý prečítam. Ty len počúvaj, ešte nepíš.', 'Najprv si ho celý vypočuj. Zatiaľ nič nepíš.'],
    nowWrite: ['Tak, a teraz píš. Budem diktovať po kúskoch.', 'Super. Teraz začni písať, ja idem pomaly po kúskoch.'],
    between: ['Super, ide ti to.', 'Výborne, pokračujeme.', 'Dobre, ďalšia veta.', 'Paráda, ideme ďalej.', 'Pekne. Tak ďalej.'],
    last: ['A posledná veta.', 'Už len posledná veta.'],
    recheck: ['A teraz ti to prečítam ešte raz celé. Skontroluj si, či ti nič nechýba.', 'Ešte raz celý diktát. Pozri sa, či máš všetko.'],
    endPaper: ['Hotovo! Ťukni na Ukázať správny diktát a porovnaj si to.', 'Máme to! Teraz si pozri správny diktát.'],
    endGaps: ['Hotovo! Keď budeš mať všetky okienka, ťukni na Skontrolovať.', 'Máme to! Skontroluj okienka a ťukni na Skontrolovať.'],
    win: ['Paráda, Oto! Bez jedinej chyby! Si borec!', 'Wau, bez chyby! To je skvelé, Oto!', 'Áno! Nula chýb! Si majster!'],
    oops: ['Skoro! Pár okienok je ešte zle. Ťukni na červené slovo a poviem ti prečo.', 'Ešte to nie je ono. Pozri sa na červené okienka, ťukni na ne a oprav ich.'],
    review: ['Tu je správny diktát. Ťukni na farebné slovo a vysvetlím ti, prečo je tam i alebo y.'],
    retry: ['Nevadí, chyby sú na to, aby sme sa učili. Skús to znova, dáš to!', 'V pohode. Pozri si vysvetlenia a skús to ešte raz.'],
  };

  // ---------------- diktovanie ----------------
  const PUNCT_WORDS = { ',': 'čiarka', '.': 'bodka', '?': 'otáznik', '!': 'výkričník' };
  function buildScript() {
    const sp = SPEEDS[S.speed];
    const gapMode = S.mode === 'doplnanie';
    const steps = [];
    const sentences = S.dict.sentences;
    let chunkNo = 0;
    steps.push({ kind: 'intro', say: `${pick(LINES.hello)} ${pick(gapMode ? LINES.gaps : LINES.paper)} ${pick(LINES.listenFirst)}`, rate: TALK, talk: true, pause: 500 });
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
      <button class="pill" data-act="wallet" aria-label="Peňaženka"><span class="coin"></span>${euro(Store.balance())}</button>
    </header>`;
  }

  function cloudLine() {
    const t = { ok: 'Uložené v cloude.', pending: 'Niečo ešte čaká na odoslanie do cloudu.', off: 'Cloud je teraz nedostupný. Ukladá sa v tomto zariadení.', unknown: '' }[Store.cloud];
    return t ? `<p class="cloud">${t}</p>` : '';
  }

  function viewSetup() {
    const allOn = S.letters.size === E.LETTERS.length;
    const voices = Voice.voices;
    return `${topBar()}
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
      <p class="hint">Peniaze dostaneš, keď to budeš mať bez chyby. Keď sa pomýliš, môžeš to opraviť a skúsiť znova.</p>
    </section>
    <section class="card">
      <div class="step-head"><span class="num">3</span><h2>Ktoré vybrané slová?</h2></div>
      <div class="letters">
        ${E.LETTERS.map((l) => `<button class="letter" data-act="letter" data-v="${l}" aria-pressed="${S.letters.has(l)}" aria-label="Vybrané slová po ${l.toUpperCase()}">${l.toUpperCase()}</button>`).join('')}
        <button class="letter all" data-act="allLetters" aria-pressed="${allOn}">Všetky</button>
      </div>
      <p class="hint">Vždy tam budú aj iné slová s mäkkým i a výnimky, napríklad kino, diktát, bicykel.</p>
    </section>
    <section class="card">
      <div class="step-head"><span class="num">4</span><h2>Ako rýchlo diktovať?</h2></div>
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
        <span class="chip">${d.sentences.length} ${d.sentences.length < 5 ? 'vety' : 'viet'} · ${words} slov</span>
        <span class="chip">Po ${d.letters.map((l) => l.toUpperCase()).join(', ')}</span>
        <span class="chip pink">Výnimky: ${exc}</span>
        <span class="chip sun">Bez chyby = ${euro(E.LENGTHS[d.length].cents)}</span>
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

  /** Text, v ktorom sa dá ťuknúť na každé slovo s i/y. */
  function clickableText(text) {
    let out = ''; let last = 0;
    for (const m of text.matchAll(E.WORD_RE)) {
      out += esc(text.slice(last, m.index));
      const info = E.wordInfo(m[0]);
      out += info.cls ? `<button class="w ${info.cls}" data-act="word" data-w="${esc(m[0])}">${esc(m[0])}</button>` : esc(m[0]);
      last = m.index + m[0].length;
    }
    return out + esc(text.slice(last));
  }

  function viewReview() {
    return `${topBar()}
    <section class="card">
      <h1>Správny diktát</h1>
      <p class="hint">Porovnaj si ho so svojím papierom. Ťukni na farebné slovo a dozvieš sa, prečo je tam i alebo y.</p>
      <div class="legend"><span class="w vs">vybrané slovo</span><span class="w exc">výnimka</span><span class="w iy">iné i/y</span></div>
      <p class="correct">${clickableText(S.dict.text)}</p>
    </section>
    ${S.rewarded ? successCard() : `<section class="card">
      <h2>Ako ti to dopadlo?</h2>
      <div class="choices two">
        <button class="choice good" data-act="paperOk"><b>Bez chyby!</b><span>Rodič skontroluje papier a pripíše ti ${euro(E.LENGTHS[S.dict.length].cents)}.</span></button>
        <button class="choice" data-act="paperBad"><b>Mal som chyby</b><span>Oprav si ich podľa vysvetlení a skús ten istý diktát znova.</span></button>
      </div>
      ${S.gate ? gateBox('Rodič: skontroloval si papier? Koľko je') : ''}
      ${S.retryNote ? `<p class="notice">Nevadí, z chýb sa učíme. Pozri si vysvetlenia pri farebných slovách a skús to znova. Keď to dáš bez chyby, dostaneš ${euro(E.LENGTHS[S.dict.length].cents)}.</p>
        <div class="row"><button class="btn primary" data-act="retry">Skúsiť ten istý diktát znova</button><button class="btn" data-act="setup">Nový diktát</button></div>` : ''}
    </section>`}
    <button class="btn ghost back" data-act="setup">‹ Nový diktát</button>
    ${cloudLine()}`;
  }

  function gateBox(q) {
    const g = S.gate;
    return `<div class="gate"><p>${q} ${g.a} × ${g.b}?</p>
      <div class="row"><input id="gateIn" inputmode="numeric" autocomplete="off" aria-label="Výsledok"><button class="btn primary" data-act="gateCheck">Potvrdiť</button><button class="btn ghost" data-act="gateCancel">Zrušiť</button></div>
      ${g.wrong ? '<p class="hint">To nie je správne, skús znova.</p>' : ''}</div>`;
  }

  function successCard() {
    const c = E.LENGTHS[S.dict.length].cents;
    return `<section class="card win">
      <div class="stars">${[1, 2, 3].map(() => ICON.star(true)).join('')}</div>
      <h1>Bez chyby!</h1>
      <div class="earned"><span class="coin"></span>+${euro(c)}</div>
      <p>V peňaženke máš ${euro(Store.balance())}.</p>
      <button class="btn primary big" data-act="setup">Ďalší diktát</button>
    </section>`;
  }

  function viewGaps() {
    const ck = S.checked;
    const text = S.plan.map((p) => {
      if (p.gap === undefined) return esc(p.t);
      const st = ck ? ck[p.gap] : null;
      const val = S.gaps[p.gap] || '';
      const cls = st === true ? 'ok' : st === false ? 'bad' : '';
      return `<input class="gap ${cls}" id="g${p.gap}" data-gap="${p.gap}" value="${esc(val)}" maxlength="2" ${st === true ? 'readonly' : ''} autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Doplň i alebo y v slove ${esc(p.word.slice(0, p.idx))}_${esc(p.word.slice(p.idx + 1))}">${st === false ? `<button class="why" data-act="gapWhy" data-gap="${p.gap}" aria-label="Prečo?">?</button>` : ''}`;
    }).join('');
    const bad = ck ? Object.values(ck).filter((x) => x === false).length : 0;
    return `${S.rewarded ? '' : playerCard()}
    ${ck && bad ? `<p class="notice bad-note">${bad} ${okienok(bad)} ${bad >= 2 && bad <= 4 ? 'sú' : 'je'} ešte zle. Ťukni na otáznik pri červenom okienku, prečítaj si prečo, oprav a skontroluj znova.</p>` : ''}
    ${S.rewarded ? successCard() : ''}
    <div class="paper nolines"><div class="gaptext" id="gaptext">${S.rewarded ? clickableText(S.dict.text) : text}</div></div>
    ${S.rewarded ? '' : `<div class="keys" id="keys">${['i', 'í', 'y', 'ý'].map((c) => `<button data-key="${c}" aria-label="Doplniť ${c}">${c}</button>`).join('')}</div>
    <div class="row" style="justify-content:space-between">
      <button class="btn ghost" data-act="quit">‹ Zrušiť</button>
      <button class="btn small mobile-only" data-act="repeat">Zopakuj</button>
      <button class="btn primary" data-act="checkGaps">Skontrolovať</button>
    </div>`}
    ${cloudLine()}`;
  }

  function viewWallet() {
    const rows = [
      ...Store.data.results.filter((r) => r.child === CHILD && r.reward_cents).map((r) => ({ t: r.created_at, txt: `Diktát ${E.LENGTHS[r.length]?.label.toLowerCase() || ''} bez chyby`, c: r.reward_cents })),
      ...Store.data.payouts.filter((r) => r.child === CHILD).map((r) => ({ t: r.created_at, txt: 'Vyplatené', c: -r.amount_cents })),
    ].sort((a, b) => (a.t < b.t ? 1 : -1)).slice(0, 10);
    const date = (t) => new Date(t).toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' });
    const bal = Store.balance();
    const g = S.gate;
    return `${topBar()}
    <button class="btn ghost back" data-act="setup">‹ Späť</button>
    <section class="card purse">
      <h1>Otova peňaženka</h1>
      <div class="amount"><span class="coin"></span>${euro(bal)}</div>
      <p class="hint">Bez chyby: krátky diktát 0,25 €, stredný 0,50 €, dlhý 1 €.</p>
      ${g ? (g.ok ? `<div class="gate"><p>Odovzdal si Otovi ${euro(bal)}?</p><div class="row"><button class="btn primary" data-act="payConfirm">Áno, odovzdal som</button><button class="btn ghost" data-act="gateCancel">Nie</button></div></div>` : gateBox('Iba pre rodiča: koľko je'))
        : `<button class="btn ${bal > 0 ? 'primary' : ''}" data-act="pay" ${bal > 0 ? '' : 'disabled'}>Vyplatiť ${euro(bal)}</button>`}
      <div class="history">${rows.map((r) => `<div class="hrow ${r.c < 0 ? 'pay' : ''}"><span>${date(r.t)}</span><span>${esc(r.txt)}</span><b>${r.c > 0 ? '+' : '−'}${euro(Math.abs(r.c))}</b></div>`).join('') || '<p class="hint">Zatiaľ žiadne zarobené peniaze. Prvý diktát bez chyby to zmení!</p>'}</div>
    </section>
    ${cloudLine()}`;
  }

  // vysvetlenie slova (spodná karta)
  function openWhy(word, onlyIdx) {
    const info = E.wordInfo(word);
    const list = onlyIdx === undefined ? info.list : info.list.filter((x) => x.i === onlyIdx);
    if (!list.length) return;
    const marked = [...word].map((ch, i) => (list.some((x) => x.i === i) ? `<mark>${esc(ch)}</mark>` : esc(ch))).join('');
    const label = { 'vybrané': 'vybrané slovo', 'výnimka': 'výnimka', 'koncovka': 'koncovka', 'mäkká': 'mäkká spoluhláska', 'tvrdá': 'tvrdá spoluhláska' };
    const items = list.map((x) => {
      const y = 'yý'.includes(x.ch.toLowerCase());
      return `<div class="why-item"><h3>Prečo ${y ? 'tvrdé' : 'mäkké'} ${esc(x.ch.toLowerCase())}?</h3><span class="tag ${esc(x.kind.split(' ')[0])}">${esc(label[x.kind] || x.kind)}</span><p>${esc(x.text)}</p></div>`;
    }).join('');
    closeWhy();
    const el = document.createElement('div');
    el.className = 'sheet-wrap';
    el.innerHTML = `<div class="sheet" role="dialog" aria-label="Vysvetlenie">
      <div class="sheet-word">${marked}</div>${items}
      <div class="row"><button class="btn small" data-sheet="say">${ICON.speaker} Prečítaj znova</button><button class="btn primary" data-sheet="close">Rozumiem</button></div></div>`;
    document.body.appendChild(el);
    const speak = () => Voice.chat(`${word}. ${list.map((x) => `Prečo ${'yý'.includes(x.ch.toLowerCase()) ? 'tvrdé ypsilon' : 'mäkké i'}? ${x.text}`).join(' ')}`);
    el.addEventListener('click', (e) => {
      const a = e.target.closest('[data-sheet]')?.dataset.sheet;
      if (a === 'say') speak();
      if (a === 'close' || e.target === el) { Voice.stop(); closeWhy(); }
    });
    speak();
  }
  function closeWhy() { document.querySelector('.sheet-wrap')?.remove(); }

  function render() {
    const v = { setup: viewSetup, ready: viewReady, paper: viewPaper, review: viewReview, gaps: viewGaps, wallet: viewWallet }[S.view];
    $app.innerHTML = v();
    const changed = render.last !== S.view; render.last = S.view;
    if (S.view === 'paper' || (S.view === 'gaps' && !S.rewarded)) updatePlayer();
    if (changed) window.scrollTo({ top: 0 });
    if (S.celebrate) { S.celebrate = false; fireworks(); }
  }

  // ---------------- akcie ----------------
  function generate() {
    const recent = lsGet('ucitel2-recent', []);
    S.dict = { ...E.generate(S.length, [...S.letters], recent), id: uid() };
    lsSet('ucitel2-recent', [...S.dict.ids, ...recent].slice(0, 45));
    S.rewarded = false; S.attempts = 0;
    S.view = 'ready'; render();
  }

  function startDictation() {
    S.plan = S.mode === 'doplnanie' ? E.gapPlan(S.dict.text) : null;
    S.gaps = {}; S.checked = null; S.gate = null; S.retryNote = false;
    const sc = buildScript();
    Object.assign(P, { steps: sc.steps, chunks: sc.chunks, i: 0, playing: false, started: false, finished: false });
    S.view = S.mode === 'papier' ? 'paper' : 'gaps'; render();
    runPlayer(); // spustené ťuknutím, takže iPad dovolí zvuk
    if (S.mode === 'doplnanie') document.getElementById('g0')?.focus({ preventScroll: true });
  }

  /** Zapíše pokus do cloudu; pri 0 chybách a prvom úspechu pripíše peniaze. */
  function record(mistakes, iy, words, answer, details) {
    const d = S.dict;
    const win = mistakes === 0 && !S.rewarded;
    const reward = win ? E.LENGTHS[d.length].cents : 0;
    const id = uid();
    S.attempts++;
    Store.add('diktat_results', {
      id, child: CHILD, length: d.length, letters: d.letters.join(''), mode: S.mode === 'papier' ? 'pisanie' : 'doplnanie', speed: S.speed,
      text: d.text, answer: (answer || '').slice(0, 6000), words, mistakes, iy_mistakes: iy, stars: mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1,
      reward_cents: reward, details: { dict: d.id, attempt: S.attempts, ...details },
    }, { id, created_at: new Date().toISOString(), child: CHILD, length: d.length, stars: 0, mistakes, reward_cents: reward })
      .then(() => { const c = document.querySelector('.cloud'); if (c) c.outerHTML = cloudLine() || '<span></span>'; });
    if (win) { S.rewarded = true; S.celebrate = true; }
    return win;
  }

  function checkGaps() {
    document.querySelectorAll('.gap').forEach((g) => { S.gaps[g.dataset.gap] = g.value; });
    const r = E.gradeGaps(S.plan, S.gaps);
    S.checked = Object.fromEntries(r.items.map((x) => [x.gap, x.ok]));
    Voice.stop(); P.playing = false;
    const answer = S.plan.map((p) => (p.gap === undefined ? p.t : (S.gaps[p.gap] || '_'))).join('');
    const won = record(r.mistakes, r.iy, r.words, answer, { wrong: r.items.filter((x) => !x.ok).map((x) => x.word) });
    render();
    if (r.mistakes === 0) Voice.chat(won || S.rewarded ? pick(LINES.win) : pick(LINES.win));
    else { Voice.chat(pick(LINES.oops)); document.querySelector('.gap.bad')?.focus({ preventScroll: false }); }
  }

  $app.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act], [data-key]');
    if (!b) return;
    if (b.dataset.key) { fillGap(b.dataset.key); return; }
    const act = b.dataset.act; const v = b.dataset.v;
    switch (act) {
      case 'length': S.length = v; savePrefs(); render(); break;
      case 'letter': S.letters.has(v) ? S.letters.delete(v) : S.letters.add(v); savePrefs(); render(); break;
      case 'allLetters': S.letters = S.letters.size === E.LETTERS.length ? new Set() : new Set(E.LETTERS); savePrefs(); render(); break;
      case 'mode': S.mode = v; savePrefs(); render(); break;
      case 'speed': S.speed = v; savePrefs(); render(); break;
      case 'sample': Voice.stop(); Voice.say('Ahoj Oto! Ja ti budem diktovať. Takto rýchlo:', TALK, true).then(() => Voice.say('Rýchly rys beží lesom.', SPEEDS[S.speed].rate, false)); break;
      case 'generate': case 'regen': generate(); break;
      case 'start': case 'retry': startDictation(); break;
      case 'play': if (P.playing) pausePlayer(); else { if (P.finished) { P.i = 0; P.finished = false; } runPlayer(); } break;
      case 'repeat': repeatChunk(); break;
      case 'skip': skipIntro(); break;
      case 'showCorrect': Voice.stop(); P.playing = false; S.view = 'review'; render(); Voice.chat(pick(LINES.review)); break;
      case 'word': openWhy(b.dataset.w); break;
      case 'gapWhy': { const p = S.plan.find((x) => x.gap === +b.dataset.gap); openWhy(p.word, p.idx); break; }
      case 'checkGaps': checkGaps(); break;
      case 'paperOk': S.gate = { kind: 'paper', a: 6 + Math.floor(Math.random() * 4), b: 6 + Math.floor(Math.random() * 4) }; S.retryNote = false; render(); document.getElementById('gateIn')?.focus(); break;
      case 'paperBad': S.gate = null; S.retryNote = true; record(1, 0, E.tokenize(S.dict.text).length, '', { selfReported: true }); render(); Voice.chat(pick(LINES.retry)); break;
      case 'quit': Voice.stop(); S.view = 'ready'; render(); break;
      case 'setup': Voice.stop(); closeWhy(); S.gate = null; S.view = 'setup'; render(); break;
      case 'wallet': Voice.stop(); S.gate = null; S.view = 'wallet'; render(); Store.sync().then(() => S.view === 'wallet' && render()); break;
      case 'pay': S.gate = { kind: 'pay', a: 6 + Math.floor(Math.random() * 4), b: 6 + Math.floor(Math.random() * 4) }; render(); document.getElementById('gateIn')?.focus(); break;
      case 'gateCheck': {
        const ok = +document.getElementById('gateIn').value === S.gate.a * S.gate.b;
        if (!ok) { S.gate.wrong = true; render(); break; }
        if (S.gate.kind === 'paper') { S.gate = null; record(0, 0, E.tokenize(S.dict.text).length, '', { selfReported: true, parentChecked: true }); render(); Voice.chat(pick(LINES.win)); }
        else { S.gate.ok = true; render(); }
        break;
      }
      case 'gateCancel': S.gate = null; render(); break;
      case 'payConfirm': {
        const amount = Store.balance();
        if (amount > 0) {
          const id = uid();
          Store.add('diktat_payouts', { id, child: CHILD, amount_cents: amount }, { id, created_at: new Date().toISOString(), child: CHILD, amount_cents: amount }).then(() => S.view === 'wallet' && render());
        }
        S.gate = null; render(); Voice.chat(`Hotovo. Oto, užívaj si zarobené peniaze!`); break;
      }
      default: break;
    }
  });
  $app.addEventListener('change', (e) => {
    if (e.target.id === 'sayPunct') { S.sayPunct = e.target.checked; savePrefs(); }
    if (e.target.id === 'voice') { S.voiceURI = e.target.value; savePrefs(); }
  });
  $app.addEventListener('keydown', (e) => { if (e.target.id === 'gateIn' && e.key === 'Enter') document.querySelector('[data-act="gateCheck"]')?.click(); });

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
  Store.sync().then(() => { if (S.view === 'setup' || S.view === 'wallet') render(); });
})();
