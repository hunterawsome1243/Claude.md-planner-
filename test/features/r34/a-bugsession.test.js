// Round 34: logging a bug fix, keeping a session draft, and phone polish
const { launch, open, check } = require('./lib');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
const seed = { 'p-a': { kind: 'project', name: 'Plant Pal', pitch: 'Water plants on time.', commands: 'npm test',
  bugs: [{ id: 'b1', title: 'Crash on start', severity: 'blocker' }, { id: 'b2', title: 'Wrong due date', severity: 'major' }],
  milestones: [{ id: 'm1', title: 'Basics', tasks: [{ id: 't1', title: 'List plants' }, { id: 't2', title: 'Water reminder' }] }] } };
const doc = (pg) => pg.evaluate(() => window.__mockDocs.get('p-a'));
// every run of letters, digits and punctuation inside one text node sits on one line
const noMidBreaks = (pg, sel) => pg.$$eval(sel, (els) => els.flatMap((el) => {
  const bad = [];
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const s = n.textContent;
    let top = null;
    for (let i = 0; i < s.length; i++) {
      if (/\s/.test(s[i])) { top = null; continue; }
      const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1);
      const t = Math.round(r.getBoundingClientRect().top);
      if (top !== null && Math.abs(t - top) > 3) bad.push(s.slice(Math.max(0, i - 8), i) + '⏎' + s.slice(i, i + 8));
      top = t;
    }
  }
  return bad;
}));
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(seed)};`, wait: 700 });
    // the blocker is Next up, and can be logged from there
    check('Next up offers to log the blocker', !!(await pg.$('.next [data-act="log-session"][data-bid="b1"]')));
    await pg.click('.next [data-act="log-session"][data-bid="b1"]');
    check('Next up\'s Log a session opens on the blocker', (await pg.inputValue('#ss-task')) === 'bug:b1' && (await pg.textContent('label[for="ss-task"]')) === 'Task or bug', await pg.inputValue('#ss-task'));
    check('it says done marks the bug fixed', /Note how the fix for "[^"]+" went\. Done marks the bug fixed/.test(await pg.textContent('.modal .sub')));
    check('the bugs follow the tasks, blocker first', (await pg.$$eval('#ss-task optgroup[label="Bugs"] option', (x) => x.map((o) => o.textContent))).join('|') === 'Fix: Crash on start|Fix: Wrong due date');
    await pg.fill('#ss-summary', 'Fixed the loader crash.\n\nOutcome: done\nWent wrong: nothing');
    await pg.click('[data-act="save-session"]');
    await pg.waitForTimeout(200);
    check('saving says the bug is fixed, with Undo', /Session logged\. "Crash on start" is now fixed\./.test(await pg.textContent('#toast')) && !!(await pg.$('#toast [data-act="undo"]')), await pg.textContent('#toast'));
    await pg.waitForTimeout(1600);
    let d = await doc(pg);
    check('the bug is fixed and the session names it', d.bugs[0].status === 'fixed' && d.sessions.length === 1 && d.sessions[0].bid === 'b1' && d.sessions[0].task === 'Fix: Crash on start' && d.milestones[0].tasks.every((t) => t.status !== 'done'), [d.bugs[0].status, d.sessions[0]?.task]);
    await pg.click('#toast [data-act="undo"]');
    await pg.waitForTimeout(1600);
    d = await doc(pg);
    check('Undo opens the bug again and takes the session out', d.bugs[0].status === 'open' && !d.sessions.length);
    // from the bug's prompt
    await pg.click('#tab-plan');
    await pg.click('[data-act="bug-prompt"][data-id="b2"] >> visible=true');
    check('the fix prompt dialog can log how it went', (await pg.textContent('.modal-actions [data-act="log-session"][data-bid="b2"]')) === 'Log how it went' && !!(await pg.$('.modal-actions [data-act="bug-fixed"]')));
    await pg.click('.modal-actions [data-act="log-session"]');
    check('it opens on that bug', (await pg.inputValue('#ss-task')) === 'bug:b2');
    await pg.fill('#ss-summary', 'Looked at the date maths.\n\nOutcome: stuck\nWent wrong: the stack trace pointed at the wrong file');
    await pg.click('[data-act="save-session"]');
    await pg.waitForTimeout(200);
    check('stuck leaves it open, with a lesson', /"Wrong due date" is still open\. A lesson was added on the Improve tab\./.test(await pg.textContent('#toast')), await pg.textContent('#toast'));
    await pg.waitForTimeout(1600);
    d = await doc(pg);
    check('saved as a stuck session on the bug', d.bugs[1].status === 'open' && d.sessions.at(-1).bid === 'b2' && d.sessions.at(-1).outcome === 'stuck' && d.lessons.length === 1);
    await pg.click('[data-act="bug-prompt"][data-id="b2"] >> visible=true');
    const t = await pg.inputValue('#m-prompt');
    check('the next fix prompt carries that session', /An earlier session on this bug:\n- [^\n]*stuck: Looked at the date maths\. What went wrong: the stack trace pointed at the wrong file\.\nBefore you change anything, run git status and git diff \(if this folder is in git\) to see whether the last try left changes behind\. Tell me what you find, and ask me before reverting any of it\. Then carry on from there, and learn from what went wrong before\./.test(t) && /earlier sessions on this bug/.test(await pg.textContent('.note-box')), t.split('\n').slice(2, 8));
    await pg.keyboard.press('Escape');
    // a task still works as before
    await pg.click('[data-act="prompt"][data-tid="t1"]');
    await pg.click('#modal-root [data-act="log-session"]');
    check('from a task\'s prompt it opens on the task', (await pg.inputValue('#ss-task')) === 'm1:t1' && /Note how "[^"]+" went/.test(await pg.textContent('.modal .sub')));
    // a draft survives Escape
    await pg.fill('#ss-summary', 'Half of the list works.');
    await pg.fill('#ss-wrong', 'Tests were flaky');
    await pg.keyboard.press('Escape');
    check('Escape closes it', !(await pg.$('#ss-summary')));
    await pg.click('[data-act="prompt"][data-tid="t1"]');
    await pg.click('#modal-root [data-act="log-session"]');
    check('opening it again for the task brings the text back', (await pg.inputValue('#ss-summary')) === 'Half of the list works.' && (await pg.inputValue('#ss-wrong')) === 'Tests were flaky' && /What you typed before is back\./.test(await pg.textContent('#ss-auto')), await pg.textContent('#ss-auto'));
    await pg.click('.modal-wrap', { position: { x: 5, y: 5 } }).catch(() => {});
    await pg.waitForTimeout(100);
    if (await pg.$('#ss-summary')) await pg.keyboard.press('Escape');
    await pg.click('[data-act="prompt"][data-tid="t2"]');
    await pg.click('#modal-root [data-act="log-session"]');
    check('another task starts empty', (await pg.inputValue('#ss-summary')) === '' && (await pg.inputValue('#ss-task')) === 'm1:t2');
    await pg.selectOption('#ss-task', 'm1:t1');
    await pg.waitForTimeout(100);
    check('choosing the first task brings its text back', (await pg.inputValue('#ss-summary')) === 'Half of the list works.', await pg.inputValue('#ss-summary'));
    await pg.click('#modal-root input[name="ss-outcome"][value="partly"]');
    await pg.click('[data-act="save-session"]');
    await pg.waitForTimeout(200);
    await pg.click('[data-act="prompt"][data-tid="t1"]');
    await pg.click('#modal-root [data-act="log-session"]');
    check('after saving, the draft is gone', (await pg.inputValue('#ss-summary')) === '');
    await pg.keyboard.press('Escape');
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  for (const scheme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 375, height: 800 }, colorScheme: scheme });
    const { pg, errs } = await open(b, 'mocked.html', { ctx, init: `window.__SEED__ = ${JSON.stringify(seed)};`, wait: 700 });
    const tabs = await pg.$eval('.tabs', (e) => [e.scrollWidth, e.clientWidth]);
    check(`${scheme} 375px: the five tabs fit`, tabs[0] <= tabs[1], tabs);
    const box = await pg.$eval('#tab-improve', (e) => { const r = e.getBoundingClientRect(); return [r.right, document.querySelector('.tabs').getBoundingClientRect().right]; });
    check(`${scheme} 375px: Improve is in view`, box[0] <= box[1] + 0.5, box);
    await pg.click('#tab-claudemd');
    const paths = await noMidBreaks(pg, '.file-tab code');
    check(`${scheme} 375px: file paths break only at / and .`, paths.length === 0, paths.slice(0, 5));
    check(`${scheme} 375px: no sideways scroll`, await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await pg.click('[data-act="cc-setup"] >> visible=true');
    const cmds = await noMidBreaks(pg, '.cc-code');
    check(`${scheme} 375px: install commands break only after a slash`, cmds.length === 0, cmds.slice(0, 5));
    check(`${scheme} 375px: copying still gives the plain command`, (await pg.textContent('#cc-unix')) === 'curl -fsSL https://claude.ai/install.sh | bash');
    check('no page errors', errs.length === 0, errs);
    await ctx.close();
  }
  await b.close();
})();
