import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Avatar } from './Avatar'
import { Sheet } from './Sheet'
import { play } from '../lib/sound'
import type { ProfileStats } from '../lib/data'

const XP_PRESETS = [2, 5, 10, 20]

// A parent writes a one-off task, sets its XP and picks who does it. The server checks the parent role again.
export function CustomTaskSheet({ members, supabase, onClose }: {
  members: ProfileStats[]
  supabase: SupabaseClient
  onClose: (changed: boolean) => void
}) {
  const [name, setName] = useState('')
  const [xp, setXp] = useState(5)
  const [picked, setPicked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const setClamped = (n: number) => setXp(Math.min(100, Math.max(1, Math.round(n) || 1)))
  const ready = name.trim().length >= 2 && picked.length > 0 && !busy

  async function save() {
    setBusy(true)
    setError('')
    const { error } = await supabase.rpc('create_custom_task', { p_name: name.trim(), p_xp: xp, p_users: picked })
    setBusy(false)
    if (error) return setError(error.message)
    play('send')
    onClose(true)
  }

  return (
    <Sheet onClose={() => onClose(false)}>
      <h3>Vlastná úloha</h3>
      <label className="field">
        <span>Čo treba urobiť?</span>
        <input value={name} maxLength={80} placeholder="napr. Umyť okná v obývačke" onChange={(e) => setName(e.target.value)} />
      </label>

      <div className="field">
        <span>Koľko XP?</span>
        <div className="xp-picker">
          <button className="xp-step" onClick={() => setClamped(xp - 1)} aria-label="Menej XP">−</button>
          <input className="xp-input" type="number" inputMode="numeric" min={1} max={100} value={xp}
            onChange={(e) => setClamped(Number(e.target.value))} aria-label="XP" />
          <button className="xp-step" onClick={() => setClamped(xp + 1)} aria-label="Viac XP">+</button>
        </div>
        <div className="xp-presets">
          {XP_PRESETS.map((n) => (
            <button key={n} className={n === xp ? 'xp-pill on' : 'xp-pill'} onClick={() => setXp(n)}>+{n} XP</button>
          ))}
        </div>
      </div>

      <p className="muted">Komu prideliť?</p>
      <div className="sheet-members four">
        {members.map((m) => (
          <button key={m.id} className={picked.includes(m.id) ? 'sheet-member picked' : 'sheet-member'} disabled={busy} onClick={() => toggle(m.id)}>
            <Avatar name={m.name} url={m.avatarUrl} size={52} />
            <span>{m.name}</span>
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn-primary" disabled={!ready} onClick={save}>{busy ? 'Ukladám…' : `Zadať úlohu · +${xp} XP`}</button>
      <button className="link-btn" onClick={() => onClose(false)}>Zrušiť</button>
    </Sheet>
  )
}
