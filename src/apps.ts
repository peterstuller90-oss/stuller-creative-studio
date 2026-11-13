export type Audience = 'parent' | 'child' | 'other'

export interface HubApp {
  id: string
  name: string
  description: string
  /** Built into the hub (opens at #/<id>). */
  module?: boolean
  /** Existing standalone app copied into public/apps/<id>/, shown inside the hub until it is rebuilt as a module. */
  frame?: string
  /** Opens without logging in (#/<id> and a button on the login screen). */
  public?: boolean
  /** Who sees the tile. */
  audience: Audience[]
}

export const APPS: HubApp[] = [
  { id: 'home', name: 'Stullers Home', description: 'Rodinné úlohy, body a levely', module: true, audience: ['parent', 'child'] },
  { id: 'ponuky', name: 'Ponuky', description: 'Cenové ponuky a zmluvy', module: true, audience: ['parent'] },
  { id: 'stullers-studio', name: 'Stullers Studio', description: 'Grafika pre Štullers (pripravujeme)', audience: ['parent'] },
  { id: 'handrbolka', name: 'Handrbolka Studio', description: 'Posty, plagáty a intro videá', frame: 'apps/handrbolka/', audience: ['parent', 'other'] },
  { id: 'atelier', name: 'Atelier Studio', description: 'Grafika pre Atelier Handrbolka', frame: 'apps/atelier/', audience: ['parent', 'other'] },
  { id: 'social', name: 'Stullers Social', description: 'Stories, carousel a mockupy z ilustrácie', frame: 'apps/social/', audience: ['parent'] },
  { id: 'ucitel', name: 'Slovina', description: 'Diktáty zo slovenčiny pre Ota: levely, kalendár, týždenná výzva (bez prihlásenia)', frame: 'apps/ucitel/', public: true, audience: ['parent', 'child', 'other'] },
  { id: 'hudy', name: 'Hudy Packaging', description: 'Generátor obalov', frame: 'apps/hudy/', audience: ['parent'] },
]
