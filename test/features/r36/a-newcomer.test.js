// Round 36: a newcomer's first visit (review 8c)
const { launch, open, check } = require('./lib');
const U = require('./unit-lib');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
// a Web app starter project with a brief and three must-haves, nothing planned for them
const mk = (extra = {}) => {
  const p = U.blankProject('Habit Tracker', 'Track daily habits and streaks.');
  U.applyStarter(p, 'web');
  Object.assign(p, { audience: 'Me', problem: 'I forget my habits.', doneWhen: 'I can tick off a habit and see my streak.', kind: 'project' }, extra);
  p.features = ['Add a habit', 'Tick off today', 'See my streak'].map((title, i) => ({ id: 'f' + i, title, priority: 'must', status: 'todo', detail: '' }));
  return JSON.parse(JSON.stringify(p));
};
const perms = { permissions: ['clipboard-read', 'clipboard-write'] };
(async () => {
  const b = await launch();
  // the welcome says what you need
  {
    const { pg, errs } = await open(b, 'plain.html', { wait: 500 });
    check('the welcome says Claude Code is needed, on a paid plan', /You will need Claude Code to do the building\. It comes with a paid Claude plan/.test(await pg.textContent('.w-needs')));
    check('its steps follow the guide', (await pg.$$eval('.steps3 b', (x) => x.map((e) => e.textContent))).join() === 'Describe it,Plan it,Build it');
    await pg.click('.w-needs [data-act="cc-setup"]');
    check('and it opens Start Claude Code', (await pg.textContent('#m-title')) === 'Start Claude Code');
    await pg.keyboard.press('Escape');
    // the starting point follows the idea until one is picked
    await pg.click('.welcome [data-act="new-project"]');
    await pg.fill('#np-name', 'Habit Tracker');
    await pg.type('#np-idea', 'A habit tracker web app');
    check('typing the idea picks Web app', await pg.isChecked('#np-st-web') && /Web app is picked from your idea/.test(await pg.textContent('#np-guess')));
    await pg.fill('#np-idea', 'A tool for my habits');
    await pg.dispatchEvent('#np-idea', 'input');
    check('words that fit no starting point put it back', await pg.isChecked('#np-st-none') && (await pg.textContent('#np-guess')) === '');
    await pg.fill('#np-idea', 'A Discord bot that reminds me of habits');
    check('a bot idea picks Discord bot', await pg.isChecked('#np-st-bot'));
    await pg.click('label:has(#np-st-cli)');
    await pg.fill('#np-idea', 'A habit tracker web app, really');
    check('a starting point picked by hand stays', await pg.isChecked('#np-st-cli') && (await pg.textContent('#np-guess')) === '');
    check('without Claude, the hint says the features are yours to plan', /You plan the features in between\./.test(await pg.textContent('.starters')));
    await pg.click('label:has(#np-st-web)');
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(200);
    check('a new project opens with focus on the guide, not the name', (await fa(pg)) === 'H2#guide-h', await fa(pg));
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  // planning each must-have from the guide
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, ...perms });
    const { pg, errs } = await open(b, 'mocked.html', { ctx, init: `window.__SEED__ = ${JSON.stringify({ 'p-a': mk() })};`, wait: 700 });
    const cur = () => pg.textContent('.guide [aria-current="step"] b');
    check('the guide asks to plan each must-have', (await cur()) === 'Plan each must-have' && /"Add a habit" has no tasks yet/.test(await pg.textContent('.guide [aria-current="step"]')));
    check('its button plans that feature', (await pg.getAttribute('.guide [aria-current="step"] [data-act="plan-feature"]', 'aria-label')) === 'Plan Add a habit');
    check('Next up\'s prompt is not a second primary button', !(await pg.$eval('#next-prompt', (e) => e.classList.contains('primary'))));
    check('the facts box counts plan checks, linked to Improve', /Plan checks passed/.test(await pg.textContent('.facts')) && /^\d \/ 6$/.test(await pg.textContent('.facts [data-k="improve"]')), await pg.textContent('.facts [data-k="improve"]'));
    await pg.click('.guide [data-act="plan-feature"]');
    await pg.waitForSelector('[data-act="fp-accept"]:not([disabled])');
    await pg.click('[data-act="fp-accept"]');
    await pg.waitForTimeout(200);
    check('after planning it, the guide names the next must-have', /"Tick off today" has no tasks yet/.test(await pg.textContent('.guide [aria-current="step"]')), await pg.textContent('.guide [aria-current="step"]'));
    check('and focus stays in the guide', /plan-feature|guide-h/.test(await fa(pg)), await fa(pg));
    await pg.click('#tab-improve');
    check('Improve says which must-haves have no tasks', /2 must-have features have no tasks yet/.test(await pg.textContent('#sheet')));
    await pg.click('#tab-overview');
    await pg.click('.facts [data-k="improve"]');
    check('the facts link opens Improve', (await pg.getAttribute('#tab-improve', 'aria-selected')) === 'true');
    // Start Claude Code lists what the project needs
    await pg.click('#tab-overview');
    await pg.click('.guide [data-act="cc-setup"], [data-act="cc-setup"] >> visible=true').catch(() => {});
    if (!(await pg.$('.cc-needs'))) { await pg.click('#tab-claudemd'); await pg.click('[data-act="cc-setup"] >> visible=true'); }
    const needs = await pg.$$eval('.cc-needs:not(.cc-accounts) li', (x) => x.map((e) => e.textContent));
    check('Start Claude Code lists Node.js and Git, with checks', needs.length === 2 && /^Node\.js \(the version marked LTS, for long-term support\)\. To check it is there, run node -v: it prints a version number\.$/.test(needs[0]) && /^Git /.test(needs[1]) && /git --version/.test(needs[1]), needs);
    check('each links to its download page', (await pg.$$eval('.cc-needs:not(.cc-accounts) a', (x) => x.map((e) => e.href))).join() === 'https://nodejs.org/en/download,https://git-scm.com/downloads');
    await pg.keyboard.press('Escape');
    check('no page errors', errs.length === 0, errs);
    await ctx.close();
  }
  // copying a task's prompt starts it; Sharpen keeps the report lines and can go back
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, ...perms });
    const seed = mk({ copied: { claudemd: true, plan: true }, guideHidden: true });
    const { pg, errs } = await open(b, 'mocked.html', { ctx, init: `window.__SEED__ = ${JSON.stringify({ 'p-a': seed })};`, wait: 700 });
    check('with the guide hidden, Next up\'s prompt is primary', await pg.$eval('#next-prompt', (e) => e.classList.contains('primary')));
    check('"Start it" is now "Mark started"', (await pg.textContent('.next [data-act="set-task"]')) === 'Mark started');
    await pg.click('#next-prompt');
    check('with CLAUDE.md saved, the dialog drops the warning', !/save that file there first/.test(await pg.textContent('.modal .sub')));
    const orig = await pg.inputValue('#m-prompt');
    await pg.click('[data-act="sharpen"]');
    await pg.waitForSelector('[data-act="unsharpen"]');
    const sh = await pg.inputValue('#m-prompt');
    check('Sharpen puts the report lines back if Claude dropped them', sh.startsWith('Sharpened: do the task carefully') && /\n\nFinish with a short summary[^\n]*End with two lines for my log: "Outcome: done"/.test(sh), sh);
    check('Claude is asked to keep the details', await pg.evaluate(() => window.__mockLog.some((x) => x[0] === 'sample')));
    await pg.click('[data-act="unsharpen"]');
    check('Use the original puts it back', (await pg.inputValue('#m-prompt')) === orig && !!(await pg.$('[data-act="sharpen"]')) && (await fa(pg)) === 'TEXTAREA#m-prompt');
    await pg.click('[data-act="copy-prompt"]');
    await pg.waitForTimeout(200);
    check('copying it starts the task, with Undo', /Prompt copied\. Paste it into Claude Code\. "Create a Vite React TypeScript project in this folder" is now in progress\./.test(await pg.textContent('#toast')) && !!(await pg.$('#toast [data-act="undo"]')), await pg.textContent('#toast'));
    await pg.waitForTimeout(1600);
    let d = await pg.evaluate(() => window.__mockDocs.get('p-a'));
    check('and it is saved as in progress', d.milestones[0].tasks[0].status === 'doing');
    await pg.click('#toast [data-act="undo"]');
    await pg.waitForTimeout(1600);
    d = await pg.evaluate(() => window.__mockDocs.get('p-a'));
    check('Undo puts it back to To do', d.milestones[0].tasks[0].status === 'todo');
    await pg.click('[data-act="copy-prompt"]');
    await pg.waitForTimeout(200);
    await pg.click('[data-act="copy-prompt"]');
    await pg.waitForTimeout(200);
    check('copying again just copies', (await pg.textContent('#toast')) === 'Prompt copied. Paste it into Claude Code.', await pg.textContent('#toast'));
    await pg.keyboard.press('Escape');
    check('no page errors', errs.length === 0, errs);
    await ctx.close();
  }
  // the finishing touches wait on unplanned must-haves
  {
    const seed = mk({ guideHidden: true });
    seed.milestones[0].tasks.forEach((t) => { t.status = 'done'; });
    const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify({ 'p-a': seed })};`, wait: 700 });
    check('Next up in "Ready to share" says the must-haves have no tasks', /3 must-haves have no tasks yet, starting with "Add a habit"\. Plan them before the finishing touches\./.test(await pg.textContent('.next')) && !!(await pg.$('.next [data-act="plan-feature"][data-id="f0"]')), await pg.textContent('.next'));
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  // on a phone, Claude's working line is in view while it drafts
  for (const scheme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 375, height: 780 }, colorScheme: scheme });
    const { pg, errs } = await open(b, 'mocked.html', { ctx, init: 'window.__SAMPLE_DELAY__ = 2500;', wait: 600 });
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Habit Tracker');
    await pg.fill('#np-idea', 'A habit tracker');
    await pg.click('[data-act="create-ai"]');
    await pg.waitForTimeout(400);
    const box = await pg.$eval('#sheet .working', (e) => { const r = e.getBoundingClientRect(); const g = document.querySelector('.guide')?.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: innerHeight, guide: g ? g.top : null }; });
    check(`${scheme} 375px: "Claude is writing" is on screen, above the guide`, box.bottom <= box.h && box.top >= 0 && (box.guide === null || box.top < box.guide), box);
    check(`${scheme} 375px: Next up says Claude is drafting`, /Claude is drafting the plan…/.test(await pg.textContent('.next')));
    await pg.waitForTimeout(2600);
    check('no page errors', errs.length === 0, errs);
    await ctx.close();
  }
  await b.close();
})();
