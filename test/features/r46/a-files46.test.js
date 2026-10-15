// Round 46: the files and prompts Claude Code gets (review 10a). Pure parts are loaded from app.js; the setup prompt and the
// ready-made prompts are read from a page with them exposed.
const fs = require('fs');
const path = require('path');
const { launch, open, check, results } = require('./lib');
const TEST = process.env.TESTDIR || path.join(__dirname, '..', '..');
const APPJS = process.env.APPJS || path.join(TEST, '..', 'src', 'app.js');
const src = fs.readFileSync(APPJS, 'utf8').split('\n');
const end = src.findIndex((l) => l.startsWith('/* ================= health'));
const U = new Function('localStorage', 'document', 'window', src.slice(3, end).join('\n') + '\nfunction isPlain(v) { return !!v && typeof v === "object" && !Array.isArray(v); }\n'
  + 'return { normalize, blankProject, applyStarter, STARTERS, ownTasks, buildClaudeMd, taskPrompt, bugPrompt, buildPlanMd, readPlanMd, nextCommandMd, reviewerMd, testerMd, settingsJson, safeCommands, sessionReport, surveyPrompt, parseDoc, allTasks, hasTests };')({}, {}, {});
const VAR = path.join(__dirname, 'hooked.html');
{ const s = fs.readFileSync(path.join(TEST, 'mocked.html'), 'utf8'); const i = s.lastIndexOf('initCapabilities();\n})();');
  fs.writeFileSync(VAR, s.slice(0, i) + 'window.__T = { saveAllPrompt, quickPrompt, QUICK, active, S };\n' + s.slice(i)); }

const starter = (k, name = 'Habit Hive') => { const p = U.blankProject(name); U.applyStarter(p, k); return p; };
const proj = (o) => U.normalize({ kind: 'project', name: 'Habit Hive', pitch: 'Track habits.', ...o });

// ---------- H1: git first; a check not set up yet is not a failure ----------
const starters = U.STARTERS.filter((s) => s.build).map((s) => [s.k, starter(s.k, 'csv tidy')]);
const firstNotes = starters.map(([k, p]) => [k, p.milestones[0].tasks[0].notes]);
check('every starter starts git in its first task', firstNotes.every(([k, n]) => (k === 'cli' ? /uv init --package .*starts git/ : /^First run git init, unless this folder is already in git\./).test(n)), firstNotes.filter(([k, n]) => !/git/.test(n)).map(([k]) => k));
check('milestone 1 ends by committing the setup', starters.every(([, p]) => p.milestones[0].tasks.at(-1).title === 'Commit the setup to git'), starters.map(([k, p]) => k + ': ' + p.milestones[0].tasks.at(-1).title));
check('the Expo copy leaves a .git folder behind', /including hidden files such as \.gitignore, but not a \.git folder/.test(starter('mobile').milestones[0].tasks[0].notes));
const old = starter('web');
old.milestones[0].tasks[3].title = 'Put the project in git and make the first commit';
check('a project made with the old git task title still counts it as the starter\'s own', !U.ownTasks(old).length, U.ownTasks(old).map((t) => t.title));
const web = starter('web');
const md = U.buildClaudeMd(web);
check('CLAUDE.md: a check that is not set up yet is not a failure', md.includes('After each step run the tests from Commands and fix failures before moving on. A check that is not set up yet (a later task adds it) is not a failure: say so and go on.'));
const rv = U.reviewerMd(web);
check('reviewer: git status, new files, no commits yet, no git yet', rv.includes('1. Run `git status` and `git diff` to see what changed, and read the new files git status lists. If nothing changed since the last commit, review that commit with `git show`. If this folder is not in git yet, read the files the task names.'));
check('reviewer: a check whose script is missing is "not set up yet"', /4\. Run the checks: `npm test`, `npm run build`\. One whose script or setup does not exist yet \(a later task adds it\) is "not set up yet", not a failure\./.test(rv), rv.split('\n').find((l) => l.startsWith('4.')));
check('test runner: "Missing script" is "not set up yet"', U.testerMd(web).includes('(such as "Missing script: test") is "not set up yet", not a failure'));
check('/next: a check not set up yet is not a failure', U.nextCommandMd(web).includes('A check that is not set up yet (a later task adds it) is not a failure: say so.'));

