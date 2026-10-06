const app = require('../server/index.js');
const { initFirebase } = require('../server/config/firebase.js');

let isInitialized = false;

function setupDatabase() {
  if (isInitialized) return;
  try {
    initFirebase();
    isInitialized = true;
  } catch (err) {
    console.error('Firebase serverless setup warning:', err.message);
  }
}

module.exports = async (req, res) => {
  try {
    setupDatabase();
    return app(req, res);
  } catch (err) {
    console.error('API initialization error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Server/database connection failed',
    });
  }
};
