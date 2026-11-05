import { useMemo, useState } from 'react'
import { fmtNum, money, uid } from '../lib/calc'
import { CATEGORIES, type Category, type Line, type PriceItem, type Settings } from '../lib/types'
import { Icon, NumInput, Sheet } from './ui'

type Step = 'menu' | 'design' | 'mural' | 'workshop' | 'pricelist'

const line = (p: Partial<Line> & Pick<Line, 'name'>): Line => ({
  id: uid(), description: '', qty: 1, unit: 'paušál', unitPrice: 0, coef: 1, coefLabel: '', ...p,
})
const fromItem = (it: PriceItem, extra: Partial<Line> = {}) =>
  line({ name: it.name, description: it.note, unit: it.unit, unitPrice: it.price, ...extra })

interface Props { prices: PriceItem[]; settings: Settings; onAdd: (lines: Line[]) => void; onClose: () => void }

export function AddServiceSheet({ prices, settings, onAdd, onClose }: Props) {
  const [step, setStep] = useState<Step>('menu')
  const [designCat, setDesignCat] = useState<Category>('ilustracia')
  const active = useMemo(() => prices.filter((p) => p.active).sort((a, b) => a.sort - b.sort), [prices])
  const of = (c: Category) => active.filter((p) => p.category === c)
  const add = (lines: Line[]) => { onAdd(lines); onClose() }

  if (step === 'menu') {
    return (
      <Sheet title="Pridať službu" onClose={onClose}>
        <div className="service-grid">
          <button className="service" onClick={() => { setDesignCat('ilustracia'); setStep('design') }}><Icon name="illustration" size={32} />Ilustrácia<small>tematická / voľná + produkty</small></button>
          <button className="service" onClick={() => { setDesignCat('logo'); setStep('design') }}><Icon name="logo" size={32} />Logo<small>logo / logotyp + produkty</small></button>
          <button className="service" onClick={() => setStep('mural')}><Icon name="mural" size={32} />Mural<small>veľkosť × zložitosť</small></button>
          <button className="service" onClick={() => setStep('workshop')}><Icon name="workshop" size={32} />Workshop<small>typ a počet ľudí</small></button>
          <button className="service" onClick={() => setStep('pricelist')}><Icon name="list" size={32} />Z cenníka<small>hocijaká položka</small></button>
          <button className="service" onClick={() => add([line({ name: 'Nová položka' })])}><Icon name="custom" size={32} />Vlastná<small>prázdny riadok</small></button>
        </div>
      </Sheet>
    )
  }
  const back = <button className="back-btn" onClick={() => setStep('menu')}><Icon name="back" size={20} /> Späť</button>
  if (step === 'design') return <DesignStep key={designCat} cat={designCat} base={of(designCat)} products={of('aplikacia')} back={back} onAdd={add} onClose={onClose} />
  if (step === 'mural') return <MuralStep murals={of('mural')} extras={of('doplnky')} settings={settings} back={back} onAdd={add} onClose={onClose} />
  if (step === 'workshop') return <WorkshopStep items={of('workshop')} back={back} onAdd={add} onClose={onClose} />
  return (
    <Sheet title="Z cenníka" onClose={onClose}>
      {back}
      {CATEGORIES.map((c) => of(c.id).length > 0 && (
        <div key={c.id} className="stack" style={{ gap: 6 }}>
          <p className="section-title">{c.label}</p>
          <div className="chips">
            {of(c.id).map((it) => (
              <button key={it.id} className="chip" onClick={() => add([fromItem(it)])}>{it.name} · {money(it.price)}/{it.unit}</button>
            ))}
          </div>
        </div>
      ))}
    </Sheet>
  )
}

interface StepProps { back: React.ReactNode; onAdd: (l: Line[]) => void; onClose: () => void }

function DesignStep({ cat, base, products, back, onAdd, onClose }: StepProps & { cat: Category; base: PriceItem[]; products: PriceItem[] }) {
  const [pick, setPick] = useState(base[0]?.id ?? '')
  const [count, setCount] = useState(1)
  const [chosen, setChosen] = useState<string[]>([])
  const item = base.find((b) => b.id === pick)
  const sel = products.filter((p) => chosen.includes(p.id))
  const sum = (item ? item.price * count : 0) + sel.reduce((s, p) => s + p.price, 0)
  const toggle = (id: string) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))
  return (
    <Sheet title={cat === 'logo' ? 'Logo / logotyp' : 'Ilustrácia'} onClose={onClose}>
      {back}
      {base.length > 1 && (
        <div className="segmented">
          {base.map((b) => <button key={b.id} className={b.id === pick ? 'on' : ''} onClick={() => setPick(b.id)}>{b.name.replace(' ilustrácia', '')}</button>)}
        </div>
      )}
      {base.length === 0 && <p className="muted">V cenníku nie je žiadna položka v tejto kategórii.</p>}
      <label className="field"><span>Počet návrhov</span><NumInput value={count} onChange={setCount} min={1} /></label>
      <p className="section-title">Aplikácia na produkty</p>
      <div className="chips">
        {products.map((p) => (
          <button key={p.id} className={chosen.includes(p.id) ? 'chip on' : 'chip'} aria-pressed={chosen.includes(p.id)} onClick={() => toggle(p.id)}>{p.name}</button>
        ))}
      </div>
      <div className="calc-preview"><span>Spolu</span><strong>{money(sum)}</strong></div>
      <button className="btn-primary" disabled={!item} onClick={() => item && onAdd([
        fromItem(item, { qty: count, unit: count > 1 ? 'ks' : item.unit }),
        ...sel.map((p) => fromItem(p, { name: `Aplikácia na: ${p.name}` })),
      ])}>Pridať do ponuky</button>
    </Sheet>
  )
}

