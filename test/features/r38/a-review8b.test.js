// Round 38: review 8b part 2 in the browser
const { launch, open, check } = require('./lib');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const seedOf = (o, extra = '') => `window.__SEED__ = ${JSON.stringify(o)};${extra}`;
const doc = (pg, id = 'p-a') => pg.evaluate((k) => window.__mockDocs.get(k), id);
const stuck = { kind: 'project', name: 'ShiftSwap', pitch: 'Swap shifts.', commands: 'npm test',
  bugs: [{ id: 'b1', title: 'Swaps page crashes', severity: 'blocker' }],
  milestones: [{ id: 'm1', title: 'Approvals', tasks: [{ id: 't1', title: 'Add the approval endpoint', size: 'S', status: 'done', doneAt: '2026-10-01' }, { id: 't2', title: 'Add a manager approval page', size: 'M' }] }],
  sessions: [{ id: 's1', date: '2026-10-13', bid: 'b1', task: 'Fix: Swaps page crashes', outcome: 'stuck', summary: 'Looked at the list query.', wrong: 'The stack trace pointed at the wrong file' }] };
const other = { kind: 'project', name: 'Plant Pal', pitch: 'Water plants on time.', milestones: [{ id: 'm1', title: 'Basics', tasks: [{ id: 'u1', title: 'List plants', size: 'S' }] }] };
(async () => {
  const b = await launch();
  // a blocker's stuck last session, on Overview and All projects
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf({ 'p-a': stuck, 'p-b': other }), wait: 700 });
    await pg.click('#rail [data-act="open"] >> text=ShiftSwap');
    await pg.waitForTimeout(200);
    const last = norm(await pg.textContent('.next .last-try'));
    check('Next up shows how the last try on the blocker went', /^Last session, .*: stuck\. The stack trace pointed at the wrong file The fix prompt includes it\.$/.test(last), last);
    await pg.click('[data-act="open-all"]');
    await pg.waitForTimeout(200);
    const flag = norm(await pg.locator('.dcard', { hasText: 'ShiftSwap' }).locator('.dc-flag').textContent());
    check('All projects flags it', flag === 'Needs attention: 1 blocking bug open. Stuck in the last session on the blocking bug.', flag);
    // PLAN.md carries the day a task was done, and a dated tick keeps its day
    await pg.click('[data-act="open"][data-id="p-a"] >> visible=true').catch(() => pg.click('#rail [data-act="open"] >> text=ShiftSwap'));
    await pg.waitForTimeout(200);
    await pg.click('#tab-claudemd');
    await pg.click('[data-act="repo-file"][data-k="plan"]');
    const md = await pg.inputValue('#repo-text');
    check('PLAN.md shows the day a task was done', /- \[x\] Add the approval endpoint \(S, done 2026-10-01\) <!-- id:t1 -->/.test(md) && /becomes "\(S, done YYYY-MM-DD\)"/.test(md));
    await pg.click('#tab-plan');
    await pg.click('[data-act="open-plansync"]');
    await pg.fill('#ps-text', md.replace('- [ ] Add a manager approval page (M) <!-- id:t2 -->', '- [x] Add a manager approval page (M, done 2026-10-09) <!-- id:t2 -->'));
    await pg.waitForTimeout(300);
    check('the tick is read', /1 task marked done/.test(await pg.textContent('#ps-note')));
    await pg.click('[data-act="apply-plansync"]');
    await pg.waitForTimeout(1700);
    const d = await doc(pg);
    check('and saved on the day Claude Code ticked it', d.milestones[0].tasks[1].status === 'done' && d.milestones[0].tasks[1].doneAt === '2026-10-09', d.milestones[0].tasks[1]);
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  // a project from its code: the review steps wait for the owner
  {
    const fc = { kind: 'project', name: 'ShiftSwap', pitch: 'Swap shifts.', audience: 'Shift workers', fromCode: true, copied: { claudemd: true, plan: true },
      features: [{ id: 'f1', title: 'Shift swaps', priority: 'must', status: 'done' }],
      milestones: [{ id: 'm1', title: 'Next steps', tasks: [{ id: 't1', title: 'Add a manager approval page', size: 'M', feat: 'f1' }] }] };
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf({ 'p-a': fc }), wait: 700 });
    const cur = () => pg.textContent('.guide [aria-current="step"] b');
    check('the brief is the step, with Skip for now', (await cur()) === 'Fill in the brief' && !!(await pg.$('.guide [aria-current="step"] [data-act="guide-ok"][data-k="brief"]')), await cur());
    await pg.click('.guide [data-act="guide-ok"][data-k="brief"]');
    await pg.waitForTimeout(150);
    check('skipping it moves on to the features Claude found', (await cur()) === 'Check the features Claude found' && /Choose They look right once you have been through them\./.test(await pg.textContent('.guide [aria-current="step"]')), await cur());
    check('focus stays in the guide', /BUTTON|H2#guide-h/.test(await fa(pg)), await fa(pg));
    await pg.click('.guide [data-act="guide-ok"][data-k="features"]');
    await pg.waitForTimeout(1700);
    check('They look right ticks it', (await cur()) !== 'Check the features Claude found', await cur());
    const d = await doc(pg);
    check('both are saved', d.checked && d.checked.brief === true && d.checked.features === true, d.checked);
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    // editing a feature counts as checking it
    const fc = { kind: 'project', name: 'ShiftSwap', pitch: 'Swap shifts.', audience: 'a', problem: 'b', doneWhen: 'c', fromCode: true, copied: { claudemd: true, plan: true },
      features: [{ id: 'f1', title: 'Shift swaps', priority: 'must', status: 'done' }] };
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf({ 'p-a': fc }), wait: 700 });
    check('the features step waits', (await pg.textContent('.guide [aria-current="step"] b')) === 'Check the features Claude found');
    await pg.click('#tab-design');
    await pg.locator('[data-path="features.f1.title"]').first().fill('Shift swaps between workers');
    await pg.click('#tab-overview');
    check('after editing one on Design it is ticked', (await pg.textContent('.guide [aria-current="step"] b')) !== 'Check the features Claude found', await pg.textContent('.guide [aria-current="step"] b'));
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  // What's new marks what is new and folds the rest
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf({ 'p-a': other }, "localStorage.setItem('shipyard.seen.v1', '8');"), wait: 700 });
    await pg.click('#rail [data-act="whats-new"]');
    const fresh = await pg.$$eval('.modal > .wn-list > li h3', (x) => x.map((e) => e.textContent));
    check('what came after the last visit is marked New', fresh.length >= 1 && fresh.every((t) => / New$/.test(t)) && fresh.some((t) => /^Ready for auto mode/.test(t)), fresh);
    check('the sub says how many', new RegExp(`^${fresh.length === 1 ? 'One change' : fresh.length + ' changes'} since you last looked`).test(await pg.textContent('.modal .sub')));
    check('the rest are folded', !(await pg.isVisible('.wn-older .wn-list')) && /^Earlier changes \(\d+\)$/.test(await pg.textContent('.wn-older summary')));
    await pg.click('.wn-older summary');
    check('and open with a click', await pg.isVisible('.wn-older .wn-list') && (await pg.$$('.wn-older .wn-new')).length === 0);
    await pg.keyboard.press('Escape');
    await pg.click('#rail [data-act="whats-new"]');
    check('opened again in the same visit, the marks stay', (await pg.$$('.modal > .wn-list .wn-new')).length === fresh.length);
    await pg.keyboard.press('Escape');
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf({ 'p-a': other }, "localStorage.setItem('shipyard.seen.v1', '99');"), wait: 700 });
    await pg.click('#rail [data-act="whats-new"]');
    check('with everything seen, nothing is marked or folded', !(await pg.$('.wn-new')) && !(await pg.$('.wn-older')) && (await pg.$$('.wn-list li')).length >= 16 && /^Recent changes to Shipyard/.test(await pg.textContent('.modal .sub')));
    await pg.keyboard.press('Escape');
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  // on a phone, a toast clears the dialog's buttons
  for (const scheme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 375, height: 700 }, colorScheme: scheme, permissions: ['clipboard-read', 'clipboard-write'] });
    const { pg, errs } = await open(b, 'mocked.html', { ctx, init: seedOf({ 'p-a': stuck }), wait: 700 });
    await pg.click('.next [data-act="bug-prompt"]');
    await pg.click('[data-act="copy-prompt"]');
    await pg.waitForTimeout(200);
    const pos = await pg.evaluate(() => { const t = document.querySelector('#toast').getBoundingClientRect(); const a = document.querySelector('.modal-actions').getBoundingClientRect(); return { tt: t.top, tb: t.bottom, at: a.top, ab: a.bottom, h: innerHeight }; });
    check(`${scheme} 375px: the toast sits at the top, clear of the buttons`, pos.tt < 80 && (pos.tb <= pos.at || pos.tt >= pos.ab), pos);
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(100);
    await pg.click('[data-act="toggle-bug"] >> visible=true');
    await pg.waitForTimeout(150);
    const low = await pg.evaluate(() => { const t = document.querySelector('#toast').getBoundingClientRect(); return { b: t.bottom, h: innerHeight }; });
    check(`${scheme} 375px: with no dialog, it is back at the bottom`, low.b > low.h - 80, low);
    check('no page errors', errs.length === 0, errs);
    await ctx.close();
  }
  await b.close();
})();
