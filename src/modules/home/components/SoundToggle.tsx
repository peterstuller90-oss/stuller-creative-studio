import { useState } from 'react'
import { play, setSoundOn, soundOn } from '../lib/sound'

export function SoundToggle() {
  const [on, setOn] = useState(soundOn)

  function toggle() {
    setSoundOn(!on)
    setOn(!on)
    if (!on) play('correct')
  }

  return (
    <section className="card push-card">
      <div className="push-row">
        <span className="push-icon" aria-hidden="true">{on ? '🔊' : '🔇'}</span>
        <div className="task-main">
          <strong>Zvuky</strong>
          <span className="muted">{on ? 'Cinknutia pri úlohách, XP a leveloch.' : 'Zvuky sú na tomto zariadení vypnuté.'}</span>
        </div>
      </div>
      <button className={on ? 'btn-secondary' : 'btn-primary'} onClick={toggle}>{on ? 'Vypnúť zvuky' : 'Zapnúť zvuky'}</button>
    </section>
  )
}
