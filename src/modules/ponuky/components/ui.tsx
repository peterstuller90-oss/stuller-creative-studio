import { useEffect, useState, type ReactNode } from 'react'
import { Icon } from './icons'

/** Built as a claude.ai artifact preview: no printing, no client links, in-memory navigation. */
export const ARTIFACT = import.meta.env.VITE_ARTIFACT === '1'

export function Logo({ width = 200, label = 'Ponuky' }: { width?: number; label?: string }) {
  return (
    <div className="brand-logo">
      <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Štullers" width={width} />
      {label && <span>{label}</span>}
    </div>
  )
}

export function Sheet({ onClose, title, children }: { onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet card" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Zavrieť"><Icon name="close" size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

let showToast: (msg: string) => void = () => {}
export const toast = (msg: string) => showToast(msg)

let showAsk: (msg: string, done: (ok: boolean) => void) => void = (_m, done) => done(false)
/** In-page replacement for confirm(), which some hosts (the artifact viewer) silently block. */
export const ask = (msg: string) => new Promise<boolean>((resolve) => showAsk(msg, resolve))

export function AskHost() {
  const [state, setState] = useState<{ msg: string; done: (ok: boolean) => void } | null>(null)
  useEffect(() => { showAsk = (msg, done) => setState({ msg, done }) }, [])
  if (!state) return null
  const close = (ok: boolean) => { state.done(ok); setState(null) }
  return (
    <Sheet title="Naozaj?" onClose={() => close(false)}>
      <p style={{ fontSize: 20 }}>{state.msg}</p>
      <div className="grid2">
        <button className="btn-secondary" onClick={() => close(false)}>Nie</button>
        <button className="btn-primary" onClick={() => close(true)}>Áno</button>
      </div>
    </Sheet>
  )
}

export function Toast() {
  const [msg, setMsg] = useState('')
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    showToast = (m) => { setMsg(m); clearTimeout(t); t = setTimeout(() => setMsg(''), 2600) }
    return () => clearTimeout(t)
  }, [])
  return msg ? <div id="toast" role="status">{msg}</div> : null
}

/** Number input that lets you type freely ("1," / empty) and reports a number. */
export function NumInput({ value, onChange, step = 'any', min, ...rest }: {
  value: number; onChange: (n: number) => void; step?: string; min?: number
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [text, setText] = useState(String(value))
  useEffect(() => {
    setText((t) => (parseFloat(t.replace(',', '.')) === value ? t : String(value)))
  }, [value])
  return (
    <input
      {...rest}
      inputMode="decimal"
      value={text}
      min={min}
      step={step}
      onChange={(e) => {
        setText(e.target.value)
        const n = parseFloat(e.target.value.replace(',', '.'))
        onChange(Number.isFinite(n) ? n : 0)
      }}
    />
  )
}

export { Icon } from './icons'
