'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import {
  TrendingUp, TrendingDown, DollarSign, Users, Package,
  ShoppingBag, Ticket, AlertTriangle, RefreshCw, Calendar
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface DashboardData {
  ca_bars_jour: number
  ca_stands_jour: number
  ca_billetterie_jour: number
  depenses_jour: number
  salaires_jour: number
  ca_bars_total: number
  ca_stands_total: number
  ca_billetterie_total: number
  depenses_total: number
  salaires_total: number
}

function formatCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' CFA'
}

function StatCard({ title, value, icon: Icon, color, trend, sub }: {
  title: string, value: string, icon: any, color: string, trend?: 'up' | 'down', sub?: string
}) {
  return (
    <div className="stat-card sdc-card-hover cursor-default">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">{title}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + '20' }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <div className="text-xl font-black text-white mb-1">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
      {trend && (
        <div className={`flex items-center gap-1 text-xs mt-1 ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
          {trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          vs hier
        </div>
      )}
    </div>
  )
}

const mockWeekly = [
  { jour: 'Lun', bars: 0, stands: 0, billets: 0 },
  { jour: 'Mar', bars: 0, stands: 0, billets: 0 },
  { jour: 'Mer', bars: 0, stands: 0, billets: 0 },
  { jour: 'Jeu', bars: 0, stands: 0, billets: 0 },
  { jour: 'Ven', bars: 0, stands: 0, billets: 0 },
  { jour: 'Sam', bars: 0, stands: 0, billets: 0 },
  { jour: 'Dim', bars: 0, stands: 0, billets: 0 },
]

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [alertes, setAlertes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

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
  const depTotal = (data?.depenses_jour || 0) + (data?.salaires_jour || 0)
  const benefJour = caJour - depTotal
  const caTotal = (data?.ca_bars_total || 0) + (data?.ca_stands_total || 0) + (data?.ca_billetterie_total || 0)
  const depTotalGlobal = (data?.depenses_total || 0) + (data?.salaires_total || 0)
  const benefTotal = caTotal - depTotalGlobal

  const daysLeft = Math.ceil((new Date('2026-07-19').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  const daysElapsed = 51 - Math.max(0, daysLeft)

  return (
    <div>
      <TopBar title="Tableau de bord" />
      <div className="p-6">

        {/* Event progress bar */}
        <div className="sdc-card p-5 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="font-black text-white text-lg">🏆 Le Spécial 51 Jours Chrono du Mondial</h2>
              <p className="text-slate-400 text-sm mt-0.5 capitalize">{today} · Espace Pavageau, Ebimpé</p>
            </div>
            <button onClick={() => setRefresh(r => r + 1)}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg sdc-btn-primary">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-12">J{daysElapsed}</span>
            <div className="flex-1 h-2 rounded-full" style={{ background: '#1E293B' }}>
              <div className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${(daysElapsed / 51) * 100}%`, background: 'linear-gradient(90deg, #F97316, #F59E0B)' }} />
            </div>
            <span className="text-xs text-slate-400 w-16 text-right">{daysLeft}j restants</span>
          </div>
        </div>

        {/* Alertes */}
        {alertes.length > 0 && (
          <div className="mb-6 p-4 rounded-xl border" style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-red-400" />
              <span className="font-bold text-red-400 text-sm">{alertes.length} alerte(s) active(s)</span>
            </div>
            {alertes.map((a, i) => (
              <div key={i} className="text-sm text-slate-300 py-1 border-t border-red-900/30 first:border-0">
                ⚠️ {a.message}
              </div>
            ))}
          </div>
        )}

        {/* Stats JOUR */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} style={{ color: '#F97316' }} />
            <span className="font-bold text-white text-sm">Aujourd'hui</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="CA Bars" value={formatCFA(data?.ca_bars_jour || 0)} icon={ShoppingBag} color="#F97316" trend="up" />
            <StatCard title="CA Stands" value={formatCFA(data?.ca_stands_jour || 0)} icon={DollarSign} color="#F59E0B" trend="up" />
            <StatCard title="Billetterie" value={formatCFA(data?.ca_billetterie_jour || 0)} icon={Ticket} color="#16A34A" />
            <StatCard title="Dépenses" value={formatCFA(depTotal)} icon={TrendingDown} color="#EF4444" />
          </div>
        </div>

        {/* Bénéfice jour */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="p-5 rounded-xl" style={{
            background: benefJour >= 0 ? 'linear-gradient(135deg, rgba(22,163,74,0.15), rgba(22,163,74,0.05))' : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
            border: `1px solid ${benefJour >= 0 ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`
          }}>
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Bénéfice estimé du jour</div>
            <div className={`text-2xl font-black ${benefJour >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {benefJour >= 0 ? '+' : ''}{formatCFA(benefJour)}
            </div>
          </div>
          <div className="p-5 rounded-xl" style={{
            background: benefTotal >= 0 ? 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(249,115,22,0.05))' : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
            border: `1px solid ${benefTotal >= 0 ? 'rgba(249,115,22,0.3)' : 'rgba(239,68,68,0.3)'}`
          }}>
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Bénéfice global événement</div>
            <div className={`text-2xl font-black ${benefTotal >= 0 ? 'text-orange-400' : 'text-red-400'}`}>
              {benefTotal >= 0 ? '+' : ''}{formatCFA(benefTotal)}
            </div>
          </div>
        </div>

        {/* Stats GLOBAL */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} style={{ color: '#F59E0B' }} />
            <span className="font-bold text-white text-sm">Total événement</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="CA Bars Total" value={formatCFA(data?.ca_bars_total || 0)} icon={ShoppingBag} color="#F97316" sub="Depuis l'ouverture" />
            <StatCard title="CA Stands Total" value={formatCFA(data?.ca_stands_total || 0)} icon={DollarSign} color="#F59E0B" sub="Depuis l'ouverture" />
            <StatCard title="Billetterie Total" value={formatCFA(data?.ca_billetterie_total || 0)} icon={Ticket} color="#16A34A" sub="Depuis l'ouverture" />
            <StatCard title="Dépenses Totales" value={formatCFA(depTotalGlobal)} icon={TrendingDown} color="#EF4444" sub="Dont salaires" />
          </div>
        </div>

        {/* Graphique hebdo */}
        <div className="sdc-card p-5">
          <h3 className="font-bold text-white mb-4 text-sm">Évolution CA — 7 derniers jours</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mockWeekly}>
              <defs>
                <linearGradient id="bars" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="stands" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="jour" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? '0' : (v/1000) + 'k'} />
              <Tooltip
                contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, color: '#F8FAFC' }}
                formatter={(v: any) => formatCFA(v)}
              />
              <Area type="monotone" dataKey="bars" stroke="#F97316" fill="url(#bars)" strokeWidth={2} name="Bars" />
              <Area type="monotone" dataKey="stands" stroke="#F59E0B" fill="url(#stands)" strokeWidth={2} name="Stands" />
              <Area type="monotone" dataKey="billets" stroke="#16A34A" fill="none" strokeWidth={2} name="Billets" strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            {[['Bars', '#F97316'], ['Stands', '#F59E0B'], ['Billets', '#16A34A']].map(([l, c]) => (
              <div key={l} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-3 h-3 rounded-sm" style={{ background: c as string }}></span>{l}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
