// Round 65: prompts carry what was learned. A prompt says what the last sessions on other work found and the rules not
// yet in CLAUDE.md; a feature's text is not repeated as the goal; work added above a task stays there; a split part gets
// the larger task's notes as context; lines that do not apply are left out; example screens stay out of CLAUDE.md;
// Log a session on Next up follows the prompt copied last; "done, but 2 tests fail" is partly done.
const { launch, open, check, results } = require('../r48/lib');
const proj = {
  kind: 'project', name: 'Pocket Ledger', pitch: 'Reads a bank CSV and prints spending per category.', stage: 'building', starter: 'cli', commands: 'uv sync\nuv run pytest', guideHidden: true,
  features: [{ id: 'f1', title: 'Import a CSV', detail: 'Reads Date, Description, Amount columns', priority: 'must', status: 'todo' },
    { id: 'f2', title: 'Budgets', detail: 'A monthly limit per category', priority: 'should', status: 'todo' }],
  screens: [{ id: 's1', name: 'Commands', notes: 'Each command, its arguments and an example' }, { id: 's2', name: 'Output', notes: 'What it prints, and the exit code on success and failure' }],
  milestones: [{ id: 'm1', title: 'Read the CSV', goal: 'Reads Date, Description, Amount columns', tasks: [
    { id: 't1', title: 'Parse the bank CSV', size: 'S', status: 'done', doneAt: '2026-10-12', feat: 'f1' },
    { id: 't4', title: 'Map the real column names', size: 'S', status: 'todo', feat: 'f1' },
    { id: 't2', title: 'Total spending by month and category', size: 'L', status: 'todo', notes: 'Group by month and category.' },
    { id: 't3', title: 'Print a report', size: 'M', status: 'todo', feat: 'f1' }] }],
  sessions: [
    { id: 'x1', date: '2026-10-12', mid: 'm1', tid: 't1', task: 'Parse the bank CSV', outcome: 'done', summary: 'Real exports use Posted Date, Payee, Debit and Credit columns, not Date, Description, Amount.', wrong: 'The brief had the wrong column names' },
    { id: 'x2', date: '2026-10-13', bid: 'b1', task: 'Fix: Crash on an empty file', outcome: 'partly', summary: 'Empty files now print a message.', wrong: '' }],
  bugs: [{ id: 'b1', title: 'Crash on an empty file', severity: 'major', status: 'open', actual: 'It prints a stack trace', steps: '' },
    { id: 'b2', title: 'Totals look odd', severity: 'minor', status: 'open' }],
  lessons: [{ id: 'l1', date: '2026-10-12', happened: 'It used float for money', change: 'Use Decimal for money, never float' },
    { id: 'l2', date: '2026-10-11', happened: 'It ran the whole suite', change: 'Run one test file at a time', promoted: true, rule: 'Run one test file at a time' }],
  folder: { files: {}, plan: { at: '2026-10-12', tasks: { t1: 1, t2: 0, t3: 0 }, bugs: { b1: 0 } } },
};
const web = { kind: 'project', name: 'Recipe Box', pitch: 'Saves recipes.', stage: 'building', starter: 'web', commands: 'npm install\nnpm run dev\nnpm test', guideHidden: true,
  screens: [{ id: 's1', name: 'Home', notes: 'A grid of saved recipes, newest first' }, { id: 's2', name: 'Main screen', notes: 'Where the real work happens' }],
  milestones: [{ id: 'm1', title: 'First version', goal: '', tasks: [{ id: 't1', title: 'Add the recipe form', size: 'M', status: 'todo' }] }] };
