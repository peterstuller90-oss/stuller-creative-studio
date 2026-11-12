/* Učiteľ 2.0 – diktáty z vybraných slov. Bez prihlásenia; výsledky a peniaze sa ukladajú do Supabase
   (projekt „stullers home“ ako celé Creative Studio, tabuľky diktat_results a diktat_payouts), a keď cloud nie je dostupný, do tohto zariadenia. */
(() => {
  const E = window.UCITEL_ENGINE;
  const $app = document.getElementById('app');

  const KIDS = [{ name: 'Oto', girl: false, face: 'O' }, { name: 'Dita', girl: true, face: 'D' }];
  const SUPA_URL = 'https://vupzrryhxnninttjyges.supabase.co';
  const SUPA_KEY = 'sb_publishable_lTU6RvAAgtRVeyvmx7BBeg_ag4_TZXX';
  const SPEEDS = {
    pomaly: { label: 'Pomaly', rate: 0.8, perChar: 430 },
    normal: { label: 'Normálne', rate: 0.92, perChar: 310 },
    rychlo: { label: 'Rýchlo', rate: 1.02, perChar: 210 },
  };
  const MASCOT = 'mascot.png';

  // ---------------- pomocné ----------------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const euro = (c) => `${(c / 100).toFixed(2).replace('.', ',')} €`;
  const chyb = (n) => (n === 1 ? 'chybu' : n >= 2 && n <= 4 ? 'chyby' : 'chýb');
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* bez úložiska */ } };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16)));
  const kid = () => KIDS.find((k) => k.name === S.child) || KIDS[0];
  const sloveso = (girl, m, f) => (girl ? f : m);

  // ---------------- stav ----------------
  const prefs = lsGet('ucitel2-prefs', {});
  const S = {
    view: 'setup',
    child: prefs.child || 'Oto',
    length: prefs.length || 'kratky',
    letters: new Set(prefs.letters || E.LETTERS),
    mode: prefs.mode || 'pisanie',
    speed: prefs.speed || 'normal',
    sayPunct: prefs.sayPunct ?? false,
    voiceURI: prefs.voiceURI || '',
    dict: null, plan: null, result: null, gate: null, saved: null,
  };
  const savePrefs = () => lsSet('ucitel2-prefs', { child: S.child, length: S.length, letters: [...S.letters], mode: S.mode, speed: S.speed, sayPunct: S.sayPunct, voiceURI: S.voiceURI });

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
          this.api('diktat_results?select=id,created_at,child,length,stars,mistakes,reward_cents&order=created_at.desc&limit=500'),
          this.api('diktat_payouts?select=id,created_at,child,amount_cents&order=created_at.desc&limit=500'),
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
    balance(child) {
      const earned = this.data.results.filter((r) => r.child === child).reduce((a, r) => a + (r.reward_cents || 0), 0);
      const paid = this.data.payouts.filter((r) => r.child === child).reduce((a, r) => a + (r.amount_cents || 0), 0);
      return earned - paid;
    },
  };

  // ---------------- hlas ----------------
  const Voice = {
    voices: [],
    ok: 'speechSynthesis' in window,
    load() {
      if (!this.ok) return;
      const all = speechSynthesis.getVoices();
      const score = (v) => (/premium|enhanced|vylepš|neural|natural|online/i.test(v.name) ? 4 : 0) + (/google|microsoft/i.test(v.name) ? 2 : 0) + (/laura/i.test(v.name) ? 1 : 0) + (v.localService === false ? 1 : 0);
      this.voices = all.filter((v) => /^sk/i.test(v.lang)).sort((a, b) => score(b) - score(a));
    },
    current() { return this.voices.find((v) => v.voiceURI === S.voiceURI) || this.voices[0] || null; },
    token: 0,
    stop() { this.token++; if (this.ok) speechSynthesis.cancel(); },
    /** Povie text; vráti Promise, ktorý sa splní po dohovorení (aj keď prehliadač zabudne poslať „end“). */
    say(text, rate = 0.92) {
      return new Promise((resolve) => {
        if (!this.ok) { setTimeout(resolve, 400); return; }
        const u = new SpeechSynthesisUtterance(text);
        const v = this.current();
        if (v) u.voice = v;
        u.lang = 'sk-SK'; u.rate = rate; u.pitch = 1.05;
        let done = false;
        const finish = () => { if (!done) { done = true; clearTimeout(t); resolve(); } };
        const t = setTimeout(finish, 1800 + text.length * 95 / rate);
        u.onend = finish; u.onerror = finish;
        this.keep = u; // Safari zahodí neodkázané vety
        speechSynthesis.speak(u);
      });
    },
  };
  if (Voice.ok) { Voice.load(); speechSynthesis.addEventListener?.('voiceschanged', () => { Voice.load(); if (S.view === 'setup') render(); }); }

  const wait = (ms, tok) => new Promise((r) => setTimeout(() => r(tok === Voice.token), ms));

  // ---------------- diktovanie ----------------
  const PUNCT_WORDS = { ',': 'čiarka', '.': 'bodka', '?': 'otáznik', '!': 'výkričník' };
  function buildScript() {
    const sp = SPEEDS[S.speed];
    const gapMode = S.mode === 'doplnanie';
    const k = kid();
    const steps = [];
    const sentences = S.dict.sentences;
    let chunkNo = 0;
    steps.push({ kind: 'intro', say: `Ahoj ${k.name}! Ideme na diktát. Najprv ti ho celý prečítam. Ty len počúvaj, ešte nepíš.`, rate: 0.95, pause: 500 });
    sentences.forEach((s) => steps.push({ kind: 'listen', say: s, rate: sp.rate, pause: 650 }));
    steps.push({ kind: 'intro2', say: gapMode ? 'Teraz budem diktovať po kúskoch. Ty doplň do okienok i alebo y.' : 'Tak, a teraz píš. Budem diktovať po kúskoch, pomaly.', rate: 0.95, pause: 900 });
    sentences.forEach((s, si) => {
      steps.push({ kind: 'sentence', say: (si === 0 ? 'Prvá veta. ' : si === sentences.length - 1 && sentences.length > 2 ? 'Posledná veta. ' : 'Ďalšia veta. ') + s, rate: sp.rate, pause: 900, si });
      for (const c of E.chunks(s)) {
        const last = c.slice(-1);
        const text = S.sayPunct && PUNCT_WORDS[last] ? `${c.replace(/[.,?!]$/, '')}, ${PUNCT_WORDS[last]}` : c;
        const pause = gapMode ? 900 + c.length * sp.perChar * 0.3 : 1000 + c.length * sp.perChar;
        steps.push({ kind: 'chunk', say: text, rate: sp.rate * 0.95, pause, chunk: chunkNo++, si });
      }
    });
    steps.push({ kind: 'check', say: 'A teraz ti to prečítam ešte raz celé. Skontroluj si, či ti nič nechýba.', rate: 0.95, pause: 600 });
    sentences.forEach((s) => steps.push({ kind: 'recheck', say: s, rate: sp.rate, pause: gapMode ? 1200 : 2600 }));
    steps.push({ kind: 'end', say: `Hotovo! Keď budeš ${sloveso(k.girl, 'pripravený', 'pripravená')}, ťukni na tlačidlo Skontrolovať.`, rate: 0.95, pause: 0 });
    return { steps, chunks: chunkNo };
  }

  const P = { steps: [], chunks: 0, i: 0, playing: false, started: false };

  async function runPlayer() {
    const tok = ++Voice.token;
    P.playing = true; P.started = true; updatePlayer();
    while (P.i < P.steps.length) {
      const st = P.steps[P.i];
      updatePlayer();
      await Voice.say(st.say, st.rate);
      if (tok !== Voice.token) return;
      if (!(await wait(st.pause, tok))) return;
      P.i++;
    }
    P.playing = false; P.finished = true; updatePlayer();
  }
  function pausePlayer() { Voice.stop(); P.playing = false; updatePlayer(); }
  function repeatChunk() {
    // späť na začiatok aktuálneho kúska (alebo predchádzajúceho, ak práve beží pauza po ňom)
    let j = Math.min(P.i, P.steps.length - 1);
    while (j > 0 && P.steps[j].kind !== 'chunk' && P.steps[j].kind !== 'sentence') j--;
    Voice.stop(); P.i = j; runPlayer();
  }
  function skipIntro() {
    const j = P.steps.findIndex((s) => s.kind === 'sentence');
    Voice.stop(); P.i = j; runPlayer();
  }

  const STATUS = {
    intro: ['Počúvaj', 'Najprv celý diktát. Ešte nepíš.'],
    listen: ['Počúvaj', 'Najprv celý diktát. Ešte nepíš.'],
    intro2: ['Priprav sa', 'O chvíľu začneme písať.'],
    sentence: ['Píš', ''],
    chunk: ['Píš', ''],
    check: ['Kontrola', 'Čítam to ešte raz celé.'],
    recheck: ['Kontrola', 'Čítam to ešte raz celé.'],
    end: ['Hotovo', 'Skontroluj si text a ťukni na Skontrolovať.'],
  };

  function updatePlayer() {
    const el = document.getElementById('player');
    if (!el) return;
    const st = P.steps[Math.min(P.i, P.steps.length - 1)] || {};
    let [title, sub] = P.started ? STATUS[st.kind] || ['', ''] : ['Pripravený?', 'Ťukni na veľké tlačidlo a začneme.'];
    if (P.finished) [title, sub] = STATUS.end;
    if (P.started && (st.kind === 'sentence' || st.kind === 'chunk')) sub = `Veta ${st.si + 1} z ${S.dict.sentences.length}`;
    if (P.started && !P.playing && !P.finished) { title = 'Pauza'; sub = 'Ťukni na tlačidlo a pokračujeme.'; }
    el.querySelector('.status').textContent = title;
    el.querySelector('.substatus').textContent = sub;
    el.querySelector('.play').innerHTML = P.playing ? ICON.pause : ICON.play;
    el.querySelector('.play').setAttribute('aria-label', P.playing ? 'Pauza' : 'Spustiť diktovanie');
    const cur = st.kind === 'chunk' ? st.chunk : st.kind === 'sentence' ? (P.steps.slice(P.i).find((s) => s.kind === 'chunk')?.chunk ?? 0) - 0.5 : -1;
    const passed = P.steps.slice(0, P.i).filter((s) => s.kind === 'chunk').length;
    el.querySelector('.dots').innerHTML = Array.from({ length: P.chunks }, (_, n) => `<i class="dot ${n === cur ? 'now' : n < passed ? 'done' : ''}"></i>`).join('');
    el.querySelector('[data-act="skip"]').hidden = !(P.started && P.steps[P.i] && ['intro', 'listen', 'intro2'].includes(P.steps[P.i].kind));
  }

  // ---------------- ikony ----------------
  const ICON = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4.5" height="14" rx="1.5" fill="currentColor"/><rect x="13.5" y="5" width="4.5" height="14" rx="1.5" fill="currentColor"/></svg>',
    speaker: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
    star: (on) => `<svg class="star ${on ? 'on' : ''}" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4l6 13 14 1.5-10.5 9.5 3 14L24 35l-12.5 7 3-14L4 18.5 18 17z"/></svg>`,
  };

  // ---------------- obrazovky ----------------
  function topBar() {
    const bal = Store.balance(S.child);
    return `<header class="top">
      <div class="brand"><img src="${MASCOT}" alt=""><div><b>Učiteľ 2.0</b><small>Diktáty z vybraných slov</small></div></div>
      <button class="pill" data-act="wallet" aria-label="Peňaženka"><span class="coin"></span>${esc(S.child)}: ${euro(bal)}</button>
    </header>`;
  }

  function viewSetup() {
    const L = E.LENGTHS;
    const allOn = S.letters.size === E.LETTERS.length;
    const voices = Voice.voices;
    return `${topBar()}
    <section class="card">
      <div class="step-head"><span class="num">1</span><h2>Kto píše?</h2></div>
      <div class="kids">${KIDS.map((k) => `<button class="kid" data-act="child" data-v="${k.name}" aria-pressed="${S.child === k.name}"><span class="face">${k.face}</span>${k.name}</button>`).join('')}</div>
    </section>
    <section class="card">
      <div class="step-head"><span class="num">2</span><h2>Aký dlhý diktát?</h2></div>
      <div class="choices">${Object.entries(L).map(([key, c]) => `<button class="choice" data-act="length" data-v="${key}" aria-pressed="${S.length === key}">
        <b>${c.label}</b><span>${c.sentences} ${c.sentences < 5 ? 'vety' : 'viet'}</span><span class="money"><span class="coin"></span>${euro(c.cents)}</span></button>`).join('')}</div>
    </section>
    <section class="card">
      <div class="step-head"><span class="num">3</span><h2>Ktoré vybrané slová?</h2></div>
      <div class="letters">
        ${E.LETTERS.map((l) => `<button class="letter" data-act="letter" data-v="${l}" aria-pressed="${S.letters.has(l)}" aria-label="Vybrané slová po ${l.toUpperCase()}">${l.toUpperCase()}</button>`).join('')}
        <button class="letter all" data-act="allLetters" aria-pressed="${allOn}">Všetky</button>
      </div>
      <p class="hint">V každom diktáte budú aj iné slová s mäkkým i a výnimky (napríklad kino, diktát, bicykel).</p>
    </section>
    <section class="card">
      <div class="step-head"><span class="num">4</span><h2>Ako budeš písať?</h2></div>
      <div class="choices two">
        <button class="choice" data-act="mode" data-v="pisanie" aria-pressed="${S.mode === 'pisanie'}"><b>Celý diktát</b><span>Píšeš všetko sám. Klávesnicou alebo perom.</span></button>
        <button class="choice" data-act="mode" data-v="doplnanie" aria-pressed="${S.mode === 'doplnanie'}"><b>Doplňovačka</b><span>Text vidíš a perom dopĺňaš i, í, y, ý do okienok.</span></button>
      </div>
    </section>
    <section class="card">
      <div class="step-head"><span class="num">5</span><h2>Ako rýchlo diktovať?</h2></div>
      <div class="row">
        <div class="seg" role="group" aria-label="Rýchlosť">${Object.entries(SPEEDS).map(([k, v]) => `<button data-act="speed" data-v="${k}" aria-pressed="${S.speed === k}">${v.label}</button>`).join('')}</div>
        <button class="btn small" data-act="sample">${ICON.speaker} Vypočuť hlas</button>
      </div>
      <div class="row">
        <label class="switch"><input type="checkbox" id="sayPunct" data-act="sayPunct" ${S.sayPunct ? 'checked' : ''}> Diktovať aj čiarky a bodky</label>
        ${voices.length > 1 ? `<label class="switch">Hlas <select id="voice" data-act="voice">${voices.map((v) => `<option value="${esc(v.voiceURI)}" ${Voice.current() === v ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></label>` : ''}
      </div>
      ${Voice.ok && !voices.length ? '<p class="notice">Na tomto zariadení chýba slovenský hlas. Na iPade ho pridáš v Nastaveniach: Prístupnosť → Hovorený obsah → Hlasy → Slovenčina (najlepšie verziu „Vylepšená“).</p>' : ''}
      ${!Voice.ok ? '<p class="notice">Tento prehliadač nevie čítať nahlas. Skús Safari na iPade.</p>' : ''}
    </section>
    <button class="btn primary big" data-act="generate" ${S.letters.size ? '' : 'disabled'}>Vygenerovať diktát</button>
    ${cloudLine()}`;
  }

  function cloudLine() {
    const t = { ok: 'Výsledky sa ukladajú do cloudu.', pending: 'Niektoré výsledky čakajú na odoslanie do cloudu.', off: 'Cloud je teraz nedostupný. Výsledky sa ukladajú v tomto zariadení.', unknown: '' }[Store.cloud];
    return t ? `<p class="cloud">${t}</p>` : '';
  }

  function viewReady() {
    const d = S.dict;
    const words = E.tokenize(d.text).length;
    const tags = d.sentences.map((s) => E.tagSentence(s));
    const exc = tags.filter((t) => t.exc).length;
    return `${topBar()}
    <section class="card ready">
      <img src="${MASCOT}" alt="">
      <h1>Diktát je pripravený</h1>
      <div class="chips">
        <span class="chip sun">${E.LENGTHS[d.length].label}</span>
        <span class="chip">${d.sentences.length} ${d.sentences.length < 5 ? 'vety' : 'viet'} · ${words} slov</span>
        <span class="chip">Po ${d.letters.map((l) => l.toUpperCase()).join(', ')}</span>
        <span class="chip pink">Výnimky: ${exc}</span>
        <span class="chip sun"><span class="coin" style="width:20px;height:20px;font-size:11px"></span> ${euro(E.LENGTHS[d.length].cents)}</span>
      </div>
      <p>${esc(kid().name)}, ${S.mode === 'doplnanie' ? 'budeš dopĺňať i a y do okienok.' : 'priprav si pero alebo klávesnicu.'} Najprv si diktát celý vypočuješ, potom ho budeš písať po kúskoch.</p>
      <button class="btn primary big" data-act="start">Začať diktát</button>
      <button class="btn" data-act="regen">Iné zadanie</button>
      <details class="peek"><summary>Pre rodiča: ukázať text diktátu</summary><p>${esc(d.text)}</p></details>
    </section>
    <button class="btn ghost back" data-act="setup">‹ Späť na výber</button>`;
  }

  function viewWrite() {
    const gapMode = S.mode === 'doplnanie';
    let area;
    if (gapMode) {
      area = `<div class="paper nolines"><div class="gaptext" id="gaptext">${S.plan.map((p) => p.gap === undefined ? esc(p.t)
        : `<input class="gap" id="g${p.gap}" data-gap="${p.gap}" maxlength="2" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Doplň i alebo y v slove ${esc(p.word.slice(0, p.idx))}_${esc(p.word.slice(p.idx + 1))}">`).join('')}</div></div>
      <div class="keys" id="keys">${['i', 'í', 'y', 'ý'].map((c) => `<button data-key="${c}" aria-label="Doplniť ${c}">${c}</button>`).join('')}</div>`;
    } else {
      area = `<div class="paper"><textarea id="answer" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Sem píš diktát…" aria-label="Sem píš diktát"></textarea></div>
      <p class="tipline">Na iPade môžeš písať aj Apple Pencil priamo do riadkov, iPad písmo prepíše na text.</p>`;
    }
    return `
    <section class="card player" id="player">
      <button class="play" data-act="play" aria-label="Spustiť diktovanie">${ICON.play}</button>
      <div class="player-main"><div class="status"></div><div class="substatus"></div><div class="dots"></div></div>
      <div class="player-side">
        <button class="btn small" data-act="repeat">Zopakuj</button>
        <button class="btn small ghost" data-act="skip" hidden>Preskočiť</button>
      </div>
    </section>
    ${area}
    <div class="row" style="justify-content:space-between">
      <button class="btn ghost" data-act="quit">‹ Zrušiť</button>
      <button class="btn small mobile-only" data-act="repeat">Zopakuj</button>
      <button class="btn primary" data-act="check">Skontrolovať</button>
    </div>`;
  }

  function viewResult() {
    const r = S.result;
    const k = kid();
    const mist = r.mistakes;
    const stars = r.stars;
    const list = [];
    let full = '';
    if (r.mode === 'doplnanie') {
      for (const it of r.items) {
        if (!it.ok) list.push({ wrong: it.word.slice(0, it.idx) + (it.got || '_') + it.word.slice(it.idx + 1), right: it.word, kind: it.kind, tip: it.tip });
      }
      full = S.plan.map((p) => p.gap === undefined ? esc(p.t) : (() => { const it = r.items.find((x) => x.gap === p.gap); return `<span class="${it.ok ? 'ok' : 'bad'}">${esc(p.answer)}</span>`; })()).join('');
    } else {
      let group = null;
      for (const it of r.items) {
        const miss = !it.got ? 'chýba slovo' : !it.orig ? 'navyše' : null;
        if (miss) {
          if (group && group.kind === miss) { group.words.push(miss === 'navyše' ? it.got.w : it.orig.w); }
          else { group = { kind: miss, words: [miss === 'navyše' ? it.got.w : it.orig.w] }; list.push(group); }
          if (it.orig) full += `<span class="bad">${esc(it.orig.w)}</span>${esc(it.orig.p)} `;
          continue;
        }
        group = null;
        for (const is of it.issues) {
          const kind = is.kind === 'i/y' && is.rule ? is.rule : is.kind;
          list.push({ wrong: it.got ? it.got.w + (is.kind === 'interpunkcia' ? (it.got.p || ' ') : '') : '—', right: it.orig ? it.orig.w + (is.kind === 'interpunkcia' ? it.orig.p || '' : '') : '—', kind, tip: is.tip });
        }
        if (it.orig) full += `<span class="${it.issues.length ? 'bad' : 'ok'}">${esc(it.orig.w)}</span>${esc(it.orig.p)} `;
      }
      for (const g of list) {
        if (!g.words) continue;
        const ws = g.words.join(' ');
        if (g.kind === 'chýba slovo') Object.assign(g, { wrong: '—', right: ws, kind: g.words.length > 1 ? 'chýbajú slová' : 'chýba slovo', tip: g.words.length > 1 ? `Tieto slová ti vypadli: ${ws}. Nevadí. Nabudúce si ťukni na Zopakuj a ja to poviem znova.` : `Vypadlo ti slovo „${ws}“.` });
        else Object.assign(g, { wrong: ws, right: '—', kind: 'navyše', tip: g.words.length > 1 ? `Tieto slová v diktáte nie sú: ${ws}.` : `Slovo „${ws}“ v diktáte nie je.` });
      }
    }
    const reward = r.reward_cents;
    return `${topBar()}
    <section class="card result-hero">
      <div class="stars">${[1, 2, 3].map((n) => ICON.star(n <= stars)).join('')}</div>
      <div><h1>${mist === 0 ? 'Bez chyby!' : `${mist} ${chyb(mist).replace('chybu', 'chyba')}`}</h1>
      <p class="score">${r.mode === 'doplnanie' ? `Správne ${r.words - mist} z ${r.words} okienok` : `${r.words} slov · chyby v i/y: ${r.iy}`}</p></div>
      <div class="earned">${reward ? `<span class="coin"></span>+${euro(reward)}` : 'Bez odmeny'}</div>
    </section>
    ${!reward ? `<p class="notice">Odmena sa pripíše, keď ${sloveso(k.girl, 'napíšeš', 'napíšeš')} aspoň polovicu diktátu.</p>` : ''}
    <section class="card">
      <h2>${list.length ? 'Pozrime sa na chyby' : 'Paráda'}</h2>
      ${list.length ? `<div class="mistakes">${list.map((m, n) => `<article class="mistake">
          <div class="mistake-top"><span class="wrong">${esc(m.wrong)}</span><span class="arrow">→</span><span class="right">${esc(m.right)}</span><span class="tag ${esc(m.kind.split(' ')[0])}">${esc(m.kind)}</span></div>
          <p class="tip">${esc(m.tip)}</p>
          <button class="say" data-act="sayTip" data-n="${n}">${ICON.speaker} Prečítaj mi to</button>
        </article>`).join('')}</div>` : `<p class="perfect">Všetko správne. Si ${sloveso(k.girl, 'majster', 'majsterka')}!</p>`}
    </section>
    <section class="card">
      <h3>Správny text</h3>
      <p class="fulltext">${full}</p>
      ${r.mode === 'pisanie' ? `<h3>Tvoj text</h3><p class="yours">${esc(r.answer || '(prázdne)')}</p>` : ''}
    </section>
    <button class="btn primary big" data-act="setup">Nový diktát</button>
    ${cloudLine()}`;
    // eslint-disable-next-line no-unreachable
  }

  function viewWallet() {
    const rows = (child) => [
      ...Store.data.results.filter((r) => r.child === child && r.reward_cents).map((r) => ({ t: r.created_at, txt: `Diktát ${E.LENGTHS[r.length]?.label.toLowerCase() || ''}`, c: r.reward_cents, pay: false })),
      ...Store.data.payouts.filter((r) => r.child === child).map((r) => ({ t: r.created_at, txt: 'Vyplatené', c: -r.amount_cents, pay: true })),
    ].sort((a, b) => (a.t < b.t ? 1 : -1)).slice(0, 8);
    const date = (t) => new Date(t).toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' });
    return `${topBar()}
    <button class="btn ghost back" data-act="setup">‹ Späť</button>
    <h1>Peňaženka</h1>
    <div class="wallet-grid">${KIDS.map((k) => {
      const bal = Store.balance(k.name);
      const g = S.gate && S.gate.child === k.name ? S.gate : null;
      return `<section class="card purse">
        <h2>${k.name}</h2>
        <div class="amount"><span class="coin"></span>${euro(bal)}</div>
        <p class="hint">Za krátky diktát 0,25 €, za stredný 0,50 €, za dlhý 1 €.</p>
        ${g ? (g.ok ? `<div class="gate"><p>Odovzdal si ${k.name === 'Oto' ? 'Otovi' : 'Dite'} ${euro(bal)}?</p><div class="row"><button class="btn primary" data-act="payConfirm" data-v="${k.name}">Áno, odovzdal som</button><button class="btn ghost" data-act="payCancel">Nie</button></div></div>`
          : `<div class="gate"><p>Iba pre rodiča: koľko je ${g.a} × ${g.b}?</p><div class="row"><input id="gateIn" inputmode="numeric" autocomplete="off" aria-label="Výsledok"><button class="btn" data-act="gateCheck">OK</button><button class="btn ghost" data-act="payCancel">Zrušiť</button></div>${g.wrong ? '<p class="hint">To nie je správne, skús znova.</p>' : ''}</div>`)
          : `<button class="btn ${bal > 0 ? 'primary' : ''}" data-act="pay" data-v="${k.name}" ${bal > 0 ? '' : 'disabled'}>Vyplatiť ${euro(bal)}</button>`}
        <div class="history">${rows(k.name).map((r) => `<div class="hrow ${r.pay ? 'pay' : ''}"><span>${date(r.t)}</span><span>${esc(r.txt)}</span><b>${r.c > 0 ? '+' : '−'}${euro(Math.abs(r.c))}</b></div>`).join('') || '<p class="hint">Zatiaľ žiadne diktáty.</p>'}</div>
      </section>`;
    }).join('')}</div>
    ${cloudLine()}`;
  }

  function render() {
    const v = { setup: viewSetup, ready: viewReady, write: viewWrite, result: viewResult, wallet: viewWallet }[S.view];
    $app.innerHTML = v();
    const changed = render.last !== S.view; render.last = S.view;
    if (S.view === 'write') { updatePlayer(); if (S.mode === 'doplnanie') document.getElementById('g0')?.focus({ preventScroll: true }); }
    if (changed) window.scrollTo({ top: 0 });
  }

  // ---------------- akcie ----------------
  function generate() {
    const recent = lsGet('ucitel2-recent', []);
    S.dict = E.generate(S.length, [...S.letters], recent);
    lsSet('ucitel2-recent', [...S.dict.ids, ...recent].slice(0, 45));
    S.view = 'ready'; render();
  }

  function startWrite() {
    S.plan = S.mode === 'doplnanie' ? E.gapPlan(S.dict.text) : null;
    const sc = buildScript();
    Object.assign(P, { steps: sc.steps, chunks: sc.chunks, i: 0, playing: false, started: false, finished: false });
    S.view = 'write'; render();
    runPlayer(); // spustené ťuknutím na „Začať diktát“, takže iPad dovolí zvuk
  }

  async function check() {
    Voice.stop(); P.playing = false;
    const d = S.dict; const k = kid();
    let r;
    let answer = '';
    if (S.mode === 'doplnanie') {
      const answers = {};
      document.querySelectorAll('.gap').forEach((g) => { answers[g.dataset.gap] = g.value; });
      r = E.gradeGaps(S.plan, answers);
      answer = S.plan.map((p) => (p.gap === undefined ? p.t : (answers[p.gap] || '_'))).join('');
    } else {
      answer = document.getElementById('answer').value;
      r = E.grade(d.text, answer);
    }
    const ratio = r.words ? r.found / r.words : 0;
    const stars = r.mistakes === 0 ? 3 : r.mistakes <= 3 ? 2 : 1;
    const reward = ratio >= 0.5 ? E.LENGTHS[d.length].cents : 0;
    S.result = { ...r, mode: S.mode, stars: ratio >= 0.5 ? stars : 0, reward_cents: reward, answer };
    const id = uid();
    const created = new Date().toISOString();
    const details = S.mode === 'doplnanie'
      ? r.items.filter((x) => !x.ok).map((x) => ({ w: x.word, got: x.got, kind: x.kind }))
      : r.items.filter((x) => x.issues.length).map((x) => ({ w: x.orig?.w ?? null, got: x.got?.w ?? null, kinds: x.issues.map((i) => i.kind) }));
    Store.add('diktat_results', {
      id, child: k.name, length: d.length, letters: d.letters.join(''), mode: S.mode, speed: S.speed, text: d.text, answer: answer.slice(0, 6000),
      words: r.words, mistakes: r.mistakes, iy_mistakes: r.iy, stars: S.result.stars, reward_cents: reward, details,
    }, { id, created_at: created, child: k.name, length: d.length, stars: S.result.stars, mistakes: r.mistakes, reward_cents: reward }).then(() => { if (S.view === 'result') { const c = document.querySelector('.cloud'); if (c) c.outerHTML = cloudLine() || '<span></span>'; } });
    S.view = 'result'; render();
    const n = r.mistakes;
    const msg = ratio < 0.5 ? `${k.name}, skús nabudúce napísať celý diktát. Ja ti pomôžem.`
      : n === 0 ? `Paráda, ${k.name}! Bez jedinej chyby. Si ${sloveso(k.girl, 'borec', 'borka')}!`
      : n <= 3 ? `Dobrá práca, ${k.name}! Máš ${n} ${chyb(n)}. Pozrime sa na ne spolu.`
      : `${sloveso(k.girl, 'Zvládol', 'Zvládla')} si to, ${k.name}! Pozrime sa spolu na chyby, nabudúce to bude lepšie.`;
    Voice.stop(); Voice.say(msg, 0.95);
  }

  $app.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act], [data-key]');
    if (!b) return;
    if (b.dataset.key) { fillGap(b.dataset.key); return; }
    const act = b.dataset.act; const v = b.dataset.v;
    switch (act) {
      case 'child': S.child = v; savePrefs(); render(); break;
      case 'length': S.length = v; savePrefs(); render(); break;
      case 'letter': S.letters.has(v) ? S.letters.delete(v) : S.letters.add(v); savePrefs(); render(); break;
      case 'allLetters': S.letters = S.letters.size === E.LETTERS.length ? new Set() : new Set(E.LETTERS); savePrefs(); render(); break;
      case 'mode': S.mode = v; savePrefs(); render(); break;
      case 'speed': S.speed = v; savePrefs(); render(); break;
      case 'sample': Voice.stop(); Voice.say(`Ahoj ${kid().name}! Ja ti budem diktovať. Takto rýchlo: Rýchly rys beží lesom.`, SPEEDS[S.speed].rate); break;
      case 'generate': case 'regen': generate(); break;
      case 'start': startWrite(); break;
      case 'play': P.playing ? pausePlayer() : (P.finished ? (P.i = 0, P.finished = false, runPlayer()) : runPlayer()); break;
      case 'repeat': repeatChunk(); break;
      case 'skip': skipIntro(); break;
      case 'check': check(); break;
      case 'quit': Voice.stop(); S.view = 'ready'; render(); break;
      case 'setup': Voice.stop(); S.gate = null; S.view = 'setup'; render(); break;
      case 'wallet': Voice.stop(); S.view = 'wallet'; render(); Store.sync().then(() => S.view === 'wallet' && render()); break;
      case 'sayTip': {
        const it = document.querySelectorAll('.mistake')[+b.dataset.n];
        Voice.stop(); Voice.say(`${it.querySelector('.right').textContent}. ${it.querySelector('.tip').textContent}`, 0.92); break;
      }
      case 'pay': S.gate = { child: v, a: 6 + Math.floor(Math.random() * 4), b: 6 + Math.floor(Math.random() * 4) }; render(); document.getElementById('gateIn')?.focus(); break;
      case 'gateCheck': {
        const val = +document.getElementById('gateIn').value;
        if (val === S.gate.a * S.gate.b) S.gate.ok = true; else S.gate.wrong = true;
        render(); break;
      }
      case 'payCancel': S.gate = null; render(); break;
      case 'payConfirm': {
        const amount = Store.balance(v);
        if (amount > 0) {
          const id = uid();
          Store.add('diktat_payouts', { id, child: v, amount_cents: amount }, { id, created_at: new Date().toISOString(), child: v, amount_cents: amount }).then(() => S.view === 'wallet' && render());
        }
        S.gate = null; render(); break;
      }
      default: break;
    }
  });
  $app.addEventListener('change', (e) => {
    if (e.target.id === 'sayPunct') { S.sayPunct = e.target.checked; savePrefs(); }
    if (e.target.id === 'voice') { S.voiceURI = e.target.value; savePrefs(); }
  });
  $app.addEventListener('keydown', (e) => { if (e.target.id === 'gateIn' && e.key === 'Enter') document.querySelector('[data-act="gateCheck"]')?.click(); });

  // doplňovačka: po napísaní písmena skok na ďalšie okienko
  let lastGap = null;
  $app.addEventListener('focusin', (e) => { if (e.target.classList?.contains('gap')) lastGap = e.target; });
  $app.addEventListener('input', (e) => {
    const g = e.target;
    if (!g.classList?.contains('gap')) return;
    const ch = [...g.value.toLowerCase()].filter((c) => 'iíyý'.includes(c)).pop() || '';
    g.value = ch;
    if (ch) focusNext(g);
  });
  function fillGap(c) {
    const g = lastGap && document.body.contains(lastGap) ? lastGap : document.querySelector('.gap');
    if (!g) return;
    g.value = c; focusNext(g);
  }
  function focusNext(g) {
    const all = [...document.querySelectorAll('.gap')];
    const next = all[all.indexOf(g) + 1];
    if (next) { next.focus({ preventScroll: false }); lastGap = next; }
  }

  render();
  Store.sync().then(() => { if (S.view === 'setup' || S.view === 'wallet') render(); });
})();
