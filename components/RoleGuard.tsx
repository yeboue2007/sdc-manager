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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }

      const { data } = await supabase
        .from('user_profiles')
        .select('role, active')
        .eq('id', user.id)
        .single()

      if (!data) {
        // Profil non trouvé — laisser passer quand même (admin peut ne pas avoir profil chargé)
        setStatus('allowed')
        return
      }

      if (!data.active) {
        window.location.href = '/login'
        return
      }

      const role = data.role as UserRole
      const allowed = ROLE_ACCESS[role]?.includes(page) ?? false
      setStatus(allowed ? 'allowed' : 'denied')
    }

    check()
  }, [page])

  if (status === 'loading') return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin" style={{ color: '#F97316' }} />
    </div>
  )

  if (status === 'denied') return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
        <ShieldAlert size={32} className="text-red-400" />
      </div>
      <div>
        <div className="font-black text-white text-lg">Accès refusé</div>
        <div className="text-slate-400 text-sm mt-1">Vous n&apos;avez pas les droits pour cette page.</div>
      </div>
      <button onClick={() => router.push('/dashboard')} className="sdc-btn-primary px-6 py-2 text-sm">
        ← Retour au tableau de bord
      </button>
    </div>
  )

  return <>{children}</>
}
