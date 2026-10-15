// Round 18: subagent files on the Repo files tab
const { launch, open, check } = require('./lib');
const noScroll = (pg) => pg.evaluate(() => document.scrollingElement.scrollWidth <= window.innerWidth);
(async () => {
  const b = await launch();
  for (const w of [1280, 360]) {
    const { pg, errs, ctx } = await open(b, 'mocked.html', { viewport: { width: w, height: 900 } });
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Recipe Box');
    await pg.fill('#np-idea', 'Save recipes from links');
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(300);
    await pg.click('#tab-claudemd');
    check(w + ': no checks yet, so no test runner; the reviewer is there', await pg.locator('[data-act="repo-file"][data-k="tester"]').count() === 0 && await pg.locator('[data-act="repo-file"][data-k="reviewer"]').count() === 1);
    await pg.click('[data-act="repo-file"][data-k="reviewer"]');
    let t = await pg.inputValue('#repo-text');
    check(w + ': reviewer.md has the documented frontmatter', t.startsWith('---\nname: reviewer\ndescription: Reviews finished work') && /\ntools: Read, Grep, Glob, Bash, PowerShell\nmodel: inherit\n---\n/.test(t), t.slice(0, 300));
    check(w + ': without commands it reviews by reading', /There are no test commands yet/.test(t) && /You review changes to Recipe Box: Save recipes from links\./.test(t), t);
    check(w + ': the how-to names the path and /agents', /\.claude\/agents\/reviewer\.md/.test(await pg.textContent('.how')) && /\/agents/.test(await pg.textContent('.how')));
    // add commands
    await pg.click('#tab-overview');
    await pg.fill('#f-commands', 'npm install\nnpm run dev\nnpm test\nnpm run lint');
    await pg.click('#tab-claudemd');
    await pg.click('[data-act="repo-file"][data-k="reviewer"]');
    t = await pg.inputValue('#repo-text');
    check(w + ': the reviewer runs the checks, not installs or the dev server', /4\. Run the checks: `npm test`, `npm run lint`\./.test(t), t);
    await pg.click('[data-act="repo-file"][data-k="tester"]');
    t = await pg.inputValue('#repo-text');
    check(w + ': test-runner.md lists the checks', t.startsWith('---\nname: test-runner\n') && /Run these, in order:\n- `npm test`\n- `npm run lint`\n/.test(t) && !/npm install|npm run dev/.test(t), t);
    await pg.click('[data-act="repo-file"][data-k="next"]');
    check(w + ': /next asks the reviewer before ticking a task', /ask it to check the change and fix what it finds/.test(await pg.inputValue('#repo-text')));
    check(w + ': no sideways scroll', await noScroll(pg));
    if (w === 360) await pg.screenshot({ path: __dirname + '/agents-360.png', fullPage: false });
    check(w + ': no page errors', !errs.length, errs);
    await ctx.close();
  }
  await b.close();
})();
