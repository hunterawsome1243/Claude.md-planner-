// Round 73: Help, "How Shipyard works": the six steps, where projects are kept in the words of how this page saves them,
// the keys; Help in the project list's tools and on ?, not while typing; its buttons; it fits a phone.
const { launch, open, check, results } = require('../r48/lib');
const { openShared } = require('../r76/settle');
const { build, seedOf, initScript } = require('../r47/seed10b');
const ui = (tab, id = 'pMain') => ({ activeId: id, tab, repoFile: 'claudemd', view: 'project' });
const SEEN = "try{localStorage.setItem('shipyard.seen.v1','99')}catch(e){}";
const kept = (pg) => pg.textContent('#modal-root .help-p');
(async () => {
  const b = build();
  const browser = await launch();
  const allErrs = [];

  // 1. the owner, with the account: the button, the dialog, the keys, ? and its limits
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const { pg, errs } = await open(browser, 'mocked.html', { ctx, init: initScript(seedOf(b.after), { seen: 99, ui: ui('overview') }), wait: 1500 });
    const btn = pg.locator('[data-act="help"]');
    check('Help is in the project list\'s tools', (await btn.count()) === 1 && (await btn.textContent()) === 'Help' && (await btn.getAttribute('aria-keyshortcuts')) === 'Shift+?');
    await btn.click();
    await pg.waitForTimeout(200);
    const title = await pg.textContent('#m-title');
    const steps = await pg.$$eval('#modal-root .help-steps > li > b', (xs) => xs.map((x) => x.textContent));
    check('it opens "How Shipyard works", focused on its title', title === 'How Shipyard works' && (await pg.evaluate(() => document.activeElement?.id)) === 'm-title', title);
    check('...with the six steps in order', JSON.stringify(steps) === JSON.stringify(['Describe it.', 'Plan it.', 'Set up the folder.', 'Build one task.', 'Log how it went.', 'Improve.']), steps);
    check('...where projects are kept, for the owner with the account', /^Your projects are saved to your Claude account, and only you and editors you add can see them\./.test(await kept(pg)) && /Back up all projects, in the project list, gives one file with everything/.test(await kept(pg)), await kept(pg));
    const keys = await pg.$$eval('#modal-root .help-keys kbd', (xs) => xs.map((x) => x.textContent));
    check('...and the keys, with Ctrl off a Mac', JSON.stringify(keys) === JSON.stringify(['Ctrl+K', '/', 'Ctrl+Z', 'Esc', '?']), keys);
    const tabs = await pg.$$eval('#modal-root .modal *', (xs) => xs.filter((e) => e.tabIndex >= 0 && !e.disabled).map((e) => e.textContent.trim()));
    check('its buttons: What\'s new, Start Claude Code, Close', tabs.includes('What\'s new') && tabs.includes('Start Claude Code') && tabs.at(-1) === 'Close', tabs);
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(200);
    check('Esc closes it and puts focus back on Help', !(await pg.$('#modal-root .modal')) && (await pg.evaluate(() => document.activeElement?.dataset.act)) === 'help');
    // ? from the page
    await pg.click('#tab-plan');
    await pg.keyboard.press('Shift+Slash');
    await pg.waitForTimeout(200);
    check('? opens Help from anywhere outside a text box', (await pg.textContent('#m-title').catch(() => '')) === 'How Shipyard works');
    await pg.keyboard.press('Shift+Slash');
    await pg.waitForTimeout(150);
    check('...and does nothing more while a dialog is open', (await pg.locator('#modal-root .modal').count()) === 1);
    await pg.click('#modal-root [data-act="close-modal"]');
    await pg.waitForTimeout(150);
    // ? while typing is just a ?
    const field = pg.locator('.t-title').first();
    const was = await field.inputValue();
    await field.click();
    await pg.keyboard.press('End');
    await pg.keyboard.type('?');
    await pg.waitForTimeout(200);
    check('? typed in a field is just a question mark', !(await pg.$('#modal-root .modal')) && (await field.inputValue()) === was + '?');
    await pg.keyboard.press('Control+z').catch(() => {});
    await field.fill(was);
    // the buttons
    await pg.click('#tab-overview');
    await pg.keyboard.press('Shift+Slash');
    await pg.waitForTimeout(200);
    await pg.click('#modal-root [data-act="whats-new"]');
    await pg.waitForTimeout(200);
    const wn = await pg.textContent('#m-title');
    check('What\'s new opens from Help', wn !== 'How Shipyard works' && /new/i.test(wn), wn);
    await pg.click('#modal-root [data-act="close-modal"]').catch(() => pg.keyboard.press('Escape'));
    await pg.waitForTimeout(200);
    await pg.keyboard.press('Shift+Slash');
    await pg.waitForTimeout(200);
    await pg.click('#modal-root [data-act="cc-setup"]');
    await pg.waitForTimeout(200);
    const cc = await pg.textContent('#modal-root').catch(() => '');
    check('Start Claude Code opens from Help', /Claude Code/.test(cc) && (await pg.textContent('#m-title')) !== 'How Shipyard works', (await pg.textContent('#m-title')));
    allErrs.push(...errs); await ctx.close();
  }

  // 2. where projects are kept, in each other case
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const { pg, errs } = await open(browser, 'plain.html', { ctx, init: SEEN, wait: 900 });
    await pg.keyboard.press('Shift+Slash');
    await pg.waitForTimeout(200);
    check('with no account and no projects yet, Help opens too', (await pg.textContent('#m-title')) === 'How Shipyard works');
    check('browser only: saved in this browser only, so keep a backup', /^Your projects are saved in this browser only\. Clearing the browser's data for this site removes them, so keep a backup\./.test(await kept(pg)), await kept(pg));
    allErrs.push(...errs); await ctx.close();
  }
  {
    // the account, once; then a visit that cannot reach it
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const m = await openShared(browser, 'mocked.html', { ctx, init: initScript(seedOf(b.after), { seen: 99, ui: ui('overview') }), wait: 2500 });
    allErrs.push(...m.errs); await m.pg.close();
    await new Promise((r) => setTimeout(r, 1500)); // a page opened at once can miss what the closed one stored
    const { pg, errs } = await openShared(browser, 'plain.html', { ctx, init: SEEN, wait: 900 });
    await pg.click('[data-act="help"]');
    await pg.waitForTimeout(200);
    check('cannot reach the account: kept here and saved to the account later', /^Shipyard cannot reach your Claude account right now, so changes are kept in this browser and saved to your account the next time the page connects\./.test(await kept(pg)), await kept(pg));
    allErrs.push(...errs); await ctx.close();
  }
  for (const [who, u, re] of [
    ['an editor', { owner: false, edit: true }, /^These are the projects of the person who shared Shipyard with you\. Your changes are saved to their projects, for everyone who can edit them\./],
    ['a viewer', { owner: false, edit: false }, /^The projects you start here are yours and are saved in this browser only\. The owner's projects stay private to them\./],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const init = `window.__USER__ = ${JSON.stringify(u)}; ${initScript(seedOf(b.after), { seen: 99, ui: ui('overview') })}`;
    const { pg, errs } = await open(browser, 'mocked.html', { ctx, init, wait: 1800 });
    await pg.click('[data-act="help"] >> visible=true').catch(() => pg.keyboard.press('Shift+Slash'));
    await pg.waitForTimeout(200);
    check(`${who}: Help says whose projects these are`, re.test(await kept(pg)), await kept(pg));
    allErrs.push(...errs); await ctx.close();
  }

  // 3. at phone width, in dark mode: it fits, and the drawer's Help opens it
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, colorScheme: 'dark', hasTouch: true, isMobile: true });
    const { pg, errs } = await open(browser, 'mocked.html', { ctx, init: initScript(seedOf(b.after), { seen: 99, ui: ui('overview') }), wait: 1500 });
    await pg.click('[data-act="open-drawer"] >> visible=true');
    await pg.waitForTimeout(300);
    await pg.click('[data-act="help"] >> visible=true');
    await pg.waitForTimeout(300);
    const fit = await pg.evaluate(() => {
      const m = document.querySelector('#modal-root .modal');
      const r = m.getBoundingClientRect();
      const wide = [...m.querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'auto').map((e) => e.className || e.tagName);
      const kbd = getComputedStyle(m.querySelector('kbd'));
      return { left: r.left, right: r.right, vw: innerWidth, page: document.documentElement.scrollWidth, wide, kbdBg: kbd.backgroundColor, kbdFg: kbd.color };
    });
    check('on a phone, Help fits the screen with nothing cut off', fit.left >= 0 && fit.right <= fit.vw && fit.page <= fit.vw && !fit.wide.length, fit);
    check('in dark mode the keys are drawn in dark colours', fit.kbdBg !== 'rgb(255, 255, 255)' && fit.kbdFg !== fit.kbdBg, fit);
    allErrs.push(...errs); await ctx.close();
  }

  check('no page errors', allErrs.length === 0, allErrs);
  await browser.close();
  const fails = results.filter((r) => !r.ok).length;
  console.log(`${results.length - fails}/${results.length} passed`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
