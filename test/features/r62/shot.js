const { launch, open } = require('../r48/lib');
const { build, seedOf, initScript } = require('../r47/seed10b');
(async () => {
  const b = build(); const browser = await launch();
  const [w, h, tab, file, drawer] = process.argv.slice(2);
  const { pg } = await open(browser, 'mocked.html', { viewport: { width: +w, height: +h }, init: initScript(seedOf(b.after), { seen: 99, ui: { activeId: 'pMain', tab, repoFile: 'claudemd', view: 'project' } }), wait: 1300 });
  if (drawer) { await pg.click('.mbar [data-act="open-drawer"]'); await pg.waitForTimeout(400); console.log(await pg.evaluate(() => { const s = document.querySelector('.brand span'); return s.textContent + ' w=' + s.getBoundingClientRect().width + ' rail=' + document.querySelector('#rail').getBoundingClientRect().width; })); }
  await pg.screenshot({ path: file });
  await browser.close();
})();
