import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Logo } from '../components/ui'

// Same accounts and PINs as Stullers Home; only these two are allowed in quote_admins.
const PROFILES = [
  { name: 'Peto', email: 'peto@stullers.home' },
  { name: 'Viki', email: 'viki@stullers.home' },
]

export function Login({ supabase, notAllowed }: { supabase: SupabaseClient; notAllowed?: string }) {
  const [email, setEmail] = useState(PROFILES[0].email)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setError(error.status === 429 ? 'Veľa pokusov. Skús to o chvíľu.' : 'Nesprávny PIN.')
  }
  return (
    <main className="center-screen">
      <form className="card login-card" onSubmit={submit}>
        <Logo />
        {notAllowed && <p className="error">Účet {notAllowed} nemá prístup k ponukám.</p>}
        <div className="segmented">
          {PROFILES.map((p) => <button type="button" key={p.email} className={email === p.email ? 'on' : ''} onClick={() => setEmail(p.email)}>{p.name}</button>)}
        </div>
        <label className="field"><span>E-mail</span><input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="field"><span>PIN (ako v Stullers Home)</span><input type="password" inputMode="numeric" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        <p className="error" aria-live="polite">{error}</p>
        <button className="btn-primary" disabled={busy}>{busy ? 'Prihlasujem…' : 'Prihlásiť'}</button>
        {notAllowed && <button type="button" className="link-btn" onClick={() => supabase.auth.signOut()}>Iný účet</button>}
      </form>
    </main>
  )
}
