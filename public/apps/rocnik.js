/* Ročník – spoločný výber ročníka a polroka pre appky Slovina, Matika, Anglina.
   Výber je uložený v zariadení (localStorage 'stullers-rocnik') a platí pre všetky appky naraz.

   Použitie v appke:
     <script src="../rocnik.js"></script>
     Rocnik.setup({ app: 'Matika', ready: [{ grade: 4, half: 1 }, { grade: 4, half: 2 }], onChange(r) { ... } })
     Rocnik.get()          -> { grade: 4, half: 1 }
     Rocnik.label(r?)      -> '4. ročník · 1. polrok'
     Rocnik.isReady(r?)    -> true/false (je pre tento ročník v appke pripravený obsah?)
     Rocnik.open()         -> otvorí okno „Ďalší ročník“
     Rocnik.buttonHtml()   -> HTML tlačidla „🎓 Ďalší ročník“ (ťuknutie otvorí okno samo)
   Po zmene sa zavolá onChange(r) a vyšle sa udalosť window 'rocnik-change' (detail = r).
   Predvolené: 4. ročník; polrok podľa dátumu (február–august = 2. polrok). */
(() => {
  if (window.Rocnik) return;
  const KEY = 'stullers-rocnik';
  const GRADES = [3, 4, 5, 6, 7, 8, 9];
  let cfg = { app: '', ready: [], onChange: null };
  const defHalf = () => { const m = new Date().getMonth(); return m >= 1 && m <= 7 ? 2 : 1; };
  const read = () => {
    try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && GRADES.includes(v.grade) && (v.half === 1 || v.half === 2)) return v; } catch (e) { /* bez úložiska */ }
    return null;
  };
  let mem = read() || { grade: 4, half: defHalf() };
  const save = (r) => { mem = { grade: r.grade, half: r.half }; try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* bez úložiska */ } };
  const same = (a, b) => a.grade === b.grade && a.half === b.half;

  const css = document.createElement('style');
  css.textContent = `
  .rk-wrap{position:fixed;inset:0;z-index:9500;background:rgba(10,5,30,.62);display:flex;align-items:flex-end;justify-content:center;padding:16px;padding-bottom:max(16px,env(safe-area-inset-bottom,0px))}
  .rk{width:100%;max-width:560px;max-height:90vh;overflow:auto;background:#FFFDF6;color:#0B1033;border:3px solid #0B1033;border-radius:24px;box-shadow:0 6px 0 #0B1033;padding:20px;display:flex;flex-direction:column;gap:12px;font-family:Nunito,system-ui,sans-serif}
  .rk h3{margin:0;font:800 26px 'Baloo 2',system-ui,sans-serif;text-align:center;text-transform:uppercase;letter-spacing:.02em}
  .rk p{margin:0;font-weight:700;font-size:17px;line-height:1.35;text-align:center;color:#3c3566}
  .rk .rk-now{background:#E8F7FF;border:2px solid #2A6BF2;border-radius:14px;padding:8px 12px;font-weight:900;color:#0B1033}
  .rk-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .rk-opt{position:relative;border:3px solid #0B1033;border-radius:16px;background:#fff;box-shadow:0 4px 0 #0B1033;padding:10px 12px;text-align:left;font:800 19px 'Baloo 2',system-ui,sans-serif;color:#0B1033;min-height:64px;display:flex;flex-direction:column;justify-content:center;gap:2px;cursor:pointer}
  .rk-opt .rk-h{font-size:.85em;line-height:1.1}
  .rk-opt small{font:700 14px Nunito,system-ui,sans-serif;color:#5a4f80}
  .rk-opt.ready{background:linear-gradient(180deg,#FFE680 0 45%,#FFCF1F 45%)}
  .rk-opt.soon{opacity:.45;filter:saturate(.2);box-shadow:none;cursor:default}
  .rk-opt[aria-pressed=true]{box-shadow:0 4px 0 #0B1033,0 0 0 4px #fff,0 0 0 7px #2A6BF2}
  .rk-opt[aria-pressed=true]::after{content:'✓';position:absolute;top:-10px;right:-10px;width:28px;height:28px;border-radius:50%;background:#2BD46A;border:3px solid #0B1033;color:#0B1033;font:900 16px/22px Nunito,sans-serif;text-align:center}
  .rk-row{display:flex;gap:10px}
  .rk-row button{flex:1;min-height:52px;border:3px solid #0B1033;border-radius:16px;box-shadow:0 5px 0 #0B1033;font:800 20px 'Baloo 2',system-ui,sans-serif;text-transform:uppercase;cursor:pointer}
  .rk-row .rk-no{background:linear-gradient(180deg,#3A57C9,#22399B);color:#fff}
  .rk-row .rk-yes{background:linear-gradient(180deg,#7FF0AE 0 45%,#2BD46A 45%);color:#0B1033}
  .rk-row .rk-yes[disabled]{filter:grayscale(.8) brightness(.8);pointer-events:none}
  .rk-btn{display:inline-flex;align-items:center;gap:8px;border:3px solid #0B1033;border-radius:13px;box-shadow:0 4px 0 #0B1033;background:linear-gradient(180deg,#fff 0 50%,#E9E4FF 50%);color:#0B1033;font:800 17px 'Baloo 2',system-ui,sans-serif;padding:6px 14px;min-height:42px;cursor:pointer}
  @media (max-width:420px){.rk-opt{font-size:17px;padding:8px 10px}.rk h3{font-size:22px}}`;
  document.head.appendChild(css);

  function open() {
    document.querySelector('.rk-wrap')?.remove();
    let sel = { ...mem };
    const w = document.createElement('div');
    w.className = 'rk-wrap';
    const draw = () => {
      const opts = [];
      for (const g of GRADES) for (const h of [1, 2]) {
        const r = { grade: g, half: h };
        const ok = isReady(r);
        opts.push(`<button type="button" class="rk-opt ${ok ? 'ready' : 'soon'}" data-g="${g}" data-h="${h}" aria-pressed="${same(r, sel)}" ${ok ? '' : 'aria-disabled="true"'}><span>${g}. ročník</span><span class="rk-h">${h}. polrok</span><small>${ok ? (same(r, mem) ? 'teraz' : 'pripravené') : 'pripravujeme'}</small></button>`);
      }
      w.innerHTML = `<div class="rk" role="dialog" aria-modal="true" aria-label="Ďalší ročník">
        <h3>🎓 Ďalší ročník</h3>
        <p class="rk-now">Teraz: ${label(mem)}</p>
        <p>Vyber ročník a polrok. ${cfg.app ? `Appka ${cfg.app} sa prestaví` : 'Appky sa prestavia'} na učivo podľa osnov. Výber platí pre všetky appky.</p>
        <div class="rk-grid">${opts.join('')}</div>
        <div class="rk-row"><button type="button" class="rk-no">Späť</button><button type="button" class="rk-yes" ${same(sel, mem) ? 'disabled' : ''}>Prejsť</button></div>
      </div>`;
      w.querySelector('.rk-opt[aria-pressed=true]')?.scrollIntoView?.({ block: 'nearest' });
    };
    w.addEventListener('click', (ev) => {
      if (ev.target === w || ev.target.closest('.rk-no')) { w.remove(); return; }
      const o = ev.target.closest('.rk-opt');
      if (o && o.classList.contains('ready')) { sel = { grade: +o.dataset.g, half: +o.dataset.h }; draw(); return; }
      if (ev.target.closest('.rk-yes')) {
        save(sel); w.remove();
        try { cfg.onChange?.(mem); } catch (e) { console.error(e); }
        window.dispatchEvent(new CustomEvent('rocnik-change', { detail: mem }));
      }
    });
    draw();
    document.body.appendChild(w);
  }

  function label(r = mem) { return `${r.grade}. ročník · ${r.half}. polrok`; }
  function isReady(r = mem) { return !cfg.ready.length || cfg.ready.some((x) => same(x, r)); }

  document.addEventListener('click', (ev) => { if (ev.target.closest?.('[data-rocnik]')) { ev.preventDefault(); open(); } });

  window.Rocnik = {
    setup(o) { cfg = { ...cfg, ...o }; return this.get(); },
    get() { return { ...mem }; },
    label,
    isReady,
    open,
    buttonHtml(extraClass = '') { return `<button type="button" class="rk-btn ${extraClass}" data-rocnik>🎓 Ďalší ročník</button>`; },
  };
})();
