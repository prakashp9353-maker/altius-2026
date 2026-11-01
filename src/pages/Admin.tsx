import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, useQuery, State, posterUrl, configured } from '../lib'
import { DEFAULT_GUIDELINES } from './Info'

export function Login() {
  const nav = useNavigate(); const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  async function go(e: any) {
    e.preventDefault(); setBusy(true); setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    setBusy(false); error ? setErr(error.message) : nav('/admin')
  }
  return <div className="wrap max-w-sm py-16"><h1 className="mb-6 text-4xl">Admin Login</h1>
    {!configured && <p className="mb-4 text-sm text-red-300">Supabase is not configured yet. See README.</p>}
    <form onSubmit={go} className="space-y-3"><input className="input" type="email" required placeholder="Email" aria-label="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input className="input" type="password" required placeholder="Password" aria-label="Password" value={pw} onChange={e => setPw(e.target.value)} />
      {err && <p role="alert" className="text-sm text-red-300">{err}</p>}<button className="btn w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form></div>
}

function useDeps() { return useQuery(() => supabase.from('departments').select('*').order('sort_order')) }
function Msg({ m }: { m: string }) { return m ? <p role="status" className="mb-3 rounded bg-gold/10 p-2 text-sm text-gold">{m}</p> : null }
const L = ({ t, children }: any) => <label className="block text-xs text-mute">{t}{children}</label>
const DeptSelect = ({ deps, v, on, ...r }: any) => <select className="input" required={r.required} value={v ?? ''} onChange={e => on(e.target.value)}><option value="">Select department</option>{deps?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>

const blank = { title: '', department_id: '', category: 'Technical', tagline: '', description: '', event_date: '', start_time: '', end_time: '', venue: '', form_url: '', rules: '', entry_fee: '', contact_person: '', contact_phone: '', status: 'upcoming', featured: false, published: false }
function EventsAdmin() {
  const deps = useDeps(), ev = useQuery(() => supabase.from('events').select('*,departments(name)').order('created_at', { ascending: false }))
  const [f, setF] = useState<any>(blank), [file, setFile] = useState<File | null>(null), [m, setM] = useState('')
  const set = (k: string, v: any) => setF({ ...f, [k]: v })
  async function save(e: any) {
    e.preventDefault(); setM('')
    if (!/^https?:\/\//i.test(f.form_url || 'https://') ) return setM('Registration link must start with http(s)://')
    const oldPosterPath = f.poster_path ?? null
    let poster_path = oldPosterPath
    let newlyUploadedPath: string | null = null
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setM('Poster must be JPG, PNG or WebP.')
      if (file.size > 5 * 1024 * 1024) return setM('Poster must be under 5 MB.')
      const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp'
      const path = `${crypto.randomUUID()}.${ext}`
      const up = await supabase.storage.from('event-posters').upload(path, file, { contentType: file.type })
      if (up.error) return setM(up.error.message)
      newlyUploadedPath = path
      poster_path = path
    }
    const { id, departments, created_at, updated_at, ...rest } = f
    const row: any = { ...rest, poster_path }; for (const k of ['event_date', 'start_time', 'end_time', 'form_url']) if (!row[k]) row[k] = null
    const { error } = id ? await supabase.from('events').update(row).eq('id', id) : await supabase.from('events').insert(row)
    if (error) {
      if (newlyUploadedPath) await supabase.storage.from('event-posters').remove([newlyUploadedPath])
      return setM(error.message)
    }
    // Remove the previous image only after the database points to the replacement.
    if (newlyUploadedPath && oldPosterPath) await supabase.storage.from('event-posters').remove([oldPosterPath])
    setM(id ? 'Event updated.' : 'Event created.'); setF(blank); setFile(null); ev.reload()
  }
  async function del(x: any) {
    if (!confirm(`Delete "${x.title}"? This removes its poster and results.`)) return
    const { error } = await supabase.from('events').delete().eq('id', x.id)
    if (error) return setM(error.message)
    if (x.poster_path) await supabase.storage.from('event-posters').remove([x.poster_path]); setM('Event deleted.'); ev.reload()
  }
  return <div><Msg m={m} /><form onSubmit={save} className="card mb-6 grid gap-3 p-4 sm:grid-cols-2">
    <L t="Title *"><input className="input" required minLength={3} value={f.title} onChange={e => set('title', e.target.value)} /></L>
    <L t="Department *"><DeptSelect required deps={deps.data} v={f.department_id} on={(v: string) => set('department_id', v)} /></L>
    <L t="Category"><select className="input" value={f.category} onChange={e => set('category', e.target.value)}><option>Technical</option><option>Non-Technical</option></select></L>
    <L t="Status"><select className="input" value={f.status} onChange={e => set('status', e.target.value)}><option value="upcoming">Upcoming</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option></select></L>
    <L t="Tagline"><input className="input" value={f.tagline ?? ''} onChange={e => set('tagline', e.target.value)} /></L>
    <L t="Venue"><input className="input" value={f.venue ?? ''} onChange={e => set('venue', e.target.value)} /></L>
    <L t="Date"><input className="input" type="date" value={f.event_date ?? ''} onChange={e => set('event_date', e.target.value)} /></L>
    <div className="grid grid-cols-2 gap-2"><L t="Start"><input className="input" type="time" value={f.start_time ?? ''} onChange={e => set('start_time', e.target.value)} /></L><L t="End"><input className="input" type="time" value={f.end_time ?? ''} onChange={e => set('end_time', e.target.value)} /></L></div>
    <L t="Google Form URL"><input className="input" type="url" value={f.form_url ?? ''} onChange={e => set('form_url', e.target.value)} /></L>
    <L t="Entry fee"><input className="input" value={f.entry_fee ?? ''} onChange={e => set('entry_fee', e.target.value)} /></L>
    <L t="Contact person"><input className="input" value={f.contact_person ?? ''} onChange={e => set('contact_person', e.target.value)} /></L>
    <L t="Contact number"><input className="input" value={f.contact_phone ?? ''} onChange={e => set('contact_phone', e.target.value)} /></L>
    <L t="Description"><textarea className="input" rows={3} value={f.description ?? ''} onChange={e => set('description', e.target.value)} /></L>
    <L t="Rules and regulations"><textarea className="input" rows={3} value={f.rules ?? ''} onChange={e => set('rules', e.target.value)} /></L>
    <L t="Poster (JPG/PNG/WebP, max 5 MB)"><input className="input" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setFile(e.target.files?.[0] ?? null)} /></L>
    {(file || f.poster_path) && <img alt="Poster preview" className="h-32 rounded" src={file ? URL.createObjectURL(file) : posterUrl(f.poster_path)!} />}
    <div className="flex gap-4 text-sm"><label><input type="checkbox" checked={f.featured} onChange={e => set('featured', e.target.checked)} /> Featured</label><label><input type="checkbox" checked={f.published} onChange={e => set('published', e.target.checked)} /> Published</label></div>
    <div className="flex gap-2 sm:col-span-2"><button className="btn">{f.id ? 'Save changes' : 'Create event'}</button>{f.id && <button type="button" className="btn-o" onClick={() => { setF(blank); setFile(null) }}>Cancel</button>}</div></form>
    <State q={ev} empty="No events yet. Create the first one above.">{ev.data?.map((x: any) => <div key={x.id} className="card mb-2 flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
      <span><b className="text-white">{x.title}</b> · {x.departments?.name} · {x.published ? 'Published' : 'Draft'}{x.featured && ' · Featured'}</span>
      <span className="flex gap-2"><button className="btn-o" onClick={() => { setF(x); window.scrollTo(0, 0) }}>Edit</button><button className="btn-o" onClick={() => del(x)}>Delete</button></span></div>)}</State></div>
}

