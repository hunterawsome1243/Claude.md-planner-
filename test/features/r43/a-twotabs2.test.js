// Round 43 (from review 9b's script): two tabs on the same project (laptop A, desktop B). Each page has its own mock store, so the desktop's saved copy is
// handed to the laptop as an incoming snapshot (__mockEmitExternal), arriving while the laptop's own edit is still unsaved
// (inside the 0.7 s save pause, or while the laptop was offline: both go through the same three-way merge).
const { launch, open, check } = require('./lib');
const { priyaSeed, seedInit } = require('./seed');
(async () => {
  const b = await launch();
  const A = await open(b, 'mocked.html', { init: seedInit(priyaSeed()), wait: 1200 });
  const B = await open(b, 'mocked.html', { init: seedInit(priyaSeed()), wait: 1200 });
  for (const x of [A, B]) { await x.pg.click('#tab-plan'); await x.pg.waitForTimeout(150); }

  // Scenario 1: desktop moves "Print the week plan" to Milestone 4; laptop marks it started
  await B.pg.click('[data-act="toggle-notes"][data-tid="tw23"]'); await B.pg.waitForTimeout(100);
  await B.pg.selectOption('#f-milestones-mw3-tasks-tw23-ms', 'mw4'); await B.pg.click('#f-milestones-mw3-tasks-tw23-msgo');
  await B.pg.waitForTimeout(1600);
  const fromB = await B.pg.evaluate(() => window.__mockDocs.get('pweb'));
  await A.pg.click('[data-act="cycle-task"][data-tid="tw23"]'); // To do -> In progress, not saved yet
  await A.pg.evaluate((d) => window.__mockEmitExternal('pweb', d), fromB);
  await A.pg.waitForTimeout(1800);
  const a1 = await A.pg.evaluate(() => window.__mockDocs.get('pweb'));
  const copies = a1.milestones.flatMap((m) => m.tasks.filter((t) => t.title === 'Print the week plan').map((t) => `${m.title}: ${t.status} (id ${t.id})`));
  const total = a1.milestones.reduce((n, m) => n + m.tasks.length, 0);
  console.log('laptop after merge:', copies, 'tasks', total);
  console.log('laptop Plan counts:', await A.pg.evaluate(() => [...document.querySelectorAll('.ms-count')].map((e) => e.innerText)));
  console.log('laptop gauge:', await A.pg.evaluate(() => document.querySelector('.gauge-legend')?.innerText.replace(/\s+/g, ' ')));
  await A.pg.click('#tab-claudemd'); await A.pg.click('[data-act="repo-file"][data-k="plan"]'); await A.pg.waitForTimeout(100);
  const planLines = (await A.pg.inputValue('#repo-text')).split('\n').filter((l) => l.includes('Print the week plan'));
  console.log('laptop PLAN.md lines for the task:', planLines);
  check('scenario 1: one copy of the moved task after the merge', copies.length === 1, { copies, total });
  check('scenario 1: it sits in Milestone 4, started, and the plan still has 40 tasks', copies.length === 1 && /^Shopping list: doing/.test(copies[0]) && total === 40, copies);
  check('scenario 1: PLAN.md lists it once', planLines.length === 1, planLines);

  // Scenario 2: both tabs add a rule to CLAUDE.md from a lesson
  const A2 = await open(b, 'mocked.html', { init: seedInit(priyaSeed()), wait: 1200 });
  const B2 = await open(b, 'mocked.html', { init: seedInit(priyaSeed()), wait: 1200 });
  for (const x of [A2, B2]) { await x.pg.click('#tab-improve'); await x.pg.waitForTimeout(150); }
  await B2.pg.fill('#f-lessons-lw4-change', 'Test drag and drop with touch as well as a mouse'); await B2.pg.waitForTimeout(100);
  await B2.pg.click('[data-act="promote"][data-id="lw4"]'); await B2.pg.waitForTimeout(1600);
  const fromB2 = await B2.pg.evaluate(() => window.__mockDocs.get('pweb'));
  await A2.pg.click('[data-act="promote"][data-id="lw5"]');
  await A2.pg.evaluate((d) => window.__mockEmitExternal('pweb', d), fromB2);
  await A2.pg.waitForTimeout(1800);
  const a2 = await A2.pg.evaluate(() => window.__mockDocs.get('pweb'));
  const lw4 = a2.lessons.find((l) => l.id === 'lw4');
  console.log('conventions on laptop:', a2.conventions.split('\n'));
  console.log('lesson lw4 on laptop:', { change: lw4.change, promoted: lw4.promoted });
  const badge = await A2.pg.evaluate(() => document.querySelector('#f-lessons-lw4-change')?.closest('.lesson')?.querySelector('.promoted, [data-act="promote"]')?.innerText);
  console.log('Improve shows for lw4:', badge);
  await A2.pg.click('#tab-claudemd'); await A2.pg.waitForTimeout(100);
  const md = await A2.pg.inputValue('#f-claudeMd');
  check('scenario 2: both rules are in the conventions', /touch as well as a mouse/.test(a2.conventions) && /test runner is installed/.test(a2.conventions), a2.conventions.split('\n').slice(-3));
  check('scenario 2: both rules reach CLAUDE.md', /touch as well as a mouse/.test(md) && /test runner is installed/.test(md), { lw4InClaudeMd: /touch as well as a mouse/.test(md), lw5InClaudeMd: /test runner is installed/.test(md), improveSays: badge });
  check('no page errors', ![A, B, A2, B2].some((x) => x.errs.length), [A, B, A2, B2].map((x) => x.errs));
  await b.close();
})();
