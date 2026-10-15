// Round 20: finished milestones fold; Progress copies a week's summary
const { launch, open, check } = require('./lib');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
const day = (n) => { const t = new Date(); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const seed = {
  'p-a': { kind: 'project', name: 'Alpha', pitch: 'A planner.', createdAt: day(-60) + 'T09:00:00Z', updatedAt: day(0) + 'T09:00:00Z',
    milestones: [
      { id: 'm1', title: 'Done one', tasks: [{ id: 'a1', title: 'First', status: 'done', doneAt: day(0) }, { id: 'a2', title: 'Second', status: 'done', doneAt: day(0) }] },
      { id: 'm2', title: 'Open one', tasks: [{ id: 'b1', title: 'Third', status: 'doing' }, { id: 'b2', title: 'Fourth' }] },
    ] },
};
(async () => {
  const b = await launch();
  const { pg, errs, ctx } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(seed)}; Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__copied = t; } }, configurable: true });`, wait: 700 });
  await pg.click('#tab-plan');
  check('a finished milestone folds to one line', await pg.locator('#f-milestones-m1-tasks-a1-title').count() === 0 && /All 2 tasks done\./.test(await pg.textContent('.ms >> nth=0')) && (await pg.getAttribute('#f-milestones-m1-fold', 'aria-expanded')) === 'false');
  check('an open milestone shows its tasks', await pg.locator('#f-milestones-m2-tasks-b1-title').count() === 1);
  await pg.click('#f-milestones-m1-fold');
  check('Show tasks opens it and keeps focus on the button', await pg.locator('#f-milestones-m1-tasks-a1-title').count() === 1 && (await pg.textContent('#f-milestones-m1-fold')) === 'Hide tasks' && (await fa(pg)) === 'BUTTON#f-milestones-m1-fold[toggle-ms]');
  await pg.click('#f-milestones-m1-fold');
  check('Hide tasks folds it again', await pg.locator('#f-milestones-m1-tasks-a1-title').count() === 0);
  // finishing a milestone here keeps it open
  await pg.click('[data-act="cycle-task"][data-tid="b1"]');
  await pg.click('[data-act="cycle-task"][data-tid="b2"]');
  await pg.click('[data-act="cycle-task"][data-tid="b2"]');
  await pg.waitForTimeout(100);
  check('a milestone you finish here stays open', await pg.locator('#f-milestones-m2-tasks-b2-title').count() === 1 && /Every task here is done\./.test(await pg.textContent('.ms >> nth=1')) && /^BUTTON#.*\[cycle-task\]$/.test(await fa(pg)), await fa(pg));
  // reopening the project folds it
  await pg.click('[data-act="new-project"] >> visible=true');
  await pg.fill('#np-name', 'Other');
  await pg.click('[data-act="create"]');
  await pg.waitForTimeout(300);
  await pg.click('#plist [data-act="open"][data-id="p-a"]');
  await pg.click('#tab-plan');
  check('coming back later, both finished milestones are folded', await pg.locator('.ms-fold [aria-expanded="false"]').count() === 2);
  // the week's summary
  await pg.click('#tab-overview');
  check('Progress offers this week\'s summary', (await pg.textContent('[data-act="copy-week"]')) === "This week's summary");
  await pg.click('[data-act="copy-week"]');
  await pg.waitForTimeout(150);
  const s = await pg.inputValue('#m-export');
  check('the summary shows in a dialog to read before copying', (await pg.textContent('#m-title')) === "This week's summary" && /^# Alpha: week of /.test(s) && /Done \(4\):\n- First \(Milestone 1: Done one\)\n- Second/.test(s) && /Plan: 4 of 4 tasks done\./.test(s), s);
  await pg.click('.modal [data-act="copy-export"]');
  await pg.waitForTimeout(150);
  check('Copy copies it', (await pg.evaluate(() => window.__copied || '')) === s);
  await pg.click('.modal [data-act="close-modal"]');
  await pg.click('[data-act="export"]');
  check('Export plan keeps its own title', (await pg.textContent('#m-title')) === 'Export plan');
  await pg.click('.modal [data-act="close-modal"]');
  check('no page errors', !errs.length, errs);
  await ctx.close();
  await b.close();
})();
