// Round 76: What's new for Version 15 covers rounds 70 to 75, in plain words, with a shortcut to Help.
const { launch, open, check, results } = require('../r48/lib');
const seed = {
  'p-a': { kind: 'project', name: 'Plant Pal', pitch: 'Water plants on time.', milestones: [{ id: 'm1', title: 'Basics', tasks: [{ id: 't1', title: 'List plants', size: 'S' }] }] },
  'p-b': { kind: 'project', name: 'Tide Times', pitch: 'Tides for my beach.', milestones: [] },
};
const OLD = /Repo files|conventions|Save every file|Mark as started|\brepo\b/i;
const V15 = "Help, in one place|Nothing lost when the connection drops|Undo a deleted project|Calm after months of work|Works in more browsers";
(async () => {
  const b = await launch();
  const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(seed)}; if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('shipyard.seen.v1', '14'); localStorage.setItem('shipyard.ui.v1', JSON.stringify({ activeId: 'p-a', tab: 'overview', view: 'project' })); }`, wait: 900 });
  check('the dot says there is something new', (await pg.$$('#rail .new-dot')).length === 1);
  await pg.click('#rail [data-act="whats-new"]');
  const fresh = await pg.$$eval('.modal > .wn-list > li h3', (x) => x.map((e) => e.textContent.replace(/ New$/, '')));
  check('Version 15 lists five changes, all marked New', fresh.join('|') === V15 && (await pg.$$('.modal > .wn-list .wn-new')).length === 5, fresh);
  check('the sub says five changes', (await pg.textContent('.modal .sub')) === '5 changes since you last looked.', await pg.textContent('.modal .sub'));
  const words = await pg.$$eval('.modal > .wn-list li p', (x) => x.map((e) => e.textContent.split(/\s+/).length));
  check('no entry is longer than about 70 words', words.every((n) => n <= 75), words);
  const text = await pg.textContent('.modal > .wn-list');
  check('the new entries use the current names only', !OLD.test(text), OLD.exec(text));
  check('seen is now 15, and the dot is gone', (await pg.evaluate(() => localStorage.getItem('shipyard.seen.v1'))) === '15' && (await pg.$$('#rail .new-dot')).length === 0);
  check('Version 14 is under Earlier changes', /Earlier changes \(\d+\)/.test(await pg.textContent('.modal .wn-older summary')) && (await pg.$$eval('.modal .wn-older li h3', (x) => x.map((e) => e.textContent)))[0] === "Your project's folder stays in step");
  await pg.click('.modal > .wn-list [data-act="wn-go"][data-k="help"]');
  await pg.waitForTimeout(250);
  check('the Help entry opens Help', (await pg.textContent('#m-title')) === 'How Shipyard works');
  await pg.click('.modal [data-act="whats-new"]');
  await pg.waitForTimeout(200);
  check('...and Help\'s What\'s new comes back to the same list', (await pg.$$eval('.modal > .wn-list > li h3', (x) => x.map((e) => e.textContent.replace(/ New$/, '')))).join('|') === V15);
  await pg.click('.modal [data-act="close-modal"]');
  // the shortcut is there on All projects too, where no project is open
  await pg.click('#rail [data-act="open-all"]').catch(() => {});
  await pg.waitForTimeout(200);
  await pg.click('#rail [data-act="whats-new"]');
  check('on All projects the Help shortcut is there too', (await pg.$$('.modal [data-act="wn-go"][data-k="help"]')).length === 1);
  await pg.click('.modal [data-act="close-modal"]');
  check('no page errors', errs.length === 0, errs);
  await b.close();
  const f = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - f}/${results.length} passed`);
  process.exit(f ? 1 : 0);
})();
