'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ROLE_ACCESS, UserRole } from '@/lib/auth'
import { ShieldAlert, Loader2 } from 'lucide-react'

export default function RoleGuard({ page, children }: { page: string; children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading')
  const router = useRouter()

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { window.location.href = '/login'; return }

      const { data } = await supabase
        .from('user_profiles')
        .select('role, active')
        .eq('id', session.user.id)
        .single()

      if (!data) { setStatus('allowed'); return } // pas de profil = laisser passer
      if (!data.active) { window.location.href = '/login'; return }

      const allowed = (ROLE_ACCESS[data.role as UserRole] ?? []).includes(page)
      setStatus(allowed ? 'allowed' : 'denied')
    }
    check()
  }, [page])

  if (status === 'loading') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <Loader2 size={24} style={{ color: '#F97316', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (status === 'denied') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, padding: 24, textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ShieldAlert size={32} color="#F87171" />
      </div>
      <div>
        <div style={{ color: '#F8FAFC', fontWeight: 900, fontSize: 18 }}>Accès refusé</div>
        <div style={{ color: '#94A3B8', fontSize: 14, marginTop: 6 }}>Vous n&apos;avez pas les droits pour cette page.</div>
      </div>
      <button onClick={() => router.push('/dashboard')}
        style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
        ← Retour au tableau de bord
      </button>
    </div>
  )

  return <>{children}</>
}
