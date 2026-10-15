// Round 8: Split a large task (Plan tab and Next up), with Claude or by hand, and Undo. Task rows named by their title.
const { launch, open, check } = require('./lib');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
async function newWeb(pg, name) {
  await pg.click('[data-act="new-project"] >> visible=true');
  await pg.fill('#np-name', name);
  await pg.check('input[name="np-starter"][value="web"]');
  await pg.click('[data-act="create"]');
  await pg.waitForTimeout(300);
}
const firstMs = (pg) => pg.evaluate(() => [...document.querySelector('.ms .tasks').querySelectorAll('.task')].map((li) => ({ title: li.querySelector('.t-title').value, size: li.querySelector('select.size').value, id: li.querySelector('.t-title').id })));
const noScroll = (pg) => pg.evaluate(() => document.scrollingElement.scrollWidth <= window.innerWidth);
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html');
    await newWeb(pg, 'Recipe Box');
    await pg.click('#tab-plan');
    let rows = await firstMs(pg);
    const orig = rows[0];
    check('no Split button while no task is large', await pg.locator('[data-act="split-task"]').count() === 0);
    await pg.selectOption('.ms >> nth=0 >> .task >> nth=0 >> select.size', 'L');
    await pg.waitForTimeout(200);
    check('an L task gets a Split button, others do not', await pg.locator('.ms >> nth=0 >> .task >> nth=0 >> [data-act="split-task"]').isVisible() && await pg.locator('[data-act="split-task"]').count() === 1);
    check('task controls are named with the task title',
      await pg.getByRole('button', { name: `Split ${orig.title}`, exact: true }).count() === 1
      && await pg.getByRole('button', { name: `Task prompt ${orig.title}`, exact: true }).count() === 1
      && await pg.getByRole('button', { name: `Delete task ${orig.title}`, exact: true }).count() === 1
      && await pg.getByRole('listitem', { name: orig.title, exact: true }).count() === 1);
    await pg.evaluate(() => { window.__SAMPLE_DELAY__ = 600; });
    await pg.click('[data-act="split-task"]');
    await pg.waitForTimeout(150);
    check('the dialog names the task and shows Claude working', (await pg.textContent('.modal .split-from')).includes(orig.title) && await pg.isVisible('.modal .working [data-act="stop-split"]'));
    check('the dialog stays open while Claude works (Escape stops Claude, round 72)', await pg.isVisible('.modal'));
    await pg.waitForTimeout(800);
    const prompt = await pg.evaluate(() => window.__prompts.at(-1));
    check('the prompt names the task, its milestone and the other tasks', prompt.startsWith('Split one task') && prompt.includes(`Task to split: ${orig.title}`) && /Milestone 1: /.test(prompt) && prompt.includes('Other tasks in this milestone:') && prompt.includes(rows[1].title), prompt.slice(0, 600));
    check('three suggestions, all picked, and focus on the list heading (round 45)', await pg.locator('.modal [data-act="split-pick"]:checked').count() === 3 && (await fa(pg)) === 'H3#sp-h' && (await pg.textContent('[data-act="split-accept"]')) === 'Replace with 3 tasks');
    await pg.uncheck('.modal [data-act="split-pick"] >> nth=2');
    check('unpicking one updates the button', (await pg.textContent('[data-act="split-accept"]')) === 'Replace with 2 tasks');
    await pg.click('[data-act="split-accept"]');
    await pg.waitForTimeout(200);
    rows = await firstMs(pg);
    check('the task is replaced in place by the picked tasks', !(await pg.isVisible('.modal')) && rows[0].title === 'Lay out the week grid' && rows[0].size === 'S' && rows[1].title === 'Drag a recipe onto a day' && rows[1].size === 'M' && rows[2].title !== orig.title && !rows.some((r) => r.title === orig.title), rows.map((r) => r.title));
    check('focus goes to the first new task', (await fa(pg)) === 'TEXTAREA#' + rows[0].id, await fa(pg));
    check('a toast offers Undo', /Split into 2 tasks\./.test(await pg.textContent('#toast')) && await pg.isVisible('#toast [data-act="undo"]'));
    await pg.waitForTimeout(1600);
    const saved = await pg.evaluate(() => { for (const [, b] of window.__mockDocs) if (b.name === 'Recipe Box') return b.milestones[0].tasks.slice(0, 2); return null; });
    check('the new tasks are saved with Claude\'s notes', saved && saved[0].notes.startsWith('Seven columns, one per day.\n') && saved[0].notes.includes('Never use --overwrite') && saved[1].status === 'todo', saved);
    await pg.click('#toast [data-act="undo"]');
    await pg.waitForTimeout(200);
    rows = await firstMs(pg);
    check('Undo puts the large task back and removes the new ones', rows[0].title === orig.title && rows[0].size === 'L' && !rows.some((r) => /week grid|recipe onto/.test(r.title)), rows.map((r) => r.title));
    check('Undo focuses the task title', (await fa(pg)) === 'TEXTAREA#' + rows[0].id, await fa(pg));

    // Next up on Overview
    await pg.click('#tab-overview');
    check('Next up asks to split a large task first', await pg.isVisible('#next-split') && /Split it first/.test(await pg.textContent('.next')) && await pg.locator('.next [data-act="set-task"]').count() === 0 && await pg.isVisible('#next-prompt'));
    await pg.evaluate(() => { window.__SAMPLE_DELAY__ = 3000; });
    await pg.click('#next-split');
    await pg.waitForTimeout(200);
    await pg.click('[data-act="stop-split"]');
    await pg.waitForTimeout(200);
    check('Stop shows what to do next', /Stopped\. Try again, or write the smaller tasks yourself\./.test(await pg.textContent('.modal')) && await pg.isVisible('[data-act="split-manual"]') && await pg.isVisible('[data-act="split-ai"]') && await pg.locator('[data-act="split-accept"]').count() === 0);
    await pg.click('[data-act="split-manual"]');
    await pg.waitForTimeout(100);
    check('writing them by hand starts in an empty box, button off', (await fa(pg)) === 'TEXTAREA#sp-text' && (await pg.inputValue('#sp-text')) === '' && await pg.isDisabled('[data-act="split-accept"]') && (await pg.textContent('#sp-count')) === 'No tasks yet.');
    await pg.fill('#sp-text', '- Add the grid (S)\n2. Drag recipes in\n[ ] Save the plan (L)');
    check('the count and the button follow the text', (await pg.textContent('#sp-count')) === '3 tasks.' && (await pg.textContent('[data-act="split-accept"]')) === 'Replace with 3 tasks' && !(await pg.isDisabled('[data-act="split-accept"]')));
    await pg.keyboard.press('Control+Enter');
    await pg.waitForTimeout(200);
    check('Ctrl+Enter replaces the task; Next up shows the first new one', !(await pg.isVisible('.modal')) && (await pg.textContent('.next h3')) === 'Add the grid' && (await fa(pg)) === 'BUTTON#next-prompt[prompt]' && await pg.locator('#next-split').count() === 0, [await pg.textContent('.next h3'), await fa(pg)]);
    await pg.click('#tab-plan');
    rows = await firstMs(pg);
    check('hand-written sizes are kept', rows.slice(0, 3).map((r) => r.size).join('') === 'SML', rows.map((r) => r.title + ' ' + r.size));
    // the L made by hand can be split again; edit Claude's list by hand
    await pg.evaluate(() => { window.__SAMPLE_DELAY__ = 200; });
    await pg.click('[data-act="split-task"]');
    await pg.waitForTimeout(450);
    await pg.uncheck('.modal [data-act="split-pick"] >> nth=1');
    await pg.click('[data-act="split-manual"]');
    await pg.waitForTimeout(100);
    check('Edit them myself starts from the picked suggestions', (await pg.inputValue('#sp-text')) === 'Lay out the week grid (S)\nSave the week plan (M)', await pg.inputValue('#sp-text'));
    await pg.fill('#sp-text', 'Lay out the week grid (S)\nSave the week plan (M)\nShow an empty week');
    await pg.click('[data-act="split-accept"]');
    await pg.waitForTimeout(1700);
    const t2 = await pg.evaluate(() => { for (const [, b] of window.__mockDocs) if (b.name === 'Recipe Box') return b.milestones[0].tasks.slice(2, 5); return null; });
    const CTX = '\nPart of the larger task "Save the plan": do only this part. Its notes, for context:\n';
    check('Claude\'s notes stay with the titles kept, and every part gets the larger task\'s notes (round 65)', t2 && t2[0].title === 'Lay out the week grid' && t2[0].notes.startsWith('Seven columns, one per day.' + CTX) && t2[1].notes.startsWith('Reload and the plan is still there.' + CTX) && t2[2].title === 'Show an empty week' && t2[2].notes.startsWith(CTX.slice(1)), t2);
    // failure, then retry
    await pg.selectOption('.ms >> nth=0 >> .task >> nth=0 >> select.size', 'L');
    await pg.waitForTimeout(150);
    await pg.evaluate(() => { window.__SAMPLE_FAIL__ = 'upstream_error'; });
    await pg.click('[data-act="split-task"]');
    await pg.waitForTimeout(450);
    check('a failed request says so and offers both ways on', /Claude could not split the task this time\./.test(await pg.textContent('.modal')) && /Could not reach Claude/.test(await pg.textContent('#toast')) && (await fa(pg)) === 'BUTTON[split-ai]', await fa(pg));
    await pg.evaluate(() => { window.__SAMPLE_FAIL__ = null; });
    await pg.click('[data-act="split-ai"]');
    await pg.waitForTimeout(1200);
    check('Try again asks Claude again (round 59: the two tasks already in the plan are left out, and counted)', await pg.locator('.modal [data-act="split-pick"]').count() === 1 && /Left out 2 suggestions that are already in the plan/.test(await pg.textContent('.modal')));
    await pg.click('.modal [data-act="close-modal"]');
    await pg.waitForTimeout(100);
    check('Cancel changes nothing and returns focus to Split', (await firstMs(pg))[0].size === 'L' && (await fa(pg)).includes('[split-task]'), await fa(pg));
    // a task deleted in another tab while the dialog is open
    await pg.click('[data-act="split-task"]');
    await pg.waitForTimeout(450);
    await pg.evaluate(() => { for (const [id, b] of window.__mockDocs) if (b.name === 'Recipe Box') { const c = JSON.parse(JSON.stringify(b)); c.milestones[0].tasks.shift(); c.updatedAt = new Date(Date.now() + 5000).toISOString(); window.__mockEmitExternal(id, c); } });
    await pg.waitForTimeout(300);
    const gone = await pg.textContent('.modal');
    if (await pg.isVisible('[data-act="split-accept"]')) await pg.click('[data-act="split-accept"]');
    await pg.waitForTimeout(200);
    check('a task removed elsewhere is not split', /no longer in the plan/.test(gone + await pg.textContent('#toast')), gone.slice(0, 200));
    // health check
    await pg.click('#tab-improve');
    const imp = await pg.textContent('#panel');
    check('the health check points at Split when a task is large', /Press Split on each large task/.test(imp) || !/still unsplit/.test(imp));
    check('no page errors', !errs.length, errs);
    await pg.context().close();
  }
  {
    const { pg, errs } = await open(b, 'plain.html');
    await newWeb(pg, 'Offline');
    await pg.click('#tab-plan');
    await pg.selectOption('.ms >> nth=0 >> .task >> nth=0 >> select.size', 'L');
    await pg.waitForTimeout(150);
    await pg.click('[data-act="split-task"]');
    await pg.waitForTimeout(150);
    check('without Claude the dialog starts with the text box', (await fa(pg)) === 'TEXTAREA#sp-text' && await pg.locator('[data-act="split-ai"]').count() === 0);
    await pg.fill('#sp-text', 'One\nTwo');
    await pg.click('[data-act="split-accept"]');
    await pg.waitForTimeout(200);
    const rows = await firstMs(pg);
    check('and it splits the task', rows[0].title === 'One' && rows[1].title === 'Two');
    check('no page errors (plain)', !errs.length, errs);
    await pg.context().close();
  }
  for (const w of [390, 360]) {
    const { pg, errs } = await open(b, 'mocked.html', { viewport: { width: w, height: 800 } });
    await newWeb(pg, 'Phone');
    await pg.click('#tab-plan');
    await pg.selectOption('.ms >> nth=0 >> .task >> nth=0 >> select.size', 'L');
    await pg.waitForTimeout(200);
    const box = await pg.evaluate(() => {
      const li = document.querySelector('.ms .task');
      const r = (s) => li.querySelector(s).getBoundingClientRect();
      const a = r('[data-act="split-task"]'); const s = r('select.size'); const t = r('.t-title');
      const ov = (x, y) => !(x.right <= y.left || y.right <= x.left || x.bottom <= y.top || y.bottom <= x.top);
      return { overlap: ov(a, s) || ov(a, t), inside: a.right <= li.getBoundingClientRect().right + 1 };
    });
    check(`${w}px: the Split button fits the row`, !box.overlap && box.inside && await noScroll(pg), box);
    await pg.click('[data-act="split-task"]');
    await pg.waitForTimeout(500);
    check(`${w}px: the dialog fits`, await noScroll(pg) && await pg.evaluate(() => { const m = document.querySelector('.modal').getBoundingClientRect(); return m.right <= window.innerWidth && m.left >= 0; }));
    await pg.screenshot({ path: __dirname + `/split-${w}.png` });
    check(`${w}px: no page errors`, !errs.length, errs);
    await pg.context().close();
  }
  await b.close();
})();
