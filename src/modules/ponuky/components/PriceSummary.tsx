import { fmtNum, money, totals } from '../lib/calc'
import type { Quote, Settings } from '../lib/types'
import { Icon } from './icons'

/** The three numbers Peter cares about: what the client pays, what goes to levies, what stays. */
export function PriceSummary({ quote, settings, sticky = false }: { quote: Quote; settings: Settings; sticky?: boolean }) {
  const t = totals(quote, settings)
  const tx = settings.tax
  return (
    <section className={sticky ? 'summary card sticky' : 'summary card'} aria-label="Súhrn ceny">
      <div className="sum-cell">
        <span className="sum-label"><Icon name="coins" size={18} />Klient zaplatí</span>
        <strong className="sum-big">{money(t.total)}</strong>
        <small>{t.deposit > 0 ? `záloha ${money(t.deposit)}` : 'bez zálohy'}</small>
      </div>
      <div className="sum-cell">
        <span className="sum-label">Odvody</span>
        <strong>−{money(t.health + t.tax)}</strong>
        <small>
          {tx.mode === 'zrazka'
            ? `zrážková daň ${fmtNum(tx.withholdPct)} %`
            : `zdravotné ${money(t.health)} · daň ${money(t.tax)}`}
        </small>
      </div>
      <div className="sum-cell net">
        <span className="sum-label"><Icon name="hand" size={18} />Na ruku</span>
        <strong className="sum-big">{money(t.net)}</strong>
        <small>bez odvodov</small>
      </div>
    </section>
  )
}
