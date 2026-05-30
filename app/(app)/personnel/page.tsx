'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import { Plus, CheckCircle, XCircle, Pencil, Trash2, X, Save } from 'lucide-react'
import RoleGuard from '@/components/RoleGuard'

function formatCFA(n: number) { return new Intl.NumberFormat('fr-FR').format(n) + ' CFA' }

const ROLES: Record<string, string> = {
  securite: 'Sécurité', serveur: 'Serveur', technicien: 'Technicien',
  caissier: 'Caissier', superviseur: 'Superviseur', logistique: 'Logistique',
  billetterie: 'Billetterie', autre: 'Autre'
}

const EMPTY_FORM = { nom_complet: '', role: 'serveur', salaire_journalier: '', telephone: '', mode_paiement: 'cash' }

export default function PersonnelPage() {
  const [personnel, setPersonnel] = useState<any[]>([])
  const [presences, setPresences] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [persRes, presRes] = await Promise.all([
      supabase.from('personnel').select('*').eq('actif', true).order('nom_complet'),
      supabase.from('presences').select('*').eq('date', today)
    ])
    if (persRes.error) console.error('Personnel error:', persRes.error)
    if (presRes.error) console.error('Presences error:', presRes.error)
    setPersonnel(persRes.data || [])
    setPresences(presRes.data || [])
    setLoading(false)
  }

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  async function handleSubmit() {
    if (!form.nom_complet) return
    setSaving(true)
    const payload = { ...form, salaire_journalier: parseFloat(form.salaire_journalier) || 0, actif: true }
    
    let error
    if (editId) {
      const res = await supabase.from('personnel').update(payload).eq('id', editId)
      error = res.error
    } else {
      const res = await supabase.from('personnel').insert(payload)
      error = res.error
    }

    if (error) {
      console.error('Save error:', error)
      flash('❌ Erreur: ' + error.message)
    } else {
      flash(editId ? '✅ Employé modifié' : '✅ Employé ajouté')
      setShowForm(false)
      setEditId(null)
      setForm(EMPTY_FORM)
      await loadData()
    }
    setSaving(false)
  }

  async function handleDelete(id: string, nom: string) {
    if (!confirm(`Supprimer ${nom} ?`)) return
    const { error } = await supabase.from('personnel').update({ actif: false }).eq('id', id)
    if (error) flash('❌ Erreur suppression')
    else { flash('✅ Employé supprimé'); loadData() }
  }

  function startEdit(emp: any) {
    setForm({ nom_complet: emp.nom_complet, role: emp.role, salaire_journalier: String(emp.salaire_journalier), telephone: emp.telephone || '', mode_paiement: emp.mode_paiement || 'cash' })
    setEditId(emp.id)
    setShowForm(true)
  }

  async function togglePresence(employeId: string, isPresent: boolean) {
    const emp = personnel.find(e => e.id === employeId)
    const existing = presences.find(p => p.employe_id === employeId)
    if (existing) {
      const { error } = await supabase.from('presences').update({ present: !isPresent, salaire_jour_calcule: !isPresent ? (emp?.salaire_journalier || 0) : 0 }).eq('id', existing.id)
      if (error) console.error(error)
    } else {
      const { error } = await supabase.from('presences').insert({ employe_id: employeId, date: today, present: true, salaire_jour_calcule: emp?.salaire_journalier || 0 })
      if (error) console.error(error)
    }
    await loadData()
  }

  const presentToday = presences.filter(p => p.present).length
  const salairesToday = presences.filter(p => p.present).reduce((s, p) => s + (p.salaire_jour_calcule || 0), 0)

  return (
    <div>
      <TopBar title="Personnel & Paie" />
      <div className="p-6">

        {msg && <div className="mb-4 p-3 rounded-lg text-sm font-medium" style={{ background: msg.startsWith('✅') ? 'rgba(22,163,74,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${msg.startsWith('✅') ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.startsWith('✅') ? '#86EFAC' : '#FCA5A5' }}>{msg}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="sdc-card p-4"><div className="text-xs text-slate-400 uppercase mb-1">Effectif total</div><div className="text-2xl font-black text-white">{personnel.length}</div></div>
          <div className="sdc-card p-4"><div className="text-xs text-slate-400 uppercase mb-1">Présents aujourd'hui</div><div className="text-2xl font-black text-green-400">{presentToday}</div></div>
          <div className="sdc-card p-4"><div className="text-xs text-slate-400 uppercase mb-1">Masse salariale du jour</div><div className="text-2xl font-black text-white">{formatCFA(salairesToday)}</div></div>
        </div>

        <div className="flex justify-end mb-4">
          <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY_FORM) }} className="sdc-btn-primary flex items-center gap-2">
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Annuler' : 'Ajouter un employé'}
          </button>
        </div>

        {showForm && (
          <div className="sdc-card p-6 mb-6">
            <h3 className="font-bold text-white mb-4">{editId ? '✏️ Modifier l\'employé' : '➕ Nouvel employé'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="text-xs text-slate-400 block mb-1">Nom complet *</label><input value={form.nom_complet} onChange={e => setForm({ ...form, nom_complet: e.target.value })} className="sdc-input" placeholder="Prénom Nom" /></div>
              <div><label className="text-xs text-slate-400 block mb-1">Rôle</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="sdc-input">
                  {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-slate-400 block mb-1">Salaire / jour (CFA)</label><input type="number" value={form.salaire_journalier} onChange={e => setForm({ ...form, salaire_journalier: e.target.value })} className="sdc-input" placeholder="0" /></div>
              <div><label className="text-xs text-slate-400 block mb-1">Téléphone</label><input value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} className="sdc-input" placeholder="+225..." /></div>
              <div><label className="text-xs text-slate-400 block mb-1">Mode de paiement</label>
                <select value={form.mode_paiement} onChange={e => setForm({ ...form, mode_paiement: e.target.value })} className="sdc-input">
                  <option value="cash">Cash</option><option value="mobile_money">Mobile Money</option><option value="virement">Virement</option>
                </select>
              </div>
              <div className="flex items-end"><button onClick={handleSubmit} disabled={saving || !form.nom_complet} className="sdc-btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"><Save size={16} />{saving ? 'Enregistrement...' : editId ? 'Modifier' : 'Ajouter'}</button></div>
            </div>
          </div>
        )}

        <div className="sdc-card overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'rgba(249,115,22,0.1)' }}>
            <h3 className="font-bold text-white text-sm">Liste du personnel — Présences du {new Date().toLocaleDateString('fr-FR')}</h3>
            <button onClick={loadData} className="text-xs text-slate-400 hover:text-orange-400">↺ Actualiser</button>
          </div>
          {loading ? <div className="p-8 text-center text-slate-500">Chargement...</div> : personnel.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Aucun employé. Cliquez sur "Ajouter un employé".</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <th className="text-left p-3 text-slate-500 text-xs uppercase">Employé</th>
                  <th className="text-left p-3 text-slate-500 text-xs uppercase">Rôle</th>
                  <th className="text-right p-3 text-slate-500 text-xs uppercase">Salaire/j</th>
                  <th className="text-center p-3 text-slate-500 text-xs uppercase">Présent</th>
                  <th className="text-center p-3 text-slate-500 text-xs uppercase">Actions</th>
                </tr></thead>
                <tbody>
                  {personnel.map(emp => {
                    const pres = presences.find(p => p.employe_id === emp.id)
                    const isPresent = pres?.present ?? false
                    return (
                      <tr key={emp.id} className="border-t hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                        <td className="p-3"><div className="font-medium text-white">{emp.nom_complet}</div><div className="text-xs text-slate-500">{emp.telephone}</div></td>
                        <td className="p-3"><span className="badge warning-badge">{ROLES[emp.role]}</span></td>
                        <td className="p-3 text-right text-white font-medium">{formatCFA(emp.salaire_journalier)}</td>
                        <td className="p-3 text-center">
                          <button onClick={() => togglePresence(emp.id, isPresent)} className="transition-transform hover:scale-110">
                            {isPresent ? <CheckCircle size={24} className="text-green-400" /> : <XCircle size={24} className="text-slate-600" />}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => startEdit(emp)} className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-colors"><Pencil size={14} /></button>
                            <button onClick={() => handleDelete(emp.id, emp.nom_complet)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
