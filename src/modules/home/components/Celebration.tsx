import { useEffect, useMemo } from 'react'
import { play } from '../lib/sound'
import type { Badge } from '../lib/gamification'

export type CelebrationEvent =
  | { kind: 'xp'; gained: number }
  | { kind: 'level'; level: number }
  | { kind: 'badge'; badge: Badge }

const CONFETTI_COLORS = ['#f66c85', '#a1f3ff', '#ffd3ee', '#acffd3', '#ffd166', '#5b4b7a']

// Full-screen Duolingo-style moment: big bouncing headline, confetti, one button to continue.
export function Celebration({ event, onDone }: { event: CelebrationEvent; onDone: () => void }) {
  const confetti = useMemo(() => Array.from({ length: 36 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    duration: 1.8 + Math.random() * 1.4,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    rotate: Math.random() * 360,
  })), [event])

  useEffect(() => play(event.kind), [event])

  const [emoji, title, text] =
    event.kind === 'xp' ? ['⚡', `+${event.gained} XP`, 'Rodič schválil tvoju úlohu. Super práca!']
    : event.kind === 'level' ? ['🚀', `Level ${event.level}!`, 'Postúpil si na ďalší level.']
    : [event.badge.emoji, event.badge.name, `Nový odznak! ${event.badge.hint}.`]

  return (
    <div className={`celebrate celebrate-${event.kind}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="confetti" aria-hidden="true">
        {confetti.map((c, i) => (
          <i key={i} style={{ left: `${c.left}%`, background: c.color, animationDelay: `${c.delay}s`,
            animationDuration: `${c.duration}s`, transform: `rotate(${c.rotate}deg)` }} />
        ))}
      </div>
      <div className="celebrate-body">
        <div className="celebrate-emoji">{emoji}</div>
        <h2 className="celebrate-title">{title}</h2>
        <p>{text}</p>
      </div>
      <button className="btn-primary celebrate-btn" onClick={onDone} autoFocus>Pokračovať</button>
    </div>
  )
}
