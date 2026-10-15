// Closing the tab while an earlier save is still in flight: pagehide's flushAll() skips ids with writing[id] = true,
// so the last keystrokes are only sent after that write resolves, which never happens once the page is gone.
const { chromium, open, newProject } = require('./h');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  for (const page of [path.join(__dirname, 'opt.html'), 'mocked.html']) {
    const { pg } = await open(b, page, { wait: 500 });
    await newProject(pg, 'Close', 'idea', false); await sleep(500);
    await pg.evaluate(async () => {
      window.__WRITE_MS__ = 400; // slow network
      const db = await window.claude.use('db'); const col = db.collection('projects'); const orig = col.doc.bind(col);
      window.__sent = [];
      col.doc = (id) => { const r = orig(id); const u = r.update; return { ...r, update: (d) => { window.__sent.push(d.audience); return u(d); } }; };
    });
    await pg.click('#f-audience'); await pg.keyboard.type('Me and');
    await sleep(760); // first save starts at 700 ms and is in flight
    await pg.keyboard.type(' my partner');
    const sentAtHide = await pg.evaluate(() => { window.dispatchEvent(new Event('pagehide')); return window.__sent.slice(); });
    console.log(page.includes('opt') ? '[opt  ]' : '[plain]', 'updates sent by the time pagehide returns:', JSON.stringify(sentAtHide), ' field =', JSON.stringify(await pg.inputValue('#f-audience')));
    await pg.context().close();
  }
  await b.close();
})();
