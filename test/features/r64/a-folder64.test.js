// Round 64: the project's folder stays in step. Shipyard remembers what it gave the folder, says when the folder is
// behind and what changed, offers an update prompt with just those files, has a task prompt add a missing PLAN.md line
// or swap in the parts of a split task, asks which parts of a ticked split task are done, and opens a PLAN.md file.
const { launch, open, check, results } = require('../r48/lib');
const proj = {
  kind: 'project', name: 'Pocket Ledger', pitch: 'Reads a bank CSV and prints spending per category.', stage: 'building', starter: 'cli', commands: 'uv run pytest', guideHidden: true,
  milestones: [{ id: 'm1', title: 'Read the CSV', goal: '', tasks: [
    { id: 't1', title: 'Parse the bank CSV', size: 'S', status: 'todo' },
    { id: 't2', title: 'Total spending by month and category', size: 'L', status: 'todo', notes: 'Group by month and category.' },
    { id: 't3', title: 'Print a report', size: 'M', status: 'todo' }] }],
  lessons: [{ id: 'l1', date: '2026-10-10', happened: 'It used float for money', change: 'Use Decimal for money, never float' }],
};
const init = `window.__SEED__ = ${JSON.stringify({ 'p-f': proj })}; if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('shipyard.seen.v1', '99'); localStorage.setItem('shipyard.ui.v1', JSON.stringify({ activeId: 'p-f', tab: 'claudemd', repoFile: 'plan', view: 'project' })); }`;
const doc = (pg) => pg.evaluate(() => window.__mockDocs.get('p-f'));
const clip = (pg) => pg.evaluate(() => navigator.clipboard.readText());
const toastText = (pg) => pg.evaluate(() => document.querySelector('#toast span')?.textContent || '');
const behind = (pg) => pg.evaluate(() => document.querySelector('.folder-behind')?.textContent.trim() || '');
const flags = (pg) => pg.$$eval('.file-tab', (xs) => xs.filter((x) => x.querySelector('.ft-flag')).map((x) => x.dataset.k));
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const { pg, errs } = await open(b, 'mocked.html', { ctx, init, wait: 1000 });
  // before anything was given to the folder: nothing to say, and the hint says how a change gets there
  check('before the folder got anything, no file is flagged', (await flags(pg)).length === 0 && /give it to Claude Code, so your project's folder has the new version/.test(await pg.textContent('.md-state')), await pg.textContent('.md-state'));
  const oldPlan = await pg.inputValue('#repo-text');
  await pg.click('.md-side [data-act="save-all"]');
  await pg.click('.modal [data-act="copy-export"]');
  await pg.waitForTimeout(300);
  check('copying the setup prompt says where to paste it', (await toastText(pg)) === "Setup prompt copied. Paste it into Claude Code, started in your project's folder.", await toastText(pg));
  await pg.click('.modal [data-act="close-modal"]');
  await pg.waitForTimeout(1700);
  let d = await doc(pg);
  check('...and Shipyard remembers what the folder has', d.folder.setup === true && d.folder.plan && Object.keys(d.folder.plan.tasks).join() === 't1,t2,t3' && !!d.folder.files.claudemd && !!d.folder.files.next && !('plan' in d.folder.files), d.folder);
  check('Repo files says the folder has this version', (await flags(pg)).length === 0 && /Your project's folder has this version/.test(await pg.textContent('.md-state')));
  await pg.click('#tab-overview');
  check('Overview says nothing about the folder while it is up to date', (await behind(pg)) === '');
  // a task added here: the folder is behind
  await pg.click('#tab-plan');
  await pg.click('[data-act="add-task"][data-mid="m1"]');
  await pg.keyboard.type('Read the real export format');
  await pg.waitForTimeout(200);
  await pg.click('#tab-overview');
  check('a task added here: Overview says the folder is behind, and why it matters', /^Your project's folder is behind\. Its PLAN\.md lacks 1 task added here\. \/next works from that file\. Get the update prompt$/.test(await behind(pg)), await behind(pg));
  await pg.click('#tab-claudemd');
  check('...and Repo files flags PLAN.md', (await flags(pg)).join() === 'plan' && /behind: its PLAN\.md lacks 1 task added here\./.test(await pg.textContent('.md-state')), [await flags(pg), await pg.textContent('.md-state')]);
  await pg.waitForTimeout(1700);
  d = await doc(pg);
  const nt = d.milestones[0].tasks.find((t) => t.title === 'Read the real export format');
  // its prompt adds its line first
  await pg.click('#tab-plan');
  await pg.click(`[data-act="prompt"][data-tid="${nt.id}"]`);
  await pg.waitForTimeout(200);
  let prompt = await pg.inputValue('#m-prompt');
  check('the new task\'s prompt has Claude Code add its line to PLAN.md first', prompt.includes(`first make sure it has a line ending in "<!-- id:${nt.id} -->". If not, add this line at the end of the "## Milestone 1: Read the CSV" section:\n   - [ ] Read the real export format (M) <!-- id:${nt.id} -->\n   Then tick this task there once it works`), prompt.split('\n').filter((l) => /^4\.|^   /.test(l)).join('\n'));
  await pg.click('.modal [data-act="close-modal"]');
  await pg.click('[data-act="prompt"][data-tid="t1"]');
  await pg.waitForTimeout(200);
  prompt = await pg.inputValue('#m-prompt');
  check('a task the folder has gets the usual step', /^4\. If this folder has PLAN\.md, tick this task there once it works: on its line/m.test(prompt) && !prompt.includes('make sure it has a line'));
  await pg.click('.modal [data-act="close-modal"]');
  // split a task the folder has
  await pg.click('[data-act="split-task"][data-tid="t2"]');
  await pg.waitForTimeout(450);
  await pg.click('[data-act="split-manual"]');
  await pg.fill('#sp-text', 'Group transactions by month (S)\nLeave income out of the totals (S)');
  await pg.click('[data-act="split-accept"]');
  await pg.waitForTimeout(200);
  check('after a split, the toast says the folder still has the old task', /^Split into 2 tasks\. The PLAN\.md in your project's folder still has the old task: each part's prompt tells Claude Code to swap the parts in\.$/.test(await toastText(pg)), await toastText(pg));
  await pg.waitForTimeout(1700);
  d = await doc(pg);
  const parts = d.milestones[0].tasks.filter((t) => t.splitFrom === 't2');
  await pg.click(`[data-act="prompt"][data-tid="${parts[1].id}"]`);
  await pg.waitForTimeout(200);
  prompt = await pg.inputValue('#m-prompt');
  check('a part\'s prompt has Claude Code swap the parts in for the old line', prompt.includes(`it may still have the larger task this one was split from, on the line ending in "<!-- id:t2 -->". If so, replace that line with these lines, keeping any lines indented under it:\n   - [ ] Group transactions by month (S) <!-- id:${parts[0].id} -->\n   - [ ] Leave income out of the totals (S) <!-- id:${parts[1].id} -->\n   Then tick`), prompt.split('\n').filter((l) => /^4\.|^   /.test(l)).join('\n'));
  await pg.click('.modal [data-act="close-modal"]');
  await pg.click('#tab-overview');
  check('Overview counts the split', /Its PLAN\.md lacks 3 tasks added here and still lists 1 task you split or deleted here\./.test(await behind(pg)), await behind(pg));
  // a rule: CLAUDE.md changed too, and the toast says how it reaches Claude Code
  await pg.click('#tab-improve');
  await pg.click('[data-act="promote"][data-id="l1"]');
  await pg.waitForTimeout(200);
  check('adding a rule says how it reaches Claude Code', (await toastText(pg)) === "Added to Rules for Claude Code, in CLAUDE.md. Claude Code follows it once your project's folder has the new CLAUDE.md: Project files has the update prompt.", await toastText(pg));
  await pg.click('#tab-overview');
  check('Overview names CLAUDE.md too', /CLAUDE\.md changed here since you last gave it to Claude Code\./.test(await behind(pg)), await behind(pg));
  // the update prompt: just those files, and afterwards nothing is behind
  await pg.click('.folder-behind [data-act="update-folder"]');
  await pg.waitForTimeout(150);
  const up = await pg.inputValue('#m-export');
  check('the update prompt has only PLAN.md and CLAUDE.md', /^Update these 2 files in this project's folder/.test(up) && up.includes('File: PLAN.md') && up.includes('File: CLAUDE.md') && !up.includes('File: .claude/commands/next.md') && (await pg.textContent('#m-title')) === "Update your project's folder", up.slice(0, 120));
  check('...and its PLAN.md has the parts, not the old task', up.includes(`<!-- id:${parts[0].id} -->`) && !up.includes('<!-- id:t2 -->'));
  await pg.click('.modal [data-act="copy-export"]');
  await pg.waitForTimeout(200);
  check('copying it says where to paste it', (await toastText(pg)) === "Update prompt copied. Paste it into Claude Code, started in your project's folder.", await toastText(pg));
  await pg.click('.modal [data-act="close-modal"]');
  await pg.waitForTimeout(100);
  check('...and the folder is up to date again', (await behind(pg)) === '');
  // marking a task done by hand: the folder's PLAN.md does not have the tick
  await pg.click('#tab-plan');
  await pg.click('[data-act="cycle-task"][data-tid="t3"]');
  await pg.click('[data-act="cycle-task"][data-tid="t3"]');
  await pg.click('#tab-overview');
  check('a task marked done by hand counts', /Its PLAN\.md has 1 task finished here still unticked\./.test(await behind(pg)), await behind(pg));
  // Update from PLAN.md with the old file, the split task ticked: which parts are done?
  const ticked = oldPlan.replace(/- \[ \] Total spending by month and category \(L\)/, '- [x] Total spending by month and category (L, done 2026-10-14)').replace(/- \[ \] Print a report \(M\)/, '- [x] Print a report (M, done 2026-10-14)');
  await pg.click('#tab-plan');
  await pg.click('[data-act="open-plansync"] >> visible=true');
  await pg.fill('#ps-text', ticked);
  await pg.waitForTimeout(150);
  const picks = await pg.$$eval('.ps-part', (xs) => xs.map((x) => `${x.nextElementSibling.textContent}:${x.checked}`));
  check('a ticked task that was split here asks which parts are done, the first ticked', picks.join('|') === 'Group transactions by month:true|Leave income out of the totals:false' && /is ticked there, but you split it here into 2 smaller tasks: tick the ones that are done below/.test(await pg.textContent('#ps-note')), [picks, await pg.textContent('#ps-note')]);
  check('...and the note counts just that one', /This will update the plan: 1 task marked done\. Done: "Group transactions by month"/.test(await pg.textContent('#ps-note')), await pg.textContent('#ps-note'));
  await pg.check('.ps-part >> nth=1');
  check('ticking the second counts it', /2 tasks marked done/.test(await pg.textContent('#ps-note')), await pg.textContent('#ps-note'));
  await pg.uncheck('.ps-part >> nth=1');
  await pg.click('[data-act="apply-plansync"]');
  await pg.waitForTimeout(1700);
  d = await doc(pg);
  const st = Object.fromEntries(d.milestones[0].tasks.map((t) => [t.title, t.status]));
  check('only the part picked is marked done', st['Group transactions by month'] === 'done' && st['Leave income out of the totals'] === 'todo', st);
  check('the folder record now follows the file: the old task is there ticked, the parts and the new task are not', d.folder.plan.tasks.t2 === 1 && d.folder.plan.tasks.t3 === 1 && !(parts[0].id in d.folder.plan.tasks) && !(nt.id in d.folder.plan.tasks), d.folder.plan.tasks);
  await pg.click('#tab-overview');
  check('...so Overview says the parts and the new task are missing there', /Its PLAN\.md lacks 3 tasks added here\. \/next/.test(await behind(pg)), await behind(pg));
  // a PLAN.md opened from a file
  await pg.click('#tab-plan');
  await pg.click('[data-act="open-plansync"] >> visible=true');
  await pg.setInputFiles('#ps-file', { name: 'PLAN.md', mimeType: 'text/markdown', buffer: Buffer.from(ticked) });
  await pg.waitForTimeout(300);
  check('Open a file… fills in the PLAN.md', (await pg.inputValue('#ps-text')) === ticked, await pg.textContent('#ps-note'));
  check('...and with a part already done, the same file marks no more parts done unless asked', /^Already up to date/.test(await pg.textContent('#ps-note')) && (await pg.$$eval('.ps-part', (xs) => xs.map((x) => x.checked).join())) === 'false', await pg.textContent('#ps-note'));
  check('...with a hint on getting it from Claude Code', /ask it to show PLAN\.md, type \/copy and paste it here/.test(await pg.textContent('.modal')));
  await pg.click('.modal [data-act="close-modal"]');
  check('no page errors', errs.length === 0, errs);
  await b.close();
  const f = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - f}/${results.length} passed`);
  process.exit(f ? 1 : 0);
})();
