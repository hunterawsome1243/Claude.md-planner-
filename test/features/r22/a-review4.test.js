// Round 22: review 4 fixes in the browser
const { launch, open, check } = require('./lib');
const day = (n) => { const t = new Date(); t.setUTCDate(t.getUTCDate() - n); return t.toISOString().slice(0, 10); };
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
const clip = `Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__copied = t; } }, configurable: true });`;
const seed = {
  'p-a': { kind: 'project', name: 'Alpha', pitch: 'A planner.', createdAt: day(60) + 'T09:00:00Z', updatedAt: day(1) + 'T09:00:00Z',
    milestones: [{ id: 'm1', title: 'Start', tasks: [{ id: 't1', title: 'Grid', size: 'S', status: 'done', doneAt: day(3) }, { id: 't2', title: 'Drag recipes', size: 'M', status: 'todo' }] }],
    bugs: [{ id: 'b1', title: 'Crash on save', severity: 'blocker', status: 'open', actual: 'It crashes' }] },
  'p-b': { kind: 'project', name: 'Beta', pitch: 'A CLI.', createdAt: day(50) + 'T09:00:00Z', updatedAt: day(2) + 'T09:00:00Z',
    milestones: [{ id: 'm1', title: 'Start', tasks: [{ id: 'u1', title: 'Rewrite the parser', size: 'L', status: 'todo' }] }] },
  'p-c': { kind: 'project', name: 'Gamma', pitch: 'Empty.', targetDate: day(-30), createdAt: day(40) + 'T09:00:00Z', updatedAt: day(3) + 'T09:00:00Z', milestones: [] },
};
(async () => {
  const b = await launch();
  // M2, M3: All projects
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(seed)};` + clip, wait: 700 });
    await pg.click('[data-act="open-all"]');
    await pg.waitForTimeout(150);
    const card = (n) => pg.locator('.dcard', { has: pg.locator(`.dc-open:text-is("${n}")`) });
    check('M2 a blocking bug comes first on its card', /Next upFix first: Crash on save Blocking bug, then Drag recipes/.test(norm(await card('Alpha').locator('.dc-facts').textContent())), norm(await card('Alpha').locator('.dc-facts').textContent()));
    await card('Alpha').locator('[data-act="dash-prompt"]').click();
    await pg.waitForTimeout(150);
    check('M2 the button copies the fix prompt', (await card('Alpha').locator('[data-act="dash-prompt"]').textContent()) === 'Copy fix prompt' && /Crash on save/.test(await pg.evaluate(() => window.__copied || '')) && /^Fix prompt for "Crash on save" copied/.test(await pg.textContent('#toast')));
    check('M2 a large next task offers Split', (await card('Beta').locator('#dc-p-b-p').textContent()) === 'Split the next task');
    check('M3 a target with no tasks is not "all done"', !/all done/.test(await card('Gamma').locator('.dc-facts').textContent()) && /No plan yet/.test(await card('Gamma').locator('.dc-flag').textContent()));
    await card('Beta').locator('#dc-p-b-p').click();
    await pg.waitForTimeout(250);
    check('M2 Split opens the project and its Split dialog', (await pg.inputValue('#f-name')) === 'Beta' && /Split/i.test(await pg.textContent('#m-title')), await pg.textContent('#m-title').catch(() => null));
    await pg.keyboard.press('Escape');
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  // M4, L8 fold text
  {
    const s = { 'p-m': { kind: 'project', name: 'Mover', pitch: 'x', createdAt: day(30) + 'T09:00:00Z', updatedAt: day(0) + 'T09:00:00Z', milestones: [
      { id: 'm1', title: 'One', tasks: [{ id: 'a1', title: 'Open task', status: 'todo' }, { id: 'a2', title: 'Done here', status: 'done', doneAt: day(1) }] },
      { id: 'm2', title: 'Two', tasks: [{ id: 'b1', title: 'Finished', status: 'done', doneAt: day(2) }] }] } };
    const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(s)};`, wait: 700 });
    await pg.click('#tab-plan');
    check('L8 one task: "Its one task is done."', /Its one task is done\./.test(await pg.textContent('.ms >> nth=1')));
    await pg.focus('#f-milestones-m1-tasks-a2-title');
    await pg.keyboard.press('Alt+ArrowDown');
    await pg.waitForTimeout(200);
    check('M4 a done task moved into a finished milestone stays in view with focus', await pg.locator('#f-milestones-m2-tasks-a2-title').count() === 1 && (await fa(pg)) === 'TEXTAREA#f-milestones-m2-tasks-a2-title', await fa(pg));
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  // L1, L2, L4, L7, L8 link, on a fresh project
  {
    const { pg, errs } = await open(b, 'mocked.html');
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Dates');
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(200);
    await pg.fill('#f-targetDate', day(0));
    await pg.waitForTimeout(150);
    const prog = () => pg.textContent('.progress .panel-head p').catch(() => null);
    check('L1 + L2 Progress follows the date as it is set, and says today', /Your target is .+, today\./.test(await prog() || ''), await prog());
    check('L1 the date field keeps focus', (await fa(pg)) === 'INPUT#f-targetDate');
    await pg.fill('#f-targetDate', day(-1));
    await pg.waitForTimeout(150);
    check('L2 tomorrow', /, tomorrow\./.test(await prog() || ''), await prog());
    await pg.fill('#f-targetDate', '');
    await pg.waitForTimeout(150);
    check('L1 clearing it takes the panel away', (await pg.$$('.progress')).length === 0);
    await pg.click('[data-act="hide-guide"]');
    await pg.waitForTimeout(100);
    check('L4 the hidden guide can come back', (await pg.textContent('[data-act="show-guide"]')) === 'Show the getting started guide' && /Show it again/.test(await pg.textContent('#toast')));
    await pg.click('[data-act="show-guide"]');
    await pg.waitForTimeout(100);
    check('L4 Show brings it back with focus on its heading', (await pg.$$('.guide')).length === 1 && (await fa(pg)) === 'H2#guide-h' && (await pg.$$('[data-act="show-guide"]')).length === 0);
    await pg.click('#tab-improve');
    await pg.click('[data-act="add-prompt"]');
    await pg.waitForTimeout(100);
    const id = await pg.evaluate(() => document.activeElement.id);
    await pg.keyboard.type('Review');
    await pg.fill(`#${id.replace(/-title$/, '-text')}`, 'Look it over');
    await pg.waitForTimeout(100);
    check('L8 + M5 the /command link shows as the prompt is named, clear of built-in names', (await pg.textContent('.own-prompt .cmd-link').catch(() => null)) === '/review-prompt', await pg.textContent('.own-prompt .cmd-link').catch(() => null));
    check('L8 typing kept its place', (await fa(pg)).startsWith('TEXTAREA#f-prompts-'), await fa(pg));
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  // L7: session bars, light and dark
  for (const scheme of ['light', 'dark']) {
    const s = { 'p-s': { kind: 'project', name: 'Bars', pitch: 'x', createdAt: day(30) + 'T09:00:00Z', updatedAt: day(0) + 'T09:00:00Z', milestones: [{ id: 'm1', title: 'A', tasks: [{ id: 't1', title: 'x', status: 'done', doneAt: day(0) }] }], sessions: [{ id: 'x1', date: day(0) }, { id: 'x2', date: day(0) }, { id: 'x3', date: day(0) }] } };
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 }, colorScheme: scheme });
    const { pg, errs } = await open(b, 'mocked.html', { ctx, init: `window.__SEED__ = ${JSON.stringify(s)};`, wait: 700 });
    const r = await pg.evaluate(() => {
      const lum = (c) => { const [r, g, b] = c.match(/\d+/g).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const fill = getComputedStyle(document.querySelector('.b-sess')).fill;
      const bg = getComputedStyle(document.querySelector('.progress')).backgroundColor;
      const [a, c] = [lum(fill), lum(bg)].sort((x, y) => y - x);
      return { ratio: (a + 0.05) / (c + 0.05), nums: [...document.querySelectorAll('.chart-v .v-sess')].map((x) => x.textContent) };
    });
    check(`L7 ${scheme}: session bars reach 3:1 and show their numbers`, r.ratio >= 3 && r.nums.join() === '3', r);
    check('no page errors', errs.length === 0, errs);
    await ctx.close();
  }
  // H1: in Auckland, Mark done on Monday morning is stamped with Monday's date
  {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 }, timezoneId: 'Pacific/Auckland' });
    const s = { 'p-t': { kind: 'project', name: 'Tz', pitch: 'x', createdAt: '2026-09-01T09:00:00Z', updatedAt: '2026-09-01T09:00:00Z', milestones: [{ id: 'm1', title: 'A', tasks: [{ id: 't1', title: 'Do it', status: 'doing' }, { id: 't2', title: 'Then', status: 'todo' }] }] } };
    const fake = `(() => { const T = Date.parse('2026-10-11T20:00:00Z'); const D = Date; const t0 = D.now(); class FD extends D { constructor(...a) { super(...(a.length ? a : [T + (D.now() - t0)])); } static now() { return T + (D.now() - t0); } } window.Date = FD; })();`;
    const { pg, errs } = await open(b, 'mocked.html', { ctx, init: `window.__SEED__ = ${JSON.stringify(s)};` + fake, wait: 700 });
    await pg.click('[data-act="set-task"][data-s="done"]');
    await pg.waitForTimeout(1700);
    const d = await pg.evaluate(() => [...window.__mockDocs.values()][0].milestones[0].tasks[0].doneAt);
    check('H1 Auckland Monday 09:00: done on 2026-10-12, counted this week', d === '2026-10-12' && /This week: 1 task done/.test(await pg.textContent('.progress .panel-head p')), [d, await pg.textContent('.progress .panel-head p')]);
    check('no page errors', errs.length === 0, errs);
    await ctx.close();
  }
  await b.close();
})();
