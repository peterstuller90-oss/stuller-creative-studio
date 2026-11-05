// Face ID / fingerprint login with passkeys (WebAuthn).
// The phone signs a one-time challenge with a key that never leaves the device; this function checks
// the signature against the stored public key and only then opens a session. Picking a profile alone gives nothing.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import {
  generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse,
} from 'npm:@simplewebauthn/server@13.3.3'
import { isoBase64URL } from 'npm:@simplewebauthn/server@13.3.3/helpers'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

// Passkeys are bound to the site, so only the app's own addresses may use them.
const ORIGINS = ['https://peterstuller90-oss.github.io', 'http://localhost:5173']
const RP_NAME = 'Stullers Home'

const cors = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
})

class Fail extends Error {}

async function currentUser(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data } = await supabase.auth.getUser(token)
  if (!data.user?.email) throw new Fail('Nie si prihlásený.')
  return data.user
}

async function newChallenge(row: { kind: string; challenge: string; user_id?: string; email?: string }) {
  await supabase.from('passkey_challenges').delete().lt('expires_at', new Date().toISOString())
  const { data, error } = await supabase.from('passkey_challenges').insert(row).select('id').single()
  if (error) throw error
  return data.id as string
}

// Each challenge works once: it is deleted as it is read.
async function takeChallenge(id: string, kind: string) {
  const { data } = await supabase.from('passkey_challenges').delete().eq('id', id).eq('kind', kind)
    .gt('expires_at', new Date().toISOString()).select('*').maybeSingle()
  if (!data) throw new Fail('Platnosť vypršala, skús to znova.')
  return data
}

async function handle(req: Request, origin: string) {
  const body = await req.json()
  const rpID = new URL(origin).hostname

  switch (body.action) {
    case 'register-options': {
      const user = await currentUser(req)
      const { data: existing } = await supabase.from('passkeys').select('id, transports').eq('user_id', user.id)
      const options = await generateRegistrationOptions({
        rpName: RP_NAME, rpID,
        userName: user.email!, userDisplayName: user.user_metadata?.name ?? user.email!,
        userID: new TextEncoder().encode(user.id),
        attestationType: 'none',
        excludeCredentials: (existing ?? []).map((c) => ({ id: c.id, transports: c.transports ?? undefined })),
        authenticatorSelection: { residentKey: 'preferred', userVerification: 'required', authenticatorAttachment: 'platform' },
      })
      const challengeId = await newChallenge({ kind: 'register', challenge: options.challenge, user_id: user.id })
      return { challengeId, options }
    }

    case 'register-verify': {
      const user = await currentUser(req)
      const ch = await takeChallenge(body.challengeId, 'register')
      if (ch.user_id !== user.id) throw new Fail('Nesprávny používateľ.')
      const result = await verifyRegistrationResponse({
        response: body.response, expectedChallenge: ch.challenge, expectedOrigin: ORIGINS, expectedRPID: rpID,
        requireUserVerification: true,
      })
      if (!result.verified) throw new Fail('Face ID sa nepodarilo overiť.')
      const c = result.registrationInfo.credential
      const { error } = await supabase.from('passkeys').insert({
        id: c.id, user_id: user.id, email: user.email, public_key: isoBase64URL.fromBuffer(c.publicKey),
        counter: c.counter, transports: c.transports ?? null,
      })
      if (error) throw error
      return { credentialId: c.id }
    }

    case 'remove': {
      const user = await currentUser(req)
      await supabase.from('passkeys').delete().eq('id', body.credentialId).eq('user_id', user.id)
      return { ok: true }
    }

    case 'login-options': {
      const email = String(body.email ?? '').toLowerCase()
      const { data: creds } = await supabase.from('passkeys').select('id, transports').eq('email', email)
      if (!creds?.length) throw new Fail('Face ID nie je pre tento profil zapnuté.')
      const options = await generateAuthenticationOptions({
        rpID, userVerification: 'required',
        allowCredentials: creds.map((c) => ({ id: c.id, transports: c.transports ?? undefined })),
      })
      const challengeId = await newChallenge({ kind: 'login', challenge: options.challenge, email })
      return { challengeId, options }
    }

    case 'login-verify': {
      const ch = await takeChallenge(body.challengeId, 'login')
      const { data: cred } = await supabase.from('passkeys').select('*').eq('id', body.response?.id).eq('email', ch.email).maybeSingle()
      if (!cred) throw new Fail('Toto zariadenie nie je pre tento profil zaregistrované.')
      const result = await verifyAuthenticationResponse({
        response: body.response, expectedChallenge: ch.challenge, expectedOrigin: ORIGINS, expectedRPID: rpID,
        requireUserVerification: true,
        credential: { id: cred.id, publicKey: isoBase64URL.toBuffer(cred.public_key), counter: Number(cred.counter), transports: cred.transports ?? undefined },
      })
      if (!result.verified) throw new Fail('Face ID sa nepodarilo overiť.')
      await supabase.from('passkeys').update({ counter: result.authenticationInfo.newCounter, last_used_at: new Date().toISOString() }).eq('id', cred.id)

      // A one-time login token for this account; the app trades it for a normal session.
      const { data, error } = await supabase.auth.admin.generateLink({ type: 'magiclink', email: cred.email })
      if (error) throw error
      return { tokenHash: data.properties.hashed_token }
    }
  }
  throw new Fail('Neznáma akcia.')
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin') ?? ''
  if (!ORIGINS.includes(origin)) return new Response('forbidden', { status: 403 })
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) })
  try {
    return Response.json(await handle(req, origin), { headers: cors(origin) })
  } catch (e) {
    const message = e instanceof Fail ? e.message : 'Niečo sa pokazilo, skús to znova.'
    if (!(e instanceof Fail)) console.error(e)
    return Response.json({ error: message }, { headers: cors(origin) })
  }
})
