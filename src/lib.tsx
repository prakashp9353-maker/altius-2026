import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
const url = import.meta.env.VITE_SUPABASE_URL, key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const configured = Boolean(url && key)
export const supabase = createClient(url || 'http://localhost:54321', key || 'missing-key')
export const posterUrl = (p?: string | null) => p ? supabase.storage.from('event-posters').getPublicUrl(p).data.publicUrl : null
export const EVENT_DATE = new Date('2026-11-02T09:00:00+05:30')
export function useQuery<T = any[]>(fn: () => PromiseLike<{ data: any; error: any }>, deps: any[] = []) {
  const [s, set] = useState<{ data: T | null; loading: boolean; error: string | null }>({ data: null, loading: true, error: null })
  const [n, setN] = useState(0)
  useEffect(() => {
    let live = true
    if (!configured) { set({ data: null, loading: false, error: 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see README).' }); return }
    set(x => ({ ...x, loading: true }))
    fn().then(({ data, error }) => live && set({ data, loading: false, error: error?.message ?? null }))
    return () => { live = false }
  }, [...deps, n])
  return { ...s, reload: () => setN(x => x + 1) }
}
export function State({ q, empty, children }: { q: any; empty?: string; children: any }) {
  if (q.loading) return <p className="py-8 text-mute" role="status">Loading…</p>
  if (q.error) return <p className="rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300" role="alert">{q.error}</p>
  if (empty && (!q.data || q.data.length === 0)) return <p className="card p-6 text-center text-mute">{empty}</p>
  return children
}

export async function applyProvisionalScoring(data: any[]) {
  const provisional = await supabase.from('event_results')
    .select('winner_dept_id,runner_dept_id')
    .eq('status', 'approved')
    .eq('provisional', true)
  if (provisional.error) throw provisional.error

  const counts: Record<string, { winners: number; runners: number }> = {}
  for (const row of provisional.data ?? []) {
    if (row.winner_dept_id) {
      counts[row.winner_dept_id] ??= { winners: 0, runners: 0 }
      counts[row.winner_dept_id].winners++
    }
    if (row.runner_dept_id) {
      counts[row.runner_dept_id] ??= { winners: 0, runners: 0 }
      counts[row.runner_dept_id].runners++
    }
  }

  return (data ?? []).map((row: any) => {
    const removed = counts[row.department_id] ?? { winners: 0, runners: 0 }
    const firsts = Math.max(0, (row.firsts ?? 0) - removed.winners)
    const seconds = Math.max(0, (row.seconds ?? 0) - removed.runners)
    const winner_points = Math.max(0, (row.winner_points ?? 0) - removed.winners * 5)
    const runner_points = Math.max(0, (row.runner_points ?? 0) - removed.runners * 3)
    return { ...row, firsts, seconds, winner_points, runner_points,
      total_points: winner_points + runner_points + (row.participation_points ?? 0) + (row.bonus_points ?? 0) }
  }).sort((a: any, b: any) =>
    b.total_points - a.total_points || b.firsts - a.firsts || b.seconds - a.seconds || a.name.localeCompare(b.name))
}
