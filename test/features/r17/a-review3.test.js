// Round 17: the review 3 fixes, in the browser
const { launch, open, check } = require('./lib');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
const doc = (pg, id) => pg.evaluate((i) => window.__mockDocs.get(i), id);
const seed = {
  'p-r': { kind: 'project', name: 'Recipes', pitch: 'A recipe box.', commands: 'npm test', createdAt: '2026-09-01T09:00:00Z', updatedAt: '2026-10-01T09:00:00Z',
    features: [{ id: 'f1', title: 'Week plan', priority: 'must' }],
    milestones: [
      { id: 'm1', title: 'Basics', tasks: [{ id: 'tL', title: 'Build the week planner', size: 'L', feat: 'f1', notes: 'Use the recipe ids.' }, { id: 't2', title: 'Second', size: 'S' }] },
      { id: 'm2', title: 'Later', tasks: [{ id: 't3', title: 'Third', size: 'M' }] },
      { id: 'm3', title: 'Last', tasks: [] },
    ],
    prompts: [{ id: 'q1', title: 'Release notes', text: 'Write release notes.' }] },
};
(async () => {
  const b = await launch();
  {
    const { pg, errs, ctx } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(seed)};`, wait: 700 });
    // G1: Claude's answer renders as real lists
    await pg.evaluate(() => { window.__CHAT_TEXT__ = 'Next:\n\n1. Run `npm run build` first.\n\n2. Then **deploy** it.\n   - check the [docs](https://code.claude.com/docs)\n\n| Step | Time |\n|---|---|\n| build | 1m |'; });
    await pg.fill('#ask-q', 'What next?');
    await pg.click('[data-act="chat-send"]');
    await pg.waitForTimeout(600);
    const li = await pg.evaluate(() => { const ol = document.querySelector('.chat .md ol'); const items = ol ? [...ol.children] : []; return { n: items.length, disp: items.map((x) => getComputedStyle(x).display), style: ol ? getComputedStyle(ol).listStyleType : '', h: items[0] ? items[0].getBoundingClientRect().height : 0, link: document.querySelector('.chat .md a')?.getAttribute('target'), table: !!document.querySelector('.chat .md table') }; });
    check('G1 answer lists show numbers, items stay on one line', li.n === 2 && li.disp.every((d) => d === 'list-item') && li.style === 'decimal' && li.h < 40 && li.link === '_blank' && li.table, li);
    check('G14 the Copy button names its question', (await pg.getAttribute('[data-act="chat-copy"]', 'aria-label')) === 'Copy the answer to: What next?');
    // G12: an answer that breaks off says so
    await pg.evaluate(() => { window.__CHAT_PARTIAL__ = true; window.__CHAT_FAIL__ = true; });
    await pg.fill('#ask-q', 'And then?');
    await pg.click('[data-act="chat-send"]');
    await pg.waitForTimeout(700);
    check('G12 a failed answer is not called stopped', /The answer broke off\. Ask again for the rest\./.test(await pg.textContent('.chat')) && !/Stopped before the end/.test(await pg.textContent('.chat')));
    await pg.evaluate(() => { window.__CHAT_PARTIAL__ = false; window.__CHAT_FAIL__ = false; });
    // G2: Split keeps the feature and the notes
    await pg.click('#tab-plan');
    await pg.click('#f-milestones-m1-tasks-tL-split');
    await pg.waitForTimeout(700);
    check('G2 the dialog says the notes move', /Its notes move to the first smaller task\./.test(await pg.textContent('.modal')));
    await pg.click('[data-act="split-accept"]');
    await pg.waitForTimeout(1700);
    let d = await doc(pg, 'p-r');
    const parts = d.milestones[0].tasks.slice(0, 3);
    check('G2 the smaller tasks keep the feature and remember the task they replace', parts.every((t) => t.feat === 'f1' && t.splitFrom === 'tL'), parts);
    check('G2 every part keeps the original notes, as context (round 65)', parts.every((t) => t.notes.endsWith('\nPart of the larger task "Build the week planner": do only this part. Its notes, for context:\nUse the recipe ids.')), parts.map((t) => t.notes));
    // G3: Undo from another tab shows the task again
    await pg.click('#tab-design');
    await pg.click('#toast [data-act="undo"]');
    await pg.waitForTimeout(250);
    check('G3 Undo switches to the Plan tab and focuses the task', (await pg.getAttribute('#tab-plan', 'aria-selected')) === 'true' && (await fa(pg)) === 'TEXTAREA#f-milestones-m1-tasks-tL-title' && /Undone\./.test(await pg.textContent('#toast')), await fa(pg));
    // G11: the milestone picker moves only on Move
    await pg.click('[data-act="toggle-notes"][data-tid="t2"]');
    await pg.waitForTimeout(100);
    await pg.focus('#f-milestones-m1-tasks-t2-ms');
    await pg.keyboard.press('ArrowDown');
    await pg.waitForTimeout(150);
    const stay = await pg.evaluate(() => !!document.getElementById('f-milestones-m1-tasks-t2-title'));
    check('G11 arrowing through milestones does not move the task', stay && !(await pg.isDisabled('#f-milestones-m1-tasks-t2-msgo')));
    check('G11 the Move button names its task', (await pg.getAttribute('#f-milestones-m1-tasks-t2-msgo', 'aria-labelledby')) === 'f-milestones-m1-tasks-t2-msgo f-milestones-m1-tasks-t2-title');
    await pg.click('#f-milestones-m1-tasks-t2-msgo');
    await pg.waitForTimeout(200);
    check('G11 Move moves it, focus on its picker', await pg.evaluate(() => !!document.getElementById('f-milestones-m2-tasks-t2-title')) && (await fa(pg)) === 'SELECT#f-milestones-m2-tasks-t2-ms[move-task-to]', await fa(pg));
    check('G11 Move is off until another milestone is picked', await pg.isDisabled('#f-milestones-m2-tasks-t2-msgo'));
    // G4/G5: ready-made prompts carry what they need
    await pg.click('#tab-improve');
    await pg.click('[data-act="quick-prompt"][data-k="claudemd"]');
    check('G5 Improve CLAUDE.md says to paste the result back', /paste the new file into Project files, CLAUDE\.md/.test(await pg.textContent('.modal .note-box')));
    await pg.click('.modal [data-act="close-modal"]');
    await pg.click('[data-act="quick-prompt"][data-k="plan"]');
    check('G4 Check the plan says to copy PLAN.md first', /copy it from the Project files tab first/.test(await pg.textContent('.modal .note-box')));
    await pg.click('.modal [data-act="close-modal"]');
    await pg.click('[data-act="quick-prompt"][data-k="tidy"]');
    const tidy = await pg.inputValue('#m-prompt');
    check('G4 Tidy up waits for the go-ahead before any test is written', tidy.indexOf('wait for my go-ahead') < tidy.indexOf('first add tests') && /Do not change any files yet/.test(tidy), tidy);
    await pg.click('.modal [data-act="close-modal"]');
    check('G14 Open prompt names its prompt', await pg.getByRole('button', { name: 'Open prompt Release notes', exact: true }).count() === 1);
    // G15: the settings file lets checks take arguments
    await pg.click('#tab-claudemd');
    await pg.click('[data-act="repo-file"][data-k="settings"]');
    check('G15 settings.json allows npm test with arguments', /"Bash\(npm test \*\)"/.test(await pg.textContent('.repo-view, .file-view, #sheet')));
    check('no page errors', !errs.length, errs);
    await ctx.close();
  }
  {
    // G15: a double click on Split leaves the dialog open (write-it-yourself dialog, no Claude)
    const { pg, errs, ctx } = await open(b, 'plain.html');
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Dbl');
    await pg.check('input[name="np-starter"][value="web"]');
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(300);
    await pg.click('#tab-plan');
    await pg.selectOption('.ms >> nth=0 >> .task >> nth=0 >> select.size', 'L');
    await pg.waitForTimeout(150);
    await pg.dblclick('[data-act="split-task"]');
    await pg.waitForTimeout(300);
    check('G15 a double click leaves the Split dialog open', await pg.isVisible('.modal #sp-text'));
    await pg.fill('#sp-text', Array.from({ length: 14 }, (_, i) => `Step ${i + 1}`).join('\n'));
    check('G15 more than 12 lines says only 12 are used', /12 tasks\. Only the first 12 lines are used\./.test(await pg.textContent('#sp-count')));
    check('no page errors (plain)', !errs.length, errs);
    await ctx.close();
  }
  await b.close();
})();
