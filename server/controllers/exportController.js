const ExcelJS = require('exceljs');
const { Parser } = require('json2csv');
const Submission = require('../models/Submission');
const User = require('../models/User');
const Round1Question = require('../models/Round1Question');
const Round2Question = require('../models/Round2Question');
const Round3Question = require('../models/Round3Question');

const QUESTION_MODELS = {
  1: Round1Question,
  2: Round2Question,
  3: Round3Question,
};

/**
 * GET /api/admin/export/:round
 * Export per-round results as CSV or XLSX
 * Query: ?format=csv (default) | xlsx
 */
const exportRound = async (req, res) => {
  try {
    const round = parseInt(req.params.round, 10);
    const format = req.query.format || 'xlsx';

    if (![1, 2, 3].includes(round)) {
      return res.status(400).json({ message: 'Invalid round number' });
    }

    const submissions = await Submission.find({ round, status: { $in: ['submitted', 'pending-review'] } })
      .populate('userId', 'name username teamName');

    const QuestionModel = QUESTION_MODELS[round];
    const questions = await QuestionModel.find({ isActive: true }).sort({ order: 1 });
    const questionMap = {};
    questions.forEach((q) => (questionMap[q._id.toString()] = q));

    const rows = submissions.map((sub) => {
      const row = {
        'Team Name': sub.userId?.teamName || sub.userId?.name || sub.userId?.username || 'Unknown',
        'Total Score': sub.totalScore,
        Status: sub.status,
        'Submitted At': sub.submittedAt ? sub.submittedAt.toISOString() : '',
      };
      sub.answers.forEach((ans, i) => {
        const q = questionMap[ans.questionId?.toString()];
        const label = q ? q.title || q.questionText || `Q${i + 1}` : `Q${i + 1}`;
        row[`${label} (Answer)`] = String(ans.submittedAnswer ?? '');
        row[`${label} (Correct?)`] = ans.isCorrect ? 'Yes' : 'No';
        row[`${label} (Points)`] = ans.pointsAwarded;
      });
      return row;
    });

    const filename = `round${round}_results`;

    if (format === 'csv') {
      const parser = new Parser();
      const csv = parser.parse(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csv);
    }

    // XLSX
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Round ${round} Results`);
    if (rows.length > 0) {
      sheet.columns = Object.keys(rows[0]).map((key) => ({ header: key, key, width: 25 }));
      rows.forEach((row) => sheet.addRow(row));
      // Header styling
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1a1a1a' },
      };
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('exportRound error:', err);
    res.status(500).json({ message: 'Export failed' });
  }
};

/**
 * GET /api/admin/export/overall
 * Export cumulative results across all rounds
 */
const exportOverall = async (req, res) => {
  try {
    const format = req.query.format || 'xlsx';
    const participants = await User.find({ role: 'participant', isActive: true });
    const submissions = await Submission.find({ status: { $in: ['submitted', 'pending-review'] } })
      .populate('userId', 'name username teamName');

    const subMap = {};
    submissions.forEach((sub) => {
      const uid = sub.userId?._id?.toString();
      if (!uid) return;
      if (!subMap[uid]) subMap[uid] = { r1: 0, r2: 0, r3: 0 };
      subMap[uid][`r${sub.round}`] = sub.totalScore;
    });

    const rows = participants.map((p) => {
      const uid = p._id.toString();
      const scores = subMap[uid] || { r1: 0, r2: 0, r3: 0 };
      return {
        'Team Name': p.teamName || p.name || p.username,
        'Round 1 Score': scores.r1,
        'Round 2 Score': scores.r2,
        'Round 3 Score': scores.r3,
        'Cumulative Score': scores.r1 + scores.r2 + scores.r3,
      };
    }).sort((a, b) => b['Cumulative Score'] - a['Cumulative Score']);

    if (format === 'csv') {
      const parser = new Parser();
      const csv = parser.parse(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="overall_results.csv"');
      return res.send(csv);
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Overall Results');
    if (rows.length > 0) {
      sheet.columns = Object.keys(rows[0]).map((key) => ({ header: key, key, width: 22 }));
      rows.forEach((row) => sheet.addRow(row));
      sheet.getRow(1).font = { bold: true };
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="overall_results.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('exportOverall error:', err);
    res.status(500).json({ message: 'Export failed' });
  }
};

module.exports = { exportRound, exportOverall };
