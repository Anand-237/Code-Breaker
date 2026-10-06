import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Builds a styled, official Code Breakers Leaderboard PDF using jsPDF & autoTable.
 * @param {Array} leaderboard - Ranked array of participants
 * @returns {jsPDF} - jsPDF document instance
 */
export function buildRankingsPdfDoc(leaderboard = []) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  })

  const validLeaderboard = (leaderboard || []).filter(
    (p) => p && (p.teamName || p.name || p.username)
  )

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const totalParticipants = validLeaderboard.length
  const topScore =
    validLeaderboard.length > 0 ? (validLeaderboard[0].totalScore ?? 0) : 0
  const avgScore =
    validLeaderboard.length > 0
      ? Math.round(
          validLeaderboard.reduce((acc, p) => acc + (p.totalScore ?? 0), 0) /
            totalParticipants
        )
      : 0

  // ─── 1. HEADER SECTION ───────────────────────────────────────────────────────
  // Header background rectangle
  doc.setFillColor(15, 23, 42) // #0f172a
  doc.rect(0, 0, pageWidth, 90, 'F')

  // Main Event Title
  doc.setTextColor(74, 222, 128) // #4ade80
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('CODE BREAKERS', 36, 36)

  // Subtitle
  doc.setTextColor(148, 163, 184) // #94a3b8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.text(
    'OFFICIAL EVENT LEADERBOARD & FINAL PARTICIPANT RANKINGS',
    36,
    56
  )

  // Date stamp
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  doc.setTextColor(100, 116, 139) // #64748b
  doc.setFontSize(8)
  doc.text(`Certified Event Results • Released: ${dateStr}`, 36, 74)

  // ─── 2. KPI SUMMARY CARDS ───────────────────────────────────────────────────
  const cardY = 105
  const cardGap = 12
  const cardWidth = (pageWidth - 72 - cardGap * 2) / 3
  const cardHeight = 44

  const stats = [
    {
      label: 'TOTAL PARTICIPANTS',
      value: `${totalParticipants} TEAMS`,
      color: [59, 130, 246], // #3b82f6
    },
    {
      label: 'TOP SCORE (CHAMPION)',
      value: `${topScore} / 100 PTS`,
      color: [16, 185, 129], // #10b981
    },
    {
      label: 'AVERAGE SCORE',
      value: `${avgScore} / 100 PTS`,
      color: [139, 92, 246], // #8b5cf6
    },
  ]

  stats.forEach((st, i) => {
    const cx = 36 + i * (cardWidth + cardGap)

    // Card background & border
    doc.setFillColor(248, 250, 252) // #f8fafc
    doc.setDrawColor(226, 232, 240) // #e2e8f0
    doc.setLineWidth(1)
    doc.roundedRect(cx, cardY, cardWidth, cardHeight, 4, 4, 'FD')

    // Card Label
    doc.setTextColor(100, 116, 139) // #64748b
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.text(st.label, cx + 10, cardY + 14)

    // Card Value
    doc.setTextColor(st.color[0], st.color[1], st.color[2])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(st.value, cx + 10, cardY + 32)
  })

  // ─── 3. RANKINGS TABLE (autoTable) ──────────────────────────────────────────
  const tableData = validLeaderboard.map((p, idx) => {
    const rank = idx + 1
    let rankLabel = `#${rank}`
    if (rank === 1) rankLabel = '#1 (GOLD)'
    else if (rank === 2) rankLabel = '#2 (SILVER)'
    else if (rank === 3) rankLabel = '#3 (BRONZE)'

    const r1 = p.roundScores ? (p.roundScores[1] ?? 0) : (p.r1 ?? 0)
    const r2 = p.roundScores ? (p.roundScores[2] ?? 0) : (p.r2 ?? 0)
    const r3 = p.roundScores ? (p.roundScores[3] ?? 0) : (p.r3 ?? 0)
    const total = p.totalScore ?? (r1 + r2 + r3)
    const accuracy = `${Math.round((total / 100) * 100)}%`

    return [
      rankLabel,
      p.teamName || p.name || p.username || 'Team',
      `@${p.username || ''}`,
      r1,
      r2,
      r3,
      total,
      accuracy,
    ]
  })

  autoTable(doc, {
    startY: 165,
    margin: { left: 36, right: 36 },
    head: [
      [
        'RANK',
        'TEAM / PARTICIPANT',
        'USERNAME',
        'R1 (/30)',
        'R2 (/30)',
        'R3 (/40)',
        'TOTAL (/100)',
        'ACCURACY',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // #1e293b
      textColor: [248, 250, 252],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', cellWidth: 70 },
      1: { halign: 'left', fontStyle: 'bold' },
      2: { halign: 'left', textColor: [100, 116, 139], cellWidth: 80 },
      3: { halign: 'center', cellWidth: 46 },
      4: { halign: 'center', cellWidth: 46 },
      5: { halign: 'center', cellWidth: 46 },
      6: { halign: 'center', fontStyle: 'bold', textColor: [5, 150, 105], cellWidth: 60 },
      7: { halign: 'center', textColor: [100, 116, 139], cellWidth: 50 },
    },
    didParseCell: (data) => {
      // Shading for Gold, Silver, Bronze
      if (data.section === 'body') {
        if (data.row.index === 0) {
          data.cell.styles.fillColor = [254, 252, 232] // gold row highlight
          if (data.column.index === 0) data.cell.styles.textColor = [180, 83, 9] // amber gold text
        } else if (data.row.index === 1) {
          data.cell.styles.fillColor = [241, 245, 249] // silver row highlight
          if (data.column.index === 0) data.cell.styles.textColor = [71, 85, 105] // slate silver text
        } else if (data.row.index === 2) {
          data.cell.styles.fillColor = [255, 247, 237] // bronze row highlight
          if (data.column.index === 0) data.cell.styles.textColor = [194, 65, 12] // bronze text
        }
      }
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 5,
    },
  })

  // ─── 4. FOOTER ──────────────────────────────────────────────────────────────
  const finalY = doc.lastAutoTable.finalY || 300
  const footerY = Math.max(pageHeight - 24, finalY + 30)

  doc.setTextColor(148, 163, 184) // #94a3b8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(
    'Code Breakers Official Competition Results • Automated Certification System',
    pageWidth / 2,
    Math.min(footerY, pageHeight - 16),
    { align: 'center' }
  )

  return doc
}

/**
 * Generates and triggers instant native file download of the PDF certificate.
 */
export function downloadRankingsPdf(leaderboard = []) {
  try {
    const doc = buildRankingsPdfDoc(leaderboard)
    doc.save('CodeBreakers_Final_Rankings.pdf')
    return true
  } catch (err) {
    console.error('jsPDF download error:', err)
    return false
  }
}

/**
 * Returns a Blob URL for inline PDF iframe / object previewing.
 */
export function getRankingsPdfBlobUrl(leaderboard = []) {
  try {
    const doc = buildRankingsPdfDoc(leaderboard)
    const blob = doc.output('blob')
    return window.URL.createObjectURL(blob)
  } catch (err) {
    console.error('jsPDF blob URL error:', err)
    return null
  }
}
