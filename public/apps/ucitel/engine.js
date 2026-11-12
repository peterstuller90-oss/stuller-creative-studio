/* Učiteľ 2.0 – jadro: rozbor i/y v slove, vysvetlenia pravidiel, generovanie diktátu, kontrola. */
window.UCITEL_ENGINE = (() => {
  const B = window.UCITEL_BANK;
  const OBO = 'bmprsvzf';
  const HARD = 'hkgdtnl';
  const SOFT = 'žščcjďťňľ';
  const IY = 'iíyý';
  const LETTERS = ['b', 'm', 'p', 'r', 's', 'v', 'z'];

  const LENGTHS = {
    kratky: { label: 'Krátky', sentences: 3, exc: 1, soft: 0, cents: 25 },
    stredny: { label: 'Stredný', sentences: 6, exc: 1, soft: 1, cents: 50 },
    dlhy: { label: 'Dlhý', sentences: 10, exc: 2, soft: 2, cents: 100 },
  };

  const WORD_RE = /[\p{L}]+(?:-[\p{L}]+)*/gu;

  /** Miesta s i/í/y/ý v slove (malými písmenami) a čo je pred nimi. */
  function positions(w) {
    const out = [];
    for (let i = 0; i < w.length; i++) {
      const c = w[i];
      if (!IY.includes(c)) continue;
      if (c === 'i' && w[i + 1] && 'aeu'.includes(w[i + 1])) continue; // dvojhlásky ia, ie, iu
      let prev = w[i - 1] || '';
      let cat;
      if (!prev) cat = 'start';
      else if (prev === 'h' && w[i - 2] === 'c') { prev = 'ch'; cat = 'hard'; }
      else if (prev === 'z' && w[i - 2] === 'd') { prev = 'dz'; cat = 'soft'; }
      else if (prev === 'ž' && w[i - 2] === 'd') { prev = 'dž'; cat = 'soft'; }
      else if (OBO.includes(prev)) cat = 'obo';
      else if (HARD.includes(prev)) cat = 'hard';
      else if (SOFT.includes(prev)) cat = 'soft';
      else cat = 'vowel';
      out.push({ i, c, prev, cat });
    }
    return out;
  }

  const isY = (c) => c === 'y' || c === 'ý';
  const long = (c) => c === 'í' || c === 'ý';
  const quote = (s) => `„${s}“`;

  const SOFTEN = { d: 'ď', t: 'ť', n: 'ň', l: 'ľ' };
  /** Platí vysvetlenie výnimky z EXC pre toto miesto? */
  function excApplies(w, p) {
    const t = B.EXC[w];
    if (!t) return false;
    if (p.prev === 'c') return isY(p.c);
    if (p.cat !== 'hard' || isY(p.c)) return false;
    return 'dtnl'.includes(p.prev) ? /tvrdo/.test(t) : /tvrdom/.test(t);
  }

  /** Vysvetlenie jedného miesta i/y v správnom slove (kamarátsky tón). Vracia {text, kind, letter?}. */
  function explain(word, idx) {
    const w = word.toLowerCase();
    const pos = positions(w);
    const p = pos.find((x) => x.i === idx);
    if (!p) return { kind: 'iné', text: '' };
    const ch = isY(p.c) ? (long(p.c) ? 'ý' : 'y') : (long(p.c) ? 'í' : 'i');
    if (p.cat === 'obo') {
      const obo = pos.filter((x) => x.cat === 'obo');
      const n = obo.indexOf(p);
      const code0 = B.LEX[w];
      const code = Array.isArray(code0) ? code0[n] : code0;
      return fromCode(code, w, p, ch);
    }
    if (excApplies(w, p)) return { kind: 'výnimka', text: B.EXC[w] };
    if (p.cat === 'start') return { kind: 'pravidlo', text: `Lebo na začiatku slova píšeme ${ch}.` };
    if (p.cat === 'vowel') return { kind: 'pravidlo', text: `Lebo po samohláske píšeme mäkké ${ch}.` };
    if (p.cat === 'soft') {
      if (isY(p.c)) return { kind: 'výnimka', text: `Lebo je to cudzie slovo a v ňom sa po mäkkom c píše tvrdé ${ch}. Je to výnimka, ako bicykel alebo cyklista.` };
      return { kind: 'mäkká', text: `Lebo pred ním je ${p.prev} a to je mäkká spoluhláska. Po mäkkých spoluhláskach (ž, š, č, c, j, ď, ť, ň, ľ, dz, dž) píšeme vždy mäkké ${ch}.` };
    }
    if ('dtnl'.includes(p.prev)) {
      if (isY(p.c)) return { kind: 'tvrdá', text: `Lebo ${p.prev}${ch} vyslovujeme tvrdo. Keď d, t, n, l znie tvrdo, píšeme tvrdé ${ch}.` };
      return { kind: 'mäkké i', text: `Lebo to vyslovujeme mäkko, ako ${SOFTEN[p.prev]}${ch}. Keď d, t, n, l znie mäkko, píšeme mäkké ${ch}. Mäkčeň nad ${p.prev} vtedy nepíšeme, i ho zmäkčí samo.` };
    }
    if (isY(p.c)) return { kind: 'tvrdá', text: `Lebo pred ním je ${p.prev} a to je tvrdá spoluhláska. Po tvrdých spoluhláskach (h, ch, k, g, d, t, n, l) píšeme tvrdé ${ch}.` };
    return { kind: 'výnimka', text: `Lebo je to cudzie slovo. V cudzích slovách sa píše mäkké ${ch} aj po tvrdom ${p.prev}. Je to výnimka, ako kino alebo gitara.` };
  }

  function fromCode(code, w, p, ch) {
    const l = p.prev;
    if (!code || code === 'auto') return { kind: 'pravidlo', text: `Lebo po ${l} píšeme tvrdé y iba vo vybraných slovách. Inak mäkké i.` };
    if (code === 'vy') return { kind: 'vybrané', letter: 'v', text: `Lebo slovo začína predponou vy- (alebo vý-), ako vyskočiť alebo výlet. Táto predpona patrí medzi vybrané slová po V, preto je v nej vždy tvrdé ${ch}.` };
    if (code === 'pri') return { kind: 'mäkké i', text: `Lebo pri (alebo prí-) nie je vybrané slovo. Po r píšeme tvrdé y iba vo vybraných slovách ako ryba alebo rýchly, inak mäkké ${ch}.` };
    if (code === 'exc') return { kind: 'výnimka', text: B.EXC[w] || 'Toto je výnimka v cudzom slove.' };
    if (code.startsWith('vs:')) {
      const [, L, base] = code.split(':');
      const same = base.split(/[ ,(]/)[0].toLowerCase() === w;
      return { kind: 'vybrané', letter: L, text: same
        ? `Lebo ${quote(w)} je vybrané slovo po ${L.toUpperCase()}. Vo vybraných slovách píšeme vždy tvrdé y, preto ${ch}.`
        : `Lebo ${quote(w)} patrí do rodiny vybraného slova ${base} (po ${L.toUpperCase()}). Vybrané slová aj celá ich rodina sa píšu s tvrdým y, preto ${ch}.` };
    }
    if (code.startsWith('end:')) return { kind: 'koncovka', text: B.ENDINGS[code.slice(4)] || 'Lebo je to koncovka slova.' };
    if (code.startsWith('not')) {
      const hint = code.slice(4);
      return { kind: 'mäkké i', text: `Lebo ${quote(w)} nie je vybrané slovo ani z rodiny vybraných slov. Po ${l} píšeme tvrdé y iba vo vybraných slovách, všade inde mäkké ${ch}.${hint ? ' Pozor: ' + hint + '.' : ''}` };
    }
    return { kind: 'pravidlo', text: '' };
  }

  /** Vlastnosti vety: písmená vybraných slov, výnimky, mäkké i. */
  function tagSentence(text) {
    const letters = new Set(); let exc = false; let softI = false; let excType = '';
    for (const m of text.matchAll(WORD_RE)) {
      const w = m[0].toLowerCase();
      for (const p of positions(w)) {
        const e = explain(w, p.i);
        if (e.kind === 'vybrané') letters.add(e.letter);
        if (e.kind === 'výnimka') { exc = true; excType = excType || (p.cat === 'soft' ? 'c' : 'k'); }
        if (!isY(p.c) && p.cat !== 'start' && p.cat !== 'vowel' && e.kind !== 'výnimka') softI = true;
      }
    }
    return { letters: [...letters], exc, excType, softI };
  }

  const TAGGED = B.SENTENCES.map((text, id) => ({ id, text, ...tagSentence(text) }));

  function shuffle(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
    return r;
  }

  /** Vygeneruje diktát. recent = id viet, ktoré boli nedávno (dajú sa až nakoniec). */
  function generate(lengthKey, letters, recent = []) {
    const cfg = LENGTHS[lengthKey];
    const sel = new Set(letters.length ? letters : LETTERS);
    const rec = new Set(recent);
    const order = (arr) => { const s = shuffle(arr); return [...s.filter((x) => !rec.has(x.id)), ...s.filter((x) => rec.has(x.id))]; };
    const subset = (t) => t.letters.every((l) => sel.has(l));
    const used = new Set();
    const pick = (cands) => { const t = cands.find((x) => !used.has(x.id)); if (t) used.add(t.id); return t; };

    const out = [];
    // výnimky (pri dlhom jedna s k/g a jedna s c, ak sa dá)
    const excPool = order(TAGGED.filter((t) => t.exc && subset(t)));
    for (let k = 0; k < cfg.exc; k++) {
      const want = k === 1 ? (out[0]?.excType === 'c' ? 'k' : 'c') : null;
      const t = pick(want ? [...excPool.filter((x) => x.excType === want), ...excPool] : excPool);
      if (t) out.push(t);
    }
    // iné slová s mäkkým i
    const softPool = order(TAGGED.filter((t) => !t.exc && !t.letters.length && t.softI));
    for (let k = 0; k < cfg.soft; k++) { const t = pick(softPool); if (t) out.push(t); }
    // vybrané slová – striedanie zvolených písmen
    const vsPool = order(TAGGED.filter((t) => !t.exc && t.letters.some((l) => sel.has(l))));
    const strict = vsPool.filter(subset);
    const loose = vsPool.filter((t) => !subset(t));
    const selList = shuffle([...sel]);
    let li = 0; let guard = 0;
    while (out.length < cfg.sentences && guard++ < 200) {
      const l = selList[li++ % selList.length];
      const t = pick(strict.filter((x) => x.letters.includes(l))) || pick(strict) || pick(loose.filter((x) => x.letters.includes(l))) || pick(loose);
      if (!t) break;
      out.push(t);
    }
    // aspoň jedna veta s mäkkým i
    if (!out.some((t) => t.softI)) {
      const t = pick(softPool); if (t) out[out.length - 1] = t;
    }
    // poradie: vybrané slová, výnimky a mäkké i premiešané, nezačínať výnimkou
    let res = shuffle(out);
    if (res.length > 1 && res[0].exc) res.push(res.shift());
    return {
      length: lengthKey,
      letters: [...sel].sort((a, b) => LETTERS.indexOf(a) - LETTERS.indexOf(b)),
      sentences: res.map((t) => t.text),
      ids: res.map((t) => t.id),
      text: res.map((t) => t.text).join(' '),
    };
  }

  /** Rozdelí vetu na úseky na diktovanie (po čiarkach, max ~3 slová). */
  function chunks(sentence, maxWords = 3) {
    const parts = sentence.split(/(?<=,)\s+/);
    const out = [];
    for (const part of parts) {
      const words = part.split(/\s+/).filter(Boolean);
      let i = 0;
      while (i < words.length) {
        let n = Math.min(maxWords, words.length - i);
        if (words.length - i - n === 1) n = words.length - i <= maxWords + 1 ? words.length - i : n - 1;
        out.push(words.slice(i, i + n).join(' '));
        i += n;
      }
    }
    return out;
  }

  // ---------------- kontrola ----------------
  const stripDia = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const fold = (s) => stripDia(s.toLowerCase()).replace(/y/g, 'i');

  function tokenize(text) {
    const toks = [];
    const re = /([\p{L}]+(?:-[\p{L}]+)*)([^\p{L}]*)/gu;
    const clean = text.replace(/[“”„"«»]/g, '').replace(/\s+/g, ' ').trim();
    let m;
    while ((m = re.exec(clean))) {
      const punct = m[2].replace(/[^.,!?;:]/g, '');
      toks.push({ w: m[1], p: punct });
    }
    return toks;
  }

  function lev(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return d;
  }

  /** Zarovnanie písmen dvoch slov – vracia páry [znakOrig, znakDieťa, indexOrig]. */
  function charAlign(a, b) {
    const d = lev(a, b);
    let i = a.length, j = b.length; const out = [];
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) { out.push([a[i - 1], b[j - 1], i - 1]); i--; j--; }
      else if (i > 0 && d[i][j] === d[i - 1][j] + 1) { out.push([a[i - 1], '', i - 1]); i--; }
      else { out.push(['', b[j - 1], i]); j--; }
    }
    return out.reverse();
  }

  function wordCost(a, b) {
    if (a === b) return 0;
    if (fold(a) === fold(b)) return 0.3;
    const x = a.toLowerCase(), y = b.toLowerCase();
    const dist = lev(x, y)[x.length][y.length];
    const sim = 1 - dist / Math.max(x.length, y.length);
    return sim >= 0.5 ? 0.6 + (1 - sim) : 3;
  }

  function alignWords(A, Bw) {
    const n = A.length, m = Bw.length;
    const D = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = 1; i <= n; i++) D[i][0] = i;
    for (let j = 1; j <= m; j++) D[0][j] = j;
    for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
      D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + wordCost(A[i - 1].w, Bw[j - 1].w));
    }
    let i = n, j = m; const out = [];
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && Math.abs(D[i][j] - (D[i - 1][j - 1] + wordCost(A[i - 1].w, Bw[j - 1].w))) < 1e-9) { out.push([A[i - 1], Bw[j - 1]]); i--; j--; }
      else if (i > 0 && Math.abs(D[i][j] - (D[i - 1][j] + 1)) < 1e-9) { out.push([A[i - 1], null]); i--; }
      else { out.push([null, Bw[j - 1]]); j--; }
    }
    return out.reverse();
  }

  const PUNCT_NAME = { '.': 'bodku', ',': 'čiarku', '?': 'otáznik', '!': 'výkričník' };
  const COMMA_WORDS = ['že', 'ale', 'aby', 'keď', 'lebo', 'ktorý', 'ktorá', 'ktoré', 'kedy', 'či', 'kde', 'prosím'];

  /** Rozbor jedného slova: zoznam chýb {kind, tip}. */
  function wordIssues(orig, got, sentenceStart) {
    const issues = [];
    if (orig.toLowerCase() === got.toLowerCase()) {
      issues.push({ kind: 'veľké písmeno', tip: sentenceStart && orig[0] !== orig[0].toLowerCase()
        ? 'Na začiatku vety píšeme veľké písmeno.'
        : orig[0] !== orig[0].toLowerCase() ? 'Vlastné mená (mestá, rieky, mená ľudí) píšeme s veľkým písmenom.' : 'Toto slovo píšeme s malým písmenom.' });
      return issues;
    }
    const lo = orig.toLowerCase(), lg = got.toLowerCase();
    let other = false;
    for (const [a, b, idx] of charAlign(lo, lg)) {
      if (a === b) continue;
      if (a && b && IY.includes(a) && IY.includes(b)) {
        if (isY(a) !== isY(b)) {
          const e = explain(lo, idx);
          const extra = long(a) !== long(b) ? (long(a) ? ` A je dlhé, s dĺžňom: ${a}.` : ` A je krátke, bez dĺžňa: ${a}.`) : '';
          issues.push({ kind: 'i/y', tip: (e.text || `Tu píšeme ${a}.`) + extra, rule: e.kind });
        } else {
          issues.push({ kind: 'dĺžeň', tip: long(a) ? `Tu je dlhé ${a} – píšeme ho s dĺžňom.` : `Tu je krátke ${a} – bez dĺžňa.` });
        }
      } else if (a && b && stripDia(a) === stripDia(b)) {
        issues.push({ kind: 'mäkčeň/dĺžeň', tip: `Má tu byť ${a}, nie ${b}.` });
      } else other = true;
    }
    if (other) issues.push({ kind: 'pravopis', tip: `Slovo sa píše ${quote(orig)}.` });
    if (!issues.length) issues.push({ kind: 'pravopis', tip: `Slovo sa píše ${quote(orig)}.` });
    // veľké písmeno navyše k inej chybe
    if (orig[0] !== got[0] && orig[0].toLowerCase() === got[0].toLowerCase()) {
      issues.push({ kind: 'veľké písmeno', tip: sentenceStart ? 'Na začiatku vety píšeme veľké písmeno.' : 'Pozor na veľké a malé písmeno.' });
    }
    return issues;
  }

  /** Kontrola napísaného diktátu. */
  function grade(text, answer) {
    const A = tokenize(text);
    const G = tokenize(answer || '');
    const pairs = alignWords(A, G);
    const items = []; let mistakes = 0; let iy = 0; let found = 0;
    let prevPunct = '.';
    pairs.forEach(([o, g], k) => {
      if (o) {
        const start = /[.!?]/.test(prevPunct);
        prevPunct = o.p || '';
        if (!g) { items.push({ orig: o, got: null, issues: [{ kind: 'chýba slovo', tip: `Vynechal si slovo ${quote(o.w)}.` }] }); mistakes++; return; }
        found++;
        const issues = o.w === g.w ? [] : wordIssues(o.w, g.w, start);
        if (o.p !== g.p) {
          const missing = [...o.p].filter((c) => !g.p.includes(c));
          const extra = [...g.p].filter((c) => !o.p.includes(c));
          for (const c of missing) {
            const next = A[A.indexOf(o) + 1];
            let tip = `Tu patrí ${PUNCT_NAME[c] || c}.`;
            if (c === '.') tip = 'Na konci oznamovacej vety píšeme bodku.';
            if (c === '?') tip = 'Na konci opytovacej vety píšeme otáznik.';
            if (c === '!') tip = 'Na konci zvolacej vety píšeme výkričník.';
            if (c === ',' && next && COMMA_WORDS.includes(next.w.toLowerCase())) tip = `Pred slovom ${quote(next.w)} píšeme čiarku.`;
            else if (c === ',') tip = 'Tu sa časti vety oddeľujú čiarkou.';
            issues.push({ kind: 'interpunkcia', tip });
          }
          for (const c of extra) issues.push({ kind: 'interpunkcia', tip: `Tu ${PUNCT_NAME[c] || c} nepatrí.` });
        }
        if (issues.length) {
          mistakes += issues.filter((x) => x.kind !== 'interpunkcia').length ? 1 : 0;
          mistakes += issues.filter((x) => x.kind === 'interpunkcia').length;
          iy += issues.filter((x) => x.kind === 'i/y').length;
        }
        items.push({ orig: o, got: g, issues });
      } else {
        items.push({ orig: null, got: g, issues: [{ kind: 'navyše', tip: `Slovo ${quote(g.w)} v diktáte nie je.` }] });
        mistakes++;
      }
    });
    return { items, mistakes, iy, words: A.length, found };
  }

  /** Miesta na doplnenie (i/í/y/ý po obojakých, tvrdých h, ch, k, g, po c a vo výnimkách). */
  function gapPlan(text) {
    const parts = []; let last = 0; let gid = 0;
    for (const m of text.matchAll(WORD_RE)) {
      const w = m[0]; const lw = w.toLowerCase();
      const gaps = positions(lw).filter((p) => p.cat === 'obo' || ['h', 'ch', 'k', 'g', 'c'].includes(p.prev) || excApplies(lw, p));
      if (!gaps.length) continue;
      parts.push({ t: text.slice(last, m.index) });
      let wl = 0;
      for (const g of gaps) {
        parts.push({ t: w.slice(wl, g.i) });
        parts.push({ gap: gid++, answer: w[g.i], word: w, idx: g.i });
        wl = g.i + 1;
      }
      parts.push({ t: w.slice(wl) });
      last = m.index + w.length;
    }
    parts.push({ t: text.slice(last) });
    return parts.filter((p) => p.gap !== undefined || p.t);
  }

  function gradeGaps(plan, answers) {
    const items = []; let mistakes = 0; let iy = 0;
    for (const p of plan) {
      if (p.gap === undefined) continue;
      const got = (answers[p.gap] || '').trim().toLowerCase().slice(0, 1);
      const ok = got === p.answer.toLowerCase();
      let tip = '';
      let kind = '';
      if (!ok) {
        mistakes++;
        if (got && IY.includes(got) && isY(got) === isY(p.answer.toLowerCase())) { kind = 'dĺžeň'; tip = long(p.answer) ? `Tu je dlhé ${p.answer}.` : `Tu je krátke ${p.answer}, bez dĺžňa.`; }
        else { const e = explain(p.word, p.idx); kind = e.kind === 'pravidlo' ? 'i/y' : e.kind; iy++; tip = e.text; }
      }
      items.push({ ...p, got, ok, kind, tip });
    }
    return { items, mistakes, iy, words: items.length, found: items.filter((x) => x.got).length };
  }

  /** Všetky miesta i/y v slove s vysvetlením (na klikanie v správnom texte). */
  function wordInfo(word) {
    const lw = word.toLowerCase();
    const list = positions(lw).map((p) => ({ ...p, ch: word[p.i], ...explain(lw, p.i) }));
    const rank = { 'vybrané': 3, 'výnimka': 2 };
    const top = list.reduce((a, x) => Math.max(a, rank[x.kind] || 1), 0);
    return { list, cls: top === 3 ? 'vs' : top === 2 ? 'exc' : list.length ? 'iy' : '' };
  }

  return { wordInfo, LETTERS, LENGTHS, TAGGED, positions, explain, tagSentence, generate, chunks, grade, gapPlan, gradeGaps, tokenize, WORD_RE };
})();
