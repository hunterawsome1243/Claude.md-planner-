// Load the sample project the owner sees first and read every tab, prompt and export.
const L = require('./lib');
const fs = require('fs');
const path = require('path');
(async () => {
  const b = await L.launch();
  const out = {};
  for (const [width, scheme] of [[1280, 'light'], [1280, 'dark'], [390, 'light'], [390, 'dark']]) {
    const tag = `${scheme}-${width}`;
    const { pg, errs, ctx } = await L.openPage(b, { width, height: width === 390 ? 844 : 900, scheme });
    await L.seed(pg);
    if (width === 390) { await pg.click('[data-act="open-drawer"]'); await pg.waitForTimeout(300); }
    await pg.click('[data-act="open"][data-id="p-shipyard"]');
    await pg.waitForTimeout(300);
    await L.sheetFull(pg, `05-seed-overview-${tag}`);
    for (const k of ['design', 'plan', 'claudemd', 'improve']) { await L.tab(pg, k); await L.sheetFull(pg, `05-seed-${k}-${tag}`); }
    if (tag === 'light-1280') {
      out.claudeMd = await (async () => { await L.tab(pg, 'claudemd'); return pg.inputValue('#f-claudeMd'); })();
      await L.tab(pg, 'overview');
      await pg.click('.next [data-act="prompt"]');
      await pg.waitForTimeout(150);
      out.nextPrompt = await pg.inputValue('#m-prompt');
      await pg.keyboard.press('Escape');
      await L.tab(pg, 'plan');
      const n = await pg.locator('.task [data-act="prompt"]').count();
      out.prompts = [];
      for (const i of [4, 5, 7, 8]) {
        if (i >= n) continue;
        await pg.click(`.task [data-act="prompt"] >> nth=${i}`);
        await pg.waitForTimeout(100);
        out.prompts.push(await pg.inputValue('#m-prompt'));
        await pg.keyboard.press('Escape');
        await pg.waitForTimeout(100);
      }
      await pg.click('[data-act="export"]');
      await pg.waitForTimeout(100);
      out.export = await pg.inputValue('#m-export');
      await pg.keyboard.press('Escape');
    }
    console.log(tag, errs);
    await ctx.close();
  }
  fs.writeFileSync(path.join(L.DIR, '05-seed-out.json'), JSON.stringify(out, null, 2));
  await b.close();
})();
