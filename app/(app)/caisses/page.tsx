'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import { Plus, X, Save, Pencil, Trash2, AlertTriangle, CheckCircle } from 'lucide-react'
import RoleGuard from '@/components/RoleGuard'

function formatCFA(n: number) { return new Intl.NumberFormat('fr-FR').format(n) + ' CFA' }

const EMPTY = { date: new Date().toISOString().split('T')[0], point_de_vente_id: '', montant_cash: '', montant_mobile_money: '', montant_carte: '', ecart_stock: '', notes: '' }

export default function CaissesPage() {
  const [declarations, setDeclarations] = useState<any[]>([])
  const [points, setPoints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [dRes, pRes] = await Promise.all([
      supabase.from('caisses_encaissements').select('*, points_de_vente(nom)').order('date', { ascending: false }).order('created_at', { ascending: false }).limit(50),
      supabase.from('points_de_vente').select('*').eq('actif', true)
    ])
    setDeclarations(dRes.data || [])
    setPoints(pRes.data || [])
    setLoading(false)
  }

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const totalForm = (parseFloat(form.montant_cash) || 0) + (parseFloat(form.montant_mobile_money) || 0) + (parseFloat(form.montant_carte) || 0)

  async function handleSave() {
    setSaving(true)
    const payload = {
      date: form.date,
      point_de_vente_id: form.point_de_vente_id || null,
      montant_cash: parseFloat(form.montant_cash) || 0,
      montant_mobile_money: parseFloat(form.montant_mobile_money) || 0,
      montant_carte: parseFloat(form.montant_carte) || 0,
      ecart_stock: parseFloat(form.ecart_stock) || 0,
      alerte_ecart: (parseFloat(form.ecart_stock) || 0) > 5000,
      notes: form.notes
    }
    const { error } = editId
      ? await supabase.from('caisses_encaissements').update(payload).eq('id', editId)
      : await supabase.from('caisses_encaissements').insert(payload)
    setSaving(false)
    if (error) { flash('❌ Erreur: ' + error.message); return }
    flash(editId ? '✅ Déclaration modifiée' : '✅ Déclaration enregistrée')
    setShowForm(false); setEditId(null); setForm(EMPTY); loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette déclaration ?')) return
    const { error } = await supabase.from('caisses_encaissements').delete().eq('id', id)
    if (error) flash('❌ Erreur')
    else { flash('✅ Supprimée'); loadData() }
  }

  function startEdit(d: any) {
    setForm({ date: d.date, point_de_vente_id: d.point_de_vente_id || '', montant_cash: String(d.montant_cash), montant_mobile_money: String(d.montant_mobile_money), montant_carte: String(d.montant_carte), ecart_stock: String(d.ecart_stock || 0), notes: d.notes || '' })
    setEditId(d.id); setShowForm(true)
  }

  const today = new Date().toISOString().split('T')[0]
  const totalJour = declarations.filter(d => d.date === today).reduce((s, d) => s + (d.montant_total_theorique || 0), 0)
  const alertes = declarations.filter(d => d.alerte_ecart).length

  return (
    <div>
      <TopBar title="Caisses & Encaissements" />
      <div className="p-6">
        {msg && <div className="mb-4 p-3 rounded-lg text-sm font-medium" style={{ background: msg.startsWith('✅') ? 'rgba(22,163,74,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${msg.startsWith('✅') ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.startsWith('✅') ? '#86EFAC' : '#FCA5A5' }}>{msg}</div>}

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="sdc-card p-4"><div className="text-xs text-slate-400 uppercase mb-1">CA Bars — Aujourd'hui</div><div className="text-xl font-black text-white">{formatCFA(totalJour)}</div></div>
          <div className="sdc-card p-4"><div className="text-xs text-slate-400 uppercase mb-1">Déclarations du jour</div><div className="text-xl font-black text-white">{declarations.filter(d => d.date === today).length}</div></div>
          <div className="sdc-card p-4"><div className="text-xs text-slate-400 uppercase mb-1">Alertes écart</div><div className={`text-xl font-black ${alertes > 0 ? 'text-red-400' : 'text-green-400'}`}>{alertes}</div></div>
        </div>

        <div className="flex justify-end mb-4">
          <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY) }} className="sdc-btn-primary flex items-center gap-2">
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Annuler' : 'Nouvelle déclaration'}
          </button>
        </div>

        {showForm && (
          <div className="sdc-card p-6 mb-6">
            <h3 className="font-bold text-white mb-4">{editId ? '✏️ Modifier la déclaration' : '➕ Nouvelle déclaration de caisse'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="text-xs text-slate-400 block mb-1">Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="sdc-input" /></div>
              <div><label className="text-xs text-slate-400 block mb-1">Point de vente</label>
                <select value={form.point_de_vente_id} onChange={e => setForm({ ...form, point_de_vente_id: e.target.value })} className="sdc-input">
                  <option value="">Sélectionner...</option>
                  {points.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-slate-400 block mb-1">Montant Cash (CFA)</label><input type="number" value={form.montant_cash} onChange={e => setForm({ ...form, montant_cash: e.target.value })} className="sdc-input" placeholder="0" /></div>
              <div><label className="text-xs text-slate-400 block mb-1">Mobile Money (CFA)</label><input type="number" value={form.montant_mobile_money} onChange={e => setForm({ ...form, montant_mobile_money: e.target.value })} className="sdc-input" placeholder="0" /></div>
              <div><label className="text-xs text-slate-400 block mb-1">Carte bancaire (CFA)</label><input type="number" value={form.montant_carte} onChange={e => setForm({ ...form, montant_carte: e.target.value })} className="sdc-input" placeholder="0" /></div>
              <div><label className="text-xs text-slate-400 block mb-1">Écart de stock (CFA)</label><input type="number" value={form.ecart_stock} onChange={e => setForm({ ...form, ecart_stock: e.target.value })} className="sdc-input" placeholder="0" /></div>
              <div className="sm:col-span-2"><label className="text-xs text-slate-400 block mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="sdc-input resize-none" placeholder="Observations..." /></div>
            </div>
            {totalForm > 0 && (
              <div className="mt-4 p-3 rounded-lg flex items-center justify-between" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}>
                <span className="text-slate-400 text-sm">Total calculé</span>
                <span className="font-black text-white text-xl">{formatCFA(totalForm)}</span>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={handleSave} disabled={saving} className="sdc-btn-primary flex items-center gap-2 disabled:opacity-50"><Save size={16} />{saving ? 'Enregistrement...' : editId ? 'Modifier' : 'Enregistrer'}</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-slate-400" style={{ background: '#1E293B' }}>Annuler</button>
            </div>
          </div>
        )}

        <div className="sdc-card overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'rgba(249,115,22,0.1)' }}>
            <h3 className="font-bold text-white text-sm">Historique des déclarations ({declarations.length})</h3>
            <button onClick={loadData} className="text-xs text-slate-400 hover:text-orange-400 transition-colors">↺ Actualiser</button>
          </div>
          {loading ? <div className="p-8 text-center text-slate-500">Chargement...</div> : declarations.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Aucune déclaration. Cliquez sur "Nouvelle déclaration".</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <th className="text-left p-3 text-slate-500 text-xs uppercase">Date</th>
                  <th className="text-left p-3 text-slate-500 text-xs uppercase">Point de vente</th>
                  <th className="text-right p-3 text-slate-500 text-xs uppercase">Cash</th>
                  <th className="text-right p-3 text-slate-500 text-xs uppercase">Mobile Money</th>
                  <th className="text-right p-3 text-slate-500 text-xs uppercase">Carte</th>
                  <th className="text-right p-3 text-slate-500 text-xs uppercase">Total</th>
                  <th className="text-center p-3 text-slate-500 text-xs uppercase">Statut</th>
                  <th className="text-center p-3 text-slate-500 text-xs uppercase">Actions</th>
                </tr></thead>
                <tbody>
                  {declarations.map(d => (
                    <tr key={d.id} className="border-t hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      <td className="p-3 text-white">{new Date(d.date).toLocaleDateString('fr-FR')}</td>
                      <td className="p-3 text-slate-300">{d.points_de_vente?.nom || '—'}</td>
                      <td className="p-3 text-right text-slate-300">{formatCFA(d.montant_cash)}</td>
                      <td className="p-3 text-right text-slate-300">{formatCFA(d.montant_mobile_money)}</td>
                      <td className="p-3 text-right text-slate-300">{formatCFA(d.montant_carte)}</td>
                      <td className="p-3 text-right font-bold text-white">{formatCFA(d.montant_total_theorique)}</td>
                      <td className="p-3 text-center">
                        {d.alerte_ecart
                          ? <span className="badge alert-badge flex items-center gap-1 justify-center"><AlertTriangle size={10} />Écart</span>
                          : <span className="badge success-badge flex items-center gap-1 justify-center"><CheckCircle size={10} />OK</span>}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => startEdit(d)} className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400"><Pencil size={13} /></button>
                          <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"><Trash2 size={13} /></button>
                        </div>
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