const init = `window.__SEED__ = ${JSON.stringify({ 'p-l': proj, 'p-w': web })}; if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('shipyard.seen.v1', '99'); localStorage.setItem('shipyard.ui.v1', JSON.stringify({ activeId: 'p-l', tab: 'plan', view: 'project' })); }`;
const doc = (pg, id = 'p-l') => pg.evaluate((k) => window.__mockDocs.get(k), id);
const promptOf = async (pg, sel) => { await pg.click(sel); await pg.waitForTimeout(200); const v = await pg.inputValue('#m-prompt'); await pg.click('.modal [data-act="close-modal"]'); return v; };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const { pg, errs } = await open(b, 'mocked.html', { ctx, init, wait: 1000 });
  // what other work found
  let p3 = await promptOf(pg, '[data-act="prompt"][data-tid="t3"]');
  check('a task prompt says what the last sessions on other work found', p3.includes('What the last sessions on other work found (they may matter here):\n- Oct 12, "Parse the bank CSV", done: Real exports use Posted Date, Payee, Debit and Credit columns, not Date, Description, Amount. What went wrong: The brief had the wrong column names.\n- Oct 13, "Fix: Crash on an empty file", partly done: Empty files now print a message.'), p3);
  check('...and the rules not in CLAUDE.md yet, not the ones that are', p3.includes('Rules from earlier sessions, not in CLAUDE.md yet:\n- Use Decimal for money, never float.') && !p3.includes('Run one test file at a time'));
  check('the feature\'s text is not repeated when it is the milestone goal', p3.includes('Milestone goal: Reads Date, Description, Amount columns.\n\nTask: Print a report\nPart of the feature: Import a CSV\n'), p3.split('\n').slice(2, 7).join('\n'));
  check('a command-line tool\'s prompt has no dev server line', !/dev server/.test(p3) && /3\. Check your work with the test or build command under Commands in CLAUDE\.md before saying it is done\. If one is not set up yet \(a later task adds it\), say so rather than setting it up now\.\n/.test(p3));
  const pb = await promptOf(pg, '[data-act="bug-prompt"][data-id="b1"]');
  check('a fix prompt carries what other work found, not its own session', pb.includes('What the last session on other work found (it may matter here):\n- Oct 12, "Parse the bank CSV"') && pb.includes('An earlier session on this bug:') && !/other work found[^]*Empty files now print/.test(pb), pb);
  check('a bug with no steps: check that what happens no longer happens', pb.includes('then check that what happens above no longer happens.'), pb.split('\n').find((l) => l.startsWith('5.')));
  const pb2 = await promptOf(pg, '[data-act="bug-prompt"][data-id="b2"]');
  check('...and with nothing written down: check that the bug is gone', pb2.includes('then check that the bug is gone.'), pb2.split('\n').find((l) => l.startsWith('5.')));
  // a task added here above another: its PLAN.md line goes in at the same place
  const p4 = await promptOf(pg, '[data-act="prompt"][data-tid="t4"]');
  check('a task added above another goes in above it in the folder\'s PLAN.md', p4.includes('If not, add this line just above the line ending in "<!-- id:t2 -->":\n   - [ ] Map the real column names (S) <!-- id:t4 -->'), p4.split('\n').filter((l) => /^4\.|^   /.test(l)).join('\n'));
  // a split part: the larger task's notes as context
  await pg.click('[data-act="split-task"][data-tid="t2"]');
  await pg.waitForTimeout(450);
  await pg.click('[data-act="split-manual"]');
  await pg.fill('#sp-text', 'Group transactions by month (S)\nLeave income out of the totals (S)');
  await pg.click('[data-act="split-accept"]');
  await pg.waitForTimeout(1700);
  let d = await doc(pg);
  const parts = d.milestones[0].tasks.filter((t) => t.splitFrom === 't2');
  const ctxNote = 'Part of the larger task "Total spending by month and category": do only this part. Its notes, for context:\nGroup by month and category.';
  check('each part gets the larger task\'s notes as context, with do only this part', parts.length === 2 && parts.every((t) => t.notes === ctxNote), parts.map((t) => t.notes));
  // PLAN.md comes back with a task added above the one that needs it
  await pg.click('#tab-claudemd');
  await pg.click('.file-tab[data-k="plan"]');
  const plan = await pg.inputValue('#repo-text');
  const withNew = plan.replace(/(- \[ \] Print a report \(M\))/, '- [ ] Handle a file with a header row (S)\n$1');
  await pg.click('#tab-plan');
  await pg.click('[data-act="open-plansync"] >> visible=true');
  await pg.fill('#ps-text', withNew);
  await pg.waitForTimeout(150);
  await pg.click('[data-act="apply-plansync"]');
  await pg.waitForTimeout(1700);
  d = await doc(pg);
  const order = d.milestones[0].tasks.map((t) => t.title);
  check('a task Claude Code added above another stays above it', order.indexOf('Handle a file with a header row') === order.indexOf('Print a report') - 1, order);
  check('PLAN.md says where found work goes', plan.includes('add it as a new "- [ ]" line in the milestone it belongs to: just above the task that needs it done first, otherwise at the end.'));
  // Plan it: a new milestone does not copy the feature's text into its goal
  await pg.click('#tab-design');
  await pg.click('[data-act="plan-feature"][data-id="f2"]');
  await pg.waitForTimeout(450);
  if (await pg.$('[data-act="fp-manual"]')) await pg.click('[data-act="fp-manual"]');
  await pg.fill('#fp-text', 'Set a limit per category (S)');
  await pg.selectOption('#fp-to', 'new');
  await pg.click('[data-act="fp-accept"]');
  await pg.waitForTimeout(1700);
  d = await doc(pg);
  const bm = d.milestones.find((m) => m.title === 'Budgets');
  check('Plan it makes a milestone without a copy of the feature as its goal', bm && bm.goal === '', bm);
  // CLAUDE.md: the starter's example screens are left out until changed
  await pg.click('#tab-claudemd');
  await pg.click('.file-tab[data-k="claudemd"]');
  const cm = await pg.inputValue('#f-claudeMd');
  check('the starter\'s example screens are not in CLAUDE.md', !cm.includes('## Screens and parts') && !cm.includes('Each command, its arguments'), cm.slice(0, 400));
  // Log a session on Next up after copying a bug's fix prompt
  await pg.click('#tab-plan');
  await pg.click('[data-act="bug-prompt"][data-id="b1"]');
  await pg.waitForTimeout(150);
  await pg.click('.modal [data-act="copy-prompt"]');
  await pg.waitForTimeout(150);
  await pg.click('.modal [data-act="close-modal"]');
  await pg.click('#tab-overview');
  await pg.click('.next [data-act="log-session"]');
  await pg.waitForTimeout(200);
  check('Log a session on Next up follows the fix prompt copied last', (await pg.inputValue('#ss-task')) === 'bug:b1' && /the fix for "Crash on an empty file"/.test(await pg.textContent('#m-sub')), [await pg.inputValue('#ss-task'), await pg.textContent('#m-sub')]);
  const nuTitle = await pg.textContent('.next h3');
  check('...and says why, with the Next up task one click away', (await pg.textContent('#ss-alt')) === `Its fix prompt is the one you copied last. Log it for "${nuTitle}" instead`, await pg.textContent('#ss-alt'));
  await pg.click('[data-act="ss-alt"]');
  await pg.waitForTimeout(150);
  const tv = await pg.inputValue('#ss-task');
  check('...which switches the dialog to that task', tv.endsWith(':t4') && !(await pg.$('#ss-alt')) && new RegExp(`Note how "${nuTitle}" went`).test(await pg.textContent('#m-sub')), [tv, await pg.textContent('#m-sub')]);
  // "done, but" is partly done
  await pg.fill('#ss-summary', 'Mapped the columns.\nOutcome: done, but 2 tests fail\nWent wrong: nothing');
  await pg.waitForTimeout(250);
  check('"done, but 2 tests fail" reads as partly done', (await pg.$eval('input[name="ss-outcome"]:checked', (x) => x.value)) === 'partly');
  await pg.fill('#ss-summary', 'Mapped the columns.\nOutcome: done\nWent wrong: nothing');
  await pg.waitForTimeout(250);
  check('...and plain "done" as done', (await pg.$eval('input[name="ss-outcome"]:checked', (x) => x.value)) === 'done');
  await pg.fill('#ss-summary', 'Outcome: Done, except the README\nWent wrong: nothing');
  await pg.waitForTimeout(250);
  check('..."Done, except the README" as partly done', (await pg.$eval('input[name="ss-outcome"]:checked', (x) => x.value)) === 'partly');
  await pg.click('.modal [data-act="close-modal"]');
  // Next up with no prompt copied since: its own task, no hint
  // the web project: a dev server line, and screens the owner changed
  await pg.evaluate(() => { localStorage.setItem('shipyard.ui.v1', JSON.stringify({ activeId: 'p-w', tab: 'plan', view: 'project' })); });
  await pg.reload();
  await pg.waitForTimeout(900);
  const pw = await promptOf(pg, '[data-act="prompt"][data-tid="t1"]');
  check('a web app\'s prompt keeps the dev server line', pw.includes('Only start the dev server if you need it, and stop it afterwards.'));
  await pg.click('#tab-claudemd');
  await pg.click('.file-tab[data-k="claudemd"]');
  const cw = await pg.inputValue('#f-claudeMd');
  check('a screen the owner changed is in CLAUDE.md, the unchanged example is not', cw.includes('## Screens and parts\n- **Home**: A grid of saved recipes, newest first\n\n') && !cw.includes('Where the real work happens'), cw.slice(cw.indexOf('## Screens'), cw.indexOf('## Screens') + 200));
  await pg.click('#tab-overview');
  await pg.click('.next [data-act="log-session"]');
  await pg.waitForTimeout(200);
  check('Log a session on Next up with no prompt copied: its own task, no hint', (await pg.inputValue('#ss-task')) === 'm1:t1' && !(await pg.$('#ss-alt')), await pg.inputValue('#ss-task'));
  await pg.click('.modal [data-act="close-modal"]');
  check('no page errors', errs.length === 0, errs);
  await b.close();
  const f = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - f}/${results.length} passed`);
  process.exit(f ? 1 : 0);
})();
