// Round 2: the new base/update() storage in db mode.
const L = require('./lib');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ext = (pg, name, patch) => pg.evaluate(([n, p]) => {
  for (const [id, b] of window.__mockDocs) if (b.name === n) { const nb = JSON.parse(JSON.stringify(b)); (typeof p === 'string' ? new Function('d', p) : (d) => Object.assign(d, p))(nb); window.__mockEmitExternal(id, nb); return id; }
  return null;
}, [name, patch]);

(async () => {
  const b = await L.launch();

  // 1. own-write echo while typing continues; final value saved
  {
    const { pg, errs } = await L.open(b, 'mocked.html');
    await L.newProject(pg, 'Echo', 'idea');
    await sleep(300);
    await pg.click('#f-audience');
    for (const ch of 'abcdefghijklmnopqrstuvwxyz') { await pg.keyboard.type(ch); await sleep(60); }
    await sleep(1200);
    const v = await pg.inputValue('#f-audience');
    const d = await L.mockDoc(pg, 'Echo');
    L.check('typing across several flushes: no reversion + saved', v === 'abcdefghijklmnopqrstuvwxyz' && d.audience === v, { ui: v, db: d.audience });
    console.log('errors1', errs);
    await pg.context().close();
  }

  // 2. two devices editing different tasks in the same milestone list
  {
    const { pg, errs } = await L.open(b, 'mocked.html');
    await L.newProject(pg, 'Lists', 'idea', true);
    await sleep(1000);
    await pg.click('[data-act="tab"][data-k="plan"]');
    // local: rename task 1
    await pg.fill('.t-title >> nth=0', 'Renamed here');
    // remote (other device): marks task 2 done within the debounce window
    await ext(pg, 'Lists', 'd.milestones[0].tasks[1].status = "done";');
    await sleep(1300);
    const d = await L.mockDoc(pg, 'Lists');
    const ui = await pg.$$eval('.task', (els) => els.map((e) => e.dataset.s));
    L.check('concurrent edits to different tasks both survive', d.milestones[0].tasks[0].title === 'Renamed here' && d.milestones[0].tasks[1].status === 'done', { t0: d.milestones[0].tasks[0].title, t1status: d.milestones[0].tasks[1].status, uiStatuses: ui });
    // features: local adds a feature while remote edits another feature's detail
    await pg.click('[data-act="tab"][data-k="design"]');
    await pg.click('[data-act="add-feature"][data-p="could"]');
    await pg.keyboard.type('Local feature');
    await ext(pg, 'Lists', 'd.features[0].detail = "edited on phone";');
    await sleep(1300);
    const d2 = await L.mockDoc(pg, 'Lists');
    L.check('concurrent feature edits both survive', d2.features.some((f) => f.title === 'Local feature') && d2.features[0].detail === 'edited on phone', { hasLocal: d2.features.some((f) => f.title === 'Local feature'), f0detail: d2.features[0].detail });
    console.log('errors2', errs);
    await pg.context().close();
  }

  // 3. remote delete of the active project
  {
    const { pg, errs } = await L.open(b, 'mocked.html');
    await L.newProject(pg, 'Keep', 'idea');
    await L.newProject(pg, 'Gone', 'idea');
    await sleep(400);
    await pg.evaluate(() => { for (const [id, b] of window.__mockDocs) if (b.name === 'Gone') { window.__mockDocs.delete(id); } window.__mockEmitExternal('zzz_dummy', { kind: 'other' }); });
    await sleep(200);
    L.check('remote delete of active (clean) switches project', (await L.active(pg)) === 'Keep', await L.active(pg));
    // remote delete while dirty -> local edit re-creates it
    await pg.fill('#f-audience', 'pending edit');
    await pg.evaluate(() => { for (const [id, b] of window.__mockDocs) if (b.name === 'Keep') window.__mockDocs.delete(id); window.__mockEmitExternal('zzz_dummy', { kind: 'other', n: 2 }); });
    await sleep(1200);
    const d = await L.mockDoc(pg, 'Keep');
    L.check('remote delete while dirty: local edit kept (re-created)', !!d && d.audience === 'pending edit', d && d.audience);
    console.log('log3', JSON.stringify(await pg.evaluate(() => window.__mockLog.slice(-6))));
    console.log('errors3', errs);
    await pg.context().close();
  }

  // 4. deleting a project while Claude works on it
  {
    const { pg, errs } = await L.open(b, 'mocked.html');
    await L.newProject(pg, 'Other', 'idea');
    await L.newProject(pg, 'Busy', 'idea');
    await pg.evaluate(() => { window.__SAMPLE_DELAY__ = 900; });
    const toasts = [];
    await pg.exposeFunction('__toastSeen', (t) => toasts.push(t));
    await pg.evaluate(() => { new MutationObserver(() => { const el = document.getElementById('toast'); if (!el.hidden) window.__toastSeen(el.textContent); }).observe(document.getElementById('toast'), { childList: true, characterData: true, subtree: true, attributes: true }); });
    for (const [tab, act] of [['plan', 'ai-plan'], ['design', 'ai-features'], ['improve', 'ai-review']]) {
      if ((await L.active(pg)) !== 'Busy') await L.newProject(pg, 'Busy', 'idea');
      await pg.click(`[data-act="tab"][data-k="${tab}"]`);
      await pg.click(`[data-act="${act}"]`);
      await sleep(100);
      await pg.click('#more-btn'); await pg.click('[data-act=\"ask-delete\"]');
      await pg.click('[data-act="delete-project"]');
      await sleep(1200);
    }
    console.log('toasts after deleting a project mid-request:', JSON.stringify(toasts));
    L.check('no misleading "Claude did not suggest" toast after deleting the project', !toasts.some((t) => /did not suggest|empty review/.test(t)), toasts);
    console.log('errors4', errs);
    await pg.context().close();
  }

  // 5. project created while the store is still connecting
  {
    const init = () => {
      let real;
      Object.defineProperty(window, 'claude', {
        configurable: true,
        get() { return real; },
        set(v) { real = Object.freeze({ use: async (n) => { const c = await v.use(n); if (n === 'db') await new Promise((r) => setTimeout(r, 2500)); return c; } }); },
      });
    };
    const { pg, errs } = await L.open(b, 'mocked.html', { init, wait: 200 });
    const loadingShown = await pg.$$('.loading');
    await pg.click('.mbar [data-act="new-project"]').catch(() => pg.click('[data-act="new-project"] >> visible=true'));
    await pg.fill('#np-name', 'Early bird');
    await pg.fill('#np-idea', 'made during load');
    await pg.click('[data-act="create"]');
    await sleep(100);
    const during = { loading: (await pg.$$('.loading')).length, name: await L.active(pg) };
    await sleep(3200);
    const d = await L.mockDoc(pg, 'Early bird');
    L.check('project created while connecting is saved and shown', !!d && (await L.active(pg)) === 'Early bird', { during, saved: !!d, shown: await L.active(pg) });
    console.log('errors5', errs, 'loading at start', loadingShown.length);
    await pg.context().close();
  }

  // 6. update rejected because the doc vanished without a snapshot: re-created whole
  {
    const { pg, errs } = await L.open(b, 'mocked.html');
    await L.newProject(pg, 'Vanish', 'idea');
    await sleep(400);
    await pg.evaluate(() => { for (const [id, b] of window.__mockDocs) if (b.name === 'Vanish') window.__mockDocs.delete(id); });
    await pg.fill('#f-audience', 'after vanish');
    await sleep(1400);
    const d = await L.mockDoc(pg, 'Vanish');
    L.check('update on missing doc falls back to set', !!d && d.audience === 'after vanish' && d.pitch === 'idea', d && { a: d.audience, p: d.pitch });
    L.check('no save problem shown', !(await pg.textContent('#store-note')).includes('cannot'), await pg.textContent('#store-note'));
    console.log('errors6', errs);
    await pg.context().close();
  }

  // 7. another device edits the brief while this one sits idle (adopt + render)
  {
    const { pg, errs } = await L.open(b, 'mocked.html');
    await L.newProject(pg, 'Idle', 'idea');
    await sleep(400);
    await pg.click('#f-problem');
    await ext(pg, 'Idle', { audience: 'from phone', name: 'Idle renamed' });
    await sleep(200);
    L.check('remote edit adopted into UI', (await pg.inputValue('#f-audience')) === 'from phone' && (await L.active(pg)) === 'Idle renamed');
    L.check('focus kept in problem field', (await pg.evaluate(() => document.activeElement.id)) === 'f-problem');
    // remote edit then local edit of a different field: no echo overwrite
    await pg.fill('#f-problem', 'local problem');
    await sleep(1200);
    const d = await L.mockDoc(pg, 'Idle renamed');
    L.check('local write after remote edit keeps both', d && d.audience === 'from phone' && d.problem === 'local problem', d && { a: d.audience, p: d.problem });
    const upd = await pg.evaluate(() => window.__mockLog.filter((x) => x[0] === 'update').map((x) => x[2]));
    L.check('update payload only changed fields', upd.every((k) => !/audience|name/.test(k)), upd);
    console.log('errors7', errs);
    await pg.context().close();
  }
  await b.close();
})();
