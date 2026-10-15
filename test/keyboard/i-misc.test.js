// Remaining checks: delete project with another left, Enter on buttons that focus a textarea (no stray newline),
// rail project switching by keyboard, plain page (no runtime) create shortcuts and focus.
const { chromium, open, fa, kb, sleep, check, newProjectKb, failCount } = require('./k');
(async () => {
  const b = await chromium.launch();
  for (const w of [1280, 390]) {
    const vp = { width: w, height: w === 390 ? 844 : 900 };
    const { pg, errs } = await open(b, 'mocked.html', { viewport: vp });
    await newProjectKb(pg, 'One', 'a', false);
    await newProjectKb(pg, 'Two', 'b', false);
    await kb(pg, '#more-btn'); await kb(pg, '[data-act="ask-delete"]'); await kb(pg, '[data-act="delete-project"]'); await sleep(100);
    const f = await fa(pg);
    check(`[${w}] delete project with another left -> focus on the next project's name`, /f-name/.test(f), f);
    // Enter on buttons that move focus into a textarea
    await kb(pg, '[data-act="tab"][data-k="improve"]');
    await kb(pg, '[data-act="add-lesson"]'); await sleep(30);
    const v1 = await pg.evaluate(() => JSON.stringify(document.activeElement.value));
    check(`[${w}] Enter on Add lesson focuses an empty textarea (no stray newline)`, v1 === '""', v1);
    await kb(pg, '[data-act="tab"][data-k="design"]');
    await kb(pg, '[data-act="add-decision"]'); await sleep(30);
    const v2 = await pg.evaluate(() => JSON.stringify(document.activeElement.value));
    check(`[${w}] Enter on Add decision focuses an empty textarea`, v2 === '""', v2);
    await kb(pg, '[data-act="tab"][data-k="plan"]');
    await kb(pg, '[data-act="add-ms"]'); await kb(pg, '[data-act="add-task"]'); await pg.keyboard.type('T');
    await kb(pg, '[data-act="toggle-notes"]'); await sleep(30);
    const v3 = await pg.evaluate(() => JSON.stringify(document.activeElement.value));
    check(`[${w}] Enter on Show notes focuses an empty notes textarea`, v3 === '""', v3);
    if (w === 1280) {
      await newProjectKb(pg, 'Three', 'c', false);
      await pg.focus('#plist .pitem >> nth=1');
      await pg.keyboard.press('Enter'); await sleep(100);
      const f2 = await fa(pg);
      const cur = await pg.evaluate(() => [...document.querySelectorAll('#plist .pitem')].map((x) => x.getAttribute('aria-current')).join(','));
      check('[1280] Enter on a rail project switches and keeps focus on it; aria-current follows', /\[open\]/.test(f2) && cur === 'false,true', { f2, cur });
    }
    console.log(`errors[${w}]`, errs);
    await pg.context().close();
  }
  // plain page (no Claude, local storage)
  for (const w of [1280, 390]) {
    const vp = { width: w, height: w === 390 ? 844 : 900 };
    const { pg, errs } = await open(b, 'plain.html', { viewport: vp });
    const opener = w === 390 ? '.mbar [data-act="new-project"]' : '#rail [data-act="new-project"]';
    await kb(pg, opener); await sleep(50);
    const btns = await pg.evaluate(() => [...document.querySelectorAll('.modal button')].map((x) => x.textContent.trim()));
    await pg.keyboard.type('Plain'); await pg.keyboard.press('Enter'); await pg.keyboard.type('idea');
    await pg.keyboard.press('Control+Enter'); await sleep(200);
    const made = await pg.evaluate(() => document.querySelector('#f-name')?.value);
    check(`[plain ${w}] Ctrl+Enter in idea creates without Claude`, made === 'Plain' && !btns.some((t) => /Claude(?! Code)/.test(t)), { made, btns });
    console.log(`  [plain ${w}] focus after create:`, await fa(pg));
    console.log(`errors[plain ${w}]`, errs);
    await pg.context().close();
  }
  console.log('\nfails:', failCount());
  await b.close();
})();
