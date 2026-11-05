import { useState } from 'react'
import { fmtNum, money } from '../lib/calc'
import { autoBase, emptyLicense, licensePrice, qtyBand, readBrief, type BriefReading } from '../lib/license'
import type { LicenseInfo, Quote, Settings } from '../lib/types'
import { Icon, NumInput, Sheet, toast } from './ui'

interface Props {
  quote: Quote
  settings: Settings
  /** Changes the quote; the editor keeps the license line and contract in sync. */
  update: (fn: (q: Quote) => Quote) => void
}

export function LicenseCard({ quote: q, settings, update }: Props) {
  const ls = settings.license
  const [reading, setReading] = useState(false)
  const [notes, setNotes] = useState<BriefReading | null>(null)
  const lic = q.license

  const setLic = (patch: Partial<LicenseInfo>) => update((x) => ({ ...x, license: { ...(x.license ?? emptyLicense(ls)), ...patch } }))
  const toggleUse = (label: string) => update((x) => {
    const cur = x.license ?? emptyLicense(ls)
    const uses = cur.uses.includes(label) ? cur.uses.filter((u) => u !== label) : [...cur.uses, label]
    return { ...x, license: { ...cur, uses } }
  })

  function applyReading(r: BriefReading, text: string) {
    update((x) => ({
      ...x,
      license: { ...r.license, base: x.license?.base ?? null },
      contract: r.exclusive === null ? x.contract : { ...x.contract, exclusive: r.exclusive },
      brief: [...x.brief.filter((b) => b.label !== 'Zadanie (text)'), { label: 'Zadanie (text)', value: text }],
    }))
    setNotes(r)
  }

  if (!lic) {
    return (
      <div className="card pad stack">
        <p className="hint">Keď chce klient dielo používať na produktoch, v reklame alebo na webe, appka dopočíta cenu licencie podľa rozsahu (na čo, koľko kusov, ako dlho, kde).</p>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => setLic({})}><Icon name="plus" size={20} /> Pridať licenciu</button>
          <button className="btn-secondary" onClick={() => setReading(true)}><Icon name="import" size={20} /> Načítať zo zadania</button>
        </div>
        {reading && <ReadBriefSheet settings={settings} onClose={() => setReading(false)} onRead={applyReading} />}
      </div>
    )
  }

  const price = licensePrice(lic, ls, q.contract.exclusive, q.lines)
  const band = qtyBand(ls, lic.pieces)
  return (
    <div className="card pad stack">
      {notes && (
        <div className="banner">
          <strong>Načítané zo zadania (hľadanie slov, nie AI). Skontroluj:</strong>
          {notes.found.length > 0 && <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>{notes.found.map((t) => <li key={t}>{t}</li>)}</ul>}
          {notes.missing.length > 0 && (<>
            <p style={{ margin: '8px 0 0' }}><strong>V zadaní chýba, opýtaj sa klienta:</strong></p>
            <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>{notes.missing.map((t) => <li key={t}>{t}</li>)}</ul>
          </>)}
        </div>
      )}

      <div className="stack" style={{ gap: 6 }}>
        <p className="section-title">Na čo dielo použije</p>
        <div className="chips">
          {ls.uses.map((u) => (
            <button key={u.label} className={`chip${lic.uses.includes(u.label) ? ' on' : ''}`} onClick={() => toggleUse(u.label)}>{u.label} ×{fmtNum(u.coef)}</button>
          ))}
        </div>
      </div>

      <div className="grid2">
        <label className="field"><span>Počet kusov (náklad)</span><NumInput value={lic.pieces} onChange={(n) => setLic({ pieces: Math.max(0, Math.round(n)) })} /></label>
        <label className="field"><span>Pásmo nákladu</span><input readOnly value={`${band?.label ?? ''} ×${fmtNum(band?.coef ?? 1)}`} /></label>
        <label className="field"><span>Ako dlho</span>
          <select value={lic.duration} onChange={(e) => setLic({ duration: e.target.value })}>
            {ls.duration.map((d) => <option key={d.label} value={d.label}>{d.label} ×{fmtNum(d.coef)}</option>)}
          </select>
        </label>
        <label className="field"><span>Kde (územie)</span>
          <select value={lic.territory} onChange={(e) => setLic({ territory: e.target.value })}>
            {ls.territory.map((t) => <option key={t.label} value={t.label}>{t.label} ×{fmtNum(t.coef)}</option>)}
          </select>
        </label>
        <label className="field"><span>Cena diela (základ, €)</span>
          <NumInput value={lic.base ?? autoBase(q.lines)} onChange={(n) => setLic({ base: n })} />
        </label>
        <div className="field" style={{ justifyContent: 'flex-end' }}>
          {lic.base !== null
            ? <button className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setLic({ base: null })}>Počítať zo súčtu položiek</button>
            : <span className="hint">Súčet ostatných položiek. Môžeš prepísať.</span>}
        </div>
      </div>
      <label className="check"><input type="checkbox" checked={q.contract.exclusive} onChange={(e) => update((x) => ({ ...x, contract: { ...x.contract, exclusive: e.target.checked } }))} />Výhradná licencia ×{fmtNum(ls.exclusiveCoef)} (autor dielo nesmie dať nikomu inému)</label>

      <dl className="brief-list">
        {price.steps.map((s) => <div key={s.label}><dt>{s.label}</dt><dd className="num">{s.value}</dd></div>)}
      </dl>
      <div className="calc-preview"><span>Licencia (pridaná do položiek a do zmluvy)</span><strong>{money(price.fee)}</strong></div>

      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <button className="link-btn" onClick={() => setReading(true)}><Icon name="import" size={18} /> Načítať zo zadania</button>
        <button className="link-btn" style={{ color: 'var(--accent-dark)' }} onClick={() => { setNotes(null); update((x) => ({ ...x, license: null })) }}><Icon name="trash" size={18} /> Bez licencie</button>
      </div>
      <p className="hint">Výpočet je orientačný, koeficienty zmeníš v Nastaveniach. Nie je to právna rada.</p>
      {reading && <ReadBriefSheet settings={settings} onClose={() => setReading(false)} onRead={applyReading} />}
    </div>
  )
}

