// Round 26: Look back on a finished milestone
const { launch, open, check, OUT } = require('./lib');
const path = require('path');
const day = (n) => { const t = new Date(); t.setUTCDate(t.getUTCDate() - n); return t.toISOString().slice(0, 10); };
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
const seed = { 'p-a': { kind: 'project', name: 'Recipe Box', pitch: 'Plan meals.', conventions: '- Use plain CSS', createdAt: day(30) + 'T09:00:00Z', updatedAt: day(0) + 'T09:00:00Z',
  milestones: [
    { id: 'm1', title: 'Plan the week', tasks: [{ id: 't1', title: 'Lay out the grid', status: 'done', doneAt: day(9) }, { id: 't2', title: 'Drag a recipe onto a day', status: 'done', doneAt: day(3) }] },
    { id: 'm2', title: 'Shopping list', tasks: [{ id: 't3', title: 'Build the list', status: 'done', doneAt: day(2) }] },
    { id: 'm3', title: 'Share', tasks: [{ id: 't4', title: 'Deploy', status: 'todo' }] },
  ],
  sessions: [
    { id: 'x1', date: day(9), mid: 'm1', tid: 't1', task: 'Lay out the grid', outcome: 'done' },
    { id: 'x2', date: day(6), mid: 'm1', tid: 't2', task: 'Drag a recipe onto a day', outcome: 'stuck', wrong: 'Touch drags scroll the page.' },
    { id: 'x3', date: day(4), mid: 'm1', tid: 't2', task: 'Drag a recipe onto a day', outcome: 'partly', wrong: 'It rewrote the grid while fixing drag.' },
    { id: 'x4', date: day(3), mid: 'm1', tid: 't2', task: 'Drag a recipe onto a day', outcome: 'done' },
  ],
  lessons: [{ id: 'l1', date: day(6), happened: 'Touch drags scroll the page.' }] } };
