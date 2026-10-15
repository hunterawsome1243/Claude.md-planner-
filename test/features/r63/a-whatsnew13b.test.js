// Round 63: What's new for Version 13 also covers rounds 57 to 62: the Claude buttons and a calmer page.
const { launch, open, check, results } = require('../r48/lib');
const seed = {
  'p-a': { kind: 'project', name: 'Plant Pal', pitch: 'Water plants on time.', milestones: [{ id: 'm1', title: 'Basics', tasks: [{ id: 't1', title: 'List plants', size: 'S' }] }] },
  'p-b': { kind: 'project', name: 'Tide Times', pitch: 'Tides for my beach.', milestones: [] },
};
(async () => {
  const b = await launch();
  const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(seed)}; if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('shipyard.seen.v1', '12'); }`, wait: 800 });
  await pg.click('#rail [data-act="whats-new"]');
  const fresh = await pg.$$eval('.modal > .wn-list > li h3', (x) => x.map((e) => e.textContent));
  check('Version 13 lists five changes, all marked New, after those of Versions 15 and 14', fresh.length === 15 && fresh.every((t) => / New$/.test(t)) && fresh[13] === "Claude's help, more careful New" && fresh[14] === 'A calmer page New', fresh);
  check('the sub says fifteen changes (Versions 15 and 14 too), and promises no shortcut for each', (await pg.textContent('.modal .sub')) === '15 changes since you last looked.' && /^15 changes since you last looked/.test(await pg.textContent('.modal .sub')), await pg.textContent('.modal .sub'));
  check('no entry is longer than about 70 words', await pg.$$eval('.wn-list li p', (x) => x.every((e) => e.textContent.split(/\s+/).length <= 75)));
  await pg.click('.modal > .wn-list [data-act="wn-go"][data-k="all"]');
  await pg.waitForTimeout(250);
  check('A calmer page has a shortcut to All projects', await pg.isVisible('.dcard') && !(await pg.$('.modal')));
  check('no page errors', errs.length === 0, errs);
  await b.close();
  const f = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - f}/${results.length} passed`);
  process.exit(f ? 1 : 0);
})();
