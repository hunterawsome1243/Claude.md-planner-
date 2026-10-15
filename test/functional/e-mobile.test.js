// Round 2: phone width (390px): drawer, tab order, overflow on every tab, modals.
const L = require('./lib');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await L.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const { pg, errs } = await L.open(b, 'mocked.html', { ctx });
  const overflow = () => pg.evaluate(() => {
    const W = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width && cs.visibility !== 'hidden' && !e.closest('#rail, .file-tabs') && (r.right > W + 1 || r.left < -1); }).slice(0, 5).map((e) => `${e.tagName}.${e.className} ${Math.round(e.getBoundingClientRect().left)}..${Math.round(e.getBoundingClientRect().right)}`);
    return { docW: document.documentElement.scrollWidth, W, sheetW: document.getElementById('sheet').scrollWidth, sheetCW: document.getElementById('sheet').clientWidth, wide };
  });
  await pg.screenshot({ path: L.OUT + '/e-welcome.png' });
  L.check('welcome no overflow', (await overflow()).docW <= 390, await overflow());
  // New via mbar
  await pg.click('.mbar [data-act="new-project"]');
  await pg.fill('#np-name', 'A very long project name that keeps going and going on a phone');
  await pg.fill('#np-idea', 'Save recipes from links and plan meals for the week');
  await pg.screenshot({ path: L.OUT + '/e-newmodal.png' });
  await pg.click('[data-act="create-ai"]');
  await sleep(900);
  for (const t of ['overview', 'design', 'plan', 'claudemd', 'improve']) {
    await pg.click(`[data-act="tab"][data-k="${t}"]`);
    if (t === 'plan') { await pg.click('[data-act="toggle-notes"] >> nth=0'); await pg.click('[data-act="ask-del-ms"] >> nth=0'); }
    if (t === 'improve') { await pg.click('[data-act="ai-review"]'); await sleep(500); await pg.click('[data-act="add-lesson"]'); }
    if (t === 'design') { await pg.click('[data-act="add-screen"]'); await pg.click('[data-act="add-decision"]'); }
    await sleep(100);
    const o = await overflow();
    L.check(`no horizontal overflow on ${t}`, o.docW <= 390 && o.sheetW <= o.sheetCW && !o.wide.length, o);
    await pg.screenshot({ path: L.OUT + `/e-${t}.png`, fullPage: true });
  }
  // the phone-sized tab bar: all tabs reachable
  const tabs = await pg.$$eval('.tab', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return [e.textContent.trim(), Math.round(r.left), Math.round(r.right)]; }));
  console.log('tabs', JSON.stringify(tabs));
  // drawer
  await pg.click('[data-act="tab"][data-k="overview"]');
  await pg.click('[data-act="open-drawer"]');
  await sleep(300);
  const fd = await pg.evaluate(() => ({ cls: document.activeElement.className, inRail: !!document.activeElement.closest('#rail') }));
  L.check('drawer opens, focus inside', fd.inRail, fd);
  await pg.screenshot({ path: L.OUT + '/e-drawer.png' });
  await pg.keyboard.press('Escape');
  await sleep(300);
  L.check('escape closes drawer + focuses Projects', !(await pg.evaluate(() => document.getElementById('app').classList.contains('drawer'))) && (await pg.evaluate(() => document.activeElement.dataset.act)) === 'open-drawer');
  // closed drawer is out of tab order
  await pg.keyboard.press('Shift+Tab');
  const back = await pg.evaluate(() => ({ inRail: !!document.activeElement.closest('#rail'), tag: document.activeElement.tagName }));
  L.check('closed drawer not in tab order', !back.inRail, back);
  // scrim closes
  await pg.evaluate(() => document.activeElement?.blur());
  await pg.click('[data-act="open-drawer"]');
  await sleep(300);
  await pg.mouse.click(370, 400);
  await sleep(300);
  L.check('scrim tap closes drawer', !(await pg.evaluate(() => document.getElementById('app').classList.contains('drawer'))));
  // New project from drawer, then switch via drawer
  await pg.click('[data-act="open-drawer"]');
  await sleep(300);
  await pg.click('#rail [data-act="new-project"]');
  await pg.fill('#np-name', 'Second');
  await pg.click('[data-act="create"]');
  await sleep(300);
  L.check('create from drawer closes drawer', !(await pg.evaluate(() => document.getElementById('app').classList.contains('drawer'))) && (await L.active(pg)) === 'Second');
  await pg.click('[data-act="open-drawer"]');
  await sleep(300);
  await pg.click('#plist .pitem >> nth=1');
  await sleep(300);
  L.check('switch via drawer', (await L.active(pg)).startsWith('A very long') && !(await pg.evaluate(() => document.getElementById('app').classList.contains('drawer'))));
  // cancel new-project from drawer: drawer state
  await pg.click('[data-act="open-drawer"]');
  await sleep(300);
  await pg.click('#rail [data-act="new-project"]');
  await pg.click('[data-act="close-modal"]');
  await sleep(100);
  console.log('after cancelling New from drawer, drawer open:', await pg.evaluate(() => document.getElementById('app').classList.contains('drawer')), 'focus:', await pg.evaluate(() => document.activeElement.tagName + '.' + document.activeElement.className));
  await pg.keyboard.press('Escape');
  await sleep(300);
  // prompt modal on phone
  await pg.click('.next [data-act="prompt"]');
  await sleep(100);
  const mb = await pg.$eval('.modal', (e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; });
  const btns = await pg.$$eval('.modal-actions .btn', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return [e.textContent.trim(), Math.round(r.top), Math.round(r.bottom)]; }));
  L.check('prompt modal fits width', mb.l >= 0 && mb.r <= 390, mb);
  console.log('prompt modal buttons', JSON.stringify(btns));
  await pg.screenshot({ path: L.OUT + '/e-prompt.png' });
  await pg.keyboard.press('Escape');
  // sticky mbar does not hide focused field after Tab
  console.log('errors', errs);
  await b.close();
})();
