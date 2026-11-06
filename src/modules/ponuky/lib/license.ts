import { fmtNum, lineTotal, uid } from './calc'
import type { LicenseInfo, LicenseSettings, Line, Quote } from './types'

/* ───────── Price ───────── */

export function emptyLicense(s: LicenseSettings): LicenseInfo {
  return { uses: [], pieces: 0, duration: s.duration[0]?.label ?? '', territory: s.territory[0]?.label ?? '', base: null }
}

/** The quantity band for a number of pieces; none when the quote has no "large run". */
export function qtyBand(s: LicenseSettings, pieces: number) {
  const bands = [...s.quantity].sort((a, b) => (a.upTo || Infinity) - (b.upTo || Infinity))
  if (!pieces) return undefined
  return bands.find((b) => !b.upTo || pieces <= b.upTo) ?? bands[bands.length - 1]
}

/** Price of the work the license is computed from: the other lines, unless typed in by hand. */
export const autoBase = (lines: Line[]) => Math.round(lines.filter((l) => l.kind !== 'licencia').reduce((s, l) => s + lineTotal(l), 0) * 100) / 100

export interface LicensePrice { fee: number; base: number; steps: { label: string; value: string }[] }

export function licensePrice(lic: LicenseInfo, s: LicenseSettings, exclusive: boolean, lines: Line[]): LicensePrice {
  const base = lic.base ?? autoBase(lines)
  const uses = s.uses.filter((u) => lic.uses.includes(u.label))
  const useSum = uses.reduce((a, u) => a + u.coef, 0)
  const qty = qtyBand(s, lic.pieces)
  const time = s.duration.find((d) => d.label === lic.duration) ?? s.duration[0]
  const area = s.territory.find((t) => t.label === lic.territory) ?? s.territory[0]
  const excl = exclusive ? s.exclusiveCoef : 1
  const fee = Math.round(base * s.basePct / 100 * useSum * (qty?.coef ?? 1) * (time?.coef ?? 1) * (area?.coef ?? 1) * excl)
  const x = (n: number) => `× ${fmtNum(n)}`
  const steps = [
    { label: 'Cena diela (základ)', value: `${fmtNum(base)} €` },
    { label: 'Podiel licencie', value: `× ${fmtNum(s.basePct)} %` },
    { label: `Použitie: ${uses.map((u) => u.label).join(' + ') || 'nič nevybraté'}`, value: x(useSum) },
    ...(lic.pieces ? [{ label: `Veľký náklad: ${fmtNum(lic.pieces)} ks (${qty?.label})`, value: x(qty?.coef ?? 1) }] : []),
    { label: `Doba: ${time?.label ?? ''}`, value: x(time?.coef ?? 1) },
    { label: `Územie: ${area?.label ?? ''}`, value: x(area?.coef ?? 1) },
    { label: exclusive ? 'Výhradná licencia' : 'Nevýhradná licencia', value: x(excl) },
  ]
  return { fee, base, steps }
}

/**
 * Keep the quote consistent with its license: one "Licencia" line with the computed fee,
 * and the license wording in the contract. Safe to call after every change.
 */
export function applyLicense(q: Quote, s: LicenseSettings): Quote {
  const others = q.lines.filter((l) => l.kind !== 'licencia')
  if (!q.license) return others.length === q.lines.length ? q : { ...q, lines: others }
  const lic = q.license
  const { fee } = licensePrice(lic, s, q.contract.exclusive, q.lines)
  const pieces = lic.pieces ? `, náklad do ${fmtNum(lic.pieces)} ks` : ''
  const description = `${lic.uses.join(', ') || 'použitie doplniť'}${pieces}; ${lic.territory}; ${lic.duration}; ${q.contract.exclusive ? 'výhradná' : 'nevýhradná'}`
  const old = q.lines.find((l) => l.kind === 'licencia')
  const line: Line = { id: old?.id ?? uid(), name: 'Licencia na použitie diela', description, qty: 1, unit: 'paušál', unitPrice: fee, coef: 1, coefLabel: '', kind: 'licencia' }
  const sameLine = old && old.unitPrice === line.unitPrice && old.description === line.description && old.qty === 1 && old.coef === 1
  const lines = sameLine ? q.lines : old ? q.lines.map((l) => (l.kind === 'licencia' ? line : l)) : [...q.lines, line]
  const contract = { ...q.contract, territory: lic.territory, duration: lic.duration }
  const sameContract = contract.territory === q.contract.territory && contract.duration === q.contract.duration
  if (sameLine && sameContract) return q
  return { ...q, lines, contract: sameContract ? q.contract : contract }
}

/* ───────── Reading a brief (plain keyword search, no AI) ───────── */

/** Lowercase without diacritics, one character per character so positions match the original. */
const fold = (text: string) => Array.from(text, (c) => {
  const f = c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  return f.length === 1 ? f : c.toLowerCase().slice(0, 1) || ' '
}).join('')

const words = (keywords: string) => keywords.split(',').map((k) => k.trim()).filter(Boolean)

