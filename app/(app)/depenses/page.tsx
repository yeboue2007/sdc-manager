'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import { Plus, X, Save, Pencil, Trash2 } from 'lucide-react'
import RoleGuard from '@/components/RoleGuard'

function formatCFA(n: number) { return new Intl.NumberFormat('fr-FR').format(n) + ' CFA' }

const CATEGORIES: Record<string, { label: string, color: string }> = {
  cachet_artiste:     { label: '🎤 Cachets artistes',    color: '#F97316' },
  communication:      { label: '📣 Communication',        color: '#F59E0B' },
  logistique:         { label: '🚛 Logistique',           color: '#16A34A' },
  location_materiel:  { label: '🎛️ Location matériel',   color: '#3B82F6' },
  transport:          { label: '🚗 Transport',            color: '#8B5CF6' },
  securite:           { label: '🛡️ Sécurité',            color: '#EC4899' },
  electricite:        { label: '⚡ Électricité',          color: '#14B8A6' },
  restauration_equipe:{ label: '🍱 Restauration équipe', color: '#EF4444' },
  divers:             { label: '📦 Divers',               color: '#94A3B8' },
}

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

  // Répartition par catégorie — CSS uniquement
  const byCateg = Object.entries(CATEGORIES).map(([key, { label, color }]) => ({
    key, label, color,
    value: depenses.filter(d => d.categorie === key).reduce((s, d) => s + d.montant, 0)
  })).filter(c => c.value > 0).sort((a, b) => b.value - a.value)

  const maxCateg = byCateg.length > 0 ? byCateg[0].value : 1

  return (
    <div>
      <TopBar title="Dépenses" />
      <div className="p-4 sm:p-6 space-y-4">

        {msg && (
          <div className="p-3 rounded-lg text-sm font-medium" style={{
            background: msg.startsWith('✅') ? 'rgba(22,163,74,0.15)' : 'rgba(239,68,68,0.15)',
            border: `1px solid ${msg.startsWith('✅') ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: msg.startsWith('✅') ? '#86EFAC' : '#FCA5A5'
          }}>{msg}</div>
        )}

        {/* Totaux */}
        <div className="grid grid-cols-2 gap-3">
          <div className="sdc-card p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Dépenses du jour</div>
            <div className="text-xl font-black text-white">{formatCFA(totalJour)}</div>
          </div>
          <div className="sdc-card p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total événement</div>
            <div className="text-xl font-black text-red-400">{formatCFA(totalGeneral)}</div>
          </div>
        </div>

        {/* Répartition par catégorie — barres CSS */}
        {byCateg.length > 0 && (
          <div className="sdc-card p-4 sm:p-5">
            <h3 className="font-bold text-white text-sm mb-4">Répartition par catégorie</h3>
            <div className="space-y-3">
              {byCateg.map(c => {
                const pct = Math.round((c.value / maxCateg) * 100)
                return (
                  <button key={c.key} onClick={() => setFilterCateg(filterCateg === c.key ? '' : c.key)}
                    className="w-full text-left group"
                    style={{ background: 'transparent', border: 'none', padding: 0 }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                        {c.label}
                        {filterCateg === c.key && <span className="text-orange-400 ml-1">◂ filtré</span>}
                      </span>
                      <span className="text-xs font-bold text-white">{formatCFA(c.value)}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1E293B' }}>
                      <div className="h-2 rounded-full transition-all duration-500 group-hover:opacity-80"
                        style={{ width: `${pct}%`, background: c.color }} />
                    </div>
                  </button>
                )
              })}
            </div>
            {filterCateg && (
              <button onClick={() => setFilterCateg('')}
                className="mt-3 text-xs text-orange-400 hover:text-white flex items-center gap-1">
                <X size={11} /> Effacer le filtre
              </button>
            )}
          </div>
        )}

        {/* Bouton ajouter */}
        <div className="flex justify-end">
          <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY) }}
            className="sdc-btn-primary flex items-center gap-2">
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Annuler' : 'Nouvelle dépense'}
          </button>
        </div>

        {/* Formulaire */}
        {showForm && (
          <div className="sdc-card p-5">
            <h3 className="font-bold text-white mb-4">{editId ? '✏️ Modifier' : '➕ Nouvelle dépense'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="sdc-input" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Catégorie</label>
                <select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })} className="sdc-input">
                  {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-400 block mb-1">Libellé *</label>
                <input value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} className="sdc-input" placeholder="Description de la dépense..." />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Montant (CFA) *</label>
                <input type="number" value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })} className="sdc-input" placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Bénéficiaire</label>
                <input value={form.beneficiaire} onChange={e => setForm({ ...form, beneficiaire: e.target.value })} className="sdc-input" placeholder="Nom ou société..." />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSave} disabled={saving || !form.libelle || !form.montant}
                className="sdc-btn-primary flex items-center gap-2 disabled:opacity-50">
                <Save size={16} />{saving ? 'Enregistrement...' : editId ? 'Modifier' : 'Enregistrer'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-slate-400" style={{ background: '#1E293B' }}>Annuler</button>
            </div>
          </div>
        )}

        {/* Tableau */}
        <div className="sdc-card overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'rgba(249,115,22,0.1)' }}>
            <h3 className="font-bold text-white text-sm">
              {filterCateg ? `${CATEGORIES[filterCateg]?.label}` : 'Toutes les dépenses'} ({filtered.length})
            </h3>
            <button onClick={loadData} className="text-xs text-slate-400 hover:text-orange-400 transition-colors">↺ Actualiser</button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Aucune dépense enregistrée.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <th className="text-left p-3 text-slate-500 text-xs uppercase">Date</th>
                    <th className="text-left p-3 text-slate-500 text-xs uppercase">Libellé</th>
                    <th className="text-left p-3 text-slate-500 text-xs uppercase hidden sm:table-cell">Catégorie</th>
                    <th className="text-right p-3 text-slate-500 text-xs uppercase">Montant</th>
                    <th className="text-center p-3 text-slate-500 text-xs uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(d => (
                    <tr key={d.id} className="border-t hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      <td className="p-3 text-white text-xs">{new Date(d.date).toLocaleDateString('fr-FR')}</td>
                      <td className="p-3">
                        <div className="text-slate-300 text-xs">{d.libelle}</div>
                        {d.beneficiaire && <div className="text-slate-500 text-xs">{d.beneficiaire}</div>}
                        <div className="text-xs mt-0.5 sm:hidden" style={{ color: CATEGORIES[d.categorie]?.color || '#94A3B8' }}>
                          {CATEGORIES[d.categorie]?.label || d.categorie}
                        </div>
                      </td>
                      <td className="p-3 hidden sm:table-cell">
                        <span className="text-xs" style={{ color: CATEGORIES[d.categorie]?.color || '#94A3B8' }}>
                          {CATEGORIES[d.categorie]?.label || d.categorie}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-red-400 text-xs">{formatCFA(d.montant)}</td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button onClick={() => startEdit(d)} className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400"><Pencil size={12} /></button>
                          <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"><Trash2 size={12} /></button>
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
