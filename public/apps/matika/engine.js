/* Matika – generátor príkladov a vysvetlení pre 4. ročník ZŠ (SR).
   Podľa inovovaného ŠVP pre 4. ročník:
   - sčítanie a odčítanie v obore do 10 000: spamäti celé desiatky, stovky, tisícky;
     pričítanie / odčítanie celej desiatky, stovky, tisícky (a jednociferného čísla) k troj- a štvorcifernému číslu;
     písomné sčítanie a odčítanie s prechodom cez základ 10,
   - násobenie a delenie v obore násobilky do 100 (zautomatizované spoje),
   - násobenie a delenie číslami 10, 100 a 1 000.
   Násobenie sa píše bodkou (·), delenie dvojbodkou (:), ako v slovenských učebniciach.
   Každý príklad má výsledok aj vysvetlenie (riadky na obrazovku + text na prečítanie). */
(() => {
  const OPS = {
    plus: { sign: '+', word: 'plus', name: 'Sčítanie', short: '+' },
    minus: { sign: '−', word: 'mínus', name: 'Odčítanie', short: '−' },
    krat: { sign: '·', word: 'krát', name: 'Násobilka', short: '·' },
    deleno: { sign: ':', word: 'delené', name: 'Delenie', short: ':' },
  };
  const OP_IDS = Object.keys(OPS);

  // Úrovne: čo sa v nich precvičuje (pre každú operáciu iný popis).
  const LEVELS = {
    lahke: { name: 'Ľahké', n: 1 },
    stredne: { name: 'Stredné', n: 2 },
    tazke: { name: 'Ťažké', n: 3 },
  };
  const LEVEL_INFO = {
    plus: {
      lahke: 'Spamäti celé desiatky, stovky a tisícky (340 + 50)',
      stredne: 'Pričítaj celú desiatku, stovku, tisícku (4\u202F357 + 300)',
      tazke: 'Písomne pod seba do 10\u202F000 (3\u202F486 + 2\u202F757)',
    },
    minus: {
      lahke: 'Spamäti celé desiatky, stovky a tisícky (870 − 50)',
      stredne: 'Odčítaj jednociferné číslo, desiatku, stovku, tisícku (4\u202F352 − 7)',
      tazke: 'Písomne pod seba do 10\u202F000 (6\u202F203 − 2\u202F857)',
    },
    krat: {
      lahke: 'Násobilka 2, 3, 4, 5 a 10',
      stredne: 'Celá malá násobilka do 100',
      tazke: 'Násobilka 6 až 9 a násobenie 10, 100, 1\u202F000',
    },
    deleno: {
      lahke: 'Delenie číslami 2, 3, 4, 5 a 10',
      stredne: 'Delenie v celej násobilke do 100',
      tazke: 'Delenie 6 až 9 a delenie 10, 100, 1\u202F000',
    },
    mix: {
      lahke: 'Všetko spolu – ľahké príklady',
      stredne: 'Všetko spolu – stredné príklady',
      tazke: 'Všetko spolu – ťažké príklady',
    },
  };
  const COUNTS = {
    kratke: { name: 'Krátke', n: 10 },
    stredne: { name: 'Stredné', n: 20 },
    dlhe: { name: 'Dlhé', n: 30 },
  };

  // ---------- pomocné ----------
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  /** 4 357 – medzera medzi tisíckami (úzka nezalomiteľná), ako v učebniciach. */
  const fmt = (n) => {
    const s = String(n);
    return s.length < 4 ? s : s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };
  const plural = (n, one, few, many) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);
  const UNIT = {
    10: { one: 'desiatka', few: 'desiatky', many: 'desiatok', loc: 'desiatkach', nuly: 'jednu nulu' },
    100: { one: 'stovka', few: 'stovky', many: 'stoviek', loc: 'stovkách', nuly: 'dve nuly' },
    1000: { one: 'tisícka', few: 'tisícky', many: 'tisícok', loc: 'tisíckach', nuly: 'tri nuly' },
  };
  const units = (n, p) => `${fmt(n)} ${plural(n, UNIT[p].one, UNIT[p].few, UNIT[p].many)}`;
  const PLACE = ['Jednotky', 'Desiatky', 'Stovky', 'Tisícky', 'Desaťtisícky'];
  const digits = (n) => String(n).split('').reverse().map(Number);

  // ---------- generátory ----------
  function make(op, a, b, kind) {
    const ans = op === 'plus' ? a + b : op === 'minus' ? a - b : op === 'krat' ? a * b : a / b;
    return { op, a, b, ans, kind };
  }

  const GEN = {
    plus: {
      lahke() {
        const p = pick([10, 10, 100, 100, 1000]);
        if (p === 1000) { const x = rnd(1, 8); return make('plus', x * p, rnd(1, 9 - x) * p, 'pam'); }
        const x = rnd(11, 89);
        const y = Math.random() < 0.5 ? rnd(2, 9) : rnd(11, 98 - x);
        return Math.random() < 0.5 ? make('plus', x * p, Math.min(y, 99 - x) * p, 'pam') : make('plus', Math.min(y, 99 - x) * p, x * p, 'pam');
      },
      stredne() {
        const p = pick([10, 100, 100, 1000]);
        const n = Math.random() < 0.35 ? rnd(101, 999) : rnd(1001, 8999);
        const k = rnd(1, 9);
        if (n + k * p > 9999) return this.stredne();
        if (n % p === 0) return this.stredne();
        return make('plus', n, k * p, 'rad');
      },
      tazke() {
        for (;;) {
          const a = rnd(1000, 8999);
          const b = Math.random() < 0.3 ? rnd(200, 999) : rnd(1000, 8999);
          const s = a + b;
          if (s > 10000) continue;
          const da = digits(a); const db = digits(b);
          let carries = 0; let c = 0;
          for (let i = 0; i < da.length; i++) { const v = da[i] + (db[i] || 0) + c; c = v >= 10 ? 1 : 0; carries += c; }
          if (carries >= 1) return make('plus', a, b, 'pis');
        }
      },
    },
    minus: {
      lahke() {
        const p = pick([10, 10, 100, 100, 1000]);
        if (p === 1000) { const x = rnd(3, 10); return make('minus', x * p, rnd(1, x - 1) * p, 'pam'); }
        const x = rnd(20, 99);
        const y = Math.random() < 0.5 ? rnd(2, 9) : rnd(11, x - 5);
        return make('minus', x * p, y * p, 'pam');
      },
      stredne() {
        const p = pick([1, 1, 10, 100, 1000]);
        const n = Math.random() < 0.35 ? rnd(102, 999) : rnd(1002, 9999);
        const k = rnd(p === 1 ? 2 : 1, 9);
        if (n - k * p < 0) return this.stredne();
        if (p > 1 && n % p === 0) return this.stredne();
        return make('minus', n, k * p, p === 1 ? 'jed' : 'rad');
      },
      tazke() {
        for (;;) {
          const a = rnd(1200, 9999);
          const b = Math.random() < 0.3 ? rnd(150, 999) : rnd(1000, a - 100);
          if (b >= a || b < 100) continue;
          const da = digits(a); const db = digits(b);
          let borrows = 0; let c = 0;
          for (let i = 0; i < da.length; i++) { const s = (db[i] || 0) + c; c = da[i] < s ? 1 : 0; borrows += c; }
          if (borrows >= 1) return make('minus', a, b, 'pis');
        }
      },
    },
    krat: {
      lahke() {
        const t = pick([2, 3, 4, 5, 10]);
        const x = rnd(1, 10);
        return Math.random() < 0.5 ? make('krat', x, t, 'nas') : make('krat', t, x, 'nas');
      },
      stredne() {
        const r = Math.random();
        const a = r < 0.06 ? pick([0, 1]) : rnd(2, 10);
        const b = rnd(2, 10);
        return Math.random() < 0.5 ? make('krat', a, b, 'nas') : make('krat', b, a, 'nas');
      },
      tazke() {
        if (Math.random() < 0.55) {
          const a = rnd(6, 9); const b = Math.random() < 0.75 ? rnd(6, 9) : rnd(3, 5);
          return Math.random() < 0.5 ? make('krat', a, b, 'nas') : make('krat', b, a, 'nas');
        }
        const p = pick([10, 100, 1000]);
        const n = p === 10 ? rnd(12, 999) : p === 100 ? rnd(3, 99) : rnd(2, 10);
        if (n * p > 10000) return this.tazke();
        return make('krat', n, p, 'n10');
      },
    },
    deleno: {
      lahke() {
        const d = pick([2, 3, 4, 5, 10]);
        const q = rnd(1, 10);
        return make('deleno', d * q, d, 'del');
      },
      stredne() {
        const d = Math.random() < 0.05 ? 1 : rnd(2, 10);
        const q = Math.random() < 0.05 ? 0 : rnd(1, 10);
        return make('deleno', d * q, d, 'del');
      },
      tazke() {
        if (Math.random() < 0.55) {
          const d = rnd(6, 9); const q = Math.random() < 0.75 ? rnd(6, 9) : rnd(2, 10);
          return make('deleno', d * q, d, 'del');
        }
        const p = pick([10, 100, 1000]);
        const q = p === 10 ? rnd(12, 999) : p === 100 ? rnd(3, 99) : rnd(2, 10);
        if (q * p > 10000) return this.tazke();
        return make('deleno', q * p, p, 'd10');
      },
    },
  };

  const key = (it) => `${it.op}|${it.a}|${it.b}`;
  /** Zostaví sadu príkladov. op = plus|minus|krat|deleno|mix */
  function generate(op, level, count) {
    const n = COUNTS[count]?.n || 10;
    const out = []; const seen = new Set();
    let guard = 0;
    while (out.length < n && guard++ < 5000) {
      const o = op === 'mix' ? OP_IDS[out.length % 4] : op;
      const it = GEN[o][level]();
      if (seen.has(key(it))) continue;
      seen.add(key(it));
      out.push(it);
    }
    if (op === 'mix') out.sort(() => Math.random() - 0.5);
    return out;
  }

  // ---------- vysvetlenia ----------
  const T = (it) => `${fmt(it.a)} ${OPS[it.op].sign} ${fmt(it.b)}`;
  const spoken = (s) => String(s)
    .replace(/ /g, '')
    .replace(/ · /g, ' krát ').replace(/ : /g, ' delené ').replace(/ − /g, ' mínus ').replace(/ \+ /g, ' plus ')
    .replace(/ = /g, ' je ').replace(/→/g, ', ').replace(/✔/g, '');

  function columnAdd(a, b) {
    const da = digits(a); const db = digits(b);
    const L = Math.max(da.length, db.length);
    const lines = ['Napíšeme čísla pod seba: jednotky pod jednotky, desiatky pod desiatky. Počítame sprava.'];
    let c = 0;
    for (let i = 0; i < L; i++) {
      const x = da[i] || 0; const y = db[i];
      const parts = [x]; if (y !== undefined) parts.push(y); if (c) parts.push(c);
      const s = parts.reduce((p, q) => p + q, 0);
      const expr = parts.length > 1 ? `${parts.join(' + ')} = ${s}` : `dole nie je žiadna číslica, ostáva ${s}`;
      const carryNote = c ? ' (aj s tou 1, ktorú sme si pamätali)' : '';
      if (s >= 10) lines.push(`${PLACE[i]}: ${expr}${carryNote} → píšeme ${s - 10}, 1 si pamätáme.`);
      else lines.push(`${PLACE[i]}: ${expr}${carryNote} → píšeme ${s}.`);
      c = s >= 10 ? 1 : 0;
    }
    if (c) lines.push(`${PLACE[L]}: zapamätanú 1 napíšeme na začiatok.`);
    lines.push(`Výsledok: ${fmt(a + b)}.`);
    return lines;
  }

  function columnSub(a, b) {
    const da = digits(a); const db = digits(b);
    const lines = ['Napíšeme čísla pod seba: jednotky pod jednotky, desiatky pod desiatky. Počítame sprava.'];
    let c = 0;
    const res = [];
    for (let i = 0; i < da.length; i++) {
      const m = da[i];
      const y = db[i] || 0;
      const s = y + c;
      let pre = `${PLACE[i]}: `;
      if (c) pre += db[i] !== undefined ? `k ${y} pripočítame zapamätanú 1 → ${s}. ` : `dole nie je žiadna číslica, odčítame len zapamätanú 1. `;
      let r;
      if (m >= s) {
        r = m - s;
        const last = i === da.length - 1;
        if (last && r === 0 && i > 0) lines.push(`${pre}${m} − ${s} = 0 → nulu na začiatku čísla nepíšeme.`);
        else lines.push(`${pre}${m} − ${s} = ${r} → píšeme ${r}.`);
        c = 0;
      } else {
        r = m + 10 - s;
        lines.push(`${pre}${m} je menej ako ${s}, preto počítame ${m + 10} − ${s} = ${r} (lebo ${s} + ${r} = ${m + 10}) → píšeme ${r}, 1 si pamätáme.`);
        c = 1;
      }
      res.push(r);
    }
    lines.push(`Výsledok: ${fmt(a - b)}. Skúška: ${fmt(a - b)} + ${fmt(b)} = ${fmt(a)} ✔`);
    return lines;
  }

  function explain(it) {
    const { op, a, b, ans, kind } = it;
    let lines = [];
    if (kind === 'pam') {
      const p = [1000, 100, 10].find((u) => a % u === 0 && b % u === 0);
      const x = a / p; const y = b / p;
      lines = op === 'plus'
        ? [`Počítame v ${UNIT[p].loc}: ${units(x, p)} + ${units(y, p)} = ${units(x + y, p)}.`, `${units(x + y, p)} je ${fmt(ans)}.`]
        : [`Počítame v ${UNIT[p].loc}: ${units(x, p)} − ${units(y, p)} = ${units(x - y, p)}.`, `${units(x - y, p)} je ${fmt(ans)}.`];
    } else if (kind === 'rad') {
      const p = b % 1000 === 0 ? 1000 : b % 100 === 0 ? 100 : 10;
      const k = b / p; const q = Math.floor(a / p); const r = a % p;
      const verb = op === 'plus' ? 'Pridávame' : 'Uberáme';
      lines = [`${verb} ${units(k, p)}.`];
      if (q === 0) lines.push(`${fmt(a)} nemá žiadne ${UNIT[p].few}, tak ich len pridáme dopredu → ${fmt(ans)}.`);
      else {
        lines.push(`${fmt(a)} je ${units(q, p)} a ešte ${fmt(r)}.`);
        const q2 = op === 'plus' ? q + k : q - k;
        lines.push(`${fmt(q)} ${OPS[op].sign} ${fmt(k)} = ${units(q2, p)}, k tomu ${fmt(r)} → ${fmt(ans)}.`);
      }
    } else if (kind === 'jed') {
      const u = a % 10; const t = a % 100;
      if (u >= b) lines = [`Pozrieme sa na jednotky: ${u} − ${b} = ${u - b}.`, `Ostatné číslice sa nemenia → ${fmt(ans)}.`];
      else if (t >= b) lines = [`Pozrieme sa na posledné dvojčíslie: ${t} − ${b} = ${t - b}.`, `Stovky a tisícky sa nemenia → ${fmt(ans)}.`];
      else if (u > 0) lines = [`Jednotky: ${u} je menej ako ${b}, tak ${b} rozdelíme na ${u} a ${b - u}.`, `Najprv odčítame ${u}: ${fmt(a)} − ${u} = ${fmt(a - u)}.`, `Potom ešte ${b - u}: ${fmt(a - u)} − ${b - u} = ${fmt(ans)}.`];
      else lines = [`Z okrúhleho čísla ${fmt(a)} si zoberieme jednu desiatku: ${fmt(a - 10)} a 10.`, `10 − ${b} = ${10 - b}, takže ${fmt(a - 10)} + ${10 - b} = ${fmt(ans)}.`];
    } else if (kind === 'pis') {
      lines = op === 'plus' ? columnAdd(a, b) : columnSub(a, b);
    } else if (kind === 'nas') {
      if (a === 0 || b === 0) lines = ['Keď je jeden z činiteľov 0, súčin je vždy 0.'];
      else if (a === 1 || b === 1) lines = [`Keď násobíme jednotkou, číslo sa nezmení → ${ans}.`];
      else if (a === 10 || b === 10) lines = [`Násobiť 10 je ľahké: k číslu pripíšeme nulu → ${ans}.`];
      else if (a <= 5) {
        lines = [`${a} · ${b} znamená ${a}-krát po ${b}: ${Array(a).fill(b).join(' + ')} = ${ans}.`];
      } else {
        lines = [`${a} · ${b} si rozdelíme: najprv 5 · ${b} = ${5 * b}, potom ešte ${a - 5} · ${b} = ${(a - 5) * b}.`, `Spolu ${5 * b} + ${(a - 5) * b} = ${ans}.`];
      }
      if (a > b && a !== 10 && b !== 10 && a !== 1 && b !== 1 && b !== 0) lines.push(`Pomôcka: ${a} · ${b} je to isté ako ${b} · ${a} – činitele môžeme vymeniť.`);
    } else if (kind === 'n10') {
      lines = [`Pri násobení číslom ${fmt(b)} pripíšeme za číslo ${UNIT[b].nuly}.`, `${fmt(a)} → ${fmt(ans)}.`];
    } else if (kind === 'del') {
      if (a === 0) lines = [`0 : ${b} = 0, lebo 0 · ${b} = 0.`];
      else if (b === 1) lines = [`Keď delíme jednotkou, číslo sa nezmení → ${ans}.`];
      else lines = [`Hľadáme, koľkokrát sa ${b} zmestí do ${a}.`, `${ans} · ${b} = ${a}, preto ${a} : ${b} = ${ans}.`];
    } else if (kind === 'd10') {
      lines = [`Pri delení číslom ${fmt(b)} škrtneme na konci čísla ${UNIT[b].nuly}.`, `${fmt(a)} → ${fmt(ans)}. Skúška: ${fmt(ans)} · ${fmt(b)} = ${fmt(a)} ✔`];
    }
    const head = `${T(it)} = ${fmt(ans)}`;
    return { head, lines, say: spoken([`${head}.`, ...lines].join(' ')) };
  }

  function questionSay(it) { return spoken(`${T(it)}`); }

  window.MATIKA_ENGINE = { OPS, OP_IDS, LEVELS, LEVEL_INFO, COUNTS, generate, explain, fmt, text: T, questionSay, spoken, digits };
})();
