'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import { Plus, X, Save, Pencil, Trash2 } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

function formatCFA(n: number) { return new Intl.NumberFormat('fr-FR').format(n) + ' CFA' }

const CATEGORIES: Record<string, string> = {
  cachet_artiste: '🎤 Cachets artistes', communication: '📣 Communication',
  logistique: '🚛 Logistique', location_materiel: '🎛️ Location matériel',
  transport: '🚗 Transport', securite: '🛡️ Sécurité',
  electricite: '⚡ Électricité', restauration_equipe: '🍱 Restauration équipe', divers: '📦 Divers'
}
const COLORS = ['#F97316','#F59E0B','#16A34A','#3B82F6','#8B5CF6','#EC4899','#14B8A6','#EF4444','#94A3B8']
const EMPTY = { date: new Date().toISOString().split('T')[0], categorie: 'divers', libelle: '', montant: '', beneficiaire: '' }

export default function DepensesPage() {
  const [depenses, setDepenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [filterCateg, setFilterCateg] = useState('')

  useEffect(() => { loadData() }, [])
  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase.from('depenses').select('*').order('date', { ascending: false }).order('created_at', { ascending: false })
    if (error) console.error(error)
    setDepenses(data || [])
    setLoading(false)
  }

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  async function handleSave() {
    if (!form.libelle || !form.montant) return
    setSaving(true)
    const payload = { ...form, montant: parseFloat(form.montant) || 0 }
    const { error } = editId
      ? await supabase.from('depenses').update(payload).eq('id', editId)
      : await supabase.from('depenses').insert(payload)
    setSaving(false)
    if (error) { flash('❌ Erreur: ' + error.message); return }
    flash(editId ? '✅ Dépense modifiée' : '✅ Dépense enregistrée')
    setShowForm(false); setEditId(null); setForm(EMPTY); loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette dépense ?')) return
    const { error } = await supabase.from('depenses').delete().eq('id', id)
    if (error) flash('❌ Erreur')
    else { flash('✅ Supprimée'); loadData() }
  }

  function startEdit(d: any) {
    setForm({ date: d.date, categorie: d.categorie, libelle: d.libelle, montant: String(d.montant), beneficiaire: d.beneficiaire || '' })
    setEditId(d.id); setShowForm(true)
  }

  const today = new Date().toISOString().split('T')[0]
  const totalJour = depenses.filter(d => d.date === today).reduce((s, d) => s + d.montant, 0)
  const totalGeneral = depenses.reduce((s, d) => s + d.montant, 0)
  const filtered = filterCateg ? depenses.filter(d => d.categorie === filterCateg) : depenses

  const byCateg = Object.entries(CATEGORIES).map(([key, label], i) => ({
    name: label, value: depenses.filter(d => d.categorie === key).reduce((s, d) => s + d.montant, 0), color: COLORS[i]
  })).filter(c => c.value > 0)

  return (
    <div>
      <TopBar title="Dépenses" />
      <div className="p-6">
        {msg && <div className="mb-4 p-3 rounded-lg text-sm font-medium" style={{ background: msg.startsWith('✅') ? 'rgba(22,163,74,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${msg.startsWith('✅') ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.startsWith('✅') ? '#86EFAC' : '#FCA5A5' }}>{msg}</div>}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="sdc-card p-4"><div className="text-xs text-slate-400 uppercase mb-1">Dépenses du jour</div><div className="text-xl font-black text-white">{formatCFA(totalJour)}</div></div>
          <div className="sdc-card p-4"><div className="text-xs text-slate-400 uppercase mb-1">Total événement</div><div className="text-xl font-black text-red-400">{formatCFA(totalGeneral)}</div></div>
        </div>

        {byCateg.length > 0 && (
          <div className="sdc-card p-5 mb-6">
            <h3 className="font-bold text-white text-sm mb-4">Répartition par catégorie</h3>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width={180} height={180}>
                <PieChart><Pie data={byCateg} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value">
                  {byCateg.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatCFA(v)} contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 8, color: '#F8FAFC' }} /></PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 w-full">
                {byCateg.map((c, i) => (
                  <button key={i} onClick={() => setFilterCateg(filterCateg === Object.keys(CATEGORIES)[i] ? '' : Object.keys(CATEGORIES)[i])}
                    className="flex items-center justify-between text-sm w-full hover:opacity-80 transition-opacity px-2 py-1 rounded-lg"
                    style={{ background: filterCateg === Object.keys(CATEGORIES)[i] ? 'rgba(249,115,22,0.1)' : 'transparent' }}>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }}></span><span className="text-slate-300 text-xs">{c.name}</span></div>
                    <span className="font-bold text-white text-xs">{formatCFA(c.value)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4 gap-3">
          {filterCateg && <button onClick={() => setFilterCateg('')} className="text-xs text-orange-400 hover:text-white flex items-center gap-1"><X size={12} />Effacer le filtre</button>}
          <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY) }} className="sdc-btn-primary flex items-center gap-2 ml-auto">
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Annuler' : 'Nouvelle dépense'}
          </button>
        </div>

        {showForm && (
          <div className="sdc-card p-6 mb-6">
            <h3 className="font-bold text-white mb-4">{editId ? '✏️ Modifier la dépense' : '➕ Nouvelle dépense'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="text-xs text-slate-400 block mb-1">Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="sdc-input" /></div>
              <div><label className="text-xs text-slate-400 block mb-1">Catégorie</label>
                <select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })} className="sdc-input">
                  {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2"><label className="text-xs text-slate-400 block mb-1">Libellé *</label><input value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} className="sdc-input" placeholder="Description de la dépense..." /></div>
              <div><label className="text-xs text-slate-400 block mb-1">Montant (CFA) *</label><input type="number" value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })} className="sdc-input" placeholder="0" /></div>
              <div><label className="text-xs text-slate-400 block mb-1">Bénéficiaire</label><input value={form.beneficiaire} onChange={e => setForm({ ...form, beneficiaire: e.target.value })} className="sdc-input" placeholder="Nom ou société..." /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSave} disabled={saving || !form.libelle || !form.montant} className="sdc-btn-primary flex items-center gap-2 disabled:opacity-50"><Save size={16} />{saving ? 'Enregistrement...' : editId ? 'Modifier' : 'Enregistrer'}</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-slate-400" style={{ background: '#1E293B' }}>Annuler</button>
            </div>
          </div>
        )}

        <div className="sdc-card overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'rgba(249,115,22,0.1)' }}>
            <h3 className="font-bold text-white text-sm">
              {filterCateg ? `Filtre: ${CATEGORIES[filterCateg]}` : `Toutes les dépenses`} ({filtered.length})
            </h3>
            <button onClick={loadData} className="text-xs text-slate-400 hover:text-orange-400">↺ Actualiser</button>
          </div>
          {loading ? <div className="p-8 text-center text-slate-500">Chargement...</div> : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Aucune dépense enregistrée.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <th className="text-left p-3 text-slate-500 text-xs uppercase">Date</th>
                  <th className="text-left p-3 text-slate-500 text-xs uppercase">Libellé</th>
                  <th className="text-left p-3 text-slate-500 text-xs uppercase">Catégorie</th>
                  <th className="text-right p-3 text-slate-500 text-xs uppercase">Montant</th>
                  <th className="text-left p-3 text-slate-500 text-xs uppercase">Bénéficiaire</th>
                  <th className="text-center p-3 text-slate-500 text-xs uppercase">Actions</th>
                </tr></thead>
                <tbody>
                  {filtered.map(d => (
                    <tr key={d.id} className="border-t hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      <td className="p-3 text-white">{new Date(d.date).toLocaleDateString('fr-FR')}</td>
                      <td className="p-3 text-slate-300">{d.libelle}</td>
                      <td className="p-3 text-xs text-slate-400">{CATEGORIES[d.categorie] || d.categorie}</td>
                      <td className="p-3 text-right font-bold text-red-400">{formatCFA(d.montant)}</td>
                      <td className="p-3 text-slate-400">{d.beneficiaire || '—'}</td>
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
