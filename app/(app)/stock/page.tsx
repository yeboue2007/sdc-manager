'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import { Plus, X, Save, Pencil, Trash2, ArrowDown, ArrowUp, SlidersHorizontal, Package } from 'lucide-react'

function formatCFA(n: number) { return new Intl.NumberFormat('fr-FR').format(n) + ' CFA' }

const EMPTY_PRODUIT = { nom: '', fournisseur: 'SOLIBRA', unite: 'casier', prix_unitaire: '', bouteilles_par_casier: '12' }
const EMPTY_MVT = { produit_id: '', quantite: '', date: new Date().toISOString().split('T')[0], notes: '', fournisseur: '', bon_livraison: '', point_de_vente_id: '', nb_casiers: '', nb_bouteilles: '' }

type Tab = 'stock' | 'entrees' | 'sorties' | 'ajustements' | 'produits'

const S = {
  page: { padding: 16, maxWidth: 720 } as React.CSSProperties,
  card: { background: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 14, border: '1px solid rgba(255,255,255,0.06)' } as React.CSSProperties,
  input: { background: '#0F172A', border: '1px solid #334155', borderRadius: 8, color: '#F8FAFC', padding: '10px 12px', width: '100%', fontSize: 14, boxSizing: 'border-box' } as React.CSSProperties,
  label: { color: '#94A3B8', fontSize: 12, marginBottom: 4, display: 'block' } as React.CSSProperties,
  field: { marginBottom: 12 } as React.CSSProperties,
  btn: (bg: string) => ({ background: bg, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 } as React.CSSProperties),
  btnGhost: { background: '#1E293B', color: '#94A3B8', border: '1px solid #334155', borderRadius: 8, padding: '10px 16px', fontSize: 14, cursor: 'pointer' } as React.CSSProperties,
  btnIcon: (color: string) => ({ background: color + '22', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color } as React.CSSProperties),
  tab: (active: boolean, color: string) => ({ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', color: active ? '#fff' : '#94A3B8', background: active ? color + 'cc' : '#1E293B' } as React.CSSProperties),
}

export default function StockPage() {
  const [produits, setProduits] = useState<any[]>([])
  const [stockActuel, setStockActuel] = useState<any[]>([])
  const [mouvements, setMouvements] = useState<any[]>([])
  const [points, setPoints] = useState<any[]>([])
  const [tab, setTab] = useState<Tab>('stock')
  const [loading, setLoading] = useState(true)
  const [showProdForm, setShowProdForm] = useState(false)
  const [showMvtForm, setShowMvtForm] = useState(false)
  const [prodForm, setProdForm] = useState(EMPTY_PRODUIT)
  const [mvtForm, setMvtForm] = useState(EMPTY_MVT)
  const [editProdId, setEditProdId] = useState<string | null>(null)
  const [editMvtId, setEditMvtId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [stockRes, produitsRes, mvtRes, pointsRes] = await Promise.all([
      supabase.from('stock_actuel').select('*'),
      supabase.from('produits_boissons').select('*').eq('actif', true).order('nom'),
      supabase.from('stock_boissons').select('*, produits_boissons(nom), points_de_vente(nom)').order('date', { ascending: false }).order('created_at', { ascending: false }).limit(100),
      supabase.from('points_de_vente').select('*').eq('actif', true)
    ])
    setStockActuel(stockRes.data || [])
    setProduits(produitsRes.data || [])
    setMouvements(mvtRes.data || [])
    setPoints(pointsRes.data || [])
    setLoading(false)
  }

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  async function saveProduit() {
    if (!prodForm.nom) return
    setSaving(true)
    const payload = { ...prodForm, prix_unitaire: parseFloat(prodForm.prix_unitaire) || 0, bouteilles_par_casier: parseInt(prodForm.bouteilles_par_casier) || 12, actif: true }
    const { error } = editProdId
      ? await supabase.from('produits_boissons').update(payload).eq('id', editProdId)
      : await supabase.from('produits_boissons').insert(payload)
    setSaving(false)
    if (error) { flash('❌ ' + error.message); return }
    flash(editProdId ? '✅ Produit modifié' : '✅ Produit ajouté')
    setShowProdForm(false); setEditProdId(null); setProdForm(EMPTY_PRODUIT); loadData()
  }

  async function deleteProduit(id: string, nom: string) {
    if (!confirm(`Supprimer "${nom}" ?`)) return
    const { error } = await supabase.from('produits_boissons').update({ actif: false }).eq('id', id)
    if (error) flash('❌ Erreur')
    else { flash('✅ Produit supprimé'); loadData() }
  }

  async function saveMvt(type: 'entree' | 'sortie' | 'ajustement') {
    if (!mvtForm.produit_id) return

    let quantiteFinale: number

    if (type === 'sortie') {
      const produit = produits.find(p => p.id === mvtForm.produit_id)
      const bpc = produit?.bouteilles_par_casier || 1
      const casiers = parseFloat(mvtForm.nb_casiers) || 0
      const bouteilles = parseFloat(mvtForm.nb_bouteilles) || 0
      if (casiers === 0 && bouteilles === 0) return
      const totalBouteilles = casiers * bpc + bouteilles
      quantiteFinale = bpc > 1 ? totalBouteilles / bpc : totalBouteilles
    } else {
      if (!mvtForm.quantite) return
      quantiteFinale = parseFloat(mvtForm.quantite)
    }

    setSaving(true)
    const payload = { produit_id: mvtForm.produit_id, type_mouvement: type, quantite: quantiteFinale, date: mvtForm.date, notes: mvtForm.notes, fournisseur: mvtForm.fournisseur, bon_livraison: mvtForm.bon_livraison, point_de_vente_id: mvtForm.point_de_vente_id || null }
    const { error } = editMvtId
      ? await supabase.from('stock_boissons').update(payload).eq('id', editMvtId)
      : await supabase.from('stock_boissons').insert(payload)
    setSaving(false)
    if (error) { flash('❌ ' + error.message); return }
    flash(editMvtId ? '✅ Mouvement modifié' : '✅ Mouvement enregistré')
    setShowMvtForm(false); setEditMvtId(null); setMvtForm(EMPTY_MVT); loadData()
  }

  async function deleteMvt(id: string) {
    if (!confirm('Supprimer ce mouvement ?')) return
    const { error } = await supabase.from('stock_boissons').delete().eq('id', id)
    if (error) flash('❌ Erreur')
    else { flash('✅ Supprimé'); loadData() }
  }

  const filteredMvt = (type: string) => mouvements.filter(m => m.type_mouvement === type)

  const TABS: { key: Tab, label: string, icon: any, color: string }[] = [
    { key: 'stock', label: 'Stock actuel', icon: Package, color: '#F97316' },
    { key: 'entrees', label: 'Entrées', icon: ArrowDown, color: '#16A34A' },
    { key: 'sorties', label: 'Sorties', icon: ArrowUp, color: '#EF4444' },
    { key: 'ajustements', label: 'Ajustements', icon: SlidersHorizontal, color: '#F59E0B' },
    { key: 'produits', label: 'Produits', icon: Package, color: '#8B5CF6' },
  ]

  return (
    <div>
      <TopBar title="Stock Boissons" />
      <div style={S.page}>

        {msg && (
          <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 600, background: msg.startsWith('✅') ? 'rgba(22,163,74,0.15)' : 'rgba(239,68,68,0.15)', color: msg.startsWith('✅') ? '#86EFAC' : '#FCA5A5', border: `1px solid ${msg.startsWith('✅') ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
            {msg}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setShowMvtForm(false); setShowProdForm(false) }} style={S.tab(tab === t.key, t.color)}>
              <t.icon size={15} />{t.label}
            </button>
          ))}
        </div>

        {/* Stock actuel */}
        {tab === 'stock' && (
          loading ? (
            <div style={{ color: '#64748B', padding: 24, textAlign: 'center' }}>Chargement...</div>
          ) : stockActuel.length === 0 ? (
            <div style={{ ...S.card, textAlign: 'center', color: '#64748B', padding: 32 }}>Aucun produit. Ajoutez des produits dans l&apos;onglet &quot;Produits&quot;.</div>
          ) : stockActuel.map(s => {
            const bpc = s.bouteilles_par_casier || 1
            const casiersEntiers = Math.floor(s.stock_theorique)
            const bouteillesRestantes = bpc > 1 ? Math.round((s.stock_theorique - casiersEntiers) * bpc) : 0
            const low = s.stock_theorique <= 2
            return (
              <div key={s.produit_id} style={{ ...S.card, marginBottom: 10, border: low ? '1px solid rgba(239,68,68,0.4)' : S.card.border }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>{s.nom}</div>
                    <div style={{ color: s.stock_theorique <= 0 ? '#EF4444' : low ? '#FB923C' : '#F8FAFC', fontSize: 24, fontWeight: 900 }}>
                      {s.stock_theorique} <span style={{ fontSize: 13, color: '#64748B', fontWeight: 400 }}>{s.unite}{s.stock_theorique !== 1 ? 's' : ''}</span>
                    </div>
                    {bpc > 1 && (
                      <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>
                        = {casiersEntiers} {s.unite}{casiersEntiers !== 1 ? 's' : ''} + {bouteillesRestantes} bout.
                      </div>
                    )}
                  </div>
                  {low && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#F87171', background: 'rgba(239,68,68,0.12)', padding: '3px 8px', borderRadius: 20 }}>
                      ⚠️ {s.stock_theorique <= 0 ? 'RUPTURE' : 'FAIBLE'}
                    </span>
                  )}
                </div>
                <div style={{ color: '#475569', fontSize: 11, marginTop: 8 }}>{s.fournisseur}</div>
              </div>
            )
          })
        )}

        {/* Entrées */}
        {tab === 'entrees' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
              <button onClick={() => { setShowMvtForm(!showMvtForm); setEditMvtId(null); setMvtForm(EMPTY_MVT) }} style={S.btn('linear-gradient(135deg,#16A34A,#15803D)')}>
                {showMvtForm ? <X size={16} /> : <ArrowDown size={16} />}
                {showMvtForm ? 'Annuler' : 'Nouvelle entrée'}
              </button>
            </div>
            {showMvtForm && (
              <MvtForm type="entree" mvtForm={mvtForm} setMvtForm={setMvtForm} produits={produits} points={points} editMvtId={editMvtId} saving={saving} saveMvt={saveMvt} setShowMvtForm={setShowMvtForm} setEditMvtId={setEditMvtId} />
            )}
            <MvtTable type="entree" color="#16A34A" label="Entrées de stock" rows={filteredMvt('entree')} produits={produits} setMvtForm={setMvtForm} setEditMvtId={setEditMvtId} setShowMvtForm={setShowMvtForm} deleteMvt={deleteMvt} />
          </>
        )}

        {/* Sorties */}
        {tab === 'sorties' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
              <button onClick={() => { setShowMvtForm(!showMvtForm); setEditMvtId(null); setMvtForm(EMPTY_MVT) }} style={S.btn('linear-gradient(135deg,#EF4444,#DC2626)')}>
                {showMvtForm ? <X size={16} /> : <ArrowUp size={16} />}
                {showMvtForm ? 'Annuler' : 'Nouvelle sortie'}
              </button>
            </div>
            {showMvtForm && (
              <MvtForm type="sortie" mvtForm={mvtForm} setMvtForm={setMvtForm} produits={produits} points={points} editMvtId={editMvtId} saving={saving} saveMvt={saveMvt} setShowMvtForm={setShowMvtForm} setEditMvtId={setEditMvtId} />
            )}
            <MvtTable type="sortie" color="#EF4444" label="Sorties de stock" rows={filteredMvt('sortie')} produits={produits} setMvtForm={setMvtForm} setEditMvtId={setEditMvtId} setShowMvtForm={setShowMvtForm} deleteMvt={deleteMvt} />
          </>
        )}

        {/* Ajustements */}
        {tab === 'ajustements' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
              <button onClick={() => { setShowMvtForm(!showMvtForm); setEditMvtId(null); setMvtForm(EMPTY_MVT) }} style={S.btn('linear-gradient(135deg,#F59E0B,#D97706)')}>
                {showMvtForm ? <X size={16} /> : <SlidersHorizontal size={16} />}
                {showMvtForm ? 'Annuler' : 'Nouvel ajustement'}
              </button>
            </div>
            {showMvtForm && (
              <MvtForm type="ajustement" mvtForm={mvtForm} setMvtForm={setMvtForm} produits={produits} points={points} editMvtId={editMvtId} saving={saving} saveMvt={saveMvt} setShowMvtForm={setShowMvtForm} setEditMvtId={setEditMvtId} />
            )}
            <MvtTable type="ajustement" color="#F59E0B" label="Ajustements" rows={filteredMvt('ajustement')} produits={produits} setMvtForm={setMvtForm} setEditMvtId={setEditMvtId} setShowMvtForm={setShowMvtForm} deleteMvt={deleteMvt} />
          </>
        )}

        {/* Produits */}
        {tab === 'produits' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
              <button onClick={() => { setShowProdForm(!showProdForm); setEditProdId(null); setProdForm(EMPTY_PRODUIT) }} style={S.btn('linear-gradient(135deg,#F97316,#EA580C)')}>
                {showProdForm ? <X size={16} /> : <Plus size={16} />}
                {showProdForm ? 'Annuler' : 'Ajouter un produit'}
              </button>
            </div>

            {showProdForm && (
              <div style={S.card}>
                <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
                  {editProdId ? '✏️ Modifier le produit' : '➕ Nouveau produit'}
                </div>

                <div style={S.field}>
                  <label style={S.label}>Nom du produit *</label>
                  <input value={prodForm.nom} onChange={e => setProdForm({ ...prodForm, nom: e.target.value })} style={S.input} placeholder="Ex: Bock 65cl" />
                </div>

                <div style={S.field}>
                  <label style={S.label}>Fournisseur</label>
                  <select value={prodForm.fournisseur} onChange={e => setProdForm({ ...prodForm, fournisseur: e.target.value })} style={S.input}>
                    <option value="SOLIBRA">SOLIBRA</option>
                    <option value="BRASSIVOIRE">BRASSIVOIRE</option>
                    <option value="AUTRE">AUTRE</option>
                  </select>
                </div>

                <div style={S.field}>
                  <label style={S.label}>Unité</label>
                  <select value={prodForm.unite} onChange={e => setProdForm({ ...prodForm, unite: e.target.value })} style={S.input}>
                    <option value="casier">Casier</option>
                    <option value="carton">Carton</option>
                    <option value="bouteille">Bouteille</option>
                    <option value="pack">Pack</option>
                  </select>
                </div>

                <div style={S.field}>
                  <label style={S.label}>Nombre d&apos;unités par {prodForm.unite} *</label>
                  <input type="number" min="1" value={prodForm.bouteilles_par_casier} onChange={e => setProdForm({ ...prodForm, bouteilles_par_casier: e.target.value })} style={S.input} placeholder="Ex: 24" />
                  <p style={{ color: '#64748B', fontSize: 11, marginTop: 4 }}>
                    Combien de bouteilles/unités contient un {prodForm.unite} de ce produit ? (varie selon le produit : 12, 24, 6...)
                  </p>
                </div>

                <div style={S.field}>
                  <label style={S.label}>Prix unitaire (CFA)</label>
                  <input type="number" value={prodForm.prix_unitaire} onChange={e => setProdForm({ ...prodForm, prix_unitaire: e.target.value })} style={S.input} placeholder="0" />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button onClick={saveProduit} disabled={saving || !prodForm.nom} style={{ ...S.btn('linear-gradient(135deg,#F97316,#EA580C)'), opacity: (saving || !prodForm.nom) ? 0.5 : 1 }}>
                    <Save size={16} />{saving ? 'Enregistrement...' : editProdId ? 'Modifier' : 'Ajouter'}
                  </button>
                  <button onClick={() => setShowProdForm(false)} style={S.btnGhost}>Annuler</button>
                </div>
              </div>
            )}

            <div style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Catalogue produits ({produits.length})
            </div>
            {produits.length === 0 ? (
              <div style={{ ...S.card, textAlign: 'center', color: '#64748B', padding: 32 }}>Aucun produit.</div>
            ) : produits.map(p => (
              <div key={p.id} style={{ ...S.card, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 14 }}>{p.nom}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: '#F59E0B', background: 'rgba(245,158,11,0.12)', padding: '2px 8px', borderRadius: 20 }}>{p.fournisseur}</span>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>{p.unite}</span>
                    {(p.bouteilles_par_casier || 1) > 1 && (
                      <span style={{ fontSize: 11, color: '#94A3B8' }}>· {p.bouteilles_par_casier} / {p.unite}</span>
                    )}
                  </div>
                  <div style={{ color: '#F8FAFC', fontSize: 13, fontWeight: 700, marginTop: 4 }}>{formatCFA(p.prix_unitaire)}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => { setProdForm({ nom: p.nom, fournisseur: p.fournisseur, unite: p.unite, prix_unitaire: String(p.prix_unitaire), bouteilles_par_casier: String(p.bouteilles_par_casier || 12) }); setEditProdId(p.id); setShowProdForm(true) }} style={S.btnIcon('#93C5FD')}><Pencil size={14} /></button>
                  <button onClick={() => deleteProduit(p.id, p.nom)} style={S.btnIcon('#FCA5A5')}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </>
        )}

      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Composants top-level (hors StockPage), CSS inline pur.
// ─────────────────────────────────────────────────────────

function MvtForm({
  type, mvtForm, setMvtForm, produits, points, editMvtId, saving, saveMvt, setShowMvtForm, setEditMvtId,
}: {
  type: 'entree' | 'sortie' | 'ajustement'
  mvtForm: any
  setMvtForm: (v: any) => void
  produits: any[]
  points: any[]
  editMvtId: string | null
  saving: boolean
  saveMvt: (type: 'entree' | 'sortie' | 'ajustement') => void
  setShowMvtForm: (v: boolean) => void
  setEditMvtId: (v: string | null) => void
}) {
  const produitSel = produits.find(p => p.id === mvtForm.produit_id)
  const bpc = produitSel?.bouteilles_par_casier || 1
  const casiers = parseFloat(mvtForm.nb_casiers) || 0
  const bouteilles = parseFloat(mvtForm.nb_bouteilles) || 0
  const totalBouteilles = casiers * bpc + bouteilles
  const quantiteCalculee = bpc > 1 ? totalBouteilles / bpc : totalBouteilles

  return (
    <div style={S.card}>
      <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
        {editMvtId ? '✏️ Modifier' : '➕ Nouveau'} — {type === 'entree' ? 'Entrée de stock' : type === 'sortie' ? 'Sortie de stock' : 'Ajustement'}
      </div>

      <div style={S.field}>
        <label style={S.label}>Produit *</label>
        <select value={mvtForm.produit_id} onChange={e => setMvtForm({ ...mvtForm, produit_id: e.target.value })} style={S.input}>
          <option value="">Sélectionner...</option>
          {produits.map(p => <option key={p.id} value={p.id}>{p.nom} ({p.fournisseur})</option>)}
        </select>
      </div>

      {type === 'sortie' ? (
        <>
          <div style={S.field}>
            <label style={S.label}>Nombre de casiers {bpc > 1 ? `(${bpc} bouteilles/casier)` : ''}</label>
            <input type="number" min="0" value={mvtForm.nb_casiers} onChange={e => setMvtForm({ ...mvtForm, nb_casiers: e.target.value })} style={S.input} placeholder="0" disabled={!mvtForm.produit_id} />
          </div>
          <div style={S.field}>
            <label style={S.label}>Nombre de bouteilles (unités)</label>
            <input type="number" min="0" value={mvtForm.nb_bouteilles} onChange={e => setMvtForm({ ...mvtForm, nb_bouteilles: e.target.value })} style={S.input} placeholder="0" disabled={!mvtForm.produit_id} />
          </div>
        </>
      ) : (
        <div style={S.field}>
          <label style={S.label}>Quantité *</label>
          <input type="number" value={mvtForm.quantite} onChange={e => setMvtForm({ ...mvtForm, quantite: e.target.value })} style={S.input} placeholder="0" />
        </div>
      )}

      <div style={S.field}>
        <label style={S.label}>Date</label>
        <input type="date" value={mvtForm.date} onChange={e => setMvtForm({ ...mvtForm, date: e.target.value })} style={S.input} />
      </div>

      {type === 'entree' && (
        <>
          <div style={S.field}>
            <label style={S.label}>Fournisseur</label>
            <input value={mvtForm.fournisseur} onChange={e => setMvtForm({ ...mvtForm, fournisseur: e.target.value })} style={S.input} placeholder="SOLIBRA, BRASSIVOIRE..." />
          </div>
          <div style={S.field}>
            <label style={S.label}>N° Bon de livraison</label>
            <input value={mvtForm.bon_livraison} onChange={e => setMvtForm({ ...mvtForm, bon_livraison: e.target.value })} style={S.input} placeholder="BL-2026-001" />
          </div>
        </>
      )}

      {type === 'sortie' && (
        <div style={S.field}>
          <label style={S.label}>Destination (bar)</label>
          <select value={mvtForm.point_de_vente_id} onChange={e => setMvtForm({ ...mvtForm, point_de_vente_id: e.target.value })} style={S.input}>
            <option value="">Entrepôt central</option>
            {points.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
        </div>
      )}

      <div style={S.field}>
        <label style={S.label}>Observation</label>
        <input value={mvtForm.notes} onChange={e => setMvtForm({ ...mvtForm, notes: e.target.value })} style={S.input} placeholder="Remarques..." />
      </div>

      {/* Récapitulatif sortie */}
      {type === 'sortie' && produitSel && (casiers > 0 || bouteilles > 0) && (
        <div style={{ marginTop: 4, marginBottom: 14, padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div style={{ color: '#94A3B8', fontSize: 11, marginBottom: 4 }}>Récapitulatif de la sortie</div>
          <div style={{ color: '#F8FAFC', fontSize: 13 }}>
            {casiers > 0 && <span>{casiers} casier{casiers > 1 ? 's' : ''}{bpc > 1 ? ` (${casiers * bpc} bouteilles)` : ''}</span>}
            {casiers > 0 && bouteilles > 0 && <span> + </span>}
            {bouteilles > 0 && <span>{bouteilles} bouteille{bouteilles > 1 ? 's' : ''}</span>}
          </div>
          <div style={{ color: '#F87171', fontSize: 13, fontWeight: 700, marginTop: 4 }}>
            Total à retirer : {quantiteCalculee.toFixed(2)} {produitSel.unite}{quantiteCalculee !== 1 ? 's' : ''}
            {bpc > 1 && <span style={{ color: '#94A3B8', fontWeight: 400 }}> ({totalBouteilles} bouteilles au total)</span>}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => saveMvt(type)}
          disabled={saving || !mvtForm.produit_id || (type === 'sortie' ? (casiers === 0 && bouteilles === 0) : !mvtForm.quantite)}
          style={{ ...S.btn('linear-gradient(135deg,#F97316,#EA580C)'), opacity: (saving || !mvtForm.produit_id) ? 0.5 : 1 }}>
          <Save size={16} />{saving ? 'Enregistrement...' : editMvtId ? 'Modifier' : 'Enregistrer'}
        </button>
        <button onClick={() => { setShowMvtForm(false); setEditMvtId(null); setMvtForm(EMPTY_MVT) }} style={S.btnGhost}>Annuler</button>
      </div>
    </div>
  )
}

function MvtTable({
  type, color, label, rows, produits, setMvtForm, setEditMvtId, setShowMvtForm, deleteMvt,
}: {
  type: string
  color: string
  label: string
  rows: any[]
  produits: any[]
  setMvtForm: (v: any) => void
  setEditMvtId: (v: string | null) => void
  setShowMvtForm: (v: boolean) => void
  deleteMvt: (id: string) => void
}) {
  return (
    <div style={S.card}>
      <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
        Historique — {label} <span style={{ color: '#64748B', fontWeight: 400 }}>({rows.length})</span>
      </div>
      {rows.length === 0 ? (
        <div style={{ color: '#64748B', textAlign: 'center', padding: 24 }}>Aucun mouvement enregistré.</div>
      ) : rows.map((m, i) => (
        <div key={m.id} style={{ padding: '10px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#F8FAFC', fontSize: 13, fontWeight: 600 }}>{m.produits_boissons?.nom}</div>
            <div style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>
              {new Date(m.date).toLocaleDateString('fr-FR')}
              {type === 'sortie' && <span> · {m.points_de_vente?.nom || 'Entrepôt'}</span>}
              {type === 'entree' && (m.fournisseur || m.bon_livraison) && <span> · {[m.fournisseur, m.bon_livraison].filter(Boolean).join(' / ')}</span>}
              {m.notes && <span> · {m.notes}</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ color, fontWeight: 700, fontSize: 14 }}>{m.quantite}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => {
              const isSortie = type === 'sortie'
              const bpc = m.produits_boissons ? (produits.find(p => p.id === m.produit_id)?.bouteilles_par_casier || 1) : 1
              let nb_casiers = '', nb_bouteilles = ''
              if (isSortie) {
                nb_casiers = bpc > 1 ? String(Math.floor(m.quantite)) : '0'
                nb_bouteilles = bpc > 1 ? String(Math.round((m.quantite - Math.floor(m.quantite)) * bpc)) : String(m.quantite)
              }
              setMvtForm({ produit_id: m.produit_id, quantite: String(m.quantite), date: m.date, notes: m.notes || '', fournisseur: m.fournisseur || '', bon_livraison: m.bon_livraison || '', point_de_vente_id: m.point_de_vente_id || '', nb_casiers, nb_bouteilles })
              setEditMvtId(m.id); setShowMvtForm(true)
            }} style={S.btnIcon('#93C5FD')}><Pencil size={13} /></button>
            <button onClick={() => deleteMvt(m.id)} style={S.btnIcon('#FCA5A5')}><Trash2 size={13} /></button>
          </div>
        </div>
      ))}
    </div>
  )
}
