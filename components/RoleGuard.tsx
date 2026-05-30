'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUserRole, canAccess, UserRole } from '@/lib/auth'
import { ShieldAlert } from 'lucide-react'

export default function RoleGuard({ page, children }: { page: string; children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading')
  const router = useRouter()

  useEffect(() => {
    getCurrentUserRole().then(({ role }) => {
      if (!role) { router.push('/login'); return }
      setStatus(canAccess(role, page) ? 'allowed' : 'denied')
    })
  }, [page])

  if (status === 'loading') return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (status === 'denied') return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 p-6 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
        <ShieldAlert size={32} className="text-red-400" />
      </div>
      <div>
        <div className="font-black text-white text-lg">Accès refusé</div>
        <div className="text-slate-400 text-sm mt-1">Vous n&apos;avez pas les droits pour accéder à cette page.</div>
        <div className="text-slate-500 text-xs mt-2">Contactez l&apos;administrateur pour obtenir l&apos;accès.</div>
      </div>
      <button onClick={() => router.push('/dashboard')}
        className="sdc-btn-primary px-6 py-2 text-sm">
        ← Retour au tableau de bord
      </button>
    </div>
  )

  return <>{children}</>
}
