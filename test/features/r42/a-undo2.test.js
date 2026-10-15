// Round 42: Undo within keyboard reach (review 9a H1, M6)
const { launch, open, check } = require('./lib');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const seedOf = (o) => `window.__SEED__ = ${JSON.stringify(o)};`;
const doc = (pg, id = 'p-a') => pg.evaluate((k) => window.__mockDocs.get(k), id);
const toastText = (pg) => pg.textContent('#toast span').then(norm);
const proj = { kind: 'project', name: 'Pantry Planner', pitch: 'Plan meals from the pantry.', audience: 'Me', problem: 'Food goes off.', doneWhen: 'A week is planned.', guideHidden: true,
  features: [{ id: 'f1', title: 'Shelf view', priority: 'must' }, { id: 'f2', title: 'Low stock list', priority: 'must' }, { id: 'f3', title: 'Week plan', priority: 'must' }],
  milestones: [{ id: 'm1', title: 'Basics', tasks: [{ id: 't1', title: 'First', size: 'S' }, { id: 't2', title: 'Second', size: 'S' }, { id: 't3', title: 'Third', size: 'S' }] }],
  bugs: [{ id: 'b1', title: 'Counts are off', severity: 'major' }, { id: 'b2', title: 'Shelf names cut off', severity: 'minor' }],
  lessons: [{ id: 'l1', date: '2026-10-01', happened: 'It renamed files', change: '' }, { id: 'l2', date: '2026-10-02', happened: 'It skipped the tests', change: '' }],
  sessions: [{ id: 's1', date: '2026-10-01', task: 'First', outcome: 'done', summary: 'a' }, { id: 's2', date: '2026-10-02', task: 'Second', outcome: 'done', summary: 'b' }] };
