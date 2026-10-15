// A delete that fails restores the project on screen, but remove() already cancelled its pending save and cleared dirty.
const { chromium, open, newProject, docs } = require('./h');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const { pg, errs } = await open(b, 'mocked.html', { wait: 500 });
  await newProject(pg, 'Keep me', 'idea', false); await sleep(500);
  await pg.evaluate(async () => {
    const db = await window.claude.use('db'); const col = db.collection('projects'); const orig = col.doc.bind(col);
    col.doc = (id) => { const r = orig(id); return { ...r, delete: async () => { throw { code: 'unavailable', message: 'down' }; } }; };
  });
  await pg.click('#more-btn'); await pg.click('[data-act=\"ask-delete\"]');
  await pg.fill('#f-audience', 'Typed just before deciding to delete');
  await pg.click('[data-act="delete-project"]');
  await sleep(300);
  console.log('toast:', await pg.evaluate(() => document.querySelector('#toast').textContent));
  console.log('UI audience after restore:', JSON.stringify(await pg.inputValue('#f-audience')));
  await sleep(3000);
  await pg.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await sleep(300);
  console.log('store audience 3 s later and after pagehide:', JSON.stringify(Object.values(await docs(pg))[0].audience));
  console.log('errors', errs);
  await b.close();
})();
