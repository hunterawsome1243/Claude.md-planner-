// Round 30: describe a project you already have, then import what Claude Code wrote
const path = require('path');
const { launch, open, check } = require('./lib');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
const SAMPLE = path.join(__dirname, 'sample.md');
(async () => {
  const b = await launch();
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
    const { pg, errs } = await open(b, 'mocked.html', { ctx, wait: 700 });
    await pg.click('[data-act="open-import"] >> visible=true');
    check('Import offers the prompt', (await pg.textContent('.modal .sub button[data-k="survey"]')) === 'have Claude Code describe it');
    await pg.click('.modal .sub button[data-k="survey"]');
    check('it opens at Copy prompt, named for what it does', (await pg.textContent('#m-title')) === 'Import from your code' && (await fa(pg)) === 'BUTTON[copy-prompt]', await fa(pg));
    const prompt = await pg.inputValue('#m-prompt');
    check('the prompt is read-only and names the file', (await pg.getAttribute('#m-prompt', 'readonly')) !== null && prompt.startsWith("Look through this project's code") && prompt.includes('<!-- shipyard:survey -->') && /writes what it finds to shipyard-import\.md/.test(await pg.textContent('.modal .sub')));
    check('the prompt is described by what to do next', (await pg.getAttribute('#m-prompt', 'aria-describedby')) === 'sv-next' && /choose Import the file and open shipyard-import\.md/.test(await pg.textContent('#sv-next')));
    await pg.click('[data-act="copy-prompt"]');
    await pg.waitForTimeout(200);
    check('Copy prompt copies it', (await pg.evaluate(() => navigator.clipboard.readText())) === prompt && /Prompt copied/.test(await pg.textContent('#toast')));
    await pg.click('.modal .sub [data-act="cc-setup"]');
    check('New to Claude Code? opens the start guide, which says what this prompt does', (await pg.textContent('#m-title')) === 'Start Claude Code' && /writes shipyard-import\.md for Shipyard to import/.test(await pg.textContent('.cc-steps li:nth-child(4)')), await pg.textContent('.cc-steps li:nth-child(4)'));
    await pg.click('[data-act="cc-back"]');
    check('Back to the prompt returns to it, at Copy prompt', (await pg.textContent('#m-title')) === 'Import from your code' && (await fa(pg)) === 'BUTTON[copy-prompt]', await fa(pg));
    await pg.click('.modal-actions [data-act="np-mode"][data-k="import"]');
    check('Import the file goes to Import, in the text box', (await pg.textContent('#m-title')) === 'Import a project' && (await fa(pg)) === 'TEXTAREA#np-text', await fa(pg));
    await pg.setInputFiles('#np-file', SAMPLE);
    await pg.waitForTimeout(300);
    check('opening the file says what it is', /A description from Claude Code's shipyard-import\.md/.test(await pg.textContent('#np-detect')), await pg.textContent('#np-detect'));
    check('it is not kept as the CLAUDE.md, and its name is suggested', !(await pg.isChecked('#np-keepmd')) && (await pg.getAttribute('#np-name', 'placeholder')) === 'Tide Log');
    await pg.click('[data-act="import"]');
    await pg.waitForTimeout(400);
    check('Import fills the project in', (await pg.inputValue('#f-name')) === 'Tide Log' && /Imported\. Found the pitch, the stack, commands, 2 rules, 4 features, 2 tasks, a data model of 2 things and 2 bugs\./.test(await pg.textContent('#toast')), await pg.textContent('#toast'));
    await pg.waitForTimeout(1500);
    const doc = await pg.evaluate(() => [...window.__mockDocs.values()].find((d) => d.name === 'Tide Log'));
    check('what was built is done, the rest to do; known issues are open bugs', doc.features.filter((f) => f.status === 'done').length === 2 && doc.bugs.every((x) => x.status === 'open') && doc.stage === 'building' && !doc.claudeMdEdited && doc.repo === 'https://github.com/hunter/tide-log');
    check('the next task is the first next step', /Fix the rating being lost on reload|Ratings reset on reload/.test(await pg.textContent('.next')), (await pg.textContent('.next')).slice(0, 160));
    check('no page errors', errs.length === 0, errs);
    // What's new has a shortcut to it
    await pg.click('[data-act="whats-new"]');
    check("What's new lists it with a shortcut", (await pg.$$eval('.wn-list li h3', (x) => x.map((e) => e.textContent))).includes('Bring in a project you already have') && (await pg.textContent('.wn-list [data-act="wn-go"][data-k="survey"]')) === 'Get the prompt');
    await pg.evaluate(() => document.querySelectorAll('details.wn-past').forEach((d) => { d.open = true; }));
    await pg.click('.wn-list li [data-act="wn-go"][data-k="survey"]');
    check('its shortcut opens the prompt', (await pg.textContent('#m-title')) === 'Import from your code' && (await fa(pg)) === 'BUTTON[copy-prompt]', await fa(pg));
    await pg.keyboard.press('Escape');
    check('Escape closes it', !(await pg.$('.modal')));
    // a pasted reply wrapped in a code block, with words around it
    await pg.click('[data-act="open-import"] >> visible=true').catch(() => {});
    if (!(await pg.$('#np-text'))) { await pg.click('[data-act="new-project"] >> visible=true'); await pg.click('[data-act="np-mode"][data-k="import"]'); }
    const fs = require('fs');
    await pg.fill('#np-text', "Here is the file:\n\n````markdown\n" + fs.readFileSync(SAMPLE, 'utf8') + "````\n\nAnything else?");
    await pg.waitForTimeout(400);
    check('a pasted reply in a code block is read the same', /A description from Claude Code/.test(await pg.textContent('#np-detect')) && (await pg.getAttribute('#np-name', 'placeholder')) === 'Tide Log');
    await pg.click('[data-act="import"]');
    await pg.waitForTimeout(400);
    check('and imports under a new name', (await pg.inputValue('#f-name')) === 'Tide Log (imported)' && /4 features, 2 tasks/.test(await pg.textContent('#toast')), await pg.textContent('#toast'));
    check('no page errors', errs.length === 0, errs);
    await ctx.close();
  }
  {
    // without Claude, on a phone
    const { pg, errs } = await open(b, 'plain.html', { viewport: { width: 375, height: 740 }, wait: 500 });
    await pg.click('[data-act="open-import"] >> visible=true');
    await pg.click('.modal .sub button[data-k="survey"]');
    const fit = await pg.evaluate(() => { const m = document.querySelector('.modal').getBoundingClientRect(); const t = document.getElementById('m-prompt'); return { l: m.left, r: m.right, w: innerWidth, sw: document.documentElement.scrollWidth, tw: t.getBoundingClientRect().right }; });
    check('on a phone, without Claude, the prompt fits the screen', fit.l >= 0 && fit.r <= fit.w && fit.sw <= fit.w && fit.tw <= fit.r, fit);
    await pg.screenshot({ path: path.join(__dirname, 'survey-375.png') });
    check('no page errors', errs.length === 0, errs);
  }
  await b.close();
})();
