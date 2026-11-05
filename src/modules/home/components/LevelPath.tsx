import { useLayoutEffect, useRef, useState } from 'react'
import { play } from '../lib/sound'
import { MILESTONES, levelFor } from '../lib/gamification'

const WINDOW = 9 // levels shown at once
const STEP = 5 // levels moved by one arrow tap

// Duolingo-style winding path of levels: a dashed trail between the stops, done ones behind,
// the current one glowing, the rest locked. Arrows page through earlier and later levels.
export function LevelPath({ xp }: { xp: number }) {
  const { level, to, progress } = levelFor(xp)
  const home = Math.max(1, level - 2)
  const [first, setFirst] = useState(home)
  const levels = Array.from({ length: WINDOW }, (_, i) => first + i)
  const move = (to: number) => { play('tap'); setFirst(Math.max(1, to)) }

  // The trail is drawn through the real node centres after layout, so it fits any screen width.
  const box = useRef<HTMLElement>(null)
  const [trail, setTrail] = useState<{ d: string; done: string; w: number; h: number } | null>(null)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const draw = () => {
      const base = el.getBoundingClientRect()
      const pts = [...el.querySelectorAll('.path-node')].map((n) => {
        const r = n.getBoundingClientRect()
        return [r.left + r.width / 2 - base.left, r.top + r.height / 2 - base.top]
      })
      if (pts.length < 2) return
      const curve = (list: number[][]) => list.reduce((d, [x, y], i) => {
        if (i === 0) return `M${x},${y}`
        const [px, py] = list[i - 1]
        const my = (py + y) / 2
        return `${d} C${px},${my} ${x},${my} ${x},${y}`
      }, '')
      // Highlight the trail up to the current level (all of it when looking at levels already passed).
      const reached = level >= first + WINDOW ? pts.length : level - first + 1
      setTrail({ d: curve(pts), done: reached > 1 ? curve(pts.slice(0, reached)) : '', w: base.width, h: base.height })
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(el)
    return () => ro.disconnect()
  }, [level, first])

  return (
    <section className="path" aria-label="Cesta levelov" ref={box}>
      <div className="path-nav">
        <button className="path-arrow" onClick={() => move(first - STEP)} disabled={first === 1} aria-label="Nižšie levely">▲</button>
        {first !== home && <button className="path-home" onClick={() => move(home)}>Môj level</button>}
      </div>
      {trail && (
        <svg className="path-trail" width={trail.w} height={trail.h} aria-hidden="true">
          <path d={trail.d} className="trail-road" />
          <path d={trail.d} className="trail-dash" />
          {trail.done && <path d={trail.done} className="trail-done" />}
        </svg>
      )}
      {levels.map((n, i) => {
        const state = n < level ? 'done' : n === level ? 'current' : 'locked'
        const reward = MILESTONES[n]
        const offset = Math.round(Math.sin(i * 0.95) * 80) // px left/right, so the path winds
        return (
          <div key={n} className={`path-step ${state}`} style={{ left: `${offset}px`, animationDelay: `${i * 0.06}s` }}>
            {state === 'current' && <span className="path-here">Tu si · {xp}/{to} XP</span>}
            <div className={reward ? 'path-node milestone' : 'path-node'}
              style={state === 'current' ? { ['--p' as string]: `${Math.round(progress * 100)}%` } : undefined}>
              <span aria-hidden="true">{reward ? (state === 'done' ? '🏆' : '🎁') : state === 'done' ? '✓' : state === 'current' ? '★' : '🔒'}</span>
            </div>
            <span className="path-label">Level {n}{reward ? ` · ${reward}` : ''}</span>
          </div>
        )
      })}
      <button className="path-arrow" onClick={() => move(first + STEP)} aria-label="Vyššie levely">▼</button>
    </section>
  )
}
