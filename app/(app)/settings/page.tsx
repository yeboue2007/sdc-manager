'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import { Save, Plus, X, Pencil, Trash2, Building2, User, Key } from 'lucide-react'

function formatCFA(n: number) { return new Intl.NumberFormat('fr-FR').format(n) + ' CFA' }

const EMPTY_PDV = { nom: '', type: 'bar' }

export default function SettingsPage() {
  const [points, setPoints] = useState<any[]>([])
  const [showPdvForm, setShowPdvForm] = useState(false)
  const [pdvForm, setPdvForm] = useState(EMPTY_PDV)
  const [editPdvId, setEditPdvId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [user, setUser] = useState<any>(null)
  const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '' })
  const [pwdMsg, setPwdMsg] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [pdvRes, userRes] = await Promise.all([
      supabase.from('points_de_vente').select('*').order('nom'),
      supabase.auth.getUser()
    ])
    setPoints(pdvRes.data || [])
    setUser(userRes.data?.user)
  }

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }
  function flashPwd(m: string) { setPwdMsg(m); setTimeout(() => setPwdMsg(''), 4000) }

  async function savePdv() {
    if (!pdvForm.nom) return
    setSaving(true)
    const { error } = editPdvId
      ? await supabase.from('points_de_vente').update({ ...pdvForm, actif: true }).eq('id', editPdvId)
      : await supabase.from('points_de_vente').insert({ ...pdvForm, actif: true })
    setSaving(false)
    if (error) { flash('❌ ' + error.message); return }
    flash(editPdvId ? '✅ Point de vente modifié' : '✅ Point de vente ajouté')
    setShowPdvForm(false); setEditPdvId(null); setPdvForm(EMPTY_PDV); loadData()
  }

  async function deletePdv(id: string, nom: string) {
    if (!confirm(`Supprimer "${nom}" ?`)) return
    const { error } = await supabase.from('points_de_vente').update({ actif: false }).eq('id', id)
    if (error) flash('❌ Erreur')
    else { flash('✅ Supprimé'); loadData() }
  }

  async function changePassword() {
    if (!pwdForm.new || pwdForm.new !== pwdForm.confirm) { flashPwd('❌ Les mots de passe ne correspondent pas'); return }
    if (pwdForm.new.length < 8) { flashPwd('❌ Minimum 8 caractères'); return }
    const { error } = await supabase.auth.updateUser({ password: pwdForm.new })
    if (error) flashPwd('❌ ' + error.message)
    else { flashPwd('✅ Mot de passe modifié avec succès'); setPwdForm({ current: '', new: '', confirm: '' }) }
  }

  return (
    <div>
      <TopBar title="Paramètres" />
      <div className="p-6 space-y-6">
        {msg && <div className="p-3 rounded-lg text-sm font-medium" style={{ background: msg.startsWith('✅') ? 'rgba(22,163,74,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${msg.startsWith('✅') ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.startsWith('✅') ? '#86EFAC' : '#FCA5A5' }}>{msg}</div>}

        {/* Infos compte */}
        <div className="sdc-card p-6">
          <h2 className="font-bold text-white mb-4 flex items-center gap-2"><User size={18} style={{ color: '#F97316' }} />Mon compte</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg" style={{ background: '#1E293B' }}>
              <div className="text-xs text-slate-400 mb-1">Email</div>
              <div className="text-white font-medium">{user?.email || '—'}</div>
            </div>
            <div className="p-3 rounded-lg" style={{ background: '#1E293B' }}>
              <div className="text-xs text-slate-400 mb-1">Rôle</div>
              <div className="text-orange-400 font-bold uppercase">Administrateur</div>
            </div>
          </div>
        </div>

        {/* Changer mot de passe */}
        <div className="sdc-card p-6">
          <h2 className="font-bold text-white mb-4 flex items-center gap-2"><Key size={18} style={{ color: '#F97316' }} />Changer le mot de passe</h2>
          {pwdMsg && <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: pwdMsg.startsWith('✅') ? 'rgba(22,163,74,0.15)' : 'rgba(239,68,68,0.15)', color: pwdMsg.startsWith('✅') ? '#86EFAC' : '#FCA5A5' }}>{pwdMsg}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="text-xs text-slate-400 block mb-1">Nouveau mot de passe</label><input type="password" value={pwdForm.new} onChange={e => setPwdForm({ ...pwdForm, new: e.target.value })} className="sdc-input" placeholder="Min. 8 caractères" /></div>
            <div><label className="text-xs text-slate-400 block mb-1">Confirmer</label><input type="password" value={pwdForm.confirm} onChange={e => setPwdForm({ ...pwdForm, confirm: e.target.value })} className="sdc-input" placeholder="Répéter..." /></div>
            <div className="flex items-end"><button onClick={changePassword} disabled={!pwdForm.new || !pwdForm.confirm} className="sdc-btn-primary flex items-center gap-2 w-full justify-center disabled:opacity-50"><Save size={16} />Modifier</button></div>
          </div>
        </div>

        {/* Points de vente */}
        <div className="sdc-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white flex items-center gap-2"><Building2 size={18} style={{ color: '#F97316' }} />Points de vente / Bars</h2>
            <button onClick={() => { setShowPdvForm(!showPdvForm); setEditPdvId(null); setPdvForm(EMPTY_PDV) }} className="sdc-btn-primary flex items-center gap-2 text-sm px-3 py-1.5">
              {showPdvForm ? <X size={14} /> : <Plus size={14} />}
              {showPdvForm ? 'Annuler' : 'Ajouter'}
            </button>
          </div>

          {showPdvForm && (
            <div className="mb-4 p-4 rounded-xl" style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.15)' }}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><label className="text-xs text-slate-400 block mb-1">Nom *</label><input value={pdvForm.nom} onChange={e => setPdvForm({ ...pdvForm, nom: e.target.value })} className="sdc-input" placeholder="Ex: Bar Principal" /></div>
                <div><label className="text-xs text-slate-400 block mb-1">Type</label>
                  <select value={pdvForm.type} onChange={e => setPdvForm({ ...pdvForm, type: e.target.value })} className="sdc-input">
                    <option value="bar">Bar</option><option value="vip">VIP</option><option value="entree">Entrée</option><option value="autre">Autre</option>
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <button onClick={savePdv} disabled={saving || !pdvForm.nom} className="sdc-btn-primary flex items-center gap-2 flex-1 justify-center disabled:opacity-50"><Save size={14} />{saving ? '...' : editPdvId ? 'Modifier' : 'Ajouter'}</button>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                <th className="text-left p-3 text-slate-500 text-xs uppercase">Nom</th>
                <th className="text-left p-3 text-slate-500 text-xs uppercase">Type</th>
                <th className="text-center p-3 text-slate-500 text-xs uppercase">Statut</th>
                <th className="text-center p-3 text-slate-500 text-xs uppercase">Actions</th>
              </tr></thead>
              <tbody>
                {points.map(p => (
                  <tr key={p.id} className="border-t hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <td className="p-3 font-medium text-white">{p.nom}</td>
                    <td className="p-3"><span className="badge warning-badge capitalize">{p.type}</span></td>
                    <td className="p-3 text-center"><span className={`badge ${p.actif ? 'success-badge' : 'alert-badge'}`}>{p.actif ? 'Actif' : 'Inactif'}</span></td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { setPdvForm({ nom: p.nom, type: p.type }); setEditPdvId(p.id); setShowPdvForm(true) }} className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400"><Pencil size={13} /></button>
                        <button onClick={() => deletePdv(p.id, p.nom)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Infos événement */}
        <div className="sdc-card p-6">
          <h2 className="font-bold text-white mb-4">📋 Informations événement</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              ['Événement', 'Le Spécial 51 Jours Chrono du Mondial 2026'],
              ['Organisateur', 'Son Du Ciel Events'],
              ['Contact', 'Michel Adiko'],
              ['Lieu', 'Espace Pavageau, Ebimpé, Abidjan'],
              ['Début', '30 Mai 2026'],
              ['Fin', '19 Juillet 2026'],
              ['Surface', '~3 000 m²'],
              ['Version app', 'SDC Manager v1.0'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2 p-2.5 rounded-lg" style={{ background: '#1E293B' }}>
                <span className="text-slate-500 flex-shrink-0 w-28">{k}</span>
                <span className="text-white font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
