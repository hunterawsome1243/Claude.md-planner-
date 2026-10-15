// Shared helpers for the final UX walkthrough.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const env = require('../helpers/env.js');
const DIR = __dirname;
const SHOTS = path.join(DIR, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const SEED = JSON.parse(fs.readFileSync(path.join(DIR, '..', 'fixtures', 'seed.json'), 'utf8'));

async function launch() { return chromium.launch(); }

async function openPage(browser, { width = 1280, height = 900, scheme = 'light', plain = false, init, wait = 600 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, deviceScaleFactor: 1, permissions: ['clipboard-read', 'clipboard-write'] });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push('console ' + m.text()); });
  await env.routeFonts(pg, true);
  if (init) await pg.addInitScript(init);
  await pg.goto(plain ? env.PLAIN : env.PAGE);
  await pg.waitForTimeout(wait);
  await pg.evaluate(() => document.fonts.ready);
  return { pg, ctx, errs };
}

async function shot(pg, name, opts = {}) {
  const f = path.join(SHOTS, name + '.png');
  await pg.screenshot({ path: f, fullPage: !!opts.full, ...(opts.clip ? { clip: opts.clip } : {}) });
  return f;
}
// screenshot the inner scrolling sheet in full by temporarily letting the document grow
async function sheetFull(pg, name) {
  await pg.addStyleTag({ content: 'html,body{height:auto!important}.app{height:auto!important}.sheet{overflow:visible!important}.rail{position:sticky;top:0;height:100vh}' }).catch(() => {});
  const f = await shot(pg, name, { full: true });
  await pg.evaluate(() => document.querySelectorAll('style').forEach((s) => { if (s.textContent.startsWith('html,body{height:auto!important}')) s.remove(); }));
  return f;
}

async function newProject(pg, name, idea, ai) {
  await pg.click('[data-act="new-project"] >> visible=true');
  await pg.fill('#np-name', name);
  if (idea != null) await pg.fill('#np-idea', idea);
  await pg.click(ai ? '[data-act="create-ai"]' : '[data-act="create"]');
  await pg.waitForTimeout(ai ? 800 : 200);
}
async function tab(pg, k) { await pg.click(`[data-act="tab"][data-k="${k}"]`); await pg.waitForTimeout(150); }
async function seed(pg, body = SEED, id = 'p-shipyard') {
  await pg.evaluate(([id, b]) => window.__mockEmitExternal(id, b), [id, body]);
  await pg.waitForTimeout(300);
}
// overflow check: anything wider than the viewport, and elements cut off
async function hscroll(pg) {
  return pg.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out = { doc: document.documentElement.scrollWidth, vw, sheet: document.querySelector('.sheet')?.scrollWidth, sheetClient: document.querySelector('.sheet')?.clientWidth, wide: [] };
    for (const el of document.querySelectorAll('#app *')) {
      const r = el.getBoundingClientRect();
      if (!r.width || el.closest('.rail')) continue;
      if (r.right > vw + 1) out.wide.push((el.className || el.tagName) + ' ' + Math.round(r.right));
    }
    out.wide = out.wide.slice(0, 15);
    return out;
  });
}
// tap targets under 24px (WCAG 2.2 AA minimum) or under 44 (comfortable on phone)
async function smallTargets(pg, min = 32) {
  return pg.evaluate((min) => {
    const out = [];
    for (const el of document.querySelectorAll('button, input, select, textarea, a[href], [role="tab"]')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || el.closest('[inert]')) continue;
      if (r.height < min || r.width < min) out.push(`${el.tagName.toLowerCase()}${el.dataset.act ? '[' + el.dataset.act + ']' : ''}${el.className ? '.' + String(el.className).split(' ').join('.') : ''} ${Math.round(r.width)}x${Math.round(r.height)} "${(el.textContent || el.getAttribute('aria-label') || el.placeholder || '').trim().slice(0, 30)}"`);
    }
    return [...new Set(out)];
  }, min);
}
module.exports = { launch, openPage, shot, sheetFull, newProject, tab, seed, hscroll, smallTargets, SEED, SHOTS, DIR };
