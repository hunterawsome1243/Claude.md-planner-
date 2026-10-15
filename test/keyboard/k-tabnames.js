// Accessible names Chromium computes for the tabs (which carry a count badge) and the status chips.
const { chromium, open, sleep } = require('./k');
const env = require('../helpers/env.js');
(async () => {
  const b = await chromium.launch();
  const { pg } = await open(b, 'mocked.html');
  await env.populate(pg);
  const cdp = await pg.context().newCDPSession(pg);
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  console.log('tabs:', nodes.filter((n) => n.role?.value === 'tab').map((n) => JSON.stringify(n.name?.value)).join(' '));
  await pg.click('[data-act="tab"][data-k="plan"]'); await sleep(100);
  const r = await cdp.send('Accessibility.getFullAXTree');
  const chips = r.nodes.filter((n) => n.role?.value === 'button' && /^(To do|In progress|Done)$/i.test(n.name?.value || ''));
  console.log('chips:', chips.slice(0, 3).map((n) => `${JSON.stringify(n.name.value)} desc=${JSON.stringify(n.description?.value)}`).join(' | '));
  await b.close();
})();
