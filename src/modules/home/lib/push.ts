import type { SupabaseClient } from '@supabase/supabase-js'

export type PushState = 'unsupported' | 'needs-install' | 'off' | 'on' | 'denied'

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

export function registerServiceWorker() {
  if (import.meta.env.VITE_DEMO === '1' || !('serviceWorker' in navigator)) return
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => {})
}

export async function pushState(): Promise<PushState> {
  // iPhone allows notifications only for an app added to the Home Screen.
  if (isIOS() && !isStandalone()) return 'needs-install'
  if (import.meta.env.VITE_DEMO === '1' || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)
  const sub = await reg?.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

function keyBytes(base64url: string) {
  const b64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

export async function enablePush(supabase: SupabaseClient) {
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('Notifikácie nie sú povolené.')
  const { data: key, error } = await supabase.rpc('vapid_public_key')
  if (error || !key) throw new Error('Notifikácie ešte nie sú na serveri nastavené.')
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key as string) })
  const json = sub.toJSON()
  const { error: saveError } = await supabase.rpc('save_push_subscription', {
    p_endpoint: sub.endpoint, p_p256dh: json.keys?.p256dh, p_auth: json.keys?.auth,
  })
  if (saveError) throw saveError
}

export async function disablePush(supabase: SupabaseClient) {
  const reg = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await supabase.rpc('remove_push_subscription', { p_endpoint: sub.endpoint })
  await sub.unsubscribe()
}
