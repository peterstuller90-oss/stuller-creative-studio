/* Phone layout: each tool section (an element with an h3 title) folds into a one-line row you tap to open.
   Sections marked data-basic start open; what you open or close is remembered. On desktop nothing folds. */
(function () {
  const MQ = '(max-width:899px)'
  const css = `@media ${MQ}{
.fold>h3{cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px;min-height:46px;margin:0;padding:4px 2px;border-top:1px solid rgba(127,127,127,.22);-webkit-tap-highlight-color:transparent}
.fold>h3::after{content:"";flex:none;width:8px;height:8px;margin-right:6px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:translateY(-2px) rotate(45deg);transition:transform .28s cubic-bezier(.33,0,.67,1)}
.fold.open>h3::after{transform:translateY(2px) rotate(-135deg)}
.fold:not(.open)>:not(h3){display:none!important}
.fold.open>:not(h3){animation:foldIn .28s cubic-bezier(.33,0,.67,1)}
@keyframes foldIn{from{opacity:0;transform:translateY(-6px)}}}`
  window.Fold = function (selector, key) {
    if (!document.getElementById('fold-css')) { const s = document.createElement('style'); s.id = 'fold-css'; s.textContent = css; document.head.appendChild(s) }
    let open = {}
    try { open = JSON.parse(localStorage.getItem('fold-' + key) || '{}') } catch (e) {}
    const mq = matchMedia(MQ)
    document.querySelectorAll(selector).forEach((g) => {
      const h = g.querySelector(':scope>h3'); if (!h) return
      const id = g.dataset.fold || h.textContent.trim()
      g.classList.add('fold')
      if (id in open ? open[id] : g.hasAttribute('data-basic')) g.classList.add('open')
      const sync = () => { if (mq.matches) { h.setAttribute('role', 'button'); h.tabIndex = 0; h.setAttribute('aria-expanded', String(g.classList.contains('open'))) } else { h.removeAttribute('role'); h.removeAttribute('tabindex'); h.removeAttribute('aria-expanded') } }
      const tog = () => {
        if (!mq.matches) return
        g.classList.toggle('open'); open[id] = g.classList.contains('open'); sync()
        try { localStorage.setItem('fold-' + key, JSON.stringify(open)) } catch (e) {}
        if (open[id]) setTimeout(() => h.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60)
      }
      h.addEventListener('click', tog)
      h.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog() } })
      mq.addEventListener('change', sync); sync()
    })
  }
})()
