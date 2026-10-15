// Round 69: What's new for Version 14 covers rounds 64 to 68, in plain words, with a shortcut to Project files.
const { launch, open, check, results } = require('../r48/lib');
const seed = {
  'p-a': { kind: 'project', name: 'Plant Pal', pitch: 'Water plants on time.', milestones: [{ id: 'm1', title: 'Basics', tasks: [{ id: 't1', title: 'List plants', size: 'S' }] }] },
  'p-b': { kind: 'project', name: 'Tide Times', pitch: 'Tides for my beach.', milestones: [] },
};
const OLD = /Repo files|conventions|Save every file|Mark as started|\brepo\b/i;
(async () => {
  const b = await launch();
  const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(seed)}; if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('shipyard.seen.v1', '13'); localStorage.setItem('shipyard.ui.v1', JSON.stringify({ activeId: 'p-a', tab: 'overview', view: 'project' })); }`, wait: 800 });
  check('the dot says there is something new', (await pg.$$('#rail .new-dot')).length === 1);
  await pg.click('#rail [data-act="whats-new"]');
  const fresh = await pg.$$eval('.modal > .wn-list > li h3', (x) => x.map((e) => e.textContent.replace(/ New$/, '')));
  check('Version 14 lists five changes, all marked New, after those of Version 15', fresh.slice(5).join('|') === "Your project's folder stays in step|Prompts that learn from earlier sessions|A plainer first hour|One name for each thing|A plan that keeps itself up to date" && (await pg.$$('.modal > .wn-list .wn-new')).length === 10, fresh);
  check('the sub says ten changes (Version 15 too)', (await pg.textContent('.modal .sub')) === '10 changes since you last looked.', await pg.textContent('.modal .sub'));
  const words = await pg.$$eval('.modal > .wn-list li p', (x) => x.map((e) => e.textContent.split(/\s+/).length));
  check('no entry is longer than about 70 words', words.every((n) => n <= 75), words);
  const text = await pg.textContent('.modal > .wn-list');
  check('the new entries use the new names only', !OLD.test(text), OLD.exec(text));
  check('seen is now 15, and the dot is gone', (await pg.evaluate(() => localStorage.getItem('shipyard.seen.v1'))) === '15' && (await pg.$$('#rail .new-dot')).length === 0);
  await pg.click('.modal > .wn-list [data-act="wn-go"][data-k="files"]');
  await pg.waitForTimeout(250);
  check('the folder entry opens Project files, on the file shown', !(await pg.$('.modal')) && (await pg.getAttribute('#tab-claudemd', 'aria-selected')) === 'true' && (await pg.evaluate(() => document.activeElement?.classList.contains('file-tab'))), await pg.evaluate(() => document.activeElement?.outerHTML.slice(0, 80)));
  await pg.click('#rail [data-act="whats-new"]');
  await pg.click('.modal > .wn-list [data-act="wn-go"][data-k="setup"]');
  await pg.waitForTimeout(200);
  check('the first-hour entry opens Start Claude Code', (await pg.textContent('#m-title')) === 'Start Claude Code');
  await pg.click('.modal [data-act="close-modal"]');
  check('no page errors', errs.length === 0, errs);
  await b.close();
  const f = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - f}/${results.length} passed`);
  process.exit(f ? 1 : 0);
})();
