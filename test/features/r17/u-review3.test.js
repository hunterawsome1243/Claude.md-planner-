// Round 17: unit checks for the review 3 fixes
const U = require('./unit-lib');
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); };
const M = U.mdLite;
// G1
check('G1 a numbered list with code and bold stays one list', M('1. Run `npm run build` first.\n2. Then **deploy** it.') === '<ol><li>Run <code>npm run build</code> first.</li><li>Then <b>deploy</b> it.</li></ol>');
check('G1 blank lines between items keep one list', M('1. One\n\n2. Two\n\n3. Three') === '<ol><li>One</li><li>Two</li><li>Three</li></ol>');
check('G1 a list that starts at 3 says so', M('3. c\n4. d').startsWith('<ol start="3">'));
check('G1 nested bullets', M('- a\n  - a1\n- b') === '<ul><li>a<ul><li>a1</li></ul></li><li>b</li></ul>');
check('G1 links open in a new tab; only http(s)', M('[docs](https://code.claude.com/docs)').includes('<a href="https://code.claude.com/docs" target="_blank" rel="noopener noreferrer">docs</a>') && !M('[x](javascript:alert(1))').includes('<a'));
check('G1 a quote in a link stays inside the address', !/"onmouseover/.test(M('[x](https://a.b/"onmouseover=alert(1))')));
check('G1 tables', M('| A | B |\n|---|---|\n| 1 | 2 |') === '<div class="md-table"><table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table></div>');
check('G1 __bold__, quotes and rules', M('__x__') === '<p><b>x</b></p>' && M('> hi') === '<blockquote>hi</blockquote>' && M('a\n\n---\n\nb') === '<p>a</p><hr><p>b</p>');
check('G1 code spans are left alone', M('`a **b** [c](https://d.e)`') === '<p><code>a **b** [c](https://d.e)</code></p>');
// G2 + G8
const T = U.mkTask({ id: 't9', title: 'x', splitFrom: 'tA tB bad! tC' });
check('G2 splitFrom keeps valid ids only', T.splitFrom === 'tA tB tC', T.splitFrom);
const p = U.normalize({ name: 'P', features: [{ id: 'f1', title: 'Week plan' }], milestones: [{ id: 'm1', title: 'One', tasks: [
  { id: 'n1', title: 'Lay out the grid', size: 'S', feat: 'f1', splitFrom: 'tL', notes: 'From Claude.\nSeven columns' },
  { id: 'n2', title: 'Drag recipes', size: 'M', feat: 'f1', splitFrom: 'tL' },
  { id: 'n3', title: 'Save it', size: 'M', feat: 'f1', splitFrom: 'tL' },
] }] });
const md = '# Plan: P\n\n## Milestone 1: One\n\n- [x] Build the week planner (L) <!-- id:tL -->\n  - Notes: Seven columns. Used CSS grid.\n';
const r = U.readPlanMd(p, md);
check('G8 a ticked task that was split here is reported with its smaller tasks, to tick in the dialog (round 64)', r.done.length === 0 && r.gone === 0 && r.split.length === 1 && r.split[0].n === 3 && r.split[0].checked && r.split[0].parts.length === 3, { done: r.done.length, gone: r.gone, split: r.split });
check('G8 and keeps Claude\'s new note words on the first one', r.notes.length === 1 && r.notes[0].notes === 'From Claude.\nSeven columns\nUsed CSS grid.', r.notes.map((x) => x.notes));
const r2 = U.readPlanMd(p, md.replace('[x]', '[ ]'));
check('G8 an unticked split task changes nothing and is not "deleted"', r2.done.length === 0 && r2.gone === 0, r2);
// G13
const q = U.normalize({ name: 'Q', milestones: [{ id: 'm1', title: 'One', tasks: [{ id: 'a1', title: 'Grid', notes: 'Seven columns' }] }] });
const r3 = U.readPlanMd(q, '## Milestone 1: One\n- [x] Grid (M) <!-- id:a1 -->\n  - Notes: Seven columns. Used CSS grid.\n');
check('G13 no space before punctuation', r3.notes[0]?.notes === 'Seven columns. Used CSS grid.', r3.notes[0]?.notes);
// G7
const src = U.normalize({ name: 'Orig', features: [{ id: 'f1', title: 'A' }], milestones: [{ id: 'm1', title: 'M', tasks: [{ id: 't1', title: 'x', feat: 'f1', splitFrom: 'tOld' }] }], sessions: [{ id: 'x1', mid: 'm1', tid: 't1', task: 'x' }], bugs: [{ id: 'b1', title: 'B' }] });
const c = U.duplicateProject(src);
const ct = c.milestones[0].tasks[0];
check('G7 a duplicate gets fresh ids', c.milestones[0].id !== 'm1' && ct.id !== 't1' && c.features[0].id !== 'f1' && c.bugs[0].id !== 'b1');
check('G7 links follow the new ids; the session log stays with the original (round 22)', ct.feat === c.features[0].id && c.sessions.length === 0 && ct.splitFrom && ct.splitFrom !== 'tOld');
check('G7 the original is untouched', src.milestones[0].tasks[0].id === 't1' && src.milestones[0].tasks[0].feat === 'f1');
const rc = U.readPlanMd(c, U.buildPlanMd(src).replace('- [ ]', '- [x]'));
check('G7 the original\'s PLAN.md no longer matches the copy by id', rc.ownIds === 0, rc.ownIds);
// G9
const back = U.parseShipyardMd(U.projectMarkdown(src));
const bt = back.milestones[0].tasks[0];
check('G9 export then import keeps the task\'s feature', bt.feat && bt.feat === back.features.find((f) => f.title === 'A')?.id, bt);
// G10 + G12
const long = U.mkChat({ q: 'q', a: 'x'.repeat(25000) });
check('G10 a long answer keeps 20,000 characters and says it was cut', long.a.length < 20100 && long.a.startsWith('x'.repeat(20000)) && /too long to keep/.test(long.a) && U.mkChat(long).a === long.a);
check('G12 a failed answer is remembered as failed', U.mkChat({ a: 'part', failed: true }).failed === true && U.mkChat({ a: 'x' }).failed === false);
// G15
const s = JSON.parse(U.settingsJson(U.normalize({ name: 'S', commands: 'npm install\nnpm test\nnpm run lint\nuv sync\nuv run pytest' })));
check('G15 installs exact, checks take arguments', JSON.stringify(s.permissions.allow) === JSON.stringify(['npm install', 'npm test *', 'npm run lint *', 'uv sync', 'uv run pytest *'].flatMap((c) => [`Bash(${c})`, `PowerShell(${c})`])), s.permissions.allow);
console.log(fails ? `${fails} failed` : 'all unit checks pass');
