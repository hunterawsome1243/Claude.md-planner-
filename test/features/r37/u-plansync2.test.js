// Round 37: PLAN.md that stays in step with Shipyard (review 8b), unit checks
const U = require('./unit-lib');
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); };
const base = () => U.normalize({ name: 'ShiftSwap', pitch: 'Swap shifts.',
  bugs: [{ id: 'b1', title: 'Swaps page crashes', severity: 'blocker' }, { id: 'b2', title: 'Old typo', severity: 'minor', status: 'fixed' }],
  milestones: [{ id: 'm1', title: 'Approvals', tasks: [{ id: 't1', title: 'Add the approval endpoint', size: 'S' }, { id: 't2', title: 'Add a manager approval page', size: 'M' }] }] });

// fixed bugs stay in PLAN.md, ticked
const md = U.buildPlanMd(base());
check('a fixed bug is listed ticked, after the open ones', /- \[ \] Swaps page crashes \(blocker\) <!-- id:b1 -->[\s\S]*\n- \[x\] Old typo \(minor\) <!-- id:b2 -->\n/.test(md), md.split('\n').filter((l) => /Swaps|typo/.test(l)));
const allFixed = U.normalize({ name: 'X', bugs: [{ id: 'b', title: 'Done bug', status: 'fixed' }] });
check('with only fixed bugs the section is still there', /## Bugs to fix[\s\S]*- \[x\] Done bug/.test(U.buildPlanMd(allFixed)));
check('reading it back changes nothing', U.planChangeText(U.readPlanMd(base(), md)) === '');
// the fix prompt ticks its line
const bp = U.bugPrompt(base(), base().bugs[0]);
check('the fix prompt says to tick the bug in PLAN.md', /5\. Run the app and check that the bug is gone\. If PLAN\.md lists it under "Bugs to fix", change its "- \[ \]" to "- \[x\]"\./.test(bp), bp.split('\n').filter((l) => /^5\./.test(l)));
const bpt = U.bugPrompt(U.normalize({ ...base(), commands: 'npm test' }), base().bugs[0]);
check('with tests, it runs them first', /5\. Run the tests from Commands in CLAUDE\.md, then check that the bug is gone\. If PLAN\.md lists it/.test(bpt));

// bugs Claude Code adds
const withNew = md.replace('## Milestone 1', '- [ ] Approving twice sends two emails (major)\n- [x] Login button is grey (minor)\n- [ ] swaps page crashes (blocker)\n\n## Milestone 1');
const r1 = U.readPlanMd(base(), withNew);
check('a bug line without an id is a new bug, with its severity and tick', JSON.stringify(r1.newBugs) === JSON.stringify([{ title: 'Approving twice sends two emails', severity: 'major', status: 'open' }, { title: 'Login button is grey', severity: 'minor', status: 'fixed' }]), r1.newBugs);
check('one with the name of a bug here is not added twice', !r1.newBugs.some((x) => /crashes/i.test(x.title)));
check('the change text counts them', /2 new bugs added/.test(U.planChangeText(r1)), U.planChangeText(r1));
const p1 = base();
const u1 = U.applyPlanMd(p1, r1);
check('applying adds them at the top of the bug list', p1.bugs.map((b) => b.title + ':' + b.status).slice(0, 2).join() === 'Approving twice sends two emails:open,Login button is grey:fixed', p1.bugs.map((b) => b.title));
U.undoPlanSync(u1)(p1);
check('and Undo takes them out', p1.bugs.length === 2);
const notes = md.replace('<!-- id:b1 -->', '<!-- id:b1 -->\n  Notes: the crash is in the swap list query');
check('a Notes line under a bug is counted, not lost silently', U.readPlanMd(base(), notes).bugNotes === 1 && U.readPlanMd(base(), md).bugNotes === 0);

// a PLAN.md Shipyard did not make
const own = '# ShiftSwap roadmap\n\nSome intro text.\n\n## Now\n- [x] Add the approval endpoint\n- [ ] Approvals UI for managers\n  Notes: list pending swaps\n\n## Later\n- [ ] Email digest\n\n## Bugs\n- [ ] Dark mode flickers (minor)\n';
const r2 = U.readPlanMd(base(), own);
check('it is recognised as not made by Shipyard', r2.foreign === true && U.readPlanMd(base(), md).foreign === false);
check('a task with the same name is matched, and its tick read', r2.found === 1 && r2.done.length === 1 && r2.done[0].t.id === 't1');
check('its headings become milestones with the other tasks', r2.newMs.map((m) => m.title + ':' + m.tasks.map((t) => t.title).join('+')).join('|') === 'Now:Approvals UI for managers|Later:Email digest', r2.newMs.map((m) => [m.title, m.tasks.map((t) => t.title)]));
check('notes under a new task come along', r2.newMs[0].tasks[0].notes === 'list pending swaps');
check('a Bugs heading lists bugs', r2.newBugs.length === 1 && r2.newBugs[0].title === 'Dark mode flickers' && r2.newBugs[0].severity === 'minor');
const p2 = base();
U.applyPlanMd(p2, U.readPlanMd(p2, own));
check('applying puts the new milestones at the end, in order', p2.milestones.map((m) => m.title).join() === 'Approvals,Now,Later' && p2.milestones[0].tasks[0].status === 'done', p2.milestones.map((m) => m.title));
const loose = U.readPlanMd(base(), '- [ ] Write the README\n- [ ] Add a license');
check('tasks under no heading go into "From PLAN.md"', loose.foreign && loose.newMs.length === 1 && loose.newMs[0].title === 'From PLAN.md' && loose.newMs[0].tasks.length === 2);
check('a heading named like a milestone here adds to it', U.readPlanMd(base(), '## Approvals\n- [ ] Show who approved').added.filter((x) => x.m?.id === 'm1').length === 1);

// lines a narrow terminal broke
const J = U.joinWrapped;
check('an id comment split over two lines is joined', J(['- [ ] Add the approval endpoint (S) <!-- id:', '  t1 -->']).join('\n') === '- [ ] Add the approval endpoint (S) <!-- id:t1 -->', J(['- [ ] Add the approval endpoint (S) <!-- id:', '  t1 -->']));
check('so is an id split in the middle', J(['- [ ] X (S) <!-- id:t', '1 -->']).join('\n') === '- [ ] X (S) <!-- id:t1 -->');
check('a task line whose end wrapped is joined', J(['- [ ] Add a manager approval page that lists', '  pending swaps (M) <!-- id:t2 -->']).join('\n') === '- [ ] Add a manager approval page that lists pending swaps (M) <!-- id:t2 -->');
check('a Notes line that runs on is joined with a space', J(['  Notes: the test DB needed', '  connection_limit=1.']).join('\n') === '  Notes: the test DB needed connection_limit=1.');
check('a finished Notes line is not joined to the next', J(['  Notes: done.', '  Also checked the logs']).length === 2);
check('a sub-item is never joined', J(['- [ ] X (S) <!-- id:t1 -->', '  - [x] a step']).length === 2);
const wrapped = md.replace('Add a manager approval page (M) <!-- id:t2 -->', 'Add a manager approval page (M) <!--\n  id:t2 -->').replace('- [ ] Add the approval endpoint (S) <!-- id:t1 -->', '- [x] Add the approval endpoint (S) <!-- id:t1 -->\n  Notes: the endpoint needed a\n  new migration.');
const r3 = U.readPlanMd(base(), wrapped);
check('a wrapped paste reads the tick and one clean note', r3.done.length === 1 && r3.notes.length === 1 && r3.notes[0].notes === 'the endpoint needed a new migration.' && !r3.added.length, [r3.done.length, r3.notes.map((n) => n.notes), r3.added.map((x) => x.title)]);
const frag = md.replace('<!-- id:t1 -->', '<!-- id:t1 -->\n  id:t9x -->\n  -->');
check('pieces of comments never become notes', U.readPlanMd(base(), frag).notes.length === 0, U.readPlanMd(base(), frag).notes.map((n) => n.notes));
console.log(fails ? `fails: ${fails}` : 'fails: 0');
process.exitCode = fails ? 1 : 0;
