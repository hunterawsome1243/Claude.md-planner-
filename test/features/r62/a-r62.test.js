// Round 62: review 12a, part 3. Project cards open from anywhere, with a visible Open button and the prompt second;
// Repo files puts the file first, with one primary button and no box to scroll inside; on a phone the files are one
// row of names; one type scale with nothing under 12px; the tagline under the name keeps to one line.
const { launch, open, check, results } = require('../r48/lib');
const { build, seedOf, initScript } = require('../r47/seed10b');
const ui = (tab, view = 'project', repoFile = 'claudemd') => ({ activeId: 'pMain', tab, repoFile, view });
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') : null; });
const small = (pg) => pg.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('#app *')) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim())) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1 || el.closest('[hidden], .sr')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const fs = parseFloat(cs.fontSize);
    if (fs < 11.99) out.push(el.tagName + '.' + el.className + ' ' + fs + ' ' + el.textContent.trim().slice(0, 20));
  }
  return out;
});
(async () => {
  const b = build();
  const browser = await launch();
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, permissions: ['clipboard-read', 'clipboard-write'] });
    const { pg, errs } = await open(browser, 'mocked.html', { ctx, init: initScript(seedOf(b.after), { seen: 99, ui: ui('overview', 'all') }), wait: 1300 });
    const smAll = await small(pg);
    const cards = await pg.$$eval('.dcard', (xs) => xs.map((c) => ({ id: c.querySelector('.dc-open').dataset.id, prim: [...c.querySelectorAll('.btn.primary')].map((x) => x.textContent.trim()), other: [...c.querySelectorAll('.dc-actions .btn:not(.primary)')].map((x) => x.textContent.trim()), cur: getComputedStyle(c).cursor })));
    check('every project card has one main button, Open', cards.length >= 6 && cards.every((c) => c.prim.join() === 'Open' && c.cur === 'pointer'), cards);
    check('...and copying the prompt is the second button', cards.filter((c) => c.other.length).every((c) => /^(Copy next prompt|Copy fix prompt|Split the next task)$/.test(c.other[0])) && cards.filter((c) => c.other.length).length >= 4, cards.map((c) => c.other));
    check('Open says which project', (await pg.evaluate(() => { const b = document.querySelector('#dc-pApi-o'); return b.getAttribute('aria-labelledby').split(' ').map((i) => document.getElementById(i).textContent.trim()).join(' '); })) === 'Open Trailhead API');
    // the copy button copies, and leaves you on All projects
    await pg.click('#dc-pApi-p');
    await pg.waitForTimeout(250);
    check('Copy next prompt copies and stays on All projects', (await pg.evaluate(() => navigator.clipboard.readText())).includes('Rate limit requests') && await pg.isVisible('.dcard'), await pg.evaluate(() => navigator.clipboard.readText().then((t) => t.slice(0, 80))));
    // a click anywhere on a card opens its project
    const box = await pg.$eval('.dcard:has(#dc-pApi-n) .dc-facts', (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await pg.mouse.click(box.x, box.y);
    await pg.waitForTimeout(250);
    check('a click on the middle of a card opens its project', (await pg.inputValue('#f-name')) === 'Trailhead API', await pg.inputValue('#f-name').catch(() => null));
    // keyboard: the card shows the focus ring when its name has the focus
    await pg.click('[data-act="open-all"] >> visible=true');
    await pg.waitForTimeout(250);
    await pg.focus('#dc-pApi-p');
    await pg.keyboard.press('Shift+Tab');
    await pg.keyboard.press('Shift+Tab');
    const ring = await pg.evaluate(() => { const e = document.activeElement; const c = e.closest('.dcard'); return { el: e.id, o: c && getComputedStyle(c).outlineStyle }; });
    check('tabbing to a card name draws the focus ring around the whole card', ring.el === 'dc-pApi-n' && ring.o === 'solid', ring);
    await pg.keyboard.press('Enter');
    await pg.waitForTimeout(250);
    check('...and Enter opens it', (await pg.inputValue('#f-name')) === 'Trailhead API');
    check('nothing under 12px on All projects', smAll.length === 0, smAll.slice(0, 8));
    check('no page errors', errs.length === 0, errs);
    await ctx.close();
  }
  // Repo files on a laptop: the file first, one primary button, and the file grows with its text
  {
    const { pg, errs, ctx } = await open(browser, 'mocked.html', { viewport: { width: 1280, height: 800 }, init: initScript(seedOf(b.after), { seen: 99, ui: ui('claudemd') }), wait: 1300 });
    const md = await pg.evaluate(() => { const t = document.querySelector('.md-text'); const sh = document.querySelector('#sheet'); const r = t.getBoundingClientRect(); const s = document.querySelector('.save-all').getBoundingClientRect(); return { top: Math.round(r.top - sh.getBoundingClientRect().top), inner: t.scrollHeight - t.clientHeight, side: s.left > r.right, prim: [...document.querySelectorAll('#sheet .btn.primary')].filter((b) => b.offsetParent).map((b) => b.textContent.trim()) }; });
    check('the file starts on the first screen, under one or two rows of file names', md.top < 500, md);
    check('...with the setup prompt beside it', md.side, md);
    check('...and its whole text shows, with no box to scroll inside', md.inner <= 2, md);
    check('Get the setup prompt is the one main button', md.prim.join() === 'Get the setup prompt', md.prim);
    await pg.click('.md-text');
    await pg.keyboard.press('Control+End');
    for (let i = 0; i < 12; i++) await pg.keyboard.press('Enter');
    await pg.keyboard.type('- Keep the GPX parser pure');
    await pg.waitForTimeout(150);
    const g = await pg.evaluate(() => { const t = document.querySelector('.md-text'); return t.scrollHeight - t.clientHeight; });
    check('...also after adding lines to it', g <= 2, g);
    const sm = [];
    for (const tab of ['overview', 'design', 'plan', 'claudemd', 'improve']) { await pg.click(`#tab-${tab}`); await pg.waitForTimeout(150); sm.push(...(await small(pg))); }
    check('nothing under 12px on any tab', sm.length === 0, [...new Set(sm)].slice(0, 12));
    const brand = await pg.evaluate(() => { const s = document.querySelector('.brand span'); return s ? Math.round(s.getBoundingClientRect().height) : -1; });
    check('the tagline under the name is one line', brand > 0 && brand <= 20, brand);
    check('no page errors', errs.length === 0, errs);
    await ctx.close();
  }
  // Repo files on a phone: one row of file names, the path over the file, the file on the first screen
  {
    const { pg, errs, ctx } = await open(browser, 'mocked.html', { viewport: { width: 390, height: 844 }, init: initScript(seedOf(b.after), { seen: 99, ui: ui('claudemd') }), wait: 1300 });
    const ph = await pg.evaluate(() => {
      const tabs = [...document.querySelectorAll('.file-tab')];
      const t = document.querySelector('.md-text'); const sh = document.querySelector('#sheet');
      const p = document.querySelector('.md-path');
      return { n: tabs.length, rows: new Set(tabs.map((x) => Math.round(x.getBoundingClientRect().top))).size, codes: tabs.filter((x) => x.querySelector('code').offsetParent).length, path: p && p.offsetParent ? p.textContent : null, top: Math.round(t.getBoundingClientRect().top - sh.getBoundingClientRect().top + sh.scrollTop), wide: document.documentElement.scrollWidth - innerWidth, inner: t.scrollHeight - t.clientHeight };
    });
    check('the files are one row of names', ph.n >= 4 && ph.rows === 1 && ph.codes === 0, ph);
    check('...the file path shows over the file', ph.path === 'CLAUDE.md', ph.path);
    check('...the file starts on the first screen', ph.top < 844, ph.top);
    check('...with no box to scroll inside and no sideways scroll', ph.inner <= 2 && ph.wide <= 0, ph);
    const last = await pg.$$eval('.file-tab', (xs) => xs.at(-1).dataset.k);
    await pg.click(`.file-tab[data-k="${last}"]`);
    await pg.waitForTimeout(200);
    const seen = await pg.evaluate(() => { const g = document.querySelector('.file-tabs'); const on = g.querySelector('[aria-pressed="true"]'); return { k: on.dataset.k, inView: (() => { const a = g.getBoundingClientRect(), r = on.getBoundingClientRect(); return r.left >= a.left - 1 && r.right <= a.right + 1; })(), path: document.querySelector('.md-path').textContent }; });
    check('picking the last file keeps it in view in the row', seen.k === last && seen.inView, seen);
    check('...and the path over the file changes with it', seen.path !== 'CLAUDE.md' && seen.path.length > 0, seen.path);
    const brand = await pg.evaluate(() => { const s = document.querySelector('.brand span'); return s && s.offsetParent ? Math.round(s.getBoundingClientRect().height) : 0; });
    check('the tagline under the name is one line on a phone too', brand <= 20, brand);
    check('no page errors', errs.length === 0, errs);
    await ctx.close();
  }
  await browser.close();
  const f = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - f}/${results.length} passed`);
  process.exit(f ? 1 : 0);
})();
