// Round 72: fields this version does not know are kept when a project is read, in chat answers, reviews and the project
const U = require('../r41/unit-lib');
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); };
const raw = {
  name: 'P', futureField: { a: 1 }, other: 'x',
  chat: [{ id: 'c1', q: 'Q', a: 'A', at: '2026-10-01T00:00:00Z', pinned: true, by: 'stranger' }, { id: 'c2', q: 'Q2', a: 'A2', by: 'owner' }],
  lastReview: { at: '2026-10-01T00:00:00Z', headline: 'H', suggestions: [{ title: 'T', type: 'odd', note: 'n' }, 'plain'], extra: 3 },
  milestones: [{ id: 'm1', title: 'M', tasks: [{ id: 't1', title: 'T', later: 1 }] }],
};
const p = U.normalize(JSON.parse(JSON.stringify(raw)));
check('an unknown project field is kept', p.futureField?.a === 1 && p.other === 'x');
check('known fields are still cleaned', p.name === 'P' && Array.isArray(p.features) && p.stage === 'idea');
check('a chat answer keeps an unknown field', p.chat[0].pinned === true);
check('...but a "by" that is not owner or editor is still dropped', !('by' in p.chat[0]) && p.chat[1].by === 'owner');
check('a review keeps unknown fields, and so does each suggestion', p.lastReview.extra === 3 && p.lastReview.suggestions[0].note === 'n' && p.lastReview.suggestions[0].type === 'task' && p.lastReview.suggestions[1].title === 'plain');
check('tasks kept theirs already', p.milestones[0].tasks[0].later === 1);
const twice = U.normalize(JSON.parse(JSON.stringify(p)));
check('reading it again changes nothing', JSON.stringify(twice) === JSON.stringify(p));
check('nothing dangerous is copied', !Object.prototype.hasOwnProperty.call(U.normalize(JSON.parse('{"name":"x","__proto__":{"polluted":1}}')), '__proto__') && ({}).polluted === undefined);
const lw = U.linkWords('Buttons and cities, tasks; bus its');
check('linkWords still drops a plural s after three letters, and ies to y', lw.includes('button') && lw.includes('city') && lw.includes('task') && lw.includes('bus'), lw);
console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
