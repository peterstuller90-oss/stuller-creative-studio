// Levels, streak, badges and the weekly leaderboard.
// All numbers and badges live here so they can be tuned in one place.
// Everything is derived from server data (approved tasks, XP), so nobody can award themselves anything.

// XP needed to reach each level: index 0 = Level 1, index 1 = Level 2, ...
// Past the end of the list every next level costs LEVEL_STEP_AFTER more XP.
export const LEVEL_XP = [0, 20, 45, 75, 110, 150, 200, 260, 330, 410]
export const LEVEL_STEP_AFTER = 100

// Milestones on the level path (Duolingo-style). Level -> reward text; Peter fills in real rewards.
export const MILESTONES: Record<number, string> = {
  5: 'Odmena: doplníme',
  10: 'Odmena: doplníme',
  15: 'Odmena: doplníme',
  20: 'Veľká odmena: doplníme',
}

export interface Completion {
  userId: string
  code: number | null
  at: string
}

export interface XpEntry {
  userId: string
  xp: number
  at: string
}

export interface LevelInfo {
  level: number
  from: number // XP where this level starts
  to: number // XP where the next level starts
  progress: number // 0..1 within this level
}

export function levelFor(xp: number): LevelInfo {
  let level = 1
  let from = 0
  let to = LEVEL_XP[1]
  while (xp >= to) {
    level++
    from = to
    to = level < LEVEL_XP.length ? LEVEL_XP[level] : from + LEVEL_STEP_AFTER
  }
  return { level, from, to, progress: (xp - from) / (to - from) }
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

// Days in a row with at least one approved task, ending today (or yesterday, so the streak
// does not look lost in the morning before anything is done).
export function streakFor(dates: string[], now = new Date()): number {
  const days = new Set(dates.map((d) => dayKey(new Date(d))))
  const day = new Date(now)
  if (!days.has(dayKey(day))) day.setDate(day.getDate() - 1)
  let n = 0
  while (days.has(dayKey(day))) {
    n++
    day.setDate(day.getDate() - 1)
  }
  return n
}

export interface PlayerStats {
  xp: number
  done: Completion[]
  streak: number
}

export interface Badge {
  id: string
  emoji: string
  name: string
  hint: string
  earned: (s: PlayerStats) => boolean
}

// Task codes refer to the numbered list in supabase/tasks.sql.
const countCodes = (s: PlayerStats, codes: number[]) => s.done.filter((c) => c.code !== null && codes.includes(c.code)).length

export const BADGES: Badge[] = [
  { id: 'first', emoji: '🌱', name: 'Prvá úloha', hint: 'Splň prvú úlohu', earned: (s) => s.done.length >= 1 },
  { id: 'ten', emoji: '💪', name: 'Desiatka', hint: 'Splň 10 úloh', earned: (s) => s.done.length >= 10 },
  { id: 'fifty', emoji: '🏆', name: 'Päťdesiatka', hint: 'Splň 50 úloh', earned: (s) => s.done.length >= 50 },
  { id: 'xp100', emoji: '⭐', name: '100 XP', hint: 'Nazbieraj 100 XP', earned: (s) => s.xp >= 100 },
  { id: 'xp500', emoji: '🌟', name: '500 XP', hint: 'Nazbieraj 500 XP', earned: (s) => s.xp >= 500 },
  { id: 'streak3', emoji: '🔥', name: '3 dni v rade', hint: 'Plň úlohy 3 dni po sebe', earned: (s) => s.streak >= 3 },
  { id: 'streak7', emoji: '☄️', name: 'Týždeň v rade', hint: 'Plň úlohy 7 dní po sebe', earned: (s) => s.streak >= 7 },
  { id: 'dishes', emoji: '🍽️', name: 'Kráľ umývačky', hint: '5× umývačka', earned: (s) => countCodes(s, [12, 13]) >= 5 },
  { id: 'trash', emoji: '♻️', name: 'Pán smetiak', hint: '10× smeti, papier, plasty alebo kompost', earned: (s) => countCodes(s, [15, 16, 17, 18, 19]) >= 10 },
  { id: 'floors', emoji: '🧽', name: 'Lesklá podlaha', hint: '10× umyť podlahu', earned: (s) => countCodes(s, [6, 7, 8, 9, 10]) >= 10 },
  { id: 'laundry', emoji: '👕', name: 'Práčka', hint: '5× pranie alebo vešanie', earned: (s) => countCodes(s, [21, 22, 23]) >= 5 },
  { id: 'elenka', emoji: '🐾', name: 'Elenkin kamoš', hint: '5× nakŕmiť Elenku', earned: (s) => countCodes(s, [20]) >= 5 },
  { id: 'grandma', emoji: '💐', name: 'Zlaté vnúča', hint: '3× pozrieť prababku', earned: (s) => countCodes(s, [26]) >= 3 },
]

export function statsFor(userId: string, xp: number, completions: Completion[], now = new Date()): PlayerStats {
  const done = completions.filter((c) => c.userId === userId)
  return { xp, done, streak: streakFor(done.map((c) => c.at), now) }
}

export const earnedBadges = (s: PlayerStats) => BADGES.filter((b) => b.earned(s))

// Monday 00:00 of the current week, local time.
export function weekStart(now = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

export function weeklyXp(log: XpEntry[], now = new Date()): Map<string, number> {
  const since = weekStart(now).getTime()
  const totals = new Map<string, number>()
  for (const e of log) if (new Date(e.at).getTime() >= since) totals.set(e.userId, (totals.get(e.userId) ?? 0) + e.xp)
  return totals
}
