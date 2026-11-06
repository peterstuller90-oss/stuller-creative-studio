/* Tool sections (an element with an h3 title) fold into a one-line row you tap to open.
   Peter (6. 11.): in every app, everything starts folded, on phone and computer; you open what you need. */
(function () {
  const css = `
.fold>h3{cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px;min-height:46px;margin:0!important;padding:4px 2px;border-top:1px solid rgba(127,127,127,.22);
  text-transform:none!important;letter-spacing:normal!important;font-size:16px!important;font-weight:500!important;color:inherit!important;-webkit-tap-highlight-color:transparent;user-select:none}
.fold>h3:hover{opacity:.8}
.fold>h3::after{content:"";flex:none;width:8px;height:8px;margin-right:6px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:translateY(-2px) rotate(45deg);transition:transform .28s cubic-bezier(.33,0,.67,1)}
.fold.open>h3::after{transform:translateY(2px) rotate(-135deg)}
.fold:not(.open)>:not(h3){display:none!important}
.fold.open{padding-bottom:14px}
.fold.open>:not(h3){animation:foldIn .28s cubic-bezier(.33,0,.67,1)}
@keyframes foldIn{from{opacity:0;transform:translateY(-6px)}}`
  window.Fold = function (selector) {
    if (!document.getElementById('fold-css')) { const s = document.createElement('style'); s.id = 'fold-css'; s.textContent = css; document.head.appendChild(s) }
    document.querySelectorAll(selector).forEach((g) => {
      const h = g.querySelector(':scope>h3'); if (!h || g.classList.contains('fold')) return
      g.classList.add('fold')
      h.setAttribute('role', 'button'); h.tabIndex = 0; h.setAttribute('aria-expanded', 'false')
      const tog = () => {
        g.classList.toggle('open'); const open = g.classList.contains('open'); h.setAttribute('aria-expanded', String(open))
        if (open) setTimeout(() => h.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60)
      }
      h.addEventListener('click', tog)
      h.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog() } })
    })
  }
})()
