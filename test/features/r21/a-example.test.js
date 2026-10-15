// Round 21: Explore an example; one "draft the brief" button at a time
const { launch, open, check } = require('./lib');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
// the panel's text plus what is in its fields
const panelText = (pg) => pg.evaluate(() => { const el = document.querySelector('#panel'); return el.innerText + '\n' + [...el.querySelectorAll('input, textarea')].map((x) => x.value).join('\n'); });
const docs = (pg) => pg.evaluate(() => [...window.__mockDocs.values()]);
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html');
    check('the welcome screen offers an example', (await pg.textContent('.welcome [data-act="example"]')) === 'Explore an example');
    await pg.click('.welcome [data-act="example"]');
    await pg.waitForTimeout(300);
    check('it opens the example project', (await pg.inputValue('#f-name')) === 'Recipe Box' && (await pg.$$('#plist .pitem')).length === 1);
    check('a toast says what it is and that it can go', /part way through its plan.*delete it when you are done/.test(await pg.textContent('#toast')));
    check('no guide; Next up is the task in progress', (await pg.$$('#guide-h')).length === 0 && /Drag a recipe onto a day/.test(await pg.textContent('.panel.next')));
    check('Progress shows a chart and the target', (await pg.$$('.progress .chart-plot')).length === 1 && /on pace|on track|before/i.test(await pg.textContent('.progress')), await pg.textContent('.progress .panel-head p'));
    await pg.waitForTimeout(1600);
    const d = (await docs(pg))[0];
    check('it is saved like any project', d && d.name === 'Recipe Box' && d.sessions.length === 5 && d.milestones.length === 4);
    await pg.click('#tab-plan');
    check('Plan: the finished first milestone is folded, the others open', (await pg.$$('.ms-fold [aria-expanded="false"]')).length === 1 && (await pg.$$('.ms')).length === 4);
    check('Plan: the open bug', /Recipes from some blogs have no ingredients/.test(await panelText(pg)));
    await pg.click('#tab-design');
    check('Design: features, screens and a data model', /Shopping list/.test(await panelText(pg)) && /WeekPlan/.test(await panelText(pg)) && /Week plan|This week/.test(await panelText(pg)));
    await pg.click('#tab-improve');
    const imp = await panelText(pg);
    check('Improve: sessions, the lesson and a saved prompt', /Touch drags scroll the page/.test(imp) && /rewrote the whole parser/.test(imp) && /\/write-release-notes/.test(imp));
    await pg.click('[data-act="new-project"] >> visible=true');
    check('with the example around, New project does not offer it again', (await pg.$$('.modal [data-act="example"]')).length === 0);
    await pg.keyboard.press('Escape');
    // delete it: New project offers it again
    await pg.click('#more-btn');
    await pg.click('[data-act="ask-delete"]');
    await pg.click('[data-act="delete-project"]');
    await pg.waitForTimeout(200);
    await pg.click('[data-act="new-project"] >> visible=true');
    check('after deleting it, New project offers an example', (await pg.textContent('.modal [data-act="example"]')) === 'Open an example');
    await pg.click('.modal [data-act="example"]');
    await pg.waitForTimeout(300);
    check('the link closes the dialog and opens a fresh example', (await pg.$$('.modal')).length === 0 && (await pg.inputValue('#f-name')) === 'Recipe Box' && (await fa(pg)) === 'H2#next-h', await fa(pg));
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  // one draft button at a time
  {
    const { pg, errs } = await open(b, 'mocked.html');
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Garden');
    await pg.fill('#np-idea', 'Reminds me to water the plants');
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(200);
    check('while the guide shows, only the guide offers the draft', (await pg.$$('[data-act="ai-fill"]')).length === 1 && (await pg.$$('.guide [data-act="ai-fill"]')).length === 1);
    await pg.click('[data-act="hide-guide"]');
    await pg.waitForTimeout(100);
    check('with the guide hidden, the Brief panel offers it', (await pg.$$('[data-act="ai-fill"]')).length === 1 && (await pg.$$('.guide')).length === 0);
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  // phone width and no runtime
  {
    const { pg, errs } = await open(b, 'plain.html', { viewport: { width: 360, height: 760 } });
    check('phone: the welcome buttons fit', (await pg.evaluate(() => document.documentElement.scrollWidth)) <= 360);
    await pg.click('.welcome [data-act="example"]');
    await pg.waitForTimeout(300);
    check('without the runtime the example still opens and is kept', (await pg.inputValue('#f-name')) === 'Recipe Box' && (await pg.evaluate(() => document.documentElement.scrollWidth)) <= 360);
    await pg.waitForTimeout(1200);
    check('kept in browser storage', await pg.evaluate(() => /"example":true/.test(localStorage.getItem('shipyard.projects.v1') || '')));
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  await b.close();
})();
