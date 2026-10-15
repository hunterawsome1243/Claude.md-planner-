// Under load, the test browser now and then gives a page a copy of the page's storage that no other page shares, so
// what it stores never reaches the next page (and it starts without what earlier pages stored). A person's browser does
// not do this between visits. openShared opens a page and checks, with a second page, that the two share storage;
// when they do not, it opens the page again.
const path = require('path');
const { open, TEST } = require('../r48/lib');
async function shares(pg, ctx) {
  const mark = 'test.mark.' + Math.random().toString(36).slice(2);
  try { await pg.evaluate((m) => localStorage.setItem(m, '1'), mark); } catch { return false; }
  let ok = false;
  for (let i = 0; i < 4 && !ok; i++) {
    const probe = await ctx.newPage();
    await probe.goto('file://' + path.join(TEST, 'mock.js'));
    ok = await probe.evaluate((m) => localStorage.getItem(m) === '1', mark);
    await probe.close();
    if (!ok) await new Promise((r) => setTimeout(r, 400));
  }
  await pg.evaluate((m) => localStorage.removeItem(m), mark).catch(() => {});
  return ok;
}
async function openShared(browser, file, opts) {
  let r;
  for (let i = 0; i < 6; i++) {
    r = await open(browser, file, opts);
    if (await shares(r.pg, opts.ctx)) return r;
    await r.pg.close();
    await new Promise((res) => setTimeout(res, 800));
  }
  throw new Error('the test browser kept giving ' + file + ' storage of its own');
}
module.exports = { openShared, shares };
