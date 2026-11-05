// Sends Web Push notifications when an assignment changes.
// Called only by the database trigger on public.assignments; the shared secret proves that.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import webpush from 'npm:web-push@3.6.7'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

interface Assignment { id: string; task_id: string; user_id: string; status: string }
interface Message { title: string; body: string }

function sameSecret(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req) => {
  const payload = await req.json().catch(() => null)
  const { data: config } = await supabase.from('push_config').select('*').eq('id', 1).single()
  if (!payload || !config || typeof payload.secret !== 'string' || !sameSecret(payload.secret, config.webhook_secret)) {
    return new Response('forbidden', { status: 403 })
  }

  // First run: create the VAPID key pair here, so the private key never leaves Supabase.
  if (!config.vapid_public || !config.vapid_private) {
    const keys = webpush.generateVAPIDKeys()
    await supabase.from('push_config').update({ vapid_public: keys.publicKey, vapid_private: keys.privateKey }).eq('id', 1)
    config.vapid_public = keys.publicKey
    config.vapid_private = keys.privateKey
  }
  if (payload.type === 'INIT') return Response.json({ ok: true })

  webpush.setVapidDetails('mailto:peterstuller90@gmail.com', config.vapid_public, config.vapid_private)

  const rec = payload.record as Assignment
  const old = payload.old_record as Assignment | null
  const actor = payload.actor as string | null

  const [{ data: task }, { data: profiles }] = await Promise.all([
    supabase.from('tasks').select('name, xp').eq('id', rec.task_id).single(),
    supabase.from('profiles').select('id, name, role'),
  ])
  if (!task || !profiles) return Response.json({ sent: 0 })
  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.name ?? 'Niekto'

  // Who should hear about this change, and what they read. The person who made the change never gets
  // a notification about it (filtered below); kids hear about their own tasks, parents about everything.
  const who = nameOf(rec.user_id)
  const by = actor ? nameOf(actor) : 'Niekto'
  const parents = profiles.filter((p) => p.role === 'parent').map((p) => p.id)
  const everyone = profiles.map((p) => p.id)
  const except = (ids: string[], ...skip: string[]) => ids.filter((id) => !skip.includes(id))
  const xp = `+${task.xp} XP`

  const out: { to: string[]; msg: Message }[] = []
  if (payload.type === 'INSERT') {
    out.push({ to: [rec.user_id], msg: { title: 'Nová úloha 📋', body: `${task.name} (${xp}) · od ${by}` } })
    out.push({ to: except(parents, rec.user_id), msg: { title: 'Pridelená úloha 📋', body: `${by} pridelil(a) ${who}: ${task.name}` } })
  } else if (old && old.user_id !== rec.user_id) {
    const from = nameOf(old.user_id)
    out.push({ to: [rec.user_id], msg: { title: 'Úloha preradená na teba ⇄', body: `${task.name} od ${from}` } })
    out.push({ to: [old.user_id], msg: { title: 'Úloha presunutá ⇄', body: `${task.name} teraz robí ${who}` } })
    out.push({ to: except(parents, rec.user_id, old.user_id), msg: { title: 'Úloha preradená ⇄', body: `${task.name}: ${from} → ${who}` } })
  } else if (old && old.status !== rec.status) {
    if (rec.status === 'waiting_for_approval') {
      out.push({ to: except(parents, rec.user_id), msg: { title: `${who} splnil(a) úlohu ✋`, body: `${task.name} čaká na schválenie` } })
    } else if (rec.status === 'completed') {
      out.push({ to: [rec.user_id], msg: { title: `Schválené! ${xp} 🎉`, body: `${task.name} · schválil(a) ${by}` } })
      out.push({ to: except(everyone, rec.user_id), msg: { title: `🎉 ${who} získal(a) ${xp}`, body: `${task.name} · schválil(a) ${by}` } })
    } else if (rec.status === 'rejected') {
      out.push({ to: [rec.user_id], msg: { title: 'Úloha vrátená ↩', body: `${task.name}: skús to ešte raz` } })
      out.push({ to: except(parents, rec.user_id), msg: { title: 'Úloha vrátená ↩', body: `${by} vrátil(a) ${who}: ${task.name}` } })
    }
  }

  let sent = 0
  for (const { to, msg } of out) {
    const recipients = to.filter((id) => id !== actor)
    if (!recipients.length) continue
    const { data: subs } = await supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth').in('user_id', recipients)
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 60 * 60 * 24 })
        sent++
      } catch (e) {
        // The device unsubscribed or the subscription expired: forget it.
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) await supabase.from('push_subscriptions').delete().eq('id', s.id)
      }
    }
  }
  return Response.json({ sent })
})
