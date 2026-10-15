// Round 49: Find in a project (review 10b M4), on review 10b's Trailhead data (80 tasks, 70 sessions, 15 bugs)
const { launch, open, check, results } = require('../r48/lib');
const { build, seedOf, initScript } = require('../r47/seed10b');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const hits = (pg) => pg.evaluate(() => [...document.querySelectorAll('#find-results .find-hit')].map((x) => ({ k: x.querySelector('.fk').textContent, n: x.querySelector('b').textContent, s: x.querySelector('.fs')?.textContent || '' })));
async function find(pg, q) {
  if (!(await pg.isVisible('#find-q'))) { await pg.keyboard.press('Control+k'); await pg.waitForTimeout(100); }
  await pg.fill('#find-q', q);
  await pg.waitForTimeout(80);
}
async function go(pg, pred) {
  const i = await pg.evaluate((src) => { const f = new Function('x', 'return ' + src); return [...document.querySelectorAll('#find-results .find-hit')].findIndex((b) => f({ k: b.querySelector('.fk').textContent, n: b.querySelector('b').textContent, s: b.querySelector('.fs')?.textContent || '' })); }, pred);
  if (i < 0) return false;
  await pg.click(`#find-results .find-hit[data-i="${i}"]`);
  await pg.waitForTimeout(150);
  return true;
}
(async () => {
  const b = build();
  const browser = await launch();
  {
    const { pg, errs } = await open(browser, 'mocked.html', { init: initScript(seedOf(b.after)), viewport: { width: 1280, height: 800 }, wait: 1300 });
    check('the header has Find, with its shortcut', await pg.isVisible('.phead [data-act="find"]') && (await pg.getAttribute('.phead [data-act="find"]', 'aria-keyshortcuts')).includes('Control+K'));
    await pg.click('#tab-plan');
    await pg.keyboard.press('Control+k');
    await pg.waitForTimeout(150);
    check('Ctrl+K opens Find, with the cursor in its box', (await pg.textContent('#m-title')) === 'Find in Trailhead' && (await fa(pg)) === 'INPUT#find-q', await fa(pg));
    check('...which asks for words first', (await pg.textContent('#find-n')) === 'Type a word or two.');
    await pg.keyboard.type('share link');
    await pg.waitForTimeout(500);
    const h1 = await hits(pg);
    check('a search finds tasks, bugs, sessions, decisions, lessons and Claude\'s answers', ['Task ·', 'Bug ·', 'Session ·', 'Decision', 'Lesson ·', 'Asked Claude'].every((k) => h1.some((x) => x.k.startsWith(k))), [...new Set(h1.map((x) => x.k.split(' ·')[0]))]);
    check('...every one holding both words', h1.every((x) => /share/i.test(x.n + x.s) && /link/i.test(x.n + x.s)));
    check('...the ones named with them first', /share/i.test(h1[0].n) && /link/i.test(h1[0].n), h1.slice(0, 3));
    check('...with the words marked', await pg.evaluate(() => [...document.querySelectorAll('#find-results mark')].length > 4 && [...document.querySelectorAll('#find-results mark')].every((m) => /^(share|link)/i.test(m.textContent))));
    check('...and the count said', /^\d+ matches\.$/.test(await pg.textContent('#find-n')), await pg.textContent('#find-n'));
    // keyboard: down into the list, up back to the box
    await pg.keyboard.press('ArrowDown');
    check('Down moves into the results', (await fa(pg)) === 'BUTTON[find-go]');
    await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('ArrowUp'); await pg.keyboard.press('ArrowUp');
    check('...Up goes back to the box', (await fa(pg)) === 'INPUT#find-q');
    // Enter opens the first one
    const first = h1[0];
    await pg.keyboard.press('Enter');
    await pg.waitForTimeout(200);
    check('Enter opens the first result, with the cursor on it', !(await pg.isVisible('#find-q')) && (await pg.evaluate(() => document.activeElement.value || document.activeElement.textContent)) === first.n, { first, at: await fa(pg) });
    // a task in a finished, folded milestone
    await pg.keyboard.press('Control+k');
    await pg.waitForTimeout(100);
    check('Find opens again on the words from last time, selected so typing replaces them', (await pg.inputValue('#find-q')) === 'share link' && (await pg.evaluate(() => { const e = document.querySelector('#find-q'); return e.selectionStart === 0 && e.selectionEnd === e.value.length; })) && (await hits(pg)).length === h1.length);
    await find(pg, 'starter page real layout');
    await go(pg, "x.k.startsWith('Task · Milestone 1')");
    check('a task in a finished milestone: the milestone unfolds and the cursor is on the task', (await fa(pg)) === 'TEXTAREA#f-milestones-m1-tasks-t1-03-title' && (await pg.getAttribute('#tab-plan', 'aria-selected')) === 'true', await fa(pg));
    // a task's notes
    await find(pg, 'vite passes');
    const ok = await go(pg, "x.k.startsWith('Task') && /passes/.test(x.s)");
    check('a match in a task\'s notes opens them, with the cursor in them', ok && (await fa(pg)) === 'TEXTAREA#f-milestones-m1-tasks-t1-01-notes', await fa(pg));
    // a fixed bug, while fixed bugs are hidden
    await pg.reload(); await pg.waitForTimeout(1300);
    await pg.click('#tab-plan');
    const fixedHidden = !(await pg.evaluate(() => [...document.querySelectorAll('.b-title')].some((x) => x.value === 'Map is blank after switching tabs')));
    await find(pg, 'map blank');
    await go(pg, "x.k === 'Bug · Fixed'");
    check('a fixed bug shows the fixed bugs, with the cursor on it', fixedHidden && (await fa(pg)) === 'TEXTAREA#f-bugs-b05-title', { fixedHidden, at: await fa(pg) });
    // a bug's details
    await find(pg, 'gpx.length');
    await go(pg, "x.k.startsWith('Bug')");
    check('a match in a bug\'s details opens them, at that field', (await fa(pg)) === 'TEXTAREA#f-bugs-b15-error', await fa(pg));
    // an old session, beyond the latest 20
    await find(pg, 'Add Vitest with one passing test');
    await go(pg, "x.k.startsWith('Session · Jul 13')");
    check('an old session shows all sessions on Improve, with the cursor on it', (await pg.getAttribute('#tab-improve', 'aria-selected')) === 'true' && (await fa(pg)) === 'B#f-sessions-x003-task', await fa(pg));
    check('...and is lit up for a moment', await pg.evaluate(() => !!document.querySelector('.session.found')));
    // the brief, a lesson, a decision, a feature, a prompt, Claude's answer
    await find(pg, 'leaflet');
    await go(pg, "x.k === 'Brief' && x.n === 'Tech stack'");
    check('a brief field opens Overview at it', (await fa(pg)) === 'TEXTAREA#f-stack' && (await pg.getAttribute('#tab-overview', 'aria-selected')) === 'true', await fa(pg));
    await find(pg, 'date library');
    await go(pg, "x.k.startsWith('Lesson')");
    check('a lesson', /^TEXTAREA#f-lessons-[\w-]+-happened$/.test(await fa(pg)), await fa(pg));
    await find(pg, 'expire 30 days');
    await go(pg, "x.k.startsWith('Decision')");
    check('a decision opens Design at it', (await fa(pg)) === 'TEXTAREA#f-decisions-d7-text', await fa(pg));
    await find(pg, 'offline mode');
    await go(pg, "x.k.startsWith('Feature')");
    check('a feature', (await fa(pg)) === 'TEXTAREA#f-features-f7-title' || (await fa(pg)) === 'INPUT#f-features-f7-title', await fa(pg));
    await find(pg, 'fixtures/gpx');
    await go(pg, "x.k === 'Your prompt'");
    check('a saved prompt, at its text', (await fa(pg)) === 'TEXTAREA#f-prompts-q3-text', await fa(pg));
    await find(pg, 'store share links');
    await go(pg, "x.k === 'Asked Claude'");
    check('Claude\'s answer', (await fa(pg)) === 'DIV#f-chat-c2-a', await fa(pg));
    await find(pg, 'Trip difficulty');
    await go(pg, "x.k === 'Data model'");
    check('the data model', (await fa(pg)) === 'TEXTAREA#f-entities-e1-fields', await fa(pg));
    // nothing found
    await find(pg, 'kangaroo');
    await pg.waitForTimeout(500);
    check('no match says what to try', (await pg.textContent('#find-n')) === 'Nothing matches. Try fewer or shorter words.' && (await hits(pg)).length === 0);
    // too many
    await find(pg, 'a');
    await pg.waitForTimeout(500);
    check('many matches are capped, and it says so', /^60 of \d+ matches shown\. Add a word to narrow it\.$/.test(await pg.textContent('#find-n')) && (await hits(pg)).length === 60, await pg.textContent('#find-n'));
    // Escape closes it and returns focus
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(100);
    check('Escape closes Find and puts focus back', !(await pg.isVisible('#find-q')) && (await fa(pg)) !== 'BODY', await fa(pg));
    // / opens it outside a field, not inside one
    await pg.click('#tab-plan');
    await pg.keyboard.press('/');
    await pg.waitForTimeout(100);
    check('/ opens Find outside a field', await pg.isVisible('#find-q'));
    await pg.keyboard.press('Escape');
    await pg.click('#f-milestones-m6-tasks-t6-01-title');
    await pg.keyboard.press('End');
    await pg.keyboard.press('/');
    await pg.waitForTimeout(100);
    check('...and types a slash inside one', !(await pg.isVisible('#find-q')) && (await pg.inputValue('#f-milestones-m6-tasks-t6-01-title')).endsWith('/'));
    await pg.keyboard.press('Backspace');
    // the dialog keeps Tab inside it
    await pg.keyboard.press('Control+k');
    await pg.waitForTimeout(100);
    check('the dialog is labelled and keeps the page behind it inert', (await pg.evaluate(() => document.querySelector('#app').inert)) && !!(await pg.$('#modal-root [role="dialog"][aria-labelledby="m-title"]')));
    await pg.keyboard.press('Escape');
    // All projects has no Find
    await pg.click('[data-act="open-all"]');
    await pg.waitForTimeout(150);
    await pg.keyboard.press('Control+k');
    await pg.waitForTimeout(100);
    check('All projects: Ctrl+K does nothing', !(await pg.isVisible('#find-q')));
    check('no page errors', !errs.length, errs);
    await pg.context().close();
  }
  // phone
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const { pg, errs } = await open(browser, 'mocked.html', { ctx, init: initScript(seedOf(b.after)), wait: 1300 });
    const btn = await pg.evaluate(() => { const x = document.querySelector('.phead [data-act="find"]'); const r = x.getBoundingClientRect(); const n = document.querySelector('#f-name').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), row: r.top < n.bottom, name: x.textContent.trim() }; });
    check('on a phone Find is an icon button beside the name, named Find', btn.w >= 40 && btn.h >= 40 && btn.row && btn.name === 'Find', btn);
    await pg.tap('.phead [data-act="find"]');
    await pg.waitForTimeout(150);
    await pg.fill('#find-q', 'share link');
    await pg.waitForTimeout(500);
    check('the results fit the screen', await pg.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth + 1 && document.querySelector('.find-list').getBoundingClientRect().right <= innerWidth));
    await pg.tap('#find-results .find-hit[data-i="0"]');
    await pg.waitForTimeout(200);
    check('a tap opens the result', !(await pg.isVisible('#find-q')) && (await fa(pg)) !== 'BODY', await fa(pg));
    check('no page errors (phone)', !errs.length, errs);
    await ctx.close();
  }
  await browser.close();
  const fails = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - fails} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})();
