// Učiteľ 2.0: zoznam všetkého, čo appka hovorí (vety, kúsky na diktovanie, pokyny, vysvetlivky).
// Zapíše public/apps/ucitel/audio/texts.json ({kľúč: text}) a audio/clips.js so zoznamom kľúčov,
// pre ktoré už existuje nahrávka audio/<kľúč>.m4a. Appka hrá len nahrávky zo zoznamu, inak použije hlas prehliadača.
// Použitie: node tools/ucitel-speech-list.mjs
import fs from 'node:fs'
import vm from 'node:vm'

const dir = new URL('../public/apps/ucitel/', import.meta.url)
const ctx = { window: {}, console }
vm.createContext(ctx)
for (const f of ['lines.js', 'bank.js', 'engine.js']) vm.runInContext(fs.readFileSync(new URL(f, dir), 'utf8'), ctx, { filename: f })
const { UCITEL_LINES: L, UCITEL_PUNCT: PUNCT, UCITEL_KEY: KEY, UCITEL_BANK: B, UCITEL_ENGINE: E } = ctx.window

const texts = new Map()
const add = (t) => { if (t && t.trim()) texts.set(KEY(t), t.trim()) }

Object.values(L).flat().forEach(add)
const sentences = [...B.SENTENCES, ...B.HARD]
for (const s of sentences) {
  add(s)
  for (const c of E.chunks(s)) {
    add(c)
    const last = c.slice(-1)
    if (PUNCT[last]) add(`${c.replace(/[.,?!]$/, '')}, ${PUNCT[last]}`)
  }
  for (const m of s.matchAll(E.WORD_RE)) {
    const w = m[0]
    add(w)
    for (const x of E.wordInfo(w).list) { add(x.say); add(x.text) }
    for (const x of E.otherFeatures(w)) { add(x.say); add(x.text) }
  }
}

const out = Object.fromEntries([...texts].sort((a, b) => (a[0] < b[0] ? -1 : 1)))
fs.mkdirSync(new URL('audio/', dir), { recursive: true })
fs.writeFileSync(new URL('audio/texts.json', dir), JSON.stringify(out, null, 0))
const have = Object.keys(out).filter((k) => fs.existsSync(new URL(`audio/${k}.m4a`, dir)))
fs.writeFileSync(new URL('audio/clips.js', dir), `/* Zoznam nahrávok hlasom Laura (kľúče z UCITEL_KEY). Generuje tools/ucitel-speech-list.mjs. */\nwindow.UCITEL_CLIPS = '${have.join(',')}';\n`)
const chars = Object.values(out).reduce((a, t) => a + t.length, 0)
console.log(`textov: ${texts.size}, znakov: ${chars}, nahraných: ${have.length}, chýba: ${texts.size - have.length}`)
