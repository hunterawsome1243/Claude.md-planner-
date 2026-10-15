const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const TEST = process.env.TESTDIR || path.join(__dirname, '..', '..');
const OUT = __dirname;

// Builds an extra variant whose sample() (text) can be made to fail, without touching mock.js.
function buildVariant() {
  const src = fs.readFileSync(path.join(TEST, '..', 'dist', 'shipyard.html'), 'utf8');
  const head = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>';
  const mock = fs.readFileSync(path.join(TEST, 'mock.js'), 'utf8');
  const wrap = `(function(){const orig=window.claude;window.claude=Object.freeze({use:async(n)=>{const c=await orig.use(n);if(n!=='sample'||!c)return c;const f=(i,o)=>window.__STREAM__?new Promise((res,rej)=>{const part='Sharpened (partial): do the ta';const t1=setTimeout(()=>{o.onText&&o.onText({text:part,delta:part});},150);const t2=setTimeout(()=>res({text:part+'sk well.',truncated:false}),2000);o.signal&&o.signal.addEventListener('abort',()=>{clearTimeout(t1);clearTimeout(t2);rej({code:'cancelled',message:'aborted',text:window.__STREAMED__?part:undefined});});setTimeout(()=>{window.__STREAMED__=true;},150);}):window.__TEXT_FAIL__?Promise.reject({code:window.__TEXT_FAIL__,message:'mock text failure',text:window.__TEXT_FAIL_PARTIAL__}):c(i,o);f.json=c.json;f.limits=c.limits;return Object.freeze(f);}});})();`;
  fs.writeFileSync(path.join(OUT, 'variant.html'), head + '<script>' + mock + '\n' + wrap + '</script>' + src + '</body></html>');
}

async function launch() { return chromium.launch(); }

async function open(browser, file, opts = {}) {
  const ctx = opts.ctx || await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 900 } });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  pg.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|ERR_FAILED/.test(m.text())) errs.push('console ' + m.text()); });
  await pg.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  if (opts.init) await pg.addInitScript(opts.init);
  const url = file.startsWith('/') ? 'file://' + file : 'file://' + path.join(TEST, file);
  await pg.goto(url);
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

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' :: ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''));
}

const active = (pg) => pg.evaluate(() => {
  // the project shown: find doc by name in mockDocs if any
  return document.querySelector('#f-name')?.value ?? null;
});
const mockDoc = (pg, name) => pg.evaluate((n) => { for (const [id, b] of window.__mockDocs) if (b.name === n) return { id, ...b }; return null; }, name);
const lsData = (pg) => pg.evaluate(() => JSON.parse(localStorage.getItem('shipyard.projects.v1') || 'null'));

module.exports = { launch, open, newProject, check, results, active, mockDoc, lsData, buildVariant, OUT, TEST };
