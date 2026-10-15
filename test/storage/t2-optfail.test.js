// With documented latency compensation (own writes echo before they are confirmed), a write that
// rejects with the transient 'unavailable' code is never retried: base was already advanced by the echo.
const { chromium, open, newProject, docs, log } = require('./h');
const path = require('path');
const PAGE = path.join(__dirname, 'opt.html');
async function run(b, rollbackEmit) {
  const { pg, errs } = await open(b, PAGE, { wait: 500 });
  await newProject(pg, 'Retry', 'idea', false);
  await pg.waitForTimeout(500);
  // sanity: a normal edit is saved
  await pg.fill('#f-problem', 'Recipes are everywhere');
  await pg.waitForTimeout(1200);
  const d0 = Object.values(await docs(pg))[0];
  console.log(`[rollbackEmit=${rollbackEmit}] sanity: stored problem =`, JSON.stringify(d0.problem));
  await pg.evaluate((r) => { window.__FAIL_NEXT__ = ['unavailable']; window.__NO_ROLLBACK_EMIT__ = !r; }, rollbackEmit);
  await pg.fill('#f-audience', 'Me and my partner');
  await pg.waitForTimeout(1200);
  console.log('  1.2 s after typing: note =', JSON.stringify(await pg.evaluate(() => document.querySelector('.save-problem')?.textContent || '')));
  await pg.waitForTimeout(9000);
  const d = Object.values(await docs(pg))[0];
  console.log('  10 s later: stored audience =', JSON.stringify(d.audience), ' UI audience =', JSON.stringify(await pg.inputValue('#f-audience')));
  console.log('  note =', JSON.stringify(await pg.evaluate(() => document.querySelector('.save-problem')?.textContent || '')));
  console.log('  log =', JSON.stringify((await log(pg)).filter((x) => /audience|rejected/.test(x.join(' ')))));
  // reload with the store as it is
  const seed = await docs(pg);
  const { pg: pg2 } = await open(b, PAGE, { init: `window.__SEED__=${JSON.stringify(seed)}`, wait: 700 });
  console.log('  after reload: audience =', JSON.stringify(await pg2.inputValue('#f-audience')));
  console.log('  errors', errs);
}
(async () => {
  const b = await chromium.launch();
  await run(b, true);
  await run(b, false);
  await b.close();
})();
