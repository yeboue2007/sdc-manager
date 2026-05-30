'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentProfile, ROLE_ACCESS, ROLE_LABELS, UserProfile, UserRole } from '@/lib/auth'
import {
  LayoutDashboard, CreditCard, Package, UtensilsCrossed,
  Users, Receipt, BarChart3, Ticket, Bell, Menu, X,
  LogOut, Settings, ShieldAlert, Loader2
} from 'lucide-react'

const ALL_NAV = [
  { href: '/dashboard',   icon: LayoutDashboard, label: 'Tableau de bord',      page: 'dashboard' },
  { href: '/caisses',     icon: CreditCard,       label: 'Caisses & Encaissements', page: 'caisses' },
  { href: '/stock',       icon: Package,          label: 'Stock Boissons',       page: 'stock' },
  { href: '/stands',      icon: UtensilsCrossed,  label: 'Stands Nourriture',    page: 'stands' },
  { href: '/personnel',   icon: Users,            label: 'Personnel & Paie',     page: 'personnel' },
  { href: '/depenses',    icon: Receipt,          label: 'Dépenses',             page: 'depenses' },
  { href: '/billetterie', icon: Ticket,           label: 'Billetterie & Accès',  page: 'billetterie' },
  { href: '/rapports',    icon: BarChart3,        label: 'Rapports & Exports',   page: 'rapports' },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Charger le profil dès le montage
    loadProfile()

    // Écouter les changements de session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setProfile(null)
        router.push('/login')
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadProfile()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile() {
    setLoading(true)
    const p = await getCurrentProfile()
    setProfile(p)
    setLoading(false)
    // Si pas de profil valide → déconnexion
    if (!p) {
      router.push('/login')
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const role = profile?.role ?? null
  const allowedPages = role ? ROLE_ACCESS[role] : []
  const visibleNav = ALL_NAV.filter(n => allowedPages.includes(n.page))
  const initial = profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'
  const roleLabel = role ? ROLE_LABELS[role] : ''
  const isAdmin = role === 'admin'

  return (
    <>
      <button onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg"
        style={{ background: '#F97316' }}>
        {open ? <X size={20} color="white" /> : <Menu size={20} color="white" />}
      </button>

      {open && (
        <div className="lg:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 z-40 flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        style={{ background: '#020617', borderRight: '1px solid rgba(249,115,22,0.15)' }}>

        {/* Logo */}
        <div className="p-5 border-b" style={{ borderColor: 'rgba(249,115,22,0.15)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-lg"
              style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)' }}>SDC</div>
            <div>
              <div className="font-black text-white text-sm">SDC Manager</div>
              <div className="text-xs" style={{ color: '#F97316' }}>Son Du Ciel Events</div>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-400 text-center py-1.5 rounded-md"
            style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}>
            🏆 Mondial 2026 — 51 Jours
          </div>
        </div>

        {/* Profil */}
        <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          {loading ? (
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <Loader2 size={14} className="animate-spin" /> Chargement...
            </div>
          ) : profile ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-white text-sm flex-shrink-0"
                style={{ background: isAdmin ? 'linear-gradient(135deg,#F97316,#EA580C)' : '#1E293B', border: isAdmin ? 'none' : '1px solid #334155' }}>
                {initial}
              </div>
              <div className="min-w-0">
                <div className="text-white text-xs font-bold truncate">{profile.full_name}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  {isAdmin && <ShieldAlert size={10} style={{ color: '#F97316' }} />}
                  <span className="text-xs font-medium" style={{ color: isAdmin ? '#F97316' : '#64748B' }}>
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto scrollbar-thin">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3 px-2">Navigation</div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-slate-600" />
            </div>
          ) : (
            visibleNav.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href} onClick={() => setOpen(false)}
                className={`sidebar-link mb-1 ${pathname.startsWith(href) ? 'active' : ''}`}>
                <Icon size={17} />
                <span className="text-sm">{label}</span>
              </Link>
            ))
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: 'rgba(249,115,22,0.15)' }}>
          {allowedPages.includes('alertes') && (
            <Link href="/alertes" onClick={() => setOpen(false)} className="sidebar-link mb-1">
              <Bell size={17} />
              <span className="text-sm">Alertes</span>
            </Link>
          )}
          {isAdmin && (
            <Link href="/settings" onClick={() => setOpen(false)} className="sidebar-link mb-1">
              <Settings size={17} />
              <span className="text-sm">Paramètres</span>
            </Link>
          )}
          <button onClick={handleLogout}
            className="sidebar-link w-full mt-1"
            style={{ color: '#F87171' }}>
            <LogOut size={17} />
            <span className="text-sm">Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  )
}
