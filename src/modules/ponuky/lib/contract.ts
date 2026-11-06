import { fmtDate, fmtNum, lineTotal, money, today, totals } from './calc'
import type { Quote, Settings } from './types'

export type Block = { kind: 'title' | 'note' | 'h' | 'p'; text: string }

const PUBLIC_ORG = /mesto|obec|štát|škola|inštitúc/i
const PRODUCT = /^Aplikácia na:\s*/

/** Products the client bought an application for (lines "Aplikácia na: Tričko"). */
export const productLines = (q: Quote) => q.lines.filter((l) => PRODUCT.test(l.name) && l.qty > 0).map((l) => l.name.replace(PRODUCT, ''))

/**
 * How the client may use the work, built from what was clicked in the quote:
 * every product application, the license calculator's uses and Peter's extra text.
 */
export function licenseUses(q: Quote): string {
  const parts: string[] = []
  const products = productLines(q)
  if (products.length) parts.push(`rozmnožovanie diela a jeho použitie na týchto produktoch: ${products.join(', ')} (licencia na tieto aplikácie je zahrnutá v odmene)`)
  const lic = q.license
  if (lic && lic.uses.length) {
    const run = lic.pieces ? ` v náklade najviac ${fmtNum(lic.pieces)} ks` : ''
    parts.push(`použitie diela v kategóriách: ${lic.uses.join(', ')}${run}`)
  }
  if (q.contract.uses.trim()) parts.push(q.contract.uses.trim())
  return parts.join('; ')
}

export function contractValues(q: Quote, s: Settings): Record<string, string> {
  const t = totals(q, s)
  const c = q.client
  const authors = s.authors.filter((a) => a.name.trim())
  const objednavatel = [
    c.company || c.name,
    c.address && `so sídlom / bydliskom: ${c.address}`,
    c.ico && `IČO: ${c.ico}`,
    c.dic && `DIČ: ${c.dic}`,
    c.company && c.name && `zastúpený: ${c.name}`,
    [c.email, c.phone].filter(Boolean).join(', '),
  ].filter(Boolean).join('\n')
  const dan = s.tax.mode === 'zrazka'
    ? `Objednávateľ zrazí z odmeny daň vyberanú zrážkou podľa § 43 zákona č. 595/2003 Z. z. o dani z príjmov v znení neskorších predpisov vo výške ${fmtNum(s.tax.withholdPct)} % a odvedie ju správcovi dane.`
    : 'Zmluvné strany sa v súlade s § 43 ods. 14 zákona č. 595/2003 Z. z. o dani z príjmov v znení neskorších predpisov dohodli, že z odmeny sa nebude vyberať daň zrážkou. Autor príjem zdaní sám v daňovom priznaní. Objednávateľ, ak je platiteľom dane, oznámi uzavretie tejto dohody správcovi dane v zákonnej lehote.'
  const isPublic = PUBLIC_ORG.test(q.orgType)
  return {
    cislo: q.number,
    autori: authors.map((a) => [a.name, a.born && `nar. ${a.born}`, a.address && `bytom ${a.address}`].filter(Boolean).join(', ')).join('\n') || '…',
    objednavatel: objednavatel || '…',
    nazov_diela: q.title || '…',
    popis_diela: q.intro || '…',
    polozky: q.lines.filter((l) => l.qty > 0).map((l) => `– ${l.name}${l.description ? ` (${l.description})` : ''}: ${fmtNum(l.qty)} ${l.unit}`).join('\n') || '–',
    miesto: q.contract.place || '…',
    termin: q.contract.deadline ? fmtDate(q.contract.deadline) : '…',
    odmena: money(t.total),
    zaloha: money(t.deposit),
    doplatok: money(t.rest),
    iban: s.company.iban || '…',
    dan,
    licencia_vyhradnost: q.contract.exclusive ? 'výhradnú' : 'nevýhradnú',
    licencia_sposoby: licenseUses(q) || '…',
    licencia_uzemie: q.contract.territory || '…',
    licencia_cas: q.contract.duration || '…',
    zverejnenie: isPublic ? 'Ak je objednávateľ povinnou osobou podľa zákona č. 211/2000 Z. z. o slobodnom prístupe k informáciám, zmluva nadobúda účinnosť dňom nasledujúcim po dni jej zverejnenia.' : 'Účinnosť nadobúda dňom podpisu.',
    datum: fmtDate(today()),
    // Unused by the default template but handy for custom ones.
    suma_polozky: q.lines.map((l) => `${l.name}: ${money(lineTotal(l))}`).join('\n'),
  }
}

export function buildContract(q: Quote, s: Settings): Block[] {
  const v = contractValues(q, s)
  const filled = s.contractTemplate.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, k) => v[k] ?? m)
  return filled.split(/\n\s*\n/).map((raw) => raw.trim()).filter(Boolean).map((b): Block => {
    if (b.startsWith('### ')) return { kind: 'note', text: b.slice(4) }
    if (b.startsWith('## ')) return { kind: 'h', text: b.slice(3) }
    if (b.startsWith('# ')) return { kind: 'title', text: b.slice(2) }
    return { kind: 'p', text: b }
  })
}

export function signatureNames(q: Quote, s: Settings) {
  return {
    authors: s.authors.filter((a) => a.name.trim()).map((a) => a.name),
    client: q.client.company ? `${q.client.company}${q.client.name ? `, ${q.client.name}` : ''}` : q.client.name,
  }
}
