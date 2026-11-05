import './index.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ContractDocument } from './components/ContractDocument'
import { PriceSummary } from './components/PriceSummary'
import { QuoteDocument } from './components/QuoteDocument'
import { ARTIFACT, AskHost, Icon, Logo, Toast, toast } from './components/ui'
import { addDays, nextNumber, today, token, uid } from './lib/calc'
import { saveFile } from './lib/download'
import { briefToQuote } from './lib/importBrief'
import { DEFAULT_CONTRACT_INFO, store, supabase, type Data } from './lib/store'
import type { Quote } from './lib/types'
import { Login } from './screens/Login'
import { PriceList } from './screens/PriceList'
import { QuoteEditor } from './screens/QuoteEditor'
import { QuoteList } from './screens/QuoteList'
import { SettingsScreen } from './screens/SettingsScreen'


// Routes live in the hash (#/ponuka/<id>). The artifact viewer doesn't pass such hashes, so there they stay in memory.
let memoryPath = '/'
// Inside the hub, Ponuky's routes live under #/ponuky (e.g. #/ponuky/ponuka/<id>).
const PREFIX = '/ponuky'
const current = () => (ARTIFACT ? memoryPath : location.hash.slice(1).replace(/^\/ponuky/, '') || '/')
function useHash() {
  const [hash, setHash] = useState(current)
  useEffect(() => {
    const on = () => { setHash(current()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    window.addEventListener('memoryroute', on)
    return () => { window.removeEventListener('hashchange', on); window.removeEventListener('memoryroute', on) }
  }, [])
  return hash
}
const go = (path: string) => {
  if (ARTIFACT) { memoryPath = path; window.dispatchEvent(new Event('memoryroute')) } else location.hash = PREFIX + path
}
function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return <a href={`#${PREFIX}${to}`} className={active ? 'tab active' : 'tab'} onClick={(e) => { if (ARTIFACT) { e.preventDefault(); go(to) } }}>{children}</a>
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null)
  const [allowed, setAllowed] = useState<boolean | undefined>(supabase ? undefined : true)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!supabase) return
    if (!session) { setAllowed(undefined); return }
    supabase.rpc('is_quote_admin').then(({ data }) => setAllowed(data === true))
  }, [session])

  if (supabase && session === undefined) return <main className="center-screen"><div className="spinner" /></main>
  if (supabase && !session) return <Login supabase={supabase} />
  if (supabase && allowed === undefined) return <main className="center-screen"><div className="spinner" /></main>
  if (supabase && !allowed) return <Login supabase={supabase} notAllowed={session?.user.email} />
  return <Workspace />
}

