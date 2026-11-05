/* Reorder a list by dragging its ≡ handle (mouse or finger). Items are direct children with data-i;
   the handle has class "grip". onDone(order) gets the new order as a list of the original indexes.
   Arrow up / down on a focused handle moves the item too. */
(function () {
  const css = `.grip{cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;border:0;background:none;color:inherit;opacity:.6;font-size:22px;line-height:1;padding:6px 10px;min-width:40px;min-height:36px;border-radius:8px}
.grip:hover,.grip:focus-visible{opacity:1;background:rgba(0,0,0,.06)}
.ds-drag{position:relative;z-index:5;box-shadow:0 10px 28px rgba(0,0,0,.18);transform:scale(1.015);transition:box-shadow .2s cubic-bezier(.33,0,.67,1),transform .2s cubic-bezier(.33,0,.67,1)}
.ds-drag .grip{cursor:grabbing}`
  function addCss() { if (document.getElementById('ds-css')) return; const s = document.createElement('style'); s.id = 'ds-css'; s.textContent = css; document.head.appendChild(s) }

  window.DragSort = function (box, onDone) {
    addCss()
    const items = () => [...box.children].filter((x) => x.dataset && x.dataset.i != null)
    const finish = (before) => { const order = items().map((x) => +x.dataset.i); if (order.join() !== before.join()) onDone(order) }
    box.addEventListener('pointerdown', (e) => {
      const g = e.target.closest('.grip'); if (!g || !box.contains(g)) return
      const el = g.closest('[data-i]'); if (!el || el.parentElement !== box) return
      e.preventDefault()
      try { g.setPointerCapture(e.pointerId) } catch (_) {}
      const before = items().map((x) => +x.dataset.i)
      el.classList.add('ds-drag')
      const move = (ev) => {
        const sib = items().filter((x) => x !== el)
        let next = null
        for (const s of sib) { const r = s.getBoundingClientRect(); if (ev.clientY < r.top + r.height / 2) { next = s; break } }
        if (next !== el.nextElementSibling || (!next && el !== items()[items().length - 1])) {
          if (next) box.insertBefore(el, next); else box.insertBefore(el, items()[items().length - 1].nextSibling)
        }
        // keep the dragged block in view when the list is longer than the screen
        const r = el.getBoundingClientRect()
        if (ev.clientY < 70 || ev.clientY > innerHeight - 70) el.scrollIntoView({ block: 'nearest' })
        else if (r.top < 0 || r.bottom > innerHeight) el.scrollIntoView({ block: 'nearest' })
      }
      const end = () => {
        removeEventListener('pointermove', move); removeEventListener('pointerup', end); removeEventListener('pointercancel', end)
        el.classList.remove('ds-drag'); finish(before)
      }
      // on the window: moving the block in the page drops pointer capture, so the handle itself would miss the release
      addEventListener('pointermove', move); addEventListener('pointerup', end); addEventListener('pointercancel', end)
    })
    box.addEventListener('keydown', (e) => {
      const g = e.target.closest && e.target.closest('.grip'); if (!g || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
      e.preventDefault()
      const order = items().map((x) => +x.dataset.i), i = order.indexOf(+g.closest('[data-i]').dataset.i), j = i + (e.key === 'ArrowUp' ? -1 : 1)
      if (j < 0 || j >= order.length) return
      ;[order[i], order[j]] = [order[j], order[i]]
      onDone(order, order[j])
    })
  }

  /** New block order after dragging block `from` in the preview: `flow` is the list of block indexes in the order they
   *  are drawn (without `from`), `k` the slot it was dropped into. Blocks that are not in the flow keep their place. */
  window.DragSort.reflow = function (n, flowAll, from, k) {
    const others = flowAll.filter((i) => i !== from)
    const newFlow = [...others.slice(0, k), from, ...others.slice(k)]
    const slots = flowAll.slice().sort((a, b) => a - b)
    const order = [...Array(n).keys()]
    slots.forEach((s, j) => { order[s] = newFlow[j] })
    return order
  }
})()
