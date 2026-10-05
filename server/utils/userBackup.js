const fs = require('fs');
const path = require('path');
const User = require('../models/User');

const BACKUP_PATHS = [
  path.join(__dirname, '../users_backup.json'),
  path.join(__dirname, '../../users_backup.json'),
  path.join(__dirname, '../data/users_backup.json'),
];

/**
 * Save all participant accounts (and admin accounts) to JSON backup file
 */
const saveUserBackup = async () => {
  try {
    const users = await User.find({});

    if (!users || users.length === 0) {
      return;
    }

    const backupData = users.map((u) => ({
      _id: String(u._id || u.id),
      name: u.name,
      username: u.username,
      password: u.password, // hashed password
      role: u.role,
      teamName: u.teamName,
      isActive: u.isActive !== undefined ? u.isActive : true,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    for (const fileLoc of BACKUP_PATHS) {
      try {
        const dataDir = path.dirname(fileLoc);
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(fileLoc, JSON.stringify(backupData, null, 2), 'utf-8');
      } catch (_) {
        // Continue if single file location fails
      }
    }
    console.log(`💾 [BACKUP] Saved ${backupData.length} users to backup JSON files.`);
  } catch (err) {
    console.error('❌ [BACKUP] Failed to save users backup:', err.message);
  }
};

/**
 * Restore users from JSON backup files into Firebase Firestore database if missing
 */
const restoreUserBackup = async () => {
  try {
    let backupUsers = [];

    for (const fileLoc of BACKUP_PATHS) {
      try {
        if (fs.existsSync(fileLoc)) {
          const content = fs.readFileSync(fileLoc, 'utf-8');
          if (content && content.trim()) {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed) && parsed.length > 0) {
              backupUsers = parsed;
              break; // Found valid backup file
            }
          }
        }
      } catch (_) {
        // Try next location
      }
    }

    if (!Array.isArray(backupUsers) || backupUsers.length === 0) return;

    let restoredCount = 0;

    for (const uData of backupUsers) {
      if (!uData.username) continue;
      try {
        const existing = await User.findOne({ username: uData.username });
        if (!existing) {
          const userDoc = {
            _id: String(uData._id || uData.id),
            name: uData.name || uData.teamName || uData.username,
            username: uData.username,
            password: uData.password, // already hashed
            role: uData.role || 'participant',
            teamName: uData.teamName || uData.name || '',
            isActive: uData.isActive !== undefined ? uData.isActive : true,
            createdAt: uData.createdAt ? new Date(uData.createdAt) : new Date(),
            updatedAt: uData.updatedAt ? new Date(uData.updatedAt) : new Date(),
          };

          await User.create(userDoc);
          restoredCount++;
        }
      } catch (userErr) {
        console.warn(`⚠️ [BACKUP] Skip single user restore for "${uData.username}":`, userErr.message);
      }
    }

    if (restoredCount > 0) {
      console.log(`✅ [BACKUP] Restored ${restoredCount} user(s) from JSON backup into Firestore database.`);
    }
  } catch (err) {
    console.error('❌ [BACKUP] Failed to restore users from backup:', err.message);
  }
};

module.exports = { saveUserBackup, restoreUserBackup };
