// Round 37: PLAN.md that stays in step with Shipyard, and Log a session that does not guess (review 8b)
const { launch, open, check } = require('./lib');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
const project = (extra = {}) => ({ kind: 'project', name: 'ShiftSwap', pitch: 'Swap shifts.', audience: 'Shift workers', problem: 'Swaps go through group chats.', doneWhen: 'A manager can approve a swap.', commands: 'npm test',
  bugs: [{ id: 'b1', title: 'Swaps page crashes', severity: 'blocker' }, { id: 'b2', title: 'Old typo', severity: 'minor', status: 'fixed' }],
  milestones: [{ id: 'm1', title: 'Approvals', tasks: [{ id: 't1', title: 'Add the approval endpoint', size: 'S' }, { id: 't2', title: 'Add a manager approval page', size: 'M' }] }], ...extra });
const seedOf = (p) => `window.__SEED__ = ${JSON.stringify({ 'p-a': p })};`;
const doc = (pg) => pg.evaluate(() => window.__mockDocs.get('p-a'));
const logFromImprove = async (pg) => { await pg.click('#tab-improve'); await pg.click('[data-act="log-session"] >> visible=true'); await pg.waitForTimeout(100); };
(async () => {
  const b = await launch();
  // Log a session with nothing to go on asks which task or bug
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf(project()), wait: 700 });
    await logFromImprove(pg);
    check('nothing is chosen for you, even with a blocker open', (await pg.inputValue('#ss-task')) === '' && (await pg.textContent('#ss-task option:checked')) === 'Choose the task or bug', await pg.inputValue('#ss-task'));
    check('the dialog says to choose', /Choose what the session was about, then note how it went/.test(await pg.textContent('.modal .sub')));
    await pg.fill('#ss-summary', '⏺ Added the endpoint.\n  It passes its tests.\n\nOutcome: done\nWent wrong: nothing');
    await pg.click('[data-act="save-session"]');
    await pg.waitForTimeout(100);
    check('saving without a choice says what is missing, at the field', (await pg.textContent('#ss-task-err')) === 'Choose the task or bug this session was about, or Something else.' && (await pg.getAttribute('#ss-task', 'aria-invalid')) === 'true' && (await fa(pg)) === 'SELECT#ss-task', await fa(pg));
    await pg.selectOption('#ss-task', 'm1:t1');
    await pg.waitForTimeout(100);
    check('choosing one clears the error and keeps what was typed', !(await pg.$('#ss-task-err')) && (await pg.inputValue('#ss-summary')).startsWith('⏺ Added the endpoint.') && /Note how "Add the approval endpoint" went/.test(await pg.textContent('.modal .sub')), await pg.inputValue('#ss-summary'));
    await pg.click('[data-act="save-session"]');
    await pg.waitForTimeout(1700);
    const d = await doc(pg);
    check('done marks that task done and leaves the blocker open', d.milestones[0].tasks[0].status === 'done' && d.bugs[0].status !== 'fixed' && d.sessions.at(-1).tid === 't1', [d.milestones[0].tasks[0].status, d.bugs[0].status, d.sessions.at(-1)]);
    check('the summary is kept without the terminal marks and the report lines', d.sessions.at(-1).summary === 'Added the endpoint.\nIt passes its tests.', d.sessions.at(-1).summary);
    if (await pg.$('.modal')) await pg.keyboard.press('Escape');
    check('Improve shows the clean summary', /Added the endpoint\. It passes its tests\./.test((await pg.textContent('#sheet')).replace(/\s+/g, ' ')) && !/⏺|Outcome: done/.test(await pg.textContent('#sheet')));
    // the blocker's own button still opens on the blocker
    await pg.click('#tab-overview');
    await pg.click('.next [data-act="log-session"][data-bid="b1"]');
    check('Next up\'s blocker button opens on the blocker', (await pg.inputValue('#ss-task')) === 'bug:b1');
    await pg.keyboard.press('Escape');
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  // the last prompt copied tells Log a session what it was about (round 44: copied, not only opened)
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf(project()), wait: 700 });
    await pg.click('#tab-plan');
    await pg.click('[data-act="prompt"][data-tid="t2"] >> visible=true');
    await pg.click('[data-act="copy-prompt"]');
    await pg.keyboard.press('Escape');
    await logFromImprove(pg);
    check('after a task\'s prompt, it opens on that task', (await pg.inputValue('#ss-task')) === 'm1:t2', await pg.inputValue('#ss-task'));
    await pg.keyboard.press('Escape');
    await pg.click('#tab-plan');
    await pg.click('[data-act="bug-prompt"][data-id="b1"] >> visible=true');
    const bp = await pg.inputValue('#m-prompt');
    check('the fix prompt says to tick the bug in PLAN.md', /If PLAN\.md lists it under "Bugs to fix", change its "- \[ \]" to "- \[x\]"\./.test(bp));
    await pg.click('[data-act="copy-prompt"]');
    await pg.keyboard.press('Escape');
    await logFromImprove(pg);
    check('after a bug\'s prompt, it opens on that bug', (await pg.inputValue('#ss-task')) === 'bug:b1');
    await pg.keyboard.press('Escape');
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  // one task in progress is the obvious one
  {
    const p = project();
    p.milestones[0].tasks[1].status = 'doing';
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf(p), wait: 700 });
    await logFromImprove(pg);
    check('with one task in progress, it opens on that task', (await pg.inputValue('#ss-task')) === 'm1:t2');
    await pg.keyboard.press('Escape');
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  // PLAN.md keeps fixed bugs, and Save every file merges by id
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf(project()), wait: 700 });
    await pg.click('#tab-claudemd');
    await pg.click('[data-act="repo-file"][data-k="plan"]');
    const md = await pg.inputValue('#repo-text');
    check('PLAN.md lists the fixed bug ticked, after the open one', /- \[ \] Swaps page crashes \(blocker\) <!-- id:b1 -->[\s\S]*\n- \[x\] Old typo \(minor\) <!-- id:b2 -->/.test(md));
    await pg.click('.save-all [data-act="save-all"]');
    await pg.waitForTimeout(100);
    const t = await pg.inputValue('#m-export');
    check('Save every file merges PLAN.md by its ids', /a line with an id comment \("<!-- id:\.\.\. -->"\) follows mine: my wording, milestone and order\. Remove a line whose id mine does not have, since it was deleted here\. A task or bug ticked in either file stays ticked/.test(t), t.split('\n').find((l) => /PLAN\.md/.test(l)));
    await pg.keyboard.press('Escape');
    // Update from PLAN.md: a bug Claude Code added, and a line the terminal wrapped
    const pasted = md.replace('- [ ] Swaps page crashes (blocker) <!-- id:b1 -->', '- [ ] Swaps page crashes (blocker) <!-- id:b1 -->\n- [ ] Approving twice sends two emails (major)')
      .replace('- [ ] Add the approval endpoint (S) <!-- id:t1 -->', '- [x] Add the approval endpoint (S) <!--\n  id:t1 -->');
    await pg.click('#tab-plan');
    await pg.click('[data-act="open-plansync"]');
    await pg.fill('#ps-text', pasted);
    await pg.waitForTimeout(300);
    const note = await pg.textContent('#ps-note');
    check('it reads the new bug and the wrapped tick, and no stray notes', /1 task marked done/.test(note) && /1 new bug added/.test(note) && !/notes? added/.test(note), note);
    check('the dialog says it adds bugs too', /adds the tasks, bugs and notes Claude added/.test(await pg.textContent('.modal .sub')));
    await pg.click('[data-act="apply-plansync"]');
    await pg.waitForTimeout(1700);
    let d = await doc(pg);
    check('applying adds the bug at the top, open, and ticks the task', d.bugs[0].title === 'Approving twice sends two emails' && d.bugs[0].severity === 'major' && d.bugs[0].status !== 'fixed' && d.milestones[0].tasks[0].status === 'done', d.bugs.map((x) => x.title));
    await pg.click('#toast [data-act="undo"]');
    await pg.waitForTimeout(1700);
    d = await doc(pg);
    check('Undo takes the bug out and the tick back', d.bugs.length === 2 && d.milestones[0].tasks[0].status !== 'done');
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  // a PLAN.md Shipyard did not make
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf(project({ repoHas: 'plan' })), wait: 700 });
    await pg.click('#tab-claudemd');
    await pg.click('[data-act="repo-file"][data-k="plan"]');
    check('the PLAN.md how-to says a PLAN.md from elsewhere is fine', /If Shipyard did not make it, its tasks are added to the plan\./.test(await pg.textContent('#sheet')));
    await pg.click('#tab-plan');
    await pg.click('[data-act="open-plansync"]');
    await pg.fill('#ps-text', '# ShiftSwap roadmap\n\n## Now\n- [x] Add the approval endpoint\n- [ ] Approvals UI for managers\n  Notes: list pending swaps\n\n## Later\n- [ ] Email digest\n\n## Bugs\n- [ ] Dark mode flickers (minor)\n');
    await pg.waitForTimeout(300);
    const note = await pg.textContent('#ps-note');
    check('it says Shipyard did not make it, and what it adds', /^Shipyard did not make this PLAN\.md, so this adds what it has that the plan lacks: /.test(note) && /2 new milestones/.test(note) && /1 new bug added/.test(note) && /matched, not added twice/.test(note), note);
    check('and Update the plan is on', !(await pg.$eval('[data-act="apply-plansync"]', (e) => e.disabled)));
    await pg.click('[data-act="apply-plansync"]');
    await pg.waitForTimeout(1700);
    let d = await doc(pg);
    check('its headings become milestones after the plan\'s own, and the matching task is ticked', d.milestones.map((m) => m.title).join() === 'Approvals,Now,Later' && d.milestones[0].tasks[0].status === 'done' && d.milestones[1].tasks[0].title === 'Approvals UI for managers' && d.bugs.some((x) => x.title === 'Dark mode flickers'), d.milestones.map((m) => m.title));
    await pg.click('#toast [data-act="undo"]');
    await pg.waitForTimeout(1700);
    d = await doc(pg);
    check('Undo puts the plan back', d.milestones.length === 1 && d.bugs.length === 2 && d.milestones[0].tasks[0].status !== 'done');
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  // for code that exists, the survey comes first
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf(project()), wait: 700 });
    await pg.click('[data-act="new-project"] >> visible=true');
    const sub = (await pg.textContent('.modal .sub')).replace(/\s+/g, ' ');
    check('New project offers the code description first', /Already started\? Have Claude Code describe your code, even if you have a CLAUDE\.md, or import a CLAUDE\.md, README or backup/.test(sub), sub);
    await pg.click('.modal .sub [data-act="np-mode"][data-k="import"]');
    check('Import points code that exists to the description', /For code that already exists, have Claude Code describe it instead: it reads the code itself/.test(await pg.textContent('.modal .sub')));
    await pg.click('.modal .sub [data-act="np-mode"][data-k="survey"]');
    await pg.waitForTimeout(100);
    check('and the link opens it', /from your code/.test(await pg.textContent('#m-title')) && !!(await pg.$('#modal-root [data-act="copy-prompt"]')), await pg.textContent('#m-title'));
    await pg.keyboard.press('Escape');
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  await b.close();
})();
