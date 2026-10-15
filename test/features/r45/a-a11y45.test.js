// Round 45: the rest of review 9a: Claude's work heard, buttons named by their item, lists kept, fields Sam can see, rem text
const { launch, open, check } = require('./lib');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const seedOf = (o, extra = '') => `window.__SEED__ = ${JSON.stringify(o)};${extra}`;
const live = (pg) => pg.textContent('#sr-live').then(norm);
const btn = (pg, name) => pg.getByRole('button', { name, exact: true }).count();
const proj = () => ({ kind: 'project', name: 'Pantry Planner', pitch: 'Plan meals from the pantry.', audience: 'Me', problem: 'Food goes off.', doneWhen: 'A week is planned.', guideHidden: true, updatedAt: new Date().toISOString(),
  features: [{ id: 'f1', title: 'Shelf view', priority: 'must' }, { id: 'f2', title: 'Low stock list', priority: 'should' }],
  milestones: [{ id: 'm1', title: 'Basics', tasks: [{ id: 't1', title: 'Shelf view', size: 'S', status: 'done' }, { id: 't2', title: 'Low stock list', size: 'M' }, { id: 't3', title: 'Week plan', size: 'L' }] },
    { id: 'm2', title: 'Sharing', tasks: [{ id: 't4', title: 'Share the list', size: 'S' }] }],
  bugs: [{ id: 'b1', title: 'Counts are off', severity: 'major' }],
  decisions: [{ id: 'd1', text: 'Use SQLite', why: 'Simple' }],
  lessons: [{ id: 'l1', date: '2026-10-01', happened: 'It skipped the tests', change: 'Run the tests first' }, { id: 'l2', date: '2026-10-02', happened: 'It renamed files', change: '' }],
  sessions: [{ id: 's1', date: '2026-10-02', mid: 'm1', tid: 't2', task: 'Low stock list', outcome: 'stuck', summary: 'Got lost', wrong: 'It renamed files' }] });
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf({ 'p-a': proj() }), wait: 700 });
    // names that say which item a button acts on
    await pg.click('#tab-plan');
    check('a task\'s status says its task', (await btn(pg, 'To do Week plan')) === 1 && (await btn(pg, 'Done Shelf view')) === 1);
    check('so does its notes button', (await btn(pg, 'Show notes and moving Week plan')) === 1);
    check('milestone buttons say which milestone', (await btn(pg, 'Move milestone 2 up')) === 1 && (await btn(pg, 'Delete milestone 1')) === 1 && (await btn(pg, 'Add task to milestone 2')) === 1);
    check('a bug\'s status and details say which bug', (await btn(pg, 'Open. Mark fixed: Counts are off')) === 1 && (await btn(pg, 'Show details Counts are off')) === 1);
    check('tasks and bugs are list items named by their title, not groups', (await pg.getByRole('listitem', { name: 'Week plan', exact: true }).count()) === 1 && (await pg.getByRole('listitem', { name: 'Counts are off', exact: true }).count()) === 1 && (await pg.$$('#sheet li[role="group"]')).length === 0);
    await pg.click('#tab-design');
    check('Design has a Features heading above Must have', (await pg.getByRole('heading', { name: 'Features', level: 2 }).count()) === 1);
    check('each Add feature says where it adds', (await btn(pg, 'Add feature to Must have')) === 1 && (await btn(pg, 'Add feature to Could have')) === 1);
    check('a feature\'s status says its feature', (await btn(pg, 'To do Low stock list')) === 1);
    check('Delete decision says which', (await btn(pg, 'Delete decision Use SQLite')) === 1);
    await pg.click('#tab-improve');
    check('lesson buttons say which lesson', (await btn(pg, 'Delete lesson It renamed files')) === 1 && (await btn(pg, 'Add to CLAUDE.md It skipped the tests')) === 1);
    const go = await pg.$$eval('[data-act="tab"][id^="ck-"]', (x) => x.map((e) => e.getAttribute('aria-labelledby')));
    check('each plan check\'s button names its check', go.length > 0 && go.every((v) => /^ck-\d+-go ck-\d+$/.test(v)), go);
    // Claude's review: heard when it starts and when it is back
    await pg.click('[data-act="ai-review"]');
    await pg.waitForTimeout(120);
    check('the working line is not a live region; its Stop says what it stops', !(await pg.$('.working[role="status"]')) && (await btn(pg, 'Stop reviewing your project')) === 1 && (await fa(pg)) === 'BUTTON[stop]', await fa(pg));
    check('the start is read out once', (await live(pg)) === 'Claude is reviewing your project…', await live(pg));
    await pg.waitForTimeout(600);
    check('the end is read out, and focus goes to the review heading', (await live(pg)) === "Claude's review is ready, with 3 suggestions." && (await fa(pg)) === 'H2#review-h', [await live(pg), await fa(pg)]);
    check('suggestion buttons name their suggestion', (await btn(pg, 'Add to plan Add a smoke test')) === 1 && (await btn(pg, 'Add rule Only change files the task names')) === 1);
    // milestones from Claude
    await pg.click('#tab-plan');
    await pg.click('[data-act="ai-plan"]');
    await pg.waitForTimeout(120);
    check('Stop drafting milestones', (await btn(pg, 'Stop drafting milestones')) === 1 && (await live(pg)) === 'Claude is drafting milestones…', await live(pg));
    await pg.waitForTimeout(600);
    check('the list arrives: heard, and focus on its heading', (await live(pg)) === 'Claude suggests 2 milestones. Choose which to add.' && (await fa(pg)) === 'H3#prop-plan-h', [await live(pg), await fa(pg)]);
    check('the accept button says what it adds', norm(await pg.textContent('[data-act="prop-accept"]')) === 'Add 2 milestones');
    await pg.locator('[data-act="prop-toggle"]').first().uncheck();
    check('and counts down', norm(await pg.textContent('[data-act="prop-accept"]')) === 'Add 1 milestone');
    await pg.click('[data-act="prop-discard"]');
    await pg.click('#tab-design');
    await pg.click('[data-act="ai-features"]');
    await pg.waitForTimeout(700);
    check('features: heard, heading focused, button named', (await live(pg)) === 'Claude suggests 2 features. Choose which to add.' && (await fa(pg)) === 'H3#prop-features-h' && norm(await pg.textContent('[data-act="prop-accept"][data-kind="features"]')) === 'Add 2 features', [await live(pg), await fa(pg)]);
    await pg.click('[data-act="prop-discard"]');
    await pg.click('[data-act="ai-model"]');
    await pg.waitForTimeout(700);
    check('data model: heard, heading focused, button named', /^Claude suggests \d things for the data model\. Choose which to add\.$/.test(await live(pg)) && (await fa(pg)) === 'H3#prop-model-h' && /^Add \d things to the data model$/.test(norm(await pg.textContent('[data-act="prop-accept"][data-kind="model"]'))), [await live(pg), await fa(pg)]);
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf({ 'p-a': proj() }), wait: 700 });
    await pg.click('#tab-plan');
    // the prompt dialog's note is part of its description
    await pg.click('[data-act="prompt"][data-tid="t2"]');
    check('the prompt dialog is described by its sub line and its note', (await pg.getAttribute('#modal-root .modal', 'aria-describedby')) === 'm-sub m-note' && /earlier sessions on this task/.test(await pg.textContent('#m-note')), await pg.getAttribute('#modal-root .modal', 'aria-describedby'));
    await pg.keyboard.press('Escape');
    // Split: focus goes to Claude's list
    await pg.click('[data-act="split-task"][data-tid="t3"]');
    await pg.waitForTimeout(80);
    if (await pg.$('[data-act="split-ai"]')) await pg.click('[data-act="split-ai"]');
    await pg.waitForTimeout(120);
    check('splitting is heard, with a named Stop', (await live(pg)) === 'Claude is splitting the task…' && (await btn(pg, 'Stop splitting the task')) === 1, await live(pg));
    await pg.waitForTimeout(600);
    check('the split arrives on its heading', (await fa(pg)) === 'H3#sp-h' && (await live(pg)) === 'Claude suggests 3 smaller tasks.', [await fa(pg), await live(pg)]);
    await pg.keyboard.press('Escape');
    // follow-ups after a session
    await pg.click('[data-act="prompt"][data-tid="t2"]');
    await pg.click('#modal-root [data-act="log-session"]');
    await pg.fill('#ss-summary', 'Done.\n\nOutcome: done\nWent wrong: nothing');
    await pg.click('[data-act="save-session-ai"]');
    await pg.waitForTimeout(900);
    check('follow-ups arrive on their heading', (await fa(pg)) === 'H3#fu-h' && (await live(pg)) === 'Claude suggests 3 follow-ups.', [await fa(pg), await live(pg)]);
    check('the button says what it adds', norm(await pg.textContent('[data-act="session-accept"]')) === 'Add 2 tasks and the rule');
    await pg.click('[data-act="session-pick"][data-k="rule"]');
    check('without the rule', norm(await pg.textContent('[data-act="session-accept"]')) === 'Add 2 tasks');
    await pg.click('[data-act="session-pick"][data-k="t0"]'); await pg.click('[data-act="session-pick"][data-k="t1"]');
    check('nothing picked', norm(await pg.textContent('[data-act="session-accept"]')) === 'Add none' && await pg.isDisabled('[data-act="session-accept"]'));
    await pg.click('[data-act="session-pick"][data-k="rule"]');
    check('only the rule', norm(await pg.textContent('[data-act="session-accept"]')) === 'Add the rule');
    await pg.keyboard.press('Escape');
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    // a finished milestone's Show tasks, and the plan check count
    const p = proj(); p.milestones[0].tasks.forEach((t) => { t.status = 'done'; });
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf({ 'p-a': p }), wait: 700 });
    const n = await pg.getAttribute('.facts [data-act="tab"][data-k="improve"]', 'aria-label');
    const vis = norm(await pg.textContent('.facts [data-act="tab"][data-k="improve"]'));
    check('the plan check count is named with its own words', n.startsWith(vis + ' plan checks passed'), [vis, n]);
    await pg.click('#tab-plan');
    check('Show tasks is named "Show tasks of milestone 1"', (await btn(pg, 'Show tasks of milestone 1')) === 1);
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    // what Sam sees: 3:1 field edges, a mark under flat fields, a 2px focus ring, the current project marked
    for (const scheme of ['light', 'dark']) {
      const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme });
      const { pg, errs } = await open(b, 'mocked.html', { ctx, init: seedOf({ 'p-a': proj() }), wait: 700 });
      const r = await pg.evaluate(() => {
        const lum = (c) => { const m = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
        const cr = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
        const pitch = getComputedStyle(document.querySelector('#f-audience'));
        const panel = getComputedStyle(document.querySelector('.panel') || document.body).backgroundColor;
        const cur = getComputedStyle(document.querySelector('#plist [aria-current="true"]'));
        return { field: Math.min(cr(pitch.borderTopColor, pitch.backgroundColor), cr(pitch.borderTopColor, panel)), bodyBg: getComputedStyle(document.body).backgroundColor, cur: cur.boxShadow };
      });
      check(`${scheme}: text box edges at 3:1 or more`, r.field >= 3, r);
      check(`${scheme}: the current project has a bar`, /inset/.test(r.cur) && /3px/.test(r.cur), r.cur);
      await pg.click('#tab-plan');
      const f = await pg.evaluate(() => { const s = getComputedStyle(document.querySelector('.t-title')); return { style: s.borderBottomStyle, w: s.borderBottomWidth }; });
      check(`${scheme}: task titles have a mark under them`, f.style === 'dashed' && f.w === '1px', f);
      await pg.focus('#f-milestones-m1-tasks-t2-title');
      const ring = await pg.evaluate(() => { const s = getComputedStyle(document.activeElement); return { b: s.borderTopColor, sh: s.boxShadow, bs: s.borderBottomStyle }; });
      check(`${scheme}: focus draws a 2px accent ring`, /0px 0px 0px 1px/.test(ring.sh) && ring.bs === 'solid', ring);
      check('no page errors', errs.length === 0, errs);
      await ctx.close();
    }
  }
  {
    // the browser's text size: 24px instead of 16px makes text half as large again
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf({ 'p-a': proj() }) + `document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = 'html { font-size: 24px; }'; document.head.append(s); });`, wait: 700 });
    const fs = await pg.evaluate(() => ({ body: getComputedStyle(document.body).fontSize, hint: getComputedStyle(document.querySelector('.hint') || document.body).fontSize, lbl: getComputedStyle(document.querySelector('.lbl')).fontSize, tab: getComputedStyle(document.querySelector('.tab')).fontSize }));
    check('text follows the root size', fs.body === '24px' && fs.lbl === '18px' && fs.tab === '21px', fs);
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    // text spacing applied after the page is drawn: one-line fields grow with it, nothing is cut off
    const ctx = await b.newContext({ viewport: { width: 640, height: 900 } });
    const p = proj(); p.milestones[0].tasks[2].title = 'Lay out the week plan with a column for each day and a row for each meal of that day';
    const { pg, errs } = await open(b, 'mocked.html', { ctx, init: seedOf({ 'p-a': p }), wait: 700 });
    await pg.click('#tab-plan');
    await pg.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }' });
    await pg.waitForTimeout(150);
    const cut = await pg.$$eval('#sheet textarea.one', (x) => x.filter((e) => e.scrollHeight > e.clientHeight + 1).map((e) => e.id));
    check('no one-line field is cut off after spacing changes', cut.length === 0, cut);
    check('no page errors', errs.length === 0, errs);
    await ctx.close();
  }
  {
    // What's new
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf({ 'p-a': proj() }) + `localStorage.setItem('shipyard.seen.v1', '10');`, wait: 700 });
    check('a returning viewer sees the dot', (await pg.$$('#rail .new-dot')).length === 1);
    await pg.click('#rail [data-act="whats-new"]');
    check('the new entries lead, newest first (round 51: Version 12 came after)', await pg.$$eval('.modal > .wn-list > li h3', (x) => x.length === 23 && x[0].textContent.startsWith("Help, in one place") && x[22].textContent.startsWith('Easier to see and to hear')));
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  await b.close();
})();
