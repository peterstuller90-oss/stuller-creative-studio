// Overí generátor Matiky: 5 000 sád, každý výsledok sa prepočíta, obor do 10 000, násobilka do 100, vysvetlenia bez chýb.
// Použitie: node tools/check-matika.mjs
import fs from 'node:fs'
globalThis.window = {}
eval(fs.readFileSync(new URL('../public/apps/matika/engine.js', import.meta.url), 'utf8'))
const E = window.MATIKA_ENGINE
let bad = 0
for (const op of [...E.OP_IDS, 'mix']) for (const lv of Object.keys(E.LEVELS)) for (let r = 0; r < 330; r++) {
  const set = E.generate(op, lv, 'dlhe')
  if (set.length !== 30) { bad++; console.log('krátka sada', op, lv) }
  for (const it of set) {
    const { a, b, ans } = it
    const exp = it.op === 'plus' ? a + b : it.op === 'minus' ? a - b : it.op === 'krat' ? a * b : a / b
    const ok = Number.isInteger(ans) && ans === exp && ans >= 0 && Math.max(a, b, ans) <= 10000 && !(it.op === 'deleno' && b === 0)
      && !(it.kind === 'nas' && ans > 100) && !(it.kind === 'del' && a > 100)
    if (!ok) { bad++; console.log('ZLÉ', it) }
    const x = E.explain(it)
    if (/undefined|NaN|null/.test(x.head + x.lines.join(' '))) { bad++; console.log('VYSVETLENIE', it, x) }
  }
}
console.log(bad ? `CHYBY: ${bad}` : 'OK – všetko sedí')
process.exit(bad ? 1 : 0)
