const { chromium, open, newProject, docs } = require('./h');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ext = (pg, src) => pg.evaluate((s) => { const [id, b] = [...window.__mockDocs][0]; const nb = JSON.parse(JSON.stringify(b)); new Function('d', s)(nb); window.__mockEmitExternal(id, nb); }, src);
const checks = async (pg) => JSON.stringify(Object.values(await docs(pg))[0].checks);
const ui = (pg) => pg.$$eval('input[type=checkbox][data-path^="checks."]', (e) => e.filter((x) => x.checked).map((x) => x.dataset.path.slice(7)).join(','));
async function run(b, page, label) {
  const { pg, errs } = await open(b, page, { wait: 500 });
  await newProject(pg, 'Habits', 'idea', false); await sleep(400);
  await pg.click('[data-act="tab"][data-k="improve"]');
  await pg.check('#f-checks-git'); await sleep(1200);
  console.log(label, 'checked git -> store', await checks(pg));
  await pg.uncheck('#f-checks-git'); await sleep(1200);
  console.log(label, 'unchecked git -> store', await checks(pg), ' ui:', await ui(pg));
  // remote device ticks "tests" (whole-doc write); local box state for git must stay unticked
  await ext(pg, 'd.checks = { ...d.checks, tests: true };'); await sleep(300);
  console.log(label, 'remote ticked tests -> ui:', await ui(pg));
  // remote device drops a key entirely (older client / ArtifactData), local then ticks clear
  await ext(pg, 'd.checks = {};'); await sleep(300);
  console.log(label, 'remote wrote checks {} -> ui:', JSON.stringify(await ui(pg)));
  await pg.check('#f-checks-clear'); await sleep(1200);
  console.log(label, 'ticked clear -> store', await checks(pg), ' ui:', await ui(pg));
  const seed = await docs(pg);
  const { pg: pg2 } = await open(b, page, { init: `window.__SEED__=${JSON.stringify(seed)}`, wait: 700 });
  await pg2.click('[data-act="tab"][data-k="improve"]');
  console.log(label, 'after reload ui:', await ui(pg2), errs);
}
(async () => {
  const b = await chromium.launch();
  await run(b, 'mocked.html', '[mock]');
  await run(b, path.join(__dirname, 'opt.html'), '[opt]');
  await b.close();
})();
