// Round 30: the survey prompt and reading what it writes
const fs = require('fs'); const path = require('path');
const U = require('./unit-lib');
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); };
const sample = fs.readFileSync(path.join(__dirname, 'sample.md'), 'utf8');
const P = U.surveyPrompt();
check('the prompt names the file, keeps other files as they are, and carries the mark', P.includes('shipyard-import.md') && /Do not change any other file/.test(P) && P.includes(U.SURVEY_MARK + '\n# '));
check('the template has no code block, so nothing in it is mistaken for one', !/```/.test(P));
// the template itself, filled with its own placeholder lines, reads as a project
const tpl = U.parseDoc(P.slice(P.indexOf(U.SURVEY_MARK)));
check('the template left as it is imports nothing made up (round 32)', !tpl.features.length && !tpl.entities.length && !tpl.bugs.length && !tpl.milestones.length && !tpl.commands && !tpl.audience && tpl.name !== "The project's name", { f: tpl.features.length, e: tpl.entities.length, b: tpl.bugs.length, n: tpl.name, c: tpl.commands });
check('a filled-in survey is a survey, and not a CLAUDE.md even with Commands and Conventions', U.isSurvey(sample) && U.looksLikeClaudeMd(sample) && U.detectImport(sample).survey === true && U.detectImport('# Notes\n\nSome text').survey === false);
const p = U.parseDoc(sample);
check('name and pitch, with the mark left out', p.name === 'Tide Log' && p.pitch === 'A small web app for logging surf sessions with the tide and swell at the time.', [p.name, p.pitch]);
check('audience and repository', p.audience === 'Surfers who want to see which conditions suit their home break.' && p.repo === 'https://github.com/hunter/tide-log', [p.audience, p.repo]);
check('stack, one per line', p.stack === 'TypeScript\nReact with Vite\nIndexedDB through idb-keyval', p.stack);
check('the four commands', p.commands === 'npm install\nnpm run dev\nnpm test\nnpm run build', p.commands);
check('features with what they do, built or not', JSON.stringify(p.features.map((f) => [f.title, f.status])) === JSON.stringify([['Log a session', 'done'], ['Session list', 'done'], ['Tide lookup', 'todo'], ['Charts', 'todo']]) && p.features[0].detail.startsWith('date, spot'), p.features.map((f) => [f.title, f.status, f.detail]));
check('the data model', JSON.stringify(p.entities.map((e) => [e.name, e.fields])) === JSON.stringify([['Session', 'id\ndate\nspot\nboard\nrating\nnotes'], ['Spot', 'id\nname\nlatitude\nlongitude']]), p.entities.map((e) => [e.name, e.fields]));
check('conventions as rules', p.conventions === '- Components live in src/components, one per file\n- Tests sit next to the file they test, as name.test.ts', p.conventions);
check('known issues become open bugs', JSON.stringify(p.bugs.map((b) => [b.title, b.status])) === JSON.stringify([['Ratings reset on reload', 'open'], ['The spot filter ignores spots with capital letters', 'open']]) && /saved before the session/.test(p.bugs[0].actual), p.bugs.map((b) => [b.title, b.actual]));
check('next steps become a milestone of tasks', p.milestones.length === 1 && p.milestones[0].title === 'Next steps' && p.milestones[0].tasks.map((t) => t.title).join('|') === 'Fix the rating being lost on reload|Add the tide lookup behind a feature flag', p.milestones.map((m) => [m.title, m.tasks.map((t) => t.title)]));
check('commands make it a project being built', p.stage === 'building');
// the same text as a reply, wrapped in a code block with words around it
const wrapped = "I've written the description:\n\n````markdown\n" + sample + "````\n\nLet me know if you want changes.";
check('a reply wrapped in a code block reads the same', JSON.stringify(U.parseDoc(wrapped)) === JSON.stringify(p) || (() => { const q = U.parseDoc(wrapped); return q.name === p.name && q.pitch === p.pitch && q.commands === p.commands && q.milestones[0].tasks.length === 2 && q.bugs.length === 2; })());
check('the code block and the words after it are cut', !U.surveyBody(wrapped).includes('Let me know') && !/````/.test(U.surveyBody(wrapped)) && U.surveyBody(wrapped).startsWith('# Tide Log'));
const tilde = 'Here it is:\n~~~\n' + sample + '~~~\n';
check('a ~~~ block too', U.surveyBody(tilde).trimEnd().endsWith('- [ ] Add the tide lookup behind a feature flag'));
check('text after an unwrapped survey is kept as written', U.surveyBody(sample) === sample.replace(U.SURVEY_MARK + '\n', ''));
check('Windows line ends', U.parseDoc(sample.replace(/\n/g, '\r\n')).commands === p.commands);
console.log(fails ? `fails: ${fails}` : 'fails: 0');
process.exitCode = fails ? 1 : 0;
