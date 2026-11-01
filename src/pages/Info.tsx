import { useEffect, useState } from 'react'
import { Phone } from 'lucide-react'
import { supabase, useQuery, State } from '../lib'

const medal = ['text-gold', 'text-zinc-300', 'text-amber-600']
export function Podium({ rows }: { rows: any[] }) {
  const top = rows.filter(r => r.rank <= 3).slice(0, 3)
  if (!top.length || top.every(r => r.total_points === 0)) return <p className="card mb-4 p-5 text-center text-mute">Rankings will appear once results and points are approved.</p>
  const order = [top[1], top[0], top[2]].filter(Boolean)
  return <div className="mb-6 grid grid-cols-3 items-end gap-3">{order.map(r => <div key={r.department_id} className={`card p-4 text-center ${r === top[0] ? 'pb-10 border-gold' : ''}`}>
    <div className={`font-display text-4xl ${medal[Math.min(r.rank, 3) - 1]}`}>#{r.rank}</div><div className="font-semibold text-white">{r.name}</div><div className="text-2xl text-gold">{r.total_points}</div></div>)}</div>
}
export function Table({ rows }: { rows: any[] }) {
  return <div className="card overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead className="text-left text-mute"><tr>{['Rank', 'Department', 'Total', 'Winner', 'Runner-up', 'Participation', 'Bonus', 'Movement'].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
    <tbody>{rows.map(r => <tr key={r.department_id} className="border-t border-white/10"><td className="p-3 text-gold">{r.rank}</td><td className="p-3 text-white">{r.name}</td><td className="p-3 font-semibold">{r.total_points}</td><td className="p-3">{r.winner_points}</td><td className="p-3">{r.runner_points}</td><td className="p-3">{r.participation_points}</td><td className="p-3">{r.bonus_points}</td><td className="p-3 text-mute">–</td></tr>)}</tbody></table></div>
}
export function Leaderboard() {
  const lb = useQuery<any[]>(async () => {
    const { data, error } = await supabase.from('leaderboard').select('*').order('rank').order('name')
    if (error) return { data, error }
    const provisional = await supabase.from('event_results').select('winner_dept_id,runner_dept_id').eq('status', 'approved').eq('provisional', true)
    if (provisional.error) return { data: null, error: provisional.error }
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
    const rows = (data ?? []).map((row: any) => {
      const removed = counts[row.department_id] ?? { winners: 0, runners: 0 }
      const firsts = Math.max(0, (row.firsts ?? 0) - removed.winners)
      const seconds = Math.max(0, (row.seconds ?? 0) - removed.runners)
      const winner_points = Math.max(0, (row.winner_points ?? 0) - removed.winners * 5)
      const runner_points = Math.max(0, (row.runner_points ?? 0) - removed.runners * 3)
      return { ...row, firsts, seconds, winner_points, runner_points, total_points: winner_points + runner_points + (row.participation_points ?? 0) + (row.bonus_points ?? 0) }
    }).sort((a: any, b: any) => b.total_points - a.total_points || b.firsts - a.firsts || b.seconds - a.seconds || a.name.localeCompare(b.name))
    let rank = 0, previous = ''
    for (let i = 0; i < rows.length; i++) {
      const key = `${rows[i].total_points}:${rows[i].firsts}:${rows[i].seconds}`
      if (key !== previous) rank = i + 1
      rows[i].rank = rank
      previous = key
    }
    return { data: rows, error: null }
  })
  const res = useQuery(() => supabase.from('event_results').select('*,events(title),w:departments!event_results_winner_dept_id_fkey(name),r:departments!event_results_runner_dept_id_fkey(name)').eq('status', 'approved').eq('provisional', false).order('updated_at', { ascending: false }))

  useEffect(() => {
    const refresh = () => { lb.reload(); res.reload() }
    const interval = window.setInterval(refresh, 10000)
    const channel = supabase.channel('public-leaderboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_results' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participation_records' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bonus_records' }, refresh)
      .subscribe()
    return () => {
      window.clearInterval(interval)
      void supabase.removeChannel(channel)
    }
  }, [])

  const upd = lb.data?.[0]?.last_updated
  return <div className="wrap py-10"><h1 className="mb-2 text-5xl">Leaderboard</h1>
    <p className="mb-6 text-sm text-mute">Last updated: {upd ? new Date(upd).toLocaleString() : 'no score changes yet'}. Ties are broken by first-place finishes, then runner-up finishes; otherwise departments are joint champions.</p>
    <State q={lb}>{lb.data && <><Podium rows={lb.data} /><Table rows={lb.data} /></>}</State>
    <h2 className="mb-3 mt-12 text-3xl">Event-wise Results</h2>
    <State q={res} empty="No approved results yet.">{res.data?.map((r: any) => <div key={r.id} className="card mb-2 p-4 text-sm"><b className="text-white">{r.events?.title}</b> {r.provisional && <span className="ml-1 rounded bg-gold/20 px-1 text-xs text-gold">PROVISIONAL</span>}
      <p>🥇 {r.w?.name ?? '—'} {r.winner_name && `· ${r.winner_name}`}</p><p>🥈 {r.r?.name ?? '—'} {r.runner_name && `· ${r.runner_name}`}</p></div>)}</State></div>
}
export const DEFAULT_GUIDELINES = `## Department Responsibilities
- Each department must use the official poster template provided by the ALTIUS Organizing Committee and organize at least two events: one technical and one non-technical.
- Departments must share event details, posters, rules, schedules and registration information with the committee.
- Coordinators must maintain registration and attendance records and submit event results.
## Student Participation
- Students are encouraged to participate in events across departments, including their own department, subject to eligibility and scheduling.
- Participation in a student's own-department events does not count toward the cross-department bonus.
- Students must provide accurate registration information and follow coordinator instructions.
## Championship Points
- First place earns 5 points and second place earns 3 points.
- Only officially approved results count.
- Team placing points are awarded once to the represented department, not multiplied by team size.
- Participation points are credited individually to each eligible student's registered home department.
## Cross-Department Bonus
- A student's home department earns a one-time 5-point bonus for that student when the student has verified PRESENT participation in events hosted by at least 10 different other participating departments.
## Event Guidelines
- Arrive on time.
- Carry college ID.
- Follow event coordinator instructions.
- Maintain fair play, discipline and respect.
- Raise event-related issues with the event coordinator.
## Awards
- The department with the highest championship score is named the Overall Department Champion.
## Conduct and Decisions
- Maintain respectful conduct and discipline.
- Take care of college property and equipment.
- Report cheating or unfair practices.
- The ALTIUS Organizing Committee has the final say on matters not covered by these regulations.
## Tie-breaking
- More first-place finishes.
- More runner-up finishes.
- Joint champions unless another rule is approved beforehand.`
export function Guidelines() {
  const g = useQuery(() => supabase.from('site_settings').select('value').eq('key', 'guidelines').maybeSingle())
  const text = (g.data as any)?.value || DEFAULT_GUIDELINES
  return <div className="wrap max-w-3xl py-10"><h1 className="mb-6 text-5xl">Student Guidelines</h1>
    {text.split('\n').map((l: string, i: number) => l.startsWith('## ') ? <h2 key={i} className="mb-2 mt-8 text-3xl text-gold">{l.slice(3)}</h2> : l.startsWith('- ') ? <p key={i} className="mb-1 pl-4 before:mr-2 before:content-['•']">{l.slice(2)}</p> : <p key={i}>{l}</p>)}</div>
}
export function Announcements() {
  const a = useQuery(() => supabase.from('announcements').select('*').eq('published', true).lte('publish_at', new Date().toISOString()).order('publish_at', { ascending: false }))
  return <div className="wrap max-w-3xl py-10"><h1 className="mb-6 text-5xl">Announcements</h1><State q={a} empty="No announcements yet.">
    {a.data?.map((x: any) => <article key={x.id} className={`card mb-4 p-5 ${x.important ? 'border-gold' : ''}`}>{x.important && <span className="mb-1 inline-block rounded bg-gold px-2 text-xs font-semibold text-black">IMPORTANT</span>}
      <h2 className="text-2xl">{x.title}</h2><p className="text-xs text-mute">{new Date(x.publish_at).toLocaleDateString()}</p>
      {x.image_url && <img src={x.image_url} alt="" className="my-3 max-h-72 rounded" loading="lazy" />}<p className="mt-2 whitespace-pre-line">{x.body}</p>
      {x.attachment_url && <a className="mt-2 inline-block text-gold" href={x.attachment_url} target="_blank" rel="noopener noreferrer">Open attachment</a>}</article>)}</State></div>
}
export function Contact() {
  const people = [['Prof. Mohammad Gowspeer', 'ALTIUS Faculty Coordinator', '+917892217084', '+91 7892217084'], ['Chirag', 'Student Coordinator', '8147876219', '8147876219'], ['Jeevith C V', 'Student Coordinator', '9746896229', '9746896229']]
  return <div className="wrap max-w-3xl py-10"><h1 className="mb-6 text-5xl">Contact</h1>
    <p>Srinivas Institute of Technology, Valachil, Mangaluru.</p><p className="mb-6 text-gold">ALTIUS 2026 · 2 November 2026 · Venue: Srinivas Institute of Technology, Valachil, Mangaluru</p>
    <div className="grid gap-4 sm:grid-cols-2">{people.map(([n, r, t, d]) => <div key={n} className="card p-5"><h3 className="text-2xl">{n}</h3><p className="text-sm text-mute">{r}</p><a className="mt-2 inline-flex items-center gap-1 text-gold" href={`tel:${t}`}><Phone size={14} />{d}</a></div>)}</div></div>
}
