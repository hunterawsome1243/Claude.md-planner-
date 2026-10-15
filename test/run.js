#!/usr/bin/env node
// Runs the test files (every *.test.js under test/) and prints one line per file.
//   node test/run.js                  everything
//   node test/run.js unit             only the unit checks (u-*.test.js, no browser)
//   node test/run.js keyboard r52     only files whose path contains one of these words
//   JOBS=2 node test/run.js           how many files run at once (default 4)
// A file fails when it exits with an error, prints a line starting with FAIL,
// prints "fails: N" with N above 0, or the page throws an uncaught error (pageerror).
// A file that fails is run once more on its own, since a few tests that reload pages can trip over a
// busy machine; one that passes then is reported as passing on retry. RETRY=0 turns this off.
// Each file's full output is saved to test/out/<name>.txt.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const TEST = __dirname;
const ROOT = path.join(TEST, '..');
const OUT = path.join(TEST, 'out');

function find(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'out' || e.name === 'node_modules' ? [] : find(p);
    return e.name.endsWith('.test.js') ? [p] : [];
  });
}

const order = (p) => p.replace(/\/r(\d+)\//, (_, n) => '/r' + n.padStart(3, '0') + '/');
let files = find(TEST).sort((a, b) => order(a).localeCompare(order(b)));
const words = process.argv.slice(2);
if (words.length) {
  files = files.filter((f) => {
    const rel = path.relative(TEST, f);
    return words.some((w) => (w === 'unit' ? /\/u-[^/]+$/.test(rel) : rel.split(path.sep).includes(w) || rel.includes(w)));
  });
}
if (!files.length) { console.log('No test files match.'); process.exit(1); }
for (const page of ['mocked.html', 'plain.html']) {
  if (!fs.existsSync(path.join(TEST, page))) { console.log('Test pages are missing: run `npm run build` first.'); process.exit(1); }
}
fs.mkdirSync(OUT, { recursive: true });

const env = { ...process.env, TESTDIR: TEST, APPJS: path.join(ROOT, 'src', 'app.js') };
const JOBS = Math.max(1, Number(process.env.JOBS) || 4);
const TIMEOUT = Number(process.env.TEST_TIMEOUT_MS) || 300000;

function runOne(file) {
  return new Promise((resolve) => {
    const rel = path.relative(TEST, file);
    const started = Date.now();
    const child = spawn(process.execPath, [file], { cwd: path.dirname(file), env });
    let text = '';
    child.stdout.on('data', (d) => (text += d));
    child.stderr.on('data', (d) => (text += d));
    const timer = setTimeout(() => { text += '\nTIMED OUT after ' + TIMEOUT / 1000 + ' s\n'; child.kill('SIGKILL'); }, TIMEOUT);
    child.on('close', (code) => {
      clearTimeout(timer);
      fs.writeFileSync(path.join(OUT, rel.replace(/[\\/]/g, '-').replace(/\.test\.js$/, '.txt')), text);
      const fails = text.split('\n').filter((l) => /^FAIL\b/.test(l));
      const counted = [...text.matchAll(/^fails:\s*(\d+)/gm)].reduce((n, m) => n + Number(m[1]), 0);
      const pageErrors = text.split('\n').filter((l) => /pageerror/.test(l) && !/\[\s*\]/.test(l));
      const passes = text.split('\n').filter((l) => /^PASS\b/.test(l)).length;
      const reasons = [];
      if (code !== 0) reasons.push('exit ' + code);
      if (fails.length) reasons.push(fails.length + ' FAIL');
      else if (counted) reasons.push('fails: ' + counted);
      if (pageErrors.length) reasons.push('page error');
      resolve({ rel, ok: !reasons.length, reasons, passes, fails, pageErrors, secs: ((Date.now() - started) / 1000).toFixed(0) });
    });
  });
}

(async () => {
  console.log('Running ' + files.length + ' test files, ' + JOBS + ' at a time.');
  const queue = files.slice();
  const results = [];
  await Promise.all(Array.from({ length: JOBS }, async () => {
    while (queue.length) {
      const r = await runOne(queue.shift());
      results.push(r);
      console.log((r.ok ? 'ok    ' : 'FAILED') + ' ' + r.rel + (r.passes ? ' (' + r.passes + ' checks)' : '') + ' ' + r.secs + 's' + (r.ok ? '' : '  <- ' + r.reasons.join(', ')));
      if (!r.ok) for (const l of [...r.fails, ...r.pageErrors].slice(0, 5)) console.log('         ' + l.slice(0, 200));
    }
  }));
  if (process.env.RETRY !== '0') {
    for (const r of results.filter((x) => !x.ok)) {
      const again = await runOne(path.join(TEST, r.rel));
      console.log((again.ok ? 'ok    ' : 'FAILED') + ' ' + r.rel + ' (run again on its own)' + (again.ok ? '' : '  <- ' + again.reasons.join(', ')));
      if (again.ok) Object.assign(r, again, { retried: true });
    }
  }
  const bad = results.filter((r) => !r.ok);
  const retried = results.filter((r) => r.retried);
  if (retried.length) console.log('Passed on the second run: ' + retried.map((r) => r.rel).join(', '));
  const checks = results.reduce((n, r) => n + r.passes, 0);
  console.log('\n' + (results.length - bad.length) + ' of ' + results.length + ' files passed (' + checks + ' checks). Full output is in test/out/.');
  if (bad.length) { console.log('Failed: ' + bad.map((r) => r.rel).sort().join(', ')); process.exit(1); }
})();
