import { slug } from './calc'
import type { PriceItem, Settings } from './types'

// The brief the client fills in. Shared by the PDF generator and the importer, so field ids stay in sync.

export type FieldKind = 'text' | 'multiline' | 'check' | 'dropdown' | 'radio'
export interface FieldDef {
  id: string
  label: string
  kind: FieldKind
  /** Fraction of the row width: 1, 0.5, 0.25… */
  w?: number
  h?: number
  options?: { value: string; label: string }[]
}
export interface SectionDef { title: string; hint?: string; fields: FieldDef[]; newPage?: boolean }

export const BRIEF_MARK = 'stullers-zadanie-v1'

export function briefSections(s: Settings, prices: PriceItem[]): SectionDef[] {
  const active = prices.filter((p) => p.active)
  const products = active.filter((p) => p.category === 'aplikacia')
  const workshops = active.filter((p) => p.category === 'workshop')
  return [
    {
      title: 'O vás',
      fields: [
        { id: 'k_meno', label: 'Meno a priezvisko', kind: 'text', w: 0.5 },
        { id: 'k_org', label: 'Organizácia / firma', kind: 'text', w: 0.5 },
        { id: 'k_typ', label: 'Typ organizácie', kind: 'dropdown', w: 0.5, options: s.orgTypes.map((o) => ({ value: o.label, label: o.label })) },
        { id: 'k_ico', label: 'IČO (ak máte)', kind: 'text', w: 0.5 },
        { id: 'k_adresa', label: 'Adresa / sídlo', kind: 'text', w: 1 },
        { id: 'k_email', label: 'E-mail', kind: 'text', w: 0.5 },
        { id: 'k_telefon', label: 'Telefón', kind: 'text', w: 0.5 },
      ],
    },
    {
      title: 'Projekt',
      hint: 'Napíšte nám čo najviac: čo si predstavujete, pre koho to je, aký príbeh alebo náladu má dielo mať.',
      fields: [
        { id: 'p_nazov', label: 'Názov projektu', kind: 'text', w: 1 },
        { id: 'p_popis', label: 'Popis projektu', kind: 'multiline', w: 1, h: 150 },
        { id: 'p_miesto', label: 'Miesto realizácie (mesto, adresa)', kind: 'text', w: 0.5 },
        { id: 'p_termin', label: 'Želaný termín', kind: 'text', w: 0.5 },
        { id: 'p_rozpocet', label: 'Predstava o rozpočte (nepovinné)', kind: 'text', w: 0.5 },
      ],
    },
    {
      title: 'Mural / maľba na stenu',
      newPage: true,
      fields: [
        { id: 's_mural', label: 'Chcem mural', kind: 'check', w: 1 },
        { id: 'm_motiv', label: 'Motív', kind: 'radio', w: 1, options: [{ value: 'volny', label: 'Voľný (váš autorský motív)' }, { value: 'tematicky', label: 'Tematický (podľa nášho zadania)' }] },
        { id: 'm_sirka', label: 'Šírka (m)', kind: 'text', w: 0.25 },
        { id: 'm_vyska', label: 'Výška (m)', kind: 'text', w: 0.25 },
        { id: 'm_povrch', label: 'Povrch (fasáda, interiér, plot…)', kind: 'text', w: 0.5 },
        { id: 'm_plosina', label: 'Stena je vyššia ako 3 m (treba plošinu alebo lešenie)', kind: 'check', w: 1 },
      ],
    },
    {
      title: 'Ilustrácia a logo',
      fields: [
        { id: 's_ilustracia', label: 'Chcem ilustráciu', kind: 'check', w: 0.5 },
        { id: 'i_pocet', label: 'Počet ilustrácií', kind: 'text', w: 0.25 },
        { id: 'i_typ', label: 'Ilustrácia', kind: 'radio', w: 1, options: [{ value: 'volna', label: 'Voľná (váš autorský štýl a motív)' }, { value: 'tematicka', label: 'Tematická (podľa nášho zadania)' }] },
        { id: 's_logo', label: 'Chcem logo / logotyp', kind: 'check', w: 1 },
      ],
    },
    {
      title: 'Kde ilustráciu alebo logo použijete?',
      fields: products.map((p) => ({ id: `a_${slug(p.name)}`, label: p.name, kind: 'check' as const, w: 1 / 3 })),
    },
    {
      title: 'Workshop',
      fields: [
        { id: 's_workshop', label: 'Chcem workshop', kind: 'check', w: 0.5 },
        { id: 'w_typ', label: 'Typ workshopu', kind: 'dropdown', w: 0.5, options: workshops.map((w) => ({ value: w.name, label: w.name })) },
        { id: 'w_pocet', label: 'Počet účastníkov', kind: 'text', w: 0.25 },
        { id: 'w_vek', label: 'Vek účastníkov', kind: 'text', w: 0.25 },
      ],
    },
    {
      title: 'Ešte niečo?',
      fields: [{ id: 'poznamka', label: 'Poznámky, inšpirácie, odkazy', kind: 'multiline', w: 1, h: 90 }],
    },
  ]
}

export type BriefValues = Record<string, string | boolean>
