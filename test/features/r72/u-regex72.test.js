// Round 72: the four patterns rewritten without lookbehind give the same results as before, on many random strings.
let pass = 0; let fail = 0;
const check = (name, ok, d) => { if (ok) pass++; else { fail++; console.log('FAIL ' + name + ' :: ' + JSON.stringify(d)); } };
const oldServer = (c) => /(?<!-)\b(dev|serve|server|start|runserver|preview|watch|uvicorn|gunicorn)\b|\bstreamlit run\b|\bflask run\b|--watch\b/i.test(c);
const newServer = (c) => /(?:^|[^-])\b(?:dev|serve|server|start|runserver|preview|watch|uvicorn|gunicorn)\b|\bstreamlit run\b|\bflask run\b|--watch\b/i.test(c);
const oldS = (w) => w.replace(/ies$/, 'y').replace(/(?<=[a-z]{3})s$/, '');
const newS = (w) => w.replace(/ies$/, 'y').replace(/([a-z]{3})s$/, '$1');
const SEP = /((?<=[.;])\s+|,\s+(?=(?:but|though|although|while|there|it|they|the|no|not|only)\b)|\s+(?=(?:but|though|although)\s))/i;
const oldSplit = (s) => s.split(SEP);
const newSplit = (s) => s.replace(/([.;])(?=\s)/g, '$1\u0001').split(/(\u0001\s+|,\s+(?=(?:but|though|although|while|there|it|they|the|no|not|only)\b)|\s+(?=(?:but|though|although)\s))/i).map((x) => x.replace(/\u0001/g, ''));
const oldPath = (s) => s.split(/(?<=\/)|(?<=\w)(?=\.\w)/);
const newPath = (s) => { const out = s.replace(/\//g, '/\u0001').replace(/(\w)(?=\.\w)/g, '$1\u0001').split('\u0001'); if (out.length > 1 && out[out.length - 1] === '') out.pop(); return out; };
const pick = (xs) => xs[Math.floor(Math.random() * xs.length)];
const words = ['npm', 'run', 'dev', '--save-dev', 'serve', 'pre-dev', 'start:dev', 'flask run', 'streamlit run', 'watch', '--watch', 'x-watch', 'vite', 'build', 'Dev', 'SERVER', 'uvicorn', 'a', '-', ' ', '.', ';', ',', 'but', 'though', 'although', 'while', 'there', 'it', 'they', 'the', 'no', 'not', 'only', 'buttons', 'src/lib/a.ts', '/', 'file.test.js', '.env', 'a/b/', 'é', '..', 'x.y', 'tasks', 'bus', 'ies', 'cities', '\n', '\t', '  ', 'done.', 'yes;', 'ok', 'skills', 'its'];
for (let n = 0; n < 40000; n++) {
  const len = 1 + Math.floor(Math.random() * 8);
  let s = '';
  for (let i = 0; i < len; i++) s += pick(words) + (Math.random() < 0.6 ? ' ' : pick(['', '.', ',', ';', '/', '-', ', ', '. ', '; ']));
  if (Math.random() < 0.2) s = s.trim();
  check('server ' + s, oldServer(s) === newServer(s), s);
  const ws = (s.toLowerCase().match(/[a-z0-9]{3,}/g) || []);
  for (const w of ws) check('plural ' + w, oldS(w) === newS(w), w);
  check('split ' + s, JSON.stringify(oldSplit(s)) === JSON.stringify(newSplit(s)), [s, oldSplit(s), newSplit(s)]);
  check('path ' + s, JSON.stringify(oldPath(s)) === JSON.stringify(newPath(s)), [s, oldPath(s), newPath(s)]);
  if (fail > 10) break;
}
for (const s of ['', '/', 'a/', '/a', 'a.b', '.a', 'a.', 'src/app.test.ts', 'a//b', 'x/.env', 'a.b.c/d']) check('path edge ' + JSON.stringify(s), JSON.stringify(oldPath(s)) === JSON.stringify(newPath(s)), [s, oldPath(s), newPath(s)]);
console.log(`${pass} same, ${fail} different`);
process.exit(fail ? 1 : 0);
