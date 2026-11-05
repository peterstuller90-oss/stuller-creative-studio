import type { SupabaseClient } from '@supabase/supabase-js'
import { browserSupportsWebAuthn, startAuthentication, startRegistration } from '@simplewebauthn/browser'
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser'

// Face ID / fingerprint login. The device keeps the private key; the "passkey" Edge Function checks
// every login on the server. This device remembers only which credential belongs to which profile.
const storeKey = (email: string) => `stullers-passkey:${email}`

export function savedPasskey(email: string): string | null {
  try { return localStorage.getItem(storeKey(email)) } catch { return null }
}

function remember(email: string, credentialId: string | null) {
  try {
    if (credentialId) localStorage.setItem(storeKey(email), credentialId)
    else localStorage.removeItem(storeKey(email))
  } catch { /* private mode: the button just won't show next time */ }
}

export const passkeysSupported = () => import.meta.env.VITE_DEMO !== '1' && browserSupportsWebAuthn()

// Face ID is the label people know; Android phones show their own fingerprint or face prompt.
export const biometricName = () => (/iPhone|iPad|Macintosh/.test(navigator.userAgent) ? 'Face ID' : 'odtlačok prsta')

async function call<T>(supabase: SupabaseClient, body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke('passkey', { body })
  if (error) throw new Error('Server je nedostupný, skús to znova.')
  if (data?.error) throw new Error(data.error)
  return data as T
}

// Options are fetched ahead of the tap, because iPhone opens Face ID only straight from a tap.
export type RegisterOptions = { challengeId: string; options: PublicKeyCredentialCreationOptionsJSON }
export type LoginOptions = { challengeId: string; options: PublicKeyCredentialRequestOptionsJSON }
export const registrationOptions = (supabase: SupabaseClient) => call<RegisterOptions>(supabase, { action: 'register-options' })
export const loginOptions = (supabase: SupabaseClient, email: string) => call<LoginOptions>(supabase, { action: 'login-options', email })

export async function register(supabase: SupabaseClient, email: string, prepared: RegisterOptions) {
  const response = await startRegistration({ optionsJSON: prepared.options })
  const { credentialId } = await call<{ credentialId: string }>(supabase, { action: 'register-verify', challengeId: prepared.challengeId, response })
  remember(email, credentialId)
}

export async function unregister(supabase: SupabaseClient, email: string) {
  const credentialId = savedPasskey(email)
  if (credentialId) await call(supabase, { action: 'remove', credentialId })
  remember(email, null)
}

export async function login(supabase: SupabaseClient, prepared: LoginOptions) {
  const response = await startAuthentication({ optionsJSON: prepared.options })
  const { tokenHash } = await call<{ tokenHash: string }>(supabase, { action: 'login-verify', challengeId: prepared.challengeId, response })
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' })
  if (error) throw new Error('Prihlásenie sa nepodarilo, zadaj PIN.')
}

// The user cancelled the Face ID sheet: not worth an error message.
export const isCancel = (e: unknown) => e instanceof Error && (e.name === 'NotAllowedError' || e.name === 'AbortError')
