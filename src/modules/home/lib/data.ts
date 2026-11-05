import type { SupabaseClient } from '@supabase/supabase-js'
import { FAMILY, type Role } from './family'
import type { TaskItemData } from '../components/TaskItem'
import type { Completion, XpEntry } from './gamification'

export interface ProfileStats {
  id: string
  name: string
  role: Role
  avatarUrl?: string
  xp: number
  completedCount: number
}

export interface TaskDef {
  id: string
  code: number | null
  name: string
  xp: number
}

export interface Approval {
  id: string
  userId: string
  name: string
  xp: number
  submittedAt: string
}

export interface FamilyData {
  profiles: ProfileStats[]
  myTasks: TaskItemData[]
  // Who has each task definition open (task id -> user ids).
  assigneesByTask: Map<string, string[]>
  tasks: TaskDef[]
  approvals: Approval[]
  // Approved tasks and XP history of the whole family, for levels, streaks, badges and the leaderboard.
  completions: Completion[]
  xpLog: XpEntry[]
}

interface StatsRow {
  id: string
  name: string
  role: Role
  avatar_path: string | null
  xp: number
  completed_count: number
}

interface AssignmentRow {
  id: string
  task_id: string
  user_id: string
  status: TaskItemData['status']
  created_at: string
  submitted_at: string | null
  reviewed_at: string | null
  tasks: { name: string; xp: number; code: number | null } | null
}

export async function loadFamilyData(supabase: SupabaseClient, userId: string): Promise<FamilyData> {
  const [stats, assignments, tasks, xpRows] = await Promise.all([
    supabase.from('profile_stats').select('*').returns<StatsRow[]>(),
    supabase.from('assignments').select('id, task_id, user_id, status, created_at, submitted_at, reviewed_at, tasks(name, xp, code)')
      .order('created_at', { ascending: false }).returns<AssignmentRow[]>(),
    supabase.from('tasks').select('id, code, name, xp').eq('active', true).order('code').returns<TaskDef[]>(),
    supabase.from('xp_transactions').select('user_id, xp, created_at')
      .returns<{ user_id: string; xp: number; created_at: string }[]>(),
  ])
  if (stats.error) throw stats.error
  if (assignments.error) throw assignments.error
  if (tasks.error) throw tasks.error
  if (xpRows.error) throw xpRows.error

  // Avatars live in a private bucket, so each one needs a short-lived signed URL.
  const paths = stats.data.map((p) => p.avatar_path).filter((p): p is string => !!p)
  const urls = new Map<string, string>()
  if (paths.length) {
    const { data } = await supabase.storage.from('avatars').createSignedUrls(paths, 60 * 60)
    data?.forEach((d) => d.path && d.signedUrl && urls.set(d.path, d.signedUrl))
  }

  const order = (name: string) => FAMILY.findIndex((m) => m.name === name) >>> 0
  const sorted = [...stats.data].sort((a, b) => order(a.name) - order(b.name))

  return {
    profiles: sorted.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      avatarUrl: p.avatar_path ? urls.get(p.avatar_path) : undefined,
      xp: p.xp,
      completedCount: p.completed_count,
    })),
    myTasks: assignments.data.filter((a) => a.user_id === userId).map((a) => ({
      id: a.id,
      taskId: a.task_id,
      code: a.tasks?.code ?? null,
      name: a.tasks?.name ?? '—',
      xp: a.tasks?.xp ?? 0,
      status: a.status,
      assignedAt: a.created_at,
    })),
    assigneesByTask: groupAssignees(assignments.data),
    tasks: tasks.data,
    approvals: assignments.data.filter((a) => a.status === 'waiting_for_approval').map((a) => ({
      id: a.id,
      userId: a.user_id,
      name: a.tasks?.name ?? '—',
      xp: a.tasks?.xp ?? 0,
      submittedAt: a.submitted_at ?? a.created_at,
    })),
    completions: assignments.data.filter((a) => a.status === 'completed').map((a) => ({
      userId: a.user_id,
      code: a.tasks?.code ?? null,
      at: a.reviewed_at ?? a.submitted_at ?? a.created_at,
    })),
    xpLog: xpRows.data.map((x) => ({ userId: x.user_id, xp: x.xp, at: x.created_at })),
  }
}

function groupAssignees(rows: AssignmentRow[]) {
  const result = new Map<string, string[]>()
  for (const a of rows) {
    if (a.status === 'completed') continue
    result.set(a.task_id, [...(result.get(a.task_id) ?? []), a.user_id])
  }
  return result
}

// Shrinks a phone photo to a small JPEG before upload (iPhone photos are several MB).
async function toAvatarJpeg(file: File, size = 512): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  canvas.getContext('2d')!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Obrázok sa nepodarilo spracovať.'))), 'image/jpeg', 0.85))
}

export async function uploadAvatar(supabase: SupabaseClient, userId: string, file: File) {
  const blob = await toAvatarJpeg(file)
  // A new file name per upload avoids stale cached images.
  const path = `${userId}/avatar-${Date.now()}.jpg`
  const { error } = await supabase.storage.from('avatars').upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  const { error: dbError } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', userId)
  if (dbError) throw dbError

  const { data: old } = await supabase.storage.from('avatars').list(userId)
  const stale = (old ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== path)
  if (stale.length) await supabase.storage.from('avatars').remove(stale)
}
