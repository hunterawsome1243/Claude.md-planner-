// Round 43: two devices editing one project (review 9b H2, H3); the merge code is taken from app.js as it is
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(process.env.APPJS || path.join(__dirname, '..', '..', '..', 'src', 'app.js'), 'utf8');
const grab = (start, end) => { const i = src.indexOf(start); const j = src.indexOf(end, i); if (i < 0 || j < 0) throw new Error('not found ' + start); return src.slice(i, j); };
const { merge3, mergeField, mergeLines } = new Function([
  'const arr = (v) => (Array.isArray(v) ? v : []);', 'const clone = (o) => JSON.parse(JSON.stringify(o));', 'const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);',
  grab('function isItemList(v)', 'const sameProject'), 'return { merge3, mergeField, mergeLines };'].join('\n'))();
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); };
const { web } = require('./seed');
const base = web();
const cp = (o) => JSON.parse(JSON.stringify(o));
const ids = (ms) => ms.flatMap((m) => m.tasks.map((t) => t.id));
const dupes = (ms) => { const seen = new Set(); return ids(ms).filter((x) => (seen.has(x) ? true : (seen.add(x), false))); };
const find = (ms, id) => ms.flatMap((m) => m.tasks.map((t) => ({ m: m.id, t }))).filter((x) => x.t.id === id);

