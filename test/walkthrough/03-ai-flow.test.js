// Create with Claude, then use every button on every tab. Usage: node 03-ai-flow.js <width> <scheme>
const L = require('./lib');
const fs = require('fs');
const path = require('path');
const width = Number(process.argv[2] || 1280);
const scheme = process.argv[3] || 'light';
const tag = `${scheme}-${width}`;
const out = {};
(async () => {
  const b = await L.launch();
  const { pg, errs, ctx } = await L.openPage(b, { width, height: width === 390 ? 844 : 900, scheme });
  const S = (n, full) => (full ? L.sheetFull(pg, `03-${n}-${tag}`) : L.shot(pg, `03-${n}-${tag}`));
  const toast = () => pg.evaluate(() => { const t = document.querySelector('#toast'); return t.hidden ? '' : t.textContent; });

  // create with Claude, capture the working state
  await pg.evaluate(() => { window.__SAMPLE_DELAY__ = 1500; });
  await pg.click('[data-act="new-project"] >> visible=true');
  await pg.fill('#np-name', 'Recipe Box');
  await pg.fill('#np-idea', 'Save recipes from links and plan meals for the week');
  await pg.click('[data-act="create-ai"]');
  await pg.waitForTimeout(400);
  await S('working');
  await pg.waitForTimeout(1500);
  out.toastFill = await toast();
  await pg.evaluate(() => { window.__SAMPLE_DELAY__ = 300; });
  await S('overview-filled');
  await S('overview-filled-full', true);

  // next up: get prompt
  await pg.click('.next [data-act="prompt"]');
  await pg.waitForTimeout(200);
  out.prompt1 = await pg.inputValue('#m-prompt');
  await S('prompt-modal');
  await pg.click('[data-act="copy-prompt"]');
  await pg.waitForTimeout(200);
  out.toastCopyPrompt = await toast();
  out.clip = await pg.evaluate(() => navigator.clipboard.readText().catch((e) => 'ERR ' + e));
  await pg.click('[data-act="sharpen"]');
  await pg.waitForTimeout(100);
  await S('prompt-sharpening');
  await pg.waitForTimeout(500);
  await S('prompt-sharpened');
  out.sharpened = await pg.inputValue('#m-prompt');
  await pg.click('[data-act="close-modal"]');
  await pg.waitForTimeout(150);

  // start it / mark done
  await pg.click('.next [data-act="set-task"]');
  await pg.waitForTimeout(150);
  await S('overview-started');
  await pg.click('.next [data-act="set-task"]');
  await pg.waitForTimeout(150);
  await S('overview-marked-done');
  out.toastDone = await toast();

  // stages
  if (await pg.$('[data-act="hide-guide"]')) { await pg.click('[data-act="hide-guide"]'); await pg.waitForTimeout(100); }
  for (const k of ['building', 'polishing', 'shipped']) { await pg.click(`[data-act="stage"][data-k="${k}"]`); await pg.waitForTimeout(80); }
  await S('stage-shipped');
  if (await pg.$('[data-act="hide-guide"]')) { await pg.click('[data-act="hide-guide"]'); await pg.waitForTimeout(100); }
  await pg.click('[data-act="stage"][data-k="building"]');

  // design tab
  await L.tab(pg, 'design');
  await S('design-filled', true);
  await pg.click('[data-act="ai-features"]');
  await pg.waitForTimeout(500);
  await S('design-proposal', true);
  await pg.click('[data-act="prop-accept"][data-kind="features"]');
  await pg.waitForTimeout(150);
  out.toastFeat = await toast();
  await pg.click('[data-act="add-feature"][data-p="could"]');
  await pg.keyboard.type('Share a week with my partner');
  await pg.click('[data-act="cycle-feature"] >> nth=0');
  await pg.click('[data-act="add-screen"]');
  await pg.keyboard.type('Week view');
  await pg.click('[data-act="add-decision"]');
  await pg.keyboard.type('Use SQLite, not Postgres');
  await pg.waitForTimeout(150);
  await S('design-edited', true);

  // plan tab
  await L.tab(pg, 'plan');
  await S('plan-filled', true);
  // open notes on first task, edit
  await pg.click('[data-act="toggle-notes"] >> nth=0');
  await pg.waitForTimeout(100);
  // Enter in a task title adds next
  await pg.click('.t-title >> nth=1');
  await pg.keyboard.press('End');
  await pg.keyboard.press('Enter');
  await pg.keyboard.type('Add a seed script with 5 sample recipes');
  await pg.waitForTimeout(100);
  await pg.click('[data-act="cycle-task"] >> nth=1');
  await pg.waitForTimeout(100);
  await S('plan-edited', true);
  // L task prompt
  const lIdx = await pg.evaluate(() => [...document.querySelectorAll('.task .size')].findIndex((s) => s.value === 'L'));
  if (lIdx >= 0) {
    await pg.click(`.task [data-act="prompt"] >> nth=${lIdx}`);
    await pg.waitForTimeout(150);
    out.promptL = await pg.inputValue('#m-prompt');
    await pg.keyboard.press('Escape');
  }
  // ask claude for next milestones
  await pg.click('[data-act="ai-plan"]');
  await pg.waitForTimeout(500);
  await S('plan-proposal', true);
  await pg.click('[data-act="prop-toggle"] >> nth=1');
  await pg.click('[data-act="prop-accept"][data-kind="plan"]');
  await pg.waitForTimeout(150);
  out.toastPlan = await toast();
  // move milestone and delete confirm
  await pg.click('[data-act="ms-move"][data-d="1"] >> nth=0');
  await pg.waitForTimeout(100);
  await pg.click('[data-act="ask-del-ms"] >> nth=0');
  await pg.waitForTimeout(100);
  await S('plan-del-confirm');
  await pg.click('[data-act="cancel-confirm"]');
  await pg.click('[data-act="add-ms"]');
  await pg.waitForTimeout(100);
  await S('plan-add-ms', true);

  // claude.md
  await L.tab(pg, 'claudemd');
  out.claudeMd = await pg.inputValue('#f-claudeMd');
  await S('claudemd', true);
  await pg.click('[data-act="copy-md"]');
  await pg.waitForTimeout(150);
  out.toastCopyMd = await toast();
  await pg.click('[data-act="download-md"]');
  await pg.waitForTimeout(150);
  out.toastDl = await toast();
  await pg.click('#f-claudeMd');
  await pg.keyboard.press('Control+End');
  await pg.keyboard.type('\n- Always use pnpm.');
  await pg.waitForTimeout(200);
  await S('claudemd-edited');
  await pg.click('[data-act="ask-rebuild"]');
  await pg.waitForTimeout(100);
  await S('claudemd-rebuild-confirm');
  await pg.click('[data-act="cancel-confirm"]');

  // improve
  await L.tab(pg, 'improve');
  await pg.click('[data-act="ai-review"]');
  await pg.waitForTimeout(100);
  await S('improve-reviewing');
  await pg.waitForTimeout(500);
  await S('improve-reviewed', true);
  for (let i = 0; i < 3; i++) {
    const btn = pg.locator('[data-act="review-add"]').first();
    if (await btn.count()) { await btn.click(); await pg.waitForTimeout(120); out['toastSugg' + i] = await toast(); }
  }
  await pg.click('#f-checks-git');
  await pg.click('[data-act="add-lesson"]');
  await pg.keyboard.type('Claude rewrote the whole page when I asked for a button.');
  await pg.click('[data-act="promote"]');
  await pg.waitForTimeout(150);
  out.toastPromoteEmpty = await toast();
  await pg.fill('[data-path$=".change"]', 'Only change the files the task names.');
  await pg.click('[data-act="promote"]');
  await pg.waitForTimeout(150);
  out.toastPromote = await toast();
  await S('improve-after', true);
  await L.tab(pg, 'claudemd');
  out.claudeMdAfter = await pg.inputValue('#f-claudeMd');
  await S('claudemd-after', true);

  // export
  await pg.click('[data-act="export"]');
  await pg.waitForTimeout(150);
  out.export = await pg.inputValue('#m-export');
  await S('export-modal');
  await pg.click('[data-act="copy-export"]');
  await pg.waitForTimeout(120);
  out.toastCopyExport = await toast();
  await pg.click('[data-act="download-export"]');
  await pg.waitForTimeout(120);
  out.toastDlExport = await toast();
  await pg.click('[data-act="close-modal"]');

  // overview end state, rail
  await L.tab(pg, 'overview');
  await S('overview-end');
  if (width === 390) {
    out.hscroll = await L.hscroll(pg);
    for (const k of ['design', 'plan', 'claudemd', 'improve']) { await L.tab(pg, k); out['hscroll_' + k] = await L.hscroll(pg); out['small_' + k] = await L.smallTargets(pg, 32); }
    await L.tab(pg, 'overview');
    await pg.click('[data-act="open-drawer"]');
    await pg.waitForTimeout(300);
    await S('drawer');
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(300);
  }
  // delete project
  await pg.click('#more-btn'); await pg.click('[data-act=\"ask-delete\"]');
  await pg.waitForTimeout(100);
  await S('delete-confirm');
  await pg.click('[data-act="delete-project"]');
  await pg.waitForTimeout(300);
  out.toastDel = await toast();
  await S('after-delete');
  out.log = await pg.evaluate(() => window.__mockLog.filter((x) => x[0] === 'save'));
  out.errs = errs;
  fs.writeFileSync(path.join(L.DIR, `03-out-${tag}.json`), JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ errs, toasts: Object.fromEntries(Object.entries(out).filter(([k]) => k.startsWith('toast'))) }, null, 1));
  await ctx.close();
  await b.close();
})();
