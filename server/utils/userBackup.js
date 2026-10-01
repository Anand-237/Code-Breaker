const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const BACKUP_FILE = path.join(__dirname, '../data/users_backup.json');

/**
 * Save all participant accounts (and admin accounts) to JSON backup file
 */
const saveUserBackup = async () => {
  try {
    const User = mongoose.model('User');
    const users = await User.find({}).lean();

    if (!users || users.length === 0) {
      console.log('ℹ [BACKUP] No users in database to backup; preserving existing backup file.');
      return;
    }

    const backupData = users.map((u) => ({
      _id: u._id.toString(),
      name: u.name,
      username: u.username,
      password: u.password, // hashed password
      role: u.role,
      teamName: u.teamName,
      isActive: u.isActive !== undefined ? u.isActive : true,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    // Ensure data directory exists if filesystem is writable
    const dataDir = path.dirname(BACKUP_FILE);
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (_) {
        // Read-only filesystem (e.g. Vercel)
      }
    }

    try {
      fs.writeFileSync(BACKUP_FILE, JSON.stringify(backupData, null, 2), 'utf-8');
      console.log(` [BACKUP] Saved ${backupData.length} users to backup JSON file.`);
    } catch (writeErr) {
      console.log('ℹ [BACKUP] Local file write skipped (read-only filesystem). Data persisted in MongoDB Atlas.');
    }
  } catch (err) {
    console.error(' [BACKUP] Failed to save users backup:', err.message);
  }
};

/**
 * Restore users from JSON backup file into MongoDB database if missing
 */
const restoreUserBackup = async () => {
  try {
    if (!fs.existsSync(BACKUP_FILE)) {
      return;
    }

    const fileContent = fs.readFileSync(BACKUP_FILE, 'utf-8');
    if (!fileContent || !fileContent.trim()) return;

    const backupUsers = JSON.parse(fileContent);
    if (!Array.isArray(backupUsers) || backupUsers.length === 0) return;

    const User = mongoose.model('User');
    let restoredCount = 0;

    for (const uData of backupUsers) {
      if (!uData.username) continue;
      try {
        const existing = await User.findOne({
          $or: [{ username: uData.username }, { _id: uData._id }],
        });
        if (!existing) {
          // Use collection.insertOne to prevent re-triggering bcrypt hook on already-hashed password
          const userDoc = {
            _id: new mongoose.Types.ObjectId(uData._id),
            name: uData.name || uData.teamName || uData.username,
            username: uData.username,
            password: uData.password, // already hashed
            role: uData.role || 'participant',
            teamName: uData.teamName || uData.name || '',
            isActive: uData.isActive !== undefined ? uData.isActive : true,
            createdAt: uData.createdAt ? new Date(uData.createdAt) : new Date(),
            updatedAt: uData.updatedAt ? new Date(uData.updatedAt) : new Date(),
          };

          await User.collection.insertOne(userDoc);
          restoredCount++;
        }
      } catch (userErr) {
        console.warn(` [BACKUP] Skip single user restore for "${uData.username}":`, userErr.message);
      }
    }

    if (restoredCount > 0) {
      console.log(` [BACKUP] Restored ${restoredCount} user(s) from JSON backup into database.`);
    }
  } catch (err) {
    console.error(' [BACKUP] Failed to restore users from backup:', err.message);
  }
};

module.exports = { saveUserBackup, restoreUserBackup };
