// Round 9: moving tasks (keyboard and details row) and sessions for work outside the plan.
const { launch, open, check } = require('./lib');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
async function newProj(pg, name, starter) {
  await pg.click('[data-act="new-project"] >> visible=true');
  await pg.fill('#np-name', name);
  if (starter) await pg.check(`input[name="np-starter"][value="${starter}"]`);
  await pg.click('[data-act="create"]');
  await pg.waitForTimeout(300);
}
const plan = (pg) => pg.evaluate(() => [...document.querySelectorAll('.ms')].map((ms) => [...ms.querySelectorAll('.task .t-title')].map((t) => t.value)));
const live = (pg) => pg.waitForTimeout(120).then(() => pg.textContent('#sr-live'));
const noScroll = (pg) => pg.evaluate(() => document.scrollingElement.scrollWidth <= window.innerWidth);
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html');
    await newProj(pg, 'Mover', 'web');
    await pg.click('#tab-plan');
    let P0 = await plan(pg);
    const [a0, a1] = P0[0];
    const titleSel = (k, n) => `.ms >> nth=${k} >> .task >> nth=${n} >> .t-title`;
    await pg.focus(titleSel(0, 0));
    await pg.evaluate(() => { const t = document.activeElement; t.setSelectionRange(2, 5); });
    await pg.keyboard.press('Alt+ArrowDown');
    await pg.waitForTimeout(100);
    let P = await plan(pg);
    const sel = await pg.evaluate(() => [document.activeElement.value, document.activeElement.selectionStart, document.activeElement.selectionEnd]);
    check('Alt+Down moves a task down and keeps the cursor', P[0][0] === a1 && P[0][1] === a0 && sel[0] === a0 && sel[1] === 2 && sel[2] === 5, { P: P[0], sel });
    check('the move is announced', /Moved down: task 2 of \d+\./.test(await live(pg)), await pg.textContent('#sr-live'));
    await pg.keyboard.press('Alt+ArrowUp');
    await pg.keyboard.press('Alt+ArrowUp');
    await pg.waitForTimeout(100);
    P = await plan(pg);
    check('Alt+Up moves it back, and stops at the very top', P[0][0] === a0 && (await pg.evaluate(() => document.activeElement.value)) === a0, P[0]);
    // last task of milestone 1 crosses into milestone 2
    const n1 = P0[0].length;
    const last = P0[0][n1 - 1];
    await pg.focus(titleSel(0, n1 - 1));
    await pg.keyboard.press('Alt+ArrowDown');
    await pg.waitForTimeout(100);
    P = await plan(pg);
    check('Alt+Down on the last task moves it to the top of the next milestone', P[0].length === n1 - 1 && P[1][0] === last && (await pg.evaluate(() => document.activeElement.value)) === last, P);
    check('crossing milestones is announced', /Moved to Milestone 2: .+, task 1 of \d+\./.test(await live(pg)), await pg.textContent('#sr-live'));
    await pg.keyboard.press('Alt+ArrowUp');
    await pg.waitForTimeout(100);
    P = await plan(pg);
    check('Alt+Up moves it back to the end of milestone 1', P[0][n1 - 1] === last && P[1][0] !== last, P);
    // details row
    check('the notes button mentions moving', /^Show notes and moving( \(has notes\))?$/.test(await pg.getAttribute('.ms >> nth=0 >> .task >> nth=0 >> [data-act="toggle-notes"]', 'aria-label')), await pg.getAttribute('.ms >> nth=0 >> .task >> nth=0 >> [data-act="toggle-notes"]', 'aria-label'));
    await pg.click('.ms >> nth=0 >> .task >> nth=0 >> [data-act="toggle-notes"]');
    await pg.waitForTimeout(100);
    const row0 = '.ms >> nth=0 >> .task >> nth=0';
    check('details show Move up (off at the top), Move down and the milestone picker', await pg.isDisabled(`${row0} >> [data-act="move-task"][data-d="-1"]`) && !(await pg.isDisabled(`${row0} >> [data-act="move-task"][data-d="1"]`)) && await pg.isVisible(`${row0} >> select[data-act="move-task-to"]`));
    await pg.click(`${row0} >> [data-act="move-task"][data-d="1"]`);
    await pg.waitForTimeout(100);
    P = await plan(pg);
    check('Move down moves it and keeps focus on Move down', P[0][1] === a0 && /\[move-task\]$/.test(await fa(pg)) && (await pg.evaluate(() => document.activeElement.dataset.d)) === '1' && await pg.isVisible('.ms >> nth=0 >> .task >> nth=1 >> .t-move'), [P[0], await fa(pg)]);
    await pg.click('.ms >> nth=0 >> .task >> nth=1 >> [data-act="move-task"][data-d="-1"]');
    await pg.waitForTimeout(100);
    check('Move up to the top hands focus to Move down', (await plan(pg))[0][0] === a0 && (await pg.evaluate(() => document.activeElement.dataset.d)) === '1');
    const m2 = await pg.evaluate(() => document.querySelectorAll('.ms')[1].querySelector('.ms-title').id.replace(/^f-milestones-/, '').replace(/-title$/, ''));
    await pg.selectOption(`${row0} >> select[data-act="move-task-to"]`, m2);
    if (await pg.locator(`${row0} >> [data-act="move-to-ms"]`).count()) await pg.click(`${row0} >> [data-act="move-to-ms"]`); // round 17: picking only arms the Move button
    await pg.waitForTimeout(150);
    P = await plan(pg);
    const fsel = await pg.evaluate(() => [document.activeElement.tagName, document.activeElement.value, document.activeElement.closest('.ms') === document.querySelectorAll('.ms')[1]]);
    check('the milestone picker moves it to the end of that milestone and keeps focus on the picker', P[1].at(-1) === a0 && !P[0].includes(a0) && fsel[0] === 'SELECT' && fsel[1] === m2 && fsel[2], { P, fsel });
    await pg.waitForTimeout(1600);
    const saved = await pg.evaluate(() => { for (const [, d] of window.__mockDocs) if (d.name === 'Mover') return d.milestones.map((m) => m.tasks.map((t) => t.title)); return null; });
    check('moves are saved', JSON.stringify(saved) === JSON.stringify(P), saved);
    check('no page errors', !errs.length, errs);

    // ---- sessions outside the plan
    await pg.click('#tab-improve');
    await pg.click('[data-act="quick-prompt"][data-k="bugs"]');
    await pg.waitForTimeout(100);
    check('a ready-made prompt offers Log how it went', await pg.isVisible('.modal [data-act="log-session"][data-what="Find bugs"]'));
    await pg.click('.modal [data-act="log-session"]');
    await pg.waitForTimeout(100);
    check('the session starts as "Something else" named after the prompt', (await pg.inputValue('#ss-task')) === 'other' && (await pg.inputValue('#ss-what')) === 'Find bugs' && /ss-outcome|INPUT/.test(await fa(pg)), await fa(pg));
    await pg.fill('#ss-what', '');
    await pg.click('[data-act="save-session"]');
    await pg.waitForTimeout(100);
    check('an empty "what" is caught', /Say what you asked Claude Code to do\./.test(await pg.textContent('.modal')) && (await fa(pg)) === 'INPUT#ss-what' && (await pg.getAttribute('#ss-what', 'aria-invalid')) === 'true');
    await pg.fill('#ss-what', 'Find bugs');
    await pg.check('input[name="ss-outcome"][value="partly"]');
    await pg.fill('#ss-summary', 'Found two; fixed one.');
    const before = await pg.evaluate(() => { for (const [, d] of window.__mockDocs) if (d.name === 'Mover') return d.milestones.flatMap((m) => m.tasks.map((t) => t.status)).join(''); return ''; });
    await pg.click('[data-act="save-session"]');
    await pg.waitForTimeout(200);
    check('saving says where it went', /Session logged\. It is listed under Sessions on the Improve tab\./.test(await pg.textContent('#toast')), await pg.textContent('#toast'));
    check('the session is listed and no task changed', /Find bugs/.test(await pg.textContent('.session')) && /Found two; fixed one\./.test(await pg.textContent('.session')));
    await pg.waitForTimeout(1600);
    const after = await pg.evaluate(() => { for (const [, d] of window.__mockDocs) if (d.name === 'Mover') return { st: d.milestones.flatMap((m) => m.tasks.map((t) => t.status)).join(''), s: d.sessions.at(-1) }; return null; });
    check('saved with no task attached', after.st === before && after.s.task === 'Find bugs' && after.s.tid === '' && after.s.outcome === 'partly', after.s);
    // switching between a task and "Something else"
    await pg.click('[data-act="log-session"] >> visible=true');
    await pg.waitForTimeout(100);
    check('from the Sessions panel a plan task is picked first', (await pg.inputValue('#ss-task')) !== 'other' && await pg.locator('#ss-what').count() === 0);
    await pg.selectOption('#ss-task', 'other');
    await pg.waitForTimeout(100);
    check('choosing "Something else" shows the box and focuses it', (await fa(pg)) === 'INPUT#ss-what');
    await pg.fill('#ss-what', 'Tidy up');
    const firstTask = await pg.evaluate(() => document.querySelector('#ss-task option').value);
    await pg.selectOption('#ss-task', firstTask);
    await pg.waitForTimeout(100);
    check('choosing a task hides it again', await pg.locator('#ss-what').count() === 0);
    await pg.selectOption('#ss-task', 'other');
    check('and the text typed is kept', (await pg.inputValue('#ss-what')) === 'Tidy up');
    // follow-ups go to the milestone of Next up
    await pg.click('[data-act="save-session-ai"]');
    await pg.waitForTimeout(600);
    await pg.click('[data-act="session-accept"]');
    await pg.waitForTimeout(200);
    await pg.click('#tab-plan');
    P = await plan(pg);
    check('follow-ups land at the end of the Next up milestone', P[0].slice(-2).join('|') === 'Add error message for empty list|Write a test for parsing', P[0].slice(-3));
    // a saved prompt
    await pg.click('#tab-improve');
    await pg.click('[data-act="add-prompt"]');
    await pg.keyboard.type('Release notes');
    await pg.fill('.own-prompt textarea', 'Write release notes for the last five commits.');
    await pg.click('.own-prompt [data-act="own-prompt"]');
    await pg.waitForTimeout(100);
    await pg.click('.modal [data-act="log-session"]');
    await pg.waitForTimeout(100);
    check('a saved prompt logs under its own name', (await pg.inputValue('#ss-what')) === 'Release notes');
    await pg.click('.modal [data-act="close-modal"]');
    check('no page errors (sessions)', !errs.length, errs);

    // ---- a project with no tasks
    await newProj(pg, 'Empty');
    await pg.click('#tab-improve');
    await pg.click('[data-act="log-session"] >> visible=true');
    await pg.waitForTimeout(100);
    check('with no tasks the form still opens, on "Something else"', (await pg.inputValue('#ss-task')) === 'other' && await pg.isVisible('#ss-what') && await pg.locator('#ss-task option').count() === 1);
    await pg.fill('#ss-what', 'Set up the repo');
    await pg.click('[data-act="save-session-ai"]');
    await pg.waitForTimeout(600);
    await pg.click('[data-act="session-accept"]');
    await pg.waitForTimeout(200);
    await pg.click('#tab-plan');
    const msTitle = await pg.inputValue('.ms .ms-title');
    P = await plan(pg);
    check('follow-ups with no milestone start one called Next steps', msTitle === 'Next steps' && P[0].length === 2, { msTitle, P });
    await pg.click('.ms >> nth=0 >> .task >> nth=0 >> [data-act="toggle-notes"]');
    check('one milestone: no picker, both moves work inside it', await pg.locator('select[data-act="move-task-to"]').count() === 0 && await pg.isDisabled('.t-move [data-d="-1"]') && !(await pg.isDisabled('.t-move [data-d="1"]')));
    check('no page errors (empty)', !errs.length, errs);
    await pg.context().close();
  }
  for (const w of [390, 360]) {
    const { pg, errs } = await open(b, 'mocked.html', { viewport: { width: w, height: 800 } });
    await newProj(pg, 'Phone', 'web');
    await pg.click('#tab-plan');
    await pg.click('.ms >> nth=0 >> .task >> nth=0 >> [data-act="toggle-notes"]');
    await pg.waitForTimeout(150);
    const box = await pg.evaluate(() => { const r = document.querySelector('.t-move').getBoundingClientRect(); const li = document.querySelector('.ms .task').getBoundingClientRect(); return { r: r.right, li: li.right, h: r.height }; });
    check(`${w}px: the details row fits`, box.r <= box.li + 1 && await noScroll(pg), box);
    await pg.screenshot({ path: __dirname + `/move-${w}.png` });
    check(`${w}px: no page errors`, !errs.length, errs);
    await pg.context().close();
  }
  await b.close();
})();
