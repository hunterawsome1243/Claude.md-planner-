// Clearing the project name (to retype it) and pausing: the store echo is normalized to 'Untitled project',
// and because local '' equals the just-written base, onSnap adopts it into the field being edited.
const { chromium, open, newProject, docs } = require('./h');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  for (const page of ['mocked.html', path.join(__dirname, 'opt.html')]) {
    const tag = page.includes('opt') ? '[opt  ]' : '[plain]';
    const { pg, errs } = await open(b, page, { wait: 500 });
    await newProject(pg, 'Recipe Box', 'idea', false); await sleep(600);
    await pg.click('#f-name'); await pg.keyboard.press('Control+A'); await pg.keyboard.press('Backspace');
    console.log(tag, 'right after clearing: name field =', JSON.stringify(await pg.inputValue('#f-name')));
    await sleep(1200); // user pauses to think of a new name
    const st = await pg.evaluate(() => ({ v: document.querySelector('#f-name').value, focused: document.activeElement.id, caret: document.activeElement.selectionStart }));
    console.log(tag, '1.2 s later: name field =', JSON.stringify(st.v), ' focused =', st.focused, ' caret =', st.caret);
    await pg.keyboard.type('Meal Planner');
    await sleep(1200);
    console.log(tag, 'after typing the new name: field =', JSON.stringify(await pg.inputValue('#f-name')), ' store =', JSON.stringify(Object.values(await docs(pg))[0].name));
    // same for a decision date
    await pg.click('[data-act="tab"][data-k="design"]');
    await pg.click('[data-act="add-decision"]');
    const dateSel = 'input[data-path$=".date"]';
    await pg.click(dateSel); await pg.keyboard.press('Control+A'); await pg.keyboard.press('Backspace');
    await sleep(1200);
    await pg.keyboard.type('2026-09-01');
    await sleep(100);
    console.log(tag, 'decision date after clearing, pausing, typing 2026-09-01:', JSON.stringify(await pg.inputValue(dateSel)), errs);
    await pg.context().close();
  }
  await b.close();
})();
