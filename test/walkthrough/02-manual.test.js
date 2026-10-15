// Create a project without Claude and look at every tab while it is empty; then fill a few things by hand.
const L = require('./lib');
const MODE = process.argv[2] || 'mocked'; // mocked | plain
(async () => {
  const b = await L.launch();
  for (const scheme of ['light', 'dark']) {
    for (const width of [1280, 390]) {
      const tag = `${MODE}-${scheme}-${width}`;
      const { pg, errs, ctx } = await L.openPage(b, { width, height: width === 390 ? 844 : 900, scheme, plain: MODE === 'plain' });
      await L.newProject(pg, 'Habit Tracker', MODE === 'plain' ? 'A tiny app to tick off daily habits' : null, false);
      await L.shot(pg, `02-overview-new-${tag}`);
      await L.sheetFull(pg, `02-overview-new-full-${tag}`);
      for (const k of ['design', 'plan', 'claudemd', 'improve']) {
        await L.tab(pg, k);
        await L.sheetFull(pg, `02-${k}-empty-${tag}`);
      }
      if (width === 390) console.log(tag, 'hscroll', JSON.stringify(await L.hscroll(pg)));
      console.log(tag, 'errs', errs);
      await ctx.close();
    }
  }
  await b.close();
})();
