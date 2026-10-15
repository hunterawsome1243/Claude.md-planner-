// Round 24: turn one of Claude's answers into tasks
const { launch, open, check } = require('./lib');
const day = (n) => { const t = new Date(); t.setUTCDate(t.getUTCDate() - n); return t.toISOString().slice(0, 10); };
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
const seed = { 'p-a': { kind: 'project', name: 'Recipe Box', pitch: 'Plan meals.', starter: 'web', createdAt: day(30) + 'T09:00:00Z', updatedAt: day(0) + 'T09:00:00Z',
  milestones: [{ id: 'm1', title: 'Basics', tasks: [{ id: 't1', title: 'Save a recipe', status: 'doing' }] }, { id: 'm2', title: 'Ready to share', tasks: [{ id: 't2', title: 'Deploy it' }] }],
  chat: [{ id: 'c1', q: 'What is most likely to go wrong?', a: 'Losing recipes. Add a backup, and warn before leaving with unsaved changes.', at: day(0) + 'T10:00:00Z' }] } };
const doc = (pg) => pg.evaluate(() => window.__mockDocs.get('p-a'));
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(seed)};`, wait: 700 });
    check('an answer offers Turn into tasks, with a full name', (await pg.textContent('#f-chat-c1-tasks')) === 'Turn into tasks' && /What is most likely to go wrong\?/.test(await pg.getAttribute('#f-chat-c1-tasks', 'aria-label')));
    await pg.click('#f-chat-c1-tasks');
    await pg.waitForTimeout(800);
    check('the dialog names the question and lists Claude\'s tasks', (await pg.textContent('#m-title')) === 'Turn the answer into tasks' && /What is most likely to go wrong\?/.test(await pg.textContent('.split-from')) && (await pg.$$('[data-act="fp-pick"]')).length === 2);
    const opts = await pg.$$eval('#fp-to option', (o) => o.map((x) => [x.value, x.textContent, x.selected]));
    check('it goes to the milestone of Next up by default; a new one takes Claude\'s name', opts[0][0] === 'm1' && opts[0][2] && opts.at(-1)[1] === 'A new milestone: Safer saving', opts);
    check('focus lands on the list heading (round 45)', (await fa(pg)) === 'H3#fp-h', await fa(pg));
    await pg.uncheck('[data-act="fp-pick"] >> nth=1');
    check('the button counts what is ticked', (await pg.textContent('[data-act="fp-accept"]')) === 'Add 1 task');
    await pg.click('[data-act="fp-accept"]');
    await pg.waitForTimeout(200);
    check('the task joins Milestone 1 and the toast says so', /Added 1 task to Milestone 1: Basics\./.test(await pg.textContent('#toast')) && (await fa(pg)) === 'BUTTON#f-chat-c1-tasks[chat-tasks]', await fa(pg));
    await pg.waitForTimeout(1600);
    let d = await doc(pg);
    check('saved with its notes and no feature', d.milestones[0].tasks.length === 2 && d.milestones[0].tasks[1].title === 'Back up recipes to a file' && d.milestones[0].tasks[1].notes === 'A Download button saves every recipe as JSON.' && d.milestones[0].tasks[1].feat === '');
    await pg.click('#toast [data-act="undo"]');
    await pg.waitForTimeout(1700);
    d = await doc(pg);
    check('Undo takes it out again', d.milestones[0].tasks.length === 1);
    // into a new milestone, written by hand
    await pg.click('#f-chat-c1-tasks');
    await pg.waitForTimeout(800);
    await pg.click('[data-act="fp-manual"]');
    check('Edit them myself starts from Claude\'s list', (await pg.inputValue('#fp-text')) === 'Back up recipes to a file (S)\nWarn before leaving with unsaved changes (M)');
    await pg.selectOption('#fp-to', 'new');
    await pg.click('[data-act="fp-accept"]');
    await pg.waitForTimeout(1700);
    d = await doc(pg);
    check('a new milestone goes before the closing one', d.milestones.map((m) => m.title).join('|') === 'Basics|Safer saving|Ready to share' && d.milestones[1].tasks.length === 2 && d.milestones[1].tasks[0].notes === 'A Download button saves every recipe as JSON.', d.milestones.map((m) => m.title));
    // nothing to do
    await pg.evaluate(() => { window.__ADVICE_REPLY__ = { tasks: [] }; });
    await pg.click('#f-chat-c1-tasks');
    await pg.waitForTimeout(800);
    check('an answer with no work says so', /found no work for Claude Code in this answer/.test(await pg.textContent('.modal')) && (await pg.$$('[data-act="fp-accept"]')).length === 0);
    await pg.keyboard.press('Escape');
    check('Escape returns focus to the button', (await fa(pg)) === 'BUTTON#f-chat-c1-tasks[chat-tasks]', await fa(pg));
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    const { pg, errs } = await open(b, 'plain.html', { init: `localStorage.setItem('shipyard.projects.v1', ${JSON.stringify(JSON.stringify(seed))});`, wait: 600, viewport: { width: 360, height: 800 } });
    check('without Claude there is no Turn into tasks', (await pg.$$('[data-act="chat-tasks"]')).length === 0, await pg.evaluate(() => document.querySelectorAll('.chat .a').length));
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(seed)};`, wait: 700, viewport: { width: 360, height: 800 } });
    await pg.locator('#f-chat-c1-tasks').scrollIntoViewIfNeeded();
    check('360px: the answer\'s buttons fit', await pg.evaluate(() => document.scrollingElement.scrollWidth <= window.innerWidth));
    await pg.screenshot({ path: __dirname + '/answer-360.png' });
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  await b.close();
})();
