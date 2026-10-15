// Round 14: Getting started guide on Overview.
const { launch, open, check } = require('./lib');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') + (e.dataset.k ? '{' + e.dataset.k + '}' : '') : null; });
const steps = (pg) => pg.evaluate(() => [...document.querySelectorAll('.guide-steps li')].map((li) => (li.dataset.done === 'true' ? 'x' : li.getAttribute('aria-current') ? '>' : '.')).join(''));
const noScroll = (pg) => pg.evaluate(() => document.scrollingElement.scrollWidth <= window.innerWidth);
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html');
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Blank');
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(300);
    check('a new project starts the guide at step 1', (await steps(pg)) === '>......' && /0 of 7 done/.test(await pg.textContent('.guide')), await steps(pg));
    await pg.click('[data-act="guide-field"][data-k="f-pitch"]');
    check('the step button goes to the field', (await fa(pg)) === 'TEXTAREA#f-pitch');
    await pg.keyboard.type('A planner for weekly meals');
    await pg.click('#tab-plan'); await pg.click('#tab-overview');
    check('typing the pitch ticks step 1; Claude can draft the brief', (await steps(pg)) === 'x>.....' && await pg.isVisible('.guide [data-act="ai-fill"]') && await pg.isVisible('.guide [data-act="guide-field"][data-k="f-audience"]'));
    await pg.click('.guide [data-act="ai-fill"]');
    await pg.waitForTimeout(800);
    check('Claude\'s draft ticks the brief, features and plan', (await steps(pg)) === 'xxxx>..', await steps(pg));
    await pg.click('.guide [data-act="guide-files"]');
    check('Open Repo files lands on CLAUDE.md', (await pg.getAttribute('#tab-claudemd', 'aria-selected')) === 'true' && (await fa(pg)) === 'BUTTON[repo-file]{claudemd}', await fa(pg));
    await pg.click('[data-act="copy-md"]');
    await pg.click('#tab-overview');
    check('after CLAUDE.md, the hint asks for PLAN.md and the button goes there', /CLAUDE\.md is copied\. Copy PLAN\.md too/.test(await pg.textContent('.guide')) && (await pg.getAttribute('.guide [data-act="guide-files"]', 'data-k')) === 'plan');
    await pg.click('.guide [data-act="guide-files"]');
    await pg.click('[data-act="copy-file"][data-k="plan"]');
    await pg.click('#tab-overview');
    check('copying PLAN.md ticks step 5', (await steps(pg)) === 'xxxxx>.', await steps(pg));
    await pg.click('.guide [data-act="prompt"]');
    check('step 6 opens the first task\'s prompt', await pg.isVisible('.modal #m-prompt'));
    await pg.click('.modal [data-act="close-modal"]');
    await pg.click('.next [data-act="set-task"]');
    check('starting a task ticks step 6', (await steps(pg)) === 'xxxxxx>', await steps(pg));
    check('done steps are announced as done', await pg.locator('.guide-steps .sr').count() === 6 && (await pg.textContent('.guide-steps li >> nth=0 >> b')) === 'Done: Say what you are building');
    await pg.click('.guide [data-act="log-session"]');
    await pg.click('[data-act="save-session"]');
    await pg.waitForTimeout(200);
    check('logging the first session ends the guide', await pg.locator('.guide').count() === 0);
    await pg.waitForTimeout(1600);
    const d = await pg.evaluate(() => { for (const [, x] of window.__mockDocs) if (x.name === 'Blank') return x; return null; });
    check('copies are remembered with the project', d.copied.claudemd === true && d.copied.plan === true);
    // hide, with undo
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Second');
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(300);
    await pg.click('[data-act="hide-guide"]');
    check('Hide removes it, with Undo', await pg.locator('.guide').count() === 0 && /Guide hidden\./.test(await pg.textContent('#toast')));
    await pg.click('#toast [data-act="undo"]');
    await pg.waitForTimeout(150);
    check('Undo brings it back and focuses its heading', await pg.isVisible('.guide') && (await fa(pg)) === 'H2#guide-h');
    check('no page errors', !errs.length, errs);
    await pg.context().close();
  }
  {
    const { pg, errs } = await open(b, 'plain.html', { viewport: { width: 360, height: 800 } });
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Phone');
    await pg.check('input[name="np-starter"][value="web"]');
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(300);
    await pg.fill('#f-pitch', 'Something');
    await pg.click('#tab-plan'); await pg.click('#tab-overview');
    check('without Claude the brief step offers to fill it in', (await steps(pg)) === 'x>.....' && await pg.locator('.guide [data-act="ai-fill"]').count() === 0, await steps(pg));
    check('360px: the guide fits', await noScroll(pg));
    await pg.screenshot({ path: __dirname + '/guide-360.png' });
    check('no page errors (plain)', !errs.length, errs);
    await pg.context().close();
  }
  await b.close();
})();
