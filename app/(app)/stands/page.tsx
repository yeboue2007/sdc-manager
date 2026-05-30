'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import { Plus, X, Save, Pencil, Trash2, TrendingUp, DollarSign } from 'lucide-react'

function formatCFA(n: number) { return new Intl.NumberFormat('fr-FR').format(n) + ' CFA' }

const EMPTY_STAND = { nom: '', responsable_nom: '', responsable_tel: '', type_contrat: 'location_fixe', montant_location: '', pourcentage_ventes: '' }
const EMPTY_DECL = { stand_id: '', date: new Date().toISOString().split('T')[0], ca_declare: '', montant_paye: '', notes: '' }

export default function StandsPage() {
  const [stands, setStands] = useState<any[]>([])
  const [declarations, setDeclarations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'stands' | 'declarations'>('stands')
  const [showStandForm, setShowStandForm] = useState(false)
  const [showDeclForm, setShowDeclForm] = useState(false)
  const [standForm, setStandForm] = useState(EMPTY_STAND)
  const [declForm, setDeclForm] = useState(EMPTY_DECL)
  const [editStandId, setEditStandId] = useState<string | null>(null)
  const [editDeclId, setEditDeclId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [sRes, dRes] = await Promise.all([
      supabase.from('stands_nourriture').select('*').order('nom'),
      supabase.from('declarations_stands').select('*, stands_nourriture(nom)').order('date', { ascending: false }).limit(50)
    ])
    setStands(sRes.data || [])
    setDeclarations(dRes.data || [])
    setLoading(false)
  }

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  async function saveStand() {
    if (!standForm.nom || !standForm.responsable_nom) return
    setSaving(true)
    const payload = {
      nom: standForm.nom, responsable_nom: standForm.responsable_nom,
      responsable_tel: standForm.responsable_tel, type_contrat: standForm.type_contrat,
      montant_location: parseFloat(standForm.montant_location) || 0,
      pourcentage_ventes: parseFloat(standForm.pourcentage_ventes) || 0, actif: true
    }
    const { error } = editStandId
      ? await supabase.from('stands_nourriture').update(payload).eq('id', editStandId)
      : await supabase.from('stands_nourriture').insert(payload)
    setSaving(false)
    if (error) { flash('❌ Erreur: ' + error.message); return }
    flash(editStandId ? '✅ Stand modifié' : '✅ Stand ajouté')
    setShowStandForm(false); setEditStandId(null); setStandForm(EMPTY_STAND); loadData()
  }

  async function deleteStand(id: string, nom: string) {
    if (!confirm(`Supprimer le stand "${nom}" ?`)) return
    const { error } = await supabase.from('stands_nourriture').update({ actif: false }).eq('id', id)
    if (error) flash('❌ Erreur') 
    else { flash('✅ Stand supprimé'); loadData() }
  }

  function calcMontantDu(standId: string, ca: number) {
    const s = stands.find(x => x.id === standId)
    if (!s) return 0
    return s.type_contrat === 'location_fixe' ? (s.montant_location || 0) : (ca * (s.pourcentage_ventes || 0)) / 100
  }

  async function saveDecl() {
    if (!declForm.stand_id || !declForm.ca_declare) return
    setSaving(true)
    const montantDu = calcMontantDu(declForm.stand_id, parseFloat(declForm.ca_declare))
    const payload = {
      stand_id: declForm.stand_id, date: declForm.date,
      ca_declare: parseFloat(declForm.ca_declare) || 0,
      montant_du: montantDu,
      montant_paye: parseFloat(declForm.montant_paye) || 0,
      notes: declForm.notes
    }
    const { error } = editDeclId
      ? await supabase.from('declarations_stands').update(payload).eq('id', editDeclId)
      : await supabase.from('declarations_stands').insert(payload)
    setSaving(false)
    if (error) { flash('❌ Erreur: ' + error.message); return }
    flash(editDeclId ? '✅ Déclaration modifiée' : '✅ Déclaration enregistrée')
    setShowDeclForm(false); setEditDeclId(null); setDeclForm(EMPTY_DECL); loadData()
  }

  async function deleteDecl(id: string) {
    if (!confirm('Supprimer cette déclaration ?')) return
    const { error } = await supabase.from('declarations_stands').delete().eq('id', id)
    if (error) flash('❌ Erreur')
    else { flash('✅ Déclaration supprimée'); loadData() }
  }

  const totalDettes = declarations.reduce((s, d) => s + (d.solde || 0), 0)
  const totalCA = declarations.reduce((s, d) => s + (d.ca_declare || 0), 0)

  return (
    <div>
      <TopBar title="Stands Nourriture" />
      <div className="p-6">
        {msg && <div className="mb-4 p-3 rounded-lg text-sm font-medium" style={{ background: msg.startsWith('✅') ? 'rgba(22,163,74,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${msg.startsWith('✅') ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.startsWith('✅') ? '#86EFAC' : '#FCA5A5' }}>{msg}</div>}

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="sdc-card p-4"><div className="text-xs text-slate-400 uppercase mb-1">Stands actifs</div><div className="text-2xl font-black text-white">{stands.filter(s => s.actif !== false).length}</div></div>
          <div className="sdc-card p-4"><div className="text-xs text-slate-400 uppercase mb-1">CA Total déclaré</div><div className="text-2xl font-black text-white">{formatCFA(totalCA)}</div></div>
          <div className="sdc-card p-4"><div className="text-xs text-slate-400 uppercase mb-1">Dettes en cours</div><div className={`text-2xl font-black ${totalDettes > 0 ? 'text-red-400' : 'text-green-400'}`}>{formatCFA(totalDettes)}</div></div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['stands', 'declarations'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'text-white' : 'text-slate-400 hover:text-white'}`}
              style={{ background: tab === t ? 'linear-gradient(135deg,#F97316,#EA580C)' : '#1E293B' }}>
              {t === 'stands' ? '🏪 Gestion des stands' : '📋 Déclarations quotidiennes'}
            </button>
          ))}
        </div>

        {/* ===== ONGLET STANDS ===== */}
        {tab === 'stands' && (
          <>
            <div className="flex justify-end mb-4">
              <button onClick={() => { setShowStandForm(!showStandForm); setEditStandId(null); setStandForm(EMPTY_STAND) }} className="sdc-btn-primary flex items-center gap-2">
                {showStandForm ? <X size={16} /> : <Plus size={16} />}
                {showStandForm ? 'Annuler' : 'Nouveau stand'}
              </button>
            </div>

            {showStandForm && (
              <div className="sdc-card p-6 mb-6">
                <h3 className="font-bold text-white mb-4">{editStandId ? '✏️ Modifier le stand' : '➕ Nouveau stand'}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="text-xs text-slate-400 block mb-1">Nom du stand *</label><input value={standForm.nom} onChange={e => setStandForm({ ...standForm, nom: e.target.value })} className="sdc-input" placeholder="Ex: Grillade du Mondial" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Nom du propriétaire *</label><input value={standForm.responsable_nom} onChange={e => setStandForm({ ...standForm, responsable_nom: e.target.value })} className="sdc-input" placeholder="Prénom Nom" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Téléphone</label><input value={standForm.responsable_tel} onChange={e => setStandForm({ ...standForm, responsable_tel: e.target.value })} className="sdc-input" placeholder="+225..." /></div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Mode de facturation *</label>
                    <select value={standForm.type_contrat} onChange={e => setStandForm({ ...standForm, type_contrat: e.target.value })} className="sdc-input">
                      <option value="location_fixe">💰 Prix fixe journalier</option>
                      <option value="pourcentage">📊 Pourcentage sur ventes</option>
                    </select>
                  </div>
                  {standForm.type_contrat === 'location_fixe' ? (
                    <div><label className="text-xs text-slate-400 block mb-1">Prix fixe journalier (CFA)</label><input type="number" value={standForm.montant_location} onChange={e => setStandForm({ ...standForm, montant_location: e.target.value })} className="sdc-input" placeholder="0" /></div>
                  ) : (
                    <div><label className="text-xs text-slate-400 block mb-1">Pourcentage sur ventes (%)</label><input type="number" min="0" max="100" value={standForm.pourcentage_ventes} onChange={e => setStandForm({ ...standForm, pourcentage_ventes: e.target.value })} className="sdc-input" placeholder="Ex: 15" /></div>
                  )}
                </div>
                <div className="mt-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)' }}>
                  {standForm.type_contrat === 'location_fixe'
                    ? `💰 Ce stand paie ${formatCFA(parseFloat(standForm.montant_location) || 0)} par jour, quel que soit son chiffre d'affaires.`
                    : `📊 Ce stand reverse ${standForm.pourcentage_ventes || 0}% de son CA quotidien à l'organisation.`}
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={saveStand} disabled={saving || !standForm.nom || !standForm.responsable_nom} className="sdc-btn-primary flex items-center gap-2 disabled:opacity-50"><Save size={16} />{saving ? 'Enregistrement...' : editStandId ? 'Modifier' : 'Ajouter'}</button>
                  <button onClick={() => setShowStandForm(false)} className="px-4 py-2 rounded-lg text-slate-400" style={{ background: '#1E293B' }}>Annuler</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {loading ? <div className="text-slate-500 p-4">Chargement...</div> : stands.length === 0 ? (
                <div className="col-span-2 sdc-card p-8 text-center text-slate-500">Aucun stand. Cliquez sur "Nouveau stand".</div>
              ) : stands.map(s => {
                const decls = declarations.filter(d => d.stand_id === s.id)
                const totalCA = decls.reduce((sum, d) => sum + d.ca_declare, 0)
                const totalDette = decls.reduce((sum, d) => sum + (d.solde || 0), 0)
                return (
                  <div key={s.id} className="sdc-card p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-bold text-white text-base">{s.nom}</div>
                        <div className="text-sm text-slate-400 mt-0.5">👤 {s.responsable_nom}</div>
                        {s.responsable_tel && <div className="text-xs text-slate-500">{s.responsable_tel}</div>}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`badge ${s.type_contrat === 'location_fixe' ? 'warning-badge' : 'success-badge'}`}>
                          {s.type_contrat === 'location_fixe' ? `💰 ${formatCFA(s.montant_location)}/j` : `📊 ${s.pourcentage_ventes}%`}
                        </span>
                        <div className="flex gap-1">
                          <button onClick={() => { setStandForm({ nom: s.nom, responsable_nom: s.responsable_nom, responsable_tel: s.responsable_tel || '', type_contrat: s.type_contrat, montant_location: String(s.montant_location), pourcentage_ventes: String(s.pourcentage_ventes) }); setEditStandId(s.id); setShowStandForm(true); setTab('stands') }} className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400"><Pencil size={13} /></button>
                          <button onClick={() => deleteStand(s.id, s.nom)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      <div><div className="text-xs text-slate-500">CA déclaré</div><div className="font-bold text-white text-sm">{formatCFA(totalCA)}</div></div>
                      <div><div className="text-xs text-slate-500">Dette restante</div><div className={`font-bold text-sm ${totalDette > 0 ? 'text-red-400' : 'text-green-400'}`}>{formatCFA(totalDette)}</div></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ===== ONGLET DECLARATIONS ===== */}
        {tab === 'declarations' && (
          <>
            <div className="flex justify-end mb-4">
              <button onClick={() => { setShowDeclForm(!showDeclForm); setEditDeclId(null); setDeclForm(EMPTY_DECL) }} className="sdc-btn-primary flex items-center gap-2">
                {showDeclForm ? <X size={16} /> : <Plus size={16} />}
                {showDeclForm ? 'Annuler' : 'Nouvelle déclaration'}
              </button>
            </div>

            {showDeclForm && (
              <div className="sdc-card p-6 mb-6">
                <h3 className="font-bold text-white mb-4">{editDeclId ? '✏️ Modifier la déclaration' : '➕ Déclaration quotidienne'}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="text-xs text-slate-400 block mb-1">Stand</label>
                    <select value={declForm.stand_id} onChange={e => setDeclForm({ ...declForm, stand_id: e.target.value })} className="sdc-input">
                      <option value="">Sélectionner un stand...</option>
                      {stands.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                    </select>
                  </div>
                  <div><label className="text-xs text-slate-400 block mb-1">Date</label><input type="date" value={declForm.date} onChange={e => setDeclForm({ ...declForm, date: e.target.value })} className="sdc-input" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">CA Déclaré (CFA)</label><input type="number" value={declForm.ca_declare} onChange={e => setDeclForm({ ...declForm, ca_declare: e.target.value })} className="sdc-input" placeholder="0" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Montant payé (CFA)</label><input type="number" value={declForm.montant_paye} onChange={e => setDeclForm({ ...declForm, montant_paye: e.target.value })} className="sdc-input" placeholder="0" /></div>
                  <div className="sm:col-span-2"><label className="text-xs text-slate-400 block mb-1">Notes</label><input value={declForm.notes} onChange={e => setDeclForm({ ...declForm, notes: e.target.value })} className="sdc-input" placeholder="Observations..." /></div>
                </div>
                {declForm.stand_id && declForm.ca_declare && (
                  <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(249,115,22,0.1)' }}>
                    <span className="text-sm text-slate-400">Montant dû : </span>
                    <span className="font-black text-white text-lg">{formatCFA(calcMontantDu(declForm.stand_id, parseFloat(declForm.ca_declare)))}</span>
                    <span className="text-xs text-slate-500 ml-2">({stands.find(s => s.id === declForm.stand_id)?.type_contrat === 'location_fixe' ? 'Prix fixe' : `${stands.find(s => s.id === declForm.stand_id)?.pourcentage_ventes}% du CA`})</span>
                  </div>
                )}
                <div className="flex gap-3 mt-4">
                  <button onClick={saveDecl} disabled={saving || !declForm.stand_id || !declForm.ca_declare} className="sdc-btn-primary flex items-center gap-2 disabled:opacity-50"><Save size={16} />{saving ? 'Enregistrement...' : editDeclId ? 'Modifier' : 'Enregistrer'}</button>
                  <button onClick={() => setShowDeclForm(false)} className="px-4 py-2 rounded-lg text-slate-400" style={{ background: '#1E293B' }}>Annuler</button>
                </div>
              </div>
            )}

            <div className="sdc-card overflow-hidden">
              <div className="p-4 border-b" style={{ borderColor: 'rgba(249,115,22,0.1)' }}>
                <h3 className="font-bold text-white text-sm">Historique des déclarations</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <th className="text-left p-3 text-slate-500 text-xs uppercase">Date</th>
                    <th className="text-left p-3 text-slate-500 text-xs uppercase">Stand</th>
                    <th className="text-right p-3 text-slate-500 text-xs uppercase">CA</th>
                    <th className="text-right p-3 text-slate-500 text-xs uppercase">Dû</th>
                    <th className="text-right p-3 text-slate-500 text-xs uppercase">Payé</th>
                    <th className="text-right p-3 text-slate-500 text-xs uppercase">Solde</th>
                    <th className="text-center p-3 text-slate-500 text-xs uppercase">Actions</th>
                  </tr></thead>
                  <tbody>
                    {declarations.map(d => (
                      <tr key={d.id} className="border-t hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                        <td className="p-3 text-white">{new Date(d.date).toLocaleDateString('fr-FR')}</td>
                        <td className="p-3 text-slate-300">{d.stands_nourriture?.nom}</td>
                        <td className="p-3 text-right text-slate-300">{formatCFA(d.ca_declare)}</td>
                        <td className="p-3 text-right text-slate-300">{formatCFA(d.montant_du)}</td>
                        <td className="p-3 text-right text-green-400">{formatCFA(d.montant_paye)}</td>
                        <td className={`p-3 text-right font-bold ${(d.solde || 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>{formatCFA(d.solde || 0)}</td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => { setDeclForm({ stand_id: d.stand_id, date: d.date, ca_declare: String(d.ca_declare), montant_paye: String(d.montant_paye), notes: d.notes || '' }); setEditDeclId(d.id); setShowDeclForm(true) }} className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400"><Pencil size={13} /></button>
                            <button onClick={() => deleteDecl(d.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
