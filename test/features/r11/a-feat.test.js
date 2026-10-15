// Round 11: plan one feature into tasks (Claude or by hand), progress on the feature, the feature named in task prompts.
const { launch, open, check } = require('./lib');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
async function newWeb(pg, name) {
  await pg.click('[data-act="new-project"] >> visible=true');
  await pg.fill('#np-name', name);
  await pg.check('input[name="np-starter"][value="web"]');
  await pg.click('[data-act="create"]');
  await pg.waitForTimeout(300);
}
async function addFeature(pg, title, detail) {
  await pg.click('#tab-design');
  await pg.click('[data-act="add-feature"][data-p="must"]');
  await pg.keyboard.type(title);
  if (detail) await pg.fill('.lane[data-p="must"] .fcard >> nth=-1 >> textarea >> nth=1', detail);
  await pg.waitForTimeout(100);
}
const card = (title) => `.fcard:has(textarea.f-title:text-is("${title}"))`;
const plan = (pg) => pg.evaluate(() => [...document.querySelectorAll('.ms')].map((ms) => ({ title: ms.querySelector('.ms-title').value, goal: ms.querySelector('.ms-goal').value, tasks: [...ms.querySelectorAll('.task .t-title')].map((t) => t.value) })));
const doc = (pg, n) => pg.evaluate((n) => { for (const [, d] of window.__mockDocs) if (d.name === n) return d; return null; }, n);
const noScroll = (pg) => pg.evaluate(() => document.scrollingElement.scrollWidth <= window.innerWidth);
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html');
    await newWeb(pg, 'Recipe Box');
    await addFeature(pg, 'Shopping list', 'From the week');
    const fcard = '.lane[data-p="must"] .fcard >> nth=0';
    check('a feature has Plan it, named with the feature', await pg.getByRole('button', { name: 'Plan it Shopping list', exact: true }).count() === 1);
    await pg.click(`${fcard} >> [data-act="plan-feature"]`);
    await pg.waitForTimeout(100);
    check('the dialog names the feature and shows Claude working', /Shopping list/.test(await pg.textContent('.modal .split-from')) && await pg.isVisible('[data-act="stop-fp"]'));
    await pg.waitForTimeout(500);
    const prompt = await pg.evaluate(() => window.__prompts.at(-1));
    check('the prompt has the feature and the tasks already planned', prompt.startsWith('Plan how to build one feature') && prompt.includes('Feature: Shopping list') && prompt.includes('What it does: From the week') && prompt.includes('Priority: Must have') && /Tasks already in the plan:\n- Create a Vite/.test(prompt), prompt.slice(0, 900));
    check('two suggestions, a new milestone by default, focus on Add', await pg.locator('[data-act="fp-pick"]:checked').count() === 2 && (await pg.inputValue('#fp-to')) === 'new' && /A new milestone: Shopping list/.test(await pg.textContent('#fp-to')) && (await fa(pg)) === 'H3#fp-h' && (await pg.textContent('[data-act="fp-accept"]')) === 'Add 2 tasks');
    await pg.click('[data-act="fp-accept"]');
    await pg.waitForTimeout(200);
    check('the toast says where they went', /Added 2 tasks to Milestone 2: Shopping list\./.test(await pg.textContent('#toast')), await pg.textContent('#toast'));
    check('the feature shows progress, Plan more has focus', /0 of 2 tasks done/.test(await pg.textContent(fcard)) && (await pg.textContent(`${fcard} >> [data-act="plan-feature"]`)) === 'Plan more' && (await fa(pg)).includes('[plan-feature]'), await fa(pg));
    await pg.click('#tab-plan');
    let P = await plan(pg);
    check('a new milestone before the closing one', P.length === 3 && P[1].title === 'Shopping list' && P[1].goal === '' && P[1].tasks.join('|') === 'Add a shopping list page|Collect ingredients from the week plan' && P[2].title === 'Ready to share', P.map((x) => x.title));
    await pg.click('.ms >> nth=1 >> .task >> nth=0 >> [data-act="toggle-notes"]');
    check('task details name the feature', /Feature: Shopping list/.test(await pg.textContent('.ms >> nth=1 >> .task >> nth=0 >> .t-move')));
    await pg.click('.ms >> nth=1 >> .task >> nth=0 >> [data-act="prompt"]');
    await pg.waitForTimeout(100);
    check('the task prompt names the feature', /Task: Add a shopping list page\nPart of the feature: Shopping list\. From the week\./.test(await pg.inputValue('#m-prompt')));
    await pg.click('.modal [data-act="close-modal"]');
    await pg.click('.ms >> nth=1 >> .task >> nth=0 >> [data-act="cycle-task"]');
    await pg.click('.ms >> nth=1 >> .task >> nth=0 >> [data-act="cycle-task"]');
    await pg.click('#tab-design');
    check('progress follows the tasks', /1 of 2 tasks done/.test(await pg.textContent(fcard)));
    await pg.waitForTimeout(1600);
    const d = await doc(pg, 'Recipe Box');
    const fidv = d.features[0].id;
    check('tasks are saved with their feature', d.milestones[1].tasks.every((t) => t.feat === fidv) && d.milestones[0].tasks.every((t) => t.feat === ''));
    // into an existing milestone, then Undo (round 59: tasks already in the plan are left out, so Claude suggests new ones)
    await pg.evaluate(() => { window.__FEAT_REPLY__ = { tasks: [{ title: 'Print the shopping list', size: 'S', notes: 'A print view of the list.' }, { title: 'Share the list by link', size: 'M', notes: '' }] }; });
    await pg.click(`${fcard} >> [data-act="plan-feature"]`);
    await pg.waitForTimeout(500);
    check('Plan more defaults to the milestone the feature already uses', (await pg.inputValue('#fp-to')) === d.milestones[1].id);
    const m1 = d.milestones[0].id;
    await pg.selectOption('#fp-to', m1);
    await pg.uncheck('[data-act="fp-pick"] >> nth=1');
    await pg.click('[data-act="fp-accept"]');
    await pg.waitForTimeout(200);
    await pg.click('#tab-plan');
    P = await plan(pg);
    check('added at the end of the chosen milestone', P[0].tasks.at(-1) === 'Print the shopping list' && P[0].tasks.length === 5);
    await pg.click('#toast [data-act="undo"]');
    await pg.waitForTimeout(200);
    check('Undo goes back to the feature on Design', (await pg.getAttribute('#tab-design', 'aria-selected')) === 'true');
    await pg.click('#tab-plan');
    P = await plan(pg);
    check('Undo takes them out again', P[0].tasks.length === 4 && P.length === 3);
    // a new milestone goes away on Undo
    await pg.evaluate(() => { window.__FEAT_REPLY__ = { tasks: [{ title: 'Add tags to a recipe', size: 'S', notes: '' }, { title: 'Filter recipes by tag', size: 'M', notes: '' }] }; });
    await addFeature(pg, 'Tags');
    await pg.click('.lane[data-p="must"] .fcard >> nth=1 >> [data-act="plan-feature"]');
    await pg.waitForTimeout(500);
    await pg.click('[data-act="fp-accept"]');
    await pg.waitForTimeout(200);
    await pg.click('#toast [data-act="undo"]');
    await pg.waitForTimeout(200);
    await pg.click('#tab-plan');
    P = await plan(pg);
    check('Undo also removes the milestone it made', P.length === 3 && !P.some((x) => x.title === 'Tags'), P.map((x) => x.title));
    // untitled and done features
    await addFeature(pg, '');
    await pg.click('.lane[data-p="must"] .fcard >> nth=2 >> [data-act="plan-feature"]');
    await pg.waitForTimeout(100);
    check('an untitled feature asks for a name first', /Name the feature first\./.test(await pg.textContent('#toast')) && /features-.*-title/.test(await fa(pg)) && !(await pg.isVisible('.modal')));
    await pg.click('.lane[data-p="must"] .fcard >> nth=1 >> [data-act="cycle-feature"]');
    await pg.click('.lane[data-p="must"] .fcard >> nth=1 >> [data-act="cycle-feature"]');
    check('a done feature has no Plan button', await pg.locator('.lane[data-p="must"] .fcard >> nth=1 >> [data-act="plan-feature"]').count() === 0);
    check('no page errors', !errs.length, errs);
    await pg.context().close();
  }
  {
    const { pg, errs } = await open(b, 'plain.html');
    await newWeb(pg, 'Offline');
    await addFeature(pg, 'Export to PDF');
    await pg.click('[data-act="plan-feature"]');
    await pg.waitForTimeout(100);
    check('without Claude the dialog starts with the text box', (await fa(pg)) === 'TEXTAREA#fp-text' && await pg.locator('[data-act="fp-ai"]').count() === 0 && await pg.isDisabled('[data-act="fp-accept"]'));
    await pg.fill('#fp-text', 'Add a print stylesheet (S)\nAdd an Export button');
    await pg.keyboard.press('Control+Enter');
    await pg.waitForTimeout(200);
    await pg.click('#tab-plan');
    const P = await plan(pg);
    check('and adds them in a new milestone', P[1].title === 'Export to PDF' && P[1].tasks.join('|') === 'Add a print stylesheet|Add an Export button');
    check('no page errors (plain)', !errs.length, errs);
    await pg.context().close();
  }
  {
    const { pg, errs } = await open(b, 'mocked.html', { viewport: { width: 390, height: 800 } });
    await newWeb(pg, 'Phone');
    await addFeature(pg, 'A feature with a fairly long name to wrap');
    await pg.click('[data-act="plan-feature"]');
    await pg.waitForTimeout(500);
    await pg.click('[data-act="fp-accept"]');
    await pg.waitForTimeout(200);
    const fits = await pg.evaluate(() => { const r = document.querySelector('.f-plan').getBoundingClientRect(); const c = document.querySelector('.fcard').getBoundingClientRect(); return r.right <= c.right + 1; });
    check('390px: the plan row fits the card', fits && await noScroll(pg));
    await pg.screenshot({ path: __dirname + '/feat-390.png' });
    check('390px: no page errors', !errs.length, errs);
    await pg.context().close();
  }
  await b.close();
})();
