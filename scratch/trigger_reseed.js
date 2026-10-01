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
  console.log('Logging in as admin...');
  const loginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin', password: 'CodeBreaker123' });

  console.log('Login response:', loginRes.status, loginRes.body);
  const token = loginRes.body.token;
  if (!token) {
    console.error('Failed to get admin token');
    process.exit(1);
  }

  console.log('Triggering reseed...');
  const reseedRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/questions/reseed',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  console.log('Reseed response:', reseedRes.status, reseedRes.body);

  console.log('Fetching Round 3 questions...');
  const r3Res = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/questions?round=3',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  console.log('Round 3 questions count:', r3Res.body.questions?.length);
  if (r3Res.body.questions) {
    r3Res.body.questions.forEach((q, i) => {
      console.log(`Q${i+1}: ${q.title}`);
      console.log(`  java.hiddenInput:`, q.java?.hiddenInput);
      console.log(`  java.hiddenAnswer:`, q.java?.hiddenAnswer);
      console.log(`  python.hiddenInput:`, q.python?.hiddenInput);
      console.log(`  python.hiddenAnswer:`, q.python?.hiddenAnswer);
    });
  }
}

main().catch(console.error);
