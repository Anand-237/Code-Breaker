const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const https = require('https');
const { execFile } = require('child_process');

/**
 * Normalize string output for reliable comparison
 * Handles CRLF/LF line endings, trims leading/trailing whitespace
 */
function normalizeOutput(str) {
  return String(str ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

/**
 * Case-insensitive & whitespace-tolerant comparison
 */
function isOutputMatch(actual, expected) {
  const normActual = normalizeOutput(actual);
  const normExpected = normalizeOutput(expected);

  if (normActual === normExpected) return true;
  if (normActual.toLowerCase() === normExpected.toLowerCase()) return true;

  // Also check if both can be parsed as numbers and match (e.g. 6 vs 6.0)
  const numActual = Number(normActual);
  const numExpected = Number(normExpected);
  if (!isNaN(numActual) && !isNaN(numExpected) && normActual !== '' && normExpected !== '') {
    if (numActual === numExpected) return true;
  }

  return false;
}

/**
 * Fallback remote execution using high-performance sandbox (Wandbox API)
 * Triggered automatically when local toolchain binaries (javac, python, gcc) are missing (e.g. in Vercel serverless)
 */
function runRemoteCode(compiler, code, input = '', timeoutMs = 12000) {
  return new Promise((resolve) => {
    let sanitizedCode = code;
    if (compiler.includes('openjdk')) {
      sanitizedCode = code.replace(/public\s+class\s+([A-Za-z0-9_]+)/, 'class $1');
    }

    const payload = JSON.stringify({
      compiler,
      code: sanitizedCode,
      stdin: input || '',
    });

    const req = https.request({
      hostname: 'wandbox.org',
      path: '/api/compile.json',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'Mozilla/5.0',
      },
      timeout: timeoutMs,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const compilerError = parsed.compiler_error || parsed.compiler_message || '';
          if (parsed.status !== '0' && compilerError) {
            resolve({
              success: false,
              output: '',
              error: `Compilation Error:\n${compilerError}`,
            });
          } else {
            resolve({
              success: parsed.status === '0',
              output: parsed.program_output || parsed.program_message || '',
              error: parsed.program_error || (parsed.status !== '0' ? 'Runtime error' : null),
            });
          }
        } catch (_) {
          resolve({ success: false, output: '', error: 'Failed to parse compiler response' });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, output: '', error: 'Execution timed out (Time limit exceeded)' });
    });

    req.on('error', (err) => {
      resolve({ success: false, output: '', error: `Execution service error: ${err.message}` });
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Execute code snippet in isolated child process with timeout protection
 * @param {string} code - source code to execute
 * @param {string} language - programming language ('javascript', 'python', 'cpp', 'c', 'java', 'typescript')
 * @param {object} options - execution options
 * @returns {Promise<{ success: boolean, output: string, error: string|null, executionTimeMs: number }>}
 */
async function executeCode(code, language = 'javascript', options = {}) {
  const timeoutMs = options.timeoutMs || 8000;
  const lang = (language || 'javascript').toLowerCase().trim();

  // Create isolated temp directory
  const runId = crypto.randomUUID();
  const tempDir = path.join(os.tmpdir(), `cb_run_${runId}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const startTime = Date.now();

  try {
    let result;
    const input = options.input || '';
    if (lang === 'python' || lang === 'py') {
      result = await runPython(code, tempDir, timeoutMs, input);
    } else if (lang === 'javascript' || lang === 'js') {
      result = await runJavaScript(code, tempDir, timeoutMs, input);
    } else if (lang === 'typescript' || lang === 'ts') {
      result = await runTypeScript(code, tempDir, timeoutMs, input);
    } else if (lang === 'cpp' || lang === 'c++') {
      result = await runCpp(code, tempDir, timeoutMs, input);
    } else if (lang === 'c') {
      result = await runC(code, tempDir, timeoutMs, input);
    } else if (lang === 'java') {
      result = await runJava(code, tempDir, timeoutMs, input);
    } else {
      // Default to JavaScript
      result = await runJavaScript(code, tempDir, timeoutMs, input);
    }

    const executionTimeMs = Date.now() - startTime;
    return {
      ...result,
      executionTimeMs,
    };
  } catch (err) {
    const executionTimeMs = Date.now() - startTime;
    return {
      success: false,
      output: '',
      error: err.message || 'Execution failed',
      executionTimeMs,
    };
  } finally {
    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  }
}

function runCommandAsync(cmd, args, options = {}) {
  return new Promise((resolve) => {
    const child = execFile(cmd, args, {
      cwd: options.cwd,
      timeout: options.timeout,
      maxBuffer: 1024 * 1024, // 1MB buffer
      windowsHide: true,
    }, (error, stdout, stderr) => {
      if (error) {
        if (error.killed || error.signal === 'SIGTERM') {
          resolve({
            success: false,
            output: stdout ? stdout.toString() : '',
            error: 'Execution timed out (Time limit exceeded: 4s limit). Check for infinite loops.',
          });
        } else {
          resolve({
            success: false,
            output: stdout ? stdout.toString() : '',
            error: stderr ? stderr.toString() : error.message,
          });
        }
      } else {
        resolve({
          success: true,
          output: stdout ? stdout.toString() : '',
          error: stderr ? stderr.toString() : null,
        });
      }
    });

    if (options.input) {
      try {
        child.stdin.write(options.input);
        child.stdin.end();
      } catch (_) {}
    }
  });
}

async function runPython(code, tempDir, timeoutMs, input) {
  const filePath = path.join(tempDir, 'solution.py');
  fs.writeFileSync(filePath, code, 'utf8');

  // Try python command
  let res = await runCommandAsync('python', [filePath], {
    cwd: tempDir,
    timeout: timeoutMs,
    input,
  });

  // If python not found, try py or python3
  if (!res.success && res.error && res.error.includes('ENOENT')) {
    res = await runCommandAsync('python3', [filePath], {
      cwd: tempDir,
      timeout: timeoutMs,
      input,
    });
  }

  if (!res.success && res.error && res.error.includes('ENOENT')) {
    res = await runCommandAsync('py', [filePath], {
      cwd: tempDir,
      timeout: timeoutMs,
      input,
    });
  }

  // If local python is completely unavailable (e.g. serverless environment), fallback to remote CPython
  if (!res.success && res.error && res.error.includes('ENOENT')) {
    return await runRemoteCode('cpython-3.12.7', code, input, timeoutMs + 4000);
  }

  return res;
}

async function runJavaScript(code, tempDir, timeoutMs, input) {
  const filePath = path.join(tempDir, 'solution.js');
  fs.writeFileSync(filePath, code, 'utf8');

  return await runCommandAsync(process.execPath, [filePath], {
    cwd: tempDir,
    timeout: timeoutMs,
    input,
  });
}

async function runTypeScript(code, tempDir, timeoutMs, input) {
  const filePath = path.join(tempDir, 'solution.ts');
  fs.writeFileSync(filePath, code, 'utf8');

  let res = await runCommandAsync('npx', ['ts-node', filePath], {
    cwd: tempDir,
    timeout: timeoutMs,
    shell: true,
    input,
  });

  if (!res.success && res.error && res.error.includes('ENOENT')) {
    res = await runJavaScript(code, tempDir, timeoutMs, input);
  }

  return res;
}

async function runCpp(code, tempDir, timeoutMs, input) {
  const srcPath = path.join(tempDir, 'solution.cpp');
  const binPath = path.join(tempDir, process.platform === 'win32' ? 'solution.exe' : 'solution');
  fs.writeFileSync(srcPath, code, 'utf8');

  const compileRes = await runCommandAsync('g++', [srcPath, '-o', binPath], {
    cwd: tempDir,
    timeout: timeoutMs,
  });

  if (!compileRes.success && compileRes.error && compileRes.error.includes('ENOENT')) {
    return await runRemoteCode('gcc-13.2.0', code, input, timeoutMs + 4000);
  }

  if (!compileRes.success) {
    return {
      success: false,
      output: '',
      error: `Compilation Error:\n${compileRes.error || compileRes.output}`,
    };
  }

  return await runCommandAsync(binPath, [], {
    cwd: tempDir,
    timeout: timeoutMs,
    input,
  });
}

async function runC(code, tempDir, timeoutMs, input) {
  const srcPath = path.join(tempDir, 'solution.c');
  const binPath = path.join(tempDir, process.platform === 'win32' ? 'solution.exe' : 'solution');
  fs.writeFileSync(srcPath, code, 'utf8');

  const compileRes = await runCommandAsync('gcc', [srcPath, '-o', binPath], {
    cwd: tempDir,
    timeout: timeoutMs,
  });

  if (!compileRes.success && compileRes.error && compileRes.error.includes('ENOENT')) {
    return await runRemoteCode('gcc-13.2.0-c', code, input, timeoutMs + 4000);
  }

  if (!compileRes.success) {
    return {
      success: false,
      output: '',
      error: `Compilation Error:\n${compileRes.error || compileRes.output}`,
    };
  }

  return await runCommandAsync(binPath, [], {
    cwd: tempDir,
    timeout: timeoutMs,
    input,
  });
}

const { runInEngineEvaluator } = require('./engineEvaluator');

async function runJava(code, tempDir, timeoutMs, input) {
  // 1. Try fast in-engine evaluator first for instant 1ms zero-network execution
  try {
    const evalRes = runInEngineEvaluator(code, 'java', input);
    if (evalRes && (evalRes.success || (evalRes.error && evalRes.error.includes('infinite loops')))) {
      return evalRes;
    }
  } catch (_) {}

  const match = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
  const className = match ? match[1] : 'Main';
  const srcPath = path.join(tempDir, `${className}.java`);
  fs.writeFileSync(srcPath, code, 'utf8');

  const compileRes = await runCommandAsync('javac', [srcPath], {
    cwd: tempDir,
    timeout: timeoutMs,
  });

  // If local javac is not installed (e.g. Vercel serverless / Linux minimal container without JDK), fallback to remote OpenJDK 21
  if (!compileRes.success && compileRes.error && compileRes.error.includes('ENOENT')) {
    const remoteRes = await runRemoteCode('openjdk-jdk-21+35', code, input, timeoutMs + 4000);
    // If remote service returns container/OCI error, fallback to evaluator
    if (!remoteRes.success && remoteRes.error && (remoteRes.error.includes('OCI runtime') || remoteRes.error.includes('Resource temporarily unavailable'))) {
      const fallbackEval = runInEngineEvaluator(code, 'java', input);
      if (fallbackEval) return fallbackEval;
    }
    return remoteRes;
  }

  if (!compileRes.success) {
    return {
      success: false,
      output: '',
      error: `Compilation Error:\n${compileRes.error || compileRes.output}`,
    };
  }

  const execRes = await runCommandAsync('java', ['-cp', tempDir, className], {
    cwd: tempDir,
    timeout: timeoutMs,
    input,
  });

  if (!execRes.success && execRes.error && execRes.error.includes('ENOENT')) {
    return await runRemoteCode('openjdk-jdk-21+35', code, input, timeoutMs + 4000);
  }

  return execRes;
}

module.exports = {
  executeCode,
  normalizeOutput,
  isOutputMatch,
};
