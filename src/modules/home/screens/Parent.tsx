import { play } from '../lib/sound'
import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Avatar } from '../components/Avatar'
import { AssignSheet } from '../components/AssignSheet'
import { TaskIcon } from '../components/TaskIcon'
import { CustomTaskSheet } from '../components/CustomTaskSheet'
import type { Approval, ProfileStats, TaskDef } from '../lib/data'
import type { CurrentUser } from '../lib/user'

interface Props {
  user: CurrentUser
  profiles: ProfileStats[]
  tasks: TaskDef[]
  approvals: Approval[]
  assigneesByTask: Map<string, string[]>
  supabase: SupabaseClient
  onChanged: () => void
}

export function Parent({ user, profiles, tasks, approvals, assigneesByTask, supabase, onChanged }: Props) {
  const [view, setView] = useState<'approvals' | 'assign'>('approvals')
  const [assigning, setAssigning] = useState<TaskDef | null>(null)
  const [busyId, setBusyId] = useState('')
  const [customOpen, setCustomOpen] = useState(false)
  const [error, setError] = useState('')
  const member = (id: string) => profiles.find((p) => p.id === id)

  async function review(a: Approval, approve: boolean) {
    setBusyId(a.id)
    setError('')
    const { error } = await supabase.rpc('review_assignment', { p_assignment: a.id, p_approve: approve })
    setBusyId('')
    if (error) setError(error.message)
    else {
      play(approve ? 'correct' : 'undo')
      onChanged()
    }
  }

  return (
    <>
      <h1 className="page-title">Rodič</h1>
      <div className="segmented">
        <button className={view === 'approvals' ? 'on' : ''} onClick={() => setView('approvals')}>
          Schválenia{approvals.length > 0 && ` (${approvals.length})`}
        </button>
        <button className={view === 'assign' ? 'on' : ''} onClick={() => setView('assign')}>Prideliť úlohy</button>
      </div>
      {error && <p className="error">{error}</p>}

      {view === 'approvals' && (approvals.length === 0 ? (
        <div className="card empty">
          <div className="empty-emoji">🎉</div>
          <p>Nič nečaká na schválenie.</p>
        </div>
      ) : (
        <ul className="approval-list">
          {approvals.map((a) => {
            const m = member(a.userId)
            const own = a.userId === user.id
            return (
              <li key={a.id} className="card approval">
                <div className="approval-head">
                  <Avatar name={m?.name ?? '?'} url={m?.avatarUrl} size={48} />
                  <div className="task-main">
                    <strong>{m?.name}</strong>
                    <span>{a.name}</span>
                  </div>
                  <span className="xp-pill">+{a.xp} XP</span>
                </div>
                {own ? (
                  <p className="muted">Vlastnú úlohu schváli druhý rodič.</p>
                ) : (
                  <div className="approval-actions">
                    <button className="btn-secondary btn-reject" disabled={busyId === a.id} onClick={() => review(a, false)}>✕ Zamietnuť</button>
                    <button className="btn-primary btn-done" disabled={busyId === a.id} onClick={() => review(a, true)}>✓ Schváliť</button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      ))}

      {view === 'assign' && (
        <button className="btn-primary custom-task-btn" onClick={() => setCustomOpen(true)}>＋ Vlastná úloha</button>
      )}

      {view === 'assign' && (
        <ul className="card task-list">
          {tasks.map((t) => {
            const who = (assigneesByTask.get(t.id) ?? []).map((id) => member(id)?.name).filter(Boolean)
            return (
              <li key={t.id}>
                <button className="task" onClick={() => setAssigning(t)}>
                  <TaskIcon code={t.code} />
                  <div className="task-main">
                    <span className="task-name">{t.name}</span>
                    <span className="status status-available">{who.length ? who.join(', ') : 'Nepridelené'}</span>
                  </div>
                  <span className="xp-pill">+{t.xp} XP</span>
                  <span className="chevron" aria-hidden="true">›</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {customOpen && (
        <CustomTaskSheet members={profiles} supabase={supabase}
          onClose={(changed) => { setCustomOpen(false); if (changed) onChanged() }} />
      )}

      {assigning && (
        <AssignSheet
          task={assigning}
          members={profiles}
          alreadyAssigned={assigneesByTask.get(assigning.id) ?? []}
          supabase={supabase}
          onClose={(changed) => { setAssigning(null); if (changed) onChanged() }}
        />
      )}
    </>
  )
}
