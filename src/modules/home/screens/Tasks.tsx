import { play } from '../lib/sound'
import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { TaskItem, type TaskItemData } from '../components/TaskItem'
import { TaskDetailSheet } from '../components/TaskDetailSheet'
import { ReassignSheet } from '../components/ReassignSheet'
import type { ProfileStats } from '../lib/data'
import type { CurrentUser } from '../lib/user'

interface Props {
  tasks: TaskItemData[]
  assigneesByTask: Map<string, string[]>
  user: CurrentUser
  profiles: ProfileStats[]
  supabase: SupabaseClient
  onChanged: () => void
}

// Mirrors the server rule in reassign_assignment(); the server is what actually enforces it.
function canReassign(task: TaskItemData, user: CurrentUser) {
  if (user.role === 'parent') return task.status !== 'completed'
  return task.status === 'available' || task.status === 'rejected'
}

export function Tasks({ tasks, assigneesByTask, user, profiles, supabase, onChanged }: Props) {
  const [open, setOpen] = useState<TaskItemData | null>(null)
  const [moving, setMoving] = useState<TaskItemData | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.name ?? ''

  function close() {
    setOpen(null)
    setError('')
  }

  async function submit(task: TaskItemData) {
    setBusy(true)
    const { error } = await supabase.rpc('submit_assignment', { p_assignment: task.id })
    setBusy(false)
    if (error) return setError(error.message)
    play('send')
    close()
    onChanged()
  }

  return (
    <>
      <h1 className="page-title">Moje úlohy</h1>
      {tasks.length === 0 ? (
        <div className="card empty">
          <div className="empty-emoji">🧹</div>
          <p>Zatiaľ nemáš priradené žiadne úlohy.</p>
        </div>
      ) : (
        <ul className="card task-list">
          {tasks.map((t) => <TaskItem key={t.id} task={t} onOpen={() => setOpen(t)} />)}
        </ul>
      )}
      {open && (
        <TaskDetailSheet
          task={open}
          assignees={(assigneesByTask.get(open.taskId) ?? []).map(nameOf)}
          canReassign={canReassign(open, user)}
          busy={busy}
          error={error}
          onDone={() => submit(open)}
          onReassign={() => { setMoving(open); close() }}
          onClose={close}
        />
      )}
      {moving && (
        <ReassignSheet
          task={moving}
          members={profiles.filter((p) => p.id !== user.id)}
          supabase={supabase}
          onClose={(changed) => { setMoving(null); if (changed) onChanged() }}
        />
      )}
    </>
  )
}
