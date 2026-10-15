// While "Create and draft with Claude" is still running: what do the Plan and Design tabs show,
// and what happens if the user asks Claude for a plan at the same time?
const L = require('./lib');
(async () => {
  const b = await L.launch();
  const { pg, errs, ctx } = await L.openPage(b, { width: 1280, height: 900 });
  await pg.evaluate(() => { window.__SAMPLE_DELAY__ = 1500; });
  await pg.click('[data-act="new-project"] >> visible=true');
  await pg.fill('#np-name', 'Recipe Box');
  await pg.fill('#np-idea', 'Save recipes from links and plan meals for the week');
  await pg.click('[data-act="create-ai"]');
  await pg.waitForTimeout(200);
  console.log('next-up plan button enabled during fill:', await pg.isEnabled('.next [data-act="ai-plan"]'));
  await L.tab(pg, 'plan');
  await L.shot(pg, '04-plan-tab-during-fill');
  await L.tab(pg, 'design');
  await L.shot(pg, '04-design-tab-during-fill');
  await L.tab(pg, 'overview');
  await pg.click('.next [data-act="ai-plan"]');
  await pg.waitForTimeout(2500);
  const st = await pg.evaluate(() => ({
    milestones: [...document.querySelectorAll('.ms-title')].map((x) => x.value),
    proposal: [...document.querySelectorAll('.proposal b')].map((x) => x.textContent),
  }));
  console.log(JSON.stringify(st));
  await L.sheetFull(pg, '04-plan-after-double');
  console.log(errs);
  await ctx.close();
  await b.close();
})();
