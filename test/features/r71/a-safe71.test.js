// Round 71: review 14c, data safety. A visit without the account store keeps its changes for the next visit; a page
// closed right after typing, a write that never answers and a failed write keep their changes in this browser until
// they are saved; leaving warns only when nothing keeps the changes; deleting a project can be undone; Ctrl+Z right
// after a delete undoes it even when focus moved into a text box.
const { launch, open, check, results } = require('../r48/lib');
const { openShared } = require('../r76/settle');
const { build, seedOf, initScript } = require('../r47/seed10b');
const wrap = require('./dbwrap');
const seedObj = seedOf(build().after);
const ui = (tab) => ({ activeId: 'pMain', tab, repoFile: 'claudemd', view: 'project' });
// every toast the page shows, and what was marked to sync before the page started
const SPY = `window.__pendAtStart = (() => { try { return localStorage.getItem('shipyard.pending.v1'); } catch (e) { return null; } })();
window.__toasts = [];
new MutationObserver(() => { const t = document.getElementById('toast'); if (t && !t.hidden && t.textContent && window.__toasts[window.__toasts.length - 1] !== t.textContent) window.__toasts.push(t.textContent); }).observe(document, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden'] });
window.__fullLS = false;
(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (window.__fullLS && /^shipyard\\.(projects|pending)/.test(k)) throw new DOMException('full', 'QuotaExceededError'); return set.call(this, k, v); }; })();
`;
const visit = (browser, ctx, cfg, { wait = 1800, tab = 'overview', fresh = false } = {}) => openShared(browser, 'mocked.html', { ctx, init: SPY + wrap(cfg) + (fresh ? 'window.__SEED__ = null;' : initScript(seedObj, { seen: 99, ui: ui(tab) })), wait });
const pend = (pg) => pg.evaluate(() => JSON.parse(localStorage.getItem('shipyard.pending.v1') || '{}'));
const stored = (pg, id = 'pMain') => pg.evaluate((i) => window.__mockDocs.get(i) || null, id);
const typePitch = async (pg, s) => { await pg.click('#f-pitch'); await pg.keyboard.press('End'); await pg.keyboard.type(s); };
const leaveWarns = (pg) => pg.evaluate(() => { const ev = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(ev); return ev.defaultPrevented; });
const toasts = (pg) => pg.evaluate(() => window.__toasts || []);
(async () => {
  const browser = await launch();
  const allErrs = [];

  // 1. a visit that cannot reach the store, after one that could; then the store is back
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const v1 = await visit(browser, ctx, {}, { wait: 2600 });
    check('a visit with the store marks this browser\'s copy as the account\'s', (await v1.pg.evaluate(() => localStorage.getItem('shipyard.mirror.v1'))) === '1');
    allErrs.push(...v1.errs); await v1.pg.close();
    await new Promise((r) => setTimeout(r, 1500)); // a page opened at once can miss what the closed one stored
    const v2 = await visit(browser, ctx, { useNull: true }, { wait: 1500 });
    const t2 = await toasts(v2.pg);
    check('without the store, the page says it shows the copy kept in this browser', t2.some((t) => t.startsWith('Could not reach your saved projects, so this shows the copy kept in this browser.')), t2);
    check('the project list says changes are kept here and saved to the account later', /Not connected to your Claude account\. Changes are kept in this browser and saved to your account the next time the page connects\./.test(await v2.pg.textContent('#store-note')));
    await typePitch(v2.pg, ' OFFLINE-EDIT');
    await v2.pg.click('#rail [data-act="new-project"]'); await v2.pg.fill('#np-name', 'Made while offline'); await v2.pg.fill('#np-idea', 'A small web app'); await v2.pg.click('#modal-root [data-act="create"]');
    await v2.pg.waitForTimeout(1200);
    const p2 = await pend(v2.pg);
    const newId = Object.keys(p2).find((k) => k !== 'pMain');
    check('both are marked to sync: the edit against the account copy, the new project as new', !!p2.pMain?.base && p2.pMain.base.pitch && !p2.pMain.base.pitch.includes('OFFLINE') && !!newId && p2[newId].base === null, Object.fromEntries(Object.entries(p2).map(([k, v]) => [k, v.base ? 'base' : v.base])));
    allErrs.push(...v2.errs); await v2.pg.close();
    await new Promise((r) => setTimeout(r, 1500));
    const v3 = await visit(browser, ctx, {}, { wait: 4000 });
    const s3 = await stored(v3.pg);
    const made = await v3.pg.evaluate(() => [...window.__mockDocs.values()].some((p) => p.name === 'Made while offline'));
    check('next visit with the store: the edit reaches the account', !!s3 && s3.pitch.includes('OFFLINE-EDIT'), s3?.pitch);
    check('next visit with the store: the project made offline reaches the account and is listed', made && (await v3.pg.textContent('#plist')).includes('Made while offline'));
    check('the page says it is saving what was kept last time', (await toasts(v3.pg)).includes('Saving the changes to 2 projects that were kept in this browser last time.'), await toasts(v3.pg));
    check('once saved, nothing is left marked to sync', Object.keys(await pend(v3.pg)).length === 0, Object.keys(await pend(v3.pg)));
    allErrs.push(...v3.errs); await ctx.close();
  }

  // 2. a browser that never kept the account's projects stays a browser-only planner
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const v = await visit(browser, ctx, { useNull: true }, { wait: 1200, fresh: true });
    check('a browser-only planner says so and shows no connection message', (await v.pg.textContent('#store-note')).trim() === 'Saved in this browser only.' && !(await toasts(v.pg)).some((t) => /Could not reach/.test(t)));
    await v.pg.click('[data-act="new-project"] >> visible=true'); await v.pg.fill('#np-name', 'Local only'); await v.pg.click('#modal-root [data-act="create"]');
    await v.pg.waitForTimeout(800);
    check('a browser-only planner marks nothing to sync', (await v.pg.evaluate(() => localStorage.getItem('shipyard.pending.v1'))) === null);
    check('leaving a browser-only planner that saved does not warn', !(await leaveWarns(v.pg)));
    // the browser refuses to save: leaving would lose the project, so the browser asks
    await v.pg.evaluate(() => { window.__fullLS = true; });
    await v.pg.fill('#f-pitch', 'Typed while the browser is full');
    await v.pg.waitForTimeout(900);
    check('the browser cannot save: leaving warns', await leaveWarns(v.pg));
    await v.pg.evaluate(() => { window.__fullLS = false; });
    await v.pg.fill('#f-pitch', 'Typed once there is room');
    await v.pg.waitForTimeout(900);
    check('saved again: leaving does not warn', !(await leaveWarns(v.pg)));
    // delete with Undo, in this browser
    await v.pg.click('#more-btn'); await v.pg.click('[data-act="ask-delete"]'); await v.pg.click('.phead .confirm [data-act="delete-project"]');
    await v.pg.waitForTimeout(700);
    const gone = await v.pg.evaluate(() => Object.values(JSON.parse(localStorage.getItem('shipyard.projects.v1') || '{}')).some((p) => p.name === 'Local only'));
    check('browser only: the deleted project is gone from this browser', !gone && (await v.pg.textContent('#toast')).startsWith('Project deleted: "Local only".'));
    await v.pg.click('#toast [data-act="undo"]');
    await v.pg.waitForTimeout(700);
    const back = await v.pg.evaluate(() => Object.values(JSON.parse(localStorage.getItem('shipyard.projects.v1') || '{}')).find((p) => p.name === 'Local only'));
    check('browser only: Undo puts it back, with its brief, and opens it', !!back && back.pitch === 'Typed once there is room' && (await v.pg.inputValue('#f-name')) === 'Local only');
    allErrs.push(...v.errs); await ctx.close();
  }

  // 3. closing the page right after typing, while a slow write runs
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const v1 = await visit(browser, ctx, { delay: 4000 });
    await typePitch(v1.pg, ' FIRST'); await v1.pg.waitForTimeout(900);
    await typePitch(v1.pg, ' CLOSING');
    const closed = new Promise((r) => v1.pg.once('close', r));
    await v1.pg.close({ runBeforeUnload: true });
    await closed;
    await new Promise((r) => setTimeout(r, 1500)); // as a person would, before opening it again
    const v2 = await visit(browser, ctx, {}, { wait: 3500 });
    const at = await v2.pg.evaluate(() => JSON.parse(window.__pendAtStart || '{}'));
    check('closing right after typing keeps the change in this browser, marked to sync', !!at.pMain);
    check('the next visit saves it to the account', ((await stored(v2.pg))?.pitch || '').includes('FIRST CLOSING'), (await stored(v2.pg))?.pitch);
    check('and then nothing is left marked to sync', Object.keys(await pend(v2.pg)).length === 0);
    allErrs.push(...v2.errs); await ctx.close();
  }

  // 4. a write that never answers
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const v = await visit(browser, ctx, {});
    check('leaving right after typing does not warn while the store is fine', await (async () => { await typePitch(v.pg, ' x'); return !(await leaveWarns(v.pg)); })());
    await v.pg.waitForTimeout(1500);
    await v.pg.evaluate(() => { window.__DB.mode = 'hang'; });
    await typePitch(v.pg, ' HANG-1'); await v.pg.waitForTimeout(3000);
    await v.pg.evaluate(() => { window.__DB.mode = null; });
    await typePitch(v.pg, ' HANG-2');
    const t0 = Date.now();
    await v.pg.waitForFunction(() => !!JSON.parse(localStorage.getItem('shipyard.pending.v1') || '{}').pMain, null, { timeout: 20000, polling: 200 }).catch(() => {});
    const parkedAfter = Date.now() - t0;
    const banner = await v.pg.textContent('#save-banner');
    check('a write with no answer is given up after about 15 s; the change is kept in this browser and the page says so', !!(await pend(v.pg)).pMain && /Retrying/.test(banner), { parkedAfter, banner });
    await v.pg.waitForFunction(() => (window.__mockDocs.get('pMain')?.pitch || '').includes('HANG-2'), null, { timeout: 12000, polling: 200 }).catch(() => {});
    const s = await stored(v.pg);
    check('it is tried again and both edits reach the account', !!s && s.pitch.includes('HANG-1') && s.pitch.includes('HANG-2'), s?.pitch);
    await v.pg.waitForTimeout(400);
    check('once saved, the banner goes and nothing is left marked to sync', !(await pend(v.pg)).pMain && !(await v.pg.textContent('#save-banner')).trim());
    allErrs.push(...v.errs); await ctx.close();
  }

  // 5. a write that fails, and a browser that cannot keep a copy either
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const v = await visit(browser, ctx, {});
    await v.pg.evaluate(() => { window.__DB.mode = 'quota_exceeded'; });
    await typePitch(v.pg, ' FULL-1'); await v.pg.waitForTimeout(1500);
    const p = await pend(v.pg);
    check('a write the store refuses is kept in this browser, marked to sync', !!p.pMain && (await v.pg.evaluate(() => JSON.parse(localStorage.getItem('shipyard.projects.v1')).pMain.pitch)).includes('FULL-1'));
    check('leaving does not warn: the change is kept in this browser', !(await leaveWarns(v.pg)));
    await v.pg.evaluate(() => { window.__fullLS = true; });
    await typePitch(v.pg, ' FULL-2'); await v.pg.waitForTimeout(1500);
    const banner = await v.pg.textContent('#save-banner');
    check('when the browser cannot keep a copy either, the banner says to keep the tab open', /This browser cannot keep a copy either, so keep this tab open until it saves\./.test(banner), banner);
    check('and leaving warns', await leaveWarns(v.pg));
    await v.pg.evaluate(() => { window.__fullLS = false; window.__DB.mode = null; });
    await typePitch(v.pg, ' OK'); await v.pg.waitForTimeout(1800);
    const s = await stored(v.pg);
    check('once the store takes it, everything is saved and leaving does not warn', !!s && s.pitch.includes('FULL-1 FULL-2 OK') && !(await leaveWarns(v.pg)) && !(await pend(v.pg)).pMain, s?.pitch);
    allErrs.push(...v.errs); await ctx.close();
  }

  // 6. deleting a project, then Ctrl+Z from the next project's name field
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const v = await visit(browser, ctx, {});
    const name = await v.pg.inputValue('#f-name');
    const before = await stored(v.pg);
    await v.pg.click('#more-btn'); await v.pg.click('[data-act="ask-delete"]'); await v.pg.click('.phead .confirm [data-act="delete-project"]');
    await v.pg.waitForTimeout(500);
    const msg = await v.pg.textContent('#toast');
    const focus = await v.pg.evaluate(() => document.activeElement?.id);
    const other = await v.pg.inputValue('#f-name');
    check('deleting a project offers Undo', msg.startsWith(`Project deleted: "${name}".`) && /Undo/.test(msg), msg);
    check('it is gone from the account at once', !(await stored(v.pg)));
    await v.pg.keyboard.press('Control+z');
    await v.pg.waitForTimeout(800);
    const after = await stored(v.pg);
    check('Ctrl+Z from the next project\'s name field puts it back and opens it', focus === 'f-name' && (await v.pg.inputValue('#f-name')) === name && (await v.pg.textContent('#toast')).startsWith('Undone.'), { focus, other });
    check('it is in the account again, whole', !!after && after.milestones.length === before.milestones.length && after.sessions.length === before.sessions.length && after.pitch === before.pitch);
    check('the project focus moved to keeps its name', (await v.pg.evaluate((n) => [...window.__mockDocs.values()].some((p) => p.name === n), other)));
    allErrs.push(...v.errs); await ctx.close();
  }

  // 7. Ctrl+Z after deleting a task by keyboard: focus is in the next title; typing there gives Ctrl+Z back to the field
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const v = await visit(browser, ctx, {}, { tab: 'plan' });
    const count = () => v.pg.evaluate(() => window.__mockDocs.get('pMain').milestones.reduce((n, m) => n + m.tasks.length, 0));
    const shown = () => v.pg.$$eval('.t-title', (xs) => xs.length);
    const n0 = await shown();
    const c0 = await count();
    await v.pg.locator('.ms:not(.folded) [data-act="del-task"]').nth(1).focus();
    await v.pg.keyboard.press('Enter');
    await v.pg.waitForTimeout(300);
    const inField = await v.pg.evaluate(() => document.activeElement?.matches('textarea, input'));
    await v.pg.keyboard.press('Control+z');
    await v.pg.waitForTimeout(400);
    check('Ctrl+Z right after deleting a task undoes it, though focus moved into a title', inField && (await shown()) === n0, { inField, n0, now: await shown() });
    await v.pg.locator('.ms:not(.folded) [data-act="del-task"]').nth(1).focus();
    await v.pg.keyboard.press('Enter');
    await v.pg.waitForTimeout(300);
    await v.pg.keyboard.type('!');
    await v.pg.keyboard.press('Control+z');
    await v.pg.waitForTimeout(1500);
    check('after typing in that title, Ctrl+Z is the field\'s own again', (await shown()) === n0 - 1 && (await count()) === c0 - 1, { n0, c0, now: await shown(), stored: await count() });
    allErrs.push(...v.errs); await ctx.close();
  }

  check('no page errors', allErrs.length === 0, allErrs);
  await browser.close();
  const fails = results.filter((r) => !r.ok).length;
  console.log(`${results.length - fails}/${results.length} passed`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
