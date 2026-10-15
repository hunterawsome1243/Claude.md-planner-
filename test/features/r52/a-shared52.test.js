// Round 52: someone the owner shares the planner with. A viewer gets a planner of their own in this browser, told
// plainly, kept apart from any copy of the owner's projects; an editor is told whose projects they edit
const { launch, open, check, results, newProject } = require('../r48/lib');
const owners = { 'p-a': { kind: 'project', name: 'Owner Secret', pitch: 'Private plans.', milestones: [{ id: 'm1', title: 'Basics', tasks: [{ id: 't1', title: 'Hidden task', size: 'S' }] }] } };
const mirror = JSON.stringify({ 'p-a': owners['p-a'] });
const as = (u, more = '') => `window.__SEED__ = ${JSON.stringify(owners)}; window.__USER__ = ${JSON.stringify(u)}; if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('shipyard.seen.v1', '99'); localStorage.setItem('shipyard.projects.v1', ${JSON.stringify(mirror)}); } ${more}`;
const note = (pg) => pg.textContent('#store-note');
const names = (pg) => pg.$$eval('#plist li', (x) => x.map((e) => e.textContent.trim()).filter((t) => t !== 'No projects yet.'));
(async () => {
  const b = await launch();
  {
    // a viewer
    const { pg, errs } = await open(b, 'mocked.html', { init: as({ owner: false, edit: false }), wait: 900 });
    check('a viewer is told the planner was shared with them to view', /^Shared with you to view\./.test(await note(pg)), await note(pg));
    check("...sees none of the owner's projects, not even this browser's copy of them", !(await pg.textContent('body')).includes('Owner Secret') && (await names(pg)).length === 0, await names(pg));
    check('...and the welcome says whose projects are whose', await pg.isVisible('.w-guest') && /saved in this browser only/.test(await pg.textContent('.w-guest')));
    await newProject(pg, 'Sam plans');
    await pg.waitForTimeout(600);
    const ls = await pg.evaluate(() => ({ g: JSON.parse(localStorage.getItem('shipyard.guest.v1') || '{}'), o: localStorage.getItem('shipyard.projects.v1') }));
    check("a viewer's project saves in this browser, apart from the owner's copy", Object.values(ls.g).some((p) => p.name === 'Sam plans') && ls.o === mirror, ls);
    check('...with no "Not saved" warning', !(await pg.$('.save-banner')) && !(await pg.$('.save-problem')));
    check('...and nothing is written to the store', !(await pg.evaluate(() => window.__mockLog.some((x) => x[0] === 'set' || x[0] === 'update'))));
    await pg.reload();
    await pg.waitForTimeout(900);
    check('after a reload the project is still there, and the owner\'s are still hidden', (await names(pg)).some((t) => t.includes('Sam plans')) && !(await pg.textContent('body')).includes('Owner Secret'), await names(pg));
    check('no page errors', !errs.length, errs);
    await pg.context().close();
  }
  {
    // the host answers late: the switch still happens, and a project started meanwhile is kept
    const { pg, errs } = await open(b, 'mocked.html', { init: as({ owner: false, edit: false, delay: 2600 }), wait: 300 });
    await pg.waitForTimeout(1400);
    check('while the answer is late, the planner works as before', /^Saved to your Claude account/.test(await note(pg)), await note(pg));
    await newProject(pg, 'Early bird');
    await pg.waitForTimeout(1500);
    check('when it comes, the viewer gets their own planner, with the project they started', /^Shared with you to view\./.test(await note(pg)) && (await names(pg)).some((t) => t.includes('Early bird')), { note: await note(pg), names: await names(pg) });
    await pg.waitForTimeout(500);
    check('...saved in this browser, with no warning left over', Object.values(await pg.evaluate(() => JSON.parse(localStorage.getItem('shipyard.guest.v1') || '{}'))).some((p) => p.name === 'Early bird') && !(await pg.$('.save-problem')));
    check('no page errors (late)', !errs.length, errs);
    await pg.context().close();
  }
  {
    // an editor
    const { pg, errs } = await open(b, 'mocked.html', { init: as({ owner: false, edit: true }), wait: 900 });
    check("an editor sees the owner's projects and is told whose they are", (await names(pg)).some((t) => t.includes('Owner Secret')) && /^Shared with you to edit\./.test(await note(pg)), await note(pg));
    await pg.click('#plist li >> text=Owner Secret');
    await pg.waitForTimeout(200);
    await pg.fill('#f-pitch', 'Edited by the editor.');
    await pg.waitForTimeout(1600);
    check("...and an edit saves to the owner's project", (await pg.evaluate(() => window.__mockDocs.get('p-a').pitch)) === 'Edited by the editor.');
    check('no page errors (editor)', !errs.length, errs);
    await pg.context().close();
  }
  {
    // the owner, and a host that says nothing
    const { pg, errs } = await open(b, 'mocked.html', { init: as({ owner: true, edit: true }), wait: 900 });
    check('the owner sees their projects, saved to their account', (await names(pg)).some((t) => t.includes('Owner Secret')) && /^Saved to your Claude account/.test(await note(pg)) && !(await pg.$('.w-guest')));
    check('no page errors (owner)', !errs.length, errs);
    await pg.context().close();
    const o2 = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(owners)}; localStorage.setItem('shipyard.seen.v1', '99');`, wait: 900 });
    check('with no answer about who is looking, nothing changes', (await names(o2.pg)).some((t) => t.includes('Owner Secret')) && /^Saved to your Claude account/.test(await note(o2.pg)));
    await o2.pg.context().close();
  }
  await b.close();
  const fails = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - fails} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})();
