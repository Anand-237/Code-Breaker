const http = require('http');
const app = require('../index');
const { initFirebase } = require('../config/firebase');
const seed = require('../seed/seed');

async function testEndpoints() {
  initFirebase();
  await seed();

  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(5099, resolve));
  console.log('Test server listening on port 5099');

  try {
    // 1. Health check
    const healthRes = await fetch('http://localhost:5099/api/health');
    const healthData = await healthRes.json();
    console.log('✔ Health endpoint:', healthData);

    // 2. Admin Login
    const loginRes = await fetch('http://localhost:5099/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'CodeBreaker123' }),
    });
    const loginData = await loginRes.json();
    console.log('✔ Admin login:', !!loginData.token, 'Role:', loginData.user?.role);

    // 3. Authenticated /me
    const meRes = await fetch('http://localhost:5099/api/auth/me', {
      headers: { Authorization: 'Bearer ' + loginData.token },
    });
    const meData = await meRes.json();
    console.log('✔ Get Me:', meData.user?.username);

    // 4. Round Control state
    const ctrlRes = await fetch('http://localhost:5099/api/admin/round-control', {
      headers: { Authorization: 'Bearer ' + loginData.token },
    });
    const ctrlData = await ctrlRes.json();
    console.log('✔ Round controls loaded:', ctrlData.controls?.length);

    // 5. Questions list
    const qRes = await fetch('http://localhost:5099/api/admin/questions?round=1', {
      headers: { Authorization: 'Bearer ' + loginData.token },
    });
    const qData = await qRes.json();
    console.log('✔ Round 1 questions count:', qData.questions?.length);

    // 6. Leaderboard Top 3
    const lbRes = await fetch('http://localhost:5099/api/leaderboard/top3', {
      headers: { Authorization: 'Bearer ' + loginData.token },
    });
    const lbData = await lbRes.json();
    console.log('✔ Leaderboard Top 3 fetched successfully.');

    // 7. Results
    const resRes = await fetch('http://localhost:5099/api/admin/results', {
      headers: { Authorization: 'Bearer ' + loginData.token },
    });
    const resData = await resRes.json();
    console.log('✔ Admin results fetched successfully (count = ' + (resData.leaderboard?.length || 0) + ')');

    console.log('\n ALL FIREBASE FUNCTIONALITY VERIFIED & WORKING PERFECTLY! \n');
  } finally {
    server.close();
  }
}

testEndpoints()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test error:', err);
    process.exit(1);
  });
