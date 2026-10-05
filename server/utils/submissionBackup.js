const fs = require('fs');
const path = require('path');
const Submission = require('../models/Submission');

const BACKUP_PATHS = [
  path.join(__dirname, '../data/submissions_backup.json'),
  path.join(__dirname, '../submissions_backup.json'),
  path.join(__dirname, '../../submissions_backup.json'),
];

function cleanUndefined(obj) {
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    const clean = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        clean[key] = cleanUndefined(val);
      }
    }
    return clean;
  }
  return obj;
}

/**
 * Save all submission records to JSON backup files so participant scores
 * persist reliably across server restarts.
 */
const saveSubmissionBackup = async () => {
  try {
    const submissions = await Submission.find({}).lean();

    if (!submissions || submissions.length === 0) {
      return;
    }

    const backupData = submissions.map((s) => ({
      ...s,
      _id: s._id ? String(s._id) : undefined,
      id: s.id ? String(s.id) : undefined,
      userId: s.userId ? String(s.userId._id || s.userId.id || s.userId) : null,
      adminReviewedBy: s.adminReviewedBy ? String(s.adminReviewedBy._id || s.adminReviewedBy.id || s.adminReviewedBy) : null,
      answers: (s.answers || []).map((a) => ({
        ...a,
        _id: a._id ? String(a._id) : undefined,
        questionId: a.questionId ? String(a.questionId._id || a.questionId.id || a.questionId) : null,
      })),
    }));

    const jsonStr = JSON.stringify(backupData, null, 2);
    let savedAny = false;

    for (const fileLoc of BACKUP_PATHS) {
      try {
        const dataDir = path.dirname(fileLoc);
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(fileLoc, jsonStr, 'utf-8');
        savedAny = true;
      } catch (_) {
        // Skip if directory is read-only
      }
    }

    if (savedAny) {
      console.log(` [BACKUP] Saved ${backupData.length} submission score record(s) to backup JSON.`);
    }
  } catch (err) {
    console.error(' [BACKUP] Failed to save submissions backup:', err.message);
  }
};

/**
 * Restore submission records from JSON backup files into Firebase Firestore if missing.
 */
const restoreSubmissionBackup = async () => {
  try {
    let restoredCount = 0;
    let backupSubmissions = [];

    for (const fileLoc of BACKUP_PATHS) {
      try {
        if (fs.existsSync(fileLoc)) {
          const content = fs.readFileSync(fileLoc, 'utf-8');
          if (content && content.trim()) {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed) && parsed.length > 0) {
              backupSubmissions = parsed;
              break;
            }
          }
        }
      } catch (_) {
        // Try next location
      }
    }

    if (backupSubmissions.length === 0) return;

    for (const subData of backupSubmissions) {
      if (!subData.userId || !subData.round) continue;
      try {
        const existing = await Submission.findOne({
          $or: [
            { _id: subData._id },
            { id: subData._id },
            { userId: subData.userId, round: subData.round },
          ],
        });
        if (!existing) {
          const doc = cleanUndefined({
            ...subData,
            _id: String(subData._id || subData.id),
            id: String(subData._id || subData.id),
            userId: String(subData.userId),
            adminReviewedBy: subData.adminReviewedBy ? String(subData.adminReviewedBy) : null,
            startedAt: subData.startedAt ? new Date(subData.startedAt) : new Date(),
            submittedAt: subData.submittedAt ? new Date(subData.submittedAt) : null,
            createdAt: subData.createdAt ? new Date(subData.createdAt) : new Date(),
            updatedAt: subData.updatedAt ? new Date(subData.updatedAt) : new Date(),
            answers: (subData.answers || []).map((a) => cleanUndefined({
              ...a,
              _id: a._id ? String(a._id) : null,
              questionId: a.questionId ? String(a.questionId) : null,
            })),
          });

          await Submission.create(doc);
          restoredCount++;
        }
      } catch (subErr) {
        console.warn(` [BACKUP] Skip single submission restore for user "${subData.userId}" round ${subData.round}:`, subErr.message);
      }
    }

    if (restoredCount > 0) {
      console.log(` [BACKUP] Restored ${restoredCount} submission score record(s) from JSON backup.`);
    }
  } catch (err) {
    console.error(' [BACKUP] Failed to restore submissions from backup:', err.message);
  }
};

module.exports = { saveSubmissionBackup, restoreSubmissionBackup };
