// Round 56: What's new for Version 13
const { launch, open, check, results } = require('../r48/lib');
const seed = { 'p-a': { kind: 'project', name: 'Trail Notes', starter: 'mobile', pitch: 'Log hikes offline.', milestones: [{ id: 'm1', title: 'Basics', tasks: [{ id: 't1', title: 'Make the app', size: 'S' }] }] } };
const seen = (pg) => pg.evaluate(() => localStorage.getItem('shipyard.seen.v1'));
const V13 = "Help, in one place New|Nothing lost when the connection drops New|Undo a deleted project New|Calm after months of work New|Works in more browsers New|Your project's folder stays in step New|Prompts that learn from earlier sessions New|A plainer first hour New|One name for each thing New|A plan that keeps itself up to date New|Starters that work with today's tools New|Safer with odd or damaged data New|Cleaner PLAN.md, import and export New|Claude's help, more careful New|A calmer page New";
(async () => {
  const b = await launch();
  const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(seed)}; if (!sessionStorage.getItem('x') && !localStorage.getItem('__noinit')) { sessionStorage.setItem('x', '1'); localStorage.setItem('shipyard.seen.v1', '12'); }`, wait: 700 });
  check('a viewer who saw Version 12 gets the dot', (await pg.$$('#rail .new-dot')).length === 1);
  await pg.click('#rail [data-act="whats-new"]');
  const fresh = await pg.$$eval('.modal > .wn-list > li h3', (x) => x.map((e) => e.textContent));
  check('the Version 13 changes are marked New, after those of Versions 15 and 14', fresh.join('|') === V13, fresh);
  check('and the rest are folded', /^Earlier changes \(30\)$/.test(await pg.textContent('.wn-older summary')), await pg.textContent('.wn-older summary'));
  check('seen is now 15', (await seen(pg)) === '15' && (await pg.$$('#rail .new-dot')).length === 0, await seen(pg));
  const text = await pg.textContent('.modal > .wn-list');
  check('no entry is longer than about 70 words', (await pg.$$eval('.wn-list li p', (x) => x.every((e) => e.textContent.split(/\s+/).length <= 75))));
  check('the entries name what changed in words a person uses', /current versions of its tools/.test(text) && /20,000 characters/.test(text) && /Passwords, keys and tokens/.test(text), text.slice(0, 200));
  await pg.click('[data-act="wn-go"][data-k="setup"] >> nth=0');
  await pg.waitForTimeout(150);
  check('the shortcut opens Start Claude Code', (await pg.textContent('#m-title')) === 'Start Claude Code');
  check('...which lists the accounts a mobile app uses', await pg.$$eval('.cc-needs a', (x) => x.some((e) => e.textContent === 'Expo' && e.href === 'https://expo.dev/signup')));
  await pg.keyboard.press('Escape');
  await pg.evaluate(() => localStorage.setItem('__noinit', '1')); await pg.waitForTimeout(800); // a reload straight after a write can lose it in a test browser under load
  await pg.reload();
  await pg.waitForTimeout(1200);
  check('no dot after a reload', (await pg.$$('#rail .new-dot')).length === 0, await pg.evaluate(() => [sessionStorage.getItem('x'), localStorage.getItem('shipyard.seen.v1'), performance.getEntriesByType('navigation')[0]?.type]));
  check('no page errors', errs.length === 0, errs);
  await b.close();
  const fails = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - fails} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})();
