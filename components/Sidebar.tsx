'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ROLE_ACCESS, ROLE_LABELS, UserRole } from '@/lib/auth'
import {
  LayoutDashboard, CreditCard, Package, UtensilsCrossed,
  Users, Receipt, BarChart3, Ticket, Bell,
  Menu, X, LogOut, Settings, ShieldAlert
} from 'lucide-react'

const ALL_NAV = [
  { href: '/dashboard',   icon: LayoutDashboard, label: 'Tableau de bord',         page: 'dashboard' },
  { href: '/caisses',     icon: CreditCard,       label: 'Caisses & Encaissements', page: 'caisses' },
  { href: '/stock',       icon: Package,          label: 'Stock Boissons',          page: 'stock' },
  { href: '/stands',      icon: UtensilsCrossed,  label: 'Stands Nourriture',       page: 'stands' },
  { href: '/personnel',   icon: Users,            label: 'Personnel & Paie',        page: 'personnel' },
  { href: '/depenses',    icon: Receipt,          label: 'Dépenses',                page: 'depenses' },
  { href: '/billetterie', icon: Ticket,           label: 'Billetterie & Accès',     page: 'billetterie' },
  { href: '/rapports',    icon: BarChart3,        label: 'Rapports & Exports',      page: 'rapports' },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole | null>(null)
  const pathname = usePathname()
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true

    async function load() {
      // 1. Récupérer la session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      // 2. Lire le profil
      const { data } = await supabase
        .from('user_profiles')
        .select('full_name, role')
        .eq('id', session.user.id)
        .single()

      if (data) {
        setFullName(data.full_name || '')
        setRole(data.role as UserRole)
      }
    }

    load()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const isAdmin = role === 'admin'
  const allowedPages = role ? (ROLE_ACCESS[role] ?? []) : []
  const visibleNav = ALL_NAV.filter(n => allowedPages.includes(n.page))
  const initial = fullName?.charAt(0)?.toUpperCase() || ''

  return (
    <>
      {/* Bouton burger mobile */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'fixed', top: 16, left: 16, zIndex: 50,
          background: '#F97316', border: 'none', borderRadius: 10,
          padding: 8, cursor: 'pointer', display: 'flex',
        }}
        className="lg:hidden">
        {open ? <X size={20} color="white" /> : <Menu size={20} color="white" />}
      </button>

      {/* Overlay mobile */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }}
          className="lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, height: '100%', width: 256,
        zIndex: 40, display: 'flex', flexDirection: 'column',
        background: '#020617',
        borderRight: '1px solid rgba(249,115,22,0.15)',
        transform: open ? 'translateX(0)' : undefined,
        transition: 'transform 0.3s',
      }}
      className={`${open ? '' : '-translate-x-full'} lg:translate-x-0`}>

        {/* Logo */}
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(249,115,22,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg,#F97316,#EA580C)',
              color: '#fff', fontWeight: 900, fontSize: 16,
            }}>SDC</div>
            <div>
              <div style={{ color: '#F8FAFC', fontWeight: 900, fontSize: 14 }}>SDC Manager</div>
              <div style={{ color: '#F97316', fontSize: 11 }}>Son Du Ciel Events</div>
            </div>
          </div>
          <div style={{
            marginTop: 12, fontSize: 11, color: '#94A3B8', textAlign: 'center',
            padding: '6px 8px', borderRadius: 8,
            background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)',
          }}>
            🏆 Mondial 2026 — 51 Jours
          </div>
        </div>

        {/* Profil */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {role ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, color: '#fff', fontSize: 14,
                background: isAdmin ? 'linear-gradient(135deg,#F97316,#EA580C)' : '#1E293B',
                border: isAdmin ? 'none' : '1px solid #334155',
              }}>{initial || '?'}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#F8FAFC', fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fullName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  {isAdmin && <ShieldAlert size={10} color="#F97316" />}
                  <span style={{ fontSize: 11, color: isAdmin ? '#F97316' : '#64748B', fontWeight: 600 }}>
                    {ROLE_LABELS[role]}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: '#334155', fontSize: 12 }}>Chargement...</div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
          <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, paddingLeft: 8 }}>
            Navigation
          </div>
          {visibleNav.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 8, marginBottom: 2,
                  textDecoration: 'none', fontSize: 13, fontWeight: 500,
                  color: active ? '#F97316' : '#94A3B8',
                  background: active ? 'rgba(249,115,22,0.12)' : 'transparent',
                  transition: 'all 0.15s',
                }}>
                <Icon size={17} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(249,115,22,0.15)' }}>
          {allowedPages.includes('alertes') && (
            <Link href="/alertes" onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, marginBottom: 4, textDecoration: 'none', color: '#94A3B8', fontSize: 13, fontWeight: 500 }}>
              <Bell size={17} /><span>Alertes</span>
            </Link>
          )}
          {isAdmin && (
            <Link href="/settings" onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, marginBottom: 4, textDecoration: 'none', color: '#94A3B8', fontSize: 13, fontWeight: 500 }}>
              <Settings size={17} /><span>Paramètres</span>
            </Link>
          )}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 8, width: '100%',
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#F87171', fontSize: 13, fontWeight: 500,
            }}>
            <LogOut size={17} /><span>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  )
}
