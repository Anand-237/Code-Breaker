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
  const questionsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/questions?round=3',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const questions = questionsRes.body.questions;
  console.log(`Testing execution for ${questions.length} Round 3 questions...`);

  const fixedCodesPython = [
    // Q1: SPIRAL MATRIX TRAVERSAL
    `a = list(map(int, input().split()))
r = a[0]
c = a[1]

matrix = []
for i in range(r):
    matrix.append(list(map(int, input().split())))

top = 0
bottom = r - 1
left = 0
right = c - 1

out = []
while top <= bottom and left <= right:
    for j in range(left, right + 1):
        out.append(str(matrix[top][j]))
    top += 1

    for i in range(top, bottom + 1):
        out.append(str(matrix[i][right]))
    right -= 1

    if top <= bottom:
        for j in range(right, left - 1, -1):
            out.append(str(matrix[bottom][j]))
        bottom -= 1

    if left <= right:
        for i in range(bottom, top - 1, -1):
            out.append(str(matrix[i][left]))
        left += 1

print(" ".join(out))`,

    // Q2: DYNAMIC ARRAY TRANSFORMATION
    `a = [2, 7, 4, 9, 6, 3]
orig = list(a)
for i in range(len(a)):
    if orig[i] % 2 == 0:
        for j in range(i + 1, len(a)):
            a[j] = a[j] - orig[i]
    else:
        for j in range(i + 1, len(a)):
            a[j] = a[j] + orig[i]
for x in a:
    print(x, end=" ")`,

    // Q3: RECURSIVE SUBSET GENERATION
    `def solve(a, index, current):
    if index == len(a):
        print(current)
        return
    solve(a, index + 1, current)
    if a[index] not in current:
        current.append(a[index])
        solve(a, index + 1, current)
        current.pop()

a = [1, 2, 2]
solve(a, 0, [])`,

    // Q4: LONGEST SUBARRAY WITH SUM CONSTRAINT
    `a = [2, 1, 5, 1, 3, 2]
k = 7

left = 0
sum_val = 0
max_len = 0

for right in range(len(a)):
    sum_val += a[right]
    while sum_val > k:
        sum_val -= a[left]
        left += 1
    max_len = max(max_len, right - left + 1)

print(max_len)`,

    // Q5: MATRIX COLUMN TRAVERSAL
    `a = list(map(int, input().split()))
r = a[0]
c = a[1]

m = []
for i in range(r):
    m.append(list(map(int, input().split())))

for j in range(c):
    for i in range(r):
        print(m[i][j], end=" ")
    print()`
  ];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const runRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/rounds/round3/run',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      questionId: q._id,
      code: fixedCodesPython[i],
      selectedLanguage: 'python'
    });

    console.log(`Q${i+1} (${q.title}):`);
    console.log(`  Sample Passed:`, runRes.body.samplePassed);
    console.log(`  Hidden Passed:`, runRes.body.hiddenPassed);
    console.log(`  Is Correct:`, runRes.body.isCorrect);
    if (!runRes.body.isCorrect) {
      console.log(`  Output:`, runRes.body.output);
      console.log(`  Error:`, runRes.body.error);
    }
  }
}

main().catch(console.error);
