// Round 61: review 12a, part 2 (the Plan tab). One-line folded milestones; a run of done tasks at the top of a milestone
// folds behind one row (and nothing folds under the cursor); task and bug rows keep one shape on a laptop and a phone;
// notes show a dot; status in sentence case; bigger touch targets.
const { launch, open, check, results } = require('../r48/lib');
const { build, seedOf, initScript } = require('../r47/seed10b');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') : null; });
const ui = (tab, view = 'project') => ({ activeId: 'pMain', tab, repoFile: 'claudemd', view });
const doc = (pg, id = 'pMain') => pg.evaluate((k) => window.__mockDocs.get(k), id);
const shown = (pg, mid) => pg.$$eval(`.ms .task [data-mid="${mid}"].t-title`, (xs) => xs.map((x) => x.id.replace(/^f-milestones-m\d-tasks-|-title$/g, '')));
const dump = (pg) => pg.evaluate(() => {
  const out = [];
  const walk = (n, d) => {
    if (n.nodeType === 3) { if (n.nodeValue.trim()) out.push(' '.repeat(d) + JSON.stringify(n.nodeValue.replace(/\s+/g, ' '))); return; }
    if (n.nodeType !== 1) return;
    out.push(`${' '.repeat(d)}<${n.tagName.toLowerCase()} ${[...n.attributes].map((a) => `${a.name}=${JSON.stringify(a.value)}`).sort().join(' ')}>`);
    if (n.tagName !== 'TEXTAREA') for (const c of n.childNodes) walk(c, d + 1);
  };
  walk(document.querySelector('#sheet-inner'), 0);
  return out.join('\n');
});
(async () => {
  const b = build();
  const browser = await launch();
  {
    const { pg, errs } = await open(browser, 'mocked.html', { viewport: { width: 1280, height: 800 }, init: initScript(seedOf(b.after), { seen: 99, ui: ui('plan') }), wait: 1300 });
    // folded milestones are one line
    const fold = await pg.$$eval('.ms.folded', (xs) => xs.map((m) => ({ h: Math.round(m.getBoundingClientRect().height), inHead: !!m.querySelector('.ms-head .ms-fold'), goal: !!m.querySelector('.ms-goal'), add: !!m.querySelector('[data-act="add-task"]'), text: m.querySelector('.ms-fold').textContent })));
    check('the three finished milestones fold to one line each', fold.length === 3 && fold.every((f) => f.h < 70 && f.inHead && !f.goal && !f.add), fold);
    check('...saying how many tasks are done', fold[0].text.startsWith('All 8 tasks done.'), fold[0].text);
    await pg.click('#f-milestones-m1-fold');
    await pg.waitForTimeout(100);
    check('Show tasks opens it with its goal, tasks and Add task, and keeps the focus on the button', await pg.isVisible('#f-milestones-m1-goal') && (await shown(pg, 'm1')).length === 8 && await pg.isVisible('[data-act="add-task"][data-mid="m1"]') && (await fa(pg)) === 'BUTTON#f-milestones-m1-fold', await fa(pg));
    await pg.click('#f-milestones-m1-fold');
    await pg.waitForTimeout(100);
    check('...and Hide tasks folds it again', (await pg.$$('.ms.folded')).length === 3 && (await fa(pg)) === 'BUTTON#f-milestones-m1-fold', await fa(pg));
    // a run of done tasks at the top folds behind one row
    check('the 13 done tasks at the top of Packing lists fold behind one row', (await pg.textContent('#f-milestones-m4-run')).trim() === 'Show the first 13 tasks, all done' && (await shown(pg, 'm4')).join() === 't4-14,t4-15', await shown(pg, 'm4'));
    const y = await pg.evaluate(() => { const sh = document.querySelector('#sheet'); return document.querySelector('#f-milestones-m4-tasks-t4-14-title').getBoundingClientRect().top - sh.getBoundingClientRect().top + sh.scrollTop; });
    check('...so the first open task is on the first screen', y < 800, y);
    check('Milestone 5, with only 2 done tasks among open ones, folds nothing', !(await pg.$('#f-milestones-m5-run')) && (await shown(pg, 'm5')).length === 15);
    await pg.click('#f-milestones-m4-run');
    await pg.waitForTimeout(100);
    check('the row shows them, in their place, and keeps the focus', (await shown(pg, 'm4')).length === 15 && (await shown(pg, 'm4'))[0] === 't4-01' && (await pg.getAttribute('#f-milestones-m4-run', 'aria-expanded')) === 'true' && (await pg.textContent('#f-milestones-m4-run')).trim() === 'Hide the first 13 tasks, all done' && (await fa(pg)) === 'BUTTON#f-milestones-m4-run');
    let m = await dump(pg); await pg.click('#tab-overview'); await pg.click('#tab-plan'); await pg.waitForTimeout(100); let f = await dump(pg);
    check('...and the page is what a fresh build shows', m === f);
    await pg.click('#f-milestones-m4-run');
    await pg.waitForTimeout(100);
    check('...and folds them again', (await shown(pg, 'm4')).length === 2);
    // nothing folds under the cursor: finishing the next task leaves it in view
    await pg.click('#f-milestones-m4-tasks-t4-14-st');
    await pg.waitForTimeout(100);
    check('marking the next task done leaves it in view', (await pg.getAttribute('#f-milestones-m4-tasks-t4-14-st', 'data-s')) === 'done' && (await shown(pg, 'm4')).join() === 't4-14,t4-15' && (await fa(pg)) === 'BUTTON#f-milestones-m4-tasks-t4-14-st', await fa(pg));
    m = await dump(pg); await pg.click('#tab-overview'); await pg.click('#tab-plan'); await pg.waitForTimeout(100); f = await dump(pg);
    check('...also after going to another tab and back', m === f && (await shown(pg, 'm4')).join() === 't4-14,t4-15');
    // moving the first open task up past the run puts it in view, just above the last done task
    await pg.click('#f-milestones-m4-tasks-t4-15-title');
    await pg.keyboard.press('Alt+ArrowUp');
    await pg.keyboard.press('Alt+ArrowUp');
    await pg.waitForTimeout(150);
    await pg.waitForTimeout(1700); // saved
    const order = (await doc(pg)).milestones[3].tasks.map((t) => t.id.slice(3)).join(',');
    check('Alt+Up past the folded run moves the task above the last done task, still in view, cursor in it', (await shown(pg, 'm4')).join() === 't4-15,t4-13,t4-14' && (await fa(pg)) === 'TEXTAREA#f-milestones-m4-tasks-t4-15-title' && (await pg.textContent('#f-milestones-m4-run')).trim() === 'Show the first 12 tasks, all done', [await shown(pg, 'm4'), await fa(pg)]);
    check('...and the saved order matches', /12,15,13,14$/.test(order), order);
    // Find opens a task in the folded run
    await pg.keyboard.press('Escape');
    await pg.keyboard.press('Control+k');
    await pg.waitForTimeout(150);
    await pg.fill('#find-q', (await doc(pg)).milestones[3].tasks[2].title);
    await pg.waitForTimeout(150);
    await pg.keyboard.press('Enter');
    await pg.waitForTimeout(250);
    check('Find opens a task hidden in a folded run', (await fa(pg)) === 'TEXTAREA#f-milestones-m4-tasks-t4-03-title' && (await shown(pg, 'm4')).length === 15, await fa(pg));
    // a new visit settles the run again
    await pg.click('#plist [data-act="open"]:not([data-id="pMain"]) >> nth=0');
    await pg.waitForTimeout(150);
    await pg.click('#plist [data-act="open"][data-id="pMain"]');
    await pg.waitForTimeout(200);
    await pg.click('#tab-plan');
    await pg.waitForTimeout(100);
    check('coming back to the project, the run folds again, now 12 long', (await pg.textContent('#f-milestones-m4-run').catch(() => '')).trim() === 'Show the first 12 tasks, all done', await pg.textContent('#f-milestones-m4-run').catch(() => null));
    // rows: one shape
    const rows = await pg.evaluate(() => {
      const out = { sizes: new Set(), sevs: new Set(), ageInTools: 0, ageCol: [], metaInTools: 0 };
      for (const t of document.querySelectorAll('.task')) { out.sizes.add(Math.round(t.querySelector('.size').getBoundingClientRect().left)); if (t.querySelector('.t-tools .t-age')) out.ageInTools++; const a = t.querySelector(':scope > .t-age'); if (a) out.ageCol.push(Math.round(a.getBoundingClientRect().right)); }
      for (const t of document.querySelectorAll('.bug')) { out.sevs.add(Math.round(t.querySelector('.sev').getBoundingClientRect().left)); if (t.querySelector('.t-tools .b-when, .t-tools .new-tag')) out.metaInTools++; }
      return { sizes: [...out.sizes], sevs: [...out.sevs], ageInTools: out.ageInTools, ageCol: out.ageCol, metaInTools: out.metaInTools };
    });
    check('laptop: every task size sits in one column, from one milestone to the next', rows.sizes.length === 1, rows.sizes);
    check('laptop: every bug severity too, open or fixed', rows.sevs.length === 1, rows.sevs);
    check('laptop: dates are in a column of their own, not among the buttons', rows.ageInTools === 0 && rows.metaInTools === 0 && rows.ageCol.length >= 2 && new Set(rows.ageCol).size === 1, rows);
    // notes dot and status chips
    const dot = await pg.evaluate(() => { const h = document.querySelector('.task [data-act="toggle-notes"][data-has]'); const n = document.querySelector('.task [data-act="toggle-notes"]:not([data-has])'); const s = (e) => getComputedStyle(e, '::after'); return { has: s(h).content !== 'none' && s(h).width === '7px', none: s(n).content === 'none' || s(n).width !== '7px' }; });
    check('a task with notes shows a dot on its notes button; one without does not', dot.has && dot.none, dot);
    const st = await pg.evaluate(() => { const s = getComputedStyle(document.querySelector('.task .st')); return { tt: s.textTransform, fs: s.fontSize }; });
    check('status chips are in sentence case at 12px', st.tt === 'none' && st.fs === '12px', st);
    check('no page errors', !errs.length, errs);
    await pg.context().close();
  }
  // phone
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const { pg, errs } = await open(browser, 'mocked.html', { ctx, init: initScript(seedOf(b.after), { seen: 99, ui: ui('plan') }), wait: 1300 });
    const r = await pg.evaluate(() => {
      const bad = [];
      for (const row of document.querySelectorAll('.task, .bug')) {
        const q = (s) => row.querySelector(s)?.getBoundingClientRect();
        const title = q('.t-title, .b-title'); const sel = q('.size, .sev'); const st = q(':scope > .st'); const del = q('.t-tools .del'); const tools = [...row.querySelectorAll('.t-tools > *')].map((e) => e.getBoundingClientRect());
        const date = q(':scope > .t-age, :scope > .b-meta');
        const oneLine = tools.every((x) => Math.abs(x.top + x.height / 2 - (st.top + st.height / 2)) < 4);
        const ok = Math.abs(sel.top + sel.height / 2 - (title.top + title.height / 2)) < 12 && st.top >= title.bottom - 2 && oneLine && (!date || (date.top >= title.bottom - 2 && date.bottom <= st.top + 2));
        if (!ok) bad.push((row.querySelector('textarea').value || '').slice(0, 30));
      }
      return { n: document.querySelectorAll('.task, .bug').length, bad, wide: document.documentElement.scrollWidth };
    });
    check('phone: every task and bug row is title and size, then the date, then status and buttons on one line', r.n > 20 && !r.bad.length, r);
    check('phone: no sideways scroll', r.wide <= 390, r.wide);
    const fh = await pg.$$eval('.ms.folded', (xs) => xs.map((x) => Math.round(x.getBoundingClientRect().height)));
    check('phone: folded milestones are two short lines, without the move and delete buttons', fh.length === 3 && fh.every((h) => h < 120) && !(await pg.isVisible('.ms.folded .ms-tools')), fh);
    const y = await pg.evaluate(() => { const sh = document.querySelector('#sheet'); return document.querySelector('#f-milestones-m4-tasks-t4-14-title').getBoundingClientRect().top - sh.getBoundingClientRect().top + sh.scrollTop; });
    check('phone: the first open task is within about a screen and a half', y < 844 * 1.5, y);
    const tabs = await pg.$$eval('.tab', (xs) => xs.map((x) => Math.round(x.getBoundingClientRect().height)));
    check('phone: tabs are at least 44px tall', tabs.every((h) => h >= 44), tabs);
    await pg.tap('.mbar [data-act="open-drawer"]');
    await pg.waitForTimeout(300);
    const ps = await pg.evaluate(() => Math.round(document.querySelector('#psearch').getBoundingClientRect().height));
    check('phone: the project search is at least 44px tall', ps >= 44, ps);
    check('no page errors (phone)', !errs.length, errs);
    await ctx.close();
  }
  await browser.close();
  const fails = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - fails} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})();
