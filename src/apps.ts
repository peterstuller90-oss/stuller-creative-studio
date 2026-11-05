export type Audience = 'parent' | 'child' | 'other'

export interface HubApp {
  id: string
  name: string
  description: string
  emoji: string
  color: string
  /** Built into the hub (opens at #/<id>). */
  module?: boolean
  /** Not moved into the hub yet: opens the current standalone app. */
  url?: string
  /** Who sees the tile. */
  audience: Audience[]
}

export const APPS: HubApp[] = [
  { id: 'home', name: 'Stullers Home', description: 'Rodinné úlohy, body a levely', emoji: '🏡', color: '#acffd3', module: true, audience: ['parent', 'child'] },
  { id: 'ponuky', name: 'Ponuky', description: 'Cenové ponuky a zmluvy', emoji: '🧾', color: '#ffe1a8', module: true, audience: ['parent'] },
  { id: 'stullers-studio', name: 'Stullers Studio', description: 'Grafika pre Štullers (pripravujeme)', emoji: '🎨', color: '#ffd3ee', audience: ['parent'] },
  { id: 'handrbolka', name: 'Handrbolka Studio', description: 'Posty, plagáty a intro videá', emoji: '🌲', color: '#c8f0b4', url: 'https://peterstuller90-oss.github.io/stullers-handrbolka/', audience: ['parent', 'other'] },
  { id: 'atelier', name: 'Atelier Studio', description: 'Grafika pre Atelier Handrbolka', emoji: '🖌️', color: '#a1f3ff', url: 'https://peterstuller90-oss.github.io/atelier-handrbolka/', audience: ['parent', 'other'] },
  { id: 'social', name: 'Stullers Social', description: 'Stories, carousel a mockupy z ilustrácie', emoji: '📱', color: '#f3d3d4', url: 'https://peterstuller90-oss.github.io/stullers-social-media/', audience: ['parent'] },
  { id: 'ucitel', name: 'Učiteľ', description: 'Učenie pre deti (pripravujeme)', emoji: '📚', color: '#fff3b0', audience: ['parent', 'child'] },
  { id: 'hudy', name: 'Hudy Packaging', description: 'Generátor obalov (pripravujeme)', emoji: '📦', color: '#e0d4ff', audience: ['parent'] },
]
