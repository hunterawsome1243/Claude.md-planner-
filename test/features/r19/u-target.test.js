// Round 19: size-weighted estimate and the target date
const U = require('./unit-lib');
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); };
const now = '2026-10-14';
const mk = (tasks, extra) => U.normalize({ name: 'x', createdAt: '2026-08-01T00:00:00Z', milestones: [{ id: 'm1', title: 'A', tasks }], ...extra });
// 2 S tasks done in each of two recent weeks: 4 points over 4 whole weeks and 3 days (round 22) = 0.9 points a week
const doneS = [{ id: 'd1', title: 'a', size: 'S', status: 'done', doneAt: '2026-10-13' }, { id: 'd2', title: 'b', size: 'S', status: 'done', doneAt: '2026-10-12' }, { id: 'd3', title: 'c', size: 'S', status: 'done', doneAt: '2026-10-06' }, { id: 'd4', title: 'd', size: 'S', status: 'done', doneAt: '2026-10-05' }];
const g1 = U.weeklyProgress(mk([...doneS, { id: 'l1', title: 'big', size: 'L' }]), now);
check('an L task left weighs four S tasks', g1.left === 1 && g1.daysLeft === 31 && g1.weeksLeft === 4, [g1.daysLeft, g1.weeksLeft]);
const g2 = U.weeklyProgress(mk([...doneS, { id: 's1', title: 'small', size: 'S' }]), now);
check('an S task left weighs one', g2.daysLeft === 8 && g2.weeksLeft === 1, [g2.daysLeft, g2.weeksLeft]);
check('dates add up', U.addDays('2026-10-14', 28) === '2026-11-11' && U.daysBetween('2026-10-14', '2026-11-11') === 28 && U.addDays('2026-12-30', 3) === '2027-01-02');
const t = (target, g) => U.targetCheck(g, target, now);
check('no target: just the finish date', JSON.stringify(t('', g1)) === JSON.stringify({ finish: '2026-11-14', late: 0, lateDays: 0, until: 0, state: 'estimate' }), t('', g1));
check('on pace when the finish is on or before the target', t('2026-11-14', g1).state === 'onpace' && t('2026-12-01', g1).state === 'onpace');
check('behind: days, and weeks to the nearest', t('2026-11-03', g1).state === 'behind' && t('2026-11-03', g1).late === 2 && t('2026-11-03', g1).lateDays === 11 && t('2026-11-10', g1).late === 1 && t('2026-11-10', g1).lateDays === 4, [t('2026-11-03', g1), t('2026-11-10', g1)]);
check('a passed target with work left', t('2026-10-01', g1).state === 'passed');
check('no steady pace yet: days until the target', t('2026-10-24', { left: 3, weeksLeft: null }).state === 'nopace' && t('2026-10-24', { left: 3, weeksLeft: null }).until === 10);
check('nothing left: done', t('2026-10-01', { left: 0, total: 2, weeksLeft: null }).state === 'done' && t('2026-10-01', { left: 0, total: 0, weeksLeft: null }).state === 'passed' && t('2026-10-30', { left: 0, total: 0, weeksLeft: null }).state === 'noplan');
check('a bad target is ignored', t('soon', g1).state === 'estimate');
check('targetDate survives normalize only as a date', U.normalize({ targetDate: '2026-11-30' }).targetDate === '2026-11-30' && U.normalize({ targetDate: 'next week' }).targetDate === '' && U.normalize({}).targetDate === '');
const p = mk([{ id: 't1', title: 'x' }], { targetDate: '2026-12-01', features: [] });
check('export and import keep the target', U.parseShipyardMd(U.projectMarkdown(p)).targetDate === '2026-12-01', U.projectMarkdown(p).split('\n').filter((l) => /ship by/.test(l)));
const pulse = U.projectPulse(mk([...doneS, { id: 'l1', title: 'big', size: 'L' }], { pitch: 'p', targetDate: '2026-11-03' }), now);
check('All projects flags a project behind its target', pulse.attention[0] === 'About 2 weeks behind the target' && pulse.tc.state === 'behind', pulse.attention);
console.log(fails ? `${fails} failed` : 'all unit checks pass');
