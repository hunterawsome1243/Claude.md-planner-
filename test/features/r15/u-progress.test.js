const U = require('./unit-lib');
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); };
check('weeks start on Monday', U.weekOf('2026-10-14') === '2026-10-12' && U.weekOf('2026-10-12') === '2026-10-12' && U.weekOf('2026-10-18') === '2026-10-12' && U.weekOf('2026-10-19') === '2026-10-19', [U.weekOf('2026-10-14'), U.weekOf('2026-10-18')]);
check('across a month and a year', U.weekOf('2026-03-01') === '2026-02-23' && U.weekOf('2027-01-02') === '2026-12-28');
check('a bad date has no week', U.weekOf('') === '' && U.weekOf('soon') === '' && U.weekOf(undefined) === '');
const mk = (tasks, sessions) => U.normalize({ name: 'x', milestones: [{ id: 'm1', title: 'A', tasks }], sessions });
const p = mk([
  { id: 't1', title: 'a', status: 'done', doneAt: '2026-10-13' },
  { id: 't2', title: 'b', status: 'done', doneAt: '2026-10-05' },
  { id: 't3', title: 'c', status: 'done', doneAt: '2026-08-01' },
  { id: 't4', title: 'd', status: 'done' },
  { id: 't5', title: 'e', status: 'todo', doneAt: '2026-10-13' },
  { id: 't6', title: 'f', status: 'doing' },
  { id: 't7', title: 'g', status: 'todo' },
], [{ id: 'x1', date: '2026-10-14' }, { id: 'x2', date: '2026-09-28' }, { id: 'x3', date: 'not a date' }]);
const g = U.weeklyProgress(p, '2026-10-14');
check('8 weeks ending this week', g.weeks.length === 8 && g.weeks[7].week === '2026-10-12' && g.weeks[0].week === '2026-08-24', g.weeks.map((w) => w.week));
check('only done tasks with a date count, in their week', g.weeks[7].tasks === 1 && g.weeks[6].tasks === 1 && g.weeks.reduce((a, w) => a + w.tasks, 0) === 2, g.weeks.map((w) => w.tasks));
check('sessions count by date; a bad date is skipped', g.weeks[7].sessions === 1 && g.weeks[5].sessions === 1 && g.weeks.reduce((a, w) => a + w.sessions, 0) === 2);
// round 22: the pace covers the last four whole weeks plus this week so far (Wednesday: 3/7 of it)
check('pace and what is left', Math.abs(g.pace - 2 / (4 + 3 / 7)) < 1e-9 && g.left === 3 && g.daysLeft === 47 && g.weeksLeft === 7, [g.pace, g.left, g.daysLeft, g.weeksLeft]);
const one = U.weeklyProgress(mk([{ id: 't1', title: 'a', status: 'done', doneAt: '2026-10-13' }, { id: 't2', title: 'b', status: 'done', doneAt: '2026-10-12' }, { id: 't3', title: 'c', status: 'todo' }], []), '2026-10-14');
check('one busy week gives no estimate yet', one.weeksLeft === null && one.daysLeft === null, one);
const done = U.weeklyProgress(mk([{ id: 't1', title: 'a', status: 'done', doneAt: '2026-10-13' }, { id: 't2', title: 'b', status: 'done', doneAt: '2026-10-01' }], []), '2026-10-14');
check('nothing left, no estimate', done.left === 0 && done.weeksLeft === null);
check('doneAt survives normalize only as a date', U.mkTask({ status: 'done', doneAt: '2026-10-13' }).doneAt === '2026-10-13' && U.mkTask({ status: 'done', doneAt: 'yesterday' }).doneAt === '' && U.mkTask({}).doneAt === '');
console.log(fails ? `${fails} failed` : 'all unit checks pass');
