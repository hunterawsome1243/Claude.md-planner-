// Round 67: one name per thing. The folder is your project's folder and its tab Project files; the setup prompt is the
// setup prompt; a rule is a rule for Claude Code; task notes say who reads them; first-time words are explained; and
// the labels say what they do (Task prompt, Open prompt, Mark started, Add task, Close, Cancel).
const { launch, open, check, results } = require('../r48/lib');
const proj = { kind: 'project', name: 'Plant Pal', pitch: 'Waters your plants on time.', stage: 'building', starter: 'web', commands: 'npm install\nnpm run dev\nnpm test', guideHidden: true,
  milestones: [{ id: 'm1', title: 'First version', goal: '', tasks: [{ id: 't1', title: 'Remind me to water a plant', size: 'M', status: 'todo' }, { id: 't2', title: 'List my plants', size: 'S', status: 'todo' }] },
    { id: 'm2', title: 'Ready to share', goal: '', tasks: [{ id: 't3', title: 'Write a README', size: 'S', status: 'todo' }] }],
  bugs: [{ id: 'b1', title: 'Reminders come twice', severity: 'major', status: 'open' }],
  lessons: [{ id: 'l1', date: '2026-10-12', happened: 'It changed files I did not ask about', change: 'Only change the files the task names' }],
  prompts: [{ id: 'q1', title: 'Write release notes', text: 'Write release notes for the last week.' }] };
