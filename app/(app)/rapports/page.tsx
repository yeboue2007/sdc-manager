'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import { Download, BarChart3, TrendingUp, FileText, ArrowRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

function formatCFA(n: number) { return new Intl.NumberFormat('fr-FR').format(n) + ' CFA' }

export default function RapportsPage() {
  const [data, setData] = useState<any>(null)
  const [artistes, setArtistes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [dashRes, artRes] = await Promise.all([
        supabase.from('dashboard_journalier').select('*').single(),
        supabase.from('artistes').select('*').order('date_prestation')
      ])
      if (dashRes.data) setData(dashRes.data)
      if (artRes.data) setArtistes(artRes.data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-500">Chargement...</div>

  const caTotal = (data?.ca_bars_total || 0) + (data?.ca_stands_total || 0) + (data?.ca_billetterie_total || 0)
  const depTotal = (data?.depenses_total || 0) + (data?.salaires_total || 0)
  const benefice = caTotal - depTotal
  const margeNette = caTotal > 0 ? ((benefice / caTotal) * 100).toFixed(1) : '0'

  const synthese = [
    { label: 'CA Bars', value: data?.ca_bars_total || 0, color: '#F97316' },
    { label: 'CA Stands', value: data?.ca_stands_total || 0, color: '#F59E0B' },
    { label: 'Billetterie', value: data?.ca_billetterie_total || 0, color: '#16A34A' },
    { label: 'Dépenses', value: -(data?.depenses_total || 0), color: '#EF4444' },
    { label: 'Salaires', value: -(data?.salaires_total || 0), color: '#EC4899' },
  ]

  const artistesCachets = artistes.map(a => ({ name: a.nom_artiste, cachet: a.cachet, paye: a.cachet_paye }))

  async function exportCSV() {
    const rows = [
      ['Rapport SDC Manager — Le Spécial 51 Jours Chrono du Mondial 2026'],
      ['Généré le', new Date().toLocaleDateString('fr-FR')],
      [''],
      ['INDICATEUR', 'MONTANT (CFA)'],
      ['CA Bars', data?.ca_bars_total || 0],
      ['CA Stands', data?.ca_stands_total || 0],
      ['CA Billetterie', data?.ca_billetterie_total || 0],
      ['Total Revenus', caTotal],
      ['Total Dépenses', data?.depenses_total || 0],
      ['Total Salaires', data?.salaires_total || 0],
      ['Total Charges', depTotal],
      ['Bénéfice Net', benefice],
      ['Marge Nette (%)', margeNette + '%'],
      [''],
      ['ARTISTES', 'CACHET', 'PAYÉ', 'SOLDE'],
      ...artistes.map(a => [a.nom_artiste, a.cachet, a.cachet_paye, a.cachet - a.cachet_paye])
    ]
    const csv = rows.map(r => r.join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `SDC_Manager_Rapport_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div>
      <TopBar title="Rapports & Exports" />
      <div className="p-6">

        {/* Bilan global */}
        <div className="sdc-card p-6 mb-6">
          <h2 className="font-black text-white text-lg mb-4 flex items-center gap-2">
            <BarChart3 size={20} style={{ color: '#F97316' }} />
            Bilan Événement — Mondial 2026
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="p-3 rounded-lg" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}>
              <div className="text-xs text-slate-400 mb-1">CA Total</div>
              <div className="font-black text-white">{formatCFA(caTotal)}</div>
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <div className="text-xs text-slate-400 mb-1">Charges Totales</div>
              <div className="font-black text-red-400">{formatCFA(depTotal)}</div>
            </div>
            <div className="p-3 rounded-lg" style={{ background: benefice >= 0 ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${benefice >= 0 ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
              <div className="text-xs text-slate-400 mb-1">Bénéfice Net</div>
              <div className={`font-black ${benefice >= 0 ? 'text-green-400' : 'text-red-400'}`}>{benefice >= 0 ? '+' : ''}{formatCFA(benefice)}</div>
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div className="text-xs text-slate-400 mb-1">Marge Nette</div>
              <div className="font-black text-blue-400">{margeNette}%</div>
            </div>
          </div>

          {/* Bar chart synthèse */}
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={synthese} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => (Math.abs(v) / 1000000).toFixed(1) + 'M'} />
              <Tooltip contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 8, color: '#F8FAFC' }} formatter={(v: any) => formatCFA(Math.abs(v))} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {synthese.map((s, i) => (
                  <rect key={i} fill={s.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Artistes & cachets */}
        <div className="sdc-card overflow-hidden mb-6">
          <div className="p-4 border-b" style={{ borderColor: 'rgba(249,115,22,0.1)' }}>
            <h3 className="font-bold text-white text-sm">🎤 Artistes & Cachets</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                <th className="text-left p-3 text-slate-500 font-medium text-xs uppercase">Artiste</th>
                <th className="text-left p-3 text-slate-500 font-medium text-xs uppercase">Date</th>
                <th className="text-right p-3 text-slate-500 font-medium text-xs uppercase">Cachet</th>
                <th className="text-right p-3 text-slate-500 font-medium text-xs uppercase">Payé</th>
                <th className="text-right p-3 text-slate-500 font-medium text-xs uppercase">Reste</th>
                <th className="text-center p-3 text-slate-500 font-medium text-xs uppercase">Statut</th>
              </tr>
            </thead>
            <tbody>
              {artistes.map(a => (
                <tr key={a.id} className="border-t hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <td className="p-3 font-medium text-white">{a.nom_artiste}</td>
                  <td className="p-3 text-slate-400">{a.date_prestation ? new Date(a.date_prestation).toLocaleDateString('fr-FR') : '—'}</td>
                  <td className="p-3 text-right text-white">{formatCFA(a.cachet)}</td>
                  <td className="p-3 text-right text-green-400">{formatCFA(a.cachet_paye)}</td>
                  <td className="p-3 text-right text-red-400">{formatCFA(a.cachet - a.cachet_paye)}</td>
                  <td className="p-3 text-center">
                    <span className={`badge ${a.statut === 'paye' ? 'success-badge' : a.statut === 'confirme' ? 'warning-badge' : 'alert-badge'}`}>
                      {a.statut}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Exports */}
        <div className="sdc-card p-5">
          <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
            <Download size={16} style={{ color: '#F97316' }} />
            Exports pour sponsors & partenaires
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={exportCSV} className="flex items-center justify-between p-4 rounded-xl hover:opacity-90 transition-opacity text-left"
              style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)' }}>
              <div>
                <div className="font-bold text-green-400 text-sm">Export CSV — Bilan complet</div>
                <div className="text-xs text-slate-400 mt-0.5">Revenus, charges, artistes</div>
              </div>
              <ArrowRight size={16} className="text-green-400" />
            </button>
            <button className="flex items-center justify-between p-4 rounded-xl hover:opacity-90 transition-opacity text-left opacity-50 cursor-not-allowed"
              style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)' }}>
              <div>
                <div className="font-bold text-orange-400 text-sm">Export PDF — Rapport sponsor</div>
                <div className="text-xs text-slate-400 mt-0.5">Dossier de performance (bientôt)</div>
              </div>
              <ArrowRight size={16} className="text-orange-400" />
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
