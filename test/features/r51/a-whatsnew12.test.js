// Round 51: What's new for Version 12
const { launch, open, check, results } = require('../r48/lib');
const seed = { 'p-a': { kind: 'project', name: 'Plant Pal', pitch: 'Water plants on time.', milestones: [{ id: 'm1', title: 'Basics', tasks: [{ id: 't1', title: 'List plants', size: 'S', notes: 'Show each plant with its watering day.' }] }] } };
const seen = (pg) => pg.evaluate(() => localStorage.getItem('shipyard.seen.v1'));
(async () => {
  const b = await launch();
  const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(seed)}; if (!sessionStorage.getItem('x') && !localStorage.getItem('__noinit')) { sessionStorage.setItem('x', '1'); localStorage.setItem('shipyard.seen.v1', '11'); }`, wait: 700 });
  check('a viewer who saw Version 11 gets the dot', (await pg.$$('#rail .new-dot')).length === 1);
  await pg.click('#rail [data-act="whats-new"]');
  const fresh = await pg.$$eval('.modal > .wn-list > li h3', (x) => x.map((e) => e.textContent));
  check('the Version 12 changes are marked New', fresh.join('|') === "Help, in one place New|Nothing lost when the connection drops New|Undo a deleted project New|Calm after months of work New|Works in more browsers New|Your project's folder stays in step New|Prompts that learn from earlier sessions New|A plainer first hour New|One name for each thing New|A plan that keeps itself up to date New|Starters that work with today's tools New|Safer with odd or damaged data New|Cleaner PLAN.md, import and export New|Claude's help, more careful New|A calmer page New|" + 'Find anything in a project New|What came in while you were away New|Sharing the planner New|Old work looks old New|A summary for any week New|Better files for Claude Code New|Quicker on a phone New', fresh);
  check('and the rest are folded', /^Earlier changes \(23\)$/.test(await pg.textContent('.wn-older summary')), await pg.textContent('.wn-older summary'));
  check('seen is now 15', (await seen(pg)) === '15' && (await pg.$$('#rail .new-dot')).length === 0, await seen(pg));
  await pg.click('[data-act="wn-go"][data-k="find"]');
  await pg.waitForTimeout(150);
  check('the Find shortcut opens Find, with the cursor in it', (await pg.textContent('#m-title')) === 'Find in Plant Pal' && (await pg.evaluate(() => document.activeElement.id)) === 'find-q');
  await pg.fill('#find-q', 'watering');
  await pg.keyboard.press('Enter');
  await pg.waitForTimeout(150);
  check('...and finds a word in a task\'s notes', (await pg.evaluate(() => document.activeElement.id)) === 'f-milestones-m1-tasks-t1-notes');
  await pg.evaluate(() => localStorage.setItem('__noinit', '1')); await pg.waitForTimeout(800); // a reload straight after a write can lose it in a test browser under load
  await pg.reload();
  await pg.waitForTimeout(1200);
  check('no dot after a reload', (await pg.$$('#rail .new-dot')).length === 0, { seen: await seen(pg), dots: await pg.evaluate(() => [...document.querySelectorAll('.new-dot')].map((x) => x.parentElement.outerHTML.slice(0, 80))) });
  check('no page errors', errs.length === 0, errs);
  await b.close();
  const fails = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - fails} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})();
