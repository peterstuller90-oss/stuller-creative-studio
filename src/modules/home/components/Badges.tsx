import { BADGES, type PlayerStats } from '../lib/gamification'

export function Badges({ stats }: { stats: PlayerStats }) {
  const earned = BADGES.filter((b) => b.earned(stats)).length
  return (
    <>
      <h3 className="section-title">Odznaky <span className="muted">{earned} / {BADGES.length}</span></h3>
      <ul className="badge-grid">
        {BADGES.map((b) => {
          const on = b.earned(stats)
          return (
            <li key={b.id} className={on ? 'badge-tile on' : 'badge-tile'}>
              <span className="badge-emoji" aria-hidden="true">{on ? b.emoji : '🔒'}</span>
              <strong>{b.name}</strong>
              <small>{b.hint}</small>
            </li>
          )
        })}
      </ul>
    </>
  )
}
