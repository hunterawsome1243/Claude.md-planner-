// First open: empty state, new-project dialog, validation messages, in 4 combos plus plain (no Claude).
const L = require('./lib');
(async () => {
  const b = await L.launch();
  for (const scheme of ['light', 'dark']) {
    for (const width of [1280, 390]) {
      const tag = `${scheme}-${width}`;
      const { pg, errs, ctx } = await L.openPage(b, { width, height: width === 390 ? 844 : 900, scheme });
      await L.shot(pg, `01-empty-${tag}`);
      console.log(tag, 'hscroll', JSON.stringify(await L.hscroll(pg)));
      if (width === 390) {
        console.log(tag, 'small', (await L.smallTargets(pg, 44)).join(' | '));
        await pg.click('[data-act="open-drawer"]');
        await pg.waitForTimeout(300);
        await L.shot(pg, `01-drawer-empty-${tag}`);
        await pg.keyboard.press('Escape');
        await pg.waitForTimeout(400);
      }
      await pg.click('[data-act="new-project"] >> visible=true');
      await pg.waitForTimeout(200);
      await L.shot(pg, `01-newmodal-${tag}`);
      await pg.click('[data-act="create-ai"]');
      await pg.waitForTimeout(150);
      await L.shot(pg, `01-newmodal-err-name-${tag}`);
      await pg.fill('#np-name', 'Test');
      await pg.click('[data-act="create-ai"]');
      await pg.waitForTimeout(150);
      await L.shot(pg, `01-newmodal-err-idea-${tag}`);
      console.log(tag, 'errs', errs);
      await ctx.close();
    }
  }
  // plain (no runtime)
  for (const width of [1280, 390]) {
    const { pg, errs, ctx } = await L.openPage(b, { width, height: 844, plain: true });
    await L.shot(pg, `01-empty-plain-${width}`);
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.waitForTimeout(200);
    await L.shot(pg, `01-newmodal-plain-${width}`);
    console.log('plain', width, errs, await pg.evaluate(() => document.querySelector('#store-note').textContent));
    await ctx.close();
  }
  await b.close();
})();