// ---------- H2, L1, M6: CLAUDE.md's How to work ----------
check('CLAUDE.md ticks PLAN.md with the day and does not name /next', md.includes('- The plan is in PLAN.md, and its top says how to use it. When a task works, tick it there: "- [ ]" becomes "- [x]", and "(S)" becomes "(S, done YYYY-MM-DD)" with today\'s date.') && !md.includes('/next'));
check('one go-ahead rule, the same as the prompts', md.includes('- Tasks marked (S) and small fixes: go ahead. Anything bigger: outline the plan first and wait for a go-ahead.') && !md.includes('bigger than a small fix'));
check('the web starter has no second dependency rule', !/Ask before adding a new library/.test(web.conventions) && (md.match(/Ask before adding/g) || []).length === 1 && !/Ask before adding a dependency/.test(starter('cli').conventions));

// ---------- H2, M3: the task prompt ticks its own PLAN.md line ----------
const s = web.milestones[0].tasks[0];
const tp = U.taskPrompt(web, web.milestones[0], s);
check('an (S) task prompt ticks its line by id, with the day', tp.includes(`4. If this folder has PLAN.md, tick this task there once it works: on its line (the one ending in "<!-- id:${s.id} -->"), change "- [ ]" to "- [x]" and make its brackets "(S, done YYYY-MM-DD)" with today's date.`), tp.split('\n').find((l) => l.startsWith('4.')));
const mt = web.milestones[0].tasks[2];
check('an (M) task gets its own size in the brackets', U.taskPrompt(web, web.milestones[0], mt).includes('make its brackets "(M, done YYYY-MM-DD)"'));
const lt = { ...mt, size: 'L' };
const ltp = U.taskPrompt(web, web.milestones[0], lt);
check('an (L) task writes its steps under its line and ticks itself last', ltp.includes(`4. If this folder has PLAN.md, write your steps as indented "- [ ]" lines under its line (the one ending in "<!-- id:${mt.id} -->") and tick each step you finish. Tick the task itself, with "(L, done YYYY-MM-DD)" and today's date, only when every step is done.`) && ltp.includes('Tell me how you would split it into steps'));
check('task prompts end with the log lines and nothing after them', /5\. Finish with a short summary of what changed and anything I should test by hand\. End with two lines for my log: "Outcome: done" \(or "partly done", or "stuck"\), then "Went wrong:" and what went wrong, or "nothing"\. Put nothing after them\.$/.test(tp));
check('the first task: a check a later task sets up is said, not set up now', tp.includes('If one is not set up yet (a later task adds it), say so rather than setting it up now.'));
const plan = U.buildPlanMd(web);
check('PLAN.md says how a large task is split', plan.includes('- A large (L) task can be split into steps: indented "- [ ]" lines under it, done in order. Tick the task itself only when all its steps are ticked.'));
const nx = U.nextCommandMd(web);
check('/next works the first unchecked step of a split task', nx.includes('If it is a task with indented "- [ ]" steps under it, work on its first unchecked step.') && nx.includes('If it is marked (L) and has no steps yet, tell me how you would split it into steps, wait for my OK, write them as indented "- [ ]" lines under it, then do only the first one.') && nx.includes('tick the task itself only when all its steps are ticked'));
// steps under a task come back into Shipyard as its notes, and the task stays open until it is ticked
{
  const q = proj({ milestones: [{ id: 'm1', title: 'Basics', tasks: [{ id: 't1', title: 'Streak engine', size: 'L' }, { id: 't2', title: 'Calendar', size: 'M' }] }] });
  const txt = U.buildPlanMd(q).replace(/(- \[ \] Streak engine.*)/, '$1\n  - [x] Count days in a row\n  - [ ] Reset after a missed day');
  const r = U.readPlanMd(q, txt);
  check('steps under an (L) task read back as its notes; the task stays open', !r.done.length && r.notes.length === 1 && /Count days in a row \(done\)\nReset after a missed day/.test(r.notes[0].notes) && !r.added.length, { done: r.done.length, notes: r.notes.map((n) => n.notes), added: r.added.length });
}

