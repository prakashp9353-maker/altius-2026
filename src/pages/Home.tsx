import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Trophy, Users, Award, Cpu } from 'lucide-react'
import { supabase, useQuery, State, EVENT_DATE, applyProvisionalScoring } from '../lib'
import EventCard from '../components/EventCard'
import { Podium, Table } from './Info'

function Countdown() {
  const [t, setT] = useState(EVENT_DATE.getTime() - Date.now())
  useEffect(() => { const i = setInterval(() => setT(EVENT_DATE.getTime() - Date.now()), 1000); return () => clearInterval(i) }, [])
  if (t <= 0) return <p className="text-gold">ALTIUS 2026 is live</p>
  const v = [['Days', t / 864e5], ['Hours', (t / 36e5) % 24], ['Minutes', (t / 6e4) % 60], ['Seconds', (t / 1e3) % 60]]
  return <div className="flex gap-3" role="timer">{v.map(([l, n]: any) => <div key={l} className="card w-20 py-2 text-center"><div className="font-display text-3xl text-gold">{String(Math.floor(n)).padStart(2, '0')}</div><div className="text-xs text-mute">{l}</div></div>)}</div>
}
export default function Home() {
  const feat = useQuery(() => supabase.from('events').select('*,departments(name)').eq('published', true).eq('featured', true).limit(6))
  const lb = useQuery<any[]>(async () => {
    const result = await supabase.from('leaderboard').select('*').order('rank').order('name')
    if (result.error) return result
    try { return { data: await applyProvisionalScoring(result.data ?? []), error: null } }
    catch (error: any) { return { data: null, error } }
  })
  const wins = useQuery(() => supabase.from('event_results').select('*,events(title,department_id),w:departments!event_results_winner_dept_id_fkey(name)').eq('status', 'approved').order('updated_at', { ascending: false }).limit(5))
  const ann = useQuery(() => supabase.from('announcements').select('*').eq('published', true).lte('publish_at', new Date().toISOString()).order('publish_at', { ascending: false }).limit(3))
  const deps = useQuery(() => supabase.from('departments').select('name,slug').order('sort_order'))
  return <>
    <section className="wrap py-16 text-center">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="flex flex-col items-center gap-5">
        <h1 className="text-6xl font-bold tracking-wide text-white sm:text-8xl">ALTIUS <span className="text-gold">2026</span></h1>
        <p className="text-lg">Srinivas Institute of Technology, Valachil, Mangaluru</p>
        <p className="text-gold">2 November 2026</p>
        <Countdown />
        <p className="max-w-xl text-mute">One day, seventeen departments, one championship. Compete in technical and non-technical events, earn points for your department and collect e-certificates.</p>
        <div className="flex flex-wrap justify-center gap-3"><Link className="btn" to="/events">Browse Events</Link><Link className="btn-o" to="/guidelines">Student Guidelines</Link><Link className="btn-o" to="/leaderboard">Live Leaderboard</Link></div>
      </motion.div>
    </section>
    <section className="wrap grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[[Trophy, 'Department Championship'], [Users, 'Cross-Department Participation Bonus'], [Award, 'E-Certificates'], [Cpu, 'Technical and Non-Technical Events']].map(([I, t]: any) => <div key={t} className="card flex items-center gap-3 p-4"><I className="text-gold" /><span>{t}</span></div>)}
    </section>
    <section className="wrap mt-16"><h2 className="mb-4 text-4xl">Featured Events</h2>
      <State q={feat} empty="No featured events yet. The organizers will publish events soon."><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{feat.data?.map((e: any) => <EventCard key={e.id} e={e} />)}</div></State></section>
    <section className="wrap mt-16"><div className="mb-4 flex items-end justify-between"><h2 className="text-4xl">Leaderboard</h2><Link className="btn-o" to="/leaderboard">View Full Leaderboard</Link></div>
      <State q={lb}>{lb.data && <><Podium rows={lb.data} /><Table rows={lb.data.slice(0, 8)} /></>}</State></section>
    <section className="wrap mt-16 grid gap-8 md:grid-cols-2">
      <div><h2 className="mb-4 text-3xl">Recent Winners</h2><State q={wins} empty="No approved results yet.">{wins.data?.map((r: any) => {
        const points = r.winner_dept_id && r.winner_dept_id !== r.events?.department_id ? 5 : 0
        return <p key={r.id} className="card mb-2 p-3 text-sm"><b className="text-white">{r.events?.title}</b>: {r.w?.name} {r.winner_name && `(${r.winner_name})`} · {points} pts {r.provisional && <span className="ml-1 rounded bg-gold/20 px-1 text-xs text-gold">PROVISIONAL</span>}</p>
      })}</State></div>
      <div><h2 className="mb-4 text-3xl">Announcements</h2><State q={ann} empty="No announcements yet.">{ann.data?.map((a: any) => <div key={a.id} className="card mb-2 p-3"><b className="text-white">{a.important && '★ '}{a.title}</b><p className="text-sm text-mute">{a.body}</p></div>)}</State></div>
    </section>
    <section className="wrap mt-16"><h2 className="mb-4 text-3xl">Participating Departments</h2>
      <State q={deps}><div className="flex flex-wrap gap-2">{deps.data?.map((d: any) => <Link key={d.slug} to={`/departments/${d.slug}`} className="btn-o">{d.name}</Link>)}</div></State></section>
  </>
}
