// Screenshot an L-size select unfocused vs keyboard-focused (and an M one for comparison), light and dark.
const { chromium, open, sleep } = require('./k');
const env = require('../helpers/env.js');
(async () => {
  const b = await chromium.launch();
  for (const scheme of ['light', 'dark']) {
    const { pg } = await open(b, 'mocked.html', { scheme });
    await env.populate(pg);
    await pg.click('[data-act="tab"][data-k="plan"]');
    await pg.selectOption('select.size >> nth=0', 'L');
    await pg.click('body', { position: { x: 5, y: 5 } });
    const row0 = pg.locator('.task >> nth=0'); const row1 = pg.locator('.task >> nth=1');
    await row0.screenshot({ path: `${__dirname}/L-${scheme}-unfocused.png` });
    await pg.keyboard.press('Shift');
    await pg.focus('select.size >> nth=0'); await sleep(50);
    console.log(scheme, 'L focus-visible:', await pg.evaluate(() => document.activeElement.matches(':focus-visible')), await pg.evaluate(() => { const s = getComputedStyle(document.activeElement); return [s.borderColor, s.boxShadow, s.outlineStyle].join(' | '); }));
    await row0.screenshot({ path: `${__dirname}/L-${scheme}-focused.png` });
    await pg.focus('select.size >> nth=1'); await sleep(50);
    console.log(scheme, 'M:', await pg.evaluate(() => { const s = getComputedStyle(document.activeElement); return [s.borderColor, s.boxShadow, s.outlineStyle].join(' | '); }));
    await row1.screenshot({ path: `${__dirname}/M-${scheme}-focused.png` });
    await pg.context().close();
  }
  await b.close();
})();
