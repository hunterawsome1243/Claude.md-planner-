// Round 19: the target date in the brief, the Progress panel and All projects
const { launch, open, check } = require('./lib');
const day = (n) => { const t = new Date(); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const short = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
const noScroll = (pg) => pg.evaluate(() => document.scrollingElement.scrollWidth <= window.innerWidth);
const S = (id, n) => ({ id, title: 'Done ' + id, size: 'S', status: 'done', doneAt: day(n) });
const seed = {
  'p-a': { kind: 'project', name: 'Alpha', pitch: 'A planner.', createdAt: day(-60) + 'T09:00:00Z', updatedAt: day(0) + 'T09:00:00Z',
    milestones: [{ id: 'm1', title: 'One', tasks: [S('d1', 0), S('d2', 0), S('d3', -7), S('d4', -7), { id: 'l1', title: 'Big one', size: 'L' }] }] },
  'p-b': { kind: 'project', name: 'Beta', pitch: 'Other.', targetDate: day(10), createdAt: day(-30) + 'T09:00:00Z', updatedAt: day(-1) + 'T09:00:00Z',
    milestones: [{ id: 'm1', title: 'One', tasks: [{ id: 't1', title: 'Start', size: 'M' }] }] },
};
(async () => {
  const b = await launch();
  {
    const { pg, errs, ctx } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(seed)};`, wait: 700 });
    await pg.click('#plist [data-act="open"][data-id="p-a"]');
    await pg.waitForTimeout(150);
    const txt = async () => (await pg.textContent('.progress .panel-head p')).replace(/\s+/g, ' ').trim();
    // 4 S tasks over 4 weeks and this week so far (round 22); an L left = 4 points
    const days = Math.ceil(7 * (4 + (((new Date().getUTCDay() + 6) % 7) + 1) / 7) - 1e-9);
    const finish = day(days);
    check('the estimate weighs the L task and gives a finish date', (await txt()).endsWith(`the 1 task left takes about ${Math.round(days / 7)} weeks, so you would finish around ${short(finish)}.`), await txt());
    check('the brief has an optional date field', (await pg.getAttribute('#f-targetDate', 'type')) === 'date' && /Optional/.test(await pg.textContent('label[for="f-targetDate"] ~ .hint')));
    await pg.fill('#f-targetDate', day(14));
    await pg.click('#tab-plan'); await pg.click('#tab-overview');
    check('a target before the finish says how far behind', (await txt()).endsWith(`That is about ${Math.round((days - 14) / 7)} weeks after your target of ${short(day(14))}.`), await txt());
    await pg.fill('#f-targetDate', day(40));
    await pg.click('#tab-plan'); await pg.click('#tab-overview');
    check('a later target is on pace', (await txt()).endsWith(`That is before your target of ${short(day(40))}.`), await txt());
    await pg.waitForTimeout(1600);
    check('the target is saved with the project', (await pg.evaluate(() => window.__mockDocs.get('p-a').targetDate)) === day(40));
    await pg.click('#plist [data-act="open"][data-id="p-b"]');
    await pg.waitForTimeout(150);
    check('with nothing done yet, Progress still shows the target', (await txt()) === `Nothing marked done yet. Your target is ${short(day(10))}, 10 days away.`, await txt());
    await pg.click('[data-act="open-all"]');
    await pg.waitForTimeout(150);
    const facts = (await pg.textContent('.dcard:has(#dc-p-a-n) .dc-facts')).replace(/\s+/g, ' ');
    check('All projects shows the target and the pace', /Target\s*\S+ \d+, on pace/.test(facts), facts);
    check('no page errors', !errs.length, errs);
    await ctx.close();
  }
  {
    const { pg, errs, ctx } = await open(b, 'plain.html', { viewport: { width: 360, height: 800 } });
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Phone');
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(300);
    await pg.fill('#f-targetDate', day(30));
    await pg.waitForTimeout(100);
    check('360px: the date field fits', await noScroll(pg) && await pg.evaluate(() => { const r = document.getElementById('f-targetDate').getBoundingClientRect(); return r.right <= window.innerWidth; }));
    check('no page errors (plain)', !errs.length, errs);
    await ctx.close();
  }
  await b.close();
})();
