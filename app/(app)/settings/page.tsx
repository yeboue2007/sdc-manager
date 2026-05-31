'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import { Save, Plus, X, Pencil, Trash2, Building2, Users, Key, Eye, EyeOff, ShieldCheck, Info } from 'lucide-react'
import RoleGuard from '@/components/RoleGuard'

const ROLES: Record<string, { label: string; desc: string; color: string }> = {
  admin:              { label: 'Administrateur',     desc: 'Accès total à toutes les fonctions',               color: '#F97316' },
  comptable:          { label: 'Comptable',           desc: 'Caisses, dépenses, rapports',                      color: '#3B82F6' },
  responsable_stock:  { label: 'Resp. Stock',         desc: 'Gestion du stock boissons uniquement',             color: '#16A34A' },
  responsable_stands: { label: 'Resp. Stands',        desc: 'Gestion des stands nourriture',                    color: '#F59E0B' },
  rh:                 { label: 'RH / Personnel',      desc: 'Gestion du personnel et présences',               color: '#8B5CF6' },
  superviseur:        { label: 'Superviseur Terrain', desc: 'Lecture seule — tableau de bord',                 color: '#14B8A6' },
  billetterie:        { label: 'Billetterie',         desc: 'Ventes de billets et contrôle accès',             color: '#EC4899' },
}

const EMPTY_USER = { email: '', password: '', full_name: '', role: 'comptable', phone: '' }
const EMPTY_PDV  = { nom: '', type: 'bar' }

