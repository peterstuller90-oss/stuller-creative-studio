import { useState } from 'react'
import { supabase } from './lib/supabase'
import { Logo } from './modules/home/components/Logo'

// For people outside the family (e.g. Handrbolka team): e-mail and password.
export function EmailLogin({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setError(error.status === 429 ? 'Veľa pokusov. Skús to o chvíľu.' : 'Nesprávny e-mail alebo heslo.')
  }
  return (
    <main className="center-screen">
      <form className="login-wrap" onSubmit={submit}>
        <Logo label="Creative Studio" />
        <input className="hub-input" type="email" placeholder="E-mail" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="hub-input" type="password" placeholder="Heslo" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <p className="error">{error || ' '}</p>
        <button className="btn-primary" disabled={busy}>{busy ? 'Prihlasujem…' : 'Prihlásiť'}</button>
        <button type="button" className="link-btn" onClick={onBack}>← Rodinné profily</button>
      </form>
    </main>
  )
}
