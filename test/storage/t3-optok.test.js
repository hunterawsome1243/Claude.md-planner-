// Success-path checks under latency compensation (opt.html) and plain mock (mocked.html).
const { chromium, open, newProject, docs, log } = require('./h');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ext = (pg, fn) => pg.evaluate((src) => { const [id, b] = [...window.__mockDocs][0]; const nb = JSON.parse(JSON.stringify(b)); new Function('d', src)(nb); window.__mockEmitExternal(id, nb); }, fn);
async function scen(b, page, label) {
  console.log('##', label);
  // (a) continuous typing across several flushes
  {
    const { pg, errs } = await open(b, page, { wait: 500 });
    await newProject(pg, 'Echo', 'idea', false); await sleep(400);
    await pg.click('#f-audience');
    for (const ch of 'abcdefghijklmnopqrstuvwxyz') { await pg.keyboard.type(ch); await sleep(90); }
    await sleep(1500);
    const d = Object.values(await docs(pg))[0];
    console.log('(a) ui =', await pg.inputValue('#f-audience'), ' db =', d.audience, errs);
    // (b) external change to another field while our write is in flight
    await pg.evaluate(() => { window.__WRITE_MS__ = 400; });
    await pg.fill('#f-problem', 'P-local');
    await sleep(750); // flush started (700 ms), write in flight
    await ext(pg, 'd.name = "Renamed on phone"; d.stack = "Remote stack";');
    await sleep(1200);
    const d2 = Object.values(await docs(pg))[0];
    console.log('(b) db name/stack/problem =', d2.name, '|', d2.stack, '|', d2.problem, ' ui name =', await pg.inputValue('#f-name'), ' ui stack =', await pg.inputValue('#f-stack'));
    // (c) external change arrives during the debounce window for the same field being typed
    await pg.click('#f-doneWhen'); await pg.keyboard.type('Local done');
    await ext(pg, 'd.doneWhen = "Remote done";');
    await pg.keyboard.type(' more');
    await sleep(1500);
    const d3 = Object.values(await docs(pg))[0];
    console.log('(c) ui doneWhen =', JSON.stringify(await pg.inputValue('#f-doneWhen')), ' db =', JSON.stringify(d3.doneWhen), ' focused =', await pg.evaluate(() => document.activeElement.id));
    await pg.context().close();
  }
  // (d) delete while write in flight (opt: write takes 400 ms)
  {
    const { pg, errs } = await open(b, page, { wait: 500 });
    await newProject(pg, 'Keep', 'idea', false);
    await newProject(pg, 'Doomed', 'idea', false); await sleep(600);
    await pg.evaluate(() => { window.__WRITE_MS__ = 400; });
    await pg.click('#more-btn'); await pg.click('[data-act=\"ask-delete\"]');
    await pg.fill('#f-name', 'Doomed (renamed)');
    await sleep(760);
    await pg.click('[data-act="delete-project"]');
    await sleep(1500);
    console.log('(d) store names =', Object.values(await docs(pg)).map((x) => x.name), ' rail =', await pg.$$eval('#plist .nm', (e) => e.map((x) => x.textContent)), errs);
    console.log('    log =', JSON.stringify((await log(pg)).map((x) => x.slice(0, 2).join(':'))));
    await pg.context().close();
  }
}
(async () => {
  const b = await chromium.launch();
  await scen(b, path.join(__dirname, 'opt.html'), 'opt (latency compensation)');
  await scen(b, 'mocked.html', 'plain mock');
  await b.close();
})();
