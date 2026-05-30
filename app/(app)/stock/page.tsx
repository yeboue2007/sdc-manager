'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import { Plus, X, Save, Pencil, Trash2, ArrowDown, ArrowUp, SlidersHorizontal, Package } from 'lucide-react'
import RoleGuard from '@/components/RoleGuard'

function formatCFA(n: number) { return new Intl.NumberFormat('fr-FR').format(n) + ' CFA' }

const EMPTY_PRODUIT = { nom: '', fournisseur: 'SOLIBRA', unite: 'casier', prix_unitaire: '' }
const EMPTY_MVT = { produit_id: '', quantite: '', date: new Date().toISOString().split('T')[0], notes: '', fournisseur: '', bon_livraison: '', point_de_vente_id: '' }

type Tab = 'stock' | 'entrees' | 'sorties' | 'ajustements' | 'produits'

export default function StockPage() {
  const [produits, setProduits] = useState<any[]>([])
  const [stockActuel, setStockActuel] = useState<any[]>([])
  const [mouvements, setMouvements] = useState<any[]>([])
  const [points, setPoints] = useState<any[]>([])
  const [tab, setTab] = useState<Tab>('stock')
  const [loading, setLoading] = useState(true)
  const [showProdForm, setShowProdForm] = useState(false)
  const [showMvtForm, setShowMvtForm] = useState(false)
  const [prodForm, setProdForm] = useState(EMPTY_PRODUIT)
  const [mvtForm, setMvtForm] = useState(EMPTY_MVT)
  const [editProdId, setEditProdId] = useState<string | null>(null)
  const [editMvtId, setEditMvtId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [stockRes, produitsRes, mvtRes, pointsRes] = await Promise.all([
      supabase.from('stock_actuel').select('*'),
      supabase.from('produits_boissons').select('*').eq('actif', true).order('nom'),
      supabase.from('stock_boissons').select('*, produits_boissons(nom), points_de_vente(nom)').order('date', { ascending: false }).order('created_at', { ascending: false }).limit(100),
      supabase.from('points_de_vente').select('*').eq('actif', true)
    ])
    setStockActuel(stockRes.data || [])
    setProduits(produitsRes.data || [])
    setMouvements(mvtRes.data || [])
    setPoints(pointsRes.data || [])
    setLoading(false)
  }

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  async function saveProduit() {
    if (!prodForm.nom) return
    setSaving(true)
    const payload = { ...prodForm, prix_unitaire: parseFloat(prodForm.prix_unitaire) || 0, actif: true }
    const { error } = editProdId
      ? await supabase.from('produits_boissons').update(payload).eq('id', editProdId)
      : await supabase.from('produits_boissons').insert(payload)
    setSaving(false)
    if (error) { flash('❌ ' + error.message); return }
    flash(editProdId ? '✅ Produit modifié' : '✅ Produit ajouté')
    setShowProdForm(false); setEditProdId(null); setProdForm(EMPTY_PRODUIT); loadData()
  }

  async function deleteProduit(id: string, nom: string) {
    if (!confirm(`Supprimer "${nom}" ?`)) return
    const { error } = await supabase.from('produits_boissons').update({ actif: false }).eq('id', id)
    if (error) flash('❌ Erreur')
    else { flash('✅ Produit supprimé'); loadData() }
  }

  async function saveMvt(type: 'entree' | 'sortie' | 'ajustement') {
    if (!mvtForm.produit_id || !mvtForm.quantite) return
    setSaving(true)
    const payload = { produit_id: mvtForm.produit_id, type_mouvement: type, quantite: parseFloat(mvtForm.quantite), date: mvtForm.date, notes: mvtForm.notes, fournisseur: mvtForm.fournisseur, bon_livraison: mvtForm.bon_livraison, point_de_vente_id: mvtForm.point_de_vente_id || null }
    const { error } = editMvtId
      ? await supabase.from('stock_boissons').update(payload).eq('id', editMvtId)
      : await supabase.from('stock_boissons').insert(payload)
    setSaving(false)
    if (error) { flash('❌ ' + error.message); return }
    flash(editMvtId ? '✅ Mouvement modifié' : '✅ Mouvement enregistré')
    setShowMvtForm(false); setEditMvtId(null); setMvtForm(EMPTY_MVT); loadData()
  }

  async function deleteMvt(id: string) {
    if (!confirm('Supprimer ce mouvement ?')) return
    const { error } = await supabase.from('stock_boissons').delete().eq('id', id)
    if (error) flash('❌ Erreur')
    else { flash('✅ Supprimé'); loadData() }
  }

  const filteredMvt = (type: string) => mouvements.filter(m => m.type_mouvement === type)

  const TABS: { key: Tab, label: string, icon: any, color: string }[] = [
    { key: 'stock', label: 'Stock actuel', icon: Package, color: '#F97316' },
    { key: 'entrees', label: 'Entrées', icon: ArrowDown, color: '#16A34A' },
    { key: 'sorties', label: 'Sorties', icon: ArrowUp, color: '#EF4444' },
    { key: 'ajustements', label: 'Ajustements', icon: SlidersHorizontal, color: '#F59E0B' },
    { key: 'produits', label: 'Produits', icon: Package, color: '#8B5CF6' },
  ]

  function MvtForm({ type }: { type: 'entree' | 'sortie' | 'ajustement' }) {
    return (
      <div className="sdc-card p-6 mb-6">
        <h3 className="font-bold text-white mb-4">{editMvtId ? '✏️ Modifier' : '➕ Nouveau'} — {type === 'entree' ? 'Entrée de stock' : type === 'sortie' ? 'Sortie de stock' : 'Ajustement'}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div><label className="text-xs text-slate-400 block mb-1">Produit *</label>
            <select value={mvtForm.produit_id} onChange={e => setMvtForm({ ...mvtForm, produit_id: e.target.value })} className="sdc-input">
              <option value="">Sélectionner...</option>
              {produits.map(p => <option key={p.id} value={p.id}>{p.nom} ({p.fournisseur})</option>)}
            </select>
          </div>
          <div><label className="text-xs text-slate-400 block mb-1">Quantité *</label><input type="number" value={mvtForm.quantite} onChange={e => setMvtForm({ ...mvtForm, quantite: e.target.value })} className="sdc-input" placeholder="0" /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Date</label><input type="date" value={mvtForm.date} onChange={e => setMvtForm({ ...mvtForm, date: e.target.value })} className="sdc-input" /></div>
          {type === 'entree' && <>
            <div><label className="text-xs text-slate-400 block mb-1">Fournisseur</label><input value={mvtForm.fournisseur} onChange={e => setMvtForm({ ...mvtForm, fournisseur: e.target.value })} className="sdc-input" placeholder="SOLIBRA, BRASSIVOIRE..." /></div>
            <div><label className="text-xs text-slate-400 block mb-1">N° Bon de livraison</label><input value={mvtForm.bon_livraison} onChange={e => setMvtForm({ ...mvtForm, bon_livraison: e.target.value })} className="sdc-input" placeholder="BL-2026-001" /></div>
          </>}
          {type === 'sortie' && (
            <div><label className="text-xs text-slate-400 block mb-1">Destination (bar)</label>
              <select value={mvtForm.point_de_vente_id} onChange={e => setMvtForm({ ...mvtForm, point_de_vente_id: e.target.value })} className="sdc-input">
                <option value="">Entrepôt central</option>
                {points.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </div>
          )}
          <div className={type === 'ajustement' ? 'sm:col-span-2' : ''}><label className="text-xs text-slate-400 block mb-1">Observation</label><input value={mvtForm.notes} onChange={e => setMvtForm({ ...mvtForm, notes: e.target.value })} className="sdc-input" placeholder="Remarques..." /></div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={() => saveMvt(type)} disabled={saving || !mvtForm.produit_id || !mvtForm.quantite} className="sdc-btn-primary flex items-center gap-2 disabled:opacity-50"><Save size={16} />{saving ? 'Enregistrement...' : editMvtId ? 'Modifier' : 'Enregistrer'}</button>
          <button onClick={() => { setShowMvtForm(false); setEditMvtId(null); setMvtForm(EMPTY_MVT) }} className="px-4 py-2 rounded-lg text-slate-400" style={{ background: '#1E293B' }}>Annuler</button>
        </div>
      </div>
    )
  }

  function MvtTable({ type, color, label }: { type: string, color: string, label: string }) {
    const rows = filteredMvt(type)
    return (
      <div className="sdc-card overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'rgba(249,115,22,0.1)' }}>
          <h3 className="font-bold text-white text-sm">Historique — {label} <span className="text-slate-500 font-normal">({rows.length})</span></h3>
        </div>
        {rows.length === 0 ? <div className="p-8 text-center text-slate-500">Aucun mouvement enregistré.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                <th className="text-left p-3 text-slate-500 text-xs uppercase">Date</th>
                <th className="text-left p-3 text-slate-500 text-xs uppercase">Produit</th>
                <th className="text-right p-3 text-slate-500 text-xs uppercase">Quantité</th>
                {type === 'sortie' && <th className="text-left p-3 text-slate-500 text-xs uppercase">Destination</th>}
                {type === 'entree' && <th className="text-left p-3 text-slate-500 text-xs uppercase">Fournisseur / BL</th>}
                <th className="text-left p-3 text-slate-500 text-xs uppercase">Observation</th>
                <th className="text-center p-3 text-slate-500 text-xs uppercase">Actions</th>
              </tr></thead>
              <tbody>
                {rows.map(m => (
                  <tr key={m.id} className="border-t hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <td className="p-3 text-white">{new Date(m.date).toLocaleDateString('fr-FR')}</td>
                    <td className="p-3 text-slate-300 font-medium">{m.produits_boissons?.nom}</td>
                    <td className="p-3 text-right font-bold" style={{ color }}>{m.quantite}</td>
                    {type === 'sortie' && <td className="p-3 text-slate-400">{m.points_de_vente?.nom || 'Entrepôt'}</td>}
                    {type === 'entree' && <td className="p-3 text-slate-400">{[m.fournisseur, m.bon_livraison].filter(Boolean).join(' / ') || '—'}</td>}
                    <td className="p-3 text-slate-400">{m.notes || '—'}</td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { setMvtForm({ produit_id: m.produit_id, quantite: String(m.quantite), date: m.date, notes: m.notes || '', fournisseur: m.fournisseur || '', bon_livraison: m.bon_livraison || '', point_de_vente_id: m.point_de_vente_id || '' }); setEditMvtId(m.id); setShowMvtForm(true) }} className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400"><Pencil size={13} /></button>
                        <button onClick={() => deleteMvt(m.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <TopBar title="Stock Boissons" />
      <div className="p-6">
        {msg && <div className="mb-4 p-3 rounded-lg text-sm font-medium" style={{ background: msg.startsWith('✅') ? 'rgba(22,163,74,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${msg.startsWith('✅') ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.startsWith('✅') ? '#86EFAC' : '#FCA5A5' }}>{msg}</div>}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setShowMvtForm(false); setShowProdForm(false) }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'text-white' : 'text-slate-400 hover:text-white'}`}
              style={{ background: tab === t.key ? t.color + 'cc' : '#1E293B' }}>
              <t.icon size={15} />{t.label}
            </button>
          ))}
        </div>

        {/* Stock actuel */}
        {tab === 'stock' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {loading ? <div className="text-slate-500">Chargement...</div> : stockActuel.length === 0 ? (
              <div className="col-span-5 sdc-card p-8 text-center text-slate-500">Aucun produit. Ajoutez des produits dans l'onglet "Produits".</div>
            ) : stockActuel.map(s => (
              <div key={s.produit_id} className={`sdc-card p-4 ${s.stock_theorique <= 2 ? 'border-red-500/40' : ''}`}>
                <div className="text-xs text-slate-400 mb-2 leading-tight">{s.nom}</div>
                <div className={`text-2xl font-black mb-1 ${s.stock_theorique <= 0 ? 'text-red-500' : s.stock_theorique <= 2 ? 'text-orange-400' : 'text-white'}`}>{s.stock_theorique}</div>
                <div className="text-xs text-slate-500">{s.unite}</div>
                {s.stock_theorique <= 2 && <div className="text-xs text-red-400 mt-1 font-bold">⚠️ {s.stock_theorique <= 0 ? 'RUPTURE' : 'Faible'}</div>}
                <div className="text-xs text-slate-600 mt-1">{s.fournisseur}</div>
              </div>
            ))}
          </div>
        )}

        {/* Entrées */}
        {tab === 'entrees' && (
          <>
            <div className="flex justify-end mb-4">
              <button onClick={() => { setShowMvtForm(!showMvtForm); setEditMvtId(null); setMvtForm(EMPTY_MVT) }} className="sdc-btn-primary flex items-center gap-2" style={{ background: 'linear-gradient(135deg,#16A34A,#15803D)' }}>
                {showMvtForm ? <X size={16} /> : <ArrowDown size={16} />}
                {showMvtForm ? 'Annuler' : 'Nouvelle entrée'}
              </button>
            </div>
            {showMvtForm && <MvtForm type="entree" />}
            <MvtTable type="entree" color="#16A34A" label="Entrées de stock" />
          </>
        )}

        {/* Sorties */}
        {tab === 'sorties' && (
          <>
            <div className="flex justify-end mb-4">
              <button onClick={() => { setShowMvtForm(!showMvtForm); setEditMvtId(null); setMvtForm(EMPTY_MVT) }} className="sdc-btn-primary flex items-center gap-2" style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)' }}>
                {showMvtForm ? <X size={16} /> : <ArrowUp size={16} />}
                {showMvtForm ? 'Annuler' : 'Nouvelle sortie'}
              </button>
            </div>
            {showMvtForm && <MvtForm type="sortie" />}
            <MvtTable type="sortie" color="#EF4444" label="Sorties de stock" />
          </>
        )}

        {/* Ajustements */}
        {tab === 'ajustements' && (
          <>
            <div className="flex justify-end mb-4">
              <button onClick={() => { setShowMvtForm(!showMvtForm); setEditMvtId(null); setMvtForm(EMPTY_MVT) }} className="sdc-btn-primary flex items-center gap-2" style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>
                {showMvtForm ? <X size={16} /> : <SlidersHorizontal size={16} />}
                {showMvtForm ? 'Annuler' : 'Nouvel ajustement'}
              </button>
            </div>
            {showMvtForm && <MvtForm type="ajustement" />}
            <MvtTable type="ajustement" color="#F59E0B" label="Ajustements" />
          </>
        )}

        {/* Produits */}
        {tab === 'produits' && (
          <>
            <div className="flex justify-end mb-4">
              <button onClick={() => { setShowProdForm(!showProdForm); setEditProdId(null); setProdForm(EMPTY_PRODUIT) }} className="sdc-btn-primary flex items-center gap-2">
                {showProdForm ? <X size={16} /> : <Plus size={16} />}
                {showProdForm ? 'Annuler' : 'Ajouter un produit'}
              </button>
            </div>
            {showProdForm && (
              <div className="sdc-card p-6 mb-6">
                <h3 className="font-bold text-white mb-4">{editProdId ? '✏️ Modifier le produit' : '➕ Nouveau produit'}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div><label className="text-xs text-slate-400 block mb-1">Nom du produit *</label><input value={prodForm.nom} onChange={e => setProdForm({ ...prodForm, nom: e.target.value })} className="sdc-input" placeholder="Ex: Bock 65cl" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Fournisseur</label>
                    <select value={prodForm.fournisseur} onChange={e => setProdForm({ ...prodForm, fournisseur: e.target.value })} className="sdc-input">
                      <option value="SOLIBRA">SOLIBRA</option><option value="BRASSIVOIRE">BRASSIVOIRE</option><option value="AUTRE">AUTRE</option>
                    </select>
                  </div>
                  <div><label className="text-xs text-slate-400 block mb-1">Unité</label>
                    <select value={prodForm.unite} onChange={e => setProdForm({ ...prodForm, unite: e.target.value })} className="sdc-input">
                      <option value="casier">Casier</option><option value="carton">Carton</option><option value="bouteille">Bouteille</option><option value="pack">Pack</option>
                    </select>
                  </div>
                  <div><label className="text-xs text-slate-400 block mb-1">Prix unitaire (CFA)</label><input type="number" value={prodForm.prix_unitaire} onChange={e => setProdForm({ ...prodForm, prix_unitaire: e.target.value })} className="sdc-input" placeholder="0" /></div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={saveProduit} disabled={saving || !prodForm.nom} className="sdc-btn-primary flex items-center gap-2 disabled:opacity-50"><Save size={16} />{saving ? 'Enregistrement...' : editProdId ? 'Modifier' : 'Ajouter'}</button>
                  <button onClick={() => setShowProdForm(false)} className="px-4 py-2 rounded-lg text-slate-400" style={{ background: '#1E293B' }}>Annuler</button>
                </div>
              </div>
            )}
            <div className="sdc-card overflow-hidden">
              <div className="p-4 border-b" style={{ borderColor: 'rgba(249,115,22,0.1)' }}>
                <h3 className="font-bold text-white text-sm">Catalogue produits ({produits.length})</h3>
              </div>
              {produits.length === 0 ? <div className="p-8 text-center text-slate-500">Aucun produit.</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <th className="text-left p-3 text-slate-500 text-xs uppercase">Produit</th>
                      <th className="text-left p-3 text-slate-500 text-xs uppercase">Fournisseur</th>
                      <th className="text-left p-3 text-slate-500 text-xs uppercase">Unité</th>
                      <th className="text-right p-3 text-slate-500 text-xs uppercase">Prix unitaire</th>
                      <th className="text-center p-3 text-slate-500 text-xs uppercase">Actions</th>
                    </tr></thead>
                    <tbody>
                      {produits.map(p => (
                        <tr key={p.id} className="border-t hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                          <td className="p-3 font-medium text-white">{p.nom}</td>
                          <td className="p-3"><span className="badge warning-badge">{p.fournisseur}</span></td>
                          <td className="p-3 text-slate-400">{p.unite}</td>
                          <td className="p-3 text-right text-white">{formatCFA(p.prix_unitaire)}</td>
                          <td className="p-3 text-center">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => { setProdForm({ nom: p.nom, fournisseur: p.fournisseur, unite: p.unite, prix_unitaire: String(p.prix_unitaire) }); setEditProdId(p.id); setShowProdForm(true) }} className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400"><Pencil size={13} /></button>
                              <button onClick={() => deleteProduit(p.id, p.nom)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"><Trash2 size={13} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
