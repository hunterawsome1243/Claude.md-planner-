const { launch, open } = require('./lib');
const seed = { 'p-a': { kind: 'project', name: 'Pantry Planner', pitch: 'Plan meals from the pantry.', audience: 'Me', problem: 'Food goes off.', doneWhen: 'A week is planned.', guideHidden: true, updatedAt: new Date().toISOString(), stack: 'Vite\nReact',
  features: [{ id: 'f1', title: 'Shelf view', priority: 'must', detail: 'See every shelf' }, { id: 'f2', title: 'Low stock list', priority: 'should' }],
  milestones: [{ id: 'm1', title: 'Basics', goal: 'It runs', tasks: [{ id: 't1', title: 'Shelf view', size: 'S', status: 'done' }, { id: 't2', title: 'Low stock list', size: 'M', status: 'doing' }, { id: 't3', title: 'Week plan', size: 'L' }] }],
  bugs: [{ id: 'b1', title: 'Counts are off', severity: 'major' }] }, 'p-b': { kind: 'project', name: 'Other', updatedAt: '2026-01-01T00:00:00Z' } };
(async () => {
  const b = await launch();
  for (const scheme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme });
    const { pg } = await open(b, 'mocked.html', { ctx, init: `window.__SEED__=${JSON.stringify(seed)};`, wait: 700 });
    await pg.click('#plist [data-act="open"][data-id="p-a"]');
    await pg.screenshot({ path: `${__dirname}/../shots/overview-${scheme}.png` });
    await pg.click('#tab-plan'); await pg.waitForTimeout(100);
    await pg.focus('#f-milestones-m1-tasks-t2-title');
    await pg.screenshot({ path: `${__dirname}/../shots/plan-${scheme}.png` });
    await pg.click('#tab-design'); await pg.waitForTimeout(100);
    await pg.screenshot({ path: `${__dirname}/../shots/design-${scheme}.png` });
    await ctx.close();
  }
  await b.close();
})();
