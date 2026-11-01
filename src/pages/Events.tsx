import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, useQuery, State } from '../lib'
import EventCard from '../components/EventCard'

export function EventsPage() {
  const ev = useQuery(() => supabase.from('events').select('*,departments(name,slug,sort_order)').eq('published', true).order('event_date'))
  const deps = useQuery(() => supabase.from('departments').select('id,name').order('sort_order'))
  const [q, setQ] = useState(''), [d, setD] = useState(''), [c, setC] = useState(''), [s, setS] = useState('')
  const groups = useMemo(() => {
    const f = (ev.data || []).filter((e: any) => (!d || e.department_id === d) && (!c || e.category === c) && (!s || e.status === s) && (!q || (e.title + e.tagline + e.description).toLowerCase().includes(q.toLowerCase())))
    const m = new Map<string, any[]>(); f.sort((a: any, b: any) => a.departments.sort_order - b.departments.sort_order).forEach((e: any) => m.set(e.departments.name, [...(m.get(e.departments.name) || []), e]))
    return [...m]
  }, [ev.data, q, d, c, s])
  return <div className="wrap py-10"><h1 className="mb-6 text-5xl">Events</h1>
    <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <input className="input" placeholder="Search events" aria-label="Search events" value={q} onChange={e => setQ(e.target.value)} />
      <select className="input" aria-label="Department" value={d} onChange={e => setD(e.target.value)}><option value="">All departments</option>{deps.data?.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <select className="input" aria-label="Category" value={c} onChange={e => setC(e.target.value)}><option value="">Technical & Non-Technical</option><option>Technical</option><option>Non-Technical</option></select>
      <select className="input" aria-label="Status" value={s} onChange={e => setS(e.target.value)}><option value="">Any status</option><option value="upcoming">Upcoming</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option></select>
    </div>
    <State q={ev} empty="No events have been published yet. Check back soon.">
      {groups.length === 0 ? <p className="card p-6 text-center text-mute">No events match your filters.</p> : groups.map(([name, list]) => <section key={name} className="mb-12"><h2 className="mb-4 border-b border-gold/30 pb-2 text-3xl">{name}</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{list.map(e => <EventCard key={e.id} e={e} />)}</div></section>)}
    </State></div>
}
export function DepartmentsPage() {
  const deps = useQuery(() => supabase.from('departments').select('*').order('sort_order'))
  return <div className="wrap py-10"><h1 className="mb-6 text-5xl">Departments</h1><State q={deps}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {deps.data?.map((d: any) => <Link key={d.id} to={`/departments/${d.slug}`} className="card p-5 hover:border-gold/60"><h3 className="text-2xl">{d.name}</h3><p className="text-sm text-mute">{d.description || 'View events'}</p></Link>)}</div></State></div>
}
export function DepartmentPage() {
  const { slug } = useParams()
  const dep = useQuery(() => supabase.from('departments').select('*').eq('slug', slug).maybeSingle(), [slug])
  const ev = useQuery(() => supabase.from('events').select('*,departments(name)').eq('published', true).eq('department_id', (dep.data as any)?.id ?? '00000000-0000-0000-0000-000000000000').order('event_date'), [dep.data])
  const d: any = dep.data, list: any[] = (ev.data as any) || []
  return <div className="wrap py-10"><State q={dep}>{!d ? <p>Department not found. <Link className="text-gold" to="/departments">Back to departments</Link></p> : <>
    <h1 className="text-5xl">{d.name}</h1><p className="mt-2 max-w-2xl text-mute">{d.description || 'Department introduction will be added by the organizers.'}</p>
    <p className="mt-2 text-gold">{list.length} event{list.length !== 1 && 's'}</p>
    {['Technical', 'Non-Technical'].map(cat => <section key={cat} className="mt-8"><h2 className="mb-3 text-3xl">{cat} Events</h2>
      {list.filter(e => e.category === cat).length === 0 ? <p className="card p-5 text-mute">No {cat.toLowerCase()} events published yet.</p>
        : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{list.filter(e => e.category === cat).map(e => <EventCard key={e.id} e={e} />)}</div>}</section>)}</>}</State></div>
}
