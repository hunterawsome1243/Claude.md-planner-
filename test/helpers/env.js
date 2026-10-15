// Shared setup: serve Google Fonts from a local cache (real fonts, no network wait) or block them.
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
exports.PAGE = 'file://' + path.join(DIR, '..', 'mocked.html');
exports.PLAIN = 'file://' + path.join(DIR, '..', 'plain.html');
exports.routeFonts = async (pg, real) => {
  // Real fonts are served from test/visual/ when a font cache is there; otherwise they are blocked.
  if (real && !fs.existsSync(path.join(DIR, '..', 'visual', 'fonts.css'))) real = false;
  if (!real) { await pg.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); return; }
  await pg.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: fs.readFileSync(path.join(DIR, '..', 'visual', 'fonts.css'), 'utf8'), headers: { 'access-control-allow-origin': '*' } }));
  await pg.route(/fonts\.gstatic\.com/, (r) => {
    const f = path.join(DIR, '..', 'visual', 'fontcache', r.request().url().replace('https://fonts.gstatic.com/', '').replace(/\//g, '_'));
    if (!fs.existsSync(f)) return r.abort();
    return r.fulfill({ status: 200, contentType: 'font/woff2', body: fs.readFileSync(f), headers: { 'access-control-allow-origin': '*' } });
  });
};
exports.populate = async (pg) => {
  await pg.setViewportSize({ width: 1280, height: 900 });
  await pg.click('.rail [data-act="new-project"]');
  await pg.fill('#np-name', 'Recipe Box');
  await pg.fill('#np-idea', 'Save recipes from links and plan meals for the week');
  await pg.click('[data-act="create-ai"]');
  await pg.waitForSelector('[data-act="prompt"]', { timeout: 5000 });
  await pg.click('[data-act="tab"][data-k="improve"]');
  await pg.click('[data-act="ai-review"]');
  await pg.waitForSelector('.review', { timeout: 5000 });
  await pg.click('[data-act="add-lesson"]');
  await pg.keyboard.type('Claude rewrote the whole page when I asked for a button.');
  await pg.fill('[data-path$=".change"]', 'Only change the files the task names.');
  await pg.click('[data-act="tab"][data-k="overview"]');
  await pg.waitForTimeout(300);
};
