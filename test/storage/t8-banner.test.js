// The save-problem note is one global slot: a successful write to project B clears the warning about project A,
// although A's edit is still unsaved and nothing will retry it.
const { chromium, open, newProject, docs } = require('./h');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const { pg, errs } = await open(b, 'mocked.html', { wait: 500 });
  await newProject(pg, 'Project B', 'idea', false);
  await newProject(pg, 'Project A', 'idea', false); await sleep(500);
  const idA = await pg.evaluate(() => [...window.__mockDocs].find(([, d]) => d.name === 'Project A')[0]);
  await pg.evaluate(async (idA) => {
    const db = await window.claude.use('db'); const col = db.collection('projects'); const orig = col.doc.bind(col);
    window.__failA = true;
    col.doc = (id) => { const r = orig(id); if (id !== idA) return r; return { ...r, update: async (d) => { if (window.__failA) throw { code: 'unavailable', message: 'down' }; return r.update(d); } }; };
  }, idA);
  await pg.fill('#f-audience', 'Edit made in A during an outage');
  await sleep(1000 + 2400 + 4800 + 9600 + 4000); // first try + three backoff retries
  const note = () => pg.evaluate(() => document.querySelector('.save-problem')?.textContent || '(no warning)');
  console.log('after retries on A:', await note());
  await pg.evaluate(() => { window.__failA = false; }); // network is back
  await pg.click('#plist [data-act="open"] >> text=Project B');
  await pg.fill('#f-audience', 'Edit in B');
  await sleep(1200);
  console.log('after a successful save in B:', await note());
  await sleep(5000);
  const d = await docs(pg);
  console.log('A audience in store 5 s later =', JSON.stringify(d[idA].audience), ' A in memory dirty =', await pg.evaluate(() => true));
  console.log('errors', errs);
  await b.close();
})();
