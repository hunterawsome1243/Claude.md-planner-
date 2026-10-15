// Round 40: What's new for Version 10
const { launch, open, check } = require('./lib');
const seed = { 'p-a': { kind: 'project', name: 'Plant Pal', pitch: 'Water plants on time.', milestones: [{ id: 'm1', title: 'Basics', tasks: [{ id: 't1', title: 'List plants', size: 'S' }] }] } };
const seen = (pg) => pg.evaluate(() => localStorage.getItem('shipyard.seen.v1'));
(async () => {
  const b = await launch();
  const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(seed)}; localStorage.setItem('shipyard.seen.v1', '9');`, wait: 700 });
  check('a viewer who saw Version 9 gets the dot', (await pg.$$('#rail .new-dot')).length === 1);
  await pg.click('#rail [data-act="whats-new"]');
  const fresh = await pg.$$eval('.modal > .wn-list > li h3', (x) => x.map((e) => e.textContent));
  check('the Version 10 changes are marked New', fresh.join('|') === "Help, in one place New|Nothing lost when the connection drops New|Undo a deleted project New|Calm after months of work New|Works in more browsers New|Your project's folder stays in step New|Prompts that learn from earlier sessions New|A plainer first hour New|One name for each thing New|A plan that keeps itself up to date New|Starters that work with today's tools New|Safer with odd or damaged data New|Cleaner PLAN.md, import and export New|Claude's help, more careful New|A calmer page New|" + 'Find anything in a project New|What came in while you were away New|Sharing the planner New|Old work looks old New|A summary for any week New|Better files for Claude Code New|Quicker on a phone New|Easier to see and to hear New|Sessions on the right task and day New|Undo within reach New|Your history stays whole New|A plan that builds what you asked for New|PLAN.md stays in step New|One step at a time New', fresh);
  check('and the rest are folded', /^Earlier changes \(16\)$/.test(await pg.textContent('.wn-older summary')), await pg.textContent('.wn-older summary'));
  check('seen is now 15', (await seen(pg)) === '15' && (await pg.$$('#rail .new-dot')).length === 0, await seen(pg));
  await pg.click('[data-act="wn-go"][data-k="plansync"]');
  await pg.waitForTimeout(150);
  check('the PLAN.md shortcut opens Update from PLAN.md', (await pg.textContent('#m-title')) === 'Update from PLAN.md');
  await pg.keyboard.press('Escape');
  check('no page errors', errs.length === 0, errs);
  await b.close();
})();
