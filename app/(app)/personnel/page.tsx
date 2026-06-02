'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import RoleGuard from '@/components/RoleGuard'

function fmt(n: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' CFA' }

const ROLES: Record<string, string> = {
  securite: 'Sécurité', serveur: 'Serveur', technicien: 'Technicien',
  caissier: 'Caissier', superviseur: 'Superviseur', logistique: 'Logistique',
  billetterie: 'Billetterie', autre: 'Autre',
}
const ROLE_COLORS: Record<string, string> = {
  securite: '#EF4444', serveur: '#F97316', technicien: '#3B82F6',
  caissier: '#F59E0B', superviseur: '#8B5CF6', logistique: '#16A34A',
  billetterie: '#EC4899', autre: '#94A3B8',
}

const EMPTY_EMP = { nom_complet: '', role: 'serveur', salaire_journalier: '', telephone: '', mode_paiement: 'cash' }

type Tab = 'presences' | 'employes' | 'paie' | 'stats'

export default function PersonnelPage() {
  const [tab, setTab] = useState<Tab>('presences')
  const [personnel, setPersonnel] = useState<any[]>([])
  const [presences, setPresences] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  // Formulaire employé
  const [showEmpForm, setShowEmpForm] = useState(false)
  const [empForm, setEmpForm] = useState(EMPTY_EMP)
  const [editEmpId, setEditEmpId] = useState<string | null>(null)
  const [savingEmp, setSavingEmp] = useState(false)

  // Édition présence individuelle
  const [editPresId, setEditPresId] = useState<string | null>(null)
  const [editPresForm, setEditPresForm] = useState({ heures_sup: '0', taux_heures_sup: '0', notes: '' })

  useEffect(() => { loadAll() }, [selectedDate])

  async function loadAll() {
    setLoading(true)
    const [persRes, presRes] = await Promise.all([
      supabase.from('personnel').select('*').eq('actif', true).order('nom_complet'),
      supabase.from('presences').select('*').eq('date', selectedDate),
    ])
    setPersonnel(persRes.data || [])
    setPresences(presRes.data || [])
    setLoading(false)
  }

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  // ── Toggle présence ──
  async function togglePresence(empId: string) {
    const emp = personnel.find(e => e.id === empId)
    const existing = presences.find(p => p.employe_id === empId)
    if (existing) {
      const newVal = !existing.present
      const newSalaire = newVal ? (emp?.salaire_journalier || 0) : 0
      await supabase.from('presences').update({
        present: newVal,
        salaire_jour_calcule: newSalaire
      }).eq('id', existing.id)
    } else {
      await supabase.from('presences').insert({
        employe_id: empId,
        date: selectedDate,
        present: true,
        salaire_jour_calcule: emp?.salaire_journalier || 0,
        heures_sup: 0,
        taux_heures_sup: 0,
        paye: false,
      })
    }
    await loadAll()
  }

  // ── Modifier présence (heures sup, notes) ──
  async function savePresence(presId: string) {
    const heuresSup = parseFloat(editPresForm.heures_sup) || 0
    const tauxSup = parseFloat(editPresForm.taux_heures_sup) || 0
    const pres = presences.find(p => p.id === presId)
    const emp = personnel.find(e => e.id === pres?.employe_id)
    const salaire = (emp?.salaire_journalier || 0) + (heuresSup * tauxSup)

    await supabase.from('presences').update({
      heures_sup: heuresSup,
      taux_heures_sup: tauxSup,
      salaire_jour_calcule: salaire,
      notes: editPresForm.notes,
    }).eq('id', presId)
    setEditPresId(null)
    flash('✅ Présence mise à jour')
    await loadAll()
  }

  // ── Marquer payé ──
  async function togglePaye(presId: string, current: boolean) {
    await supabase.from('presences').update({ paye: !current }).eq('id', presId)
    flash(current ? '↩️ Marqué non payé' : '✅ Marqué comme payé')
    await loadAll()
  }

  // ── Ajouter/modifier employé ──
  async function saveEmploye() {
    if (!empForm.nom_complet) return
    setSavingEmp(true)
    const payload = {
      nom_complet: empForm.nom_complet,
      role: empForm.role,
      salaire_journalier: parseFloat(empForm.salaire_journalier) || 0,
      telephone: empForm.telephone,
      mode_paiement: empForm.mode_paiement,
      actif: true,
    }
    const { error } = editEmpId
      ? await supabase.from('personnel').update(payload).eq('id', editEmpId)
      : await supabase.from('personnel').insert(payload)
    setSavingEmp(false)
    if (error) { flash('❌ ' + error.message); return }
    flash(editEmpId ? '✅ Employé modifié' : '✅ Employé ajouté')
    setShowEmpForm(false); setEditEmpId(null); setEmpForm(EMPTY_EMP)
    await loadAll()
  }

  async function deleteEmploye(id: string, nom: string) {
    if (!confirm(`Archiver ${nom} ?`)) return
    await supabase.from('personnel').update({ actif: false }).eq('id', id)
    flash('✅ Employé archivé'); await loadAll()
  }

  // ── Payer tous les présents non payés ──
  async function payerTous() {
    const ids = presences.filter(p => p.present && !p.paye).map(p => p.id)
    if (!ids.length) { flash('ℹ️ Tous déjà payés'); return }
    if (!confirm(`Marquer ${ids.length} employé(s) comme payés ?`)) return
    await supabase.from('presences').update({ paye: true }).in('id', ids)
    flash(`✅ ${ids.length} paiement(s) enregistrés`)
    await loadAll()
  }

  // ── Stats globales ──
  async function loadStats() {
    const { data } = await supabase.from('presences').select('*, personnel(nom_complet, salaire_journalier, role)')
    return data || []
  }

  // Calculs
  const presentsAujourdhui = presences.filter(p => p.present)
  const salaireJour = presentsAujourdhui.reduce((s, p) => s + (p.salaire_jour_calcule || 0), 0)
  const nonPayes = presentsAujourdhui.filter(p => !p.paye)

  const S = {
    page: { padding: 16, maxWidth: 640 } as React.CSSProperties,
    card: { background: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 10, border: '1px solid rgba(255,255,255,0.06)' } as React.CSSProperties,
    input: { background: '#0F172A', border: '1px solid #334155', borderRadius: 8, color: '#F8FAFC', padding: '9px 12px', width: '100%', fontSize: 13, boxSizing: 'border-box' } as React.CSSProperties,
    btn: (color = '#F97316') => ({ background: `linear-gradient(135deg,${color},${color}cc)`, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' } as React.CSSProperties),
    btnSm: { background: '#0F172A', color: '#94A3B8', border: '1px solid #334155', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer' } as React.CSSProperties,
    tag: (color: string) => ({ background: color + '22', color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, border: `1px solid ${color}44` } as React.CSSProperties),
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'presences', label: '📋 Présences' },
    { key: 'employes',  label: '👷 Employés' },
    { key: 'paie',      label: '💰 Paie' },
    { key: 'stats',     label: '📊 Stats' },
  ]

  return (
    <div>
      <TopBar title="Personnel & Paie" />
      <div style={S.page}>

        {msg && (
          <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 600, background: msg.startsWith('✅') || msg.startsWith('↩️') ? 'rgba(22,163,74,0.15)' : msg.startsWith('ℹ️') ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)', color: msg.startsWith('✅') || msg.startsWith('↩️') ? '#86EFAC' : msg.startsWith('ℹ️') ? '#93C5FD' : '#FCA5A5' }}>
            {msg}
          </div>
        )}

        {/* KPIs rapides */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Effectif', value: personnel.length, color: '#F97316' },
            { label: 'Présents', value: presentsAujourdhui.length, color: '#16A34A' },
            { label: 'À payer', value: nonPayes.length, color: '#F59E0B' },
          ].map(k => (
            <div key={k.label} style={{ flex: 1, background: '#1E293B', borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: `1px solid ${k.color}33` }}>
              <div style={{ color: k.color, fontSize: 22, fontWeight: 900 }}>{k.value}</div>
              <div style={{ color: '#64748B', fontSize: 10, marginTop: 2 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: '9px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: tab === t.key ? 'linear-gradient(135deg,#F97316,#EA580C)' : '#1E293B', color: tab === t.key ? '#fff' : '#94A3B8', whiteSpace: 'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══ TAB: PRÉSENCES ═══ */}
        {tab === 'presences' && (
          <>
            {/* Sélecteur de date */}
            <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#94A3B8', fontSize: 11, marginBottom: 4 }}>Date</div>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={S.input} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#94A3B8', fontSize: 11, marginBottom: 4 }}>Masse salariale</div>
                <div style={{ color: '#F8FAFC', fontWeight: 900, fontSize: 16 }}>{fmt(salaireJour)}</div>
              </div>
            </div>

            {/* Boutons action groupée */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={payerTous} style={{ ...S.btn('#16A34A'), flex: 1 }}>
                💳 Payer tous les présents ({nonPayes.length})
              </button>
              <button onClick={loadAll} style={{ ...S.btnSm, padding: '9px 14px', fontSize: 13 }}>↺</button>
            </div>

            {/* Liste présences */}
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#475569' }}>Chargement...</div>
            ) : personnel.length === 0 ? (
              <div style={{ ...S.card, textAlign: 'center', color: '#475569', padding: 32 }}>
                Aucun employé. Allez dans l'onglet Employés pour en ajouter.
              </div>
            ) : personnel.map(emp => {
              const pres = presences.find(p => p.employe_id === emp.id)
              const isPresent = pres?.present ?? false
              const isPaye = pres?.paye ?? false
              const heuresSup = pres?.heures_sup || 0
              const salCalc = pres?.salaire_jour_calcule || emp.salaire_journalier
              const isEditing = editPresId === pres?.id

              return (
                <div key={emp.id} style={{ ...S.card, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Toggle présence */}
                    <button onClick={() => togglePresence(emp.id)}
                      style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0, fontSize: 20, background: isPresent ? 'rgba(22,163,74,0.15)' : 'rgba(100,116,139,0.1)', transition: 'all .15s' }}>
                      {isPresent ? '✅' : '⬜'}
                    </button>

                    {/* Infos */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 14 }}>{emp.nom_complet}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                        <span style={S.tag(ROLE_COLORS[emp.role] || '#94A3B8')}>{ROLES[emp.role]}</span>
                        {isPresent && isPaye && <span style={S.tag('#16A34A')}>💳 Payé</span>}
                        {isPresent && !isPaye && <span style={S.tag('#F59E0B')}>⏳ Non payé</span>}
                        {heuresSup > 0 && <span style={S.tag('#8B5CF6')}>+{heuresSup}h sup</span>}
                      </div>
                    </div>

                    {/* Salaire */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ color: isPresent ? '#F8FAFC' : '#334155', fontWeight: 900, fontSize: 15 }}>
                        {fmt(isPresent ? salCalc : emp.salaire_journalier)}
                      </div>
                      {emp.telephone && <div style={{ color: '#475569', fontSize: 10, marginTop: 2 }}>{emp.telephone}</div>}
                    </div>
                  </div>

                  {/* Actions si présent */}
                  {isPresent && pres && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button onClick={() => togglePaye(pres.id, isPaye)}
                        style={{ ...S.btnSm, color: isPaye ? '#F87171' : '#4ADE80', border: `1px solid ${isPaye ? '#EF444444' : '#16A34A44'}` }}>
                        {isPaye ? '↩️ Annuler paiement' : '💳 Marquer payé'}
                      </button>
                      <button onClick={() => {
                        setEditPresId(isEditing ? null : pres.id)
                        setEditPresForm({ heures_sup: String(pres.heures_sup || 0), taux_heures_sup: String(pres.taux_heures_sup || 0), notes: pres.notes || '' })
                      }}
                        style={{ ...S.btnSm, color: '#93C5FD', border: '1px solid #3B82F644' }}>
                        ✏️ {isEditing ? 'Fermer' : 'Modifier'}
                      </button>
                      {pres.notes && !isEditing && (
                        <span style={{ color: '#64748B', fontSize: 11, alignSelf: 'center' }}>📝 {pres.notes}</span>
                      )}
                    </div>
                  )}

                  {/* Formulaire édition présence */}
                  {isPresent && pres && isEditing && (
                    <div style={{ marginTop: 10, padding: 12, background: '#0F172A', borderRadius: 8, border: '1px solid #334155' }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#94A3B8', fontSize: 11, marginBottom: 4 }}>Heures sup</div>
                          <input type="number" min="0" step="0.5" value={editPresForm.heures_sup}
                            onChange={e => setEditPresForm({ ...editPresForm, heures_sup: e.target.value })}
                            style={S.input} placeholder="0" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#94A3B8', fontSize: 11, marginBottom: 4 }}>Taux/heure (CFA)</div>
                          <input type="number" min="0" value={editPresForm.taux_heures_sup}
                            onChange={e => setEditPresForm({ ...editPresForm, taux_heures_sup: e.target.value })}
                            style={S.input} placeholder="0" />
                        </div>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ color: '#94A3B8', fontSize: 11, marginBottom: 4 }}>Notes</div>
                        <input value={editPresForm.notes}
                          onChange={e => setEditPresForm({ ...editPresForm, notes: e.target.value })}
                          style={S.input} placeholder="Observations..." />
                      </div>
                      {(parseFloat(editPresForm.heures_sup) > 0 && parseFloat(editPresForm.taux_heures_sup) > 0) && (
                        <div style={{ padding: '8px 10px', background: 'rgba(249,115,22,0.08)', borderRadius: 6, marginBottom: 8, fontSize: 12 }}>
                          <span style={{ color: '#94A3B8' }}>Salaire total : </span>
                          <span style={{ color: '#F97316', fontWeight: 900 }}>
                            {fmt((emp.salaire_journalier || 0) + (parseFloat(editPresForm.heures_sup) * parseFloat(editPresForm.taux_heures_sup)))}
                          </span>
                          <span style={{ color: '#64748B' }}> (base {fmt(emp.salaire_journalier)} + {fmt(parseFloat(editPresForm.heures_sup) * parseFloat(editPresForm.taux_heures_sup))} h.sup)</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => savePresence(pres.id)} style={{ ...S.btn(), flex: 1, padding: '8px' }}>
                          Enregistrer
                        </button>
                        <button onClick={() => setEditPresId(null)} style={S.btnSm}>Annuler</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}

        {/* ═══ TAB: EMPLOYÉS ═══ */}
        {tab === 'employes' && (
          <>
            <button onClick={() => { setShowEmpForm(v => !v); setEditEmpId(null); setEmpForm(EMPTY_EMP) }}
              style={{ ...S.btn(), width: '100%', marginBottom: 12 }}>
              {showEmpForm ? '✕ Annuler' : '+ Ajouter un employé'}
            </button>

            {showEmpForm && (
              <div style={{ ...S.card, marginBottom: 12 }}>
                <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
                  {editEmpId ? '✏️ Modifier l\'employé' : '➕ Nouvel employé'}
                </div>
                {[
                  { label: 'Nom complet *', key: 'nom_complet', type: 'text', placeholder: 'Prénom Nom' },
                  { label: 'Téléphone', key: 'telephone', type: 'tel', placeholder: '+225...' },
                  { label: 'Salaire journalier (CFA)', key: 'salaire_journalier', type: 'number', placeholder: '0' },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom: 10 }}>
                    <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>{f.label}</div>
                    <input type={f.type} value={(empForm as any)[f.key]}
                      onChange={e => setEmpForm({ ...empForm, [f.key]: e.target.value })}
                      style={S.input} placeholder={f.placeholder} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Rôle</div>
                    <select value={empForm.role} onChange={e => setEmpForm({ ...empForm, role: e.target.value })} style={S.input}>
                      {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Mode paiement</div>
                    <select value={empForm.mode_paiement} onChange={e => setEmpForm({ ...empForm, mode_paiement: e.target.value })} style={S.input}>
                      <option value="cash">Cash</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="virement">Virement</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={saveEmploye} disabled={savingEmp || !empForm.nom_complet}
                    style={{ ...S.btn(), flex: 1, opacity: !empForm.nom_complet ? 0.5 : 1 }}>
                    {savingEmp ? 'Enregistrement...' : editEmpId ? 'Modifier' : 'Ajouter'}
                  </button>
                  <button onClick={() => setShowEmpForm(false)} style={S.btnSm}>Annuler</button>
                </div>
              </div>
            )}

            {/* Liste employés */}
            {personnel.map((emp, i) => (
              <div key={emp.id} style={{ ...S.card, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: (ROLE_COLORS[emp.role] || '#94A3B8') + '22', border: `1px solid ${ROLE_COLORS[emp.role] || '#94A3B8'}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: ROLE_COLORS[emp.role] || '#94A3B8', fontSize: 16, flexShrink: 0 }}>
                  {emp.nom_complet?.charAt(0)?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 14 }}>{emp.nom_complet}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                    <span style={S.tag(ROLE_COLORS[emp.role] || '#94A3B8')}>{ROLES[emp.role]}</span>
                    <span style={{ color: '#64748B', fontSize: 11 }}>{emp.telephone || 'Pas de tél.'}</span>
                  </div>
                  <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>
                    {fmt(emp.salaire_journalier)}/j · {emp.mode_paiement?.replace('_', ' ')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => { setEmpForm({ nom_complet: emp.nom_complet, role: emp.role, salaire_journalier: String(emp.salaire_journalier), telephone: emp.telephone || '', mode_paiement: emp.mode_paiement || 'cash' }); setEditEmpId(emp.id); setShowEmpForm(true) }}
                    style={{ ...S.btnSm, color: '#93C5FD' }}>✏️</button>
                  <button onClick={() => deleteEmploye(emp.id, emp.nom_complet)}
                    style={{ ...S.btnSm, color: '#FCA5A5' }}>🗑️</button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ═══ TAB: PAIE ═══ */}
        {tab === 'paie' && <PaieTab personnel={personnel} S={S} flash={flash} fmt={fmt} />}

        {/* ═══ TAB: STATS ═══ */}
        {tab === 'stats' && <StatsTab personnel={personnel} S={S} fmt={fmt} />}

      </div>
    </div>
  )
}

// ── Composant Paie ──────────────────────────────────────────
function PaieTab({ personnel, S, flash, fmt }: any) {
  const [presAll, setPresAll] = useState<any[]>([])
  const [filterEmp, setFilterEmp] = useState('')
  const [filterPaye, setFilterPaye] = useState<'tous' | 'paye' | 'non_paye'>('tous')
  const [dateDebut, setDateDebut] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
  })
  const [dateFin, setDateFin] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadPaie() }, [dateDebut, dateFin])

  async function loadPaie() {
    setLoading(true)
    const { data } = await supabase.from('presences')
      .select('*, personnel(nom_complet, role, salaire_journalier, mode_paiement)')
      .eq('present', true)
      .gte('date', dateDebut)
      .lte('date', dateFin)
      .order('date', { ascending: false })
    setPresAll(data || [])
    setLoading(false)
  }

  async function togglePaieItem(id: string, current: boolean) {
    await supabase.from('presences').update({ paye: !current }).eq('id', id)
    flash(current ? '↩️ Annulé' : '✅ Payé')
    await loadPaie()
  }

  async function payerSelection(ids: string[]) {
    if (!ids.length) return
    if (!confirm(`Marquer ${ids.length} ligne(s) comme payées ?`)) return
    await supabase.from('presences').update({ paye: true }).in('id', ids)
    flash(`✅ ${ids.length} paiement(s) enregistrés`)
    await loadPaie()
  }

  const filtered = presAll
    .filter(p => !filterEmp || p.employe_id === filterEmp)
    .filter(p => filterPaye === 'tous' ? true : filterPaye === 'paye' ? p.paye : !p.paye)

  // Regrouper par employé pour les totaux
  const byEmp: Record<string, { nom: string; role: string; mode: string; total: number; paye: number; ids: string[] }> = {}
  filtered.forEach(p => {
    const id = p.employe_id
    const nom = p.personnel?.nom_complet || '?'
    if (!byEmp[id]) byEmp[id] = { nom, role: p.personnel?.role, mode: p.personnel?.mode_paiement, total: 0, paye: 0, ids: [] }
    byEmp[id].total += p.salaire_jour_calcule || 0
    if (p.paye) byEmp[id].paye += p.salaire_jour_calcule || 0
    else byEmp[id].ids.push(p.id)
  })

  const totalGeneral = Object.values(byEmp).reduce((s, e) => s + e.total, 0)
  const totalPaye = Object.values(byEmp).reduce((s, e) => s + e.paye, 0)
  const totalRestant = totalGeneral - totalPaye
  const idsNonPayes = filtered.filter(p => !p.paye).map(p => p.id)

  return (
    <>
      {/* Filtres */}
      <div style={{ ...S.card, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#94A3B8', fontSize: 11, marginBottom: 4 }}>Du</div>
            <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} style={S.input} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#94A3B8', fontSize: 11, marginBottom: 4 }}>Au</div>
            <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} style={S.input} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 2 }}>
            <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)} style={S.input}>
              <option value="">Tous les employés</option>
              {personnel.map((e: any) => <option key={e.id} value={e.id}>{e.nom_complet}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <select value={filterPaye} onChange={e => setFilterPaye(e.target.value as any)} style={S.input}>
              <option value="tous">Tous</option>
              <option value="paye">Payés</option>
              <option value="non_paye">Non payés</option>
            </select>
          </div>
        </div>
      </div>

      {/* Totaux période */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[
          { label: 'Total période', val: fmt(totalGeneral), color: '#F8FAFC' },
          { label: 'Payé', val: fmt(totalPaye), color: '#4ADE80' },
          { label: 'Reste', val: fmt(totalRestant), color: totalRestant > 0 ? '#F87171' : '#4ADE80' },
        ].map(k => (
          <div key={k.label} style={{ flex: 1, background: '#1E293B', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ color: k.color, fontSize: 13, fontWeight: 900 }}>{k.val}</div>
            <div style={{ color: '#64748B', fontSize: 10, marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Payer tout */}
      {idsNonPayes.length > 0 && (
        <button onClick={() => payerSelection(idsNonPayes)}
          style={{ ...S.btn('#16A34A'), width: '100%', marginBottom: 12 }}>
          💳 Tout payer ({idsNonPayes.length} lignes · {fmt(totalRestant)})
        </button>
      )}

      {/* Résumé par employé */}
      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#475569' }}>Chargement...</div>
      ) : Object.keys(byEmp).length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', color: '#475569', padding: 24 }}>Aucune donnée sur cette période.</div>
      ) : (
        <>
          <div style={{ color: '#94A3B8', fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Récapitulatif par employé</div>
          {Object.entries(byEmp).map(([empId, e]) => {
            const restant = e.total - e.paye
            const pctP = e.total > 0 ? Math.round((e.paye / e.total) * 100) : 0
            return (
              <div key={empId} style={{ ...S.card, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 14 }}>{e.nom}</div>
                    <div style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>{e.mode?.replace('_', ' ')} · {ROLES[e.role] || e.role}</div>
                  </div>
                  {e.ids.length > 0 && (
                    <button onClick={() => payerSelection(e.ids)}
                      style={{ ...S.btn('#16A34A'), padding: '6px 12px', fontSize: 12 }}>
                      💳 Payer {fmt(restant)}
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1, textAlign: 'center', padding: 6, background: '#0F172A', borderRadius: 6 }}>
                    <div style={{ color: '#64748B', fontSize: 10 }}>Total</div>
                    <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 13 }}>{fmt(e.total)}</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: 6, background: '#0F172A', borderRadius: 6 }}>
                    <div style={{ color: '#64748B', fontSize: 10 }}>Payé</div>
                    <div style={{ color: '#4ADE80', fontWeight: 700, fontSize: 13 }}>{fmt(e.paye)}</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: 6, background: '#0F172A', borderRadius: 6 }}>
                    <div style={{ color: '#64748B', fontSize: 10 }}>Reste</div>
                    <div style={{ color: restant > 0 ? '#F87171' : '#4ADE80', fontWeight: 700, fontSize: 13 }}>{fmt(restant)}</div>
                  </div>
                </div>
                <div style={{ height: 5, borderRadius: 99, background: '#0F172A', overflow: 'hidden' }}>
                  <div style={{ height: 5, borderRadius: 99, width: pctP + '%', background: pctP === 100 ? '#16A34A' : '#F97316' }} />
                </div>
                <div style={{ color: '#475569', fontSize: 10, textAlign: 'right', marginTop: 2 }}>{pctP}% payé</div>
              </div>
            )
          })}

          {/* Détail ligne par ligne */}
          <div style={{ color: '#94A3B8', fontSize: 11, fontWeight: 600, marginBottom: 8, marginTop: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Détail jour par jour</div>
          <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
            {filtered.map((p, i) => (
              <div key={p.id} style={{ padding: '10px 14px', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#F8FAFC', fontSize: 13, fontWeight: 600 }}>{p.personnel?.nom_complet}</div>
                  <div style={{ color: '#64748B', fontSize: 11 }}>
                    {new Date(p.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {p.heures_sup > 0 && <span style={{ color: '#8B5CF6', marginLeft: 6 }}>+{p.heures_sup}h sup</span>}
                    {p.notes && <span style={{ color: '#475569', marginLeft: 6 }}>· {p.notes}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 13 }}>{fmt(p.salaire_jour_calcule || 0)}</div>
                  <button onClick={() => togglePaieItem(p.id, p.paye)}
                    style={{ background: p.paye ? 'rgba(22,163,74,0.15)' : 'rgba(245,158,11,0.15)', border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: p.paye ? '#4ADE80' : '#FCD34D', marginTop: 3 }}>
                    {p.paye ? '✅ Payé' : '⏳ En attente'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

// ── Composant Stats ────────────────────────────────────────
function StatsTab({ personnel, S, fmt }: any) {
  const [stats, setStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('presences')
        .select('employe_id, present, paye, salaire_jour_calcule, heures_sup')
      const grouped: Record<string, any> = {}
      personnel.forEach((e: any) => {
        grouped[e.id] = { ...e, joursPresents: 0, joursAbsents: 0, totalBrut: 0, totalPaye: 0, totalSup: 0 }
      })
      ;(data || []).forEach((p: any) => {
        if (!grouped[p.employe_id]) return
        if (p.present) {
          grouped[p.employe_id].joursPresents++
          grouped[p.employe_id].totalBrut += p.salaire_jour_calcule || 0
          if (p.paye) grouped[p.employe_id].totalPaye += p.salaire_jour_calcule || 0
          if (p.heures_sup > 0) grouped[p.employe_id].totalSup++
        } else {
          grouped[p.employe_id].joursAbsents++
        }
      })
      setStats(Object.values(grouped).sort((a, b) => b.totalBrut - a.totalBrut))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: '#475569' }}>Calcul des statistiques...</div>

  const totalMasse = stats.reduce((s, e) => s + e.totalBrut, 0)
  const totalPaye = stats.reduce((s, e) => s + e.totalPaye, 0)

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, background: '#1E293B', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
          <div style={{ color: '#F8FAFC', fontWeight: 900, fontSize: 16 }}>{fmt(totalMasse)}</div>
          <div style={{ color: '#64748B', fontSize: 10, marginTop: 2 }}>Masse salariale totale</div>
        </div>
        <div style={{ flex: 1, background: '#1E293B', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
          <div style={{ color: '#4ADE80', fontWeight: 900, fontSize: 16 }}>{fmt(totalPaye)}</div>
          <div style={{ color: '#64748B', fontSize: 10, marginTop: 2 }}>Total payé</div>
        </div>
        <div style={{ flex: 1, background: '#1E293B', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
          <div style={{ color: '#F87171', fontWeight: 900, fontSize: 16 }}>{fmt(totalMasse - totalPaye)}</div>
          <div style={{ color: '#64748B', fontSize: 10, marginTop: 2 }}>Reste à payer</div>
        </div>
      </div>

      {stats.map((e, i) => {
        const tauxPresence = (e.joursPresents + e.joursAbsents) > 0
          ? Math.round((e.joursPresents / (e.joursPresents + e.joursAbsents)) * 100) : 0
        return (
          <div key={e.id} style={{ ...S.card, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 14 }}>{e.nom_complet}</div>
                <div style={{ color: '#64748B', fontSize: 11 }}>{ROLES[e.role] || e.role}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#F8FAFC', fontWeight: 900, fontSize: 14 }}>{fmt(e.totalBrut)}</div>
                <div style={{ color: '#4ADE80', fontSize: 11 }}>Payé : {fmt(e.totalPaye)}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {[
                { label: `${e.joursPresents}j présent(s)`, color: '#16A34A' },
                { label: `${e.joursAbsents}j absent(s)`, color: '#EF4444' },
                { label: `${e.totalSup}j heure sup`, color: '#8B5CF6' },
              ].map(k => (
                <span key={k.label} style={{ background: k.color + '15', color: k.color, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>{k.label}</span>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 4, borderRadius: 99, background: '#0F172A', overflow: 'hidden' }}>
                <div style={{ height: 4, borderRadius: 99, width: tauxPresence + '%', background: tauxPresence > 80 ? '#16A34A' : tauxPresence > 50 ? '#F59E0B' : '#EF4444' }} />
              </div>
              <span style={{ color: '#64748B', fontSize: 10, flexShrink: 0 }}>{tauxPresence}% présence</span>
            </div>
          </div>
        )
      })}
    </>
  )
}
