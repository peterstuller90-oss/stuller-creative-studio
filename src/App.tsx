import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { APPS, type Audience, type HubApp } from './apps'
import { FAMILY } from './modules/home/lib/family'
import { Login } from './modules/home/screens/Login'
import { EmailLogin } from './EmailLogin'
import { FaceIdSetup } from './FaceIdSetup'

// Each module keeps its own styles, scoped under .mod-<id> (see vite.config.ts).
const MODULES: Record<string, React.LazyExoticComponent<() => React.JSX.Element>> = {
  home: lazy(() => import('./modules/home/App')),
  ponuky: lazy(() => import('./modules/ponuky/App')),
}

const route = () => location.hash.slice(1).split('/')[1] ?? ''

// A studio inside the iframe can have an unsaved design (see public/apps/hub-leave.js).
type Leave = { dirty: () => boolean; guard: () => Promise<boolean> }
let openFrame: HTMLIFrameElement | null = null
const frameLeave = (): Leave | undefined => {
  try { return (openFrame?.contentWindow as (Window & { HubLeave?: Leave }) | null)?.HubLeave } catch { return undefined }
}
let leaving = false
async function leaveTo(hash: string) {
  const l = frameLeave()
  if (l && !(await l.guard())) return
  leaving = true
  location.hash = hash
}

function useRoute() {
  const [r, setR] = useState(route)
  useEffect(() => {
    let shown = route()
    const on = () => {
      const next = route()
      // Back gesture / back button while a design is unsaved: stay, and ask first.
      if (!leaving && next !== shown && frameLeave()?.dirty()) {
        const target = location.hash || '#/'
        history.pushState(null, '', `#/${shown}`)
        void leaveTo(target)
        return
      }
      leaving = false
      shown = next
      setR(next)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return r
}

function audienceOf(session: Session): Audience {
  const member = FAMILY.find((m) => m.email === session.user.email)
  return member ? member.role : 'other'
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [emailMode, setEmailMode] = useState(false)
  const current = useRoute()
  const frameRef = useRef<HTMLIFrameElement | null>(null)
  useEffect(() => { openFrame = frameRef.current; return () => { openFrame = null } })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <main className="hub-center"><div className="hub-spinner" /></main>
  if (!session) {
    return (
      <div className="mod-home">
        {emailMode
          ? <EmailLogin onBack={() => setEmailMode(false)} />
          : <Login supabase={supabase} label="Creative Studio"
              extra={<button className="link-btn" onClick={() => setEmailMode(true)}>Prihlásiť sa e-mailom</button>} />}
      </div>
    )
  }

  const audience = audienceOf(session)
  const apps = APPS.filter((a) => a.audience.includes(audience))
  const app = apps.find((a) => a.id === current && (a.module || a.frame))
  const Module = app?.module ? MODULES[app.id] : undefined
  if (app?.frame) {
    return (
      <div className="hub-module">
        <header className="hub-bar no-print">
          <a href="#/" className="hub-back" onClick={(e) => { e.preventDefault(); void leaveTo('#/') }}>‹ Studio</a>
          <span className="hub-bar-title">{app.name}</span>
        </header>
        <iframe ref={frameRef} className="hub-frame" src={`${import.meta.env.BASE_URL}${app.frame}?v=${__BUILD__}`} title={app.name} allow="clipboard-write; fullscreen" />
      </div>
    )
  }
  if (app && Module) {
    return (
      <div className="hub-module">
        <header className="hub-bar no-print">
          <a href="#/" className="hub-back">‹ Studio</a>
          <span className="hub-bar-title">{app.name}</span>
        </header>
        <div className={`mod-${app.id} hub-module-body`}>
          <Suspense fallback={<main className="hub-center"><div className="hub-spinner" /></main>}>
            <Module />
          </Suspense>
        </div>
      </div>
    )
  }

  return <Launcher apps={apps} session={session} />
}

function Launcher({ apps, session }: { apps: HubApp[]; session: Session }) {
  const name = FAMILY.find((m) => m.email === session.user.email)?.name ?? session.user.email
  return (
    <main className="hub">
      <header className="hub-head">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Štullers" width={150} />
        <h1>Creative Studio</h1>
        <p>Ahoj, {name}! Čo dnes otvoríme?</p>
      </header>
      <FaceIdSetup email={session.user.email ?? ''} />
      <nav className="hub-list">
        {apps.map((a) => {
          const soon = !a.module && !a.frame
          if (soon) return <span key={a.id} className="hub-item soon">{a.name}<small>čoskoro</small></span>
          return (
            <a key={a.id} className="hub-item" href={`#/${a.id}`}>{a.name}</a>
          )
        })}
      </nav>
      <button className="hub-logout" onClick={() => supabase.auth.signOut()}>Odhlásiť sa</button>
    </main>
  )
}
