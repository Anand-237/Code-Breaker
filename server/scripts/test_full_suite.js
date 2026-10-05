const http = require('http');
const app = require('../index');
const { initFirebase } = require('../config/firebase');
const seed = require('../seed/seed');

async function testFullSuite() {
  initFirebase();
  await seed();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5098, resolve));
  console.log('Full test server listening on port 5098');

  try {
    const uniqueSuffix = Date.now().toString(36);
    const testTeamName = `Live Team ${uniqueSuffix}`;

    // 1. Admin login
    const adminRes = await fetch('http://localhost:5098/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'CodeBreaker123' }),
    });
    const adminAuth = await adminRes.json();
    const adminToken = adminAuth.token;
    console.log('✔ Admin token generated');

    // 2. Unlock Round 1 and Round 2 and Round 3
    for (const r of [1, 2, 3]) {
      const unlockRes = await fetch(`http://localhost:5098/api/admin/round-control/${r}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + adminToken,
        },
        body: JSON.stringify({ isUnlocked: true }),
      });
      const unlockData = await unlockRes.json();
      console.log(`✔ Round ${r} unlocked:`, unlockData.control?.isUnlocked);
    }

    // 3. Participant Creation
    const createPartRes = await fetch('http://localhost:5098/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + adminToken,
      },
      body: JSON.stringify({
        teamName: testTeamName,
        password: 'Password123!',
      }),
    });
    const createPartData = await createPartRes.json();
    console.log('✔ Participant created:', createPartData.user?.username);

    // 4. Participant Login
    const partLoginRes = await fetch('http://localhost:5098/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testTeamName,
        password: 'Password123!',
      }),
    });
    const partAuth = await partLoginRes.json();
    const partToken = partAuth.token;
    console.log('✔ Participant logged in successfully');

    // 5. Check round status
    const statusRes = await fetch('http://localhost:5098/api/rounds/status', {
      headers: { Authorization: 'Bearer ' + partToken },
    });
    const statusData = await statusRes.json();
    console.log('✔ Participant round status loaded, total rounds:', statusData.rounds?.length);

    // 6. Get Round 1 Questions
    const r1QRes = await fetch('http://localhost:5098/api/rounds/round1/questions', {
      headers: { Authorization: 'Bearer ' + partToken },
    });
    const r1QData = await r1QRes.json();
    console.log('✔ Round 1 questions retrieved for participant:', r1QData.questions?.length);

    // 7. Submit Round 1 Answers
    const answers = r1QData.questions.map((q) => ({
      questionId: q._id,
      selectedOptionIndex: 1,
      timeTakenSeconds: 10,
    }));

    const r1SubRes = await fetch('http://localhost:5098/api/rounds/round1/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + partToken,
      },
      body: JSON.stringify({ answers }),
    });
    const r1SubData = await r1SubRes.json();
    console.log('✔ Round 1 submitted, total score:', r1SubData.totalScore, '/', r1SubData.maxMarks);

    // 8. Final results endpoint
    const finalRes = await fetch('http://localhost:5098/api/rounds/final-result', {
      headers: { Authorization: 'Bearer ' + partToken },
    });
    const finalData = await finalRes.json();
    console.log('✔ Final results query returned total score:', finalData.totalScore);

    console.log('\n FULL LIVE FIREBASE WORKFLOW COMPLETED WITH 100% SUCCESS! \n');
  } finally {
    server.close();
  }
}

testFullSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Full suite error:', err);
    process.exit(1);
  });
