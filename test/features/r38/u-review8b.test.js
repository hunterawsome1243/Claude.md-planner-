// Round 38: review 8b part 2, unit checks
const U = require('./unit-lib');
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); };
const base = () => U.normalize({ name: 'ShiftSwap', pitch: 'Swap shifts.', createdAt: '2026-09-01T10:00:00Z',
  bugs: [{ id: 'b1', title: 'Swaps page crashes', severity: 'blocker' }],
  milestones: [{ id: 'm1', title: 'Approvals', tasks: [{ id: 't1', title: 'Add the approval endpoint', size: 'S' }, { id: 't2', title: 'Add a manager approval page', size: 'M' }, { id: 't3', title: 'Email the manager', size: 'S', status: 'done', doneAt: '2026-10-01' }] }] });

// M4: the day a task was ticked
const md = U.buildPlanMd(base());
check('a done task carries its day in PLAN.md', /- \[x\] Email the manager \(S, done 2026-10-01\) <!-- id:t3 -->/.test(md));
check('the how-to asks for the day on each tick', /On a task, also add today's date to its brackets: "\(S\)" becomes "\(S, done YYYY-MM-DD\)"\./.test(md));
check('so does /next', /for a task add today's date to its brackets: "\(S\)" becomes "\(S, done YYYY-MM-DD\)"/.test(U.nextCommandMd(base())));
check('reading it back changes nothing', U.planChangeText(U.readPlanMd(base(), md)) === '');
const ticked = md.replace('- [ ] Add the approval endpoint (S) <!-- id:t1 -->', '- [x] Add the approval endpoint (S, done 2026-10-06) <!-- id:t1 -->')
  .replace('- [ ] Add a manager approval page (M) <!-- id:t2 -->', '- [x] Add a manager approval page (M) (done 2026-10-08) <!-- id:t2 -->');
const p = base();
const r = U.readPlanMd(p, ticked);
check('both ways of writing the day are read', r.done.map((x) => `${x.t.id}@${x.at}`).join() === 't1@2026-10-06,t2@2026-10-08', r.done.map((x) => [x.t.id, x.at]));
const u = U.applyPlanMd(p, r);
check('applying dates each task on its own day', p.milestones[0].tasks[0].doneAt === '2026-10-06' && p.milestones[0].tasks[1].doneAt === '2026-10-08' && p.milestones[0].tasks[0].status === 'done');
U.undoPlanSync(u)(p);
check('Undo takes the days back off', p.milestones[0].tasks[0].status === 'todo' && p.milestones[0].tasks[0].doneAt === '');
const nodate = U.readPlanMd(base(), md.replace('- [ ] Add the approval endpoint (S) <!-- id:t1 -->', '- [x] Add the approval endpoint (S) <!-- id:t1 -->'));
check('a tick with no day has none, so the sync day is used', nodate.done.length === 1 && !nodate.done[0].at);
const future = U.readPlanMd(base(), md.replace('- [ ] Add the approval endpoint (S) <!-- id:t1 -->', '- [x] Add the approval endpoint (S, done 2099-01-01) <!-- id:t1 -->'));
const bad = U.readPlanMd(base(), md.replace('- [ ] Add the approval endpoint (S) <!-- id:t1 -->', '- [x] Add the approval endpoint (S, done 2026-02-30) <!-- id:t1 -->'));
check('a day in the future or one that does not exist is ignored', future.done.length === 1 && !future.done[0].at && bad.done.length === 1 && !bad.done[0].at && !future.added.length);
check('a task Claude Code added already done keeps its day', (() => { const q = base(); const x = U.readPlanMd(q, md.replace('## Milestone 1: Approvals\n', '## Milestone 1: Approvals\n\n- [x] Add an audit log (S, done 2026-10-07)\n')); U.applyPlanMd(q, x); const t = q.milestones[0].tasks.find((y) => y.title === 'Add an audit log'); return t && t.status === 'done' && t.doneAt === '2026-10-07'; })());
check('a wrapped line with a day is joined', U.joinWrapped(['- [x] Add a manager approval page that lists', '  pending swaps (M, done 2026-10-08) <!-- id:t2 -->']).length === 1);
check('a bug ticked with a day reads as fixed, not as a new bug', (() => { const x = U.readPlanMd(base(), md.replace('- [ ] Swaps page crashes (blocker) <!-- id:b1 -->', '- [x] Swaps page crashes (blocker, fixed 2026-10-08) <!-- id:b1 -->')); return x.fixed.length === 1 && !x.newBugs.length; })());
check('a bug Claude Code added with a day keeps a clean title', (() => { const x = U.readPlanMd(base(), md.replace('<!-- id:b1 -->', '<!-- id:b1 -->\n- [x] Login loops (major) (fixed 2026-10-08)')); return x.newBugs.length === 1 && x.newBugs[0].title === 'Login loops' && x.newBugs[0].severity === 'major' && x.newBugs[0].status === 'fixed'; })());
const imp = U.parsePlanFile(md);
check('importing a PLAN.md keeps the days', imp.milestones[0].tasks[2].doneAt === '2026-10-01' && imp.milestones[0].tasks[2].title === 'Email the manager');

// M8: a survey's progress notes and next steps
const survey = `<!-- shipyard:survey -->
# ShiftSwap

Lets shift workers swap shifts.

## Features
- [x] Shift swaps: workers offer a shift and a colleague takes it
- [ ] Manager approval: the approve and reject endpoints exist, there is no page for them yet
- [ ] Email digest: a weekly email of open swaps; only the template is written so far
- [ ] Dark mode: a dark theme for the whole app
- [ ] Reports: monthly hours per worker, but no export yet

## Next steps
- [ ] Add a manager approval page
- [ ] Write tests for the swap service
`;
const sp = U.parseDoc(survey);
const f = (t) => sp.features.find((x) => x.title === t);
check('progress wording leaves the feature', f('Manager approval').detail === '' && f('Email digest').detail === 'a weekly email of open swaps' && f('Reports').detail === 'monthly hours per worker', sp.features.map((x) => [x.title, x.detail]));
check('a description with no progress in it stays', f('Dark mode').detail === 'a dark theme for the whole app' && f('Shift swaps').detail === 'workers offer a shift and a colleague takes it');
const tasks = U.allTasks(sp);
const page = tasks.find((t) => t.title === 'Add a manager approval page');
check('a next step is linked to the feature it builds', page.feat === f('Manager approval').id && !tasks.find((t) => t.title === 'Write tests for the swap service').feat);
check('and carries where the feature stood', page.notes === 'Where it stood when imported: the approve and reject endpoints exist, there is no page for them yet.', page.notes);
const fin = tasks.filter((t) => /^Finish /.test(t.title)).map((t) => `${t.title}|${t.feat === f(t.title.slice(7))?.id}|${t.notes}`);
check('a started feature with no next step gets a task to finish it', fin.join('\n') === 'Finish Email digest|true|Where it stood when imported: only the template is written so far.\nFinish Reports|true|Where it stood when imported: no export yet.', fin);
check('those tasks go under Next steps', sp.milestones.length === 1 && sp.milestones[0].title === 'Next steps' && sp.milestones[0].tasks.length === 4);
check('CLAUDE.md no longer says what is missing', !/no page for them yet|so far|no export yet/.test(U.buildClaudeMd(sp)));
check('the survey asks Claude Code to put what is left under Next steps', /one line on what it will do when it is finished \(what is left to build goes under Next steps\)/.test(U.surveyPrompt()));
const plain = U.parseDoc('# Notes\n\n## Features\n- Manager approval: the endpoints exist, there is no page yet\n\n## To do\n- [ ] Add a manager approval page\n');
check('a document that is not a survey is left as written', plain.features[0].detail === 'the endpoints exist, there is no page yet' && !U.allTasks(plain)[0].feat);

// L9 and L11: counts and stuck sessions on All projects
const q = U.normalize({ name: 'Q', bugs: [{ id: 'x', title: '', severity: 'blocker' }, { id: 'y', title: 'Real bug', severity: 'major' }], milestones: [{ title: 'M', tasks: [{ id: 'ta', title: 'Do it' }] }] });
const pq = U.projectPulse(q, '2026-10-14');
check('an untitled bug row is counted nowhere', pq.openBugs === 1 && pq.blockers === 0, [pq.openBugs, pq.blockers]);
const st = U.normalize({ name: 'S', pitch: 'x', bugs: [{ id: 'b', title: 'Crash', severity: 'blocker' }], milestones: [{ title: 'M', tasks: [{ id: 'ta', title: 'Do it' }] }], sessions: [{ date: '2026-10-13', bid: 'b', task: 'Fix: Crash', outcome: 'stuck', wrong: 'The trace pointed at the wrong file' }] });
check('the last try on a bug is found', U.lastTry(st, null, st.bugs[0])?.wrong === 'The trace pointed at the wrong file' && !U.lastTry(st, st.milestones[0].tasks[0]));
check('All projects says the blocker got stuck', U.projectPulse(st, '2026-10-14').attention.join('|') === '1 blocking bug open|Stuck in the last session on the blocking bug', U.projectPulse(st, '2026-10-14').attention);
const st2 = U.normalize({ ...st, bugs: [], sessions: [{ date: '2026-10-13', mid: st.milestones[0].id, tid: 'ta', task: 'Do it', outcome: 'stuck' }] });
check('or the next task', U.projectPulse(st2, '2026-10-14').attention.join('|') === 'Stuck in the last session on the next task', U.projectPulse(st2, '2026-10-14').attention);
const st3 = U.normalize({ ...st2, sessions: [{ ...st2.sessions[0], outcome: 'partly' }] });
check('partly done is not flagged', !U.projectPulse(st3, '2026-10-14').attention.length);

// L10: the review steps of a project from its code
const fc = U.normalize({ name: 'F', pitch: 'x', audience: 'Shift workers', fromCode: true, features: [{ title: 'Swaps', priority: 'must', status: 'done' }] });
const g = (x, k) => U.guideSteps(x).find((s) => s.k === k);
check('features found in the code are not checked until the owner says so', !g(fc, 'features').done && /They look right/.test(g(fc, 'features').hint));
check('a brief with only who it is for is not done', !g(fc, 'brief').done);
const ok = U.normalize({ ...fc, checked: { features: true, brief: true, junk: true } });
check('checked steps are done, and nothing else is kept', g(ok, 'features').done && g(ok, 'brief').done && Object.keys(ok.checked).sort().join() === 'brief,features', ok.checked);
check('a full brief is done without a check', g(U.normalize({ ...fc, problem: 'b', doneWhen: 'c' }), 'brief').done);
check('a new project ignores the checks', !g(U.normalize({ name: 'N', checked: { brief: true } }), 'brief').done);
console.log(fails ? `fails: ${fails}` : 'fails: 0');
process.exitCode = fails ? 1 : 0;
