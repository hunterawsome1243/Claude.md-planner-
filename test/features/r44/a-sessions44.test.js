// Round 44: sessions on the right task and day, what Claude sees on a large project (review 9b M7, M8, M10, L11, L12; 9a M3, L10)
const fs = require('fs');
const path = require('path');
const { launch, open, check } = require('./lib');
const TEST = process.env.TESTDIR || path.join(__dirname, '..', '..');
const VAR = path.join(__dirname, 'hooked.html');
{ const src = fs.readFileSync(path.join(TEST, 'mocked.html'), 'utf8'); const i = src.lastIndexOf('initCapabilities();\n})();');
  fs.writeFileSync(VAR, src.slice(0, i) + 'window.__T = { contextOf, active };\n' + src.slice(i)); }
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const clip = `Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__copied = t; } }, configurable: true });`;
const seedOf = (o, extra = '') => `window.__SEED__ = ${JSON.stringify(o)};${extra}`;
const doc = (pg, id = 'p-a') => pg.evaluate((k) => window.__mockDocs.get(k), id);
const day = (n) => { const t = new Date(); t.setDate(t.getDate() - n); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
const task = (d, mid, tid) => d.milestones.find((m) => m.id === mid).tasks.find((t) => t.id === tid);
const proj = () => ({ kind: 'project', name: 'Pantry Planner', pitch: 'Plan meals from the pantry.', audience: 'Me', problem: 'Food goes off.', doneWhen: 'A week is planned.', guideHidden: true, updatedAt: new Date().toISOString(),
  milestones: [{ id: 'm1', title: 'Basics', tasks: [{ id: 't1', title: 'Shelf view', size: 'S' }, { id: 't2', title: 'Low stock list', size: 'S' }, { id: 't3', title: 'Week plan', size: 'M' }] },
    { id: 'm2', title: 'Sharing', tasks: [{ id: 't4', title: 'Share the list', size: 'S' }] }],
  bugs: [{ id: 'b1', title: 'Counts are off', severity: 'minor' }],
  sessions: [{ id: 's1', date: day(13), task: 'Setup', outcome: 'done', summary: 'a' }, { id: 's2', date: day(2), task: 'Setup more', outcome: 'done', summary: 'b' }] });
const improveLog = '#sheet [data-act="log-session"]:not([data-tid]):not([data-bid]):not([data-what])';
const subOf = (pg) => pg.evaluate(() => { const d = document.querySelector('#modal-root .modal'); const id = d?.getAttribute('aria-describedby'); const el = id && document.getElementById(id); return el ? el.textContent.replace(/\s+/g, ' ').trim() : null; });
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf({ 'p-a': proj() }, clip), wait: 700 });
    // a prompt that was only looked at does not choose the task
    await pg.click('#tab-plan');
    await pg.click('[data-act="prompt"][data-tid="t2"]');
    check('the prompt dialog is described by its sub line', /^Paste this into Claude Code|Claude Code/.test((await subOf(pg)) || ''), await subOf(pg));
    await pg.keyboard.press('Escape');
    await pg.click('#tab-improve');
    await pg.click(improveLog);
    check('a prompt only looked at leaves the choice to you', (await pg.inputValue('#ss-task')) === '' && /^Back from Claude Code\? Choose what the session was about/.test(await subOf(pg)), [await pg.inputValue('#ss-task'), await subOf(pg)]);
    await pg.keyboard.press('Escape');
    // a copied prompt does
    await pg.click('#tab-plan');
    await pg.click('[data-act="prompt"][data-tid="t2"]');
    await pg.click('[data-act="copy-prompt"]');
    await pg.waitForTimeout(150);
    await pg.keyboard.press('Escape');
    await pg.click('#tab-improve');
    await pg.click(improveLog);
    check('after Copy prompt, Log a session starts on that task', (await pg.inputValue('#ss-task')) === 'm1:t2', await pg.inputValue('#ss-task'));
    check('and the dialog names it, as its description', (await subOf(pg)) === 'Back from Claude Code? Note how "Low stock list" went. Shipyard updates the task, and anything that went wrong becomes a lesson on the Improve tab.' && (await pg.getAttribute('#modal-root .modal', 'aria-describedby')) === 'm-sub', await subOf(pg));
    await pg.selectOption('#ss-task', 'm1:t3');
    check('choosing another task renames it', /Note how "Week plan" went\./.test(await subOf(pg)), await subOf(pg));
    await pg.selectOption('#ss-task', 'bug:b1');
    check('and a bug says it is the fix', /Note how the fix for "Counts are off" went\. Done marks the bug fixed/.test(await subOf(pg)), await subOf(pg));
    await pg.selectOption('#ss-task', 'other');
    await pg.waitForTimeout(50);
    check('something else says neither', (await subOf(pg)) === 'Back from Claude Code? Note how it went. Anything that went wrong becomes a lesson on the Improve tab.', await subOf(pg));
    await pg.keyboard.press('Escape');
    // a ready-made prompt copied last
    const label = norm(await pg.locator('[data-act="quick-prompt"]').first().textContent());
    await pg.locator('[data-act="quick-prompt"]').first().click();
    await pg.click('[data-act="copy-prompt"]');
    await pg.waitForTimeout(150);
    await pg.keyboard.press('Escape');
    await pg.click(improveLog);
    const what = await pg.inputValue('#ss-what').catch(() => null);
    check('after a ready-made prompt is copied, the session is about that work', (await pg.inputValue('#ss-task')) === 'other' && !!what && label.startsWith(what.slice(0, 6)), [label, what]);
    await pg.keyboard.press('Escape');
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    // the day of the session
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf({ 'p-a': proj() }, clip), wait: 700 });
    await pg.click('#tab-plan');
    await pg.click('[data-act="prompt"][data-tid="t1"]');
    await pg.click('#modal-root [data-act="log-session"]');
    check('the session dialog asks for the day, today by default, nothing later', (await pg.inputValue('#ss-date')) === day(0) && (await pg.getAttribute('#ss-date', 'max')) === day(0) && (await pg.textContent('label[for="ss-date"]')) === 'Day of the session');
    await pg.fill('#ss-date', day(4));
    await pg.fill('#ss-summary', 'Built the shelf view.\n\nOutcome: done\nWent wrong: nothing');
    await pg.click('[data-act="save-session"]');
    await pg.waitForTimeout(1700);
    let d = await doc(pg);
    check('the session has that day', d.sessions.some((s) => s.task === 'Shelf view' && s.date === day(4)), d.sessions.map((s) => s.date + ' ' + s.task));
    check('and sits in date order', d.sessions.map((s) => s.date).join() === [day(13), day(4), day(2)].join(), d.sessions.map((s) => s.date));
    check('the task it finished is dated that day', task(d, 'm1', 't1').status === 'done' && task(d, 'm1', 't1').doneAt === day(4), task(d, 'm1', 't1'));
    // a day in the future, or none, is today
    await pg.click('[data-act="prompt"][data-tid="t2"]');
    await pg.click('#modal-root [data-act="log-session"]');
    await pg.$eval('#ss-date', (e) => { e.value = '2099-01-01'; });
    await pg.fill('#ss-summary', 'Started the low stock list.\n\nOutcome: partly done');
    await pg.click('[data-act="save-session"]');
    await pg.waitForTimeout(1700);
    d = await doc(pg);
    check('a later day is taken as today', d.sessions[d.sessions.length - 1].task === 'Low stock list' && d.sessions[d.sessions.length - 1].date === day(0), d.sessions.slice(-1));
    await pg.click('[data-act="prompt"][data-tid="t2"]');
    await pg.click('#modal-root [data-act="log-session"]');
    await pg.fill('#ss-date', '');
    await pg.fill('#ss-summary', 'Finished it.\n\nOutcome: done');
    await pg.click('[data-act="save-session"]');
    await pg.waitForTimeout(1700);
    d = await doc(pg);
    check('no day is taken as today, and dates the task today', d.sessions[d.sessions.length - 1].date === day(0) && task(d, 'm1', 't2').doneAt === day(0), [d.sessions.slice(-1), task(d, 'm1', 't2')]);
    // the day is kept with the draft
    await pg.click('[data-act="prompt"][data-tid="t3"]');
    await pg.click('#modal-root [data-act="log-session"]');
    await pg.fill('#ss-date', day(1));
    await pg.fill('#ss-summary', 'Half way');
    await pg.keyboard.press('Escape');
    await pg.click('[data-act="prompt"][data-tid="t3"]');
    await pg.click('#modal-root [data-act="log-session"]');
    check('an unsaved day comes back with the draft', (await pg.inputValue('#ss-date')) === day(1) && (await pg.inputValue('#ss-summary')) === 'Half way', await pg.inputValue('#ss-date'));
    await pg.keyboard.press('Escape');
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    // Copy next prompt on All projects starts the task, with Undo, and stays on the page
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf({ 'p-a': proj(), 'p-b': { ...proj(), name: 'Other', updatedAt: '2026-01-01T00:00:00Z' } }, clip), wait: 700 });
    await pg.click('[data-act="open-all"]');
    await pg.click('#dc-p-a-p');
    await pg.waitForTimeout(200);
    check('the toast says the task is now in progress', norm(await pg.textContent('#toast span')) === 'Prompt for "Shelf view" copied. Paste it into Claude Code. It is now in progress.' && !!(await pg.$('#toast [data-act="undo"]')), await pg.textContent('#toast'));
    check('the card shows it in progress', /in progress/.test(norm(await pg.textContent('.dcard:has(#dc-p-a-p)'))) && await pg.isVisible('#dash-h'));
    await pg.waitForTimeout(1600);
    check('and it is saved', task(await doc(pg), 'm1', 't1').status === 'doing');
    await pg.click('#toast [data-act="undo"]');
    await pg.waitForTimeout(1700);
    check('Undo puts it back to To do and stays on All projects', (task(await doc(pg), 'm1', 't1').status || 'todo') === 'todo' && await pg.isVisible('#dash-h') && (await fa(pg)) === 'BUTTON#dc-p-a-p[dash-prompt]', await fa(pg));
    await pg.click('#dc-p-a-p');
    await pg.waitForTimeout(200);
    await pg.click('#dc-p-a-n');
    await pg.click('#tab-improve');
    await pg.click(improveLog);
    check('Log a session in that project starts on the task copied from All projects', (await pg.inputValue('#ss-task')) === 'm1:t1' && /Note how "Shelf view" went/.test(await subOf(pg)), await pg.inputValue('#ss-task'));
    await pg.keyboard.press('Escape');
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    // the wording of Export plan and every dialog's description
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf({ 'p-a': proj() }, clip), wait: 700 });
    await pg.click('[data-act="export"]');
    check('Export plan points to Back up for everything', /use Back up all projects\.$/.test(await subOf(pg)) && !/The whole project/.test(await subOf(pg)), await subOf(pg));
    await pg.keyboard.press('Escape');
    const plain = fs.readFileSync(process.env.APPJS, 'utf8');
    check('import no longer promises everything', !/Importing brings back everything/.test(plain) && /A backup keeps more, such as an edited CLAUDE\.md/.test(plain));
    let described = 0; let all = 0;
    for (const sel of ['[data-act="export"]', '#tab-improve', '[data-act="ask-review"]']) {
      if (sel.startsWith('#tab')) { await pg.click(sel); continue; }
      if (!(await pg.$(sel))) continue;
      await pg.click(sel); await pg.waitForTimeout(80);
      if (await pg.$('#modal-root .modal')) { all++; if (await subOf(pg)) described++; await pg.keyboard.press('Escape'); }
    }
    check('dialogs with a line under the heading are described by it', all >= 1 && described === all, [described, all]);
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    // what Claude sees on a large project
    const long = (s, n) => (s + ' ').repeat(Math.ceil(n / (s.length + 1))).slice(0, n);
    const big = proj();
    big.features = Array.from({ length: 40 }, (_, i) => ({ id: 'f' + i, title: 'Feature ' + i + ' ' + long('with words', 40), detail: long('Detail of the feature that says a lot', 300), priority: 'must' }));
    big.milestones = Array.from({ length: 30 }, (_, i) => ({ id: 'm' + i, title: 'Milestone ' + i, goal: long('A goal', 80), tasks: Array.from({ length: 12 }, (_, j) => ({ id: `t${i}_${j}`, title: `Task ${i}.${j} ` + long('do a thing with the pantry list', 60), size: 'M', status: i < 10 ? 'done' : 'todo' })) }));
    big.bugs = Array.from({ length: 5 }, (_, i) => ({ id: 'b' + i, title: 'Bug ' + i, severity: 'major', actual: long('It breaks', 300) }));
    big.sessions = Array.from({ length: 25 }, (_, i) => ({ id: 's' + i, date: day(30 - i), task: 'Task ' + i, outcome: 'done', summary: long('Did the work and ran the tests', 900), wrong: 'nothing' }));
    big.lessons = Array.from({ length: 5 }, (_, i) => ({ id: 'l' + i, date: day(10 - i), happened: long('It skipped the tests', 300), change: long('Run the tests first', 200) }));
    big.screens = Array.from({ length: 10 }, (_, i) => ({ id: 'sc' + i, name: 'Screen ' + i, notes: long('Notes', 300) }));
    const { pg, errs } = await open(b, VAR, { init: seedOf({ 'p-a': big }, clip), wait: 900 });
    for (const max of [60000, 40000, 30000, 8000]) {
      const r = await pg.evaluate((m) => { const s = window.__T.contextOf(window.__T.active(), m); let j = null; try { j = JSON.parse(s); } catch {} return { len: s.length, ok: !!j, bugs: j?.openBugs?.length, ses: j?.recentSessions?.length, les: j?.lessons?.length, ms: j?.milestones?.length, cur: j?.milestones?.find((m) => m.title === 'Milestone 10')?.tasks?.length, fin: j?.finishedMilestones?.length }; }, max);
      check(`at ${max} characters: whole JSON, within the limit`, r.ok && r.len <= max, r);
      if (max >= 30000) check(`at ${max}: every open bug, the recent sessions and the lessons stay, and the current milestone is whole`, r.bugs === 5 && r.ses === 6 && r.les === 5 && r.cur === 12, r);
      else check(`at ${max}: still bugs, sessions, the current milestone whole and the finished ones by name`, r.bugs >= 1 && r.ses >= 1 && r.cur === 12 && r.fin === 10, r);
    }
    const small = await pg.evaluate(() => { const p = window.__T.active(); return window.__T.contextOf({ ...p, milestones: p.milestones.slice(9, 12), features: p.features.slice(0, 3), sessions: p.sessions.slice(-2), screens: [] }); });
    const sj = JSON.parse(small);
    check('a small project goes whole: the finished milestone lists its task titles, the rest their statuses', sj.milestones[0].done === true && typeof sj.milestones[0].tasks[0] === 'string' && sj.milestones[1].tasks[0].status === 'todo' && sj.features[0].detail.length > 0, sj.milestones[0]);
    // Ask Claude sends it
    for (const k of ['overview', 'plan', 'improve']) { await pg.click('#tab-' + k); if (await pg.$('#ask-q')) break; }
    const ask = await pg.$('#ask-q');
    check('the Ask panel is there', !!ask);
    if (ask) {
      await pg.fill('#ask-q', 'What next?');
      await pg.click('[data-act="chat-send"]');
      await pg.waitForTimeout(700);
      const sent = await pg.evaluate(() => JSON.stringify(window.__chatInputs || []));
      check('Ask Claude carries the bugs, sessions and lessons', /openBugs/.test(sent) && /recentSessions/.test(sent) && /lessons/.test(sent), sent.length);
    }
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  await b.close();
})();
