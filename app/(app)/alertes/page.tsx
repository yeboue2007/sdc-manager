'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import { Bell, CheckCheck, AlertTriangle, Package, CreditCard, Users, DollarSign } from 'lucide-react'

const TYPES: Record<string, { icon: any; color: string; label: string }> = {
  rupture_stock:  { icon: Package,       color: '#EF4444', label: 'Rupture stock' },
  ecart_caisse:   { icon: CreditCard,    color: '#F97316', label: 'Écart de caisse' },
  dette_stand:    { icon: DollarSign,    color: '#F59E0B', label: 'Dette stand' },
  dette_salaire:  { icon: Users,         color: '#8B5CF6', label: 'Dette salariale' },
  seuil_depense:  { icon: AlertTriangle, color: '#EC4899', label: 'Seuil dépense' },
}

export default function AlertesPage() {
  const [alertes, setAlertes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase.from('alertes').select('*').order('created_at', { ascending: false })
    setAlertes(data || [])
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

  async function deleteAlerte(id: string) {
    await supabase.from('alertes').delete().eq('id', id)
    loadData()
  }

  const nonLues = alertes.filter(a => !a.lue).length
  const S = {
    card: { background: '#1E293B', borderRadius: 12, marginBottom: 8, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' } as React.CSSProperties,
  }

  return (
    <div>
      <TopBar title="Alertes système" />
      <div style={{ padding: 16, maxWidth: 600 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={20} color="#F97316" />
            <span style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 16 }}>
              {nonLues > 0 ? `${nonLues} alerte(s) non lue(s)` : 'Toutes les alertes lues'}
            </span>
          </div>
          {nonLues > 0 && (
            <button onClick={markAllRead}
              style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCheck size={14} /> Tout marquer lu
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#475569' }}>Chargement...</div>
        ) : alertes.length === 0 ? (
          <div style={{ ...S.card, padding: 48, textAlign: 'center', color: '#475569' }}>
            <Bell size={32} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
            Aucune alerte
          </div>
        ) : alertes.map(a => {
          const t = TYPES[a.type] || { icon: AlertTriangle, color: '#94A3B8', label: a.type }
          const Icon = t.icon
          return (
            <div key={a.id} style={{ ...S.card, opacity: a.lue ? 0.55 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: t.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} color={t.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: t.color }}>{t.label}</span>
                    {!a.lue && <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.color, display: 'inline-block' }} />}
                  </div>
                  <div style={{ color: '#F8FAFC', fontSize: 13, lineHeight: 1.4 }}>{a.message}</div>
                  <div style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>
                    {new Date(a.created_at).toLocaleString('fr-FR')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {!a.lue && (
                    <button onClick={() => markRead(a.id)}
                      style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#94A3B8', fontSize: 11, fontWeight: 600 }}>
                      Lu
                    </button>
                  )}
                  <button onClick={() => deleteAlerte(a.id)}
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#FCA5A5', fontSize: 12 }}>
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          )
        })}

      </div>
    </div>
  )
}
