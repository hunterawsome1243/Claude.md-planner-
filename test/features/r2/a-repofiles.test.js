const { launch, open, check, mockDoc } = require('./lib');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + (e.dataset.k ? ':' + e.dataset.k : '') + ']' : '') : null; });
(async () => {
  const b = await launch();
  const { pg, errs, ctx } = await open(b, 'mocked.html');
  await pg.click('[data-act="new-project"] >> visible=true');
  await pg.fill('#np-name', 'Recipe Box');
  await pg.fill('#np-idea', 'Recipes');
  await pg.check('input[name="np-starter"][value="web"]');
  await pg.click('[data-act="create"]');
  await pg.waitForTimeout(300);
  const tabs = await pg.$$eval('.tab', (e) => e.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
  check('tab renamed to Project files (round 67)', tabs[3] === 'Project files', tabs);
  await pg.click('#tab-claudemd');
  const files = await pg.$$eval('.file-tab', (e) => e.map((x) => x.querySelector('b').textContent + '|' + x.getAttribute('aria-pressed')));
  check('the files, CLAUDE.md first and selected (round 18 added the two agents)', files.join(',') === 'CLAUDE.md|true,PLAN.md|false,/next command|false,Permissions|false,Reviewer agent|false,Test runner agent|false', files);
  check('CLAUDE.md editable', !(await pg.getAttribute('#f-claudeMd', 'readonly')));
  // PLAN.md
  await pg.click('[data-act="repo-file"][data-k="plan"]');
  check('focus stays on the file tab', (await fa(pg)) === 'BUTTON[repo-file:plan]', await fa(pg));
  const plan = await pg.inputValue('#repo-text');
  check('PLAN.md has milestones, tasks with ids and notes', /^# Plan: Recipe Box/.test(plan) && /## Milestone 1: Bare-bones version running/.test(plan) && /- \[ \] Create a Vite React TypeScript project in this folder \(S\) <!-- id:t[a-z0-9]+ -->/.test(plan) && /\n  Notes: First run git init, unless this folder is already in git\. Scaffold in a temporary folder/.test(plan), plan.slice(0, 600));
  check('PLAN.md readonly', (await pg.getAttribute('#repo-text', 'readonly')) !== null);
  const how = await pg.textContent('.how');
  check('how-to talks about Update from PLAN.md', /Update from PLAN\.md/.test(how), how);
  // next
  await pg.click('[data-act="repo-file"][data-k="next"]');
  const next = await pg.inputValue('#repo-text');
  check('/next command has frontmatter and $ARGUMENTS', /^---\ndescription: Do the next task from PLAN\.md\nargument-hint: .*\n(disable-model-invocation: true\n)?---\n/.test(next) && /\$ARGUMENTS/.test(next) && /Commands section of CLAUDE\.md/.test(next), next.slice(0, 200));
  // settings
  await pg.click('[data-act="repo-file"][data-k="settings"]');
  const settings = JSON.parse(await pg.inputValue('#repo-text'));
  check('settings allow test/build/install, not dev; deny .env', JSON.stringify(settings.permissions.allow) === JSON.stringify(['Bash(npm install)', 'PowerShell(npm install)', 'Bash(npm test *)', 'PowerShell(npm test *)', 'Bash(npm run build *)', 'PowerShell(npm run build *)']) && settings.permissions.deny.includes('Read(.env)') && settings.permissions.deny.includes('Read(!.env.example)'), settings);
  await pg.click('[data-act="download-file"][data-k="settings"]');
  await pg.waitForTimeout(100);
  const saved = await pg.evaluate(() => window.__mockLog.filter((x) => x[0] === 'save').map((x) => x[1]));
  check('download uses the bare file name', saved.includes('settings.json'), saved);
  // remembered after reload
  const ui = await pg.evaluate(() => JSON.parse(localStorage.getItem('shipyard.ui.v1')));
  check('chosen file remembered', ui.repoFile === 'settings', ui);
  // plan sync
  await pg.click('[data-act="repo-file"][data-k="plan"]');
  let md = await pg.inputValue('#repo-text');
  const d0 = await mockDoc(pg, 'Recipe Box');
  const [t1, t2, t3, t4] = d0.milestones[0].tasks;
  md = md.replace(/- \[ \] (Create a Vite[^\n]*)/, '- [x] $1')
    .replace(/- \[ \] Add Vitest with one passing test \(S\)/, '- [x] Add Vitest and a first test (S)') // reworded, id kept
    .replace(/(Replace the starter page[^\n]*)\(M\)/, '$1(M, in progress)')
    .replace(/(  Notes: A header, the main area[^\n]*)/, '$1 Used CSS grid.')
    .replace(/(- \[ \] Commit the setup to git[^\n]*\n  Notes:[^\n]*\n)/, '$1- [ ] Add a favicon (S)\n  Notes: Use the logo.\n');
  await pg.click('#tab-plan');
  await pg.click('[data-act="open-plansync"]');
  check('sync dialog opens with focus in the text box', (await fa(pg)) === 'TEXTAREA#ps-text', await fa(pg));
  check('apply disabled before paste', await pg.isDisabled('[data-act="apply-plansync"]'));
  await pg.fill('#ps-text', md);
  const note = await pg.textContent('#ps-note');
  check('preview counts the changes', note.startsWith('This will update the plan: 2 tasks marked done, 1 task marked in progress, 1 new task added, notes added to 1 task. Done: "'), note);
  await pg.click('[data-act="apply-plansync"]');
  await pg.waitForTimeout(1500);
  const d1 = await mockDoc(pg, 'Recipe Box');
  const m1 = d1.milestones[0];
  check('statuses moved forward', m1.tasks[0].status === 'done' && m1.tasks[1].status === 'done' && m1.tasks[2].status === 'doing', m1.tasks.map((t) => t.status));
  check('reworded task kept its own title', m1.tasks[1].title === 'Add Vitest with one passing test', m1.tasks[1].title);
  check('notes appended', /Check: it looks right at laptop and phone widths\. Used CSS grid\.$/.test(m1.tasks[2].notes), m1.tasks[2].notes);
  check('new task added at the end of milestone 1 with notes', m1.tasks.length === 5 && m1.tasks[4].title === 'Add a favicon' && m1.tasks[4].size === 'S' && m1.tasks[4].notes === 'Use the logo.', m1.tasks.map((t) => t.title));
  check('focus back on Update from PLAN.md', (await fa(pg)) === 'BUTTON#open-plansync[open-plansync]', await fa(pg));
  const toast = await pg.textContent('#toast');
  check('toast says what changed', /^Plan updated: 2 tasks marked done/.test(toast), toast);
  // same file again: nothing to change; unticking never moves back
  await pg.click('[data-act="open-plansync"]');
  await pg.fill('#ps-text', md.replace('- [x] Create a Vite', '- [ ] Create a Vite').replace('- [ ] Add a favicon (S)', '- [ ] Add a favicon (S)'));
  const note2 = await pg.textContent('#ps-note');
  check('second paste: favicon would be added again?', true, note2);
  await pg.keyboard.press('Escape');
  // another project's plan
  await pg.click('[data-act="open-plansync"]');
  await pg.fill('#ps-text', '# Plan: Other\n\n## Milestone 1: Something\n\n- [x] Unrelated task (S)\n');
  const note3 = await pg.textContent('#ps-note');
  check('other project plan refused', /Is this the PLAN\.md for another project/.test(note3) && await pg.isDisabled('[data-act="apply-plansync"]'), note3);
  await pg.keyboard.press('Escape');
  check('escape returns focus to the button', (await fa(pg)) === 'BUTTON#open-plansync[open-plansync]', await fa(pg));
  console.log('errors', errs);
  await ctx.close();
  await b.close();
})();
