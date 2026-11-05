import { useRef, useState } from 'react'
import { Icon } from '../components/ui'
import { fmtDate, money, totals } from '../lib/calc'
import { STATUSES, type Quote, type Settings, type Status } from '../lib/types'

interface Props {
  quotes: Quote[]
  settings: Settings
  onOpen: (id: string) => void
  onNew: () => void
  onImport: (file: File) => void
  onBlankBrief: () => void
  busy: string
}

export function QuoteList({ quotes, settings, onOpen, onNew, onImport, onBlankBrief, busy }: Props) {
  const [filter, setFilter] = useState<Status | 'all'>('all')
  const [q, setQ] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const shown = quotes
    .filter((x) => filter === 'all' || x.status === filter)
    .filter((x) => !q || `${x.number} ${x.title} ${x.client.name} ${x.client.company}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const signed = quotes.filter((x) => x.status === 'prijata').map((x) => totals(x, settings))
  const open = quotes.filter((x) => x.status === 'koncept' || x.status === 'odoslana')
  return (
    <>
      <h1 className="page-title">Ponuky</h1>

      <div className="actions">
        <button className="action card" onClick={onNew}>
          <Icon name="plus" size={30} />
          <strong>Nová ponuka</strong>
          <small>začni od nuly</small>
        </button>
        <button className="action card" onClick={() => fileRef.current?.click()} disabled={!!busy}>
          <Icon name="import" size={30} />
          <strong>Načítať zadanie</strong>
          <small>{busy === 'import' ? 'Čítam PDF…' : 'vyplnené PDF od klienta'}</small>
        </button>
        <button className="action card" onClick={onBlankBrief} disabled={!!busy}>
          <Icon name="brief" size={30} />
          <strong>Zadanie pre klienta</strong>
          <small>{busy === 'brief' ? 'Pripravujem…' : 'prázdne PDF na poslanie'}</small>
        </button>
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = '' }} />
      </div>

      <div className="stats">
        <div className="card stat"><strong>{open.length}</strong><span>rozpracované</span></div>
        <div className="card stat"><strong>{money(signed.reduce((s, t) => s + t.total, 0))}</strong><span>podpísané</span></div>
        <div className="card stat"><strong>{money(signed.reduce((s, t) => s + t.net, 0))}</strong><span>z toho na ruku</span></div>
      </div>

      <div className="chips">
        <button className={filter === 'all' ? 'chip on' : 'chip'} onClick={() => setFilter('all')}>Všetky</button>
        {STATUSES.map((s) => <button key={s.id} className={filter === s.id ? 'chip on' : 'chip'} onClick={() => setFilter(s.id)}>{s.label}</button>)}
      </div>
      {quotes.length > 4 && <label className="field"><input placeholder="Hľadať klienta, číslo, projekt…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Hľadať" /></label>}
      <div className="card">
        {shown.length === 0 ? (
          <div className="empty">
            <Icon name="quotes" size={44} />
            <p>{quotes.length ? 'V tomto filtri nič nie je.' : 'Zatiaľ žiadna ponuka. Pošli klientovi zadanie alebo začni novú.'}</p>
          </div>
        ) : (
          <ul className="list">
            {shown.map((x) => {
              const t = totals(x, settings)
              return (
                <li key={x.id}>
                  <button className="list-item" onClick={() => onOpen(x.id)}>
                    <div className="list-main">
                      <strong>{x.client.company || x.client.name || 'Bez klienta'}</strong>
                      <small>{x.title || 'bez názvu'} · {x.number} · {fmtDate(x.issueDate)}</small>
                    </div>
                    <div className="list-side">
                      <strong>{money(t.total)}</strong>
                      <small className="muted num">na ruku {money(t.net)}</small>
                      <span className={`pill st-${x.status}`}>{STATUSES.find((s) => s.id === x.status)?.label}</span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
