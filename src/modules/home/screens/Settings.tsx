import type { SupabaseClient } from '@supabase/supabase-js'
import { Icon } from '../components/Icon'
import { FaceIdToggle } from '../components/FaceIdToggle'
import { PushToggle } from '../components/PushToggle'
import { SoundToggle } from '../components/SoundToggle'

const demo = import.meta.env.VITE_DEMO === '1'

// The demo page can't use Face ID or notifications, so it shows where they live in the real app.
function DemoNote({ icon, title }: { icon: string; title: string }) {
  return (
    <section className="card push-card">
      <div className="push-row">
        <span className="push-icon" aria-hidden="true">{icon}</span>
        <div className="task-main">
          <strong>{title}</strong>
          <span className="muted">Funguje v aplikácii v telefóne, v tejto ukážke nie.</span>
        </div>
      </div>
    </section>
  )
}

// Everything that changes how the app behaves on this device, in one place behind the gear icon.
export function Settings({ supabase, onBack, onSignOut }: { supabase: SupabaseClient; onBack: () => void; onSignOut: () => void }) {
  return (
    <>
      <button className="back-btn" onClick={onBack}>‹ Späť</button>
      <h1 className="page-title">Nastavenia</h1>

      <h2 className="section-title">Prihlásenie</h2>
      <FaceIdToggle supabase={supabase} />
      {demo && <DemoNote icon="🙂" title="Prihlásenie cez Face ID" />}

      <h2 className="section-title">Upozornenia</h2>
      <PushToggle supabase={supabase} />
      {demo && <DemoNote icon="🔔" title="Notifikácie" />}
      <SoundToggle />

      <h2 className="section-title">Účet</h2>
      <button className="btn-secondary" onClick={onSignOut}>
        <Icon name="logout" size={20} /> Odhlásiť sa
      </button>
    </>
  )
}
