'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import { Plus, X, Save, Pencil, Trash2, Music, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react'

function formatCFA(n: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' CFA' }

const CATEGORIES: Record<string, { label: string; color: string }> = {
  cachet_artiste:      { label: '🎤 Cachets artistes',     color: '#F97316' },
  communication:       { label: '📣 Communication',         color: '#F59E0B' },
  logistique:          { label: '🚛 Logistique',            color: '#16A34A' },
  location_materiel:   { label: '🎛️ Location matériel',    color: '#3B82F6' },
  transport:           { label: '🚗 Transport',             color: '#8B5CF6' },
  securite:            { label: '🛡️ Sécurité',             color: '#EC4899' },
  electricite:         { label: '⚡ Électricité',           color: '#14B8A6' },
  restauration_equipe: { label: '🍱 Restauration équipe',  color: '#EF4444' },
  divers:              { label: '📦 Divers',                color: '#94A3B8' },
}

const STATUTS: Record<string, { label: string; color: string; icon: any }> = {
  en_negociation: { label: 'En négociation', color: '#F59E0B', icon: Clock },
  confirme:       { label: 'Confirmé',        color: '#3B82F6', icon: CheckCircle },
  paye:           { label: 'Payé',            color: '#16A34A', icon: CheckCircle },
  annule:         { label: 'Annulé',          color: '#EF4444', icon: XCircle },
}

const EMPTY_DEP = { date: new Date().toISOString().split('T')[0], categorie: 'divers', libelle: '', montant: '', beneficiaire: '' }
const EMPTY_ART = { nom_artiste: '', manager_contact: '', date_prestation: '', cachet: '', cachet_paye: '', statut: 'en_negociation', notes: '' }

