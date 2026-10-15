// Round 33: projects that already exist, unit checks
const fs = require('fs'); const path = require('path');
const U = require('./unit-lib');
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); };
const sample = fs.readFileSync(path.join(__dirname, 'sample.md'), 'utf8');
const P = U.surveyPrompt();
check('the survey asks which of Shipyard\'s files are already there', /## Already in the folder\n- Each of these that is already in this folder, one per line: CLAUDE\.md, PLAN\.md, \.claude\/settings\.json, \.claude\/commands, \.claude\/agents\n/.test(P));
const tpl = U.parseDoc(P.slice(P.indexOf(U.SURVEY_MARK)));
check('the template left as it is finds no files and nothing else', tpl.repoHas === '' && !tpl.features.length && !tpl.bugs.length && !tpl.milestones.length && !tpl.commands && !tpl.conventions, [tpl.repoHas, tpl.conventions]);
const p = U.parseDoc(sample);
check('a survey notes the files it lists, in a fixed order', p.repoHas === 'claudemd plan settings', p.repoHas);
check('and is marked as brought in from its code', p.fromCode === true);
check('the section adds nothing else', p.features.length === 4 && p.bugs.length === 2 && p.milestones.length === 1 && p.milestones[0].tasks.length === 2 && p.conventions.split('\n').length === 2 && !/CLAUDE/.test(p.stack + p.commands + p.conventions), [p.features.length, p.conventions]);
check('what works today is a must-have; the rest should have', JSON.stringify(p.features.map((f) => [f.title, f.priority])) === JSON.stringify([['Log a session', 'must'], ['Session list', 'must'], ['Tide lookup', 'should'], ['Charts', 'should']]), p.features.map((f) => [f.title, f.priority]));
const rh = (body) => U.parseDoc(sample.replace(/## Already in the folder\n[\s\S]*?\n\n/, '## Already in the folder\n' + body + '\n\n')).repoHas;
check('notes after a name still count', rh('- CLAUDE.md: yes, with notes on the architecture\n- `.claude/commands/` (2 commands)') === 'claudemd commands', rh('- CLAUDE.md: yes, with notes on the architecture\n- `.claude/commands/` (2 commands)'));
check('a file said to be missing does not', rh('- CLAUDE.md\n- PLAN.md: no\n- .claude/settings.json (missing)\n- .claude/agents does not exist') === 'claudemd', rh('- CLAUDE.md\n- PLAN.md: no\n- .claude/settings.json (missing)\n- .claude/agents does not exist'));
check('"None of them" finds none', rh('- None of them') === '' && rh('None of these files exist yet.') === '');
check('settings.local.json is not settings.json', rh('- .claude/settings.local.json') === '' && rh('- settings.json') === 'settings');
check('a heading written another way is read too', U.parseDoc(sample.replace('## Already in the folder', '## Existing files')).repoHas === 'claudemd plan settings');
check('without the section, nothing is assumed', U.parseDoc(sample.replace(/## Already in the folder\n[\s\S]*?\n\n/, '')).repoHas === '');
// other imports
const readme = U.parseDoc('# Garden Log\n\nTrack what you planted.\n\n## Features\n- [x] Add a plant\n- [ ] Reminders\n');
check('a README is not marked as existing code, and keeps should-have as the default', readme.fromCode === false && readme.repoHas === '' && readme.features.every((f) => f.priority === 'should'), [readme.fromCode, readme.features.map((f) => f.priority)]);
const plan = U.parseDoc(U.buildPlanMd(U.normalize({ name: 'Garden Log', milestones: [{ title: 'Basics', tasks: [{ title: 'Add a plant', status: 'done' }, { title: 'List plants' }] }] })));
check('a PLAN.md comes from a folder that has one', plan.fromCode === true && plan.repoHas === 'plan', [plan.fromCode, plan.repoHas, plan.milestones.length]);
// stored fields
const n = U.normalize({ name: 'X', fromCode: 1, repoHas: 'agents plan bogus claudemd plan', claudeMdOwn: true, claudeMdEdited: false });
check('normalize keeps known files only, once each, in order', n.repoHas === 'claudemd plan agents' && n.fromCode === true, n.repoHas);
check('own CLAUDE.md needs a kept CLAUDE.md', n.claudeMdOwn === false && U.normalize({ claudeMdEdited: true, claudeMd: '# Mine', claudeMdOwn: true }).claudeMdOwn === true);
check('a new project starts with none of it', (() => { const b = U.blankProject('Y'); return b.fromCode === false && b.repoHas === '' && b.claudeMdOwn === false; })());
check('repoHas reads the list', U.repoHas(n, 'plan') && !U.repoHas(n, 'settings') && !U.repoHas(null, 'plan'));
// CLAUDE.md for a project that exists
const md = U.buildClaudeMd(p);
check('CLAUDE.md lists core and other features, not a first version', /## Core features \(must have\)\n- Log a session: [^\n]*\n- Session list/.test(md) && !/\(built\)/.test(md) && /## Other features \(should have\)\n- Tide lookup/.test(md) && !/First version|After the first version/.test(md), md.split('\n').filter((l) => /^## /.test(l)));
const back = U.parseDoc(md);
check('and reads back with the same priorities', JSON.stringify(back.features.map((f) => f.priority)) === JSON.stringify(['must', 'must', 'should', 'should']), back.features.map((f) => f.priority));
const fresh = U.normalize({ name: 'Z', features: [{ title: 'A', priority: 'must' }, { title: 'B', priority: 'should' }] });
check('a new project keeps its first-version headings', /## First version \(must have\)/.test(U.buildClaudeMd(fresh)) && /## After the first version \(should have\)/.test(U.buildClaudeMd(fresh)));
// the guide
const g = U.guideSteps(p);
check('the guide puts the files second for a project from its code', g.map((s) => s.k).join() === 'pitch,files,brief,features,plan,first,log', g.map((s) => s.k));
const gf = g.find((s) => s.k === 'files');
check('its files step adds to the folder and merges', gf.label === "Add Shipyard's files to your project's folder" && /merges into a CLAUDE\.md or PLAN\.md already there instead of replacing it/.test(gf.hint) && !gf.done, gf);
check('its features step checks what Claude found, and waits for the owner', (() => { const s = g.find((x) => x.k === 'features'); return s.label === 'Check the features Claude found' && !s.done; })());
check('next milestone and next task', g.find((x) => x.k === 'plan').label === 'Plan the next milestone' && g.find((x) => x.k === 'first').label === 'Do the next task with Claude Code');
const half = U.guideSteps({ ...p, copied: { claudemd: true } }).find((s) => s.k === 'files');
check('one file copied: the hint names the other', /CLAUDE\.md is copied\. Copy PLAN\.md too/.test(half.hint), half.hint);
const gn = U.guideSteps(fresh);
check('a new project keeps the guide as it was', gn.map((s) => s.k).join() === 'pitch,brief,features,plan,files,first,log' && gn.find((s) => s.k === 'files').label === "Save Shipyard's files in your project's folder" && /paste the setup prompt, which saves every file/.test(gn.find((s) => s.k === 'files').hint));
console.log(fails ? `fails: ${fails}` : 'fails: 0');
process.exitCode = fails ? 1 : 0;
