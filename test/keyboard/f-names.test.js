// Accessible names and states from Chromium's accessibility tree for every focusable node, on every tab and dialog,
// plus tablist arrow-key behaviour.
const { chromium, open, fa, kb, sleep, check, failCount } = require('./k');
const env = require('../helpers/env.js');
async function axScan(pg, label) {
  const cdp = await pg.context().newCDPSession(pg);
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  const prop = (n, k) => n.properties?.find((p) => p.name === k)?.value?.value;
  const bad = [];
  const seen = [];
  for (const n of nodes) {
    if (n.ignored) continue;
    if (!prop(n, 'focusable')) continue;
    const role = n.role?.value; const name = (n.name?.value || '').trim();
    seen.push(role + ':' + name.slice(0, 40));
    if (!name && !['RootWebArea', 'generic', 'none'].includes(role)) bad.push({ role, name, desc: n.description?.value });
  }
  await cdp.detach();
  check(`[${label}] every focusable node has an accessible name (${seen.length} nodes)`, bad.length === 0, bad);
  return seen;
}
(async () => {
  const b = await chromium.launch();
  const { pg, errs } = await open(b, 'mocked.html');
  await axScan(pg, 'welcome');
  await env.populate(pg);
  for (const t of ['overview', 'design', 'plan', 'claudemd', 'improve']) {
    await pg.click(`[data-act="tab"][data-k="${t}"]`); await sleep(100);
    if (t === 'plan') { await pg.click('[data-act="toggle-notes"] >> nth=0'); await pg.click('[data-act="ai-plan"]'); await sleep(700); await pg.click('[data-act="ask-del-ms"] >> nth=0'); }
    if (t === 'design') { await pg.click('[data-act="add-screen"]'); await pg.click('[data-act="add-decision"]'); await pg.click('[data-act="add-feature"][data-p="could"]'); await pg.click('[data-act="ai-features"]'); await sleep(700); }
    const seen = await axScan(pg, t);
    if (t === 'plan') console.log('  plan sample:', seen.filter((s) => /button:(To do|In progress|Done|Show|Hide|Delete task|Prompt)/.test(s)).slice(0, 8).join(' | '));
    if (t === 'design') console.log('  design sample:', seen.filter((s) => /button:(Delete|To do|In progress)|combobox|textbox:$/.test(s)).slice(0, 10).join(' | '));
  }
  await pg.click('[data-act="tab"][data-k="overview"]');
  await pg.click('.next [data-act="prompt"]'); await axScan(pg, 'prompt dialog'); await pg.keyboard.press('Escape');
  await pg.click('[data-act="export"]'); await axScan(pg, 'export dialog'); await pg.keyboard.press('Escape');
  await pg.click('#rail [data-act="new-project"]'); await axScan(pg, 'new dialog'); await pg.keyboard.press('Escape');
  // tablist pattern: arrow keys and tab stops
  await pg.focus('#tab-overview');
  await pg.keyboard.press('ArrowRight'); await sleep(50);
  const afterArrow = await fa(pg);
  const tabStops = await pg.evaluate(() => [...document.querySelectorAll('[role="tab"]')].filter((t) => t.tabIndex >= 0).length);
  check('role="tab" buttons follow the tabs pattern (ArrowRight moves to the next tab; one tab stop)', /tab-design/.test(afterArrow) && tabStops === 1, { afterArrowRight: afterArrow, tabStopsInTablist: tabStops });
  // Tab names with counts
  console.log('  tab names:', await pg.evaluate(() => [...document.querySelectorAll('[role="tab"]')].map((t) => t.textContent).join(' | ')));
  console.log('errors', errs);
  console.log('\nfails:', failCount());
  await b.close();
})();
