// Round 41: days on PLAN.md ticks are calendar dates in every time zone (review 9b H5)
const { execFileSync } = require('child_process');
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); };
if (process.argv[2] === 'tz') { // runs inside one time zone and prints what it read
  const U = require('./unit-lib');
  const base = () => U.normalize({ name: 'P', milestones: [{ id: 'm1', title: 'M', tasks: [{ id: 't1', title: 'Do it', size: 'M' }, { id: 't2', title: 'Then this', size: 'S' }] }] });
  const md = U.buildPlanMd(base()).replace('- [ ] Do it (M) <!-- id:t1 -->', '- [x] Do it (M, done 2026-10-13) <!-- id:t1 -->').replace('- [ ] Then this (S) <!-- id:t2 -->', '- [x] Then this (S) (done 2026-10-01) <!-- id:t2 -->');
  const r = U.readPlanMd(base(), md);
  const imp = U.parsePlanFile(md);
  console.log(JSON.stringify({ read: r.done.map((x) => x.at), imp: imp.milestones[0].tasks.map((t) => t.doneAt), tail: U.planTaskTail('Do it (M, done 2026-10-13)').at, bad: U.planTaskTail('Do it (M, done 2026-02-30)').at }));
  process.exit(0);
}
const U = require('./unit-lib');
check('a real day is a day', U.realDay('2026-10-13') && U.realDay('2024-02-29') && U.realDay('2026-12-31'));
check('days that do not exist are not', !U.realDay('2026-02-30') && !U.realDay('2025-02-29') && !U.realDay('2026-13-01') && !U.realDay('2026-00-10') && !U.realDay('2026-10-32') && !U.realDay('2026-1-5') && !U.realDay('') && !U.realDay(null));
for (const tz of ['UTC', 'America/Los_Angeles', 'Pacific/Auckland', 'Pacific/Kiritimati', 'Pacific/Pago_Pago']) {
  const out = JSON.parse(execFileSync(process.execPath, [__filename, 'tz'], { env: { ...process.env, TZ: tz } }).toString().trim().split('\n').pop());
  check(`${tz}: a tick keeps the day Claude Code wrote`, out.read.join() === '2026-10-13,2026-10-01' && out.imp.join() === '2026-10-13,2026-10-01' && out.tail === '2026-10-13' && out.bad === '', out);
}
console.log(fails ? `fails: ${fails}` : 'fails: 0');
process.exitCode = fails ? 1 : 0;