const doc = (pg) => pg.evaluate(() => window.__mockDocs.get('p-a'));
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(seed)};`, wait: 700 });
    await pg.click('#tab-plan');
    const btns = await pg.$$eval('[data-act="ms-retro"]', (x) => x.map((e) => e.getAttribute('aria-label')));
    check('finished milestones offer Look back, named for screen readers', btns.join('|') === 'Look back on milestone 1|Look back on milestone 2', btns);
    await pg.click('[data-act="ms-retro"][data-id="m1"]');
    const txt = await pg.textContent('.modal');
    check('the recap: when, and how its sessions went', /2 tasks done between \w+ \d+ and \w+ \d+\. 4 sessions: 2 done, 1 partly done, 1 stuck\./.test(txt), txt.slice(0, 300));
    check('what went wrong, with day and task', /What went wrong/.test(txt) && /Drag a recipe onto a day: Touch drags scroll the page\./.test(txt) && /It rewrote the grid while fixing drag\./.test(txt));
    check('Claude is offered for rules, not asked yet', (await pg.$$('[data-act="rt-ai"]')).length === 1 && (await pg.textContent('[data-act="rt-ai"]')) === 'Suggest rules with Claude' && (await pg.$$('.working')).length === 0);
    await pg.click('[data-act="rt-ai"]');
    await pg.waitForTimeout(100);
    check('while Claude reads, a Stop button and no Escape', (await pg.$$('[data-act="stop-rt"]')).length === 1);
    check('it stays open mid-request (Escape stops Claude, round 72)', (await pg.$$('.modal')).length === 1);
    await pg.waitForTimeout(800);
    const rows = await pg.$$eval('[data-act="rt-pick"]', (x) => x.map((e) => e.closest('label').textContent));
    check('two rules, each with why', rows.length === 2 && /Test drag and drop with touch/.test(rows[0]) && /Touch drags scrolled the page/.test(rows[0]), rows);
    check('focus lands on the list heading, and the button says Add 2 rules', (await fa(pg)) === 'H3#rt-h' && (await pg.textContent('[data-act="rt-accept"]')) === 'Add 2 rules', await fa(pg));
    await pg.uncheck('[data-act="rt-pick"] >> nth=1');
    check('the button counts what is ticked', (await pg.textContent('[data-act="rt-accept"]')) === 'Add 1 rule');
    await pg.check('[data-act="rt-pick"] >> nth=1');
    await pg.click('[data-act="rt-accept"]');
    await pg.waitForTimeout(150);
    check('the toast says where they went, with Undo', /Added 2 rules to Rules for Claude Code, with their lessons on Improve\./.test(await pg.textContent('#toast')) && (await pg.$$('#toast [data-act="undo"]')).length === 1, await pg.textContent('#toast'));
    check('focus returns to Look back', (await fa(pg)) === 'BUTTON#f-milestones-m1-retro[ms-retro]', await fa(pg));
    await pg.waitForTimeout(1700);
    let d = await doc(pg);
    check('both rules are in the conventions', d.conventions === '- Use plain CSS\n- Test drag and drop with touch as well as a mouse\n- Ask before rewriting code that works', d.conventions);
    const l1 = d.lessons.find((l) => l.id === 'l1');
    check('the touch lesson now carries its rule', l1.promoted && l1.change === 'Test drag and drop with touch as well as a mouse' && l1.rule === l1.change, l1);
    check('the other rule gets a new lesson, from why', d.lessons.length === 2 && d.lessons[0].happened === 'A one-site fix became a rewrite of the parser.' && d.lessons[0].promoted, d.lessons);
    await pg.click('[data-act="ms-retro"][data-id="m1"]');
    const t2 = await pg.textContent('.modal');
    check('looking back again shows the rule since, and no Claude button', /Rule since: Test drag and drop with touch as well as a mouse/.test(t2) && (await pg.$$('[data-act="rt-ai"]')).length === 1, t2.slice(0, 400));
    await pg.keyboard.press('Escape');
    await pg.click('#toast [data-act="undo"]');
    await pg.waitForTimeout(1700);
    d = await doc(pg);
    check('Undo takes the rules and lessons back out', d.conventions === '- Use plain CSS' && d.lessons.length === 1 && !d.lessons[0].promoted && d.lessons[0].change === '', d.lessons);
    // stop
    await pg.click('[data-act="ms-retro"][data-id="m1"]');
    await pg.click('[data-act="rt-ai"]');
    await pg.waitForTimeout(80);
    await pg.click('[data-act="stop-rt"]');
    await pg.waitForTimeout(200);
    check('Stop says so and offers Try again', /Stopped\./.test(await pg.textContent('.modal')) && (await pg.textContent('[data-act="rt-ai"]')) === 'Try again');
    // none
    await pg.evaluate(() => { window.__RULES_REPLY__ = { rules: [{ rule: '- Use plain CSS', why: 'dup' }] }; });
    await pg.click('[data-act="rt-ai"]');
    await pg.waitForTimeout(800);
    check('a rule CLAUDE.md already has is dropped, and the dialog says none fit', /found no rule/.test(await pg.textContent('.modal')) && (await pg.$$('[data-act="rt-accept"]')).length === 0);
    await pg.keyboard.press('Escape');
    // copy
    await pg.click('[data-act="ms-retro"][data-id="m2"]');
    const t3 = await pg.textContent('.modal');
    check('a milestone without sessions says how to get more from it', /1 task done on \w+ \d+\. No sessions logged\./.test(t3) && /No sessions were logged for it/.test(t3) && (await pg.$$('[data-act="rt-ai"]')).length === 0, t3.slice(0, 300));
    await pg.click('[data-act="rt-copy"]');
    await pg.waitForTimeout(150);
    check('Copy recap copies, or selects the recap', /Recap copied as Markdown\.|The recap is selected/.test(await pg.textContent('#toast')), await pg.textContent('#toast'));
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    // no Claude: point at the Improve tab
    const { pg, errs } = await open(b, 'plain.html', { init: `localStorage.setItem('shipyard.projects.v1', ${JSON.stringify(JSON.stringify(seed))});`, wait: 600 });
    await pg.click('#tab-plan');
    await pg.click('[data-act="ms-retro"][data-id="m1"]');
    check('without Claude, the dialog points at lessons on Improve', /add one from its lesson on the Improve tab/.test(await pg.textContent('.modal')) && (await pg.$$('[data-act="rt-ai"]')).length === 0);
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    // the example, on a phone
    const { pg, errs } = await open(b, 'mocked.html', { wait: 700, viewport: { width: 360, height: 780 } });
    await pg.click('[data-act="example"] >> visible=true');
    await pg.waitForTimeout(300);
    await pg.click('#tab-plan');
    await pg.click('[data-act="ms-retro"] >> nth=0');
    const t = await pg.textContent('.modal');
    check('the example\'s first milestone looks back on a problem with its rule', /3 sessions: 2 done, 1 partly done\./.test(t) && /Rule since: Change only the files the task needs/.test(t) && /Each of these has a rule in CLAUDE\.md now\./.test(t), t.slice(0, 500));
    const fit = await pg.evaluate(() => { const m = document.querySelector('.modal'); const r = m.getBoundingClientRect(); return { l: r.left, r: r.right, w: innerWidth, sw: document.documentElement.scrollWidth, ms: m.scrollWidth, mc: m.clientWidth }; });
    check('it fits a phone', fit.l >= 0 && fit.r <= fit.w && fit.sw <= fit.w && fit.ms <= fit.mc, fit);
    await pg.screenshot({ path: path.join(OUT, 'retro-360.png') });
    await pg.keyboard.press('Escape');
    const row = await pg.evaluate(() => { const r = document.querySelector('.ms-fold'); return { w: r.scrollWidth, c: r.clientWidth }; });
    check('the finished row wraps on a phone', row.w <= row.c, row);
    await pg.locator('.ms-fold >> nth=0').screenshot({ path: path.join(OUT, 'fold-360.png') });
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  await b.close();
})();