// a task moved on the desktop, started on the laptop (this device)
{
  const L = cp(base.milestones); const R = cp(base.milestones);
  L[2].tasks.find((t) => t.id === 'tw23').status = 'doing';
  const [mv] = R[2].tasks.splice(R[2].tasks.findIndex((t) => t.id === 'tw23'), 1); R[3].tasks.push(mv);
  const out = mergeField('milestones', base.milestones, L, R);
  const at = find(out, 'tw23');
  check('moved there, started here: one task, where it was moved, started', !dupes(out).length && at.length === 1 && at[0].m === 'mw4' && at[0].t.status === 'doing' && ids(out).length === 40, at.map((x) => x.m + ':' + x.t.status));
  const back = mergeField('milestones', base.milestones, R, L); // the same, seen from the desktop
  const at2 = find(back, 'tw23');
  check('and the same from the other device', !dupes(back).length && at2.length === 1 && at2[0].m === 'mw4' && at2[0].t.status === 'doing', at2.map((x) => x.m + ':' + x.t.status));
}
// moved on both devices to different milestones: this device's move wins, no copy
{
  const L = cp(base.milestones); const R = cp(base.milestones);
  const [a] = L[2].tasks.splice(L[2].tasks.findIndex((t) => t.id === 'tw23'), 1); L[4].tasks.push(a);
  const [b] = R[2].tasks.splice(R[2].tasks.findIndex((t) => t.id === 'tw23'), 1); R[3].tasks.push(b);
  const out = mergeField('milestones', base.milestones, L, R);
  check('moved on both: one copy, where this device put it', find(out, 'tw23').length === 1 && find(out, 'tw23')[0].m === 'mw5' && ids(out).length === 40);
}
// moved within its milestone on one device, edited on the other: unchanged behaviour
{
  const L = cp(base.milestones); const R = cp(base.milestones);
  L[2].tasks.find((t) => t.id === 'tw23').notes = 'A4 paper';
  const t = R[2].tasks.splice(R[2].tasks.findIndex((x) => x.id === 'tw23'), 1)[0]; R[2].tasks.unshift(t);
  const out = mergeField('milestones', base.milestones, L, R);
  check('moved up there, noted here: one task, first, with the note', out[2].tasks[0].id === 'tw23' && out[2].tasks[0].notes === 'A4 paper' && !dupes(out).length);
}
// split on the desktop, done on the laptop
{
  const L = cp(base.milestones); const R = cp(base.milestones);
  Object.assign(L[2].tasks.find((t) => t.id === 'tw21'), { status: 'done', doneAt: '2026-10-14' });
  const i = R[2].tasks.findIndex((t) => t.id === 'tw21');
  R[2].tasks.splice(i, 1, ...['a', 'b', 'c'].map((k) => ({ id: 'tsplit' + k, title: 'Part ' + k, size: 'S', status: 'todo', doneAt: '', notes: '', feat: 'fw4', splitFrom: 'tw21' })));
  const out = mergeField('milestones', base.milestones, L, R);
  check('split there, done here: the parts replace the big task', !find(out, 'tw21').length && find(out, 'tsplitb').length === 1 && ids(out).length === 42, out[2].tasks.map((t) => t.id));
  const back = mergeField('milestones', base.milestones, R, L);
  check('and from the other device', !find(back, 'tw21').length && ids(back).length === 42);
}
// a part split again: its whole lineage gives way
{
  const L = cp(base.milestones); const R = cp(base.milestones);
  L[2].tasks.find((t) => t.id === 'tw21').notes = 'Start with pasta';
  const i = R[2].tasks.findIndex((t) => t.id === 'tw21');
  R[2].tasks.splice(i, 1, { id: 'tq1', title: 'Q1', size: 'S', status: 'todo', doneAt: '', notes: '', feat: '', splitFrom: 'tp1 tw21' });
  const out = mergeField('milestones', base.milestones, L, R);
  check('a part of a part also replaces the original', !find(out, 'tw21').length && find(out, 'tq1').length === 1);
}
// nothing else changes: the old cases still hold
{
  const L = cp(base.milestones); const R = cp(base.milestones);
  [L[3], L[4]] = [L[4], L[3]];
  const t = R[2].tasks.shift(); R[2].tasks.push(t);
  const out = mergeField('milestones', base.milestones, L, R);
  check('reorders on both: no loss or copy', ids(out).length === 40 && !dupes(out).length && out[3].id === 'mw5' && out[2].tasks.at(-1).id === t.id);
  const L2 = cp(base.milestones); L2[1].tasks.push({ id: 'tn1', title: 'New here', size: 'S', status: 'todo', doneAt: '', notes: '', feat: '', splitFrom: '' });
  const R2 = cp(base.milestones); R2[1].tasks.push({ id: 'tn2', title: 'New there', size: 'S', status: 'todo', doneAt: '', notes: '', feat: '', splitFrom: '' });
  const o2 = mergeField('milestones', base.milestones, L2, R2);
  check('tasks added on both: both kept', find(o2, 'tn1').length === 1 && find(o2, 'tn2').length === 1 && ids(o2).length === 42);
}
// rules added on both devices
{
  const b = base.conventions;
  const L = b + '\n- Test drag and drop with touch as well as a mouse';
  const R = b + '\n- Run npm test before saying a task is done';
  const out = mergeField('conventions', b, L, R);
  check('rules added on both are both kept, this device\'s first', out === b + '\n- Test drag and drop with touch as well as a mouse\n- Run npm test before saying a task is done', out.split('\n').slice(-3));
  const same2 = mergeField('conventions', b, b + '\n- Same rule', b + '\n- Same rule');
  check('the same rule added on both is kept once', same2 === b + '\n- Same rule');
  const both = mergeField('conventions', b, L + '\n- Same rule', R + '\n- Same rule');
  check('one rule each plus a shared one: three lines, no copy', both.split('\n').filter((x) => x === '- Same rule').length === 1 && /touch as well/.test(both) && /npm test before/.test(both), both.split('\n').slice(-4));
  const lines = b.split('\n');
  const removedThere = lines.filter((_, i) => i !== 0).join('\n');
  const out2 = mergeField('conventions', b, L, removedThere);
  check('a rule removed there and one added here: both changes stay', !out2.split('\n').includes(lines[0]) && /touch as well/.test(out2), out2.split('\n').slice(0, 2));
  const mid = mergeLines('a\nb\nc', 'a\nb\nc\nd', 'a\nx\nb\nc');
  check('a line added in the middle there goes in the middle here', mid === 'a\nx\nb\nc\nd', mid);
  const top = mergeLines('a\nb', 'a\nb\nc', 'z\na\nb');
  check('and one added at the top stays at the top', top === 'z\na\nb\nc', top);
  const dupLine = mergeLines('- x\n- y\n- x', '- x\n- y\n- x\n- z', '- y\n- x');
  check('a repeated line removed once there is removed once here', dupLine === '- y\n- x\n- z', dupLine);
}
// CLAUDE.md edited by hand on both devices
{
  const b = '# Pantry\n\n## Rules\n- Use TypeScript\n';
  const L = '# Pantry\n\n## Rules\n- Use TypeScript\n- Keep components small\n';
  const R = '# Pantry\n\n## Rules\n- Use TypeScript\n\n## Lessons learned\n- Run npm test first\n';
  const out = mergeField('claudeMd', b, L, R);
  check('CLAUDE.md: both additions kept', /Keep components small/.test(out) && /## Lessons learned\n- Run npm test first/.test(out), out);
}
// a field that is not kept by line still goes to this device
{
  check('a pitch changed on both: this device\'s wins, as before', mergeField('pitch', 'a', 'b', 'c') === 'b');
  check('one side only: that side', mergeField('conventions', 'a', 'a', 'a\nb') === 'a\nb' && mergeField('milestones', base.milestones, base.milestones, base.milestones.slice(0, 2)).length === 2);
}
console.log(fails ? `fails: ${fails}` : 'fails: 0');
process.exitCode = fails ? 1 : 0;
