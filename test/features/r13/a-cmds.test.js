// Round 13: saved prompts as slash commands on the Repo files tab; save a ready-made prompt to your prompts.
const { launch, open, check } = require('./lib');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') + (e.dataset.k ? '{' + e.dataset.k + '}' : '') : null; });
async function newWeb(pg, name) {
  await pg.click('[data-act="new-project"] >> visible=true');
  await pg.fill('#np-name', name);
  await pg.check('input[name="np-starter"][value="web"]');
  await pg.click('[data-act="create"]');
  await pg.waitForTimeout(300);
}
const noScroll = (pg) => pg.evaluate(() => document.scrollingElement.scrollWidth <= window.innerWidth);
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html');
    await newWeb(pg, 'Recipe Box');
    await pg.click('#tab-improve');
    await pg.click('[data-act="add-prompt"]');
    await pg.keyboard.type('Release notes');
    check('a prompt with no text has no command yet', await pg.locator('.own-prompt [data-act="open-cmd"]').count() === 0);
    await pg.fill('.own-prompt textarea', 'Write release notes for the last five commits.');
    await pg.click('#tab-plan'); await pg.click('#tab-improve');
    check('a named prompt with text shows its command', (await pg.textContent('.own-prompt [data-act="open-cmd"]')) === '/release-notes-prompt');
    await pg.click('.own-prompt [data-act="open-cmd"]');
    await pg.waitForTimeout(100);
    const txt = await pg.inputValue('#repo-text');
    check('it opens the command file on Repo files', (await pg.getAttribute('#tab-claudemd', 'aria-selected')) === 'true' && (await pg.getAttribute('[data-act="repo-file"][data-k^="cmd:"]', 'aria-pressed')) === 'true' && /^\[repo-file\]|BUTTON\[repo-file\]\{cmd:/.test(await fa(pg)) && txt.replace('disable-model-invocation: true\n', '') === '---\ndescription: "Release notes"\nargument-hint: [optional note]\n---\n\nWrite release notes for the last five commits.\n\nExtra note from me, if any: $ARGUMENTS\n', [await fa(pg), txt]);
    check('the file tab shows its path and the how-to names the command', /\.claude\/commands\/release-notes-prompt\.md/.test(await pg.textContent('.file-tabs')) && /type \/release-notes-prompt/.test(await pg.textContent('.how')));
    await pg.click('[data-act="copy-file"]');
    await pg.waitForTimeout(150);
    check('Copy works or selects the text', /\/release-notes copied\.|Copy did not work here/.test(await pg.textContent('#toast')), await pg.textContent('#toast'));
    // rename follows
    await pg.click('#tab-improve');
    await pg.fill('.own-prompt input', 'Weekly notes');
    await pg.click('#tab-claudemd');
    check('renaming the prompt renames the command, and it stays selected', /\/weekly-notes/.test(await pg.textContent('.file-tabs')) && /description: "Weekly notes"/.test(await pg.inputValue('#repo-text')));
    // save a ready-made prompt
    await pg.click('#tab-improve');
    await pg.click('[data-act="quick-prompt"][data-k="bugs"]');
    await pg.waitForTimeout(100);
    check('a ready-made prompt can be saved to your prompts', await pg.isVisible('.modal [data-act="save-quick"]'));
    const edited = (await pg.inputValue('#m-prompt')) + '\nAlso check the importer.';
    await pg.fill('#m-prompt', edited);
    await pg.click('.modal [data-act="save-quick"]');
    await pg.waitForTimeout(150);
    check('saving says where it went and the link turns into a note', /Saved to your prompts on the Improve tab\. In Claude Code it can be \/find-bugs/.test(await pg.textContent('#toast')) && /Saved to your prompts\./.test(await pg.textContent('.modal .sub')) && await pg.locator('.modal [data-act="save-quick"]').count() === 0);
    await pg.click('.modal [data-act="close-modal"]');
    const own = await pg.evaluate(() => [...document.querySelectorAll('.own-prompt')].map((r) => [r.querySelector('input').value, r.querySelector('textarea').value]));
    check('the saved prompt keeps your edits', own.length === 2 && own[1][0] === 'Find bugs' && own[1][1] === edited.trim(), own.map((x) => x[0]));
    await pg.click('.own-prompt >> nth=1 >> [data-act="own-prompt"]');
    await pg.waitForTimeout(100);
    check('your own prompt has no save link', await pg.locator('.modal [data-act="save-quick"]').count() === 0);
    await pg.click('.modal [data-act="close-modal"]');
    // the selected command is deleted
    await pg.click('.own-prompt >> nth=0 >> [data-act="open-cmd"]');
    await pg.click('#tab-improve');
    await pg.click('.own-prompt >> nth=0 >> [data-act="del-prompt"]');
    await pg.click('#tab-claudemd');
    check('when the selected command is deleted, CLAUDE.md shows instead', await pg.isVisible('#f-claudeMd') && !/weekly-notes/.test(await pg.textContent('.file-tabs')));
    check('no page errors', !errs.length, errs);
    await pg.context().close();
  }
  {
    const { pg, errs } = await open(b, 'mocked.html', { viewport: { width: 360, height: 800 } });
    await newWeb(pg, 'Phone');
    await pg.click('#tab-improve');
    for (const n of ['Release notes for the app store', 'Update screenshots']) {
      await pg.click('[data-act="add-prompt"]');
      await pg.keyboard.type(n);
      await pg.fill('.own-prompt >> nth=-1 >> textarea', 'Do it.');
    }
    await pg.click('#tab-claudemd');
    check('360px: eight file tabs (two agents since round 18) fit without page scroll', await pg.locator('.file-tab').count() === 8 && await noScroll(pg), await pg.locator('.file-tab').count());
    await pg.screenshot({ path: __dirname + '/cmds-360.png', fullPage: false });
    check('360px: no page errors', !errs.length, errs);
    await pg.context().close();
  }
  await b.close();
})();
