const { launch, open, check, mockDoc } = require('./lib');
(async () => {
  const b = await launch();
  // 1. starter without Claude (mocked page, plain Create)
  {
    const { pg, errs, ctx } = await open(b, 'mocked.html');
    await pg.click('[data-act="new-project"] >> visible=true');
    const radios = await pg.$$eval('input[name="np-starter"]', (e) => e.map((x) => x.value + ':' + x.checked));
    check('starter radios listed, blank checked by default', radios.length === 10 && radios[0] === ':true', radios);
    await pg.fill('#np-name', 'Recipe Box');
    await pg.fill('#np-idea', 'Save recipes from links');
    await pg.check('input[name="np-starter"][value="web"]');
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(400);
    const d = await mockDoc(pg, 'Recipe Box');
    check('web starter fills stack, commands, conventions', /Vite/.test(d.stack) && /npm test/.test(d.commands) && /TypeScript/.test(d.conventions), { stack: d.stack, commands: d.commands });
    check('web starter adds screens and first/last milestones', d.screens.length === 2 && d.milestones.map((m) => m.title).join('|') === 'Bare-bones version running|Ready to share' && d.milestones[0].tasks.length === 4, d.milestones.map((m) => m.title + ':' + m.tasks.length));
    check('starter stored on the project', d.starter === 'web', d.starter);
    check('pitch kept from idea', d.pitch === 'Save recipes from links', d.pitch);
    const nu = await pg.textContent('.next h3');
    check('next up is the first setup task', /Vite React/.test(nu), nu);
    // health: commands check passes
    await pg.click('#tab-improve');
    const cmds = await pg.$$eval('.checks .check', (e) => e.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
    check('health: commands written down', cmds.some((t) => /Run and test commands are written down/.test(t)) && !cmds.some((t) => /Run and test commands are written down.*Add them/.test(t)), cmds.filter((t) => /commands/.test(t)));
    console.log('errors', errs);
    await ctx.close();
  }
  // 2. starter + Claude: milestones go between setup and release, stack stays
  {
    const { pg, errs, ctx } = await open(b, 'mocked.html');
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Tidy Tool');
    await pg.fill('#np-idea', 'A CLI that sorts my downloads folder');
    await pg.check('input[name="np-starter"][value="cli"]');
    await pg.click('[data-act="create-ai"]');
    await pg.waitForTimeout(2200);
    const d = await mockDoc(pg, 'Tidy Tool');
    const prompt = await pg.evaluate(() => window.__prompts.find((x) => x.startsWith('Help plan')));
    check('prompt names the starting point and stack', /starting point: Command-line tool/.test(prompt) && /Typer/.test(prompt) && /leave setup and release work out/.test(prompt), prompt.split('\n').slice(1, 4).join(' / '));
    check('Claude milestones inserted between first and last', d.milestones.map((m) => m.title).join('|') === 'Bare-bones version running|Planner|Ready to share', d.milestones.map((m) => m.title));
    check('starter stack kept (not Next.js)', /Typer/.test(d.stack) && !/Next/.test(d.stack), d.stack);
    check('package name from project name in commands', /python -m tidy_tool --help/.test(d.commands), d.commands);
    check('features from Claude', d.features.length === 3, d.features.length);
    const toast = await pg.textContent('#toast');
    check('toast says brief, features and plan', /Brief, features and plan drafted/.test(toast), toast);
    check('stage moved to designing', d.stage === 'designing', d.stage);
    console.log('errors', errs);
    await ctx.close();
  }
  // 3. Not sure yet + Claude: old behaviour
  {
    const { pg, errs, ctx } = await open(b, 'mocked.html');
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Blank One');
    await pg.fill('#np-idea', 'Something');
    await pg.click('[data-act="create-ai"]');
    await pg.waitForTimeout(2200);
    const d = await mockDoc(pg, 'Blank One');
    check('blank + Claude: Claude stack and milestones', d.stack === 'Next.js\nSQLite' && d.milestones.length === 2 && d.starter === '', { stack: d.stack, ms: d.milestones.length });
    console.log('errors', errs);
    await ctx.close();
  }
  // 4. plain page: starters work without Claude, every starter builds
  {
    const { pg, errs, ctx } = await open(b, 'plain.html');
    const keys = await pg.evaluate(() => 1);
    for (const k of ['web', 'mobile', 'ai', 'game', 'extension', 'cli', 'script', 'api', 'bot']) {
      await pg.click('[data-act="new-project"] >> visible=true');
      await pg.fill('#np-name', 'P ' + k);
      await pg.check(`input[name="np-starter"][value="${k}"]`);
      await pg.click('[data-act="create"]');
      await pg.waitForTimeout(150);
    }
    const ls = await pg.evaluate(() => JSON.parse(localStorage.getItem('shipyard.projects.v1')));
    const ps = Object.values(ls.projects || ls).filter((x) => x && x.kind === 'project');
    const bad = ps.filter((p) => !p.stack || !p.commands || !p.conventions || p.milestones.length !== 2 || p.milestones.some((m) => !m.tasks.length || m.tasks.some((t) => !t.title)));
    check('all 9 starters build complete projects', ps.length === 9 && !bad.length, { n: ps.length, bad: bad.map((p) => p.name) });
    const long = ps.flatMap((p) => p.milestones.flatMap((m) => m.tasks)).filter((t) => t.title.length > 90).map((t) => t.title);
    console.log('long task titles:', long);
    console.log('errors', errs);
    await ctx.close();
  }
  await b.close();
})();
