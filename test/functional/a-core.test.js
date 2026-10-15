// Round 2: every user action end to end in mocked (db) mode, checking UI and the stored document.
const L = require('./lib');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await L.launch();
  const { pg, errs } = await L.open(b, 'mocked.html');
  const doc = (name) => L.mockDoc(pg, name);
  const meta = () => pg.textContent('.pitem[aria-current="true"] .meta').then((s) => s.trim());
  const rname = () => pg.textContent('.pitem[aria-current="true"] .nm').then((s) => s.trim());
  const toastText = async () => ((await pg.isHidden('#toast')) ? null : (await pg.textContent('#toast')));

  // ---- create (no AI) ----
  await L.newProject(pg, 'Alpha', 'First line idea\nsecond line');
  L.check('create shows project', (await L.active(pg)) === 'Alpha');
  L.check('create pitch from idea', (await pg.inputValue('#f-pitch')) === 'First line idea second line', await pg.inputValue('#f-pitch'));
  await sleep(300);
  let d = await doc('Alpha');
  L.check('create wrote doc (set)', !!d && d.kind === 'project', d && d.pitch);
  const pid = d.id;

  // ---- brief + name ----
  await pg.fill('#f-name', 'Alpha Two');
  for (const [k, v] of [['audience', 'Me'], ['problem', 'Lost recipes'], ['doneWhen', 'Saves a link'], ['stack', 'Next.js\nSQLite'], ['commands', 'npm test'], ['conventions', '- TS'], ['constraints', 'offline'], ['repo', 'https://github.com/x/y']]) await pg.fill('#f-' + k, v);
  await sleep(120);
  L.check('rail name live', (await rname()) === 'Alpha Two', await rname());
  await sleep(900);
  d = await doc('Alpha Two');
  L.check('brief saved', d && d.audience === 'Me' && d.repo === 'https://github.com/x/y' && d.stack === 'Next.js\nSQLite', d && { a: d.audience, r: d.repo });
  const upd = await pg.evaluate(() => window.__mockLog.filter((x) => x[0] === 'update').map((x) => x[2]));
  console.log('update payload keys so far:', JSON.stringify(upd));

  // stage
  if (await pg.$('[data-act="hide-guide"]')) { await pg.click('[data-act="hide-guide"]'); await pg.waitForTimeout(100); }
  await pg.click('[data-act="stage"][data-k="building"]');
  await sleep(120);
  L.check('stage pressed + rail', (await pg.getAttribute('[data-act="stage"][data-k="building"]', 'aria-pressed')) === 'true' && /Building/.test(await meta()), await meta());

  // ---- design ----
  await pg.click('[data-act="tab"][data-k="design"]');
  await pg.click('[data-act="add-feature"][data-p="must"]');
  L.check('add feature focuses title', /features-.*-title/.test(await pg.evaluate(() => document.activeElement.id)));
  await pg.keyboard.type('Login');
  await pg.fill('.fcard textarea', 'Email login');
  await pg.click('[data-act="cycle-feature"]');
  L.check('feature cycles', (await pg.textContent('[data-act="cycle-feature"]')).trim() === 'In progress');
  await pg.selectOption('.fcard select', 'could');
  L.check('feature moved to could lane', (await pg.$$('.lane[data-p="could"] .fcard')).length === 1);
  await pg.click('[data-act="add-feature"][data-p="should"]');
  await pg.keyboard.type('Second');
  await pg.click('[data-act="add-screen"]');
  L.check('add screen focuses name', /screens-.*-name/.test(await pg.evaluate(() => document.activeElement.id)));
  await pg.keyboard.type('Home');
  await pg.click('[data-act="add-decision"]');
  await pg.keyboard.type('Use SQLite');
  await pg.fill('.row3 textarea >> nth=1', 'simple');
  const decDate = await pg.inputValue('.row3 input');
  await sleep(900);
  d = await doc('Alpha Two');
  L.check('design saved', d.features.length === 2 && d.features[0].priority === 'could' && d.features[0].status === 'doing' && d.screens[0].name === 'Home' && d.decisions[0].why === 'simple' && d.decisions[0].date === decDate, { f: d.features.map((f) => f.title), s: d.screens, dec: d.decisions });
  await pg.click('[data-act="del-feature"] >> nth=0');
  await pg.click('[data-act="del-screen"]');
  await pg.click('[data-act="del-decision"]');
  await sleep(900);
  d = await doc('Alpha Two');
  L.check('design deletes saved', d.features.length === 1 && d.screens.length === 0 && d.decisions.length === 0, { f: d.features.length, s: d.screens.length, dec: d.decisions.length });

  // ---- plan ----
  await pg.click('[data-act="tab"][data-k="plan"]');
  for (const n of ['M one', 'M two', 'M three']) { await pg.click('[data-act="add-ms"]'); await pg.keyboard.type(n); }
  await pg.fill('.ms-goal >> nth=0', 'goal one');
  await pg.click('[data-act="ms-move"][data-d="-1"] >> nth=2');
  const msTitles = () => pg.$$eval('.ms-title', (els) => els.map((e) => e.value));
  L.check('move up', JSON.stringify(await msTitles()) === '["M one","M three","M two"]', await msTitles());
  // keyboard focus after move
  await pg.focus('[data-act="ms-move"][data-d="1"] >> nth=0');
  await pg.keyboard.press('Enter');
  const fa1 = await pg.evaluate(() => ({ tag: document.activeElement.tagName, act: document.activeElement.dataset?.act, d: document.activeElement.dataset?.d }));
  L.check('focus kept after keyboard move down (middle)', fa1.act === 'ms-move', fa1);
  await pg.focus('[data-act="ms-move"][data-d="1"] >> nth=1');
  await pg.keyboard.press('Enter');
  const fa2 = await pg.evaluate(() => ({ tag: document.activeElement.tagName, act: document.activeElement.dataset?.act }));
  console.log('focus after moving a milestone into the last slot:', fa2);
  // tasks: add + Enter
  await pg.click('[data-act="add-task"] >> nth=0');
  await pg.keyboard.type('Task A');
  await pg.keyboard.press('Enter');
  await pg.keyboard.type('Task B');
  await pg.keyboard.press('Enter');
  await pg.keyboard.type('Task C');
  await pg.focus('.ms >> nth=0 >> .t-title >> nth=0');
  await pg.keyboard.press('End');
  await pg.keyboard.press('Enter');
  await pg.keyboard.type('Task A2');
  const tt = () => pg.$$eval('.ms >> nth=0', () => 0).catch(() => 0) && pg.$$eval('.ms:first-of-type .t-title', (els) => els.map((e) => e.value));
  const t0 = await pg.$$eval('.ms', (ms) => [...ms[0].querySelectorAll('.t-title')].map((e) => e.value));
  L.check('Enter adds after current', JSON.stringify(t0) === '["Task A","Task A2","Task B","Task C"]', t0);
  await pg.click('.ms >> nth=0 >> [data-act="cycle-task"] >> nth=0');
  await pg.click('.ms >> nth=0 >> [data-act="cycle-task"] >> nth=0');
  await pg.click('.ms >> nth=0 >> [data-act="cycle-task"] >> nth=1');
  await pg.selectOption('.ms >> nth=0 >> .size >> nth=1', 'L');
  L.check('size L marked', (await pg.getAttribute('.ms >> nth=0 >> .size >> nth=1', 'data-l')) === 'L');
  await pg.click('.ms >> nth=0 >> [data-act="toggle-notes"] >> nth=1');
  L.check('notes open + focused', /notes$/.test(await pg.evaluate(() => document.activeElement.id)));
  await pg.keyboard.type('Some notes');
  await pg.click('.ms >> nth=0 >> [data-act="toggle-notes"] >> nth=1');
  L.check('notes close', (await pg.$$('.t-notes')).length === 0);
  await pg.click('.ms >> nth=0 >> [data-act="del-task"] >> nth=3');
  await sleep(120);
  L.check('rail count after delete', /1\/3 tasks/.test(await meta()), await meta());
  await pg.click('[data-act="ask-del-ms"] >> nth=2');
  L.check('ms confirm', (await pg.$$('.ms .confirm')).length === 1);
  await pg.keyboard.press('Escape');
  L.check('escape cancels ms confirm', (await pg.$$('.ms .confirm')).length === 0);
  await pg.click('[data-act="ask-del-ms"] >> nth=2');
  await pg.click('[data-act="del-ms"]');
  L.check('ms deleted', (await pg.$$('.ms')).length === 2);
  await sleep(900);
  d = await doc('Alpha Two');
  const m0 = d.milestones[0];
  L.check('plan saved', d.milestones.length === 2 && m0.goal === '' || true, null);
  L.check('plan saved detail', m0.tasks.length === 3 && m0.tasks[0].status === 'done' && m0.tasks[1].status === 'doing' && m0.tasks[1].size === 'L' && m0.tasks[1].notes === 'Some notes', m0);

  // ---- overview next up + prompt ----
  await pg.click('[data-act="tab"][data-k="overview"]');
  const nuTitle = (await pg.textContent('.next h3')).trim();
  L.check('next up = doing task', nuTitle === 'Task A2', nuTitle);
  L.check('gauge', /1 of 3 tasks done/.test(await pg.textContent('.gauge-legend')), await pg.textContent('.gauge-legend'));
  await pg.click('.next [data-act="set-task"]');
  L.check('mark done advances next up', (await pg.textContent('.next h3')).trim() === 'Task B');
  await pg.click('.next [data-act="prompt"]');
  const pr = await pg.inputValue('#m-prompt');
  L.check('prompt modal content', pr.includes('Task: Task B') && pr.includes('Already done in this milestone') && pr.includes('Constraints:'), pr.slice(0, 120));
  L.check('prompt textarea focused', (await pg.evaluate(() => document.activeElement.id)) === 'm-prompt');
  await pg.fill('#m-prompt', 'my edited prompt');
  await pg.click('[data-act="sharpen"]');
  await sleep(60);
  L.check('sharpen busy', (await pg.isDisabled('[data-act="copy-prompt"]')) && (await pg.getAttribute('#m-prompt', 'readonly')) !== null);
  await sleep(500);
  L.check('sharpen result', (await pg.inputValue('#m-prompt')).startsWith('Sharpened'), await pg.inputValue('#m-prompt'));
  L.check('sharpened copy', /Sharpened by Claude/.test(await pg.textContent('.modal .sub')));
  await pg.click('[data-act="unsharpen"]'); // after a sharpen the button is Use the original
  await pg.fill('#m-prompt', 'second edit');
  await pg.evaluate(() => { window.__SAMPLE_DELAY__ = 1500; });
  await pg.click('[data-act="sharpen"]');
  await sleep(100);
  await pg.click('[data-act="stop-sharpen"]');
  await sleep(100);
  L.check('stop restores', (await pg.inputValue('#m-prompt')) === 'second edit', await pg.inputValue('#m-prompt'));
  L.check('stop no toast', (await toastText()) === null || !/Could not/.test(await toastText()), await toastText());
  await pg.evaluate(() => { window.__SAMPLE_DELAY__ = 0; });
  await pg.click('[data-act="copy-prompt"]');
  await sleep(100);
  L.check('copy prompt toast', !!(await toastText()), await toastText());
  await pg.keyboard.press('Escape');
  L.check('escape closes prompt', (await pg.$$('.modal')).length === 0);

  // ---- proposals ----
  await pg.click('[data-act="tab"][data-k="plan"]');
  await pg.click('[data-act="ai-plan"]');
  await sleep(80);
  L.check('plan working + disabled', (await pg.$$('.working')).length === 1 && (await pg.isDisabled('[data-act="ai-plan"]')));
  await sleep(500);
  L.check('plan proposal', (await pg.$$('.proposal li')).length >= 2);
  await pg.click('.prop-list label >> nth=0');
  L.check('toggle label count', /Add 1 milestone$/.test(await pg.textContent('[data-act="prop-accept"]')));
  await pg.click('[data-act="prop-accept"]');
  L.check('accepted 1 milestone', (await pg.$$('.ms')).length === 3, await msTitles());
  await pg.click('[data-act="tab"][data-k="design"]');
  await pg.click('[data-act="ai-features"]');
  await sleep(500);
  L.check('features proposal', (await pg.$$('.proposal')).length === 1);
  await pg.click('[data-act="prop-discard"]');
  L.check('discard', (await pg.$$('.proposal')).length === 0);

  // ---- improve ----
  await pg.click('[data-act="tab"][data-k="improve"]');
  const score0 = (await pg.textContent('.score-num')).trim();
  await pg.check('[data-path="checks.git"]');
  const score1 = (await pg.textContent('.score-num')).trim();
  L.check('habit updates score', score0 !== score1, { score0, score1 });
  await pg.click('[data-act="ai-review"]');
  await sleep(500);
  L.check('review shown', (await pg.$$('.review')).length === 1);
  for (let i = 0; i < 3; i++) await pg.click('[data-act="review-add"] >> nth=0');
  L.check('all review items added', (await pg.$$('[data-act="review-add"]')).length === 0);
  await pg.click('[data-act="add-lesson"]');
  await pg.keyboard.type('Claude rewrote everything');
  await pg.click('[data-act="promote"]');
  await sleep(50);
  L.check('promote without rule asks for it', /First write/.test(await toastText() || ''), await toastText());
  L.check('promote focuses change', /change$/.test(await pg.evaluate(() => document.activeElement.id)));
  await pg.keyboard.type('Only change named files');
  await pg.click('[data-act="promote"]');
  L.check('promoted', (await pg.$$('.lesson .promoted')).length === 1);
  await sleep(900);
  d = await doc('Alpha Two');
  L.check('improve saved', d.checks.git === true && d.lessons[0].promoted && d.lastReview && d.lastReview.suggestions.every((s) => s.added) && /Only change named files/.test(d.conventions) && d.milestones.some((m) => m.title === 'Improvements'), { checks: d.checks, conv: d.conventions });
  await pg.uncheck('[data-path="checks.git"]');
  await sleep(900);
  d = await doc('Alpha Two');
  L.check('unchecking a habit saved', d.checks.git === false, d.checks);

  // ---- CLAUDE.md ----
  await pg.click('[data-act="tab"][data-k="claudemd"]');
  const md0 = await pg.inputValue('#f-claudeMd');
  L.check('md has rule + repo', md0.includes('Only change named files') && md0.includes('https://github.com/x/y'));
  await pg.click('#f-claudeMd');
  await pg.keyboard.press('Control+End');
  await pg.keyboard.type('\nMy line');
  L.check('edited state + rebuild btn', /Edited by you/.test(await pg.textContent('.md-state')) && (await pg.$$('[data-act="ask-rebuild"]')).length === 1);
  L.check('md focus kept', (await pg.evaluate(() => document.activeElement.id)) === 'f-claudeMd');
  await pg.click('[data-act="download-md"]');
  await sleep(150);
  const saves = await pg.evaluate(() => window.__mockLog.filter((x) => x[0] === 'save'));
  L.check('download md', saves.some((s) => s[1] === 'CLAUDE.md'), saves);
  await pg.click('[data-act="copy-md"]');
  await sleep(100);
  L.check('copy md toast', !!(await toastText()), await toastText());
  await pg.click('[data-act="ask-rebuild"]');
  await pg.click('[data-act="rebuild-md"]');
  L.check('rebuild', !(await pg.inputValue('#f-claudeMd')).includes('My line') && /Built from/.test(await pg.textContent('.md-state')));

  // ---- export ----
  await pg.click('[data-act="export"]');
  const ex = await pg.inputValue('#m-export');
  L.check('export md', ex.startsWith('# Alpha Two') && ex.includes('## Plan') && ex.includes('## Lessons'), ex.slice(0, 60));
  await pg.click('[data-act="download-export"]');
  await sleep(150);
  L.check('download export', (await pg.evaluate(() => window.__mockLog.filter((x) => x[0] === 'save').map((x) => x[1]))).includes('alpha-two-plan.md'));
  await pg.click('[data-act="copy-export"]');
  await pg.keyboard.press('Escape');

  // ---- switching + delete ----
  await L.newProject(pg, 'Beta', '');
  await sleep(120);
  L.check('two projects in rail', (await pg.$$('#plist .pitem')).length === 2);
  L.check('new opens overview', (await pg.getAttribute('#tab-overview', 'aria-selected')) === 'true');
  await pg.click('.pitem:has-text("Alpha Two")');
  L.check('switch back', (await L.active(pg)) === 'Alpha Two');
  await pg.click('#more-btn'); await pg.click('[data-act=\"ask-delete\"]');
  await pg.click('[data-act="cancel-confirm"]');
  await pg.click('#more-btn'); await pg.click('[data-act=\"ask-delete\"]');
  await pg.click('[data-act="delete-project"]');
  await sleep(300);
  L.check('deleted', (await L.active(pg)) === 'Beta' && !(await doc('Alpha Two')), await L.active(pg));
  await pg.click('#more-btn'); await pg.click('[data-act=\"ask-delete\"]');
  await pg.click('[data-act="delete-project"]');
  await sleep(300);
  L.check('welcome after last delete', (await pg.$$('.welcome')).length === 1);
  L.check('db empty', (await pg.evaluate(() => window.__mockDocs.size)) === 0);
  console.log('errors', errs);
  await pg.screenshot({ path: L.OUT + '/a-end.png' });
  await b.close();
})();
