// Cheerful game sounds in the spirit of Duolingo, synthesized live with Web Audio (no audio files,
// nothing copied). Phones only allow sound after the first tap, so the audio starts on that tap.
export type SoundName = 'tap' | 'correct' | 'send' | 'xp' | 'level' | 'badge' | 'wrong' | 'undo'

const STORE = 'stullers-sound'
let ctx: AudioContext | null = null

export function soundOn(): boolean {
  try { return localStorage.getItem(STORE) !== 'off' } catch { return true }
}

export function setSoundOn(on: boolean) {
  try { localStorage.setItem(STORE, on ? 'on' : 'off') } catch { /* private mode: stays on for this visit */ }
}

function audio(): AudioContext | null {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

// Called once from main.tsx. iPhone starts web audio only inside a real tap (touchend/click, not
// pointerdown) and only after something has played, so every tap until then plays a silent sample.
export function unlockAudioOnFirstTap() {
  const events = ['touchend', 'click', 'keydown'] as const
  const unlock = () => {
    const a = audio()
    if (!a) return
    const src = a.createBufferSource()
    src.buffer = a.createBuffer(1, 1, 22050)
    src.connect(a.destination)
    src.start(0)
    a.resume().then(() => {
      if (a.state === 'running') events.forEach((e) => window.removeEventListener(e, unlock, true))
    }).catch(() => {})
  }
  events.forEach((e) => window.addEventListener(e, unlock, true))
}

// One bell-like note: quick attack, soft exponential fade, a quiet octave on top for sparkle.
function note(a: AudioContext, freq: number, at: number, dur: number, type: OscillatorType = 'triangle', volume = 0.22) {
  const t = a.currentTime + at
  for (const [mult, vol] of [[1, volume], [2, volume * 0.18]] as const) {
    const osc = a.createOscillator()
    const gain = a.createGain()
    osc.type = mult === 1 ? type : 'sine'
    osc.frequency.setValueAtTime(freq * mult, t)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(gain).connect(a.destination)
    osc.start(t)
    osc.stop(t + dur + 0.05)
  }
}

function sweep(a: AudioContext, from: number, to: number, dur: number, volume = 0.12) {
  const t = a.currentTime
  const osc = a.createOscillator()
  const gain = a.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(from, t)
  osc.frequency.exponentialRampToValueAtTime(to, t + dur)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain).connect(a.destination)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

// Note frequencies (Hz).
const C5 = 523.25, E5 = 659.25, G5 = 783.99, A5 = 880, C6 = 1046.5, D6 = 1174.66, E6 = 1318.51, G6 = 1567.98, B6 = 1975.53, D7 = 2349.32
const A3 = 220, F3 = 174.61

const SOUNDS: Record<SoundName, (a: AudioContext) => void> = {
  // Soft pop for keys and tabs.
  tap: (a) => sweep(a, 900, 500, 0.07, 0.08),
  // The classic happy two-note "correct!" chime.
  correct: (a) => { note(a, D6, 0, 0.18); note(a, G6, 0.09, 0.45) },
  // Task sent for approval: a quick rise, then a ding.
  send: (a) => { sweep(a, 420, 1250, 0.16, 0.08); note(a, E6, 0.14, 0.4) },
  // XP gained: bright rising arpeggio.
  xp: (a) => { [C5, E5, G5, C6].forEach((f, i) => note(a, f, i * 0.07, 0.3)); note(a, E6, 0.3, 0.6, 'triangle', 0.18) },
  // Level up: arpeggio into a held major chord.
  level: (a) => {
    ;[C5, E5, G5, C6, E6].forEach((f, i) => note(a, f, i * 0.08, 0.28))
    ;[C6, E6, G6].forEach((f) => note(a, f, 0.45, 1.1, 'triangle', 0.13))
  },
  // New badge: twinkly sparkles.
  badge: (a) => { [G6, B6, D7, G6, D7].forEach((f, i) => note(a, f, i * 0.06, 0.25, 'sine', 0.12)); note(a, A5, 0, 0.5, 'triangle', 0.1) },
  // Wrong PIN: low friendly "bonk-bonk".
  wrong: (a) => { note(a, A3, 0, 0.16, 'square', 0.07); note(a, F3, 0.13, 0.28, 'square', 0.07) },
  // Task returned: gentle falling pair.
  undo: (a) => { note(a, G5, 0, 0.18); note(a, D6 / 2, 0.1, 0.3) },
}

export function play(name: SoundName) {
  if (!soundOn()) return
  const a = audio()
  if (a) SOUNDS[name](a)
}
