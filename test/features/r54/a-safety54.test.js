// Round 54: review 11b, data safety: odd stored data is read the same way every time and never wipes good data
const { launch, open, check, results } = require('../r48/lib');
const seen = "localStorage.setItem('shipyard.seen.v1', '99');";
const names = (pg) => pg.$$eval('#plist .pitem .nm', (xs) => xs.map((x) => x.textContent));
(async () => {
  const b = await launch();
  {
    // browser only: storage that cannot be read is put aside, not overwritten
    const good = { pA: { kind: 'project', name: 'Alpha', milestones: [{ id: 'm1', title: 'M', tasks: [{ id: 't1', title: 'Task one' }] }] } };
    const damaged = JSON.stringify(good).slice(0, -1);
    const { pg, errs } = await open(b, 'plain.html', { init: `if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', '1'); ${seen} localStorage.setItem('shipyard.projects.v1', ${JSON.stringify(damaged)}); }`, wait: 1000 });
    const aside = await pg.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('shipyard.projects.v1.unreadable.')).map((k) => localStorage.getItem(k)));
    check('unreadable saved projects are put aside unchanged', aside.length === 1 && aside[0] === damaged, aside.map((x) => x.slice(0, 40)));
    check('...and the page says so', /could not be read\. They were put aside unchanged/.test(await pg.textContent('#store-note')), await pg.textContent('#store-note'));
    await pg.evaluate(() => localStorage.setItem('shipyard.projects.v1', JSON.stringify({ pA: { kind: 'project', name: 'Alpha' }, pX: 'not a project', pY: [1, 2] })));
    await pg.reload(); await pg.waitForSelector('#plist .pitem .nm', { timeout: 15000 }).catch(() => {}); await pg.waitForTimeout(300);
    check('entries that are not projects are skipped, not shown as Untitled', (await names(pg)).join() === 'Alpha', await names(pg));
    // an import too large for the browser is refused before it is taken
    const big = JSON.stringify({ app: 'shipyard', version: 1, projects: [{ kind: 'project', name: 'Big', claudeMd: '# Big\n' + 'log line\n'.repeat(40000), claudeMdEdited: true, milestones: [] }] });
    await pg.click('[data-act="open-import"]'); await pg.waitForTimeout(200);
    await pg.$eval('#np-text', (t, v) => { t.value = v; t.dispatchEvent(new Event('input', { bubbles: true })); }, big);
    await pg.click('[data-act="import"]'); await pg.waitForTimeout(400);
    check('an import too large to save is refused in a browser-only planner too', /too long|too large/.test(await pg.textContent('.modal')) && (await names(pg)).join() === 'Alpha');
    check('no page errors (browser only)', !errs.length, errs);
    await pg.context().close();
  }
  {
    // the account store: tasks with no ids or repeated ids
    const seed = { pS: { kind: 'project', name: 'Shop', milestones: [{ id: 'm1', title: 'One', tasks: [{ title: 'Write the cart page' }, { title: 'Add checkout' }] }] },
      pD: { kind: 'project', name: 'Dup', milestones: [{ id: 'm1', title: 'One', tasks: [{ id: 't1', title: 'A' }, { id: 't1', title: 'B' }] }] } };
    const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(seed)}; ${seen}`, wait: 1000 });
    await pg.click('#plist .pitem >> text=Shop'); await pg.click('#tab-plan'); await pg.waitForTimeout(200);
    const ids0 = await pg.$$eval('.t-title', (x) => x.map((e) => e.dataset.tid));
    await pg.evaluate(() => { const d = JSON.parse(JSON.stringify(window.__mockDocs.get('pS'))); d.pitch = 'Changed elsewhere'; window.__mockEmitExternal('pS', d); });
    await pg.waitForTimeout(300);
    const ids1 = await pg.$$eval('.t-title', (x) => x.map((e) => e.dataset.tid));
    check('tasks stored without ids keep the same ids when the project is read again', ids0.join() === ids1.join() && ids0.length === 2, { ids0, ids1 });
    await pg.fill(`#f-milestones-m1-tasks-${ids1[0]}-title`, 'Write the cart page now');
    await pg.waitForTimeout(1400);
    const titles = await pg.evaluate(() => window.__mockDocs.get('pS').milestones[0].tasks.map((t) => t.title));
    check('...so an edit is saved once, with no copy', titles.join('|') === 'Write the cart page now|Add checkout', titles);
    check('...and nothing is counted as new', !(await pg.$('.away')) && !(await pg.$('.away-n')));
    // a list that comes in as something else, and fields this version does not know
    await pg.evaluate(() => { const d = JSON.parse(JSON.stringify(window.__mockDocs.get('pS'))); const ms = d.milestones; d.milestones = { m1: ms[0] }; window.__mockEmitExternal('pS', d); });
    await pg.waitForTimeout(300);
    check('a plan that arrives as something other than a list is not read as emptied', (await pg.$$('.t-title')).length === 2);
    await pg.evaluate(() => { const d = JSON.parse(JSON.stringify(window.__mockDocs.get('pS'))); d.milestones = [{ ...Object.values(d.milestones)[0] }]; d.milestones[0].due = '2026-11-01'; d.milestones[0].tasks[1].estimate = 3; window.__mockEmitExternal('pS', d); });
    await pg.waitForTimeout(300);
    await pg.click(`#f-milestones-m1-tasks-${ids1[0]}-st`);
    await pg.waitForTimeout(1400);
    const m = await pg.evaluate(() => window.__mockDocs.get('pS').milestones[0]);
    check('fields this version does not know survive an edit here', m.due === '2026-11-01' && m.tasks[1].estimate === 3 && m.tasks.length === 2, m);
    // a stored project without its kind
    await pg.evaluate(() => window.__mockEmitExternal('pK', { name: 'Blog', milestones: [] }));
    await pg.waitForTimeout(300);
    check('a project stored without its kind is still listed', (await names(pg)).includes('Blog'), await names(pg));
    check('no page errors (account)', !errs.length, errs);
    await pg.context().close();
  }
  await b.close();
  const fails = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - fails} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})();
