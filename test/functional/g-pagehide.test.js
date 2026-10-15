// Round 2: pending edits flushed on pagehide / hidden in db mode.
const L = require('./lib');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await L.launch();
  const { pg, errs } = await L.open(b, 'mocked.html');
  await L.newProject(pg, 'Hide', 'x');
  await sleep(400);
  await pg.fill('#f-audience', 'typed just before leaving');
  const n0 = await pg.evaluate(() => window.__mockLog.filter((x) => x[0] === 'update').length);
  await pg.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })));
  await sleep(5);
  const started = await pg.evaluate(() => window.__mockLog.length);
  await sleep(100);
  const n1 = await pg.evaluate(() => window.__mockLog.filter((x) => x[0] === 'update').length);
  L.check('pagehide starts the write immediately', n1 === n0 + 1, { before: n0, after: n1 });
  await pg.fill('#f-problem', 'second');
  await pg.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await sleep(100);
  const n2 = await pg.evaluate(() => window.__mockLog.filter((x) => x[0] === 'update').length);
  L.check('hidden tab starts the write immediately', n2 === n1 + 1, { n1, n2 });
  console.log('errors', errs);
  await b.close();
})();
