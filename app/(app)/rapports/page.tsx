'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import { Download, BarChart3, ArrowRight, Music, TrendingUp, TrendingDown } from 'lucide-react'
import RoleGuard from '@/components/RoleGuard'

function formatCFA(n: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' CFA' }

function BarRow({ label, value, max, color, sublabel }: { label: string, value: number, max: number, color: string, sublabel?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <div>
          <span className="text-xs text-slate-300">{label}</span>
          {sublabel && <span className="text-xs text-slate-500 ml-2">{sublabel}</span>}
        </div>
        <span className="text-xs font-bold text-white">{formatCFA(value)}</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#0F172A' }}>
        <div className="h-2.5 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

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

  if (loading) return (
    <div>
      <TopBar title="Rapports & Exports" />
      <div className="flex items-center justify-center h-64 text-slate-500">Chargement...</div>
    </div>
  )

  const caTotal = (data?.ca_bars_total || 0) + (data?.ca_stands_total || 0) + (data?.ca_billetterie_total || 0)
  const depTotal = (data?.depenses_total || 0) + (data?.salaires_total || 0)
  const benefice = caTotal - depTotal
  const margeNette = caTotal > 0 ? ((benefice / caTotal) * 100).toFixed(1) : '0'
  const maxRevenu = Math.max(data?.ca_bars_total || 0, data?.ca_stands_total || 0, data?.ca_billetterie_total || 0, 1)
  const maxCharge = Math.max(data?.depenses_total || 0, data?.salaires_total || 0, 1)
  const maxArtiste = artistes.length > 0 ? Math.max(...artistes.map(a => a.cachet)) : 1

  async function exportCSV() {
    const rows = [
      ['RAPPORT SDC MANAGER — Le Spécial 51 Jours Chrono du Mondial 2026'],
      ['Organisateur', 'Son Du Ciel Events'],
      ['Contact', '+225 05 65 48 24 55'],
      ['Lieu', "Terrain du village d'Ebimpé, Abidjan"],
      ['Généré le', new Date().toLocaleDateString('fr-FR')],
      [''],
      ['INDICATEUR', 'MONTANT (CFA)'],
      ['CA Bars', data?.ca_bars_total || 0],
      ['CA Stands', data?.ca_stands_total || 0],
      ['CA Billetterie', data?.ca_billetterie_total || 0],
      ['Total Revenus', caTotal],
      [''],
      ['Total Dépenses', data?.depenses_total || 0],
      ['Total Salaires', data?.salaires_total || 0],
      ['Total Charges', depTotal],
      [''],
      ['Bénéfice Net', benefice],
      ['Marge Nette (%)', margeNette + '%'],
      [''],
      ['ARTISTES', 'CACHET', 'PAYÉ', 'SOLDE', 'STATUT'],
      ...artistes.map(a => [a.nom_artiste, a.cachet, a.cachet_paye, a.cachet - a.cachet_paye, a.statut])
    ]
    const csv = rows.map(r => r.join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `SDC_Manager_Rapport_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <TopBar title="Rapports & Exports" />
      <div className="p-4 sm:p-6 space-y-4">

        {/* KPIs principaux */}
        <div className="grid grid-cols-2 gap-3">
          <div className="sdc-card p-4">
            <div className="text-xs text-slate-400 uppercase mb-1">CA Total</div>
            <div className="text-lg font-black text-white">{formatCFA(caTotal)}</div>
          </div>
          <div className="sdc-card p-4">
            <div className="text-xs text-slate-400 uppercase mb-1">Charges Totales</div>
            <div className="text-lg font-black text-red-400">{formatCFA(depTotal)}</div>
          </div>
          <div className="p-4 rounded-xl col-span-2" style={{
            background: benefice >= 0 ? 'rgba(22,163,74,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${benefice >= 0 ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`
          }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 uppercase mb-1">Bénéfice Net</div>
                <div className={`text-2xl font-black ${benefice >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {benefice >= 0 ? '+' : ''}{formatCFA(benefice)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400 uppercase mb-1">Marge</div>
                <div className={`text-2xl font-black ${benefice >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {margeNette}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenus */}
        <div className="sdc-card p-5">
          <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
            <TrendingUp size={15} style={{ color: '#16A34A' }} />
            Revenus par source
          </h3>
          <BarRow label="CA Bars" value={data?.ca_bars_total || 0} max={maxRevenu} color="#F97316" />
          <BarRow label="CA Stands" value={data?.ca_stands_total || 0} max={maxRevenu} color="#F59E0B" />
          <BarRow label="Billetterie" value={data?.ca_billetterie_total || 0} max={maxRevenu} color="#16A34A" />
          <div className="mt-3 pt-3 border-t flex justify-between" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <span className="text-xs text-slate-400">Total revenus</span>
            <span className="text-sm font-black text-white">{formatCFA(caTotal)}</span>
          </div>
        </div>

        {/* Charges */}
        <div className="sdc-card p-5">
          <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
            <TrendingDown size={15} style={{ color: '#EF4444' }} />
            Charges
          </h3>
          <BarRow label="Dépenses opérationnelles" value={data?.depenses_total || 0} max={Math.max(depTotal, 1)} color="#EF4444" />
          <BarRow label="Masse salariale" value={data?.salaires_total || 0} max={Math.max(depTotal, 1)} color="#EC4899" />
          <div className="mt-3 pt-3 border-t flex justify-between" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <span className="text-xs text-slate-400">Total charges</span>
            <span className="text-sm font-black text-red-400">{formatCFA(depTotal)}</span>
          </div>
        </div>

        {/* Artistes & Cachets */}
        {artistes.length > 0 && (
          <div className="sdc-card overflow-hidden">
            <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: 'rgba(249,115,22,0.1)' }}>
              <Music size={15} style={{ color: '#F97316' }} />
              <h3 className="font-bold text-white text-sm">Artistes & Cachets</h3>
            </div>

            {/* Barres artistes */}
            <div className="p-4 space-y-3">
              {artistes.map(a => {
                const restant = a.cachet - a.cachet_paye
                const pctPaye = a.cachet > 0 ? Math.round((a.cachet_paye / a.cachet) * 100) : 0
                return (
                  <div key={a.id} className="p-3 rounded-xl" style={{ background: '#0F172A' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-bold text-white text-sm">{a.nom_artiste}</div>
                        <div className="text-xs text-slate-500">
                          {a.date_prestation ? new Date(a.date_prestation).toLocaleDateString('fr-FR') : 'Date TBD'}
                        </div>
                      </div>
                      <span className={`badge text-xs px-2 py-0.5 rounded-full font-bold ${
                        a.statut === 'paye' ? 'success-badge' :
                        a.statut === 'confirme' ? 'warning-badge' : 'alert-badge'
                      }`}>{a.statut}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                      <div><div className="text-slate-500">Cachet</div><div className="font-bold text-white">{formatCFA(a.cachet)}</div></div>
                      <div><div className="text-slate-500">Payé</div><div className="font-bold text-green-400">{formatCFA(a.cachet_paye)}</div></div>
                      <div><div className="text-slate-500">Reste</div><div className={`font-bold ${restant > 0 ? 'text-red-400' : 'text-green-400'}`}>{formatCFA(restant)}</div></div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1E293B' }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${pctPaye}%`, background: pctPaye === 100 ? '#16A34A' : '#F97316' }} />
                    </div>
                    <div className="text-xs text-slate-500 mt-1 text-right">{pctPaye}% payé</div>
                  </div>
                )
              })}
            </div>

            {/* Tableau récap */}
            <div className="overflow-x-auto border-t" style={{ borderColor: 'rgba(249,115,22,0.1)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <th className="text-left p-3 text-slate-500 uppercase">Artiste</th>
                    <th className="text-right p-3 text-slate-500 uppercase">Cachet</th>
                    <th className="text-right p-3 text-slate-500 uppercase">Payé</th>
                    <th className="text-right p-3 text-slate-500 uppercase">Reste</th>
                  </tr>
                </thead>
                <tbody>
                  {artistes.map(a => (
                    <tr key={a.id} className="border-t hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      <td className="p-3 font-medium text-white">{a.nom_artiste}</td>
                      <td className="p-3 text-right text-white">{formatCFA(a.cachet)}</td>
                      <td className="p-3 text-right text-green-400">{formatCFA(a.cachet_paye)}</td>
                      <td className={`p-3 text-right font-bold ${(a.cachet - a.cachet_paye) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {formatCFA(a.cachet - a.cachet_paye)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t" style={{ borderColor: 'rgba(249,115,22,0.2)', background: 'rgba(249,115,22,0.05)' }}>
                    <td className="p-3 font-black text-white">TOTAL</td>
                    <td className="p-3 text-right font-black text-white">{formatCFA(artistes.reduce((s, a) => s + a.cachet, 0))}</td>
                    <td className="p-3 text-right font-black text-green-400">{formatCFA(artistes.reduce((s, a) => s + a.cachet_paye, 0))}</td>
                    <td className="p-3 text-right font-black text-red-400">{formatCFA(artistes.reduce((s, a) => s + (a.cachet - a.cachet_paye), 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Export */}
        <div className="sdc-card p-5">
          <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
            <Download size={15} style={{ color: '#F97316' }} />
            Exports pour sponsors & partenaires
          </h3>
          <div className="space-y-3">
            <button onClick={exportCSV}
              className="w-full flex items-center justify-between p-4 rounded-xl hover:opacity-90 transition-opacity text-left"
              style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)' }}>
              <div>
                <div className="font-bold text-green-400 text-sm">Export CSV — Bilan complet</div>
                <div className="text-xs text-slate-400 mt-0.5">Revenus, charges, artistes, marges</div>
              </div>
              <ArrowRight size={16} className="text-green-400 flex-shrink-0" />
            </button>
            <div className="w-full flex items-center justify-between p-4 rounded-xl opacity-40"
              style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)' }}>
              <div>
                <div className="font-bold text-orange-400 text-sm">Export PDF — Rapport sponsor</div>
                <div className="text-xs text-slate-400 mt-0.5">Disponible bientôt</div>
              </div>
              <ArrowRight size={16} className="text-orange-400 flex-shrink-0" />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