// ---------- M1: one has-tests check ----------
const nt = proj({ commands: 'npm install\nnpm run dev', milestones: [{ id: 'm1', title: 'Basics', tasks: [{ id: 't1', title: 'Quiz screen', size: 'M' }] }], bugs: [{ id: 'b1', title: 'Score resets', severity: 'major' }] });
check('no tests: the fix prompt adds no test setup', U.bugPrompt(nt, nt.bugs[0]).includes('3. This project has no tests yet, so do not add a test setup unless I ask.') && !U.bugPrompt(nt, nt.bugs[0]).includes('next to the existing tests'));
check('no tests: the task prompt runs the app and adds no test setup', U.taskPrompt(nt, nt.milestones[0], nt.milestones[0].tasks[0]).includes('3. Check your work by running the app (Commands in CLAUDE.md says how) before saying it is done. There are no tests yet, so do not add a test setup unless I ask.'));
check('no tests: CLAUDE.md and /next say the same', U.buildClaudeMd(nt).includes('There are no tests yet: do not add a test setup unless asked.') && U.nextCommandMd(nt).includes('There are no tests yet, so do not add a test setup unless I ask.'));
const wt = proj({ commands: 'npm install\nnpm test', bugs: [{ id: 'b1', title: 'Score resets', severity: 'major' }] });
check('with tests: the fix prompt adds one next to them', U.bugPrompt(wt, wt.bugs[0]).includes('3. Add a test that fails because of this bug, next to the existing tests.'));

// ---------- M5: a later try looks at what the last one left ----------
const hp = proj({ commands: 'npm test', milestones: [{ id: 'm1', title: 'Basics', tasks: [{ id: 't1', title: 'Streaks', size: 'M', status: 'doing' }] }],
  bugs: [{ id: 'b1', title: 'Score resets', severity: 'major', error: 'TypeError: Cannot read properties of undefined (reading \'map\')' }],
  sessions: [{ id: 's1', date: '2026-10-12', task: 'Streaks', mid: 'm1', tid: 't1', outcome: 'stuck', summary: 'Started the streak count.', wrong: 'Claude rewrote dates.ts and three unrelated tests failed.' },
    { id: 's2', date: '2026-10-13', task: 'Fix: Score resets', bid: 'b1', outcome: 'partly', summary: 'Found the reload path.', wrong: 'The fix only worked in Chrome.' }] });
const htp = U.taskPrompt(hp, hp.milestones[0], hp.milestones[0].tasks[0]);
check('a stuck try: git status and git diff first, ask before reverting, learn from it', htp.includes('Before you change anything, run git status and git diff (if this folder is in git) to see whether the last try left changes behind. Tell me what you find, and ask me before reverting any of it. Then carry on from there, and learn from what went wrong before.') && !/avoid what went wrong/.test(htp));
check('the fix prompt does the same', U.bugPrompt(hp, hp.bugs[0]).includes('ask me before reverting any of it. Then carry on from there, and learn from what went wrong before.'));
const dp = proj({ milestones: [{ id: 'm1', title: 'B', tasks: [{ id: 't1', title: 'Streaks', size: 'M', status: 'doing' }] }], sessions: [{ id: 's1', date: '2026-10-12', task: 'Streaks', mid: 'm1', tid: 't1', outcome: 'done', summary: 'First half done.' }] });
check('after a finished session it simply carries on', /First half done\.\nCarry on from there\.\n/.test(U.taskPrompt(dp, dp.milestones[0], dp.milestones[0].tasks[0])));

// ---------- M7: PLAN.md carries a bug's error and what was tried ----------
const hplan = U.buildPlanMd(hp);
check('PLAN.md: an open bug has its error and its earlier tries', hplan.includes('  Error: TypeError: Cannot read properties of undefined (reading \'map\')') && /  Tried: Oct 13, partly done: Found the reload path\. What went wrong: The fix only worked in Chrome\./.test(hplan), hplan.split('\n').filter((l) => /Error:|Tried:/.test(l)));
{
  const r = U.readPlanMd(hp, hplan);
  check('...and reading it back changes nothing', !r.done.length && !r.notes.length && !r.added.length && !r.newBugs.length && !r.bugNotes, { notes: r.notes.length, added: r.added.length, newBugs: r.newBugs.length, bugNotes: r.bugNotes });
}
const longErr = proj({ bugs: [{ id: 'b1', title: 'Crash', severity: 'blocker', error: 'x'.repeat(500) }] });
check('a long error is clipped on its PLAN.md line', /  Error: x{299}…\n/.test(U.buildPlanMd(longErr)));

