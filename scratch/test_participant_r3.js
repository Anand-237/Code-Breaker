const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (_) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  const loginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin', password: 'CodeBreaker123' });

  const token = loginRes.body.token;

  // Unlock Round 3
  await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/round-control/3',
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, { isUnlocked: true });

  const r3Res = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/rounds/round3/questions',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  console.log('Status:', r3Res.status);
  if (r3Res.body.questions) {
    r3Res.body.questions.forEach((q, i) => {
      console.log(`Q${i+1}: ${q.title}`);
      console.log(`  Java Sample Input:`, JSON.stringify(q.java?.input || q.testInput || ''));
      console.log(`  Java Sample Expected Output:`, JSON.stringify(q.java?.answer || q.expectedOutput || ''));
      console.log(`  Python Sample Expected Output:`, JSON.stringify(q.python?.answer || q.expectedOutput || ''));
      console.log(`  Hidden Input Excluded?`, q.hiddenInput === undefined && q.java?.hiddenInput === undefined);
      console.log(`  Hidden Answer Excluded?`, q.hiddenAnswer === undefined && q.java?.hiddenAnswer === undefined);
    });
  } else {
    console.log('Body:', r3Res.body);
  }
}

main().catch(console.error);
