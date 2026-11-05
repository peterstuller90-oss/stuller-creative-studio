export type Role = 'parent' | 'child'

export interface Member {
  name: string
  label: string
  role: Role
  color: string
  email: string
}

// Each card is a real Supabase Auth account; the PIN is its password.
// The emails only identify accounts and never receive mail.
// Static list until the database data model arrives in a later phase.
export const FAMILY: Member[] = [
  { name: 'Viki', label: 'Mama', role: 'parent', color: '#f66c85', email: 'viki@stullers.home' },
  { name: 'Peto', label: 'Tato', role: 'parent', color: '#5b4b7a', email: 'peto@stullers.home' },
  { name: 'Oto', label: 'Syn', role: 'child', color: '#00b2bb', email: 'oto@stullers.home' },
  { name: 'Dita', label: 'Dcéra', role: 'child', color: '#e86fb0', email: 'dita@stullers.home' },
]

export function memberColor(name: string): string {
  return FAMILY.find((m) => m.name === name)?.color ?? '#f66c85'
}
