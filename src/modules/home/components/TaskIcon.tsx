// Illustrated icon for each of the 26 tasks, keyed by task code (supabase/tasks.sql).
const files = import.meta.glob<string>('../assets/task-icons/*.webp', { eager: true, query: '?inline', import: 'default' })
const ICONS = new Map(Object.entries(files).map(([path, url]) => [Number(path.match(/(\d+)\.webp$/)![1]), url]))

export function TaskIcon({ code, size = 52 }: { code: number | null | undefined; size?: number }) {
  const url = code != null ? ICONS.get(code) : undefined
  if (!url) return null
  return <img className="task-icon" src={url} width={size} height={size} alt="" />
}