function MuralStep({ murals, extras, settings, back, onAdd, onClose }: StepProps & { murals: PriceItem[]; extras: PriceItem[]; settings: Settings }) {
  const [pick, setPick] = useState(murals[0]?.id ?? '')
  const [w, setW] = useState(4)
  const [h, setH] = useState(3)
  const [lvl, setLvl] = useState(0)
  const [qty, setQty] = useState<Record<string, number>>({})
  const item = murals.find((m) => m.id === pick)
  const area = Math.round(w * h * 100) / 100
  const level = settings.complexity[lvl] ?? { label: '', coef: 1 }
  const extraQty = (p: PriceItem) => qty[p.id] ?? 0
  const sum = (item ? area * item.price * level.coef : 0) + extras.reduce((s, p) => s + extraQty(p) * p.price, 0)
  const toggleExtra = (p: PriceItem) => setQty((q) => ({ ...q, [p.id]: extraQty(p) > 0 ? 0 : (p.unit === 'm²' ? area : 1) }))
  return (
    <Sheet title="Mural" onClose={onClose}>
      {back}
      {murals.length > 1 && (
        <div className="segmented">
          {murals.map((m) => <button key={m.id} className={m.id === pick ? 'on' : ''} onClick={() => setPick(m.id)}>{m.name.replace(' mural', '')}</button>)}
        </div>
      )}
      <div className="grid3">
        <label className="field"><span>Šírka (m)</span><NumInput value={w} onChange={setW} /></label>
        <label className="field"><span>Výška (m)</span><NumInput value={h} onChange={setH} /></label>
        <div className="field"><span>Plocha</span><strong style={{ fontSize: 24, padding: '8px 0' }}>{fmtNum(area)} m²</strong></div>
      </div>
      <p className="section-title">Zložitosť</p>
      <div className="segmented">
        {settings.complexity.map((c, i) => <button key={i} className={i === lvl ? 'on' : ''} onClick={() => setLvl(i)}>{c.label} ×{fmtNum(c.coef)}</button>)}
      </div>
      <p className="section-title">Doplnky</p>
      {extras.map((p) => (
        <div key={p.id} className="row">
          <label className="check grow"><input type="checkbox" checked={extraQty(p) > 0} onChange={() => toggleExtra(p)} />{p.name} <span className="muted">· {money(p.price)}/{p.unit}</span></label>
          {extraQty(p) > 0 && (
            <label className="field" style={{ width: 96 }}><NumInput aria-label={`${p.name}, množstvo (${p.unit})`} value={extraQty(p)} onChange={(n) => setQty((q) => ({ ...q, [p.id]: n }))} /></label>
          )}
        </div>
      ))}
      <div className="calc-preview"><span>{item ? `${fmtNum(area)} m² × ${money(item.price)} × ${fmtNum(level.coef)}` : ''} + doplnky</span><strong>{money(sum)}</strong></div>
      <button className="btn-primary" disabled={!item || area <= 0} onClick={() => item && onAdd([
        fromItem(item, { description: `${fmtNum(w)} × ${fmtNum(h)} m`, qty: area, coef: level.coef, coefLabel: level.coef !== 1 ? `${level.label} zložitosť` : '' }),
        ...extras.filter((p) => extraQty(p) > 0).map((p) => fromItem(p, { qty: extraQty(p) })),
      ])}>Pridať do ponuky</button>
    </Sheet>
  )
}

function WorkshopStep({ items, back, onAdd, onClose }: StepProps & { items: PriceItem[] }) {
  const [pick, setPick] = useState(items[0]?.id ?? '')
  const [people, setPeople] = useState(10)
  const item = items.find((i) => i.id === pick)
  return (
    <Sheet title="Workshop" onClose={onClose}>
      {back}
      <div className="chips">
        {items.map((i) => <button key={i.id} className={i.id === pick ? 'chip on' : 'chip'} onClick={() => setPick(i.id)}>{i.name}</button>)}
      </div>
      <label className="field"><span>Počet ({item?.unit ?? 'osoba'})</span><NumInput value={people} onChange={setPeople} min={1} /></label>
      <div className="calc-preview"><span>{item ? `${fmtNum(people)} × ${money(item.price)}` : ''}</span><strong>{money(item ? people * item.price : 0)}</strong></div>
      <button className="btn-primary" disabled={!item} onClick={() => item && onAdd([fromItem(item, { name: `Workshop: ${item.name}`, qty: people })])}>Pridať do ponuky</button>
    </Sheet>
  )
}
