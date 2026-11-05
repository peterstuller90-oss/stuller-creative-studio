import { Avatar } from './Avatar'
import type { ProfileStats } from '../lib/data'

// Weekly XP ranking; the top three stand on a podium.
export function Leaderboard({ profiles, weekly, currentId }: { profiles: ProfileStats[]; weekly: Map<string, number>; currentId: string }) {
  const ranked = profiles.map((p) => ({ ...p, week: weekly.get(p.id) ?? 0 })).sort((a, b) => b.week - a.week)
  const podium = [ranked[1], ranked[0], ranked[2]].filter(Boolean)
  const place = (id: string) => ranked.findIndex((r) => r.id === id) + 1
  return (
    <section className="card leaderboard">
      <h3>Rebríček týždňa</h3>
      <p className="muted">Body od pondelka</p>
      <div className="podium">
        {podium.map((p) => (
          <div key={p.id} className={`podium-spot place-${place(p.id)}${p.id === currentId ? ' me' : ''}`}>
            {place(p.id) === 1 && <span className="crown" aria-hidden="true">👑</span>}
            <Avatar name={p.name} url={p.avatarUrl} size={place(p.id) === 1 ? 64 : 52} />
            <strong>{p.name}</strong>
            <span className="podium-xp">{p.week} XP</span>
            <div className="podium-block">{place(p.id)}</div>
          </div>
        ))}
      </div>
      {ranked.slice(3).map((p) => (
        <div key={p.id} className={p.id === currentId ? 'rank-row me' : 'rank-row'}>
          <span className="rank-num">{place(p.id)}.</span>
          <Avatar name={p.name} url={p.avatarUrl} size={36} />
          <strong>{p.name}</strong>
          <span className="podium-xp">{p.week} XP</span>
        </div>
      ))}
    </section>
  )
}
