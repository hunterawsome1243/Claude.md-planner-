// Round 72: review 14c, the rest: no lookbehind and a note when the script cannot start; a large backup opens at once;
// toasts are read out; Escape stops Claude in a dialog; project cards keep a focus ring without :has(); Skip to
// project; a name that flips direction stays inside its quotes; fields this version does not know are kept.
const fs = require('fs');
const path = require('path');
const { launch, open, check, results, TEST } = require('../r48/lib');
const { build, seedOf, initScript } = require('../r47/seed10b');
const ui = (tab, id = 'pMain') => ({ activeId: id, tab, repoFile: 'claudemd', view: 'project' });
const live = (pg) => pg.waitForTimeout(120).then(() => pg.textContent('#sr-live'));
(async () => {
  const b = build();
  const browser = await launch();
  const allErrs = [];
  const page = fs.readFileSync(path.join(TEST, 'mocked.html'), 'utf8');

  // 1. the script: nothing an older Safari cannot read, and a note when it cannot start
  {
    const script = page.slice(page.lastIndexOf('<script>'), page.lastIndexOf('</script>'));
    check('no lookbehind in the page\'s script', !/\(\?<[=!]/.test(script));
    const broken = path.join(__dirname, 'broken.html');
    fs.writeFileSync(broken, page.replace('const hasServer = ', 'const hasServer0 = /(?<@x)/; const hasServer = '));
    for (const reduce of [false, true]) {
      const ctx = await browser.newContext({ reducedMotion: reduce ? 'reduce' : 'no-preference' });
      const { pg } = await open(browser, broken, { ctx, wait: 1500 });
      const early = await pg.$eval('.boot-note', (e) => getComputedStyle(e).visibility);
      await pg.waitForTimeout(7200);
      const late = await pg.$eval('.boot-note', (e) => [getComputedStyle(e).visibility, e.textContent]);
      check(`a script that cannot start: after a while the page says what to do${reduce ? ' (reduced motion)' : ''}`, early === 'hidden' && late[0] === 'visible' && /update it first/.test(late[1]), [early, late[0]]);
      await ctx.close();
    }
    fs.unlinkSync(broken);
    const { pg, errs } = await open(browser, 'mocked.html', { init: initScript(seedOf(b.after), { seen: 99, ui: ui('overview') }), wait: 1200 });
    await pg.waitForTimeout(8000);
    check('when the page starts, the note never shows', (await pg.locator('.boot-note').count()) === 0);
    allErrs.push(...errs); await pg.context().close();
  }

  // 2. a large backup
  {
    const big = {};
    for (let i = 0; i < 14; i++) big['pBig' + i] = { ...JSON.parse(JSON.stringify(b.after)), name: 'Copy ' + i };
    const seed = { ...seedOf(b.after), ...big };
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
    const { pg, errs } = await open(browser, 'mocked.html', { ctx, init: initScript(seed, { seen: 99, ui: ui('overview') }), wait: 2500 });
    const t0 = Date.now();
    await pg.click('[data-act="backup"]');
    await pg.waitForSelector('#m-title');
    const ms = Date.now() - t0;
    const size = await pg.textContent('#backup-size');
    check('a large backup opens without a text box and says how big it is', !(await pg.$('#m-backup')) && /^This backup is \d+\.\d MB, too long to show here without slowing the page\. Download it or copy it\.$/.test(size), { ms, size });
    check('...and opens quickly', ms < 1500, ms);
    await pg.click('[data-act="copy-backup"]');
    await pg.waitForTimeout(400);
    const clip = await pg.evaluate(() => navigator.clipboard.readText());
    check('Copy copies the whole backup', clip.length > 400000 && JSON.parse(clip).projects.length === Object.keys(seed).length && (await pg.textContent('#toast')).startsWith('Backup copied.'), [clip.length, JSON.parse(clip).projects.length, Object.keys(seed).length]);
    await pg.click('[data-act="download-backup"]');
    await pg.waitForTimeout(300);
    const saved = await pg.evaluate(() => window.__mockLog.filter((x) => x[0] === 'save').pop());
    check('Download saves the whole backup', !!saved && saved[2] === clip.length, saved);
    await pg.click('[data-act="show-backup"]');
    await pg.waitForTimeout(300);
    check('Show the text puts it in the box, focused', (await pg.$eval('#m-backup', (e) => e.value.length)) === clip.length && (await pg.evaluate(() => document.activeElement?.id)) === 'm-backup');
    await pg.click('[data-act="close-modal"]');
    // copying refused: the text is shown and selected
    await pg.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('no')); });
    await pg.click('[data-act="backup"]');
    await pg.waitForSelector('#m-title');
    await pg.click('[data-act="copy-backup"]');
    await pg.waitForTimeout(500);
    const sel = await pg.evaluate(() => { const t = document.getElementById('m-backup'); return t && document.activeElement === t && t.selectionEnd - t.selectionStart === t.value.length; });
    check('when copying is refused, the text is shown and selected to copy by hand', sel && /The text is selected/.test(await pg.textContent('#toast')));
    allErrs.push(...errs); await ctx.close();
  }

  // 3. toasts are read out; Escape stops Claude; Skip to project; direction overrides; card focus ring
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const { pg, errs } = await open(browser, 'mocked.html', { ctx, init: initScript(seedOf(b.after), { seen: 99, ui: ui('plan') }), wait: 1500 });
    check('the toast itself is not a live region', await pg.$eval('#toast', (e) => !e.hasAttribute('aria-live') && !e.hasAttribute('role')));
    const title = await pg.locator('.ms:not(.folded) .t-title').nth(1).inputValue();
    await pg.locator('.ms:not(.folded) [data-act="del-task"]').nth(1).click();
    check('a toast is read out, with how to undo', (await live(pg)) === `Task deleted: "${title}". To undo, press Ctrl+Z.`, await live(pg));
    await pg.keyboard.press('Control+z');
    await pg.waitForTimeout(200);
    check('...and "Undone." is read out too', (await live(pg)) === 'Undone.', await live(pg));
    // Skip to project
    const first = await pg.evaluate(() => [...document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')].find((e) => e.tabIndex >= 0 && !e.disabled)?.textContent);
    const unseen = await pg.$eval('.skip', (e) => e.getBoundingClientRect().width <= 1);
    await pg.focus('.skip');
    await pg.waitForTimeout(100);
    const skip = await pg.$eval('.skip', (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
    check('Skip to project comes first, and shows when focused', first === 'Skip to project' && unseen && skip[0] > 60 && skip[1] >= 28, [first, unseen, skip]);
    await pg.keyboard.press('Enter');
    check('Skip to project goes to the project\'s tabs', (await pg.evaluate(() => document.activeElement?.id)) === 'tab-plan');
    check('...and it is out of sight again', await pg.$eval('.skip', (e) => e.getBoundingClientRect().width <= 1));
    // Escape while Claude splits a task
    await pg.evaluate(() => { window.__SAMPLE_DELAY__ = 6000; });
    await pg.locator('[data-act="split-task"]:visible').first().click();
    await pg.waitForTimeout(200);
    const ai = pg.locator('#modal-root [data-act="split-ai"]');
    if (await ai.count()) await ai.click();
    await pg.waitForTimeout(400);
    const busy = !!(await pg.$('#modal-root [data-act="stop-split"]'));
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(300);
    const after = { open: !!(await pg.$('#modal-root .modal')), stop: !!(await pg.$('#modal-root [data-act="stop-split"]')) };
    check('Escape while Claude works in a dialog stops Claude and keeps the dialog', busy && after.open && !after.stop, { busy, after });
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(200);
    check('...and Escape again closes it', !(await pg.$('#modal-root .modal')));
    await pg.evaluate(() => { window.__SAMPLE_DELAY__ = 300; });
    // a name with a right-to-left override
    await pg.click('#tab-overview');
    await pg.fill('#f-name', 'Trail‮head');
    await pg.click('#more-btn'); await pg.click('[data-act="duplicate"]');
    await pg.waitForTimeout(300);
    const msg = await pg.textContent('#toast span');
    check('a name that flips direction cannot spill into the message', !/[‪-‮⁦-⁩]/.test(msg) && msg.startsWith('Made a copy called "Trailhead (copy)"'), msg);
    // the card focus ring: hidden only where :has() draws one on the card instead
    const rule = await pg.evaluate(() => { for (const s of document.styleSheets) { let rules = []; try { rules = [...s.cssRules]; } catch (e) { continue; } for (const r of rules) { if (r.selectorText === '.dc-open:focus-visible') return 'top'; if (r.conditionText && /:has/.test(r.conditionText) && [...r.cssRules].some((x) => x.selectorText === '.dc-open:focus-visible')) return 'supports'; } } return 'none'; });
    check('the card\'s own focus ring is removed only where :has() works', rule === 'supports', rule);
    allErrs.push(...errs); await ctx.close();
  }

  // 4. fields this version does not know survive a backup and an import
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const seed = seedOf(b.after);
    const p = seed.pMain;
    p.futureField = { kept: true };
    p.chat = [{ id: 'c1', q: 'Q?', a: 'A.', at: '2026-10-01T10:00:00Z', pinned: true }];
    p.lastReview = { at: '2026-10-01T10:00:00Z', headline: 'H', strengths: ['s'], risks: ['r'], suggestions: [{ title: 'Do it', why: 'w', type: 'task', note: 'kept' }], extra: 7 };
    const { pg, errs } = await open(browser, 'mocked.html', { ctx, init: initScript(seed, { seen: 99, ui: ui('overview') }), wait: 1500 });
    await pg.click('[data-act="backup"]');
    await pg.waitForSelector('#m-backup');
    const text = await pg.$eval('#m-backup', (e) => e.value);
    const main = JSON.parse(text).projects.find((x) => x.name === 'Trailhead');
    check('a backup keeps fields this version does not know', main.futureField?.kept === true && main.chat[0].pinned === true && main.lastReview.extra === 7 && main.lastReview.suggestions[0].note === 'kept');
    allErrs.push(...errs); await ctx.close();
  }

  check('no page errors', allErrs.length === 0, allErrs);
  await browser.close();
  const fails = results.filter((r) => !r.ok).length;
  console.log(`${results.length - fails}/${results.length} passed`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
