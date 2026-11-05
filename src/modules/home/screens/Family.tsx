import { Avatar } from '../components/Avatar'
import type { ProfileStats } from '../lib/data'
import { FAMILY } from '../lib/family'
import { Leaderboard } from '../components/Leaderboard'
import { levelFor } from '../lib/gamification'

interface Props {
  profiles: ProfileStats[]
  currentId: string
  weekly: Map<string, number>
}

export function Family({ profiles, currentId, weekly }: Props) {
  return (
    <>
      <h1 className="page-title">Rodina</h1>
      <Leaderboard profiles={profiles} weekly={weekly} currentId={currentId} />
      <section className="family-grid">
        {profiles.map((m) => (
          <div key={m.id} className={m.id === currentId ? 'card member me' : 'card member'}>
            <Avatar name={m.name} url={m.avatarUrl} size={64} />
            <h3>{m.name}</h3>
            <span className="muted">{FAMILY.find((f) => f.name === m.name)?.label ?? ' '}</span>
            <span className={`role role-${m.role}`}>{m.role === 'parent' ? 'Rodič' : 'Dieťa'}</span>
            <div className="member-stats">
              <span>Level <strong>{levelFor(m.xp).level}</strong></span>
              <span><strong>{m.xp}</strong> XP</span>
              <span><strong>{m.completedCount}</strong> úloh</span>
            </div>
          </div>
        ))}
      </section>
    </>
  )
}
