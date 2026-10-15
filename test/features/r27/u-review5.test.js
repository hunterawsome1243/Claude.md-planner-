// Round 27: review 5 fixes, the pure parts. Runs in Auckland time so a UTC date would show.
process.env.TZ = 'Pacific/Auckland';
const U = require('./unit-lib');
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); };
const now = '2026-10-14';
// M2: made on a Monday morning in Auckland is still Sunday in UTC
const T = (id, status, doneAt) => ({ id, title: id, size: 'S', status, doneAt });
const tasks = [T('a', 'done', '2026-09-29'), T('b', 'done', '2026-09-30'), T('c', 'done', '2026-10-06'), T('d', 'done', '2026-10-07'), T('e', 'todo'), T('f', 'todo'), T('g', 'todo'), T('h', 'todo')];
const mk = (createdAt) => U.normalize({ name: 'x', createdAt, milestones: [{ id: 'm1', title: 'A', tasks }] });
const morning = U.weeklyProgress(mk('2026-09-27T20:00:00Z'), now); // Monday Sep 28, 09:00 in Auckland
const afternoon = U.weeklyProgress(mk('2026-09-28T01:00:00Z'), now); // Monday Sep 28, 14:00
check('M2 made in the morning or the afternoon, the same estimate', morning.daysLeft === afternoon.daysLeft && morning.daysLeft === 17, [morning.daysLeft, afternoon.daysLeft]);
check('M2 All projects agrees', U.projectPulse(mk('2026-09-27T20:00:00Z'), now).tc.finish === U.projectPulse(mk('2026-09-28T01:00:00Z'), now).tc.finish);
// M1 and L7: the example
const ex = U.exampleProject(now);
check('M1 the example is flagged and saves the flag', ex.example === true && U.normalize(JSON.parse(JSON.stringify(ex))).example === true && U.normalize({ name: 'mine' }).example === false);
check('M1 a copy of it is your own project', U.duplicateProject(ex).example === false);
check('L7 its name is plain, so files and prompts do not say "Example:"', ex.name === 'Recipe Box' && !/Example:/.test(JSON.stringify(ex)));
const dec = ex.decisions[0];
check('L7 its storage decision fits planning and shopping on a phone', /one phone/.test(dec.text) && /same phone/.test(dec.why), dec);
check('L7 past weeks are kept, as its data model and tasks say', /Past weeks are kept/.test(ex.features[1].detail));
// L1
const g0 = { total: 0, left: 0, weeksLeft: null, daysLeft: null };
check('L1 a past target with no plan has passed', U.targetCheck(g0, '2026-10-01', now).state === 'passed' && U.targetCheck(g0, '2026-10-20', now).state === 'noplan');
const pulse = U.projectPulse(U.normalize({ name: 'x', pitch: 'p', targetDate: '2026-10-01' }), now);
check('L1 All projects flags it', pulse.attention.includes('The target date has passed'), pulse.attention);
// L3
const sp = U.normalize({ name: 'x', milestones: [{ id: 'm1', title: 'A', tasks: [{ id: 't2', title: 'Lay out the grid', splitFrom: 't1' }, { id: 't3', title: 'Drag', splitFrom: 't1' }] }],
  sessions: [{ id: 'x1', date: '2026-10-10', mid: 'm1', tid: 't1', task: 'Week planner', outcome: 'stuck', wrong: 'Touch drags scroll the page.' }] });
const t2 = sp.milestones[0].tasks[0];
check('L3 a split part keeps the larger task\'s sessions', U.taskLineage(t2).join() === 't2,t1' && U.taskHistory(sp, t2).map((s) => s.id).join() === 'x1');
const pr = U.taskPrompt(sp, sp.milestones[0], t2);
check('L3 its prompt says where they came from', /An earlier session on the larger task this was split from:\n- Oct 10, stuck: What went wrong: Touch drags scroll the page\./.test(pr), pr);
sp.sessions.push({ id: 'x2', date: '2026-10-12', mid: 'm1', tid: 't2', task: 'Lay out the grid', outcome: 'partly', summary: 'Half done', wrong: '' });
check('L3 with its own too, both are named', /Earlier sessions on this task and the larger task it was split from:/.test(U.taskPrompt(U.normalize(sp), sp.milestones[0], t2)));
// L5
const cmds = U.promptCommands(U.normalize({ prompts: [{ id: 'q1', title: 'Design sync', text: 'x' }, { id: 'q2', title: 'Fewer permission prompts', text: 'x' }, { id: 'q3', title: 'Usage credits', text: 'x' }, { id: 'q4', title: 'Workflow authoring', text: 'x' }] }));
check('L5 newer built-in names are kept free', cmds.map((c) => c.slug).join() === 'design-sync-prompt,fewer-permission-prompts-prompt,usage-credits-prompt,workflow-authoring-prompt', cmds.map((c) => c.slug));
// L6
const st = JSON.parse(U.settingsJson(U.normalize({ name: 'x', commands: 'npm test' })));
check('L6 .env files and secrets at any depth, .env.example still readable', st.permissions.deny.join('|') === 'Read(.env)|Read(.env.*)|Read(!.env.example)|Read(secrets/**)', st.permissions.deny);
console.log(`unit-review5 fails: ${fails}`);
