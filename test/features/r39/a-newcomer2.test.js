// Round 39: fewer things at once and plainer words for a newcomer (review 8c, the rest)
const { launch, open, check } = require('./lib');
const U = require('./unit-lib');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const mk = (extra = {}) => {
  const p = U.blankProject('Habit Tracker', 'Track daily habits and streaks.');
  U.applyStarter(p, 'web');
  return JSON.parse(JSON.stringify(Object.assign(p, extra)));
};
const seedOf = (o) => `window.__SEED__ = ${JSON.stringify(o)};`;
const doc = (pg) => pg.evaluate(() => window.__mockDocs.get('p-a'));
(async () => {
  const b = await launch();
  // the More menu
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf({ 'p-a': mk() }), wait: 700 });
    check('Duplicate, Archive and Delete wait in a closed More menu', (await pg.getAttribute('#more-btn', 'aria-expanded')) === 'false' && !(await pg.isVisible('[data-act="duplicate"]')) && await pg.isVisible('[data-act="export"]'));
    await pg.click('#more-btn');
    check('More opens it', (await pg.getAttribute('#more-btn', 'aria-expanded')) === 'true' && await pg.isVisible('[data-act="duplicate"]') && await pg.isVisible('[data-act="archive"]') && await pg.isVisible('[data-act="ask-delete"]'));
    await pg.keyboard.press('Tab');
    check('Tab goes into the menu', (await fa(pg)) === 'BUTTON[duplicate]', await fa(pg));
    await pg.keyboard.press('Escape');
    check('Escape closes it and focus goes back to More', !(await pg.isVisible('[data-act="duplicate"]')) && (await fa(pg)) === 'BUTTON#more-btn[toggle-more]', await fa(pg));
    await pg.click('#more-btn');
    await pg.click('.guide h2');
    check('a click elsewhere closes it', !(await pg.isVisible('[data-act="duplicate"]')) && (await pg.getAttribute('#more-btn', 'aria-expanded')) === 'false');
    await pg.click('#more-btn');
    await pg.click('[data-act="ask-delete"]');
    check('Delete still asks first', /Delete Habit Tracker and everything in it\?/.test(norm(await pg.textContent('.confirm'))) && !(await pg.isVisible('#more-list')));
    await pg.click('[data-act="cancel-confirm"]');
    check('Cancel puts focus back on More', (await fa(pg)) === 'BUTTON#more-btn[toggle-more]', await fa(pg));
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  // the stage row waits for the guide; the guide shows on every tab
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf({ 'p-a': mk({ audience: 'Me', problem: 'I forget.', doneWhen: 'I can tick a habit.' }) }), wait: 700 });
    check('no stage row while the guide is open', !(await pg.$('.stages')));
    check('Next up names the size in words and the task prompt', /· Small task \(S\) ·/.test(await pg.textContent('.next .from')) && (await pg.textContent('#next-prompt')) === 'Get the task prompt', await pg.textContent('.next .from'));
    check('the brief explains the technical fields', /The languages and tools it is built with\. Claude Code sticks to these\./.test(await pg.textContent('#sheet')) && /How the code should be written here\. They go into CLAUDE\.md, which Claude Code follows\./.test(await pg.textContent('#sheet')));
    await pg.click('#tab-design');
    const bar = () => pg.$eval('.guide-bar', (g) => [g.querySelector('p').textContent, ...[...g.querySelectorAll('.btn')].map((x) => x.textContent)].join(' | ')).then(norm);
    check('Design shows the next step', /^Step 3 of 7 List the must-haves \| Add a must-have \| All steps$/.test(await bar()), await bar());
    await pg.click('.guide-bar [data-act="add-feature"]');
    await pg.waitForTimeout(150);
    check('Add a must-have adds one and focuses it', /^TEXTAREA#f-features-.*-title$|^INPUT#f-features-.*-title$/.test(await fa(pg)), await fa(pg));
    await pg.keyboard.type('Tick off today');
    await pg.waitForTimeout(100);
    check('naming it moves the bar on, and the cursor stays', /^Step 4 of 7 Plan each must-have Next: "Tick off today" \| Plan it \| Open Plan \| All steps$/.test(await bar()) && /features-.*-title/.test(await fa(pg)), [await bar(), await fa(pg)]);
    await pg.click('#tab-plan');
    check('Plan shows it too, without Open Plan', /^Step 4 of 7 Plan each must-have Next: "Tick off today" \| Plan it \| All steps$/.test(await bar()), await bar());
    await pg.click('.guide-bar [data-act="guide-all"]');
    check('All steps goes to the guide', (await pg.getAttribute('#tab-overview', 'aria-selected')) === 'true' && (await fa(pg)) === 'H2#guide-h');
    await pg.click('#tab-claudemd');
    check('Repo files names the setup prompt', (await pg.textContent('.save-all .btn')) === 'Get the setup prompt' && /The setup prompt has Claude Code save them/.test(await pg.textContent('.save-all')));
    await pg.click('.save-all [data-act="save-all"]');
    check('and so does its dialog', /^The setup prompt\. Paste it into Claude Code/.test(await pg.textContent('.modal .sub')));
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(1700);
    check('the new must-have was saved', (await doc(pg)).features.some((f) => f.title === 'Tick off today' && f.priority === 'must'));
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    // a field step from another tab takes you to the field
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf({ 'p-a': mk() }), wait: 700 });
    await pg.click('#tab-improve');
    const one = norm(await pg.$eval('.guide-bar', (g) => [...g.querySelectorAll('.btn')].map((x) => x.textContent).join('|')));
    check('the brief step on another tab is one button', one === 'Fill in the brief|All steps', one);
    await pg.click('.guide-bar [data-act="guide-field"]');
    await pg.waitForTimeout(100);
    check('it opens Overview at the field', (await pg.getAttribute('#tab-overview', 'aria-selected')) === 'true' && (await fa(pg)) === 'TEXTAREA#f-audience', await fa(pg));
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    // with the guide hidden: no bar, and the stage row is back with a label
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf({ 'p-a': mk({ guideHidden: true }) }), wait: 700 });
    check('the stage row is labelled', (await pg.textContent('.stage-lbl')) === 'Stage' && (await pg.getAttribute('.stages', 'aria-labelledby')) === 'stage-lbl');
    await pg.click('.stage[data-k="building"]');
    await pg.waitForTimeout(1700);
    check('and still sets the stage', (await doc(pg)).stage === 'building' && (await pg.getAttribute('.stage[data-k="building"]', 'aria-pressed')) === 'true');
    await pg.click('#tab-design');
    check('no bar once the guide is hidden', !(await pg.$('.guide-bar')));
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  // starting points say what they make
  {
    const { pg, errs } = await open(b, 'plain.html', { wait: 500 });
    await pg.click('.welcome [data-act="new-project"]');
    const web = await pg.$eval('label:has(#np-st-web)', (l) => [l.querySelector('b').textContent, l.querySelector('small').firstChild.textContent, l.querySelector('.st-tech').textContent].join('|'));
    check('Web app says what it is, then what it is built with', web === 'Web app|A website people use in their browser|Built with Vite, React, TypeScript', web);
    check('every starting point has plain words first', (await pg.$$eval('.starter-grid .starter small', (x) => x.map((e) => e.firstChild.textContent))).every((t) => !/Vite|Expo|Streamlit|Manifest|Typer|FastAPI|discord\.js|Canvas/.test(t)));
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  // a phone
  for (const scheme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 375, height: 780 }, colorScheme: scheme });
    const { pg, errs } = await open(b, 'mocked.html', { ctx, init: seedOf({ 'p-a': mk() }), wait: 700 });
    const n = await pg.evaluate(() => { const g = document.querySelector('.guide [aria-current="step"] .btn'); return [...document.querySelectorAll('button, a[href], input, select, textarea')].filter((e) => e.offsetParent).indexOf(g); });
    check(`${scheme} 375px: fewer controls before the guide's first button`, n > 0 && n <= 18, n);
    await pg.click('#more-btn');
    const r = await pg.evaluate(() => { const l = document.querySelector('#more-list').getBoundingClientRect(); return { l: l.left, r: l.right, w: innerWidth, sw: document.documentElement.scrollWidth }; });
    check(`${scheme} 375px: the open menu fits the screen`, r.l >= 0 && r.r <= r.w && r.sw <= r.w, r);
    await pg.keyboard.press('Escape');
    await pg.click('#tab-design');
    const gb = await pg.evaluate(() => { const g = document.querySelector('.guide-bar').getBoundingClientRect(); return { l: g.left, r: g.right, w: innerWidth, sw: document.documentElement.scrollWidth }; });
    check(`${scheme} 375px: the guide bar fits`, gb.l >= 0 && gb.r <= gb.w && gb.sw <= gb.w, gb);
    check('no page errors', errs.length === 0, errs);
    await ctx.close();
  }
  await b.close();
})();
