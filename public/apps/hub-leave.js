/* Asks "Uložiť návrh?" before a design is left (back to the Studio, opening another design, closing the page).
   Each studio registers: { key, state: () => string, save: () => Promise<boolean> }.
   The fingerprint of the last saved (or opened) design is kept in localStorage, so it survives reloads. */
(function () {
  let api = null
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return (h >>> 0).toString(36) + ':' + s.length }
  const skey = () => 'hubleave-' + api.key
  const getSnap = () => { try { return localStorage.getItem(skey()) } catch (e) { return null } }
  const setSnap = (v) => { try { localStorage.setItem(skey(), v) } catch (e) {} }

  const css = `.hl-back{position:fixed;inset:0;z-index:9999;background:rgba(20,20,20,.45);display:flex;align-items:center;justify-content:center;padding:16px;animation:hlIn .22s cubic-bezier(.33,0,.67,1)}
.hl-card{background:#fff;color:#1d1d1b;border-radius:18px;max-width:360px;width:100%;padding:22px 20px 16px;box-shadow:0 18px 50px rgba(0,0,0,.25);font-family:Barlow,system-ui,sans-serif;font-weight:500;animation:hlUp .28s cubic-bezier(.33,0,.67,1)}
.hl-card h2{margin:0 0 6px;font-size:21px;font-weight:500}.hl-card p{margin:0 0 16px;font-size:15px;line-height:1.4;opacity:.75}
.hl-card button{display:block;width:100%;min-height:46px;margin-top:8px;border-radius:12px;border:1px solid #d6d2c8;background:#f6f4ef;color:inherit;font:inherit;font-size:16px;cursor:pointer}
.hl-card button.hl-save{background:#1d1d1b;color:#fff;border-color:#1d1d1b}.hl-card button.hl-stay{background:none;border:none;text-decoration:underline;min-height:40px}
@media (prefers-color-scheme:dark){.hl-card{background:#232321;color:#f2efe8}.hl-card button{background:#2f2f2c;border-color:#444}.hl-card button.hl-save{background:#f2efe8;color:#1d1d1b}}
@keyframes hlIn{from{opacity:0}}@keyframes hlUp{from{opacity:0;transform:translateY(14px) scale(.98)}}`

  function ask() {
    return new Promise((res) => {
      if (!document.getElementById('hl-css')) { const st = document.createElement('style'); st.id = 'hl-css'; st.textContent = css; document.head.appendChild(st) }
      const back = document.createElement('div'); back.className = 'hl-back'
      back.innerHTML = '<div class="hl-card" role="alertdialog" aria-modal="true" aria-labelledby="hl-t"><h2 id="hl-t">Uložiť návrh?</h2><p>V návrhu máš neuložené zmeny.</p>' +
        '<button class="hl-save">Uložiť</button><button class="hl-no">Neukladať</button><button class="hl-stay">Zostať v návrhu</button></div>'
      const done = (v) => { back.remove(); res(v) }
      back.querySelector('.hl-save').onclick = () => done('save')
      back.querySelector('.hl-no').onclick = () => done('discard')
      back.querySelector('.hl-stay').onclick = () => done('cancel')
      back.onclick = (e) => { if (e.target === back) done('cancel') }
      document.body.appendChild(back)
      back.querySelector('.hl-save').focus()
    })
  }

  const HubLeave = {
    register(a) { api = a; if (getSnap() === null) setSnap(hash(api.state())) },
    /** Call after the design was saved or another design was opened. */
    mark() { if (api) setSnap(hash(api.state())) },
    dirty() { if (!api) return false; try { return hash(api.state()) !== getSnap() } catch (e) { return false } },
    /** Resolves true when it is fine to leave the current design. */
    async guard() {
      if (!HubLeave.dirty()) return true
      const c = await ask()
      if (c === 'cancel') return false
      if (c === 'discard') { HubLeave.mark(); return true }
      const ok = await api.save()
      if (ok) HubLeave.mark()
      return !!ok
    },
  }
  window.HubLeave = HubLeave
  addEventListener('beforeunload', (e) => { if (HubLeave.dirty()) { e.preventDefault(); e.returnValue = '' } })
})()
