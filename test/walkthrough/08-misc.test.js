// Edge cases a first-time user hits: blank name, long name, stale promoted lesson, blocked clipboard,
// empty-milestone delete copy, tab row wrapping on a phone, Claude failures.
const L = require('./lib');
(async () => {
  const b = await L.launch();
  const r = {};
  {
    const { pg, ctx } = await L.openPage(b, { width: 390, height: 844 });
    await L.seed(pg);
    await pg.click('[data-act="open-drawer"]'); await pg.waitForTimeout(300);
    await pg.click('[data-act="open"][data-id="p-shipyard"]'); await pg.waitForTimeout(300);
    r.tabRows = await pg.evaluate(() => [...document.querySelectorAll('.tab')].map((t) => `${t.textContent.trim()}@y${Math.round(t.getBoundingClientRect().top)}`));
    await L.shot(pg, '08-tabs-wrap-390', { clip: { x: 0, y: 0, width: 390, height: 380 } });
    // long name
    await pg.fill('#f-name', 'Neighbourhood Tool Library Booking');
    await pg.waitForTimeout(150);
    await pg.click('[data-act="tab"][data-k="plan"]');
    r.longName = await pg.evaluate(() => { const i = document.querySelector('#f-name'); return { scroll: i.scrollWidth, client: i.clientWidth }; });
    await L.shot(pg, '08-longname-390', { clip: { x: 0, y: 0, width: 390, height: 300 } });
    // blank name -> delete confirm
    await pg.fill('#f-name', '');
    await pg.waitForTimeout(150);
    await pg.click('#more-btn'); await pg.click('[data-act=\"ask-delete\"]');
    await pg.waitForTimeout(100);
    r.blankDelete = await pg.evaluate(() => document.querySelector('.confirm span').textContent);
    await L.shot(pg, '08-blankname-delete-390', { clip: { x: 0, y: 0, width: 390, height: 360 } });
    await pg.click('[data-act="cancel-confirm"]');
    await pg.fill('#f-name', 'Shipyard Planner');
    // empty milestone delete
    await pg.click('[data-act="add-ms"]');
    await pg.waitForTimeout(100);
    await pg.click('[data-act="ask-del-ms"] >> nth=-1');
    await pg.waitForTimeout(100);
    r.emptyMsDelete = await pg.evaluate(() => document.querySelector('.ms:last-of-type .confirm span')?.textContent || [...document.querySelectorAll('.confirm span')].map((x) => x.textContent).join('|'));
    await pg.click('[data-act="del-ms"]');
    // blocked clipboard
    await pg.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('blocked')); });
    await pg.click('.task [data-act="prompt"] >> nth=4');
    await pg.waitForTimeout(150);
    await pg.click('[data-act="copy-prompt"]');
    await pg.waitForTimeout(200);
    r.blockedCopyToast = await pg.evaluate(() => document.querySelector('#toast').textContent);
    await L.shot(pg, '08-copy-blocked-390');
    await pg.keyboard.press('Escape');
    // promoted lesson goes stale
    await L.tab(pg, 'improve');
    await pg.click('[data-act="add-lesson"]');
    await pg.keyboard.type('Claude added a build step.');
    await pg.fill('[data-path$=".change"]', 'Keep it one HTML file with no build step.');
    await pg.click('[data-act="promote"]');
    await pg.waitForTimeout(150);
    await pg.fill('[data-path$=".change"]', 'Never add npm, bundlers or a build step.');
    await pg.waitForTimeout(150);
    r.lessonLabel = await pg.evaluate(() => document.querySelector('.lesson .promoted')?.textContent);
    await L.tab(pg, 'claudemd');
    r.mdConventions = (await pg.inputValue('#f-claudeMd')).split('## Conventions')[1].split('##')[0];
    await L.tab(pg, 'improve');
    await pg.locator('.lesson').first().scrollIntoViewIfNeeded();
    await pg.waitForTimeout(4700);
    await L.shot(pg, '08-lesson-stale-390', { full: false });
    await ctx.close();
  }
  // Claude failures
  {
    const { pg, ctx } = await L.openPage(b, { width: 1280, height: 900 });
    await pg.evaluate(() => { window.__SAMPLE_FAIL__ = 'rate_limited'; });
    await L.newProject(pg, 'Recipe Box', 'Save recipes from links and plan meals for the week', true);
    await pg.waitForTimeout(300);
    r.failToast = await pg.evaluate(() => document.querySelector('#toast').textContent);
    await L.shot(pg, '08-create-ai-failed');
    await pg.evaluate(() => { window.__SAMPLE_FAIL__ = 'not_granted'; });
    await pg.click('[data-act="ai-fill"]');
    await pg.waitForTimeout(600);
    r.failToast2 = await pg.evaluate(() => document.querySelector('#toast').textContent);
    r.aiButtonsLeft = await pg.evaluate(() => document.querySelectorAll('.btn.ai').length);
    await L.shot(pg, '08-claude-off');
    await ctx.close();
  }
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
