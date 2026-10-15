// Round 75: review 14a-9, a project after months of use. Log a session leaves finished milestones out of its list
// until asked; Improve folds lessons already in CLAUDE.md; PLAN.md sums up each finished milestone in one line, reads it
// back, and the update prompt says how to merge it; a project nearing what one project can hold offers a backup; a
// project put aside for the account is offered on a visit that cannot reach it too.
const { launch, open, check, results } = require('../r48/lib');
const { openShared } = require('../r76/settle');
const { build, seedOf, initScript } = require('../r47/seed10b');
const ui = (tab, id = 'pMain') => ({ activeId: id, tab, repoFile: 'claudemd', view: 'project' });
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') : ''; });
const doc = (pg, id = 'pMain') => pg.evaluate((k) => JSON.parse(JSON.stringify(window.__mockDocs.get(k))), id);
(async () => {
  const b = build();
  const browser = await launch();
  const allErrs = [];
  const main = b.after;
  const finished = main.milestones.filter((m) => m.tasks.length && m.tasks.every((t) => t.status === 'done'));
  const nFinished = finished.reduce((n, m) => n + m.tasks.length, 0);

  // 1. Log a session
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const { pg, errs } = await open(browser, 'mocked.html', { ctx, init: initScript(seedOf(main), { seen: 99, ui: ui('improve') }), wait: 1500 });
    await pg.click('#sessions-h ~ [data-act="log-session"], .panel-head [data-act="log-session"]');
    await pg.waitForTimeout(300);
    const groups = () => pg.$$eval('#ss-task optgroup', (xs) => xs.map((x) => x.label));
    const g0 = await groups();
    check('a long plan: Log a session leaves finished milestones out of the task list', finished.length === 3 && finished.every((m) => !g0.some((l) => l.endsWith(': ' + m.title))) && g0.some((l) => l.startsWith('Milestone 4:')), g0);
    const more = pg.locator('#modal-root [data-act="ss-show-done"]');
    check('...and offers them, with how many', (await more.count()) === 1 && (await more.textContent()) === `Show the ${nFinished} tasks of finished milestones`, await more.textContent().catch(() => ''));
    const open4 = main.milestones[3].tasks.find((t) => t.status !== 'done');
    await pg.selectOption('#ss-task', `${main.milestones[3].id}:${open4.id}`);
    await pg.fill('#ss-summary', 'Typed before showing them.');
    await more.click();
    await pg.waitForTimeout(200);
    const g1 = await groups();
    check('Show them puts them back in the list, in plan order', g1[0].startsWith('Milestone 1:') && g1.length === g0.length + 3, g1);
    check('...keeps the task chosen and what was typed, and focus is on the list', (await pg.inputValue('#ss-task')) === `${main.milestones[3].id}:${open4.id}` && (await pg.inputValue('#ss-summary')) === 'Typed before showing them.' && (await fa(pg)) === 'SELECT#ss-task');
    check('...and the offer is gone', (await more.count()) === 0);
    await pg.click('#modal-root [data-act="close-modal"]');
    await pg.waitForTimeout(200);
    // a session about a task in a finished milestone: its milestone stays in the list
    const t1 = finished[0].tasks[2];
    await pg.click('#tab-plan');
    await pg.click(`[data-act="toggle-ms"][data-id="${finished[0].id}"]`);
    await pg.waitForTimeout(200);
    const run = pg.locator(`.ms [data-act="toggle-run"][data-id="${finished[0].id}"], .ms [data-act="show-run"][data-id="${finished[0].id}"]`);
    if (await run.count()) { await run.first().click(); await pg.waitForTimeout(200); }
    await pg.click(`[data-act="prompt"][data-mid="${finished[0].id}"][data-tid="${t1.id}"]`);
    await pg.waitForTimeout(300);
    await pg.click('#modal-root [data-act="log-session"]');
    await pg.waitForTimeout(300);
    const g2 = await groups();
    check('a session about a task of a finished milestone lists that milestone, chosen', g2.some((l) => l.endsWith(': ' + finished[0].title)) && !g2.some((l) => l.endsWith(': ' + finished[1].title)) && (await pg.inputValue('#ss-task')) === `${finished[0].id}:${t1.id}`, g2);
    check('...and offers the rest', (await pg.textContent('#modal-root [data-act="ss-show-done"]')) === `Show the ${nFinished - finished[0].tasks.length} tasks of finished milestones`);
    await pg.click('#modal-root [data-act="close-modal"]');
    allErrs.push(...errs); await ctx.close();
  }
  {
    // a short plan lists everything
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const { pg, errs } = await open(browser, 'mocked.html', { ctx, init: initScript(seedOf(main), { seen: 99, ui: ui('improve', 'pBudget') }), wait: 1500 });
    await pg.click('.panel-head [data-act="log-session"]');
    await pg.waitForTimeout(300);
    check('a short plan: Log a session lists every task, with nothing to show', (await pg.locator('#modal-root [data-act="ss-show-done"]').count()) === 0 && (await pg.$$eval('#ss-task option', (xs) => xs.length)) >= 10);
    allErrs.push(...errs); await ctx.close();
  }

  // 2. lessons already in CLAUDE.md
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const { pg, errs } = await open(browser, 'mocked.html', { ctx, init: initScript(seedOf(main), { seen: 99, ui: ui('improve') }), wait: 1500 });
    const inMd = await pg.evaluate(() => { const p = window.__mockDocs.get('pMain'); return p.lessons.filter((l) => l.promoted).length; });
    const shown = await pg.locator('.lesson').count();
    const btn = pg.locator('[data-act="toggle-all-lessons"]');
    const label = await btn.textContent();
    const n = Number((/Show the (\d+) lessons already in CLAUDE\.md/.exec(label) || [])[1]);
    check('Improve folds the lessons already in CLAUDE.md, and says how many', n >= inMd && shown === main.lessons.length - n && (await btn.getAttribute('aria-expanded')) === 'false', { label, shown, inMd });
    check('...and none of the lessons left says In CLAUDE.md', (await pg.locator('.lesson .promoted').count()) === 0);
    await btn.click();
    await pg.waitForTimeout(200);
    check('Show them lists every lesson, and the button hides them again', (await pg.locator('.lesson').count()) === main.lessons.length && (await btn.textContent()) === 'Hide the lessons already in CLAUDE.md' && (await btn.getAttribute('aria-expanded')) === 'true' && (await pg.evaluate(() => document.activeElement?.dataset.act)) === 'toggle-all-lessons');
    await btn.click();
    await pg.waitForTimeout(200);
    // adding a rule keeps its lesson in sight
    const target = await pg.evaluate(() => { const l = [...document.querySelectorAll('.lesson')].find((x) => x.querySelector('.l-b').value.trim() && x.querySelector('[data-act="promote"]')); return l?.querySelector('[data-act="promote"]').dataset.id; });
    await pg.click(`[data-act="promote"][data-id="${target}"]`);
    await pg.waitForTimeout(300);
    check('a lesson just added to CLAUDE.md stays in sight, saying so', /In CLAUDE\.md/.test(await pg.textContent(`.lesson:has([data-act="del-lesson"][data-id="${target}"])`)) && (await btn.textContent()) === `Show the ${n} lessons already in CLAUDE.md`);
    // Find reaches a folded lesson
    const hidden = main.lessons.find((l) => l.promoted);
    await pg.keyboard.press('Control+k');
    await pg.waitForTimeout(150);
    await pg.fill('#find-q', hidden.happened.split(' ').slice(0, 5).join(' '));
    await pg.waitForTimeout(300);
    await pg.click('#find-results .find-hit >> nth=0');
    await pg.waitForTimeout(300);
    check('Find opens the folded lessons to the one it found', (await fa(pg)) === `TEXTAREA#f-lessons-${hidden.id}-happened` && (await btn.getAttribute('aria-expanded')) === 'true', await fa(pg));
    allErrs.push(...errs); await ctx.close();
  }

  // 3. PLAN.md
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
    const { pg, errs } = await open(browser, 'mocked.html', { ctx, init: initScript(seedOf(main), { seen: 99, ui: ui('claudemd') }), wait: 1500 });
    await pg.click('[data-act="repo-file"][data-k="plan"]');
    const md = await pg.inputValue('#repo-text');
    const one = finished.every((m, i) => md.includes(`## Milestone ${main.milestones.indexOf(m) + 1}: ${m.title}\n\nFinished: all ${m.tasks.length} tasks are done, so they are not listed. <!-- done:${m.id} -->\n`) && m.tasks.every((t) => !md.includes(`id:${t.id} -->`)));
    const m4 = main.milestones[3];
    check('a long plan: PLAN.md sums up each finished milestone in one line', one, md.slice(0, 1500));
    check('...and lists the others in full, ticks included', m4.tasks.every((t) => md.includes(`id:${t.id} -->`)) && /- \[x\] .*<!-- id:/.test(md.split('## Milestone 4')[1]));
    const before = md.length;
    // the update prompt says how to merge it
    await pg.click('.save-all [data-act="save-all"]');
    await pg.waitForTimeout(200);
    const setup = await pg.inputValue('#modal-root textarea');
    check('the setup prompt says to put the one line in place of the task lines', /A milestone that mine sums up in one "Finished:" line has every task done: put that line in place of its task lines\./.test(setup));
    await pg.click('#modal-root [data-act="copy-export"]');
    await pg.waitForTimeout(300);
    await pg.click('#modal-root [data-act="close-modal"]').catch(() => {});
    // reading it back changes nothing and leaves the folder in step
    await pg.click('#tab-plan');
    await pg.click('[data-act="open-plansync"]');
    await pg.fill('#ps-text', md.replace(`- [ ] ${m4.tasks.find((t) => t.status !== 'done').title}`, `- [x] ${m4.tasks.find((t) => t.status !== 'done').title}`));
    await pg.waitForTimeout(300);
    const note = await pg.textContent('#ps-note');
    check('reading that PLAN.md back finds the one task ticked, and nothing else', /: 1 task marked done\./.test(note) && !/added|new/.test(note), note);
    await pg.click('[data-act="apply-plansync"]');
    await pg.waitForTimeout(800);
    await pg.click('#tab-overview');
    await pg.waitForTimeout(200);
    check('...and the folder is not called behind for the tasks it did not list', (await pg.locator('.folder-behind').count()) === 0, (await pg.locator('.folder-behind').textContent().catch(() => '')));
    allErrs.push(...errs); await ctx.close();
    // a short plan is listed in full
    const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const small = await open(browser, 'mocked.html', { ctx: ctx2, init: initScript(seedOf(main), { seen: 99, ui: ui('claudemd', 'pBudget') }), wait: 1500 });
    await small.pg.click('[data-act="repo-file"][data-k="plan"]');
    const sm = await small.pg.inputValue('#repo-text');
    await small.pg.click('.save-all [data-act="save-all"]');
    await small.pg.waitForTimeout(200);
    check('a short plan: PLAN.md lists every task, and the setup prompt does not mention the one line', !/Finished: /.test(sm) && /- \[x\]/.test(sm) && !/"Finished:"/.test(await small.pg.inputValue('#modal-root textarea')) && before > 0);
    allErrs.push(...small.errs); await ctx2.close();
  }

  // 4. a project nearing what one project can hold
  {
    const big = JSON.parse(JSON.stringify(main));
    const words = 'Added the trip card, wired the save button, checked the list on a phone and fixed the spacing. ';
    for (let i = 0; i < 40; i++) big.sessions.unshift({ id: 'sx' + i, date: `2026-0${1 + (i % 6)}-1${i % 9}`, task: 'Old work ' + i, outcome: 'done', summary: words.repeat(38), wrong: '' });
    const size = Buffer.byteLength(JSON.stringify(big));
    for (const [what, last, shows] of [['no backup yet', null, true], ['a backup 40 days ago', '2026-09-04', true], ['a backup last week', '2026-10-07', false]]) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const init = `${initScript(seedOf(big), { seen: 99, ui: ui('improve') })}; try { ${last ? `localStorage.setItem('shipyard.backup.v1', JSON.stringify('${last}'))` : ''} } catch (e) {}`;
      const { pg, errs } = await open(browser, 'mocked.html', { ctx, init, wait: 1800 });
      const note = await pg.textContent('#size-note').catch(() => '');
      if (shows) check(`a large project, ${what}: Sessions says so and offers a backup`, size > 150000 && size < 250000 && /^This project is getting large\. It takes \d+ KB of the 250 KB one project can hold\. Near that, logging a session shortens the notes of the oldest sessions to make room, so back up now and then to keep a whole copy\.\s+Back up all projects$/.test(note.trim()), { size, note });
      else check(`a large project, ${what}: no note`, !note, note);
      if (what === 'no backup yet') {
        await pg.click('#size-note [data-act="backup"]');
        await pg.waitForTimeout(300);
        await pg.click('#modal-root [data-act="download-backup"]');
        await pg.waitForTimeout(300);
        await pg.click('#modal-root [data-act="close-modal"]');
        await pg.waitForTimeout(300);
        check('...after a backup the note is gone', (await pg.locator('#size-note').count()) === 0);
      }
      allErrs.push(...errs); await ctx.close();
    }
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const { pg, errs } = await open(browser, 'mocked.html', { ctx, init: initScript(seedOf(main), { seen: 99, ui: ui('improve') }), wait: 1500 });
    check('a project of ordinary size has no note', (await pg.locator('#size-note').count()) === 0);
    allErrs.push(...errs); await ctx.close();
  }

  // 5. a project put aside for the account, then a visit that cannot reach the account: it is offered there too
  {
    const SEEN = "try{localStorage.setItem('shipyard.seen.v1','99')}catch(e){}";
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const d1 = await openShared(browser, 'plain.html', { ctx, wait: 800, init: SEEN });
    await d1.pg.click('.welcome [data-act="new-project"]');
    await d1.pg.fill('#np-name', 'Pantry'); await d1.pg.fill('#np-idea', 'Tracks what is in my pantry.');
    await d1.pg.click('#np-st-web'); await d1.pg.click('#modal-root [data-act="create"]');
    await d1.pg.waitForTimeout(800);
    allErrs.push(...d1.errs); await d1.pg.close();
    await new Promise((r) => setTimeout(r, 1500)); // a page opened at once can miss what the closed one stored
    const d2 = await openShared(browser, 'mocked.html', { ctx, wait: 2500, init: SEEN });
    check('with the account, the project is offered', (await d2.pg.locator('.panel.claim').count()) === 1);
    await d2.pg.waitForTimeout(1500);
    allErrs.push(...d2.errs); await d2.pg.close();
    await new Promise((r) => setTimeout(r, 1500)); // a page opened at once can miss what the closed one stored
    const d3 = await openShared(browser, 'plain.html', { ctx, wait: 1000, init: SEEN });
    const panel = await d3.pg.textContent('.panel.claim').catch(() => '');
    check('left unanswered, a visit that cannot reach the account offers it too', /"Pantry" was made here while Shipyard was not connected to your Claude account/.test(panel) && /Not connected to your Claude account/.test(await d3.pg.textContent('#store-note')), panel);
    await d3.pg.click('[data-act="claim-add"]');
    await d3.pg.waitForTimeout(800);
    const st = await d3.pg.evaluate(() => ({ pend: JSON.parse(localStorage.getItem('shipyard.pending.v1') || '{}'), data: JSON.parse(localStorage.getItem('shipyard.projects.v1') || '{}'), aside: localStorage.getItem('shipyard.unclaimed.v1') }));
    const pid = Object.keys(st.data).find((k) => st.data[k].name === 'Pantry');
    check('Add to my projects keeps it in this browser, marked to save to the account as new', !!pid && st.pend[pid] && st.pend[pid].base === null && st.aside === null && (await d3.pg.textContent('#plist')).includes('Pantry'), st.pend);
    await d3.pg.waitForTimeout(600);
    allErrs.push(...d3.errs); await d3.pg.close();
    await new Promise((r) => setTimeout(r, 1500));
    const d4 = await openShared(browser, 'mocked.html', { ctx, wait: 2500, init: SEEN });
    await d4.pg.waitForTimeout(1500);
    check('the next visit with the account saves it there, with nothing left to offer', (await d4.pg.evaluate(() => [...window.__mockDocs.values()].map((p) => p.name))).includes('Pantry') && (await d4.pg.locator('.panel.claim').count()) === 0);
    allErrs.push(...d4.errs); await ctx.close();
  }

  check('no page errors', allErrs.length === 0, allErrs);
  await browser.close();
  const fails = results.filter((r) => !r.ok).length;
  console.log(`${results.length - fails}/${results.length} passed`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
