// Realistic keyboard path: Tab to "Move milestone down", press Enter. Is the button that keeps focus still on screen?
const { chromium, open, fa, kb, sleep, check, newProjectKb, failCount } = require('./k');
(async () => {
  const b = await chromium.launch();
  for (const w of [1280, 390]) {
    const vp = { width: w, height: w === 390 ? 844 : 900 };
    const { pg, errs } = await open(b, 'mocked.html', { viewport: vp });
    await newProjectKb(pg, 'Mover', 'x', false);
    await kb(pg, '[data-act="tab"][data-k="plan"]');
    for (const name of ['First', 'Second']) {
      await kb(pg, '[data-act="add-ms"]'); await pg.keyboard.type(name);
      await kb(pg, '[data-act="add-task"] >> nth=-1');
      for (let i = 0; i < 6; i++) { await pg.keyboard.type(`${name} task ${i}`); if (i < 5) await pg.keyboard.press('Enter'); }
    }
    // start from the plan tab button and Tab forward until "Move milestone down" of the first milestone
    await pg.focus('#tab-plan');
    let guard = 0;
    while (guard++ < 40) { await pg.keyboard.press('Tab'); if (/Move milestone down/.test(await fa(pg))) break; }
    const before = await fa(pg);
    await pg.keyboard.press('Enter'); await sleep(30);
    const after = await fa(pg);
    const order = await pg.$$eval('.ms-title', (e) => e.map((x) => x.value).join(','));
    check(`[${w}] after Enter on "Move milestone down" the focused button is on screen`, !/OFFSCREEN/.test(after), { before, after, order });
    // priority change moving a feature to another lane
    await kb(pg, '[data-act="tab"][data-k="design"]');
    for (let i = 0; i < 4; i++) { await kb(pg, '[data-act="add-feature"][data-p="must"]'); await pg.keyboard.type('F' + i); }
    await pg.focus('.lane[data-p="must"] select >> nth=0');
    await pg.keyboard.press('Shift');
    await pg.selectOption('.lane[data-p="must"] select >> nth=0', 'could'); await sleep(30);
    const fp = await fa(pg);
    check(`[${w}] after changing a feature's priority with the keyboard the focused select is on screen`, !/OFFSCREEN/.test(fp), fp);
    console.log(`errors[${w}]`, errs);
    await pg.context().close();
  }
  console.log('\nfails:', failCount());
  await b.close();
})();
