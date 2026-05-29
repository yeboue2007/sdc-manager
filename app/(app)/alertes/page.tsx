'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import { Bell, CheckCheck, AlertTriangle, Package, CreditCard, Users, DollarSign } from 'lucide-react'

const TYPES: Record<string, { icon: any, color: string, label: string }> = {
  rupture_stock: { icon: Package, color: '#EF4444', label: 'Rupture stock' },
  ecart_caisse: { icon: CreditCard, color: '#F97316', label: 'Écart de caisse' },
  dette_stand: { icon: DollarSign, color: '#F59E0B', label: 'Dette stand' },
  dette_salaire: { icon: Users, color: '#8B5CF6', label: 'Dette salariale' },
  seuil_depense: { icon: AlertTriangle, color: '#EC4899', label: 'Seuil dépense' },
}

export default function AlertesPage() {
  const [alertes, setAlertes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])
  async function loadData() {
    setLoading(true)
    const { data } = await supabase.from('alertes').select('*').order('created_at', { ascending: false })
    if (data) setAlertes(data)
    setLoading(false)
  }
  async function markRead(id: string) {
    await supabase.from('alertes').update({ lue: true }).eq('id', id)
    loadData()
  }
  async function markAllRead() {
    await supabase.from('alertes').update({ lue: true }).eq('lue', false)
    loadData()
  }

  const nonLues = alertes.filter(a => !a.lue).length

  return (
    <div>
      <TopBar title="Alertes système" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell size={20} style={{ color: '#F97316' }} />
            <span className="font-bold text-white">{nonLues} alerte(s) non lue(s)</span>
          </div>
          {nonLues > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg sdc-btn-primary">
              <CheckCheck size={14} /> Tout marquer lu
            </button>
          )}
        </div>

        <div className="space-y-3">
          {loading ? <div className="text-center text-slate-500 py-8">Chargement...</div>
            : alertes.length === 0 ? <div className="text-center text-slate-500 py-8">Aucune alerte</div>
            : alertes.map(a => {
              const t = TYPES[a.type] || { icon: AlertTriangle, color: '#94A3B8', label: a.type }
              const Icon = t.icon
              return (
                <div key={a.id} className={`sdc-card p-4 flex items-start gap-4 ${a.lue ? 'opacity-50' : ''}`}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: t.color + '20' }}>
                    <Icon size={18} style={{ color: t.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold" style={{ color: t.color }}>{t.label}</span>
                      {!a.lue && <span className="w-2 h-2 rounded-full" style={{ background: t.color }}></span>}
                    </div>
                    <div className="text-sm text-white">{a.message}</div>
                    <div className="text-xs text-slate-500 mt-1">{new Date(a.created_at).toLocaleString('fr-FR')}</div>
                  </div>
                  {!a.lue && (
                    <button onClick={() => markRead(a.id)} className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors flex-shrink-0" style={{ background: '#1E293B' }}>
                      Lu
                    </button>
                  )}
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
