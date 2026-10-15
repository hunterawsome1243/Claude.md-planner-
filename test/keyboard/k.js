// Shared helpers for the final keyboard / focus review.
const { chromium } = require('playwright');
const path = require('path');
const TEST = path.join(__dirname, '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function open(browser, file, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 900 }, colorScheme: opts.scheme || 'light' });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  pg.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/fonts|ERR_FAILED/.test(m.text())) errs.push('console ' + m.text()); });
  await pg.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  if (opts.init) await pg.addInitScript(opts.init);
  await pg.goto('file://' + path.join(TEST, file || 'mocked.html'));
  await pg.waitForTimeout(opts.wait ?? 500);
  return { pg, errs, ctx };
}
// Describes document.activeElement: BODY, or tag/id/act/label plus visibility and inert state.
const fa = (pg) => pg.evaluate(() => {
  const a = document.activeElement;
  if (!a || a === document.body) return 'BODY';
  const cs = getComputedStyle(a);
  const r = a.getBoundingClientRect();
  const vis = a.getClientRects().length && cs.visibility !== 'hidden';
  const inView = r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  let lab = a.getAttribute('aria-label') || (a.tagName === 'BUTTON' ? a.textContent.trim().slice(0, 30) : '');
  const where = a.closest('.modal') ? 'modal' : a.closest('#rail') ? 'rail' : a.closest('.mbar') ? 'mbar' : a.closest('#sheet') ? 'sheet' : '?';
  return `${a.tagName}${a.id ? '#' + a.id : ''}${a.dataset.act ? '[' + a.dataset.act + ']' : ''}${lab ? ' "' + lab + '"' : ''} @${where}${vis ? '' : ' HIDDEN'}${a.closest('[inert]') ? ' INERT' : ''}${inView ? '' : ' OFFSCREEN'}`;
});
// Keyboard-activate: focus a selector then press a key (Enter by default).
async function kb(pg, sel, key = 'Enter') { await pg.focus(sel); await pg.keyboard.press(key); }
async function newProjectKb(pg, name, idea, ai) {
  const w = pg.viewportSize().width;
  await pg.click(w <= 820 ? ".mbar [data-act=\"new-project\"]" : "#rail [data-act=\"new-project\"]");
  await pg.fill('#np-name', name);
  if (idea != null) await pg.fill('#np-idea', idea);
  await pg.click(ai ? '[data-act="create-ai"]' : '[data-act="create"]');
  await pg.waitForTimeout(ai ? 800 : 200);
}
let fails = 0;
function check(name, ok, info) { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  -> ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); }
const failCount = () => fails;
module.exports = { chromium, open, fa, kb, sleep, check, newProjectKb, failCount, TEST };
