// Phone width: the long "Ask Claude to draft the brief, features and plan" button (shown when the first draft failed
// or the project was created without Claude), long project name at desktop width, and task-row delete next to Prompt.
const L = require('./lib');
(async () => {
  const b = await L.launch();
  for (const scheme of ['light', 'dark']) {
    const { pg, ctx } = await L.openPage(b, { width: 390, height: 844, scheme });
    await L.newProject(pg, 'Recipe Box', 'Save recipes from links and plan meals for the week', false);
    const btn = await pg.evaluate(() => { const e = document.querySelector('[data-act="ai-fill"]'); const r = e.getBoundingClientRect(); const p = e.closest('.panel').getBoundingClientRect(); return { right: Math.round(r.right), panelRight: Math.round(p.right), vw: innerWidth, sw: document.querySelector('.sheet').scrollWidth }; });
    console.log(scheme, 'ai-fill button', JSON.stringify(btn));
    await pg.evaluate(() => document.querySelector('[data-act="ai-fill"]').scrollIntoView({ block: 'center' }));
    await L.shot(pg, `09-aifill-btn-390-${scheme}`);
    await ctx.close();
  }
  {
    const { pg, ctx } = await L.openPage(b, { width: 1280, height: 900 });
    await L.newProject(pg, 'Neighbourhood Tool Library Booking', null, false);
    const r = await pg.evaluate(() => { const i = document.querySelector('#f-name'); return { scroll: i.scrollWidth, client: i.clientWidth }; });
    console.log('long name 1280', JSON.stringify(r));
    await L.shot(pg, '09-longname-1280', { clip: { x: 264, y: 0, width: 1016, height: 200 } });
    await ctx.close();
  }
  {
    // task delete: one tap, no confirm, no undo
    const { pg, ctx } = await L.openPage(b, { width: 390, height: 844 });
    await L.seed(pg);
    await pg.click('[data-act="open-drawer"]'); await pg.waitForTimeout(300);
    await pg.click('[data-act="open"][data-id="p-shipyard"]'); await pg.waitForTimeout(300);
    await L.tab(pg, 'plan');
    const gap = await pg.evaluate(() => { const t = document.querySelectorAll('.task')[4]; const a = t.querySelector('[data-act="prompt"]').getBoundingClientRect(); const d = t.querySelector('[data-act="del-task"]').getBoundingClientRect(); return { promptRight: a.right, delLeft: d.left, gap: d.left - a.right, delSize: d.width + 'x' + d.height }; });
    const before = await pg.evaluate(() => document.querySelectorAll('.task').length);
    await pg.locator('.task').nth(4).scrollIntoViewIfNeeded();
    await L.shot(pg, '09-task-row-390');
    await pg.click('.task >> nth=4 >> [data-act="del-task"]');
    await pg.waitForTimeout(200);
    const after = await pg.evaluate(() => ({ n: document.querySelectorAll('.task').length, toast: document.querySelector('#toast').hidden ? '' : document.querySelector('#toast').textContent, confirm: !!document.querySelector('.confirm') }));
    console.log('task delete', JSON.stringify({ gap, before, after }));
    await ctx.close();
  }
  await b.close();
})();