const init = `window.__SEED__ = ${JSON.stringify({ 'p-w': proj })}; if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('shipyard.seen.v1', '1'); localStorage.setItem('shipyard.ui.v1', JSON.stringify({ activeId: 'p-w', tab: 'overview', view: 'project' })); }`;
const toastText = (pg) => pg.evaluate(() => document.querySelector('#toast span')?.textContent || '');
const OLD = /Repo files|your repo\b|repo root|Save every file|Rule for next time|House rules|Mark as started|Mark the bug fixed|\+ Add task|\+ Add feature|Your own prompts/;
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const { pg, errs } = await open(b, 'mocked.html', { ctx, init, wait: 1000 });
  check('the tab is Project files', (await pg.textContent('#tab-claudemd')).trim() === 'Project files');
  const seen = [];
  for (const t of ['overview', 'design', 'plan', 'claudemd', 'improve']) {
    await pg.click(`#tab-${t}`);
    await pg.waitForTimeout(150);
    const txt = await pg.evaluate(() => document.body.innerText);
    const m = OLD.exec(txt);
    if (m) seen.push(`${t}: ${m[0]}`);
  }
  check('no tab uses the old names', seen.length === 0, seen);
  // the brief
  await pg.click('#tab-overview');
  check('Conventions is Rules for Claude Code, and Repository a GitHub link', (await pg.textContent('label[for="f-conventions"]')) === 'Rules for Claude Code' && (await pg.textContent('label[for="f-repo"]')) === 'GitHub link');
  // Plan: labels
  await pg.click('#tab-plan');
  check('a task row\'s button is Task prompt', (await pg.textContent('[data-act="prompt"][data-tid="t1"]')).trim() === 'Task prompt');
  check('Add task, without a plus', (await pg.textContent('[data-act="add-task"][data-mid="m1"]')).trim() === 'Add task');
  await pg.click('[data-act="prompt"][data-tid="t1"]');
  await pg.waitForTimeout(150);
  check('a task\'s prompt dialog is called Task prompt', (await pg.textContent('#m-title')) === 'Task prompt');
  await pg.click('.modal [data-act="close-modal"]');
  await pg.click('[data-act="bug-prompt"][data-id="b1"]');
  await pg.waitForTimeout(150);
  check('a bug\'s is called Fix prompt, with Mark fixed', (await pg.textContent('#m-title')) === 'Fix prompt' && (await pg.textContent('.modal [data-act="bug-fixed"]')) === 'Mark fixed');
  await pg.click('.modal [data-act="close-modal"]');
  await pg.click('[data-act="toggle-notes"][data-tid="t1"]').catch(() => {});
  await pg.waitForTimeout(100);
  const ph = await pg.getAttribute('textarea.t-notes', 'placeholder').catch(() => '');
  const opts = await pg.$$eval('select[data-act="move-task-to"][data-tid="t1"] option', (xs) => xs.map((x) => x.textContent));
  check('the move list names milestones in full', opts.join('|') === 'Milestone 1: First version|Milestone 2: Ready to share', opts);
  check('task notes say Claude Code reads them', /^For Claude Code \(they go into the task prompt\)/.test(ph || '') && (await pg.getAttribute('textarea.t-notes', 'aria-label')) === 'Notes for Claude Code', ph);
  // Overview: Next up
  await pg.click('#tab-overview');
  check('Next up has Mark started', !!(await pg.$('.next [data-act="set-task"][data-s="doing"]')) && (await pg.textContent('.next [data-act="set-task"][data-s="doing"]')) === 'Mark started');
  // Project files
  await pg.click('#tab-claudemd');
  await pg.click('.file-tab[data-k="claudemd"]');
  check('CLAUDE.md says what it is', /Built from your project\. The notes Claude Code reads first in every session: the goal, the tools and the rules\./.test(await pg.textContent('.md-state')), await pg.textContent('.md-state'));
  check('the files are for your project\'s folder', (await pg.getAttribute('.file-tabs', 'aria-label')) === "Files for your project's folder");
  await pg.click('.md-side [data-act="save-all"]');
  await pg.waitForTimeout(150);
  check('the setup prompt is called that', (await pg.textContent('#m-title')) === 'Setup prompt');
  await pg.click('.modal [data-act="close-modal"]');
  await pg.click('.file-tab[data-k="reviewer"]');
  check('the reviewer is a helper, a subagent', /A helper \(a subagent\) that Claude Code asks to check finished work/.test(await pg.textContent('.md-state')));
  // Improve
  await pg.click('#tab-improve');
  check('saved prompts: Your prompts, Add prompt, Open prompt', (await pg.textContent('.own-head h3')) === 'Your prompts' && (await pg.textContent('[data-act="add-prompt"]')) === 'Add prompt' && (await pg.textContent('[data-act="own-prompt"][data-id="q1"]')).trim() === 'Open prompt');
  await pg.click('[data-act="promote"][data-id="l1"]');
  await pg.waitForTimeout(200);
  check('adding a rule names Rules for Claude Code', /^Added to Rules for Claude Code, in CLAUDE\.md\. Claude Code follows it once your project's folder has the new CLAUDE\.md: Project files has the setup prompt\.$/.test(await toastText(pg)), await toastText(pg));
  const habits = await pg.evaluate(() => document.body.innerText);
  check('the habits explain commit and CLAUDE.md', /Ask Claude Code to commit \(save a version\) after each working step/.test(habits) && /It is the notes Claude Code reads first\./.test(habits));
  await pg.click('[data-act="log-session"] >> visible=true');
  await pg.waitForTimeout(150);
  check('the session dialog asks for a Rule for Claude Code', (await pg.textContent('label[for="ss-rule"]')) === 'Rule for Claude Code (optional)');
  await pg.click('.modal [data-act="close-modal"]');
  // What's new closes with Close, and says setup prompt
  await pg.click('[data-act="whats-new"] >> visible=true');
  await pg.waitForTimeout(150);
  const wn = await pg.textContent('.modal');
  check('What\'s new closes with Close and never says Save every file', (await pg.textContent('.modal .modal-actions .btn')) === 'Close' && !/Save every file/.test(wn) && /One setup prompt for every file/.test(wn));
  await pg.click('.modal [data-act="close-modal"]');
  // Import from the list: Cancel; from New project: Back
  await pg.click('[data-act="open-import"] >> visible=true');
  await pg.waitForTimeout(150);
  check('Import opened from the list has Cancel', (await pg.textContent('.modal .modal-actions .left')) === 'Cancel');
  await pg.click('.modal .modal-actions .left');
  await pg.waitForTimeout(100);
  check('...which closes it', !(await pg.$('.modal')));
  await pg.click('[data-act="new-project"] >> visible=true');
  await pg.waitForTimeout(150);
  const toImport = await pg.$('.modal [data-act="np-mode"][data-k="import"]');
  if (toImport) { await toImport.click(); await pg.waitForTimeout(100); }
  check('Import reached from New project keeps Back', !toImport || (await pg.textContent('.modal .modal-actions .left')) === 'Back');
  await pg.click('.modal [data-act="close-modal"]').catch(() => pg.keyboard.press('Escape'));
  // the welcome page explains CLAUDE.md and a session
  check('no page errors', errs.length === 0, errs);
  const { pg: pg2 } = await open(b, 'mocked.html', { ctx, init: `window.__SEED__ = {}; localStorage.setItem('shipyard.seen.v1', '99');`, wait: 800 });
  const w = await pg2.textContent('.welcome');
  check('the welcome page says what CLAUDE.md and a session are', /CLAUDE\.md \(the notes Claude Code reads first\)/.test(w) && /one sitting, often 15 to 45 minutes/.test(w));
  await pg2.click('.welcome [data-act="cc-setup"]');
  await pg2.waitForTimeout(150);
  check('the install line is for Mac or Linux, without WSL', (await pg2.textContent('.cc-for')) === 'Mac or Linux' || (await pg2.$$eval('.cc-for', (xs) => xs.map((x) => x.textContent))).includes('Mac or Linux'));
  await b.close();
  const f = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - f}/${results.length} passed`);
  process.exit(f ? 1 : 0);
})();
