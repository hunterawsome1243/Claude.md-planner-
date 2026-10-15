// Round-1 "terminal snapshot error" re-test: after a fatal onSnapshot error, edits go to localStorage only.
const { chromium, open, newProject, docs } = require('./h');
const init = require('./snaperr');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext();
  const { pg } = await open(b, 'mocked.html', { ctx, init: init(null), wait: 500 });
  await newProject(pg, 'Synced', 'idea', false);
  await pg.waitForTimeout(900);
  await pg.evaluate(() => window.__snapErr({ code: 'revoked', message: 'grant withdrawn' }));
  await pg.waitForTimeout(100);
  console.log('toast:', await pg.evaluate(() => document.querySelector('#toast').textContent));
  console.log('rail note:', await pg.evaluate(() => document.querySelector('#store-note').textContent));
  await pg.fill('#f-audience', 'Typed after the error');
  await pg.waitForTimeout(500);
  const d = await docs(pg);
  console.log('localStorage audience:', await pg.evaluate(() => Object.values(JSON.parse(localStorage.getItem('shipyard.projects.v1')))[0].audience));
  console.log('store audience:', JSON.stringify(Object.values(d)[0].audience));
  // the toast says to reload to reconnect
  const { pg: pg2 } = await open(b, 'mocked.html', { ctx, init: init(d), wait: 600 });
  await pg2.waitForTimeout(800);
  console.log('after reload: note =', await pg2.evaluate(() => document.querySelector('#store-note').textContent));
  console.log('after reload: UI audience =', JSON.stringify(await pg2.evaluate(() => document.querySelector('#f-audience').value)), ' store audience =', JSON.stringify(await pg2.evaluate(() => [...window.__mockDocs.values()][0].audience)));
  console.log('localStorage still holds it:', await pg2.evaluate(() => Object.values(JSON.parse(localStorage.getItem('shipyard.projects.v1')))[0].audience));
  await b.close();
})();
