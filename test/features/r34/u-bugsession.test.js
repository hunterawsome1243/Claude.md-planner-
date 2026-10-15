// Round 34: sessions on a bug, unit checks
const U = require('./unit-lib');
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); };
check('a session keeps the bug it was about', U.mkSession({ bid: 'b1', task: 'Fix: Crash' }).bid === 'b1' && U.mkSession({}).bid === '');
const p = U.normalize({ name: 'Plant Pal', pitch: 'Water plants on time.',
  bugs: [{ id: 'b1', title: 'Crash on start', severity: 'blocker' }, { id: 'b2', title: 'Old bug', status: 'fixed' }],
  sessions: [
    { id: 'x1', date: '2026-10-10', bid: 'b1', task: 'Fix: Crash on start', outcome: 'stuck', summary: 'Found the crash is in the loader.', wrong: 'It patched the wrong file.' },
    { id: 'x2', date: '2026-10-11', tid: 't9', task: 'Something else', outcome: 'done', summary: 'Unrelated.' },
    { id: 'x3', date: '2026-10-12', bid: 'b2', task: 'Fix: Old bug', outcome: 'done', summary: 'Fixed it.' },
  ] });
const b1 = p.bugs[0], b2 = p.bugs[1];
check('an open bug\'s history is its own sessions', U.bugHistory(p, b1).map((s) => s.id).join() === 'x1');
check('a fixed bug has none to carry', U.bugHistory(p, b2).length === 0);
const t = U.bugPrompt(p, b1);
check('the fix prompt carries the earlier session', /\nAn earlier session on this bug:\n- [^\n]*stuck: Found the crash is in the loader\. What went wrong: It patched the wrong file\.\nBefore you change anything, run git status and git diff \(if this folder is in git\) to see whether the last try left changes behind\. Tell me what you find, and ask me before reverting any of it\. Then carry on from there, and learn from what went wrong before\.\n/.test(t), t.split('\n').slice(0, 12));
check('it comes before How to work', t.indexOf('An earlier session on this bug:') < t.indexOf('How to work:'));
check('and the dialog says so', /earlier sessions on this bug/.test(U.bugNote(p, b1)) && U.bugNote(p, b2) === '');
const many = U.normalize({ ...p, sessions: [1, 2, 3, 4].map((i) => ({ id: 'y' + i, bid: 'b1', task: 'Fix', outcome: 'partly', summary: 'Try ' + i })) });
const t2 = U.bugPrompt(many, many.bugs[0]);
check('only the latest three, without a went-wrong line', /Earlier sessions on this bug:\n- [^\n]*Try 2\.\n- [^\n]*Try 3\.\n- [^\n]*Try 4\.\nBefore you change anything, run git status and git diff \(if this folder is in git\) to see whether the last try left changes behind\. Tell me what you find, and ask me before reverting any of it\. Then carry on from there\.\n/.test(t2) && !/Try 1/.test(t2), t2.split('\n').slice(2, 9));
check('a bug never worked on has no history lines', !/earlier session/i.test(U.bugPrompt(U.normalize({ bugs: [{ id: 'b', title: 'X' }] }), U.normalize({ bugs: [{ id: 'b', title: 'X' }] }).bugs[0])));
// history lines leave out the report lines the summary ends with
const R = U.reportBody;
check('Outcome and Went wrong lines are left out', R('Added the list.\n\nOutcome: done\nWent wrong: nothing') === 'Added the list.', R('Added the list.\n\nOutcome: done\nWent wrong: nothing'));
check('with the bullets under Went wrong, up to a blank line', R('Did it.\nWent wrong:\n- one\n- two\n\nNext I will add tests.\nOutcome — partly done') === 'Did it.\nNext I will add tests.', R('Did it.\nWent wrong:\n- one\n- two\n\nNext I will add tests.\nOutcome — partly done'));
check('headings and bold labels too', R('Work.\n\n## Outcome\nDone\n\n**Went wrong:** a test timed out') === 'Work.', R('Work.\n\n## Outcome\nDone\n\n**Went wrong:** a test timed out'));
check('a summary without them is unchanged', R('Just a note.\nSecond line.') === 'Just a note.\nSecond line.');
const hl = U.historyLine(U.mkSession({ date: '2026-10-10', outcome: 'stuck', summary: 'Looked at it.\n\nOutcome: stuck\nWent wrong: wrong file', wrong: 'wrong file' }));
check('so a history line says what went wrong once', hl === '- Oct 10, stuck: Looked at it. What went wrong: Wrong file.' || hl === '- Oct 10, stuck: Looked at it. What went wrong: wrong file.', hl);
check('a summary that is only report lines leaves the outcome alone', U.historyLine(U.mkSession({ date: '2026-10-10', outcome: 'done', summary: 'Outcome: done\nWent wrong: nothing' })) === '- Oct 10, done.');
console.log(fails ? `fails: ${fails}` : 'fails: 0');
process.exitCode = fails ? 1 : 0;
