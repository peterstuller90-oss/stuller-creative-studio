import { play } from '../lib/sound'
import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Avatar } from './Avatar'
import { Sheet } from './Sheet'
import type { ProfileStats, TaskDef } from '../lib/data'

interface Props {
  task: TaskDef
  members: ProfileStats[]
  alreadyAssigned: string[]
  supabase: SupabaseClient
  onClose: (changed: boolean) => void
}

export function AssignSheet({ task, members, alreadyAssigned, supabase, onClose }: Props) {
  const [picked, setPicked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  async function save() {
    setBusy(true)
    const { error } = await supabase.rpc('assign_task', { p_task: task.id, p_users: picked })
    setBusy(false)
    if (error) setError(error.message)
    else {
      play('send')
      onClose(true)
    }
  }

  return (
    <Sheet onClose={() => onClose(false)}>
      <p className="detail-xp">+{task.xp} XP</p>
      <h3>{task.name}</h3>
      <p className="muted">Komu prideliť?</p>
      <div className="sheet-members four">
        {members.map((m) => {
          const has = alreadyAssigned.includes(m.id)
          const on = picked.includes(m.id)
          return (
            <button key={m.id} className={on ? 'sheet-member picked' : 'sheet-member'} disabled={has || busy} onClick={() => toggle(m.id)}>
              <Avatar name={m.name} url={m.avatarUrl} size={52} />
              <span>{m.name}</span>
              {has && <small className="muted">už má</small>}
            </button>
          )
        })}
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn-primary" disabled={!picked.length || busy} onClick={save}>
        {busy ? 'Prideľujem…' : 'Prideliť'}
      </button>
      <button className="link-btn" onClick={() => onClose(false)}>Zrušiť</button>
    </Sheet>
  )
}
