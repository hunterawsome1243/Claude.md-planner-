// Build a tiny plan by hand (no Claude, plain page = browser storage), finish every task, and read the end state.
const L = require('./lib');
(async () => {
  const b = await L.launch();
  const { pg, ctx, errs } = await L.openPage(b, { width: 1280, height: 900, plain: true });
  await L.newProject(pg, 'Habit Tracker', 'Tick off daily habits', false);
  await L.tab(pg, 'plan');
  await pg.click('[data-act="add-ms"]');
  await pg.keyboard.type('Bare-bones version running');
  await pg.click('[data-act="add-task"]');
  await pg.keyboard.type('Create the page');
  await pg.keyboard.press('Enter');
  await pg.keyboard.type('Add a habit list');
  await pg.waitForTimeout(200);
  await L.shot(pg, '10-plain-plan');
  for (let i = 0; i < 2; i++) { await pg.click(`[data-act="cycle-task"] >> nth=${i}`); await pg.click(`[data-act="cycle-task"] >> nth=${i}`); }
  await L.tab(pg, 'overview');
  await L.shot(pg, '10-all-done-overview');
  console.log(await pg.evaluate(() => document.querySelector('.next').innerText));
  await pg.click('.task, [data-act="tab"][data-k="plan"]');
  await pg.click('[data-act="tab"][data-k="plan"]');
  await L.shot(pg, '10-all-done-plan');
  await pg.reload();
  await pg.waitForTimeout(500);
  console.log('after reload', await pg.evaluate(() => [document.querySelector('#f-name')?.value, document.querySelector('#store-note').textContent]));
  console.log(errs);
  await ctx.close();
  await b.close();
})();
