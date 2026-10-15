const { launch, open } = require('./lib');
(async () => { const b = await launch(); const ctx = await b.newContext({ viewport: { width: 640, height: 900 } });
  const s = { 'p-a': { kind: 'project', name: 'Pantry', guideHidden: true, milestones: [{ id: 'm1', title: 'Basics', tasks: [{ id: 't1', title: 'Lay out the week plan with a column for each day and a row for each meal of that day', size: 'M' }, { id: 't2', title: 'Short one' }] }] } };
  const { pg } = await open(b, 'mocked.html', { ctx, init: `window.__SEED__=${JSON.stringify(s)};`, wait: 800 });
  await pg.click('#tab-plan');
  await pg.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; }' });
  await pg.waitForTimeout(150);
  console.log(await pg.$$eval('#sheet textarea.one', (x) => x.filter((e) => e.scrollHeight > e.clientHeight + 1).map((e) => e.id))); await b.close(); })();
