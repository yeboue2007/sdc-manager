'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import { exportPDF, exportXLSX } from '@/lib/export'

function fmt(n: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' CFA' }

function Row({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ color: '#CBD5E1', fontSize: 13 }}>{label}</span>
        <span style={{ color: '#F8FAFC', fontSize: 13, fontWeight: 700 }}>{fmt(value)}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: '#0F172A', overflow: 'hidden' }}>
        <div style={{ height: 6, borderRadius: 99, width: pct + '%', background: color, transition: 'width .5s' }} />
      </div>
    </div>
  )
}

export default function RapportsPage() {
  const [data, setData] = useState<any>(null)
  const [artistes, setArtistes] = useState<any[]>([])
  const [depenses, setDepenses] = useState<any[]>([])
  const [personnel, setPersonnel] = useState<any[]>([])
  const [presences, setPresences] = useState<any[]>([])
  const [declarationsStands, setDeclarationsStands] = useState<any[]>([])
  const [ventes, setVentes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<'pdf' | 'xls' | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [dashRes, artRes, depRes, persRes, presRes, standRes, ventesRes] = await Promise.all([
        supabase.from('dashboard_journalier').select('*').single(),
        supabase.from('artistes').select('*').order('date_prestation'),
        supabase.from('depenses').select('*').order('date', { ascending: false }),
        supabase.from('personnel').select('*').eq('actif', true),
        supabase.from('presences').select('*'),
        supabase.from('declarations_stands').select('*, stands_nourriture(nom)').order('date', { ascending: false }),
        supabase.from('ventes_billets').select('*, types_billets(nom, prix)').order('date', { ascending: false }),
      ])
      if (dashRes.data) setData(dashRes.data)
      if (artRes.data) setArtistes(artRes.data)
      if (depRes.data) setDepenses(depRes.data)
      if (persRes.data) setPersonnel(persRes.data)
      if (presRes.data) setPresences(presRes.data)
      if (standRes.data) setDeclarationsStands(standRes.data)
      if (ventesRes.data) setVentes(ventesRes.data)
      setLoading(false)
    }
    load()
  }, [])

  const reportData = { dashboard: data, artistes, depenses, personnel, presences, stands: [], declarationsStands, ventes }

  async function handleExportPDF() {
    setExporting('pdf')
    try { exportPDF(reportData) } catch (e) { console.error(e) }
    setTimeout(() => setExporting(null), 2000)
  }

  async function handleExportXLS() {
    setExporting('xls')
    try { exportXLSX(reportData) } catch (e) { console.error(e) }
    setTimeout(() => setExporting(null), 1000)
  }

  const caTotal = (data?.ca_bars_total || 0) + (data?.ca_stands_total || 0) + (data?.ca_billetterie_total || 0)
  const chargesTotal = (data?.depenses_total || 0) + (data?.salaires_total || 0)
  const benefice = caTotal - chargesTotal
  const marge = caTotal > 0 ? Math.round((benefice / caTotal) * 100) : 0
  const mxRevenu = Math.max(data?.ca_bars_total || 0, data?.ca_stands_total || 0, data?.ca_billetterie_total || 0, 1)
  const mxCharge = Math.max(data?.depenses_total || 0, data?.salaires_total || 0, 1)
  const totalCachets = artistes.reduce((s, a) => s + a.cachet, 0)
  const totalCachetsPayes = artistes.reduce((s, a) => s + (a.cachet_paye || 0), 0)

  const S = {
    page: { padding: 16, maxWidth: 600 },
    card: { background: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 10, border: '1px solid rgba(255,255,255,0.06)' } as React.CSSProperties,
    sectionTitle: { color: '#F97316', fontWeight: 700, fontSize: 15, marginBottom: 12, marginTop: 4 },
    label: { color: '#94A3B8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 },
    val: (color = '#F8FAFC') => ({ color, fontSize: 22, fontWeight: 900 }),
  }

  return (
    <div>
      <TopBar title="Rapports & Exports" />
      <div style={S.page}>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#475569' }}>Chargement des données...</div>
        ) : (
          <>
            {/* ── KPIs ── */}
            <div style={S.sectionTitle}>📊 Bilan événement</div>

            <div style={S.card}>
              <div style={S.label}>CA Total</div>
              <div style={S.val()}>{fmt(caTotal)}</div>
            </div>
            <div style={{ ...S.card, border: '1px solid rgba(239,68,68,0.3)' }}>
              <div style={S.label}>Charges totales</div>
              <div style={S.val('#F87171')}>{fmt(chargesTotal)}</div>
            </div>
            <div style={{ ...S.card, border: `1px solid ${benefice >= 0 ? 'rgba(22,163,74,0.4)' : 'rgba(239,68,68,0.4)'}`, background: benefice >= 0 ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={S.label}>Bénéfice net</div>
                  <div style={S.val(benefice >= 0 ? '#4ADE80' : '#F87171')}>{benefice >= 0 ? '+' : ''}{fmt(benefice)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={S.label}>Marge</div>
                  <div style={{ color: benefice >= 0 ? '#4ADE80' : '#F87171', fontSize: 28, fontWeight: 900 }}>{marge}%</div>
                </div>
              </div>
            </div>

            {/* ── Répartition revenus ── */}
            <div style={{ ...S.card, marginTop: 4 }}>
              <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 13, marginBottom: 16 }}>📈 Répartition des revenus</div>
              <Row label="CA Bars" value={data?.ca_bars_total || 0} max={mxRevenu} color="#F97316" />
              <Row label="CA Stands" value={data?.ca_stands_total || 0} max={mxRevenu} color="#F59E0B" />
              <Row label="Billetterie" value={data?.ca_billetterie_total || 0} max={mxRevenu} color="#16A34A" />
            </div>

            {/* ── Répartition charges ── */}
            <div style={S.card}>
              <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 13, marginBottom: 16 }}>📉 Répartition des charges</div>
              <Row label="Dépenses" value={data?.depenses_total || 0} max={Math.max(chargesTotal, 1)} color="#EF4444" />
              <Row label="Salaires" value={data?.salaires_total || 0} max={Math.max(chargesTotal, 1)} color="#EC4899" />
            </div>

            {/* ── Artistes ── */}
            {artistes.length > 0 && (
              <>
                <div style={S.sectionTitle}>🎤 Artistes & Cachets</div>
                <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
                  {/* Totaux */}
                  <div style={{ padding: '12px 16px', display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {[
                      { label: 'Total cachets', value: fmt(totalCachets), color: '#F8FAFC' },
                      { label: 'Payé', value: fmt(totalCachetsPayes), color: '#4ADE80' },
                      { label: 'Reste', value: fmt(totalCachets - totalCachetsPayes), color: '#F87171' },
                    ].map((k, i) => (
                      <div key={i} style={{ flex: 1, textAlign: 'center', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', padding: '4px 8px' }}>
                        <div style={{ color: '#64748B', fontSize: 10, marginBottom: 4 }}>{k.label}</div>
                        <div style={{ color: k.color, fontWeight: 900, fontSize: 13 }}>{k.value}</div>
                      </div>
                    ))}
                  </div>
                  {/* Artistes */}
                  {artistes.map((a, i) => {
                    const restant = a.cachet - (a.cachet_paye || 0)
                    const pctPaye = a.cachet > 0 ? Math.min(100, Math.round(((a.cachet_paye || 0) / a.cachet) * 100)) : 0
                    const statutColors: Record<string, string> = { en_negociation: '#F59E0B', confirme: '#3B82F6', paye: '#16A34A', annule: '#EF4444' }
                    const statutLabels: Record<string, string> = { en_negociation: 'En négociation', confirme: 'Confirmé', paye: 'Payé', annule: 'Annulé' }
                    return (
                      <div key={a.id} style={{ padding: '12px 16px', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 14 }}>{a.nom_artiste}</div>
                            {a.date_prestation && <div style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>📅 {new Date(a.date_prestation).toLocaleDateString('fr-FR')}</div>}
                          </div>
                          <span style={{ background: (statutColors[a.statut] || '#94A3B8') + '25', color: statutColors[a.statut] || '#94A3B8', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: `1px solid ${(statutColors[a.statut] || '#94A3B8')}40` }}>
                            {statutLabels[a.statut] || a.statut}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
                          <div style={{ fontSize: 12, color: '#94A3B8' }}>Cachet : <span style={{ color: '#F8FAFC', fontWeight: 700 }}>{fmt(a.cachet)}</span></div>
                          <div style={{ fontSize: 12, color: '#94A3B8' }}>Reçu : <span style={{ color: '#4ADE80', fontWeight: 700 }}>{fmt(a.cachet_paye || 0)}</span></div>
                          <div style={{ fontSize: 12, color: '#94A3B8' }}>Reste : <span style={{ color: restant > 0 ? '#F87171' : '#4ADE80', fontWeight: 700 }}>{fmt(restant)}</span></div>
                        </div>
                        <div style={{ height: 4, borderRadius: 99, background: '#0F172A', overflow: 'hidden' }}>
                          <div style={{ height: 4, borderRadius: 99, width: pctPaye + '%', background: pctPaye === 100 ? '#16A34A' : '#F97316' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* ── EXPORTS ── */}
            <div style={S.sectionTitle}>📥 Exports</div>

            {/* PDF */}
            <button
              onClick={handleExportPDF}
              disabled={exporting === 'pdf'}
              style={{
                width: '100%', marginBottom: 10, padding: '16px',
                background: exporting === 'pdf' ? '#1E293B' : 'linear-gradient(135deg,#EF4444,#DC2626)',
                border: 'none', borderRadius: 12, cursor: exporting === 'pdf' ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                opacity: exporting === 'pdf' ? 0.7 : 1,
              }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
                  {exporting === 'pdf' ? '⏳ Génération en cours...' : '📄 Exporter en PDF'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>
                  Rapport complet · Bilan · Artistes · Dépenses · Stands
                </div>
              </div>
              <span style={{ color: '#fff', fontSize: 22 }}>→</span>
            </button>

            {/* XLS */}
            <button
              onClick={handleExportXLS}
              disabled={exporting === 'xls'}
              style={{
                width: '100%', marginBottom: 24, padding: '16px',
                background: exporting === 'xls' ? '#1E293B' : 'linear-gradient(135deg,#16A34A,#15803D)',
                border: 'none', borderRadius: 12, cursor: exporting === 'xls' ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                opacity: exporting === 'xls' ? 0.7 : 1,
              }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
                  {exporting === 'xls' ? '⏳ Export en cours...' : '📊 Exporter en Excel / XLS'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>
                  Tableaux structurés · Ouvrable dans Excel ou Google Sheets
                </div>
              </div>
              <span style={{ color: '#fff', fontSize: 22 }}>→</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