const ids = (d) => d.milestones[0].tasks.map((t) => t.id).join();
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf({ 'p-a': proj }), wait: 700 });
    await pg.click('#tab-plan');
    await pg.focus('[data-act="del-task"][data-tid="t2"]');
    await pg.keyboard.press('Enter');
    await pg.waitForTimeout(100);
    check('the toast names the deleted task', (await toastText(pg)) === 'Task deleted: "Second".', await toastText(pg));
    check('focus goes to the task above, by its title, not to another Delete', (await fa(pg)) === 'TEXTAREA#f-milestones-m1-tasks-t1-title', await fa(pg));
    await pg.keyboard.press('Enter');
    await pg.waitForTimeout(1700);
    check('so a second Enter deletes nothing', /^t1,.*t3$/.test(ids(await doc(pg))) && (await doc(pg)).milestones[0].tasks.some((t) => t.id === 't3'), ids(await doc(pg)));
    // Ctrl+Z after the toast has gone
    await pg.waitForTimeout(8500);
    check('the toast has gone', !(await pg.isVisible('#toast')));
    await pg.focus('#tab-plan');
    await pg.keyboard.press('Control+z');
    await pg.waitForTimeout(1700);
    check('Ctrl+Z still brings the task back', (await doc(pg)).milestones[0].tasks.some((t) => t.id === 't2') && /^Undone\./.test(await toastText(pg)), ids(await doc(pg)));
    check('and focus lands on it', (await fa(pg)) === 'TEXTAREA#f-milestones-m1-tasks-t2-title', await fa(pg));
    await pg.keyboard.press('Control+z');
    await pg.waitForTimeout(150);
    check('a second Ctrl+Z in the field is the browser\'s own, not the app\'s', (await doc(pg)).milestones[0].tasks.some((t) => t.id === 't2'));
    // typing keeps the browser's undo
    await pg.focus('[data-act="del-task"][data-tid="t3"]');
    await pg.keyboard.press('Enter');
    await pg.waitForTimeout(100);
    await pg.focus('#f-milestones-m1-tasks-t2-title');
    await pg.keyboard.press('End'); await pg.keyboard.type('x');
    await pg.keyboard.press('Control+z');
    await pg.waitForTimeout(1700);
    check('Ctrl+Z inside a text field does not undo the delete', !(await doc(pg)).milestones[0].tasks.some((t) => t.id === 't3'));
    check('the Undo button says its shortcut', /^Undo \((Ctrl|Cmd)\+Z\)$/.test(await pg.getAttribute('#toast .toast-btn', 'title')) && (await pg.getAttribute('#toast .toast-btn', 'aria-keyshortcuts')) === 'Control+Z Meta+Z');
    // the other lists
    await pg.click('#tab-design');
    await pg.focus('[data-act="del-feature"][data-id="f2"]');
    await pg.keyboard.press('Enter');
    await pg.waitForTimeout(100);
    check('a feature: toast names it, focus on the feature above', (await toastText(pg)) === 'Feature deleted: "Low stock list".' && (await fa(pg)) === 'TEXTAREA#f-features-f1-title', [await toastText(pg), await fa(pg)]);
    await pg.focus('[data-act="del-feature"][data-id="f1"]');
    await pg.keyboard.press('Enter');
    await pg.waitForTimeout(100);
    check('the first one: focus on the one below', (await fa(pg)) === 'TEXTAREA#f-features-f3-title', await fa(pg));
    await pg.click('#tab-plan');
    await pg.focus('[data-act="del-bug"][data-id="b1"]');
    await pg.keyboard.press('Enter');
    await pg.waitForTimeout(100);
    check('a bug: focus on the other bug', /^(INPUT|TEXTAREA)#f-bugs-b2-title$/.test(await fa(pg)), await fa(pg));
    await pg.focus('[data-act="del-bug"][data-id="b2"]');
    await pg.keyboard.press('Enter');
    await pg.waitForTimeout(100);
    check('the last bug: focus on Add a bug', /\[add-bug\]/.test(await fa(pg)), await fa(pg));
    await pg.click('#tab-improve');
    await pg.focus('[data-act="del-lesson"][data-id="l2"]');
    await pg.keyboard.press('Enter');
    await pg.waitForTimeout(100);
    check('a lesson: toast names it, focus on the lesson above', (await toastText(pg)) === 'Lesson deleted: "It skipped the tests".' && /#f-lessons-l1-happened$/.test(await fa(pg)), [await toastText(pg), await fa(pg)]);
    await pg.focus('[data-act="del-session"][data-id="s2"]');
    await pg.keyboard.press('Enter');
    await pg.waitForTimeout(100);
    check('a session: focus goes to Log a session, never to another Delete', /\[log-session\]/.test(await fa(pg)), await fa(pg));
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  // Undo from inside a dialog, and the toast clear of the dialog at any width
  for (const vp of [{ width: 1280, height: 900 }, { width: 640, height: 450 }]) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: vp.width === 640 ? 2 : 1, permissions: ['clipboard-read', 'clipboard-write'] });
    const { pg, errs } = await open(b, 'mocked.html', { ctx, init: seedOf({ 'p-a': proj }), wait: 700 });
    await pg.click('#next-prompt');
    await pg.click('[data-act="copy-prompt"]');
    await pg.waitForTimeout(200);
    check(`${vp.width}: copying starts the task, with Undo`, /is now in progress\.$/.test(await toastText(pg)));
    const pos = await pg.evaluate(() => { const t = document.querySelector('#toast').getBoundingClientRect(); const a = document.querySelector('.modal-actions').getBoundingClientRect(); return { tt: t.top, tb: t.bottom, at: a.top, ab: a.bottom }; });
    check(`${vp.width}: the toast is at the top, clear of the dialog's buttons`, pos.tt < 80 && (pos.tb <= pos.at || pos.tt >= pos.ab), pos);
    await pg.focus('[data-act="copy-prompt"]');
    let reached = false;
    for (let i = 0; i < 12 && !reached; i++) { await pg.keyboard.press('Tab'); reached = (await fa(pg)) === 'BUTTON[undo]'; }
    check(`${vp.width}: Tab reaches Undo from inside the dialog`, reached, await fa(pg));
    await pg.keyboard.press('Tab');
    check(`${vp.width}: and goes back into the dialog after it`, await pg.evaluate(() => !!document.activeElement.closest('.modal')), await fa(pg));
    await pg.keyboard.press('Shift+Tab');
    await pg.keyboard.press('Enter');
    await pg.waitForTimeout(1700);
    check(`${vp.width}: Undo there puts the task back to do, and focus stays in the dialog`, ((await doc(pg)).milestones[0].tasks[0].status || 'todo') === 'todo' && (await pg.textContent('.next h3')).includes('First') && /Mark started/.test(await pg.textContent('.next')) && await pg.evaluate(() => !!document.activeElement.closest('.modal')), await fa(pg));
    // a hovered toast over a dialog still goes
    await pg.click('[data-act="copy-prompt"]');
    await pg.waitForTimeout(200);
    await pg.hover('#toast span');
    await pg.waitForTimeout(8600);
    check(`${vp.width}: over a dialog, the pointer does not hold the toast`, !(await pg.isVisible('#toast')));
    check('no page errors', errs.length === 0, errs);
    await ctx.close();
  }
  await b.close();
})();
