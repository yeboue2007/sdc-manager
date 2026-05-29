'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import { Plus, UtensilsCrossed, TrendingUp, AlertCircle } from 'lucide-react'

function formatCFA(n: number) { return new Intl.NumberFormat('fr-FR').format(n) + ' CFA' }

export default function StandsPage() {
  const [stands, setStands] = useState<any[]>([])
  const [declarations, setDeclarations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showDecl, setShowDecl] = useState(false)
  const [form, setForm] = useState({ stand_id: '', date: new Date().toISOString().split('T')[0], ca_declare: '', montant_paye: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [standsRes, declRes] = await Promise.all([
      supabase.from('stands_nourriture').select('*').eq('actif', true),
      supabase.from('declarations_stands').select('*, stands_nourriture(nom, type_contrat, pourcentage_ventes, montant_location)').order('date', { ascending: false }).limit(30)
    ])
    if (standsRes.data) setStands(standsRes.data)
    if (declRes.data) setDeclarations(declRes.data)
    setLoading(false)
  }

  function calcMontantDu(standId: string, caDeclare: number) {
    const stand = stands.find(s => s.id === standId)
    if (!stand) return 0
    if (stand.type_contrat === 'location_fixe') return stand.montant_location
    return (caDeclare * stand.pourcentage_ventes) / 100
  }

  async function handleSubmit() {
    setSaving(true)
    const montantDu = calcMontantDu(form.stand_id, parseFloat(form.ca_declare) || 0)
    await supabase.from('declarations_stands').insert({
      stand_id: form.stand_id,
      date: form.date,
      ca_declare: parseFloat(form.ca_declare) || 0,
      montant_du: montantDu,
      montant_paye: parseFloat(form.montant_paye) || 0,
      notes: form.notes
    })
    setSaving(false)
    setShowDecl(false)
    loadData()
  }

  const totalDettes = declarations.reduce((sum, d) => sum + (d.solde || 0), 0)
  const totalCA = declarations.reduce((sum, d) => sum + (d.ca_declare || 0), 0)

  return (
    <div>
      <TopBar title="Stands Nourriture" />
      <div className="p-6">

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="sdc-card p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">CA Total Déclaré</div>
            <div className="text-xl font-black text-white">{formatCFA(totalCA)}</div>
          </div>
          <div className="sdc-card p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Dettes en cours</div>
            <div className={`text-xl font-black ${totalDettes > 0 ? 'text-red-400' : 'text-green-400'}`}>{formatCFA(totalDettes)}</div>
          </div>
          <div className="sdc-card p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Stands actifs</div>
            <div className="text-xl font-black text-white">{stands.length}</div>
          </div>
        </div>

        {/* Cards stands */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {stands.map(s => {
            const decls = declarations.filter(d => d.stand_id === s.id)
            const totalStandCA = decls.reduce((sum, d) => sum + d.ca_declare, 0)
            const totalStandDette = decls.reduce((sum, d) => sum + d.solde, 0)
            return (
              <div key={s.id} className="sdc-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-white">{s.nom}</div>
                    <div className="text-xs text-slate-400">{s.responsable_nom} · {s.responsable_tel}</div>
                  </div>
                  <span className={`badge ${s.type_contrat === 'location_fixe' ? 'warning-badge' : 'success-badge'}`}>
                    {s.type_contrat === 'location_fixe' ? `${formatCFA(s.montant_location)}/j` : `${s.pourcentage_ventes}%`}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="text-xs">
                    <div className="text-slate-500">CA déclaré</div>
                    <div className="font-bold text-white">{formatCFA(totalStandCA)}</div>
                  </div>
                  <div className="text-xs">
                    <div className="text-slate-500">Dette</div>
                    <div className={`font-bold ${totalStandDette > 0 ? 'text-red-400' : 'text-green-400'}`}>{formatCFA(totalStandDette)}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Nouvelle déclaration */}
        <div className="flex justify-end mb-4">
          <button onClick={() => setShowDecl(!showDecl)} className="sdc-btn-primary flex items-center gap-2">
            <Plus size={16} /> Déclaration stand
          </button>
        </div>

        {showDecl && (
          <div className="sdc-card p-6 mb-6">
            <h3 className="font-bold text-white mb-4">Déclaration quotidienne stand</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Stand</label>
                <select value={form.stand_id} onChange={e => setForm({...form, stand_id: e.target.value})} className="sdc-input">
                  <option value="">Sélectionner...</option>
                  {stands.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="sdc-input" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">CA Déclaré (CFA)</label>
                <input type="number" placeholder="0" value={form.ca_declare} onChange={e => setForm({...form, ca_declare: e.target.value})} className="sdc-input" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Montant payé ce soir (CFA)</label>
                <input type="number" placeholder="0" value={form.montant_paye} onChange={e => setForm({...form, montant_paye: e.target.value})} className="sdc-input" />
              </div>
            </div>
            {form.stand_id && form.ca_declare && (
              <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(249,115,22,0.1)' }}>
                <span className="text-sm text-slate-400">Montant dû : </span>
                <span className="font-black text-white">{formatCFA(calcMontantDu(form.stand_id, parseFloat(form.ca_declare)))}</span>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={handleSubmit} disabled={saving} className="sdc-btn-primary flex-1">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
              <button onClick={() => setShowDecl(false)} className="px-4 py-2 rounded-lg text-slate-400 hover:text-white" style={{ background: '#1E293B' }}>Annuler</button>
            </div>
          </div>
        )}

        {/* Historique */}
        <div className="sdc-card overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: 'rgba(249,115,22,0.1)' }}>
            <h3 className="font-bold text-white text-sm">Historique déclarations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <th className="text-left p-3 text-slate-500 font-medium text-xs uppercase">Date</th>
                  <th className="text-left p-3 text-slate-500 font-medium text-xs uppercase">Stand</th>
                  <th className="text-right p-3 text-slate-500 font-medium text-xs uppercase">CA</th>
                  <th className="text-right p-3 text-slate-500 font-medium text-xs uppercase">Dû</th>
                  <th className="text-right p-3 text-slate-500 font-medium text-xs uppercase">Payé</th>
                  <th className="text-right p-3 text-slate-500 font-medium text-xs uppercase">Solde</th>
                </tr>
              </thead>
              <tbody>
                {declarations.map(d => (
                  <tr key={d.id} className="border-t hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <td className="p-3 text-white">{new Date(d.date).toLocaleDateString('fr-FR')}</td>
                    <td className="p-3 text-slate-300">{d.stands_nourriture?.nom}</td>
                    <td className="p-3 text-right text-slate-300">{formatCFA(d.ca_declare)}</td>
                    <td className="p-3 text-right text-slate-300">{formatCFA(d.montant_du)}</td>
                    <td className="p-3 text-right text-green-400">{formatCFA(d.montant_paye)}</td>
                    <td className={`p-3 text-right font-bold ${d.solde > 0 ? 'text-red-400' : 'text-green-400'}`}>{formatCFA(d.solde)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