function ReadBriefSheet({ settings, onClose, onRead }: { settings: Settings; onClose: () => void; onRead: (r: BriefReading, text: string) => void }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      const { fileText } = await import('../lib/pdfText')
      const t = await fileText(file)
      if (!t) toast('V súbore som nenašiel text (možno je to sken). Vlož text ručne.')
      setText(t)
    } catch (e) {
      toast('Súbor sa nepodarilo prečítať: ' + (e instanceof Error ? e.message : ''))
    } finally { setBusy(false) }
  }

  return (
    <Sheet title="Načítať zo zadania" onClose={onClose}>
      <p className="hint">Nahraj PDF od klienta alebo sem vlož text z mailu. Appka v ňom hľadá slová ako „tričko“, „1000 ks“, „2 roky“, „Slovensko“, „výhradná“ a predvyplní licenciu. Ktoré slová hľadá, nastavíš v Nastaveniach.</p>
      <label className="btn-secondary" style={{ cursor: 'pointer' }}>
        <Icon name="import" size={20} /> {busy ? 'Čítam…' : 'Vybrať PDF alebo textový súbor'}
        <input type="file" accept="application/pdf,.pdf,text/plain,.txt,.md" hidden onChange={(e) => loadFile(e.target.files?.[0])} />
      </label>
      <label className="field"><span>Text zadania</span><textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Sem vlož text zadania…" /></label>
      <button className="btn-primary" disabled={!text.trim() || busy} onClick={() => { onRead(readBrief(text, settings.license), text.trim()); onClose() }}>
        <Icon name="check" size={20} /> Načítať
      </button>
    </Sheet>
  )
}
