'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import { Plus, X, Save, Pencil, Trash2, Ticket, Smartphone, Monitor, DoorOpen } from 'lucide-react'
import RoleGuard from '@/components/RoleGuard'

function formatCFA(n: number) { return new Intl.NumberFormat('fr-FR').format(n) + ' CFA' }

const CANAUX: Record<string, { label: string, icon: any, color: string }> = {
  guichet: { label: 'Guichet', icon: DoorOpen, color: '#F97316' },
  mobile_money: { label: 'Mobile Money', icon: Smartphone, color: '#16A34A' },
  online: { label: 'En ligne', icon: Monitor, color: '#3B82F6' },
  invitation: { label: 'Invitation', icon: Ticket, color: '#8B5CF6' },
}
const EMPTY_TYPE = { nom: '', prix: '', quota: '' }
const EMPTY_VENTE = { type_billet_id: '', quantite: '1', canal: 'guichet', date: new Date().toISOString().split('T')[0] }

export default function BilletteriePage() {
  const [types, setTypes] = useState<any[]>([])
  const [ventes, setVentes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'ventes' | 'types'>('ventes')
  const [showTypeForm, setShowTypeForm] = useState(false)
  const [showVenteForm, setShowVenteForm] = useState(false)
  const [typeForm, setTypeForm] = useState(EMPTY_TYPE)
  const [venteForm, setVenteForm] = useState(EMPTY_VENTE)
  const [editTypeId, setEditTypeId] = useState<string | null>(null)
  const [editVenteId, setEditVenteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { loadData() }, [])
  async function loadData() {
    setLoading(true)
    const [tRes, vRes] = await Promise.all([
      supabase.from('types_billets').select('*').order('prix'),
      supabase.from('ventes_billets').select('*, types_billets(nom, prix)').order('date', { ascending: false }).order('created_at', { ascending: false }).limit(50)
    ])
    setTypes(tRes.data || [])
    setVentes(vRes.data || [])
    setLoading(false)
  }

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  async function saveType() {
    if (!typeForm.nom) return
    setSaving(true)
    const payload = { nom: typeForm.nom, prix: parseFloat(typeForm.prix) || 0, quota: parseInt(typeForm.quota) || null, actif: true }
    const { error } = editTypeId
      ? await supabase.from('types_billets').update(payload).eq('id', editTypeId)
      : await supabase.from('types_billets').insert(payload)
    setSaving(false)
    if (error) { flash('❌ ' + error.message); return }
    flash(editTypeId ? '✅ Type modifié' : '✅ Type ajouté')
    setShowTypeForm(false); setEditTypeId(null); setTypeForm(EMPTY_TYPE); loadData()
  }

  async function deleteType(id: string, nom: string) {
    if (!confirm(`Supprimer le type "${nom}" ?`)) return
    const { error } = await supabase.from('types_billets').update({ actif: false }).eq('id', id)
    if (error) flash('❌ Erreur')
    else { flash('✅ Supprimé'); loadData() }
  }

  async function saveVente() {
    if (!venteForm.type_billet_id || !venteForm.quantite) return
    setSaving(true)
    const type = types.find(t => t.id === venteForm.type_billet_id)
    const montant = (type?.prix || 0) * (parseInt(venteForm.quantite) || 1)
    const payload = { ...venteForm, quantite: parseInt(venteForm.quantite), montant_total: montant }
    const { error } = editVenteId
      ? await supabase.from('ventes_billets').update(payload).eq('id', editVenteId)
      : await supabase.from('ventes_billets').insert(payload)
    setSaving(false)
    if (error) { flash('❌ ' + error.message); return }
    flash(editVenteId ? '✅ Vente modifiée' : '✅ Vente enregistrée')
    setShowVenteForm(false); setEditVenteId(null); setVenteForm(EMPTY_VENTE); loadData()
  }

  async function deleteVente(id: string) {
    if (!confirm('Supprimer cette vente ?')) return
    const { error } = await supabase.from('ventes_billets').delete().eq('id', id)
    if (error) flash('❌ Erreur')
    else { flash('✅ Supprimée'); loadData() }
  }

  const today = new Date().toISOString().split('T')[0]
  const totalJour = ventes.filter(v => v.date === today).reduce((s, v) => s + v.montant_total, 0)
  const totalBillets = ventes.reduce((s, v) => s + v.quantite, 0)
  const totalCA = ventes.reduce((s, v) => s + v.montant_total, 0)
  const montantVente = types.find(t => t.id === venteForm.type_billet_id)?.prix || 0

  return (
    <div>
      <TopBar title="Billetterie & Contrôle d'accès" />
      <div className="p-6">
        {msg && <div className="mb-4 p-3 rounded-lg text-sm font-medium" style={{ background: msg.startsWith('✅') ? 'rgba(22,163,74,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${msg.startsWith('✅') ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.startsWith('✅') ? '#86EFAC' : '#FCA5A5' }}>{msg}</div>}

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="sdc-card p-4"><div className="text-xs text-slate-400 uppercase mb-1">CA Aujourd'hui</div><div className="text-xl font-black text-white">{formatCFA(totalJour)}</div></div>
          <div className="sdc-card p-4"><div className="text-xs text-slate-400 uppercase mb-1">Billets vendus</div><div className="text-xl font-black text-white">{totalBillets.toLocaleString('fr-FR')}</div></div>
          <div className="sdc-card p-4"><div className="text-xs text-slate-400 uppercase mb-1">CA Total</div><div className="text-xl font-black text-green-400">{formatCFA(totalCA)}</div></div>
        </div>

        {/* Canaux */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {Object.entries(CANAUX).map(([key, { label, icon: Icon, color }]) => {
            const tot = ventes.filter(v => v.canal === key).reduce((s, v) => s + v.montant_total, 0)
            return (
              <div key={key} className="sdc-card p-3 text-center">
                <Icon size={18} style={{ color }} className="mx-auto mb-1" />
                <div className="text-xs text-slate-400 mb-1">{label}</div>
                <div className="font-bold text-white text-sm">{formatCFA(tot)}</div>
              </div>
            )
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[{ key: 'ventes', label: '🎟️ Ventes de billets' }, { key: 'types', label: '⚙️ Types de billets' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'text-white' : 'text-slate-400 hover:text-white'}`}
              style={{ background: tab === t.key ? 'linear-gradient(135deg,#F97316,#EA580C)' : '#1E293B' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* VENTES */}
        {tab === 'ventes' && (
          <>
            <div className="flex justify-end mb-4">
              <button onClick={() => { setShowVenteForm(!showVenteForm); setEditVenteId(null); setVenteForm(EMPTY_VENTE) }} className="sdc-btn-primary flex items-center gap-2">
                {showVenteForm ? <X size={16} /> : <Plus size={16} />}
                {showVenteForm ? 'Annuler' : 'Enregistrer une vente'}
              </button>
            </div>
            {showVenteForm && (
              <div className="sdc-card p-6 mb-6">
                <h3 className="font-bold text-white mb-4">{editVenteId ? '✏️ Modifier la vente' : '➕ Nouvelle vente'}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="text-xs text-slate-400 block mb-1">Type de billet</label>
                    <select value={venteForm.type_billet_id} onChange={e => setVenteForm({ ...venteForm, type_billet_id: e.target.value })} className="sdc-input">
                      <option value="">Sélectionner...</option>
                      {types.filter(t => t.actif).map(t => <option key={t.id} value={t.id}>{t.nom} — {formatCFA(t.prix)}</option>)}
                    </select>
                  </div>
                  <div><label className="text-xs text-slate-400 block mb-1">Canal</label>
                    <select value={venteForm.canal} onChange={e => setVenteForm({ ...venteForm, canal: e.target.value })} className="sdc-input">
                      {Object.entries(CANAUX).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div><label className="text-xs text-slate-400 block mb-1">Quantité</label><input type="number" min="1" value={venteForm.quantite} onChange={e => setVenteForm({ ...venteForm, quantite: e.target.value })} className="sdc-input" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Date</label><input type="date" value={venteForm.date} onChange={e => setVenteForm({ ...venteForm, date: e.target.value })} className="sdc-input" /></div>
                </div>
                {venteForm.type_billet_id && venteForm.quantite && (
                  <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)' }}>
                    <span className="text-sm text-slate-400">Total : </span>
                    <span className="font-black text-white text-xl">{formatCFA(montantVente * parseInt(venteForm.quantite || '1'))}</span>
                  </div>
                )}
                <div className="flex gap-3 mt-4">
                  <button onClick={saveVente} disabled={saving || !venteForm.type_billet_id} className="sdc-btn-primary flex items-center gap-2 disabled:opacity-50"><Save size={16} />{saving ? '...' : editVenteId ? 'Modifier' : 'Enregistrer'}</button>
                  <button onClick={() => setShowVenteForm(false)} className="px-4 py-2 rounded-lg text-slate-400" style={{ background: '#1E293B' }}>Annuler</button>
                </div>
              </div>
            )}
            <div className="sdc-card overflow-hidden">
              <div className="p-4 border-b" style={{ borderColor: 'rgba(249,115,22,0.1)' }}><h3 className="font-bold text-white text-sm">Historique ventes ({ventes.length})</h3></div>
              {loading ? <div className="p-8 text-center text-slate-500">Chargement...</div> : ventes.length === 0 ? <div className="p-8 text-center text-slate-500">Aucune vente.</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <th className="text-left p-3 text-slate-500 text-xs uppercase">Date</th>
                      <th className="text-left p-3 text-slate-500 text-xs uppercase">Type</th>
                      <th className="text-center p-3 text-slate-500 text-xs uppercase">Canal</th>
                      <th className="text-right p-3 text-slate-500 text-xs uppercase">Qté</th>
                      <th className="text-right p-3 text-slate-500 text-xs uppercase">Montant</th>
                      <th className="text-center p-3 text-slate-500 text-xs uppercase">Actions</th>
                    </tr></thead>
                    <tbody>
                      {ventes.map(v => (
                        <tr key={v.id} className="border-t hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                          <td className="p-3 text-white">{new Date(v.date).toLocaleDateString('fr-FR')}</td>
                          <td className="p-3 text-slate-300">{v.types_billets?.nom}</td>
                          <td className="p-3 text-center"><span className="badge warning-badge">{CANAUX[v.canal]?.label}</span></td>
                          <td className="p-3 text-right text-white">{v.quantite}</td>
                          <td className="p-3 text-right font-bold text-green-400">{formatCFA(v.montant_total)}</td>
                          <td className="p-3 text-center">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => { setVenteForm({ type_billet_id: v.type_billet_id, quantite: String(v.quantite), canal: v.canal, date: v.date }); setEditVenteId(v.id); setShowVenteForm(true) }} className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400"><Pencil size={13} /></button>
                              <button onClick={() => deleteVente(v.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"><Trash2 size={13} /></button>
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

        {/* TYPES */}
        {tab === 'types' && (
          <>
            <div className="flex justify-end mb-4">
              <button onClick={() => { setShowTypeForm(!showTypeForm); setEditTypeId(null); setTypeForm(EMPTY_TYPE) }} className="sdc-btn-primary flex items-center gap-2">
                {showTypeForm ? <X size={16} /> : <Plus size={16} />}
                {showTypeForm ? 'Annuler' : 'Nouveau type de billet'}
              </button>
            </div>
            {showTypeForm && (
              <div className="sdc-card p-6 mb-6">
                <h3 className="font-bold text-white mb-4">{editTypeId ? '✏️ Modifier' : '➕ Nouveau type de billet'}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div><label className="text-xs text-slate-400 block mb-1">Nom *</label><input value={typeForm.nom} onChange={e => setTypeForm({ ...typeForm, nom: e.target.value })} className="sdc-input" placeholder="Ex: Entrée VIP" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Prix (CFA)</label><input type="number" value={typeForm.prix} onChange={e => setTypeForm({ ...typeForm, prix: e.target.value })} className="sdc-input" placeholder="0 = gratuit" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Quota (optionnel)</label><input type="number" value={typeForm.quota} onChange={e => setTypeForm({ ...typeForm, quota: e.target.value })} className="sdc-input" placeholder="Laisser vide = illimité" /></div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={saveType} disabled={saving || !typeForm.nom} className="sdc-btn-primary flex items-center gap-2 disabled:opacity-50"><Save size={16} />{saving ? '...' : editTypeId ? 'Modifier' : 'Ajouter'}</button>
                  <button onClick={() => setShowTypeForm(false)} className="px-4 py-2 rounded-lg text-slate-400" style={{ background: '#1E293B' }}>Annuler</button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {types.map(t => {
                const vendu = ventes.filter(v => v.type_billet_id === t.id).reduce((s, v) => s + v.quantite, 0)
                const pct = t.quota ? Math.min(100, Math.round((vendu / t.quota) * 100)) : null
                return (
                  <div key={t.id} className={`sdc-card p-4 ${!t.actif ? 'opacity-40' : ''}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div><div className="font-bold text-white">{t.nom}</div><div className="text-xs text-slate-500 mt-0.5">{vendu} vendus{t.quota ? ` / ${t.quota}` : ''}</div></div>
                      <div className="flex items-center gap-1">
                        <span className="badge warning-badge">{formatCFA(t.prix)}</span>
                        <button onClick={() => { setTypeForm({ nom: t.nom, prix: String(t.prix), quota: String(t.quota || '') }); setEditTypeId(t.id); setShowTypeForm(true) }} className="p-1 rounded hover:bg-blue-500/20 text-blue-400"><Pencil size={12} /></button>
                        <button onClick={() => deleteType(t.id, t.nom)} className="p-1 rounded hover:bg-red-500/20 text-red-400"><Trash2 size={12} /></button>
                      </div>
                    </div>
                    {pct !== null && <div className="h-1.5 rounded-full" style={{ background: '#1E293B' }}><div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: pct > 80 ? '#EF4444' : '#F97316' }} /></div>}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
