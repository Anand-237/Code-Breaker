const PDFDocument = require('pdfkit');

/**
 * Generate a high-resolution, professionally styled PDF leaderboard of all participants.
 * @param {Array} leaderboard - Ranked list of participant objects with scores and timestamps
 * @param {Object} options - Optional contest metadata
 * @returns {Promise<Buffer>} - Resolves with PDF binary Buffer
 */
function generateRankingsPdf(leaderboard = [], options = {}) {
  return new Promise((resolve, reject) => {
    try {
      // Filter out invalid/empty entries so "Unknown" is never shown
      const validLeaderboard = (leaderboard || []).filter((p) => p && (p.teamName || p.name || p.username));

      const doc = new PDFDocument({
        size: 'A4',
        margin: 36,
        info: {
          Title: 'Code Breakers - Official Final Rankings',
          Author: 'Code Breakers Event Committee',
          Subject: 'Final Event Leaderboard & Rankings',
        },
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      const totalParticipants = validLeaderboard.length;
      const topScore = validLeaderboard.length > 0 ? (validLeaderboard[0].totalScore ?? validLeaderboard[0].cumulative ?? 0) : 0;
      const avgScore = validLeaderboard.length > 0
        ? Math.round(validLeaderboard.reduce((acc, p) => acc + (p.totalScore ?? p.cumulative ?? 0), 0) / totalParticipants)
        : 0;

      // ─── 1. HEADER SECTION ────────────────────────────────────────────────
      // Dark Header Banner
      doc.rect(0, 0, doc.page.width, 95).fill('#0f172a');

      // Title & Event Branding
      doc.fillColor('#4ade80')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('CODE BREAKERS', 36, 22, { characterSpacing: 1.5 });

      doc.fillColor('#94a3b8')
        .fontSize(10)
        .font('Helvetica')
        .text('OFFICIAL EVENT LEADERBOARD & FINAL PARTICIPANT RANKINGS', 36, 50, { characterSpacing: 1 });

      const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      doc.fillColor('#64748b')
        .fontSize(8.5)
        .text(`Certified Event Results • Released: ${dateStr}`, 36, 70);

      // ─── 2. SUMMARY KPI CARDS ─────────────────────────────────────────────
      const cardY = 110;
      const cardWidth = (doc.page.width - 72 - 24) / 3;
      const cardHeight = 46;

      const stats = [
        { label: 'TOTAL PARTICIPANTS', value: `${totalParticipants} TEAMS`, color: '#3b82f6' },
        { label: 'TOP SCORE (CHAMPION)', value: `${topScore} / 100 PTS`, color: '#10b981' },
        { label: 'AVERAGE SCORE', value: `${avgScore} / 100 PTS`, color: '#8b5cf6' },
      ];

      stats.forEach((st, i) => {
        const cx = 36 + i * (cardWidth + 12);
        doc.roundedRect(cx, cardY, cardWidth, cardHeight, 6)
          .fillAndStroke('#f8fafc', '#e2e8f0');

        doc.fillColor('#64748b')
          .fontSize(7.5)
          .font('Helvetica-Bold')
          .text(st.label, cx + 10, cardY + 8);

        doc.fillColor(st.color)
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(st.value, cx + 10, cardY + 23);
      });

      // ─── 3. RANKINGS TABLE ────────────────────────────────────────────────
      let startY = 175;
      const tableHeaders = [
        { title: 'RANK', width: 45, align: 'center' },
        { title: 'TEAM / PARTICIPANT', width: 140, align: 'left' },
        { title: 'USERNAME', width: 85, align: 'left' },
        { title: 'R1 (/30)', width: 50, align: 'center' },
        { title: 'R2 (/30)', width: 50, align: 'center' },
        { title: 'R3 (/40)', width: 50, align: 'center' },
        { title: 'TOTAL (/100)', width: 65, align: 'center' },
        { title: 'ACCURACY', width: 40, align: 'center' },
      ];

      // Table Header Row
      doc.rect(36, startY, doc.page.width - 72, 22).fill('#1e293b');

      let currentX = 36;
      doc.fillColor('#f8fafc').font('Helvetica-Bold').fontSize(8);
      tableHeaders.forEach((th) => {
        doc.text(th.title, currentX, startY + 7, { width: th.width, align: th.align });
        currentX += th.width;
      });

      let rowY = startY + 22;

      validLeaderboard.forEach((p, idx) => {
        const rank = idx + 1;
        const isTop3 = rank <= 3;
        const rowHeight = 22;

        // Check for page overflow
        if (rowY + rowHeight > doc.page.height - 50) {
          doc.addPage();
          rowY = 36;
        }

        // Row background shading
        let rowBg = (idx % 2 === 0) ? '#ffffff' : '#f8fafc';
        if (rank === 1) rowBg = '#fefce8'; // Gold row highlight
        else if (rank === 2) rowBg = '#f1f5f9'; // Silver row highlight
        else if (rank === 3) rowBg = '#fff7ed'; // Bronze row highlight

        doc.rect(36, rowY, doc.page.width - 72, rowHeight).fillAndStroke(rowBg, '#e2e8f0');

        let colX = 36;
        doc.font('Helvetica').fontSize(8.5);

        // Rank column
        let rankText = `#${rank}`;
        if (rank === 1) rankText = '1 [GOLD]';
        else if (rank === 2) rankText = '2 [SLV]';
        else if (rank === 3) rankText = '3 [BRZ]';

        doc.font(isTop3 ? 'Helvetica-Bold' : 'Helvetica')
          .fillColor(rank === 1 ? '#b45309' : rank === 2 ? '#475569' : rank === 3 ? '#c2410c' : '#1e293b')
          .text(rankText, colX, rowY + 6, { width: tableHeaders[0].width, align: 'center' });
        colX += tableHeaders[0].width;

        // Team Name
        const teamName = p.teamName || p.name || p.username;
        doc.font(isTop3 ? 'Helvetica-Bold' : 'Helvetica')
          .fillColor('#0f172a')
          .text(
            teamName.length > 22 ? teamName.substring(0, 20) + '...' : teamName,
            colX + 4,
            rowY + 6,
            { width: tableHeaders[1].width - 8, align: 'left' }
          );
        colX += tableHeaders[1].width;

        // Username
        const username = p.username || '';
        doc.font('Helvetica')
          .fillColor('#64748b')
          .text(
            username.length > 14 ? username.substring(0, 12) + '...' : username,
            colX + 2,
            rowY + 6,
            { width: tableHeaders[2].width - 4, align: 'left' }
          );
        colX += tableHeaders[2].width;

        // Round scores
        const r1 = p.roundScores ? (p.roundScores[1] ?? 0) : (p.r1 ?? 0);
        const r2 = p.roundScores ? (p.roundScores[2] ?? 0) : (p.r2 ?? 0);
        const r3 = p.roundScores ? (p.roundScores[3] ?? 0) : (p.r3 ?? 0);
        const total = p.totalScore ?? p.cumulative ?? (r1 + r2 + r3);
        const accuracy = `${Math.round((total / 100) * 100)}%`;

        doc.fillColor('#334155').text(String(r1), colX, rowY + 6, { width: tableHeaders[3].width, align: 'center' });
        colX += tableHeaders[3].width;

        doc.fillColor('#334155').text(String(r2), colX, rowY + 6, { width: tableHeaders[4].width, align: 'center' });
        colX += tableHeaders[4].width;

        doc.fillColor('#334155').text(String(r3), colX, rowY + 6, { width: tableHeaders[5].width, align: 'center' });
        colX += tableHeaders[5].width;

        // Total
        doc.font('Helvetica-Bold')
          .fillColor(isTop3 ? '#059669' : '#0f172a')
          .text(`${total}`, colX, rowY + 6, { width: tableHeaders[6].width, align: 'center' });
        colX += tableHeaders[6].width;

        // Accuracy
        doc.font('Helvetica')
          .fillColor('#64748b')
          .text(accuracy, colX, rowY + 6, { width: tableHeaders[7].width, align: 'center' });

        rowY += rowHeight;
      });

      // ─── 4. FOOTER SECTION ────────────────────────────────────────────────
      const footerY = doc.page.height - 30;
      doc.fontSize(7.5).fillColor('#94a3b8').font('Helvetica')
        .text('Code Breakers Official Competition Results • Automated Certification System', 36, footerY, { align: 'center', width: doc.page.width - 72 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateRankingsPdf };
