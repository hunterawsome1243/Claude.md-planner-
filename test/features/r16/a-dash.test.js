// Round 16: All projects page.
const { launch, open, check } = require('./lib');
const day = (n) => { const t = new Date(); t.setUTCDate(t.getUTCDate() - n); return t.toISOString().slice(0, 10); };
const noScroll = (pg) => pg.evaluate(() => document.scrollingElement.scrollWidth <= window.innerWidth);
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
const ms = (tasks) => [{ id: 'm1', title: 'Start', goal: '', tasks }];
const seed = {
  'p-a': { kind: 'project', name: 'Alpha', pitch: 'A meal planner for busy weeks.', stage: 'building', createdAt: day(60) + 'T09:00:00Z', updatedAt: day(1) + 'T09:00:00Z',
    milestones: ms([{ id: 't1', title: 'Lay out the week grid', size: 'S', status: 'done', doneAt: day(0) }, { id: 't2', title: 'Drag recipes onto days', size: 'L', status: 'todo' }]),
    sessions: [{ id: 'x1', date: day(0), task: 'Grid', outcome: 'done' }, { id: 'x2', date: day(0), task: 'More', outcome: 'partly' }],
    bugs: [{ id: 'b1', title: 'Crash on save', severity: 'blocker', status: 'open' }, { id: 'b2', title: 'Old', severity: 'minor', status: 'fixed' }] },
  'p-b': { kind: 'project', name: 'Beta', pitch: '', createdAt: day(50) + 'T09:00:00Z', updatedAt: day(5) + 'T09:00:00Z', milestones: [] },
  'p-c': { kind: 'project', name: 'Gamma', pitch: 'Old thing', archived: true, createdAt: day(200) + 'T09:00:00Z', updatedAt: day(100) + 'T09:00:00Z', milestones: ms([{ id: 't1', title: 'x', status: 'done', doneAt: day(0) }]) },
  'p-d': { kind: 'project', name: 'Delta', pitch: 'A CLI for notes.', stage: 'designing', createdAt: day(90) + 'T09:00:00Z', updatedAt: day(0) + 'T08:00:00Z',
    milestones: ms([{ id: 't1', title: 'Parse the flags', size: 'M', status: 'doing' }]), sessions: [{ id: 'x1', date: day(30), task: 'Setup', outcome: 'done' }] },
};
const init = (extra) => `window.__SEED__ = ${JSON.stringify(seed)};` + (extra || '');
(async () => {
  const b = await launch();
  {
    const { pg, errs, ctx } = await open(b, 'mocked.html', { init: init(`Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__copied = t; } }, configurable: true });`), wait: 700 });
    check('the rail offers All projects with a count', norm(await pg.textContent('#rail-all')) === 'All projects3 projects · 1 done this week', norm(await pg.textContent('#rail-all')));
    await pg.click('[data-act="open-all"]');
    await pg.waitForTimeout(150);
    check('it opens the All projects page', norm(await pg.textContent('#dash-h')) === 'All projects' && (await pg.getAttribute('[data-act="open-all"]', 'aria-current')) === 'true' && await pg.locator('#plist [aria-current="true"]').count() === 0);
    const head = norm(await pg.textContent('.dash-head p'));
    check('the summary counts projects, this week and attention', head === '3 projects, plus 1 archived. This week: 1 task done, 2 sessions. 3 need attention.', head);
    const names = await pg.$$eval('.dcard .dc-open', (e) => e.map((x) => x.textContent));
    check('cards: most recently changed first, archived left out', names.join(',') === 'Delta,Alpha,Beta', names);
    const card = (n) => pg.locator('.dcard', { has: pg.locator(`.dc-open:text-is("${n}")`) });
    const facts = async (n) => norm(await card(n).locator('.dc-facts').textContent());
    const fa1 = await facts('Alpha');
    check('Alpha: next task, tasks, this week, last session, bugs', fa1 === 'Next upFix first: Crash on save Blocking bug, then Drag recipes onto days Tasks1 of 2 done This week1 task, 2 sessions Last sessiontoday Open bugs1 (1 blocking)', fa1);
    check('Alpha: what needs attention', norm(await card('Alpha').locator('.dc-flag').textContent()) === 'Needs attention: 1 blocking bug open. Next task is large: split it first.');
    check('Alpha: the progress bar is labelled', (await card('Alpha').locator('.dc-bar').getAttribute('aria-label')) === '1 of 2 tasks done');
    check('Beta: no pitch, no plan, no prompt button', norm(await card('Beta').locator('.dc-flag').textContent()) === 'Needs attention: No pitch yet. No plan yet.' && /Next upNo tasks yet/.test(await facts('Beta')) && await card('Beta').locator('[data-act="dash-prompt"]').count() === 0);
    check('Delta: an idle project is flagged', /No session for 4 weeks/.test(await card('Delta').locator('.dc-flag').textContent()) && /in progress/.test(await facts('Delta')), await facts('Delta'));
    check('cards are list items named by their project; the prompt button names its project', (await card('Alpha').getAttribute('role')) === null && (await card('Alpha').getAttribute('aria-labelledby')) === 'dc-p-a-n' && (await pg.getAttribute('#dc-p-a-p', 'aria-labelledby')) === 'dc-p-a-p dc-p-a-n');
    check('the combined chart counts all live projects', await pg.isVisible('#dash-prog-h') && /\|1\|2$/.test((await pg.$$eval('.dash .chart table tbody tr', (r) => r.map((x) => [...x.children].map((c) => c.textContent).join('|')))).pop()));
    await pg.click('#dc-p-a-p');
    await pg.waitForTimeout(200);
    const copied = await pg.evaluate(() => window.__copied || '');
    check('the card copies the blocking bug\'s fix prompt first (round 22)', /Crash on save/.test(copied) && /Copied|copied/.test(await pg.textContent('#toast')) && await pg.isVisible('#dash-h'), await pg.textContent('#toast'));
    // live change from another device shows up
    await pg.evaluate((s) => window.__mockEmitExternal('p-d', { ...s, name: 'Delta CLI', updatedAt: new Date().toISOString() }), seed['p-d']);
    await pg.waitForTimeout(300);
    check('a change from another device updates the page', (await pg.$$eval('.dcard .dc-open', (e) => e.map((x) => x.textContent))).includes('Delta CLI'));
    // keyboard: open a project from its card
    await pg.focus('#dc-p-a-n');
    await pg.keyboard.press('Enter');
    await pg.waitForTimeout(200);
    check('opening a card shows the project, focus on its tab', (await pg.inputValue('#f-name')) === 'Alpha' && (await fa(pg)) === 'BUTTON#tab-overview[tab]' && (await pg.getAttribute('[data-act="open-all"]', 'aria-current')) === 'false', await fa(pg));
    // the choice is remembered
    await pg.click('[data-act="open-all"]');
    await pg.reload(); await pg.waitForTimeout(700);
    check('reloading keeps the All projects page', await pg.isVisible('#dash-h'));
    await pg.click('#plist [data-act="open"][data-id="p-b"]');
    await pg.reload(); await pg.waitForTimeout(700);
    check('reloading after opening a project shows that project', (await pg.inputValue('#f-name')) === 'Beta');
    check('no page errors', !errs.length, errs);
    await ctx.close();
  }
  {
    // copying blocked: the prompt opens instead
    const { pg, errs, ctx } = await open(b, 'mocked.html', { init: init(`Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('blocked'); } }, configurable: true });`), wait: 700 });
    await pg.click('[data-act="open-all"]');
    await pg.click('#dc-p-a-p');
    await pg.waitForTimeout(300);
    check('when copying is blocked, the prompt opens in its project', await pg.isVisible('.modal #m-prompt') && /Crash on save/.test(await pg.inputValue('#m-prompt')) && (await pg.inputValue('#f-name')) === 'Alpha');
    check('no page errors (blocked copy)', !errs.length, errs);
    await ctx.close();
  }
  for (const w of [360, 390]) {
    const { pg, errs, ctx } = await open(b, 'mocked.html', { init: init(), wait: 700, viewport: { width: w, height: 800 } });
    await pg.click('[data-act="open-drawer"]');
    await pg.waitForTimeout(100);
    await pg.click('[data-act="open-all"]');
    await pg.waitForTimeout(200);
    check(w + 'px: the drawer closes onto the page, focus on Projects', await pg.isVisible('#dash-h') && (await fa(pg)) === 'BUTTON[open-drawer]', await fa(pg));
    check(w + 'px: no sideways scroll', await noScroll(pg));
    const fit = await pg.evaluate(() => [...document.querySelectorAll('.dcard')].every((c) => { const r = c.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth; }));
    check(w + 'px: cards fit the screen', fit);
    await pg.screenshot({ path: __dirname + `/dash-${w}.png`, fullPage: true });
    check(w + 'px: no page errors', !errs.length, errs);
    await ctx.close();
  }
  {
    const { pg, errs, ctx } = await open(b, 'plain.html');
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Only');
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(300);
    check('one project: no All projects entry', await pg.locator('[data-act="open-all"]').count() === 0);
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Second');
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(300);
    check('two projects: the entry appears (browser storage too)', await pg.locator('[data-act="open-all"]').count() === 1);
    await pg.click('[data-act="open-all"]');
    await pg.waitForTimeout(150);
    check('a new project leaves the All projects page', await pg.isVisible('#dash-h'));
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Third');
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(300);
    check('creating opens the new project', (await pg.inputValue('#f-name')) === 'Third' && await pg.locator('#dash-h').count() === 0);
    await pg.screenshot({ path: __dirname + '/dash-desk.png' });
    check('no page errors (plain)', !errs.length, errs);
    await ctx.close();
  }
  {
    const { pg, ctx } = await open(b, 'mocked.html', { init: init(), wait: 700, viewport: { width: 1280, height: 900 } });
    await pg.emulateMedia({ colorScheme: 'dark' });
    await pg.click('[data-act="open-all"]');
    await pg.waitForTimeout(150);
    await pg.screenshot({ path: __dirname + '/dash-dark.png', fullPage: true });
    await ctx.close();
  }
  await b.close();
})();
