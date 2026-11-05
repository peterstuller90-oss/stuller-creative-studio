import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  biometricName, isCancel, passkeysSupported, register, registrationOptions, savedPasskey, unregister, type RegisterOptions,
} from '../lib/passkey'

export function FaceIdToggle({ supabase }: { supabase: SupabaseClient }) {
  const [email, setEmail] = useState('')
  const [on, setOn] = useState(false)
  const [prepared, setPrepared] = useState<RegisterOptions | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const name = biometricName()

  useEffect(() => {
    if (!passkeysSupported()) return
    supabase.auth.getSession().then(({ data }) => {
      const e = data.session?.user.email ?? ''
      setEmail(e)
      setOn(!!e && !!savedPasskey(e))
    })
  }, [supabase])

  // Prepare the next setup while the switch is off, so the tap goes straight to Face ID.
  useEffect(() => {
    if (email && !on && !prepared) registrationOptions(supabase).then(setPrepared).catch(() => {})
  }, [supabase, email, on, prepared])

  if (!email) return null

  async function toggle() {
    setBusy(true)
    setError('')
    try {
      if (on) {
        await unregister(supabase, email)
        setOn(false)
      } else {
        await register(supabase, email, prepared ?? await registrationOptions(supabase))
        setOn(true)
      }
    } catch (e) {
      if (!isCancel(e)) setError(e instanceof Error ? e.message : 'Nepodarilo sa to.')
    }
    setPrepared(null)
    setBusy(false)
  }

  return (
    <section className="card push-card">
      <div className="push-row">
        <span className="push-icon" aria-hidden="true">🙂</span>
        <div className="task-main">
          <strong>Prihlásenie cez {name}</strong>
          <span className="muted">
            {on
              ? `Zapnuté na tomto zariadení. Pri prihlásení stačí ${name}, PIN funguje stále.`
              : `Na tomto zariadení sa prihlásiš cez ${name} namiesto PINu.`}
          </span>
        </div>
      </div>
      <button className={on ? 'btn-secondary' : 'btn-primary'} onClick={toggle} disabled={busy}>
        {busy ? 'Chvíľku…' : on ? `Vypnúť ${name}` : `Zapnúť ${name}`}
      </button>
      {error && <p className="error">{error}</p>}
    </section>
  )
}
