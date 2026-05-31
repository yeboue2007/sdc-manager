'use client'
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ROLE_LABELS, UserRole } from '@/lib/auth'

export default function TopBar({ title }: { title: string }) {
  const [time, setTime] = useState('')
  const [initial, setInitial] = useState('')
  const [role, setRole] = useState<UserRole | null>(null)

  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
    }, 1000)
    setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return
      supabase.from('user_profiles').select('full_name, role').eq('id', session.user.id).single()
        .then(({ data }) => {
          if (data) {
            setInitial(data.full_name?.charAt(0)?.toUpperCase() || '?')
            setRole(data.role as UserRole)
          }
        })
    })

    return () => clearInterval(t)
  }, [])

  const isAdmin = role === 'admin'

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 30,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px',
      background: 'rgba(2,6,23,0.96)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(249,115,22,0.1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 44 }} className="lg:pl-0">
        <h1 style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 17, margin: 0 }}>{title}</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: '#475569', fontSize: 12 }} className="hidden sm:block">{time}</span>
        <button style={{ position: 'relative', padding: 8, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
          <Bell size={17} color="#64748B" />
          <span style={{ position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: '50%', background: '#F97316' }} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 13, color: '#fff',
            background: isAdmin ? 'linear-gradient(135deg,#F97316,#EA580C)' : '#1E293B',
            border: isAdmin ? 'none' : '1px solid #334155',
          }}>{initial || '?'}</div>
          {role && <span style={{ fontSize: 11, color: isAdmin ? '#F97316' : '#64748B' }} className="hidden sm:block">{ROLE_LABELS[role]}</span>}
        </div>
      </div>
    </header>
  )
}
