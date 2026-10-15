// Two devices: this page is device B; __mockEmitExternal / __mockDocs model device A's writes.
const { chromium, open, newProject, docs, log } = require('./h');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ext = (pg, src) => pg.evaluate((s) => { const [id, b] = [...window.__mockDocs][0]; const nb = JSON.parse(JSON.stringify(b)); new Function('d', s)(nb); window.__mockEmitExternal(id, nb); }, src);
(async () => {
  const b = await chromium.launch();
  // [1] different tasks edited on two devices within one save window
  {
    const { pg, errs } = await open(b, 'mocked.html', { wait: 500 });
    await newProject(pg, 'Lists', 'Recipes', true); await sleep(1500);
    await pg.click('[data-act="tab"][data-k="plan"]');
    await pg.click('[data-act="cycle-task"] >> nth=0'); // B: task 1 -> In progress
    await sleep(200);
    await ext(pg, 'd.milestones[0].tasks[1].title = "Renamed on laptop";'); // A renames task 2
    await sleep(1200);
    const d = Object.values(await docs(pg))[0];
    console.log('[1] store: task1 status =', d.milestones[0].tasks[0].status, ' task2 title =', JSON.stringify(d.milestones[0].tasks[1].title));
    console.log('    B ui task2 =', JSON.stringify(await pg.inputValue('.t-title >> nth=1')), errs);
    await pg.context().close();
  }
  // [2] A deletes the project while B has an unsaved edit in it
  {
    const { pg, errs } = await open(b, 'mocked.html', { wait: 500 });
    await newProject(pg, 'Shared', 'idea', false); await sleep(500);
    await pg.fill('#f-audience', 'typed on B');
    await sleep(100);
    await pg.evaluate(() => { const id = [...window.__mockDocs.keys()][0]; window.__mockDocs.delete(id); window.__mockEmitExternal('zz-other', { kind: 'note' }); }); // A deletes
    await sleep(1500);
    console.log('[2] after A deleted while B typing: store has project?', Object.values(await docs(pg)).some((x) => x.kind === 'project'), ' log =', JSON.stringify((await log(pg)).map((x) => x.slice(0, 2).join(':'))), errs);
    await pg.context().close();
  }
  await b.close();
})();
