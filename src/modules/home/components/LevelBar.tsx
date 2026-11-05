import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { levelFor } from '../lib/gamification'

export function LevelBar({ xp }: { xp: number }) {
  const { level, to, progress } = levelFor(xp)
  // Starts empty and fills on mount, so the bar visibly grows.
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(Math.max(4, progress * 100)))
    return () => cancelAnimationFrame(id)
  }, [progress])
  return (
    <div className="level">
      <div className="level-row">
        <span className="level-label"><Icon name="star" size={16} /> Level {level}</span>
        <span className="muted">{xp} / {to} XP</span>
      </div>
      <div className="progress"><div className="progress-fill" style={{ width: `${width}%` }} /></div>
    </div>
  )
}
