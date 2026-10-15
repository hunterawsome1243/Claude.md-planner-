// Round 48: coming back, part 2 (review 10b M1 what came in from elsewhere, M2 tasks in progress for weeks, M3 the last
// session and the last copied prompt, L3 the phone header), on review 10b's Trailhead data
const L = require('./lib');
const { launch, check, results } = L;
// the seed's dates are fixed, and these checks were written for 2026-10-14
const TODAY = require('../../helpers/clock').at('2026-10-14');
const open = (b, f, o = {}) => L.open(b, f, { ...o, init: TODAY + (o.init || '') });
const { build, seedOf, initScript } = require('../r47/seed10b');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const doc = (pg, id = 'pMain') => pg.evaluate((k) => window.__mockDocs.get(k), id);
const task = (d, id) => d.milestones.flatMap((m) => m.tasks).find((t) => t.id === id);
const clip = `Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__copied = t; } }, configurable: true });`;
const away = (pg) => pg.evaluate(() => JSON.parse(localStorage.getItem('shipyard.away.v1') || 'null'));
const live = (pg) => pg.evaluate(() => document.querySelector('#sr-live')?.textContent || '');
const railMeta = (pg, id = 'pMain') => pg.evaluate((k) => document.querySelector(`#plist [data-act="open"][data-id="${k}"] .meta`)?.textContent.replace(/\s+/g, ' ').trim(), id);
(async () => {
  const b = build();
  const browser = await launch();

  // ---------- M1 (1): the page is open when a change comes in from another device ----------
  {
    const { pg, errs } = await open(browser, 'mocked.html', { init: initScript(seedOf(b.before)), viewport: { width: 1280, height: 800 }, wait: 1300 });
    check('nothing is new on a first visit in this browser', (await pg.locator('.away').count()) === 0 && !/new/.test(await railMeta(pg)), await railMeta(pg));
    const rec = await away(pg);
    check('...but this browser now remembers what it has seen of each project', rec && Array.isArray(rec.pMain?.seen) && rec.pMain.seen.includes('d:t5-04') && !rec.pMain.seen.includes('s:x901') && rec.pMain.unseen.length === 0 && Object.keys(rec).length >= 9, rec && Object.keys(rec));
    await pg.evaluate((d) => window.__mockEmitExternal('pMain', d), b.after);
    await pg.waitForTimeout(400);
    const panel = norm(await pg.locator('.away').textContent().catch(() => ''));
    check('Overview lists what came in, above Next up', /New since you last looked/.test(panel) && (await pg.evaluate(() => { const a = document.querySelector('.away'); const n = document.querySelector('.panel.next'); return !!a && !!n && (a.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING) > 0; })), panel);
    const m5 = b.after.milestones.find((m) => m.id === 'm5').tasks;
    check('...the three tasks done, by name', panel.includes(`Done (3): ${m5[2].title}; ${m5[5].title}; ${m5[8].title}`), panel);
    check('...the two sessions, newest first, with how they went', panel.includes(`Sessions logged (2): ${m5[8].title} (done); ${m5[2].title} (done)`), panel);
    check('...and the bug reported', panel.includes('Bugs reported (1): Shared link shows a blank page on iPhone Safari'), panel);
    check('...and nothing it did not see come in', !/Tasks added|Bugs fixed/.test(panel));
    check('a screen reader hears it once', /^From elsewhere: 3 tasks done, 2 sessions logged, 1 bug reported\. Overview lists them under New since you last looked\.$/.test(await live(pg)), await live(pg));
    check('the project list counts it', / · 6 new$/.test(await railMeta(pg)), await railMeta(pg));
    await pg.click('#tab-improve');
    const tagged = await pg.evaluate(() => [...document.querySelectorAll('.session')].filter((x) => x.querySelector('.new-tag')).map((x) => x.querySelector('.s-body b').textContent));
    check('Improve tags the two new sessions', tagged.length === 2 && tagged[0] === m5[8].title, tagged);
    await pg.click('#tab-plan');
    const btag = await pg.evaluate(() => [...document.querySelectorAll('.bug')].filter((x) => x.querySelector('.new-tag')).map((x) => x.querySelector('.b-title').value));
    check('Plan tags the new bug', JSON.stringify(btag) === JSON.stringify(['Shared link shows a blank page on iPhone Safari']), btag);
    // an edit made here is not news
    await pg.click('#tab-overview');
    await pg.click('[data-act="set-task"][data-s="done"]');
    await pg.waitForTimeout(200);
    check('a task marked done here is not listed', !/Print a packing list/.test(norm(await pg.locator('.away').textContent())) && / · 6 new$/.test(await railMeta(pg)), await railMeta(pg));
    await pg.click('.away [data-act="away-ok"]');
    await pg.waitForTimeout(150);
    check('Got it clears it, and focus moves to Next up', (await pg.locator('.away').count()) === 0 && (await fa(pg)) === 'BUTTON#next-prompt[prompt]', await fa(pg));
    check('...and the project list', !/new/.test(await railMeta(pg)), await railMeta(pg));
    await pg.click('#tab-improve');
    check('...and the tags', (await pg.locator('.new-tag').count()) === 0);
    await pg.click('#tab-overview');
    // a second change: only what is new since (once this page's own save is in)
    await pg.waitForTimeout(1200);
    const later = JSON.parse(JSON.stringify((await doc(pg))));
    later.bugs.find((x) => x.id === 'b15').status = 'fixed';
    later.milestones.find((m) => m.id === 'm6').tasks.push({ id: 't6-99', title: 'Write the launch post', notes: '', size: 'S', status: 'todo', feat: '', splitFrom: '', doneAt: '' });
    await pg.evaluate((d) => window.__mockEmitExternal('pMain', d), later);
    await pg.waitForTimeout(400);
    const p2 = norm(await pg.locator('.away').textContent().catch(() => ''));
    check('a later change lists only itself: a bug fixed and a task added', /Bugs fixed \(1\): Shared link shows a blank page on iPhone Safari/.test(p2) && /Tasks added \(1\): Write the launch post/.test(p2) && !/Done \(|Sessions logged/.test(p2), { p2, un: (await away(pg)).pMain.unseen, has: await pg.evaluate(() => document.querySelectorAll('.t-title').length) });
    check('no page errors (M1 open)', !errs.length, errs);
    await pg.context().close();
  }

  // ---------- M1 (2): a fresh visit; this browser kept the copy from before the trip ----------
  {
    const init = initScript(seedOf(b.after)) + `\ntry { if (!sessionStorage.getItem('__mirror')) { sessionStorage.setItem('__mirror', '1'); localStorage.setItem('shipyard.projects.v1', ${JSON.stringify(JSON.stringify(seedOf(b.before)))}); } } catch (e) {}`;
    const { pg, errs } = await open(browser, 'mocked.html', { init, viewport: { width: 1280, height: 800 }, wait: 1500 });
    const panel = norm(await pg.locator('.away').textContent().catch(() => ''));
    check('on opening, Overview lists what changed since this browser last showed it', /Done \(3\)/.test(panel) && /Sessions logged \(2\)/.test(panel) && /Bugs reported \(1\)/.test(panel), panel);
    check('...without a screen reader announcement on load', !/From elsewhere/.test(await live(pg)));
    check('the other projects, unchanged, have nothing new', await pg.evaluate(() => [...document.querySelectorAll('#plist [data-act="open"] .meta')].filter((x) => / new$/.test(x.textContent)).length) === 1);
    await pg.reload();
    await pg.waitForTimeout(1500);
    check('it stays until Got it, after a reload too', (await pg.locator('.away').count()) === 1);
    await pg.click('.away [data-act="away-ok"]');
    await pg.reload();
    await pg.waitForTimeout(1500);
    check('after Got it, a reload shows nothing new', (await pg.locator('.away').count()) === 0);
    check('no page errors (M1 visit)', !errs.length, errs);
    await pg.context().close();
  }

  // ---------- M1 (3): everything done here is not news, after a reload too ----------
  {
    const { pg, errs } = await open(browser, 'mocked.html', { init: initScript(seedOf(b.after)), viewport: { width: 1280, height: 800 }, wait: 1300 });
    await pg.click('#tab-plan');
    await pg.click('[data-act="add-bug"]');
    await pg.keyboard.type('Elevation chart overflows on small screens');
    await pg.click('[data-act="add-task"] >> nth=0');
    await pg.keyboard.type('Check the first-run screen');
    await pg.click('#tab-overview');
    await pg.click('[data-act="log-session"] >> nth=0');
    await pg.waitForTimeout(150);
    await pg.click('#modal-root [data-act="save-session"]');
    await pg.waitForTimeout(1200);
    check('bugs, tasks and sessions added here are not news', (await pg.locator('.away').count()) === 0 && !/new/.test(await railMeta(pg)), await railMeta(pg));
    // the store holds what was saved; a reload loads it from there
    const saved = await doc(pg);
    check('(the edits were saved)', saved.bugs.some((x) => x.title === 'Elevation chart overflows on small screens') && saved.sessions.length === b.after.sessions.length + 1, saved.sessions.length);
    await pg.addInitScript((d) => { window.__SEED__ = { ...window.__SEED__, pMain: d }; }, saved);
    await pg.reload();
    await pg.waitForTimeout(1500);
    check('...after a reload either', (await pg.locator('.away').count()) === 0 && !/new/.test(await railMeta(pg)), await railMeta(pg));
    check('no page errors (M1 here)', !errs.length, errs);
    await pg.context().close();
  }

  // ---------- M2: a task in progress for weeks ----------
  {
    const { pg, errs } = await open(browser, 'mocked.html', { init: initScript(seedOf(b.after)) + clip, viewport: { width: 1280, height: 800 }, wait: 1300 });
    const from = norm(await pg.textContent('.next .from'));
    check('Next up says how long it has been in progress, from its first session', /· In progress for \d+ (weeks|months), since Sep 8$/.test(from), from);
    check('...and offers Back to To do', await pg.isVisible('.next [data-act="set-task"][data-s="todo"]'));
    await pg.click('.next [data-act="set-task"][data-s="todo"]');
    await pg.waitForTimeout(900);
    let t = task(await doc(pg), 't4-14');
    check('Back to To do puts it back, with an Undo', t.status === 'todo' && !t.startedAt && /"Print a packing list" is back in To do\./.test(await pg.textContent('#toast')), { s: t.status, toast: await pg.textContent('#toast') });
    check('...and focus lands on the next step there', /set-task|prompt/.test(await fa(pg)), await fa(pg));
    await pg.click('#toast [data-act="undo"]');
    await pg.waitForTimeout(900);
    t = task(await doc(pg), 't4-14');
    check('Undo makes it in progress again', t.status === 'doing' && !t.startedAt, t);
    // Mark as started: today
    await pg.click('.next [data-act="set-task"][data-s="todo"]');
    await pg.waitForTimeout(100);
    check('a task back in To do shows Mark as started', await pg.isVisible('.next [data-act="set-task"][data-s="doing"]'));
    // the next up is now another task in progress (the share button, Sept 29)
    const nextT = await pg.getAttribute('#next-prompt', 'data-tid');
    if (await pg.isVisible('.next [data-act="set-task"][data-s="doing"]')) {
      await pg.click('.next [data-act="set-task"][data-s="doing"]');
      await pg.waitForTimeout(900);
      const tt = task(await doc(pg), nextT);
      check('Mark as started dates it today', tt.status === 'doing' && tt.startedAt === '2026-10-14', tt);
      check('...and a task started today says just In progress', /· In progress$/.test(norm(await pg.textContent('.next .from'))), norm(await pg.textContent('.next .from')));
    }
    // Plan: the age and Back to To do in the notes
    await pg.click('#tab-plan');
    const ages = await pg.evaluate(() => [...document.querySelectorAll('.task')].filter((x) => x.querySelector('.t-age')).map((x) => [x.querySelector('.t-title').value, x.querySelector('.t-age').textContent]));
    check('Plan shows the age of tasks in progress for a week or more', ages.length >= 2 && ages.every(([, a]) => /^since [A-Z][a-z]{2} \d+$/.test(a)) && ages.some(([n, a]) => n === 'Share link with expiry' || /since Sep/.test(a)), ages);
    const doingId = await pg.evaluate(() => { const r = [...document.querySelectorAll('.task[data-s="doing"]')].find((x) => x.querySelector('.t-age')); return r.querySelector('.t-title').dataset.tid; });
    const mid = await pg.evaluate((k) => document.querySelector(`.t-title[data-tid="${k}"]`).dataset.mid, doingId);
    await pg.click(`[data-act="toggle-notes"][data-tid="${doingId}"]`);
    const back = pg.locator(`#f-milestones-${mid}-tasks-${doingId}-back`);
    check('its notes offer Back to To do, named with the task', await back.isVisible() && (await back.evaluate((e) => e.getAttribute('aria-labelledby').split(' ').map((i) => document.getElementById(i).textContent || document.getElementById(i).value).join(' '))).startsWith('Back to To do '));
    await back.click();
    await pg.waitForTimeout(900);
    check('...which keeps focus on the task, at its status', (await fa(pg)) === `BUTTON#f-milestones-${mid}-tasks-${doingId}-st[cycle-task]`, await fa(pg));
    t = task(await doc(pg), doingId);
    check('...and moves it to To do', t.status === 'todo');
    // the status chip: in progress dates it, done clears it
    await pg.click(`#f-milestones-${mid}-tasks-${doingId}-st`);
    await pg.waitForTimeout(900);
    t = task(await doc(pg), doingId);
    check('the status button dates a task it starts', t.status === 'doing' && t.startedAt === '2026-10-14', t);
    await pg.click(`#f-milestones-${mid}-tasks-${doingId}-st`);
    await pg.waitForTimeout(900);
    t = task(await doc(pg), doingId);
    check('...and a done task keeps no start date', t.status === 'done' && !t.startedAt, t);
    // Copy prompt starts a task today
    const todoId = await pg.evaluate(() => document.querySelector('.task[data-s="todo"] .t-title').dataset.tid);
    const todoMid = await pg.evaluate((k) => document.querySelector(`.t-title[data-tid="${k}"]`).dataset.mid, todoId);
    await pg.click(`#f-milestones-${todoMid}-tasks-${todoId}-prompt`);
    await pg.click('#modal-root [data-act="copy-prompt"]');
    await pg.waitForTimeout(900);
    t = task(await doc(pg), todoId);
    check('copying a task prompt starts it today', t.status === 'doing' && t.startedAt === '2026-10-14', t);
    await pg.keyboard.press('Escape');
    // the plan check
    await pg.click('#tab-improve');
    const fix = await pg.evaluate(() => document.body.innerText);
    check('the focus check says how to pause a task', /Back to To do is on Next up, and in a task's notes on the Plan tab/.test(fix));
    check('no page errors (M2)', !errs.length, errs);
    await pg.context().close();
  }

  // ---------- M2: All projects and Ask Claude ----------
  {
    const { pg, errs } = await open(browser, 'mocked.html', { init: initScript(seedOf(b.after), { ui: { activeId: 'pMain', tab: 'overview', repoFile: 'claudemd', view: 'all' } }), viewport: { width: 1280, height: 800 }, wait: 1300 });
    const card = norm(await pg.locator('.dcard', { hasText: 'Photo sorter script' }).textContent());
    check('All projects says since when a stale next task is in progress', /in progress since Sep 18/.test(card), card);
    await pg.click('.dc-open[data-id="pMain"]');
    await pg.fill('#ask-q', 'What is stuck?');
    await pg.click('[data-act="chat-send"]');
    await pg.waitForTimeout(900);
    const sent = await pg.evaluate(() => (window.__chatInputs || [])[0].map((m) => m.content).join('\n'));
    check('Ask Claude is told when tasks in progress started', /"title":"Print a packing list","size":"M","status":"doing","started":"2026-09-08"/.test(sent), (sent.match(/"Print a packing list"[^}]*/) || [''])[0]);
    check('no page errors (M2 all)', !errs.length, errs);
    await pg.context().close();
  }

  // ---------- M3: the last session on Overview; the last copied prompt after a reload ----------
  {
    const { pg, errs } = await open(browser, 'mocked.html', { init: initScript(seedOf(b.after)) + clip, viewport: { width: 1280, height: 800 }, wait: 1300 });
    const facts = norm(await pg.textContent('.facts'));
    check('Overview shows the last session', /Last session\s*6 days ago · done/.test(facts), facts);
    await pg.click('.facts [data-act="show-sessions"]');
    await pg.waitForTimeout(150);
    check('...which opens Improve at Sessions', (await pg.getAttribute('#tab-improve', 'aria-selected')) === 'true' && (await fa(pg)) === 'H2#sessions-h', await fa(pg));
    await pg.click('#tab-plan');
    const id = 'f-milestones-m6-tasks-t6-03';
    await pg.click(`#${id}-prompt`);
    await pg.click('#modal-root [data-act="copy-prompt"]');
    await pg.waitForTimeout(300);
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(900);
    await pg.reload();
    await pg.waitForTimeout(1500);
    await pg.click('#tab-improve');
    await pg.click('.panel-head [data-act="log-session"]');
    await pg.waitForTimeout(200);
    const picked = await pg.evaluate(() => { const s = document.querySelector('#ss-task'); return s ? s.value : null; });
    check('after a reload, Log a session still starts on the task whose prompt was copied last', picked === 'm6:t6-03', picked);
    check('no page errors (M3)', !errs.length, errs);
    await pg.context().close();
  }

  // ---------- L3: the phone header ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const { pg, errs } = await open(browser, 'mocked.html', { ctx, init: initScript(seedOf(b.after)), wait: 1300 });
    const top = await pg.evaluate(() => Math.round(document.querySelector('.panel.next').getBoundingClientRect().top));
    check('on a phone Next up starts in the top half of the screen', top < 340, top);
    const row = await pg.evaluate(() => { const n = document.querySelector('#f-name').getBoundingClientRect(); const m = document.querySelector('#more-btn').getBoundingClientRect(); return { sameRow: m.top < n.bottom && m.left > n.left, exportShown: !!document.querySelector('.export-main').offsetParent }; });
    check('the name and More share a line, and Export plan moved into More', row.sameRow && !row.exportShown, row);
    const st = await pg.evaluate(() => { const g = document.querySelector('.stages').getBoundingClientRect(); const on = document.querySelector('.stage[aria-pressed="true"]').getBoundingClientRect(); const all = [...document.querySelectorAll('.stage')].map((x) => Math.round(x.getBoundingClientRect().top)); return { one: new Set(all).size === 1, inView: on.left >= g.left - 1 && on.right <= g.right + 1, h: Math.round(g.height) }; });
    check('the stages sit on one line, with the one set in view', st.one && st.inView && st.h < 50, st);
    check('the page does not scroll sideways', await pg.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth + 1));
    await pg.tap('#more-btn');
    await pg.waitForTimeout(100);
    check('More holds Export plan first', (await pg.evaluate(() => [...document.querySelectorAll('#more-list .btn')].filter((x) => x.offsetParent).map((x) => x.textContent.trim()))).join(',') === 'Export plan,Duplicate,Archive,Delete');
    await pg.tap('#more-list [data-act="export"]');
    await pg.waitForTimeout(150);
    check('...which opens the export', (await pg.textContent('#m-title')) === 'Export plan');
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(100);
    // a stage near the end of the line is kept in view when set
    await pg.evaluate(() => { const g = document.querySelector('.stages'); g.scrollLeft = g.scrollWidth; });
    await pg.tap('.stage[data-k="shipped"]');
    await pg.waitForTimeout(150);
    const st2 = await pg.evaluate(() => { const g = document.querySelector('.stages').getBoundingClientRect(); const on = document.querySelector('.stage[aria-pressed="true"]'); const r = on.getBoundingClientRect(); return { k: on.dataset.k, inView: r.left >= g.left - 1 && r.right <= g.right + 1 }; });
    check('setting Shipped keeps it in view', st2.k === 'shipped' && st2.inView, st2);
    check('no page errors (L3)', !errs.length, errs);
    await ctx.close();
  }
  // desktop keeps Export plan beside More
  {
    const { pg, errs } = await open(browser, 'mocked.html', { init: initScript(seedOf(b.after)), viewport: { width: 1280, height: 800 }, wait: 1300 });
    check('on a laptop Export plan stays beside More, and More does not repeat it', await pg.isVisible('.export-main') && !(await pg.evaluate(() => !!document.querySelector('#more-list .more-only').offsetParent)));
    await pg.click('#more-btn');
    check('...even with More open', !(await pg.isVisible('#more-list .more-only')));
    check('no page errors (laptop)', !errs.length, errs);
    await pg.context().close();
  }
  await browser.close();
  const fails = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - fails} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})();
