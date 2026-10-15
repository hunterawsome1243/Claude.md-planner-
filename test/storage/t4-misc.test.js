const { chromium, open, newProject, docs, log } = require('./h');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const act = (pg) => pg.evaluate(() => { const a = document.activeElement; return a === document.body ? 'BODY' : a.tagName + (a.id ? '#' + a.id : '') + (a.dataset.act ? '[' + a.dataset.act + ']' : '') + (a.getAttribute('aria-label') ? ' "' + a.getAttribute('aria-label') + '"' : ''); });
(async () => {
  const b = await chromium.launch();
  const { pg, errs } = await open(b, 'mocked.html', { wait: 500 });
  // [A] overview AI buttons after typing a pitch (project made without an idea)
  await newProject(pg, 'No pitch yet', '', false);
  await pg.fill('#f-pitch', 'A habit tracker for my team');
  await sleep(1500);
  console.log('[A] after typing pitch (+1.5 s): ai-plan buttons =', await pg.locator('[data-act="ai-plan"]').count(), ' ai-fill buttons =', await pg.locator('[data-act="ai-fill"]').count());
  await pg.click('[data-act="tab"][data-k="plan"]'); await pg.click('[data-act="tab"][data-k="overview"]');
  console.log('[A] after switching tabs: ai-plan =', await pg.locator('[data-act="ai-plan"]').count(), ' ai-fill =', await pg.locator('[data-act="ai-fill"]').count());
  // [B] rail count after deleting a milestone (with time for the debounced rail render)
  await pg.click('[data-act="tab"][data-k="plan"]');
  await pg.click('[data-act="add-ms"]'); await pg.keyboard.type('M1');
  await pg.click('[data-act="add-task"]'); await pg.keyboard.type('One'); await pg.keyboard.press('Enter'); await pg.keyboard.type('Two');
  await pg.click('[data-act="add-ms"]'); await pg.keyboard.type('M2');
  await sleep(200);
  const rail = () => pg.evaluate(() => document.querySelector('#plist [aria-current="true"] .meta').textContent);
  console.log('[B] rail with 2 tasks:', await rail());
  await pg.click('[data-act="ask-del-ms"] >> nth=0'); await pg.click('[data-act="del-ms"]');
  await sleep(200);
  console.log('[B] rail after deleting milestone 1:', await rail());
  // [C] keyboard focus after moving a milestone up into first place, and after deleting a task
  await pg.click('[data-act="add-task"] >> nth=0'); await pg.keyboard.type('Three');
  await pg.click('[data-act="add-ms"]'); await pg.keyboard.type('M3');
  await pg.focus('[data-act="ms-move"][data-d="-1"] >> nth=1');
  console.log('[C] focused before:', await act(pg));
  await pg.keyboard.press('Enter');
  console.log('[C] after Enter on "Move milestone up" (it is now first):', await act(pg), ' order =', await pg.$$eval('.ms-title', (e) => e.map((x) => x.value)).then((v) => v.join(',')));
  await pg.focus('[data-act="del-task"] >> nth=0');
  await pg.keyboard.press('Enter');
  console.log('[C] after Enter on "Delete task":', await act(pg));
  await pg.focus('[data-act="ms-move"][data-d="1"] >> nth=0');
  await pg.keyboard.press('Enter');
  console.log('[C] after Enter on "Move milestone down" of first:', await act(pg));
  // [D] oversized project
  await pg.click('[data-act="tab"][data-k="claudemd"]');
  await pg.evaluate(() => { const t = document.querySelector('#f-claudeMd'); t.value = 'x'.repeat(260000); t.dispatchEvent(new Event('input', { bubbles: true })); });
  await sleep(1200);
  console.log('[D] note:', await pg.evaluate(() => document.querySelector('.save-problem')?.textContent));
  console.log('errors', errs);
  await b.close();
})();
