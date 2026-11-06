import { fmtNum, levies, money, totals } from '../lib/calc'
import type { Quote, Settings } from '../lib/types'
import { Icon } from './icons'

const neg = (n: number) => (n > 0 ? `−${money(n)}` : money(0))

/**
 * What the client pays and what stays on hand. The sticky bar shows the current tax mode;
 * the table under it always shows both ways of taxing the fee, so Peter can compare.
 */
export function PriceSummary({ quote, settings, sticky = false, details = true }: { quote: Quote; settings: Settings; sticky?: boolean; details?: boolean }) {
  const t = totals(quote, settings)
  const tx = settings.tax
  const withheld = levies(t.total, { ...tx, mode: 'zrazka' })
  const filed = levies(t.total, { ...tx, mode: 'priznanie' })
  const cur = tx.mode === 'zrazka' ? 'zrazka' : 'priznanie'
  return (
    <>
      <section className={sticky ? 'summary card sticky' : 'summary card'} aria-label="Súhrn ceny">
        <div className="sum-cell">
          <span className="sum-label"><Icon name="coins" size={18} />Klient zaplatí</span>
          <strong className="sum-big">{money(t.total)}</strong>
          <small>{t.deposit > 0 ? `záloha ${money(t.deposit)}` : 'bez zálohy'}</small>
        </div>
        <div className="sum-cell net">
          <span className="sum-label"><Icon name="hand" size={18} />Na ruku</span>
          <strong className="sum-big">{money(t.net)}</strong>
          <small>{cur === 'zrazka' ? 'pri zrážkovej dani' : 'pri daňovom priznaní'}</small>
        </div>
      </section>
      {details && <section className="card tax-table" aria-label="Dane a odvody">
        <table>
          <thead><tr><th></th><th>Zrážková daň</th><th>Daňové priznanie</th></tr></thead>
          <tbody>
            <tr><td>Klient zaplatí</td><td>{money(t.total)}</td><td>{money(t.total)}</td></tr>
            <tr><td>Zdravotné poistenie</td><td>0 €</td><td>{neg(filed.health)}</td></tr>
            <tr><td>Daň</td><td>{neg(withheld.tax)}<small>{fmtNum(tx.withholdPct)} %, zrazí klient</small></td><td>{neg(filed.tax)}<small>{fmtNum(tx.taxPct)} %, platíš sám</small></td></tr>
            <tr className="tax-net"><td>Na ruku</td><td className={cur === 'zrazka' ? 'on' : ''}>{money(withheld.net)}</td><td className={cur === 'priznanie' ? 'on' : ''}>{money(filed.net)}</td></tr>
          </tbody>
        </table>
        <p className="hint">Zvýraznený stĺpec ide do zmluvy (zmeníš v Nastaveniach). Sadzby sú orientačné.</p>
      </section>}
    </>
  )
}
