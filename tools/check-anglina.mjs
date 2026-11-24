// Kontrola slovíčok Angliny: node tools/check-anglina.mjs
import { readFileSync } from 'node:fs';
const g = { window: {} };
new Function('window', readFileSync(new URL('../public/apps/anglina/engine.js', import.meta.url), 'utf8'))(g.window);
const E = g.window.ANGLINA_ENGINE;
let bad = 0;
const fail = (m) => { bad++; console.error('CHYBA:', m); };
for (const t of E.TOPICS.filter((x) => !x.qa && !x.sent)) {
  if (t.words.length < 7) fail(`${t.id}: málo slov`);
  const en = new Set(); const sk = new Set();
  for (const w of t.words) {
    if (en.has(w.en)) fail(`${t.id}: dvakrát ${w.en}`); en.add(w.en);
    if (sk.has(w.sk)) fail(`${t.id}: dvakrát ${w.sk}`); sk.add(w.sk);
    if (!/^[A-Za-z][A-Za-z -]*$/.test(w.en)) fail(`${w.id}: zvláštne znaky`);
    if (w.tip && (w.tip.match(/\{/g) || []).length !== (w.tip.match(/\}/g) || []).length) fail(`${w.id}: zátvorky v tipe`);
    if (!E.check({ id: w.id }, w.en) || !E.check({ id: w.id }, w.en.toUpperCase())) fail(`${w.id}: kontrola`);
    for (const a of w.alt || []) if (!E.check({ id: w.id }, a)) fail(`${w.id}: alt ${a}`);
    if (E.check({ id: w.id }, w.en + 'x')) fail(`${w.id}: uznal zlé`);
    const x = E.explain({ id: w.id }); if (!x.seq.length || x.lines.some((l) => /[{}]/.test(l))) fail(`${w.id}: vysvetlenie`);
  }
}
// neopakovanie: 5 cvičení po sebe v téme veci (15 slov, po 8) – žiadne dve rovnaké sady, slová sa striedajú
for (const level of ['lahke', 'stredne', 'tazke']) {
  const hist = [];
  for (let k = 0; k < 6; k++) {
    const items = E.generate('veci', level, 'kratke', 'tablet', hist);
    const ids = items.map((i) => i.id);
    if (new Set(ids).size !== ids.length) fail('opakované slovo v jednom cvičení');
    if (hist[0] && ids.every((id) => hist[0].ids.includes(id))) fail('rovnaká sada ako minule');
    if (k === 1 && ids.filter((id) => hist[0].ids.includes(id)).length > 1) fail('druhé cvičenie neprednostnilo nové slová');
    for (const it of items) if (it.opts && (it.opts.length !== 4 || !it.opts.includes(it.id))) fail('možnosti');
    hist.unshift({ ids });
  }
}
// poskladaj: písmená sú rozhádzané, správne poskladané slovo sa uzná, iné poradie nie
for (const t of E.TOPICS.filter((x) => !x.qa && !x.sent)) for (const w of t.words) {
  const [it] = E.generate(t.id, 'poskladaj', 'kratke', 'tablet', []).filter((x) => x.id === w.id).concat([{ id: w.id, tiles: w.en.replace(/[ -]/g, '').split('').reverse() }]);
  const letters = w.en.replace(/[ -]/g, '');
  if (it.tiles.slice().sort().join('') !== letters.split('').sort().join('')) fail(`${w.id}: dlaždice`);
  const used = new Set(); const picks = letters.split('').map((ch) => { const i = it.tiles.findIndex((x, j) => x === ch && !used.has(j)); used.add(i); return i; });
  if (!E.check(it, E.assemble(w.en, it.tiles, picks))) fail(`${w.id}: poskladané správne neuznané`);
  if (new Set(letters).size > 1 && E.check(it, E.assemble(w.en, it.tiles, picks.slice().reverse()))) { if (letters !== letters.split('').reverse().join('')) fail(`${w.id}: zlé poradie uznané`); }
}
for (const t of E.TOPICS.filter((x) => x.qa)) {
  const ids = new Set();
  for (const w of t.words) {
    if (ids.has(w.id)) fail(`${w.id}: dvakrát`); ids.add(w.id);
    if (!w.a || !w.aSk || !w.sk) fail(`${w.id}: chýba odpoveď`);
    if (E.sayAns(w.a).length !== w.aSk.split(' / ').length) fail(`${w.id}: počet odpovedí sk/en`);
    const x = E.explain({ id: w.id }); if (x.lines.some((l) => /[{}]/.test(l))) fail(`${w.id}: vysvetlenie`);
    if (!E.check({ id: w.id }, 'ok') || E.check({ id: w.id }, 'no')) fail(`${w.id}: kontrola`);
  }
}
// vety z učebnice: presne 4 rôzne možnosti, správna medzi nimi, jedno ___ alebo otázka, vysvetlenie bez zátvoriek
for (const t of E.TOPICS.filter((x) => x.sent)) {
  const keys = new Set();
  for (const w of t.words) {
    if (keys.has(w.text + w.a)) fail(`${w.id}: dvakrát`); keys.add(w.text + w.a);
    if (w.opts.length !== 4 || new Set(w.opts).size !== 4 || !w.opts.includes(w.a)) fail(`${w.id}: možnosti`);
    const blanks = (w.text.match(/___/g) || []).length;
    if (!(blanks === 1 || (blanks === 0 && w.text.endsWith('?')))) fail(`${w.id}: medzera ___`);
    if (!w.sk || !E.check({ id: w.id }, w.a) || w.opts.some((o) => o !== w.a && E.check({ id: w.id }, o))) fail(`${w.id}: kontrola`);
    if (w.tip && (w.tip.match(/\{/g) || []).length !== (w.tip.match(/\}/g) || []).length) fail(`${w.id}: zátvorky v tipe`);
    const x = E.explain({ id: w.id }); if (!x.seq.length || x.lines.some((l) => /[{}]/.test(l))) fail(`${w.id}: vysvetlenie`);
    if (w.poster) { const row = E.POSTER.find((r) => w.text.includes(r[0])); const col = w.text.includes('3 o') ? 1 : 2; if (!row || !w.a.endsWith(row[col])) fail(`${w.id}: nesedí s plagátom`); }
  }
  const items = E.generate(t.id, 'veta', 'dlhe', 'tablet', []);
  if (new Set(items.map((i) => i.id)).size !== items.length || items.some((i) => i.opts.length !== 4)) fail('vety: generovanie');
}
if (E.pick('mix', 300).some((w) => w.sent || w.qa)) fail('mix obsahuje vety alebo otázky');
const mix = E.generate('mix', 'tazke', 'dlhe', 'papier', []);
if (new Set(mix.map((i) => E.word(i.id).en)).size !== mix.length) fail('mix: rovnaké slovo dvakrát');
console.log(bad ? `${bad} chýb` : `OK – ${E.TOPICS.reduce((a, t) => a + t.words.length, 0)} slov v ${E.TOPICS.length} témach`);
process.exit(bad ? 1 : 0);
