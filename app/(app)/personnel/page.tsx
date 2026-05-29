'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import { Plus, Users, CheckCircle, XCircle } from 'lucide-react'

function formatCFA(n: number) { return new Intl.NumberFormat('fr-FR').format(n) + ' CFA' }

const ROLES = ['securite','serveur','technicien','caissier','superviseur','logistique','billetterie','autre']
const ROLES_LABELS: Record<string, string> = { securite:'Sécurité', serveur:'Serveur', technicien:'Technicien', caissier:'Caissier', superviseur:'Superviseur', logistique:'Logistique', billetterie:'Billetterie', autre:'Autre' }

export default function PersonnelPage() {
  const [personnel, setPersonnel] = useState<any[]>([])
  const [presences, setPresences] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nom_complet: '', role: 'serveur', salaire_journalier: '', telephone: '', mode_paiement: 'cash' })
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [persRes, presRes] = await Promise.all([
      supabase.from('personnel').select('*').eq('actif', true).order('nom_complet'),
      supabase.from('presences').select('*').eq('date', today)
    ])
    if (persRes.data) setPersonnel(persRes.data)
    if (presRes.data) setPresences(presRes.data)
    setLoading(false)
  }

  async function togglePresence(employeId: string, currentlyPresent: boolean) {
    const existing = presences.find(p => p.employe_id === employeId)
    const emp = personnel.find(e => e.id === employeId)
    if (existing) {
      await supabase.from('presences').update({ present: !currentlyPresent }).eq('id', existing.id)
    } else {
      await supabase.from('presences').insert({ employe_id: employeId, date: today, present: true, salaire_jour_calcule: emp?.salaire_journalier || 0 })
    }
    loadData()
  }

  async function handleSubmit() {
    setSaving(true)
    await supabase.from('personnel').insert({ ...form, salaire_journalier: parseFloat(form.salaire_journalier) || 0 })
    setSaving(false)
    setShowForm(false)
    loadData()
  }

  const presentToday = presences.filter(p => p.present).length
  const totalSalairesToday = presences.filter(p => p.present).reduce((sum, p) => sum + (p.salaire_jour_calcule || 0), 0)
  const totalSalairesGlobal = presences.reduce((sum, p) => sum + (p.present ? (p.salaire_jour_calcule || 0) : 0), 0)

  return (
    <div>
      <TopBar title="Personnel & Paie" />
      <div className="p-6">

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="sdc-card p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Présents aujourd'hui</div>
            <div className="text-xl font-black text-white">{presentToday} / {personnel.length}</div>
          </div>
          <div className="sdc-card p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Masse salariale du jour</div>
            <div className="text-xl font-black text-white">{formatCFA(totalSalairesToday)}</div>
          </div>
          <div className="sdc-card p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total à payer (événement)</div>
            <div className="text-xl font-black text-orange-400">{formatCFA(totalSalairesGlobal)}</div>
          </div>
        </div>

        {/* Feuille de présence du jour */}
        <div className="sdc-card mb-6 overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(249,115,22,0.1)' }}>
            <h3 className="font-bold text-white text-sm">Présences — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
            <button onClick={() => setShowForm(!showForm)} className="sdc-btn-primary flex items-center gap-2 text-xs px-3 py-1.5">
              <Plus size={14} /> Ajouter employé
            </button>
          </div>

          {showForm && (
            <div className="p-5 border-b" style={{ borderColor: 'rgba(249,115,22,0.1)', background: 'rgba(249,115,22,0.03)' }}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Nom complet</label>
                  <input value={form.nom_complet} onChange={e => setForm({...form, nom_complet: e.target.value})} className="sdc-input" placeholder="Prénom Nom" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Rôle</label>
                  <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="sdc-input">
                    {ROLES.map(r => <option key={r} value={r}>{ROLES_LABELS[r]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Salaire/jour (CFA)</label>
                  <input type="number" value={form.salaire_journalier} onChange={e => setForm({...form, salaire_journalier: e.target.value})} className="sdc-input" placeholder="0" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Téléphone</label>
                  <input value={form.telephone} onChange={e => setForm({...form, telephone: e.target.value})} className="sdc-input" placeholder="+225..." />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Mode de paiement</label>
                  <select value={form.mode_paiement} onChange={e => setForm({...form, mode_paiement: e.target.value})} className="sdc-input">
                    <option value="cash">Cash</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="virement">Virement</option>
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <button onClick={handleSubmit} disabled={saving} className="sdc-btn-primary flex-1">{saving ? '...' : 'Ajouter'}</button>
                  <button onClick={() => setShowForm(false)} className="px-3 py-2 rounded-lg text-slate-400 text-sm" style={{ background: '#1E293B' }}>✕</button>
                </div>
              </div>
            </div>
          )}

          {loading ? <div className="p-8 text-center text-slate-500">Chargement...</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <th className="text-left p-3 text-slate-500 font-medium text-xs uppercase">Employé</th>
                    <th className="text-left p-3 text-slate-500 font-medium text-xs uppercase">Rôle</th>
                    <th className="text-right p-3 text-slate-500 font-medium text-xs uppercase">Salaire/j</th>
                    <th className="text-center p-3 text-slate-500 font-medium text-xs uppercase">Présent</th>
                    <th className="text-left p-3 text-slate-500 font-medium text-xs uppercase">Paiement</th>
                  </tr>
                </thead>
                <tbody>
                  {personnel.map(emp => {
                    const pres = presences.find(p => p.employe_id === emp.id)
                    const isPresent = pres?.present ?? false
                    return (
                      <tr key={emp.id} className="border-t hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                        <td className="p-3">
                          <div className="font-medium text-white">{emp.nom_complet}</div>
                          <div className="text-xs text-slate-500">{emp.telephone}</div>
                        </td>
                        <td className="p-3"><span className="badge warning-badge">{ROLES_LABELS[emp.role]}</span></td>
                        <td className="p-3 text-right text-white font-medium">{formatCFA(emp.salaire_journalier)}</td>
                        <td className="p-3 text-center">
                          <button onClick={() => togglePresence(emp.id, isPresent)} className="transition-transform hover:scale-110">
                            {isPresent
                              ? <CheckCircle size={22} className="text-green-400" />
                              : <XCircle size={22} className="text-slate-600" />}
                          </button>
                        </td>
                        <td className="p-3 text-slate-400 text-xs capitalize">{emp.mode_paiement?.replace('_', ' ')}</td>
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
