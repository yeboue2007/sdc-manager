'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import { Plus, Package, ArrowDown, ArrowUp, AlertTriangle } from 'lucide-react'

function formatCFA(n: number) { return new Intl.NumberFormat('fr-FR').format(n) + ' CFA' }

export default function StockPage() {
  const [stock, setStock] = useState<any[]>([])
  const [produits, setProduits] = useState<any[]>([])
  const [mouvements, setMouvements] = useState<any[]>([])
  const [points, setPoints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ produit_id: '', type_mouvement: 'entree', quantite: '', date: new Date().toISOString().split('T')[0], point_de_vente_id: '', fournisseur: '', bon_livraison: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [stockRes, produitsRes, mvtRes, pointsRes] = await Promise.all([
      supabase.from('stock_actuel').select('*'),
      supabase.from('produits_boissons').select('*').eq('actif', true),
      supabase.from('stock_boissons').select('*, produits_boissons(nom), points_de_vente(nom)').order('created_at', { ascending: false }).limit(20),
      supabase.from('points_de_vente').select('*').eq('actif', true)
    ])
    if (stockRes.data) setStock(stockRes.data)
    if (produitsRes.data) setProduits(produitsRes.data)
    if (mvtRes.data) setMouvements(mvtRes.data)
    if (pointsRes.data) setPoints(pointsRes.data)
    setLoading(false)
  }

  async function handleSubmit() {
    setSaving(true)
    await supabase.from('stock_boissons').insert({
      produit_id: form.produit_id,
      type_mouvement: form.type_mouvement,
      quantite: parseFloat(form.quantite),
      date: form.date,
      point_de_vente_id: form.point_de_vente_id || null,
      fournisseur: form.fournisseur,
      bon_livraison: form.bon_livraison,
      notes: form.notes
    })
    setSaving(false)
    setShowForm(false)
    loadData()
  }

  return (
    <div>
      <TopBar title="Stock Boissons" />
      <div className="p-6">

        {/* Stock actuel */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {stock.map(s => (
            <div key={s.produit_id} className={`sdc-card p-3 ${s.stock_theorique <= 2 ? 'border-red-500/30' : ''}`}>
              <div className="text-xs text-slate-400 mb-1 truncate">{s.nom}</div>
              <div className={`text-xl font-black ${s.stock_theorique <= 2 ? 'text-red-400' : 'text-white'}`}>
                {s.stock_theorique}
              </div>
              <div className="text-xs text-slate-500">{s.unite}</div>
              {s.stock_theorique <= 2 && (
                <div className="flex items-center gap-1 mt-1 text-xs text-red-400">
                  <AlertTriangle size={10} /> Rupture
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Ajouter mouvement */}
        <div className="flex justify-end mb-4">
          <button onClick={() => setShowForm(!showForm)} className="sdc-btn-primary flex items-center gap-2">
            <Plus size={16} /> Mouvement de stock
          </button>
        </div>

        {showForm && (
          <div className="sdc-card p-6 mb-6">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Package size={18} style={{ color: '#F97316' }} />
              Nouveau mouvement
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Produit</label>
                <select value={form.produit_id} onChange={e => setForm({...form, produit_id: e.target.value})} className="sdc-input">
                  <option value="">Sélectionner...</option>
                  {produits.map(p => <option key={p.id} value={p.id}>{p.nom} ({p.fournisseur})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Type</label>
                <select value={form.type_mouvement} onChange={e => setForm({...form, type_mouvement: e.target.value})} className="sdc-input">
                  <option value="entree">Entrée (livraison)</option>
                  <option value="sortie">Sortie (distribution bar)</option>
                  <option value="ajustement">Ajustement inventaire</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Quantité</label>
                <input type="number" placeholder="0" value={form.quantite} onChange={e => setForm({...form, quantite: e.target.value})} className="sdc-input" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="sdc-input" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Point de vente (si sortie)</label>
                <select value={form.point_de_vente_id} onChange={e => setForm({...form, point_de_vente_id: e.target.value})} className="sdc-input">
                  <option value="">Entrepôt central</option>
                  {points.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">N° Bon de livraison</label>
                <input type="text" placeholder="BL-2026-001" value={form.bon_livraison} onChange={e => setForm({...form, bon_livraison: e.target.value})} className="sdc-input" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-400 block mb-1">Notes</label>
                <input type="text" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="sdc-input" placeholder="Observations..." />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSubmit} disabled={saving} className="sdc-btn-primary flex-1">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-slate-400 hover:text-white transition-colors" style={{ background: '#1E293B' }}>Annuler</button>
            </div>
          </div>
        )}

        {/* Historique */}
        <div className="sdc-card overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: 'rgba(249,115,22,0.1)' }}>
            <h3 className="font-bold text-white text-sm">Historique des mouvements</h3>
          </div>
          {loading ? <div className="p-8 text-center text-slate-500">Chargement...</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <th className="text-left p-3 text-slate-500 font-medium text-xs uppercase">Date</th>
                    <th className="text-left p-3 text-slate-500 font-medium text-xs uppercase">Produit</th>
                    <th className="text-center p-3 text-slate-500 font-medium text-xs uppercase">Type</th>
                    <th className="text-right p-3 text-slate-500 font-medium text-xs uppercase">Qté</th>
                    <th className="text-left p-3 text-slate-500 font-medium text-xs uppercase">Destination</th>
                  </tr>
                </thead>
                <tbody>
                  {mouvements.map(m => (
                    <tr key={m.id} className="border-t hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      <td className="p-3 text-white">{new Date(m.date).toLocaleDateString('fr-FR')}</td>
                      <td className="p-3 text-slate-300">{m.produits_boissons?.nom}</td>
                      <td className="p-3 text-center">
                        {m.type_mouvement === 'entree'
                          ? <span className="badge success-badge flex items-center gap-1 justify-center"><ArrowDown size={10} />Entrée</span>
                          : m.type_mouvement === 'sortie'
                          ? <span className="badge alert-badge flex items-center gap-1 justify-center"><ArrowUp size={10} />Sortie</span>
                          : <span className="badge warning-badge">Ajust.</span>}
                      </td>
                      <td className="p-3 text-right font-bold text-white">{m.quantite}</td>
                      <td className="p-3 text-slate-400">{m.points_de_vente?.nom || 'Entrepôt central'}</td>
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
