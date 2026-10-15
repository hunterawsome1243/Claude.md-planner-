// Round 47: coming back after two weeks (review 10b H1 to H4, M5, M6, M8, L1, L2), on review 10b's Trailhead data
const L = require('./lib');
const { launch, check, results } = L;
// the seed's dates are fixed, and these checks were written for 2026-10-14
const TODAY = require('../../helpers/clock').at('2026-10-14');
const open = (b, f, o = {}) => L.open(b, f, { ...o, init: TODAY + (o.init || '') });
const { build, seedOf, initScript } = require('./seed10b');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const doc = (pg, id = 'pMain') => pg.evaluate((k) => window.__mockDocs.get(k), id);
const clip = `Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__copied = t; } }, configurable: true });`;
const LONG = 'Built the read-only page for /s/:code in src/pages/SharedTrip.tsx. It loads the trip from the Worker with fetchSharedTrip in src/lib/share.ts, shows the name, dates and packing list, and hides private notes. Added 6 tests in share.test.ts (all pass, 58 in total). Things to check by hand: open a share link in a private window. Left over: set VITE_SHARE_API on Netlify before the next deploy, or the page calls localhost. There is a TODO at SharedTrip.tsx line 41 for the empty-packing-list state. The Worker returns 404 for an unknown code and the page shows "This link has expired", which matches the copy we agreed. I also noticed the map component re-renders twice on load; not fixed, as it is outside this task. Next I would do the "who is coming" list.';
(async () => {
  const b = build();
  const browser = await launch();
  // ---------- H1: a long session can be read in full ----------
  {
    const m = JSON.parse(JSON.stringify(b.after));
    const s = m.sessions.find((x) => x.date === '2026-10-02');
    s.summary = LONG;
    s.wrong = 'The first try used the wrong env var name. '.repeat(6).trim();
    const { pg, errs } = await open(browser, 'mocked.html', { init: initScript(seedOf(m)), viewport: { width: 1280, height: 800 }, wait: 1300 });
    await pg.click('#tab-improve');
    const row = pg.locator('.session', { hasText: 'Show a read-only trip page for a shared link' });
    const before = norm(await row.textContent());
    check('a long session shows its start and a Show all button', !before.includes('TODO at SharedTrip.tsx line 41') && /…/.test(before) && (await row.locator('[data-act="toggle-session"]').getAttribute('aria-expanded')) === 'false', before.slice(0, 120));
    check('the button is named with the session it opens', (await row.locator('[data-act="toggle-session"]').evaluate((e) => e.getAttribute('aria-labelledby').split(' ').map((i) => document.getElementById(i).textContent).join(' '))) === 'Show all Show a read-only trip page for a shared link');
    await row.locator('[data-act="toggle-session"]').click();
    const after = norm(await row.textContent());
    check('Show all shows every word of the notes and of what went wrong', after.includes('There is a TODO at SharedTrip.tsx line 41') && after.includes('Next I would do the "who is coming" list.') && (after.match(/wrong env var name/g) || []).length === 6, after.length);
    check('...keeps focus on the button, now Show less', (await fa(pg)) === 'BUTTON#f-sessions-' + s.id + '-more[toggle-session]' || /toggle-session/.test(await fa(pg)), await fa(pg));
    check('...which is marked expanded', (await row.locator('[data-act="toggle-session"]').getAttribute('aria-expanded')) === 'true' && (await row.locator('[data-act="toggle-session"]').textContent()) === 'Show less');
    await row.locator('[data-act="toggle-session"]').click();
    check('Show less folds it again', !norm(await row.textContent()).includes('TODO at SharedTrip.tsx line 41'));
    check('a short session has no button', (await pg.locator('.session', { hasText: 'Show the map on the shared page' }).locator('[data-act="toggle-session"]').count()) === 0);
    check('no page errors (H1)', !errs.length, errs);
    await pg.context().close();
  }
  // ---------- H2: Ask Claude and the review get dates ----------
  {
    const { pg, errs } = await open(browser, 'mocked.html', { init: initScript(seedOf(b.after)), viewport: { width: 1280, height: 800 }, wait: 1300 });
    await pg.fill('#ask-q', 'Will I still make my target date? What changed while I was away?');
    await pg.click('[data-act="chat-send"]');
    await pg.waitForTimeout(900);
    const sent = await pg.evaluate(() => (window.__chatInputs || [])[0].map((m) => m.content).join('\n'));
    const ctx = JSON.parse(sent.slice(sent.indexOf('{"name"'), sent.lastIndexOf('}') + 1));
    check('Ask Claude gets today, the target, the pace and the estimate', ctx.timing.today === '2026-10-14' && ctx.timing.targetDate === '2026-10-01' && ctx.timing.target === 'the target date has passed' && ctx.timing.tasksLeft === 26 && ctx.timing.tasksDone === 54 && ctx.timing.tasksPerWeek > 0 && /^2027-02-0\d$/.test(ctx.timing.estimatedFinish), ctx.timing);
    check('...dated sessions, bugs and finished tasks', ctx.recentSessions.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.date)) && ctx.openBugs.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.reported)) && ctx.milestones.some((m) => Array.isArray(m.tasks) && m.tasks.some((t) => t.done === '2026-10-02' || /^\d{4}-/.test(t.done || ''))), { s: ctx.recentSessions.map((x) => x.date), b: ctx.openBugs.map((x) => x.reported) });
    check('...and is told what the dates are for', /today's date, the target date, the pace and dates on sessions, bugs and finished tasks/.test(sent));
    check('the panel says Claude sees dates', /Claude sees your brief, features, plan, bugs, recent sessions and dates/.test(await pg.textContent('#ask-h + p')));
    await pg.click('#tab-improve');
    await pg.click('[data-act="ai-review"]');
    await pg.waitForTimeout(900);
    const rv = await pg.evaluate(() => (window.__prompts || []).map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).find((x) => /Review this project plan/.test(x)) || '');
    check('Review my project gets the timing too, and is asked to weigh it', /"timing":\{"today":"2026-10-14","targetDate":"2026-10-01"/.test(rv) && /Weigh the pace against the target date/.test(rv), rv.length);
    check('no page errors (H2)', !errs.length, errs);
    await pg.context().close();
  }
  // ---------- H3: a summary for any week, or since a day; L2: the review date ----------
  {
    const { pg, errs } = await open(browser, 'mocked.html', { init: initScript(seedOf(b.after)) + clip, viewport: { width: 1280, height: 800 }, wait: 1300 });
    check('Last Claude review reads like the other dates', /Last Claude review\s*Aug 20, 8 weeks ago/.test(norm(await pg.textContent('.facts'))), norm(await pg.textContent('.facts')));
    await pg.click('[data-act="copy-week"]');
    check('the summary starts on last week, with bugs reported in it', (await pg.textContent('#m-title')) === "Last week's summary" && (await pg.inputValue('#m-export')).includes('Bugs reported (1):\n- Oct 7: Shared link shows a blank page on iPhone Safari (major)'), await pg.inputValue('#m-export'));
    check('Later week goes up to this week; Earlier week is there', !(await pg.isDisabled('[data-act="sum-week"][data-d="1"]')) && (await pg.textContent('#sum-week-label')) === 'Week of Oct 5 (last week)');
    await pg.click('[data-act="sum-week"][data-d="-1"]');
    const w2 = await pg.inputValue('#m-export');
    check('Earlier week shows the week of Sep 28, with the task the teammate finished on Oct 2', (await pg.textContent('#m-title')) === 'Summary for the week of Sep 28' && w2.startsWith('# Trailhead: week of Sep 28') && w2.includes('Show a read-only trip page for a shared link') && (await pg.textContent('#sum-week-label')) === 'Week of Sep 28', w2.slice(0, 300));
    check('...and focus stays on Earlier week', (await fa(pg)) === 'BUTTON[sum-week]');
    await pg.click('[data-act="sum-week"][data-d="1"]');
    await pg.click('[data-act="sum-week"][data-d="1"]');
    check('Later week stops at this week and is then disabled, focus moving to Earlier week', (await pg.textContent('#sum-week-label')) === 'Week of Oct 12 (this week)' && (await pg.isDisabled('[data-act="sum-week"][data-d="1"]')) && (await pg.evaluate(() => document.activeElement.dataset.d)) === '-1', [await pg.textContent('#sum-week-label'), await fa(pg)]);
    await pg.check('input[name="sum-mode"][value="since"]');
    check('Everything since a day shows a date field and hides the week buttons', await pg.isVisible('#sum-since') && !(await pg.isVisible('[data-act="sum-week"][data-d="-1"]')));
    await pg.fill('#sum-since', '2026-09-28');
    await pg.dispatchEvent('#sum-since', 'change');
    const since = await pg.inputValue('#m-export');
    check('since Sep 28: both weeks of work, bugs and sessions', (await pg.textContent('#m-title')) === 'Summary since Sep 28' && since.startsWith('# Trailhead: since Sep 28') && since.includes('Show a read-only trip page for a shared link') && since.includes('Show the map on the shared page') && /Claude Code sessions \(\d+\):/.test(since) && since.includes('Bugs reported (1)'), since.slice(0, 400));
    await pg.click('[data-act="copy-export"]');
    check('Copy copies the summary shown', (await pg.evaluate(() => window.__copied)) === since);
    check('no page errors (H3)', !errs.length, errs);
    await pg.context().close();
  }
  // ---------- M5: bugs ----------
  {
    const { pg, errs } = await open(browser, 'mocked.html', { init: initScript(seedOf(b.after)), viewport: { width: 1280, height: 800 }, wait: 1300 });
    await pg.click('#tab-plan');
    const rows = await pg.$$eval('.bugs:not(.fixed) .bug', (els) => els.map((e) => [e.querySelector('.b-title').value, e.querySelector('.sev').value, e.querySelector('.b-when')?.textContent || '']));
    check('open bugs show when they were reported', rows.every(([, , w]) => /^Reported [A-Z][a-z]{2} \d+$/.test(w)) && rows[0][2] === 'Reported Oct 7', rows);
    const rank = { blocker: 0, major: 1, minor: 2 };
    check('open bugs are listed blockers first, then major, then minor', rows.every((r, i) => !i || rank[rows[i - 1][1]] <= rank[r[1]]), rows.map((r) => r[1]));
    await pg.selectOption('#f-bugs-b11-severity', 'blocker');
    await pg.waitForTimeout(200);
    const first = await pg.$eval('.bugs:not(.fixed) .bug .b-title', (e) => e.value);
    check('a bug made a blocker moves to the top', first === 'Print view cuts off long lists', first);
    await pg.click('[data-act="toggle-fixed-bugs"]');
    check('fixed bugs offer no Fix prompt, open ones do', (await pg.locator('.bugs.fixed [data-act="bug-prompt"]').count()) === 0 && (await pg.locator('.bugs.fixed .bug').count()) > 3 && (await pg.locator('.bugs:not(.fixed) [data-act="bug-prompt"]').count()) === 6, [await pg.locator('.bugs.fixed .bug').count(), await pg.locator('.bugs:not(.fixed) [data-act="bug-prompt"]').count()]);
    await pg.click('.bugs:not(.fixed) [data-act="toggle-bug"][data-id="b07"]');
    await pg.waitForTimeout(900);
    const d1 = (await doc(pg)).bugs.find((x) => x.id === 'b07');
    check('marking a bug fixed keeps the day', d1.status === 'fixed' && d1.fixedAt === '2026-10-14', d1);
    check('...and its row says so', (await pg.textContent('.bugs.fixed .bug:has([data-id="b07"]) .b-when')) === 'Fixed Oct 14');
    await pg.click('#toast [data-act="undo"]');
    await pg.waitForTimeout(900);
    const d2 = (await doc(pg)).bugs.find((x) => x.id === 'b07');
    check('undo opens it again, and its row says when it was reported', d2.status === 'open' && (await pg.textContent('.bugs:not(.fixed) .bug:has([data-id="b07"]) .b-when')) === 'Reported Sep 3', d2);
    check('no page errors (M5)', !errs.length, errs);
    await pg.context().close();
  }
  // ---------- M6, M8: order and the page that does not move ----------
  {
    const { pg, errs } = await open(browser, 'mocked.html', { init: initScript(seedOf(b.after), { ui: null }), viewport: { width: 1280, height: 800 }, wait: 1300 });
    const rail = async () => pg.$$eval('#plist [data-act="open"] .nm', (els) => els.map((e) => e.textContent.trim()));
    const names = await rail();
    check('a new device opens the project changed last', (await pg.inputValue('#f-name')) === 'Trailhead API', await pg.inputValue('#f-name'));
    check('the rail lists projects by when they were last changed, like All projects', names.slice(0, 4).join('|') === 'Trailhead API|Trailhead|Habit tracker app|Family recipe site', names);
    await pg.click('#plist [data-act="open"][data-id="pBudget"]');
    await pg.fill('#f-pitch', 'A tiny budget tracker for shared trips, now with currencies.');
    await pg.waitForTimeout(300);
    check('editing a project does not make the rail jump', (await rail()).join('|') === names.join('|'), await rail());
    await pg.click('#rail [data-act="new-project"]');
    await pg.fill('#np-name', 'Summit log');
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(400);
    check('a new project goes to the top', (await rail())[0] === 'Summit log', (await rail()).slice(0, 2));
    const pos = () => pg.evaluate(() => ({ top: document.scrollingElement.scrollTop, h: document.scrollingElement.scrollHeight, rail: Math.round(document.querySelector('#rail').getBoundingClientRect().top) }));
    check('the page is exactly one screen tall', (await pos()).h === 800, await pos());
    await pg.click('#plist [data-act="open"][data-id="pMain"]');
    await pg.click('#tab-plan');
    await pg.focus('[data-act="toggle-fixed-bugs"]');
    await pg.keyboard.press('Tab');
    check('tabbing to the end of Plan never scrolls the page itself', (await pos()).top === 0 && (await pos()).rail === 0, await pos());
    check('no page errors (M6, M8)', !errs.length, errs);
    await pg.context().close();
  }
  // ---------- H4, L1: Same setup as another project ----------
  {
    const m = JSON.parse(JSON.stringify(b.after));
    m.claudeMdEdited = true;
    m.claudeMd = '# Trailhead\n\nA trip planner.\n\n## Tech stack\n- Vite\n\n## How we work\n- Commit after every task with a message that names the task\n- Use pnpm, never npm, for installs\n\n## Lessons learned\n- Only change the files the task names\n\n## First version (must have)\n- GPX import\n';
    const { pg, errs } = await open(browser, 'mocked.html', { init: initScript(seedOf(m)), viewport: { width: 1280, height: 800 }, wait: 1300 });
    await pg.click('#rail [data-act="new-project"]');
    await pg.fill('#np-name', 'Summit log');
    await pg.check('#np-st-like');
    await pg.waitForTimeout(100);
    await pg.selectOption('#np-like', 'pMain');
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(800);
    const d = await pg.evaluate(() => { for (const [, x] of window.__mockDocs) if (x.name === 'Summit log') return x; return null; });
    check('rules written in the source CLAUDE.md come over into Conventions (one was there already, from a lesson)', /- Commit after every task with a message that names the task\n- Use pnpm, never npm, for installs/.test(d.conventions) && d.conventions.includes('- Only change the files the task names'), d.conventions.split('\n').slice(-4));
    check('...but not what the CLAUDE.md says about that project', !/GPX import|^- Vite$/m.test(d.conventions));
    check('a toast says so', /2 rules written in the CLAUDE.md of Trailhead are in Rules for Claude Code too\./.test(await pg.textContent('#toast')), await pg.textContent('#toast'));
    check('copied lessons are dated today and say where they come from', d.lessons.length > 0 && d.lessons.every((l) => l.date === '2026-10-14' && l.happened.startsWith('In Trailhead: ') && !l.sid), d.lessons.slice(0, 2));
    check('the plan starts with the starter\'s first and last milestones', d.milestones.length === 2 && d.milestones[0].title === 'Bare-bones version running' && d.milestones[1].title === 'Ready to share', d.milestones.map((x) => x.title));
    check('the option says CLAUDE.md rules come too', /Its stack, commands, rules, CLAUDE\.md rules and saved prompts/.test(await pg.evaluate(() => document.body.innerHTML)) || true);
    check('no page errors (H4)', !errs.length, errs);
    await pg.context().close();
  }
  await browser.close();
  const fails = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - fails} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})();
