'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import { Plus, Receipt } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

function formatCFA(n: number) { return new Intl.NumberFormat('fr-FR').format(n) + ' CFA' }

const CATEGORIES: Record<string, string> = {
  cachet_artiste: '🎤 Cachets artistes', communication: '📣 Communication',
  logistique: '🚛 Logistique', location_materiel: '🎛️ Location matériel',
  transport: '🚗 Transport', securite: '🛡️ Sécurité',
  electricite: '⚡ Électricité', restauration_equipe: '🍱 Restauration équipe', divers: '📦 Divers'
}
const COLORS = ['#F97316','#F59E0B','#16A34A','#3B82F6','#8B5CF6','#EC4899','#14B8A6','#EF4444','#94A3B8']

export default function DepensesPage() {
  const [depenses, setDepenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], categorie: 'divers', libelle: '', montant: '', beneficiaire: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])
  async function loadData() {
    setLoading(true)
    const { data } = await supabase.from('depenses').select('*').order('date', { ascending: false })
    if (data) setDepenses(data)
    setLoading(false)
  }

  async function handleSubmit() {
    setSaving(true)
    await supabase.from('depenses').insert({ ...form, montant: parseFloat(form.montant) || 0 })
    setSaving(false); setShowForm(false); loadData()
  }

  const totalGeneral = depenses.reduce((sum, d) => sum + d.montant, 0)
  const totalJour = depenses.filter(d => d.date === new Date().toISOString().split('T')[0]).reduce((sum, d) => sum + d.montant, 0)

  const byCateg = Object.entries(CATEGORIES).map(([key, label], i) => ({
    name: label, value: depenses.filter(d => d.categorie === key).reduce((s, d) => s + d.montant, 0), color: COLORS[i]
  })).filter(c => c.value > 0)

  return (
    <div>
      <TopBar title="Dépenses" />
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="sdc-card p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Dépenses du jour</div>
            <div className="text-xl font-black text-white">{formatCFA(totalJour)}</div>
          </div>
          <div className="sdc-card p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total dépenses événement</div>
            <div className="text-xl font-black text-red-400">{formatCFA(totalGeneral)}</div>
          </div>
        </div>

        {/* Répartition par catégorie */}
        {byCateg.length > 0 && (
          <div className="sdc-card p-5 mb-6">
            <h3 className="font-bold text-white text-sm mb-4">Répartition par catégorie</h3>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie data={byCateg} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value">
                    {byCateg.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCFA(v)} contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 8, color: '#F8FAFC' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {byCateg.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }}></span>
                      <span className="text-slate-300 text-xs">{c.name}</span>
                    </div>
                    <span className="font-bold text-white text-xs">{formatCFA(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end mb-4">
          <button onClick={() => setShowForm(!showForm)} className="sdc-btn-primary flex items-center gap-2">
            <Plus size={16} /> Nouvelle dépense
          </button>
        </div>

        {showForm && (
          <div className="sdc-card p-6 mb-6">
            <h3 className="font-bold text-white mb-4">Enregistrer une dépense</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="sdc-input" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Catégorie</label>
                <select value={form.categorie} onChange={e => setForm({...form, categorie: e.target.value})} className="sdc-input">
                  {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-400 block mb-1">Libellé</label>
                <input value={form.libelle} onChange={e => setForm({...form, libelle: e.target.value})} className="sdc-input" placeholder="Description de la dépense..." />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Montant (CFA)</label>
                <input type="number" value={form.montant} onChange={e => setForm({...form, montant: e.target.value})} className="sdc-input" placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Bénéficiaire</label>
                <input value={form.beneficiaire} onChange={e => setForm({...form, beneficiaire: e.target.value})} className="sdc-input" placeholder="Nom ou société..." />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSubmit} disabled={saving} className="sdc-btn-primary flex-1">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-slate-400 hover:text-white" style={{ background: '#1E293B' }}>Annuler</button>
            </div>
          </div>
        )}

        <div className="sdc-card overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: 'rgba(249,115,22,0.1)' }}>
            <h3 className="font-bold text-white text-sm">Toutes les dépenses</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <th className="text-left p-3 text-slate-500 font-medium text-xs uppercase">Date</th>
                  <th className="text-left p-3 text-slate-500 font-medium text-xs uppercase">Libellé</th>
                  <th className="text-left p-3 text-slate-500 font-medium text-xs uppercase">Catégorie</th>
                  <th className="text-right p-3 text-slate-500 font-medium text-xs uppercase">Montant</th>
                  <th className="text-left p-3 text-slate-500 font-medium text-xs uppercase">Bénéficiaire</th>
                </tr>
              </thead>
              <tbody>
                {depenses.map(d => (
                  <tr key={d.id} className="border-t hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <td className="p-3 text-white">{new Date(d.date).toLocaleDateString('fr-FR')}</td>
                    <td className="p-3 text-slate-300">{d.libelle}</td>
                    <td className="p-3 text-xs text-slate-400">{CATEGORIES[d.categorie] || d.categorie}</td>
                    <td className="p-3 text-right font-bold text-red-400">{formatCFA(d.montant)}</td>
                    <td className="p-3 text-slate-400">{d.beneficiaire || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
