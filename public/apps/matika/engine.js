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
    jednotky: { sign: '', word: '', name: 'Jednotky', short: 'mm' },
  };
  const OP_IDS = ['plus', 'minus', 'krat', 'deleno']; // Mix = tieto štyri

  // Úrovne: čo sa v nich precvičuje (pre každú operáciu iný popis).
  const LEVELS = {
    lahke: { name: 'Ľahké', n: 1 },
    stredne: { name: 'Stredné', n: 2 },
    tazke: { name: 'Ťažké', n: 3 },
    desatinne: { name: 'Desatinné', n: 3, only: 'jednotky' },
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
    jednotky: {
      lahke: 'Premeň na menšiu jednotku (4\u202Fm = ? cm, 60 mm = ? cm)',
      stredne: 'Dve jednotky na menšiu (40 cm 2 mm = ? mm)',
      tazke: 'Zmiešané a väčšie čísla (7 mm 3 dm = ? mm, 15 dm 23 cm = ? cm)',
      desatinne: 'S desatinnou čiarkou – navyše, nad rámec osnov (7 mm 3 dm = ? dm)',
    },
    mix: {
      lahke: 'Všetko spolu – ľahké príklady',
      stredne: 'Všetko spolu – stredné príklady',
      tazke: 'Všetko spolu – ťažké príklady',
    },
  };
  // 5. ročník podľa inovovaného ŠVP (ISCED 2): obor do a nad milión, písomné násobenie
  // jednociferným a dvojciferným číslom, písomné delenie jednociferným a dvojciferným číslom,
  // spamäti násobky malej násobilky s nulami (70 · 800, 72 000 : 9), premena jednotiek dĺžky.
  const LEVEL_INFO4 = JSON.parse(JSON.stringify(LEVEL_INFO));
  const LEVEL_INFO5 = {
    plus: {
      lahke: 'Spamäti celé tisícky, desaťtisícky a stotisícky (34\u202F000 + 5\u202F000)',
      stredne: 'Pričítaj celé tisícky, desaťtisícky, stotisícky (245\u202F300 + 30\u202F000)',
      tazke: 'Písomne pod seba do milióna (348\u202F675 + 275\u202F486)',
    },
    minus: {
      lahke: 'Spamäti celé tisícky, desaťtisícky a stotisícky (86\u202F000 − 9\u202F000)',
      stredne: 'Odčítaj celé tisícky, desaťtisícky, stotisícky (245\u202F300 − 30\u202F000)',
      tazke: 'Písomne pod seba do milióna (603\u202F241 − 285\u202F767)',
    },
    krat: {
      lahke: 'Spamäti s nulami (70 · 800)',
      stredne: 'Písomne jednociferným číslom (3\u202F476 · 7)',
      tazke: 'Písomne dvojciferným číslom (356 · 24)',
    },
    deleno: {
      lahke: 'Spamäti s nulami (72\u202F000 : 9)',
      stredne: 'Písomne jednociferným číslom (1\u202F856 : 4)',
      tazke: 'Písomne dvojciferným číslom (864 : 24)',
    },
    jednotky: LEVEL_INFO4.jednotky,
    mix: LEVEL_INFO4.mix,
  };
  let grade = 4;
  const MAXN = () => (grade >= 5 ? 1000000 : 10000);
  /** Prestaví učivo na daný ročník (4 alebo 5). */
  function setGrade(g) {
    grade = g >= 5 ? 5 : 4;
    const src = grade === 5 ? LEVEL_INFO5 : LEVEL_INFO4;
    for (const k of Object.keys(src)) LEVEL_INFO[k] = JSON.parse(JSON.stringify(src[k]));
    return grade;
  }
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
  /** Číslo aj s desatinnou čiarkou: 3,07 alebo 4 350. */
  const fmtNum = (x) => {
    if (Number.isInteger(x)) return fmt(x);
    const [i, d] = String(Math.round(x * 1000) / 1000).split('.');
    return `${fmt(Number(i))},${d}`;
  };
  const plural = (n, one, few, many) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);
  const UNIT = {
    10: { one: 'desiatka', acc: 'desiatku', few: 'desiatky', many: 'desiatok', loc: 'desiatkach', nuly: 'jednu nulu' },
    100: { one: 'stovka', acc: 'stovku', few: 'stovky', many: 'stoviek', loc: 'stovkách', nuly: 'dve nuly' },
    1000: { one: 'tisícka', acc: 'tisícku', few: 'tisícky', many: 'tisícok', loc: 'tisíckach', nuly: 'tri nuly' },
    10000: { one: 'desaťtisícka', acc: 'desaťtisícku', few: 'desaťtisícky', many: 'desaťtisícok', loc: 'desaťtisíckach', nuly: 'štyri nuly' },
    100000: { one: 'stotisícka', acc: 'stotisícku', few: 'stotisícky', many: 'stotisícok', loc: 'stotisíckach', nuly: 'päť núl' },
  };
  const NULY = ['', 'jednu nulu', 'dve nuly', 'tri nuly', 'štyri nuly', 'päť núl', 'šesť núl'];
  const je = (n) => (n >= 2 && n <= 4 ? 'sú' : 'je');
  const unitsAcc = (n, p) => (n === 1 ? `1 ${UNIT[p].acc}` : units(n, p));
  const units = (n, p) => `${fmt(n)} ${plural(n, UNIT[p].one, UNIT[p].few, UNIT[p].many)}`;
  const PLACE = ['Jednotky', 'Desiatky', 'Stovky', 'Tisícky', 'Desaťtisícky', 'Stotisícky', 'Milióny'];
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

  const carriesAdd = (a, b) => { const da = digits(a); const db = digits(b); let n = 0; let c = 0; for (let i = 0; i < Math.max(da.length, db.length); i++) { const v = (da[i] || 0) + (db[i] || 0) + c; c = v >= 10 ? 1 : 0; n += c; } return n; };
  const borrowsSub = (a, b) => { const da = digits(a); const db = digits(b); let n = 0; let c = 0; for (let i = 0; i < da.length; i++) { const s2 = (db[i] || 0) + c; c = da[i] < s2 ? 1 : 0; n += c; } return n; };
  const GEN5 = {
    plus: {
      lahke() {
        const p = pick([1000, 10000, 10000, 100000]);
        let x; let y;
        if (p === 100000) { x = rnd(1, 8); y = rnd(1, 9 - x); }
        else if (p === 10000) { x = rnd(11, 89); y = Math.random() < 0.5 ? rnd(2, 9) : rnd(11, 98 - x); }
        else { x = rnd(110, 899); y = Math.random() < 0.5 ? rnd(2, 9) : rnd(11, 99); }
        return Math.random() < 0.5 ? make('plus', x * p, y * p, 'pam') : make('plus', y * p, x * p, 'pam');
      },
      stredne() {
        const p = pick([1000, 10000, 10000, 100000]);
        const n = rnd(10001, 899999); const k = rnd(1, 9);
        if (n + k * p >= 1000000 || n % p === 0) return this.stredne();
        return make('plus', n, k * p, 'rad');
      },
      tazke() {
        for (;;) {
          const a = rnd(10000, 899999);
          const b = Math.random() < 0.3 ? rnd(1000, 99999) : rnd(10000, 899999);
          if (a + b >= 1000000 || carriesAdd(a, b) < 2) continue;
          return make('plus', a, b, 'pis');
        }
      },
    },
    minus: {
      lahke() {
        const p = pick([1000, 10000, 10000, 100000]);
        if (p === 100000) { const x = rnd(3, 9); return make('minus', x * p, rnd(1, x - 1) * p, 'pam'); }
        const x = p === 10000 ? rnd(20, 99) : rnd(150, 999);
        const y = Math.random() < 0.5 ? rnd(2, 9) : rnd(11, Math.min(99, x - 5));
        return make('minus', x * p, y * p, 'pam');
      },
      stredne() {
        const p = pick([1000, 10000, 10000, 100000]);
        const n = rnd(10002, 999999); const k = rnd(1, 9);
        if (n - k * p < 0 || n % p === 0) return this.stredne();
        return make('minus', n, k * p, 'rad');
      },
      tazke() {
        for (;;) {
          const a = rnd(20000, 999999);
          const b = Math.random() < 0.3 ? rnd(1000, 9999) : rnd(10000, a - 1000);
          if (b >= a || borrowsSub(a, b) < 2) continue;
          return make('minus', a, b, 'pis');
        }
      },
    },
    krat: {
      lahke() {
        const x = rnd(2, 9); const y = rnd(2, 9);
        const i = rnd(0, 3); const j = rnd(i === 0 ? 1 : 0, 3 - i);
        const a = x * 10 ** i; const b = y * 10 ** j;
        return make('krat', a, b, 'nul');
      },
      stredne() {
        const a = Math.random() < 0.4 ? rnd(102, 999) : rnd(1002, 9999);
        const b = rnd(3, 9);
        if (a % 10 === 0) return this.stredne();
        return make('krat', a, b, 'pn1');
      },
      tazke() {
        const a = Math.random() < 0.3 ? rnd(23, 99) : rnd(102, 999);
        const b = rnd(12, 99);
        if (b % 10 === 0 || a % 10 === 0 || b % 11 === 0) return this.tazke();
        return Math.random() < 0.85 ? make('krat', a, b, 'pn2') : make('krat', Math.max(a, b), Math.min(a, b), 'pn2');
      },
    },
    deleno: {
      lahke() {
        const y = rnd(2, 9); const q = rnd(2, 9);
        const p = pick([10, 100, 1000, 1000, 10000]);
        return make('deleno', y * q * p, y, 'dnul');
      },
      stredne() {
        const d = rnd(2, 9);
        const q = Math.random() < 0.4 ? rnd(101, 999) : rnd(1001, 9999);
        if (q % 10 === 0) return this.stredne();
        return make('deleno', q * d, d, 'pd1');
      },
      tazke() {
        const d = rnd(12, 99); const q = Math.random() < 0.5 ? rnd(12, 99) : rnd(101, 999);
        if (d % 10 === 0 || q % 10 === 0 || d * q > 99999) return this.tazke();
        return make('deleno', q * d, d, 'pd2');
      },
    },
  };

  let GEN_U;

  // ---------- jednotky dĺžky (všetko sa počíta v mm, aby nevznikali chyby zaokrúhlenia) ----------
  const U = { mm: 1, cm: 10, dm: 100, m: 1000, km: 1000000 };
  const UORDER = ['mm', 'cm', 'dm', 'm', 'km'];
  const totalMm = (parts) => parts.reduce((a, [n, u]) => a + n * U[u], 0);
  function makeU(parts, to, kind) {
    const mm = totalMm(parts);
    return { op: 'jednotky', parts, to, mm, ans: mm / U[to], kind };
  }
  const SMALLER = { cm: ['mm'], dm: ['cm', 'mm'], m: ['dm', 'cm', 'mm'], km: ['m'] };
  const NEXT_DOWN = [['km', 'm'], ['m', 'dm'], ['m', 'cm'], ['dm', 'cm'], ['cm', 'mm'], ['dm', 'mm'], ['m', 'mm']];
  GEN_U = {
    lahke() {
      const from = pick(['cm', 'dm', 'm', 'm', 'km']);
      const to = pick(SMALLER[from]);
      const f = U[from] / U[to];
      if (Math.random() < 0.6) {
        const n = rnd(2, Math.max(2, Math.min(99, Math.floor(10000 / f))));
        return makeU([[n, from]], to, 'u_down');
      }
      // naopak na väčšiu jednotku, len keď to vyjde presne (60 mm = 6 cm)
      const n = rnd(2, Math.min(99, Math.floor(10000 / f)));
      return makeU([[n * f, to]], from, 'u_up');
    },
    stredne() {
      const [big, small] = pick(NEXT_DOWN);
      const f = U[big] / U[small];
      const nb = big === 'km' ? rnd(1, 9) : big === 'm' && f >= 100 ? rnd(1, 9) : rnd(1, 60);
      const ns = rnd(1, f - 1);
      if (nb * f + ns > 10000) return this.stredne();
      return makeU([[nb, big], [ns, small]], small, 'u_down');
    },
    tazke() {
      const r = Math.random();
      if (r < 0.45) {
        // ako „7 mm 3 dm“ alebo „15 dm 23 cm“: menšia časť môže byť väčšia ako 1 väčšia jednotka, poradie môže byť obrátené
        const [big, small] = pick(NEXT_DOWN.filter(([b]) => b !== 'km'));
        const f = U[big] / U[small];
        const nb = rnd(1, f >= 100 ? 9 : 25);
        const ns = rnd(f, f * 3 + 5);
        if (nb * f + ns > 10000) return this.tazke();
        const parts = Math.random() < 0.5 ? [[ns, small], [nb, big]] : [[nb, big], [ns, small]];
        return makeU(parts, small, 'u_down');
      }
      if (r < 0.75) {
        // tri jednotky: 2 m 3 dm 4 cm = ? cm
        const set = pick([['m', 'dm', 'cm'], ['dm', 'cm', 'mm'], ['m', 'cm', 'mm'], ['m', 'dm', 'mm']]);
        const parts = [[rnd(1, 9), set[0]], [rnd(1, U[set[0]] / U[set[1]] - 1), set[1]], [rnd(1, U[set[1]] / U[set[2]] - 1), set[2]]];
        const it = makeU(parts, set[2], 'u_down');
        return it.ans > 10000 ? this.tazke() : it;
      }
      // väčšie číslo na väčšiu jednotku, presne: 4 000 m = 4 km, 1 200 cm = 120 dm
      const pairs = [['km', 'm'], ['m', 'cm'], ['dm', 'cm'], ['m', 'mm'], ['dm', 'mm'], ['m', 'dm']];
      const [big, small] = pick(pairs);
      const f = U[big] / U[small];
      const n = rnd(11, Math.min(999, Math.floor(10000 / f)));
      return makeU([[n * f, small]], big, 'u_up');
    },
    desatinne() {
      // výsledok s desatinnou čiarkou (max. 2 desatinné miesta): 7 mm 3 dm = 3,07 dm
      for (;;) {
        const [big, small] = pick([['cm', 'mm'], ['dm', 'cm'], ['dm', 'mm'], ['m', 'cm'], ['m', 'dm'], ['km', 'm']]);
        const f = U[big] / U[small];
        if (f > 100 && big !== 'km') continue;
        const nb = big === 'km' ? rnd(1, 9) : rnd(1, 40);
        const ns = big === 'km' ? rnd(1, 99) * 10 : rnd(1, Math.random() < 0.7 ? f - 1 : f * 2 + 3);
        if (ns % f === 0) continue;
        const parts = Math.random() < 0.3 ? [[ns, small], [nb, big]] : [[nb, big], [ns, small]];
        const it = makeU(parts, big, 'u_dec');
        if (Number.isInteger(it.ans)) continue;
        const dec = String(Math.round(it.ans * 1000) / 1000).split('.')[1] || '';
        if (dec.length > 2) continue;
        return it;
      }
    },
  };

  const key = (it) => (it.op === 'jednotky' ? `u|${it.parts.map((p) => p.join(' ')).join('|')}|${it.to}` : `${it.op}|${it.a}|${it.b}`);
  /** Zostaví sadu príkladov. op = plus|minus|krat|deleno|mix */
  function generate(op, level, count) {
    const n = COUNTS[count]?.n || 10;
    const out = []; const seen = new Set();
    let guard = 0;
    while (out.length < n && guard++ < 5000) {
      const o = op === 'mix' ? OP_IDS[out.length % 4] : op;
      if (o !== 'jednotky' && level === 'desatinne') level = 'tazke';
      const it = o === 'jednotky' ? GEN_U[level]() : (grade === 5 ? GEN5 : GEN)[o][level]();
      if (seen.has(key(it))) continue;
      seen.add(key(it));
      out.push(it);
    }
    if (op === 'mix') out.sort(() => Math.random() - 0.5);
    return out;
  }

  // ---------- vysvetlenia ----------
  const T = (it) => (it.op === 'jednotky' ? it.parts.map(([n, u]) => `${fmt(n)} ${u}`).join(' ') : `${fmt(it.a)} ${OPS[it.op].sign} ${fmt(it.b)}`);
  const unitOf = (it) => (it.op === 'jednotky' ? it.to : '');
  const ansText = (it) => fmtNum(it.ans) + (it.op === 'jednotky' ? ` ${it.to}` : '');
  /** Porovná odpoveď (text z klávesnice, môže mať čiarku) so správnym výsledkom. */
  const check = (it, given) => {
    const g = String(given ?? '').trim().replace(',', '.');
    if (!/^\d+(\.\d+)?$/.test(g)) return false;
    return Math.round(Number(g) * 1000) === Math.round(it.ans * 1000);
  };
  const REL = ['1 cm = 10 mm', '1 dm = 10 cm = 100 mm', '1 m = 10 dm = 100 cm = 1 000 mm', '1 km = 1 000 m'];
  const relLine = (a, b) => {
    const [big, small] = U[a] > U[b] ? [a, b] : [b, a];
    return `1 ${big} = ${fmt(U[big] / U[small])} ${small}`;
  };
  function explainU(it) {
    const lines = [];
    const smallest = it.parts.reduce((m, [, u]) => (U[u] < U[m] ? u : m), it.to);
    const used = [...new Set([...it.parts.map(([, u]) => u), it.to])].sort((a, b) => U[b] - U[a]);
    const rels = [];
    for (let i = 0; i < used.length - 1; i++) rels.push(relLine(used[i], used[i + 1]));
    lines.push(`Pamätaj: ${rels.join(', ')}.`);
    if (it.kind === 'u_up') {
      const [[n, u]] = it.parts;
      const f = U[it.to] / U[u];
      lines.push(`${fmt(f)} ${u} je 1 ${it.to}, preto delíme: ${fmt(n)} : ${fmt(f)} = ${fmtNum(it.ans)}.`);
      lines.push(`${fmt(n)} ${u} = ${ansText(it)}.`);
      return lines;
    }
    const base = it.kind === 'u_dec' ? smallest : it.to;
    const conv = it.parts.map(([n, u]) => {
      const f = U[u] / U[base];
      return { n, u, v: n * f, f };
    });
    if (conv.length > 1) {
      lines.push(`Všetko premeníme na ${UFORMS[base][1]}:`);
    }
    if (conv.length > 1 || conv[0].u !== base) {
      for (const c of conv) lines.push(c.u === base ? `${fmt(c.n)} ${c.u} ostáva ${fmt(c.n)} ${base}.` : `${fmt(c.n)} ${c.u} = ${fmt(c.n)} · ${fmt(c.f)} = ${fmt(c.v)} ${base}.`);
    }
    const sum = conv.reduce((a, c) => a + c.v, 0);
    if (conv.length > 1) lines.push(`Spolu ${conv.map((c) => fmt(c.v)).join(' + ')} = ${fmt(sum)} ${base}.`);
    if (it.kind === 'u_dec') {
      const f = U[it.to] / U[base];
      lines.push(`1 ${it.to} = ${fmt(f)} ${base}, preto ${fmt(sum)} ${base} : ${fmt(f)} = ${ansText(it)}.`);
      lines.push(`Celé ${UFORMS[it.to][1]} sú pred čiarkou, zvyšok za čiarkou.`);
    }
    return lines;
  }
  /** Pomôcka k príkladu na jednotky – postup BEZ výsledku. */
  function hintU(it) {
    const lines = [];
    const smallest = it.parts.reduce((m, [, u]) => (U[u] < U[m] ? u : m), it.to);
    const used = [...new Set([...it.parts.map(([, u]) => u), it.to])].sort((a, b) => U[b] - U[a]);
    const rels = [];
    for (let i = 0; i < used.length - 1; i++) rels.push(relLine(used[i], used[i + 1]));
    lines.push(`Pamätaj: ${rels.join(', ')}.`);
    if (it.kind === 'u_up') {
      const [[n, u]] = it.parts;
      const f = U[it.to] / U[u];
      lines.push(`Ideš z menšej jednotky (${u}) na väčšiu (${it.to}), preto delíš.`);
      lines.push(`Vypočítaj ${fmt(n)} : ${fmt(f)}.`);
      return lines;
    }
    const base = it.kind === 'u_dec' ? smallest : it.to;
    if (it.parts.length === 1 && it.kind === 'u_down') {
      const [[n, u]] = it.parts;
      lines.push(`Ideš z väčšej jednotky (${u}) na menšiu (${it.to}), preto násobíš.`);
      lines.push(`Vypočítaj ${fmt(n)} · ${fmt(U[u] / U[it.to])}.`);
      return lines;
    }
    lines.push(`Každú časť premeň na ${UFORMS[base][1]} (väčšiu jednotku násob):`);
    for (const [n, u] of it.parts) lines.push(u === base ? `${fmt(n)} ${u} ostáva ${fmt(n)} ${base}.` : `${fmt(n)} ${u} → ${fmt(n)} · ${fmt(U[u] / U[base])} = ? ${base}`);
    lines.push('Potom čísla sčítaj.');
    if (it.kind === 'u_dec') {
      const f = U[it.to] / U[base];
      lines.push(`Súčet vydeľ ${fmt(f)}, lebo 1 ${it.to} = ${fmt(f)} ${base}.`);
      lines.push(`Celé ${UFORMS[it.to][1]} napíš pred čiarku, zvyšok za čiarku.`);
    }
    return lines;
  }
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

  /** Písomné násobenie jednociferným číslom. */
  function columnMul1(a, b) {
    const da = digits(a);
    const lines = [`Napíšeme ${fmt(a)} a pod jednotky napíšeme ${b}. Násobíme sprava, každú číslicu číslom ${b}.`];
    let c = 0;
    for (let i = 0; i < da.length; i++) {
      const m = da[i] * b; const v = m + c;
      const expr = c ? `${b} · ${da[i]} = ${m}, pridáme zapamätané ${c} → ${v}` : `${b} · ${da[i]} = ${m}`;
      const nc = Math.floor(v / 10);
      if (i === da.length - 1) lines.push(`${PLACE[i]}: ${expr} → píšeme ${v} (násobili sme poslednú číslicu, preto píšeme celé číslo).`);
      else lines.push(`${PLACE[i]}: ${expr} → píšeme ${v % 10}${nc ? `, ${nc} si pamätáme` : ''}.`);
      c = nc;
    }
    lines.push(`Výsledok: ${fmt(a * b)}.`);
    return lines;
  }
  /** Písomné násobenie dvojciferným číslom (dva čiastočné súčiny). */
  function columnMul2(a, b) {
    const u = b % 10; const t = Math.floor(b / 10);
    return [
      `Napíšeme ${fmt(a)} a pod neho ${b}. Násobíme najprv jednotkami (${u}), potom desiatkami (${t}).`,
      `1. riadok: ${fmt(a)} · ${u} = ${fmt(a * u)}.`,
      `2. riadok: ${fmt(a)} · ${t} = ${fmt(a * t)}. Tento riadok píšeme o jedno miesto doľava (začíname pod desiatkami), lebo násobíme desiatkami – v skutočnosti je to ${fmt(a * t * 10)}.`,
      `Oba riadky sčítame: ${fmt(a * u)} + ${fmt(a * t * 10)} = ${fmt(a * b)}.`,
      `Výsledok: ${fmt(a * b)}.`,
    ];
  }
  /** Písomné delenie (jednociferným alebo dvojciferným deliteľom, bez zvyšku). */
  function longDiv(a, d) {
    const ds = String(a).split('').map(Number);
    let k = 0; let cur = 0;
    while (k < ds.length && cur < d) { cur = cur * 10 + ds[k]; k++; }
    const lines = [];
    lines.push(k === 1 ? `Delíme zľava. Začneme prvou číslicou ${cur}.` : `Delíme zľava. Do prvej číslice sa ${d} nezmestí, preto zoberieme prvé ${k === 2 ? 'dve' : k === 3 ? 'tri' : k} číslice: ${cur}.`);
    for (;;) {
      const q = Math.floor(cur / d); const r = cur - q * d;
      if (q === 0) lines.push(`${cur} je menej ako ${d}, do výsledku píšeme 0 a zvyšok je ${cur}.`);
      else if (d < 10) lines.push(`${cur} : ${d} = ${q}, lebo ${q} · ${d} = ${q * d}. Zvyšok: ${cur} − ${q * d} = ${r}.`);
      else lines.push(`Koľkokrát sa ${d} zmestí do ${cur}? ${q}-krát, lebo ${q} · ${d} = ${q * d}${(q + 1) * d > cur ? ` a ${q + 1} · ${d} = ${(q + 1) * d} by bolo veľa` : ''}. Zvyšok: ${cur} − ${q * d} = ${r}.`);
      if (k >= ds.length) break;
      const nx = ds[k]; k++;
      lines.push(`K zvyšku ${r} pripíšeme ďalšiu číslicu ${nx} → ${r * 10 + nx}.`);
      cur = r * 10 + nx;
    }
    lines.push(`Zvyšok je 0, výsledok: ${fmt(a / d)}. Skúška: ${fmt(a / d)} · ${d} = ${fmt(a)} ✔`);
    return lines;
  }

  function explain(it) {
    if (it.op === 'jednotky') {
      const lines = explainU(it);
      const head = `${T(it)} = ${ansText(it)}`;
      return { head, lines, say: spokenU([`${head}.`, ...lines].join(' ')) };
    }
    const { op, a, b, ans, kind } = it;
    let lines = [];
    if (kind === 'pam') {
      const p = [100000, 10000, 1000, 100, 10].find((u) => a % u === 0 && b % u === 0);
      const x = a / p; const y = b / p;
      lines = op === 'plus'
        ? [`Počítame v ${UNIT[p].loc}: ${units(x, p)} + ${units(y, p)} = ${units(x + y, p)}.`, `${units(x + y, p)} ${je(x + y)} ${fmt(ans)}.`]
        : [`Počítame v ${UNIT[p].loc}: ${units(x, p)} − ${units(y, p)} = ${units(x - y, p)}.`, `${units(x - y, p)} ${je(x - y)} ${fmt(ans)}.`];
    } else if (kind === 'rad') {
      const p = [100000, 10000, 1000, 100, 10].find((u) => b % u === 0);
      const k = b / p; const q = Math.floor(a / p); const r = a % p;
      const verb = op === 'plus' ? 'Pridávame' : 'Uberáme';
      lines = [`${verb} ${unitsAcc(k, p)}.`];
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
    } else if (kind === 'nul') {
      const za = String(a).match(/0*$/)[0].length; const zb = String(b).match(/0*$/)[0].length;
      const x = a / 10 ** za; const y = b / 10 ** zb;
      lines = [`Najprv vynásobíme čísla bez núl na konci: ${x} · ${y} = ${x * y}.`, `Potom za výsledok pripíšeme všetky nuly, spolu ${NULY[za + zb]} → ${fmt(ans)}.`];
    } else if (kind === 'pn1') {
      lines = columnMul1(a, b);
    } else if (kind === 'pn2') {
      lines = columnMul2(a, b);
    } else if (kind === 'dnul') {
      const p = [10000, 1000, 100, 10].find((u) => a % u === 0 && (a / u) % b === 0);
      const n = a / p;
      lines = [`${fmt(a)} je ${units(n, p)}.`, `${units(n, p)} : ${b} = ${units(n / b, p)}, lebo ${n / b} · ${b} = ${n}.`, `${units(n / b, p)} ${je(n / b)} ${fmt(ans)}.`];
    } else if (kind === 'pd1' || kind === 'pd2') {
      lines = longDiv(a, b);
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

  // Správne tvary: 1 meter, 2–4 metre, 5 a viac metrov, desatinné číslo 2,5 metra.
  const UFORMS = {
    mm: ['milimeter', 'milimetre', 'milimetrov', 'milimetra'],
    cm: ['centimeter', 'centimetre', 'centimetrov', 'centimetra'],
    dm: ['decimeter', 'decimetre', 'decimetrov', 'decimetra'],
    m: ['meter', 'metre', 'metrov', 'metra'],
    km: ['kilometer', 'kilometre', 'kilometrov', 'kilometra'],
  };
  const uWord = (num, u) => {
    const f = UFORMS[u];
    if (num.includes(',')) return f[3];
    const n = Number(num);
    return n === 1 ? f[0] : n >= 2 && n <= 4 ? f[1] : f[2];
  };
  const spokenU = (txt) => spoken(txt)
    .replace(/(\d+(?:,\d+)?) (mm|cm|dm|m|km)\b/g, (_, n, u) => `${n} ${uWord(n, u)}`)
    .replace(/(^|[.:] )([234]) ([a-z]*metre) je /g, '$1$2 $3 sú '); // 2 centimetre sú 20 milimetrov
  function questionSay(it) { return spoken(`${T(it)}`); }

  window.MATIKA_ENGINE = { unitOf, ansText, check, fmtNum, OPS, OP_IDS, LEVELS, LEVEL_INFO, COUNTS, generate, explain, fmt, text: T, questionSay, spoken, digits, hintU, setGrade, grade: () => grade, sayU: (t) => spokenU(t) };
})();
