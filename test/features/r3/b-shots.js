const { launch, open } = require('./lib');
(async () => {
  const b = await launch();
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme });
      const { pg, errs } = await open(b, 'mocked.html', { ctx });
      await pg.click('[data-act="new-project"] >> visible=true');
      await pg.fill('#np-name', 'Recipe Box');
      await pg.check('input[name="np-starter"][value="web"]');
      await pg.click('[data-act="create"]');
      await pg.waitForTimeout(300);
      await pg.screenshot({ path: `s-overview-${w}-${scheme}.png` });
      await pg.click('.next [data-act="prompt"]');
      await pg.screenshot({ path: `s-prompt-${w}-${scheme}.png` });
      await pg.click('#modal-root [data-act="log-session"]');
      await pg.check('input[name="ss-outcome"][value="stuck"]');
      await pg.fill('#ss-summary', 'Tried twice; the build fails on a missing type.');
      await pg.screenshot({ path: `s-session-${w}-${scheme}.png` });
      await pg.fill('#ss-wrong', 'It kept changing tsconfig');
      await pg.click('[data-act="save-session-ai"]');
      await pg.waitForTimeout(800);
      await pg.screenshot({ path: `s-suggest-${w}-${scheme}.png` });
      await pg.click('[data-act="session-accept"]');
      await pg.click('#tab-improve');
      await pg.evaluate(() => document.querySelector('.panel-head h2')?.closest('.panel'));
      const el = await pg.$('h2:text("Sessions")');
      await el.scrollIntoViewIfNeeded();
      await pg.screenshot({ path: `s-improve-${w}-${scheme}.png` });
      await pg.click('#tab-claudemd');
      await pg.click('[data-act="repo-file"][data-k="plan"]');
      await pg.screenshot({ path: `s-repo-${w}-${scheme}.png` });
      const over = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      console.log(w, scheme, 'hscroll', over, errs);
      await ctx.close();
    }
  }
  await b.close();
})();
