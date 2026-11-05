// Service worker: shows notifications sent by the notify Edge Function.
self.addEventListener('push', (event) => {
  let data = { title: 'Stullers Home', body: '' }
  try { data = { ...data, ...event.data.json() } } catch { /* plain text or empty push */ }
  event.waitUntil(Promise.all([
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: 'stullers-' + Date.now(),
    }),
    // An open app reloads its data so the change shows up immediately.
    self.clients.matchAll({ type: 'window' }).then((all) => all.forEach((c) => c.postMessage('refresh'))),
  ]))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of all) if ('focus' in c) return c.focus()
    return self.clients.openWindow(self.registration.scope)
  })())
})
