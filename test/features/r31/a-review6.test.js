// Round 31: review 6 fixes in the browser
const path = require('path');
const { launch, open, check } = require('./lib');
const day = (n) => { const t = new Date(); t.setUTCDate(t.getUTCDate() - n); return t.toISOString().slice(0, 10); };
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
const seed = { 'p-a': { kind: 'project', name: 'Recipe Box', pitch: 'Plan meals.', conventions: '- Use plain CSS', createdAt: day(30) + 'T09:00:00Z',
  milestones: [
    { id: 'm1', title: 'Plan the week', tasks: [{ id: 't1', title: 'Lay out the grid', status: 'done', doneAt: day(9) }, { id: 't2', title: 'Drag a recipe onto a day', status: 'done', doneAt: day(3) }] },
    { id: 'm2', title: 'Share', tasks: [{ id: 't4', title: 'Deploy', status: 'todo' }] },
  ],
  sessions: [
    { id: 'x2', date: day(6), mid: 'm1', tid: 't2', task: 'Drag a recipe onto a day', outcome: 'stuck', wrong: 'Touch drags scroll the page.' },
    { id: 'x3', date: day(4), mid: 'm1', tid: 't2', task: 'Drag a recipe onto a day', outcome: 'partly', wrong: 'It rewrote the grid while fixing drag.' },
  ],
  lessons: [{ id: 'l1', date: day(6), happened: 'Touch drags scroll the page.', change: 'Try it on a phone too', sid: 'x2' }] } };
