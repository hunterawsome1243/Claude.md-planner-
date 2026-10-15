// Round 36: a newcomer's first visit (review 8c), unit checks
const U = require('./unit-lib');
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); };
const step = (p, k) => U.guideSteps(p).find((s) => s.k === k);

// a Web app starter with three must-haves and nothing planned for them
const p = U.blankProject('Habit Tracker', 'Track daily habits.');
U.applyStarter(p, 'web');
p.features.push(...['Add a habit', 'Tick off today', 'See my streak'].map((title, i) => U.normalize({ features: [{ id: 'f' + i, title, priority: 'must' }] }).features[0]));
check('the starter\'s own tasks are stock', U.ownTasks(p).length === 0 && U.allTasks(p).every((t) => U.stockTitles(p).has(t.title)), [U.ownTasks(p).length, U.stockTitles(p).size, U.allTasks(p).length]);
check('so every must-have is unplanned', U.unplannedMust(p).map((f) => f.title).join() === 'Add a habit,Tick off today,See my streak');
const pl = step(p, 'plan');
check('the plan step is not done, and names the first must-have', !pl.done && pl.label === 'Plan each must-have' && /^"Add a habit" has no tasks yet\./.test(pl.hint) && pl.fid === 'f0', pl);
// Plan it on one of them links its tasks
p.milestones.splice(1, 0, U.normalize({ milestones: [{ id: 'mb', title: 'Add a habit', tasks: [{ id: 'tb1', title: 'Add the habit form', feat: 'f0' }] }] }).milestones[0]);
check('after planning one, the next is named', U.unplannedMust(p).map((f) => f.id).join() === 'f1,f2' && step(p, 'plan').fid === 'f1' && !step(p, 'plan').done);
for (const [i, id] of [[1, 'f1'], [2, 'f2']]) p.milestones[1].tasks.push(U.normalize({ milestones: [{ tasks: [{ id: 'tx' + i, title: 'Build ' + id, feat: id }] }] }).milestones[0].tasks[0]);
check('with every must-have planned, the step is done', step(p, 'plan').done && U.unplannedMust(p).length === 0);
// a finished must-have needs no tasks
const q = U.normalize({ name: 'Q', features: [{ id: 'a', title: 'Done thing', priority: 'must', status: 'done' }], milestones: [{ title: 'M', tasks: [{ title: 'Own task', feat: 'zz' }] }] });
check('a must-have already built needs no tasks', U.unplannedMust(q).length === 0);
// tasks written by hand, linked to nothing, are taken at their word
const hand = U.normalize({ name: 'H', features: [{ id: 'a', title: 'Thing', priority: 'must' }], milestones: [{ title: 'M', tasks: [{ title: 'Build the thing' }] }] });
check('a plan with no links at all counts as planned', U.unplannedMust(hand).length === 0 && step(hand, 'plan').done);
const blank = U.normalize({ name: 'B', features: [{ id: 'a', title: 'Thing', priority: 'must' }] });
check('no tasks at all: not planned', !step(blank, 'plan').done && U.unplannedMust(blank).length === 1);
// the example project is fully planned
const ex = U.exampleProject('2026-10-14');
check('the example has no unplanned must-haves', U.unplannedMust(ex).length === 0, U.unplannedMust(ex).map((f) => f.title));

// the brief step wants all three of its fields
const b = U.normalize({ name: 'B', pitch: 'x', audience: 'Me' });
const bs = step(b, 'brief');
check('one field of three is not a brief', !bs.done && bs.hint === 'Still to fill in: the problem and what the first version must do.' && bs.field === 'problem', bs);
check('all three are', step(U.normalize({ name: 'B', audience: 'a', problem: 'b', doneWhen: 'c' }), 'brief').done);
check('a project from its code can skip the rest of the brief', !step(U.normalize({ name: 'B', audience: 'a', fromCode: true }), 'brief').done && step(U.normalize({ name: 'B', audience: 'a', fromCode: true, checked: { brief: true } }), 'brief').done);

// the starting point from the idea
const G = U.starterGuess;
const cases = [['A habit tracker web app', 'web'], ['a small web app where I save recipes from links', 'web'], ['A Chrome extension that hides comments', 'extension'], ['A Discord bot for my server', 'bot'],
  ['An iPhone app to log runs', 'mobile'], ['A phone app for plants', 'mobile'], ['A puzzle game for the browser', 'game'], ['An AI app that summarises my notes', 'ai'], ['A chatbot for my shop', 'ai'],
  ['A command-line tool to rename photos', 'cli'], ['A REST API for my todo list', 'api'], ['A script to back up my photos', 'script'], ['Automate my weekly report', 'script'],
  ['Something for my phone bills spreadsheet', ''], ['A tool to plan meals', '']];
const bad = cases.filter(([s, k]) => G(s) !== k).map(([s, k]) => [s, k, G(s)]);
check('ideas map to the starting point they need', bad.length === 0, bad);

// what a project needs besides Claude Code
const need = (k) => U.prereqs(U.normalize({ name: 'x', commands: U.STARTERS.find((s) => s.k === k).build('x').commands })).map((x) => x.k).join();
check('web: Node.js and Git', need('web') === 'node,git', need('web'));
check('AI app: uv, not Python separately', need('ai') === 'uv,git', need('ai'));
check('extension: Node.js for its tests, not from the comment lines', need('extension') === 'node,git', need('extension'));
check('Discord bot: Node.js', need('bot') === 'node,git');
check('pytest alone: Python', U.prereqs(U.normalize({ name: 'x', commands: 'pip install -r requirements.txt\npytest -q' })).map((x) => x.k).join() === 'python,git');
check('cargo and go', U.prereqs(U.normalize({ name: 'x', commands: 'cargo test\ngo test ./...' })).map((x) => x.k).join() === 'rust,go,git');
check('no commands: just Git', U.prereqs(U.normalize({ name: 'x' })).map((x) => x.k).join() === 'git');
console.log(fails ? `fails: ${fails}` : 'fails: 0');
process.exitCode = fails ? 1 : 0;
