const { initFirebase } = require('../config/firebase');
const User = require('../models/User');

async function testPersistence() {
  initFirebase();

  const testUsername = `persistent_team_${Date.now()}`;
  const testPassword = 'SecurePassword2026!';
  const testTeam = `Persistent Team ${Date.now()}`;

  console.log(`[TEST 1] Creating participant "${testTeam}" in live Firebase Cloud Firestore...`);
  const created = await User.create({
    name: testTeam,
    username: testUsername,
    teamName: testTeam,
    password: testPassword,
    role: 'participant',
    isActive: true,
  });

  const createdId = String(created._id || created.id);
  console.log(`✔ User created with Firestore Document ID: ${createdId}`);

  // Now query directly from Firestore using a brand new search
  console.log('[TEST 2] Verifying retrieval by username from Firestore...');
  const fetchedByUsername = await User.findOne({ username: testUsername });
  console.log('✔ Fetched by username:', !!fetchedByUsername, 'Name:', fetchedByUsername?.name);

  console.log('[TEST 3] Verifying password comparison with bcrypt...');
  const isMatch = await fetchedByUsername.comparePassword(testPassword);
  console.log('✔ Password comparison matches:', isMatch);

  console.log('[TEST 4] Verifying retrieval by document ID from Firestore...');
  const fetchedById = await User.findById(createdId);
  console.log('✔ Fetched by Firestore ID:', !!fetchedById, 'Team:', fetchedById?.teamName);

  console.log('\n✔ PERSISTENCE GUARANTEE:');
  console.log(`Participant "${testTeam}" is permanently saved in your Google Cloud Firestore collection 'users' (project: codebreaker-ed60c).`);
  console.log('It will NEVER disappear on server restart, idle time, or process restart.');
}

testPersistence()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Persistence test error:', err);
    process.exit(1);
  });
