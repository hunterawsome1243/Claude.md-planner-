const { launch, open } = require('./lib');
(async () => {
  const b = await launch();
  const { pg } = await open(b, 'mocked.html', { viewport: { width: 390, height: 844 } });
  await pg.emulateMedia({ colorScheme: 'dark' });
  await pg.click('[data-act="new-project"] >> visible=true');
  await pg.fill('#np-name', 'Recipe Box');
  await pg.check('input[name="np-starter"][value="web"]');
  await pg.click('[data-act="create"]');
  await pg.waitForTimeout(300);
  await pg.click('#tab-improve');
  await pg.evaluate(() => document.querySelector('#qp-h').scrollIntoView());
  await pg.waitForTimeout(200);
  await pg.screenshot({ path: __dirname + '/prompts-phone-view.png' });
  await b.close();
})();
