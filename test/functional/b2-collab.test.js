// Round 2: a collaborator's change to a list arrives while this person keeps typing in the same list.
const L = require('./lib');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await L.launch();
  const { pg, errs } = await L.open(b, 'mocked.html');
  await L.newProject(pg, 'Team', 'idea', true);
  await sleep(1000);
  await pg.click('[data-act="tab"][data-k="plan"]');
  await pg.click('.t-title >> nth=0');
  await pg.keyboard.press('End');
  // person A types for ~3s; person B marks task 2 done and adds a task 1s in
  const typing = (async () => { for (const ch of ' with more detail here') { await pg.keyboard.type(ch); await sleep(140); } })();
  await sleep(1000);
  await pg.evaluate(() => {
    for (const [id, b] of window.__mockDocs) if (b.name === 'Team') {
      const d = JSON.parse(JSON.stringify(b));
      d.milestones[0].tasks[1].status = 'done';
      d.milestones[1].tasks.push({ id: 'tB1', title: 'Added by B', notes: '', size: 'S', status: 'todo' });
      d.updatedAt = new Date().toISOString();
      window.__mockEmitExternal(id, d);
    }
  });
  await typing;
  await sleep(1500);
  const d = await L.mockDoc(pg, 'Team');
  const res = {
    aTitle: d.milestones[0].tasks[0].title,
    bStatus: d.milestones[0].tasks[1].status,
    bTaskKept: d.milestones[1].tasks.some((t) => t.title === 'Added by B'),
    uiShowsB: await pg.evaluate(() => [...document.querySelectorAll('.t-title')].some((e) => e.value === 'Added by B')),
  };
  L.check('collaborator changes to the plan survive while I type a task title', res.bStatus === 'done' && res.bTaskKept, res);
  await pg.screenshot({ path: L.OUT + '/b2-after.png', fullPage: true });
  console.log('log', JSON.stringify(await pg.evaluate(() => window.__mockLog.filter((x) => x[0] !== 'json'))));
  console.log('errors', errs);
  await b.close();
})();
