// Round 4: bugs on the Plan tab, the fix prompt, blockers in Next up, PLAN.md, export/import and doc import.
const { launch, open, check, mockDoc, OUT } = require('./lib');
const path = require('path');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html');
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Recipe Box');
    await pg.check('input[name="np-starter"][value="web"]');
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(300);
    await pg.click('#tab-plan');
    const empty = await pg.textContent('section[aria-labelledby="bugs-h"]');
    check('empty bug panel explains itself', /No bugs logged/.test(empty), empty.replace(/\s+/g, ' ').trim());
    // report a bug
    await pg.click('[data-act="add-bug"]');
    let f = await fa(pg);
    check('focus on the new bug title', /^TEXTAREA#f-bugs-b[a-z0-9]+-title$/.test(f), f);
    const fields = await pg.$$eval('.bug-details label', (e) => e.map((x) => x.textContent));
    check('details open with four fields', fields.join('|') === 'What happens|What should happen|Steps to see it|Error message or log', fields);
    await pg.keyboard.type('List goes blank after Save');
    await pg.fill('.bug-details textarea >> nth=0', 'The recipe list is empty after I press Save');
    await pg.fill('.bug-details textarea >> nth=1', 'The new recipe shows at the top of the list');
    await pg.fill('.bug-details textarea >> nth=2', '1. Open the app\n2. Add a recipe\n3. Press Save');
    await pg.fill('.bug-details textarea >> nth=3', 'TypeError: Cannot read properties of undefined (reading \'map\')\n    at RecipeList (RecipeList.tsx:12)');
    await pg.selectOption('select.sev', 'blocker');
    await pg.waitForTimeout(1600);
    let d = await mockDoc(pg, 'Recipe Box');
    const bug = d.bugs[0];
    check('bug stored with every field', d.bugs.length === 1 && bug.title === 'List goes blank after Save' && bug.severity === 'blocker' && bug.status === 'open' && /^\d{4}-\d{2}-\d{2}$/.test(bug.date) && /Press Save$/.test(bug.steps) && /RecipeList\.tsx:12\)$/.test(bug.error), bug);
    check('severity select styled as blocker', (await pg.getAttribute('select.sev', 'data-l')) === 'blocker');
    const head = await pg.textContent('section[aria-labelledby="bugs-h"] .panel-head p');
    check('panel head counts open bugs', /^1 open\./.test(head), head);
    // overview
    await pg.click('#tab-overview');
    const eyebrow = await pg.textContent('.next .eyebrow');
    const h3 = await pg.textContent('.next h3');
    const from = await pg.textContent('.next .from');
    check('blocker comes first in Next up', eyebrow === 'Fix first' && h3 === 'List goes blank after Save' && /^Blocker bug · reported [A-Z][a-z]{2} \d{1,2} · then: Create a Vite/.test(from), { eyebrow, h3, from });
    const facts = await pg.$$eval('.facts dt', (e) => e.map((x) => x.textContent));
    check('facts show open bugs', facts.includes('Open bugs'), facts);
    // see all bugs jumps to the list
    await pg.click('[data-act="show-bugs"]');
    f = await fa(pg);
    check('See all bugs opens Plan with focus on the bug', (await pg.getAttribute('#tab-plan', 'aria-selected')) === 'true' && /\[toggle-bug\]$/.test(f), f);
    await pg.click('#tab-overview');
    // fix prompt
    await pg.click('.next [data-act="bug-prompt"]');
    const pr = await pg.inputValue('#m-prompt');
    check('fix prompt names the bug and its details', /Bug to fix: List goes blank after Save \(a blocker/.test(pr) && /What happens:\nThe recipe list is empty/.test(pr) && /Steps to see it:\n1\. Open the app\n2\. Add a recipe/.test(pr) && /Error message:\n```\nTypeError/.test(pr), pr.slice(0, 500));
    check('fix prompt asks for a failing test and the tests from CLAUDE.md', /Reproduce the bug if you can/.test(pr) && /Add a test that fails because of this bug/.test(pr) && /Run the tests from Commands in CLAUDE\.md/.test(pr), null);
    const btns = await pg.$$eval('.modal-actions button', (e) => e.map((x) => x.textContent.trim()));
    check('prompt dialog offers Mark fixed, and since round 34 Log how it went', btns.join('|') === 'Close|Log how it went|Mark fixed|Sharpen with Claude|Copy prompt', btns);
    await pg.click('[data-act="bug-fixed"]');
    await pg.waitForTimeout(1600);
    d = await mockDoc(pg, 'Recipe Box');
    check('bug marked fixed from the dialog', d.bugs[0].status === 'fixed' && !(await pg.$('.modal')), d.bugs[0].status);
    check('toast confirms', (await pg.textContent('#toast')).startsWith('Bug marked fixed.'));
    check('Next up goes back to the task', (await pg.textContent('.next .eyebrow')) === 'Next up');
    f = await fa(pg);
    check('focus lands on Next up', /BUTTON/.test(f), f);
    // toggle on the plan list
    await pg.click('#tab-plan');
    let chip = await pg.textContent('.bugs [data-act="toggle-bug"]');
    check('fixed bug shows Fixed', chip === 'Fixed', chip);
    await pg.click('.bugs [data-act="toggle-bug"]');
    f = await fa(pg);
    chip = await pg.textContent('.bugs [data-act="toggle-bug"]');
    check('toggle back to open keeps focus on the chip', chip === 'Open' && /\[toggle-bug\]$/.test(f), { chip, f });
    // PLAN.md and sync
    await pg.click('#tab-claudemd');
    await pg.click('[data-act="repo-file"][data-k="plan"]');
    const plan = await pg.inputValue('#repo-text');
    check('PLAN.md lists open bugs first', /## Bugs to fix\n\nFix blockers before the next task\./.test(plan) && /- \[ \] List goes blank after Save \(blocker\) <!-- id:b[a-z0-9]+ -->\n  What happens: The recipe list is empty after I press Save\n  What should happen: .*\n  Steps: 1\. Open the app 2\. Add a recipe 3\. Press Save/.test(plan) && plan.indexOf('## Bugs to fix') < plan.indexOf('## Milestone 1'), plan.slice(0, 900));
    await pg.click('[data-act="repo-file"][data-k="next"]');
    const next = await pg.inputValue('#repo-text');
    check('/next command fixes blockers first', /the first unchecked blocker under "Bugs to fix" if there is one/.test(next), null);
    await pg.click('#tab-plan');
    await pg.click('[data-act="open-plansync"]');
    await pg.fill('#ps-text', plan.replace(/- \[ \] List goes blank/, '- [x] List goes blank'));
    const note = await pg.textContent('#ps-note');
    check('sync preview counts the fixed bug', note === 'This will update the plan: 1 bug marked fixed.', note);
    await pg.click('[data-act="apply-plansync"]');
    await pg.waitForTimeout(1600);
    d = await mockDoc(pg, 'Recipe Box');
    check('ticked bug comes back fixed', d.bugs[0].status === 'fixed', d.bugs[0].status);
    // a fixed bug stays in PLAN.md, ticked, so a merge ticks it in the folder too; a ticked unknown id changes nothing
    await pg.click('#tab-claudemd');
    await pg.click('[data-act="repo-file"][data-k="plan"]');
    const plan2 = await pg.inputValue('#repo-text');
    check('fixed bugs stay in PLAN.md, ticked', /## Bugs to fix[\s\S]*\n- \[x\] [^\n]+\((blocker|major|minor)\) <!-- id:/.test(plan2) && !/\n- \[ \] [^\n]+\((blocker|major|minor)\) <!-- id:/.test(plan2), plan2.split('\n').filter((l) => /\((blocker|major|minor)\)/.test(l)));
    // more bugs, ordering, delete + undo
    await pg.click('#tab-plan');
    await pg.click('[data-act="add-bug"]');
    await pg.keyboard.type('Typo on the empty state');
    await pg.selectOption('.bug >> nth=0 >> select.sev', 'minor');
    await pg.click('[data-act="add-bug"]');
    await pg.keyboard.type('Save button sometimes does nothing');
    await pg.waitForTimeout(1600);
    const rows = await pg.$$eval('.bugs:not(.fixed) .b-title', (e) => e.map((x) => x.value));
    check('open bugs listed newest first, fixed below', rows.join('|') === 'Save button sometimes does nothing|Typo on the empty state', rows);
    await pg.click('.bugs:not(.fixed) [data-act="del-bug"] >> nth=0');
    await pg.waitForTimeout(100);
    f = await fa(pg);
    check('focus moves to the bug next to it, by its title (round 42)', /^TEXTAREA#f-bugs-.*-title$/.test(f), f);
    await pg.click('#toast [data-act="undo"]');
    await pg.waitForTimeout(1600);
    d = await mockDoc(pg, 'Recipe Box');
    check('undo restores the bug in place', d.bugs.map((x) => x.title).join('|') === 'Save button sometimes does nothing|Typo on the empty state|List goes blank after Save', d.bugs.map((x) => x.title));
    // export -> import keeps bugs
    await pg.click('[data-act="export"]');
    const md = await pg.inputValue('#m-export');
    check('export has a Bugs section', /## Bugs\n\n- \[ \] Save button sometimes does nothing \(major, \d{4}-\d{2}-\d{2}\)\n- \[ \] Typo on the empty state \(minor, [\d-]+\)\n- \[x\] List goes blank after Save \(blocker, [\d-]+\)\n  - What happens: The recipe list is empty after I press Save\n/.test(md) && /  - Steps: 1\. Open the app\n    2\\\. Add a recipe\n    3\\\. Press Save\n/.test(md), md.slice(md.indexOf('## Bugs'), md.indexOf('## Bugs') + 700));
    await pg.click('[data-act="close-modal"]');
    await pg.click('#rail [data-act="open-import"]');
    await pg.fill('#np-text', md);
    await pg.waitForTimeout(100);
    await pg.click('[data-act="import"]');
    await pg.waitForTimeout(1600);
    const imp = await mockDoc(pg, 'Recipe Box (imported)');
    const pick = (x) => x.bugs.map((y) => [y.title, y.severity, y.status, y.date, y.actual, y.expected, y.steps, y.error.replace(/\n\s+/g, '\n')]);
    check('export then import keeps bugs', imp && JSON.stringify(pick(imp)) === JSON.stringify(pick(d)), imp && { a: pick(d), b: pick(imp) });
    const toast = await pg.textContent('#toast');
    check('import toast counts bugs', /3 bugs/.test(toast), toast);
    // backup carries bugs
    await pg.click('#rail [data-act="backup"]');
    const json = JSON.parse(await pg.inputValue('#m-backup'));
    check('backup carries bugs', json.projects.every((x) => x.bugs.length === 3), json.projects.map((x) => x.bugs.length));
    await pg.click('[data-act="close-modal"]');
    // fixed list folds when long
    await pg.click('#rail [data-act="open"] >> text=Recipe Box (imported)').catch(() => {});
    await pg.waitForTimeout(200);
    await pg.click('#tab-plan');
    for (let i = 0; i < 3; i++) {
      await pg.click('[data-act="add-bug"]');
      await pg.keyboard.type('Old bug ' + i);
      await pg.click('.bugs:not(.fixed) [data-act="toggle-bug"] >> nth=0');
    }
    const fold = await pg.$('[data-act="toggle-fixed-bugs"]');
    const foldTxt = fold && await fold.textContent();
    check('more than 3 fixed bugs fold away', foldTxt === 'Show 4 fixed bugs' && !(await pg.$('.bugs.fixed')), foldTxt);
    await fold.click();
    check('Show fixed bugs lists them', (await pg.$$('.bugs.fixed .bug')).length === 4 && (await pg.textContent('[data-act="toggle-fixed-bugs"]')) === 'Hide fixed bugs');
    // phone layout
    await pg.setViewportSize({ width: 390, height: 844 });
    await pg.click('.bugs:not(.fixed) [data-act="toggle-bug-details"] >> nth=0');
    await pg.waitForTimeout(150);
    const hs = await pg.evaluate(() => ({ doc: document.documentElement.scrollWidth, vw: innerWidth, wide: [...document.querySelectorAll('.bug, .bug *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1).map((e) => e.className) }));
    check('phone: no sideways scroll with details open', hs.doc <= hs.vw && !hs.wide.length, hs);
    await pg.locator('section[aria-labelledby="bugs-h"]').screenshot({ path: path.join(OUT, 'bugs-390.png') });
    await pg.setViewportSize({ width: 1280, height: 900 });
    await pg.locator('section[aria-labelledby="bugs-h"]').screenshot({ path: path.join(OUT, 'bugs-1280.png') });
    check('no page errors', !errs.length, errs);
  }
  // documents: Known issues in a README become bugs; in a CLAUDE.md they are advice
  {
    const { pg, errs } = await open(b, 'mocked.html');
    const README = '# Tide Clock\n\nA tiny web page that shows the next high tide.\n\n## Features\n\n- Next tide time\n- Tide height chart\n\n## Known issues\n\n- [ ] Chart is blank on Safari\n- [x] Times shown in UTC (fixed in 0.2)\n- Wrong height near midnight: off by one hour after DST\n\n## Reporting issues\n\nOpen an issue on GitHub.\n';
    await pg.click('.welcome [data-act="open-import"]');
    await pg.fill('#np-text', README);
    await pg.waitForTimeout(400);
    await pg.click('[data-act="import"]');
    await pg.waitForTimeout(1600);
    const d = await mockDoc(pg, 'Tide Clock');
    const got = d && d.bugs.map((x) => [x.title, x.status, x.actual]);
    check('README known issues become bugs', d && JSON.stringify(got) === JSON.stringify([['Chart is blank on Safari', 'open', ''], ['Times shown in UTC (fixed in 0.2)', 'fixed', ''], ['Wrong height near midnight', 'open', 'off by one hour after DST']]), got);
    check('a "Reporting issues" section is not a bug list', d && !d.bugs.some((x) => /Open an issue/.test(x.title)), null);
    const CLAUDE = '# CLAUDE.md\n\nThis file provides guidance to Claude Code when working with code in this repository.\n\n## Commands\n\n- `npm test`\n\n## Known issues\n\n- The dev server must be restarted after editing vite.config.ts\n';
    await pg.click('#rail [data-act="open-import"]');
    await pg.fill('#np-text', CLAUDE);
    await pg.waitForTimeout(400);
    await pg.fill('#np-name', 'Claude Doc');
    await pg.click('[data-act="import"]');
    await pg.waitForTimeout(1600);
    const c = await mockDoc(pg, 'Claude Doc');
    check('CLAUDE.md known issues stay as advice', c && !c.bugs.length && /restarted after editing vite\.config\.ts/.test(c.conventions), c && { bugs: c.bugs, conv: c.conventions });
    check('no page errors (docs)', !errs.length, errs);
  }
  await b.close();
})();
