const U = require('./unit-lib');
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); };
const proj = (name) => { const p = U.normalize({ name, pitch: 'Recipes into a week plan' }); U.applyStarter(p, 'web'); return p; };
const p = proj('Recipe Box');
const plan = U.buildPlanMd(p);
const [t1, t2, t3] = p.milestones[0].tasks;
const sum = (r) => ({ done: r.done.map((x) => x.t.title), doing: r.doing.map((x) => x.t.title), added: r.added.map((x) => x.title + '|' + (x.m ? x.m.title : 'NEW:' + x.nm.title) + '|' + x.notes), notes: r.notes.map((x) => x.notes), fixed: r.fixed.length, newMs: r.newMs.map((x) => x.title), gone: r.gone, unknown: r.unknown, ownIds: r.ownIds });
// F9: wording
check('PLAN.md how-to has one rule set and no hidden marker text', /How to use this file:\n- Fix any unchecked blocker under "Bugs to fix" first\. Then take the first unchecked task under a "Milestone" heading/.test(plan) && !/<!-- id -->/.test(plan) && /add it as a new "- \[ \]" line in the milestone it belongs to/.test(plan), plan.slice(0, 700));
const nx = U.nextCommandMd(p);
check('/next lets Claude add work and notes, and picks blockers then milestone tasks', /the first unchecked blocker under "Bugs to fix" if there is one, otherwise the first unchecked task \("- \[ \]"\) under a Milestone heading/.test(nx) && /add any extra work you found as a new "- \[ \]" line at the end of its milestone/.test(nx) && !/Change nothing else/.test(nx), nx);
// F3: notes
const lineOf = (t) => plan.split('\n').find((l) => l.includes('id:' + t.id));
let md = plan.replace(lineOf(t1), lineOf(t1).replace('- [ ]', '- [x]') + '\n  Notes: Used vitest 2.1');
let r = U.readPlanMd(p, md);
check('F3 a second Notes line is kept', JSON.stringify(sum(r).notes) === JSON.stringify([t1.notes.replace(/\s+$/, '') + '\nUsed vitest 2.1']) && r.done.length === 1, sum(r));
md = plan.replace(lineOf(t1), lineOf(t1) + '\n  - Notes: Picked React 19');
r = U.readPlanMd(p, md);
check('F3 a "- Notes:" bullet is kept', sum(r).notes[0]?.endsWith('\nPicked React 19'), sum(r));
const noteLine = (t) => '  Notes: ' + t.notes.split('\n').map((x) => x.trim()).filter(Boolean).join(' ');
md = plan.replace(noteLine(t1), '  Notes: Done with npm create vite. ' + noteLine(t1).slice(9));
r = U.readPlanMd(p, md);
check('F3 text put in front of the old note is kept', sum(r).notes[0]?.endsWith('\nDone with npm create vite.'), sum(r));
// same file twice does not add notes twice
const p2 = proj('Recipe Box');
const plan2 = U.buildPlanMd(p2);
const md2 = plan2.replace(/(<!-- id:[a-z0-9]+ -->\n  Notes: [^\n]*)/, '$1\n  Notes: Extra line');
U.applyPlanMd(p2, U.readPlanMd(p2, md2));
r = U.readPlanMd(p2, md2);
check('F3 pasting the same file again adds nothing', !r.notes.length, sum(r));
// F4: checkbox sub-steps are notes
md = plan.replace(lineOf(t2), lineOf(t2).replace('- [ ]', '- [x]') + '\n  - [x] Install vitest\n  - [ ] Add coverage');
r = U.readPlanMd(p, md);
check('F4 sub-steps go into notes, not new tasks', !r.added.length && r.done.length === 1 && /Install vitest \(done\)\nAdd coverage$/.test(sum(r).notes[0] || ''), sum(r));
// F5: reworded without its id
md = plan.replace(lineOf(t2), '- [x] Add Vitest and one passing test (S)');
r = U.readPlanMd(p, md);
check('F5 reworded task without id matches the closest one', !r.added.length && r.done.length === 1 && r.done[0].t.id === t2.id, sum(r));
// F10: a deleted task stays deleted
const p3 = proj('Recipe Box');
const plan3 = U.buildPlanMd(p3);
p3.milestones[0].tasks.splice(1, 1);
r = U.readPlanMd(p3, plan3);
check('F10 a task deleted here is not added back', !r.added.length && r.gone === 1, sum(r));
// F11: other headings and inserted milestones
md = plan + '\n## Ideas for later\n\n- [ ] Dark mode\n- [ ] Sharing\n';
r = U.readPlanMd(p, md);
check('F11 tasks under another heading are skipped', !r.added.length && r.unknown === 2, sum(r));
md = plan.replace('## Milestone 2: ', '## Milestone 2: Recipes\n\n- [ ] Add the recipe form (M)\n  Notes: Title and link\n\n## Milestone 3: ');
r = U.readPlanMd(p, md);
check('F11 a milestone Claude inserted becomes a new milestone', JSON.stringify(sum(r).newMs) === '["Recipes"]' && sum(r).added[0] === 'Add the recipe form|NEW:Recipes|Title and link', sum(r));
const p4 = proj('Recipe Box');
const u = U.applyPlanMd(p4, U.readPlanMd(p4, md.replace(/Recipe Box/, 'Recipe Box')));
check('F11 applied at its place', p4.milestones.map((m) => m.title).join('|') === 'Bare-bones version running|Recipes|' + p.milestones[1].title && p4.milestones[1].tasks[0].notes === 'Title and link', p4.milestones.map((m) => m.title));
U.undoPlanSync(u)(p4);
check('Undo removes the new milestone', p4.milestones.length === 2, p4.milestones.map((m) => m.title));
// a renamed milestone keeps matching through its task ids
const p5 = proj('Recipe Box');
const plan5 = U.buildPlanMd(p5);
p5.milestones[0].title = 'Get it running';
r = U.readPlanMd(p5, plan5.replace(/- \[ \] (Create a Vite[^\n]*)/, '- [x] $1') + '');
check('a milestone renamed here still matches by its tasks', r.done.length === 1 && !r.newMs.length && !r.added.length, sum(r));
// F14: markers
md = plan.replace(lineOf(t1), lineOf(t1).replace('- [ ]', '1. [x]')).replace(lineOf(t3), lineOf(t3).replace('- [ ]', '+ [x]'));
r = U.readPlanMd(p, md);
check('F14 numbered and + markers', r.done.length === 2, sum(r));
// F6: another project's file
const other = proj('Tide Clock');
r = U.readPlanMd(p, U.buildPlanMd(other).replace(/- \[ \] (Create a Vite[^\n]*)/, '- [x] $1'));
check('F6 another project: no ids of ours, other name', r.ownIds === 0 && r.ids > 0 && r.name === 'Tide Clock', sum(r));
// bugs: tick without id
const pb = proj('Recipe Box');
pb.bugs.push(U.mkBug({ title: 'List goes blank', severity: 'blocker' }), U.mkBug({ title: '', severity: 'major' }));
const pmd = U.buildPlanMd(pb);
check('F16 untitled bugs stay out of PLAN.md', !/Untitled bug/.test(pmd) && /List goes blank \(blocker\)/.test(pmd), pmd.slice(0, 900));
r = U.readPlanMd(pb, pmd.replace(/- \[ \] List goes blank \(blocker\) <!-- id:[a-z0-9]+ -->/, '- [x] List goes blank (blocker)'));
check('F14 a bug ticked without its id', r.fixed === undefined ? false : r.fixed.length === 1, sum(r));
// F7: settings
const ps = U.normalize({ name: 'S', commands: 'npm install\nnpm run dev\nnpm test  # runs vitest once\nnpm run build\ngit push\nnpm run deploy\nfirebase deploy\nvercel --prod\nrm -rf node_modules dist\npython manage.py runserver\nrails server\ndocker compose up\ncargo run\nRun the tests with npm test\nuv run pytest\nuv run pytest -q tests/\nnpx vitest run\ncargo test\npytest' });
const sc = U.safeCommands(ps);
check('F7 only install, test, build and check commands', JSON.stringify(sc) === JSON.stringify(['npm install', 'npm test', 'npm run build', 'uv run pytest', 'uv run pytest -q tests/', 'npx vitest run', 'cargo test', 'pytest']), sc);
const sj = JSON.parse(U.settingsJson(ps));
check('F7 settings has $schema, no redundant git rules, .env.example readable', sj.$schema === 'https://json.schemastore.org/claude-code-settings.json' && !sj.permissions.allow.some((x) => /git/.test(x)) && sj.permissions.deny.includes('Read(.env)') && sj.permissions.deny.indexOf('Read(!.env.example)') > sj.permissions.deny.indexOf('Read(.env.*)'), sj);
// F8: README issues
const R = (body) => U.parseDoc('# Tide Clock\n\nA tide page.\n\n' + body).bugs.map((b) => [b.title, b.actual]);
check('F8 "None at the moment" is not a bug', JSON.stringify(R('## Known issues\n\n- None at the moment\n')) === '[]', R('## Known issues\n\n- None at the moment\n'));
check('F8 an Issues section about reporting is skipped', JSON.stringify(R('## Issues\n\n- Search existing issues before opening a new one\n- Include steps\n')) === '[]', R('## Issues\n\n- Search existing issues before opening a new one\n'));
check('F8 a Bugs section about reporting is skipped', JSON.stringify(R('## Bugs\n\nFound a bug? Open an issue.\n\n1. Describe what happened\n2. Add a screenshot\n')) === '[]', R('## Bugs\n\nFound a bug? Open an issue.\n\n1. Describe what happened\n'));
check('F8 sub-items become the description', JSON.stringify(R('## Known issues\n\n- Chart is blank\n  - Only on iOS 17\n  - Fine on Android\n- Nothing renders on Safari 15\n')) === JSON.stringify([['Chart is blank', 'Only on iOS 17\nFine on Android'], ['Nothing renders on Safari 15', '']]), R('## Known issues\n\n- Chart is blank\n  - Only on iOS 17\n  - Fine on Android\n- Nothing renders on Safari 15\n'));
// F13: PLAN.md through Import
const imp = U.parseDoc(U.buildPlanMd(pb));
check('F13 a PLAN.md imports cleanly', imp.name === 'Recipe Box' && imp.pitch === 'Recipes into a week plan.' && imp.milestones.length === 2 && imp.milestones[0].tasks[0].title === pb.milestones[0].tasks[0].title && imp.milestones[0].tasks[0].size === pb.milestones[0].tasks[0].size && imp.milestones[0].tasks[0].notes === pb.milestones[0].tasks[0].notes.split('\n').map((x) => x.trim()).filter(Boolean).join(' ') && imp.milestones[0].goal && imp.bugs.length === 1 && imp.bugs[0].title === 'List goes blank' && imp.bugs[0].severity === 'blocker', { name: imp.name, pitch: imp.pitch, t: imp.milestones[0]?.tasks[0], bugs: imp.bugs });
// F12: sessions and lessons through Export
const pe = U.normalize({ name: 'E', sessions: [{ date: '2026-10-01', outcome: 'partly', task: 'Add list', summary: 'Line one\n- odd line', wrong: 'Edited README' }, { date: '', outcome: 'stuck', task: '', summary: '' }], lessons: [{ date: '2026-10-02', happened: 'It edited README too', change: 'Only touch named files' }] });
const ex = U.projectMarkdown(pe);
const back = U.parseShipyardMd(ex);
check('F12 sessions survive export and import', JSON.stringify(back.sessions.map((x) => [x.date, x.outcome, x.task, x.summary, x.wrong])) === JSON.stringify([['2026-10-01', 'partly', 'Add list', 'Line one\n- odd line', 'Edited README'], ['', 'stuck', '', '', '']]), { ex: ex.slice(ex.indexOf('## Sessions')), s: back.sessions });
check('F12 lessons word for word', back.lessons[0].happened === 'It edited README too', back.lessons[0]);
console.log('fails:', fails);
