// Round 2: delete right after create (first write in flight), and while the fill runs.
const L = require('./lib');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await L.launch();
  const { pg, errs } = await L.open(b, 'mocked.html');
  await pg.click('[data-act="new-project"] >> visible=true');
  await pg.fill('#np-name', 'Quick');
  await pg.click('[data-act="create"]');
  await pg.click('#more-btn'); await pg.click('[data-act=\"ask-delete\"]');
  await pg.click('[data-act="delete-project"]');
  await sleep(500);
  L.check('create then delete at once leaves no doc', (await pg.evaluate(() => window.__mockDocs.size)) === 0 && (await pg.$$('#plist .pitem')).length === 0, await pg.evaluate(() => window.__mockLog));
  await L.newProject(pg, 'Keep', 'k');
  await pg.click('[data-act="new-project"] >> visible=true');
  await pg.fill('#np-name', 'Filling');
  await pg.fill('#np-idea', 'idea');
  await pg.evaluate(() => { window.__SAMPLE_DELAY__ = 600; });
  await pg.click('[data-act="create-ai"]');
  await sleep(100);
  await pg.click('#more-btn'); await pg.click('[data-act=\"ask-delete\"]');
  await pg.click('[data-act="delete-project"]');
  await sleep(1200);
  L.check('delete during fill: project stays gone', (await pg.$$('#plist .pitem')).length === 1 && !(await L.mockDoc(pg, 'Filling')), { items: (await pg.$$('#plist .pitem')).length });
  console.log('errors', errs);
  await b.close();
})();
