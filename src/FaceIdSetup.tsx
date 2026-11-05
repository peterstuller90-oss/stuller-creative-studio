import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { FAMILY } from './modules/home/lib/family'
import {
  biometricName, isCancel, passkeysSupported, register, registrationOptions, savedPasskey, type RegisterOptions,
} from './modules/home/lib/passkey'

// Offers Face ID on the start screen until it is set up on this device. Turning it off is in Home → Settings.
export function FaceIdSetup({ email }: { email: string }) {
  const family = FAMILY.some((m) => m.email === email)
  const [on, setOn] = useState(() => !!savedPasskey(email))
  const [prepared, setPrepared] = useState<RegisterOptions | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [later, setLater] = useState(() => { try { return sessionStorage.getItem('faceid-later') === '1' } catch { return false } })
  const show = family && passkeysSupported() && !on && !later

  // Ready before the tap, because iPhone opens Face ID only straight from a tap.
  useEffect(() => {
    if (show && !prepared) registrationOptions(supabase).then(setPrepared).catch(() => {})
  }, [show, prepared])

  if (!show) return null
  const name = biometricName()

  async function enable() {
    setBusy(true); setError('')
    try {
      await register(supabase, email, prepared ?? await registrationOptions(supabase))
      setOn(true)
    } catch (e) {
      if (!isCancel(e)) setError(e instanceof Error ? e.message : 'Nepodarilo sa to.')
    }
    setPrepared(null)
    setBusy(false)
  }

  return (
    <section className="hub-faceid">
      <span className="hub-emoji" style={{ background: '#ffd3ee' }}>🙂</span>
      <div>
        <strong>Prihlasuj sa cez {name}</strong>
        <small>Bez PINu, stačí sa pozrieť na telefón.</small>
        {error && <small className="hub-error">{error}</small>}
      </div>
      <div className="hub-faceid-actions">
        <button className="hub-btn" onClick={enable} disabled={busy}>{busy ? 'Chvíľku…' : `Zapnúť ${name}`}</button>
        <button className="hub-link" onClick={() => { setLater(true); try { sessionStorage.setItem('faceid-later', '1') } catch { /* ignore */ } }}>Neskôr</button>
      </div>
    </section>
  )
}
