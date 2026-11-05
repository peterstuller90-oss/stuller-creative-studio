import { TaskIcon } from './TaskIcon'

export type TaskStatus = 'available' | 'waiting_for_approval' | 'completed' | 'rejected'

export const STATUS_LABEL: Record<TaskStatus, string> = {
  available: 'Na splnenie',
  waiting_for_approval: 'Čaká na schválenie',
  completed: 'Splnené',
  rejected: 'Zamietnuté',
}

export interface TaskItemData {
  id: string
  taskId: string
  code: number | null
  name: string
  xp: number
  status: TaskStatus
  assignedAt: string
}

export function TaskItem({ task, onOpen }: { task: TaskItemData; onOpen: () => void }) {
  return (
    <li>
      <button className="task" onClick={onOpen}>
        <TaskIcon code={task.code} />
        <div className="task-main">
          <span className="task-name">{task.name}</span>
          <span className={`status status-${task.status}`}>{STATUS_LABEL[task.status]}</span>
        </div>
        <span className="xp-pill">+{task.xp} XP</span>
        <span className="chevron" aria-hidden="true">›</span>
      </button>
    </li>
  )
}
