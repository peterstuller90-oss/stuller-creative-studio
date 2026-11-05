import { useEffect, useState } from 'react'
import type { CelebrationEvent } from '../components/Celebration'
import { BADGES, levelFor, type Badge } from './gamification'

interface Seen {
  xp: number
  badges: string[]
}

// What this device last showed the user, so each gain is celebrated once.
const key = (userId: string) => `stullers-seen-${userId}`
function readSeen(userId: string): Seen {
  try {
    const raw = localStorage.getItem(key(userId))
    if (raw) return JSON.parse(raw) as Seen
  } catch { /* storage unavailable: celebrate from zero */ }
  return { xp: 0, badges: [] }
}
function writeSeen(userId: string, seen: Seen) {
  try { localStorage.setItem(key(userId), JSON.stringify(seen)) } catch { /* ignore */ }
}

// Compares fresh data with what was last seen and queues XP, level-up and badge moments.
export function useCelebrations(userId: string | undefined, now: { xp: number; badges: Badge[] } | null) {
  const [queue, setQueue] = useState<CelebrationEvent[]>([])
  const xp = now?.xp
  const badgeIds = now?.badges.map((b) => b.id).join(',')

  // A different person logged in: drop anything queued for the previous one.
  useEffect(() => setQueue([]), [userId])

  useEffect(() => {
    if (!userId || xp === undefined || badgeIds === undefined) return
    const seen = readSeen(userId)
    const ids = badgeIds ? badgeIds.split(',') : []
    const events: CelebrationEvent[] = []
    if (xp > seen.xp) events.push({ kind: 'xp', gained: xp - seen.xp })
    const before = levelFor(seen.xp).level
    const after = levelFor(xp).level
    if (after > before) events.push({ kind: 'level', level: after })
    for (const id of ids) {
      if (!seen.badges.includes(id)) events.push({ kind: 'badge', badge: BADGES.find((b) => b.id === id)! })
    }
    writeSeen(userId, { xp, badges: ids })
    if (events.length) setQueue((q) => [...q, ...events])
  }, [userId, xp, badgeIds])

  return { current: queue[0], next: () => setQueue((q) => q.slice(1)) }
}
