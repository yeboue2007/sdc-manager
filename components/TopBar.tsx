'use client'
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { getCurrentProfile, ROLE_LABELS, UserRole } from '@/lib/auth'

export default function TopBar({ title }: { title: string }) {
  const [time, setTime] = useState('')
  const [initial, setInitial] = useState('')
  const [role, setRole] = useState<UserRole | null>(null)
  const [roleLabel, setRoleLabel] = useState('')

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
    update()
    const t = setInterval(update, 1000)

    getCurrentProfile().then(p => {
      if (p) {
        setInitial(p.full_name?.charAt(0)?.toUpperCase() || '?')
        setRole(p.role)
        setRoleLabel(ROLE_LABELS[p.role] || p.role)
      }
    })

    return () => clearInterval(t)
  }, [])

  const isAdmin = role === 'admin'

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-4"
      style={{ background: 'rgba(2,6,23,0.96)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(249,115,22,0.1)' }}>
      <div className="flex items-center gap-3 lg:pl-0 pl-10">
        <h1 className="font-bold text-white text-base sm:text-lg">{title}</h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="text-slate-500 text-xs hidden sm:block">{time}</span>
        <button className="relative p-2 rounded-lg hover:bg-slate-800 transition-colors">
          <Bell size={17} className="text-slate-400" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: '#F97316' }} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm text-white"
            style={{ background: isAdmin ? 'linear-gradient(135deg,#F97316,#EA580C)' : '#1E293B', border: isAdmin ? 'none' : '1px solid #334155' }}>
            {initial || '?'}
          </div>
          {roleLabel && (
            <span className="text-xs hidden sm:block" style={{ color: isAdmin ? '#F97316' : '#64748B' }}>
              {roleLabel}
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
