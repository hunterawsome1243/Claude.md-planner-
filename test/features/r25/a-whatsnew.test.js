// Round 25: What's new at the foot of the project list
const { launch, open, check, OUT } = require('./lib');
const path = require('path');
const day = (n) => { const t = new Date(); t.setUTCDate(t.getUTCDate() - n); return t.toISOString().slice(0, 10); };
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
const proj = (name) => ({ kind: 'project', name, pitch: 'Plan meals.', starter: 'web', createdAt: day(30) + 'T09:00:00Z', updatedAt: day(0) + 'T09:00:00Z',
  milestones: [{ id: 'm1', title: 'Basics', tasks: [{ id: 't1', title: 'Save a recipe', status: 'doing' }] }] });
const seed = { 'p-a': proj('Recipe Box'), 'p-b': proj('Trip Notes') };
const seen = (pg) => pg.evaluate(() => localStorage.getItem('shipyard.seen.v1'));
const btnText = (pg) => pg.textContent('#rail [data-act="whats-new"]');
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(seed)};`, wait: 700 });
    check('a returning viewer sees a dot on What\'s new', (await pg.$$('#rail .new-dot')).length === 1 && (await btnText(pg)) === "What's new (unread)", await btnText(pg));
    await pg.click('#rail [data-act="whats-new"]');
    await pg.waitForTimeout(100);
    check('the dialog opens at its heading', (await pg.textContent('#m-title')) === "What's new" && (await fa(pg)) === 'H2#m-title', await fa(pg));
    check('it lists every change, newest first', (await pg.$$('.wn-list li')).length === 45 && (await pg.textContent('.wn-list li h3')) === "Help, in one place");
    check('the dot is gone and seen is stored', (await pg.$$('#rail .new-dot')).length === 0 && (await seen(pg)) === '15', await seen(pg));
    const btns = await pg.$$eval('[data-act="wn-go"]', (x) => x.map((e) => e.dataset.k + ':' + e.textContent));
    check('a shortcut for each change that has one', btns.join('|') === 'help:Open Help|files:Open Project files|setup:Open Start Claude Code|setup:Open Start Claude Code|all:Open All projects|find:Find in this project|plansync:Update from PLAN.md|settings:Open the settings file|survey:Get the prompt|saveall:Get the setup prompt|setup:See how to start|ask:Go to Ask Claude|all:Open All projects|target:Set a date|agents:Open the reviewer|example:Explore the example', btns);
    check('each shortcut is described by its heading', (await pg.getAttribute('[data-act="wn-go"][data-k="target"]', 'aria-describedby')) === 'wn-40');
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(100);
    check('Escape returns focus to What\'s new', (await fa(pg)) === 'BUTTON[whats-new]', await fa(pg));
    // shortcuts
    await pg.click('#rail [data-act="whats-new"]');
    await pg.evaluate(() => document.querySelectorAll('details.wn-past').forEach((d) => { d.open = true; }));
    await pg.click('[data-act="wn-go"][data-k="target"]');
    await pg.waitForTimeout(150);
    check('Set a date closes the dialog and lands on the date', !(await pg.$('.modal')) && (await fa(pg)) === 'INPUT#f-targetDate', await fa(pg));
    await pg.click('#rail [data-act="whats-new"]');
    await pg.evaluate(() => document.querySelectorAll('details.wn-past').forEach((d) => { d.open = true; }));
    await pg.click('[data-act="wn-go"][data-k="agents"]');
    await pg.waitForTimeout(150);
    check('Open the reviewer shows its file on Repo files', (await pg.getAttribute('#tab-claudemd', 'aria-selected')) === 'true' && (await fa(pg)) === 'BUTTON[repo-file]' && /reviewer/.test(await pg.evaluate(() => document.activeElement.dataset.k)), await fa(pg));
    await pg.click('#rail [data-act="whats-new"]');
    await pg.evaluate(() => document.querySelectorAll('details.wn-past').forEach((d) => { d.open = true; }));
    await pg.click('[data-act="wn-go"][data-k="ask"]');
    await pg.waitForTimeout(150);
    check('Go to Ask Claude lands in the question box', (await fa(pg)) === 'TEXTAREA#ask-q', await fa(pg));
    await pg.click('#rail [data-act="whats-new"]');
    await pg.evaluate(() => document.querySelectorAll('details.wn-past').forEach((d) => { d.open = true; }));
    await pg.click('[data-act="wn-go"][data-k="all"]');
    await pg.waitForTimeout(150);
    check('Open All projects lands on its heading', (await fa(pg)) === 'H1#dash-h', await fa(pg));
    await pg.click('#rail [data-act="whats-new"]');
    const onDash = await pg.$$eval('[data-act="wn-go"]', (x) => x.map((e) => e.dataset.k));
    check('from All projects, only shortcuts that need no open project', onDash.join() === 'help,setup,setup,all,survey,setup,all,example', onDash);
    await pg.evaluate(() => document.querySelectorAll('details.wn-past').forEach((d) => { d.open = true; }));
    await pg.click('[data-act="wn-go"][data-k="example"]');
    await pg.waitForTimeout(300);
    check('Explore the example opens it', (await pg.inputValue('#f-name')) === 'Recipe Box');
    await pg.click('#rail [data-act="whats-new"]');
    check('then the shortcut opens the same example', (await pg.textContent('[data-act="wn-go"][data-k="example"]')) === 'Open the example');
    await pg.keyboard.press('Escape');
    await pg.reload();
    await pg.waitForTimeout(700);
    check('after a reload the dot stays away', (await pg.$$('#rail .new-dot')).length === 0 && (await btnText(pg)) === "What's new");
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    // seen an older version
    const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(seed)}; localStorage.setItem('shipyard.seen.v1', '6');`, wait: 700 });
    check('a viewer who saw an older version gets the dot', (await pg.$$('#rail .new-dot')).length === 1);
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    // first visit, no Claude: no dot, now or after making a project
    const { pg, errs } = await open(b, 'plain.html', { wait: 600 });
    check('a first visit has no dot', (await pg.$$('#rail .new-dot')).length === 0 && (await seen(pg)) === '15', await seen(pg));
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Garden log');
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(200);
    check('and none after the first project', (await pg.$$('#rail .new-dot')).length === 0);
    await pg.click('#rail [data-act="whats-new"]');
    const hs = await pg.$$eval('.wn-list h3', (x) => x.map((e) => e.textContent));
    check('without Claude, Turn answers into tasks is left out', hs.length === 44 && !hs.includes('Turn answers into tasks'), hs);
    check('and so is its shortcut; one project means no All projects shortcut', (await pg.$$eval('[data-act="wn-go"]', (x) => x.map((e) => e.dataset.k))).join() === 'help,files,setup,setup,find,plansync,settings,survey,saveall,setup,target,agents,example');
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    // phone: from the drawer
    const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(seed)};`, wait: 700, viewport: { width: 360, height: 760 } });
    await pg.click('[data-act="open-drawer"]');
    await pg.waitForTimeout(150);
    await pg.click('#rail [data-act="whats-new"]');
    await pg.waitForTimeout(150);
    const fit = await pg.evaluate(() => { const m = document.querySelector('.modal').getBoundingClientRect(); return { l: m.left, r: m.right, w: innerWidth, sw: document.documentElement.scrollWidth, ms: document.querySelector('.modal').scrollWidth, mc: document.querySelector('.modal').clientWidth }; });
    check('on a phone the dialog fits the screen', fit.l >= 0 && fit.r <= fit.w && fit.sw <= fit.w && fit.ms <= fit.mc, fit);
    await pg.screenshot({ path: path.join(OUT, 'whatsnew-360.png') });
    await pg.evaluate(() => document.querySelectorAll('details.wn-past').forEach((d) => { d.open = true; }));
    await pg.click('[data-act="wn-go"][data-k="target"]');
    await pg.waitForTimeout(200);
    check('a shortcut closes the drawer too', !(await pg.evaluate(() => document.getElementById('app').classList.contains('drawer'))) && (await fa(pg)) === 'INPUT#f-targetDate', await fa(pg));
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  await b.close();
})();
