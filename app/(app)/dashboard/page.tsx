'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import InstallPrompt from '@/components/InstallPrompt'
import {
  TrendingUp, TrendingDown, ShoppingBag,
  DollarSign, Ticket, AlertTriangle, RefreshCw, Calendar
} from 'lucide-react'

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' CFA'
}

function StatCard({ title, value, icon: Icon, color, sub }: {
  title: string; value: string; icon: any; color: string; sub?: string
}) {
  return (
    <div style={{
      background: 'linear-gradient(135deg,#1E293B,#0F172A)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12,
      padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ color: '#94A3B8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{title}</span>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: color + '25', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <div style={{ color: '#F8FAFC', fontSize: 17, fontWeight: 900, lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: '#CBD5E1', fontSize: 12 }}>{label}</span>
        <span style={{ color: '#F8FAFC', fontSize: 12, fontWeight: 700 }}>{fmt(value)}</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: '#0F172A', overflow: 'hidden' }}>
        <div style={{ height: 8, borderRadius: 99, width: pct + '%', background: color, transition: 'width .6s ease' }} />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<any>(null)
  const [alertes, setAlertes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const eventStart = new Date('2026-05-30')
  const eventEnd   = new Date('2026-07-19')
  const now        = new Date()
  const totalDays  = Math.round((eventEnd.getTime() - eventStart.getTime()) / 864e5)
  const elapsed    = Math.max(0, Math.round((now.getTime() - eventStart.getTime()) / 864e5))
  const daysLeft   = Math.max(0, Math.round((eventEnd.getTime() - now.getTime()) / 864e5))
  const pct        = Math.min(100, Math.round((elapsed / totalDays) * 100))
  const dateStr    = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [d, a] = await Promise.all([
        supabase.from('dashboard_journalier').select('*').single(),
        supabase.from('alertes').select('*').eq('lue', false).order('created_at', { ascending: false }).limit(5)
      ])
      if (d.data) setData(d.data)
      if (a.data) setAlertes(a.data)
      setLoading(false)
    }
    load()
  }, [tick])

  const caJ  = (data?.ca_bars_jour || 0) + (data?.ca_stands_jour || 0) + (data?.ca_billetterie_jour || 0)
  const chJ  = (data?.depenses_jour || 0) + (data?.salaires_jour || 0)
  const bJ   = caJ - chJ
  const caT  = (data?.ca_bars_total || 0) + (data?.ca_stands_total || 0) + (data?.ca_billetterie_total || 0)
  const chT  = (data?.depenses_total || 0) + (data?.salaires_total || 0)
  const bT   = caT - chT
  const mxJ  = Math.max(data?.ca_bars_jour || 0, data?.ca_stands_jour || 0, data?.ca_billetterie_jour || 0, chJ, 1)
  const mxT  = Math.max(data?.ca_bars_total || 0, data?.ca_stands_total || 0, data?.ca_billetterie_total || 0, chT, 1)

  return (
    <div>
      <TopBar title="Tableau de bord" />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <InstallPrompt />

        {/* Événement */}
        <div style={{ background: 'linear-gradient(135deg,#1E293B,#0F172A)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 14, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#F8FAFC', fontWeight: 900, fontSize: 15, lineHeight: 1.3 }}>
                🏆 Le Spécial 51 Jours Chrono du Mondial
              </div>
              <div style={{ color: '#64748B', fontSize: 12, marginTop: 4, textTransform: 'capitalize' }}>{dateStr}</div>
              <div style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>Terrain du village d&apos;Ebimpé · Abidjan</div>
            </div>
            <button
              onClick={() => setTick(t => t + 1)}
              style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Actualiser
            </button>
          </div>

          {/* Barre progression */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ color: '#475569', fontSize: 11, width: 28, textAlign: 'right', flexShrink: 0 }}>J{elapsed}</span>
            <div style={{ flex: 1, height: 10, borderRadius: 99, background: '#0F172A', overflow: 'hidden' }}>
              <div style={{ height: 10, borderRadius: 99, width: pct + '%', background: 'linear-gradient(90deg,#F97316,#F59E0B)', transition: 'width .7s ease' }} />
            </div>
            <span style={{ color: '#475569', fontSize: 11, width: 60, flexShrink: 0 }}>{daysLeft}j rest.</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 38, paddingRight: 12 }}>
            <span style={{ color: '#334155', fontSize: 10 }}>30 Mai</span>
            <span style={{ color: '#F97316', fontSize: 11, fontWeight: 700 }}>{pct}% écoulé</span>
            <span style={{ color: '#334155', fontSize: 10 }}>19 Juil.</span>
          </div>
        </div>

        {/* Alertes */}
        {alertes.length > 0 && (
          <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <AlertTriangle size={14} color="#F87171" />
              <span style={{ color: '#F87171', fontWeight: 700, fontSize: 13 }}>{alertes.length} alerte(s)</span>
            </div>
            {alertes.map((a, i) => (
              <p key={i} style={{ color: '#CBD5E1', fontSize: 12, borderTop: i > 0 ? '1px solid rgba(239,68,68,0.1)' : 'none', paddingTop: i > 0 ? 6 : 0, marginTop: i > 0 ? 6 : 0 }}>⚠️ {a.message}</p>
            ))}
          </div>
        )}

        {/* Stats JOUR */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Calendar size={13} color="#F97316" />
            <span style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 13 }}>Aujourd&apos;hui</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <StatCard title="CA Bars"      value={fmt(data?.ca_bars_jour || 0)}        icon={ShoppingBag} color="#F97316" />
            <StatCard title="CA Stands"    value={fmt(data?.ca_stands_jour || 0)}      icon={DollarSign}  color="#F59E0B" />
            <StatCard title="Billetterie"  value={fmt(data?.ca_billetterie_jour || 0)} icon={Ticket}      color="#16A34A" />
            <StatCard title="Dépenses"     value={fmt(chJ)}                             icon={TrendingDown} color="#EF4444" />
          </div>
        </div>

        {/* Bénéfices jour */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ padding: 16, borderRadius: 12, background: bJ >= 0 ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${bJ >= 0 ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
            <div style={{ color: '#94A3B8', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Bénéf. du jour</div>
            <div style={{ color: bJ >= 0 ? '#4ADE80' : '#F87171', fontWeight: 900, fontSize: 16 }}>{bJ >= 0 ? '+' : ''}{fmt(bJ)}</div>
          </div>
          <div style={{ padding: 16, borderRadius: 12, background: bT >= 0 ? 'rgba(249,115,22,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${bT >= 0 ? 'rgba(249,115,22,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
            <div style={{ color: '#94A3B8', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Bénéf. global</div>
            <div style={{ color: bT >= 0 ? '#FB923C' : '#F87171', fontWeight: 900, fontSize: 16 }}>{bT >= 0 ? '+' : ''}{fmt(bT)}</div>
          </div>
        </div>

        {/* Répartition jour */}
        <div style={{ background: 'linear-gradient(135deg,#1E293B,#0F172A)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 18 }}>
          <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 13, marginBottom: 16 }}>📊 Répartition du jour</div>
          <Bar label="Bars"       value={data?.ca_bars_jour || 0}        max={mxJ} color="#F97316" />
          <Bar label="Stands"     value={data?.ca_stands_jour || 0}      max={mxJ} color="#F59E0B" />
          <Bar label="Billetterie" value={data?.ca_billetterie_jour || 0} max={mxJ} color="#16A34A" />
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '12px 0' }} />
          <Bar label="Charges"    value={chJ}                             max={mxJ} color="#EF4444" />
        </div>

        {/* Stats TOTAL */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <TrendingUp size={13} color="#F59E0B" />
            <span style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 13 }}>Totaux événement</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <StatCard title="CA Bars total"     value={fmt(data?.ca_bars_total || 0)}        icon={ShoppingBag} color="#F97316" sub="Depuis l'ouverture" />
            <StatCard title="CA Stands total"   value={fmt(data?.ca_stands_total || 0)}      icon={DollarSign}  color="#F59E0B" sub="Depuis l'ouverture" />
            <StatCard title="Billetterie total" value={fmt(data?.ca_billetterie_total || 0)} icon={Ticket}      color="#16A34A" sub="Depuis l'ouverture" />
            <StatCard title="Charges totales"   value={fmt(chT)}                              icon={TrendingDown} color="#EF4444" sub="Dépenses + salaires" />
          </div>
        </div>

        {/* Répartition globale */}
        <div style={{ background: 'linear-gradient(135deg,#1E293B,#0F172A)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 18 }}>
          <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 13, marginBottom: 16 }}>📊 Répartition globale</div>
          <Bar label="Bars"       value={data?.ca_bars_total || 0}        max={mxT} color="#F97316" />
          <Bar label="Stands"     value={data?.ca_stands_total || 0}      max={mxT} color="#F59E0B" />
          <Bar label="Billetterie" value={data?.ca_billetterie_total || 0} max={mxT} color="#16A34A" />
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '12px 0' }} />
          <Bar label="Dépenses"   value={data?.depenses_total || 0}       max={mxT} color="#EF4444" />
          <Bar label="Salaires"   value={data?.salaires_total || 0}       max={mxT} color="#EC4899" />
        </div>

        {/* Pied */}
        <div style={{ textAlign: 'center', padding: '12px 0', background: 'rgba(249,115,22,0.05)', borderRadius: 10, border: '1px solid rgba(249,115,22,0.12)' }}>
          <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 13 }}>Son Du Ciel Events</div>
          <div style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>+225 05 65 48 24 55</div>
        </div>

      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
