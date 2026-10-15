// Round 59: review 12b, part 2. Answers in other shapes are read, repeats are left out and counted, the brief draft can be
// undone and says when its plan was not used, a split asks first when its task was finished meanwhile, Turn into tasks
// goes where Claude says the work fits, a cancel nobody asked for is a failure, dead Try again buttons go, and the Ask
// panel says why it is quiet.
const fs = require('fs');
const path = require('path');
const { launch, open, check, results } = require('../r48/lib');
const click = (pg, sel) => pg.evaluate((s) => { const e = document.querySelector(s); if (!e) throw new Error('no ' + s); e.click(); }, sel);
const doc = (pg, name) => pg.evaluate((n) => { for (const [, d] of window.__mockDocs) if (d.name === n) return d; return null; }, name);
const toastText = (pg) => pg.evaluate(() => document.querySelector('#toast')?.textContent || '');
const modal = (pg) => pg.evaluate(() => document.querySelector('#modal-root')?.innerText || '');
const proj = () => ({
  kind: 'project', name: 'Trail Log', pitch: 'Log hikes.', stack: 'Vite\nReact',
  milestones: [{ id: 'm1', title: 'Basics', tasks: [{ id: 't1', title: 'List hikes', size: 'S', status: 'doing' }, { id: 't2', title: 'Add the hike form and map view', size: 'L' }, { id: 't3', title: 'Show totals', size: 'S' }, { id: 't4', title: 'Add dark mode', size: 'S' }] },
    { id: 'm2', title: 'Sharing', tasks: [{ id: 't5', title: 'Share a hike link', size: 'M' }] }],
  chat: [{ id: 'c1', q: 'How should I share hikes?', a: 'Add a share link, then a page that shows one hike.' }],
});
const seen = "localStorage.setItem('shipyard.seen.v1', '99');";
const init = (extra = '') => `window.__SEED__ = ${JSON.stringify({ p1: proj() })}; ${seen} ${extra}`;
(async () => {
  // pure: review lists in any shape
  {
    const APP = process.env.APPJS;
    const src = fs.readFileSync(APP, 'utf8').split('\n');
    const end = src.findIndex((l) => l.startsWith('/* ================= health'));
    const U = new Function('localStorage', 'document', 'window', src.slice(3, end).join('\n') + '\nreturn { mkReview };')({ getItem() {}, setItem() {} }, {}, {});
    const r = U.mkReview({ headline: 'Fine.', strengths: [{ text: 'Clear scope' }, 'Small tasks'], risks: [{ title: 'No tests' }], suggestions: ['Add a smoke test', { title: 'Write a README', type: 'task' }] });
    check('review points sent as objects or strings are read', r.strengths.join('|') === 'Clear scope|Small tasks' && r.risks[0] === 'No tests' && r.suggestions.map((s) => s.title).join('|') === 'Add a smoke test|Write a README', r);
  }
  const b = await launch();
  {
    const reply = { result: { tasks: [{ task: '1. **Lay out the form**', size: 'small', notes: ['Name, date and distance.', 'Check it on a phone.'] }, { name: 'Show totals', size: 'Large' }, { title: '- Add the map view', size: 'S (under 15 minutes)' }, { title: 'Save a hike', size: 'medium', status: 'done' }] } };
    const { pg, errs } = await open(b, 'mocked.html', { init: init(`window.__SPLIT_REPLY__ = ${JSON.stringify(reply)};`), wait: 1200 });
    await click(pg, '#tab-plan');
    await click(pg, '[data-act="split-task"][data-tid="t2"]'); await pg.waitForTimeout(900);
    const rows = await pg.$$eval('#modal-root .prop-list li', (x) => x.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
    check('a wrapped split answer with "task" and "name" for titles is read, numbering and bold taken off', rows.length === 3 && /^Lay out the form Size S\. Name, date and distance\. Check it on a phone\./.test(rows[0]) && /^Add the map view Size S/.test(rows[1]) && /^Save a hike Size M/.test(rows[2]), rows);
    check('...the one already in the plan is left out, and the dialog says so', /Left out 1 suggestion that is already in the plan\./.test(await modal(pg)));
    await click(pg, '#modal-root [data-act="split-accept"]'); await pg.waitForTimeout(1700);
    const d = await doc(pg, 'Trail Log');
    const nt = d.milestones[0].tasks;
    check('...and new tasks are to do, whatever the answer says', nt.find((t) => t.title === 'Save a hike')?.status === 'todo' && nt.find((t) => t.title === 'Lay out the form')?.notes === 'Name, date and distance.\nCheck it on a phone.', nt.map((t) => [t.title, t.status, t.size]));
    check('no page errors (shapes)', !errs.length, errs);
    await pg.context().close();
  }
  {
    // an answer in a shape nothing reads; then not_granted: no dead Try again
    const { pg, errs } = await open(b, 'mocked.html', { init: init(`window.__SPLIT_REPLY__ = { note: 'Here is how I would split it', steps: 'first the form, then the map' };`), wait: 1200 });
    await click(pg, '#tab-plan');
    await click(pg, '[data-act="split-task"][data-tid="t2"]'); await pg.waitForTimeout(900);
    check('an answer in another shape says so, instead of "did not suggest a split"', /not in the shape Shipyard reads/.test(await modal(pg)), await modal(pg));
    await pg.evaluate(() => { window.__SAMPLE_FAIL__ = 'not_granted'; });
    await click(pg, '#modal-root [data-act="split-ai"]'); await pg.waitForTimeout(900);
    check('after "not available", the dialog offers no Try again', !(await pg.$('#modal-root [data-act="split-ai"]')) && /write the smaller tasks yourself/i.test(await modal(pg)), await modal(pg));
    check('no page errors (odd shape)', !errs.length, errs);
    await pg.context().close();
  }
  {
    // follow-ups: wrapped, a repeat from another milestone, a rule list
    const reply = { data: { followUps: [{ title: 'Share a hike link' }, { title: 'Write a test for totals', size: 'medium' }], rule: ['Run npm test before saying a task is done', 'Second rule'] } };
    const { pg, errs } = await open(b, 'mocked.html', { init: init(`window.__FOLLOW_REPLY__ = ${JSON.stringify(reply)};`), wait: 1200 });
    await click(pg, '.next [data-act="log-session"]'); await pg.waitForTimeout(300);
    await pg.fill('#ss-summary', 'Added the list.\n\nOutcome: done\nWent wrong: nothing');
    await click(pg, '#modal-root [data-act="save-session-ai"]'); await pg.waitForTimeout(1200);
    const rows = await pg.$$eval('#modal-root .prop-list li b', (x) => x.map((e) => e.textContent));
    check('follow-ups: a wrapped answer is read, a task another milestone has is left out, and a rule list gives its first rule', rows.join('|') === 'Write a test for totals|Run npm test before saying a task is done' && /Left out 1 suggestion/.test(await modal(pg)), rows);
    check('no page errors (follow-ups)', !errs.length, errs);
    await pg.context().close();
  }
  {
    // next milestones: a repeat is left out and counted on the proposal
    const { pg, errs } = await open(b, 'mocked.html', { init: init(), wait: 1200 });
    await click(pg, '#tab-plan');
    await click(pg, '[data-act="ai-plan"]'); await pg.waitForTimeout(900);
    const items = await pg.$$eval('.proposal .prop-list li', (x) => x.map((e) => e.innerText.replace(/\s+/g, ' ')));
    check('next milestones: "Add dark mode", already a task, is left out, and the proposal says so', !items.join(' ').includes('Add dark mode') && /Left out 1 suggestion that is already in the plan/.test(await pg.textContent('.proposal')), items);
    // Turn into tasks: where Claude says the work fits
    await pg.evaluate(() => { window.__ADVICE_REPLY__ = { milestone: 'Finish sharing', fits: 'Sharing', tasks: [{ title: 'Show one hike on its own page', size: 'M' }] }; });
    await click(pg, '#tab-overview');
    await click(pg, '[data-act="chat-tasks"][data-id="c1"]'); await pg.waitForTimeout(900);
    check('Turn into tasks picks the milestone Claude says the work belongs in', (await pg.inputValue('#fp-to')) === 'm2', await pg.inputValue('#fp-to'));
    await click(pg, '#modal-root [data-act="close-modal"]');
    await pg.evaluate(() => { window.__ADVICE_REPLY__ = { milestone: 'Finish sharing', fits: '', tasks: [{ title: 'Show one hike on its own page', size: 'M' }] }; });
    await click(pg, '[data-act="chat-tasks"][data-id="c1"]'); await pg.waitForTimeout(900);
    check('...or a new one when Claude says none fits', (await pg.inputValue('#fp-to')) === 'new', await pg.inputValue('#fp-to'));
    const pr = (await pg.evaluate(() => window.__prompts)).find((s) => s.startsWith('Turn the advice'));
    check('...and the prompt lists the unfinished milestones', /Unfinished milestones:\n- Basics\n- Sharing/.test(pr));
    await click(pg, '#modal-root [data-act="close-modal"]');
    // a cancel nobody asked for
    await pg.evaluate(() => { window.__CHAT_FAIL__ = 'cancelled'; window.__CHAT_PARTIAL__ = 'Start with'; });
    await pg.fill('#ask-q', 'What next?');
    await click(pg, '[data-act="chat-send"]'); await pg.waitForTimeout(2000);
    const c = (await doc(pg, 'Trail Log')).chat.at(-1);
    check('a cancel nobody asked for is shown as broken off, not as stopped', c.failed === true && c.stopped === false && /stopped before it finished/.test(await toastText(pg)), { c, t: await toastText(pg) });
    check('no page errors (milestones)', !errs.length, errs);
    await pg.context().close();
  }
  {
    // split: the task is finished on another device while Claude works
    const { pg, errs } = await open(b, 'mocked.html', { init: init('window.__SAMPLE_DELAY__ = 1200;'), wait: 1200 });
    await click(pg, '#tab-plan');
    await click(pg, '[data-act="split-task"][data-tid="t2"]'); await pg.waitForTimeout(300);
    await pg.waitForTimeout(1300); // saved by now
    const other = JSON.parse(JSON.stringify(await doc(pg, 'Trail Log')));
    Object.assign(other.milestones[0].tasks[1], { status: 'done', doneAt: '2026-10-14' });
    await pg.evaluate((d) => window.__mockEmitExternal('p1', d), other);
    await pg.waitForTimeout(1200);
    await click(pg, '#modal-root [data-act="split-accept"]'); await pg.waitForTimeout(300);
    check('replacing a task finished meanwhile asks first', /marked done \(2026-10-14\)\. Replacing it puts its work back to do\. Choose Replace again/.test(await modal(pg)) && (await doc(pg, 'Trail Log')).milestones[0].tasks[1].id === 't2', await modal(pg));
    await click(pg, '#modal-root [data-act="split-accept"]'); await pg.waitForTimeout(1700);
    check('...and a second press replaces it', !(await doc(pg, 'Trail Log')).milestones[0].tasks.some((t) => t.id === 't2'));
    check('no page errors (split done)', !errs.length, errs);
    await pg.context().close();
  }
  {
    // the brief draft: Undo, and a plan left out
    const { pg, errs } = await open(b, 'mocked.html', { init: seen, wait: 900 });
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Recipe Box');
    await pg.fill('#np-idea', 'Save recipes from links and plan meals.');
    await click(pg, '#modal-root [data-act="create-ai"]'); await pg.waitForTimeout(1200);
    check('the draft offers Undo', /drafted/.test(await toastText(pg)) && !!(await pg.$('#toast [data-act="undo"]')), await toastText(pg));
    await click(pg, '#toast [data-act="undo"]'); await pg.waitForTimeout(1700);
    const d = await doc(pg, 'Recipe Box');
    check('...which takes the draft back', d && !d.features.length && !d.milestones.length && !d.audience && d.pitch === 'Save recipes from links and plan meals.', d && { f: d.features.length, m: d.milestones.length, a: d.audience, p: d.pitch });
    check('no page errors (draft)', !errs.length, errs);
    await pg.context().close();
  }
  {
    const { pg, errs } = await open(b, 'plain.html', { init: `localStorage.setItem('shipyard.projects.v1', ${JSON.stringify(JSON.stringify({ p1: proj() }))}); ${seen}`, wait: 900 });
    check('without Claude, the Ask panel says why there is no question box', /cannot be asked from this page right now/.test(await pg.textContent('.ask')), await pg.textContent('.ask').catch(() => 'no panel'));
    check('no page errors (plain)', !errs.length, errs);
    await pg.context().close();
  }
  await b.close();
  const fails = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - fails} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})();
