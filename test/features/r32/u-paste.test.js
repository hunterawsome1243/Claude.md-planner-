// Round 32: text pasted from Claude Code, as people paste it
const fs = require('fs'); const path = require('path');
const U = require('./unit-lib');
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); };
const R = (t) => U.sessionReport(t);
const term = (t) => t.split('\n').map((l, i) => (i === 0 ? '⏺ ' + l : l ? '  ' + l : '')).join('\n');
// terminal text
check('untermText takes off the reply bullet and the shared indent', U.untermText('⏺ Done.\n  - a\n    - b\n\n  End') === 'Done.\n- a\n  - b\n\nEnd', U.untermText('⏺ Done.\n  - a\n    - b\n\n  End'));
check('untermText leaves ordinary text alone', U.untermText('# Title\n\n- a\n  - b') === '# Title\n\n- a\n  - b');
// J2: Outcome lines
const outs = [['Outcome: done', 'done'], ['**Outcome:** Done ✅', 'done'], ['Outcome: ✅ Done', 'done'], ['Outcome — stuck', 'stuck'], ['Outcome – partly done', 'partly'], ['Outcome: ⚠️ Partly done', 'partly'],
  ['Outcome: blocked on the API key', 'stuck'], ['Outcome: partial', 'partly'], ['Outcome: not done', 'stuck'], ['Outcome: `done`', 'done'], ['Outcome: "done"', 'done'], ['## Outcome\nStuck', 'stuck'],
  ['⏺ Outcome: stuck', 'stuck'], ['Outcome: complete', 'done'], ['outcome: partly', 'partly'], ['The outcome was good', '']];
const bad = outs.filter(([t, want]) => R(t).outcome !== want).map(([t]) => [t, R(t).outcome]);
check('Outcome written many ways', !bad.length, bad);
// J6: Went wrong
check('bullets under a bare "Went wrong:"', R('Outcome: partly\nWent wrong:\n- The migration failed\n- I reverted the schema').wrong === '- The migration failed\n- I reverted the schema', R('Outcome: partly\nWent wrong:\n- The migration failed\n- I reverted the schema'));
const wrapped = term('Done with most of it.\n\nOutcome: partly done\nWent wrong: the first npm install failed because Node 18 was too old, so I\nasked you to upgrade to Node 22.');
check('a line the terminal wrapped is read whole', R(wrapped).wrong === 'the first npm install failed because Node 18 was too old, so I asked you to upgrade to Node 22.', R(wrapped));
check('a blank line ends it', R('Went wrong: x is slow\n\nNext I will look at y.').wrong === 'x is slow');
const nothings = ['Nothing — all tests passed first time.', 'nothing, it went smoothly', 'Nothing significant.', 'Nothing major - it went fine', 'None.', '**None.**', 'No issues found.', '"nothing"', 'N/A', '-'];
check('ways of saying nothing went wrong', nothings.every((x) => R(`Outcome: done\nWent wrong: ${x}`).wrong === ''), nothings.filter((x) => R(`Outcome: done\nWent wrong: ${x}`).wrong));
const real = ['None of the tests ran', 'Nothing worked on Safari', 'No tests exist for the parser', '__init__.py was overwritten'];
check('...and real problems that start the same way', real.every((x) => R(`Went wrong: ${x}`).wrong === x), real.map((x) => R(`Went wrong: ${x}`).wrong));
check('_Went wrong:_ loses its underscores, not its text', R('_Went wrong:_ the port was taken').wrong === 'the port was taken', R('_Went wrong:_ the port was taken'));
check('"What went wrong:" and a heading too', R('What went wrong: the port was taken').wrong === 'the port was taken' && R('## Went wrong\nThe port was taken').wrong === 'The port was taken');
// J1: PLAN.md copied from the terminal
const p = U.normalize({ kind: 'project', name: 'Plant Pal', milestones: [{ id: 'm1', title: 'Basics', tasks: [{ id: 't1', title: 'List plants' }, { id: 't2', title: 'Water reminder' }] }, { id: 'm2', title: 'Later', tasks: [{ id: 't3', title: 'Photos' }] }] });
const md = U.buildPlanMd(p).replace(/- \[ \] (List plants.*)/, '- [x] $1');
const r = U.readPlanMd(p, term(md));
check('a terminal copy of PLAN.md marks the ticked task done and adds no notes', r.done.length === 1 && r.done[0].t.id === 't1' && !r.notes.length && r.found === 3, U.planChangeText(r));
const r2 = U.readPlanMd(p, '⏺ Read(PLAN.md)\n  ⎿  Read 30 lines\n\n' + term(md));
check('...with a tool line above it too', r2.done.length === 1 && !r2.notes.length, U.planChangeText(r2));
const r3 = U.readPlanMd(p, md.replace(/(- \[ \] Water reminder.*)/, '$1\n  ### Not a note'));
check('a heading is never a note', !r3.notes.length, r3.notes.map((n) => n.notes));
// J8: the survey's first line, written loosely, or missing
const sample = fs.readFileSync(path.join(__dirname, 'sample.md'), 'utf8');
for (const mark of ['<!--shipyard:survey-->', '<!-- shipyard: survey -->', '<!-- Shipyard:survey -->', '']) {
  const t = sample.replace('<!-- shipyard:survey -->', mark);
  const q = U.parseDoc(t);
  check(`marker ${JSON.stringify(mark)}: still a survey`, U.isSurvey(t) && q.bugs.length === 2 && q.features.length === 4 && !/Ratings reset/.test(q.conventions), [U.isSurvey(t), q.bugs.length]);
}
check('a CLAUDE.md with a few of the same headings is not a survey', !U.isSurvey('# App\n\n## Commands\n- `npm test`\n\n## Conventions\n- Small files\n\n## Tech stack\n- React\n\n## Known issues\n- Slow'));
// J7: filler and leftover template lines
const filled = sample.replace('## Known issues\n- Ratings reset on reload: the rating is saved before the session is, so a reload loses it\n- The spot filter ignores spots with capital letters', '## Known issues\n- None found')
  .replace('## Next steps\n', '## Next steps\n- (none found)\n').replace('## Who it is for\nSurfers who want to see which conditions suit their home break.', '## Who it is for\nOne sentence, if the docs say.')
  .replace('- Build: `npm run build`', '- Build: `the command`').replace('## Data model\n', '## Data model\n- Thing it stores: field, field, field\n').replace('## Conventions\n', '## Conventions\n- _None found in the code or docs._\n');
