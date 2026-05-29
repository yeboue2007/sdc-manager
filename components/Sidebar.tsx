'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CreditCard, Package, UtensilsCrossed,
  Users, Receipt, BarChart3, Ticket, Bell, Menu, X,
  LogOut, Settings
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', roles: ['admin','comptable','superviseur','rh'] },
  { href: '/caisses', icon: CreditCard, label: 'Caisses & Encaissements', roles: ['admin','comptable'] },
  { href: '/stock', icon: Package, label: 'Stock Boissons', roles: ['admin','responsable_stock','comptable'] },
  { href: '/stands', icon: UtensilsCrossed, label: 'Stands Nourriture', roles: ['admin','responsable_stands','comptable'] },
  { href: '/personnel', icon: Users, label: 'Personnel & Paie', roles: ['admin','rh'] },
  { href: '/depenses', icon: Receipt, label: 'Dépenses', roles: ['admin','comptable'] },
  { href: '/billetterie', icon: Ticket, label: 'Billetterie & Accès', roles: ['admin','billetterie','comptable'] },
  { href: '/rapports', icon: BarChart3, label: 'Rapports & Exports', roles: ['admin','comptable'] },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg"
        style={{ background: '#F97316' }}
      >
        {open ? <X size={20} color="white" /> : <Menu size={20} color="white" />}
      </button>

      {/* Overlay mobile */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 z-40 flex flex-col transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        style={{ background: '#020617', borderRight: '1px solid rgba(249,115,22,0.15)' }}
      >
        {/* Logo */}
        <div className="p-5 border-b" style={{ borderColor: 'rgba(249,115,22,0.15)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-lg"
              style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
              SDC
            </div>
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

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto scrollbar-thin">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3 px-2">Navigation</div>
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`sidebar-link mb-1 ${pathname.startsWith(href) ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: 'rgba(249,115,22,0.15)' }}>
          <Link href="/alertes" className="sidebar-link mb-2">
            <Bell size={18} />
            <span>Alertes</span>
            <span className="ml-auto badge alert-badge">2</span>
          </Link>
          <Link href="/settings" className="sidebar-link mb-2">
            <Settings size={18} />
            <span>Paramètres</span>
          </Link>
          <button className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-900/20">
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  )
}
