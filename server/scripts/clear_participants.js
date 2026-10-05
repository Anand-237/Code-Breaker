const { getDb } = require('../config/firebase');
const fs = require('fs');
const path = require('path');

async function clearParticipants() {
  const db = getDb();
  console.log('--- Cleaning up participants from Firestore ---');

  // 1. Delete participants from Firestore
  const usersSnap = await db.collection('users').get();
  let deletedCount = 0;
  let adminUser = null;

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    if (data.role === 'admin' || data.username === 'admin') {
      adminUser = { _id: doc.id, ...data };
      console.log(` Preserving admin account: "${data.username}" (ID: ${doc.id})`);
    } else {
      await db.collection('users').doc(doc.id).delete();
      deletedCount++;
      console.log(` Deleted participant: "${data.username || data.name}" (ID: ${doc.id})`);
    }
  }
  console.log(`Deleted ${deletedCount} participant(s) from Firestore.`);

  // 2. Clear old submissions from Firestore
  const subSnap = await db.collection('submissions').get();
  let subDeleted = 0;
  for (const doc of subSnap.docs) {
    await db.collection('submissions').doc(doc.id).delete();
    subDeleted++;
  }
  console.log(`Deleted ${subDeleted} old submission(s) from Firestore.`);

  // 3. Update backup files to only contain admin
  const adminBackup = adminUser ? [{
    _id: String(adminUser._id || adminUser.id),
    name: adminUser.name || 'Event Admin',
    username: adminUser.username || 'admin',
    password: adminUser.password,
    role: 'admin',
    teamName: adminUser.teamName || 'Event Admin',
    isActive: true,
    createdAt: adminUser.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }] : [];

  const backupPaths = [
    path.join(__dirname, '../../users_backup.json'),
    path.join(__dirname, '../users_backup.json'),
    path.join(__dirname, '../data/users_backup.json')
  ];

  for (const p of backupPaths) {
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, JSON.stringify(adminBackup, null, 2), 'utf-8');
      console.log(` Updated user backup at: ${p}`);
    } catch (e) {
      console.error(` Error writing backup ${p}:`, e.message);
    }
  }

  const subBackupPaths = [
    path.join(__dirname, '../../submissions_backup.json'),
    path.join(__dirname, '../submissions_backup.json'),
    path.join(__dirname, '../data/submissions_backup.json')
  ];

  for (const p of subBackupPaths) {
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, JSON.stringify([], null, 2), 'utf-8');
      console.log(` Cleared submission backup at: ${p}`);
    } catch (e) {
      console.error(` Error writing sub backup ${p}:`, e.message);
    }
  }

  console.log('\n--- Cleanup complete! Current Users in Firestore: ---');
  const remainingUsers = await db.collection('users').get();
  console.log(`Total users in Firestore: ${remainingUsers.size}`);
  remainingUsers.forEach(d => {
    console.log(` - ${d.data().username} (Role: ${d.data().role})`);
  });
}

clearParticipants()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
