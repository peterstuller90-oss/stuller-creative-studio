/* Slovina – diktáty pre Ota. Bez prihlásenia; výsledky a peniaze sa ukladajú do Supabase
   (projekt „stullers home“ ako celé Creative Studio, tabuľky diktat_results a diktat_payouts),
   a keď cloud nie je dostupný, do tohto zariadenia.
   Režimy: diktát na papier (diktuje hlas, potom správny text s klikateľnými slovami)
   a doplňovačka na tablete (bez diktovania, len vysvetlivky po kontrole).
   Body (XP) a levely: celé body len za diktát bez chyby na prvý raz, rodič potvrdí kódom. Chyby sa neopravujú, iba vysvetlia.
   Každý diktát sa dá uložiť na kontrolu („Čaká na ocka“), po potvrdení ide do „Hotové cvičenia“. */
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
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* bez úložiska */ } };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16)));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  const plural = (n, one, few, many) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);
  const chyb = (n) => `${n} ${plural(n, 'chyba', 'chyby', 'chýb')}`;

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
    gapTypes: new Set((prefs.gapTypes || E.GAP_TYPES).filter((t) => E.GAP_TYPES.includes(t))),
    dict: null, plan: null, gaps: {}, checked: null, gate: null, rewarded: false, celebrate: false, notice: '',
    marked: new Set(), heard: new Set(), wrongGaps: new Set(), doneSaved: false, openDone: null, focusGap: 0,
    pending: lsGet('ucitel2-pending', []).map((p) => ({ heard: [], ...p })),
    savedHeard: lsGet('ucitel2-saved-heard', {}),
  };
  if (!S.gapTypes.size) S.gapTypes = new Set(E.GAP_TYPES);
  const savePrefs = () => lsSet('ucitel2-prefs', { hard: S.hard, length: S.length, letters: [...S.letters], mode: S.mode, speed: S.speed, sayPunct: S.sayPunct, voiceURI: S.voiceURI, gapTypes: [...S.gapTypes] });

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
  // Prednostne nahrávky hlasom Laura (audio/<kľúč>.m4a, zoznam v audio/clips.js), inak hlas prehliadača.
  const CLIPS = new Set(String(window.UCITEL_CLIPS || '').split(',').filter(Boolean));
  const KEY = window.UCITEL_KEY;
  const LINES = window.UCITEL_LINES;
  const Voice = {
    voices: [],
    ok: 'speechSynthesis' in window,
    clips: CLIPS.size > 0,
    audio: typeof Audio !== 'undefined' ? new Audio() : null,
    load() {
      if (!this.ok) return;
      const score = (v) => (/premium|enhanced|vylepš|neural|natural|online/i.test(v.name) ? 4 : 0) + (/google|microsoft/i.test(v.name) ? 2 : 0) + (/laura/i.test(v.name) ? 1 : 0);
      this.voices = speechSynthesis.getVoices().filter((v) => /^sk/i.test(v.lang)).sort((a, b) => score(b) - score(a));
    },
    current() { return this.voices.find((v) => v.voiceURI === S.voiceURI) || this.voices[0] || null; },
    token: 0,
    stop() {
      this.token++;
      if (this.audio) { try { this.audio.pause(); } catch { /* nič */ } }
      if (this.ok) speechSynthesis.cancel();
    },
    /** Povie text; Promise sa splní po dohovorení. rate: 1 = normálna reč. */
    say(text, rate = TALK, talk = true) {
      if (!text) return Promise.resolve();
      const k = KEY(text);
      if (CLIPS.has(k) && this.audio) return this.play(k, text, rate, talk);
      return this.synth(text, rate, talk);
    },
    play(k, text, rate, talk) {
      const tok = this.token;
      return new Promise((resolve) => {
        const a = this.audio;
        let done = false;
        const finish = () => { if (!done) { done = true; clearTimeout(t); a.onended = null; a.onerror = null; resolve(); } };
        const fallback = () => { if (done) return; done = true; clearTimeout(t); if (tok === this.token) this.synth(text, rate, talk).then(resolve); else resolve(); };
        const t = setTimeout(finish, 40000);
        a.onended = finish;
        a.onerror = fallback;
        a.src = `audio/${k}.m4a`;
        a.preservesPitch = true;
        a.playbackRate = talk ? 1 : Math.max(0.6, Math.min(1.3, rate));
        a.play().catch(fallback);
      });
    },
    synth(text, rate, talk) {
      return new Promise((resolve) => {
        if (!this.ok) { setTimeout(resolve, 400); return; }
        const u = new SpeechSynthesisUtterance(text);
        const v = this.current();
        if (v) u.voice = v;
        u.lang = 'sk-SK'; u.rate = talk ? TALK : rate; u.pitch = talk ? 1.12 : 1.02;
        let done = false;
        const finish = () => { if (!done) { done = true; clearTimeout(t); resolve(); } };
        const t = setTimeout(finish, 1800 + text.length * 95 / u.rate);
        u.onend = finish; u.onerror = finish;
        this.keep = u; // Safari zahodí neodkázané vety
        speechSynthesis.speak(u);
      });
    },
    /** Povie viac textov po sebe; vráti true, ak sa nič neprerušilo. */
    async seq(texts) {
      const tok = this.token;
      for (const t of texts) {
        if (tok !== this.token) return false;
        await this.say(t, TALK, true);
      }
      return tok === this.token;
    },
    chat(text) { this.stop(); return this.say(text, TALK, true); },
  };
  if (Voice.ok) { Voice.load(); speechSynthesis.addEventListener?.('voiceschanged', () => { Voice.load(); if (S.view === 'setup') render(); }); }
  const wait = (ms, tok) => new Promise((r) => setTimeout(() => r(tok === Voice.token), ms));

  // ---------------- diktovanie (len diktát na papier) ----------------
  const PUNCT_WORDS = window.UCITEL_PUNCT;
  function buildScript() {
    const sp = SPEEDS[S.speed];
    const steps = [];
    const sentences = S.dict.sentences;
    let chunkNo = 0;
    for (const t of [pick(S.dict.hard ? LINES.helloHard : LINES.hello), pick(LINES.paper), pick(LINES.listenFirst)]) steps.push({ kind: 'intro', say: t, rate: TALK, talk: true, pause: 250 });
    sentences.forEach((s) => steps.push({ kind: 'listen', say: s, rate: sp.rate, pause: 600 }));
    steps.push({ kind: 'intro2', say: pick(LINES.nowWrite), rate: TALK, talk: true, pause: 800 });
    sentences.forEach((s, si) => {
      if (si > 0) steps.push({ kind: 'cheer', say: si === sentences.length - 1 && sentences.length > 2 ? pick(LINES.last) : pick(LINES.between), rate: TALK, talk: true, pause: 400, si });
      steps.push({ kind: 'sentence', say: s, rate: sp.rate, pause: 900, si });
      for (const c of E.chunks(s)) {
        const last = c.slice(-1);
        const text = S.sayPunct && PUNCT_WORDS[last] ? `${c.replace(/[.,?!]$/, '')}, ${PUNCT_WORDS[last]}` : c;
        steps.push({ kind: 'chunk', say: text, rate: sp.rate * 0.95, pause: 1000 + c.length * sp.perChar, chunk: chunkNo++, si });
      }
    });
    steps.push({ kind: 'check', say: pick(LINES.recheck), rate: TALK, talk: true, pause: 500 });
    sentences.forEach((s) => steps.push({ kind: 'recheck', say: s, rate: sp.rate, pause: 2600 }));
    steps.push({ kind: 'end', say: pick(LINES.endPaper), rate: TALK, talk: true, pause: 0 });
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

  // ---------------- levely, týždeň, stav vysvetlenia ----------------
  const GOAL = 10; // bezchybné náročné diktáty na papier za týždeň = zážitok
  const PLACES = ['Kino', 'Bazén', 'Aquapark', 'Trampolíny', 'Zmrzlina', 'Výlet do hôr', 'Zoo', 'Bowling', 'Laser game'];
  const xpBase = (p) => (E.LENGTHS[p.length]?.xp || 10) * (p.hard ? 2 : 1);
  const levelStart = (n) => 25 * n * (n - 1); // level 1 od 0 XP, 2 od 50, 3 od 150, 4 od 300 ...
  const levelOf = (xp) => { let n = 1; while (levelStart(n + 1) <= xp) n++; return n; };
  const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const weekStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const weekKey = (d) => dayKey(weekStart(d));
  const mine = () => Store.data.results.filter((r) => r.child === CHILD);
  const explainedDicts = () => new Set(mine().filter((r) => r.details?.kind === 'explained').map((r) => r.details.dict));
  const xpOfRow = (r) => (r.details?.xp ?? (r.details?.kind === 'confirmed' && r.reward_cents ? Math.round(r.reward_cents * 0.4) : 0));
  const totalXp = () => mine().filter((r) => ['confirmed', 'explained'].includes(r.details?.kind)).reduce((a, r) => a + xpOfRow(r), 0);
  const itemsOf = (p) => (p.wrongItems && p.wrongItems.length ? p.wrongItems : (p.wrong || []).map((w, j) => ({ w, i: -1, k: `w${j}` })));
  const heardAll = (p, heard) => itemsOf(p).every((it) => heard.includes(it.k));
  /** Stav uloženého diktátu: bez chyby / vysvetlený / nevysvetlený. */
  function stateOf(p, heard, exSet) {
    if (!p.mistakes) return 'clean';
    if ((exSet && exSet.has(p.dictId || p.dict)) || heardAll(p, heard || [])) return 'explained';
    return 'unexplained';
  }
  const STATE = { clean: ['bez chyby', 'clean'], explained: ['vysvetlený', 'explained'], unexplained: ['nevysvetlený', 'unexplained'] };
  const stateTag = (st) => `<span class="state ${STATE[st][1]}">${STATE[st][0]}</span>`;
  function challenge(now = new Date()) {
    const wk = weekKey(now);
    const done = mine().filter((r) => r.details?.kind === 'confirmed' && r.mode === 'pisanie' && r.details?.hard && !r.mistakes && weekKey(r.details?.doneAt || r.created_at) === wk).length;
    const reward = mine().find((r) => r.details?.kind === 'reward' && r.details.week === wk);
    return { done: Math.min(done, GOAL), raw: done, reward, week: wk };
  }

  // ---------------- obrazovky ----------------
  function topBar() {
    const xp = totalXp(); const lv = levelOf(xp);
    const from = levelStart(lv); const to = levelStart(lv + 1);
    return `<header class="top">
      <div class="brand"><img src="${MASCOT}" alt=""><b>Slovina</b></div>
      <button class="lvl" data-act="tab" data-v="level" aria-label="Level ${lv}, ${xp} bodov">
        <span class="badge"><span>${lv}</span></span>
        <span class="lvl-bar"><i style="width:${Math.round(((xp - from) / (to - from)) * 100)}%"></i><em>${xp - from} / ${to - from} XP</em></span>
      </button>
    </header>`;
  }

  function tabBar() {
    const svg = (d) => `<svg viewBox="0 0 24 24">${d}</svg>`;
    const tabs = [
      ['setup', 'Hrať', svg('<path d="M7 4.5v15l12.5-7.5z"/>')],
      ['calendar', 'Kalendár', svg('<rect x="3" y="5" width="18" height="16" rx="3"/><rect x="3" y="5" width="18" height="5" rx="2" style="fill:var(--ink);stroke:none;opacity:.35"/><path d="M8 2.5v5M16 2.5v5" style="fill:none;stroke-width:2.4;stroke-linecap:round"/>')],
      ['done', 'Uložené', svg('<path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"/>')],
      ['level', 'Level', svg('<path d="M12 2.5l9 9.5-9 9.5-9-9.5z"/>')],
    ];
    return `<nav class="tabs" aria-label="Menu">${tabs.map(([v, t, ic]) => `<button data-act="tab" data-v="${v}" aria-current="${S.view === v ? 'page' : 'false'}"><span class="ic" aria-hidden="true">${ic}</span>${t}</button>`).join('')}</nav>`;
  }

  function cloudLine() {
    const t = { ok: 'Uložené v cloude.', pending: 'Niečo ešte čaká na odoslanie do cloudu.', off: 'Cloud je teraz nedostupný. Ukladá sa v tomto zariadení.', unknown: '' }[Store.cloud];
    return t ? `<p class="cloud">${t}</p>` : '';
  }

  const lengthLabel = (d) => `${d.mode === 'doplnanie' ? 'Doplňovačka' : d.mode === 'papier' ? 'Diktát' : ''}${d.mode ? ' · ' : ''}${E.LENGTHS[d.length]?.label || ''}${d.hard ? ', náročný' : ''}`;
  const GAP_LABEL = { iy: 'i / y', dlzen: 'dĺžne', makcen: 'mäkčene', ine: 'ä, ô, ie, ia, iu' };

  function chipsFor(p, prefix) {
    return itemsOf(p).map((it) => {
      const ok = (p.heard || []).includes(it.k);
      return `<button class="mchip ${ok ? 'ok' : ''}" data-act="explainSaved" data-src="${prefix}" data-k="${esc(it.k)}">${ok ? '✓ ' : ''}${esc(it.w)}</button>`;
    }).join('');
  }

  function pendingCard() {
    if (!S.pending.length) return '';
    return `<section class="card wait">
      <h2>Čaká na ocka</h2>
      <p class="hint">Ocko, skontroluj diktát a potvrď ho kódom. Oto si zatiaľ môže vypočuť vysvetlenia chýb.</p>
      ${S.pending.map((p, n) => {
        const st = stateOf(p, p.heard);
        return `<div class="wait-row">
        <div class="wait-main"><b>${esc(lengthLabel(p))}</b> ${stateTag(st)} <span class="hint">${p.mistakes ? chyb(p.mistakes) : ''}</span>
          ${p.mistakes ? `<div class="mistake-chips small">${chipsFor(p, `p${n}`)}</div>` : ''}</div>
        <button class="btn small blue" data-act="confirmPending" data-n="${n}">Potvrdiť kódom</button></div>`;
      }).join('')}
      ${S.gate && S.gate.kind === 'pending' ? gateBox() : ''}
    </section>`;
  }

  function challengeMini() {
    const c = challenge();
    return `<button class="card challenge mini" data-act="tab" data-v="level">
      <span class="ch-ic" aria-hidden="true">🏆</span>
      <span class="ch-main"><b>Týždenná výzva</b><span>${c.reward ? `Splnené! ${esc(c.reward.details.place)} ${c.reward.details.with === 'mama' ? 's mamou' : 's ockom'}` : `${c.done} z ${GOAL} bezchybných náročných diktátov na papier`}</span>
        <span class="meter"><i style="width:${(c.done / GOAL) * 100}%"></i></span></span>
    </button>`;
  }

  function viewSetup() {
    const allOn = S.letters.size === E.LETTERS.length;
    const voices = Voice.voices;
    const gap = S.mode === 'doplnanie';
    let n = 0;
    const head = (t) => `<div class="step-head"><span class="num">${++n}</span><h2>${t}</h2></div>`;
    return `${topBar()}
    ${challengeMini()}
    ${pendingCard()}
    <section class="card">
      ${head('Ako budeš písať?')}
      <div class="choices two">
        <button class="choice red" data-act="mode" data-v="papier" aria-pressed="${!gap}"><b>Diktát na papier</b><span>Počúvaš a píšeš perom na papier. Potom si pozrieš správny diktát.</span></button>
        <button class="choice green" data-act="mode" data-v="doplnanie" aria-pressed="${gap}"><b>Doplňovačka</b><span>Text vidíš na tablete a dopĺňaš chýbajúce písmenká. Bez diktovania.</span></button>
      </div>
    </section>
    ${gap ? `<section class="card">
      ${head('Čo budeš dopĺňať?')}
      <div class="letters">${E.GAP_TYPES.map((t) => `<button class="letter wide" data-act="gapType" data-v="${t}" aria-pressed="${S.gapTypes.has(t)}">${GAP_LABEL[t]}</button>`).join('')}</div>
      <p class="hint">Okienka môžu byť pri i a y, pri dĺžňoch (á, é, í, ó, ú), pri mäkčeňoch (ď, ť, ň, ľ, č, š, ž), pri ä, pri ô a pri ie, ia, iu.</p>
    </section>` : ''}
    <section class="card">
      ${head('Aký dlhý?')}
      <div class="choices">${Object.entries(E.LENGTHS).map(([key, c]) => `<button class="choice" data-act="length" data-v="${key}" aria-pressed="${S.length === key}">
        <b>${c.label}</b><span>${c.sentences} ${c.sentences < 5 ? 'vety' : 'viet'}</span><span class="xp">+${c.xp * (S.hard ? 2 : 1)} XP</span></button>`).join('')}</div>
    </section>
    <section class="card">
      ${head('Aký náročný?')}
      <div class="choices two">
        <button class="choice" data-act="hard" data-v="0" aria-pressed="${!S.hard}"><b>Bežný</b><span>Vybrané slová, iné slová s mäkkým i a pár výnimiek.</span></button>
        <button class="choice" data-act="hard" data-v="1" aria-pressed="${S.hard}"><b>Náročný</b><span>Veľa výnimiek a chytákov ako biť a byť. Dvojnásobné body.</span></button>
      </div>
    </section>
    <section class="card">
      ${head('Ktoré vybrané slová?')}
      <div class="letters">
        ${E.LETTERS.map((l) => `<button class="letter" data-act="letter" data-v="${l}" aria-pressed="${S.letters.has(l)}" aria-label="Vybrané slová po ${l.toUpperCase()}">${l.toUpperCase()}</button>`).join('')}
        <button class="letter all" data-act="allLetters" aria-pressed="${allOn}">Všetky</button>
      </div>
      <p class="hint">Vždy tam budú aj iné slová s mäkkým i a výnimky, napríklad kino, diktát, bicykel.</p>
    </section>
    ${gap ? '' : `<section class="card">
      ${head('Ako rýchlo diktovať?')}
      <div class="row">
        <div class="seg" role="group" aria-label="Rýchlosť">${Object.entries(SPEEDS).map(([k, v]) => `<button data-act="speed" data-v="${k}" aria-pressed="${S.speed === k}">${v.label}</button>`).join('')}</div>
        <button class="btn small" data-act="sample">${ICON.speaker} Vypočuť hlas</button>
      </div>
      <div class="row">
        <label class="switch"><input type="checkbox" id="sayPunct" ${S.sayPunct ? 'checked' : ''}> Diktovať aj čiarky a bodky</label>
        ${!Voice.clips && voices.length > 1 ? `<label class="switch">Hlas <select id="voice">${voices.map((v) => `<option value="${esc(v.voiceURI)}" ${Voice.current() === v ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></label>` : ''}
      </div>
      ${!Voice.clips && Voice.ok && !voices.length ? '<p class="notice">Na tomto zariadení chýba slovenský hlas. Na iPade ho pridáš v Nastaveniach: Prístupnosť → Hovorený obsah → Hlasy → Slovenčina → Laura (Vylepšená).</p>' : ''}
    </section>`}
    <button class="btn primary big" data-act="generate" ${S.letters.size && (!gap || S.gapTypes.size) ? '' : 'disabled'}>Hrať</button>
    ${cloudLine()}
    ${tabBar()}`;
  }

  function viewReady() {
    const d = S.dict;
    const words = E.tokenize(d.text).length;
    const exc = d.sentences.map((s) => E.tagSentence(s)).filter((t) => t.exc).length;
    const gap = S.mode === 'doplnanie';
    return `${topBar()}
    <section class="card ready">
      <img src="${MASCOT}" alt="">
      <h1>Diktát je pripravený</h1>
      <div class="chips">
        <span class="chip ${gap ? 'green' : 'red'}">${gap ? 'Doplňovačka' : 'Na papier'}</span>
        ${d.hard ? '<span class="chip pink">Náročný</span>' : ''}
        <span class="chip">${d.sentences.length} ${d.sentences.length < 5 ? 'vety' : 'viet'} · ${words} slov</span>
        <span class="chip">Po ${d.letters.map((l) => l.toUpperCase()).join(', ')}</span>
        <span class="chip pink">Výnimky: ${exc}</span>
        ${gap ? `<span class="chip">${[...S.gapTypes].map((t) => GAP_LABEL[t]).join(' · ')}</span>` : ''}
        <span class="chip sun">+${xpBase(d)} XP</span>
      </div>
      <p>${gap ? 'Doplň všetky okienka a potom ťukni na Skontrolovať. Kontroluje sa iba raz, tak si to dobre premysli.' : 'Priprav si papier a pero. Najprv si diktát celý vypočuješ, potom ho budeš písať po kúskoch.'}</p>
      <button class="btn primary big" data-act="start">${gap ? 'Začať dopĺňať' : 'Začať diktát'}</button>
      <button class="btn blue" data-act="regen">Iné zadanie</button>
      <details class="peek"><summary>Pre rodiča: ukázať text diktátu</summary><p>${esc(d.text)}</p></details>
    </section>
    <button class="btn ghost back" data-act="tab" data-v="setup">‹ Späť na výber</button>`;
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
    <div class="row spread">
      <button class="btn ghost" data-act="quit">‹ Zrušiť</button>
      <button class="btn small mobile-only" data-act="repeat">Zopakuj</button>
      <button class="btn primary" data-act="showCorrect">Ukázať správny diktát</button>
    </div>`;
  }

  /** Text, v ktorom sa dá ťuknúť na každé slovo. Slová označené ako chyba sú červené. */
  function clickableText(text, markable = false) {
    let out = ''; let last = 0;
    for (const m of text.matchAll(E.WORD_RE)) {
      out += esc(text.slice(last, m.index));
      const info = E.wordInfo(m[0]);
      const key = `${m.index}`;
      const mk = markable && S.marked.has(key) ? ` marked${S.heard.has(key) ? ' heard' : ''}` : '';
      out += `<button class="w ${info.cls}${mk}" data-act="word" data-w="${esc(m[0])}" data-k="${markable ? key : ''}">${esc(m[0])}</button>`;
      last = m.index + m[0].length;
    }
    return out + esc(text.slice(last));
  }

  const legend = '<div class="legend"><span class="w vs">vybrané slovo</span><span class="w exc">výnimka</span><span class="w iy">iné i/y</span><span class="w ot">dĺžeň, mäkčeň, ä, ô, ie</span></div>';

  /** Spodná karta s výsledkom. */
  function resultCard(mistakes, keys, wordOf) {
    if (S.rewarded) return successCard();
    const heard = keys.filter((k) => S.heard.has(k)).length;
    const gate = S.gate && S.gate.kind === 'confirm' ? gateBox() : '';
    const base = xpBase(S.dict);
    if (!mistakes) {
      return `<section class="card result good">
        <h2>${S.mode === 'papier' ? 'Mal si všetko správne?' : 'Bez chyby!'}</h2>
        <p>${S.mode === 'papier' ? 'Ak máš na papieri chybu, ťukni na to slovo v texte a označ ho. Ak je všetko správne, zavolaj ocka.' : 'Paráda, všetko správne na prvý raz! Zavolaj ocka, nech to potvrdí.'} Dostaneš <b>+${base} XP</b>.</p>
        ${gate || `<div class="row"><button class="btn primary big" data-act="callParent">Zavolaj ocka</button><button class="btn blue" data-act="later">Uložiť na kontrolu</button></div>`}
      </section>`;
    }
    const all = heard === keys.length;
    return `<section class="card result">
      <h2>${S.mode === 'papier' ? 'Moje chyby' : `Mal si ${chyb(mistakes)}`}</h2>
      ${S.mode === 'papier' ? `<div class="mistake-chips">${keys.map((k) => `<button class="mchip ${S.heard.has(k) ? 'ok' : ''}" data-act="word" data-w="${esc(wordOf(k))}" data-k="${k}">${S.heard.has(k) ? '✓ ' : ''}${esc(wordOf(k))}</button>`).join('')}</div>` : ''}
      <p>Ťukni na ${S.mode === 'papier' ? 'každú chybu' : 'otáznik pri každom červenom okienku'} a vypočuj si, prečo je to tak. Keď si vypočuješ všetky, diktát bude <b>vysvetlený</b> a dostaneš <b>+${Math.round(base * 0.3)} XP</b>. Celé body sú len za diktát bez chyby.</p>
      <p class="progress-line">Vypočuté vysvetlenia: <b>${heard} z ${keys.length}</b> ${stateTag(all ? 'explained' : 'unexplained')}</p>
      ${gate || `<div class="row"><button class="btn primary big" data-act="later">Uložiť na kontrolu</button><button class="btn blue" data-act="callParent">Ocko je tu, potvrdiť hneď</button></div>`}
    </section>`;
  }

  function viewReview() {
    const keys = [...S.marked].sort((a, b) => a - b);
    const wordOf = (k) => S.dict.text.slice(+k).match(E.WORD_RE)[0];
    return `${topBar()}
    <section class="card">
      <h1>Správny diktát</h1>
      <p class="hint">Porovnaj ho so svojím papierom. Ťukni na hociktoré slovo a dozvieš sa, prečo sa tak píše. Keď ho máš na papieri zle, v okne ťukni na „Toto mám zle“.</p>
      ${legend}
      <p class="correct">${clickableText(S.dict.text, !S.rewarded)}</p>
    </section>
    ${resultCard(keys.length, keys, wordOf)}
    <button class="btn ghost back" data-act="tab" data-v="setup">‹ Nový diktát</button>
    ${cloudLine()}`;
  }

  function gateBox() {
    return `<div class="gate"><p>Ocko, zadaj kód:</p>
      <div class="row"><input id="gateIn" type="password" inputmode="numeric" maxlength="8" autocomplete="off" aria-label="Kód rodiča"><button class="btn primary" data-act="gateCheck">Potvrdiť</button><button class="btn ghost" data-act="gateCancel">Zrušiť</button></div>
      ${S.gate.wrong ? '<p class="hint">Nesprávny kód, skús znova.</p>' : ''}</div>`;
  }

  function successCard() {
    const x = S.lastXp || 0;
    const perfect = S.lastClean;
    return `<section class="card win ${perfect ? '' : 'plain'}">
      <div class="stars">${[1, 2, 3].map((k) => ICON.star(k <= (perfect ? 3 : x ? 2 : 1))).join('')}</div>
      <h1>${S.levelUp ? `Level ${S.levelUp}!` : perfect ? 'Bez chyby!' : 'Uložené'}</h1>
      <div class="earned">+${x} XP</div>
      <p>${perfect ? 'Paráda, všetko správne na prvý raz!' : x ? 'Chyby máš vysvetlené. Za diktát bez chyby by bolo viac bodov.' : 'Chyby ešte nie sú vysvetlené. Vypočuj si ich v Uložených a dostaneš body.'} Diktát je v Uložených.</p>
      <button class="btn primary big" data-act="tab" data-v="setup">Ďalší diktát</button>
    </section>`;
  }

  const capFor = (opt, ans) => (ans[0] !== ans[0].toLowerCase() ? opt[0].toUpperCase() + opt.slice(1) : opt);
  const gapAt = (n) => S.plan.find((x) => x.gap === n);

  function keysHtml() {
    const p = gapAt(S.focusGap) || S.plan.find((x) => x.gap !== undefined);
    if (!p) return '';
    return p.options.map((o) => { const c = capFor(o, p.answer); return `<button data-key="${esc(c)}" aria-label="Doplniť ${esc(c)}">${esc(c)}</button>`; }).join('');
  }

  function viewGaps() {
    const ck = S.checked;
    const text = S.plan.map((p) => {
      if (p.gap === undefined) return esc(p.t);
      const wide = p.options.some((o) => o.length > 1) ? ' wide' : '';
      if (!ck) {
        const val = S.gaps[p.gap] || '';
        return `<input class="gap${wide}" id="g${p.gap}" data-gap="${p.gap}" value="${esc(val)}" maxlength="2" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Doplň písmeno v slove ${esc(p.word.slice(0, p.idx))}_${esc(p.word.slice(p.idx + p.len))}">`;
      }
      if (ck[p.gap]) return `<span class="gap ok${wide}">${esc(p.answer)}</span>`;
      const heard = S.heard.has(`g${p.gap}`);
      return `<span class="gap bad${wide}"><s>${esc(S.gaps[p.gap] || '·')}</s>${esc(p.answer)}</span><button class="why ${heard ? 'heard' : ''}" data-act="gapWhy" data-k="g${p.gap}" aria-label="Prečo?">${heard ? '✓' : '?'}</button>`;
    }).join('');
    const total = S.plan.filter((p) => p.gap !== undefined).length;
    const filled = S.plan.filter((p) => p.gap !== undefined && (S.gaps[p.gap] || '').trim()).length;
    const wrongKeys = [...S.wrongGaps].sort((a, b) => a - b).map((g) => `g${g}`);
    return `${topBar()}
    ${ck ? '' : `<section class="card gap-head"><h2>Doplň okienka</h2><p class="hint">Ťukni do okienka a vyber písmeno dole, alebo ho napíš perom. Kontroluje sa iba raz. <b id="filled">${filled} z ${total}</b></p></section>`}
    ${S.notice ? `<p class="notice bad-note">${esc(S.notice)}</p>` : ''}
    <div class="paper"><div class="gaptext" id="gaptext">${S.rewarded ? clickableText(S.dict.text) : text}</div></div>
    ${ck ? resultCard(S.wrongGaps.size, wrongKeys, (k) => gapAt(+k.slice(1)).word) : `<div class="keys" id="keys">${keysHtml()}</div>
    <div class="row spread">
      <button class="btn ghost" data-act="quit">‹ Zrušiť</button>
      <button class="btn primary" data-act="checkGaps">Skontrolovať</button>
    </div>`}
    ${ck && !S.rewarded ? '<button class="btn ghost back" data-act="tab" data-v="setup">‹ Nový diktát</button>' : ''}
    ${cloudLine()}`;
  }

  function confirmedRows() {
    return mine().filter((r) => r.details?.kind === 'confirmed');
  }

  function viewDone() {
    const ex = explainedDicts();
    const rows = confirmedRows();
    const date = (t) => new Date(t).toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric' });
    const filter = S.doneFilter || 'all';
    const list = rows.map((r) => {
      const p = { mistakes: r.mistakes, dict: r.details.dict, wrong: r.details.wrong, wrongItems: r.details.wrongItems, heard: [...(r.details.heard || []), ...(S.savedHeard[r.details.dict] || [])] };
      return { r, p, st: stateOf(p, p.heard, ex) };
    }).filter((x) => filter === 'all' || x.st === filter);
    const count = (st) => rows.filter((r) => stateOf({ mistakes: r.mistakes, dict: r.details.dict, wrong: r.details.wrong, wrongItems: r.details.wrongItems }, [...(r.details.heard || []), ...(S.savedHeard[r.details.dict] || [])], ex) === st).length;
    return `${topBar()}
    <h1 class="page-title">Uložené diktáty</h1>
    ${pendingCard()}
    <div class="seg filter" role="group" aria-label="Filter">
      ${[['all', `Všetky ${rows.length}`], ['clean', `Bez chyby ${count('clean')}`], ['explained', `Vysvetlené ${count('explained')}`], ['unexplained', `Nevysvetlené ${count('unexplained')}`]].map(([k, t]) => `<button data-act="doneFilter" data-v="${k}" aria-pressed="${filter === k}">${t}</button>`).join('')}
    </div>
    ${list.length ? `<div class="done-list">${list.map(({ r, p, st }) => `<section class="card done-item ${r.mode === 'doplnanie' ? 'green' : 'red'}">
      <button class="done-head" data-act="toggleDone" data-id="${esc(r.id)}" aria-expanded="${S.openDone === r.id}">
        <span class="done-date">${date(r.created_at)}</span>
        <span class="done-name">${esc(lengthLabel({ mode: r.mode === 'doplnanie' ? 'doplnanie' : 'papier', length: r.length, hard: r.details?.hard }))}</span>
        ${stateTag(st)}
        <b class="done-xp">+${xpOfRow(r) + (ex.has(r.details.dict) ? xpOfRow(mine().find((x) => x.details?.kind === 'explained' && x.details.dict === r.details.dict)) : 0)} XP</b>
      </button>
      ${S.openDone === r.id ? `<div class="done-body">
        ${r.text ? `<p class="correct small">${clickableText(r.text)}</p>` : ''}
        ${p.mistakes ? `<p class="hint">${st === 'unexplained' ? 'Ťukni na každú chybu a vypočuj si vysvetlenie. Keď budú všetky vypočuté, diktát bude vysvetlený.' : 'Chyby:'}</p>
        <div class="mistake-chips">${chipsFor(p, `r${r.id}`)}</div>` : ''}
      </div>` : ''}
    </section>`).join('')}</div>` : '<section class="card"><p>Zatiaľ tu nič nie je. Diktát sa sem dostane, keď ho ocko potvrdí kódom.</p></section>'}
    ${cloudLine()}
    ${tabBar()}`;
  }

  function viewCalendar() {
    const base = S.calMonth ? new Date(S.calMonth) : new Date();
    const y = base.getFullYear(); const m = base.getMonth();
    const first = new Date(y, m, 1);
    const start = weekStart(first);
    const per = {};
    for (const r of mine().filter((x) => x.details?.kind === 'done')) {
      const k = dayKey(r.created_at);
      per[k] = per[k] || { red: 0, green: 0 };
      per[k][r.mode === 'doplnanie' ? 'green' : 'red']++;
    }
    const today = dayKey(new Date());
    const monthName = first.toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' });
    const weeks = [];
    const d = new Date(start);
    while (weeks.length < 6 && (weeks.length === 0 || d.getMonth() === m || (d < first))) {
      const days = [];
      let wr = 0; let wg = 0;
      for (let i = 0; i < 7; i++) {
        const k = dayKey(d); const c = per[k] || { red: 0, green: 0 };
        wr += c.red; wg += c.green;
        days.push(`<div class="day ${d.getMonth() !== m ? 'out' : ''} ${k === today ? 'today' : ''}"><span class="dnum">${d.getDate()}</span><span class="dcounts">${c.red ? `<i class="cnt red" title="diktát">${c.red}</i>` : ''}${c.green ? `<i class="cnt green" title="doplňovačka">${c.green}</i>` : ''}</span></div>`);
        d.setDate(d.getDate() + 1);
      }
      weeks.push(`<div class="week">${days.join('')}<div class="wsum"><b>${wr + wg}</b><span>${wr ? `<i class="cnt red">${wr}</i>` : ''}${wg ? `<i class="cnt green">${wg}</i>` : ''}</span></div></div>`);
      if (d.getMonth() !== m && d > first) break;
    }
    return `${topBar()}
    <h1 class="page-title">Kalendár</h1>
    <section class="card cal">
      <div class="cal-head"><button class="btn small" data-act="calMove" data-v="-1" aria-label="Predchádzajúci mesiac">‹</button><h2>${esc(monthName)}</h2><button class="btn small" data-act="calMove" data-v="1" aria-label="Ďalší mesiac">›</button></div>
      <div class="week names">${['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map((x) => `<div>${x}</div>`).join('')}<div>Týž.</div></div>
      ${weeks.join('')}
      <div class="cal-legend"><span><i class="cnt red">2</i> diktát na papier</span><span><i class="cnt green">1</i> doplňovačka</span></div>
    </section>
    ${cloudLine()}
    ${tabBar()}`;
  }

  function viewLevel() {
    const xp = totalXp(); const lv = levelOf(xp);
    const from = levelStart(lv); const to = levelStart(lv + 1);
    const c = challenge();
    const past = mine().filter((r) => r.details?.kind === 'reward').slice(0, 8);
    const pick = S.rewardPick || {};
    return `${topBar()}
    <section class="card level-hero">
      <div class="badge big"><span>${lv}</span></div>
      <div class="lh-main"><h1>Level ${lv}</h1><p>${xp} XP spolu · do levelu ${lv + 1} chýba ${to - xp} XP</p>
        <div class="meter big"><i style="width:${Math.round(((xp - from) / (to - from)) * 100)}%"></i></div></div>
    </section>
    <section class="card challenge">
      <h2>🏆 Týždenná výzva</h2>
      <p>Urob za týždeň <b>${GOAL} náročných diktátov na papier bez chyby</b> a vyber si zážitok, kam pôjdeš s ockom alebo s mamou.</p>
      <div class="goal-dots">${Array.from({ length: GOAL }, (_, i) => `<i class="${i < c.done ? 'on' : ''}">${i + 1}</i>`).join('')}</div>
      ${c.reward ? `<p class="won">Splnené! Vybral si si: <b>${esc(c.reward.details.place)}</b> ${c.reward.details.with === 'mama' ? 's mamou' : 's ockom'}.</p>`
        : c.raw >= GOAL ? `<div class="pick">
          <h3>Vyber si zážitok</h3>
          <div class="seg" role="group" aria-label="S kým"><button data-act="rwWith" data-v="ocko" aria-pressed="${pick.with === 'ocko'}">S ockom</button><button data-act="rwWith" data-v="mama" aria-pressed="${pick.with === 'mama'}">S mamou</button></div>
          <div class="letters">${PLACES.map((p) => `<button class="letter wide" data-act="rwPlace" data-v="${esc(p)}" aria-pressed="${pick.place === p}">${esc(p)}</button>`).join('')}</div>
          <label class="own">Alebo vlastný nápad: <input id="rwOwn" maxlength="40" value="${esc(pick.own || '')}" placeholder="napríklad futbalový zápas"></label>
          <button class="btn primary big" data-act="rwSave" ${pick.with && (pick.place || pick.own) ? '' : 'disabled'}>Vybrať zážitok</button>
        </div>` : `<p class="hint">Tento týždeň: ${c.done} z ${GOAL}. Počíta sa diktát na papier, náročný, bez chyby a potvrdený ockom.</p>`}
    </section>
    <section class="card">
      <h2>Ako získať body</h2>
      <div class="xp-table">
        ${Object.entries(E.LENGTHS).map(([, l]) => `<div><b>${l.label}</b><span>+${l.xp} XP</span><span>náročný +${l.xp * 2} XP</span></div>`).join('')}
      </div>
      <p class="hint">Celé body sú za diktát bez chyby na prvý raz. Diktát s chybami, ktoré máš všetky vysvetlené, dá 30 % bodov. Nevysvetlený diktát nedá nič.</p>
    </section>
    ${past.length ? `<section class="card"><h2>Moje zážitky</h2>${past.map((r) => `<div class="hrow"><span>${new Date(r.created_at).toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' })}</span><span>${esc(r.details.place)} ${r.details.with === 'mama' ? 's mamou' : 's ockom'}</span></div>`).join('')}</section>` : ''}
    ${cloudLine()}
    ${tabBar()}`;
  }

  // vysvetlenie (spodná karta). opts.key = miesto v texte (značenie chýb na papieri), opts.heardKey + opts.onHeard pre uložené
  function openWhy(word, opts = {}) {
    const list = opts.items || E.wordInfo(word).list;
    if (!list.length) return;
    const heardKey = opts.heardKey || (opts.gap !== undefined ? `g${opts.gap}` : opts.key || '');
    const isHeard = () => (opts.isHeard ? opts.isHeard() : S.heard.has(heardKey));
    const markable = S.view === 'review' && !S.rewarded && !!opts.key && !(S.gate && S.gate.kind === 'confirm');
    const marked = () => S.marked.has(opts.key);
    const letters = [...word].map((ch, i) => (list.some((x) => i >= x.i && i < x.i + x.len) ? `<mark>${esc(ch)}</mark>` : esc(ch))).join('');
    const items = list.map((x) => `<div class="why-item"><h3>${esc(x.head)}</h3><span class="tag ${esc(String(x.kind || x.tag).split(' ')[0])}">${esc(x.tag)}</span><p>${esc(x.text)}</p></div>`).join('');
    closeWhy();
    const el = document.createElement('div');
    el.className = 'sheet-wrap';
    const markBtn = () => (markable ? `<button class="btn ${marked() ? '' : 'mark'}" data-sheet="mark">${marked() ? 'Mám to dobre' : 'Toto mám zle'}</button>` : '');
    el.innerHTML = `<div class="sheet" role="dialog" aria-label="Vysvetlenie">
      <div class="sheet-word">${letters}</div><div class="sheet-items">${items}</div>
      <p class="sheet-status" hidden></p>
      <div class="row sheet-actions"><button class="btn small" data-sheet="say">${ICON.speaker} Znova</button><span class="mark-slot">${markBtn()}</span><button class="btn primary" data-sheet="close">Rozumiem</button></div></div>`;
    document.body.appendChild(el);
    const status = el.querySelector('.sheet-status');
    const showHeard = () => { if (heardKey && isHeard() && (!markable || marked())) { status.hidden = false; status.textContent = 'Vypočuté ✓'; } else status.hidden = true; };
    const speak = () => {
      Voice.stop();
      Voice.seq([word, ...list.flatMap((x) => [x.say, x.text])].filter(Boolean)).then((ok) => {
        if (!ok || !heardKey) return;
        if (opts.onHeard) opts.onHeard(); else S.heard.add(heardKey);
        showHeard();
      });
    };
    el.addEventListener('click', (e) => {
      const a = e.target.closest('[data-sheet]')?.dataset.sheet;
      if (a === 'say') speak();
      if (a === 'mark') {
        if (marked()) S.marked.delete(opts.key); else S.marked.add(opts.key);
        showHeard();
        el.querySelector('.mark-slot').innerHTML = markBtn();
      }
      if (a === 'close' || e.target === el) { Voice.stop(); closeWhy(); render(); }
    });
    speak();
  }
  function closeWhy() { document.querySelector('.sheet-wrap')?.remove(); }

  const TAB_VIEWS = ['setup', 'calendar', 'done', 'level'];
  function render() {
    const v = { setup: viewSetup, ready: viewReady, paper: viewPaper, review: viewReview, gaps: viewGaps, done: viewDone, calendar: viewCalendar, level: viewLevel }[S.view] || viewSetup;
    const y = window.scrollY;
    $app.innerHTML = v();
    document.body.classList.toggle('has-tabs', TAB_VIEWS.includes(S.view));
    const changed = render.last !== S.view; render.last = S.view;
    if (S.view === 'paper') updatePlayer();
    window.scrollTo({ top: changed ? 0 : y });
    if (S.celebrate) { S.celebrate = false; fireworks(); }
  }

  // ---------------- akcie ----------------
  function generate() {
    const recent = lsGet('ucitel2-recent', []);
    S.dict = { ...E.generate(S.length, [...S.letters], recent, S.hard), id: uid() };
    lsSet('ucitel2-recent', [...S.dict.ids, ...recent].slice(0, 45));
    S.rewarded = false;
    S.view = 'ready'; render();
  }

  function startDictation() {
    S.gaps = {}; S.checked = null; S.gate = null; S.notice = '';
    S.marked = new Set(); S.heard = new Set(); S.wrongGaps = new Set(); S.doneSaved = false;
    if (S.mode === 'doplnanie') {
      S.plan = E.gapPlan(S.dict.text, [...S.gapTypes], S.dict.id);
      S.focusGap = 0;
      S.view = 'gaps'; render();
      document.getElementById('g0')?.focus({ preventScroll: true });
      return;
    }
    S.plan = null;
    const sc = buildScript();
    Object.assign(P, { steps: sc.steps, chunks: sc.chunks, i: 0, playing: false, started: false, finished: false });
    S.view = 'paper'; render();
    runPlayer(); // spustené ťuknutím, takže iPad dovolí zvuk
  }

  const modeDb = (m) => (m === 'papier' ? 'pisanie' : 'doplnanie');

  /** Každý dokončený diktát sa uloží (kind: done), aj keď ešte nie je potvrdený. Z toho je kalendár. */
  function saveDone(mistakes, iy, words, answer) {
    if (S.doneSaved) return;
    S.doneSaved = true;
    const d = S.dict; const id = uid();
    const details = { kind: 'done', dict: d.id, hard: !!d.hard, types: S.mode === 'doplnanie' ? [...S.gapTypes] : undefined };
    Store.add('diktat_results', {
      id, child: CHILD, length: d.length, letters: d.letters.join(''), mode: modeDb(S.mode), speed: S.speed, text: d.text,
      answer: (answer || '').slice(0, 6000), words, mistakes, iy_mistakes: iy, stars: 0, reward_cents: 0, details,
    }, { id, created_at: new Date().toISOString(), child: CHILD, length: d.length, mode: modeDb(S.mode), mistakes, reward_cents: 0, text: d.text, details });
  }

  /** Rodič potvrdil kódom: diktát ide do Uložených s bodmi podľa výsledku a vysvetlenia. */
  function confirmDict(p) {
    const id = uid();
    const st = stateOf(p, p.heard);
    const xp = st === 'clean' ? xpBase(p) : st === 'explained' ? Math.round(xpBase(p) * 0.3) : 0;
    const details = { kind: 'confirmed', dict: p.dictId, hard: !!p.hard, wrong: p.wrong || [], wrongItems: p.wrongItems || [], heard: p.heard || [], explained: st !== 'unexplained', xp, doneAt: p.doneAt };
    Store.add('diktat_results', {
      id, child: CHILD, length: p.length, letters: p.letters || '', mode: modeDb(p.mode), speed: S.speed, text: p.text,
      words: E.tokenize(p.text).length, mistakes: p.mistakes, iy_mistakes: p.mistakes, stars: st === 'clean' ? 3 : st === 'explained' ? 2 : 1, reward_cents: 0, details,
    }, { id, created_at: new Date().toISOString(), child: CHILD, length: p.length, mode: modeDb(p.mode), mistakes: p.mistakes, reward_cents: 0, text: p.text, details })
      .then(() => { const c = document.querySelector('.cloud'); if (c) c.outerHTML = cloudLine() || '<span></span>'; });
    S.pending = S.pending.filter((x) => x.dictId !== p.dictId);
    lsSet('ucitel2-pending', S.pending);
    return { xp, clean: st === 'clean' };
  }

  /** Aktuálny diktát pripravený na potvrdenie. */
  function currentPending() {
    const d = S.dict;
    const wrongItems = S.mode === 'papier'
      ? [...S.marked].sort((a, b) => a - b).map((k) => ({ w: d.text.slice(+k).match(E.WORD_RE)[0], i: -1, k }))
      : [...S.wrongGaps].sort((a, b) => a - b).map((g) => { const p = gapAt(g); return { w: p.word, i: p.idx, k: `g${g}` }; });
    return {
      dictId: d.id, length: d.length, hard: !!d.hard, letters: d.letters.join(''), mode: S.mode, text: d.text,
      mistakes: wrongItems.length, wrong: wrongItems.map((x) => x.w), wrongItems, heard: wrongItems.filter((x) => S.heard.has(x.k)).map((x) => x.k), doneAt: new Date().toISOString(),
    };
  }
  function rememberPending() {
    const p = currentPending();
    S.pending = [...S.pending.filter((x) => x.dictId !== p.dictId), p];
    lsSet('ucitel2-pending', S.pending);
  }

  /** Vysvetlenie chyby v uložených (čakajúci aj potvrdený diktát). */
  function explainSaved(src, k) {
    if (src[0] === 'p') {
      const p = S.pending[+src.slice(1)];
      const it = p && itemsOf(p).find((x) => x.k === k);
      if (!it) return;
      openWhy(it.w, {
        items: E.itemsFor(it.w, it.i), heardKey: k, isHeard: () => p.heard.includes(k),
        onHeard: () => { if (!p.heard.includes(k)) { p.heard.push(k); lsSet('ucitel2-pending', S.pending); if (heardAll(p, p.heard)) Voice.say(LINES.explained[0]); } },
      });
      return;
    }
    const r = confirmedRows().find((x) => `r${x.id}` === src);
    if (!r) return;
    const dict = r.details.dict;
    const p = { mistakes: r.mistakes, wrong: r.details.wrong, wrongItems: r.details.wrongItems };
    const it = itemsOf(p).find((x) => x.k === k);
    if (!it) return;
    const heard = () => [...(r.details.heard || []), ...(S.savedHeard[dict] || [])];
    openWhy(it.w, {
      items: E.itemsFor(it.w, it.i), heardKey: k, isHeard: () => heard().includes(k),
      onHeard: () => {
        S.savedHeard[dict] = [...new Set([...(S.savedHeard[dict] || []), k])];
        lsSet('ucitel2-saved-heard', S.savedHeard);
        if (heardAll(p, heard()) && !r.details.explained && !explainedDicts().has(dict)) {
          const id = uid();
          const xp = Math.round(xpBase({ length: r.length, hard: r.details.hard }) * 0.3);
          const details = { kind: 'explained', dict, xp };
          Store.add('diktat_results', { id, child: CHILD, length: r.length, letters: '', mode: r.mode, speed: S.speed, text: r.text, words: 0, mistakes: r.mistakes, iy_mistakes: 0, stars: 2, reward_cents: 0, details },
            { id, created_at: new Date().toISOString(), child: CHILD, length: r.length, mode: r.mode, mistakes: r.mistakes, reward_cents: 0, text: r.text, details });
          Voice.say(LINES.explained[0]);
        }
      },
    });
  }

  function checkGaps() {
    document.querySelectorAll('.gap[data-gap]').forEach((g) => { S.gaps[g.dataset.gap] = g.value.trim(); });
    const empty = S.plan.filter((p) => p.gap !== undefined && !(S.gaps[p.gap] || '').trim());
    if (empty.length) {
      S.notice = `Ešte ${plural(empty.length, 'ti chýba 1 okienko', `ti chýbajú ${empty.length} okienka`, `ti chýba ${empty.length} okienok`)}. Kontroluje sa iba raz, tak najprv doplň všetko.`;
      S.focusGap = empty[0].gap; render(); document.getElementById(`g${empty[0].gap}`)?.focus();
      return;
    }
    S.notice = '';
    const r = E.gradeGaps(S.plan, S.gaps);
    S.checked = Object.fromEntries(r.items.map((x) => [x.gap, x.ok]));
    r.items.filter((x) => !x.ok).forEach((x) => S.wrongGaps.add(x.gap));
    const answer = S.plan.map((p) => (p.gap === undefined ? p.t : (S.gaps[p.gap] || '_'))).join('');
    saveDone(r.mistakes, r.iy, r.words, answer);
    render();
    Voice.chat(pick(r.mistakes === 0 ? LINES.perfect : LINES.oops));
  }

  async function gateCheck() {
    const v = document.getElementById('gateIn')?.value || '';
    if (!(await codeOk(v))) { S.gate.wrong = true; render(); document.getElementById('gateIn')?.focus(); return; }
    const g = S.gate; S.gate = null;
    const before = levelOf(totalXp());
    let res = null;
    if (g.kind === 'confirm') {
      res = confirmDict(currentPending());
      S.lastXp = res.xp; S.lastClean = res.clean; S.rewarded = true;
    } else if (g.kind === 'pending') {
      const p = S.pending[g.n];
      if (p) res = confirmDict(p);
    }
    const after = levelOf(totalXp());
    S.levelUp = after > before ? after : 0;
    S.celebrate = !!(res && (res.clean || S.levelUp));
    render();
    Voice.chat(S.levelUp ? LINES.levelUp[0] : pick(res && res.clean ? LINES.win : LINES.noMoney));
  }

  function setView(v) { Voice.stop(); closeWhy(); S.gate = null; S.view = v; render(); }

  $app.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act], [data-key]');
    if (!b) return;
    if (b.dataset.key) { fillGap(b.dataset.key); return; }
    const act = b.dataset.act; const v = b.dataset.v;
    const openGate = (g) => { S.gate = g; render(); document.getElementById('gateIn')?.focus(); };
    switch (act) {
      case 'tab':
        setView(v);
        if (v !== 'setup') Store.sync().then(() => S.view === v && render());
        break;
      case 'length': S.length = v; savePrefs(); render(); break;
      case 'hard': S.hard = v === '1'; savePrefs(); render(); break;
      case 'letter': S.letters.has(v) ? S.letters.delete(v) : S.letters.add(v); savePrefs(); render(); break;
      case 'allLetters': S.letters = S.letters.size === E.LETTERS.length ? new Set() : new Set(E.LETTERS); savePrefs(); render(); break;
      case 'gapType': S.gapTypes.has(v) ? S.gapTypes.delete(v) : S.gapTypes.add(v); savePrefs(); render(); break;
      case 'mode': S.mode = v; savePrefs(); render(); break;
      case 'speed': S.speed = v; savePrefs(); render(); break;
      case 'sample': Voice.stop(); Voice.say(LINES.sample[0], TALK, true).then(() => Voice.say(LINES.sampleSentence[0], SPEEDS[S.speed].rate, false)); break;
      case 'generate': case 'regen': generate(); break;
      case 'start': startDictation(); break;
      case 'play': if (P.playing) pausePlayer(); else { if (P.finished) { P.i = 0; P.finished = false; } runPlayer(); } break;
      case 'repeat': repeatChunk(); break;
      case 'skip': skipIntro(); break;
      case 'showCorrect': Voice.stop(); P.playing = false; saveDone(0, 0, E.tokenize(S.dict.text).length, ''); S.view = 'review'; render(); Voice.chat(pick(LINES.review)); break;
      case 'word': openWhy(b.dataset.w, { key: b.dataset.k || undefined }); break;
      case 'gapWhy': { const p = gapAt(+b.dataset.k.slice(1)); openWhy(p.word, { items: [p], gap: p.gap }); break; }
      case 'explainSaved': explainSaved(b.dataset.src, b.dataset.k); break;
      case 'checkGaps': checkGaps(); break;
      case 'later': rememberPending(); setView('setup'); Voice.chat(pick(LINES.saved)); break;
      case 'callParent': rememberPending(); openGate({ kind: 'confirm' }); break;
      case 'confirmPending': openGate({ kind: 'pending', n: +b.dataset.n }); break;
      case 'gateCheck': gateCheck(); break;
      case 'gateCancel': S.gate = null; render(); break;
      case 'quit': Voice.stop(); S.view = 'ready'; render(); break;
      case 'toggleDone': S.openDone = S.openDone === b.dataset.id ? null : b.dataset.id; render(); break;
      case 'doneFilter': S.doneFilter = v; render(); break;
      case 'calMove': { const d = S.calMonth ? new Date(S.calMonth) : new Date(); d.setDate(1); d.setMonth(d.getMonth() + +v); S.calMonth = d.toISOString(); render(); break; }
      case 'rwWith': S.rewardPick = { ...(S.rewardPick || {}), with: v }; render(); break;
      case 'rwPlace': S.rewardPick = { ...(S.rewardPick || {}), place: v, own: '' }; render(); break;
      case 'rwSave': {
        const pk = S.rewardPick || {};
        const place = (pk.own || pk.place || '').trim();
        if (!pk.with || !place) break;
        const id = uid();
        const details = { kind: 'reward', week: challenge().week, with: pk.with, place };
        Store.add('diktat_results', { id, child: CHILD, length: 'kratky', letters: '', mode: 'pisanie', speed: '', text: '', words: 0, mistakes: 0, iy_mistakes: 0, stars: 3, reward_cents: 0, details },
          { id, created_at: new Date().toISOString(), child: CHILD, length: 'kratky', mode: 'pisanie', mistakes: 0, reward_cents: 0, text: '', details });
        S.rewardPick = null; S.celebrate = true; render(); Voice.chat(LINES.challenge[0]);
        break;
      }
      default: break;
    }
  });
  $app.addEventListener('change', (e) => {
    if (e.target.id === 'sayPunct') { S.sayPunct = e.target.checked; savePrefs(); }
    if (e.target.id === 'voice') { S.voiceURI = e.target.value; savePrefs(); }
  });
  $app.addEventListener('keydown', (e) => { if (e.target.id === 'gateIn' && e.key === 'Enter') gateCheck(); });

  // doplňovačka: klávesy pod textom ukazujú možnosti pre okienko, v ktorom práve si
  $app.addEventListener('focusin', (e) => {
    if (!e.target.classList?.contains('gap') || e.target.dataset.gap === undefined) return;
    S.focusGap = +e.target.dataset.gap;
    const k = document.getElementById('keys');
    if (k) k.innerHTML = keysHtml();
  });
  $app.addEventListener('input', (e) => {
    const g = e.target;
    if (g.id === 'rwOwn') {
      S.rewardPick = { ...(S.rewardPick || {}), own: g.value, place: g.value ? '' : (S.rewardPick || {}).place };
      const btn = document.querySelector('[data-act="rwSave"]');
      if (btn) btn.disabled = !(S.rewardPick.with && (S.rewardPick.place || S.rewardPick.own.trim()));
      document.querySelectorAll('[data-act="rwPlace"]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      return;
    }
    if (!g.classList?.contains('gap') || g.dataset.gap === undefined) return;
    const p = gapAt(+g.dataset.gap);
    const raw = g.value.replace(/\s/g, '');
    const low = raw.toLowerCase();
    const opt = p.options.find((o) => low.endsWith(o) && o.length === 2) || p.options.find((o) => low.slice(-1) === o);
    const val = opt ? capFor(opt, p.answer) : raw.slice(-2);
    g.value = val; S.gaps[p.gap] = val;
    updateFilled();
    if (opt && (opt.length === 2 || !p.options.some((o) => o.length === 2 && o[0] === opt))) focusNext(g);
  });
  function updateFilled() {
    const el = document.getElementById('filled');
    if (!el) return;
    const total = S.plan.filter((p) => p.gap !== undefined).length;
    const filled = S.plan.filter((p) => p.gap !== undefined && (S.gaps[p.gap] || '').trim()).length;
    el.textContent = `${filled} z ${total}`;
    if (filled === total && S.notice) { S.notice = ''; document.querySelector('.notice.bad-note')?.remove(); }
  }
  function fillGap(c) {
    const g = document.getElementById(`g${S.focusGap}`) || document.querySelector('.gap[data-gap]');
    if (!g) return;
    g.value = c; S.gaps[g.dataset.gap] = c; updateFilled(); focusNext(g);
  }
  function focusNext(g) {
    const all = [...document.querySelectorAll('input.gap')];
    const next = all.slice(all.indexOf(g) + 1).find((x) => !x.value) || all.slice(all.indexOf(g) + 1)[0];
    if (next) next.focus({ preventScroll: false });
  }

  render();
  Store.sync().then(() => { if (TAB_VIEWS.includes(S.view)) render(); });
})();
