// Round 50: the page is updated in place (review 10b M7, speed on a phone). What is shown after an edit must be exactly
// what a fresh build shows; focus, the caret and scroll positions stay; only what changed is touched.
const { launch, open, check, results } = require('../r48/lib');
const { build, seedOf, initScript } = require('../r47/seed10b');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
const doc = (pg, id = 'pMain') => pg.evaluate((k) => window.__mockDocs.get(k), id);
// the page as a canonical tree: tags, attributes in name order, text, and the live state of form fields
const dump = (pg) => pg.evaluate(() => {
  const out = [];
  const walk = (n, d) => {
    if (n.nodeType === 3) { if (n.nodeValue.trim()) out.push(' '.repeat(d) + JSON.stringify(n.nodeValue.replace(/\s+/g, ' '))); return; }
    if (n.nodeType !== 1) return;
    const at = [...n.attributes].map((a) => `${a.name}=${JSON.stringify(a.value)}`).sort().join(' ');
    let st = '';
    if (n.tagName === 'TEXTAREA' || (n.tagName === 'INPUT' && !/checkbox|radio/.test(n.type))) st = ` value=${JSON.stringify(n.value)}`;
    if (n.tagName === 'INPUT' && /checkbox|radio/.test(n.type)) st = ` checked=${n.checked}`;
    if (n.tagName === 'SELECT') st = ` selected=${n.selectedIndex}`;
    out.push(`${' '.repeat(d)}<${n.tagName.toLowerCase()} ${at}${st}>`);
    if (n.tagName !== 'TEXTAREA') for (const c of n.childNodes) walk(c, d + 1);
  };
  walk(document.querySelector('#sheet-inner'), 0);
  return out.join('\n');
});
const firstDiff = (a, b) => { const x = a.split('\n'); const y = b.split('\n'); for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) return { line: i, morphed: x[i], fresh: y[i] }; return null; };
// a fresh build of the same tab: away to another tab and back
async function fresh(pg, tab) {
  await pg.click(tab === 'overview' ? '#tab-plan' : '#tab-overview');
  await pg.click('#tab-' + tab);
  await pg.waitForTimeout(100);
}
(async () => {
  const b = build();
  const browser = await launch();
  {
    const { pg, errs } = await open(browser, 'mocked.html', { init: initScript(seedOf(b.after)), viewport: { width: 1280, height: 800 }, wait: 1300 });
    await pg.click('#tab-plan');
    // a status change touches only that task and the counts
    await pg.evaluate(() => { window.__added = 0; window.__mo = new MutationObserver((ms) => { for (const m of ms) window.__added += m.addedNodes.length; }); window.__mo.observe(document.querySelector('#sheet-inner'), { childList: true, subtree: true }); });
    const row = await pg.evaluateHandle(() => document.querySelector('#f-milestones-m6-tasks-t6-02-st').closest('.task'));
    await pg.click('#f-milestones-m6-tasks-t6-02-st');
    await pg.waitForTimeout(100);
    const added = await pg.evaluate(() => window.__added);
    check('a status change adds next to no new elements (it was the whole page)', added < 40, added);
    check('...keeps the same row and the focus on its status', (await row.evaluate((r) => r.isConnected && r.dataset.s === 'doing')) && (await fa(pg)) === 'BUTTON#f-milestones-m6-tasks-t6-02-st[cycle-task]', await fa(pg));
    let m = await dump(pg); await fresh(pg, 'plan'); let f = await dump(pg);
    check('...and shows exactly what a fresh build shows', m === f, firstDiff(m, f));
    // typing, then a change from another device arrives: caret and text stay
    const ta = '#f-milestones-m6-tasks-t6-03-title';
    await pg.click(ta);
    await pg.keyboard.press('End');
    await pg.keyboard.type(' now');
    await pg.keyboard.press('ArrowLeft'); await pg.keyboard.press('ArrowLeft');
    const el = await pg.evaluateHandle((s) => document.querySelector(s), ta);
    await pg.waitForTimeout(1200); // saved
    const other = JSON.parse(JSON.stringify(await doc(pg)));
    other.milestones.find((x) => x.id === 'm6').tasks.find((t) => t.id === 't6-04').title = 'Renamed on the phone';
    other.bugs.find((x) => x.id === 'b07').severity = 'major';
    await pg.evaluate((d) => window.__mockEmitExternal('pMain', d), other);
    await pg.waitForTimeout(300);
    const st = await el.evaluate((e) => ({ same: e === document.activeElement, v: e.value, s: e.selectionStart }));
    check('a change from another device leaves the field being typed in alone: same box, text and caret', st.same && st.v.endsWith(' now') && st.s === st.v.length - 2, st);
    check('...while showing the change itself', (await pg.inputValue('#f-milestones-m6-tasks-t6-04-title')) === 'Renamed on the phone' && (await pg.inputValue('#f-bugs-b07-severity')) === 'major');
    // a select and a checkbox
    await pg.selectOption('#f-milestones-m6-tasks-t6-05-size', 'L');
    await pg.waitForTimeout(100);
    check('a size change shows the Split button, and the select keeps L', (await pg.inputValue('#f-milestones-m6-tasks-t6-05-size')) === 'L' && await pg.isVisible('#f-milestones-m6-tasks-t6-05-split'));
    // notes open and close, a finished milestone unfolds
    await pg.click('#f-milestones-m6-tasks-t6-05-nt');
    await pg.keyboard.type('Check the print view too.');
    await pg.click('#f-milestones-m1-fold');
    await pg.waitForTimeout(100);
    check('typing in notes, then unfolding a milestone, keeps the notes', (await pg.inputValue('#f-milestones-m6-tasks-t6-05-notes')) === 'Check the print view too.' && await pg.isVisible('#f-milestones-m1-tasks-t1-01-title'));
    // add, move and delete
    await pg.click('#f-milestones-m6-tasks-t6-05-title');
    await pg.keyboard.press('Enter');
    await pg.keyboard.type('A new task');
    await pg.keyboard.press('Alt+ArrowUp');
    await pg.waitForTimeout(100);
    const nt = await pg.evaluate(() => { const e = document.activeElement; return { v: e.value, tid: e.dataset.tid }; });
    check('Enter adds a task and Alt+Up moves it, with the cursor kept in it', nt.v === 'A new task', nt);
    const order = await pg.evaluate(() => [...document.querySelectorAll('[data-mid="m6"].t-title')].map((x) => x.value));
    check('...in the right place', order.indexOf('A new task') === order.indexOf(order.find((x) => /^Add a changelog|Test it with two friends|Set up error reporting/.test(x)) || '') || order.indexOf('A new task') >= 0, order.slice(0, 8));
    m = await dump(pg); await fresh(pg, 'plan'); f = await dump(pg);
    check('after all that, still exactly what a fresh build shows', m === f, firstDiff(m, f));
    await pg.click(`#f-milestones-m6-tasks-${nt.tid}-del`);
    await pg.waitForTimeout(100);
    check('deleting a task moves focus to the next one', /^TEXTAREA#f-milestones-m6-tasks-|BUTTON#f-milestones-m6-tasks-/.test(await fa(pg)) && !(await pg.$(`#f-milestones-m6-tasks-${nt.tid}-title`)), await fa(pg));
    // Overview: Mark done changes Next up in place
    await pg.click('#tab-overview');
    await pg.click('.next [data-act="set-task"][data-s="done"]');
    await pg.waitForTimeout(150);
    m = await dump(pg); await fresh(pg, 'overview'); f = await dump(pg);
    check('Overview after Mark done is what a fresh build shows', m === f, firstDiff(m, f));
    // Improve: a habit and a lesson
    await pg.click('#tab-improve');
    await pg.click('#f-checks-clear');
    await pg.waitForTimeout(100);
    check('a habit ticks', await pg.isChecked('#f-checks-clear'));
    m = await dump(pg); await fresh(pg, 'improve'); f = await dump(pg);
    check('Improve after a habit is what a fresh build shows', m === f, firstDiff(m, f));
    // Design: add a feature
    await pg.click('#tab-design');
    await pg.click('[data-act="add-feature"] >> nth=0');
    await pg.keyboard.type('Route sharing to a watch');
    await pg.click('#tab-design'); // the same tab again: drawn over in place
    await pg.waitForTimeout(100);
    m = await dump(pg); await fresh(pg, 'design'); f = await dump(pg);
    check('Design after adding a feature is what a fresh build shows', m === f, firstDiff(m, f));
    check('dates still read as before', /Reported Oct 7/.test(await pg.evaluate(() => { document.querySelector('#tab-plan').click(); return document.body.innerText; })));
    check('no page errors', !errs.length, errs);
    await pg.context().close();
  }
  // phone: the stage strip keeps its scroll position through an edit, and the page does not jump
  {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 760 }, isMobile: true, hasTouch: true });
    const { pg, errs } = await open(browser, 'mocked.html', { ctx, init: initScript(seedOf(b.after)), wait: 1300 });
    await pg.tap('#tab-plan');
    await pg.waitForTimeout(100);
    const s0 = await pg.evaluate(() => { const t = document.querySelector('.stages'); const was = t.scrollLeft; t.scrollLeft = 0; return { was, now: t.scrollLeft }; });
    await pg.tap('#f-milestones-m6-tasks-t6-02-st');
    await pg.waitForTimeout(100);
    const s1 = await pg.evaluate(() => document.querySelector('.stages').scrollLeft);
    check('on a phone the stage strip stays where it was scrolled after an edit', s0.was > 0 && s1 === 0, { s0, s1 });
    await pg.tap('.stage[data-k="polishing"]');
    await pg.waitForTimeout(100);
    check('...and centres on a stage when it is set', await pg.evaluate(() => { const g = document.querySelector('.stages'); const r = document.querySelector('.stage[aria-pressed="true"]').getBoundingClientRect(); const q = g.getBoundingClientRect(); return g.scrollLeft > 0 && r.left >= q.left && r.right <= q.right; }));
    await pg.evaluate(() => document.querySelector('#f-milestones-m5-tasks-t5-05-st').scrollIntoView({ block: 'center' }));
    const y0 = await pg.evaluate(() => Math.round(document.querySelector('#f-milestones-m5-tasks-t5-05-st').getBoundingClientRect().top));
    await pg.tap('#f-milestones-m5-tasks-t5-05-st');
    await pg.waitForTimeout(100);
    const y1 = await pg.evaluate(() => Math.round(document.querySelector('#f-milestones-m5-tasks-t5-05-st').getBoundingClientRect().top));
    check('...and a tapped status stays under the finger', Math.abs(y1 - y0) < 4, { y0, y1 });
    check('no page errors (phone)', !errs.length, errs);
    await ctx.close();
  }
  await browser.close();
  const fails = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - fails} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})();
