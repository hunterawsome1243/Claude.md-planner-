// Round 2: plain (localStorage) mode: reload persistence, two tabs, delete.
const L = require('./lib');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await L.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const { pg, errs } = await L.open(b, 'plain.html', { ctx });
  L.check('plain note', /this browser only/.test(await pg.textContent('#store-note')));
  await L.newProject(pg, 'Local One', 'idea one');
  await L.newProject(pg, 'Local Two', 'idea two');
  // a burst of edits, then reload immediately
  if (await pg.$('[data-act="hide-guide"]')) { await pg.click('[data-act="hide-guide"]'); await pg.waitForTimeout(100); }
  await pg.click('[data-act="stage"][data-k="polishing"]');
  await pg.click('[data-act="tab"][data-k="plan"]');
  await pg.click('[data-act="add-ms"]');
  await pg.keyboard.type('MS');
  await pg.click('[data-act="add-task"]');
  await pg.keyboard.type('T1');
  await pg.keyboard.press('Enter');
  await pg.keyboard.type('T2');
  await pg.click('[data-act="cycle-task"] >> nth=0');
  await pg.click('[data-act="tab"][data-k="improve"]');
  await pg.check('[data-path="checks.tests"]');
  await pg.click('[data-act="tab"][data-k="claudemd"]');
  await pg.click('#f-claudeMd');
  await pg.keyboard.press('Control+End');
  await pg.keyboard.type('custom');
  await pg.reload();
  await sleep(300);
  const st = await pg.evaluate(() => JSON.parse(localStorage.getItem('shipyard.projects.v1')));
  const two = Object.values(st).find((p) => p.name === 'Local Two');
  L.check('reload: tab restored', (await pg.getAttribute('#tab-claudemd', 'aria-selected')) === 'true');
  L.check('reload: everything persisted', two.stage === 'polishing' && two.milestones[0].tasks.map((t) => t.title).join() === 'T1,T2' && two.milestones[0].tasks[0].status === 'doing' && two.checks.tests === true && two.claudeMdEdited && two.claudeMd.trim().endsWith('custom'), { stage: two.stage, tasks: two.milestones[0]?.tasks.map((t) => t.title + ':' + t.status), checks: two.checks, md: two.claudeMd.slice(-20) });
  // delete persists
  await pg.click('#more-btn'); await pg.click('[data-act=\"ask-delete\"]');
  await pg.click('[data-act="delete-project"]');
  await pg.reload();
  await sleep(300);
  L.check('reload: delete persisted', (await pg.$$('#plist .pitem')).length === 1 && (await L.active(pg)) === 'Local One', await L.active(pg));

  // two tabs: edits to different projects / same project
  const { pg: pg2 } = await L.open(b, 'plain.html', { ctx });
  await L.newProject(pg2, 'From tab 2', 'x');
  await sleep(500);
  L.check('tab 1 sees project made in tab 2', (await pg.$$('#plist .pitem')).length === 2);
  // same project, different fields, quickly
  await pg.click('.pitem:has-text("Local One")');
  await pg2.click('.pitem:has-text("Local One")');
  await pg.click('[data-act="tab"][data-k="overview"]');
  await pg2.click('[data-act="tab"][data-k="overview"]');
  await pg.fill('#f-audience', 'audience from tab 1');
  await pg2.fill('#f-problem', 'problem from tab 2');
  await sleep(800);
  const st2 = Object.values(await pg.evaluate(() => JSON.parse(localStorage.getItem('shipyard.projects.v1')))).find((p) => p.name === 'Local One');
  L.check('two tabs, same project, different fields both kept', st2.audience === 'audience from tab 1' && st2.problem === 'problem from tab 2', { a: st2.audience, p: st2.problem });
  console.log('tab1 shows problem:', await pg.inputValue('#f-problem'), '| tab2 shows audience:', await pg2.inputValue('#f-audience'));
  // tab 2 deletes a project while tab 1 is open on it
  await pg.click('.pitem:has-text("From tab 2")');
  await pg2.click('.pitem:has-text("From tab 2")');
  await pg2.click('#more-btn'); await pg2.click('[data-act=\"ask-delete\"]');
  await pg2.click('[data-act="delete-project"]');
  await sleep(400);
  L.check('tab 1 drops project deleted in tab 2', (await pg.$$('.pitem')).length === 1 && (await L.active(pg)) === 'Local One', await L.active(pg));
  console.log('errors', errs);
  await b.close();
})();