export default function DepensesPage() {
  const [tab, setTab] = useState<'depenses' | 'artistes'>('depenses')

  // Dépenses
  const [depenses, setDepenses] = useState<any[]>([])
  const [showDepForm, setShowDepForm] = useState(false)
  const [depForm, setDepForm] = useState(EMPTY_DEP)
  const [editDepId, setEditDepId] = useState<string | null>(null)
  const [savingDep, setSavingDep] = useState(false)
  const [filterCateg, setFilterCateg] = useState('')

  // Artistes
  const [artistes, setArtistes] = useState<any[]>([])
  const [showArtForm, setShowArtForm] = useState(false)
  const [artForm, setArtForm] = useState(EMPTY_ART)
  const [editArtId, setEditArtId] = useState<string | null>(null)
  const [savingArt, setSavingArt] = useState(false)

  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [dRes, aRes] = await Promise.all([
      supabase.from('depenses').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('artistes').select('*').order('date_prestation', { ascending: true })
    ])
    setDepenses(dRes.data || [])
    setArtistes(aRes.data || [])
    setLoading(false)
  }

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  // ── DÉPENSES ──
  async function saveDep() {
    if (!depForm.libelle || !depForm.montant) return
    setSavingDep(true)
    const payload = { ...depForm, montant: parseFloat(depForm.montant) || 0 }
    const { error } = editDepId
      ? await supabase.from('depenses').update(payload).eq('id', editDepId)
      : await supabase.from('depenses').insert(payload)
    setSavingDep(false)
    if (error) { flash('❌ ' + error.message); return }
    flash(editDepId ? '✅ Dépense modifiée' : '✅ Dépense enregistrée')
    setShowDepForm(false); setEditDepId(null); setDepForm(EMPTY_DEP); loadData()
  }

  async function deleteDep(id: string) {
    if (!confirm('Supprimer cette dépense ?')) return
    await supabase.from('depenses').delete().eq('id', id)
    flash('✅ Supprimée'); loadData()
  }

  function startEditDep(d: any) {
    setDepForm({ date: d.date, categorie: d.categorie, libelle: d.libelle, montant: String(d.montant), beneficiaire: d.beneficiaire || '' })
    setEditDepId(d.id); setShowDepForm(true)
  }

  // ── ARTISTES ──
  async function saveArt() {
    if (!artForm.nom_artiste || !artForm.cachet) return
    setSavingArt(true)
    const payload = {
      nom_artiste: artForm.nom_artiste,
      manager_contact: artForm.manager_contact || null,
      date_prestation: artForm.date_prestation || null,
      cachet: parseFloat(artForm.cachet) || 0,
      cachet_paye: parseFloat(artForm.cachet_paye) || 0,
      statut: artForm.statut,
      notes: artForm.notes || null,
    }
    const { error } = editArtId
      ? await supabase.from('artistes').update(payload).eq('id', editArtId)
      : await supabase.from('artistes').insert(payload)
    setSavingArt(false)
    if (error) { flash('❌ ' + error.message); return }
    flash(editArtId ? '✅ Artiste modifié' : '✅ Artiste enregistré')
    setShowArtForm(false); setEditArtId(null); setArtForm(EMPTY_ART); loadData()
  }

  async function deleteArt(id: string, nom: string) {
    if (!confirm(`Supprimer ${nom} ?`)) return
    await supabase.from('artistes').delete().eq('id', id)
    flash('✅ Supprimé'); loadData()
  }

  function startEditArt(a: any) {
    setArtForm({
      nom_artiste: a.nom_artiste, manager_contact: a.manager_contact || '',
      date_prestation: a.date_prestation || '', cachet: String(a.cachet),
      cachet_paye: String(a.cachet_paye || 0), statut: a.statut, notes: a.notes || ''
    })
    setEditArtId(a.id); setShowArtForm(true)
  }

  // Stats
  const today = new Date().toISOString().split('T')[0]
  const totalDepJour = depenses.filter(d => d.date === today).reduce((s, d) => s + d.montant, 0)
  const totalDepGlobal = depenses.reduce((s, d) => s + d.montant, 0)
  const totalCachets = artistes.reduce((s, a) => s + a.cachet, 0)
  const totalCachetsPayes = artistes.reduce((s, a) => s + (a.cachet_paye || 0), 0)
  const totalCachetsRestants = totalCachets - totalCachetsPayes
  const filteredDep = filterCateg ? depenses.filter(d => d.categorie === filterCateg) : depenses

  const byCateg = Object.entries(CATEGORIES).map(([key, { label, color }]) => ({
    key, label, color,
    value: depenses.filter(d => d.categorie === key).reduce((s, d) => s + d.montant, 0)
  })).filter(c => c.value > 0).sort((a, b) => b.value - a.value)
  const maxCateg = byCateg.length > 0 ? byCateg[0].value : 1

  const S = {
    card: { background: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 10, border: '1px solid rgba(255,255,255,0.06)' } as React.CSSProperties,
    label: { color: '#94A3B8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 },
    val: { color: '#F8FAFC', fontSize: 20, fontWeight: 900 },
    sectionTitle: { color: '#F8FAFC', fontWeight: 700, fontSize: 14, marginBottom: 12 },
    input: { background: '#0F172A', border: '1px solid #334155', borderRadius: 8, color: '#F8FAFC', padding: '10px 12px', width: '100%', fontSize: 14, boxSizing: 'border-box' as const },
    btn: { background: 'linear-gradient(135deg,#F97316,#EA580C)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
    btnSm: { background: '#1E293B', color: '#94A3B8', border: '1px solid #334155', borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  }

  return (
    <div>
      <TopBar title="Dépenses & Artistes" />
      <div style={{ padding: 16, maxWidth: 600 }}>

        {msg && (
          <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 600, background: msg.startsWith('✅') ? 'rgba(22,163,74,0.15)' : 'rgba(239,68,68,0.15)', color: msg.startsWith('✅') ? '#86EFAC' : '#FCA5A5', border: `1px solid ${msg.startsWith('✅') ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
            {msg}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { key: 'depenses', label: '💸 Dépenses' },
            { key: 'artistes', label: '🎤 Artistes & Cachets' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              style={{ padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: tab === t.key ? 'linear-gradient(135deg,#F97316,#EA580C)' : '#1E293B', color: tab === t.key ? '#fff' : '#94A3B8', flex: 1 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══════ ONGLET DÉPENSES ═══════ */}
        {tab === 'depenses' && (
          <>
            {/* KPIs */}
            <div style={S.card}>
              <div style={S.label}>Dépenses du jour</div>
              <div style={S.val}>{formatCFA(totalDepJour)}</div>
            </div>
            <div style={{ ...S.card, border: '1px solid rgba(239,68,68,0.3)' }}>
              <div style={S.label}>Total dépenses événement</div>
              <div style={{ ...S.val, color: '#F87171' }}>{formatCFA(totalDepGlobal)}</div>
            </div>

            {/* Répartition */}
            {byCateg.length > 0 && (
              <div style={{ ...S.card, marginBottom: 14 }}>
                <div style={S.sectionTitle}>Répartition par catégorie</div>
                {byCateg.map(c => {
                  const pct = Math.round((c.value / maxCateg) * 100)
                  return (
                    <div key={c.key} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <button onClick={() => setFilterCateg(filterCateg === c.key ? '' : c.key)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, display: 'inline-block', flexShrink: 0 }} />
                          <span style={{ color: '#CBD5E1', fontSize: 12 }}>{c.label}</span>
                          {filterCateg === c.key && <span style={{ color: '#F97316', fontSize: 11 }}>◂</span>}
                        </button>
                        <span style={{ color: '#F8FAFC', fontSize: 12, fontWeight: 700 }}>{formatCFA(c.value)}</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 99, background: '#0F172A', overflow: 'hidden' }}>
                        <div style={{ height: 5, borderRadius: 99, width: pct + '%', background: c.color }} />
                      </div>
                    </div>
                  )
                })}
                {filterCateg && (
                  <button onClick={() => setFilterCateg('')}
                    style={{ background: 'none', border: 'none', color: '#F97316', fontSize: 12, cursor: 'pointer', marginTop: 4 }}>
                    ✕ Effacer le filtre
                  </button>
                )}
              </div>
            )}

            {/* Bouton ajouter */}
            <button onClick={() => { setShowDepForm(v => !v); setEditDepId(null); setDepForm(EMPTY_DEP) }}
              style={{ ...S.btn, width: '100%', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {showDepForm ? '✕ Annuler' : '+ Nouvelle dépense'}
            </button>

            {/* Formulaire dépense */}
            {showDepForm && (
              <div style={{ ...S.card, marginBottom: 14 }}>
                <div style={S.sectionTitle}>{editDepId ? '✏️ Modifier la dépense' : '➕ Nouvelle dépense'}</div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Date</div>
                  <input type="date" value={depForm.date} onChange={e => setDepForm({ ...depForm, date: e.target.value })} style={S.input} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Catégorie</div>
                  <select value={depForm.categorie} onChange={e => setDepForm({ ...depForm, categorie: e.target.value })} style={S.input}>
                    {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Libellé *</div>
                  <input value={depForm.libelle} onChange={e => setDepForm({ ...depForm, libelle: e.target.value })} style={S.input} placeholder="Description..." />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Montant (CFA) *</div>
                  <input type="number" value={depForm.montant} onChange={e => setDepForm({ ...depForm, montant: e.target.value })} style={S.input} placeholder="0" />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Bénéficiaire</div>
                  <input value={depForm.beneficiaire} onChange={e => setDepForm({ ...depForm, beneficiaire: e.target.value })} style={S.input} placeholder="Nom ou société..." />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveDep} disabled={savingDep || !depForm.libelle || !depForm.montant}
                    style={{ ...S.btn, flex: 1, opacity: (savingDep || !depForm.libelle || !depForm.montant) ? 0.5 : 1 }}>
                    {savingDep ? 'Enregistrement...' : editDepId ? 'Modifier' : 'Enregistrer'}
                  </button>
                  <button onClick={() => setShowDepForm(false)} style={S.btnSm}>Annuler</button>
                </div>
              </div>
            )}

            {/* Liste dépenses */}
            <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(249,115,22,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 13 }}>
                  {filterCateg ? CATEGORIES[filterCateg]?.label : 'Toutes les dépenses'} ({filteredDep.length})
                </span>
                <button onClick={loadData} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 18 }}>↺</button>
              </div>
              {loading ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#475569' }}>Chargement...</div>
              ) : filteredDep.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#475569' }}>Aucune dépense.</div>
              ) : filteredDep.map((d, i) => (
                <div key={d.id} style={{ padding: '12px 16px', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#F8FAFC', fontSize: 13, fontWeight: 600 }}>{d.libelle}</div>
                    <div style={{ color: CATEGORIES[d.categorie]?.color || '#94A3B8', fontSize: 11, marginTop: 2 }}>{CATEGORIES[d.categorie]?.label}</div>
                    <div style={{ color: '#475569', fontSize: 11, marginTop: 1 }}>{new Date(d.date).toLocaleDateString('fr-FR')}{d.beneficiaire ? ' · ' + d.beneficiaire : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color: '#F87171', fontWeight: 700, fontSize: 14 }}>{formatCFA(d.montant)}</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, justifyContent: 'flex-end' }}>
                      <button onClick={() => startEditDep(d)} style={{ background: 'rgba(59,130,246,0.15)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#93C5FD', fontSize: 12 }}>✏️</button>
                      <button onClick={() => deleteDep(d.id)} style={{ background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#FCA5A5', fontSize: 12 }}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ═══════ ONGLET ARTISTES ═══════ */}
        {tab === 'artistes' && (
          <>
            {/* KPIs artistes */}
            <div style={S.card}>
              <div style={S.label}>Total cachets contractuels</div>
              <div style={S.val}>{formatCFA(totalCachets)}</div>
            </div>
            <div style={{ ...S.card, border: '1px solid rgba(22,163,74,0.3)' }}>
              <div style={S.label}>Déjà payé</div>
              <div style={{ ...S.val, color: '#4ADE80' }}>{formatCFA(totalCachetsPayes)}</div>
            </div>
            <div style={{ ...S.card, border: `1px solid ${totalCachetsRestants > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(22,163,74,0.3)'}`, marginBottom: 14 }}>
              <div style={S.label}>Reste à payer</div>
              <div style={{ ...S.val, color: totalCachetsRestants > 0 ? '#F87171' : '#4ADE80' }}>{formatCFA(totalCachetsRestants)}</div>
            </div>

            {/* Bouton ajouter */}
            <button onClick={() => { setShowArtForm(v => !v); setEditArtId(null); setArtForm(EMPTY_ART) }}
              style={{ ...S.btn, width: '100%', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {showArtForm ? '✕ Annuler' : '+ Nouvel artiste'}
            </button>

            {/* Formulaire artiste */}
            {showArtForm && (
              <div style={{ ...S.card, marginBottom: 14 }}>
                <div style={S.sectionTitle}>{editArtId ? '✏️ Modifier l\'artiste' : '➕ Nouvel artiste'}</div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Nom de l'artiste *</div>
                  <input value={artForm.nom_artiste} onChange={e => setArtForm({ ...artForm, nom_artiste: e.target.value })} style={S.input} placeholder="Nom artiste / groupe" />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Contact manager</div>
                  <input value={artForm.manager_contact} onChange={e => setArtForm({ ...artForm, manager_contact: e.target.value })} style={S.input} placeholder="+225..." />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Date de prestation</div>
                  <input type="date" value={artForm.date_prestation} onChange={e => setArtForm({ ...artForm, date_prestation: e.target.value })} style={S.input} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Statut</div>
                  <select value={artForm.statut} onChange={e => setArtForm({ ...artForm, statut: e.target.value })} style={S.input}>
                    {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Cachet total (CFA) *</div>
                  <input type="number" value={artForm.cachet} onChange={e => setArtForm({ ...artForm, cachet: e.target.value })} style={S.input} placeholder="0" />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Avance déjà reçue (CFA)</div>
                  <input type="number" value={artForm.cachet_paye} onChange={e => setArtForm({ ...artForm, cachet_paye: e.target.value })} style={S.input} placeholder="0" />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Notes</div>
                  <textarea value={artForm.notes} onChange={e => setArtForm({ ...artForm, notes: e.target.value })} style={{ ...S.input, resize: 'vertical', minHeight: 64 }} placeholder="Conditions, remarques..." />
                </div>

                {/* Récap cachet */}
                {artForm.cachet && (
                  <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 8, padding: 12, marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#94A3B8', fontSize: 12 }}>Cachet total</span>
                      <span style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 13 }}>{formatCFA(parseFloat(artForm.cachet) || 0)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#94A3B8', fontSize: 12 }}>Avance reçue</span>
                      <span style={{ color: '#4ADE80', fontWeight: 700, fontSize: 13 }}>{formatCFA(parseFloat(artForm.cachet_paye) || 0)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6, marginTop: 4 }}>
                      <span style={{ color: '#94A3B8', fontSize: 12 }}>Reste à payer</span>
                      <span style={{ color: '#F87171', fontWeight: 900, fontSize: 15 }}>{formatCFA((parseFloat(artForm.cachet) || 0) - (parseFloat(artForm.cachet_paye) || 0))}</span>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveArt} disabled={savingArt || !artForm.nom_artiste || !artForm.cachet}
                    style={{ ...S.btn, flex: 1, opacity: (savingArt || !artForm.nom_artiste || !artForm.cachet) ? 0.5 : 1 }}>
                    {savingArt ? 'Enregistrement...' : editArtId ? 'Modifier' : 'Enregistrer'}
                  </button>
                  <button onClick={() => setShowArtForm(false)} style={S.btnSm}>Annuler</button>
                </div>
              </div>
            )}

            {/* Liste artistes */}
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#475569' }}>Chargement...</div>
            ) : artistes.length === 0 ? (
              <div style={{ ...S.card, textAlign: 'center', color: '#475569', padding: 32 }}>
                Aucun artiste enregistré.
              </div>
            ) : artistes.map(a => {
              const statut = STATUTS[a.statut] || STATUTS.en_negociation
              const restant = a.cachet - (a.cachet_paye || 0)
              const pctPaye = a.cachet > 0 ? Math.min(100, Math.round(((a.cachet_paye || 0) / a.cachet) * 100)) : 0
              return (
                <div key={a.id} style={{ ...S.card, marginBottom: 10 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#F8FAFC', fontWeight: 900, fontSize: 16 }}>{a.nom_artiste}</div>
                      {a.manager_contact && <div style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>📞 {a.manager_contact}</div>}
                      {a.date_prestation && <div style={{ color: '#64748B', fontSize: 12, marginTop: 1 }}>📅 {new Date(a.date_prestation).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <span style={{ background: statut.color + '25', color: statut.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: `1px solid ${statut.color}40` }}>
                        {statut.label}
                      </span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => startEditArt(a)} style={{ background: 'rgba(59,130,246,0.15)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#93C5FD', fontSize: 12 }}>✏️</button>
                        <button onClick={() => deleteArt(a.id, a.nom_artiste)} style={{ background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#FCA5A5', fontSize: 12 }}>🗑️</button>
                      </div>
                    </div>
                  </div>

                  {/* Cachet */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ color: '#64748B', fontSize: 10, marginBottom: 2 }}>CACHET TOTAL</div>
                      <div style={{ color: '#F8FAFC', fontWeight: 900, fontSize: 15 }}>{formatCFA(a.cachet)}</div>
                    </div>
                    <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ color: '#64748B', fontSize: 10, marginBottom: 2 }}>REÇU</div>
                      <div style={{ color: '#4ADE80', fontWeight: 900, fontSize: 15 }}>{formatCFA(a.cachet_paye || 0)}</div>
                    </div>
                    <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ color: '#64748B', fontSize: 10, marginBottom: 2 }}>RESTE</div>
                      <div style={{ color: restant > 0 ? '#F87171' : '#4ADE80', fontWeight: 900, fontSize: 15 }}>{formatCFA(restant)}</div>
                    </div>
                  </div>

                  {/* Barre progression paiement */}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ height: 6, borderRadius: 99, background: '#0F172A', overflow: 'hidden' }}>
                      <div style={{ height: 6, borderRadius: 99, width: pctPaye + '%', background: pctPaye === 100 ? '#16A34A' : '#F97316', transition: 'width .5s' }} />
                    </div>
                    <div style={{ color: '#475569', fontSize: 11, textAlign: 'right', marginTop: 3 }}>{pctPaye}% payé</div>
                  </div>

                  {a.notes && (
                    <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, color: '#64748B', fontSize: 12 }}>
                      📝 {a.notes}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
