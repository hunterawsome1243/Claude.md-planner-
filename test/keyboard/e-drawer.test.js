// Phone drawer at 390: open focus (with and without projects), Tab/Shift+Tab wrap, sheet inert, Escape, open project,
// New project from the drawer, aria-expanded on the toggle, a close control inside the drawer, resize to desktop.
const { chromium, open, fa, kb, sleep, check, newProjectKb, failCount } = require('./k');
(async () => {
  const b = await chromium.launch();
  const vp = { width: 390, height: 844 };
  const { pg, errs } = await open(b, 'mocked.html', { viewport: vp });
  // no projects yet
  await kb(pg, '[data-act="open-drawer"]'); await sleep(120);
  const f0 = await fa(pg);
  check('drawer opened with no projects puts focus inside the drawer', /@rail/.test(f0), f0);
  await pg.keyboard.press('Tab');
  console.log('  Tab ->', await fa(pg));
  await pg.keyboard.press('Escape'); await sleep(50);
  console.log('  Escape ->', await fa(pg));
  // three projects
  for (const n of ['One', 'Two', 'Three']) await newProjectKb(pg, n, 'idea ' + n, false);
  const attrs = await pg.evaluate(() => { const t = document.querySelector('[data-act="open-drawer"]'); return { expanded: t.getAttribute('aria-expanded'), controls: t.getAttribute('aria-controls') }; });
  await kb(pg, '[data-act="open-drawer"]'); await sleep(120);
  const attrsOpen = await pg.evaluate(() => { const t = document.querySelector('[data-act="open-drawer"]'); return { expanded: t.getAttribute('aria-expanded') }; });
  check('open-drawer toggle exposes aria-expanded (closed/open)', attrs.expanded === 'false' && attrsOpen.expanded === 'true', { closed: attrs, open: attrsOpen });
  const f1 = await fa(pg);
  console.log('  focus on open:', f1, '| current project:', await pg.evaluate(() => document.querySelector('#plist [aria-current="true"] .nm').textContent));
  check('sheet is inert while drawer open', await pg.evaluate(() => document.getElementById('sheet').inert), '');
  const seq = [];
  for (let i = 0; i < 6; i++) { await pg.keyboard.press('Tab'); seq.push(await fa(pg)); }
  check('Tab wraps inside the drawer', seq.every((s) => /@rail/.test(s)), seq.map((s) => s.split(' @')[0]).join(' > '));
  const back = [];
  for (let i = 0; i < 6; i++) { await pg.keyboard.press('Shift+Tab'); back.push(await fa(pg)); }
  check('Shift+Tab wraps inside the drawer', back.every((s) => /@rail/.test(s)), back.map((s) => s.split(' @')[0]).join(' > '));
  const closeCtl = await pg.evaluate(() => [...document.querySelectorAll('#rail button')].map((x) => x.getAttribute('aria-label') || x.textContent.trim().replace(/\s+/g, ' ')));
  check('drawer contains a control that closes it without picking a project', closeCtl.some((t) => /close|hide|back/i.test(t)), closeCtl);
  await pg.keyboard.press('Escape'); await sleep(250);
  const f2 = await fa(pg);
  check('Escape closes the drawer and focuses the toggle', /\[open-drawer\]/.test(f2) && !(await pg.evaluate(() => document.getElementById('sheet').inert)), f2);
  const seq2 = [];
  for (let i = 0; i < 3; i++) { await pg.keyboard.press('Tab'); seq2.push(await fa(pg)); }
  check('Tab after closing the drawer is not trapped / does not reach hidden rail', seq2.every((s) => /@mbar|@sheet/.test(s) && !/HIDDEN/.test(s)), seq2.map((s) => s.split(' @')[0]).join(' > '));
  // open a project from the drawer with Enter
  await kb(pg, '[data-act="open-drawer"]'); await sleep(120);
  await pg.keyboard.press('Tab');
  console.log('  opening:', await fa(pg));
  await pg.keyboard.press('Enter'); await sleep(300);
  const f3 = await fa(pg);
  check('Opening a project from the drawer focuses the toggle', /\[open-drawer\]/.test(f3) && !/HIDDEN|INERT/.test(f3), f3);
  // New project from drawer, Escape -> back to drawer's button, still trapped
  await kb(pg, '[data-act="open-drawer"]'); await sleep(120);
  await kb(pg, '#rail [data-act="new-project"]'); await sleep(60);
  const seqM = [];
  for (let i = 0; i < 6; i++) { await pg.keyboard.press('Tab'); seqM.push(await fa(pg)); }
  check('Tab stays in dialog opened from the drawer', seqM.every((s) => /@modal/.test(s)), seqM.map((s) => s.split(' @')[0]).join(' > '));
  await pg.keyboard.press('Escape'); await sleep(60);
  const f4 = await fa(pg);
  check('Escape from that dialog returns to the drawer New project', /@rail/.test(f4) && /new-project/.test(f4), f4);
  // create from drawer: drawer closes, focus?
  await kb(pg, '#rail [data-act="new-project"]'); await sleep(60);
  await pg.keyboard.type('Four'); await pg.keyboard.press('Enter'); await pg.keyboard.type('x'); await pg.keyboard.press('Control+Enter'); await sleep(300);
  const f5 = await fa(pg);
  console.log('  after create from drawer: drawer open =', await pg.evaluate(() => document.getElementById('app').classList.contains('drawer')), 'sheet inert =', await pg.evaluate(() => document.getElementById('sheet').inert), 'focus =', f5);
  // resize while drawer open
  await kb(pg, '[data-act="open-drawer"]'); await sleep(120);
  await pg.setViewportSize({ width: 1280, height: 900 }); await sleep(150);
  const st = await pg.evaluate(() => ({ drawer: document.getElementById('app').classList.contains('drawer'), inert: document.getElementById('sheet').inert, scrim: !document.getElementById('scrim').hidden }));
  check('resizing to desktop closes the drawer and un-inerts the sheet', !st.drawer && !st.inert && !st.scrim, st);
  const f6 = await fa(pg);
  const seq3 = [];
  for (let i = 0; i < 4; i++) { await pg.keyboard.press('Tab'); seq3.push(await fa(pg)); }
  console.log('  after resize focus:', f6, ' Tabs:', seq3.map((s) => s.split(' @')[0]).join(' > '));
  console.log('errors', errs);
  console.log('\nfails:', failCount());
  await b.close();
})();
