const { launch, open } = require('../r48/lib');
(async () => {
  const b = await launch();
  for (const [name, vp, scheme] of [['laptop-light', { width: 1280, height: 800 }, 'light'], ['phone-dark', { width: 390, height: 844 }, 'dark']]) {
    const ctx = await b.newContext({ viewport: vp, colorScheme: scheme });
    const { pg } = await open(b, 'mocked.html', { ctx, init: `window.__USER__ = { owner: false, edit: false }; localStorage.setItem('shipyard.seen.v1', '99');`, wait: 900 });
    await pg.screenshot({ path: `${__dirname}/../shots/guest-${name}.png` });
    if (vp.width < 500) { await pg.click('[data-act="open-drawer"]'); await pg.waitForTimeout(300); await pg.screenshot({ path: `${__dirname}/../shots/guest-${name}-drawer.png` }); }
    await ctx.close();
  }
  await b.close();
})();
