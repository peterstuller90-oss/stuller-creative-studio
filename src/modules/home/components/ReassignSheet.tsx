import { play } from '../lib/sound'
import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Avatar } from './Avatar'
import { Sheet } from './Sheet'
import type { TaskItemData } from './TaskItem'
import type { ProfileStats } from '../lib/data'

interface Props {
  task: TaskItemData
  members: ProfileStats[]
  supabase: SupabaseClient
  onClose: (changed: boolean) => void
}

export function ReassignSheet({ task, members, supabase, onClose }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function pick(member: ProfileStats) {
    setBusy(true)
    setError('')
    const { error } = await supabase.rpc('reassign_assignment', { p_assignment: task.id, p_new_user: member.id })
    setBusy(false)
    if (error) setError(error.message)
    else {
      play('send')
      onClose(true)
    }
  }

  return (
    <Sheet onClose={() => onClose(false)}>
        <h3>Preradiť úlohu</h3>
        <p className="muted">{task.name}</p>
        <div className="sheet-members">
          {members.map((m) => (
            <button key={m.id} className="sheet-member" disabled={busy} onClick={() => pick(m)}>
              <Avatar name={m.name} url={m.avatarUrl} size={56} />
              <span>{m.name}</span>
            </button>
          ))}
        </div>
        {error && <p className="error">{error}</p>}
        <button className="link-btn" onClick={() => onClose(false)}>Zrušiť</button>
    </Sheet>
  )
}
