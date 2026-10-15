// Round 41: data safety (review 9b H1, H4, H5, M6, M9; review 9a H2, M4)
const { launch, open, check } = require('./lib');
const fs = require('fs'); const path = require('path');
// a copy of the mocked page that lets the test call a few of the app's own functions
const TEST = process.env.TESTDIR || path.join(__dirname, '..', '..');
const VAR = path.join(__dirname, 'hooked.html');
{ const src = fs.readFileSync(path.join(TEST, 'mocked.html'), 'utf8'); const i = src.lastIndexOf('initCapabilities();\n})();');
  fs.writeFileSync(VAR, src.slice(0, i) + 'window.__T = { sizeOf, trimSessions, trimNote, normalize, active, allTasks };\n' + src.slice(i)); }
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const seedOf = (o, extra = '') => `window.__SEED__ = ${JSON.stringify(o)};${extra}`;
const doc = (pg, id = 'p-a') => pg.evaluate((k) => window.__mockDocs.get(k), id);
const day = (n) => { const t = new Date(Date.UTC(2026, 8, 1)); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const words = (n) => 'Changed the pantry list so it groups items by shelf and shows the counts next to each one. '.repeat(Math.ceil(n / 80) + 1).slice(0, n);
const proj = (n, len, extra = {}) => ({ kind: 'project', name: 'Pantry Planner', pitch: 'Plan meals from the pantry.', audience: 'Me', problem: 'Food goes off.', doneWhen: 'A week is planned.', guideHidden: true,
  milestones: [{ id: 'm1', title: 'Basics', tasks: [{ id: 't1', title: 'Do it', size: 'M', status: 'doing' }, { id: 't2', title: 'Then this', size: 'S' }] }],
  sessions: Array.from({ length: n }, (_, i) => ({ id: 's' + i, date: day(Math.floor(i / 5)), task: 'Older work ' + i, outcome: 'done', summary: words(len), wrong: 'nothing much' })), ...extra });
const toastText = (pg) => pg.textContent('#toast span').then(norm);
const undo = async (pg) => { await pg.click('#toast [data-act="undo"]'); await pg.waitForTimeout(1700); };
const logIt = async (pg, ai) => {
  await pg.click('[data-act="log-session"] >> visible=true');
  await pg.fill('#ss-summary', 'Added the shelf view.\nOutcome: done\nWent wrong: nothing');
  await pg.click(ai ? '[data-act="save-session-ai"]' : '[data-act="save-session"]');
};
(async () => {
  const b = await launch();
  // H1: a modest history is left alone
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf({ 'p-a': proj(25, 950) }), wait: 700 });
    await logIt(pg);
    await pg.waitForTimeout(150);
    check('25 sessions: the toast says nothing about shortening', !/shortened|removed/.test(await toastText(pg)), await toastText(pg));
    await pg.waitForTimeout(1600);
    const d = await doc(pg);
    check('and every earlier session keeps its full text', d.sessions.length === 26 && d.sessions.slice(0, 25).every((x) => x.summary.length === 950), d.sessions.map((x) => x.summary.length).slice(0, 5));
    await undo(pg);
    check('Undo still takes the session out', (await doc(pg)).sessions.length === 25);
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  // H1: near the limit, the oldest notes are shortened, it says so, and Undo puts them back
  {
    const { pg, errs } = await open(b, VAR, { init: seedOf({ 'p-a': proj(170, 1100) }), wait: 900 });
    const size0 = await pg.evaluate(() => __T.sizeOf(__T.active()));
    check('the seed is near the limit but saveable', size0 > 200000 && size0 < 250000, size0);
    await logIt(pg);
    await pg.waitForTimeout(150);
    const t = await toastText(pg);
    const m = /To keep the project small enough to save, the notes of the (\d+) oldest sessions were shortened\. Undo puts them back\.$/.exec(t);
    check('the toast says how many old notes were shortened', !!m && +m[1] > 0 && !/removed/.test(t), t);
    await pg.waitForTimeout(1600);
    const d = await doc(pg);
    const n = m ? +m[1] : 0;
    check('only that many, oldest first, and none removed', d.sessions.length === 171 && d.sessions.slice(0, n).every((x) => x.summary.length <= 500 && x.summary.endsWith('…')) && d.sessions.slice(n, 170).every((x) => x.summary.length === 1100), [d.sessions.length, n]);
    check('it now fits under the line', (await pg.evaluate(() => __T.sizeOf(__T.active()))) <= 200000);
    await undo(pg);
    const u = await doc(pg);
    check('Undo puts every note back whole and the task as it was', u.sessions.length === 170 && u.sessions.every((x) => x.summary.length === 1100) && u.milestones[0].tasks[0].status === 'doing', [u.sessions.length, u.sessions.filter((x) => x.summary.length !== 1100).length]);
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  // H1: what trimming may and may not do
  {
    const { pg, errs } = await open(b, VAR, { init: seedOf({ 'p-a': proj(0, 0) }), wait: 700 });
    const r = await pg.evaluate(() => {
      const { normalize, trimSessions, sizeOf, trimNote } = __T;
      const mk = (n, extra) => normalize({ name: 'X', sessions: Array.from({ length: n }, (_, i) => ({ id: 'z' + i, date: '2026-09-01', task: 'Small job number ' + i + ' on the list', outcome: 'done', summary: 'Short note about what changed in this one.', wrong: '' })), ...extra });
      const a = mk(1400);
      const before = a.sessions.length;
      const ra = trimSessions(a);
      const b = mk(40, { claudeMd: 'x'.repeat(240000), claudeMdEdited: true });
      const rb = trimSessions(b);
      const c = mk(40);
      const rc = trimSessions(c);
      return { before, after: a.sessions.length, ra: ra && { short: ra.short, dropped: ra.dropped }, last: a.sessions.at(-1).id, size: sizeOf(a), rb, bLen: b.sessions.length, rc, note: trimNote({ short: 1, dropped: 3 }) };
    });
    check('with nothing left to shorten, the oldest go until it fits', r.ra && r.ra.short === 0 && r.ra.dropped === r.before - r.after && r.after >= 10 && r.last === 'z1399' && r.size <= 237500 && r.size > 230000, { ...r, rb: !!r.rb });
    check('sessions are never dropped when that would not bring the project under the line', r.rb === null && r.bLen === 40, [r.rb && r.rb.dropped, r.bLen]);
    check('a small project is not touched', r.rc === null);
    check('the note reads well', r.note === 'To keep the project small enough to save, the notes of the oldest session were shortened and the 3 oldest sessions were removed.', r.note);
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  // M6: Save and ask Claude what is next can be undone, with what was accepted
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf({ 'p-a': proj(3, 200, { conventions: '- Use TypeScript' }) }), wait: 700 });
    await logIt(pg, true);
    await pg.waitForSelector('[data-act="session-accept"]');
    await pg.click('[data-act="session-accept"]');
    await pg.waitForTimeout(150);
    const t = await toastText(pg);
    check('accepting says the session is logged and what was added, with Undo', /^Session logged\. Added 2 tasks to the plan\. Added to Rules for Claude Code/.test(t) && await pg.isVisible('#toast [data-act="undo"]'), t);
    await pg.waitForTimeout(1600);
    const d = await doc(pg);
    check('the tasks and the rule are in', d.milestones[0].tasks.length === 4 && /Run npm test before saying a task is done/.test(d.conventions) && d.sessions.length === 4 && d.milestones[0].tasks[0].status === 'done');
    await undo(pg);
    const u = await doc(pg);
    check('Undo takes out the tasks and the rule, and keeps the session just logged (round 58)', u.milestones[0].tasks.length === 2 && u.conventions === '- Use TypeScript' && u.sessions.length === 4 && u.milestones[0].tasks[0].status === 'done' && !(u.lessons || []).length, [u.milestones[0].tasks.length, u.conventions, u.sessions.length, u.milestones[0].tasks[0].status]);
    // closing the follow-ups without accepting still offers Undo
    check('Undo leaves the page where it was', (await pg.getAttribute('#tab-overview', 'aria-selected')) === 'true', await fa(pg));
    await pg.click('#tab-overview');
    await logIt(pg, true);
    await pg.waitForSelector('[data-act="session-accept"]');
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(150);
    check('closing the follow-ups offers Undo too', /^Session logged\./.test(await toastText(pg)) && await pg.isVisible('#toast [data-act="undo"]'), await toastText(pg));
    await undo(pg);
    check('and it works', (await doc(pg)).sessions.length === 4);
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  // M9: Mark done, Claude's milestones, a review's suggestions and Add to CLAUDE.md can be undone
  {
    const seed = proj(0, 0, { lessons: [{ id: 'l1', date: '2026-10-01', happened: 'It changed files it did not need to', change: 'Only change the files the task names' }] });
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf({ 'p-a': seed }), wait: 700 });
    await pg.click('.next [data-act="set-task"][data-s="done"]');
    await pg.waitForTimeout(150);
    check('Mark done says so and names what is next', (await toastText(pg)) === '"Do it" is done. Next up: Then this.', await toastText(pg));
    check('focus goes to the next task\'s prompt, not its start button', (await fa(pg)) === 'BUTTON#next-prompt[prompt]', await fa(pg));
    await undo(pg);
    let d = await doc(pg);
    check('Undo puts it back in progress, with no done day', d.milestones[0].tasks[0].status === 'doing' && !d.milestones[0].tasks[0].doneAt && (await pg.textContent('.next h3')).includes('Do it'));
    await pg.click('#tab-plan');
    await pg.click('[data-act="ai-plan"]');
    await pg.waitForSelector('[data-act="prop-accept"][data-kind="plan"]');
    await pg.click('[data-act="prop-accept"][data-kind="plan"]');
    await pg.waitForTimeout(150);
    check('Claude\'s milestones are added with Undo', /^Added 2 milestones\.$/.test(await toastText(pg)) && await pg.isVisible('#toast [data-act="undo"]'));
    await undo(pg);
    check('Undo takes them out and focus goes back to the Claude button', (await doc(pg)).milestones.length === 1 && /\[ai-plan\]/.test(await fa(pg)), await fa(pg));
    await pg.click('#tab-improve');
    await pg.click('[data-act="ai-review"]');
    await pg.waitForSelector('[data-act="review-add"]');
    await pg.click('[data-act="review-add"][data-i="0"]');
    await pg.waitForTimeout(1700);
    check('a review task goes in the Improvements milestone', (await doc(pg)).milestones.some((x) => x.title === 'Improvements'));
    await undo(pg);
    check('Undo takes the task and the milestone it made out, and the suggestion can be added again', !(await doc(pg)).milestones.some((x) => x.title === 'Improvements') && await pg.isVisible('[data-act="review-add"][data-i="0"]'));
    await pg.click('[data-act="review-add"][data-i="2"]');
    await pg.waitForTimeout(1700);
    check('a review rule goes in the conventions', /Only change files the task names/.test((await doc(pg)).conventions));
    await undo(pg);
    check('Undo takes it out', !/Only change files the task names/.test((await doc(pg)).conventions));
    await pg.click('[data-act="promote"][data-id="l1"]');
    await pg.waitForTimeout(1700);
    d = await doc(pg);
    check('Add to CLAUDE.md adds the rule and offers Undo', /Only change the files the task names/.test(d.conventions) && d.lessons[0].promoted && await pg.isVisible('#toast [data-act="undo"]'));
    await undo(pg);
    d = await doc(pg);
    check('Undo takes the rule out and the lesson is not in CLAUDE.md any more', !/Only change the files the task names/.test(d.conventions) && !d.lessons[0].promoted && (await fa(pg)) === 'TEXTAREA#f-lessons-l1-change', await fa(pg));
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  // H4: Update from PLAN.md refuses a change too large to save
  {
    const { pg, errs } = await open(b, VAR, { init: seedOf({ 'p-a': proj(0, 0) }), wait: 700 });
    await pg.click('#tab-claudemd');
    await pg.click('[data-act="repo-file"][data-k="plan"]');
    const md = await pg.inputValue('#repo-text');
    const extra = Array.from({ length: 2600 }, (_, i) => `- [ ] Add the pantry shelf view number ${i} with its counts and a filter for what is low (M)`).join('\n');
    const big = md.replace('<!-- id:t2 -->', '<!-- id:t2 -->\n' + extra);
    await pg.click('#tab-plan');
    await pg.click('[data-act="open-plansync"]');
    await pg.evaluate((t) => { const el = document.querySelector('#ps-text'); el.focus(); el.value = t; el.dispatchEvent(new Event('input', { bubbles: true })); }, big); // one paste
    await pg.waitForTimeout(300);
    check('the paste reads as many new tasks', /2600 tasks added|2,600|added/.test(await pg.textContent('#ps-note')) && !(await pg.isDisabled('[data-act="apply-plansync"]')), await pg.textContent('#ps-note'));
    await pg.click('[data-act="apply-plansync"]');
    await pg.waitForTimeout(300);
    const note = norm(await pg.textContent('#ps-note'));
    check('applying it is refused with the reason, and the dialog stays', /^This adds too much to save: the project would take \d+ KB, and one project can hold 250 KB\./.test(note) && await pg.isVisible('#ps-text') && await pg.isDisabled('[data-act="apply-plansync"]') && (await fa(pg)) === 'TEXTAREA#ps-text', [note, await fa(pg)]);
    check('nothing changed', (await pg.evaluate(() => __T.allTasks(__T.active()).length)) === 2);
    await pg.fill('#ps-text', md.replace('- [ ] Then this (S) <!-- id:t2 -->', '- [x] Then this (S, done 2026-10-12) <!-- id:t2 -->'));
    await pg.waitForTimeout(300);
    check('a normal paste works again', /1 task marked done/.test(await pg.textContent('#ps-note')) && !(await pg.isDisabled('[data-act="apply-plansync"]')) && !(await pg.$('#ps-note.field-error')));
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  // H5 in the browser: a tick's day in New Zealand
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Pacific/Auckland' });
    const { pg, errs } = await open(b, 'mocked.html', { ctx, init: seedOf({ 'p-a': proj(0, 0) }), wait: 700 });
    await pg.click('#tab-claudemd');
    await pg.click('[data-act="repo-file"][data-k="plan"]');
    const md = await pg.inputValue('#repo-text');
    await pg.click('#tab-plan');
    await pg.click('[data-act="open-plansync"]');
    await pg.fill('#ps-text', md.replace('- [ ] Then this (S) <!-- id:t2 -->', '- [x] Then this (S, done 2026-10-12) <!-- id:t2 -->'));
    await pg.waitForTimeout(300);
    await pg.click('[data-act="apply-plansync"]');
    await pg.waitForTimeout(1700);
    check('Auckland: the task keeps the day on its tick', (await doc(pg)).milestones[0].tasks[1].doneAt === '2026-10-12', (await doc(pg)).milestones[0].tasks[1]);
    check('no page errors', errs.length === 0, errs);
    await ctx.close();
  }
  // 9a H2: a project that cannot be saved says so on the project, also on a phone
  for (const w of [1280, 375]) {
    const big = proj(0, 0, { name: 'Big Notes', claudeMd: '# Notes\n' + 'x'.repeat(260000), claudeMdEdited: true });
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf({ 'p-a': big }), wait: 900, viewport: { width: w, height: 800 } });
    check(`${w}px: no banner before anything is saved`, !(await pg.$('#save-banner .save-banner')) && (await pg.getAttribute('#save-banner', 'role')) === 'alert');
    await pg.fill('#f-pitch', 'Plan meals from what is in the pantry.');
    await pg.waitForTimeout(1700);
    const t = norm(await pg.textContent('#save-banner'));
    check(`${w}px: the banner says the project is not saved, and why`, /^Not saved\. "Big Notes" is too large to save, so its latest changes are only on this page\./.test(t) && await pg.isVisible('#save-banner .save-banner'), t);
    const r = await pg.evaluate(() => { const e = document.querySelector('#save-banner').getBoundingClientRect(); return { l: e.left, r: e.right, w: innerWidth, sw: document.documentElement.scrollWidth }; });
    check(`${w}px: it fits`, r.l >= 0 && r.r <= r.w && r.sw <= r.w, r);
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    // a browser that refuses to store anything
    const local = { 'p-l': { ...proj(0, 0), name: 'Local Plan', updatedAt: '2026-10-01T10:00:00Z' } };
    const init = `localStorage.setItem('shipyard.projects.v1', ${JSON.stringify(JSON.stringify(local))}); const _set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === 'shipyard.projects.v1') throw new DOMException('full', 'QuotaExceededError'); return _set.call(this, k, v); };`;
    const { pg, errs } = await open(b, 'plain.html', { init, wait: 700, viewport: { width: 640, height: 700 } });
    await pg.fill('#f-pitch', 'Plan meals.');
    await pg.waitForTimeout(800);
    check('plain mode: the banner says this browser is not saving', /^Not saved\. Shipyard cannot save in this browser\. Before you close this tab, use Back up all projects/.test(norm(await pg.textContent('#save-banner'))), await pg.textContent('#save-banner'));
    check('no page errors', errs.filter((e) => !/QuotaExceeded|full/.test(e)).length === 0, errs);
    await pg.context().close();
  }
  // 9a M4: the More menu
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: seedOf({ 'p-a': proj(0, 0) }), wait: 700 });
    await pg.click('#more-btn');
    await pg.focus('[data-act="ask-delete"]');
    await pg.keyboard.press('Tab');
    check('tabbing out of the menu closes it', !(await pg.isVisible('#more-list')) && (await pg.getAttribute('#more-btn', 'aria-expanded')) === 'false');
    await pg.click('#more-btn');
    await pg.focus('[data-act="ask-delete"]');
    await pg.keyboard.press('Enter');
    await pg.waitForTimeout(100);
    check('Delete moves focus to the question\'s Keep it', (await fa(pg)) === 'BUTTON[cancel-confirm]', await fa(pg));
    await pg.keyboard.press('Escape');
    check('Escape goes back to More', (await fa(pg)) === 'BUTTON#more-btn[toggle-more]', await fa(pg));
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  await b.close();
})();
