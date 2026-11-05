import { fmtDate, fmtNum, lineTotal, money, totals } from '../lib/calc'
import type { Quote, Settings } from '../lib/types'

/** The quote as the client sees it: on screen, printed to PDF, and behind the shared link. */
export function QuoteDocument({ quote: q, settings: s }: { quote: Quote; settings: Settings }) {
  const t = totals(q, s)
  // The client sees final prices: the organisation adjustment and any gross-up are folded into each line.
  const priced = t.subtotal + t.org - t.discount
  const g = priced ? t.total / priced : 1
  const k = (1 + (q.orgPct || 0) / 100) * g
  const shownSubtotal = Math.round(t.subtotal * k * 100) / 100
  const shownDiscount = Math.round(t.discount * g * 100) / 100
  const c = s.company
  const cl = q.client
  const companyLines = [c.person, c.address, c.ico && `IČO: ${c.ico}`, c.dic && `DIČ: ${c.dic}`, c.icdph && `IČ DPH: ${c.icdph}`, c.email, c.phone, c.web].filter(Boolean)
  const clientLines = [cl.company && cl.name ? cl.name : '', cl.address, cl.ico && `IČO: ${cl.ico}`, cl.dic && `DIČ: ${cl.dic}`, cl.email, cl.phone].filter(Boolean)
  return (
    <article className="doc">
      <header className="doc-head">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Štullers" />
        <div className="doc-title">
          <h1>Cenová ponuka</h1>
          <p>č. {q.number}</p>
          <p>Vystavená {fmtDate(q.issueDate)} · platí do {fmtDate(q.validUntil)}</p>
        </div>
      </header>

      <section className="doc-parties">
        <div>
          <h4>Od</h4>
          <strong>{c.name}</strong>
          <p>{companyLines.join('\n')}</p>
        </div>
        <div>
          <h4>Pre</h4>
          <strong>{cl.company || cl.name || '—'}</strong>
          <p>{clientLines.join('\n')}</p>
        </div>
      </section>

      {(q.title || q.intro) && (
        <section className="doc-project">
          {q.title && <h2>{q.title}</h2>}
          {q.intro && <p>{q.intro}</p>}
        </section>
      )}

      <table className="items">
        <thead>
          <tr><th>Položka</th><th>Množstvo</th><th className="col-unit">Cena / j.</th><th>Spolu</th></tr>
        </thead>
        <tbody>
          {q.lines.map((l) => (
            <tr key={l.id}>
              <td>
                {l.name}
                {(l.description || (l.coef !== 1 && l.coefLabel)) && (
                  <small>{[l.description, l.coef !== 1 && l.coefLabel ? `${l.coefLabel} (×${fmtNum(l.coef)})` : ''].filter(Boolean).join(' · ')}</small>
                )}
              </td>
              <td>{fmtNum(l.qty)} {l.unit}</td>
              <td className="col-unit">{money(l.unitPrice * (l.coef || 1) * k)}</td>
              <td>{money(lineTotal(l) * k)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="doc-sum sum-table">
        <tbody>
          {t.discount > 0 && <tr><td>Medzisúčet</td><td>{money(shownSubtotal)}</td></tr>}
          {t.discount > 0 && <tr><td>Zľava {fmtNum(q.discountPct)} %</td><td>−{money(shownDiscount)}</td></tr>}
          <tr className="grand"><td>Spolu</td><td>{money(t.total)}</td></tr>
          {q.depositPct > 0 && <tr><td>Záloha {fmtNum(q.depositPct)} %</td><td>{money(t.deposit)}</td></tr>}
        </tbody>
      </table>
      <p className="muted" style={{ textAlign: 'right', fontSize: 13 }}>Nie sme platcami DPH.</p>

      <footer className="doc-foot">
        {q.note && <div><h4>Poznámka</h4><p>{q.note}</p></div>}
        {s.terms && <div><h4>Podmienky</h4><p>{s.terms}</p></div>}
        {c.iban && <div><h4>Platba</h4><p>IBAN: {c.iban}</p></div>}
      </footer>


      <div className="doc-sign">
        <span>{c.name} · {c.web}</span>
        <span>Ďakujeme, tešíme sa na spoluprácu!</span>
      </div>
    </article>
  )
}
