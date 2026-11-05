import { useEffect, useRef, useState } from 'react'
import { AddServiceSheet } from '../components/AddServiceSheet'
import { PriceSummary } from '../components/PriceSummary'
import { ask, Icon, NumInput, toast } from '../components/ui'
import type { IconName } from '../components/icons'
import { fmtNum, lineTotal, money } from '../lib/calc'
import { STATUSES, UNITS, type Client, type ContractInfo, type Line, type PriceItem, type Quote, type Settings } from '../lib/types'

interface Props {
  quote: Quote
  settings: Settings
  prices: PriceItem[]
  clients: Client[]
  warnings: string[]
  onSave: (q: Quote, rememberClient?: boolean) => Promise<void>
  onBack: () => void
  onContract: () => void
  onPreview: () => void
  onDuplicate: () => void
  onDelete: () => void
}

function Section({ icon, title, children, aside }: { icon: IconName; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="stack" style={{ gap: 8 }}>
      <div className="sec-head"><Icon name={icon} /><h2>{title}</h2>{aside}</div>
      {children}
    </section>
  )
}

export function QuoteEditor({ quote, settings, prices, clients, warnings, onSave, onBack, onContract, onPreview, onDuplicate, onDelete }: Props) {
  const [q, setQ] = useState(quote)
  const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [saved, setSaved] = useState(true)
  const [briefOpen, setBriefOpen] = useState(false)
  const [moreClient, setMoreClient] = useState(!!(quote.client.ico || quote.client.address))
  const first = useRef(true)

  // Autosave shortly after the last change.
  useEffect(() => {
    if (first.current) { first.current = false; return }
    setSaved(false)
    const t = setTimeout(() => { onSave({ ...q, updatedAt: new Date().toISOString() }).then(() => setSaved(true)).catch((e) => toast('Neuložené: ' + e.message)) }, 700)
    return () => clearTimeout(t)
  }, [q, onSave])

  const set = (patch: Partial<Quote>) => setQ((x) => ({ ...x, ...patch }))
  const setClient = (patch: Partial<Quote['client']>) => setQ((x) => ({ ...x, client: { ...x.client, ...patch } }))
  const setContract = (patch: Partial<ContractInfo>) => setQ((x) => ({ ...x, contract: { ...x.contract, ...patch } }))
  const setLine = (id: string, patch: Partial<Line>) => setQ((x) => ({ ...x, lines: x.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) }))
  const move = (i: number, d: number) => setQ((x) => {
    const lines = [...x.lines]
    const j = i + d
    if (j < 0 || j >= lines.length) return x
    ;[lines[i], lines[j]] = [lines[j], lines[i]]
    return { ...x, lines }
  })

  function pickClient(name: string) {
    const c = clients.find((c) => c.name === name || c.company === name)
    if (c) { const { id: _id, ...rest } = c; setClient(rest); if (c.ico || c.address) setMoreClient(true) } else setClient({ name })
  }
  function pickOrg(label: string) {
    const o = settings.orgTypes.find((o) => o.label === label)
    set({ orgType: label, orgPct: o?.pct ?? 0 })
  }

  return (
    <>
      <div className="topline no-print">
        <button className="back-btn" onClick={() => { onSave(q, true).catch(() => {}); onBack() }}><Icon name="back" size={20} /> Ponuky</button>
        <span className="muted" aria-live="polite">{saved ? 'Uložené' : 'Ukladám…'}</span>
      </div>
      <div className="topline">
        <div>
          <p className="muted num">{q.number}</p>
          <h1 className="page-title" style={{ margin: '0 0 4px' }}>{q.client.company || q.client.name || 'Nová ponuka'}</h1>
        </div>
        <label className="field" style={{ width: 160 }}>
          <select aria-label="Stav" value={q.status} onChange={(e) => set({ status: e.target.value as Quote['status'] })}>
            {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
      </div>

      <PriceSummary quote={q} settings={settings} sticky />

      {warnings.length > 0 && (
        <div className="banner">
          <strong>Načítané zo zadania. Skontroluj:</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </div>
      )}

      {q.brief.length > 0 && (
        <Section icon="brief" title="Zadanie od klienta" aside={<button className="link-btn" onClick={() => setBriefOpen(!briefOpen)}>{briefOpen ? 'Skryť' : 'Zobraziť všetko'}</button>}>
          <div className="card pad">
            {q.intro && <p className="brief-text">{q.intro}</p>}
            {briefOpen && (
              <dl className="brief-list">
                {q.brief.map((a, i) => <div key={i}><dt>{a.label}</dt><dd>{a.value}</dd></div>)}
              </dl>
            )}
          </div>
        </Section>
      )}

      <Section icon="building" title="Klient">
        <div className="card pad stack">
          <div className="grid2">
            <label className="field"><span>Meno</span><input list="clients" value={q.client.name} onChange={(e) => pickClient(e.target.value)} /></label>
            <label className="field"><span>Organizácia</span><input value={q.client.company} onChange={(e) => setClient({ company: e.target.value })} /></label>
            <label className="field"><span>Typ organizácie</span>
              <select value={q.orgType} onChange={(e) => pickOrg(e.target.value)}>
                <option value="">Nevybraté</option>
                {settings.orgTypes.map((o) => <option key={o.label} value={o.label}>{o.label} ({o.pct > 0 ? '+' : ''}{fmtNum(o.pct)} %)</option>)}
              </select>
            </label>
            <label className="field"><span>E-mail</span><input type="email" value={q.client.email} onChange={(e) => setClient({ email: e.target.value })} /></label>
          </div>
          <datalist id="clients">{clients.map((c) => <option key={c.id} value={c.name}>{c.company}</option>)}</datalist>
          {moreClient ? (
            <div className="grid2">
              <label className="field"><span>Telefón</span><input type="tel" value={q.client.phone} onChange={(e) => setClient({ phone: e.target.value })} /></label>
              <label className="field"><span>IČO</span><input value={q.client.ico} onChange={(e) => setClient({ ico: e.target.value })} /></label>
              <label className="field" style={{ gridColumn: '1 / -1' }}><span>Adresa / sídlo</span><input value={q.client.address} onChange={(e) => setClient({ address: e.target.value })} /></label>
            </div>
          ) : <button className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setMoreClient(true)}>+ Telefón, adresa, IČO</button>}
        </div>
      </Section>

      <Section icon="quotes" title="Projekt">
        <div className="card pad stack">
          <label className="field"><span>Názov</span><input placeholder="napr. Mural na fasáde školy" value={q.title} onChange={(e) => set({ title: e.target.value })} /></label>
          <label className="field"><span>Popis</span><textarea rows={4} value={q.intro} onChange={(e) => set({ intro: e.target.value })} /></label>
        </div>
      </Section>

      <Section icon="list" title="Položky">
        <div className="card">
          {q.lines.length === 0 && <div className="empty"><p className="muted">Zatiaľ žiadne položky.</p></div>}
          {q.lines.map((l, i) => open === l.id ? (
            <div key={l.id} className="line open">
              <div className="line-head">
                <input aria-label="Názov položky" value={l.name} onChange={(e) => setLine(l.id, { name: e.target.value })} />
                <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Posunúť hore"><Icon name="up" size={18} /></button>
                <button className="icon-btn danger" onClick={() => setQ((x) => ({ ...x, lines: x.lines.filter((y) => y.id !== l.id) }))} aria-label="Odstrániť"><Icon name="trash" size={18} /></button>
              </div>
              <input className="line-desc" aria-label="Popis" placeholder="Popis (nepovinný)" value={l.description} onChange={(e) => setLine(l.id, { description: e.target.value })} />
              <div className="line-nums">
                <label className="field"><span>Množstvo</span><NumInput value={l.qty} onChange={(n) => setLine(l.id, { qty: n })} /></label>
                <label className="field"><span>Jednotka</span>
                  <select value={l.unit} onChange={(e) => setLine(l.id, { unit: e.target.value })}>
                    {[...new Set([...UNITS, l.unit])].map((u) => <option key={u}>{u}</option>)}
                  </select>
                </label>
                <label className="field"><span>Cena / j. (€)</span><NumInput value={l.unitPrice} onChange={(n) => setLine(l.id, { unitPrice: n })} /></label>
                <label className="field"><span>Násobok</span><NumInput value={l.coef} onChange={(n) => setLine(l.id, { coef: n || 1 })} /></label>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <button className="link-btn" onClick={() => setOpen(null)}><Icon name="check" size={18} /> Hotovo</button>
                <strong className="num" style={{ fontSize: 20 }}>{money(lineTotal(l))}</strong>
              </div>
            </div>
          ) : (
            <button key={l.id} className="line-row" onClick={() => setOpen(l.id)}>
              <span className="list-main">
                <strong>{l.name}</strong>
                <small>{fmtNum(l.qty)} {l.unit} × {money(l.unitPrice)}{l.coef !== 1 ? ` × ${fmtNum(l.coef)}` : ''}{l.description ? ` · ${l.description}` : ''}</small>
              </span>
              <strong className="num">{money(lineTotal(l))}</strong>
            </button>
          ))}
          <div className="pad" style={{ borderTop: q.lines.length ? '1px solid var(--line)' : undefined }}>
            <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setAdding(true)}><Icon name="plus" size={20} /> Pridať službu</button>
          </div>
        </div>
      </Section>

      <Section icon="coins" title="Úprava ceny">
        <div className="card pad stack">
          <div className="grid3">
            <label className="field"><span>Podľa organizácie (%)</span><NumInput value={q.orgPct} onChange={(n) => set({ orgPct: n })} /></label>
            <label className="field"><span>Zľava (%)</span><NumInput value={q.discountPct} onChange={(n) => set({ discountPct: n })} /></label>
            <label className="field"><span>Záloha (%)</span><NumInput value={q.depositPct} onChange={(n) => set({ depositPct: n })} /></label>
          </div>
          <p className="hint">Typ organizácie nastaví prirážku alebo zľavu sám (podľa Nastavení), tu ju môžeš prepísať.</p>
        </div>
      </Section>

      <Section icon="contract" title="Zmluva">
        <div className="card pad stack">
          <div className="grid2">
            <label className="field"><span>Miesto realizácie</span><input value={q.contract.place} onChange={(e) => setContract({ place: e.target.value })} /></label>
            <label className="field"><span>Termín odovzdania</span><input type="date" value={q.contract.deadline} onChange={(e) => setContract({ deadline: e.target.value })} /></label>
            <label className="field"><span>Licencia – územie</span><input value={q.contract.territory} onChange={(e) => setContract({ territory: e.target.value })} /></label>
            <label className="field"><span>Licencia – čas</span><input value={q.contract.duration} onChange={(e) => setContract({ duration: e.target.value })} /></label>
          </div>
          <label className="field"><span>Ako môže klient dielo používať</span><textarea rows={3} value={q.contract.uses} onChange={(e) => setContract({ uses: e.target.value })} /></label>
          <label className="check"><input type="checkbox" checked={q.contract.exclusive} onChange={(e) => setContract({ exclusive: e.target.checked })} />Výhradná licencia (dielo nemôžete použiť nikde inde)</label>
        </div>
      </Section>

      <div className="stack no-print" style={{ marginTop: 8 }}>
        <button className="btn-primary" onClick={() => onSave(q, true).then(onContract)}><Icon name="contract" size={20} /> Zmluva</button>
        <button className="btn-secondary" onClick={() => onSave(q, true).then(onPreview)}><Icon name="quotes" size={20} /> Cenová ponuka</button>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="link-btn" onClick={onDuplicate}><Icon name="copy" size={18} /> Duplikovať</button>
          <button className="link-btn" style={{ color: 'var(--accent-dark)' }} onClick={async () => { if (await ask(`Zmazať ponuku ${q.number}?`)) onDelete() }}><Icon name="trash" size={18} /> Zmazať</button>
        </div>
      </div>

      {adding && (
        <AddServiceSheet prices={prices} settings={settings} onClose={() => setAdding(false)}
          onAdd={(lines) => { setQ((x) => ({ ...x, lines: [...x.lines, ...lines] })); toast(lines.length > 1 ? `Pridaných ${lines.length} položiek` : 'Položka pridaná') }} />
      )}
    </>
  )
}
