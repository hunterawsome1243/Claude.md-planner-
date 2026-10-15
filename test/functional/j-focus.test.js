// Round 2: where keyboard focus lands after row actions that remove or disable the activated control.
const L = require('./lib');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await L.launch();
  const { pg, errs } = await L.open(b, 'mocked.html');
  await L.newProject(pg, 'Kbd', 'x', true);
  await sleep(400);
  await pg.click('[data-act="tab"][data-k="plan"]');
  const fa = () => pg.evaluate(() => { const a = document.activeElement; return a === document.body ? 'BODY' : (a.dataset?.act || a.id || a.tagName); });
  const out = {};
  await pg.focus('[data-act="ms-move"][data-d="1"] >> nth=0'); await pg.keyboard.press('Enter'); out.moveDownIntoLastSlot = await fa();
  await pg.focus('[data-act="ask-del-ms"] >> nth=0'); await pg.keyboard.press('Enter'); out.askDeleteMilestone = await fa();
  await pg.focus('.ms .confirm [data-act="cancel-confirm"]'); await pg.keyboard.press('Enter'); out.keepIt = await fa();
  await pg.focus('[data-act="ai-plan"]'); await pg.keyboard.press('Enter'); await sleep(500);
  await pg.focus('[data-act="prop-accept"]'); await pg.keyboard.press('Enter'); out.addSelected = await fa();
  console.log(JSON.stringify(out));
  console.log('errors', errs);
  await b.close();
})();