// ---------- L2: the CLI starter follows uv's src layout ----------
const cli = starter('cli', 'csv tidy');
const t2 = cli.milestones[0].tasks[1];
check('the CLI task names src/csv_tidy and points [project.scripts] at the Typer app', t2.title === 'Add the Typer command line in src/csv_tidy' && t2.notes.includes('src/csv_tidy/cli.py') && t2.notes.includes('src/csv_tidy/__main__.py') && t2.notes.includes('point the csv-tidy entry under [project.scripts] at "csv_tidy.cli:app"'), t2);
const oldCli = starter('cli', 'csv tidy');
oldCli.milestones[0].tasks[1].title = 'Add csv_tidy/__main__.py so python -m csv_tidy starts the command line';
check('...and the old title still counts as the starter\'s own', !U.ownTasks(oldCli).length, U.ownTasks(oldCli).map((t) => t.title));

// ---------- L3: pnpm, yarn and bun shorthands; command labels kept ----------
const sh = proj({ commands: 'pnpm install\npnpm build\nyarn lint\nbun typecheck\npnpm check:types\npnpm deploy\nyarn start' });
check('pnpm build, yarn lint, bun typecheck run without asking; deploy and start do not', JSON.stringify(U.safeCommands(sh)) === JSON.stringify(['pnpm install', 'pnpm build', 'yarn lint', 'bun typecheck', 'pnpm check:types']), U.safeCommands(sh));
const survey = fs.readFileSync(path.join(__dirname, '..', '..', 'fixtures', 'survey-reply.md'), 'utf8');
const sp = U.parseDoc(survey);
check('a survey keeps the labels the commands do not say', sp.commands === 'pnpm install\npnpm dev  # run\npnpm test\npnpm build', sp.commands);
check('...and the labels do not stop the commands being allowed', ['Bash(pnpm install)', 'Bash(pnpm test *)', 'Bash(pnpm build *)'].every((x) => JSON.parse(U.settingsJson(sp)).permissions.allow.includes(x)), JSON.parse(U.settingsJson(sp)).permissions.allow);
const lab = U.parseDoc('# Tool\n\n## Commands\n- **Test:** `make check`\n- Run: `npm start`\n- Install: `npm install`\n');
check('"**Test:** `make check`" keeps its label, and Commands now has tests', lab.commands === 'make check  # test\nnpm start  # run\nnpm install' && U.hasTests(lab), lab.commands);

// ---------- L4: report endings ----------
const R = (end) => U.sessionReport('Added the tick button.\n\n' + end);
const cases = [
  ['Outcome: done\nWent wrong: nothing\nWant me to commit this?', 'done', ''],
  ['Outcome: partly done\nWent wrong: the streak test fails on Sundays\nShould I look at the week boundary next?', 'partly', 'the streak test fails on Sundays'],
  ['Outcome: done\nWent wrong: Nothing major. One flaky test needed a re-run.', 'done', 'Nothing major. One flaky test needed a re-run.'],
  ['Outcome: done\nWent wrong: None — though npm audit reports 2 moderate vulnerabilities.', 'done', 'None — though npm audit reports 2 moderate vulnerabilities.'],
  ['Outcome: done\nWent wrong: No issues, but the build warns about a 600 kB chunk.', 'done', 'No issues, but the build warns about a 600 kB chunk.'],
  ['Outcome: in progress\nWent wrong: nothing', 'partly', ''],
  ['Outcome: waiting for your OK on the plan\nWent wrong: nothing', 'partly', ''],
  ['Outcome: done\nWent wrong: nothing\nAll checks pass.', 'done', ''],
  ['Outcome: partly done\nWent wrong: the first npm install failed because Node 18 was too old, so I\nasked you to upgrade to Node 22.', 'partly', 'the first npm install failed because Node 18 was too old, so I asked you to upgrade to Node 22.'],
];
const bad = cases.filter(([t, o, w]) => { const r = R(t); return r.outcome !== o || r.wrong !== w; }).map(([t]) => [t, R(t)]);
check('report endings: questions after, "nothing, but", in progress', !bad.length, bad);
const nothings = ['Nothing — all tests passed first time.', 'nothing, it went smoothly', 'Nothing significant.', 'Nothing major - it went fine', 'None.', '**None.**', 'No issues found.', '"nothing"', 'N/A', '-', 'Nothing went wrong.', 'None, all good.'];
check('ways of saying nothing went wrong still say nothing', nothings.every((x) => R(`Outcome: done\nWent wrong: ${x}`).wrong === ''), nothings.filter((x) => R(`Outcome: done\nWent wrong: ${x}`).wrong));

// ---------- L5: the survey stays away from secrets ----------
const sv = U.surveyPrompt();
check('the survey prompt keeps away from .env and secrets, and says to delete its file', sv.includes('Do not open .env files or other files that hold secrets, and never copy a key, token or password into the file.') && sv.includes('remind me to delete it once I have imported it.'));

