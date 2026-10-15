const { chromium } = require('playwright');
const path = require('path');
const TEST = path.join(__dirname, '..');
async function open(browser, file, opts = {}) {
  const ctx = opts.ctx || await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 900 } });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  pg.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/fonts|ERR_FAILED/.test(m.text())) errs.push('console ' + m.text()); });
  await pg.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  if (opts.init) await pg.addInitScript(opts.init);
  await pg.goto('file://' + (file.startsWith('/') ? file : path.join(TEST, file)));
  await pg.waitForTimeout(opts.wait ?? 400);
  return { pg, errs, ctx };
}
async function newProject(pg, name, idea, ai) {
  await pg.click('[data-act="new-project"] >> visible=true');
  await pg.fill('#np-name', name);
  if (idea != null) await pg.fill('#np-idea', idea);
  await pg.click(ai ? '[data-act="create-ai"]' : '[data-act="create"]');
  await pg.waitForTimeout(ai ? 700 : 150);
}
const docs = (pg) => pg.evaluate(() => Object.fromEntries(window.__mockDocs));
const firstId = (pg) => pg.evaluate(() => [...window.__mockDocs.keys()][0]);
const log = (pg) => pg.evaluate(() => window.__mockLog.filter((x) => x[0] !== 'sample' && x[0] !== 'json'));
module.exports = { chromium, open, newProject, TEST, docs, firstId, log };