export default function SettingsPage() {
  const [tab, setTab] = useState<'utilisateurs' | 'points_vente' | 'compte' | 'infos'>('utilisateurs')

  // Utilisateurs
  const [users, setUsers] = useState<any[]>([])
  const [showUserForm, setShowUserForm] = useState(false)
  const [userForm, setUserForm] = useState(EMPTY_USER)
  const [editUserId, setEditUserId] = useState<string | null>(null)
  const [showPwd, setShowPwd] = useState(false)
  const [savingUser, setSavingUser] = useState(false)
  const [userMsg, setUserMsg] = useState('')

  // Points de vente
  const [points, setPoints] = useState<any[]>([])
  const [showPdvForm, setShowPdvForm] = useState(false)
  const [pdvForm, setPdvForm] = useState(EMPTY_PDV)
  const [editPdvId, setEditPdvId] = useState<string | null>(null)
  const [savingPdv, setSavingPdv] = useState(false)
  const [pdvMsg, setPdvMsg] = useState('')

  // Compte
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [pwdForm, setPwdForm] = useState({ new: '', confirm: '' })
  const [pwdMsg, setPwdMsg] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [profRes, pdvRes, userRes] = await Promise.all([
      supabase.from('admin_users_view').select('*').order('full_name'),
      supabase.from('points_de_vente').select('*').order('nom'),
      supabase.auth.getUser()
    ])
    setUsers(profRes.data || [])
    setPoints(pdvRes.data || [])
    setCurrentUser(userRes.data?.user)
  }

  function flash(set: any, m: string) { set(m); setTimeout(() => set(''), 4000) }

  // ── Créer / modifier utilisateur ──────────────────────────────
  async function saveUser() {
    if (!userForm.full_name || !userForm.role) return
    if (!editUserId && (!userForm.email || !userForm.password)) return
    setSavingUser(true)

    try {
      if (editUserId) {
        // Modifier profil — ne touche pas à la session
        const { error } = await supabase
          .from('user_profiles')
          .update({ full_name: userForm.full_name, role: userForm.role, phone: userForm.phone || null })
          .eq('id', editUserId)
        if (error) throw error
        flash(setUserMsg, '✅ Utilisateur modifié avec succès')
      } else {
        // Créer via fonction SQL SECURITY DEFINER
        // Insère directement dans auth.users SANS créer de session côté client
        const { data, error } = await supabase.rpc('create_user_by_admin', {
          p_email: userForm.email,
          p_password: userForm.password,
          p_full_name: userForm.full_name,
          p_role: userForm.role,
          p_phone: userForm.phone || null
        })
        if (error) throw error
        if (data?.error) throw new Error(data.error)
        flash(setUserMsg, '✅ Compte créé ! L\'utilisateur peut se connecter immédiatement.')
      }

      setShowUserForm(false)
      setEditUserId(null)
      setUserForm(EMPTY_USER)
      await loadAll()
    } catch (e: any) {
      flash(setUserMsg, '❌ Erreur : ' + e.message)
    }
    setSavingUser(false)
  }

  async function toggleUserActive(id: string, active: boolean, name: string) {
    if (!confirm(`${active ? 'Désactiver' : 'Réactiver'} le compte de ${name} ?`)) return
    const { error } = await supabase
      .from('user_profiles')
      .update({ active: !active })
      .eq('id', id)
    if (error) flash(setUserMsg, '❌ Erreur: ' + error.message)
    else { flash(setUserMsg, `✅ Compte ${!active ? 'réactivé' : 'désactivé'}`); loadAll() }
  }

  function startEditUser(u: any) {
    setUserForm({ email: u.email || '', password: '', full_name: u.full_name, role: u.role, phone: u.phone || '' })
    setEditUserId(u.id)
    setShowUserForm(true)
  }

  // ── Points de vente ───────────────────────────────────────────
  async function savePdv() {
    if (!pdvForm.nom) return
    setSavingPdv(true)
    const { error } = editPdvId
      ? await supabase.from('points_de_vente').update({ ...pdvForm, actif: true }).eq('id', editPdvId)
      : await supabase.from('points_de_vente').insert({ ...pdvForm, actif: true })
    setSavingPdv(false)
    if (error) { flash(setPdvMsg, '❌ ' + error.message); return }
    flash(setPdvMsg, editPdvId ? '✅ Modifié' : '✅ Ajouté')
    setShowPdvForm(false); setEditPdvId(null); setPdvForm(EMPTY_PDV); loadAll()
  }

  async function deletePdv(id: string, nom: string) {
    if (!confirm(`Supprimer "${nom}" ?`)) return
    await supabase.from('points_de_vente').update({ actif: false }).eq('id', id)
    flash(setPdvMsg, '✅ Supprimé'); loadAll()
  }

  // ── Mot de passe ──────────────────────────────────────────────
  async function changePassword() {
    if (pwdForm.new !== pwdForm.confirm) { flash(setPwdMsg, '❌ Les mots de passe ne correspondent pas'); return }
    if (pwdForm.new.length < 8) { flash(setPwdMsg, '❌ Minimum 8 caractères'); return }
    const { error } = await supabase.auth.updateUser({ password: pwdForm.new })
    if (error) flash(setPwdMsg, '❌ ' + error.message)
    else { flash(setPwdMsg, '✅ Mot de passe modifié'); setPwdForm({ new: '', confirm: '' }) }
  }

  const TABS = [
    { key: 'utilisateurs', label: '👥 Utilisateurs', icon: Users },
    { key: 'points_vente', label: '🏪 Points de vente', icon: Building2 },
    { key: 'compte',       label: '🔑 Mon compte',      icon: Key },
    { key: 'infos',        label: 'ℹ️ Événement',       icon: Info },
  ]

  return (
    <div>
      <TopBar title="Paramètres" />
      <div className="p-4 sm:p-6 space-y-4">

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className="px-3 py-2 rounded-lg text-xs font-bold transition-all"
              style={{ background: tab === t.key ? 'linear-gradient(135deg,#F97316,#EA580C)' : '#1E293B', color: tab === t.key ? '#fff' : '#94A3B8' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══════ UTILISATEURS ═══════ */}
        {tab === 'utilisateurs' && (
          <div className="space-y-4">
            {userMsg && <div className="p-3 rounded-lg text-sm" style={{ background: userMsg.startsWith('✅') ? 'rgba(22,163,74,0.15)' : 'rgba(239,68,68,0.15)', color: userMsg.startsWith('✅') ? '#86EFAC' : '#FCA5A5', border: `1px solid ${userMsg.startsWith('✅') ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}` }}>{userMsg}</div>}

            <div className="flex justify-end">
              <button onClick={() => { setShowUserForm(!showUserForm); setEditUserId(null); setUserForm(EMPTY_USER) }}
                className="sdc-btn-primary flex items-center gap-2 text-sm">
                {showUserForm ? <X size={15} /> : <Plus size={15} />}
                {showUserForm ? 'Annuler' : 'Nouvel utilisateur'}
              </button>
            </div>

            {/* Formulaire création/édition */}
            {showUserForm && (
              <div className="sdc-card p-5">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <ShieldCheck size={16} style={{ color: '#F97316' }} />
                  {editUserId ? '✏️ Modifier l\'utilisateur' : '➕ Créer un utilisateur'}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Nom complet *</label>
                    <input value={userForm.full_name} onChange={e => setUserForm({ ...userForm, full_name: e.target.value })}
                      className="sdc-input" placeholder="Prénom Nom" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Rôle *</label>
                    <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className="sdc-input">
                      {Object.entries(ROLES).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>

                  {!editUserId && (
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Email *</label>
                      <input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                        className="sdc-input" placeholder="email@exemple.com" />
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      {editUserId ? 'Nouveau mot de passe (laisser vide = inchangé)' : 'Mot de passe *'}
                    </label>
                    <div className="relative">
                      <input type={showPwd ? 'text' : 'password'} value={userForm.password}
                        onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                        className="sdc-input pr-10" placeholder="Min. 8 caractères" />
                      <button type="button" onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                        {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Téléphone</label>
                    <input value={userForm.phone} onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                      className="sdc-input" placeholder="+225..." />
                  </div>
                </div>

                {/* Aperçu rôle sélectionné */}
                {userForm.role && (
                  <div className="mt-4 p-3 rounded-lg flex items-center gap-3" style={{ background: ROLES[userForm.role]?.color + '15', border: `1px solid ${ROLES[userForm.role]?.color}30` }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ROLES[userForm.role]?.color }} />
                    <div>
                      <div className="text-xs font-bold" style={{ color: ROLES[userForm.role]?.color }}>{ROLES[userForm.role]?.label}</div>
                      <div className="text-xs text-slate-400">{ROLES[userForm.role]?.desc}</div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <button onClick={saveUser} disabled={savingUser || !userForm.full_name || (!editUserId && (!userForm.email || !userForm.password))}
                    className="sdc-btn-primary flex items-center gap-2 disabled:opacity-50">
                    <Save size={15} />{savingUser ? 'Enregistrement...' : editUserId ? 'Modifier' : 'Créer le compte'}
                  </button>
                  <button onClick={() => { setShowUserForm(false); setEditUserId(null) }}
                    className="px-4 py-2 rounded-lg text-slate-400 text-sm" style={{ background: '#1E293B' }}>
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Liste utilisateurs */}
            <div className="sdc-card overflow-hidden">
              <div className="p-4 border-b" style={{ borderColor: 'rgba(249,115,22,0.1)' }}>
                <h3 className="font-bold text-white text-sm">Comptes utilisateurs ({users.length})</h3>
              </div>
              {users.length === 0 ? (
                <div className="p-8 text-center text-slate-500">Aucun utilisateur.</div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  {users.map(u => {
                    const role = ROLES[u.role]
                    return (
                      <div key={u.id} className="p-4 flex items-center gap-3 hover:bg-white/[0.02]">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white flex-shrink-0"
                          style={{ background: role?.color ? role.color + 'cc' : '#475569' }}>
                          {u.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-white text-sm truncate">{u.full_name}</div>
                          <div className="text-xs text-slate-400 truncate">{u.phone || 'Pas de téléphone'}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: role?.color + '25', color: role?.color }}>
                              {role?.label || u.role}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${u.active !== false ? 'success-badge' : 'alert-badge'}`}>
                              {u.active !== false ? 'Actif' : 'Inactif'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button onClick={() => startEditUser(u)}
                            className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => toggleUserActive(u.id, u.active !== false, u.full_name)}
                            className={`p-2 rounded-lg transition-colors ${u.active !== false ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-green-500/20 text-green-400'}`}>
                            {u.active !== false ? <X size={14} /> : <ShieldCheck size={14} />}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Légende des rôles */}
            <div className="sdc-card p-4">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">Rôles & permissions</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(ROLES).map(([k, v]) => (
                  <div key={k} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: '#0F172A' }}>
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: v.color }} />
                    <div>
                      <div className="text-xs font-bold text-white">{v.label}</div>
                      <div className="text-xs text-slate-500">{v.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════ POINTS DE VENTE ═══════ */}
        {tab === 'points_vente' && (
          <div className="space-y-4">
            {pdvMsg && <div className="p-3 rounded-lg text-sm" style={{ background: pdvMsg.startsWith('✅') ? 'rgba(22,163,74,0.15)' : 'rgba(239,68,68,0.15)', color: pdvMsg.startsWith('✅') ? '#86EFAC' : '#FCA5A5', border: `1px solid ${pdvMsg.startsWith('✅') ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}` }}>{pdvMsg}</div>}

            <div className="flex justify-end">
              <button onClick={() => { setShowPdvForm(!showPdvForm); setEditPdvId(null); setPdvForm(EMPTY_PDV) }}
                className="sdc-btn-primary flex items-center gap-2 text-sm">
                {showPdvForm ? <X size={15} /> : <Plus size={15} />}
                {showPdvForm ? 'Annuler' : 'Ajouter un point de vente'}
              </button>
            </div>

            {showPdvForm && (
              <div className="sdc-card p-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Nom *</label>
                    <input value={pdvForm.nom} onChange={e => setPdvForm({ ...pdvForm, nom: e.target.value })}
                      className="sdc-input" placeholder="Ex: Bar Principal" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Type</label>
                    <select value={pdvForm.type} onChange={e => setPdvForm({ ...pdvForm, type: e.target.value })} className="sdc-input">
                      <option value="bar">Bar</option>
                      <option value="vip">VIP</option>
                      <option value="entree">Entrée</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button onClick={savePdv} disabled={savingPdv || !pdvForm.nom}
                      className="sdc-btn-primary flex items-center gap-2 w-full justify-center disabled:opacity-50">
                      <Save size={14} />{savingPdv ? '...' : editPdvId ? 'Modifier' : 'Ajouter'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="sdc-card overflow-hidden">
              <div className="p-4 border-b" style={{ borderColor: 'rgba(249,115,22,0.1)' }}>
                <h3 className="font-bold text-white text-sm">Points de vente ({points.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <th className="text-left p-3 text-slate-500 text-xs uppercase">Nom</th>
                      <th className="text-left p-3 text-slate-500 text-xs uppercase">Type</th>
                      <th className="text-center p-3 text-slate-500 text-xs uppercase">Statut</th>
                      <th className="text-center p-3 text-slate-500 text-xs uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {points.map(p => (
                      <tr key={p.id} className="border-t hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                        <td className="p-3 font-medium text-white">{p.nom}</td>
                        <td className="p-3"><span className="badge warning-badge capitalize">{p.type}</span></td>
                        <td className="p-3 text-center"><span className={`badge ${p.actif ? 'success-badge' : 'alert-badge'}`}>{p.actif ? 'Actif' : 'Inactif'}</span></td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-1.5">
                            <button onClick={() => { setPdvForm({ nom: p.nom, type: p.type }); setEditPdvId(p.id); setShowPdvForm(true) }}
                              className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400"><Pencil size={13} /></button>
                            <button onClick={() => deletePdv(p.id, p.nom)}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ MON COMPTE ═══════ */}
        {tab === 'compte' && (
          <div className="space-y-4">
            <div className="sdc-card p-5">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Key size={16} style={{ color: '#F97316' }} />Informations du compte</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg" style={{ background: '#0F172A' }}>
                  <div className="text-xs text-slate-500 mb-1">Email</div>
                  <div className="text-white font-medium text-sm">{currentUser?.email || '—'}</div>
                </div>
                <div className="p-3 rounded-lg" style={{ background: '#0F172A' }}>
                  <div className="text-xs text-slate-500 mb-1">Rôle</div>
                  <div className="font-bold text-sm" style={{ color: '#F97316' }}>Administrateur</div>
                </div>
              </div>
            </div>

            <div className="sdc-card p-5">
              <h3 className="font-bold text-white mb-4">🔑 Changer le mot de passe</h3>
              {pwdMsg && <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: pwdMsg.startsWith('✅') ? 'rgba(22,163,74,0.15)' : 'rgba(239,68,68,0.15)', color: pwdMsg.startsWith('✅') ? '#86EFAC' : '#FCA5A5' }}>{pwdMsg}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Nouveau mot de passe</label>
                  <input type="password" value={pwdForm.new} onChange={e => setPwdForm({ ...pwdForm, new: e.target.value })} className="sdc-input" placeholder="Min. 8 caractères" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Confirmer</label>
                  <input type="password" value={pwdForm.confirm} onChange={e => setPwdForm({ ...pwdForm, confirm: e.target.value })} className="sdc-input" placeholder="Répéter..." />
                </div>
                <div className="flex items-end">
                  <button onClick={changePassword} disabled={!pwdForm.new || !pwdForm.confirm}
                    className="sdc-btn-primary flex items-center gap-2 w-full justify-center disabled:opacity-50">
                    <Save size={15} />Modifier
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ INFOS ÉVÉNEMENT ═══════ */}
        {tab === 'infos' && (
          <div className="sdc-card p-5">
            <h3 className="font-bold text-white mb-4">📋 Informations événement</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[
                ['Événement',    'Le Spécial 51 Jours Chrono du Mondial 2026'],
                ['Organisateur', 'Son Du Ciel Events'],
                ['Contact',      '+225 05 65 48 24 55'],
                ['Lieu',         "Terrain du village d'Ebimpé, Abidjan"],
                ['Début',        '30 Mai 2026'],
                ['Fin',          '19 Juillet 2026'],
                ['Surface',      '~3 000 m²'],
                ['Version app',  'SDC Manager v2.0'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3 p-3 rounded-lg" style={{ background: '#0F172A' }}>
                  <span className="text-slate-500 flex-shrink-0 text-xs w-24">{k}</span>
                  <span className="text-white font-medium text-xs">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
