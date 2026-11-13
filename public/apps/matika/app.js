/* Matika – počítanie pre Ota (4. ročník). Rovnaký princíp ako diktáty v Slovine:
   - dva režimy: „Na papier“ (červená, ako diktát – počíta do zošita, potom porovná a označí chyby, ocko potvrdí kódom)
     a „Na tablete“ (zelená, ako doplňovačka – píše výsledky do appky, appka skontroluje sama),
   - kontrola len raz, chyby sa neprepisujú, iba vysvetlia; každé cvičenie sa uloží ako vysvetlené / nevysvetlené
     (vysvetlené = vypočul si vysvetlenie ku každej chybe, dá sa dovysvetliť neskôr v Uložených),
   - odmena = XP a levely; za 10 bezchybných ťažkých cvičení na papier za týždeň si vyberie zážitok s ockom alebo s mamou,
   - kalendár: v každom dni malé číslo, koľko cvičení urobil (červené = na papier, zelené = na tablete).
   Dáta: Supabase „stullers home“, tabuľka matika_events (len čítanie a pridávanie). Bez pripojenia sa ukladá do zariadenia. */
(() => {
  const E = window.MATIKA_ENGINE;
  const $app = document.getElementById('app');
  const CHILD = 'Oto';
  const SUPA_URL = 'https://vupzrryhxnninttjyges.supabase.co';
  const SUPA_KEY = 'sb_publishable_lTU6RvAAgtRVeyvmx7BBeg_ag4_TZXX';
  const TABLE = 'matika_events';
  const AVATAR = 'mascot.png';
  const WEEK_GOAL = 10;
  // Rovnaký kód rodiča ako v Slovine; v kóde je len jeho SHA-256 odtlačok.
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
  const plural = (n, one, few, many) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);
  const chyb = (n) => `${n} ${plural(n, 'chyba', 'chyby', 'chýb')}`;
  const prikladov = (n) => `${n} ${plural(n, 'príklad', 'príklady', 'príkladov')}`;
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const weekStart = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const weekKey = (d) => dayKey(weekStart(d));
  const MONTHS = ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december'];
  const fmtDate = (iso) => { const d = new Date(iso); return `${d.getDate()}. ${d.getMonth() + 1}. ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const fmtShort = (d) => `${d.getDate()}. ${d.getMonth() + 1}.`;

  // ---------------- ikony ----------------
  const I = {
    trophy: '<svg viewBox="0 0 32 32"><path d="M9 4h14v6a7 7 0 0 1-14 0z" fill="#FFD23F" stroke="#120A2E" stroke-width="2.5" stroke-linejoin="round"/><path d="M9 6H4v2a5 5 0 0 0 5 5M23 6h5v2a5 5 0 0 1-5 5" fill="none" stroke="#120A2E" stroke-width="2.5"/><path d="M13 17h6l1 5h-8z" fill="#FFD23F" stroke="#120A2E" stroke-width="2.5" stroke-linejoin="round"/><rect x="9" y="22" width="14" height="5" rx="1.5" fill="#FF9A3C" stroke="#120A2E" stroke-width="2.5"/></svg>',
    play: '<svg viewBox="0 0 32 32"><path d="M9 5l18 11L9 27z" fill="currentColor" stroke="#120A2E" stroke-width="2" stroke-linejoin="round"/></svg>',
    cal: '<svg viewBox="0 0 32 32"><rect x="4" y="7" width="24" height="21" rx="4" fill="currentColor" stroke="#120A2E" stroke-width="2"/><path d="M4 13h24" stroke="#120A2E" stroke-width="2.5"/><path d="M10 4v6M22 4v6" stroke="#120A2E" stroke-width="3" stroke-linecap="round"/></svg>',
    saved: '<svg viewBox="0 0 32 32"><path d="M8 4h16a2 2 0 0 1 2 2v23l-10-6-10 6V6a2 2 0 0 1 2-2z" fill="currentColor" stroke="#120A2E" stroke-width="2" stroke-linejoin="round"/></svg>',
    gift: '<svg viewBox="0 0 32 32"><rect x="5" y="13" width="22" height="15" rx="2" fill="#FF5FA8" stroke="#120A2E" stroke-width="2.5"/><rect x="3" y="9" width="26" height="6" rx="2" fill="#FF8CC4" stroke="#120A2E" stroke-width="2.5"/><path d="M16 9v19" stroke="#120A2E" stroke-width="2.5"/><path d="M16 9c-3-6-9-5-8-1s8 1 8 1c0 0 7 3 8-1s-5-5-8 1" fill="#FFD23F" stroke="#120A2E" stroke-width="2.2" stroke-linejoin="round"/></svg>',
    gifttab: '<svg viewBox="0 0 32 32"><rect x="5" y="13" width="22" height="15" rx="2" fill="currentColor" stroke="#120A2E" stroke-width="2"/><rect x="3" y="9" width="26" height="6" rx="2" fill="currentColor" stroke="#120A2E" stroke-width="2"/><path d="M16 9v19" stroke="#120A2E" stroke-width="2.5"/></svg>',
    pencil: '<svg viewBox="0 0 32 32"><path d="M6 26l2-7L22 5l5 5-14 14z" fill="#FFD23F" stroke="#120A2E" stroke-width="2.5" stroke-linejoin="round"/><path d="M6 26l2-7 5 5z" fill="#FFE8B0" stroke="#120A2E" stroke-width="2"/></svg>',
    tablet: '<svg viewBox="0 0 32 32"><rect x="6" y="3" width="20" height="26" rx="4" fill="#3FD4FF" stroke="#120A2E" stroke-width="2.5"/><circle cx="16" cy="25" r="1.6" fill="#120A2E"/><path d="M10 9h12M10 14h8" stroke="#120A2E" stroke-width="2.5" stroke-linecap="round"/></svg>',
    speaker: '<svg viewBox="0 0 32 32"><path d="M5 12h5l7-6v20l-7-6H5z" fill="currentColor" stroke="#120A2E" stroke-width="2" stroke-linejoin="round"/><path d="M21 11a6 6 0 0 1 0 10M24 7a11 11 0 0 1 0 18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
    print: '<svg viewBox="0 0 32 32"><rect x="9" y="4" width="14" height="8" fill="#fff" stroke="#120A2E" stroke-width="2.2"/><rect x="4" y="11" width="24" height="12" rx="3" fill="currentColor" stroke="#120A2E" stroke-width="2.2"/><rect x="9" y="19" width="14" height="9" fill="#fff" stroke="#120A2E" stroke-width="2.2"/></svg>',
  };
  const shield = (fill = '#3FD4FF', dark = '#1590BD') => `<svg viewBox="0 0 64 64"><path d="M32 3l25 9v17c0 16-11 26-25 32C18 55 7 45 7 29V12z" fill="${dark}" stroke="#120A2E" stroke-width="4" stroke-linejoin="round"/><path d="M32 9l19 7v13c0 12-8 20-19 25-11-5-19-13-19-25V16z" fill="${fill}"/></svg>`;
  const STAR = '<svg class="star" viewBox="0 0 48 48"><path d="M24 4l6 12.5 13.5 2-9.8 9.5 2.3 13.5L24 35.2 12 41.5l2.3-13.5L4.5 18.5l13.5-2z"/></svg>';

  // ---------------- levely ----------------
  // Na ďalší level treba 40 XP, potom vždy o 20 viac (40, 60, 80, ...).
  const levelOf = (xp) => {
    let lv = 1; let need = 40; let base = 0;
    while (xp >= base + need) { base += need; lv++; need += 20; }
    return { lv, into: xp - base, need, base };
  };
  const levelStart = (lv) => { let b = 0; let need = 40; for (let i = 1; i < lv; i++) { b += need; need += 20; } return b; };
  const MULT = { lahke: 1, stredne: 2, tazke: 3 };
  /** XP za cvičenie: každý správny príklad 1/2/3 podľa úrovne, bez chyby bonus, na papier dvojnásobok. */
  const xpFor = (ex) => {
    const m = MULT[ex.level] || 1;
    const good = ex.items.length - ex.wrong.length;
    let xp = good * m + (ex.wrong.length === 0 ? 5 * m : 0);
    if (ex.mode === 'papier') xp *= 2;
    return xp;
  };
  const SKIN_EVERY = 5;

  // ---------------- zážitky ----------------
  const TRIPS = [
    { id: 'kino', em: '🎬', name: 'Kino' },
    { id: 'bazen', em: '🏊', name: 'Bazén' },
    { id: 'zmrzlina', em: '🍦', name: 'Zmrzlina' },
    { id: 'trampoliny', em: '🤸', name: 'Trampolíny' },
    { id: 'bowling', em: '🎳', name: 'Bowling' },
    { id: 'bicykel', em: '🚲', name: 'Výlet na bicykli' },
    { id: 'lezenie', em: '🧗', name: 'Lezecká stena' },
    { id: 'pizza', em: '🍕', name: 'Pizza spolu' },
    { id: 'vlastne', em: '💡', name: 'Vlastný nápad' },
  ];
  const WHO = { ocko: 'S ockom', mama: 'S mamou' };

  // ---------------- úložisko ----------------
  const Store = {
    data: lsGet('matika-data', { events: [], pending: [] }),
    cloud: 'unknown',
    save() { lsSet('matika-data', this.data); },
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
        const rows = await this.api(`${TABLE}?select=id,created_at,child,ex_id,kind,data&child=eq.${CHILD}&order=created_at.asc&limit=5000`);
        const pendingIds = new Set(this.data.pending.map((p) => p.id));
        this.data.events = [...rows, ...this.data.events.filter((r) => pendingIds.has(r.id))];
        this.cloud = this.data.pending.length ? 'pending' : 'ok';
        this.save();
      } catch { this.cloud = 'off'; }
    },
    async flush() {
      for (const p of [...this.data.pending]) {
        try {
          await this.api(TABLE, { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(p) });
          this.data.pending = this.data.pending.filter((x) => x.id !== p.id);
          this.save();
        } catch { this.cloud = 'off'; return; }
      }
      if (!this.data.pending.length && this.cloud !== 'off') this.cloud = 'ok';
    },
    add(kind, exId, data) {
      const row = { id: uid(), created_at: new Date().toISOString(), child: CHILD, ex_id: exId, kind, data };
      this.data.events.push(row);
      this.data.pending.push(row);
      this.save();
      this.flush().then(() => { if (this.data.pending.length) this.cloud = 'pending'; });
      return row;
    },
  };

  /** Zloží udalosti do cvičení a prianí. */
  function model() {
    const ex = new Map(); const wishes = new Map();
    for (const ev of Store.data.events) {
      if (ev.child !== CHILD) continue;
      const d = ev.data || {};
      if (ev.kind === 'done') ex.set(ev.ex_id, { id: ev.ex_id, created_at: ev.created_at, ...d, heard: new Set(), confirmed: false, xp: d.mode === 'tablet' ? (d.xp || 0) : 0 });
      else if (ev.kind === 'heard') { const e = ex.get(ev.ex_id); if (e) e.heard.add(d.idx); }
      else if (ev.kind === 'confirmed') { const e = ex.get(ev.ex_id); if (e && !e.confirmed) { e.confirmed = true; e.xp = d.xp || 0; } }
      else if (ev.kind === 'wish') { if (!wishes.has(d.week)) wishes.set(d.week, { id: ev.ex_id, created_at: ev.created_at, ...d, done: false }); }
      else if (ev.kind === 'wish_done') { for (const w of wishes.values()) if (w.id === ev.ex_id) w.done = true; }
    }
    const list = [...ex.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const xp = list.reduce((a, e) => a + (e.xp || 0), 0);
    return { list, wishes, xp };
  }
  const statusOf = (e) => {
    if (e.mode === 'papier' && !e.confirmed) return 'wait';
    if (!e.wrong.length) return 'perfect';
    return e.wrong.every((i) => e.heard.has(i)) ? 'explained' : 'unexplained';
  };
  const STATUS = {
    wait: ['Čaká na ocka', 'yellow'],
    perfect: ['Bez chyby', 'green'],
    explained: ['Vysvetlené', 'green'],
    unexplained: ['Nevysvetlené', 'red'],
  };
  const countsForGoal = (e) => e.mode === 'papier' && e.level === 'tazke' && e.confirmed && e.wrong.length === 0;
  const weekGoal = (M, wk = weekKey(new Date())) => M.list.filter((e) => countsForGoal(e) && weekKey(new Date(e.created_at)) === wk).length;

  // ---------------- hlas (vysvetlenia) ----------------
  const Voice = {
    ok: 'speechSynthesis' in window,
    voices: [],
    load() {
      if (!this.ok) return;
      const score = (v) => (/premium|enhanced|vylepš|neural|natural/i.test(v.name) ? 4 : 0) + (/laura/i.test(v.name) ? 1 : 0);
      this.voices = speechSynthesis.getVoices().filter((v) => /^sk/i.test(v.lang)).sort((a, b) => score(b) - score(a));
    },
    token: 0,
    stop() { this.token++; if (this.ok) speechSynthesis.cancel(); },
    /** Prečíta text. Promise vráti true, ak dočítal do konca (nebol prerušený). */
    say(text) {
      this.stop();
      const tok = this.token;
      return new Promise((resolve) => {
        if (!this.ok || !this.voices.length) { resolve(false); return; }
        const u = new SpeechSynthesisUtterance(text);
        u.voice = this.voices[0]; u.lang = 'sk-SK'; u.rate = 0.98; u.pitch = 1.08;
        let done = false;
        const finish = (okEnd) => { if (!done) { done = true; clearTimeout(t); resolve(okEnd && tok === this.token); } };
        const t = setTimeout(() => finish(true), 3000 + text.length * 110);
        u.onend = () => finish(true); u.onerror = () => finish(false);
        this.keep = u;
        speechSynthesis.speak(u);
      });
    },
  };
  if (Voice.ok) { Voice.load(); speechSynthesis.addEventListener?.('voiceschanged', () => Voice.load()); }

  // ---------------- stav ----------------
  const prefs = lsGet('matika-prefs', {});
  const S = {
    tab: 'play', // play | cal | saved | rewards
    view: 'home', // home | paper | check | tablet | result | detail
    op: prefs.op || 'krat', level: prefs.level || 'stredne', count: prefs.count || 'kratke', mode: prefs.mode || 'tablet',
    items: [], answers: [], sel: 0, marks: new Set(), exId: null, startedAt: null,
    gateMsg: '', filter: 'all', month: null, detailId: null,
    wishWho: null, wishWhat: null, wishText: '', wishMsg: '',
    prevLevel: null,
  };
  const savePrefs = () => lsSet('matika-prefs', { op: S.op, level: S.level, count: S.count, mode: S.mode });

  // ---------------- časti obrazovky ----------------
  function hud(M) {
    const L = levelOf(M.xp);
    const pct = Math.min(100, Math.round((L.into / L.need) * 100));
    const wk = weekGoal(M);
    return `<header class="hud">
      <div class="player">
        <img class="avatar" src="${AVATAR}" alt="">
        <div class="player-info">
          <span class="player-name out">${CHILD}</span>
          <div class="xpbar" title="XP"><i style="width:${pct}%"></i><span>${L.into} / ${L.need} XP</span></div>
        </div>
        <div class="lvl" aria-label="Level ${L.lv}">${shield()}<small>LEVEL</small><b class="out">${L.lv}</b></div>
      </div>
      <button class="week" data-act="tab" data-tab="rewards" aria-label="Týždenný cieľ ${wk} z ${WEEK_GOAL}">${I.trophy}<span class="out">${Math.min(wk, WEEK_GOAL)}/${WEEK_GOAL}</span></button>
    </header>`;
  }

  function nav(M) {
    const unexp = M.list.filter((e) => ['unexplained', 'wait'].includes(statusOf(e))).length;
    const tabs = [['play', 'Hrať', I.play], ['cal', 'Kalendár', I.cal], ['saved', 'Uložené', I.saved], ['rewards', 'Odmeny', I.gifttab]];
    return `<nav class="nav"><div class="nav-in">${tabs.map(([id, name, ico]) => `<button class="tab" data-act="tab" data-tab="${id}" ${S.tab === id ? 'aria-current="page"' : ''}>${ico}<span>${name}</span>${id === 'saved' && unexp ? `<span class="dot">${unexp}</span>` : ''}</button>`).join('')}</div></nav>`;
  }

  function cloudLine() {
    const t = { ok: 'Uložené v cloude', pending: 'Čaká na odoslanie do cloudu', off: 'Bez internetu – ukladám do tohto zariadenia', unknown: '' }[Store.cloud];
    return t ? `<p class="cloud">${t}</p>` : '';
  }

  // ---------------- HRAŤ ----------------
  function viewHome(M) {
    const ops = [['plus', '+', 'Sčítanie', 'var(--cyan)'], ['minus', '−', 'Odčítanie', 'var(--pink)'], ['krat', '·', 'Násobilka', 'var(--yellow)'], ['deleno', ':', 'Delenie', 'var(--green)'], ['mix', '?', 'Mix', 'var(--orange)']];
    const info = E.LEVEL_INFO[S.op];
    const wk = weekGoal(M);
    return `${hud(M)}
    <section class="panel">
      <span class="label">1 · Čo budeme počítať</span>
      <div class="ops">${ops.map(([id, sym, name, c]) => `<button class="op" data-act="op" data-v="${id}" aria-pressed="${S.op === id}" style="--c:${c}"><span class="sym">${sym}</span><span>${name}</span></button>`).join('')}</div>
    </section>
    <section class="panel">
      <span class="label">2 · Úroveň</span>
      <div class="levels">${Object.entries(E.LEVELS).map(([id, l]) => `<button class="level" data-act="level" data-v="${id}" aria-pressed="${S.level === id}"><b>${l.name}<span class="pips">${[1, 2, 3].map((i) => `<i class="${i <= l.n ? 'on' : ''}"></i>`).join('')}</span></b><small>${esc(info[id])}</small></button>`).join('')}</div>
      <span class="label">3 · Koľko príkladov</span>
      <div class="seg">${Object.entries(E.COUNTS).map(([id, c]) => `<button data-act="count" data-v="${id}" aria-pressed="${S.count === id}">${c.name}<small>${prikladov(c.n)}</small></button>`).join('')}</div>
    </section>
    <section class="panel">
      <span class="label">4 · Ako budeš počítať</span>
      <div class="modes">
        <button class="mode paper" data-act="mode" data-v="papier" aria-pressed="${S.mode === 'papier'}"><span class="mico">${I.pencil}</span><span><b>Na papier</b><small>Počítaš do zošita, potom porovnáš. Ocko potvrdí kódom.</small></span></button>
        <button class="mode tabl" data-act="mode" data-v="tablet" aria-pressed="${S.mode === 'tablet'}"><span class="mico">${I.tablet}</span><span><b>Na tablete</b><small>Výsledky píšeš sem, appka ich hneď skontroluje.</small></span></button>
      </div>
      <div class="goal-note">${I.trophy}<span>Týždenná výzva: <b>${Math.min(wk, WEEK_GOAL)} z ${WEEK_GOAL}</b> bezchybných <b>ťažkých</b> cvičení <b>na papier</b>. Keď ich máš 10, vyberieš si zážitok s ockom alebo s mamou!</span></div>
    </section>
    <button class="btn yellow big" data-act="start">${I.play.replace('<svg', '<svg class="ico"')} Štart</button>
    ${cloudLine()}`;
  }

  function exTitle(ex) {
    const opName = ex.op === 'mix' ? 'Mix' : E.OPS[ex.op].name;
    return `${opName} · ${E.LEVELS[ex.level].name}`;
  }

  function viewPaper() {
    const ex = { op: S.op, level: S.level };
    return `<div class="bar noprint"><button class="x" data-act="quit" aria-label="Zrušiť">×</button><h2 class="out">${exTitle(ex)}</h2><span class="tag red">Na papier</span></div>
    <section class="panel noprint"><p>Odpíš si príklady do zošita a vypočítaj ich. ${S.level === 'tazke' && ['plus', 'minus'].includes(S.op) ? 'Sčítanie a odčítanie počítaj <b>pod seba</b>. ' : ''}Keď máš všetko, ťukni na <b>Mám vypočítané</b>.</p></section>
    <section class="sheet-paper">
      <h3>${esc(exTitle(ex))} – ${prikladov(S.items.length)}</h3>
      <div class="tasks">${S.items.map((it, i) => `<div class="task"><span class="n">${i + 1}.</span><span class="q">${E.text(it)} =</span><span class="line"></span></div>`).join('')}</div>
    </section>
    <div class="row noprint">
      <button class="btn dark" data-act="print">${I.print.replace('<svg', '<svg class="ico"')} Vytlačiť</button>
      <button class="btn red" data-act="paperDone">Mám vypočítané</button>
    </div>`;
  }

  function viewCheck() {
    const n = S.marks.size;
    return `<div class="bar"><button class="x" data-act="quit" aria-label="Zrušiť">×</button><h2 class="out">Porovnaj so zošitom</h2><span class="tag red">Na papier</span></div>
    <section class="panel"><p>Tu sú správne výsledky. <b>Ťukni na každý príklad, ktorý máš v zošite inak.</b> Buď poctivý – ocko to skontroluje. Kontrola je len raz.</p></section>
    <div class="check-list">${S.items.map((it, i) => `<button class="mark" data-act="toggleMark" data-i="${i}" aria-pressed="${S.marks.has(i)}"><span class="n">${i + 1}.</span><span class="q">${E.text(it)} = <b>${E.fmt(it.ans)}</b></span><span class="state">${S.marks.has(i) ? 'Mám zle' : 'Mám dobre'}</span></button>`).join('')}</div>
    <button class="btn red big" data-act="paperSave">Uložiť – ${n ? chyb(n) : 'bez chyby'}</button>`;
  }

  function slotHtml(i) {
    const v = S.answers[i] ?? '';
    return `<span class="slot">${esc(v)}</span>`;
  }
  function viewTablet() {
    const filled = S.answers.filter((a) => a !== '' && a != null).length;
    const all = filled === S.items.length;
    return `<div class="bar"><button class="x" data-act="quit" aria-label="Zrušiť">×</button><h2 class="out">${exTitle({ op: S.op, level: S.level })}</h2><span class="tag green">${filled}/${S.items.length}</span></div>
    <div class="progress" aria-hidden="true"><i style="width:${(filled / S.items.length) * 100}%"></i></div>
    <div class="grid">${S.items.map((it, i) => `<button class="card ${S.sel === i ? 'sel' : ''}" data-act="sel" data-i="${i}"><span class="n">${i + 1}</span><span class="q">${E.text(it)} =</span>${slotHtml(i)}</button>`).join('')}</div>
    <button class="btn green big" data-act="tabletCheck" ${all ? '' : 'disabled'}>Skontrolovať${all ? '' : ` (${S.items.length - filled} chýba)`}</button>
    <div class="keys"><div class="keys-in">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => `<button class="key" data-act="key" data-k="${d}">${d}</button>`).join('')}
      <button class="key del wide" data-act="key" data-k="del" aria-label="Zmazať">⌫</button>
      ${all ? '<button class="key go wide" data-act="tabletCheck" style="grid-column: span 6">Skontrolovať</button>' : '<button class="key next wide" data-act="key" data-k="next" style="grid-column: span 6">Ďalší ➜</button>'}
    </div></div>`;
  }

  function wrongList(ex) {
    if (!ex.wrong.length) return '';
    return `<section class="panel"><h3>Chyby – vypočuj si prečo</h3><p class="hint">Ťukni na <b>Prečo?</b> pri každej chybe. Keď si vypočuješ všetky, cvičenie bude <b>vysvetlené</b>.</p>
      <div class="grid one">${ex.wrong.map((i) => {
        const it = ex.items[i];
        const given = ex.given ? ex.given[i] : null;
        return `<div class="card bad"><span class="n">${i + 1}</span><span class="q">${E.text(it)} =</span><span class="slot">${given != null && given !== '' ? `<s>${esc(/^\d+$/.test(given) ? E.fmt(Number(given)) : given)}</s>` : ''}<span class="right">${E.fmt(it.ans)}</span></span><button class="why ${ex.heard.has(i) ? 'heard' : ''}" data-act="why" data-ex="${ex.id}" data-i="${i}">${ex.heard.has(i) ? '✓ Prečo' : 'Prečo?'}</button></div>`;
      }).join('')}</div></section>`;
  }

  function statusTags(ex) {
    const st = statusOf(ex);
    const [t, c] = STATUS[st];
    const heard = ex.wrong.filter((i) => ex.heard.has(i)).length;
    let extra = '';
    if (ex.wrong.length && st !== 'perfect') extra = `<span class="tag gray">Vysvetlenia ${heard}/${ex.wrong.length}</span>`;
    if (ex.mode === 'papier' && ex.confirmed) extra += `<span class="tag green">Potvrdil ocko</span>`;
    return `<span class="tag ${c}">${t}</span>${extra}`;
  }

  function gateBox(ex) {
    return `<div class="gate"><b>Ocko alebo mama: skontrolujte zošit a potvrďte kódom.</b>
      <div class="row"><input id="code" type="password" inputmode="numeric" autocomplete="off" placeholder="kód" aria-label="Kód rodiča"><button class="btn yellow" data-act="confirm" data-ex="${ex.id}">Potvrdiť</button></div>
      ${S.gateMsg ? `<p class="err">${esc(S.gateMsg)}</p>` : ''}
      <p class="hint">Ak ocko teraz nie je doma, cvičenie ostáva uložené v <b>Uložených</b> a potvrdí ho neskôr.</p></div>`;
  }

  function viewResult(M) {
    const ex = M.list.find((e) => e.id === S.exId);
    if (!ex) return viewHome(M);
    const total = ex.items.length; const bad = ex.wrong.length;
    const stars = bad === 0 ? 3 : bad <= Math.ceil(total * 0.15) ? 2 : bad <= Math.ceil(total * 0.4) ? 1 : 0;
    const xp = ex.mode === 'tablet' || ex.confirmed ? ex.xp : xpFor(ex);
    const title = bad === 0 ? 'Bez chyby!' : stars >= 2 ? 'Super!' : stars === 1 ? 'Dobre!' : 'Nevzdávaj to!';
    return `<div class="bar"><button class="x" data-act="home" aria-label="Domov">×</button><h2 class="out">${exTitle(ex)}</h2><span class="tag ${ex.mode === 'papier' ? 'red' : 'green'}">${ex.mode === 'papier' ? 'Na papier' : 'Na tablete'}</span></div>
    <section class="panel hero">
      <div class="stars">${[1, 2, 3].map((i) => STAR.replace('class="star"', `class="star ${i <= stars ? 'on' : ''}"`)).join('')}</div>
      <h1 class="out">${title}</h1>
      <p class="score">Správne ${total - bad} z ${total}${bad ? ` · ${chyb(bad)}` : ''}</p>
      ${ex.mode === 'papier' && !ex.confirmed ? `<span class="xpgain">+${xp} XP po potvrdení</span>` : `<span class="xpgain">+${xp} XP</span>`}
      <div class="status-line">${statusTags(ex)}</div>
      ${ex.mode === 'papier' && !ex.confirmed ? gateBox(ex) : ''}
      ${countsForGoal(ex) ? `<div class="goal-note">${I.trophy}<span>Týždenná výzva: <b>${Math.min(weekGoal(M), WEEK_GOAL)} z ${WEEK_GOAL}</b></span></div>` : ''}
    </section>
    ${wrongList(ex)}
    <div class="row"><button class="btn dark" data-act="home">Domov</button><button class="btn yellow" data-act="again">Ďalšie cvičenie</button></div>`;
  }

  // ---------------- KALENDÁR ----------------
  function viewCal(M) {
    const now = new Date();
    const m = S.month || { y: now.getFullYear(), m: now.getMonth() };
    const first = new Date(m.y, m.m, 1);
    const start = weekStart(first);
    const per = {};
    for (const e of M.list) {
      const k = dayKey(new Date(e.created_at));
      per[k] = per[k] || { r: 0, g: 0 };
      if (e.mode === 'papier') per[k].r++; else per[k].g++;
    }
    const cells = [];
    const d = new Date(start);
    for (let i = 0; i < 42; i++) {
      const k = dayKey(d); const c = per[k];
      cells.push(`<div class="day ${d.getMonth() !== m.m ? 'out' : ''} ${k === dayKey(now) ? 'today' : ''}" aria-label="${d.getDate()}. ${MONTHS[d.getMonth()]}${c ? `: na papier ${c.r}, na tablete ${c.g}` : ''}"><span class="d">${d.getDate()}</span><span class="cnt">${c && c.r ? `<i class="r">${c.r}</i>` : ''}${c && c.g ? `<i class="g">${c.g}</i>` : ''}</span></div>`);
      d.setDate(d.getDate() + 1);
      if (i >= 34 && d.getMonth() !== m.m) break;
    }
    // posledné 4 týždne – výzva
    const weeks = [];
    for (let w = 0; w < 4; w++) {
      const ws = weekStart(now); ws.setDate(ws.getDate() - 7 * w);
      const we = new Date(ws); we.setDate(we.getDate() + 6);
      const n = weekGoal(M, dayKey(ws));
      weeks.push(`<div class="wk"><span>${fmtShort(ws)} – ${fmtShort(we)}</span><div class="progress"><i style="width:${Math.min(100, (n / WEEK_GOAL) * 100)}%"></i></div><b>${n}/${WEEK_GOAL}</b></div>`);
    }
    const weekCount = M.list.filter((e) => weekKey(new Date(e.created_at)) === weekKey(now));
    return `${hud(M)}
    <section class="panel">
      <div class="cal-head"><button class="btn small dark" data-act="month" data-d="-1" aria-label="Predchádzajúci mesiac">‹</button><h2 class="out">${MONTHS[m.m]} ${m.y}</h2><button class="btn small dark" data-act="month" data-d="1" aria-label="Ďalší mesiac">›</button></div>
      <div class="cal">${['po', 'ut', 'st', 'št', 'pi', 'so', 'ne'].map((x) => `<span class="dn">${x}</span>`).join('')}${cells.join('')}</div>
      <div class="legend"><span><i class="r"></i>Na papier</span><span><i class="g"></i>Na tablete</span><span>Číslo = koľko cvičení v ten deň</span></div>
    </section>
    <section class="panel">
      <h3>Tento týždeň</h3>
      <p>Na papier: <b>${weekCount.filter((e) => e.mode === 'papier').length}</b> · Na tablete: <b>${weekCount.filter((e) => e.mode === 'tablet').length}</b></p>
      <span class="label">Výzva: bezchybné ťažké na papier</span>
      <div class="weeks">${weeks.join('')}</div>
    </section>`;
  }

  // ---------------- ULOŽENÉ ----------------
  function viewSaved(M) {
    const F = { all: 'Všetky', unexplained: 'Nevysvetlené', wait: 'Čaká na ocka', explained: 'Vysvetlené' };
    const list = M.list.filter((e) => S.filter === 'all' || statusOf(e) === S.filter || (S.filter === 'explained' && statusOf(e) === 'perfect'));
    return `${hud(M)}
    <section class="panel">
      <h2 class="out">Uložené cvičenia</h2>
      <p class="hint">Každé cvičenie je tu. <b>Nevysvetlené</b> = ešte si nevypočul vysvetlenie ku každej chybe. Ťukni a dovysvetli.</p>
      <div class="filters">${Object.entries(F).map(([id, n]) => `<button data-act="filter" data-v="${id}" aria-pressed="${S.filter === id}">${n}</button>`).join('')}</div>
    </section>
    <div class="list">${list.length ? list.map((e) => {
      const [t, c] = STATUS[statusOf(e)];
      return `<button class="item ${e.mode === 'papier' ? 'paper' : ''}" data-act="detail" data-ex="${e.id}"><span class="stripe"></span><span class="t"><b>${exTitle(e)}</b><small>${fmtDate(e.created_at)} · ${e.mode === 'papier' ? 'Na papier' : 'Na tablete'} · ${e.items.length - e.wrong.length}/${e.items.length} správne</small></span><span class="st"><span class="tag ${c}">${t}</span>${e.xp ? `<small>+${e.xp} XP</small>` : ''}</span></button>`;
    }).join('') : '<p class="empty">Zatiaľ tu nič nie je.</p>'}</div>
    ${cloudLine()}`;
  }

  function viewDetail(M) {
    const ex = M.list.find((e) => e.id === S.detailId);
    if (!ex) { S.view = 'home'; return viewSaved(M); }
    return `<div class="bar"><button class="x" data-act="back" aria-label="Späť">‹</button><h2 class="out">${exTitle(ex)}</h2><span class="tag ${ex.mode === 'papier' ? 'red' : 'green'}">${ex.mode === 'papier' ? 'Na papier' : 'Na tablete'}</span></div>
    <section class="panel">
      <p>${fmtDate(ex.created_at)} · správne ${ex.items.length - ex.wrong.length} z ${ex.items.length}${ex.xp ? ` · +${ex.xp} XP` : ''}</p>
      <div class="status-line" style="justify-content:flex-start">${statusTags(ex)}</div>
      ${ex.mode === 'papier' && !ex.confirmed ? gateBox(ex) : ''}
    </section>
    ${wrongList(ex)}
    <section class="sheet-paper"><h3>Všetky príklady</h3><div class="tasks">${ex.items.map((it, i) => `<div class="task"><span class="n">${i + 1}.</span><span class="q">${E.text(it)} = <b style="color:${ex.wrong.includes(i) ? 'var(--red-d)' : 'var(--green-d)'}">${E.fmt(it.ans)}</b></span></div>`).join('')}</div></section>`;
  }

  // ---------------- ODMENY ----------------
  function viewRewards(M) {
    const L = levelOf(M.xp);
    const wk = weekKey(new Date());
    const n = weekGoal(M);
    const wish = M.wishes.get(wk);
    let goal;
    if (wish) {
      const t = TRIPS.find((x) => x.id === wish.what) || TRIPS[TRIPS.length - 1];
      goal = `<div class="wish"><span class="em">${t.em}</span><span><b>Tento týždeň si vybral:</b> ${esc(wish.text || t.name)} – ${WHO[wish.who] ? WHO[wish.who].toLowerCase() : ''}</span>${wish.done ? '<span class="tag green">Splnené</span>' : `<button class="btn small yellow" data-act="wishDone" data-id="${wish.id}">Splnené (ocko)</button>`}</div>${wish.done ? '' : `<div class="gate" id="wishGate" hidden><div class="row"><input id="code" type="password" inputmode="numeric" autocomplete="off" placeholder="kód" aria-label="Kód rodiča"><button class="btn yellow" data-act="wishDoneOk" data-id="${wish.id}">Potvrdiť</button></div>${S.wishMsg ? `<p class="err">${esc(S.wishMsg)}</p>` : ''}</div>`}`;
    } else if (n >= WEEK_GOAL) {
      goal = `<h3>Máš to! Vyber si zážitok</h3>
        <span class="label">S kým?</span>
        <div class="choose who">${Object.entries(WHO).map(([id, name]) => `<button class="opt" data-act="wishWho" data-v="${id}" aria-pressed="${S.wishWho === id}"><span class="em">${id === 'ocko' ? '👨' : '👩'}</span>${name}</button>`).join('')}</div>
        <span class="label">Kam?</span>
        <div class="choose">${TRIPS.map((t) => `<button class="opt" data-act="wishWhat" data-v="${t.id}" aria-pressed="${S.wishWhat === t.id}"><span class="em">${t.em}</span>${t.name}</button>`).join('')}</div>
        ${S.wishWhat === 'vlastne' ? `<input class="txt" id="wishText" maxlength="60" placeholder="Napíš, kam by si chcel ísť" value="${esc(S.wishText)}">` : ''}
        ${S.wishMsg ? `<p class="err">${esc(S.wishMsg)}</p>` : ''}
        <button class="btn yellow big" data-act="wishSave" ${S.wishWho && S.wishWhat ? '' : 'disabled'}>Vybrať</button>`;
    } else {
      goal = `<p>Urob ešte <b>${WEEK_GOAL - n}</b> ${plural(WEEK_GOAL - n, 'bezchybné ťažké cvičenie', 'bezchybné ťažké cvičenia', 'bezchybných ťažkých cvičení')} <b>na papier</b> (potvrdené ockom) a vyberieš si zážitok s ockom alebo s mamou. Týždeň začína v pondelok.</p>`;
    }
    const past = [...M.wishes.values()].filter((w) => w.week !== wk).sort((a, b) => b.week.localeCompare(a.week)).slice(0, 6);
    const from = Math.max(1, L.lv - 2); const to = L.lv + 7;
    const stops = [];
    for (let lv = to; lv >= from; lv--) {
      const cls = lv < L.lv ? 'done' : lv === L.lv ? 'now' : 'locked';
      const skin = lv % SKIN_EVERY === 0;
      stops.push(`<div class="stop ${cls}"><span class="badge">${shield(cls === 'now' ? '#FFD23F' : '#3FD4FF', cls === 'now' ? '#C99400' : '#1590BD')}<b class="out">${lv}</b></span><span class="info">${skin ? I.gift.replace('<svg', '<svg class="gift"') : ''}<span>${lv === L.lv ? `<b>Tu si!</b> ${L.into}/${L.need} XP` : lv < L.lv ? 'Hotovo' : `od ${levelStart(lv)} XP`}</span><small>${skin ? 'Nový skin pre Rokera (už čoskoro)' : ''}</small></span></div>`);
    }
    return `${hud(M)}
    <section class="panel">
      <div class="big-goal">${I.trophy}<div><span class="label">Týždenná výzva</span><div class="num out">${Math.min(n, WEEK_GOAL)} / ${WEEK_GOAL}</div></div></div>
      <div class="progress"><i style="width:${Math.min(100, (n / WEEK_GOAL) * 100)}%"></i></div>
      ${goal}
      ${past.length ? `<span class="label">Predošlé zážitky</span>${past.map((w) => { const t = TRIPS.find((x) => x.id === w.what) || TRIPS[TRIPS.length - 1]; return `<div class="wish"><span class="em">${t.em}</span><span>${esc(w.text || t.name)} – ${(WHO[w.who] || '').toLowerCase()} <small class="hint">(týždeň od ${fmtShort(new Date(w.week))})</small></span>${w.done ? '<span class="tag green">Splnené</span>' : '<span class="tag yellow">Čaká</span>'}</div>`; }).join('')}` : ''}
    </section>
    <section class="panel">
      <h2 class="out">Cesta levelov</h2>
      <p class="hint">XP dostaneš za každý správny príklad (ľahké 1, stredné 2, ťažké 3), bonus za cvičenie bez chyby a na papier dvojnásobok.</p>
      <div class="road">${stops.join('')}</div>
    </section>`;
  }

  // ---------------- vysvetlenie ----------------
  function columnHtml(it) {
    const A = E.fmt(it.a); const B = E.fmt(it.b); const R = E.fmt(it.ans);
    const w = Math.max(A.length, B.length + 2, R.length) + 1;
    const padL = (s) => s.padStart(w, ' ');
    return `<div class="column" aria-hidden="true">${padL(A)}\n${(it.op === 'plus' ? '+' : '−') + padL(B).slice(1)}<hr><span class="res">${padL(R)}</span></div>`;
  }
  function openWhy(exId, idx) {
    const M = model();
    const ex = M.list.find((e) => e.id === exId);
    if (!ex) return;
    const it = ex.items[idx];
    const x = E.explain(it);
    const wasHeard = ex.heard.has(idx);
    closeWhy();
    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Vysvetlenie">
      <div class="sheet-head">${E.text(it)} = <b>${E.fmt(it.ans)}</b></div>
      ${it.kind === 'pis' ? columnHtml(it) : ''}
      <ol class="steps">${x.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ol>
      <p class="sheet-status ${wasHeard ? '' : 'wait'}" id="whyStatus">${wasHeard ? '✓ Toto si si už vypočul' : Voice.voices.length ? '🔊 Počúvaj…' : 'Prečítaj si to pozorne.'}</p>
      <div class="row"><button class="btn dark" data-act="replay">${I.speaker.replace('<svg', '<svg class="ico"')} Znova</button><button class="btn yellow" data-act="closeWhy" id="whyOk" ${wasHeard || Voice.voices.length ? '' : 'disabled'}>Rozumiem</button></div>
    </div>`;
    document.body.appendChild(wrap);
    const markHeard = () => {
      const M2 = model(); const e2 = M2.list.find((e) => e.id === exId);
      if (e2 && !e2.heard.has(idx)) Store.add('heard', exId, { idx });
      const st = document.getElementById('whyStatus');
      if (st) { st.textContent = '✓ Vypočuté'; st.classList.remove('wait'); }
    };
    const play = () => {
      if (!Voice.voices.length) return;
      const st = document.getElementById('whyStatus');
      if (st && !model().list.find((e) => e.id === exId)?.heard.has(idx)) st.textContent = '🔊 Počúvaj až do konca…';
      Voice.say(x.say).then((full) => { if (full) markHeard(); });
    };
    wrap.addEventListener('click', (ev) => {
      if (ev.target === wrap) { Voice.stop(); closeWhy(); render(); return; }
      const b = ev.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'replay') play();
      if (b.dataset.act === 'closeWhy') { Voice.stop(); closeWhy(); render(); }
    });
    if (Voice.voices.length) play();
    else {
      // Bez slovenského hlasu: počíta sa ako vypočuté, keď si to mal čas prečítať a ťukol Rozumiem.
      const ms = Math.min(15000, 2500 + x.say.length * 45);
      setTimeout(() => { const ok = document.getElementById('whyOk'); if (ok) { ok.disabled = false; ok.addEventListener('click', markHeard, { once: true }); } }, ms);
    }
  }
  function closeWhy() { document.querySelector('.sheet-wrap')?.remove(); }
  /** Otázka v appke (namiesto confirm, ktorý niektoré okná blokujú). */
  function ask(text, yes, no = 'Späť') {
    return new Promise((resolve) => {
      const w = document.createElement('div');
      w.className = 'sheet-wrap ask';
      w.innerHTML = `<div class="sheet" role="alertdialog" aria-modal="true"><p class="sheet-q">${esc(text)}</p><div class="row"><button class="btn dark" data-a="0">${esc(no)}</button><button class="btn yellow" data-a="1">${esc(yes)}</button></div></div>`;
      w.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-a]');
        if (b || ev.target === w) { w.remove(); resolve(!!b && b.dataset.a === '1'); }
      });
      document.body.appendChild(w);
    });
  }

  // ---------------- oslava ----------------
  function fireworks() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = document.createElement('canvas'); c.className = 'fx'; document.body.appendChild(c);
    const dpr = Math.min(2, devicePixelRatio || 1);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    const cols = ['#FFD23F', '#3FD4FF', '#FF5FA8', '#3EDC81', '#FF9A3C', '#FFFFFF'];
    const P = [];
    for (let b = 0; b < 5; b++) {
      const x = innerWidth * (0.15 + Math.random() * 0.7); const y = innerHeight * (0.15 + Math.random() * 0.35);
      for (let i = 0; i < 46; i++) { const a = Math.random() * Math.PI * 2; const s = 2 + Math.random() * 5; P.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 70 + Math.random() * 40, c: cols[(Math.random() * cols.length) | 0], d: b * 14 }); }
    }
    let f = 0;
    (function step() {
      g.clearRect(0, 0, innerWidth, innerHeight);
      let alive = 0;
      for (const p of P) {
        if (f < p.d) { alive++; continue; }
        if (p.life <= 0) continue;
        alive++; p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.vx *= 0.985; p.life--;
        g.globalAlpha = Math.max(0, Math.min(1, p.life / 40)); g.fillStyle = p.c; g.fillRect(p.x, p.y, 5, 5);
      }
      f++;
      if (alive && f < 260) requestAnimationFrame(step); else c.remove();
    })();
  }
  function levelUp(lv) {
    const d = document.createElement('div');
    d.className = 'lvlup';
    d.innerHTML = `<div class="lvlup-in"><div class="lvl">${shield('#FFD23F', '#C99400')}<b class="out">${lv}</b></div><h1 class="out">Level up!</h1><p>Si na leveli ${lv}.${lv % SKIN_EVERY === 0 ? ' Čoskoro tu bude nový skin pre Rokera!' : ''}</p><button class="btn yellow" data-act="closeLvl">Paráda!</button></div>`;
    d.addEventListener('click', (ev) => { if (ev.target === d || ev.target.closest('[data-act="closeLvl"]')) d.remove(); });
    document.body.appendChild(d);
    fireworks();
  }
  function checkLevelUp() {
    const lv = levelOf(model().xp).lv;
    if (S.prevLevel != null && lv > S.prevLevel) levelUp(lv);
    S.prevLevel = lv;
  }

  // ---------------- vykreslenie ----------------
  const FOCUS_VIEWS = ['paper', 'check', 'tablet', 'result', 'detail'];
  function render() {
    const M = model();
    const focus = FOCUS_VIEWS.includes(S.view);
    let html;
    if (S.view === 'paper') html = viewPaper();
    else if (S.view === 'check') html = viewCheck();
    else if (S.view === 'tablet') html = viewTablet();
    else if (S.view === 'result') html = viewResult(M);
    else if (S.view === 'detail') html = viewDetail(M);
    else if (S.tab === 'cal') html = viewCal(M);
    else if (S.tab === 'saved') html = viewSaved(M);
    else if (S.tab === 'rewards') html = viewRewards(M);
    else html = viewHome(M);
    $app.className = `wrap${focus ? ' focus' : ''}${S.view === 'tablet' ? ' with-keys' : ''}`;
    $app.innerHTML = html + (focus ? '' : nav(M));
  }
  function scrollSel() {
    const el = document.querySelector('.card.sel');
    if (!el) return;
    const r = el.getBoundingClientRect();
    const keysTop = document.querySelector('.keys')?.getBoundingClientRect().top ?? innerHeight;
    if (r.bottom > keysTop - 12 || r.top < 70) window.scrollBy({ top: r.top - Math.max(90, (keysTop - r.height) / 2.5), behavior: 'smooth' });
  }

  // ---------------- akcie ----------------
  function start() {
    savePrefs();
    S.items = E.generate(S.op, S.level, S.count);
    S.answers = S.items.map(() => '');
    S.sel = 0; S.marks = new Set(); S.exId = uid(); S.startedAt = new Date().toISOString(); S.gateMsg = '';
    S.view = S.mode === 'papier' ? 'paper' : 'tablet';
    render(); window.scrollTo(0, 0);
  }
  function saveDone(mode, wrong, given) {
    const ex = { op: S.op, level: S.level, count: S.count, mode, items: S.items.map(({ op, a, b, ans, kind }) => ({ op, a, b, ans, kind })), wrong, given: given || null, mistakes: wrong.length, started_at: S.startedAt };
    if (mode === 'tablet') ex.xp = xpFor(ex);
    Store.add('done', S.exId, ex);
  }
  function confirmEx(id) {
    const M = model(); const ex = M.list.find((e) => e.id === id);
    if (!ex || ex.confirmed) return;
    Store.add('confirmed', id, { xp: xpFor(ex) });
  }

  $app.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const a = b.dataset.act;
    switch (a) {
      case 'tab': S.tab = b.dataset.tab; S.view = 'home'; S.wishMsg = ''; render(); window.scrollTo(0, 0); if (S.tab !== 'play') Store.sync().then(render); break;
      case 'op': S.op = b.dataset.v; render(); break;
      case 'level': S.level = b.dataset.v; render(); break;
      case 'count': S.count = b.dataset.v; render(); break;
      case 'mode': S.mode = b.dataset.v; render(); break;
      case 'start': start(); break;
      case 'again': S.view = 'home'; S.tab = 'play'; start(); break;
      case 'quit':
        if (S.view === 'tablet' && S.answers.some((x) => x !== '') && !(await ask('Naozaj skončiť? Rozpočítané príklady sa neuložia.', 'Skončiť'))) break;
        if (S.view === 'check' && !(await ask('Naozaj skončiť? Cvičenie sa neuloží.', 'Skončiť'))) break;
        S.view = 'home'; render(); window.scrollTo(0, 0); break;
      case 'home': S.view = 'home'; S.tab = 'play'; render(); window.scrollTo(0, 0); break;
      case 'back': S.view = 'home'; S.tab = 'saved'; render(); break;
      case 'print': window.print(); break;
      case 'paperDone': S.view = 'check'; render(); window.scrollTo(0, 0); break;
      case 'toggleMark': { const i = +b.dataset.i; if (S.marks.has(i)) S.marks.delete(i); else S.marks.add(i); render(); break; }
      case 'paperSave': {
        const n = S.marks.size;
        if (!(await ask(`Uložiť s výsledkom: ${n ? chyb(n) : 'bez chyby'}? Potom sa to už nedá zmeniť.`, 'Uložiť'))) break;
        saveDone('papier', [...S.marks].sort((x, y) => x - y), null);
        S.view = 'result'; render(); window.scrollTo(0, 0);
        break;
      }
      case 'sel': S.sel = +b.dataset.i; render(); break;
      case 'key': {
        const k = b.dataset.k;
        if (k === 'del') S.answers[S.sel] = String(S.answers[S.sel] || '').slice(0, -1);
        else if (k === 'next') {
          const n = S.items.length;
          let j = (S.sel + 1) % n;
          for (let t = 0; t < n; t++) { if (!S.answers[(S.sel + 1 + t) % n]) { j = (S.sel + 1 + t) % n; break; } }
          S.sel = j;
        } else if (String(S.answers[S.sel] || '').length < 5) S.answers[S.sel] = String(S.answers[S.sel] || '') + k;
        render(); if (k === 'next') scrollSel();
        break;
      }
      case 'tabletCheck': {
        if (S.answers.some((x) => x === '')) break;
        const wrong = S.items.map((it, i) => (Number(S.answers[i]) === it.ans ? -1 : i)).filter((i) => i >= 0);
        saveDone('tablet', wrong, S.answers.slice());
        S.view = 'result'; render(); window.scrollTo(0, 0);
        if (!wrong.length) fireworks();
        checkLevelUp();
        break;
      }
      case 'why': openWhy(b.dataset.ex, +b.dataset.i); break;
      case 'confirm': {
        const v = document.getElementById('code')?.value || '';
        if (await codeOk(v)) {
          S.gateMsg = ''; confirmEx(b.dataset.ex); render();
          const ex = model().list.find((e) => e.id === b.dataset.ex);
          if (ex && !ex.wrong.length) fireworks();
          checkLevelUp();
        } else { S.gateMsg = 'Kód nesedí. Skús znova.'; render(); }
        break;
      }
      case 'detail': S.detailId = b.dataset.ex; S.view = 'detail'; S.gateMsg = ''; render(); window.scrollTo(0, 0); break;
      case 'filter': S.filter = b.dataset.v; render(); break;
      case 'month': {
        const now = new Date(); const m = S.month || { y: now.getFullYear(), m: now.getMonth() };
        const d = new Date(m.y, m.m + Number(b.dataset.d), 1); S.month = { y: d.getFullYear(), m: d.getMonth() }; render(); break;
      }
      case 'wishWho': S.wishWho = b.dataset.v; render(); break;
      case 'wishWhat': S.wishText = document.getElementById('wishText')?.value || S.wishText; S.wishWhat = b.dataset.v; render(); break;
      case 'wishSave': {
        const text = S.wishWhat === 'vlastne' ? (document.getElementById('wishText')?.value || '').trim().slice(0, 60) : '';
        if (S.wishWhat === 'vlastne' && !text) { S.wishMsg = 'Napíš, kam by si chcel ísť.'; render(); break; }
        Store.add('wish', uid(), { week: weekKey(new Date()), who: S.wishWho, what: S.wishWhat, text });
        S.wishMsg = ''; render(); fireworks();
        break;
      }
      case 'wishDone': document.getElementById('wishGate')?.removeAttribute('hidden'); document.getElementById('code')?.focus(); break;
      case 'wishDoneOk': {
        const v = document.getElementById('code')?.value || '';
        if (await codeOk(v)) { S.wishMsg = ''; Store.add('wish_done', b.dataset.id, {}); render(); } else { S.wishMsg = 'Kód nesedí.'; render(); document.getElementById('wishGate')?.removeAttribute('hidden'); }
        break;
      }
      default: break;
    }
  });
  $app.addEventListener('input', (ev) => { if (ev.target.id === 'wishText') S.wishText = ev.target.value; });
  $app.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && ev.target.id === 'code') ev.target.closest('.gate')?.querySelector('.btn.yellow')?.click();
  });
  // Fyzická klávesnica (iPad s klávesnicou / počítač) pri počítaní na tablete.
  document.addEventListener('keydown', (ev) => {
    if (S.view !== 'tablet' || document.querySelector('.sheet-wrap, .lvlup')) return;
    if (/^[0-9]$/.test(ev.key)) { document.querySelector(`.key[data-k="${ev.key}"]`)?.click(); ev.preventDefault(); }
    else if (ev.key === 'Backspace') { document.querySelector('.key[data-k="del"]')?.click(); ev.preventDefault(); }
    else if (ev.key === 'Enter' || ev.key === 'Tab') { (document.querySelector('.key.go') || document.querySelector('.key[data-k="next"]'))?.click(); ev.preventDefault(); }
  });

  render();
  S.prevLevel = levelOf(model().xp).lv;
  Store.sync().then(() => { S.prevLevel = levelOf(model().xp).lv; if (!['tablet', 'check', 'paper'].includes(S.view)) render(); });
})();