/** First place where a keyword starts a word. Short keywords (SR, EU…) must be the whole word. */
function findWord(folded: string, keyword: string): number {
  const k = fold(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = keyword.length <= 3 ? new RegExp(`(^|[^a-z0-9])${k}(?![a-z0-9])`) : new RegExp(`(^|[^a-z0-9])${k}`)
  const m = re.exec(folded)
  return m ? m.index + m[1].length : -1
}

/** The whole word in the original text at a position, for showing what was found. */
function wordAt(text: string, i: number) {
  const m = /^[\p{L}\p{N}-]+/u.exec(text.slice(i))
  return m ? m[0] : text.slice(i, i + 12)
}

const toNum = (s: string) => parseInt(s.replace(/[\s. ]/g, ''), 10) || 0

export interface BriefReading {
  license: LicenseInfo
  exclusive: boolean | null
  /** Sentences for Peter: what was found and why. */
  found: string[]
  /** What the brief does not say and Peter should ask the client. */
  missing: string[]
  /** The brief asks for an illustration / pattern / artwork. */
  wantsIllustration: boolean
}

export function readBrief(text: string, s: LicenseSettings): BriefReading {
  const f = fold(text)
  const found: string[] = []
  const missing: string[] = []
  const license = emptyLicense(s)

  // What the work will be used on.
  for (const u of s.uses) {
    const hits = [...new Set(words(u.keywords).map((k) => findWord(f, k)).filter((i) => i >= 0).map((i) => wordAt(text, i).toLowerCase()))]
    if (hits.length) { license.uses.push(u.label); found.push(`Použitie: ${u.label} (v zadaní: ${hits.slice(0, 4).map((h) => `„${h}“`).join(', ')})`) }
  }
  if (!license.uses.length) missing.push('Na čo presne chce klient dielo použiť (produkty, reklama, web…).')

  // How many pieces.
  const pcs = [...f.matchAll(/(\d[\d\s. ]{0,12}\d|\d)\s*(ks|kus|kusy|kusov|pcs|pieces)(?![a-z])/g)].map((m) => toNum(m[1]))
  const run = [...f.matchAll(/naklad\w*\s*(?:do|cca|asi|okolo|:)?\s*(\d[\d\s. ]{0,12}\d|\d)/g)].map((m) => toNum(m[1]))
  const pieces = Math.max(0, ...pcs, ...run)
  if (pieces) found.push(`V zadaní je náklad ${fmtNum(pieces)} ks. Ak je to veľa, zapni „Veľký náklad“.`)

  // How long.
  const forever = /(neobmedzen|navzdy|natrvalo|bez casoveho obmedzenia|trvania majetkovych prav|perpetu|unlimited)/.exec(f)
  const spans = [
    ...[...f.matchAll(/(\d+)\s*(rok|roky|rokov|year|years)(?![a-z])/g)].map((m) => ({ y: +m[1], i: m.index, n: m[0].length })),
    ...[...f.matchAll(/(\d+)\s*(mesiac|mesiace|mesiacov|month|months)(?![a-z])/g)].map((m) => ({ y: +m[1] / 12, i: m.index, n: m[0].length })),
  ].sort((a, b) => b.y - a.y)
  const want = forever ? 0 : spans[0]?.y ?? 0
  if (forever || want) {
    const sorted = [...s.duration].sort((a, b) => (a.years || Infinity) - (b.years || Infinity))
    const pick = forever ? sorted[sorted.length - 1] : sorted.find((d) => !d.years || want <= d.years)
    if (pick) { license.duration = pick.label; found.push(`Doba: ${pick.label} (v zadaní: „${forever ? wordAt(text, forever.index + forever[0].indexOf(forever[1])) : text.slice(spans[0].i, spans[0].i + spans[0].n)}“)`) }
  } else missing.push(`Na ako dlho chce klient licenciu – appka zatiaľ počíta „${license.duration}“.`)

  // Where.
  let area = null as LicenseSettings['territory'][number] | null
  let areaWord = ''
  for (const t of s.territory) for (const k of words(t.keywords)) {
    const i = findWord(f, k)
    if (i >= 0 && (!area || t.coef > area.coef)) { area = t; areaWord = wordAt(text, i) }
  }
  if (area) { license.territory = area.label; found.push(`Územie: ${area.label} (v zadaní: „${areaWord}“)`) } else missing.push(`Územie (Slovensko, Česko, EÚ, svet) – appka zatiaľ počíta „${license.territory}“.`)

  // Exclusive or not.
  let exclusive: boolean | null = null
  const no = /(^|[^a-z])(nevyhradn|non-exclusive|nonexclusive)/.test(f)
  const yes = /(^|[^a-z])(vyhradn|exkluziv|exclusive)/.test(f)
  if (no && yes) missing.push('Zadanie spomína výhradnú aj nevýhradnú licenciu – over, ktorú klient chce.')
  else if (no) { exclusive = false; found.push('Licencia: nevýhradná') }
  else if (yes) { exclusive = true; found.push('Licencia: výhradná') }
  else missing.push('Či chce klient výhradnú licenciu (nikto iný dielo nesmie použiť).')

  const wantsIllustration = /(^|[^a-z])(ilustrac|vzor|artwork|kresb|motiv|potlac)/.test(f)
  return { license, exclusive, found, missing, wantsIllustration }
}
