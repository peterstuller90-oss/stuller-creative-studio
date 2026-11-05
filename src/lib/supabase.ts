import { createClient } from '@supabase/supabase-js'
import { demoFetch } from '../modules/home/lib/demo'

// One Supabase project for the whole Stullers Creative Studio ("stullers home").
// The publishable key is meant for the browser: access is protected by login and RLS rules.
// Secret keys never go here; they live in Supabase → Edge Functions → Secrets.
// VITE_DEMO=1 (only for local testing) answers from memory with sample data; any 6-digit PIN logs in.
const demo = import.meta.env.VITE_DEMO === '1'
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://vupzrryhxnninttjyges.supabase.co'
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || 'sb_publishable_lTU6RvAAgtRVeyvmx7BBeg_ag4_TZXX'

export const supabase = demo
  ? createClient('https://demo.supabase.co', 'demo', { global: { fetch: demoFetch }, auth: { persistSession: false } })
  : createClient(url, key)