(async () => {
  const b = await launch();
  const seed = {
    'p-a': { kind: 'project', name: 'Habit Hive', pitch: 'Track habits.', commands: 'npm install\nnpm test', guideHidden: true, updatedAt: '2026-10-14T10:00:00.000Z', createdAt: '2026-10-01T10:00:00.000Z' },
    'p-b': { kind: 'project', name: 'Shelfie', pitch: 'Book club.', commands: 'pnpm install\npnpm dev', claudeMd: '# Shelfie\n\n- Server actions live next to the page.\n', claudeMdEdited: true, claudeMdOwn: true, fromCode: true, repoHas: 'claudemd', guideHidden: true, updatedAt: '2026-10-13T10:00:00.000Z', createdAt: '2026-10-02T10:00:00.000Z' },
    'p-c': { kind: 'project', name: 'Quiz Night', pitch: 'Quiz app.', commands: '', claudeMd: '# Quiz Night\n\nEdited here.\n\n## How to work\n- Tick tasks in PLAN.md.\n', claudeMdEdited: true, guideHidden: true, updatedAt: '2026-10-12T10:00:00.000Z', createdAt: '2026-10-03T10:00:00.000Z' },
  };
  const { pg, errs } = await open(b, VAR, { init: `window.__SEED__ = ${JSON.stringify(seed)};`, wait: 700 });
  const setup = (id) => pg.evaluate((k) => window.__T.saveAllPrompt(window.__T.S.projects.get(k)), id);
  const merge = (t) => t.split('\n').find((l) => l.startsWith('- CLAUDE.md:'));
  const a = await setup('p-a');
  check('a CLAUDE.md Shipyard made: the setup prompt brings it up to date', merge(a) === '- CLAUDE.md: mine is a newer version of the one Shipyard Planner made. Where a section (a "## " heading) is in both, use mine, then add back any line of the existing section that mine lacks and does not contradict, since I may have added it by hand. Keep the sections only the existing file has. Tell me which lines you added back.', merge(a));
  const bb = await setup('p-b');
  check('the owner\'s own CLAUDE.md is kept, and told how to use PLAN.md', merge(bb) === '- CLAUDE.md: keep everything it already says. Add the sections and lines from mine that it lacks. If it does not say how to use PLAN.md yet, add this line under a "## How to work in this repo" heading: - The plan is in PLAN.md, and its top says how to use it. When a task works, tick it there: "- [ ]" becomes "- [x]", and "(S)" becomes "(S, done YYYY-MM-DD)" with today\'s date. Where the two disagree, keep the existing text and tell me.', merge(bb));
  const c = await setup('p-c');
  check('a CLAUDE.md edited in Shipyard is newer than the folder\'s, so it replaces its sections too', /^- CLAUDE\.md: mine is a newer version/.test(merge(c)), merge(c));
  const quick = await pg.evaluate(() => { const p = window.__T.S.projects.get('p-a'); return window.__T.QUICK.map((q) => [q.k, window.__T.quickPrompt(p, q)]); });
  check('every ready-made prompt ends with the log lines', quick.length === 9 && quick.every(([, t]) => /\n\nWhen the work is done, end with two lines for my log: "Outcome: done" \(or "partly done", or "stuck"\), then "Went wrong:" and what went wrong, or "nothing"\. Put nothing after them\.$/.test(t)), quick.filter(([, t]) => !/Put nothing after them\.$/.test(t)).map(([k]) => k));
  check('Check the plan does not give old work today\'s date', quick.find(([k]) => k === 'plan')[1].includes('This work was done earlier, so do not give it today\'s date: add "done YYYY-MM-DD" to its brackets only when git log shows the day it was finished, and otherwise tick it without a date.'));
  const quickNt = await pg.evaluate(() => { const p = window.__T.S.projects.get('p-b'); return window.__T.QUICK.map((q) => [q.k, window.__T.quickPrompt(p, q)]); });
  const qt = Object.fromEntries(quickNt);
  check('no tests: ready-made prompts run the app, not "the tests from Commands"', !/tests from Commands/.test(qt.bugs + qt.tidy + qt.share + qt.tests) && /Run the app, and its build if Commands has one/.test(qt.share) && /find out how this project is tested/.test(qt.tests), [qt.share.split('\n')[4], qt.tests.split('\n')[4]]);
  check('no page errors', !errs.length, errs);
  await b.close();
  const fails = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - fails} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})();
