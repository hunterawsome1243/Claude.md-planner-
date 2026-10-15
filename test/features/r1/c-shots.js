const { launch, open } = require('./lib');
(async () => {
  const b = await launch();
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme });
      const { pg, errs } = await open(b, 'mocked.html', { ctx });
      await pg.click('[data-act="new-project"] >> visible=true');
      await pg.fill('#np-name', 'Recipe Box');
      await pg.check('input[name="np-starter"][value="ai"]');
      await pg.screenshot({ path: `shot-new-${w}-${scheme}.png` });
      const over = await pg.evaluate(() => ({ doc: document.documentElement.scrollWidth, vw: innerWidth, modal: document.querySelector('.modal').scrollWidth - document.querySelector('.modal').clientWidth }));
      console.log(w, scheme, 'overflow', JSON.stringify(over));
      await pg.click('[data-act="np-mode"][data-k="import"]');
      await pg.fill('#np-text', '# Habit Garden\n\nA tiny app.\n\n## Commands\n```\nnpm test\n```\n');
      await pg.screenshot({ path: `shot-import-${w}-${scheme}.png` });
      await pg.click('[data-act="import"]');
      await pg.waitForTimeout(500);
      if (w < 800) { await pg.click('[data-act="open-drawer"]'); await pg.waitForTimeout(300); }
      await pg.screenshot({ path: `shot-rail-${w}-${scheme}.png` });
      console.log('errors', errs);
      await ctx.close();
    }
  }
  await b.close();
})();
