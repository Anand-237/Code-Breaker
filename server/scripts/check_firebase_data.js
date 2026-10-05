const { getDb, isMock } = require('../config/firebase');

async function checkFirebaseData() {
  const db = getDb();
  const collections = ['users', 'questions', 'roundcontrols', 'submissions'];

  console.log('====================================================');
  console.log(' 🔥 LIVE FIREBASE FIRESTORE DATA INSPECTION');
  console.log(' Project ID: codebreaker-ed60c');
  console.log(` Mode: ${isMock ? 'Local Fallback' : 'Real Google Cloud Firestore'}`);
  console.log('====================================================\n');

  for (const colName of collections) {
    const snapshot = await db.collection(colName).get();
    console.log(`📁 Collection: [${colName}] → ${snapshot.size} document(s) found`);

    if (snapshot.size === 0) {
      console.log('   (Empty collection)\n');
      continue;
    }

    const previewCount = Math.min(snapshot.size, 5);
    console.log(`   Preview of first ${previewCount} document(s):`);

    snapshot.docs.slice(0, previewCount).forEach((doc, idx) => {
      const data = doc.data();
      let summary = '';
      if (colName === 'users') {
        summary = `Username: "${data.username}", Role: "${data.role}", Name: "${data.name || data.teamName || ''}"`;
      } else if (colName === 'questions') {
        summary = `Round: ${data.round}, Title: "${data.title || ''}", Lang: ${data.language || 'N/A'}`;
      } else if (colName === 'roundcontrols') {
        summary = `Round: ${data.round}, Status: "${data.status}", Duration: ${data.durationMinutes}m`;
      } else if (colName === 'submissions') {
        summary = `User: "${data.user || data.username}", Round: ${data.round}, Score: ${data.score}`;
      } else {
        summary = JSON.stringify(data).slice(0, 80);
      }
      console.log(`   ${idx + 1}. Doc ID: ${doc.id} | ${summary}`);
    });

    console.log('');
  }
}

checkFirebaseData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error inspecting Firebase:', err);
    process.exit(1);
  });
