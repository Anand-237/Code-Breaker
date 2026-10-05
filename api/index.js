const app = require('../server/index.js');
const { initFirebase } = require('../server/config/firebase.js');
const { restoreUserBackup } = require('../server/utils/userBackup.js');
const { restoreSubmissionBackup } = require('../server/utils/submissionBackup.js');
const seed = require('../server/seed/seed.js');

let isInitialized = false;

async function setupDatabase() {
  if (isInitialized) return;

  try {
    initFirebase();
    await restoreUserBackup();
    await restoreSubmissionBackup();
    await seed();
    isInitialized = true;
    console.log('Firebase Firestore & Seed initialization complete for serverless function.');
  } catch (err) {
    console.error('Firebase serverless setup warning:', err.message);
  }
}

module.exports = async (req, res) => {
  try {
    await setupDatabase();
    return app(req, res);
  } catch (err) {
    console.error('API initialization error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Server/database connection failed',
    });
  }
};
