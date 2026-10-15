// where the time goes on a slow phone (4x CPU): self time by function for a few common actions
const { launch, open } = require('../r48/lib');
const { build, seedOf, initScript } = require('../r47/seed10b');
const THROTTLE = +(process.env.THROTTLE || 4);
(async () => {
  const b = build();
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const { pg } = await open(browser, 'mocked.html', { ctx, init: initScript(seedOf(b.after)), wait: 1500 });
  const cdp = await ctx.newCDPSession(pg);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  async function prof(label, fn) {
    await cdp.send('Profiler.start');
    const t = await fn();
    const { profile } = await cdp.send('Profiler.stop');
    const self = new Map();
    const dt = profile.timeDeltas;
    const byId = new Map(profile.nodes.map((n) => [n.id, n]));
    profile.samples.forEach((id, i) => { const n = byId.get(id); const cf = n.callFrame; const k = `${cf.functionName || '(anon)'}${cf.lineNumber >= 0 && cf.url ? ` @${cf.lineNumber + 1}` : ''}`; self.set(k, (self.get(k) || 0) + (dt[i] || 0) / 1000); });
    const top = [...self].filter(([k]) => k !== '(idle)' && k !== '(program)').sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k}: ${v.toFixed(1)} ms`);
    console.log(`\n${label}: ${t.toFixed(0)} ms`); console.log('   ' + top.join('\n   '));
  }
  const timed = (sel) => pg.evaluate((s) => { const t0 = performance.now(); document.querySelector(s).click(); document.body.getBoundingClientRect(); return performance.now() - t0; }, sel);
  await prof('Overview: Mark done', () => timed('.next [data-act="set-task"][data-s="done"]'));
  await prof('Overview -> Plan tab', () => timed('#tab-plan'));
  await prof('Plan: status chip', () => timed('#f-milestones-m6-tasks-t6-02-st'));
  await prof('Plan: unfold M1', () => timed('#f-milestones-m1-fold'));
  await prof('Plan: notes toggle', () => timed('#f-milestones-m6-tasks-t6-03-nt'));
  await prof('Plan -> Improve', () => timed('#tab-improve'));
  await prof('Improve -> Overview', () => timed('#tab-overview'));
  await pg.focus('#f-milestones-m6-tasks-t6-03-title').catch(() => {});
  await browser.close();
})();
