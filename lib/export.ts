import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' CFA'
}

function pct(part: number, total: number) {
  if (!total) return '0%'
  return Math.round((part / total) * 100) + '%'
}

interface ReportData {
  dashboard: any
  artistes: any[]
  depenses: any[]
  personnel: any[]
  presences: any[]
  stands: any[]
  declarationsStands: any[]
  ventes: any[]
}

// ─────────────────────────────────────────────
// EXPORT PDF
// ─────────────────────────────────────────────
export function exportPDF(data: ReportData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const d = data.dashboard
  const now = new Date()
  const dateStr = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const caTotal = (d?.ca_bars_total || 0) + (d?.ca_stands_total || 0) + (d?.ca_billetterie_total || 0)
  const chargesTotal = (d?.depenses_total || 0) + (d?.salaires_total || 0)
  const benefice = caTotal - chargesTotal
  const marge = caTotal > 0 ? Math.round((benefice / caTotal) * 100) : 0

  const ORANGE  = [249, 115, 22]  as [number,number,number]
  const DARK    = [15, 23, 42]    as [number,number,number]
  const LIGHT   = [248, 250, 252] as [number,number,number]
  const GRAY    = [100, 116, 139] as [number,number,number]
  const GREEN   = [22, 163, 74]   as [number,number,number]
  const RED     = [239, 68, 68]   as [number,number,number]
  const BLUE    = [59, 130, 246]  as [number,number,number]

  let y = 0

  // ── COVER PAGE ──────────────────────────────
  doc.setFillColor(...DARK)
  doc.rect(0, 0, 210, 297, 'F')

  // Bande orange
  doc.setFillColor(...ORANGE)
  doc.rect(0, 0, 210, 60, 'F')

  // Logo SDC
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(12, 12, 36, 36, 4, 4, 'F')
  doc.setTextColor(...ORANGE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('SDC', 30, 34, { align: 'center' })

  // Titre
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('SDC Manager', 55, 26)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('Son Du Ciel Events', 55, 34)
  doc.setFontSize(10)
  doc.text('Terrain du village d\'Ebimpé · Abidjan', 55, 42)

  // Titre rapport
  doc.setFillColor(...DARK)
  doc.rect(0, 60, 210, 60, 'F')
  doc.setTextColor(...ORANGE)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('RAPPORT FINANCIER', 105, 85, { align: 'center' })
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.text('Le Spécial 51 Jours Chrono du Mondial 2026', 105, 96, { align: 'center' })
  doc.setFontSize(10)
  doc.setTextColor(...GRAY)
  doc.text(`Généré le ${dateStr}`, 105, 106, { align: 'center' })

  // KPIs cover
  const kpis = [
    { label: 'CA TOTAL', value: fmt(caTotal), color: ORANGE },
    { label: 'CHARGES', value: fmt(chargesTotal), color: RED },
    { label: 'BÉNÉFICE NET', value: fmt(benefice), color: benefice >= 0 ? GREEN : RED },
    { label: 'MARGE NETTE', value: marge + '%', color: benefice >= 0 ? GREEN : RED },
  ]
  const kpiY = 135
  const kpiW = 44
  kpis.forEach((k, i) => {
    const x = 12 + i * (kpiW + 4)
    doc.setFillColor(30, 41, 59)
    doc.roundedRect(x, kpiY, kpiW, 30, 3, 3, 'F')
    doc.setDrawColor(...k.color)
    doc.setLineWidth(0.5)
    doc.roundedRect(x, kpiY, kpiW, 30, 3, 3, 'S')
    doc.setTextColor(...GRAY)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text(k.label, x + kpiW / 2, kpiY + 9, { align: 'center' })
    doc.setTextColor(...k.color)
    doc.setFontSize(k.value.length > 12 ? 7 : 9)
    doc.setFont('helvetica', 'bold')
    doc.text(k.value, x + kpiW / 2, kpiY + 22, { align: 'center' })
  })

  // Période
  doc.setTextColor(...GRAY)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Période : 30 Mai 2026 — 19 Juillet 2026  ·  +225 05 65 48 24 55', 105, 280, { align: 'center' })

  // ── PAGE 2 : BILAN FINANCIER ─────────────────
  doc.addPage()
  doc.setFillColor(...DARK)
  doc.rect(0, 0, 210, 297, 'F')

  // Header page
  doc.setFillColor(...ORANGE)
  doc.rect(0, 0, 210, 14, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('SDC MANAGER — RAPPORT FINANCIER 2026', 105, 9, { align: 'center' })

  y = 24
  doc.setTextColor(...ORANGE)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('1. BILAN FINANCIER GLOBAL', 14, y)
  y += 10

  // Tableau revenus
  autoTable(doc, {
    startY: y,
    head: [['Source de revenus', 'Montant (CFA)', '% du total']],
    body: [
      ['CA Bars', fmt(d?.ca_bars_total || 0), pct(d?.ca_bars_total || 0, caTotal)],
      ['CA Stands Nourriture', fmt(d?.ca_stands_total || 0), pct(d?.ca_stands_total || 0, caTotal)],
      ['Billetterie', fmt(d?.ca_billetterie_total || 0), pct(d?.ca_billetterie_total || 0, caTotal)],
    ],
    foot: [['TOTAL REVENUS', fmt(caTotal), '100%']],
    theme: 'grid',
    styles: { fillColor: [15, 23, 42], textColor: [248, 250, 252], fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: ORANGE, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    footStyles: { fillColor: [30, 41, 59], textColor: ORANGE, fontStyle: 'bold', fontSize: 9 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' } },
    margin: { left: 14, right: 14 },
  })

  y = (doc as any).lastAutoTable.finalY + 8

  // Tableau charges
  autoTable(doc, {
    startY: y,
    head: [['Charges', 'Montant (CFA)', '% des charges']],
    body: [
      ['Dépenses opérationnelles', fmt(d?.depenses_total || 0), pct(d?.depenses_total || 0, chargesTotal)],
      ['Masse salariale', fmt(d?.salaires_total || 0), pct(d?.salaires_total || 0, chargesTotal)],
    ],
    foot: [['TOTAL CHARGES', fmt(chargesTotal), '100%']],
    theme: 'grid',
    styles: { fillColor: [15, 23, 42], textColor: [248, 250, 252], fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [127, 29, 29], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    footStyles: { fillColor: [30, 41, 59], textColor: RED, fontStyle: 'bold', fontSize: 9 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' } },
    margin: { left: 14, right: 14 },
  })

  y = (doc as any).lastAutoTable.finalY + 8

  // Résultat net
  autoTable(doc, {
    startY: y,
    body: [
      ['Bénéfice Net', fmt(benefice)],
      ['Marge Nette', marge + '%'],
    ],
    theme: 'grid',
    styles: { fillColor: benefice >= 0 ? [5, 46, 22] : [69, 10, 10], textColor: benefice >= 0 ? [134, 239, 172] : [252, 165, 165], fontSize: 11, fontStyle: 'bold', cellPadding: 6 },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  })

  // ── PAGE 3 : ARTISTES ─────────────────────────
  if (data.artistes.length > 0) {
    doc.addPage()
    doc.setFillColor(...DARK)
    doc.rect(0, 0, 210, 297, 'F')
    doc.setFillColor(...ORANGE)
    doc.rect(0, 0, 210, 14, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('SDC MANAGER — RAPPORT FINANCIER 2026', 105, 9, { align: 'center' })

    y = 24
    doc.setTextColor(...ORANGE)
    doc.setFontSize(14)
    doc.text('2. ARTISTES & CACHETS', 14, y)
    y += 10

    const totalCachets = data.artistes.reduce((s, a) => s + a.cachet, 0)
    const totalPayes = data.artistes.reduce((s, a) => s + (a.cachet_paye || 0), 0)
    const totalRestant = totalCachets - totalPayes

    autoTable(doc, {
      startY: y,
      head: [['Artiste', 'Date', 'Statut', 'Cachet Total', 'Reçu', 'Reste à payer']],
      body: data.artistes.map(a => [
        a.nom_artiste,
        a.date_prestation ? new Date(a.date_prestation).toLocaleDateString('fr-FR') : '—',
        { en_negociation: 'En négociation', confirme: 'Confirmé', paye: 'Payé', annule: 'Annulé' }[a.statut as string] || a.statut,
        fmt(a.cachet),
        fmt(a.cachet_paye || 0),
        fmt(a.cachet - (a.cachet_paye || 0)),
      ]),
      foot: [['TOTAL', '', '', fmt(totalCachets), fmt(totalPayes), fmt(totalRestant)]],
      theme: 'grid',
      styles: { fillColor: [15, 23, 42], textColor: [248, 250, 252], fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      footStyles: { fillColor: [30, 41, 59], textColor: ORANGE, fontStyle: 'bold', fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 24, halign: 'center' },
        2: { cellWidth: 28, halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right', textColor: GREEN },
        5: { halign: 'right', textColor: RED },
      },
      margin: { left: 14, right: 14 },
    })
  }

  // ── PAGE 4 : DÉPENSES ─────────────────────────
  if (data.depenses.length > 0) {
    doc.addPage()
    doc.setFillColor(...DARK)
    doc.rect(0, 0, 210, 297, 'F')
    doc.setFillColor(...ORANGE)
    doc.rect(0, 0, 210, 14, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('SDC MANAGER — RAPPORT FINANCIER 2026', 105, 9, { align: 'center' })

    y = 24
    doc.setTextColor(...ORANGE)
    doc.setFontSize(14)
    doc.text('3. DÉTAIL DES DÉPENSES', 14, y)
    y += 10

    const CATEG_LABELS: Record<string, string> = {
      cachet_artiste: 'Cachets artistes', communication: 'Communication',
      logistique: 'Logistique', location_materiel: 'Location matériel',
      transport: 'Transport', securite: 'Sécurité',
      electricite: 'Électricité', restauration_equipe: 'Restauration équipe', divers: 'Divers',
    }

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Libellé', 'Catégorie', 'Bénéficiaire', 'Montant']],
      body: data.depenses.slice(0, 50).map(d => [
        new Date(d.date).toLocaleDateString('fr-FR'),
        d.libelle,
        CATEG_LABELS[d.categorie] || d.categorie,
        d.beneficiaire || '—',
        fmt(d.montant),
      ]),
      foot: [['', '', '', 'TOTAL', fmt(data.depenses.reduce((s, d) => s + d.montant, 0))]],
      theme: 'grid',
      styles: { fillColor: [15, 23, 42], textColor: [248, 250, 252], fontSize: 7.5, cellPadding: 3 },
      headStyles: { fillColor: [127, 29, 29], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      footStyles: { fillColor: [30, 41, 59], textColor: RED, fontStyle: 'bold', fontSize: 9 },
      columnStyles: { 0: { cellWidth: 20 }, 4: { halign: 'right', cellWidth: 32 } },
      margin: { left: 14, right: 14 },
    })
  }

  // ── PAGE 5 : STANDS ──────────────────────────
  if (data.declarationsStands.length > 0) {
    doc.addPage()
    doc.setFillColor(...DARK)
    doc.rect(0, 0, 210, 297, 'F')
    doc.setFillColor(...ORANGE)
    doc.rect(0, 0, 210, 14, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('SDC MANAGER — RAPPORT FINANCIER 2026', 105, 9, { align: 'center' })

    y = 24
    doc.setTextColor(...ORANGE)
    doc.setFontSize(14)
    doc.text('4. PERFORMANCE DES STANDS', 14, y)
    y += 10

    // Regrouper par stand
    const standMap: Record<string, { nom: string; ca: number; du: number; paye: number }> = {}
    data.declarationsStands.forEach((d: any) => {
      const nom = d.stands_nourriture?.nom || d.stand_id
      if (!standMap[nom]) standMap[nom] = { nom, ca: 0, du: 0, paye: 0 }
      standMap[nom].ca += d.ca_declare || 0
      standMap[nom].du += d.montant_du || 0
      standMap[nom].paye += d.montant_paye || 0
    })

    autoTable(doc, {
      startY: y,
      head: [['Stand', 'CA Déclaré', 'Montant Dû', 'Payé', 'Solde']],
      body: Object.values(standMap).map(s => [
        s.nom, fmt(s.ca), fmt(s.du), fmt(s.paye), fmt(s.du - s.paye)
      ]),
      foot: [['TOTAL',
        fmt(Object.values(standMap).reduce((s, x) => s + x.ca, 0)),
        fmt(Object.values(standMap).reduce((s, x) => s + x.du, 0)),
        fmt(Object.values(standMap).reduce((s, x) => s + x.paye, 0)),
        fmt(Object.values(standMap).reduce((s, x) => s + x.du - x.paye, 0)),
      ]],
      theme: 'grid',
      styles: { fillColor: [15, 23, 42], textColor: [248, 250, 252], fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [20, 184, 166], textColor: [255, 255, 255], fontStyle: 'bold' },
      footStyles: { fillColor: [30, 41, 59], textColor: ORANGE, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', textColor: RED } },
      margin: { left: 14, right: 14 },
    })
  }

  // Numéros de pages
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setTextColor(...GRAY)
    doc.setFontSize(8)
    doc.text(`Page ${i} / ${pageCount}`, 105, 292, { align: 'center' })
  }

  doc.save(`SDC_Manager_Rapport_${now.toISOString().split('T')[0]}.pdf`)
}

// ─────────────────────────────────────────────
// EXPORT XLSX (CSV amélioré avec structure)
// ─────────────────────────────────────────────
export function exportXLSX(data: ReportData) {
  const d = data.dashboard
  const now = new Date()

  const caTotal = (d?.ca_bars_total || 0) + (d?.ca_stands_total || 0) + (d?.ca_billetterie_total || 0)
  const chargesTotal = (d?.depenses_total || 0) + (d?.salaires_total || 0)
  const benefice = caTotal - chargesTotal
  const marge = caTotal > 0 ? Math.round((benefice / caTotal) * 100) : 0

  const sep = '\t'
  const nl = '\n'
  let csv = '\uFEFF' // BOM UTF-8

  function section(title: string) {
    return `${nl}${title.toUpperCase()}${nl}${'-'.repeat(60)}${nl}`
  }
  function row(...cells: (string | number)[]) {
    return cells.join(sep) + nl
  }

  csv += `SDC MANAGER — RAPPORT FINANCIER${nl}`
  csv += `Le Spécial 51 Jours Chrono du Mondial 2026${nl}`
  csv += `Son Du Ciel Events · +225 05 65 48 24 55${nl}`
  csv += `Généré le ${now.toLocaleDateString('fr-FR')}${nl}`

  // Bilan
  csv += section('1. BILAN FINANCIER')
  csv += row('INDICATEUR', 'MONTANT', '% DU TOTAL')
  csv += row('CA Bars', d?.ca_bars_total || 0, pct(d?.ca_bars_total || 0, caTotal))
  csv += row('CA Stands', d?.ca_stands_total || 0, pct(d?.ca_stands_total || 0, caTotal))
  csv += row('Billetterie', d?.ca_billetterie_total || 0, pct(d?.ca_billetterie_total || 0, caTotal))
  csv += row('TOTAL REVENUS', caTotal, '100%')
  csv += nl
  csv += row('Dépenses opérationnelles', d?.depenses_total || 0, pct(d?.depenses_total || 0, chargesTotal))
  csv += row('Masse salariale', d?.salaires_total || 0, pct(d?.salaires_total || 0, chargesTotal))
  csv += row('TOTAL CHARGES', chargesTotal, '100%')
  csv += nl
  csv += row('BÉNÉFICE NET', benefice, '')
  csv += row('MARGE NETTE', marge + '%', '')

  // Artistes
  if (data.artistes.length > 0) {
    csv += section('2. ARTISTES & CACHETS')
    csv += row('ARTISTE', 'DATE', 'STATUT', 'CACHET TOTAL', 'REÇU', 'RESTE')
    data.artistes.forEach(a => {
      const statuts: Record<string, string> = { en_negociation: 'En négociation', confirme: 'Confirmé', paye: 'Payé', annule: 'Annulé' }
      csv += row(
        a.nom_artiste,
        a.date_prestation ? new Date(a.date_prestation).toLocaleDateString('fr-FR') : '—',
        statuts[a.statut] || a.statut,
        a.cachet,
        a.cachet_paye || 0,
        a.cachet - (a.cachet_paye || 0)
      )
    })
    csv += row('TOTAL', '', '',
      data.artistes.reduce((s, a) => s + a.cachet, 0),
      data.artistes.reduce((s, a) => s + (a.cachet_paye || 0), 0),
      data.artistes.reduce((s, a) => s + a.cachet - (a.cachet_paye || 0), 0)
    )
  }

  // Dépenses
  if (data.depenses.length > 0) {
    const CATEG: Record<string, string> = {
      cachet_artiste: 'Cachets artistes', communication: 'Communication',
      logistique: 'Logistique', location_materiel: 'Location matériel',
      transport: 'Transport', securite: 'Sécurité',
      electricite: 'Électricité', restauration_equipe: 'Restauration équipe', divers: 'Divers',
    }
    csv += section('3. DÉTAIL DES DÉPENSES')
    csv += row('DATE', 'LIBELLÉ', 'CATÉGORIE', 'BÉNÉFICIAIRE', 'MONTANT')
    data.depenses.forEach(dep => {
      csv += row(
        new Date(dep.date).toLocaleDateString('fr-FR'),
        dep.libelle, CATEG[dep.categorie] || dep.categorie,
        dep.beneficiaire || '—', dep.montant
      )
    })
    csv += row('', '', '', 'TOTAL', data.depenses.reduce((s, x) => s + x.montant, 0))
  }

  // Stands
  if (data.declarationsStands.length > 0) {
    csv += section('4. PERFORMANCE DES STANDS')
    csv += row('STAND', 'CA DÉCLARÉ', 'MONTANT DÛ', 'PAYÉ', 'SOLDE')
    const standMap: Record<string, any> = {}
    data.declarationsStands.forEach((d: any) => {
      const nom = d.stands_nourriture?.nom || d.stand_id
      if (!standMap[nom]) standMap[nom] = { nom, ca: 0, du: 0, paye: 0 }
      standMap[nom].ca += d.ca_declare || 0
      standMap[nom].du += d.montant_du || 0
      standMap[nom].paye += d.montant_paye || 0
    })
    Object.values(standMap).forEach((s: any) => {
      csv += row(s.nom, s.ca, s.du, s.paye, s.du - s.paye)
    })
  }

  const blob = new Blob([csv], { type: 'text/tab-separated-values;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `SDC_Manager_Rapport_${now.toISOString().split('T')[0]}.xls`
  a.click()
  URL.revokeObjectURL(url)
}
