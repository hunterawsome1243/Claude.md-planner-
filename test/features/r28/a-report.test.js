// Round 28: pasting Claude Code's summary fills in how it went and what went wrong
const { launch, open, check } = require('./lib');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
const seed = { 'p-a': { kind: 'project', name: 'Recipe Box', pitch: 'Plan meals.', commands: 'npm test', milestones: [{ id: 'm1', title: 'Week', tasks: [{ id: 't1', title: 'Drag a recipe onto a day', status: 'doing' }, { id: 't2', title: 'Save the week' }] }] } };
const outcome = (pg) => pg.evaluate(() => document.querySelector('input[name="ss-outcome"]:checked')?.value);
const SUMMARY = 'Added drag and drop for recipe cards.\n\nTest by hand: drag a card on a phone.\n\n**Outcome:** stuck\n**Went wrong:** Touch drags scroll the page instead of moving the card.';
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(seed)};`, wait: 700 });
    await pg.click('.next [data-act="prompt"]');
    check('the prompt asks for the two lines', /End with two lines for my log: "Outcome: done"/.test(await pg.inputValue('#m-prompt')));
    await pg.keyboard.press('Escape');
    await pg.click('.next [data-act="log-session"]');
    await pg.waitForTimeout(100);
    check('the dialog says what the lines do', /If it ends with "Outcome:" and "Went wrong:" lines/.test(await pg.textContent('#ss-auto')) && (await pg.getAttribute('#ss-summary', 'aria-describedby')) === 'ss-auto');
    await pg.fill('#ss-summary', SUMMARY);
    check('pasting the summary sets how it went', (await outcome(pg)) === 'stuck');
    check('and what went wrong', (await pg.inputValue('#ss-wrong')) === 'Touch drags scroll the page instead of moving the card.');
    check('and says so', (await pg.textContent('#ss-auto')) === 'Filled in from the summary: how it went (stuck) and what went wrong. Change them if they are not right.', await pg.textContent('#ss-auto'));
    check('focus stays in the summary', (await fa(pg)) === 'TEXTAREA#ss-summary');
    // a choice made by hand stays
    await pg.check('input[name="ss-outcome"][value="partly"]');
    await pg.fill('#ss-wrong', 'It scrolled.');
    await pg.fill('#ss-summary', SUMMARY.replace('stuck', 'done').replace('Touch drags', 'Mouse drags'));
    check('a choice made by hand is kept', (await outcome(pg)) === 'partly' && (await pg.inputValue('#ss-wrong')) === 'It scrolled.');
    // switching task re-renders: values hold
    await pg.selectOption('#ss-task', 'm1:t2');
    await pg.waitForTimeout(100);
    check('changing the task keeps what is filled in', (await outcome(pg)) === 'partly' && (await pg.inputValue('#ss-wrong')) === 'It scrolled.');
    await pg.click('[data-act="save-session"]');
    await pg.waitForTimeout(1700);
    const d = await pg.evaluate(() => window.__mockDocs.get('p-a'));
    const s = d.sessions.at(-1);
    check('saved as chosen, with a lesson', s.outcome === 'partly' && s.wrong === 'It scrolled.' && /^Added drag and drop for recipe cards\./.test(s.summary) && !/Outcome/.test(s.summary) && d.lessons[0].happened === 'It scrolled.', s);
    // nothing went wrong
    await pg.click('.next [data-act="log-session"]');
    await pg.fill('#ss-summary', 'Done.\nOutcome: done\nWent wrong: nothing');
    check('"Went wrong: nothing" leaves it empty', (await outcome(pg)) === 'done' && (await pg.inputValue('#ss-wrong')) === '' && /how it went \(done\)\./.test(await pg.textContent('#ss-auto')));
    await pg.fill('#ss-summary', 'Outcome: stuck\nWent wrong: The build fails.');
    await pg.fill('#ss-summary', 'Outcome: stuck\nWent wrong: nothing');
    check('a filled-in problem goes again when the summary says nothing', (await pg.inputValue('#ss-wrong')) === '');
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    const { pg, errs } = await open(b, 'plain.html', { init: `localStorage.setItem('shipyard.projects.v1', ${JSON.stringify(JSON.stringify(seed))});`, wait: 600 });
    await pg.click('.next [data-act="log-session"]');
    await pg.fill('#ss-summary', SUMMARY);
    check('works without Claude too', (await outcome(pg)) === 'stuck' && (await pg.inputValue('#ss-wrong')) !== '');
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  await b.close();
})();
