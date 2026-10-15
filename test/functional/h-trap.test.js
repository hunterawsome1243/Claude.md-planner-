// Round 2: where Tab goes from inside the modal and the open drawer.
const L = require('./lib');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await L.launch();
  const { pg, errs } = await L.open(b, 'mocked.html');
  await L.newProject(pg, 'Trap', 'x', true);
  await sleep(400);
  await pg.click('.next [data-act="prompt"]');
  const seen = [];
  for (let i = 0; i < 6; i++) {
    await pg.keyboard.press('Tab');
    seen.push(await pg.evaluate(() => { const a = document.activeElement; return (a.closest('.modal') ? 'modal:' : 'PAGE:') + (a.dataset?.act || a.id || a.tagName); }));
  }
  console.log('Tab order from the prompt textarea:', seen.join(' > '));
  L.check('Tab stays inside the open dialog (and the Undo of the toast showing, round 59)', seen.every((s) => s.startsWith('modal:') || s === 'PAGE:undo'), seen);
  // Enter on a page button behind the modal while focus escaped
  await pg.keyboard.press('Escape');
  await pg.setViewportSize({ width: 390, height: 844 });
  await sleep(200);
  await pg.click('[data-act="open-drawer"]');
  await sleep(300);
  const seen2 = [];
  for (let i = 0; i < 5; i++) {
    await pg.keyboard.press('Tab');
    seen2.push(await pg.evaluate(() => { const a = document.activeElement; return (a.closest('#rail') ? 'rail:' : 'SHEET:') + (a.dataset?.act || a.id || a.tagName); }));
  }
  console.log('Tab order in the open drawer:', seen2.join(' > '));
  console.log('errors', errs);
  await b.close();
})();
