'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import { Plus, Ticket, Smartphone, Monitor, DoorOpen } from 'lucide-react'

function formatCFA(n: number) { return new Intl.NumberFormat('fr-FR').format(n) + ' CFA' }

const CANAUX: Record<string, { label: string, icon: any, color: string }> = {
  guichet: { label: 'Guichet', icon: DoorOpen, color: '#F97316' },
  mobile_money: { label: 'Mobile Money', icon: Smartphone, color: '#16A34A' },
  online: { label: 'En ligne', icon: Monitor, color: '#3B82F6' },
  invitation: { label: 'Invitation', icon: Ticket, color: '#8B5CF6' },
}

export default function BilletteriePage() {
  const [types, setTypes] = useState<any[]>([])
  const [ventes, setVentes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type_billet_id: '', quantite: '1', canal: 'guichet', date: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])
  async function loadData() {
    setLoading(true)
    const [typesRes, ventesRes] = await Promise.all([
      supabase.from('types_billets').select('*').eq('actif', true),
      supabase.from('ventes_billets').select('*, types_billets(nom, prix)').order('created_at', { ascending: false }).limit(30)
    ])
    if (typesRes.data) setTypes(typesRes.data)
    if (ventesRes.data) setVentes(ventesRes.data)
    setLoading(false)
  }

  async function handleSubmit() {
    setSaving(true)
    const type = types.find(t => t.id === form.type_billet_id)
    const montant = (type?.prix || 0) * (parseInt(form.quantite) || 1)
    await supabase.from('ventes_billets').insert({ ...form, quantite: parseInt(form.quantite), montant_total: montant })
    setSaving(false); setShowForm(false); loadData()
  }

  const totalJour = ventes.filter(v => v.date === new Date().toISOString().split('T')[0]).reduce((sum, v) => sum + v.montant_total, 0)
  const totalBillets = ventes.reduce((sum, v) => sum + v.quantite, 0)
  const totalCA = ventes.reduce((sum, v) => sum + v.montant_total, 0)

  return (
    <div>
      <TopBar title="Billetterie & Contrôle d'accès" />
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="sdc-card p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">CA Billetterie — Aujourd'hui</div>
            <div className="text-xl font-black text-white">{formatCFA(totalJour)}</div>
          </div>
          <div className="sdc-card p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total billets vendus</div>
            <div className="text-xl font-black text-white">{totalBillets.toLocaleString('fr-FR')}</div>
          </div>
          <div className="sdc-card p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">CA Total Billetterie</div>
            <div className="text-xl font-black text-green-400">{formatCFA(totalCA)}</div>
          </div>
        </div>

        {/* Canaux de vente */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {Object.entries(CANAUX).map(([key, { label, icon: Icon, color }]) => {
            const total = ventes.filter(v => v.canal === key).reduce((s, v) => s + v.montant_total, 0)
            return (
              <div key={key} className="sdc-card p-4 text-center">
                <Icon size={20} style={{ color }} className="mx-auto mb-2" />
                <div className="text-xs text-slate-400 mb-1">{label}</div>
                <div className="font-bold text-white text-sm">{formatCFA(total)}</div>
              </div>
            )
          })}
        </div>

        {/* Types de billets stock */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {types.map(t => {
            const vendu = ventes.filter(v => v.type_billet_id === t.id).reduce((s, v) => s + v.quantite, 0)
            const pct = t.quota ? Math.min(100, Math.round((vendu / t.quota) * 100)) : null
            return (
              <div key={t.id} className="sdc-card p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-white text-sm">{t.nom}</div>
                  <span className="badge warning-badge">{formatCFA(t.prix)}</span>
                </div>
                <div className="text-xs text-slate-400">{vendu} / {t.quota || '∞'} vendus</div>
                {pct !== null && (
                  <div className="mt-2 h-1.5 rounded-full" style={{ background: '#1E293B' }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: pct > 80 ? '#EF4444' : '#F97316' }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex justify-end mb-4">
          <button onClick={() => setShowForm(!showForm)} className="sdc-btn-primary flex items-center gap-2">
            <Plus size={16} /> Enregistrer vente
          </button>
        </div>

        {showForm && (
          <div className="sdc-card p-6 mb-6">
            <h3 className="font-bold text-white mb-4">Nouvelle vente de billets</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Type de billet</label>
                <select value={form.type_billet_id} onChange={e => setForm({...form, type_billet_id: e.target.value})} className="sdc-input">
                  <option value="">Sélectionner...</option>
                  {types.map(t => <option key={t.id} value={t.id}>{t.nom} — {formatCFA(t.prix)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Canal de vente</label>
                <select value={form.canal} onChange={e => setForm({...form, canal: e.target.value})} className="sdc-input">
                  {Object.entries(CANAUX).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Quantité</label>
                <input type="number" min="1" value={form.quantite} onChange={e => setForm({...form, quantite: e.target.value})} className="sdc-input" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="sdc-input" />
              </div>
            </div>
            {form.type_billet_id && form.quantite && (
              <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(22,163,74,0.1)' }}>
                <span className="text-sm text-slate-400">Total : </span>
                <span className="font-black text-white text-lg">
                  {formatCFA((types.find(t => t.id === form.type_billet_id)?.prix || 0) * parseInt(form.quantite || '1'))}
                </span>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={handleSubmit} disabled={saving} className="sdc-btn-primary flex-1">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-slate-400 hover:text-white" style={{ background: '#1E293B' }}>Annuler</button>
            </div>
          </div>
        )}

        <div className="sdc-card overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: 'rgba(249,115,22,0.1)' }}>
            <h3 className="font-bold text-white text-sm">Historique des ventes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <th className="text-left p-3 text-slate-500 font-medium text-xs uppercase">Date</th>
                  <th className="text-left p-3 text-slate-500 font-medium text-xs uppercase">Type</th>
                  <th className="text-center p-3 text-slate-500 font-medium text-xs uppercase">Canal</th>
                  <th className="text-right p-3 text-slate-500 font-medium text-xs uppercase">Qté</th>
                  <th className="text-right p-3 text-slate-500 font-medium text-xs uppercase">Montant</th>
                </tr>
              </thead>
              <tbody>
                {ventes.map(v => (
                  <tr key={v.id} className="border-t hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <td className="p-3 text-white">{new Date(v.date).toLocaleDateString('fr-FR')}</td>
                    <td className="p-3 text-slate-300">{v.types_billets?.nom}</td>
                    <td className="p-3 text-center"><span className="badge warning-badge">{CANAUX[v.canal]?.label || v.canal}</span></td>
                    <td className="p-3 text-right text-white">{v.quantite}</td>
                    <td className="p-3 text-right font-bold text-green-400">{formatCFA(v.montant_total)}</td>
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
