// Is the control that receives focus after an action scrolled into view? (focusFirst uses preventScroll)
const { chromium, open, fa, kb, sleep, check, newProjectKb, failCount } = require('./k');
const rect = (pg) => pg.evaluate(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); const mb = document.querySelector('.mbar'); const mbb = mb && mb.getClientRects().length ? mb.getBoundingClientRect().bottom : 0; return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, mbarBottom: Math.round(mbb), scrollTop: document.getElementById('sheet').scrollTop }; });
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1280]) {
    console.log(`\n===== width ${w} =====`);
    const vp = { width: w, height: w === 390 ? 844 : 900 };
    const { pg, errs } = await open(b, 'mocked.html', { viewport: vp });
    await newProjectKb(pg, 'Recipe Box', 'Save recipes from links', true);
    await sleep(600);
    await kb(pg, '[data-act="tab"][data-k="improve"]');
    await kb(pg, '[data-act="ai-review"]');
    await sleep(700);
    for (let i = 0; i < 2; i++) {
      await pg.focus('[data-act="review-add"] >> nth=0');
      console.log('  before Enter:', await fa(pg), JSON.stringify(await rect(pg)));
      await pg.keyboard.press('Enter');
      const f = await fa(pg);
      const r = await rect(pg);
      check(`[${w}] focused control after review Add #${i + 1} is inside the viewport`, !/OFFSCREEN/.test(f) && r.top >= r.mbarBottom, f + ' ' + JSON.stringify(r));
    }
    // delete a feature high in a long Must lane -> focus "+ Add feature" at the bottom of the lane
    await kb(pg, '[data-act="tab"][data-k="design"]');
    for (let i = 0; i < 6; i++) { await kb(pg, '[data-act="add-feature"][data-p="must"]'); await pg.keyboard.type('Must ' + i); }
    await pg.focus('.lane[data-p="must"] [data-act="del-feature"] >> nth=0');
    console.log('  before Enter:', await fa(pg), JSON.stringify(await rect(pg)));
    await pg.keyboard.press('Enter');
    const f2 = await fa(pg); const r2 = await rect(pg);
    check(`[${w}] focused control after deleting the first Must feature is inside the viewport`, !/OFFSCREEN/.test(f2) && r2.top >= r2.mbarBottom, f2 + ' ' + JSON.stringify(r2));
    console.log(`errors[${w}]`, errs);
    await pg.context().close();
  }
  console.log('\nfails:', failCount());
  await b.close();
})();
