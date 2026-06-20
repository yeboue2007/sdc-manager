'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import { Plus, X, Save, Pencil, Trash2, AlertTriangle, CheckCircle } from 'lucide-react'

function formatCFA(n: number) { return new Intl.NumberFormat('fr-FR').format(n) + ' CFA' }
function todayISO() { return new Date().toISOString().split('T')[0] }
function isoDaysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0] }
function firstOfMonth() { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0] }

const EMPTY = { date: todayISO(), point_de_vente_id: '', montant_cash: '', montant_mobile_money: '', montant_carte: '', ecart_stock: '', notes: '' }

type Periode = 'jour' | 'semaine' | 'mois' | 'tout' | 'custom'

const S = {
  page: { padding: 16, maxWidth: 900 } as React.CSSProperties,
  card: { background: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 14, border: '1px solid rgba(255,255,255,0.06)' } as React.CSSProperties,
  input: { background: '#0F172A', border: '1px solid #334155', borderRadius: 8, color: '#F8FAFC', padding: '10px 12px', width: '100%', fontSize: 14, boxSizing: 'border-box' } as React.CSSProperties,
  label: { color: '#94A3B8', fontSize: 12, marginBottom: 4, display: 'block' } as React.CSSProperties,
  field: { marginBottom: 12 } as React.CSSProperties,
  btn: (bg: string) => ({ background: bg, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 } as React.CSSProperties),
  btnGhost: { background: '#1E293B', color: '#94A3B8', border: '1px solid #334155', borderRadius: 8, padding: '10px 16px', fontSize: 14, cursor: 'pointer' } as React.CSSProperties,
  btnIcon: (color: string) => ({ background: color + '22', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color } as React.CSSProperties),
  pill: (active: boolean) => ({ padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', color: active ? '#fff' : '#94A3B8', background: active ? 'linear-gradient(135deg,#F97316,#EA580C)' : '#1E293B' } as React.CSSProperties),
}

export default function CaissesPage() {
  const [declarations, setDeclarations] = useState<any[]>([])
  const [points, setPoints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Filtre période
  const [periode, setPeriode] = useState<Periode>('mois')
  const [dateDebut, setDateDebut] = useState(firstOfMonth())
  const [dateFin, setDateFin] = useState(todayISO())

  useEffect(() => { loadData() }, [])

  // Quand on change de préréglage, recalculer les bornes de dates
  useEffect(() => {
    const t = todayISO()
    if (periode === 'jour') { setDateDebut(t); setDateFin(t) }
    else if (periode === 'semaine') { setDateDebut(isoDaysAgo(6)); setDateFin(t) }
    else if (periode === 'mois') { setDateDebut(firstOfMonth()); setDateFin(t) }
    else if (periode === 'tout') { setDateDebut('2026-01-01'); setDateFin('2026-12-31') }
  }, [periode])

  async function loadData() {
    setLoading(true)
    const [dRes, pRes] = await Promise.all([
      supabase.from('caisses_encaissements').select('*, points_de_vente(nom)').order('date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('points_de_vente').select('*').eq('actif', true)
    ])
    setDeclarations(dRes.data || [])
    setPoints(pRes.data || [])
    setLoading(false)
  }

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const totalForm = (parseFloat(form.montant_cash) || 0) + (parseFloat(form.montant_mobile_money) || 0) + (parseFloat(form.montant_carte) || 0)

  async function handleSave() {
    setSaving(true)
    const payload = {
      date: form.date,
      point_de_vente_id: form.point_de_vente_id || null,
      montant_cash: parseFloat(form.montant_cash) || 0,
      montant_mobile_money: parseFloat(form.montant_mobile_money) || 0,
      montant_carte: parseFloat(form.montant_carte) || 0,
      ecart_stock: parseFloat(form.ecart_stock) || 0,
      alerte_ecart: (parseFloat(form.ecart_stock) || 0) > 5000,
      notes: form.notes
    }
    const { error } = editId
      ? await supabase.from('caisses_encaissements').update(payload).eq('id', editId)
      : await supabase.from('caisses_encaissements').insert(payload)
    setSaving(false)
    if (error) { flash('❌ Erreur: ' + error.message); return }
    flash(editId ? '✅ Déclaration modifiée' : '✅ Déclaration enregistrée')
    setShowForm(false); setEditId(null); setForm(EMPTY); loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette déclaration ?')) return
    const { error } = await supabase.from('caisses_encaissements').delete().eq('id', id)
    if (error) flash('❌ Erreur')
    else { flash('✅ Supprimée'); loadData() }
  }

  function startEdit(d: any) {
    setForm({ date: d.date, point_de_vente_id: d.point_de_vente_id || '', montant_cash: String(d.montant_cash), montant_mobile_money: String(d.montant_mobile_money), montant_carte: String(d.montant_carte), ecart_stock: String(d.ecart_stock || 0), notes: d.notes || '' })
    setEditId(d.id); setShowForm(true)
  }

  // Déclarations filtrées selon la période choisie
  const declarationsFiltrees = useMemo(() => {
    return declarations.filter(d => d.date >= dateDebut && d.date <= dateFin)
  }, [declarations, dateDebut, dateFin])

  const caTotalPeriode = declarationsFiltrees.reduce((s, d) => s + (d.montant_total_theorique || 0), 0)
  const caCash = declarationsFiltrees.reduce((s, d) => s + (d.montant_cash || 0), 0)
  const caMobile = declarationsFiltrees.reduce((s, d) => s + (d.montant_mobile_money || 0), 0)
  const caCarte = declarationsFiltrees.reduce((s, d) => s + (d.montant_carte || 0), 0)
  const alertesPeriode = declarationsFiltrees.filter(d => d.alerte_ecart).length

  const today = todayISO()
  const totalJour = declarations.filter(d => d.date === today).reduce((s, d) => s + (d.montant_total_theorique || 0), 0)

  const PERIODES: { key: Periode, label: string }[] = [
    { key: 'jour', label: "Aujourd'hui" },
    { key: 'semaine', label: '7 derniers jours' },
    { key: 'mois', label: 'Ce mois' },
    { key: 'tout', label: 'Tout l\'événement' },
    { key: 'custom', label: 'Dates personnalisées' },
  ]

  return (
    <div>
      <TopBar title="Caisses & Encaissements" />
      <div style={S.page}>

        {msg && (
          <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 600, background: msg.startsWith('✅') ? 'rgba(22,163,74,0.15)' : 'rgba(239,68,68,0.15)', color: msg.startsWith('✅') ? '#86EFAC' : '#FCA5A5', border: `1px solid ${msg.startsWith('✅') ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
            {msg}
          </div>
        )}

        {/* CA du jour — rappel rapide */}
        <div style={{ ...S.card, marginBottom: 10 }}>
          <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>CA Bars — Aujourd&apos;hui</div>
          <div style={{ color: '#F8FAFC', fontSize: 20, fontWeight: 900 }}>{formatCFA(totalJour)}</div>
        </div>

        {/* Sélecteur de période */}
        <div style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Chiffre d&apos;affaires par période
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {PERIODES.map(p => (
            <button key={p.key} onClick={() => setPeriode(p.key)} style={S.pill(periode === p.key)}>
              {p.label}
            </button>
          ))}
        </div>

        {periode === 'custom' && (
          <div style={{ ...S.card, display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Du</label>
              <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} style={S.input} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Au</label>
              <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} style={S.input} />
            </div>
          </div>
        )}

        {/* CA Total de la période */}
        <div style={{ ...S.card, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)', marginBottom: 10 }}>
          <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>
            Chiffre d&apos;affaires total — {dateDebut === dateFin ? new Date(dateDebut).toLocaleDateString('fr-FR') : `${new Date(dateDebut).toLocaleDateString('fr-FR')} → ${new Date(dateFin).toLocaleDateString('fr-FR')}`}
          </div>
          <div style={{ color: '#FB923C', fontSize: 28, fontWeight: 900 }}>{formatCFA(caTotalPeriode)}</div>
          <div style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>{declarationsFiltrees.length} déclaration{declarationsFiltrees.length !== 1 ? 's' : ''}</div>
        </div>

        {/* Détail par mode de paiement */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ ...S.card, flex: 1, marginBottom: 0, padding: 12 }}>
            <div style={{ color: '#64748B', fontSize: 11, marginBottom: 4 }}>Cash</div>
            <div style={{ color: '#F8FAFC', fontSize: 14, fontWeight: 700 }}>{formatCFA(caCash)}</div>
          </div>
          <div style={{ ...S.card, flex: 1, marginBottom: 0, padding: 12 }}>
            <div style={{ color: '#64748B', fontSize: 11, marginBottom: 4 }}>Mobile Money</div>
            <div style={{ color: '#F8FAFC', fontSize: 14, fontWeight: 700 }}>{formatCFA(caMobile)}</div>
          </div>
          <div style={{ ...S.card, flex: 1, marginBottom: 0, padding: 12 }}>
            <div style={{ color: '#64748B', fontSize: 11, marginBottom: 4 }}>Carte</div>
            <div style={{ color: '#F8FAFC', fontSize: 14, fontWeight: 700 }}>{formatCFA(caCarte)}</div>
          </div>
        </div>

        {alertesPeriode > 0 && (
          <div style={{ ...S.card, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} color="#F87171" />
            <span style={{ color: '#F87171', fontSize: 13, fontWeight: 600 }}>{alertesPeriode} alerte{alertesPeriode > 1 ? 's' : ''} d&apos;écart sur cette période</span>
          </div>
        )}

        {/* Bouton ajouter */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14, marginTop: 10 }}>
          <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY) }} style={S.btn('linear-gradient(135deg,#F97316,#EA580C)')}>
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Annuler' : 'Nouvelle déclaration'}
          </button>
        </div>

        {/* Formulaire */}
        {showForm && (
          <div style={S.card}>
            <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
              {editId ? '✏️ Modifier la déclaration' : '➕ Nouvelle déclaration de caisse'}
            </div>

            <div style={S.field}>
              <label style={S.label}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={S.input} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Point de vente</label>
              <select value={form.point_de_vente_id} onChange={e => setForm({ ...form, point_de_vente_id: e.target.value })} style={S.input}>
                <option value="">Sélectionner...</option>
                {points.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </div>
            <div style={S.field}>
              <label style={S.label}>Montant Cash (CFA)</label>
              <input type="number" value={form.montant_cash} onChange={e => setForm({ ...form, montant_cash: e.target.value })} style={S.input} placeholder="0" />
            </div>
            <div style={S.field}>
              <label style={S.label}>Mobile Money (CFA)</label>
              <input type="number" value={form.montant_mobile_money} onChange={e => setForm({ ...form, montant_mobile_money: e.target.value })} style={S.input} placeholder="0" />
            </div>
            <div style={S.field}>
              <label style={S.label}>Carte bancaire (CFA)</label>
              <input type="number" value={form.montant_carte} onChange={e => setForm({ ...form, montant_carte: e.target.value })} style={S.input} placeholder="0" />
            </div>
            <div style={S.field}>
              <label style={S.label}>Écart de stock (CFA)</label>
              <input type="number" value={form.ecart_stock} onChange={e => setForm({ ...form, ecart_stock: e.target.value })} style={S.input} placeholder="0" />
            </div>
            <div style={S.field}>
              <label style={S.label}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...S.input, resize: 'vertical' }} placeholder="Observations..." />
            </div>

            {totalForm > 0 && (
              <div style={{ marginBottom: 14, padding: 12, borderRadius: 8, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94A3B8', fontSize: 13 }}>Total calculé</span>
                <span style={{ color: '#F8FAFC', fontWeight: 900, fontSize: 18 }}>{formatCFA(totalForm)}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleSave} disabled={saving} style={{ ...S.btn('linear-gradient(135deg,#F97316,#EA580C)'), opacity: saving ? 0.5 : 1 }}>
                <Save size={16} />{saving ? 'Enregistrement...' : editId ? 'Modifier' : 'Enregistrer'}
              </button>
              <button onClick={() => setShowForm(false)} style={S.btnGhost}>Annuler</button>
            </div>
          </div>
        )}

        {/* Historique */}
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 14 }}>
              Historique — période sélectionnée <span style={{ color: '#64748B', fontWeight: 400 }}>({declarationsFiltrees.length})</span>
            </div>
            <button onClick={loadData} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 12 }}>↺ Actualiser</button>
          </div>

          {loading ? (
            <div style={{ color: '#64748B', textAlign: 'center', padding: 24 }}>Chargement...</div>
          ) : declarationsFiltrees.length === 0 ? (
            <div style={{ color: '#64748B', textAlign: 'center', padding: 24 }}>Aucune déclaration sur cette période.</div>
          ) : declarationsFiltrees.map((d, i) => (
            <div key={d.id} style={{ padding: '12px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#F8FAFC', fontSize: 13, fontWeight: 600 }}>{new Date(d.date).toLocaleDateString('fr-FR')}</span>
                  {d.alerte_ecart ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: '#F87171', background: 'rgba(239,68,68,0.12)', padding: '2px 7px', borderRadius: 20 }}>
                      <AlertTriangle size={9} />Écart
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: '#4ADE80', background: 'rgba(22,163,74,0.12)', padding: '2px 7px', borderRadius: 20 }}>
                      <CheckCircle size={9} />OK
                    </span>
                  )}
                </div>
                <div style={{ color: '#64748B', fontSize: 11, marginTop: 3 }}>
                  {d.points_de_vente?.nom || 'Point de vente non précisé'} · Cash {formatCFA(d.montant_cash)} · MM {formatCFA(d.montant_mobile_money)} · Carte {formatCFA(d.montant_carte)}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ color: '#F8FAFC', fontWeight: 900, fontSize: 15 }}>{formatCFA(d.montant_total_theorique)}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => startEdit(d)} style={S.btnIcon('#93C5FD')}><Pencil size={13} /></button>
                <button onClick={() => handleDelete(d.id)} style={S.btnIcon('#FCA5A5')}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
