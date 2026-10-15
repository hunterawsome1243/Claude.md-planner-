// Priya's state after six weeks: a web app in Milestone 3 (40 tasks, 25 sessions), a CLI nearly shipped, an archived project.
// Today in the sandbox is Wed 2026-10-14 (week of Mon 2026-10-12).
function web() {
  let n = 0;
  const T = (title, size, status, doneAt, notes = '', feat = '') => ({ id: 'tw' + (++n), title, size, status, doneAt: doneAt || '', notes, feat, splitFrom: '' });
  const m1 = { id: 'mw1', title: 'Bare-bones version running', goal: 'The app starts and shows an empty pantry.', tasks: [
    T('Set up the Next.js app', 'S', 'done', '2026-09-03'), T('Add SQLite with Prisma', 'M', 'done', '2026-09-04'),
    T('Show an empty pantry page', 'S', 'done', '2026-09-08'), T('Add a smoke test', 'S', 'done', '2026-09-09'),
    T('Put the project in git and make the first commit', 'S', 'done', '2026-09-09'), T('Deploy a preview to Vercel', 'M', 'done', '2026-09-11') ] };
  const m2 = { id: 'mw2', title: 'Accounts and saving', goal: 'People sign in and their pantry is saved.', tasks: [
    T('Add email sign in', 'M', 'done', '2026-09-15', '', 'fw1'), T('Save pantry items per user', 'M', 'done', '2026-09-16', '', 'fw2'),
    T('Edit and delete pantry items', 'M', 'done', '2026-09-17', '', 'fw2'), T('Add quantities and units', 'S', 'done', '2026-09-22', '', 'fw2'),
    T('Show items running low', 'M', 'done', '2026-09-23', '', 'fw2'), T('Add a sign out button', 'S', 'done', '2026-09-24', '', 'fw1'),
    T('Test saving with two accounts', 'S', 'done', '2026-09-29'), T('Handle a lost session cookie', 'M', 'done', '2026-09-30', '', 'fw1') ] };
  const m3 = { id: 'mw3', title: 'Meal planner', goal: 'A week of meals planned from what is in the pantry.', tasks: [
    T('Lay out the week grid', 'M', 'done', '2026-10-01', 'Seven columns, one per day.', 'fw3'), T('Add a recipe to a day', 'M', 'done', '2026-10-05', '', 'fw3'),
    T('Remove a recipe from a day', 'S', 'done', '2026-10-06', '', 'fw3'), T('Save the week plan', 'M', 'done', '2026-10-08', '', 'fw3'),
    T('Show which ingredients are missing', 'M', 'done', '2026-10-12', '', 'fw4'), T('Drag recipes between days', 'M', 'doing', '', 'Touch and mouse both.', 'fw3'),
    T('Suggest meals from the pantry', 'L', 'todo', '', 'Rank recipes by how many ingredients are in the pantry.', 'fw4'),
    T('Copy last week into this week', 'S', 'todo', '', '', 'fw3'), T('Print the week plan', 'S', 'todo', '', '', 'fw3'), T('Test the planner on a phone', 'S', 'todo', '') ] };
  const m4 = { id: 'mw4', title: 'Shopping list', goal: 'A shopping list made from the week plan.', tasks: [
    T('Add a shopping list page', 'S', 'todo', '', '', 'fw5'), T('Collect ingredients from the week plan', 'M', 'todo', '', '', 'fw5'),
    T('Tick items off in the shop', 'S', 'todo', '', '', 'fw5'), T('Move ticked items into the pantry', 'M', 'todo', '', '', 'fw5'),
    T('Group the list by aisle', 'M', 'todo', '', '', 'fw5'), T('Share the list by link', 'M', 'todo', '', '', 'fw6'),
    T('Clear the list after shopping', 'S', 'todo', ''), T('Test the list offline', 'S', 'todo', '') ] };
  const m5 = { id: 'mw5', title: 'Ready to share', goal: 'Friends can sign up and use it.', tasks: [
    T('Write the README', 'S', 'todo', ''), T('Add an onboarding screen', 'M', 'todo', ''), T('Check security', 'M', 'todo', ''),
    T('Add error pages', 'S', 'todo', ''), T('Set up backups', 'M', 'todo', ''), T('Add a privacy note', 'S', 'todo', ''),
    T('Deploy to production', 'M', 'todo', ''), T('Invite three friends', 'S', 'todo', '') ] };
  const ms = [m1, m2, m3, m4, m5];
  const all = ms.flatMap((m) => m.tasks.map((t) => ({ m, t })));
  const find = (title) => all.find((x) => x.t.title === title);
  const sum = (what) => `Done: ${what}. I changed the components and the API route, added tests and ran npm test, which passes (42 tests). Things to test by hand: open the page on a phone and check the layout. Nothing else is left over from this task, but the styles file is getting long and could be split later.`;
  const S = [];
  const ses = (date, title, outcome, wrong = '') => { const x = find(title); S.push({ id: 'xs' + (S.length + 1), date, mid: x ? x.m.id : '', tid: x ? x.t.id : '', bid: '', task: title, outcome, summary: sum(title.toLowerCase()), wrong }); };
  ses('2026-09-03', 'Set up the Next.js app', 'done'); ses('2026-09-04', 'Add SQLite with Prisma', 'done');
  ses('2026-09-08', 'Show an empty pantry page', 'done'); ses('2026-09-09', 'Add a smoke test', 'partly', 'The test runner was not installed, so it added Jest config by hand.');
  ses('2026-09-11', 'Deploy a preview to Vercel', 'done'); ses('2026-09-14', 'Add email sign in', 'stuck', 'It rewrote the whole auth setup when I asked for one provider.');
  ses('2026-09-15', 'Add email sign in', 'done'); ses('2026-09-16', 'Save pantry items per user', 'done');
  ses('2026-09-17', 'Edit and delete pantry items', 'done'); ses('2026-09-22', 'Add quantities and units', 'done');
  ses('2026-09-23', 'Show items running low', 'partly', 'It changed the schema without a migration.'); ses('2026-09-24', 'Add a sign out button', 'done');
  ses('2026-09-29', 'Test saving with two accounts', 'done'); ses('2026-09-30', 'Handle a lost session cookie', 'done');
  ses('2026-10-01', 'Lay out the week grid', 'done'); ses('2026-10-02', 'Find bugs', 'done');
  ses('2026-10-05', 'Add a recipe to a day', 'done'); ses('2026-10-06', 'Remove a recipe from a day', 'done');
  ses('2026-10-07', 'Save the week plan', 'partly', 'Reload lost the plan because it saved to state only.'); ses('2026-10-08', 'Save the week plan', 'done');
  ses('2026-10-09', 'Drag recipes between days', 'stuck', 'Touch drags scrolled the page instead of moving the card.');
  ses('2026-10-12', 'Show which ingredients are missing', 'done'); ses('2026-10-12', 'Drag recipes between days', 'partly', 'Works with a mouse, still not on touch.');
  ses('2026-10-13', 'Fix: Week grid overflows on small phones', 'done'); ses('2026-10-13', 'Check security', 'done');
  // the bug session points at a bug
  S[23].bid = 'bw3'; S[23].tid = ''; S[23].mid = '';
  S[24].tid = ''; S[24].mid = ''; // "Check security" ready-made prompt, outside the plan... title also matches a task: keep it unlinked
  const lessons = [
    { id: 'lw1', date: '2026-09-14', happened: S[5].wrong, change: 'Only change the files the task names', promoted: true, rule: 'Only change the files the task names', sid: S[5].id },
    { id: 'lw2', date: '2026-09-23', happened: S[10].wrong, change: 'Write a Prisma migration for every schema change', promoted: true, rule: 'Write a Prisma migration for every schema change', sid: S[10].id },
    { id: 'lw3', date: '2026-10-07', happened: S[18].wrong, change: 'Reload the page to check that data is saved', promoted: true, rule: 'Reload the page to check that data is saved', sid: S[18].id },
    { id: 'lw4', date: '2026-10-09', happened: S[20].wrong, change: '', promoted: false, rule: '', sid: S[20].id },
    { id: 'lw5', date: '2026-09-09', happened: S[3].wrong, change: 'Check the test runner is installed first', promoted: false, rule: '', sid: S[3].id },
  ];
  const bugs = [
    { id: 'bw1', date: '2026-10-10', title: 'Pantry search ignores accents', actual: 'Searching "creme" misses "crème".', expected: 'Both match.', steps: '', error: '', severity: 'major', status: 'open' },
    { id: 'bw2', date: '2026-10-11', title: 'Units show twice on the low stock list', actual: '', expected: '', steps: '', error: '', severity: 'minor', status: 'open' },
    { id: 'bw3', date: '2026-10-03', title: 'Week grid overflows on small phones', actual: '', expected: '', steps: '', error: '', severity: 'major', status: 'fixed' },
    { id: 'bw4', date: '2026-09-25', title: 'Sign in link expires too fast', actual: '', expected: '', steps: '', error: '', severity: 'major', status: 'fixed' },
    { id: 'bw5', date: '2026-09-18', title: 'Deleting an item needs two clicks', actual: '', expected: '', steps: '', error: '', severity: 'minor', status: 'fixed' },
  ];
  return {
    kind: 'project', name: 'Pantry Planner', pitch: 'A web app that plans a week of meals from what is already in the pantry.', stage: 'building', starter: 'web',
    audience: 'Me and my housemates', problem: 'We buy food we already have and waste the rest.', doneWhen: 'We can plan a week of meals and get a shopping list for what is missing.', targetDate: '2026-11-20',
    stack: 'Next.js\nSQLite\nPrisma', commands: 'npm install\nnpm run dev\nnpm test', conventions: '- Use TypeScript\n- Only change the files the task names\n- Write a Prisma migration for every schema change\n- Reload the page to check that data is saved', constraints: 'Free hosting only', repo: 'https://github.com/priya/pantry-planner',
    features: [
      { id: 'fw1', title: 'Sign in', detail: 'Email link sign in', priority: 'must', status: 'done' },
      { id: 'fw2', title: 'Pantry list', detail: 'Items with quantities', priority: 'must', status: 'done' },
      { id: 'fw3', title: 'Week planner', detail: 'Seven day grid of meals', priority: 'must', status: 'doing' },
      { id: 'fw4', title: 'Meal suggestions', detail: 'From what is in the pantry', priority: 'should', status: 'todo' },
      { id: 'fw5', title: 'Shopping list', detail: 'From the week plan', priority: 'must', status: 'todo' },
      { id: 'fw6', title: 'Share the list', detail: 'A link for housemates', priority: 'could', status: 'todo' },
    ],
    screens: [], entities: [{ id: 'ew1', name: 'PantryItem', fields: 'name: text\nquantity: number\nunit: text', notes: '' }], decisions: [{ id: 'dw1', date: '2026-09-04', text: 'Use SQLite for now', why: 'Free and simple' }],
    milestones: ms, checks: { claudemd: true, git: true, tests: true }, lessons, sessions: S, bugs, prompts: [{ id: 'qw1', title: 'Write release notes', text: 'Write release notes for the changes since the last tag.' }],
    chat: [{ id: 'cw1', q: 'What should I build next, and why?', a: 'Finish **drag and drop** first.\n\n- Fix touch\n- Then suggestions', stopped: false, failed: false, at: '2026-10-10T09:00:00.000Z' }],
    claudeMd: '', claudeMdEdited: false, claudeMdOwn: false, fromCode: false, repoHas: '', lastReview: null, archived: false, guideHidden: false, guideAgain: false, example: false,
    copied: { claudemd: true, plan: true }, checked: {}, createdAt: '2026-09-02T18:00:00.000Z', updatedAt: '2026-10-13T20:00:00.000Z',
  };
}
function cli() {
  let n = 0;
  const T = (title, size, status, doneAt) => ({ id: 'tc' + (++n), title, size, status, doneAt: doneAt || '', notes: '', feat: '', splitFrom: '' });
  const m1 = { id: 'mc1', title: 'Core', goal: 'Tail and filter a log file.', tasks: [T('Set up the Python package', 'S', 'done', '2026-09-21'), T('Read a file and follow new lines', 'M', 'done', '2026-09-22'), T('Filter lines by level', 'M', 'done', '2026-09-24'), T('Colour the output', 'S', 'done', '2026-09-28'), T('Add tests for the filter', 'S', 'done', '2026-09-29')] };
  const m2 = { id: 'mc2', title: 'Ready to share', goal: 'Installable with pipx.', tasks: [T('Add a --since option', 'M', 'done', '2026-10-01'), T('Handle rotated logs', 'M', 'done', '2026-10-05'), T('Write the README', 'S', 'done', '2026-10-06'), T('Publish to PyPI', 'M', 'done', '2026-10-07'), T('Add a --json option', 'S', 'done', '2026-10-13'), T('Tag version 1.0', 'S', 'todo')] };
  const S = [];
  ['2026-09-21', '2026-09-22', '2026-09-24', '2026-09-28', '2026-09-29', '2026-10-01', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-13'].forEach((d, i) => { const t = [...m1.tasks, ...m2.tasks][i]; S.push({ id: 'xc' + (i + 1), date: d, mid: i < 5 ? 'mc1' : 'mc2', tid: t.id, bid: '', task: t.title, outcome: 'done', summary: 'Done and tested.', wrong: '' }); });
  return {
    kind: 'project', name: 'logtail', pitch: 'A command line tool that tails and filters log files.', stage: 'polishing', starter: 'cli', audience: 'Me at work', problem: 'grep and tail -f are clumsy together.', doneWhen: 'pipx install logtail works.', targetDate: '2026-10-20',
    stack: 'Python\nuv', commands: 'uv sync\nuv run pytest', conventions: '- Type hints everywhere', constraints: '', repo: '',
    features: [{ id: 'fc1', title: 'Follow a file', detail: '', priority: 'must', status: 'done' }], screens: [], entities: [], decisions: [], milestones: [m1, m2], checks: {}, lessons: [], sessions: S,
    bugs: [{ id: 'bc1', date: '2026-10-12', title: 'Crash on an empty file', actual: '', expected: '', steps: '', error: 'IndexError', severity: 'blocker', status: 'open' }], prompts: [], chat: [],
    claudeMd: '', claudeMdEdited: false, claudeMdOwn: false, fromCode: false, repoHas: '', lastReview: null, archived: false, guideHidden: true, guideAgain: false, example: false,
    copied: { claudemd: true, plan: true }, checked: {}, createdAt: '2026-09-20T10:00:00.000Z', updatedAt: '2026-10-13T21:00:00.000Z',
  };
}
function old() {
  const tasks = Array.from({ length: 10 }, (_, i) => ({ id: 'to' + (i + 1), title: 'Old task ' + (i + 1), size: 'M', status: i < 6 ? 'done' : 'todo', doneAt: i < 6 ? `2026-07-0${i + 1}` : '', notes: '', feat: '', splitFrom: '' }));
  return {
    kind: 'project', name: 'Photo sorter', pitch: 'Sorts holiday photos by date.', stage: 'building', starter: '', audience: '', problem: '', doneWhen: '', targetDate: '2026-08-01', stack: 'Python', commands: '', conventions: '', constraints: '', repo: '',
    features: [], screens: [], entities: [], decisions: [], milestones: [{ id: 'mo1', title: 'Sort', goal: '', tasks }], checks: {}, lessons: [], sessions: [{ id: 'xo1', date: '2026-07-06', mid: 'mo1', tid: 'to6', bid: '', task: 'Old task 6', outcome: 'done', summary: '', wrong: '' }],
    bugs: [], prompts: [], chat: [], claudeMd: '', claudeMdEdited: false, claudeMdOwn: false, fromCode: false, repoHas: '', lastReview: null, archived: true, guideHidden: true, guideAgain: false, example: false,
    copied: {}, checked: {}, createdAt: '2026-06-20T10:00:00.000Z', updatedAt: '2026-07-10T10:00:00.000Z',
  };
}
function priyaSeed() { return { pweb: web(), pcli: cli(), pold: old() }; }
// an init script that seeds the mock and opens a project
function seedInit(seed, activeId = 'pweb', extra = '') {
  return `window.__SEED__ = ${JSON.stringify(seed)}; try { localStorage.setItem('shipyard.ui.v1', JSON.stringify({ activeId: ${JSON.stringify(activeId)}, tab: 'overview', view: 'project' })); localStorage.setItem('shipyard.seen.v1', '99'); } catch (e) {} ${extra}`;
}
module.exports = { priyaSeed, seedInit, web, cli, old };
