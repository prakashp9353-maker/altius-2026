import { BrowserRouter, Routes, Route, Outlet, NavLink, Link, ScrollRestoration } from 'react-router-dom'
import { Menu, Phone } from 'lucide-react'
import { useState } from 'react'
import Home from './pages/Home'
import { EventsPage, DepartmentsPage, DepartmentPage } from './pages/Events'
import { Leaderboard, Guidelines, Announcements, Contact } from './pages/Info'
import { Login, Admin } from './pages/Admin'

const logos = [
  { name: 'Srinivas Group', src: '/logos/srinivas-group.png' },
  { name: 'SIT / ALTIUS', src: '/logos/altius.png' },
  { name: 'IEEE SIT Student Branch', src: '/logos/ieee-sit.png' },
  { name: 'IEEE Mangalore Subsection', src: '/logos/ieee-mangalore.png' },
  { name: 'IEEE Bangalore Section', src: '/logos/ieee-bangalore.png' },
  { name: "Institution's Innovation Council", src: '/logos/iic.png' },
  { name: 'NAAC', src: '/logos/naac.png' },
]
const nav = [['/', 'Home'], ['/events', 'Events'], ['/departments', 'Departments'], ['/leaderboard', 'Leaderboard'], ['/guidelines', 'Guidelines'], ['/announcements', 'Announcements'], ['/contact', 'Contact']]

function Layout() {
  const [open, setOpen] = useState(false)
  return <>
    <header className="border-b border-white/10 bg-black">
      <div className="wrap py-3 text-center">
        <p className="font-display text-xl font-semibold tracking-wide text-white sm:text-2xl">SRINIVAS INSTITUTE OF TECHNOLOGY</p>
        <p className="text-xs tracking-widest text-gold">VALACHIL, MANGALURU, KARNATAKA</p>
      </div>
      <div className="wrap flex flex-wrap items-center justify-center gap-3 pb-4" aria-label="Institutional logos">
  {logos.map(logo => (
    <div
      key={logo.name}
      title={logo.name}
      className="flex h-16 min-w-28 items-center justify-center rounded-md bg-white px-3 py-2"
    >
      <img
        src={logo.src}
        alt={logo.name}
        className="max-h-12 max-w-[150px] object-contain"
      />
    </div>
  ))}
</div>
    </header>
    <nav className="sticky top-0 z-20 border-b border-white/10 bg-ink/95 backdrop-blur">
      <div className="wrap flex items-center justify-between py-2">
        <Link to="/" className="font-display text-2xl font-bold text-gold">ALTIUS 2026</Link>
        <button className="md:hidden" aria-label="Toggle menu" onClick={() => setOpen(!open)}><Menu /></button>
        <ul className={`${open ? 'flex' : 'hidden'} absolute left-0 top-full w-full flex-col bg-ink p-4 md:static md:flex md:w-auto md:flex-row md:gap-5 md:p-0`}>
          {nav.map(([to, l]) => <li key={to}><NavLink to={to} end={to === '/'} onClick={() => setOpen(false)} className={({ isActive }) => `block py-1 text-sm ${isActive ? 'text-gold' : 'text-zinc-300 hover:text-white'}`}>{l}</NavLink></li>)}
          <li><NavLink to="/admin" className="btn-o !py-1">Admin Login</NavLink></li>
        </ul>
      </div>
    </nav>
    <main className="min-h-[60vh]"><Outlet /></main>
    <footer className="mt-16 border-t border-white/10 bg-black py-8 text-center text-sm text-mute">
      <p className="font-display text-lg text-white">Srinivas Institute of Technology</p>
      <p>Valachil, Mangaluru, Karnataka · ALTIUS 2026 · 2 November 2026</p>
      <p className="mt-2"><a className="inline-flex items-center gap-1 text-gold" href="tel:+918147876219"><Phone size={14} />+91 8147876219</a></p>
    </footer>
  </>
}
export default function App() {
  return <BrowserRouter><Routes>
    <Route element={<Layout />}>
      <Route path="/" element={<Home />} /><Route path="/events" element={<EventsPage />} />
      <Route path="/departments" element={<DepartmentsPage />} /><Route path="/departments/:slug" element={<DepartmentPage />} />
      <Route path="/leaderboard" element={<Leaderboard />} /><Route path="/guidelines" element={<Guidelines />} />
      <Route path="/announcements" element={<Announcements />} /><Route path="/contact" element={<Contact />} />
      <Route path="/admin/login" element={<Login />} />
    </Route>
    <Route path="/admin/*" element={<Admin />} />
  </Routes></BrowserRouter>
}
