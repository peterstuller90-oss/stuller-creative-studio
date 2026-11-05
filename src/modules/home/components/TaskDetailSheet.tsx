import { TaskIcon } from './TaskIcon'
import { Sheet } from './Sheet'
import { STATUS_LABEL, type TaskItemData } from './TaskItem'

interface Props {
  task: TaskItemData
  assignees: string[]
  canReassign: boolean
  busy: boolean
  error: string
  onDone: () => void
  onReassign: () => void
  onClose: () => void
}

export function TaskDetailSheet({ task, assignees, canReassign, busy, error, onDone, onReassign, onClose }: Props) {
  const canSubmit = task.status === 'available' || task.status === 'rejected'
  return (
    <Sheet onClose={onClose}>
      <TaskIcon code={task.code} size={112} />
      <p className="detail-xp">+{task.xp} XP</p>
      <h3>{task.name}</h3>
      <span className={`status status-${task.status}`}>{STATUS_LABEL[task.status]}</span>
      <dl className="detail-list">
        <dt>Pridelené</dt>
        <dd>{new Date(task.assignedAt).toLocaleDateString('sk-SK')}</dd>
        {assignees.length > 1 && (<><dt>Robia</dt><dd>{assignees.join(', ')}</dd></>)}
      </dl>
      {error && <p className="error">{error}</p>}
      {canSubmit && (
        <button className="btn-primary btn-done" disabled={busy} onClick={onDone}>
          {busy ? 'Odosielam…' : '✓ Hotovo, poslať na schválenie'}
        </button>
      )}
      {canReassign && <button className="btn-secondary btn-plain" onClick={onReassign}>⇄ Preradiť inému</button>}
      <button className="link-btn" onClick={onClose}>Zavrieť</button>
    </Sheet>
  )
}
