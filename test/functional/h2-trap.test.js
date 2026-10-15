// Round 2: keyboard focus escaping the prompt dialog reaches page buttons behind it.
const L = require('./lib');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await L.launch();
  const { pg, errs } = await L.open(b, 'mocked.html');
  await L.newProject(pg, 'Other', 'y');
  await L.newProject(pg, 'Trap', 'x', true);
  await sleep(400);
  await pg.click('.next [data-act="prompt"]');
  await pg.fill('#m-prompt', 'My carefully edited prompt');
  let guard = 0;
  while (guard++ < 10) {
    await pg.keyboard.press('Tab');
    const a = await pg.evaluate(() => document.activeElement.dataset?.act || '');
    if (a === 'new-project') break;
  }
  await pg.keyboard.press('Enter');
  await sleep(100);
  const r = { modalTitle: await pg.textContent('#m-title').catch(() => null), promptStillThere: (await pg.$$('#m-prompt')).length };
  L.check('Tab+Enter from the prompt dialog does not replace it with another dialog', r.promptStillThere === 1, r);
  await pg.screenshot({ path: L.OUT + '/h2-after.png' });
  console.log('errors', errs);
  await b.close();
})();
