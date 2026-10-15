// Round 6: ready-made prompts and saved prompts on the Improve tab; fences in exported text.
const { launch, open, check, mockDoc, OUT } = require('./lib');
const path = require('path');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + (e.dataset.k ? ':' + e.dataset.k : '') + ']' : '') : null; });
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html');
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Recipe Box');
    await pg.check('input[name="np-starter"][value="web"]');
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(300);
    await pg.fill('#f-pitch', 'A web app that turns saved recipe links into a weekly meal plan');
    await pg.fill('#f-constraints', 'Must run offline');
    await pg.click('#tab-improve');
    const order = await pg.$$eval('.panel h2', (e) => e.map((x) => x.textContent));
    check('prompts come right after the health score', order[0] === 'Ask Claude Code to…', order);
    const cards = await pg.$$eval('.qp b', (e) => e.map((x) => x.textContent));
    check('nine ready-made prompts for a web app', cards.join('|') === 'Find bugs|Add missing tests|Explain the code|Tidy up safely|Check security|Check the plan against the code|Improve CLAUDE.md|Polish the look|Get it ready to share', cards);
    await pg.click('[data-act="quick-prompt"][data-k="bugs"]');
    let pr = await pg.inputValue('#m-prompt');
    check('Find bugs prompt', /^I'm working on Recipe Box: A web app that turns saved recipe links into a weekly meal plan\.\n\nLook for bugs in this project and fix the real ones\./.test(pr) && /3\. Stop and show me a list/.test(pr) && /run the tests from Commands in CLAUDE\.md\./.test(pr) && /\nConstraints:\n- Must run offline\n\nWhen the work is done, end with two lines for my log: "Outcome: done"[^\n]*Put nothing after them\.$/.test(pr), pr);
    const btns = await pg.$$eval('.modal-actions button', (e) => e.map((x) => x.textContent.trim()));
    check('dialog buttons', btns.join('|') === 'Close|Log how it went|Sharpen with Claude|Copy prompt', btns); // round 9 added Log how it went
    await pg.click('[data-act="close-modal"]');
    let f = await fa(pg);
    check('focus returns to the card', f === 'BUTTON[quick-prompt:bugs]', f);
    await pg.click('[data-act="quick-prompt"][data-k="explain"]');
    pr = await pg.inputValue('#m-prompt');
    check('Explain changes nothing and skips constraints', /Do not change any files\./.test(pr) && !/Constraints:/.test(pr), pr);
    await pg.keyboard.press('Escape');
    await pg.click('[data-act="quick-prompt"][data-k="plan"]');
    pr = await pg.inputValue('#m-prompt');
    check('Check the plan keeps ids', /Keep every <!-- id --> marker/.test(pr), null);
    await pg.keyboard.press('Escape');
    // own prompts
    const empty = await pg.textContent('section[aria-labelledby="qp-h"] .empty-note');
    check('empty note for own prompts', /Save prompts you use again and again/.test(empty), empty);
    await pg.click('[data-act="add-prompt"]');
    f = await fa(pg);
    check('focus on the new prompt name', /^INPUT#f-prompts-q[a-z0-9]+-title$/.test(f), f);
    await pg.click('[data-act="own-prompt"]');
    check('Use with no text asks for it', (await pg.textContent('#toast')).startsWith('Write the prompt first.') && /-text$/.test(await fa(pg)), await fa(pg));
    await pg.click('.own-prompt .in');
    await pg.keyboard.type('Release notes');
    const TEXT = 'Write release notes for the changes since the last git tag.\n\nUse this shape:\n```\n## What is new\n- item\n```\n    keep this indent';
    await pg.fill('.own-prompt .ta', TEXT);
    await pg.waitForTimeout(1600);
    let d = await mockDoc(pg, 'Recipe Box');
    check('stored', d.prompts.length === 1 && d.prompts[0].title === 'Release notes' && d.prompts[0].text === TEXT, d.prompts);
    check('group and delete take the name', (await pg.getByRole('listitem', { name: 'Release notes' }).count()) === 1 && (await pg.getByRole('button', { name: 'Delete Release notes' }).count()) === 1);
    await pg.click('[data-act="own-prompt"]');
    pr = await pg.inputValue('#m-prompt');
    check('Use opens it as written', pr === TEXT.trim(), pr);
    await pg.keyboard.press('Escape');
    // a second one, delete + undo
    await pg.click('[data-act="add-prompt"]');
    await pg.keyboard.type('Screenshots');
    await pg.fill('.own-prompt >> nth=1 >> .ta', 'Update the screenshots in README.md.');
    await pg.click('[data-act="del-prompt"] >> nth=0');
    await pg.waitForTimeout(100);
    f = await fa(pg);
    check('focus moves to the prompt next to it, by its title (round 42)', /^INPUT#f-prompts-.*-title$/.test(f), f);
    await pg.click('#toast [data-act="undo"]');
    await pg.waitForTimeout(1600);
    d = await mockDoc(pg, 'Recipe Box');
    check('undo restores it first', d.prompts.map((x) => x.title).join('|') === 'Release notes|Screenshots', d.prompts.map((x) => x.title));
    // a bug whose error has fences, to check exported fences
    await pg.click('#tab-plan');
    await pg.click('[data-act="add-bug"]');
    await pg.keyboard.type('Crash on save');
    await pg.fill('.bug-details textarea >> nth=3', '```\nTypeError: x is undefined\n```');
    await pg.waitForTimeout(1600);
    d = await mockDoc(pg, 'Recipe Box');
    // export -> import
    await pg.click('[data-act="export"]');
    const ex = await pg.inputValue('#m-export');
    check('export keeps prompts in fenced blocks', /## Prompts\n\n### Release notes\n\n~~~~text\nWrite release notes for the changes since the last git tag\.\n\nUse this shape:\n\\```\n## What is new\n- item\n\\```\n    keep this indent\n~~~~\n\n### Screenshots\n/.test(ex), ex.slice(ex.indexOf('## Prompts'), ex.indexOf('## Prompts') + 400));
    await pg.click('[data-act="close-modal"]');
    await pg.click('#rail [data-act="open-import"]');
    await pg.fill('#np-text', ex);
    await pg.waitForTimeout(100);
    await pg.click('[data-act="import"]');
    await pg.waitForTimeout(1600);
    const imp = await mockDoc(pg, 'Recipe Box (imported)');
    check('round trip keeps prompts word for word', imp && JSON.stringify(imp.prompts.map((x) => [x.title, x.text])) === JSON.stringify(d.prompts.map((x) => [x.title, x.text])), imp && imp.prompts);
    check('round trip keeps fences in a bug error', imp && imp.bugs[0]?.error === d.bugs[0].error, imp && imp.bugs);
    check('round trip keeps the rest of the plan', imp && imp.milestones.length === d.milestones.length && imp.milestones.every((m, i) => m.tasks.length === d.milestones[i].tasks.length), null);
    // layout
    await pg.click('#tab-improve');
    for (const [w, scheme] of [[1280, 'light'], [390, 'dark']]) {
      await pg.setViewportSize({ width: w, height: 900 });
      await pg.emulateMedia({ colorScheme: scheme });
      await pg.waitForTimeout(150);
      const hs = await pg.evaluate(() => ({ doc: document.documentElement.scrollWidth, vw: innerWidth }));
      check(`no sideways scroll at ${w}`, hs.doc <= hs.vw, hs);
      await pg.locator('section[aria-labelledby="qp-h"]').screenshot({ path: path.join(OUT, `prompts-${w}-${scheme}.png`) });
    }
    check('no page errors', !errs.length, errs);
  }
  {
    const { pg, errs } = await open(b, 'mocked.html');
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Tool');
    await pg.check('input[name="np-starter"][value="cli"]');
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(300);
    await pg.click('#tab-improve');
    const cards = await pg.$$eval('.qp b', (e) => e.map((x) => x.textContent));
    check('no Polish the look for a command-line tool', cards.length === 8 && !cards.includes('Polish the look'), cards);
    check('no page errors (cli)', !errs.length, errs);
  }
  await b.close();
})();
