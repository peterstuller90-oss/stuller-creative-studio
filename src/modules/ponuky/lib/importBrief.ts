import { briefSections, type BriefValues } from './brief'
import { fmtNum, slug, uid } from './calc'
import type { BriefAnswer, Line, PriceItem, Quote, Settings } from './types'

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? '').replace(',', '.').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 0
}
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

const fromItem = (it: PriceItem, extra: Partial<Line> = {}): Line => ({
  id: uid(), name: it.name, description: it.note, qty: 1, unit: it.unit, unitPrice: it.price, coef: 1, coefLabel: '', ...extra,
})

/** Turn the client's answers into a priced quote draft, using the price list. */
export function briefToQuote(v: BriefValues, prices: PriceItem[], s: Settings): Partial<Quote> & { warnings: string[] } {
  const active = prices.filter((p) => p.active)
  const of = (c: PriceItem['category']) => active.filter((p) => p.category === c)
  const find = (c: PriceItem['category'], re: RegExp) => of(c).find((p) => re.test(p.name)) ?? of(c)[0]
  const lines: Line[] = []
  const warnings: string[] = []

  // Readable copy of every answer, in form order.
  const brief: BriefAnswer[] = []
  for (const sec of briefSections(s, prices)) for (const f of sec.fields) {
    const raw = v[f.id]
    if (raw === undefined || raw === '' || raw === false) continue
    const value = raw === true ? 'áno' : f.options?.find((o) => o.value === raw)?.label ?? String(raw)
    brief.push({ label: `${sec.title}: ${f.label}`, value })
  }

  if (v.s_mural || num(v.m_sirka)) {
    const it = find('mural', v.m_motiv === 'tematicky' ? /temat/i : /voľn|voln/i)
    const w = num(v.m_sirka), h = num(v.m_vyska)
    const lvl = s.complexity[0] ?? { label: '', coef: 1 }
    if (it) lines.push(fromItem(it, { description: w && h ? `${fmtNum(w)} × ${fmtNum(h)} m` : 'rozmer doplniť', qty: Math.round(w * h * 100) / 100 || 1, coef: lvl.coef, coefLabel: lvl.coef !== 1 ? `${lvl.label} zložitosť` : '' }))
    if (!w || !h) warnings.push('Mural: chýba rozmer steny.')
    const paint = find('doplnky', /farb|materi/i)
    if (paint && w && h) lines.push(fromItem(paint, { qty: Math.round(w * h * 100) / 100 }))
    const lift = find('doplnky', /plošin|plosin|lešen/i)
    if (lift && v.m_plosina) lines.push(fromItem(lift, { qty: 1 }))
    const travel = find('doplnky', /doprav/i)
    if (travel && str(v.p_miesto)) { lines.push(fromItem(travel, { qty: 0, description: `Trenčín – ${str(v.p_miesto)} a späť (doplň km)` })); warnings.push('Doprava: doplň počet km.') }
    warnings.push('Mural: skontroluj zložitosť.')
  }
  if (v.s_ilustracia) {
    const it = find('ilustracia', v.i_typ === 'tematicka' ? /temat/i : /voľn|voln/i)
    const count = num(v.i_pocet) || 1
    if (it) lines.push(fromItem(it, { qty: count, unit: count > 1 ? 'ks' : it.unit }))
  }
  if (v.s_logo) { const it = of('logo')[0]; if (it) lines.push(fromItem(it)) }
  if (v.s_ilustracia || v.s_logo) {
    for (const p of of('aplikacia')) if (v[`a_${slug(p.name)}`]) lines.push(fromItem(p, { name: `Aplikácia na: ${p.name}` }))
  }
  if (v.s_workshop || str(v.w_typ)) {
    const it = of('workshop').find((p) => p.name === str(v.w_typ)) ?? of('workshop')[0]
    const people = num(v.w_pocet) || 1
    if (it) lines.push(fromItem(it, { name: `Workshop: ${it.name}`, qty: people, description: str(v.w_vek) ? `vek ${str(v.w_vek)}` : '' }))
    if (!num(v.w_pocet)) warnings.push('Workshop: chýba počet účastníkov.')
  }
  if (lines.length === 0) warnings.push('V zadaní nie je zaškrtnutá žiadna služba, položky pridaj ručne.')

  const orgType = str(v.k_typ)
  const org = s.orgTypes.find((o) => o.label === orgType)
  return {
    client: { name: str(v.k_meno), company: str(v.k_org), ico: str(v.k_ico), dic: '', address: str(v.k_adresa), email: str(v.k_email), phone: str(v.k_telefon) },
    orgType,
    orgPct: org?.pct ?? 0,
    title: str(v.p_nazov),
    intro: str(v.p_popis),
    note: '',
    brief,
    lines,
    warnings,
    contractPlace: str(v.p_miesto),
  } as Partial<Quote> & { warnings: string[]; contractPlace: string }
}
