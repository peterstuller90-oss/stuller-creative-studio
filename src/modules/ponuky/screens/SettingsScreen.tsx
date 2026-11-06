import { useState } from 'react'
import { ask, Icon, NumInput, toast } from '../components/ui'
import type { IconName } from '../components/icons'
import { fmtNum, levies, money } from '../lib/calc'
import { CONTRACT_PLACEHOLDERS, DEFAULT_CONTRACT } from '../lib/contractTemplate'
import { DEFAULT_LICENSE } from '../lib/defaults'
import type { Author, Company, LicenseSettings, Settings, TaxSettings } from '../lib/types'

/** Section heading that folds the card(s) right under it (CSS hides them while closed). All start folded. */
function Head({ icon, title }: { icon: IconName; title: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`sec-head fold-head${open ? ' open' : ''}`}>
      <button className="fold-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name={icon} /><h2>{title}</h2>
        <span className="fold-chev"><Icon name="chevron" size={20} /></span>
      </button>
    </div>
  )
}

export function SettingsScreen({ settings, onSave, demo, onLogout }: { settings: Settings; onSave: (s: Settings) => Promise<void>; demo: boolean; onLogout?: () => void }) {
  const [s, setS] = useState(settings)
  const [showTpl, setShowTpl] = useState(false)
  const set = (patch: Partial<Settings>) => setS((x) => ({ ...x, ...patch }))
  const setTax = (patch: Partial<TaxSettings>) => setS((x) => ({ ...x, tax: { ...x.tax, ...patch } }))
  const setAuthor = (i: number, patch: Partial<Author>) => setS((x) => ({ ...x, authors: x.authors.map((a, j) => (j === i ? { ...a, ...patch } : a)) }))
  const co = (k: keyof Company, label: string, wide = false) => (
    <label className="field" style={wide ? { gridColumn: '1 / -1' } : undefined}><span>{label}</span>
      <input value={s.company[k]} onChange={(e) => setS((x) => ({ ...x, company: { ...x.company, [k]: e.target.value } }))} />
    </label>
  )
  const setLic = (patch: Partial<LicenseSettings>) => setS((x) => ({ ...x, license: { ...x.license, ...patch } }))
  /** Edit one row of a license list (uses, quantity…). */
  const licRow = <K extends 'uses' | 'quantity' | 'duration' | 'territory'>(key: K, i: number, patch: Partial<LicenseSettings[K][number]>) =>
    setLic({ [key]: (s.license[key] as LicenseSettings[K][number][]).map((x, j) => (j === i ? { ...x, ...patch } : x)) } as Partial<LicenseSettings>)
  const licDel = (key: 'uses' | 'quantity' | 'duration' | 'territory', i: number) =>
    setLic({ [key]: (s.license[key] as unknown[]).filter((_, j) => j !== i) } as Partial<LicenseSettings>)
  const del = (onClick: () => void) => <button className="icon-btn danger" style={{ alignSelf: 'flex-end', marginBottom: 4 }} aria-label="Odstrániť" onClick={onClick}><Icon name="trash" size={18} /></button>
  const L = s.license
  const save = () => onSave(s).then(() => toast('Nastavenia uložené')).catch((e) => toast('Neuložené: ' + e.message))
  const ex = levies(1000, s.tax)
  const t = s.tax

  return (
    <>
      <h1 className="page-title">Nastavenia</h1>
      {demo && <div className="banner">Demo režim: dáta sú uložené len v tomto prehliadači.</div>}

      <Head icon="coins" title="Odvody a daň" />
      <div className="card pad stack">
        <div className="segmented">
          <button className={t.mode === 'priznanie' ? 'on' : ''} onClick={() => setTax({ mode: 'priznanie' })}>Daňové priznanie</button>
          <button className={t.mode === 'zrazka' ? 'on' : ''} onClick={() => setTax({ mode: 'zrazka' })}>Zrážková daň</button>
        </div>
        {t.mode === 'priznanie' ? (
          <>
            <p className="hint">Honorár zdaníte sami v priznaní: z príjmu sa odpočítajú paušálne výdavky, zo zvyšku sa platí zdravotné poistenie a potom daň. Klient daň nezráža, zmluva obsahuje dohodu o nezrážaní dane.</p>
            <div className="grid3">
              <label className="field"><span>Paušálne výdavky (%)</span><NumInput value={t.expensePct} onChange={(n) => setTax({ expensePct: n })} /></label>
              <label className="field"><span>Zdravotné poistenie (%)</span><NumInput value={t.healthPct} onChange={(n) => setTax({ healthPct: n })} /></label>
              <label className="field"><span>Daň z príjmu (%)</span><NumInput value={t.taxPct} onChange={(n) => setTax({ taxPct: n })} /></label>
            </div>
          </>
        ) : (
          <>
            <p className="hint">Klient (firma, mesto, škola) zrazí daň z honoráru a odvedie ju za vás. Zdravotné poistenie sa z takého príjmu neplatí a priznanie nepodávate.</p>
            <label className="field" style={{ maxWidth: 220 }}><span>Zrážková daň (%)</span><NumInput value={t.withholdPct} onChange={(n) => setTax({ withholdPct: n })} /></label>
          </>
        )}
        <div className="calc-preview">
          <span>Z 1 000 € honoráru: {t.mode === 'priznanie' ? `zdravotné ${money(ex.health)}, daň ${money(ex.tax)}` : `daň ${money(ex.tax)}`}</span>
          <strong>na ruku {money(ex.net)}</strong>
        </div>
        <label className="check"><input type="checkbox" checked={t.pricesAreNet} onChange={(e) => setTax({ pricesAreNet: e.target.checked })} />Ceny v cenníku sú „na ruku“ (appka k nim pripočíta odvody)</label>
        <p className="hint">Sadzby sú orientačné a menia sa. Over si ich s účtovníčkou a uprav tu. Pri dvoch autoroch sa honorár delí na polovicu a každý platí odvody zo svojej časti.</p>
      </div>

      <Head icon="contract" title="Autori (podpisujú zmluvu)" />
      <div className="card pad stack">
        {s.authors.map((a, i) => (
          <div key={i} className="stack" style={{ gap: 8, paddingBottom: 10, borderBottom: i < s.authors.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <div className="grid2">
              <label className="field"><span>Meno a priezvisko</span><input value={a.name} onChange={(e) => setAuthor(i, { name: e.target.value })} /></label>
              <label className="field"><span>Dátum narodenia</span><input value={a.born} placeholder="napr. 1. 1. 1990" onChange={(e) => setAuthor(i, { born: e.target.value })} /></label>
              <label className="field" style={{ gridColumn: '1 / -1' }}><span>Adresa trvalého pobytu</span><input value={a.address} onChange={(e) => setAuthor(i, { address: e.target.value })} /></label>
            </div>
          </div>
        ))}
        <div className="row">
          <button className="link-btn" onClick={() => set({ authors: [...s.authors, { name: '', born: '', address: '' }] })}>+ Pridať autora</button>
          {s.authors.length > 1 && <button className="link-btn" onClick={() => set({ authors: s.authors.slice(0, -1) })}>Odobrať posledného</button>}
        </div>
      </div>

      <Head icon="building" title="Typ organizácie a cena" />
      <div className="card pad stack">
        <p className="hint">Klient si typ vyberie v zadaní. Appka podľa neho pridá prirážku (+) alebo zľavu (−).</p>
        {s.orgTypes.map((o, i) => (
          <div key={i} className="row" style={{ flexWrap: 'nowrap' }}>
            <label className="field grow"><span>Typ</span><input value={o.label} onChange={(e) => set({ orgTypes: s.orgTypes.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} /></label>
            <label className="field" style={{ width: 100 }}><span>%</span><NumInput value={o.pct} onChange={(n) => set({ orgTypes: s.orgTypes.map((x, j) => (j === i ? { ...x, pct: n } : x)) })} /></label>
            <button className="icon-btn danger" style={{ alignSelf: 'flex-end', marginBottom: 4 }} aria-label="Odstrániť" onClick={() => set({ orgTypes: s.orgTypes.filter((_, j) => j !== i) })}><Icon name="trash" size={18} /></button>
          </div>
        ))}
        <button className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => set({ orgTypes: [...s.orgTypes, { label: 'Nový typ', pct: 0 }] })}>+ Pridať typ</button>
      </div>

      <Head icon="mural" title="Zložitosť murálu" />
      <div className="card pad stack">
        {s.complexity.map((c, i) => (
          <div key={i} className="row" style={{ flexWrap: 'nowrap' }}>
            <label className="field grow"><span>Stupeň</span><input value={c.label} onChange={(e) => set({ complexity: s.complexity.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} /></label>
            <label className="field" style={{ width: 100 }}><span>Násobok</span><NumInput value={c.coef} onChange={(n) => set({ complexity: s.complexity.map((x, j) => (j === i ? { ...x, coef: n } : x)) })} /></label>
            <button className="icon-btn danger" style={{ alignSelf: 'flex-end', marginBottom: 4 }} aria-label="Odstrániť" onClick={() => set({ complexity: s.complexity.filter((_, j) => j !== i) })}><Icon name="trash" size={18} /></button>
          </div>
        ))}
        <button className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => set({ complexity: [...s.complexity, { label: 'Nový', coef: 1 }] })}>+ Pridať stupeň ({fmtNum(s.complexity.length + 1)}.)</button>
      </div>

      <Head icon="contract" title="Licencia – výpočet" />
      <div className="card pad stack">
        <p className="hint">Cena licencie = cena diela × podiel licencie × násobok za použitie (pri viacerých sa sčítajú) × náklad × doba × územie × výhradnosť. „Slová v zadaní“ appka hľadá v texte od klienta (stačí začiatok slova, oddeľ čiarkou). Čísla sú zatiaľ odhad, uprav ich podľa seba.</p>
        <div className="grid2">
          <label className="field"><span>Podiel licencie z ceny diela (%)</span><NumInput value={L.basePct} onChange={(n) => setLic({ basePct: n })} /></label>
          <label className="field"><span>Násobok za výhradnú licenciu</span><NumInput value={L.exclusiveCoef} onChange={(n) => setLic({ exclusiveCoef: n || 1 })} /></label>
        </div>

        <p className="section-title">Na čo dielo použije</p>
        {L.uses.map((u, i) => (
          <div key={i} className="stack" style={{ gap: 6, paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <label className="field grow"><span>Použitie</span><input value={u.label} onChange={(e) => licRow('uses', i, { label: e.target.value })} /></label>
              <label className="field" style={{ width: 100 }}><span>Násobok</span><NumInput value={u.coef} onChange={(n) => licRow('uses', i, { coef: n })} /></label>
              {del(() => licDel('uses', i))}
            </div>
            <label className="field"><span>Slová v zadaní</span><input value={u.keywords} onChange={(e) => licRow('uses', i, { keywords: e.target.value })} /></label>
          </div>
        ))}
        <button className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setLic({ uses: [...L.uses, { label: 'Nové použitie', coef: 1, keywords: '' }] })}>+ Pridať použitie</button>

        <p className="section-title">Náklad (počet kusov)</p>
        {L.quantity.map((x, i) => (
          <div key={i} className="row" style={{ flexWrap: 'nowrap' }}>
            <label className="field grow"><span>Názov</span><input value={x.label} onChange={(e) => licRow('quantity', i, { label: e.target.value })} /></label>
            <label className="field" style={{ width: 110 }}><span>Do ks (0 = bez limitu)</span><NumInput value={x.upTo} onChange={(n) => licRow('quantity', i, { upTo: n })} /></label>
            <label className="field" style={{ width: 100 }}><span>Násobok</span><NumInput value={x.coef} onChange={(n) => licRow('quantity', i, { coef: n })} /></label>
            {del(() => licDel('quantity', i))}
          </div>
        ))}
        <button className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setLic({ quantity: [...L.quantity, { label: 'Nové pásmo', upTo: 0, coef: 1 }] })}>+ Pridať pásmo</button>

        <p className="section-title">Doba</p>
        {L.duration.map((x, i) => (
          <div key={i} className="row" style={{ flexWrap: 'nowrap' }}>
            <label className="field grow"><span>Názov (ide do zmluvy)</span><input value={x.label} onChange={(e) => licRow('duration', i, { label: e.target.value })} /></label>
            <label className="field" style={{ width: 110 }}><span>Rokov (0 = celá doba)</span><NumInput value={x.years} onChange={(n) => licRow('duration', i, { years: n })} /></label>
            <label className="field" style={{ width: 100 }}><span>Násobok</span><NumInput value={x.coef} onChange={(n) => licRow('duration', i, { coef: n })} /></label>
            {del(() => licDel('duration', i))}
          </div>
        ))}
        <button className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setLic({ duration: [...L.duration, { label: 'Nová doba', years: 2, coef: 1 }] })}>+ Pridať dobu</button>

        <p className="section-title">Územie</p>
        {L.territory.map((x, i) => (
          <div key={i} className="stack" style={{ gap: 6, paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <label className="field grow"><span>Územie (ide do zmluvy)</span><input value={x.label} onChange={(e) => licRow('territory', i, { label: e.target.value })} /></label>
              <label className="field" style={{ width: 100 }}><span>Násobok</span><NumInput value={x.coef} onChange={(n) => licRow('territory', i, { coef: n })} /></label>
              {del(() => licDel('territory', i))}
            </div>
            <label className="field"><span>Slová v zadaní</span><input value={x.keywords} onChange={(e) => licRow('territory', i, { keywords: e.target.value })} /></label>
          </div>
        ))}
        <button className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setLic({ territory: [...L.territory, { label: 'Nové územie', coef: 1, keywords: '' }] })}>+ Pridať územie</button>
        <button className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={async () => { if (await ask('Vrátiť pôvodné čísla licencie? Tvoje úpravy sa stratia.')) setLic(DEFAULT_LICENSE) }}>Vrátiť pôvodné čísla</button>
        <p className="hint">Výpočet je orientačný pomocník, nie právna rada.</p>
      </div>

      <Head icon="quotes" title="Značka a kontakt" />
      <div className="card pad grid2">
        {co('name', 'Názov')}{co('person', 'Kontaktná osoba')}
        {co('email', 'E-mail')}{co('phone', 'Telefón')}
        {co('iban', 'IBAN (na zmluvu)', true)}
        {co('web', 'Web / Instagram', true)}
      </div>

      <Head icon="settings" title="Ponuky" />
      <div className="card pad stack">
        <div className="grid3">
          <label className="field"><span>Platnosť (dni)</span><NumInput value={s.validityDays} onChange={(n) => set({ validityDays: n })} /></label>
          <label className="field"><span>Záloha (%)</span><NumInput value={s.depositPct} onChange={(n) => set({ depositPct: n })} /></label>
          <label className="field"><span>Predpona čísla</span><input value={s.numberPrefix} onChange={(e) => set({ numberPrefix: e.target.value })} /></label>
        </div>
        <label className="field"><span>Podmienky na cenovej ponuke</span><textarea rows={3} value={s.terms} onChange={(e) => set({ terms: e.target.value })} /></label>
      </div>

      <Head icon="contract" title="Vzor zmluvy" />
      <div className="card pad stack">
        <p className="hint">Zmluva o vytvorení diela a licenčná zmluva podľa Autorského zákona. Je to vzor: pred prvým použitím si ho daj skontrolovať právnikovi.</p>
        {showTpl ? (
          <>
            <label className="field"><span>Text zmluvy</span><textarea rows={18} value={s.contractTemplate} onChange={(e) => set({ contractTemplate: e.target.value })} style={{ fontSize: 15 }} /></label>
            <p className="hint">„# “ nadpis, „## “ článok. Do textu môžeš vložiť: {CONTRACT_PLACEHOLDERS.map(([k, d]) => <span key={k}><code>{`{{${k}}}`}</code> {d}; </span>)}</p>
            <button className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={async () => { if (await ask('Vrátiť pôvodný text zmluvy? Tvoje úpravy sa stratia.')) set({ contractTemplate: DEFAULT_CONTRACT }) }}>Vrátiť pôvodný vzor</button>
          </>
        ) : <button className="btn-secondary" onClick={() => setShowTpl(true)}>Upraviť text zmluvy</button>}
      </div>

      <div className="save-bar no-print"><button className="btn-primary" onClick={save}><Icon name="check" size={20} /> Uložiť nastavenia</button></div>
      {onLogout && <button className="link-btn" onClick={onLogout}>Odhlásiť sa</button>}
    </>
  )
}
