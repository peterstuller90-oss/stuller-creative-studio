/* Smooth drag to reorder, for the block list (≡ handle) and for texts in the preview.
   Nothing is re-laid out while dragging: the dragged piece floats under the finger at full frame rate,
   the others glide aside (list) or a line shows where it will land (preview). The order changes once, on release. */
(function () {
  const EASE = 'cubic-bezier(.33,0,.67,1)'
  const css = `.grip{cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;border:0;background:none;color:inherit;opacity:.6;font-size:22px;line-height:1;padding:6px 10px;min-width:40px;min-height:36px;border-radius:8px}
.grip:hover,.grip:focus-visible{opacity:1;background:rgba(0,0,0,.06)}
.ds-drag{position:relative;z-index:30;background:var(--surface,var(--bg,#fff));box-shadow:0 14px 34px rgba(0,0,0,.22);border-radius:12px;transition:box-shadow .2s ${EASE}!important;will-change:transform}
.ds-drag .grip{cursor:grabbing}
.ds-shift{transition:transform .22s ${EASE}}
.ds-card{position:fixed;left:0;top:0;z-index:9998;pointer-events:none;background:#fff;border-radius:12px;padding:6px;box-shadow:0 16px 40px rgba(0,0,0,.28),0 0 0 1px rgba(0,0,0,.06);will-change:transform;transition:opacity .15s ${EASE}}
.ds-card canvas{display:block;border-radius:6px}
.ds-line{position:fixed;z-index:9997;pointer-events:none;height:4px;border-radius:2px;background:#ff5d13;box-shadow:0 0 0 2px rgba(255,255,255,.9);transition:top .14s ${EASE}}
.ds-dim{position:fixed;z-index:9996;pointer-events:none;background:rgba(255,255,255,.55);border-radius:6px}`
  function addCss() { if (document.getElementById('ds-css')) return; const s = document.createElement('style'); s.id = 'ds-css'; s.textContent = css; document.head.appendChild(s) }
  const scroller = (el) => { for (let n = el.parentElement; n; n = n.parentElement) { const o = getComputedStyle(n).overflowY; if ((o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight) return n } return document.scrollingElement }
  const sTop = (s) => s === document.scrollingElement ? scrollY : s.scrollTop
  const sView = (s) => s === document.scrollingElement ? { top: 0, bottom: innerHeight } : s.getBoundingClientRect()

  /* ---------- list ---------- */
  window.DragSort = function (box, onDone) {
    addCss()
    const items = () => [...box.children].filter((x) => x.dataset && x.dataset.i != null)
    box.addEventListener('pointerdown', (e) => {
      const g = e.target.closest('.grip'); if (!g || !box.contains(g)) return
      const el = g.closest('[data-i]'); if (!el || el.parentElement !== box) return
      e.preventDefault()
      const list = items(), from = list.indexOf(el)
      const rects = list.map((x) => x.getBoundingClientRect())
      const gap = list.length > 1 ? Math.max(0, (from < list.length - 1 ? rects[from + 1].top - rects[from].bottom : rects[from].top - rects[from - 1].bottom)) : 0
      const step = rects[from].height + gap
      const sc = scroller(box), s0 = sTop(sc), y0 = e.clientY
      let y = e.clientY, target = from, raf = 0, alive = true
      el.classList.add('ds-drag'); list.forEach((x) => { if (x !== el) x.classList.add('ds-shift') })
      const frame = () => {
        if (!alive) return
        // auto-scroll near the edges of the scrolling area
        const v = sView(sc); const edge = 60
        if (y < v.top + edge) sc.scrollBy(0, -Math.ceil((v.top + edge - y) / 4)); else if (y > v.bottom - edge) sc.scrollBy(0, Math.ceil((y - v.bottom + edge) / 4))
        const dy = y - y0 + (sTop(sc) - s0)
        el.style.transform = `translateY(${dy}px) scale(1.02)`
        const c = rects[from].top + rects[from].height / 2 + dy
        target = from
        for (let i = 0; i < list.length; i++) { if (i === from) continue; const m = rects[i].top + rects[i].height / 2; if (i < from && c < m) { target = i; break } }
        if (target === from) for (let i = list.length - 1; i > from; i--) { const m = rects[i].top + rects[i].height / 2; if (c > m) { target = i; break } }
        list.forEach((x, i) => { if (i === from) return; let t = 0; if (from < target && i > from && i <= target) t = -step; if (target < from && i >= target && i < from) t = step; x.style.transform = t ? `translateY(${t}px)` : '' })
        raf = requestAnimationFrame(frame)
      }
      raf = requestAnimationFrame(frame)
      const move = (ev) => { y = ev.clientY }
      const end = () => {
        alive = false; cancelAnimationFrame(raf)
        removeEventListener('pointermove', move); removeEventListener('pointerup', end); removeEventListener('pointercancel', end)
        list.forEach((x) => { x.classList.remove('ds-drag', 'ds-shift'); x.style.transform = '' })
        if (target !== from) { const order = list.map((x) => +x.dataset.i); const [m] = order.splice(from, 1); order.splice(target, 0, m); onDone(order) }
      }
      addEventListener('pointermove', move, { passive: true }); addEventListener('pointerup', end); addEventListener('pointercancel', end)
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

  /* ---------- preview ----------
     opts.layout() → { W, H, items: [{ id, x, y, w, h, group }] } in design pixels, or null when dragging is off.
     opts.drop(id, k): put item `id` into slot k among the other items of its group (sorted top to bottom). */
  window.DragSort.preview = function (canvas, opts) {
    addCss()
    let d = null
    const toCss = (L) => { const r = canvas.getBoundingClientRect(), sx = r.width / L.W, sy = r.height / L.H; return { r, sx, sy } }
    const hit = (pt) => {
      const L = opts.layout(); if (!L) return null
      const { r, sx, sy } = toCss(L)
      const x = pt.clientX - r.left, y = pt.clientY - r.top
      const it = L.items.find((i) => y >= i.y * sy - 10 && y <= (i.y + i.h) * sy + 10 && x >= Math.min(i.x * sx, r.width * .15) - 10 && x <= Math.max((i.x + i.w) * sx, r.width * .85) + 10)
      return it ? { L, it } : null
    }
    canvas.addEventListener('touchstart', (e) => { if (e.touches.length === 1 && hit(e.touches[0])) e.preventDefault() }, { passive: false })
    canvas.addEventListener('pointermove', (e) => { if (!d) canvas.style.cursor = hit(e) ? 'grab' : '' })
    canvas.addEventListener('pointerdown', (e) => {
      const h = hit(e); if (!h) return
      e.preventDefault()
      const { L, it } = h, { r, sx, sy } = toCss(L)
      const bx = Math.max(0, it.x * sx - 6), by = Math.max(0, it.y * sy - 6), bw = Math.min(r.width - bx, it.w * sx + 12), bh = Math.min(r.height - by, it.h * sy + 12)
      // floating card with a snapshot of the text, a bit larger so it is easy to see under the finger
      const card = document.createElement('div'); card.className = 'ds-card'
      const k = Math.min(1.35, (r.width * .92) / bw), cw = bw * k, ch = bh * k
      const c = document.createElement('canvas'); const dpr = Math.min(2, devicePixelRatio || 1); c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr); c.style.width = cw + 'px'; c.style.height = ch + 'px'
      const ps = canvas.width / r.width
      try { c.getContext('2d').drawImage(canvas, bx * ps, by * ps, bw * ps, bh * ps, 0, 0, c.width, c.height) } catch (_) {}
      card.appendChild(c); document.body.appendChild(card)
      const dim = document.createElement('div'); dim.className = 'ds-dim'; Object.assign(dim.style, { left: r.left + bx + 'px', top: r.top + by + 'px', width: bw + 'px', height: bh + 'px' }); document.body.appendChild(dim)
      const line = document.createElement('div'); line.className = 'ds-line'; line.style.left = r.left + r.width * .08 + 'px'; line.style.width = r.width * .84 + 'px'; line.style.opacity = '0'; document.body.appendChild(line)
      const others = L.items.filter((i) => i.group === it.group && i.id !== it.id).sort((a, b) => a.y - b.y)
      const offY = e.clientY - (r.top + by), offX = e.clientX - (r.left + bx)
      let px = e.clientX, py = e.clientY, raf = 0, slot = null, moved = false
      const start = others.filter((o) => o.y < it.y).length
      const frame = () => {
        card.style.transform = `translate(${px - offX * k - 6}px, ${py - offY * k - 6}px)`
        const y = (py - r.top) / sy
        slot = others.filter((o) => o.y + o.h / 2 < y).length
        if (slot === start) { line.style.opacity = '0' } else {
          const a = others[slot - 1], b = others[slot]
          const ly = a && b ? (a.y + a.h + b.y) / 2 : a ? a.y + a.h + 14 / sy : b.y - 14 / sy
          line.style.top = r.top + ly * sy - 2 + 'px'; line.style.opacity = '1'
        }
        raf = requestAnimationFrame(frame)
      }
      raf = requestAnimationFrame(frame)
      d = true; canvas.style.cursor = 'grabbing'
      const move = (ev) => { px = ev.clientX; py = ev.clientY; moved = true }
      const end = () => {
        cancelAnimationFrame(raf); d = null; canvas.style.cursor = ''
        removeEventListener('pointermove', move); removeEventListener('pointerup', end); removeEventListener('pointercancel', end)
        card.remove(); line.remove(); dim.remove()
        if (moved && slot != null && slot !== start) opts.drop(it.id, slot)
      }
      addEventListener('pointermove', move, { passive: true }); addEventListener('pointerup', end); addEventListener('pointercancel', end)
    })
  }

  /** New block order after moving block `from` into slot k among `flow` (block indexes in drawing order).
   *  Blocks that are not in the flow keep their place. */
  window.DragSort.reflow = function (n, flowAll, from, k) {
    const others = flowAll.filter((i) => i !== from)
    const newFlow = [...others.slice(0, k), from, ...others.slice(k)]
    const slots = flowAll.slice().sort((a, b) => a - b)
    const order = [...Array(n).keys()]
    slots.forEach((s, j) => { order[s] = newFlow[j] })
    return order
  }
})()
