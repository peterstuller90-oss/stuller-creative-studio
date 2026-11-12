// Kontrola banky viet Učiteľa: každé i/y po obojakej spoluhláske musí mať vysvetlenie.
import fs from 'node:fs'
const dir = new URL('../public/apps/ucitel/', import.meta.url)
globalThis.window = globalThis
eval(fs.readFileSync(new URL('bank.js', dir), 'utf8'))
eval(fs.readFileSync(new URL('engine.js', dir), 'utf8'))
const B = window.UCITEL_BANK, E = window.UCITEL_ENGINE
const missing = new Map(), dtnl = new Set(), hardI = new Set()
let bad = 0
for (const s of B.SENTENCES) for (const m of s.matchAll(E.WORD_RE)) {
  const w = m[0].toLowerCase(), pos = E.positions(w)
  const obo = pos.filter(p => p.cat === 'obo')
  const code = B.LEX[w]
  if (obo.length && (!code || code === 'auto')) missing.set(w, s)
  if (Array.isArray(code) && code.length !== obo.length) { console.log('ZLÝ POČET KÓDOV', w, code, obo.length); bad++ }
  for (const p of obo) if ((p.c === 'y' || p.c === 'ý') && code && !Array.isArray(code) && code.startsWith('not')) { console.log('Y ale not:', w); bad++ }
  for (const p of pos) {
    if (p.cat === 'hard' && 'dtnl'.includes(p.prev) && 'ií'.includes(p.c)) dtnl.add(w)
    if (p.cat === 'hard' && !'dtnl'.includes(p.prev) && 'ií'.includes(p.c) && !B.EXC[w]) hardI.add(w)
    if (p.prev === 'c' && 'yý'.includes(p.c) && !B.EXC[w]) hardI.add(w)
  }
}
for (const [w, s] of missing) console.log('CHÝBA', w, '|', s)
console.log('hard k/g/h + i bez EXC:', [...hardI].join(', '))
console.log('d/t/n/l + i (skontroluj tvrdú výslovnosť):', [...dtnl].join(', '))
const t = E.TAGGED
for (const l of E.LETTERS) console.log(l, t.filter(x => x.letters.includes(l)).length, 'čisto', t.filter(x => x.letters.length === 1 && x.letters[0] === l && !x.exc).length)
console.log('výnimky', t.filter(x => x.exc).length, 'mäkké', t.filter(x => !x.exc && !x.letters.length && x.softI).length, 'bez kategórie:', t.filter(x => !x.exc && !x.letters.length && !x.softI).map(x => x.text))
for (const k of ['kratky','stredny','dlhy']) { const g = E.generate(k, ['b','r']); console.log(k, g.sentences) }
process.exit(missing.size + bad ? 1 : 0)
