'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import InstallPrompt from '@/components/InstallPrompt'

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' CFA'
}

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: '#1E293B',
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ color: '#94A3B8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ color: color, fontSize: 22, fontWeight: 900 }}>
        {value}
      </div>
    </div>
  )
}

function Row({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ color: '#CBD5E1', fontSize: 13 }}>{label}</span>
        <span style={{ color: '#F8FAFC', fontSize: 13, fontWeight: 700 }}>{fmt(value)}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: '#0F172A', overflow: 'hidden' }}>
        <div style={{ height: 6, borderRadius: 99, width: pct + '%', background: color, transition: 'width .5s' }} />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<any>(null)
  const [alertes, setAlertes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const now = new Date()
  const eventStart = new Date('2026-05-30')
  const eventEnd = new Date('2026-07-19')
  const totalDays = Math.round((eventEnd.getTime() - eventStart.getTime()) / 864e5)
  const elapsed = Math.max(0, Math.round((now.getTime() - eventStart.getTime()) / 864e5))
  const daysLeft = Math.max(0, Math.round((eventEnd.getTime() - now.getTime()) / 864e5))
  const pct = Math.min(100, Math.round((elapsed / totalDays) * 100))
  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

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
  const mxJ  = Math.max(caJ, chJ, 1)
  const mxT  = Math.max(caT, chT, 1)

  return (
    <div>
      <TopBar title="Tableau de bord" />
      <div style={{ padding: 16, maxWidth: 600 }}>

        <InstallPrompt />

        {/* Bloc événement */}
        <div style={{ background: '#1E293B', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 14, padding: 18, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#F8FAFC', fontWeight: 900, fontSize: 15, lineHeight: 1.4 }}>
                🏆 Le Spécial 51 Jours Chrono du Mondial
              </div>
              <div style={{ color: '#64748B', fontSize: 12, marginTop: 4, textTransform: 'capitalize' }}>{dateStr}</div>
              <div style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>Terrain du village d&apos;Ebimpé · Abidjan</div>
            </div>
            <button
              onClick={() => setTick(t => t + 1)}
              style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
              {loading ? '...' : '↺ Actualiser'}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ color: '#475569', fontSize: 11, width: 28, textAlign: 'right', flexShrink: 0 }}>J{elapsed}</span>
            <div style={{ flex: 1, height: 8, borderRadius: 99, background: '#0F172A', overflow: 'hidden' }}>
              <div style={{ height: 8, borderRadius: 99, width: pct + '%', background: 'linear-gradient(90deg,#F97316,#F59E0B)' }} />
            </div>
            <span style={{ color: '#475569', fontSize: 11, width: 52, flexShrink: 0 }}>{daysLeft}j rest.</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 38, paddingRight: 8 }}>
            <span style={{ color: '#334155', fontSize: 10 }}>30 Mai</span>
            <span style={{ color: '#F97316', fontSize: 11, fontWeight: 700 }}>{pct}% écoulé</span>
            <span style={{ color: '#334155', fontSize: 10 }}>19 Juil.</span>
          </div>
        </div>

        {/* Alertes */}
        {alertes.length > 0 && (
          <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ color: '#F87171', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>⚠️ {alertes.length} alerte(s)</div>
            {alertes.map((a, i) => (
              <div key={i} style={{ color: '#CBD5E1', fontSize: 12, paddingTop: i > 0 ? 6 : 0, marginTop: i > 0 ? 6 : 0, borderTop: i > 0 ? '1px solid rgba(239,68,68,0.1)' : 'none' }}>
                {a.message}
              </div>
            ))}
          </div>
        )}

        {/* AUJOURD'HUI */}
        <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 13, marginBottom: 10 }}>📅 Aujourd&apos;hui</div>
        <Card label="CA Bars"     value={fmt(data?.ca_bars_jour || 0)}        color="#F97316" />
        <Card label="CA Stands"   value={fmt(data?.ca_stands_jour || 0)}      color="#F59E0B" />
        <Card label="Billetterie" value={fmt(data?.ca_billetterie_jour || 0)} color="#16A34A" />
        <Card label="Dépenses"    value={fmt(chJ)}                             color="#EF4444" />

        {/* Bénéfice jour */}
        <div style={{ background: bJ >= 0 ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${bJ >= 0 ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 12, padding: 16, marginBottom: 10 }}>
          <div style={{ color: '#94A3B8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Bénéfice du jour</div>
          <div style={{ color: bJ >= 0 ? '#4ADE80' : '#F87171', fontSize: 26, fontWeight: 900 }}>{bJ >= 0 ? '+' : ''}{fmt(bJ)}</div>
        </div>

        {/* Répartition jour */}
        <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 18, marginBottom: 14 }}>
          <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 13, marginBottom: 16 }}>📊 Répartition du jour</div>
          <Row label="Bars"        value={data?.ca_bars_jour || 0}        max={mxJ} color="#F97316" />
          <Row label="Stands"      value={data?.ca_stands_jour || 0}      max={mxJ} color="#F59E0B" />
          <Row label="Billetterie" value={data?.ca_billetterie_jour || 0} max={mxJ} color="#16A34A" />
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 4, paddingTop: 12 }}>
            <Row label="Charges" value={chJ} max={mxJ} color="#EF4444" />
          </div>
        </div>

        {/* TOTAUX */}
        <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 13, marginBottom: 10 }}>📈 Totaux événement</div>
        <Card label="CA Bars total"     value={fmt(data?.ca_bars_total || 0)}        color="#F97316" />
        <Card label="CA Stands total"   value={fmt(data?.ca_stands_total || 0)}      color="#F59E0B" />
        <Card label="Billetterie total" value={fmt(data?.ca_billetterie_total || 0)} color="#16A34A" />
        <Card label="Charges totales"   value={fmt(chT)}                              color="#EF4444" />

        {/* Bénéfice global */}
        <div style={{ background: bT >= 0 ? 'rgba(249,115,22,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${bT >= 0 ? 'rgba(249,115,22,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 12, padding: 16, marginBottom: 10 }}>
          <div style={{ color: '#94A3B8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Bénéfice global</div>
          <div style={{ color: bT >= 0 ? '#FB923C' : '#F87171', fontSize: 26, fontWeight: 900 }}>{bT >= 0 ? '+' : ''}{fmt(bT)}</div>
        </div>

        {/* Répartition globale */}
        <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 18, marginBottom: 14 }}>
          <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 13, marginBottom: 16 }}>📊 Répartition globale</div>
          <Row label="Bars"        value={data?.ca_bars_total || 0}        max={mxT} color="#F97316" />
          <Row label="Stands"      value={data?.ca_stands_total || 0}      max={mxT} color="#F59E0B" />
          <Row label="Billetterie" value={data?.ca_billetterie_total || 0} max={mxT} color="#16A34A" />
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 4, paddingTop: 12 }}>
            <Row label="Dépenses" value={data?.depenses_total || 0} max={mxT} color="#EF4444" />
            <Row label="Salaires" value={data?.salaires_total || 0} max={mxT} color="#EC4899" />
          </div>
        </div>

        {/* Pied */}
        <div style={{ textAlign: 'center', padding: '14px', background: 'rgba(249,115,22,0.06)', borderRadius: 10, border: '1px solid rgba(249,115,22,0.12)', marginBottom: 24 }}>
          <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 13 }}>Son Du Ciel Events</div>
          <div style={{ color: '#64748B', fontSize: 12, marginTop: 3 }}>+225 05 65 48 24 55</div>
        </div>

      </div>
    </div>
  )
}
