// Round 23: earlier sessions in a task's prompt
const U = require('./unit-lib');
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); };
const p = U.normalize({ name: 'Recipe Box', pitch: 'Plan meals.', milestones: [{ id: 'm1', title: 'Week', tasks: [{ id: 't1', title: 'Drag a recipe onto a day', status: 'doing' }, { id: 't2', title: 'Save the week', status: 'todo' }, { id: 't3', title: 'Grid', status: 'done' }] }],
  sessions: [
    { id: 'x1', date: '2026-10-01', mid: 'm1', tid: 't1', task: 'Drag', outcome: 'done' },
    { id: 'x2', date: '2026-10-05', mid: 'm1', tid: 't1', task: 'Drag', outcome: 'partly', summary: 'Mouse drag works', wrong: '' },
    { id: 'x3', date: '2026-10-13', mid: 'm1', tid: 't1', task: 'Drag', outcome: 'stuck', summary: '', wrong: 'Touch drags scroll the page\ninstead of moving the card' },
    { id: 'x4', date: '2026-10-13', mid: 'm1', tid: 't3', task: 'Grid', outcome: 'stuck', wrong: 'x' },
    { id: 'x5', date: '2026-10-13', task: 'Other work', outcome: 'stuck', wrong: 'y' },
  ] });
const t1 = p.milestones[0].tasks[0];
const h = U.taskHistory(p, t1);
check('only sessions on this task that say something, oldest first', h.map((s) => s.id).join() === 'x2,x3', h.map((s) => s.id));
check('one line each: date, outcome, what happened, what went wrong', U.historyLine(h[0]) === '- Oct 5, partly done: Mouse drag works.' && U.historyLine(h[1]) === '- Oct 13, stuck: What went wrong: Touch drags scroll the page instead of moving the card.', h.map(U.historyLine));
const text = U.taskPrompt(p, p.milestones[0], t1);
check('the prompt carries them, before the work steps', /Earlier sessions on this task:\n- Oct 5, partly done: Mouse drag works\.\n- Oct 13, stuck: What went wrong: Touch drags scroll the page instead of moving the card\.\nBefore you change anything, run git status and git diff \(if this folder is in git\) to see whether the last try left changes behind\. Tell me what you find, and ask me before reverting any of it\. Then carry on from there, and learn from what went wrong before\./.test(text) && text.indexOf('Earlier sessions') < text.indexOf('How to work:'), text);
check('a task with no sessions has none', !/earlier session/i.test(U.taskPrompt(p, p.milestones[0], p.milestones[0].tasks[1])));
check('a done task has none', !/earlier session/i.test(U.taskPrompt(p, p.milestones[0], p.milestones[0].tasks[2])));
const many = U.normalize({ ...p, sessions: [1, 2, 3, 4, 5].map((i) => ({ id: 'y' + i, date: `2026-10-0${i}`, tid: 't1', outcome: 'partly', summary: 'step ' + i + ' ' + 'x'.repeat(i === 5 ? 600 : 1) })) });
const hm = U.taskHistory(many, many.milestones[0].tasks[0]);
check('at most the last three, long text clipped', hm.length === 3 && hm[0].id === 'y3' && U.historyLine(hm[2]).length < 430 && U.historyLine(hm[2]).endsWith('…'), [hm.length, U.historyLine(hm[2]).length]);
check('without anything going wrong it carries on, after looking at what the try left (round 46)', /Then carry on from there\.$/m.test(U.taskPrompt(U.normalize({ ...p, sessions: [p.sessions[1]] }), p.milestones[0], t1)));
check('one session reads singular', /An earlier session on this task:/.test(U.taskPrompt(U.normalize({ ...p, sessions: [p.sessions[2]] }), p.milestones[0], t1)));
console.log(fails ? `${fails} failed` : 'all unit checks pass');
