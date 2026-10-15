// Round 68: the smaller findings. A known issue comes in once, as a bug; a feature follows its tasks and the stage moves
// on; the Typer starter has two commands; imported details keep links and code; a done task clicked back says so, with
// Undo; a long message stays up long enough to read.
const { launch, open, check, results } = require('../r48/lib');
const proj = { kind: 'project', name: 'Pocket Ledger', pitch: 'Totals my bank export.', stage: 'designing', starter: 'cli', commands: 'uv run pytest', guideHidden: true,
  features: [{ id: 'f1', title: 'Read a bank CSV', detail: '', priority: 'must', status: 'todo' }, { id: 'f2', title: 'Budgets', detail: '', priority: 'should', status: 'todo' }],
  milestones: [{ id: 'm1', title: 'Read the CSV', goal: '', tasks: [{ id: 'a', title: 'Parse the CSV', size: 'S', status: 'todo', feat: 'f1' }, { id: 'b', title: 'Add an import command', size: 'S', status: 'todo', feat: 'f1' }, { id: 'c', title: 'Read budgets', size: 'S', status: 'todo', feat: 'f2' }] }],
  lessons: [{ id: 'l1', date: '2026-10-12', happened: 'It used float for money', change: 'Use Decimal for money, never float' }] };
const survey = `<!-- shipyard:survey -->
# mdlinks

Checks the links in Markdown files.

## Tech stack
- Node.js

## Commands
- Test: \`node --test\`

## Features
- [x] Link check: finds broken inline [text](target) links and \`<a href>\` tags
- [ ] Anchor check: checks #anchors against headings

## Known issues
- Crash on an empty file: the parser throws

## Next steps
- [ ] Fix the crash on an empty file
- [ ] Add a --json flag
`;
const init = `window.__SEED__ = ${JSON.stringify({ 'p-s': proj })}; if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('shipyard.seen.v1', '99'); localStorage.setItem('shipyard.ui.v1', JSON.stringify({ activeId: 'p-s', tab: 'plan', view: 'project' })); }`;
const doc = (pg, id = 'p-s') => pg.evaluate((k) => window.__mockDocs.get(k), id);
const toastText = (pg) => pg.evaluate(() => document.querySelector('#toast span')?.textContent || '');
const fst = (d) => Object.fromEntries(d.features.map((f) => [f.id, f.status]));
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const { pg, errs } = await open(b, 'mocked.html', { ctx, init, wait: 1000 });
  check('the Plan tab says a status can be clicked', /Click a status to change it\./.test(await pg.textContent('.toolbar p')));
  check('a status says what a click does', (await pg.getAttribute('[data-act="cycle-task"][data-tid="a"]', 'title')) === 'Click to mark In progress');
  // a feature follows its tasks
  await pg.click('[data-act="cycle-task"][data-tid="a"]');
  await pg.waitForTimeout(1700);
  let d = await doc(pg);
  check('a task started: its feature is In progress', fst(d).f1 === 'doing' && fst(d).f2 === 'todo' && d.stage === 'designing', [fst(d), d.stage]);
  await pg.click('[data-act="cycle-task"][data-tid="a"]');
  await pg.click('[data-act="cycle-task"][data-tid="b"]');
  await pg.click('[data-act="cycle-task"][data-tid="b"]');
  await pg.waitForTimeout(1700);
  d = await doc(pg);
  const doneAt = d.milestones[0].tasks.find((t) => t.id === 'b').doneAt;
  check('every task done: the feature is Done, and the stage moved on to Building', fst(d).f1 === 'done' && d.stage === 'building' && !!doneAt, [fst(d), d.stage, doneAt]);
  // a done task clicked back: said, with Undo
  await pg.click('[data-act="cycle-task"][data-tid="b"]');
  await pg.waitForTimeout(250);
  check('a done task clicked back says so, with Undo', (await toastText(pg)) === '"Add an import command" is To do again.' && !!(await pg.$('#toast [data-act="undo"]')), await toastText(pg));
  await pg.waitForTimeout(1500);
  d = await doc(pg);
  check('...and its feature goes back to In progress', fst(d).f1 === 'doing', fst(d));
  await pg.click('#toast [data-act="undo"]');
  await pg.waitForTimeout(1700);
  d = await doc(pg);
  const tb = d.milestones[0].tasks.find((t) => t.id === 'b');
  check('Undo puts it back done, with its day, and the feature Done', tb.status === 'done' && tb.doneAt === doneAt && fst(d).f1 === 'done', [tb, fst(d)]);
  check('...with focus on its status', (await pg.evaluate(() => document.activeElement?.dataset.tid)) === 'b');
  // a feature set by hand keeps what was set until a task changes
  await pg.click('#tab-design');
  await pg.click('[data-act="cycle-feature"][data-id="f1"]');
  await pg.waitForTimeout(1700);
  d = await doc(pg);
  check('a feature set by hand stays as set', fst(d).f1 === 'todo' && !d.features[0].auto, d.features[0]);
  check('the Design hint says statuses follow tasks', /Click a status to change it; it also follows the feature's tasks\./.test(await pg.textContent('.toolbar p')));
  // a long message stays up
  await pg.click('#tab-improve');
  await pg.click('[data-act="promote"][data-id="l1"]');
  await pg.waitForTimeout(200);
  const words = (await toastText(pg)).split(/\s+/).length;
  await pg.mouse.move(5, 5);
  await pg.waitForTimeout(9000);
  check(`a long message (${words} words) is still up after 9 seconds`, !(await pg.$eval('#toast', (x) => x.hidden)));
  await pg.waitForTimeout(3500);
  check('...and goes after about a third of a second a word, though an Undo in a message was clicked before', await pg.$eval('#toast', (x) => x.hidden));
  // a message waits while the mouse is on it
  await pg.keyboard.press('Control+z');
  await pg.waitForTimeout(200);
  const box = await pg.$eval('#toast', (x) => { const r = x.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await pg.mouse.move(box[0], box[1]);
  await pg.waitForTimeout(6000);
  check('a message stays while the mouse is on it', (await toastText(pg)) === 'Undone.' && !(await pg.$eval('#toast', (x) => x.hidden)), await toastText(pg));
  await pg.mouse.move(5, 5);
  await pg.waitForTimeout(5000);
  check('...and goes once the mouse has left', await pg.$eval('#toast', (x) => x.hidden));
  // Import from your code: a known issue once, and the links kept
  await pg.click('[data-act="open-import"] >> visible=true');
  await pg.waitForTimeout(150);
  await pg.fill('#np-text', survey);
  await pg.waitForTimeout(200);
  await pg.click('.modal [data-act="import"]');
  await pg.waitForTimeout(1700);
  const all = await pg.evaluate(() => [...window.__mockDocs.values()]);
  const m = all.find((x) => x.name === 'mdlinks');
  const tasks = m.milestones.flatMap((x) => x.tasks.map((t) => t.title));
  check('a known issue is a bug, and its fix is not also a task', m.bugs.length === 1 && /Crash on an empty file/.test(m.bugs[0].title) && tasks.join('|') === 'Add a --json flag', [m.bugs.map((x) => x.title), tasks]);
  const lf = m.features.find((f) => f.title === 'Link check');
  check('an imported feature keeps the links and code in its details', lf && lf.detail === 'finds broken inline [text](target) links and `<a href>` tags', lf);
  // the command-line starter
  await pg.click('[data-act="new-project"] >> visible=true');
  await pg.waitForTimeout(150);
  await pg.fill('#np-name', 'Csv Tidy');
  await pg.check('#np-st-cli');
  await pg.click('.modal [data-act="create"]');
  await pg.waitForTimeout(1700);
  const cli = (await pg.evaluate(() => [...window.__mockDocs.values()])).find((x) => x.name === 'Csv Tidy');
  const typer = cli.milestones[0].tasks.find((x) => /Typer command line/.test(x.title));
  check('the Typer app starts with two commands, so hello is called by its name', /with two commands, hello and version \(with only one, Typer runs it without its name/.test(typer.notes), typer.notes);
  check('no page errors', errs.length === 0, errs);
  await b.close();
  const f = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - f}/${results.length} passed`);
  process.exit(f ? 1 : 0);
})();
