'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import InstallPrompt from '@/components/InstallPrompt'
import { TrendingUp, TrendingDown, ShoppingBag, DollarSign, Ticket, AlertTriangle, RefreshCw, Calendar } from 'lucide-react'

function formatCFA(n: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' CFA' }

function StatCard({ title, value, icon: Icon, color, sub }: { title: string, value: string, icon: any, color: string, sub?: string }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-xs font-medium uppercase tracking-wider leading-tight">{title}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: color + '22' }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <div className="text-lg font-black text-white leading-tight truncate">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}

function MiniBar({ label, value, max, color }: { label: string, value: number, max: number, color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-10 text-right flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#1E293B' }}>
        <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs text-white font-bold w-28 text-right flex-shrink-0">{formatCFA(value)}</span>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<any>(null)
  const [alertes, setAlertes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const eventStart = new Date('2026-05-30')
  const eventEnd = new Date('2026-07-19')
  const now = new Date()
  const totalDays = Math.round((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24))
  const elapsed = Math.max(0, Math.round((now.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24)))
  const daysLeft = Math.max(0, Math.round((eventEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  const pct = Math.min(100, Math.round((elapsed / totalDays) * 100))

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [dashRes, alertRes] = await Promise.all([
          supabase.from('dashboard_journalier').select('*').single(),
          supabase.from('alertes').select('*').eq('lue', false).order('created_at', { ascending: false }).limit(5)
        ])
        if (dashRes.data) setData(dashRes.data)
        if (alertRes.data) setAlertes(alertRes.data)
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [refresh])

  const caJour = (data?.ca_bars_jour || 0) + (data?.ca_stands_jour || 0) + (data?.ca_billetterie_jour || 0)
  const chargesJour = (data?.depenses_jour || 0) + (data?.salaires_jour || 0)
  const benefJour = caJour - chargesJour
  const caTotal = (data?.ca_bars_total || 0) + (data?.ca_stands_total || 0) + (data?.ca_billetterie_total || 0)
  const chargesTotal = (data?.depenses_total || 0) + (data?.salaires_total || 0)
  const benefTotal = caTotal - chargesTotal
  const maxJour = Math.max(data?.ca_bars_jour || 0, data?.ca_stands_jour || 0, data?.ca_billetterie_jour || 0, chargesJour, 1)
  const maxTotal = Math.max(data?.ca_bars_total || 0, data?.ca_stands_total || 0, data?.ca_billetterie_total || 0, chargesTotal, 1)

  return (
    <div>
      <TopBar title="Tableau de bord" />
      <div className="p-4 sm:p-6 space-y-4">

        {/* Bandeau installation PWA */}
        <InstallPrompt />

        {/* Progression événement */}
        <div className="sdc-card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-white text-base sm:text-lg leading-snug">
                🏆 Le Spécial 51 Jours Chrono du Mondial
              </h2>
              <p className="text-slate-400 text-xs mt-1 capitalize">{today}</p>
              <p className="text-slate-500 text-xs">Terrain du village d'Ebimpé · Abidjan</p>
            </div>
            <button
              onClick={() => setRefresh(r => r + 1)}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)', color: 'white', fontWeight: 600 }}>
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-500 w-8 text-right flex-shrink-0">J{elapsed}</span>
            <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: '#1E293B' }}>
              <div className="h-2.5 rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#F97316,#F59E0B)' }} />
            </div>
            <span className="text-xs text-slate-500 w-16 flex-shrink-0">{daysLeft}j restants</span>
          </div>
          <div className="flex justify-between text-xs text-slate-600 px-10">
            <span>30 Mai</span>
            <span className="font-bold" style={{ color: '#F97316' }}>{pct}%</span>
            <span>19 Juil.</span>
          </div>
        </div>

        {/* Alertes */}
        {alertes.length > 0 && (
          <div className="p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
              <span className="font-bold text-red-400 text-sm">{alertes.length} alerte(s)</span>
            </div>
            {alertes.map((a, i) => (
              <p key={i} className="text-xs text-slate-300 py-1 border-t border-red-900/20 first:border-0">⚠️ {a.message}</p>
            ))}
          </div>
        )}

        {/* Stats AUJOURD'HUI */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={13} style={{ color: '#F97316' }} />
            <span className="font-bold text-white text-sm">Aujourd'hui</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard title="CA Bars" value={formatCFA(data?.ca_bars_jour || 0)} icon={ShoppingBag} color="#F97316" />
            <StatCard title="CA Stands" value={formatCFA(data?.ca_stands_jour || 0)} icon={DollarSign} color="#F59E0B" />
            <StatCard title="Billetterie" value={formatCFA(data?.ca_billetterie_jour || 0)} icon={Ticket} color="#16A34A" />
            <StatCard title="Dépenses" value={formatCFA(chargesJour)} icon={TrendingDown} color="#EF4444" />
          </div>
        </div>

        {/* Bénéfices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl" style={{
            background: benefJour >= 0 ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${benefJour >= 0 ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`
          }}>
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Bénéfice du jour</div>
            <div className={`text-2xl font-black ${benefJour >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {benefJour >= 0 ? '+' : ''}{formatCFA(benefJour)}
            </div>
          </div>
          <div className="p-4 rounded-xl" style={{
            background: benefTotal >= 0 ? 'rgba(249,115,22,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${benefTotal >= 0 ? 'rgba(249,115,22,0.3)' : 'rgba(239,68,68,0.3)'}`
          }}>
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Bénéfice global</div>
            <div className={`text-2xl font-black ${benefTotal >= 0 ? 'text-orange-400' : 'text-red-400'}`}>
              {benefTotal >= 0 ? '+' : ''}{formatCFA(benefTotal)}
            </div>
          </div>
        </div>

        {/* Répartition du jour — barres CSS (sans Recharts) */}
        <div className="sdc-card p-4 sm:p-5">
          <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
            <Calendar size={13} style={{ color: '#F97316' }} />
            Répartition du jour
          </h3>
          <div className="space-y-3">
            <MiniBar label="Bars" value={data?.ca_bars_jour || 0} max={maxJour} color="#F97316" />
            <MiniBar label="Stands" value={data?.ca_stands_jour || 0} max={maxJour} color="#F59E0B" />
            <MiniBar label="Billets" value={data?.ca_billetterie_jour || 0} max={maxJour} color="#16A34A" />
            <div className="border-t my-2" style={{ borderColor: 'rgba(255,255,255,0.05)' }} />
            <MiniBar label="Charges" value={chargesJour} max={maxJour} color="#EF4444" />
          </div>
        </div>

        {/* Stats GLOBAL */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={13} style={{ color: '#F59E0B' }} />
            <span className="font-bold text-white text-sm">Totaux événement</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard title="CA Bars total" value={formatCFA(data?.ca_bars_total || 0)} icon={ShoppingBag} color="#F97316" sub="Depuis l'ouverture" />
            <StatCard title="CA Stands total" value={formatCFA(data?.ca_stands_total || 0)} icon={DollarSign} color="#F59E0B" sub="Depuis l'ouverture" />
            <StatCard title="Billetterie total" value={formatCFA(data?.ca_billetterie_total || 0)} icon={Ticket} color="#16A34A" sub="Depuis l'ouverture" />
            <StatCard title="Charges totales" value={formatCFA(chargesTotal)} icon={TrendingDown} color="#EF4444" sub="Dépenses + salaires" />
          </div>
        </div>

        {/* Répartition globale */}
        <div className="sdc-card p-4 sm:p-5">
          <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
            <TrendingUp size={13} style={{ color: '#F59E0B' }} />
            Répartition globale
          </h3>
          <div className="space-y-3">
            <MiniBar label="Bars" value={data?.ca_bars_total || 0} max={maxTotal} color="#F97316" />
            <MiniBar label="Stands" value={data?.ca_stands_total || 0} max={maxTotal} color="#F59E0B" />
            <MiniBar label="Billets" value={data?.ca_billetterie_total || 0} max={maxTotal} color="#16A34A" />
            <div className="border-t my-2" style={{ borderColor: 'rgba(255,255,255,0.05)' }} />
            <MiniBar label="Dépenses" value={data?.depenses_total || 0} max={maxTotal} color="#EF4444" />
            <MiniBar label="Salaires" value={data?.salaires_total || 0} max={maxTotal} color="#EC4899" />
          </div>
        </div>

        {/* Infos organisation */}
        <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }}>
          <div className="text-xs text-slate-500 mb-1">Organisateur</div>
          <div className="font-bold text-white text-sm">Son Du Ciel Events</div>
          <div className="text-xs text-slate-400 mt-0.5">+225 05 65 48 24 55</div>
        </div>

      </div>
    </div>
  )
}
