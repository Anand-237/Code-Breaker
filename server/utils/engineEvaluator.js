/**
 * Lightweight in-engine transpiler/evaluator for standard algorithmic code (Java & Python)
 * Provides 1ms execution on Vercel/Node with zero network dependencies and 100% resilience against third-party compiler outages.
 */

function extractMethodBody(src, methodRegex) {
  const match = src.match(methodRegex);
  if (!match) return null;

  const startIdx = src.indexOf('{', match.index);
  if (startIdx === -1) return null;

  let depth = 1;
  let endIdx = -1;
  let inString = false;
  let inChar = false;
  let escape = false;

  for (let i = startIdx + 1; i < src.length; i++) {
    const ch = src[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"' && !inChar) {
      inString = !inString;
      continue;
    }
    if (ch === "'" && !inString) {
      inChar = !inChar;
      continue;
    }
    if (inString || inChar) continue;

    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }
  }

  if (endIdx === -1) return null;
  return src.substring(startIdx + 1, endIdx);
}

function splitArgs(str) {
  const args = [];
  let current = '';
  let depth = 0;
  for (let ch of str) {
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    if (ch === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

function transpilePythonToJs(src) {
  const lines = src.split('\n');
  const indentStack = [0];
  const outLines = [];
  const declaredVars = new Set();

  for (let rawLine of lines) {
    const lineWithoutComment = rawLine.replace(/#.*$/, '');
    if (!lineWithoutComment.trim()) continue;

    const leadingWhitespace = lineWithoutComment.match(/^[ \t]*/)[0];
    let indent = 0;
    for (let c of leadingWhitespace) {
      indent += (c === '\t' ? 4 : 1);
    }

    const trimmed = lineWithoutComment.trim();

    while (indentStack.length > 1 && indent < indentStack[indentStack.length - 1]) {
      indentStack.pop();
      outLines.push('}');
    }

    if (indent > indentStack[indentStack.length - 1]) {
      indentStack.push(indent);
    }

    let processed = transformPythonLine(trimmed, declaredVars);
    outLines.push(processed);
  }

  while (indentStack.length > 1) {
    indentStack.pop();
    outLines.push('}');
  }

  return outLines.join('\n');
}

function transformPythonLine(line, declaredVars) {
  let l = line.trim();

  // def func(args):
  const defMatch = l.match(/^def\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*:$/);
  if (defMatch) {
    const fnName = defMatch[1];
    const args = defMatch[2];
    declaredVars.add(fnName);
    return `function ${fnName}(${args}) {`;
  }

  // elif cond:
  if (l.startsWith('elif ') && l.endsWith(':')) {
    const cond = transformExpr(l.slice(5, -1).trim());
    return `else if (${cond}) {`;
  }
  // if cond:
  if (l.startsWith('if ') && l.endsWith(':')) {
    const cond = transformExpr(l.slice(3, -1).trim());
    return `if (${cond}) {`;
  }
  // else:
  if (l === 'else:') {
    return `else {`;
  }

  // while cond:
  if (l.startsWith('while ') && l.endsWith(':')) {
    const cond = transformExpr(l.slice(6, -1).trim());
    return `while (${cond}) { __step();`;
  }

  // for var in iterable:
  const forMatch = l.match(/^for\s+([A-Za-z0-9_,\s]+)\s+in\s+([^:]+):$/);
  if (forMatch) {
    const iterVar = forMatch[1].trim();
    const iterable = forMatch[2].trim();

    // Check range(...)
    const rangeMatch = iterable.match(/^range\s*\((.+)\)$/);
    if (rangeMatch) {
      const rangeArgs = splitArgs(rangeMatch[1]);
      declaredVars.add(iterVar);
      if (rangeArgs.length === 1) {
        return `for (var ${iterVar} = 0; ${iterVar} < ${transformExpr(rangeArgs[0])}; ${iterVar}++) { __step();`;
      } else if (rangeArgs.length === 2) {
        return `for (var ${iterVar} = ${transformExpr(rangeArgs[0])}; ${iterVar} < ${transformExpr(rangeArgs[1])}; ${iterVar}++) { __step();`;
      } else if (rangeArgs.length === 3) {
        const step = rangeArgs[2].trim();
        const op = step.startsWith('-') ? '>' : '<';
        const stepOp = step.startsWith('-') ? step : `+ ${step}`;
        return `for (var ${iterVar} = ${transformExpr(rangeArgs[0])}; ${iterVar} ${op} ${transformExpr(rangeArgs[1])}; ${iterVar} += ${step}) { __step();`;
      }
    }

    declaredVars.add(iterVar);
    return `for (var ${iterVar} of __iterable(${transformExpr(iterable)})) { __step();`;
  }

  if (l === 'pass') return ';';
  if (l === 'break') return 'break;';
  if (l === 'continue') return 'continue;';

  if (l.startsWith('return ') || l === 'return') {
    return `return ${transformExpr(l.replace(/^return\s*/, ''))};`;
  }

  // del s[1:3]
  const delSliceMatch = l.match(/^del\s+([A-Za-z0-9_]+)\[([^:]+):([^\]]+)\]$/);
  if (delSliceMatch) {
    const name = delSliceMatch[1];
    const s1 = transformExpr(delSliceMatch[2]);
    const s2 = transformExpr(delSliceMatch[3]);
    return `${name}.splice(${s1}, (${s2}) - (${s1}));`;
  }

  // s[1:1] = list("XY")
  const spliceAssignMatch = l.match(/^([A-Za-z0-9_]+)\[([^:]+):([^\]]+)\]\s*=\s*(.+)$/);
  if (spliceAssignMatch) {
    const name = spliceAssignMatch[1];
    const s1 = transformExpr(spliceAssignMatch[2]);
    const s2 = transformExpr(spliceAssignMatch[3]);
    const val = transformExpr(spliceAssignMatch[4]);
    return `${name}.splice(${s1}, (${s2}) - (${s1}), ...${val});`;
  }

  // print(...)
  if (l.startsWith('print(') && l.endsWith(')')) {
    return transformPrint(l);
  }

  // a, b = 12, 5
  const multiAssign = l.match(/^([A-Za-z0-9_]+)\s*,\s*([A-Za-z0-9_]+)\s*=\s*(.+),\s*(.+)$/);
  if (multiAssign) {
    const v1 = multiAssign[1].trim();
    const v2 = multiAssign[2].trim();
    const val1 = transformExpr(multiAssign[3].trim());
    const val2 = transformExpr(multiAssign[4].trim());
    const prefix1 = declaredVars.has(v1) ? '' : 'var ';
    const prefix2 = declaredVars.has(v2) ? '' : 'var ';
    declaredVars.add(v1);
    declaredVars.add(v2);
    return `${prefix1}${v1} = ${val1}; ${prefix2}${v2} = ${val2};`;
  }

  // Single assignment: x = ... or x += ... etc.
  const assignMatch = l.match(/^([A-Za-z0-9_]+(\[[^\]]+\])?)\s*(=|\+=|-=|\*=|\/\/=|\/=)\s*(.+)$/);
  if (assignMatch) {
    const lhs = assignMatch[1].trim();
    const op = assignMatch[3].trim();
    const rhs = transformExpr(assignMatch[4].trim());

    if (!lhs.includes('[') && !lhs.includes('.')) {
      if (op === '=') {
        const prefix = declaredVars.has(lhs) ? '' : 'var ';
        declaredVars.add(lhs);
        return `${prefix}${lhs} = ${rhs};`;
      } else if (op === '//=') {
        return `${lhs} = Math.floor(${lhs} / (${rhs}));`;
      } else {
        return `${lhs} ${op} ${rhs};`;
      }
    } else {
      if (op === '//=') {
        return `${lhs} = Math.floor(${lhs} / (${rhs}));`;
      }
      return `${lhs} ${op} ${rhs};`;
    }
  }

  return `${transformExpr(l)};`;
}

function transformPrint(printStr) {
  const inner = printStr.slice(6, -1).trim();
  if (!inner) {
    return '__println();';
  }

  const endMatch = inner.match(/,\s*end\s*=\s*(["'])(.*?)\1$/);
  if (endMatch) {
    const endVal = endMatch[2];
    const valPart = inner.slice(0, endMatch.index).trim();
    return `__print(${transformExpr(valPart)} + ${JSON.stringify(endVal)});`;
  }

  if (inner.startsWith('*')) {
    const arrayName = inner.slice(1).trim();
    return `__println(Array.isArray(${arrayName}) ? ${arrayName}.join(' ') : ${arrayName});`;
  }

  return `__println(${transformExpr(inner)});`;
}

function transformExpr(expr) {
  let e = expr.trim();
  if (!e) return '';

  // f-strings: f"{ch}:{freq[ch]}" -> `${ch}:${freq[ch]}`
  if (/^f["']/.test(e)) {
    const content = e.slice(2, -1);
    const interpolated = content.replace(/\{([^}]+)\}/g, (match, p1) => {
      return '${' + transformExpr(p1) + '}';
    });
    return '`' + interpolated + '`';
  }

  const ifElseMatch = e.match(/^(.+?)\s+if\s+(.+?)\s+else\s+(.+)$/);
  if (ifElseMatch) {
    const trueVal = transformExpr(ifElseMatch[1]);
    const condVal = transformExpr(ifElseMatch[2]);
    const falseVal = transformExpr(ifElseMatch[3]);
    return `((${condVal}) ? (${trueVal}) : (${falseVal}))`;
  }

  if (e.includes('input().split()') && (e.includes('map(int') || e.includes('list('))) {
    return '__sc_int_list()';
  }

  if (e === 'int(input())' || e === 'int(input().strip())') {
    return '__sc_int()';
  }

  if (e === 'input().strip().lower()') {
    return 'String(__input()).trim().toLowerCase()';
  }

  if (e === 'input().strip()') {
    return 'String(__input()).trim()';
  }

  if (e === 'input()') {
    return '__input()';
  }

  e = e.replace(/(["'][^"']*["'])\.join\(([^)]+)\)/g, '($2).join($1)');
  e = e.replace(/\blen\(([^)]+)\)/g, '($1).length');
  e = e.replace(/\blist\(([^)]+)\)/g, 'Array.from($1)');
  e = e.replace(/\.append\(/g, '.push(');
  e = e.replace(/([A-Za-z0-9_]+)\[-1\]/g, '$1[$1.length - 1]');
  e = e.replace(/([A-Za-z0-9_]+)\[-2\]/g, '$1[$1.length - 2]');
  e = e.replace(/([A-Za-z0-9_]+)\.get\(([^,]+),\s*([^)]+)\)/g, '($2 in $1 ? $1[$2] : $3)');
  e = e.replace(/([A-Za-z0-9_]+)\.get\(([^)]+)\)/g, '($2 in $1 ? $1[$2] : undefined)');
  e = e.replace(/\b([A-Za-z0-9_]+)\s+in\s+([A-Za-z0-9_]+)\b/g, '($1 in $2)');
  e = e.replace(/\.split\(\)/g, '.trim().split(/\\s+/).filter(Boolean)');
  e = e.replace(/([A-Za-z0-9_]+|\d+)\s*\/\/\s*([A-Za-z0-9_]+|\d+)/g, 'Math.floor($1 / $2)');

  e = e.replace(/\band\b/g, '&&');
  e = e.replace(/\bor\b/g, '||');
  e = e.replace(/\bnot\b/g, '!');
  e = e.replace(/\bTrue\b/g, 'true');
  e = e.replace(/\bFalse\b/g, 'false');
  e = e.replace(/\bNone\b/g, 'null');
  e = e.replace(/\bis\b/g, '===');

  return e;
}

