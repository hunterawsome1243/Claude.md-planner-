// Focus indicator strength for every focusable control on every tab and dialog, light and dark, 1280 and 390.
// Indicator = strongest of: outline vs surroundings, border colour change, added box-shadow vs surroundings, background change.
const { chromium, open, sleep, check, failCount } = require('./k');
const env = require('../helpers/env.js');
const MEASURE = () => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return [0, 0, 0, 0]; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] == null ? 1 : p[3]]; };
  const over = (top, bot) => { const a = top[3]; return [top[0] * a + bot[0] * (1 - a), top[1] * a + bot[1] * (1 - a), top[2] * a + bot[2] * (1 - a), 1]; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const behind = (el) => { const chain = []; for (let e = el.parentElement; e; e = e.parentElement) chain.push(parse(getComputedStyle(e).backgroundColor)); let c = parse(getComputedStyle(document.body).backgroundColor); c = c[3] ? c : [255, 255, 255, 1]; for (let i = chain.length - 1; i >= 0; i--) if (chain[i][3]) c = over(chain[i], c); return c; };
  const st = (el) => { const s = getComputedStyle(el); return { os: s.outlineStyle, ow: parseFloat(s.outlineWidth), oc: s.outlineColor, oo: parseFloat(s.outlineOffset), bs: s.boxShadow, bc: s.borderBottomColor, bw: parseFloat(s.borderBottomWidth), bg: s.backgroundColor }; };
  const sel = 'a[href], button, input, select, textarea';
  const els = [...document.querySelectorAll(sel)].filter((x) => !x.disabled && x.getClientRects().length && getComputedStyle(x).visibility !== 'hidden' && !x.closest('[inert]'));
  const out = [];
  for (const el of els) {
    document.activeElement?.blur?.();
    const u = st(el);
    el.focus();
    if (document.activeElement !== el) continue;
    const f = st(el);
    const fv = el.matches(':focus-visible');
    const B = behind(el);
    const ownU = over(parse(u.bg), B); const ownF = over(parse(f.bg), B);
    const oc = f.os !== 'none' && f.ow >= 1 ? ratio(over(parse(f.oc), f.oo < 0 ? ownF : B), f.oo < 0 ? ownF : B) : 0;
    const bc = f.bw >= 1 ? ratio(over(parse(f.bc), ownF), over(parse(u.bc), ownU)) : 1;
    let sc = 0;
    if (f.bs !== 'none' && f.bs !== u.bs) { const m = f.bs.match(/rgba?\([^)]+\)/); if (m) sc = ratio(over(parse(m[0]), B), B); }
    const gc = ratio(ownF, ownU);
    const best = Math.max(oc, bc, sc, gc);
    const name = el.tagName.toLowerCase() + (el.id ? '#' + el.id.replace(/-[a-z0-9]{10,}/g, '-*') : '') + (el.dataset.act ? '[' + el.dataset.act + ']' : '') + '.' + [...el.classList].join('.') + (el.dataset.l ? '[L=' + el.dataset.l + ']' : '') + (el.dataset.s ? '[s=' + el.dataset.s + ']' : '');
    out.push({ name, fv, best: +best.toFixed(2), oc: +oc.toFixed(2), bc: +bc.toFixed(2), sc: +sc.toFixed(2), gc: +gc.toFixed(2) });
  }
  document.activeElement?.blur?.();
  return out;
};
(async () => {
  const b = await chromium.launch();
  const weak = new Map();
  for (const scheme of ['light', 'dark']) for (const w of [1280, 390]) {
    const { pg, errs } = await open(b, 'mocked.html', { scheme, viewport: { width: 1280, height: 900 } });
    await env.populate(pg);
    await pg.click('[data-act="tab"][data-k="plan"]');
    // make one task size L so the L select is measured; open a confirm
    await pg.selectOption('select.size >> nth=0', 'L');
    await pg.click('[data-act="ask-del-ms"] >> nth=0');
    await pg.setViewportSize({ width: w, height: w === 390 ? 844 : 900 }); await sleep(150);
    await pg.keyboard.press('Shift'); // keyboard modality so programmatic focus shows :focus-visible
    const all = [];
    for (const t of ['overview', 'design', 'plan', 'claudemd', 'improve']) {
      await pg.evaluate((k) => document.querySelector(`[data-act="tab"][data-k="${k}"]`).click(), t); await sleep(80);
      if (t === 'design' && !(await pg.$('[data-act="del-screen"]'))) { await pg.evaluate(() => { document.querySelector('[data-act="add-screen"]').click(); document.querySelector('[data-act="add-decision"]').click(); }); }
      if (t === 'claudemd') { await pg.evaluate(() => { const ta = document.querySelector('#f-claudeMd'); ta.value += '\nx'; ta.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(50); await pg.evaluate(() => document.querySelector('[data-act="ask-rebuild"]').click()); }
      await pg.keyboard.press('Shift');
      for (const r of await pg.evaluate(MEASURE)) all.push({ ...r, tab: t });
    }
    if (w === 390) { await pg.evaluate(() => document.querySelector('[data-act="open-drawer"]').click()); await sleep(300); await pg.keyboard.press('Shift'); for (const r of await pg.evaluate(MEASURE)) all.push({ ...r, tab: 'drawer' }); await pg.keyboard.press('Escape'); }
    await pg.evaluate(() => document.querySelector('[data-act="tab"][data-k="plan"]').click()); await sleep(50); await pg.evaluate(() => document.querySelector('[data-act="prompt"]').click()); await sleep(100);
    await pg.keyboard.press('Shift');
    for (const r of await pg.evaluate(MEASURE)) all.push({ ...r, tab: 'prompt-dialog' });
    await pg.keyboard.press('Escape');
    await pg.evaluate(() => document.querySelector('#rail [data-act="new-project"]').click()); await sleep(100); await pg.keyboard.press('Shift');
    for (const r of await pg.evaluate(MEASURE)) all.push({ ...r, tab: 'new-dialog' });
    await pg.keyboard.press('Escape');
    const notFV = all.filter((r) => !r.fv && r.best < 3).map((r) => r.name);
    const byName = new Map();
    for (const r of all) { const k = r.name; if (!byName.has(k) || byName.get(k).best > r.best) byName.set(k, r); }
    const low = [...byName.values()].filter((r) => r.best < 2);
    console.log(`\n[${scheme} ${w}] measured ${all.length} focus states, ${byName.size} kinds; weakest five:`);
    [...byName.values()].sort((a, b) => a.best - b.best).slice(0, 5).forEach((r) => console.log('   ', r.best, r.name, JSON.stringify({ outline: r.oc, border: r.bc, shadow: r.sc, bg: r.gc, tab: r.tab })));
    check(`[${scheme} ${w}] every control shows a focus change of at least 2:1`, low.length === 0, low.map((r) => `${r.name} (${r.best})`));
    if (errs.length) console.log('errors', errs);
    await pg.context().close();
  }
  console.log('\nfails:', failCount());
  await b.close();
})();
