// Round 31: review 6 fixes in the pure parts
const U = require('./unit-lib');
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); };
const seen = new Set();
// M1: a stuck session on a large task that was then split
const p = U.blankProject('Habits');
const m = U.mkMilestone({ title: 'Planner', tasks: [] }, seen);
const kids = ['Draw the grid', 'Drag on desktop', 'Drag on phones'].map((title) => U.mkTask({ title, status: 'done', doneAt: '2026-10-13', splitFrom: 'tL' }, seen));
m.tasks = kids;
p.milestones = [m];
p.sessions = [
  U.mkSession({ id: 'x1', date: '2026-10-12', mid: m.id, tid: 'tL', task: 'Build week grid', outcome: 'stuck', wrong: 'Dragging a habit onto a day scrolled the page on a phone.' }, seen),
  ...kids.map((t, i) => U.mkSession({ id: 'x' + (i + 2), date: '2026-10-13', mid: m.id, tid: t.id, task: t.title, outcome: 'done' }, seen)),
  U.mkSession({ id: 'x9', date: '2026-10-10', mid: 'other', tid: 'tZ', task: 'Elsewhere', outcome: 'done' }, seen),
];
check('split tasks keep where they came from', kids[0].splitFrom === 'tL', kids[0]);
let r = U.milestoneRecap(p, m);
check('M1: the stuck session on the task that was split counts', r.sessions === 4 && r.stuck === 1 && r.from === '2026-10-12' && r.wrong.length === 1, r);
check('M1: a session on a deleted task still counts by its milestone', (p.sessions.push(U.mkSession({ id: 'x8', date: '2026-10-11', mid: m.id, tid: 'gone', task: 'Removed', outcome: 'partly' }, seen)), U.milestoneRecap(p, m).sessions === 5));
p.sessions.pop();
// M2, L1: lessons found by session, then by text, even when the note was shortened
const long = 'npm test failed with ' + 'a very long error message that goes on '.repeat(8) + 'and ends here.';
const s2 = U.mkSession({ id: 'y1', date: '2026-10-12', mid: m.id, tid: kids[0].id, task: 'x', outcome: 'partly', wrong: long.slice(0, 199).replace(/\s+\S*$/, '') + '…' }, seen);
p.lessons = [U.mkLesson({ happened: long, change: 'Run one test file at a time', promoted: true, rule: 'Run one test file at a time' }, seen)];
check('L1: a shortened note still finds its lesson', U.lessonOf(p, s2)?.id === p.lessons[0].id);
check('L1: a short note does not match on its start alone', !U.sameNote('Claude broke the build again today', 'Claude…'));
p.lessons.push(U.mkLesson({ happened: 'Edited by the owner afterwards', sid: 'x1', change: 'Do not scroll', promoted: true, rule: 'Do not scroll' }, seen));
r = U.milestoneRecap(p, m);
check('M2: a lesson made from a session is found by its session, even after its text is edited', r.wrong[0].rule === 'Do not scroll', r.wrong);
check('L1: an ellipsis ends a sentence', U.sentence('it went on…') === 'it went on…' && U.sentence('done') === 'done.');
check('lessons keep their session through normalize', U.normalize({ kind: 'project', name: 'A', lessons: [{ id: 'l1', happened: 'x', sid: 'x1' }] }).lessons[0].sid === 'x1');
// M3: an example from before the flag
const old = JSON.parse(JSON.stringify(U.exampleProject('2026-10-01')));
delete old.example; old.name = 'Example: Recipe Box';
check('M3: an older example is known by its first session', U.normalize(old).example === true);
const dup = JSON.parse(JSON.stringify(old)); dup.sessions = [];
check('M3: a copy without its sessions is the owner\'s own', U.normalize(dup).example === false);
const mine = U.normalize({ kind: 'project', name: 'Recipe Box', sessions: [{ summary: 'Set up the project.' }] });
check('M3: a project of the owner\'s called Recipe Box is theirs', mine.example === false);
// L6: the example never needs attention for its made-up idle weeks
const ex = U.exampleProject('2026-09-01');
check('L6: no idle flag on the example', !U.projectPulse(ex, '2026-10-14').attention.some((x) => /No session/.test(x)), U.projectPulse(ex, '2026-10-14').attention);
// L2: Export plan, then Import, keeps done dates and each session's task
const e = U.exampleProject('2026-10-01');
const back = U.parseShipyardMd(U.projectMarkdown(e));
const doneDates = (q) => U.allTasks(q).filter((t) => t.status === 'done').map((t) => t.doneAt).join();
check('L2: done dates come back', doneDates(back) === doneDates(e) && doneDates(e).length > 0, [doneDates(back), doneDates(e)]);
check('L2: each session is back on its task', back.sessions.every((s) => s.tid && U.allTasks(back).some((t) => t.id === s.tid && t.title === s.task)), back.sessions.map((s) => [s.task, s.tid]));
const r1 = U.milestoneRecap(e, e.milestones[0]); const r2 = U.milestoneRecap(back, back.milestones[0]);
check('L2: Look back reads the same after the round trip', U.recapLine(r1) === U.recapLine(r2), [U.recapLine(r1), U.recapLine(r2)]);
check('L2: an older export without dates still imports', U.parseShipyardMd(U.projectMarkdown(e).replace(/, done \d{4}-\d{2}-\d{2}\)/g, ')')).milestones[0].tasks.every((t) => t.status === 'done' && t.doneAt === ''));
// L3: only the owner runs the commands
check('L3: /next and saved prompts are run by the owner only', /\ndisable-model-invocation: true\n---\n/.test(U.nextCommandMd(e)) && /\ndisable-model-invocation: true\n---\n/.test(U.commandMd({ title: 'Release notes', text: 'Write them.' })));
// a summary copied from Claude Code's terminal
const term = '⏺ Done. The grid now scrolls on phones.\n\n  Outcome: partly done\n  Went wrong: Touch drag still scrolls in Safari.';
check('the terminal bullet and indents are fine', JSON.stringify(U.sessionReport(term)) === '{"outcome":"partly","wrong":"Touch drag still scrolls in Safari."}', U.sessionReport(term));
check('even on the first line', U.sessionReport('⏺ Outcome: done\n  Went wrong: nothing').outcome === 'done');
console.log(fails ? `fails: ${fails}` : 'fails: 0');
process.exitCode = fails ? 1 : 0;
