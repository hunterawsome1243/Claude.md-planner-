// A project that arrives from the store while the welcome screen is showing (another device, or Claude
// writing to the artifact database): the rail shows it as selected but the sheet stays on the welcome page.
const L = require('./lib');
(async () => {
  const b = await L.launch();
  for (const width of [1280, 390]) {
    const { pg, ctx } = await L.openPage(b, { width, height: width === 390 ? 844 : 900 });
    await L.seed(pg);
    await pg.waitForTimeout(500);
    const st = await pg.evaluate(() => ({
      railCurrent: [...document.querySelectorAll('.pitem')].map((x) => x.textContent.trim().replace(/\s+/g, ' ') + ' current=' + x.getAttribute('aria-current')),
      sheet: document.querySelector('.welcome') ? 'welcome page' : document.querySelector('#f-name')?.value,
    }));
    console.log(width, JSON.stringify(st));
    await L.shot(pg, `06-arrive-${width}`);
    // and clicking New project / creating then deleting
    await ctx.close();
  }
  await b.close();
})();
