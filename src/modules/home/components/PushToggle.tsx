import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { disablePush, enablePush, pushState, type PushState } from '../lib/push'

export function PushToggle({ supabase }: { supabase: SupabaseClient }) {
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { pushState().then(setState) }, [])
  if (!state || state === 'unsupported') return null

  async function toggle() {
    setBusy(true)
    setError('')
    try {
      if (state === 'on') await disablePush(supabase)
      else await enablePush(supabase)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nepodarilo sa to.')
    }
    setState(await pushState())
    setBusy(false)
  }

  return (
    <section className="card push-card">
      <div className="push-row">
        <span className="push-icon" aria-hidden="true">🔔</span>
        <div className="task-main">
          <strong>Notifikácie</strong>
          <span className="muted">
            {state === 'on' && 'Zapnuté. Dáme ti vedieť o nových, splnených a schválených úlohách.'}
            {state === 'off' && 'Dostávaj upozornenia, keď sa v rodine niečo udeje.'}
            {state === 'denied' && 'Notifikácie sú zakázané v nastaveniach telefónu (Nastavenia → Stullers Home → Hlásenia).'}
            {state === 'needs-install' && 'Na iPhone najprv pridaj aplikáciu na plochu: Zdieľať → Pridať na plochu. Potom ju otvor z ikony a zapni notifikácie tu.'}
          </span>
        </div>
      </div>
      {(state === 'on' || state === 'off') && (
        <button className={state === 'on' ? 'btn-secondary' : 'btn-primary'} onClick={toggle} disabled={busy}>
          {busy ? 'Chvíľku…' : state === 'on' ? 'Vypnúť notifikácie' : 'Zapnúť notifikácie'}
        </button>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  )
}
