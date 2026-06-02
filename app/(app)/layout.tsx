'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'
import { ROLE_ACCESS, UserRole } from '@/lib/auth'
import { ShieldAlert, Loader2 } from 'lucide-react'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [status, setStatus] = useState<'loading' | 'ok' | 'denied' | 'unauth'>('loading')

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { window.location.href = '/login'; return }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, active')
        .eq('id', session.user.id)
        .single()

      if (!profile || !profile.active) { window.location.href = '/login'; return }

      const role = profile.role as UserRole
      const page = pathname.replace('/', '').split('/')[0] || 'dashboard'
      const allowed = (ROLE_ACCESS[role] ?? []).includes(page)
      setStatus(allowed ? 'ok' : 'denied')
    }
    check()
  }, [pathname])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto', marginLeft: 0 }} className="lg:ml-64 scrollbar-thin">
        {status === 'loading' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <Loader2 size={28} style={{ color: '#F97316', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        {status === 'denied' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 16, textAlign: 'center', padding: 24 }}>
            <div style={{ width: 72, height: 72, borderRadius: 18, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={36} color="#F87171" />
            </div>
            <div>
              <div style={{ color: '#F8FAFC', fontWeight: 900, fontSize: 20 }}>Accès refusé</div>
              <div style={{ color: '#94A3B8', fontSize: 14, marginTop: 6 }}>Vous n&apos;avez pas les droits pour cette page.</div>
              <div style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>Contactez l&apos;administrateur.</div>
            </div>
            <button onClick={() => window.location.href = '/dashboard'}
              style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              ← Retour au tableau de bord
            </button>
          </div>
        )}
        {status === 'ok' && children}
      </main>
    </div>
  )
}
