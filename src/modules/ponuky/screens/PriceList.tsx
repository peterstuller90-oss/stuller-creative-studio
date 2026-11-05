import { useLayoutEffect, useRef, useState } from 'react'
import { ask, Icon, NumInput, toast } from '../components/ui'
import { uid } from '../lib/calc'
import { CATEGORIES, UNITS, type Category, type PriceItem } from '../lib/types'

export function PriceList({ prices, onSave, onDelete }: { prices: PriceItem[]; onSave: (p: PriceItem) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const unconfirmed = prices.filter((p) => p.placeholder && p.active).length
  async function add(category: Category) {
    const sort = Math.max(0, ...prices.map((p) => p.sort)) + 1
    await onSave({ id: uid(), category, name: 'Nová položka', unit: 'paušál', price: 0, note: '', sort, active: true, placeholder: false })
  }
  return (
    <>
      <h1 className="page-title">Cenník</h1>
      {unconfirmed > 0 && (
        <div className="banner">
          {unconfirmed} cien je zatiaľ len odhad (označené <span className="pill pill-warn">over cenu</span>). Prepíš ich na svoje, alebo ich potvrď ťuknutím na štítok.
        </div>
      )}
      {CATEGORIES.map((c) => {
        const items = prices.filter((p) => p.category === c.id).sort((a, b) => a.sort - b.sort)
        return (
          <section key={c.id} className="stack" style={{ gap: 8 }}>
            <p className="section-title">{c.label}</p>
            <div className="card" style={{ padding: '2px 14px' }}>
              {items.map((p) => <PriceRow key={p.id} item={p} onSave={onSave} onDelete={onDelete} />)}
              <button className="link-btn" onClick={() => add(c.id)}><Icon name="plus" size={18} /> Pridať položku</button>
            </div>
          </section>
        )
      })}
    </>
  )
}

function PriceRow({ item, onSave, onDelete }: { item: PriceItem; onSave: (p: PriceItem) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [p, setP] = useState(item)
  const [dirty, setDirty] = useState(false)
  const edit = (patch: Partial<PriceItem>) => { setP((x) => ({ ...x, ...patch })); setDirty(true) }
  const commit = (next = p) => { if (dirty || next !== p) { setDirty(false); onSave(next).catch((e) => toast('Neuložené: ' + e.message)) } }
  const now = (patch: Partial<PriceItem>) => { const next = { ...p, ...patch }; setP(next); onSave(next).catch((e) => toast('Neuložené: ' + e.message)) }
  return (
    <div className={p.active ? 'price-row' : 'price-row off'} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) commit() }}>
      <AutoText className="pr-name" aria-label="Názov" value={p.name} onChange={(v) => edit({ name: v })} />
      <div className="pr-line">
        <label className="pr-price">
          <NumInput aria-label={`Cena: ${p.name}`} value={p.price} onChange={(n) => edit({ price: n, placeholder: false })} />
          <span>€ /</span>
        </label>
        <select className="pr-unit" aria-label="Jednotka" value={p.unit} onChange={(e) => now({ unit: e.target.value })}>
          {[...new Set([...UNITS, p.unit])].map((u) => <option key={u}>{u}</option>)}
        </select>
        <span className="grow" />
        {p.placeholder && <button className="pill pill-warn" title="Potvrdiť cenu" onClick={() => now({ placeholder: false })}>over cenu</button>}
        <button className="pr-btn" title={p.active ? 'Skryť z ponúk' : 'Zobraziť v ponukách'} aria-label={p.active ? 'Skryť' : 'Zobraziť'} onClick={() => now({ active: !p.active })}><Icon name={p.active ? 'eye' : 'eyeOff'} size={18} /></button>
        <button className="pr-btn danger" aria-label="Zmazať" onClick={async () => { if (await ask(`Zmazať „${p.name}“ z cenníka?`)) onDelete(p.id) }}><Icon name="trash" size={18} /></button>
      </div>
      <AutoText className="pr-note" aria-label="Popis" placeholder="+ popis na ponuke" value={p.note} onChange={(v) => edit({ note: v })} />
    </div>
  )
}

// Text that wraps onto as many lines as it needs, so long names and notes are never cut off.
function AutoText({ value, onChange, ...rest }: { value: string; onChange: (v: string) => void; className?: string; placeholder?: string; 'aria-label'?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  })
  return <textarea ref={ref} rows={1} value={value} {...rest}
    onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }} />
}