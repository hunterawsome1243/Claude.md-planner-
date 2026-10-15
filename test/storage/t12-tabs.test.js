// Plain (localStorage) mode with two tabs: live updates, deletes, and no write ping-pong.
const { chromium, open, newProject } = require('./h');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const { pg: A } = await open(b, 'plain.html', { ctx });
  await newProject(A, 'One', 'idea', false);
  await newProject(A, 'Two', 'idea', false);
  await sleep(400);
  const { pg: B } = await open(b, 'plain.html', { ctx });
  await B.evaluate(() => { window.__writes = 0; const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === 'shipyard.projects.v1') window.__writes++; return o.call(this, k, v); }; });
  await A.evaluate(() => { window.__writes = 0; const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === 'shipyard.projects.v1') window.__writes++; return o.call(this, k, v); }; });
  const rail = (pg) => pg.$$eval('#plist .nm', (e) => e.map((x) => x.textContent).join(','));
  console.log('B rail at start:', await rail(B), ' B active name:', await B.inputValue('#f-name'));
  await A.fill('#f-name', 'Two (renamed in A)'); await sleep(600);
  console.log('B rail after A renames:', await rail(B), ' B field:', await B.inputValue('#f-name'));
  // B is typing in the same project's audience while A renames again
  await B.click('#f-audience'); await B.keyboard.type('typed in B');
  await A.fill('#f-name', 'Two (renamed again in A)');
  await sleep(800);
  console.log('after overlap: A name =', await A.inputValue('#f-name'), ' B name =', await B.inputValue('#f-name'), ' LS name =', await A.evaluate(() => Object.values(JSON.parse(localStorage.getItem('shipyard.projects.v1'))).map((p) => p.name).join(',')));
  // delete in B
  await B.click('#more-btn'); await B.click('[data-act=\"ask-delete\"]'); await B.click('[data-act="delete-project"]'); await sleep(400);
  console.log('after B deletes active project: A rail =', await rail(A), ' B rail =', await rail(B));
  const w0 = [await A.evaluate(() => window.__writes), await B.evaluate(() => window.__writes)];
  await sleep(2000);
  const w1 = [await A.evaluate(() => window.__writes), await B.evaluate(() => window.__writes)];
  console.log('LS writes A,B before idle', w0, 'after 2 s idle', w1);
  await b.close();
})();
