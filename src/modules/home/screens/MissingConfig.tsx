import { Logo } from '../components/Logo'
export function MissingConfig() {
  return (
    <main className="center-screen">
      <div className="card login-card">
        <Logo />
        <p className="muted">Aplikácia ešte nie je prepojená so Supabase, preto sa zatiaľ nedá prihlásiť.</p>
        <ol className="steps">
          <li>Skopíruj súbor <code>.env.example</code> na <code>.env</code>.</li>
          <li>Doplň <code>VITE_SUPABASE_URL</code> a <code>VITE_SUPABASE_ANON_KEY</code> zo Supabase (Project Settings → API).</li>
          <li>Reštartuj aplikáciu (<code>npm run dev</code>).</li>
        </ol>
      </div>
    </main>
  )
}
