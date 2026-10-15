// Round 57: the rest of review 11b. A shared chat says who asked; Export plan then Import keeps feature titles that end
// like a status, and the indentation of error logs, notes and session text.
const { launch, open, check, results } = require('../r48/lib');
const chat = [{ id: 'c1', q: 'Owner question', a: 'An answer.', by: 'owner' }, { id: 'c2', q: 'Editor question', a: 'Another.', by: 'editor' }, { id: 'c3', q: 'Asked before sharing', a: 'Old.' }];
const shared = { 'p-a': { kind: 'project', name: 'Team Plan', pitch: 'Plan together.', chat, milestones: [{ id: 'm1', title: 'Basics', tasks: [{ id: 't1', title: 'Start', size: 'S' }] }] } };
const as = (u) => `window.__SEED__ = ${JSON.stringify(shared)}; window.__USER__ = ${JSON.stringify(u)}; localStorage.setItem('shipyard.seen.v1', '99');`;
const who = (pg) => pg.$$eval('.ask .chat li.q .who', (x) => x.map((e) => e.textContent));
const ERR = 'TypeError: x is undefined\n    at save (cart.js:10)\n\tat click (ui.js:4)';
const NOTES = 'Run these:\n    npm test\n  - not a list item\n  1. nor this';
const proj = {
  kind: 'project', name: 'Shop', pitch: 'A shop', stage: 'building',
  features: [{ id: 'f1', title: 'Cart (in progress)', priority: 'must', status: 'todo' }, { id: 'f2', title: 'Ship it (done)', priority: 'must', status: 'done' },
    { id: 'f3', title: 'Login', priority: 'should', status: 'doing' }, { id: 'f4', title: 'Search (to do)', priority: 'could', status: 'doing', detail: 'Find by name:\n  exact first\n  then partial' }],
  screens: [{ id: 's1', name: 'Cart page', notes: 'Shows:\n  items\n  total' }],
  entities: [{ id: 'e1', name: 'Order', fields: 'id\n  number', notes: 'Kept:\n    for a year' }],
  milestones: [{ id: 'm1', title: 'Start', tasks: [{ id: 't1', title: 'Build the cart', size: 'S', feat: 'f1', notes: NOTES }, { id: 't2', title: 'Add login', size: 'M', feat: 'f3' }] }],
  bugs: [{ id: 'b1', title: 'Crash on save', severity: 'blocker', error: ERR, steps: '1. Open the cart\n2. Save' }],
  sessions: [{ id: 'x1', date: '2026-10-10', outcome: 'done', task: 'Build the cart', summary: 'Changed:\n    cart.js\n    ui.js', wrong: '' }],
};
async function roundTrip(pg) {
  await pg.click('#plist .pitem >> text=Shop');
  await pg.click('[data-act="export"] >> visible=true');
  await pg.waitForTimeout(200);
  const md = await pg.$eval('#m-export', (t) => t.value);
  await pg.click('[data-act="close-modal"]');
  await pg.click('[data-act="open-import"] >> visible=true');
  await pg.waitForTimeout(200);
  await pg.fill('#np-text', md);
  await pg.waitForTimeout(300);
  await pg.click('[data-act="import"]');
  await pg.waitForTimeout(1800);
  return md;
}
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: as({ owner: false, edit: true }), wait: 1200 });
    check("an editor sees the owner's question marked as the owner's, and their own as theirs", (await who(pg)).join('|') === 'The owner|You|You', await who(pg));
    await pg.fill('#ask-q', 'What next?');
    await pg.click('[data-act="chat-send"]');
    await pg.waitForTimeout(1800);
    const last = await pg.evaluate(() => { const c = window.__mockDocs.get('p-a').chat; return c[c.length - 1]; });
    check('a question an editor asks is saved as asked by an editor', last.q === 'What next?' && last.by === 'editor', last);
    check('no page errors (editor)', !errs.length, errs);
    await pg.context().close();
  }
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: as({ owner: true, edit: true }), wait: 1200 });
    check("the owner sees an editor's question marked as someone else's", (await who(pg)).join('|') === 'You|Someone you share with|You', await who(pg));
    check('no page errors (owner)', !errs.length, errs);
    await pg.context().close();
  }
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify({ p1: proj })}; localStorage.setItem('shipyard.seen.v1', '99');`, wait: 1200 });
    const md = await roundTrip(pg);
    const back = await pg.evaluate(() => { for (const [, d] of window.__mockDocs) if (/imported/.test(d.name)) return d; return null; });
    check('the imported copy exists', !!back, back && back.name);
    const fs = back.features.map((f) => [f.title, f.status]);
    check('feature titles that end like a status come back whole, with their status', JSON.stringify(fs) === JSON.stringify([['Cart (in progress)', 'todo'], ['Ship it (done)', 'done'], ['Login', 'doing'], ['Search (to do)', 'doing']]), { fs, lines: md.split('\n').filter((l) => /^- \[/.test(l)).slice(0, 6) });
    const ts = back.milestones[0].tasks;
    check('...so tasks keep their features', ts.every((t) => t.feat && back.features.some((f) => f.id === t.feat)) && back.features.find((f) => f.id === ts[0].feat).title === 'Cart (in progress)', ts.map((t) => t.feat));
    check('an error log keeps its indentation, tabs too', back.bugs[0].error === ERR, JSON.stringify(back.bugs[0].error));
    check('numbered steps come back as written', back.bugs[0].steps === proj.bugs[0].steps, JSON.stringify(back.bugs[0].steps));
    check('task notes keep their indentation, and lines that look like list items stay text', ts[0].notes === NOTES, JSON.stringify(ts[0].notes));
    check('feature details, screen notes, data model and session summaries keep theirs', back.features[3].detail === proj.features[3].detail && back.screens[0].notes === proj.screens[0].notes && back.entities[0].fields === proj.entities[0].fields && back.entities[0].notes === proj.entities[0].notes && back.sessions[0].summary === proj.sessions[0].summary,
      [back.features[3].detail, back.screens[0].notes, back.entities[0].fields, back.entities[0].notes, back.sessions[0].summary]);
    // an export from before this round: "(in progress)" after a title is the status
    const old = md.replace('- [ ] Cart (in progress) (to do)', '- [ ] Cart (in progress)').replace(/# Shop/, '# Older Shop');
    await pg.click('[data-act="open-import"] >> visible=true');
    await pg.waitForTimeout(200);
    await pg.fill('#np-text', old);
    await pg.waitForTimeout(300);
    await pg.click('[data-act="import"]');
    await pg.waitForTimeout(1800);
    const ob = await pg.evaluate(() => { for (const [, d] of window.__mockDocs) if (/^Older Shop/.test(d.name)) return d; return null; });
    check('an older export still reads "(in progress)" as the status', ob && ob.features[0].title === 'Cart' && ob.features[0].status === 'doing', ob && ob.features.map((f) => [f.title, f.status]));
    check('no page errors (export)', !errs.length, errs);
    await pg.context().close();
  }
  await b.close();
  const fails = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - fails} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})();
