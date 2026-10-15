// Round 74: review 14a, everyday use: projects made without the account are offered to it, not erased; messages name a
// prompt the project has; rules already in CLAUDE.md are not called new; Mark done after a copied prompt keeps the folder
// in step; a browser-only planner says so; old names; dialog focus; where a hand-made milestone goes; dates with years.
const { launch, open, check, results } = require('../r48/lib');
const { openShared } = require('../r76/settle');
const { build, seedOf, initScript } = require('../r47/seed10b');
const ui = (tab, id = 'pMain') => ({ activeId: id, tab, repoFile: 'claudemd', view: 'project' });
const SEEN = "try{localStorage.setItem('shipyard.seen.v1','99')}catch(e){}";
const names = (pg) => pg.evaluate(() => [...window.__mockDocs.values()].map((p) => p.name));
async function makeProject(pg, name, starter = 'web') {
  await pg.click('[data-act="new-project"] >> visible=true');
  await pg.fill('#np-name', name);
  await pg.fill('#np-idea', 'Tracks what is in my pantry.');
  if (starter) await pg.click(`#np-st-${starter}`);
  await pg.click('#modal-root [data-act="create"]');
  await pg.waitForTimeout(700);
}
(async () => {
  const b = build();
  const browser = await launch();
  const allErrs = [];

  // 1. a project made without the account, then the account: offered, added; or removed, with Undo
  for (const choice of ['add', 'drop']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const day1 = await openShared(browser, 'plain.html', { ctx, wait: 800, init: SEEN });
    if (choice === 'add') {
      check('browser only: the welcome says so, with how to keep a copy', /Saved in this browser only\. Shipyard is not connected to a Claude account here, so what you make stays in this browser\. Back up all projects now and then to keep a copy\./.test(await day1.pg.textContent('.welcome')));
    }
    await makeProject(day1.pg, 'Pantry');
    if (choice === 'add') {
      check('browser only: Overview says so once, with Back up', /Saved in this browser only\./.test(await day1.pg.textContent('#keep-note')) && (await day1.pg.locator('#keep-note [data-act="backup"]').count()) === 1);
      await day1.pg.click('#keep-note [data-act="backup"]');
      await day1.pg.waitForTimeout(200);
      check('browser only: Back up says the file is the only other copy', /these projects are kept only in this browser, so this file is your only other copy/.test(await day1.pg.textContent('#modal-root .sub')));
      await day1.pg.click('#modal-root [data-act="close-modal"]');
      await day1.pg.click('[data-act="keep-ok"]');
      await day1.pg.waitForTimeout(200);
      check('...and Got it puts the note away for good', (await day1.pg.locator('#keep-note').count()) === 0);
    }
    allErrs.push(...day1.errs); await day1.pg.close();
    await new Promise((r) => setTimeout(r, 1500)); // a page opened at once can miss what the closed one stored
    const day2 = await openShared(browser, 'mocked.html', { ctx, wait: 2500, init: SEEN });
    const panel = await day2.pg.textContent('.panel.claim').catch(() => '');
    check(`with the account: the project made in this browser is offered, not erased (${choice})`, /A project saved only in this browser/.test(panel) && /"Pantry" was made here while Shipyard was not connected to your Claude account/.test(panel), panel);
    check('...and kept aside in this browser meanwhile', await day2.pg.evaluate(() => Object.values(JSON.parse(localStorage.getItem('shipyard.unclaimed.v1') || '{}')).some((p) => p.name === 'Pantry')));
    if (choice === 'add') {
      await day2.pg.click('[data-act="claim-add"]');
      await day2.pg.waitForTimeout(800);
      check('Add to my projects saves it to the account and opens it', (await names(day2.pg)).includes('Pantry') && (await day2.pg.inputValue('#f-name')) === 'Pantry' && (await day2.pg.locator('.panel.claim').count()) === 0);
      check('...and nothing is left aside', await day2.pg.evaluate(() => localStorage.getItem('shipyard.unclaimed.v1') === null));
      allErrs.push(...day2.errs); await day2.pg.close();
      await new Promise((r) => setTimeout(r, 1500));
      const day3 = await openShared(browser, 'plain.html', { ctx, wait: 1000, init: SEEN });
      check('a later visit without the account shows it, from the copy of the account', (await day3.pg.textContent('#plist')).includes('Pantry') && /Not connected to your Claude account/.test(await day3.pg.textContent('#store-note')));
      allErrs.push(...day3.errs);
    } else {
      await day2.pg.click('[data-act="claim-drop"]');
      await day2.pg.waitForTimeout(400);
      check('Remove from this browser removes it, with Undo', (await day2.pg.locator('.panel.claim').count()) === 0 && /Removed from this browser\./.test(await day2.pg.textContent('#toast')) && !(await names(day2.pg)).includes('Pantry'));
      await day2.pg.click('#toast [data-act="undo"]');
      await day2.pg.waitForTimeout(400);
      check('...and Undo offers it again', (await day2.pg.locator('.panel.claim').count()) === 1 && await day2.pg.evaluate(() => !!localStorage.getItem('shipyard.unclaimed.v1')));
      allErrs.push(...day2.errs);
    }
    await ctx.close();
  }

  // 2. a copy of the account from an earlier version (no mark): only what the account lacks is offered
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const v1 = await openShared(browser, 'mocked.html', { ctx, init: initScript(seedOf(b.after), { seen: 99 }), wait: 2600 });
    await v1.pg.evaluate(() => { localStorage.removeItem('shipyard.mirror.v1'); const d = JSON.parse(localStorage.getItem('shipyard.projects.v1')); d.pGone = { ...d.pMain, name: 'Deleted on another device' }; localStorage.setItem('shipyard.projects.v1', JSON.stringify(d)); });
    allErrs.push(...v1.errs); await v1.pg.close();
    await new Promise((r) => setTimeout(r, 1500));
    const v2 = await openShared(browser, 'mocked.html', { ctx, init: initScript(seedOf(b.after), { seen: 99 }), wait: 2600 });
    const panel = await v2.pg.textContent('.panel.claim').catch(() => '');
    check('an older copy of the account: the account\'s own projects are not offered, only one it lacks', /"Deleted on another device" was made here/.test(panel) && !/Trailhead/.test(panel), panel);
    allErrs.push(...v2.errs); await ctx.close();
  }

  // 3. rules and the folder: messages name a prompt the project has; rules in CLAUDE.md are not new
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
    const { pg, errs } = await open(browser, 'mocked.html', { ctx, init: initScript(seedOf(b.after), { seen: 99, ui: ui('improve') }), wait: 1500 });
    if (await pg.locator('[data-act="toggle-all-lessons"][aria-expanded="false"]').count()) { await pg.click('[data-act="toggle-all-lessons"]'); await pg.waitForTimeout(150); }
    const dep = await pg.evaluate(() => { const ls = [...document.querySelectorAll('.lesson')]; const l = ls.find((x) => x.querySelector('.l-b')?.value === 'Ask before adding a new dependency' && !x.querySelector('[data-act="promote"]')); return !!l && /In CLAUDE\.md/.test(l.textContent); });
    check('a lesson whose rule is already in CLAUDE.md says so, with no Add button', dep);
    const offered = await pg.$$eval('.lesson [data-act="promote"]', (xs) => xs.length);
    await pg.click('#tab-overview');
    await pg.click('#next-prompt');
    await pg.waitForTimeout(300);
    const prompt = await pg.inputValue('#m-prompt');
    const notYet = prompt.split('Rules from earlier sessions, not in CLAUDE.md yet:')[1] || '';
    check('a task prompt does not call rules already in CLAUDE.md new', !/Ask before adding a new dependency|Only change the files the task names/.test(notYet), notYet.slice(0, 200));
    await pg.click('#modal-root [data-act="close-modal"]');
    // no record of what the folder was given: the toast names the setup prompt
    await pg.click('#tab-improve');
    await pg.locator('.lesson:has(.l-b:not(:placeholder-shown)) [data-act="promote"]').first().click();
    await pg.waitForTimeout(300);
    const t1 = await pg.textContent('#toast');
    check('with no record of the folder, adding a rule points to the setup prompt', /Project files has the setup prompt\./.test(t1) && offered > 0, t1);
    await pg.click('#tab-claudemd');
    await pg.waitForTimeout(200);
    check('...and How to use it says the same', /Then paste the setup prompt from this tab into Claude Code\./.test(await pg.textContent('.md-side')));
    // once the folder was given the files, the update prompt
    await pg.click('.save-all [data-act="save-all"]');
    await pg.waitForTimeout(200);
    await pg.click('#modal-root [data-act="copy-export"]');
    await pg.waitForTimeout(300);
    await pg.click('#modal-root [data-act="close-modal"]').catch(() => {});
    await pg.click('#tab-improve');
    await pg.locator('.lesson:has(.l-b:not(:placeholder-shown)) [data-act="promote"]').first().click();
    await pg.waitForTimeout(300);
    const t2 = await pg.textContent('#toast');
    check('once the folder was given the files, adding a rule points to the update prompt, which is there', /Project files has the update prompt\./.test(t2) && await (async () => { await pg.click('#tab-claudemd'); await pg.waitForTimeout(200); return (await pg.locator('[data-act="update-folder"]').count()) === 1; })(), t2);
    allErrs.push(...errs); await ctx.close();
  }

  // 4. a new project: setup prompt, task prompt, Mark started, Mark done: the folder is not behind
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
    const { pg, errs } = await open(browser, 'mocked.html', { ctx, init: SEEN, wait: 1500 });
    await makeProject(pg, 'Pantry');
    await pg.click('#tab-claudemd');
    await pg.click('.save-all [data-act="save-all"]');
    await pg.waitForTimeout(200);
    await pg.click('#modal-root [data-act="copy-export"]');
    await pg.waitForTimeout(300);
    await pg.click('#modal-root [data-act="close-modal"]').catch(() => {});
    await pg.click('#tab-overview');
    await pg.click('#next-prompt');
    await pg.waitForTimeout(300);
    await pg.click('#modal-root [data-act="copy-prompt"]');
    await pg.waitForTimeout(400);
    if (await pg.$('#modal-root .modal')) await pg.click('#modal-root [data-act="close-modal"]');
    const title = await pg.textContent('.next h3');
    if (await pg.locator('.next [data-act="set-task"][data-s="doing"]').count()) await pg.click('.next [data-act="set-task"][data-s="doing"]');
    await pg.waitForTimeout(200);
    await pg.click('.next [data-act="set-task"][data-s="done"]');
    await pg.waitForTimeout(400);
    const behind = await pg.locator('.folder-behind').count();
    check('Mark done after copying the task prompt does not call the folder behind', behind === 0 && (await pg.textContent('.next h3')) !== title, behind ? await pg.textContent('.folder-behind') : '');
    // a milestone added by hand goes before the closing one
    await pg.click('#tab-plan');
    const before = await pg.$$eval('.ms .ms-title, .ms input[id$=".title"]', (xs) => xs.map((x) => x.value));
    await pg.click('[data-act="add-ms"]');
    await pg.waitForTimeout(1200);
    const after = await pg.evaluate(() => { const p = [...window.__mockDocs.values()].find((x) => x.name === 'Pantry'); return p.milestones.map((m) => m.title); });
    check('a milestone added by hand goes before the closing one', after.length === before.length + 1 && after[after.length - 2] === '' && after[after.length - 1] === before[before.length - 1], { before, after });
    allErrs.push(...errs); await ctx.close();
  }

  // 5. words, focus and dates
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const seed = seedOf(b.after);
    seed.pMain.sessions[0].date = '2025-12-30';
    seed.pMain.chat = [{ id: 'c1', q: 'What next?', a: 'The week grid.', at: '2026-10-01T10:00:00Z' }];
    const { pg, errs } = await open(browser, 'mocked.html', { ctx, init: initScript(seed, { seen: 99, ui: ui('overview') }), wait: 1500 });
    check('an answer from Claude says its day', /Claude · Oct 1/.test(await pg.textContent('.chat .a .who')));
    await pg.click('[data-act="copy-week"]');
    await pg.waitForTimeout(300);
    check('the weekly summary opens with focus inside it', await pg.evaluate(() => !!document.activeElement?.closest('#modal-root .modal') && document.activeElement.getClientRects().length > 0));
    await pg.keyboard.press('Escape');
    await pg.click('#tab-improve');
    await pg.click('[data-act="toggle-all-sessions"]').catch(() => {});
    await pg.waitForTimeout(200);
    check('a date in another year says the year', /Dec 30, 2025/.test(await pg.textContent('#sheet')));
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.click('#np-st-like').catch(() => {});
    check('Same setup lists the new names', /Its stack, commands, Rules for Claude Code and your prompts/.test(await pg.textContent('#modal-root')));
    allErrs.push(...errs); await ctx.close();
  }

  check('no page errors', allErrs.length === 0, allErrs);
  await browser.close();
  const fails = results.filter((r) => !r.ok).length;
  console.log(`${results.length - fails}/${results.length} passed`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
