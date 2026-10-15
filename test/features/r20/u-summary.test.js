const U = require('./unit-lib');
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); };
const p = U.normalize({ name: 'Recipe Box', milestones: [
  { id: 'm1', title: 'Basics', tasks: [{ id: 't1', title: 'Lay out the grid', status: 'done', doneAt: '2026-10-13' }, { id: 't2', title: 'Old one', status: 'done', doneAt: '2026-10-06' }] },
  { id: 'm2', title: '', tasks: [{ id: 't3', title: 'Save the plan', status: 'done', doneAt: '2026-10-14' }, { id: 't4', title: 'Share it', status: 'todo' }] },
], sessions: [{ id: 'x1', date: '2026-10-13', task: 'Grid', outcome: 'done' }, { id: 'x2', date: '2026-10-14', task: 'Drag and drop', outcome: 'stuck', wrong: 'It broke\nthe page' }, { id: 'x3', date: '2026-10-01', task: 'Old' }],
bugs: [{ id: 'b1', title: 'Crash', severity: 'blocker', date: '2026-10-01' }, { id: 'b2', title: 'Typo', severity: 'minor', date: '2026-10-01' }, { id: 'b3', title: 'Fixed', status: 'fixed', date: '2026-10-01' }] }); // dated, so the week holds no bug reports (round 47 lists them)
const s = U.weekSummary(p, '2026-10-12');
check('a week summary lists done tasks, sessions, next up and bugs', s === [
  '# Recipe Box: week of Oct 12', '',
  'Done (2):', '- Lay out the grid (Milestone 1: Basics)', '- Save the plan (Milestone 2)', '',
  'Claude Code sessions (2):', '- Oct 13, done: Grid', '- Oct 14, stuck: Drag and drop. What went wrong: It broke the page', '',
  'Plan: 3 of 4 tasks done. Next up: Share it.', 'Open bugs: 2, 1 blocking.', ''].join('\n'), s);
check('an empty week says so', /Done: nothing marked done that week\./.test(U.weekSummary(p, '2026-09-14')) && !/sessions/.test(U.weekSummary(p, '2026-09-14')));
check('this week while it has work', JSON.stringify(U.summaryWeek(p, '2026-10-14')) === JSON.stringify({ week: '2026-10-12', label: "this week's" }));
check('last week while this one is empty', JSON.stringify(U.summaryWeek(p, '2026-10-19')) === JSON.stringify({ week: '2026-10-12', label: "last week's" }));
{ // round 47: bugs reported and fixed in the week get their own sections
  const q = U.normalize({ name: 'Recipe Box', bugs: [{ id: 'b1', title: 'Crash', severity: 'blocker', date: '2026-10-13' }, { id: 'b3', title: 'Old', status: 'fixed', date: '2026-10-01', fixedAt: '2026-10-14' }] });
  const w = U.weekSummary(q, '2026-10-12');
  check('bugs reported and fixed that week are listed', /\nBugs reported \(1\):\n- Oct 13: Crash \(blocker\)\n/.test(w) && /\nBugs fixed \(1\):\n- Oct 14: Old\n/.test(w), w);
}
console.log(fails ? `${fails} failed` : 'all unit checks pass');