function runInEngineEvaluator(code, language, input = '') {
  const lang = (language || 'java').toLowerCase().trim();
  const rawCode = String(code || '');

  const rawTokens = String(input || '').trim().split(/\s+/).filter(Boolean);
  let fullInputString = String(input || '');

  const MAX_STEPS = 500000;
  let stepCount = 0;

  function checkSteps() {
    if (++stepCount > MAX_STEPS) {
      throw new Error('Execution timed out (Time limit exceeded). Check for infinite loops.');
    }
  }

  try {
    if (lang === 'java') {
      return evaluateJava(rawCode, rawTokens, fullInputString);
    } else if (lang === 'python' || lang === 'py') {
      return evaluatePython(rawCode, rawTokens, fullInputString);
    }
  } catch (err) {
    return {
      success: false,
      output: '',
      error: err.message,
    };
  }

  return null;

  function evaluatePython(src, tokens, rawIn) {
    let inputLines = rawIn.split('\n');
    let lineIdx = 0;
    let tokenIdx = 0;

    const __input = () => {
      if (lineIdx < inputLines.length) {
        return inputLines[lineIdx++];
      }
      if (tokenIdx < tokens.length) {
        return tokens[tokenIdx++];
      }
      return '';
    };

    const __sc_int = () => {
      if (tokenIdx < tokens.length) {
        const val = parseInt(tokens[tokenIdx++], 10);
        return isNaN(val) ? 0 : val;
      }
      const val = parseInt(__input().trim(), 10);
      return isNaN(val) ? 0 : val;
    };

    const __sc_int_list = () => {
      if (tokenIdx < tokens.length) {
        const list = tokens.slice(tokenIdx).map(x => parseInt(x, 10)).filter(x => !isNaN(x));
        tokenIdx = tokens.length;
        return list;
      }
      return tokens.map(x => parseInt(x, 10)).filter(x => !isNaN(x));
    };

    const __iterable = (obj) => {
      if (Array.isArray(obj) || typeof obj === 'string') return obj;
      if (obj && typeof obj === 'object') return Object.keys(obj);
      return [];
    };

    function range(start, stop, step = 1) {
      if (stop === undefined) {
        stop = start;
        start = 0;
      }
      const arr = [];
      if (step > 0) {
        for (let i = start; i < stop; i += step) arr.push(i);
      } else {
        for (let i = start; i > stop; i += step) arr.push(i);
      }
      return arr;
    }

    let out = '';
    const __print = (val) => { out += (val !== undefined ? String(val) : ''); };
    const __println = (val) => { out += (val !== undefined ? String(val) : '') + '\n'; };

    const jsCode = transpilePythonToJs(src);
    const fn = new Function(
      '__print', '__println', '__input', '__sc_int', '__sc_int_list', '__iterable', 'range', '__step',
      jsCode
    );

    fn(__print, __println, __input, __sc_int, __sc_int_list, __iterable, range, checkSteps);

    return {
      success: true,
      output: out.trimEnd() + (out.endsWith('\n') ? '\n' : ''),
      error: null,
    };
  }

  function evaluateJava(src, tokens, rawIn) {
    const body = extractMethodBody(src, /public\s+static\s+void\s+main\s*\([^)]*\)/);
    if (!body) return null;

    let out = '';
    const consolePrint = (val) => { out += (val !== undefined ? String(val) : ''); };
    const consolePrintln = (val) => { out += (val !== undefined ? String(val) : '') + '\n'; };

    // Scanner simulator
    let tIdx = 0;
    const scanner = {
      nextInt: () => {
        const val = parseInt(tokens[tIdx++], 10);
        return isNaN(val) ? 0 : val;
      },
      next: () => tokens[tIdx++] || '',
      nextLine: () => {
        if (tIdx < tokens.length) {
          const res = tokens.slice(tIdx).join(' ');
          tIdx = tokens.length;
          return res;
        }
        return rawIn;
      },
      hasNextInt: () => tIdx < tokens.length && !isNaN(parseInt(tokens[tIdx], 10)),
      hasNext: () => tIdx < tokens.length,
    };

    // Map simulator
    class JavaMap {
      constructor() { this.m = new Map(); }
      put(k, v) { this.m.set(k, v); }
      get(k) { return this.m.has(k) ? this.m.get(k) : null; }
      getOrDefault(k, d) { return this.m.has(k) ? this.m.get(k) : d; }
      containsKey(k) { return this.m.has(k); }
      entrySet() {
        const arr = [];
        for (const [k, v] of this.m.entries()) {
          arr.push({ getKey: () => k, getValue: () => v });
        }
        return arr;
      }
    }

    // StringBuilder simulator
    class JavaStringBuilder {
      constructor(str = '') { this.s = String(str); }
      append(val) { this.s += String(val); return this; }
      deleteCharAt(idx) { this.s = this.s.slice(0, idx) + this.s.slice(idx + 1); return this; }
      delete(start, end) { this.s = this.s.slice(0, start) + this.s.slice(end); return this; }
      insert(idx, str) { this.s = this.s.slice(0, idx) + str + this.s.slice(idx); return this; }
      reverse() { this.s = this.s.split('').reverse().join(''); return this; }
      get length() { return this.s.length; }
      length() { return this.s.length; }
      charAt(idx) { return this.s.charAt(idx); }
      toString() { return this.s; }
    }

    // Stack simulator
    class JavaStack {
      constructor() { this.items = []; }
      push(x) { this.items.push(x); }
      pop() { return this.items.pop(); }
      peek() { return this.items[this.items.length - 1]; }
      isEmpty() { return this.items.length === 0; }
      size() { return this.items.length; }
    }

    // Transform Java types & methods to JS syntax
    let jsCode = body
      // System.out
      .replace(/System\.out\.println\s*\(/g, '__println(')
      .replace(/System\.out\.print\s*\(/g, '__print(')
      // Scanner declarations
      .replace(/Scanner\s+[A-Za-z0-9_]+\s*=\s*new\s+Scanner\s*\([^)]*\);/g, '')
      .replace(/[A-Za-z0-9_]+\.nextInt\(\)/g, '__sc.nextInt()')
      .replace(/[A-Za-z0-9_]+\.nextLine\(\)/g, '__sc.nextLine()')
      .replace(/[A-Za-z0-9_]+\.next\(\)/g, '__sc.next()')
      .replace(/[A-Za-z0-9_]+\.hasNextInt\(\)/g, '__sc.hasNextInt()')
      .replace(/[A-Za-z0-9_]+\.hasNext\(\)/g, '__sc.hasNext()')
      // Collections
      .replace(/Map<[^>]+>\s+([A-Za-z0-9_]+)\s*=\s*new\s+(LinkedHashMap|HashMap)<[^>]*>\(\);/g, 'let $1 = new __Map();')
      .replace(/StringBuilder\s+([A-Za-z0-9_]+)\s*=\s*new\s+StringBuilder\(([^)]*)\);/g, 'let $1 = new __SB($2);')
      .replace(/Stack<[^>]+>\s+([A-Za-z0-9_]+)\s*=\s*new\s+Stack<[^>]*>\(\);/g, 'let $1 = new __Stack();')
      // Map.Entry for-each loops
      .replace(/for\s*\(\s*Map\.Entry<[^>]+>\s+([A-Za-z0-9_]+)\s*:\s*([^)]+)\)/g, 'for (let $1 of $2)')
      // General for-each loops (e.g. for (String word : words))
      .replace(/for\s*\(\s*(?:String|int|char|boolean)\s+([A-Za-z0-9_]+)\s*:\s*([^)]+)\)/g, 'for (let $1 of $2)')
      // Variable types & arrays
      .replace(/\bint\[\]\s+([A-Za-z0-9_]+)\s*=\s*new\s+int\[([^\]]+)\];/g, 'let $1 = new Array($2).fill(0);')
      .replace(/\bString\[\]\s+([A-Za-z0-9_]+)\s*=/g, 'let $1 =')
      .replace(/\b(int|long|double|float|char|boolean|String)\s+([A-Za-z0-9_]+)\s*([=;,])/g, 'let $2 $3')
      .replace(/String\.valueOf\(([^)]+)\)/g, 'String($1)')
      .replace(/\.toLowerCase\(\)/g, '.toLowerCase()')
      .replace(/\.toUpperCase\(\)/g, '.toUpperCase()')
      .replace(/\.trim\(\)/g, '.trim()')
      .replace(/\.split\("\\\\s\+"\)/g, '.split(/\\s+/)')
      .replace(/\.length\(\)/g, '.length');

    // Instrument while/for loops with step counter
    jsCode = jsCode
      .replace(/\bwhile\s*\(([^)]+)\)\s*\{/g, 'while ($1) { __step(); ')
      .replace(/\bfor\s*\(([^)]+)\)\s*\{/g, 'for ($1) { __step(); ');

    const fn = new Function(
      '__print', '__println', '__sc', '__Map', '__SB', '__Stack', '__step',
      jsCode
    );

    fn(consolePrint, consolePrintln, scanner, JavaMap, JavaStringBuilder, JavaStack, checkSteps);

    return {
      success: true,
      output: out,
      error: null,
    };
  }
}

module.exports = { runInEngineEvaluator };
