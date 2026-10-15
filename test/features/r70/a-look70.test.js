// Round 70: review 14b, finishing touches to the look: touch targets, the week stepper, tablet rows, one date format,
// marks that can be told apart, the phone bar's icon, the rule field, the bug sizes and Tap, session chips, link colour,
// and singular counts.
const { launch, open, check, results } = require('../r48/lib');
const { build, seedOf, initScript } = require('../r47/seed10b');
const ui = (tab, id = 'pMain') => ({ activeId: id, tab, repoFile: 'claudemd', view: 'project' });
const h = (pg, sel) => pg.$eval(sel, (e) => Math.round(e.getBoundingClientRect().height));
(async () => {
  const b = build();
  const browser = await launch();
  // phone
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'en-GB' });
    const { pg, errs } = await open(browser, 'mocked.html', { ctx, init: initScript(seedOf(b.after), { seen: 99, ui: ui('overview') }), wait: 1300 });
    check('phone: the Projects button shows its menu icon', (await pg.$eval('.mbar [data-act="open-drawer"] svg', (s) => Math.round(s.getBoundingClientRect().width))) === 16);
    const links = await pg.$$eval('.facts .linkish', (xs) => xs.map((x) => Math.round(x.getBoundingClientRect().height)));
    check('phone: the Overview fact links are 44px tall to tap', links.length > 0 && links.every((n) => n >= 44), links);
    const ov = await pg.textContent('#sheet');
    check('a British browser still reads dates one way (Sep 8, not 8 Sept)', !/\b\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b/.test(ov), (ov.match(/\b\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\b/) || [])[0]);
    await pg.tap('#tab-claudemd');
    await pg.waitForTimeout(150);
    check('phone: file tabs are 44px', (await h(pg, '.file-tab')) >= 44, await h(pg, '.file-tab'));
    await pg.tap('#tab-plan');
    await pg.waitForTimeout(150);
    check('phone: the Plan hint says Tap', /Tap a status to change it\./.test(await pg.textContent('.toolbar p')));
    await pg.tap('#tab-overview');
    await pg.waitForTimeout(150);
    await pg.tap('[data-act="copy-week"]');
    await pg.waitForTimeout(250);
    const sw = await pg.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(); const l = r('#sum-week-label'); const bs = [...document.querySelectorAll('#sum-week-row .btn')].map((x) => x.getBoundingClientRect()); return { l: [l.top, l.bottom], b: bs.map((x) => Math.round(x.top)), labels: [...document.querySelectorAll('.sum-modes label')].map((x) => Math.round(x.getBoundingClientRect().height)) }; });
    check('phone: the week sits over Earlier and Later, which share a line', sw.b.length === 2 && sw.b[0] === sw.b[1] && sw.b[0] >= sw.l[1] - 1, sw);
    check('phone: the summary choices are 44px', sw.labels.every((n) => n >= 44), sw.labels);
    await pg.tap('.modal [data-act="close-modal"]');
    await pg.waitForTimeout(100);
    await pg.tap('[data-act="log-session"] >> visible=true');
    await pg.waitForTimeout(200);
    const oc = await pg.$$eval('.choice-row .starter', (xs) => xs.map((x) => Math.round(x.getBoundingClientRect().height)));
    check('phone: Done, Partly done and Stuck are 44px', oc.length === 3 && oc.every((n) => n >= 44), oc);
    check('the rule for Claude Code wraps', (await pg.$eval('#ss-rule', (e) => e.tagName)) === 'TEXTAREA');
    await pg.tap('.modal [data-act="close-modal"]');
    check('no page errors (phone)', errs.length === 0, errs);
    await ctx.close();
  }
  // tablet held upright
  {
    const ctx = await browser.newContext({ viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true });
    const { pg, errs } = await open(browser, 'mocked.html', { ctx, init: initScript(seedOf(b.after), { seen: 99, ui: ui('plan') }), wait: 1300 });
    const r = await pg.evaluate(() => [...document.querySelectorAll('.task')].map((t) => t.querySelector('.t-title').getBoundingClientRect().width / t.getBoundingClientRect().width));
    check('tablet: a task title gets most of its row', r.length > 20 && r.every((x) => x > 0.6), Math.min(...r).toFixed(2));
    check('no page errors (tablet)', errs.length === 0, errs);
    await ctx.close();
  }
  // laptop
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const { pg, errs } = await open(browser, 'mocked.html', { ctx, init: initScript(seedOf(b.after), { seen: 99, ui: ui('improve') }), wait: 1300 });
    const imp = await pg.textContent('#sheet');
    check('the review day reads like other dates', /Reviewed Aug 20, \d+ weeks ago\./.test(imp), (imp.match(/Reviewed [^.]*\./) || [])[0]);
    const ses = await pg.$$eval('.session', (xs) => xs.slice(0, 8).map((x) => [Math.round(x.querySelector('.s-body').getBoundingClientRect().left), getComputedStyle(x.querySelector('.oc')).textTransform, getComputedStyle(x.querySelector('.oc')).fontFamily]));
    check('session titles start on one line', new Set(ses.map((x) => x[0])).size === 1, ses.map((x) => x[0]));
    check('session chips are in sentence case, in the body font', ses.every((x) => x[1] === 'none' && /Plex Sans|system-ui/.test(x[2])), ses[0]);
    const mark = await pg.evaluate(() => { const m = document.querySelector('.check .mark.no'); return m && [getComputedStyle(m).color, getComputedStyle(document.documentElement).getPropertyValue('--dot').trim()]; });
    check('the needs-work mark is drawn in the darker amber', !mark || mark[0] === 'rgb(140, 96, 0)', mark);
    await pg.click('#tab-plan');
    check('the Plan hint says Click with a mouse', /Click a status to change it\./.test(await pg.textContent('.toolbar p')));
    check('the bug sizes are explained on the page', /A blocker stops you using or building the app, a major bug gets something important wrong, and a minor one is easy to live with\./.test(await pg.textContent('#sheet')));
    const dots = await pg.evaluate(() => Object.fromEntries([...document.querySelectorAll('#plist .dot[data-stage]')].map((d) => [d.dataset.stage, [getComputedStyle(d).backgroundImage !== 'none', getComputedStyle(d).boxShadow !== 'none', getComputedStyle(d).backgroundColor]])));
    check('Idea is an empty ring and Polishing is half filled', dots.idea && dots.idea[1] && dots.idea[2] === 'rgba(0, 0, 0, 0)' && (!dots.polishing || (dots.polishing[0] && dots.polishing[1])) && dots.building && !dots.building[1], dots);
    // one milestone, one task
    await pg.click('#plist [data-act="open"][data-id="pRecipe"]');
    await pg.waitForTimeout(250);
    const leg = await pg.textContent('.gauge-legend');
    check('one milestone reads "of 1 milestone"', /of 1 milestone complete/.test(leg), leg);
    // Start Claude Code links take the app's colour
    await pg.click('#rail [data-act="whats-new"]');
    await pg.$$eval('.modal details', (x) => x.forEach((d) => { d.open = true; })); // Version 14 is under Earlier changes
    await pg.click('.modal [data-act="wn-go"][data-k="setup"] >> nth=0');
    await pg.waitForTimeout(200);
    const lc = await pg.evaluate(() => { const a = document.querySelector('.modal a[href]'); const t = document.createElement('span'); t.style.color = 'var(--accent)'; document.body.append(t); const want = getComputedStyle(t).color; t.remove(); return a && [getComputedStyle(a).color, want]; });
    check('links in Start Claude Code take the accent colour', lc && lc[0] === lc[1], lc);
    check('no page errors (laptop)', errs.length === 0, errs);
    await ctx.close();
  }
  await browser.close();
  const f = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - f}/${results.length} passed`);
  process.exit(f ? 1 : 0);
})();
