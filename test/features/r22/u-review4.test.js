// Round 22: review 4 fixes, the pure parts. Runs in Auckland time so a UTC date would show.
process.env.TZ = 'Pacific/Auckland';
const U = require('./unit-lib');
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); };
// H1
check('H1 the date is the local one: Monday 09:00 in Auckland is Oct 12', U.dayOf(new Date('2026-10-11T20:00:00Z')) === '2026-10-12', U.dayOf(new Date('2026-10-11T20:00:00Z')));
check('H1 a review timestamp shows its local date', U.localDay('2026-10-11T20:00:00Z') === '2026-10-12' && U.localDay('bad') === 'bad');
check('H1 today() is local', U.today() === U.dayOf(new Date()) && /^\d{4}-\d{2}-\d{2}$/.test(U.today()));
// M1
const mk = (tasks, extra) => U.normalize({ name: 'x', milestones: [{ id: 'm1', title: 'A', tasks }], ...extra });
const T = (id, size, status, doneAt) => ({ id, title: id, size, status, doneAt });
const young = mk([T('a1', 'M', 'done', '2026-10-05'), T('a2', 'M', 'done', '2026-10-07'), T('a3', 'M', 'done', '2026-10-09'), T('b1', 'M', 'done', '2026-10-12'), T('b2', 'M', 'done', '2026-10-14'), T('b3', 'M', 'done', '2026-10-16'),
  ...[1, 2, 3, 4, 5, 6].map((i) => T('c' + i, 'M', 'todo'))], { createdAt: '2026-10-05T08:00:00Z', targetDate: '2026-10-31' });
const gy = U.weeklyProgress(young, '2026-10-17');
const ty = U.targetCheck(gy, young.targetDate, '2026-10-17');
check('M1 a two-week-old project is paced on its two weeks, not four', gy.weeksLeft === 2 && ty.state === 'onpace', [gy.daysLeft, gy.weeksLeft, ty]);
const steadyTasks = [];
let k = 0;
for (let w = 0; w < 6; w++) for (let d = 0; d < 5; d++) steadyTasks.push(T('s' + k++, 'S', 'done', U.addDays('2026-09-07', w * 7 + d)));
const left = [...Array(10)].map((_, i) => T('l' + i, 'S', 'todo'));
const asOf = (d) => steadyTasks.map((t) => (t.doneAt <= d ? t : T(t.id, 'S', 'todo')));
const mon = U.weeklyProgress(mk([...asOf('2026-10-12'), ...left], { createdAt: '2026-08-01T00:00:00Z' }), '2026-10-12');
const sun = U.weeklyProgress(mk([...steadyTasks, ...left], { createdAt: '2026-08-01T00:00:00Z' }), '2026-10-18');
const fm = U.targetCheck(mon, '', '2026-10-12').finish; const fs = U.targetCheck(sun, '', '2026-10-18').finish;
check('M1 a steady pace gives the same finish on Monday and Sunday, give or take a day', Math.abs(U.daysBetween(fm, fs)) <= 1, [fm, fs, mon.daysLeft, sun.daysLeft]);
check('M1 one week of work is not a pace yet', U.weeklyProgress(mk([T('a', 'S', 'done', '2026-10-13'), T('b', 'S', 'todo')], { createdAt: '2026-10-12T08:00:00Z' }), '2026-10-14').weeksLeft === null);
// M3, L2
check('M3 a target with no tasks is not "all done"', U.targetCheck(U.weeklyProgress(mk([]), '2026-10-14'), '2026-11-20', '2026-10-14').state === 'noplan');
const pulse = U.projectPulse(U.normalize({ name: 'Empty', pitch: 'x', targetDate: '2026-11-20' }), '2026-10-14');
check('M3 its card says no plan, not done', pulse.tc.state === 'noplan' && pulse.attention.includes('No plan yet'), pulse);
check('L2 late by days while under a week, weeks after', U.lateText({ lateDays: 3, late: 1 }) === '3 days' && U.lateText({ lateDays: 1, late: 1 }) === '1 day' && U.lateText({ lateDays: 15, late: 2 }) === 'about 2 weeks');
// L3
const p3 = mk([T('x', 'S', 'done', '2026-10-01')]);
check('L3 the summary of last week says last week', /Done: nothing marked done last week\./.test(U.weekSummary(p3, '2026-10-05', 'last week')) && /nothing marked done that week\./.test(U.weekSummary(p3, '2026-10-05')));
// L5
const md = U.mdLite;
check('L5 __init__.py is not bold', !/<b>/.test(md('Edit app/__init__.py and __init__.py today')), md('Edit app/__init__.py and __init__.py today'));
check('L5 __bold__ still works', md('This is __really__ important.') === '<p>This is <b>really</b> important.</p>', md('This is __really__ important.'));
const link = md('See [Python](https://en.wikipedia.org/wiki/Python_(programming_language)) here.');
check('L5 a link with brackets keeps them', /href="https:\/\/en.wikipedia.org\/wiki\/Python_\(programming_language\)"/.test(link) && !/\)\s*here/.test(link.replace(/<span class="link-host">[^<]*<\/span>/g, '').replace(/<[^>]+>/g, '')), link);
const code = md('1. Run it:\n   ```sh\n   npm test\n     indented\n   ```\n2. Done');
check('L5 code inside a list item loses only the item indent', /<pre><code>npm test\n  indented<\/code><\/pre>/.test(code), code);
// L6
const src = U.normalize({ name: 'Orig', milestones: [{ id: 'm1', title: 'A', tasks: [T('t1', 'S', 'done', '2026-10-13')] }], sessions: [{ id: 'x1', date: '2026-10-13', task: 't1' }] });
const dup = U.duplicateProject(src);
check('L6 a copy starts its own history', dup.sessions.length === 0, dup.sessions);
check('L6 done dates are cleared, status kept', dup.milestones[0].tasks[0].doneAt === '' && dup.milestones[0].tasks[0].status === 'done' && dup.guideHidden === true && src.sessions.length === 1);
// M5
const cmds = U.promptCommands(U.normalize({ prompts: [{ id: 'q1', title: 'Review', text: 'Look it over' }, { id: 'q2', title: 'Plan', text: 'x' }, { id: 'q3', title: 'Write release notes', text: 'x' }, { id: 'q4', title: 'Next', text: 'x' }, { id: 'q5', title: 'Cost', text: 'x' }] }));
check('M5 built-in names and aliases get -prompt', JSON.stringify(cmds.map((c) => c.slug)) === JSON.stringify(['review-prompt', 'plan-prompt', 'write-release-notes', 'next-2', 'cost-prompt']), cmds.map((c) => c.slug));
const body = U.commandMd({ title: 'Price check', text: 'Flag anything over $1 or $25.\nRun !`git status` first.\nKeep KEY=!`x` and \\$5 as they are.\n```!\nls\n```' });
check('M5 $1 is escaped, !` cannot run, an escape is not doubled', body.includes('over \\$1 or \\$25.') && body.includes('Run ! `git status` first.') && body.includes('KEY=!`x`') && body.includes(' \\$5 ') && !body.includes('\\\\$5') && !/^```!/m.test(body), body);
check('M5 $ARGUMENTS is left for Claude Code', U.commandMd({ title: 'x', text: 'Fix $ARGUMENTS now' }).includes('Fix $ARGUMENTS now'));
console.log(fails ? `${fails} failed` : 'all unit checks pass');
