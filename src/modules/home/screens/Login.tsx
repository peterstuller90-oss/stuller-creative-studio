import { play } from '../lib/sound'
import { Logo } from '../components/Logo'
import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Avatar } from '../components/Avatar'
import { FAMILY, type Member } from '../lib/family'
import { biometricName, isCancel, login, loginOptions, passkeysSupported, savedPasskey, type LoginOptions } from '../lib/passkey'

const PIN_LENGTH = 6
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

export function Login({ supabase, label, extra }: { supabase: SupabaseClient; label?: string; extra?: React.ReactNode }) {
  const [member, setMember] = useState<Member | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [faceId, setFaceId] = useState<LoginOptions | null>(null)
  // Face ID instead of PIN: for every profile set up on this device, get the login ready before the tap,
  // so tapping the profile card opens Face ID straight away (iPhone allows it only right after a tap).
  const [ready, setReady] = useState<Record<string, LoginOptions>>({})
  useEffect(() => {
    if (!passkeysSupported()) return
    const prepare = () => {
      for (const m of FAMILY) {
        if (savedPasskey(m.email)) loginOptions(supabase, m.email).then((o) => setReady((r) => ({ ...r, [m.email]: o }))).catch(() => {})
      }
    }
    prepare()
    const timer = setInterval(prepare, 4 * 60_000) // challenges expire after 5 minutes
    return () => clearInterval(timer)
  }, [supabase])

  async function pick(m: Member) {
    play('tap')
    const prepared = ready[m.email]
    if (!prepared) return setMember(m)
    setBusy(true)
    try {
      await login(supabase, prepared)
      play('correct')
    } catch (e) {
      setMember(m) // cancelled or failed: fall back to PIN
      if (!isCancel(e)) setError(e instanceof Error ? e.message : 'Nepodarilo sa to.')
    }
    setReady((r) => { const { [m.email]: _, ...rest } = r; return rest })
    setBusy(false)
  }

  // If this device has Face ID set up for the chosen profile, get the login challenge ready before the tap.
  const hasFaceId = !!member && passkeysSupported() && !!savedPasskey(member.email)
  useEffect(() => {
    if (member && hasFaceId && !faceId) loginOptions(supabase, member.email).then(setFaceId).catch(() => {})
  }, [supabase, member, hasFaceId, faceId])

  async function useFaceId() {
    if (busy || !member) return
    setBusy(true)
    setError('')
    try {
      await login(supabase, faceId ?? await loginOptions(supabase, member.email))
      play('correct')
    } catch (e) {
      if (!isCancel(e)) setError(e instanceof Error ? e.message : 'Nepodarilo sa to.')
    }
    setFaceId(null)
    setBusy(false)
  }

  async function press(key: string) {
    if (busy || !member) return
    play('tap')
    if (key === '⌫') return setPin(pin.slice(0, -1))
    if (!key || pin.length >= PIN_LENGTH) return
    const next = pin + key
    setPin(next)
    setError('')
    if (next.length < PIN_LENGTH) return
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: member.email, password: next })
    setBusy(false)
    play(error ? 'wrong' : 'correct')
    if (error) {
      setError(error.status === 429 ? 'Veľa pokusov. Skús to o chvíľu.' : 'Nesprávny PIN.')
      setPin('')
    }
  }

  if (!member) {
    return (
      <main className="center-screen">
        <div className="login-wrap">
          <Logo label={label} />
          <p className="muted">Kto si?</p>
          <div className="profile-grid">
            {FAMILY.map((m) => (
              <button key={m.name} className="card profile-card" disabled={busy} onClick={() => pick(m)}>
                <Avatar name={m.name} size={84} />
                <strong>{m.name}</strong>
                {ready[m.email] && <span className="muted">🙂 {biometricName()}</span>}
              </button>
            ))}
          </div>
          {extra}
        </div>
      </main>
    )
  }

  return (
    <main className="center-screen">
      <div className="login-wrap">
        <Avatar name={member.name} size={96} />
        <h2 className="pin-title">Ahoj, {member.name}!</h2>
        <p className="muted">Zadaj svoj PIN</p>
        <div className={error ? 'pin-dots shake' : 'pin-dots'}>
          {Array.from({ length: PIN_LENGTH }, (_, i) => <span key={i} className={i < pin.length ? 'dot on' : 'dot'} />)}
        </div>
        <p className="error">{busy ? <span className="muted">Overujem…</span> : error || ' '}</p>
        <div className="keypad">
          {KEYS.map((k, i) => k
            ? <button key={i} className="key" onClick={() => press(k)} aria-label={k === '⌫' ? 'Zmazať' : k}>{k}</button>
            : <span key={i} />)}
        </div>
        {hasFaceId && (
          <button className="btn-primary faceid-btn" onClick={useFaceId} disabled={busy}>🙂 Prihlásiť cez {biometricName()}</button>
        )}
        <button className="link-btn" onClick={() => { setMember(null); setPin(''); setError(''); setFaceId(null) }}>← Iný profil</button>
      </div>
    </main>
  )
}
