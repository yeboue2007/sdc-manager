'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import { Plus, CreditCard, AlertTriangle, CheckCircle } from 'lucide-react'

function formatCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' CFA'
}

export default function CaissesPage() {
  const [declarations, setDeclarations] = useState<any[]>([])
  const [points, setPoints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    point_de_vente_id: '',
    montant_cash: '',
    montant_mobile_money: '',
    montant_carte: '',
    notes: '',
    ecart_stock: '',
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [declRes, pointsRes] = await Promise.all([
      supabase.from('caisses_encaissements').select('*, points_de_vente(nom)').order('date', { ascending: false }).limit(20),
      supabase.from('points_de_vente').select('*').eq('actif', true)
    ])
    if (declRes.data) setDeclarations(declRes.data)
    if (pointsRes.data) setPoints(pointsRes.data)
    setLoading(false)
  }

  async function handleSubmit() {
    setSaving(true)
    const { error } = await supabase.from('caisses_encaissements').insert({
      date: form.date,
      point_de_vente_id: form.point_de_vente_id || null,
      montant_cash: parseFloat(form.montant_cash) || 0,
      montant_mobile_money: parseFloat(form.montant_mobile_money) || 0,
      montant_carte: parseFloat(form.montant_carte) || 0,
      notes: form.notes,
      ecart_stock: parseFloat(form.ecart_stock) || 0,
      alerte_ecart: (parseFloat(form.ecart_stock) || 0) > 5000,
    })
    setSaving(false)
    if (!error) {
      setSuccess(true)
      setShowForm(false)
      loadData()
      setTimeout(() => setSuccess(false), 3000)
      setForm({ date: new Date().toISOString().split('T')[0], point_de_vente_id: '', montant_cash: '', montant_mobile_money: '', montant_carte: '', notes: '', ecart_stock: '' })
    }
  }

  const totalJour = declarations
    .filter(d => d.date === new Date().toISOString().split('T')[0])
    .reduce((sum, d) => sum + (d.montant_total_theorique || 0), 0)

  return (
    <div>
      <TopBar title="Caisses & Encaissements" />
      <div className="p-6">

        {success && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-lg text-green-400" style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)' }}>
            <CheckCircle size={16} /> Déclaration enregistrée avec succès
          </div>
        )}

        {/* Résumé */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="sdc-card p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">CA Bars — Aujourd'hui</div>
            <div className="text-xl font-black text-white">{formatCFA(totalJour)}</div>
          </div>
          <div className="sdc-card p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Déclarations du jour</div>
            <div className="text-xl font-black text-white">
              {declarations.filter(d => d.date === new Date().toISOString().split('T')[0]).length}
            </div>
          </div>
          <div className="sdc-card p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Alertes écart</div>
            <div className="text-xl font-black text-red-400">
              {declarations.filter(d => d.alerte_ecart).length}
            </div>
          </div>
        </div>

        {/* Bouton ajouter */}
        <div className="flex justify-end mb-4">
          <button onClick={() => setShowForm(!showForm)} className="sdc-btn-primary flex items-center gap-2">
            <Plus size={16} />
            Nouvelle déclaration
          </button>
        </div>

        {/* Formulaire */}
        {showForm && (
          <div className="sdc-card p-6 mb-6">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <CreditCard size={18} style={{ color: '#F97316' }} />
              Déclaration de caisse
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="sdc-input" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Point de vente</label>
                <select value={form.point_de_vente_id} onChange={e => setForm({...form, point_de_vente_id: e.target.value})} className="sdc-input">
                  <option value="">Sélectionner...</option>
                  {points.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Montant Cash (CFA)</label>
                <input type="number" placeholder="0" value={form.montant_cash} onChange={e => setForm({...form, montant_cash: e.target.value})} className="sdc-input" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Mobile Money (CFA)</label>
                <input type="number" placeholder="0" value={form.montant_mobile_money} onChange={e => setForm({...form, montant_mobile_money: e.target.value})} className="sdc-input" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Carte bancaire (CFA)</label>
                <input type="number" placeholder="0" value={form.montant_carte} onChange={e => setForm({...form, montant_carte: e.target.value})} className="sdc-input" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Écart de stock (CFA)</label>
                <input type="number" placeholder="0" value={form.ecart_stock} onChange={e => setForm({...form, ecart_stock: e.target.value})} className="sdc-input" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-400 block mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="sdc-input resize-none" placeholder="Observations..." />
              </div>
            </div>
            {form.montant_cash || form.montant_mobile_money || form.montant_carte ? (
              <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(249,115,22,0.1)' }}>
                <span className="text-sm text-slate-400">Total calculé : </span>
                <span className="font-black text-white text-lg">
                  {formatCFA((parseFloat(form.montant_cash)||0)+(parseFloat(form.montant_mobile_money)||0)+(parseFloat(form.montant_carte)||0))}
                </span>
              </div>
            ) : null}
            <div className="flex gap-3 mt-4">
              <button onClick={handleSubmit} disabled={saving} className="sdc-btn-primary flex-1">
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-slate-400 hover:text-white transition-colors" style={{ background: '#1E293B' }}>
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Liste des déclarations */}
        <div className="sdc-card overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: 'rgba(249,115,22,0.1)' }}>
            <h3 className="font-bold text-white text-sm">Historique des déclarations</h3>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-500">Chargement...</div>
          ) : declarations.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Aucune déclaration enregistrée</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <th className="text-left p-3 text-slate-500 font-medium text-xs uppercase">Date</th>
                    <th className="text-left p-3 text-slate-500 font-medium text-xs uppercase">Point de vente</th>
                    <th className="text-right p-3 text-slate-500 font-medium text-xs uppercase">Cash</th>
                    <th className="text-right p-3 text-slate-500 font-medium text-xs uppercase">Mobile Money</th>
                    <th className="text-right p-3 text-slate-500 font-medium text-xs uppercase">Total</th>
                    <th className="text-center p-3 text-slate-500 font-medium text-xs uppercase">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {declarations.map((d, i) => (
                    <tr key={d.id} className="border-t hover:bg-white/[0.02] transition-colors" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      <td className="p-3 text-white">{new Date(d.date).toLocaleDateString('fr-FR')}</td>
                      <td className="p-3 text-slate-300">{d.points_de_vente?.nom || '—'}</td>
                      <td className="p-3 text-right text-slate-300">{formatCFA(d.montant_cash)}</td>
                      <td className="p-3 text-right text-slate-300">{formatCFA(d.montant_mobile_money)}</td>
                      <td className="p-3 text-right font-bold text-white">{formatCFA(d.montant_total_theorique)}</td>
                      <td className="p-3 text-center">
                        {d.alerte_ecart
                          ? <span className="badge alert-badge flex items-center gap-1 justify-center"><AlertTriangle size={10} />Écart</span>
                          : <span className="badge success-badge">OK</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