const q = U.parseDoc(filled);
check('"None found" lines and template lines bring in nothing', !q.bugs.length && q.milestones[0].tasks.length === 2 && !q.audience && !/the command/.test(q.commands) && q.entities.length === 2 && !/None found/.test(q.conventions), { bugs: q.bugs.map((b) => b.title), tasks: q.milestones.map((m) => m.tasks.length), aud: q.audience, cmd: q.commands, ents: q.entities.map((e) => e.name), conv: q.conventions });
// J9: other heading words in a survey
const swaps = [['## Known issues', '## Issues found'], ['## Known issues', '## Problems'], ['## Data model', '## Storage'], ['## Data model', '## Database'], ['## Features', '## What works'], ['## Who it is for', '## Who uses it']];
const lost = swaps.filter(([a, b]) => { const x = U.parseDoc(sample.replace(a, b)); return x.bugs.length !== 2 || x.entities.length !== 2 || x.features.length !== 4 || !x.audience; }).map(([, b]) => b);
check('other heading words keep their section', !lost.length, lost);
check('"[~] Feature" and "Feature (in progress): ..." are in progress', (() => { const x = U.parseDoc(sample.replace('- [ ] Tide lookup:', '- [~] Tide lookup:').replace('- [ ] Charts:', '- Charts (in progress):')); const f = (n) => x.features.find((y) => y.title === n)?.status; return f('Tide lookup') === 'doing' && f('Charts') === 'doing'; })());
check('a terminal copy of the survey file reads the same', JSON.stringify(U.parseDoc(term(sample)).features.map((f) => f.title)) === JSON.stringify(U.parseDoc(sample).features.map((f) => f.title)));
console.log(fails ? `fails: ${fails}` : 'fails: 0');
process.exitCode = fails ? 1 : 0;