function ResultsAdmin() {
  const deps = useDeps(), evs = useQuery(() => supabase.from('events').select('id,title').order('title')), rs = useQuery(() => supabase.from('event_results').select('*,events(title),w:departments!event_results_winner_dept_id_fkey(name),r:departments!event_results_runner_dept_id_fkey(name)').order('updated_at', { ascending: false }))
  const blankR = { event_id: '', winner_dept_id: '', runner_dept_id: '', winner_name: '', runner_name: '', status: 'pending', provisional: true }
  const [f, setF] = useState<any>(blankR), [m, setM] = useState('')
  const set = (k: string, v: any) => setF({ ...f, [k]: v })
  async function save(e: any) {
  e.preventDefault()
  const row = { ...f, winner_dept_id: f.winner_dept_id || null, runner_dept_id: f.runner_dept_id || null }
  const { error } = await supabase.from('event_results').upsert(row, { onConflict: 'event_id' })
  if (error) return setM(error.message)
  setM('Result saved. Points update automatically (5 winner, 3 runner-up, once per placing).')
  setF(blankR)
  rs.reload()
}
  return <div><Msg m={m} /><form onSubmit={save} className="card mb-6 grid gap-3 p-4 sm:grid-cols-2">
    <L t="Event *"><select className="input" required value={f.event_id} onChange={e => set('event_id', e.target.value)}><option value="">Select event</option>{evs.data?.map((x: any) => <option key={x.id} value={x.id}>{x.title}</option>)}</select></L>
    <L t="Status"><select className="input" value={f.status} onChange={e => set('status', e.target.value)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></L>
    <L t="Winner department"><DeptSelect deps={deps.data} v={f.winner_dept_id} on={(v: string) => set('winner_dept_id', v)} /></L>
    <L t="Runner-up department"><DeptSelect deps={deps.data} v={f.runner_dept_id} on={(v: string) => set('runner_dept_id', v)} /></L>
    <L t="Winner / team name"><input className="input" value={f.winner_name ?? ''} onChange={e => set('winner_name', e.target.value)} /></L>
    <L t="Runner-up / team name"><input className="input" value={f.runner_name ?? ''} onChange={e => set('runner_name', e.target.value)} /></L>
    <label className="text-sm"><input type="checkbox" checked={f.provisional} onChange={e => set('provisional', e.target.checked)} /> Mark as PROVISIONAL</label>
    <button className="btn">Save result</button></form>
    <State q={rs} empty="No results entered yet.">{rs.data?.map((x: any) => <div key={x.id} className="card mb-2 flex flex-wrap items-center justify-between gap-2 p-3 text-sm"><span><b className="text-white">{x.events?.title}</b> · 🥇 {x.w?.name ?? '—'} · 🥈 {x.r?.name ?? '—'} · {x.status}</span>
      <button className="btn-o" onClick={() => { const { events, w, r, created_at, updated_at, ...rest } = x; setF(rest); window.scrollTo(0, 0) }}>Edit</button></div>)}</State></div>
}

function Records({ kind }: { kind: 'participation' | 'bonus' }) {
  const P = kind === 'participation', table = P ? 'participation_records' : 'bonus_records', col = P ? 'eligible_count' : 'recipients'
  const deps = useDeps(), evs = useQuery(() => supabase.from('events').select('id,title').order('title'))
  const rs = useQuery(() => supabase.from(table).select('*,departments(name)').order('created_at', { ascending: false }))
  const [dep, setDep] = useState(''), [evId, setEvId] = useState(''), [label, setLabel] = useState(''), [n, setN] = useState('0'), [m, setM] = useState('')
  async function save(e: any) {
    e.preventDefault()
    const row: any = P ? { department_id: dep, event_id: evId || null, period_label: label, eligible_count: +n } : { department_id: dep, reference_label: label, recipients: +n }
    const { error } = await supabase.from(table).insert(row)
    setM(error ? (error.code === '23505' ? 'A record already exists for this department and event/reporting period. Edit it instead, or use a different reporting label if a second report is authorized.' : error.message) : `Saved. ${n} × ${P ? 1 : 5} = ${+n * (P ? 1 : 5)} points.`)
    if (!error) { setN('0'); setLabel(''); rs.reload() }
  }
  async function edit(x: any) { const v = prompt(`New ${P ? 'eligible participant count' : 'bonus recipient count'}`, x[col]); if (v === null || isNaN(+v) || +v < 0) return; const { error } = await supabase.from(table).update({ [col]: +v }).eq('id', x.id); setM(error ? error.message : 'Record updated.'); rs.reload() }
  async function del(x: any) { if (!confirm('Delete this record?')) return; const { error } = await supabase.from(table).delete().eq('id', x.id); setM(error ? error.message : 'Record deleted.'); rs.reload() }
  return <div><Msg m={m} /><form onSubmit={save} className="card mb-6 grid gap-3 p-4 sm:grid-cols-2">
    <L t="Department *"><DeptSelect required deps={deps.data} v={dep} on={setDep} /></L>
    {P && <L t="Event (optional)"><select className="input" value={evId} onChange={e => setEvId(e.target.value)}><option value="">None (reporting period)</option>{evs.data?.map((x: any) => <option key={x.id} value={x.id}>{x.title}</option>)}</select></L>}
    <L t={P ? 'Reporting period (required if no event)' : 'Reference label (e.g. Final verification) *'}><input className="input" required={!P || !evId} value={label} onChange={e => setLabel(e.target.value)} /></L>
    <L t={P ? 'Verified eligible participants (1 pt each)' : 'Approved bonus recipients (5 pts each)'}><input className="input" type="number" min={0} required value={n} onChange={e => setN(e.target.value)} /></L>
    <button className="btn sm:col-span-2">Save record</button></form>
    <State q={rs} empty="No records yet.">{rs.data?.map((x: any) => <div key={x.id} className="card mb-2 flex flex-wrap items-center justify-between gap-2 p-3 text-sm"><span><b className="text-white">{x.departments?.name}</b> · {x.period_label || x.reference_label || 'event'} · {x[col]} → {x[col] * (P ? 1 : 5)} pts</span>
      <span className="flex gap-2"><button className="btn-o" onClick={() => edit(x)}>Edit</button><button className="btn-o" onClick={() => del(x)}>Delete</button></span></div>)}</State></div>
}

function AnnAdmin() {
  const a = useQuery(() => supabase.from('announcements').select('*').order('publish_at', { ascending: false }))
  const b = { title: '', body: '', image_url: '', attachment_url: '', important: false, published: false, publish_at: new Date().toISOString().slice(0, 16) }
  const [f, setF] = useState<any>(b), [m, setM] = useState(''); const set = (k: string, v: any) => setF({ ...f, [k]: v })
  async function save(e: any) {
    e.preventDefault(); const { id, created_at, ...rest } = f
    const row = { ...rest, image_url: rest.image_url || null, attachment_url: rest.attachment_url || null, publish_at: new Date(rest.publish_at).toISOString() }
    const { error } = id ? await supabase.from('announcements').update(row).eq('id', id) : await supabase.from('announcements').insert(row)
    if (error) return setM(error.message); setM('Announcement saved.'); setF(b); a.reload()
  }
  async function del(x: any) { if (!confirm('Delete announcement?')) return; await supabase.from('announcements').delete().eq('id', x.id); setM('Announcement deleted.'); a.reload() }
  return <div><Msg m={m} /><form onSubmit={save} className="card mb-6 grid gap-3 p-4">
    <input className="input" required placeholder="Title" value={f.title} onChange={e => set('title', e.target.value)} />
    <textarea className="input" rows={3} placeholder="Description" value={f.body} onChange={e => set('body', e.target.value)} />
    <input className="input" type="url" placeholder="Image URL (optional)" value={f.image_url ?? ''} onChange={e => set('image_url', e.target.value)} />
    <input className="input" type="url" placeholder="Attachment URL (optional)" value={f.attachment_url ?? ''} onChange={e => set('attachment_url', e.target.value)} />
    <input className="input" type="datetime-local" value={f.publish_at?.slice(0, 16)} onChange={e => set('publish_at', e.target.value)} />
    <div className="flex gap-4 text-sm"><label><input type="checkbox" checked={f.important} onChange={e => set('important', e.target.checked)} /> Important</label><label><input type="checkbox" checked={f.published} onChange={e => set('published', e.target.checked)} /> Published</label></div>
    <button className="btn">{f.id ? 'Save changes' : 'Add announcement'}</button></form>
    <State q={a} empty="No announcements yet.">{a.data?.map((x: any) => <div key={x.id} className="card mb-2 flex items-center justify-between p-3 text-sm"><span><b className="text-white">{x.title}</b> · {x.published ? 'Published' : 'Draft'}</span>
      <span className="flex gap-2"><button className="btn-o" onClick={() => { setF({ ...x, publish_at: new Date(x.publish_at).toISOString().slice(0, 16) }); window.scrollTo(0, 0) }}>Edit</button><button className="btn-o" onClick={() => del(x)}>Delete</button></span></div>)}</State></div>
}

function DeptAdmin() {
  const d = useDeps(), [m, setM] = useState('')
  async function save(x: any, desc: string) { const { error } = await supabase.from('departments').update({ description: desc }).eq('id', x.id); setM(error ? error.message : `${x.name} updated.`) }
  return <div><Msg m={m} /><p className="mb-3 text-sm text-mute">The 17 departments are fixed by the database (unique names and slugs). You can edit descriptions.</p>
    <State q={d}>{d.data?.map((x: any) => <form key={x.id} className="card mb-2 p-3" onSubmit={(e: any) => { e.preventDefault(); save(x, e.target.desc.value) }}><b className="text-white">{x.name}</b>
      <textarea name="desc" className="input mt-1" rows={2} defaultValue={x.description} /><button className="btn-o mt-2">Save</button></form>)}</State></div>
}
function GuideAdmin() {
  const g = useQuery(() => supabase.from('site_settings').select('value').eq('key', 'guidelines').maybeSingle()); const [t, setT] = useState(''), [m, setM] = useState('')
  useEffect(() => { if (!g.loading) setT((g.data as any)?.value || DEFAULT_GUIDELINES) }, [g.loading])
  async function save() { const { error } = await supabase.from('site_settings').upsert({ key: 'guidelines', value: t, updated_at: new Date().toISOString() }); setM(error ? error.message : 'Guidelines saved.') }
  return <div><Msg m={m} /><p className="mb-2 text-sm text-mute">Use "## Heading" for sections and "- " for bullet points.</p><textarea className="input" rows={22} value={t} onChange={e => setT(e.target.value)} /><button className="btn mt-3" onClick={save}>Save guidelines</button></div>
}
function Overview() {
  const c = (t: string, f?: (q: any) => any) => useQuery(() => { let q: any = supabase.from(t).select('id', { count: 'exact', head: true }); return f ? f(q) : q })
  const d = c('departments'), e = c('events'), p = c('events', q => q.eq('published', true)), r = c('event_results', q => q.eq('status', 'approved'))
  const lb = useQuery(() => supabase.from('leaderboard').select('name,total_points,rank').order('rank').limit(5))
  const log = useQuery(() => supabase.from('score_audit_logs').select('*').order('changed_at', { ascending: false }).limit(15))
  const counts = (q: any) => q.count ?? 0
  const tiles = [['Departments', counts(d)], ['Events', counts(e)], ['Published', counts(p)], ['Drafts', counts(e) - counts(p)], ['Approved results', counts(r)]]
  return <div><div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">{tiles.map(([l, v]) => <div key={l as string} className="card p-3 text-center"><div className="font-display text-3xl text-gold">{v as number}</div><div className="text-xs text-mute">{l}</div></div>)}</div>
    <h3 className="mb-2 text-2xl">Top departments</h3><State q={lb}>{lb.data?.map((x: any) => <p key={x.name} className="text-sm">#{x.rank} {x.name} — {x.total_points}</p>)}</State>
    <h3 className="mb-2 mt-6 text-2xl">Score audit history</h3><State q={log} empty="No score changes yet.">{log.data?.map((x: any) => <p key={x.id} className="card mb-1 p-2 text-xs">{new Date(x.changed_at).toLocaleString()} · {x.action} on {x.table_name}</p>)}</State></div>
}

const tabs: [string, string, any][] = [['overview', 'Overview', Overview], ['events', 'Events', EventsAdmin], ['results', 'Results', ResultsAdmin], ['participation', 'Participation', () => <Records kind="participation" />], ['bonus', 'Bonus', () => <Records kind="bonus" />], ['announcements', 'Announcements', AnnAdmin], ['departments', 'Departments', DeptAdmin], ['guidelines', 'Guidelines', GuideAdmin]]
export function Admin() {
  const nav = useNavigate(); const [state, setState] = useState<'loading' | 'ok' | 'denied'>('loading'); const [tab, setTab] = useState('overview')
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession(); if (!data.session) return nav('/admin/login')
      const { data: row } = await supabase.from('admin_profiles').select('user_id').eq('user_id', data.session.user.id).maybeSingle()
      setState(row ? 'ok' : 'denied')
    })()
  }, [])
  if (state === 'loading') return <p className="p-8 text-mute">Checking access…</p>
  if (state === 'denied') return <div className="p-8"><p>This account is not an authorized administrator.</p><button className="btn mt-3" onClick={async () => { await supabase.auth.signOut(); nav('/admin/login') }}>Sign out</button></div>
  const Cur = tabs.find(t => t[0] === tab)![2]
  return <div className="wrap py-6"><div className="mb-4 flex items-center justify-between"><h1 className="text-3xl">ALTIUS Admin</h1><span className="flex gap-2"><Link className="btn-o" to="/">View site</Link><button className="btn-o" onClick={async () => { await supabase.auth.signOut(); nav('/admin/login') }}>Sign out</button></span></div>
    <div className="mb-6 flex flex-wrap gap-2">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={k === tab ? 'btn' : 'btn-o'}>{l}</button>)}</div><Cur /></div>
}
