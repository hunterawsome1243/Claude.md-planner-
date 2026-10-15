// Phone: opening a task prompt puts focus in the editable prompt textarea (on a real phone this raises the keyboard
// over the dialog, hiding Copy prompt).
const { chromium } = require('playwright');
const env = require('../helpers/env.js');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const pg = await ctx.newPage();
  await env.routeFonts(pg, true);
  await pg.goto(env.PAGE); await pg.waitForTimeout(600);
  await pg.evaluate(() => window.__mockEmitExternal('p-x', { kind: 'project', name: 'Demo', pitch: 'A demo.', milestones: [{ id: 'm1', title: 'Start', goal: '', tasks: [{ id: 't1', title: 'Make the page', size: 'S', status: 'todo', notes: '' }] }], createdAt: '2026-01-01' }));
  await pg.waitForTimeout(300);
  await pg.tap('[data-act="open-drawer"]'); await pg.waitForTimeout(300);
  await pg.tap('[data-act="open"][data-id="p-x"]'); await pg.waitForTimeout(300);
  await pg.tap('.next [data-act="prompt"]'); await pg.waitForTimeout(200);
  console.log('focused after opening prompt:', await pg.evaluate(() => document.activeElement.id || document.activeElement.tagName));
  await pg.tap('[data-act="close-modal"]'); await pg.waitForTimeout(200);
  await pg.tap('#more-btn'); await pg.waitForTimeout(100); await pg.tap('#more-list [data-act="export"]'); await pg.waitForTimeout(200); // on a phone Export is in More (round 48)
  console.log('focused after opening export:', await pg.evaluate(() => document.activeElement.id || document.activeElement.tagName));
  await b.close();
})();
