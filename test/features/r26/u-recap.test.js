// Round 26: the recap of a finished milestone
const U = require('./unit-lib');
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); };
const p = U.normalize({ name: 'Recipe Box', conventions: '- Ask before rewriting code that works',
  milestones: [
    { id: 'm1', title: 'Save recipes', goal: 'paste a link and get a recipe', tasks: [{ id: 't1', title: 'Parse a page', status: 'done', doneAt: '2026-10-02' }, { id: 't2', title: 'Save it', status: 'done', doneAt: '2026-10-06' }, { id: 't3', title: '', status: 'done', doneAt: '2026-10-05' }] },
    { id: 'm2', title: 'Week', tasks: [{ id: 't4', title: 'Grid', status: 'todo' }] },
  ],
  sessions: [
    { id: 'x1', date: '2026-10-01', mid: 'm1', tid: 't1', task: 'Parse a page', outcome: 'partly', wrong: 'It rewrote the parser.' },
    { id: 'x2', date: '2026-10-03', mid: 'm1', tid: 't1', task: 'Parse a page', outcome: 'done' },
    { id: 'x3', date: '2026-10-06', mid: 'm2', tid: 't2', task: 'Save it', outcome: 'stuck', wrong: 'Saving lost the\ntags.' },
    { id: 'x4', date: '2026-10-07', mid: 'm1', tid: '', task: 'Find bugs', outcome: 'done' },
    { id: 'x5', date: '2026-10-08', mid: 'm2', tid: 't4', task: 'Grid', outcome: 'stuck', wrong: 'Not this milestone' },
  ],
  lessons: [
    { id: 'l1', happened: 'It rewrote the parser.', change: 'Ask before rewriting code that works', promoted: true, rule: 'Ask before rewriting code that works' },
    { id: 'l2', happened: 'Saving lost the\ntags.' },
  ] });
const m = p.milestones[0];
const r = U.milestoneRecap(p, m);
check('sessions on its tasks, wherever they were logged, plus untasked ones on it', r.sessions === 4 && r.done === 2 && r.partly === 1 && r.stuck === 1, r);
check('from the first session to the last done day', r.from === '2026-10-01' && r.to === '2026-10-07', [r.from, r.to]);
check('what went wrong, one line each, matched to its lesson', r.wrong.length === 2 && r.wrong[0].lesson === 'l1' && r.wrong[1].lesson === 'l2' && r.wrong[1].text === 'Saving lost the tags.', r.wrong);
check('a promoted lesson shows its rule; an open one none', r.wrong[0].rule === 'Ask before rewriting code that works' && r.wrong[1].rule === '');
check('the line reads naturally', U.recapLine(r) === '3 tasks done between Oct 1 and Oct 7. 4 sessions: 2 done, 1 partly done, 1 stuck.', U.recapLine(r));
check('one day, no sessions', U.recapLine({ tasks: 1, from: '2026-10-02', to: '2026-10-02', sessions: 0 }) === '1 task done on Oct 2. No sessions logged.');
check('no dates at all', U.recapLine({ tasks: 2, from: '', to: '', sessions: 1, done: 1, partly: 0, stuck: 0 }) === '2 tasks done. 1 session: 1 done.');
const md = U.milestoneRecapMd(p, m);
check('Markdown recap: heading, goal, line, done list without blanks', md.startsWith('## Milestone 1: Save recipes\n\nPaste a link and get a recipe.\n\n3 tasks done between') && md.includes('### Done\n- Parse a page\n- Save it\n\n'), md);
check('Markdown recap: what went wrong, with the rule since', md.includes('### What went wrong\n- Oct 1, Parse a page: It rewrote the parser. Rule since: Ask before rewriting code that works.\n- Oct 6, Save it: Saving lost the tags.\n'), md);
const m2 = U.milestoneRecap(p, p.milestones[1]);
check('the other milestone only has its own task\'s session', m2.sessions === 1 && m2.wrong.length === 1 && m2.wrong[0].text === 'Not this milestone');
check('ruleText drops a list marker', U.ruleText('-   Run the tests') === 'Run the tests' && U.ruleText('* x') === 'x');
const ex = U.exampleProject('2026-10-14');
const er = U.milestoneRecap(ex, ex.milestones[0]);
check('the example\'s first milestone has a problem with its rule', er.wrong.length === 1 && !!er.wrong[0].rule && er.sessions === 3, er);
check('every session in the example that went wrong has its lesson', ex.sessions.filter((s) => s.wrong).every((s) => ex.lessons.some((l) => l.happened === s.wrong)));
console.log(`unit-recap fails: ${fails}`);
