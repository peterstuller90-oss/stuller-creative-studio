import { Avatar } from '../components/Avatar'
import { Logo } from '../components/Logo'
import { LevelBar } from '../components/LevelBar'
import { StreakChip } from '../components/StreakChip'
import { LevelPath } from '../components/LevelPath'
import type { Tab } from '../components/TabBar'
import type { TaskItemData } from '../components/TaskItem'
import type { CurrentUser } from '../lib/user'

interface Props {
  user: CurrentUser
  tasks: TaskItemData[]
  streak: number
  onNavigate: (t: Tab) => void
}

export function Home({ user, tasks, streak, onNavigate }: Props) {
  const count = (s: TaskItemData['status']) => tasks.filter((t) => t.status === s).length
  return (
    <>
      <Logo width={170} />
      <section className="card hero-compact">
        <div className="hero-row">
          <Avatar name={user.name} url={user.avatarUrl} size={56} />
          <div className="hero-who">
            <h2>{user.name}</h2>
            <StreakChip days={streak} />
          </div>
          <span className="hero-xp">{user.xp} XP</span>
        </div>
        <LevelBar xp={user.xp} />
      </section>

      <h3 className="section-title">Prehľad úloh</h3>
      <section className="stats">
        <button className="card stat" onClick={() => onNavigate('tasks')}>
          <strong>{count('available')}</strong><span>Na splnenie</span>
        </button>
        <button className="card stat" onClick={() => onNavigate('tasks')}>
          <strong>{count('waiting_for_approval')}</strong><span>Čaká na schválenie</span>
        </button>
        <button className="card stat" onClick={() => onNavigate('tasks')}>
          <strong>{count('completed')}</strong><span>Splnené</span>
        </button>
      </section>

      <h3 className="section-title">Moja cesta</h3>
      <LevelPath xp={user.xp} />
    </>
  )
}
