// Demo mode only (VITE_DEMO=1): answers Supabase requests from memory, so the app
// can be tried as a standalone page. Any 6-digit PIN logs in; nothing is saved.
const USERS = [
  ['v', 'Viki', 'parent', 'viki@stullers.home'],
  ['p', 'Peto', 'parent', 'peto@stullers.home'],
  ['o', 'Oto', 'child', 'oto@stullers.home'],
  ['d', 'Dita', 'child', 'dita@stullers.home'],
] as const

const TASKS = [
  [1, 'Pripraviť horné poschodie na vysávanie', 5],
  [2, 'Pripraviť spodné poschodie na vysávanie', 5],
  [3, 'Povysávať schody', 4],
  [4, 'Povysávať gauč', 2],
  [5, 'Umyť záchod, sprchu a umývadlo', 10],
  [6, 'Umyť podlahu – chodba', 3],
  [7, 'Umyť podlahu – kuchyňa', 3],
  [8, 'Umyť podlahu – obývačka', 4],
  [9, 'Umyť podlahu – detská izba', 5],
  [10, 'Umyť podlahu – spálňa', 4],
  [11, 'Povysávať špajzu', 2],
  [12, 'Vyložiť umývačku', 7],
  [13, 'Naložiť umývačku', 10],
  [14, 'Upratať topánky', 3],
  [15, 'Vyniesť smeti', 2],
  [16, 'Vyložiť smetiak', 2],
  [17, 'Vyniesť kompost', 2],
  [18, 'Vyniesť papier', 2],
  [19, 'Vyniesť plasty', 2],
  [20, 'Dať Elenke jesť a piť', 2],
  [21, 'Zavesiť prádlo', 10],
  [22, 'Vyniesť prádlo', 2],
  [23, 'Dať prať', 10],
  [24, 'Povysávať celé auto', 10],
  [25, 'Upratať bicykle', 5],
  [26, 'Pozrieť prababku', 5],
].map(([code, name, xp]) => ({ id: 't' + code, code: code as number | null, name: name as string, xp: xp as number }))
// The 26 standing tasks plus one-off custom tasks created in the demo.
const ALL_TASKS = [...TASKS]

type Status = 'available' | 'waiting_for_approval' | 'completed' | 'rejected'
interface Row { id: string; task_id: string; user_id: string; status: Status; created_at: string; submitted_at: string | null; reviewed_at: string | null }

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()
let seq = 0
// [user, task code, status, approved how many days ago]
const rows: Row[] = ([
  ['o', 3, 'available', 0], ['o', 12, 'available', 0], ['o', 5, 'waiting_for_approval', 0],
  ['o', 20, 'completed', 1], ['o', 15, 'completed', 2], ['o', 13, 'completed', 3], ['o', 20, 'completed', 9],
  ['d', 3, 'available', 0], ['d', 14, 'available', 0], ['d', 1, 'waiting_for_approval', 0],
  ['d', 19, 'completed', 0], ['d', 21, 'completed', 1], ['d', 26, 'completed', 8],
  ['v', 23, 'available', 0], ['v', 13, 'waiting_for_approval', 0], ['v', 22, 'completed', 2],
  ['p', 24, 'available', 0], ['p', 17, 'completed', 4],
] as const).map(([user, code, status, daysAgo], i) => ({
  id: 'a' + ++seq, task_id: 't' + code, user_id: user, status,
  created_at: hoursAgo(daysAgo * 24 + 30 - i), submitted_at: status === 'available' ? null : hoursAgo(daysAgo * 24 + 2),
  reviewed_at: status === 'completed' ? hoursAgo(daysAgo * 24 + 1) : null,
}))
const xp: { user_id: string; xp: number; created_at: string }[] = rows.filter((r) => r.status === 'completed')
  .map((r) => ({ user_id: r.user_id, xp: ALL_TASKS.find((t) => t.id === r.task_id)!.xp, created_at: r.reviewed_at! }))

let me: string | null = null
const isParent = () => USERS.some(([id, , role]) => id === me && role === 'parent')
const authUser = (id: string) => {
  const u = USERS.find((x) => x[0] === id)!
  return { id, email: u[3], aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '' }
}
const json = (body: unknown, status = 200) =>
  new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const fail = (message: string) => json({ code: 'P0001', message }, 400)