const rules = { rules: [{ rule: 'Test drag and drop with touch as well as a mouse', why: 'Touch drags scrolled the page.', fixes: [1, 2] }] };
const doc = (pg) => pg.evaluate(() => window.__mockDocs.get('p-a'));
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(seed)}; window.__RULES_REPLY__ = ${JSON.stringify(rules)};`, wait: 700 });
    await pg.click('#tab-improve');
    const dates = await pg.$$eval('.lesson .date', (x) => x.map((e) => e.textContent));
    check('L7: lessons show dates like sessions do', dates.length === 1 && /^[A-Z][a-z]{2} \d{1,2}$/.test(dates[0]), dates);
    await pg.click('#tab-plan');
    await pg.click('[data-act="ms-retro"][data-id="m1"]');
    check('L5: Look back opens at its heading', (await fa(pg)) === 'H2#m-title', await fa(pg));
    await pg.click('[data-act="rt-ai"]');
    await pg.waitForTimeout(800);
    const prompt = await pg.evaluate(() => window.__prompts.find((x) => x.startsWith('Suggest rules')));
    check("M2: Claude sees the owner's draft rule", /1\. .*Touch drags scroll the page\. \(my draft rule: Try it on a phone too\)/.test(prompt) && /2\. .*It rewrote the grid while fixing drag\.$/m.test(prompt), prompt.split('\n').filter((l) => /^\d\./.test(l)));
    await pg.click('[data-act="rt-accept"]');
    await pg.waitForTimeout(1700);
    let d = await doc(pg);
    const l1 = d.lessons.find((x) => x.id === 'l1');
    const made = d.lessons.find((x) => x.id !== 'l1');
    check("M2: the owner's lesson now holds the rule that went into CLAUDE.md", l1.promoted && l1.change === 'Test drag and drop with touch as well as a mouse' && /Test drag and drop with touch/.test(d.conventions), l1);
    check('M2: the second problem it fixes gets a lesson of its own, tied to its session', d.lessons.length === 2 && made.sid === 'x3' && made.happened === 'It rewrote the grid while fixing drag.' && made.promoted && made.date === day(4), made);
    await pg.click('[data-act="ms-retro"][data-id="m1"]');
    const txt = await pg.textContent('.modal');
    check('M2: Look back shows both problems covered, and offers no more rules', (txt.match(/Rule since: Test drag and drop/g) || []).length === 2 && !(await pg.$('[data-act="rt-ai"]')), txt.slice(0, 400));
    await pg.keyboard.press('Escape');
    await pg.click('#toast [data-act="undo"]').catch(() => {});
    await pg.waitForTimeout(1700);
    d = await doc(pg);
    check("Undo brings back the owner's draft and removes the new lesson", d.lessons.length === 1 && d.lessons[0].change === 'Try it on a phone too' && !d.lessons[0].promoted && !/Test drag and drop/.test(d.conventions), d.lessons);
    // a session logged from now on ties its lesson to it
    await pg.click('[data-act="prompt"][data-tid="t4"]');
    await pg.click('#modal-root [data-act="log-session"]');
    await pg.check('input[name="ss-outcome"][value="done"]');
    await pg.fill('#ss-wrong', 'The deploy script asked for a password.');
    await pg.fill('#ss-rule', 'Ask before running deploy scripts');
    await pg.click('[data-act="save-session"]');
    await pg.waitForTimeout(1700);
    d = await doc(pg);
    const ses = d.sessions.at(-1);
    check('a new lesson remembers its session', d.lessons[0].sid === ses.id && d.lessons[0].happened === 'The deploy script asked for a password.', [d.lessons[0], ses.id]);
    await pg.click('#tab-claudemd');
    await pg.click('[data-act="repo-file"][data-k="reviewer"]');
    const how = await pg.textContent('.repo-how, .how, #panel');
    check('M4: the reviewer how-to checks it with @, not /agents', /type @ and pick reviewer from the list/.test(how) && !/\/agents to see it listed/.test(how));
    await pg.click('[data-act="repo-file"][data-k="next"]');
    check('L3: /next is run by the owner only', /\ndisable-model-invocation: true\n---\n/.test(await pg.inputValue('#repo-text')));
    check('no page errors', errs.length === 0, errs);
  }
  {
    // L4: the phone's Projects button shows the dot; L6: the example never needs attention
    const ex = { kind: 'project', name: 'Example: Recipe Box', createdAt: day(80) + 'T09:00:00Z', sessions: [{ id: 's0', date: day(40), task: 'Set up', outcome: 'done', summary: 'Scaffolded in a temporary folder and moved it in, so CLAUDE.md was kept.' }], milestones: [{ id: 'm1', title: 'A', tasks: [{ id: 't1', title: 'Do it' }] }], pitch: 'x' };
    const mine = { kind: 'project', name: 'Mine', pitch: 'Mine.', createdAt: day(5) + 'T09:00:00Z', milestones: [{ id: 'm1', title: 'A', tasks: [{ id: 't1', title: 'Start' }] }] };
    const init = `window.__SEED__ = ${JSON.stringify({ 'p-x': ex, 'p-m': mine })}; localStorage.setItem('shipyard.seen.v1', '6');`;
    const { pg, errs } = await open(b, 'mocked.html', { viewport: { width: 375, height: 740 }, init, wait: 700 });
    const ob = '.mbar [data-act="open-drawer"]';
    check("L4: on a phone the Projects button carries What's new's dot", (await pg.$$(`${ob} .new-dot`)).length === 1 && (await pg.getAttribute(ob, 'aria-label')) === "Show projects (What's new is unread)");
    const c = await pg.evaluate(() => getComputedStyle(document.querySelector('.mbar .new-dot')).backgroundColor);
    check('L4: the dot is darker in light mode', c === 'rgb(140, 96, 0)', c);
    await pg.click(ob);
    await pg.click('#rail [data-act="whats-new"]');
    await pg.keyboard.press('Escape');
    check('L4: opening What\'s new clears it there too', (await pg.$$(`${ob} .new-dot`)).length === 0 && (await pg.getAttribute(ob, 'aria-label')) === 'Show projects');
    await pg.evaluate(() => document.querySelector('#rail [data-act="open-all"]')?.click());
    await pg.waitForTimeout(200);
    const head = await pg.textContent('.dash-head');
    check('M3: an example made before the flag is badged and left out', /Example ·/.test(await pg.textContent('.dash-list')) && /This week: 0 tasks done, 0 sessions\./.test(head), head);
    check('L6: and it never needs attention', !/need attention|needs attention/.test(head), head);
    await pg.evaluate(() => document.querySelector('.mbar [data-act="open-drawer"]').click());
    await pg.click('#rail [data-act="whats-new"]');
    check('M3: What\'s new opens that example instead of making another', (await pg.textContent('[data-act="wn-go"][data-k="example"]')) === 'Open the example');
    check('no page errors', errs.length === 0, errs);
  }
  await b.close();
})();
