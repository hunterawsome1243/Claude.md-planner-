const { launch, open, check, mockDoc } = require('./lib');
const MD = `# Habit Garden

A tiny web app that turns daily habits into a growing garden. It is for people who quit habit apps.

## Tech stack
- SvelteKit
- SQLite via Drizzle

## Commands
\`\`\`bash
npm install
npm run dev
npm test
\`\`\`

## Code style
- Use TypeScript everywhere
- Keep components under 150 lines

## Features
- [x] Add a habit: name and how often
- [ ] Garden view - plants grow with streaks

## Roadmap
- [x] Set up project
- [ ] Add streak logic
  - count consecutive days
- [ ] Deploy

## Decisions
- 2026-09-01: Use SQLite. Why: one file, easy backup.

Repo: https://github.com/hunter/habit-garden
`;
const README = `# tidy-cli

![build](https://img.shields.io/badge/build-passing-green)

Sorts your downloads folder by file type.

## Installation
Run \`pipx install tidy-cli\` then \`tidy --help\`.

## Usage
\`\`\`
tidy ~/Downloads --dry-run
\`\`\`

## License
MIT
`;
(async () => {
  const b = await launch();
  {
    const { pg, errs, ctx } = await open(b, 'mocked.html');
    await pg.click('.welcome [data-act="open-import"]');
    check('import dialog opens from welcome', (await pg.textContent('#m-title')) === 'Import a project');
    check('focus starts in the text box', await pg.evaluate(() => document.activeElement.id) === 'np-text');
    await pg.fill('#np-text', MD);
    await pg.waitForTimeout(400);
    const note = await pg.textContent('#np-detect');
    const ph = await pg.getAttribute('#np-name', 'placeholder');
    const keep = await pg.isChecked('#np-keepmd');
    check('doc detected, name guessed, keep as CLAUDE.md on', /picks out/.test(note) && ph === 'Habit Garden' && keep, { note, ph, keep });
    check('focus stays in text after the dialog grows', await pg.evaluate(() => document.activeElement.id) === 'np-text');
    const btns = await pg.$$eval('.modal-actions button', (e) => e.map((x) => x.textContent));
    check('buttons: Cancel (opened from the welcome page), Import, Import and fill gaps', btns.join('|') === 'Cancel|Import|Import and fill gaps with Claude', btns);
    await pg.click('[data-act="import"]');
    await pg.waitForTimeout(1500);
    const d = await mockDoc(pg, 'Habit Garden');
    check('name, pitch, repo', d && d.pitch === 'A tiny web app that turns daily habits into a growing garden.' && d.repo === 'https://github.com/hunter/habit-garden', d && { pitch: d.pitch, repo: d.repo });
    check('stack and commands', d.stack === 'SvelteKit\nSQLite via Drizzle' && d.commands === 'npm install\nnpm run dev\nnpm test', { stack: d.stack, commands: d.commands });
    check('conventions', d.conventions === '- Use TypeScript everywhere\n- Keep components under 150 lines', d.conventions);
    check('features with status and detail', JSON.stringify(d.features.map((f) => [f.title, f.detail, f.status])) === JSON.stringify([['Add a habit', 'name and how often', 'done'], ['Garden view', 'plants grow with streaks', 'todo']]), d.features.map((f) => [f.title, f.detail, f.status]));
    check('roadmap becomes a milestone with statuses and notes', d.milestones.length === 1 && d.milestones[0].title === 'Roadmap' && d.milestones[0].tasks.map((t) => t.title + ':' + t.status).join('|') === 'Set up project:done|Add streak logic:todo|Deploy:todo' && d.milestones[0].tasks[1].notes === 'count consecutive days', d.milestones.map((m) => [m.title, m.tasks.map((t) => [t.title, t.status, t.notes])]));
    check('decision with date and why', d.decisions.length === 1 && d.decisions[0].date === '2026-09-01' && d.decisions[0].text === 'Use SQLite.' && d.decisions[0].why === 'one file, easy backup.', d.decisions);
    check('kept as CLAUDE.md', d.claudeMdEdited && d.claudeMd.startsWith('# Habit Garden'), d.claudeMdEdited);
    check('stage building', d.stage === 'building', d.stage);
    const toast = await pg.textContent('#toast');
    check('toast lists what was found', /Imported\. Found the pitch, the stack, commands, 2 rules, 2 features and 3 tasks\./.test(toast), toast);
    // README: keep-as-CLAUDE.md defaults off
    await pg.click('#rail [data-act="open-import"]');
    await pg.fill('#np-text', README);
    await pg.waitForTimeout(100);
    check('README: keep as CLAUDE.md off', !(await pg.isChecked('#np-keepmd')));
    await pg.fill('#np-name', 'Tidy');
    await pg.click('[data-act="import"]');
    await pg.waitForTimeout(1500);
    const r = await mockDoc(pg, 'Tidy');
    check('README: commands from inline and fenced code', r && r.commands === 'pipx install tidy-cli\ntidy --help\ntidy ~/Downloads --dry-run' && !r.claudeMdEdited && r.pitch === 'Sorts your downloads folder by file type.', r && { commands: r.commands, md: r.claudeMdEdited, pitch: r.pitch });
    console.log('errors', errs);
    await ctx.close();
  }
  // Export -> Import round trip and backup -> import
  {
    const { pg, errs, ctx } = await open(b, 'mocked.html');
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Round Trip');
    await pg.fill('#np-idea', 'Recipes');
    await pg.click('[data-act="create-ai"]');
    await pg.waitForTimeout(900);
    // enrich: decision, lesson, screen, statuses, constraints
    await pg.fill('#f-constraints', 'Must run offline\nNo paid services');
    await pg.click('#tab-design');
    await pg.click('[data-act="add-screen"]');
    await pg.keyboard.type('Planner');
    await pg.fill('.row2 textarea', 'Week grid\nwith drag');
    await pg.click('[data-act="add-decision"]');
    await pg.keyboard.type('Use SQLite');
    await pg.fill('[data-path$=".why"]', 'Simple');
    await pg.click('[data-act="cycle-feature"] >> nth=0');
    await pg.click('[data-act="cycle-feature"] >> nth=0');
    await pg.click('#tab-plan');
    await pg.click('[data-act="cycle-task"] >> nth=0');
    await pg.click('#tab-improve');
    await pg.click('[data-act="add-lesson"]');
    await pg.keyboard.type('Claude rewrote everything');
    await pg.fill('[data-path$=".change"]', 'Only touch named files');
    await pg.waitForTimeout(1500);
    const before = await mockDoc(pg, 'Round Trip');
    await pg.click('[data-act="export"]');
    const md = await pg.inputValue('#m-export');
    await pg.click('[data-act="close-modal"]');
    await pg.click('#rail [data-act="open-import"]');
    await pg.fill('#np-text', md);
    await pg.waitForTimeout(100);
    const note = await pg.textContent('#np-detect');
    check('export detected as a Shipyard plan, no name/keep fields', /exported from Shipyard/.test(note) && !(await pg.isVisible('#np-name')) && !(await pg.isVisible('#np-keepmd')), note);
    await pg.click('[data-act="import"]');
    await pg.waitForTimeout(1500);
    const after = await mockDoc(pg, 'Round Trip (imported)');
    const pick = (p) => ({
      stage: p.stage, pitch: p.pitch, audience: p.audience, problem: p.problem, doneWhen: p.doneWhen, stack: p.stack, commands: p.commands, conventions: p.conventions, constraints: p.constraints.replace(/^- /gm, ''), repo: p.repo,
      features: p.features.map((f) => [f.title, f.detail, f.priority, f.status]),
      screens: p.screens.map((s) => [s.name, s.notes.replace(/\s*\n\s*/g, ' ')]),
      milestones: p.milestones.map((m) => [m.title, m.goal, m.tasks.map((t) => [t.title, t.size, t.status, t.notes])]),
      decisions: p.decisions.map((d) => [d.date, d.text.replace(/\.$/, ''), d.why.replace(/\.$/, '')]),
      lessons: p.lessons.map((l) => [l.date, l.happened.replace(/\.$/, ''), l.change.replace(/\.$/, '')]),
    });
    const A = pick(before); const B = after ? pick(after) : {};
    const diff = Object.keys(A).filter((k) => JSON.stringify(A[k]) !== JSON.stringify(B[k]));
    check('export then import keeps everything', after && !diff.length, diff.map((k) => ({ k, a: A[k], b: B[k] })));
    // backup
    await pg.click('#rail [data-act="backup"]');
    const json = await pg.inputValue('#m-backup');
    const parsed = JSON.parse(json);
    check('backup has every project', parsed.app === 'shipyard' && parsed.projects.length === 2, parsed.projects.map((p) => p.name));
    await pg.click('[data-act="download-backup"]');
    await pg.waitForTimeout(100);
    const saved = await pg.evaluate(() => window.__mockLog.filter((x) => x[0] === 'save').map((x) => x[1]));
    check('backup download named with date', /^shipyard-backup-\d{4}-\d{2}-\d{2}\.json$/.test(saved[0] || ''), saved);
    await pg.click('[data-act="close-modal"]');
    await pg.click('#rail [data-act="open-import"]');
    await pg.setInputFiles('#np-file', { name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(json) });
    await pg.waitForTimeout(300);
    const note2 = await pg.textContent('#np-detect');
    check('backup file read, detected with count', /A Shipyard backup with 2 projects/.test(note2), note2);
    await pg.click('[data-act="import"]');
    await pg.waitForTimeout(1500);
    const names = await pg.$$eval('#plist .nm', (e) => e.map((x) => x.textContent));
    check('a backup of projects already here imports nothing (round 66)', [...names].sort().join('|') === 'Round Trip|Round Trip (imported)', names);
    const said = await pg.textContent('.modal [role="alert"]');
    check('...and says so', /All 2 projects in this backup are already here, unchanged\. Nothing to import\./.test(said), said);
    await pg.click('.modal [data-act="close-modal"]');
    console.log('errors', errs);
    await ctx.close();
  }
  // Claude import fills gaps only
  {
    const { pg, errs, ctx } = await open(b, 'mocked.html');
    await pg.click('[data-act="open-import"] >> visible=true');
    await pg.fill('#np-text', '# Notes App\n\nA notes app.\n\n## Commands\n```\nnpm start\n```\n');
    await pg.waitForTimeout(100);
    await pg.click('[data-act="import-ai"]');
    await pg.waitForTimeout(200);
    const working = await pg.textContent('.working');
    check('working banner while Claude reads', /reading the document/.test(working), working);
    await pg.waitForTimeout(2000);
    const d = await mockDoc(pg, 'Notes App');
    check('Claude fills empty fields only', d.pitch === 'A notes app.' && d.commands === 'npm start' && d.audience === 'Claude audience' && d.stack === 'Claude stack', { pitch: d.pitch, commands: d.commands, audience: d.audience });
    check('Claude features keep done status, plan added', d.features.map((f) => f.status).join() === 'done,todo' && d.milestones[0]?.title === 'Finish sync', { f: d.features.map((f) => f.status), m: d.milestones.map((m) => m.title) });
    const prompt = await pg.evaluate(() => window.__prompts.find((x) => x.startsWith('Turn this')));
    check('prompt carries the document', /# Notes App/.test(prompt));
    const toast = await pg.textContent('#toast');
    console.log('toast:', toast);
    // errors: empty and bad json
    await pg.click('#rail [data-act="open-import"]');
    await pg.click('[data-act="import"]');
    check('empty import shows a message', /Paste something/.test(await pg.textContent('.modal [role="alert"]')));
    await pg.fill('#np-text', '{"foo": 1}');
    await pg.click('[data-act="import"]');
    check('bad json shows a message', /not a Shipyard backup/.test(await pg.textContent('.modal [role="alert"]')));
    await pg.click('.modal .modal-actions .left');
    check('Cancel closes Import opened from the list (round 67)', !(await pg.$('.modal')));
    console.log('errors', errs);
    await ctx.close();
  }
  await b.close();
})();
