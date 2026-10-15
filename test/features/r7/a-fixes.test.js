// Round 7: review fixes that show in the page (sync undo and refusals, sessions, bugs, labels, layout).
const { launch, open, check, mockDoc, OUT } = require('./lib');
const path = require('path');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
async function newWeb(pg, name) {
  await pg.click('[data-act="new-project"] >> visible=true');
  await pg.fill('#np-name', name);
  await pg.check('input[name="np-starter"][value="web"]');
  await pg.click('[data-act="create"]');
  await pg.waitForTimeout(300);
}
async function planText(pg) {
  await pg.click('#tab-claudemd');
  await pg.click('[data-act="repo-file"][data-k="plan"]');
  return pg.inputValue('#repo-text');
}
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html');
    await newWeb(pg, 'Tide Clock');
    const other = await planText(pg);
    await newWeb(pg, 'Recipe Box');
    const plan = await planText(pg);
    // another project's file is refused
    await pg.click('#tab-plan');
    await pg.click('[data-act="open-plansync"]');
    await pg.fill('#ps-text', other.replace(/- \[ \] (Create a Vite)/, '- [x] $1'));
    let note = await pg.textContent('#ps-note');
    check('another project\'s PLAN.md is refused', /This file is the plan for "Tide Clock", not "Recipe Box"/.test(note) && await pg.isDisabled('[data-act="apply-plansync"]'), note);
    // sync with undo
    await pg.fill('#ps-text', plan.replace(/- \[ \] (Create a Vite)/, '- [x] $1') + '\n## Ideas\n\n- [ ] Dark mode\n');
    note = await pg.textContent('#ps-note');
    check('preview says what is skipped', note === 'This will update the plan: 1 task marked done. Done: "Create a Vite React TypeScript project in this folder". 1 new line outside a milestone will be skipped.', note);
    await pg.click('[data-act="apply-plansync"]');
    await pg.waitForTimeout(1600);
    let d = await mockDoc(pg, 'Recipe Box');
    check('sync applied', d.milestones[0].tasks[0].status === 'done' && d.milestones.reduce((n, m) => n + m.tasks.length, 0) === 9); // round 53 added Put the code on GitHub
    const toast = await pg.textContent('#toast');
    check('toast offers Undo', /^Plan updated: 1 task marked done\.Undo$/.test(toast), toast);
    await pg.click('#toast [data-act="undo"]');
    await pg.waitForTimeout(1600);
    d = await mockDoc(pg, 'Recipe Box');
    check('Undo puts the task back', d.milestones[0].tasks[0].status === 'todo', d.milestones[0].tasks[0].status);
    check('focus on Update from PLAN.md after Undo', (await fa(pg)) === 'BUTTON#open-plansync[open-plansync]', await fa(pg));
    // a deleted task stays deleted
    await pg.click('[data-act="del-task"] >> nth=1');
    await pg.waitForTimeout(100);
    await pg.click('[data-act="open-plansync"]');
    await pg.fill('#ps-text', plan);
    note = await pg.textContent('#ps-note');
    check('a deleted task is not brought back', note === 'Already up to date. Nothing to change. 1 task you deleted here will stay deleted.', note);
    await pg.keyboard.press('Escape');
    // the sync dialog explains bugs and undo
    await pg.click('[data-act="open-plansync"]');
    const sub = await pg.textContent('.modal .sub');
    check('sync dialog mentions notes, bugs and undo', /marks finished tasks done and fixed bugs fixed, and adds the tasks, bugs and notes Claude added/.test(sub) && /undo it afterwards/.test(sub), sub);
    await pg.keyboard.press('Escape');
    // empty bug row does not count
    await pg.click('[data-act="add-bug"]');
    await pg.waitForTimeout(1600);
    await pg.click('#tab-overview');
    let facts = await pg.$$eval('.facts dt', (e) => e.map((x) => x.textContent));
    check('an empty bug row is not an open bug', !facts.includes('Open bugs'), facts);
    // bug names and Mark fixed undo
    await pg.click('#tab-plan');
    await pg.fill('.bug .b-title', 'List goes blank');
    await pg.selectOption('select.sev', 'blocker');
    await pg.waitForTimeout(300);
    check('bug buttons carry the bug title', (await pg.getByRole('button', { name: 'Fix prompt List goes blank' }).count()) === 1 && (await pg.getByRole('button', { name: 'Delete bug List goes blank' }).count()) === 1 && (await pg.getByRole('listitem', { name: 'List goes blank' }).count()) === 1);
    await pg.click('#tab-overview');
    check('Next up region named Fix first', (await pg.getAttribute('.next', 'aria-labelledby')) === 'next-h' && (await pg.textContent('#next-h')) === 'Fix first');
    await pg.click('#next-bug-fixed');
    await pg.waitForTimeout(100);
    check('Mark fixed offers Undo', /Bug marked fixed\.Undo/.test(await pg.textContent('#toast')));
    await pg.click('#toast [data-act="undo"]');
    await pg.waitForTimeout(200);
    check('Undo reopens the bug and focuses Mark fixed', (await fa(pg)) === 'BUTTON#next-bug-fixed[toggle-bug]' && (await pg.textContent('.next .eyebrow')) === 'Fix first', await fa(pg));
    // sessions: a done task stays done; rules and follow-ups are not repeated
    await pg.click('#tab-plan');
    await pg.click('[data-act="cycle-task"] >> nth=0'); // doing
    await pg.click('[data-act="cycle-task"] >> nth=0'); // done
    await pg.click('#tab-overview');
    await pg.click('#tab-improve');
    for (let i = 0; i < 2; i++) {
      await pg.click('[data-act="log-session"] >> visible=true');
      await pg.selectOption('#ss-task', await pg.$eval('#ss-task option:not([disabled])', (o) => o.value));
      await pg.check('input[name="ss-outcome"][value="stuck"]');
      await pg.fill('#ss-summary', 'Tried again, tests still red.');
      await pg.click('[data-act="save-session-ai"]');
      await pg.waitForTimeout(800);
      if (i === 0) check('a Stuck session keeps a done task done', /stays done/.test(await pg.textContent('.modal .sub')), await pg.textContent('.modal .sub'));
      await pg.click('[data-act="session-accept"]');
      await pg.waitForTimeout(300);
    }
    await pg.waitForTimeout(1500);
    d = await mockDoc(pg, 'Recipe Box');
    const rules = d.conventions.split('\n').filter((l) => /Run npm test before saying a task is done/.test(l));
    const titles = d.milestones[0].tasks.map((t) => t.title);
    check('task still done', d.milestones[0].tasks[0].status === 'done');
    check('the same rule is added once', rules.length === 1, d.conventions);
    check('the same follow-ups are added once', titles.filter((t) => t === 'Add error message for empty list').length === 1, titles);
    // session delete + undo focus
    await pg.click('[data-act="del-session"] >> nth=0');
    await pg.waitForTimeout(100);
    await pg.click('#toast [data-act="undo"]');
    await pg.waitForTimeout(200);
    check('focus after undoing a session delete', /^BUTTON#f-sessions-x[a-z0-9]+-del\[del-session\]$/.test(await fa(pg)), await fa(pg));
    // layout: repo file paths wrap at 360
    await pg.setViewportSize({ width: 360, height: 740 });
    await pg.click('#tab-claudemd');
    const cut = await pg.$$eval('.file-tab code', (e) => e.filter((x) => x.scrollWidth > x.clientWidth + 1).map((x) => x.textContent));
    check('paths are not cut off at 360 px', !cut.length, cut);
    await pg.locator('.file-tabs').screenshot({ path: path.join(OUT, 'file-tabs-360.png') });
    check('no page errors', !errs.length, errs);
  }
  // old sessions are trimmed and all can be shown
  {
    const { pg, errs } = await open(b, 'mocked.html');
    await newWeb(pg, 'Long Runner');
    await pg.click('#rail [data-act="backup"]');
    const bk = JSON.parse(await pg.inputValue('#m-backup'));
    await pg.click('[data-act="close-modal"]');
    const pj = bk.projects[0];
    pj.name = 'Many Sessions';
    pj.sessions = Array.from({ length: 30 }, (_, i) => ({ id: 'xs' + String(i).padStart(6, '0'), date: '2026-09-' + String((i % 28) + 1).padStart(2, '0'), task: 'Task ' + i, outcome: 'done', summary: ('Summary ' + i + ' ').repeat(300), wrong: '' }));
    await pg.click('#rail [data-act="open-import"]');
    await pg.fill('#np-text', JSON.stringify(bk));
    await pg.waitForTimeout(150);
    await pg.click('[data-act="import"]');
    await pg.waitForTimeout(1600);
    await pg.click('#rail [data-act="open"] >> text=Many Sessions').catch(() => {});
    await pg.waitForTimeout(300);
    await pg.click('#tab-improve');
    const head = await pg.textContent('.panel-head:has(h2:text("Sessions")) p');
    check('the list says only 20 are shown', /30 logged: .*Showing the latest 20\./.test(head), head);
    await pg.click('[data-act="toggle-all-sessions"]');
    check('Show all lists every session', (await pg.$$('.session')).length === 30 && (await pg.textContent('[data-act="toggle-all-sessions"]')) === 'Show the latest 20');
    await pg.click('[data-act="log-session"] >> visible=true');
    if (await pg.$('#ss-task')) await pg.selectOption('#ss-task', await pg.$eval('#ss-task option:not([disabled])', (o) => o.value));
    await pg.fill('#ss-summary', 'One more.');
    await pg.click('[data-act="save-session"]');
    await pg.waitForTimeout(1600);
    const d = await mockDoc(pg, 'Many Sessions');
    const lens = d.sessions.map((x) => x.summary.length);
    check('a project far from the size limit keeps every summary whole (round 41)', d.sessions.length === 31 && lens.slice(0, 30).every((n) => n >= 3000), lens);
    check('no page errors (sessions)', !errs.length, errs);
  }
  await b.close();
})();
