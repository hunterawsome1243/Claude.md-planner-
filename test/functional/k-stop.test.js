// Round 2: Stop on every Claude action.
const L = require('./lib');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await L.launch();
  const { pg, errs } = await L.open(b, 'mocked.html');
  await L.newProject(pg, 'Stops', 'pitch');
  await pg.evaluate(() => { window.__SAMPLE_DELAY__ = 1500; });
  for (const [tab, act, sel] of [['overview', 'ai-fill', '#f-audience'], ['plan', 'ai-plan', '.proposal'], ['design', 'ai-features', '.proposal'], ['improve', 'ai-review', '.review']]) {
    await pg.click(`[data-act="tab"][data-k="${tab}"]`);
    await pg.click(`[data-act="${act}"]`);
    await sleep(100);
    await pg.click('[data-act="stop"]');
    await sleep(150);
    const r = { working: (await pg.$$('.working')).length, disabled: await pg.isDisabled(`[data-act="${act}"]`), toast: (await pg.isHidden('#toast')) ? null : await pg.textContent('#toast') };
    await sleep(1600);
    const late = sel.startsWith('#') ? await pg.inputValue(sel) : (await pg.$$(sel)).length;
    L.check(`stop ${act}: clean, no late result`, !r.working && !r.disabled && !r.toast && (late === '' || late === 0), { ...r, late });
  }
  console.log('errors', errs);
  await b.close();
})();
