export type Category = 'ilustracia' | 'logo' | 'mural' | 'aplikacia' | 'workshop' | 'doplnky' | 'ine'

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'ilustracia', label: 'Ilustrácia' },
  { id: 'logo', label: 'Logo / logotyp' },
  { id: 'mural', label: 'Mural' },
  { id: 'aplikacia', label: 'Aplikácia na produkty' },
  { id: 'workshop', label: 'Workshop' },
  { id: 'doplnky', label: 'Doplnky (materiál, doprava…)' },
  { id: 'ine', label: 'Iné' },
]

export const UNITS = ['paušál', 'ks', 'm²', 'hod', 'osoba', 'deň', 'km', 'noc'] as const

export interface PriceItem {
  id: string
  category: Category
  name: string
  unit: string
  price: number
  note: string
  sort: number
  active: boolean
  /** True while the price is Claude's guess and has not been confirmed by Peter. */
  placeholder: boolean
}

export interface Complexity { label: string; coef: number }

/** Price adjustment by who the client is (a school pays less than a company). */
export interface OrgType { label: string; pct: number }

export interface Company {
  name: string
  person: string
  address: string
  ico: string
  dic: string
  icdph: string
  iban: string
  email: string
  phone: string
  web: string
}

/** One of the authors who signs the contract (natural person, not a business). */
export interface Author { name: string; born: string; address: string }

/**
 * How author fees are taxed. 'priznanie': the author files a tax return (flat 60 % expenses,
 * health insurance and income tax from what is left). 'zrazka': the client withholds 19 % and that's it.
 */
export interface TaxSettings {
  mode: 'priznanie' | 'zrazka'
  expensePct: number
  healthPct: number
  taxPct: number
  withholdPct: number
  /** When true, price-list prices are what you want on hand and the client price is grossed up. */
  pricesAreNet: boolean
}

/** One choice in the license calculator, e.g. "Billboard / reklama" ×2. keywords: comma separated, used to read briefs. */
export interface LicenseUse { label: string; coef: number; keywords: string }
/** upTo: number of pieces, 0 = no limit. */
export interface LicenseQty { label: string; upTo: number; coef: number }
/** years: 0 = for the whole term of the author's economic rights. */
export interface LicenseTime { label: string; years: number; coef: number }
export interface LicenseArea { label: string; coef: number; keywords: string }

export interface LicenseSettings {
  /** License fee = basePct % of the price of the work × all coefficients. */
  basePct: number
  uses: LicenseUse[]
  quantity: LicenseQty[]
  duration: LicenseTime[]
  territory: LicenseArea[]
  exclusiveCoef: number
}

/** What the client wants to do with the work, saved on the quote. */
export interface LicenseInfo {
  uses: string[]
  /** Pieces produced, 0 = not stated. */
  pieces: number
  duration: string
  territory: string
  /** Price of the work the license is computed from; null = sum of the other lines. */
  base: number | null
}

export interface Settings {
  company: Company
  authors: Author[]
  tax: TaxSettings
  orgTypes: OrgType[]
  /** Kept for old data; authors are not VAT payers. */
  vatPayer: boolean
  vatRate: number
  validityDays: number
  depositPct: number
  numberPrefix: string
  complexity: Complexity[]
  intro: string
  terms: string
  contractTemplate: string
  license: LicenseSettings
  /** Ids of price items added to an existing price list by later versions (so they are added only once). */
  seeded?: string[]
}

export interface Client {
  id: string
  name: string
  company: string
  ico: string
  dic: string
  address: string
  email: string
  phone: string
}

export interface Line {
  id: string
  name: string
  description: string
  qty: number
  unit: string
  unitPrice: number
  /** Multiplier, e.g. mural complexity. 1 when unused. */
  coef: number
  coefLabel: string
  /** 'licencia' marks the line the license calculator keeps up to date. */
  kind?: 'licencia'
}

export type Status = 'koncept' | 'odoslana' | 'prijata' | 'zamietnuta'

export const STATUSES: { id: Status; label: string }[] = [
  { id: 'koncept', label: 'Koncept' },
  { id: 'odoslana', label: 'Poslaná' },
  { id: 'prijata', label: 'Podpísaná' },
  { id: 'zamietnuta', label: 'Zamietnutá' },
]

/** What the client wrote in the brief PDF, label → answer, shown to Peter as-is. */
export interface BriefAnswer { label: string; value: string }

export interface ContractInfo {
  place: string
  deadline: string
  exclusive: boolean
  territory: string
  duration: string
  uses: string
}

export interface Quote {
  id: string
  number: string
  status: Status
  publicToken: string
  client: Omit<Client, 'id'>
  orgType: string
  orgPct: number
  title: string
  intro: string
  issueDate: string
  validUntil: string
  lines: Line[]
  discountPct: number
  depositPct: number
  note: string
  brief: BriefAnswer[]
  contract: ContractInfo
  license: LicenseInfo | null
  acceptedAt: string | null
  acceptedName: string
  createdAt: string
  updatedAt: string
}
