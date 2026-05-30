'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import InstallPrompt from '@/components/InstallPrompt'
import { TrendingUp, TrendingDown, ShoppingBag, DollarSign, Ticket, AlertTriangle, RefreshCw, Calendar } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

function formatCFA(n: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' CFA' }

function StatCard({ title, value, icon: Icon, color, sub }: { title: string, value: string, icon: any, color: string, sub?: string }) {
  return (
    <div className="stat-card sdc-card-hover">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">{title}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + '20' }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <div className="text-lg font-black text-white mb-1 truncate">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
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

  const weekData = [
    { j: 'J-6', ca: 0, dep: 0 }, { j: 'J-5', ca: 0, dep: 0 },
    { j: 'J-4', ca: 0, dep: 0 }, { j: 'J-3', ca: 0, dep: 0 },
    { j: 'J-2', ca: 0, dep: 0 }, { j: 'Hier', ca: 0, dep: 0 },
    { j: 'Auj.', ca: caJour, dep: chargesJour },
  ]

  return (
    <div>
      <TopBar title="Tableau de bord" />
      <div className="p-4 sm:p-6">

        {/* Bandeau installation PWA */}
        <InstallPrompt />

        {/* Progression événement */}
        <div className="sdc-card p-5 mb-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-black text-white text-base sm:text-lg">🏆 Le Spécial 51 Jours Chrono du Mondial</h2>
              <p className="text-slate-400 text-xs mt-0.5 capitalize">{today} · Espace Pavageau, Ebimpé</p>
            </div>
            <button onClick={() => setRefresh(r => r + 1)} className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg sdc-btn-primary">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs text-slate-400 w-10 text-right">J{elapsed}</span>
            <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: '#1E293B' }}>
              <div className="h-3 rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #F97316, #F59E0B)' }} />
            </div>
            <span className="text-xs text-slate-400 w-16">{daysLeft}j restants</span>
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>30 Mai 2026</span>
            <span className="text-orange-400 font-bold">{pct}% écoulé</span>
            <span>19 Juil. 2026</span>
          </div>
        </div>

        {/* Alertes */}
        {alertes.length > 0 && (
          <div className="mb-5 p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={15} className="text-red-400" />
              <span className="font-bold text-red-400 text-sm">{alertes.length} alerte(s) active(s)</span>
            </div>
            {alertes.map((a, i) => (
              <div key={i} className="text-xs text-slate-300 py-1.5 border-t border-red-900/20 first:border-0">⚠️ {a.message}</div>
            ))}
          </div>
        )}

        {/* Stats JOUR */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={14} style={{ color: '#F97316' }} />
            <span className="font-bold text-white text-sm">Aujourd'hui</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard title="CA Bars" value={formatCFA(data?.ca_bars_jour || 0)} icon={ShoppingBag} color="#F97316" />
            <StatCard title="CA Stands" value={formatCFA(data?.ca_stands_jour || 0)} icon={DollarSign} color="#F59E0B" />
            <StatCard title="Billetterie" value={formatCFA(data?.ca_billetterie_jour || 0)} icon={Ticket} color="#16A34A" />
            <StatCard title="Dépenses" value={formatCFA(chargesJour)} icon={TrendingDown} color="#EF4444" />
          </div>
        </div>

        {/* Bénéfices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div className="p-4 rounded-xl" style={{
            background: benefJour >= 0 ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${benefJour >= 0 ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`
          }}>
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Bénéfice du jour</div>
            <div className={`text-2xl font-black ${benefJour >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {benefJour >= 0 ? '+' : ''}{formatCFA(benefJour)}
            </div>
          </div>
          <div className="p-4 rounded-xl" style={{
            background: benefTotal >= 0 ? 'rgba(249,115,22,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${benefTotal >= 0 ? 'rgba(249,115,22,0.3)' : 'rgba(239,68,68,0.3)'}`
          }}>
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Bénéfice global</div>
            <div className={`text-2xl font-black ${benefTotal >= 0 ? 'text-orange-400' : 'text-red-400'}`}>
              {benefTotal >= 0 ? '+' : ''}{formatCFA(benefTotal)}
            </div>
          </div>
        </div>

        {/* Stats GLOBAL */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} style={{ color: '#F59E0B' }} />
            <span className="font-bold text-white text-sm">Totaux événement</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard title="CA Bars total" value={formatCFA(data?.ca_bars_total || 0)} icon={ShoppingBag} color="#F97316" sub="Depuis l'ouverture" />
            <StatCard title="CA Stands total" value={formatCFA(data?.ca_stands_total || 0)} icon={DollarSign} color="#F59E0B" sub="Depuis l'ouverture" />
            <StatCard title="Billetterie total" value={formatCFA(data?.ca_billetterie_total || 0)} icon={Ticket} color="#16A34A" sub="Depuis l'ouverture" />
            <StatCard title="Charges totales" value={formatCFA(chargesTotal)} icon={TrendingDown} color="#EF4444" sub="Dépenses + salaires" />
          </div>
        </div>

        {/* Graphique */}
        <div className="sdc-card p-5">
          <h3 className="font-bold text-white text-sm mb-4">Évolution CA — 7 derniers jours</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={weekData}>
              <defs>
                <linearGradient id="gCA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gDep" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="j" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? '0' : Math.round(v / 1000) + 'k'} />
              <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, color: '#F8FAFC', fontSize: 12 }} formatter={(v: any) => formatCFA(v)} />
              <Area type="monotone" dataKey="ca" stroke="#F97316" fill="url(#gCA)" strokeWidth={2} name="CA" />
              <Area type="monotone" dataKey="dep" stroke="#EF4444" fill="url(#gDep)" strokeWidth={2} name="Charges" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            {[['CA total', '#F97316'], ['Charges', '#EF4444']].map(([l, c]) => (
              <div key={l} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-3 h-1.5 rounded-full" style={{ background: c as string }}></span>{l}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
