// Round 60: review 12a, part 1. Saved prompts show their whole name; dialog buttons stay in reach; compact starting
// points on a phone; the summary's choices; darker "since" dates; the example opens on Next up; phone headers; What's new
// folds older changes when nothing is new; no Ctrl+Enter hint on a touch screen.
const { launch, open, check, results } = require('../r48/lib');
const { build, seedOf, initScript } = require('../r47/seed10b');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') : null; });
const ui = (tab, view = 'project') => ({ activeId: 'pMain', tab, repoFile: 'claudemd', view });
(async () => {
  const b = build();
  const browser = await launch();
  for (const dev of [{ n: 'laptop', viewport: { width: 1280, height: 800 } }, { n: 'phone', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]) {
    const ctx = await browser.newContext({ viewport: dev.viewport, isMobile: !!dev.isMobile, hasTouch: !!dev.hasTouch });
    const { pg, errs } = await open(browser, 'mocked.html', { ctx, init: initScript(seedOf(b.after), { seen: 99, ui: ui('improve') }), wait: 1300 });
    // H1: your own prompts
    const rows = await pg.$$eval('.own-prompt', (xs) => xs.map((li) => {
      const r = (s) => li.querySelector(s).getBoundingClientRect();
      const n = r('.in'); const u = r('[data-act="own-prompt"]'); const t = r('.ta'); const row = li.getBoundingClientRect();
      const inp = li.querySelector('.in');
      return { nameW: Math.round(n.width), rowW: Math.round(row.width), sameLine: Math.abs((n.top + n.bottom) / 2 - (u.top + u.bottom) / 2) < 4, taBelow: t.top >= n.bottom, taFull: Math.abs(t.width - row.width) < 2, fits: inp.scrollWidth <= inp.clientWidth + 1, cmd: li.querySelector('.own-cmd')?.textContent };
    }));
    check(`${dev.n}: each saved prompt's name has most of the row and shows whole`, rows.length >= 2 && rows.every((r) => r.nameW > r.rowW * 0.6 && r.fits), rows);
    check(`${dev.n}: Use and Delete sit on the name's line, the prompt under it at full width`, rows.every((r) => r.sameLine && r.taBelow && r.taFull), rows);
    check(`${dev.n}: the slash command is on a line of its own`, rows.every((r) => /^Slash command in Claude Code: \/[a-z0-9-]+$/.test(r.cmd)), rows.map((r) => r.cmd));
    if (dev.n === 'laptop') {
      const first = '.own-prompt >> nth=0';
      const id = await pg.$eval('.own-prompt .in', (e) => e.id);
      await pg.click(`#${id}`);
      await pg.keyboard.press('End');
      await pg.keyboard.type(' now');
      await pg.waitForTimeout(150);
      check('renaming a prompt updates its command as you type, and the cursor stays in the name', /\/write-release-notes-now$/.test(await pg.textContent(`${first} >> .own-cmd`)) && (await fa(pg)) === 'INPUT#' + id, [await pg.textContent(`${first} >> .own-cmd`), await fa(pg)]);
      await pg.fill(`${first} >> .ta`, '');
      await pg.waitForTimeout(150);
      check('...and a prompt with no text has no command line', (await pg.textContent(`${first} >> .own-cmd`)) === '' && !(await pg.isVisible(`${first} >> .own-cmd`)));
      await pg.fill(`${first} >> .ta`, 'Write release notes.');
      await pg.waitForTimeout(150);
      await pg.click(`${first} >> .cmd-link`);
      await pg.waitForTimeout(200);
      check('...it comes back with text, and opens the command on Repo files', await pg.evaluate(() => document.querySelector('#tab-claudemd')?.getAttribute('aria-selected') === 'true'));
      await pg.click('#tab-improve');
      await pg.waitForTimeout(150);
    }
    // L14: on a phone a header's one small button sits beside its heading
    const head = await pg.evaluate(() => { const h = document.querySelector('#sessions-h'); const btn = h.parentElement.querySelector('[data-act="log-session"]'); const p = h.parentElement.querySelector('p'); const a = h.getBoundingClientRect(); const c = btn.getBoundingClientRect(); return { beside: c.top < a.bottom && c.bottom > a.top, pBelow: p.getBoundingClientRect().top >= Math.min(a.bottom, c.bottom) - 1 }; });
    check(`${dev.n}: Log a session sits beside the Sessions heading${dev.n === 'phone' ? ', the count under both' : ''}`, head.beside && (dev.n !== 'phone' || head.pBelow), head);
    const pills = await pg.$$eval('.session .oc', (xs) => xs.map((x) => Math.round(x.getBoundingClientRect().width)));
    check(`${dev.n}: outcome pills keep their own width`, pills.length > 2 && Math.max(...pills) < 130, pills.slice(0, 5));
    // M8: the "since" colour in light mode
    check(`${dev.n}: --dot is darker in light mode`, (await pg.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--dot').trim().toLowerCase())) === '#8c6000');
    // L15: no Ctrl+Enter hint on a touch screen; Ctrl or Cmd by the keyboard
    await pg.click('#tab-overview');
    await pg.waitForTimeout(150);
    const tip = await pg.evaluate(() => { const t = [...document.querySelectorAll('.ask .hint .kbd-tip')][0]; return t ? { text: t.textContent, shown: !!t.getClientRects().length } : null; });
    check(`${dev.n}: the Ctrl+Enter hint shows only with a keyboard`, tip && tip.text === 'Ctrl+Enter sends. ' && tip.shown === (dev.n === 'laptop'), tip);
    // H2: the New project dialog
    await pg.locator('[data-act="new-project"] >> visible=true').first().click();
    await pg.waitForTimeout(300);
    const geo = async () => pg.evaluate(() => { const m = document.querySelector('.modal'); const c = m.querySelector('[data-act="create"]').getBoundingClientRect(); const a = m.querySelector('.modal-actions').getBoundingClientRect(); const mr = m.getBoundingClientRect(); return { scrolls: m.scrollHeight > m.clientHeight + 4, createIn: c.bottom <= mr.bottom && c.top >= mr.top && c.bottom <= innerHeight, actionsAtBottom: Math.abs(a.bottom - mr.bottom) < 3 }; });
    let g = await geo();
    check(`${dev.n}: Create is in view when the dialog opens`, g.createIn && g.actionsAtBottom, g);
    await pg.evaluate(() => { document.querySelector('.modal').scrollTop = 1e5; });
    await pg.waitForTimeout(100);
    g = await geo();
    check(`${dev.n}: ...and at the end of the dialog, with nothing covered`, g.createIn && g.actionsAtBottom && await pg.evaluate(() => { const last = [...document.querySelectorAll('.starter')].pop().getBoundingClientRect(); return last.bottom <= document.querySelector('.modal-actions').getBoundingClientRect().top + 1; }), g);
    check(`${dev.n}: what a starting point does comes before the choices`, await pg.evaluate(() => { const w = document.querySelector('.st-what'); const grid = document.querySelector('.starter-grid'); return !!w && !!(w.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING) && /fills in a tech stack/.test(w.textContent); }));
    await pg.click('label:has(#np-st-web)');
    await pg.waitForTimeout(100);
    const det = await pg.evaluate(() => [...document.querySelectorAll('.starter')].map((s) => ({ on: s.querySelector('input').checked, small: !!s.querySelector('small')?.getClientRects().length })));
    check(`${dev.n}: ${dev.n === 'phone' ? 'only the chosen starting point shows its details' : 'every starting point shows its details'}`, det.every((d) => d.small === (dev.n === 'phone' ? d.on : true)), det);
    if (dev.n === 'phone') {
      const btns = await pg.$$eval('.modal-actions > .btn', (xs) => xs.map((x) => Math.round(x.getBoundingClientRect().width)));
      check('phone: the dialog buttons fill their rows, none left alone at one side', btns.every((w) => w > 100), btns);
    }
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(150);
    // M5: the week summary
    await pg.locator('[data-act="copy-week"] >> visible=true').first().click();
    await pg.waitForTimeout(700);
    const sum = await pg.evaluate(() => { const box = document.querySelector('.sum-modes'); const s = getComputedStyle(box); const row = document.querySelector('#sum-week-row'); return { noSeg: !document.querySelector('.sum-range .seg'), overflow: s.overflow, bg: s.backgroundColor, flex: getComputedStyle(row).display }; });
    check(`${dev.n}: the summary's choices are not drawn as a progress bar, the week row is a row`, sum.noSeg && sum.overflow === 'visible' && sum.bg === 'rgba(0, 0, 0, 0)' && sum.flex === 'grid', sum);
    const btnsGap = await pg.evaluate(() => { const [e, l] = [...document.querySelectorAll('[data-act="sum-week"]')].map((x) => x.getBoundingClientRect()); const lab = document.querySelector('#sum-week-label').getBoundingClientRect(); return e.top === l.top ? (lab.bottom <= e.top + 1 || (lab.left - e.right >= 6 && l.left - lab.right >= 6)) : l.top >= e.bottom; });
    check(`${dev.n}: ...with room between the week buttons and the week`, btnsGap);
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(150);
    // L15: What's new with nothing new
    if (dev.n === 'phone') { await pg.click('.mbar [data-act="open-drawer"]'); await pg.waitForTimeout(300); }
    await pg.locator('[data-act="whats-new"] >> visible=true').first().click();
    await pg.waitForTimeout(200);
    const wn = await pg.evaluate(() => ({ top: document.querySelectorAll('.modal > .wn-list > li').length, all: document.querySelectorAll('.wn-list > li').length, sum: document.querySelector('.wn-past summary')?.textContent, open: document.querySelector('.wn-past')?.open, sub: document.querySelector('.modal .sub').textContent, older: !!document.querySelector('.wn-older'), news: document.querySelectorAll('.wn-new').length }));
    check(`${dev.n}: with nothing new, What's new shows the latest changes and folds the rest`, wn.top > 0 && wn.top < 10 && wn.sum === `Earlier changes (${wn.all - wn.top})` && wn.open === false && !wn.older && wn.news === 0 && /^Recent changes/.test(wn.sub), wn);
    const h = await pg.evaluate(() => document.querySelector('.modal').scrollHeight);
    check(`${dev.n}: ...so it is a few screens at most`, h < 2600, h);
    await pg.click('.wn-past summary');
    check(`${dev.n}: ...and the rest open with a click`, await pg.isVisible('.wn-past [data-act="wn-go"][data-k="target"]'));
    await pg.keyboard.press('Escape');
    check(`${dev.n}: no page errors`, !errs.length, errs);
    await ctx.close();
  }
  // L14: the prompt dialog's "See how to start it." keeps its full stop
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const { pg, errs } = await open(browser, 'mocked.html', { ctx, init: initScript(seedOf(b.after), { seen: 99, ui: ui('overview') }), wait: 1300 });
    await pg.locator('#next-prompt').click();
    await pg.waitForTimeout(300);
    const st = await pg.evaluate(() => { const s = document.querySelector('.modal .sub .nw'); if (!s) return null; const r = s.getClientRects(); const b = s.querySelector('button').getBoundingClientRect(); const t = document.createRange(); t.setStart(s.lastChild, 0); t.setEnd(s.lastChild, 1); const d = t.getBoundingClientRect(); return { text: s.textContent, sameLine: Math.abs(d.bottom - b.bottom) < 6 }; });
    check('phone: a link and the full stop after it wrap together', st && st.text === 'See how to start it.' && st.sameLine, st);
    check('no page errors (prompt dialog)', !errs.length, errs);
    await ctx.close();
  }
  // M13: the example opens on Next up, not in its name
  {
    const { pg, errs } = await open(browser, 'mocked.html', { wait: 800 });
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.click('.modal [data-act="example"]');
    await pg.waitForTimeout(400);
    check('a new example opens with focus on Next up, not in the project name', (await fa(pg)) === 'H2#next-h' && (await pg.inputValue('#f-name')) === 'Recipe Box', await fa(pg));
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.click('.modal [data-act="np-mode"][data-k="import"]').catch(() => {});
    await pg.keyboard.press('Escape');
    await pg.locator('[data-act="whats-new"] >> visible=true').first().click();
    await pg.evaluate(() => document.querySelectorAll('details.wn-past').forEach((d) => { d.open = true; }));
    await pg.click('[data-act="wn-go"][data-k="example"]');
    await pg.waitForTimeout(400);
    check('opening it again lands on Next up too', (await fa(pg)) === 'H2#next-h', await fa(pg));
    check('no page errors (example)', !errs.length, errs);
  }
  await browser.close();
  const fails = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - fails} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})();
