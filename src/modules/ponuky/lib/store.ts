import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase as sharedSupabase } from '../../../lib/supabase'
import { DEFAULT_PRICES, DEFAULT_SETTINGS } from './defaults'
import { totals } from './calc'
import type { Client, ContractInfo, PriceItem, Quote, Settings } from './types'

export interface Data { settings: Settings; prices: PriceItem[]; clients: Client[]; quotes: Quote[] }

export interface Store {
  mode: 'demo' | 'cloud'
  loadAll(): Promise<Data>
  saveSettings(s: Settings): Promise<void>
  savePrice(p: PriceItem): Promise<void>
  deletePrice(id: string): Promise<void>
  saveClient(c: Client): Promise<void>
  saveQuote(q: Quote, s: Settings): Promise<void>
  deleteQuote(id: string): Promise<void>
}

/** Older saved settings may miss fields added later; fill them from defaults. */
const withDefaults = (s: Partial<Settings> | null | undefined): Settings => ({
  ...DEFAULT_SETTINGS, ...s,
  company: { ...DEFAULT_SETTINGS.company, ...s?.company },
  tax: { ...DEFAULT_SETTINGS.tax, ...s?.tax },
  license: { ...DEFAULT_SETTINGS.license, ...s?.license },
})

export const DEFAULT_CONTRACT_INFO: ContractInfo = {
  place: '',
  deadline: '',
  exclusive: false,
  territory: 'Slovenská republika',
  duration: 'na dobu trvania majetkových práv autora',
  uses: 'verejné vystavenie diela, vyhotovenie rozmnoženiny diela (fotografie, video), verejný prenos diela na webe a sociálnych sieťach objednávateľa na účely jeho prezentácie',
}

/** Quotes saved by older versions miss newer fields. */
export const normalizeQuote = (q: Quote): Quote => ({
  ...q,
  orgType: q.orgType ?? '',
  orgPct: q.orgPct ?? 0,
  brief: q.brief ?? [],
  license: q.license ?? null,
  contract: { ...DEFAULT_CONTRACT_INFO, ...q.contract },
})

/* ───────── Demo: everything in this browser's localStorage ───────── */

const KEY = 'stullers-ponuky-demo'

function readLocal(): Data {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const d = JSON.parse(raw) as Data
      return { ...d, settings: withDefaults(d.settings), quotes: d.quotes.map(normalizeQuote) }
    }
  } catch { /* storage blocked or corrupt: start fresh */ }
  return { settings: DEFAULT_SETTINGS, prices: DEFAULT_PRICES, clients: [], quotes: [] }
}
function writeLocal(d: Data) {
  try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* private mode: keep in memory only */ }
}

function demoStore(): Store {
  let d = readLocal()
  const commit = (next: Data) => { d = next; writeLocal(d) }
  const upsert = <T extends { id: string }>(list: T[], item: T) =>
    list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]
  return {
    mode: 'demo',
    loadAll: async () => structuredClone(d),
    saveSettings: async (settings) => commit({ ...d, settings }),
    savePrice: async (p) => commit({ ...d, prices: upsert(d.prices, p) }),
    deletePrice: async (id) => commit({ ...d, prices: d.prices.filter((p) => p.id !== id) }),
    saveClient: async (c) => commit({ ...d, clients: upsert(d.clients, c) }),
    saveQuote: async (q) => commit({ ...d, quotes: upsert(d.quotes, q) }),
    deleteQuote: async (id) => commit({ ...d, quotes: d.quotes.filter((q) => q.id !== id) }),
  }
}

/* ───────── Cloud: Supabase tables quote_* (see supabase/schema.sql) ───────── */

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data
}

function cloudStore(sb: SupabaseClient): Store {
  return {
    mode: 'cloud',
    async loadAll() {
      const [s, p, c, q] = await Promise.all([
        sb.from('quote_settings').select('data').eq('id', 1).maybeSingle(),
        sb.from('quote_price_items').select('*').order('sort'),
        sb.from('quote_clients').select('*').order('name'),
        sb.from('quotes').select('data').order('created_at', { ascending: false }),
      ])
      let prices = (check(p) as PriceItem[]).map((x) => ({ ...x, price: Number(x.price) }))
      if (prices.length === 0) {
        // First run: start from the placeholder price list.
        check(await sb.from('quote_price_items').insert(DEFAULT_PRICES))
        prices = DEFAULT_PRICES
      }
      return {
        settings: withDefaults(check(s)?.data as Settings | undefined),
        prices,
        clients: check(c) as Client[],
        quotes: (check(q) as { data: Quote }[]).map((r) => normalizeQuote(r.data)),
      }
    },
    async saveSettings(settings) {
      check(await sb.from('quote_settings').upsert({ id: 1, data: settings }))
    },
    async savePrice(p) { check(await sb.from('quote_price_items').upsert(p)) },
    async deletePrice(id) { check(await sb.from('quote_price_items').delete().eq('id', id)) },
    async saveClient(c) { check(await sb.from('quote_clients').upsert(c)) },
    async saveQuote(q, s) {
      check(await sb.from('quotes').upsert({
        id: q.id, number: q.number, status: q.status, public_token: q.publicToken,
        client_name: q.client.company || q.client.name, total: totals(q, s).total,
        data: q, updated_at: q.updatedAt, accepted_at: q.acceptedAt, accepted_name: q.acceptedName,
      }))
    },
    async deleteQuote(id) { check(await sb.from('quotes').delete().eq('id', id)) },
  }
}

/** Shared Stullers Creative Studio client (null only in demo mode). */
export const supabase: SupabaseClient | null = sharedSupabase
export const store: Store = supabase ? cloudStore(supabase) : demoStore()
