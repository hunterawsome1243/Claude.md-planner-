// Round 66: a plainer first hour. Start Claude Code before a project is just the install; in a project, a folder made
// already can be used; the setup prompt has one name and its own New to Claude Code?; the guide's files step keeps that
// help on every tab; Back up says what Import does; importing skips projects already here and can be undone; a refusal
// names what was asked; when the page cannot save it says to back up.
const fs = require('fs');
const path = require('path');
const { launch, open, check, results } = require('../r48/lib');
const proj = (name, extra = {}) => ({ kind: 'project', name, pitch: 'Waters your plants on time.', stage: 'idea', starter: 'web', audience: 'Plant owners', problem: 'They forget', doneWhen: 'Reminders work',
  features: [{ id: 'f1', title: 'Reminders', detail: '', priority: 'must', status: 'todo' }],
  milestones: [{ id: 'm1', title: 'First version', goal: '', tasks: [{ id: 't1', title: 'Set up the project', size: 'S', status: 'todo', feat: 'f1' }, { id: 't2', title: 'Remind me to water a plant', size: 'L', status: 'todo', feat: 'f1' }] }], ...extra });
const toastText = (pg) => pg.evaluate(() => document.querySelector('#toast span')?.textContent || '');
const names = (pg) => pg.evaluate(() => [...window.__mockDocs.values()].map((d) => d.name).sort());
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  // the welcome page, with no projects
  let { pg, errs } = await open(b, 'mocked.html', { ctx, init: `window.__SEED__ = {}; localStorage.setItem('shipyard.seen.v1', '99');`, wait: 900 });
  await pg.click('.welcome [data-act="cc-setup"]');
  await pg.waitForTimeout(150);
  const steps0 = await pg.$$eval('.cc-steps > li h3', (xs) => xs.map((x) => x.textContent));
  check('before a project, Start Claude Code is only the install', steps0.join('|') === 'Install it' && !(await pg.$('#cc-folder')), steps0);
  check('...and says the folder comes with a project', /Install it once, now\. The folder comes later, with a project\./.test(await pg.textContent('.modal .sub')) && /Once you start a project, New to Claude Code\? in its Getting started steps shows how to make its folder/.test(await pg.textContent('.cc-later')), await pg.textContent('.modal .sub'));
  check('...with nothing about Repo files or Next up', !/Repo files|Next up|my-project/.test(await pg.textContent('.modal')));
  await pg.click('.modal [data-act="close-modal"]');
  await pg.close();
  // in a project
  ({ pg, errs } = await open(b, 'mocked.html', { ctx, init: `window.__SEED__ = ${JSON.stringify({ 'p-a': proj('Plant Pal') })}; if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('shipyard.seen.v1', '99'); localStorage.setItem('shipyard.ui.v1', JSON.stringify({ activeId: 'p-a', tab: 'overview', view: 'project' })); }`, wait: 1000 }));
  check('the guide\'s files step says what it does', (await pg.textContent('.guide [aria-current="step"] b')) === "Save Shipyard's files in your project's folder", await pg.textContent('.guide [aria-current="step"] b'));
  await pg.click('.guide [aria-current="step"] [data-act="cc-setup"]');
  await pg.waitForTimeout(150);
  check('in a project, a folder made already can be used', /Already made a folder for this project, or the code already exists\? Move into that folder with cd instead, and use its name wherever this says plant-pal\./.test(await pg.textContent('.cc-steps')), await pg.textContent('.cc-steps li:nth-child(2) p'));
  await pg.click('.modal [data-act="close-modal"]');
  await pg.click('#tab-plan');
  check('on another tab, the guide bar keeps New to Claude Code? for the files step', !!(await pg.$('.guide-bar [data-act="cc-setup"]')) && /Save Shipyard's files in your project's folder/.test(await pg.textContent('.guide-bar')));
  // the setup prompt dialog
  await pg.click('.guide-bar [data-act="save-all"]');
  await pg.waitForTimeout(150);
  check('the setup prompt dialog is called Setup prompt', (await pg.textContent('#m-title')) === 'Setup prompt');
  await pg.click('.modal [data-act="cc-setup"]');
  await pg.waitForTimeout(150);
  check('its New to Claude Code? opens Start Claude Code, which says to go back to the setup prompt', (await pg.textContent('#m-title')) === 'Start Claude Code' && /Go back to the setup prompt and paste it into Claude Code\./.test(await pg.textContent('.cc-steps')));
  await pg.click('.modal [data-act="cc-back"]');
  await pg.waitForTimeout(150);
  check('...and Back to the prompt returns to it, on its Copy button', (await pg.textContent('#m-title')) === 'Setup prompt' && (await pg.evaluate(() => document.activeElement?.dataset.act)) === 'copy-export');
  await pg.click('.modal [data-act="close-modal"]');
  // a refusal names what was asked
  await pg.evaluate(() => { window.__SAMPLE_FAIL__ = 'refused'; });
  await pg.click('[data-act="split-task"][data-tid="t2"]');
  await pg.waitForTimeout(700);
  check('a refused split says what was declined and what to do', (await toastText(pg)) === 'Claude declined to split this task. Write the smaller tasks yourself.', await toastText(pg));
  await pg.click('.modal [data-act="close-modal"]').catch(() => {});
  await pg.evaluate(() => { window.__SAMPLE_FAIL__ = 'empty_completion'; });
  await pg.click('[data-act="split-task"][data-tid="t2"]');
  await pg.waitForTimeout(700);
  check('an empty answer does not blame the brief', (await toastText(pg)) === 'Claude returned nothing. Try again.', await toastText(pg));
  await pg.click('.modal [data-act="close-modal"]').catch(() => {});
  await pg.evaluate(() => { window.__SAMPLE_FAIL__ = ''; });
  // Back up, then import it here
  await pg.click('[data-act="backup"] >> visible=true');
  await pg.waitForTimeout(150);
  check('Back up says what Import does', /To bring these projects into another browser or account, use Import there \(under New project\) and paste this or open the file\. Import adds copies next to the projects already there and never replaces them\./.test(await pg.textContent('.modal .sub')), await pg.textContent('.modal .sub'));
  const backup = await pg.inputValue('#m-backup');
  await pg.click('.modal [data-act="close-modal"]');
  const openImport = async () => { await pg.click('[data-act="open-import"] >> visible=true'); await pg.waitForTimeout(150); };
  await openImport();
  await pg.fill('#np-text', backup);
  await pg.waitForTimeout(200);
  check('a backup made here: the note says it is already here', /A Shipyard backup with 1 project\. It is already here, unchanged, so there is nothing to import\./.test(await pg.textContent('.modal')), await pg.textContent('#np-note').catch(() => ''));
  await pg.click('.modal [data-act="import"]');
  await pg.waitForTimeout(200);
  check('...and Import says so instead of making a copy', /The project in this backup is already here, unchanged\. Nothing to import\./.test(await pg.textContent('.modal')) && (await names(pg)).join() === 'Plant Pal', await names(pg));
  // the same backup with one more project, changed: only that one comes in, and Undo takes it out
  const j = JSON.parse(backup);
  j.projects.push(proj('Herb Helper'));
  await pg.fill('#np-text', JSON.stringify(j));
  await pg.waitForTimeout(200);
  check('one already here, one new: the note says which', /1 of them is already here, unchanged, and will be skipped\. Importing adds the other one next to your current projects\./.test(await pg.textContent('.modal')));
  await pg.click('.modal [data-act="import"]');
  await pg.waitForTimeout(1700);
  check('...only the new one is imported, and the toast says the other was skipped', (await names(pg)).join() === 'Herb Helper,Plant Pal' && /1 project was already here, unchanged, so it was skipped\.$/.test(await toastText(pg)) && !!(await pg.$('#toast [data-act="undo"]')), [await names(pg), await toastText(pg)]);
  await pg.click('#toast [data-act="undo"]');
  await pg.waitForTimeout(1700);
  check('Undo takes the imported project out again', (await names(pg)).join() === 'Plant Pal' && (await toastText(pg)) === 'Undone.', [await names(pg), await toastText(pg)]);
  // two new projects at once, then Undo
  await openImport();
  await pg.fill('#np-text', JSON.stringify({ app: j.app, version: 1, projects: [proj('Fern Friend'), proj('Cactus Club')] }));
  await pg.waitForTimeout(150);
  await pg.click('.modal [data-act="import"]');
  await pg.waitForTimeout(1700);
  check('importing two projects offers Undo', (await toastText(pg)) === 'Imported 2 projects.' && !!(await pg.$('#toast [data-act="undo"]')) && (await names(pg)).length === 3);
  await pg.keyboard.press('Escape').catch(() => {});
  await pg.click('#toast [data-act="undo"]');
  await pg.waitForTimeout(1700);
  check('...which takes both out', (await names(pg)).join() === 'Plant Pal', await names(pg));
  // when the page cannot save, it says to back up (the words, from the built page)
  const src = fs.readFileSync(process.env.APPJS, 'utf8');
  check('when the page cannot save, it says to back up, not to export', src.includes("'Shipyard cannot save in this browser. Before you close this tab, use Back up all projects and copy or download the file.'") && !/Copy anything important with Export plan/.test(src));
  check('no page errors', errs.length === 0, errs);
  await b.close();
  const f = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - f}/${results.length} passed`);
  process.exit(f ? 1 : 0);
})();
