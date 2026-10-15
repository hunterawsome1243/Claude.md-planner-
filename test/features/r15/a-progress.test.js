// Round 15: weekly progress on Overview.
const { launch, open, check } = require('./lib');
const day = (n) => { const t = new Date(); t.setUTCDate(t.getUTCDate() - n); return t.toISOString().slice(0, 10); };
const noScroll = (pg) => pg.evaluate(() => document.scrollingElement.scrollWidth <= window.innerWidth);
const doc = (pg, id) => pg.evaluate((i) => window.__mockDocs.get(i), id);
const part = (((new Date().getUTCDay() + 6) % 7) + 1) / 7; // round 22: the share of this week gone by
const task = (d, id) => d.milestones.flatMap((m) => m.tasks).find((t) => t.id === id);
const seed = {
  'p-hist': {
    kind: 'project', name: 'History', pitch: 'A meal planner.', createdAt: day(120),
    milestones: [{ id: 'm1', title: 'Start', goal: '', tasks: [
      { id: 't1', title: 'One', size: 'S', status: 'done', doneAt: day(0) },
      { id: 't2', title: 'Two', size: 'S', status: 'done', doneAt: day(7) },
      { id: 't3', title: 'Three', size: 'S', status: 'done', doneAt: day(14) },
      { id: 't4', title: 'Four', size: 'S', status: 'done', doneAt: day(100) },
      { id: 't5', title: 'Five, imported done', size: 'S', status: 'done' },
      { id: 't6', title: 'Six', size: 'M', status: 'todo' },
      { id: 't7', title: 'Seven', size: 'M', status: 'todo' },
      { id: 't8', title: 'Eight', size: 'M', status: 'doing' },
    ] }],
    sessions: [
      { id: 'x1', date: day(0), task: 'One', outcome: 'done' },
      { id: 'x2', date: day(0), task: 'More', outcome: 'partly' },
      { id: 'x3', date: day(21), task: 'Old', outcome: 'done' },
    ],
  },
};
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(seed)};`, wait: 600 });
    const txt = async () => (await pg.textContent('.progress .panel-head p')).replace(/\s+/g, ' ').trim();
    check('the panel shows on Overview with activity', await pg.isVisible('.progress'));
    const t0 = await txt();
    const days0 = Math.ceil(14 * (4 + part) - 1e-9); // 3 S tasks done in 4 weeks and a part; 3 M tasks (6 points) left
    const short0 = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
    check('summary counts this week, 8 weeks, and the pace estimate', t0 === `This week: 1 task done, 2 sessions. Last 8 weeks: 3 tasks, 3 sessions. At your recent pace, the 3 tasks left take about ${Math.round(days0 / 7)} weeks, so you would finish around ${short0(day(-days0))}.`, t0);
    const rows = await pg.$$eval('.progress .sr tbody tr', (rs) => rs.map((r) => [...r.children].map((c) => c.textContent).join('|')));
    check('the table for screen readers has 8 weeks, oldest first', rows.length === 8 && /\|1\|2$/.test(rows[7]) && /\|1\|0$/.test(rows[6]) && /\|1\|0$/.test(rows[5]) && /\|0\|1$/.test(rows[4]), rows);
    check('the chart itself is hidden from screen readers', (await pg.getAttribute('.chart-plot', 'aria-hidden')) === 'true' && (await pg.getAttribute('.chart-x', 'aria-hidden')) === 'true');
    check('numbers sit above the 3 weeks with tasks, and above the sessions (round 22)', (await pg.$$eval('.chart-v span:not(.v-sess)', (s) => s.map((x) => x.textContent).join(','))) === '1,1,1' && (await pg.$$eval('.chart-v .v-sess', (s) => s.map((x) => x.textContent).join(','))) === '1,2');
    const box = await pg.evaluate(() => { const p = document.querySelector('.chart-plot').getBoundingClientRect(); return [...document.querySelectorAll('.chart-v span')].every((s) => { const r = s.getBoundingClientRect(); return r.left >= p.left - 1 && r.right <= p.right + 1 && r.top >= p.top - 14; }); });
    check('the numbers stay inside the chart', box);
    await pg.click('#tab-plan');
    await pg.click('[data-act="cycle-task"][data-tid="t6"]');
    await pg.click('[data-act="cycle-task"][data-tid="t6"]');
    await pg.click('#tab-overview');
    check('marking a task done counts it this week', /^This week: 2 tasks done/.test(await txt()), await txt());
    await pg.waitForTimeout(1600);
    let d = await doc(pg, 'p-hist');
    check('the task is stamped with today', task(d, 't6').doneAt === day(0), task(d, 't6'));
    check('a task imported as done is not stamped', task(d, 't5').doneAt === '' && task(d, 't1').doneAt === day(0) && task(d, 't4').doneAt === day(100));
    await pg.click('#tab-plan');
    await pg.click('[data-act="cycle-task"][data-tid="t6"]');
    await pg.waitForTimeout(1600);
    d = await doc(pg, 'p-hist');
    check('marking it not done clears the date', task(d, 't6').status === 'todo' && task(d, 't6').doneAt === '', task(d, 't6'));
    await pg.click('[data-act="toggle-run"]');
    await pg.click('[data-act="cycle-task"][data-tid="t5"]');
    await pg.click('[data-act="cycle-task"][data-tid="t5"]');
    await pg.click('[data-act="cycle-task"][data-tid="t5"]');
    await pg.waitForTimeout(1600);
    d = await doc(pg, 'p-hist');
    check('re-doing an imported task stamps it', task(d, 't5').status === 'done' && task(d, 't5').doneAt === day(0), task(d, 't5'));
    // a project with nothing done hides the panel
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Blank');
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(300);
    check('a new project shows no Progress panel', await pg.locator('.progress').count() === 0);
    check('no page errors', !errs.length, errs);
    await pg.context().close();
  }
  for (const w of [360, 390]) {
    const { pg, errs } = await open(b, 'plain.html', { viewport: { width: w, height: 800 } });
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Phone');
    await pg.check('input[name="np-starter"][value="web"]');
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(300);
    await pg.click('#tab-plan');
    const first = pg.locator('[data-act="cycle-task"]').first();
    await first.click(); await pg.locator('[data-act="cycle-task"]').first().click();
    await pg.click('#tab-overview');
    check(w + 'px: the panel shows without Claude', await pg.isVisible('.progress') && /This week: 1 task done, 0 sessions/.test(await pg.textContent('.progress')));
    check(w + 'px: no sideways scroll', await noScroll(pg));
    const lab = await pg.evaluate(() => { const c = document.querySelector('.chart-x').getBoundingClientRect(); return [...document.querySelectorAll('.chart-x span')].every((s) => { const r = s.getBoundingClientRect(); return r.left >= c.left - 2 && r.right <= c.right + 2; }); });
    check(w + 'px: week labels stay inside the panel', lab);
    await pg.locator('.progress').screenshot({ path: __dirname + `/progress-${w}.png` });
    check(w + 'px: no page errors', !errs.length, errs);
    await pg.context().close();
  }
  await b.close();
})();