function Workspace() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [warnings, setWarnings] = useState<Record<string, string[]>>({})
  const hash = useHash()
  const latest = useRef(data)
  useEffect(() => { latest.current = data }, [data])
  const reload = useCallback(() => store.loadAll().then(setData).catch((e) => setError(e.message)), [])
  useEffect(() => { reload() }, [reload])

  const saveQuote = useCallback(async (q: Quote, rememberClient = false) => {
    setData((d) => d && { ...d, quotes: d.quotes.some((x) => x.id === q.id) ? d.quotes.map((x) => (x.id === q.id ? q : x)) : [q, ...d.quotes] })
    const d = latest.current
    if (!d) return
    await store.saveQuote(q, d.settings)
    // Remember the client for next time (not on every keystroke, only when leaving or sending).
    if (rememberClient && (q.client.name || q.client.company)) {
      const known = d.clients.find((c) => (c.name && c.name === q.client.name) || (c.company && c.company === q.client.company && !c.name))
      const client = { ...q.client, id: known?.id ?? uid() }
      if (!known || (['company', 'ico', 'dic', 'address', 'email', 'phone'] as const).some((k) => known[k] !== client[k])) {
        await store.saveClient(client)
        setData((x) => x && { ...x, clients: known ? x.clients.map((c) => (c.id === known.id ? client : c)) : [...x.clients, client] })
      }
    }
  }, [])

  if (error) return <main className="center-screen"><div className="card login-card"><h2>Chyba</h2><p className="error">{error}</p><button className="btn-primary" onClick={() => { setError(''); reload() }}>Skúsiť znova</button></div></main>
  if (!data) return <main className="center-screen"><div className="spinner" /></main>

  function newQuote(from?: Partial<Quote>, warn: string[] = []) {
    const s = data!.settings
    const now = new Date().toISOString()
    const copy = !!from?.id
    const q: Quote = {
      id: uid(),
      number: nextNumber(data!.quotes.map((x) => x.number), s.numberPrefix),
      status: 'koncept',
      publicToken: token(),
      client: from?.client ?? { name: '', company: '', ico: '', dic: '', address: '', email: '', phone: '' },
      orgType: from?.orgType ?? '',
      orgPct: from?.orgPct ?? 0,
      title: copy ? `${from!.title} (kópia)` : from?.title ?? '',
      intro: from?.intro ?? '',
      issueDate: today(),
      validUntil: addDays(today(), s.validityDays),
      lines: (from?.lines ?? []).map((l) => ({ ...l, id: uid() })),
      discountPct: from?.discountPct ?? 0,
      depositPct: from?.depositPct ?? s.depositPct,
      note: from?.note ?? '',
      brief: from?.brief ?? [],
      contract: { ...DEFAULT_CONTRACT_INFO, ...from?.contract },
      acceptedAt: null, acceptedName: '',
      createdAt: now, updatedAt: now,
    }
    saveQuote(q).catch((e) => toast('Neuložené: ' + e.message))
    if (warn.length) setWarnings((w) => ({ ...w, [q.id]: warn }))
    go(`/ponuka/${q.id}`)
  }

  async function importBrief(file: File) {
    setBusy('import')
    try {
      const { readBriefPdf } = await import('./lib/pdf')
      const { values, ours } = await readBriefPdf(await file.arrayBuffer())
      if (!ours && !Object.keys(values).some((k) => k.startsWith('k_') || k.startsWith('p_'))) {
        toast('Toto PDF nie je naše zadanie. Pošli klientovi formulár z tlačidla „Zadanie pre klienta“.')
        return
      }
      const r = briefToQuote(values, data!.prices, data!.settings) as ReturnType<typeof briefToQuote> & { contractPlace: string }
      const { warnings: warn, contractPlace, ...patch } = r
      newQuote({ ...patch, contract: { ...DEFAULT_CONTRACT_INFO, place: contractPlace } }, warn)
      toast('Zadanie načítané')
    } catch (e) {
      toast('PDF sa nepodarilo prečítať: ' + (e instanceof Error ? e.message : ''))
    } finally { setBusy('') }
  }

  async function blankBrief() {
    setBusy('brief')
    try {
      const { makeBriefPdf } = await import('./lib/pdf')
      await saveFile(await makeBriefPdf(data!.settings, data!.prices), 'Stullers-zadanie-projektu.pdf')
    } catch (e) { toast(e instanceof Error ? e.message : 'Nepodarilo sa to.') } finally { setBusy('') }
  }

  async function contractPdf(q: Quote) {
    setBusy('contract')
    try {
      const { makeContractPdf } = await import('./lib/pdf')
      await saveFile(await makeContractPdf(q, data!.settings), `Zmluva-${q.number}.pdf`)
    } catch (e) { toast(e instanceof Error ? e.message : 'Nepodarilo sa to.') } finally { setBusy('') }
  }

  const [, route, id, sub] = hash.split('/')
  const quote = route === 'ponuka' ? data.quotes.find((q) => q.id === id) : undefined
  const tab = route === 'cennik' ? 'cennik' : route === 'nastavenia' ? 'nastavenia' : 'ponuky'

  let screen
  const back = (q: Quote) => <button className="back-btn" onClick={() => go(`/ponuka/${q.id}`)}><Icon name="back" size={20} /> Späť na ponuku</button>
  if (quote && sub === 'zmluva') {
    screen = (
      <>
        <div className="topline no-print">
          {back(quote)}
          <button className="btn-primary btn-sm" disabled={busy === 'contract'} onClick={() => contractPdf(quote)}><Icon name="download" size={18} /> {busy === 'contract' ? 'Pripravujem…' : 'Stiahnuť PDF'}</button>
        </div>
        <PriceSummary quote={quote} settings={data.settings} />
        <div className="doc-wrap"><ContractDocument quote={quote} settings={data.settings} /></div>
      </>
    )
  } else if (quote && sub === 'nahlad') {
    screen = (
      <>
        <div className="topline no-print">
          {back(quote)}
          {ARTIFACT
            ? <span className="muted">Tlač funguje v plnej verzii appky</span>
            : <button className="btn-primary btn-sm" onClick={() => window.print()}><Icon name="download" size={18} /> Uložiť PDF / tlačiť</button>}
        </div>
        <div className="doc-wrap"><QuoteDocument quote={quote} settings={data.settings} /></div>
      </>
    )
  } else if (quote) {
    screen = (
      <QuoteEditor key={quote.id} quote={quote} settings={data.settings} prices={data.prices} clients={data.clients}
        warnings={warnings[quote.id] ?? []}
        onSave={saveQuote} onBack={() => go('/')} onPreview={() => go(`/ponuka/${quote.id}/nahlad`)} onContract={() => go(`/ponuka/${quote.id}/zmluva`)}
        onDuplicate={() => newQuote(quote)}
        onDelete={async () => { await store.deleteQuote(quote.id); setData({ ...data, quotes: data.quotes.filter((q) => q.id !== quote.id) }); go('/') }} />
    )
  } else if (tab === 'cennik') {
    screen = (
      <PriceList prices={data.prices}
        onSave={async (p) => { setData((d) => d && { ...d, prices: d.prices.some((x) => x.id === p.id) ? d.prices.map((x) => (x.id === p.id ? p : x)) : [...d.prices, p] }); await store.savePrice(p) }}
        onDelete={async (pid) => { setData((d) => d && { ...d, prices: d.prices.filter((x) => x.id !== pid) }); await store.deletePrice(pid) }} />
    )
  } else if (tab === 'nastavenia') {
    screen = <SettingsScreen settings={data.settings} demo={store.mode === 'demo'}
      onSave={async (s) => { await store.saveSettings(s); setData({ ...data, settings: s }) }}
      onLogout={supabase ? () => supabase!.auth.signOut() : undefined} />
  } else {
    screen = <QuoteList quotes={data.quotes} settings={data.settings} busy={busy} onOpen={(qid) => go(`/ponuka/${qid}`)} onNew={() => newQuote()} onImport={importBrief} onBlankBrief={blankBrief} />
  }

  return (
    <div className="app">
      <main className="content">
        {route !== 'ponuka' && <div className="no-print top-logo" style={{ marginBottom: -4 }}><Logo width={160} /></div>}
        {store.mode === 'demo' && route !== 'ponuka' && tab !== 'nastavenia' && <div className="banner no-print">Demo režim: dáta sa ukladajú iba v tomto prehliadači.</div>}
        {screen}
      </main>
      <nav className="tabbar no-print">
        <div className="brand-mini"><img src={`${import.meta.env.BASE_URL}logo.png`} alt="Štullers" /></div>
        <NavLink to="/" active={tab === 'ponuky'}><Icon name="quotes" /><span>Ponuky</span></NavLink>
        <NavLink to="/cennik" active={tab === 'cennik'}><Icon name="prices" /><span>Cenník</span></NavLink>
        <NavLink to="/nastavenia" active={tab === 'nastavenia'}><Icon name="settings" /><span>Nastavenia</span></NavLink>
      </nav>
      <Toast />
      <AskHost />
    </div>
  )
}