function rpc(name: string, a: Record<string, unknown>) {
  const row = rows.find((r) => r.id === a.p_assignment)
  switch (name) {
    case 'submit_assignment':
      if (!row || row.user_id !== me || !['available', 'rejected'].includes(row.status)) return fail('Úlohu nie je možné odoslať.')
      row.status = 'waiting_for_approval'; row.submitted_at = new Date().toISOString(); return json(null, 204)
    case 'review_assignment':
      if (!isParent()) return fail('Schvaľovať môže iba rodič.')
      if (!row || row.status !== 'waiting_for_approval') return fail('Úloha nečaká na schválenie.')
      if (row.user_id === me) return fail('Vlastnú úlohu nemôžeš schváliť.')
      row.status = a.p_approve ? 'completed' : 'rejected'
      row.reviewed_at = new Date().toISOString()
      if (a.p_approve) xp.push({ user_id: row.user_id, xp: ALL_TASKS.find((t) => t.id === row.task_id)!.xp, created_at: row.reviewed_at })
      return json(null, 204)
    case 'reassign_assignment': {
      if (!row || row.status === 'completed') return fail('Túto úlohu nie je možné preradiť.')
      if (rows.some((r) => r.task_id === row.task_id && r.user_id === a.p_new_user && r.status !== 'completed' && r !== row))
        return fail('Tento člen už túto úlohu má.')
      if (!(isParent() || (row.user_id === me && ['available', 'rejected'].includes(row.status))))
        return fail('Túto úlohu môžeš preradiť iba ak je tvoja a ešte nie je odoslaná.')
      Object.assign(row, { user_id: a.p_new_user, status: 'available', submitted_at: null, reviewed_at: null }); return json(null, 204)
    }
    case 'create_custom_task': {
      if (!isParent()) return fail('Vlastnú úlohu môže zadať iba rodič.')
      const name = String(a.p_name ?? '').trim()
      if (name.length < 2 || name.length > 80) return fail('Názov úlohy musí mať 2 až 80 znakov.')
      if (!(Number(a.p_xp) >= 1 && Number(a.p_xp) <= 100)) return fail('XP musí byť od 1 do 100.')
      const id = 'c' + ++seq
      ALL_TASKS.push({ id, code: null, name, xp: Number(a.p_xp) })
      for (const u of a.p_users as string[])
        rows.unshift({ id: 'a' + ++seq, task_id: id, user_id: u, status: 'available', created_at: new Date().toISOString(), submitted_at: null, reviewed_at: null })
      return json(id)
    }
    case 'assign_task': {
      if (!isParent()) return fail('Prideľovať môže iba rodič.')
      let n = 0
      for (const u of a.p_users as string[]) {
        if (rows.some((r) => r.task_id === a.p_task && r.user_id === u && r.status !== 'completed')) continue
        rows.unshift({ id: 'a' + ++seq, task_id: a.p_task as string, user_id: u, status: 'available', created_at: new Date().toISOString(), submitted_at: null, reviewed_at: null }); n++
      }
      return json(n)
    }
  }
  return fail('Neznáma funkcia.')
}

export const demoFetch: typeof fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  const body = init?.body ? JSON.parse(init.body as string) : {}
  const p = url.pathname

  if (p.endsWith('/auth/v1/token')) {
    const u = USERS.find((x) => x[3] === body.email)
    if (!u || !/^\d{6}$/.test(body.password)) return json({ code: 'invalid_credentials', message: 'Invalid login credentials' }, 400)
    me = u[0]
    return json({ access_token: 'demo', refresh_token: 'demo', token_type: 'bearer', expires_in: 86400,
      expires_at: Math.floor(Date.now() / 1000) + 86400, user: authUser(me) })
  }
  if (p.endsWith('/auth/v1/logout')) { me = null; return json(null, 204) }
  if (p.endsWith('/auth/v1/user')) return me ? json(authUser(me)) : json({ message: 'no session' }, 401)
  if (p.includes('/rpc/')) return rpc(p.split('/rpc/')[1], body)
  if (p.endsWith('/profile_stats')) return json(USERS.map(([id, name, role]) => ({
    id, name, role, avatar_path: null,
    xp: xp.filter((x) => x.user_id === id).reduce((s, x) => s + x.xp, 0),
    completed_count: rows.filter((r) => r.user_id === id && r.status === 'completed').length,
  })))
  if (p.endsWith('/assignments')) return json([...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((r) => {
    const t = ALL_TASKS.find((x) => x.id === r.task_id)!
    return { ...r, tasks: { name: t.name, xp: t.xp, code: t.code } }
  }))
  if (p.endsWith('/tasks')) return json(TASKS)
  if (p.endsWith('/xp_transactions')) return json(xp)
  if (p.includes('/storage/')) return json({ message: 'V ukážke sa fotky neukladajú.' }, 400)
  return json([])
}
