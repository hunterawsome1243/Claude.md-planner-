// Round 2: smaller flows: AI buttons after typing a pitch, focus after modals, rules into edited CLAUDE.md,
// delete failure, download failures, keyboard create.
const L = require('./lib');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toastOf = async (pg) => ((await pg.isHidden('#toast')) ? null : (await pg.textContent('#toast')));
(async () => {
  const b = await L.launch();

  // 1. blank project, type a pitch: do the Claude buttons appear?
  {
    const { pg, errs } = await L.open(b, 'mocked.html');
    await L.newProject(pg, 'Blank', '');
    L.check('blank: no AI buttons yet', (await pg.$$('[data-act="ai-fill"], .next [data-act="ai-plan"]')).length === 0);
    await pg.fill('#f-pitch', 'A tiny app that reminds me to water plants');
    await sleep(200);
    const n = (await pg.$$('[data-act="ai-fill"], .next [data-act="ai-plan"]')).length;
    L.check('after typing a pitch, "fill in the brief" / "draft a plan" buttons appear', n === 2, { buttons: n });
    await pg.click('[data-act="tab"][data-k="design"]');
    await pg.click('[data-act="tab"][data-k="overview"]');
    console.log('buttons after leaving and returning to Overview:', (await pg.$$('[data-act="ai-fill"], .next [data-act="ai-plan"]')).length);
    console.log('errors1', errs);
    await pg.context().close();
  }

  // 2. focus returns to the opener after closing a modal
  {
    const { pg, errs } = await L.open(b, 'mocked.html');
    await L.newProject(pg, 'Focus', 'x', true);
    await sleep(400);
    await pg.click('[data-act="tab"][data-k="plan"]');
    await pg.focus('.task >> nth=1 >> [data-act="prompt"]');
    await pg.keyboard.press('Enter');
    await sleep(50);
    await pg.keyboard.press('Escape');
    const f1 = await pg.evaluate(() => ({ tag: document.activeElement.tagName, act: document.activeElement.dataset?.act }));
    L.check('focus returns to the Prompt button after Escape', f1.act === 'prompt', f1);
    await pg.focus('[data-act="export"]');
    await pg.keyboard.press('Enter');
    await sleep(50);
    await pg.keyboard.press('Escape');
    const f2 = await pg.evaluate(() => ({ tag: document.activeElement.tagName, act: document.activeElement.dataset?.act }));
    L.check('focus returns to Export after Escape', f2.act === 'export', f2);
    // delete a task with the keyboard
    await pg.focus('.task >> nth=0 >> [data-act="del-task"]');
    await pg.keyboard.press('Enter');
    const f3 = await pg.evaluate(() => ({ tag: document.activeElement.tagName, cls: document.activeElement.className }));
    console.log('focus after deleting a task with the keyboard:', f3);
    console.log('errors2', errs);
    await pg.context().close();
  }

  // 3. rules into an edited CLAUDE.md
  {
    const { pg, errs } = await L.open(b, 'mocked.html');
    await L.newProject(pg, 'Rules', 'x');
    await pg.click('[data-act="tab"][data-k="claudemd"]');
    await pg.fill('#f-claudeMd', '# Rules\n\n## Lessons learned\n- old rule\n\n## Commands\nnpm test\n');
    await pg.click('[data-act="tab"][data-k="improve"]');
    await pg.click('[data-act="add-lesson"]');
    await pg.keyboard.type('x');
    await pg.fill('.l-b', 'New rule one');
    await pg.click('[data-act="promote"]');
    await pg.click('[data-act="tab"][data-k="claudemd"]');
    const md = await pg.inputValue('#f-claudeMd');
    L.check('promoted rule lands under Lessons learned', md === '# Rules\n\n## Lessons learned\n- old rule\n- New rule one\n\n## Commands\nnpm test\n', JSON.stringify(md));
    console.log('errors3', errs);
    await pg.context().close();
  }

  // 4. delete fails at the store
  {
    const { pg, errs } = await L.open(b, 'mocked.html');
    await L.newProject(pg, 'Sticky', 'x');
    await sleep(300);
    await pg.evaluate(() => { const m = window.__mockDocs; m.delete = () => { throw { code: 'unavailable', message: 'nope' }; }; });
    await pg.click('#more-btn'); await pg.click('[data-act=\"ask-delete\"]');
    await pg.click('[data-act="delete-project"]');
    await sleep(300);
    L.check('failed delete restores project + says so', (await L.active(pg)) === 'Sticky' && /Could not delete/.test(await toastOf(pg) || ''), { active: await L.active(pg), toast: await toastOf(pg) });
    await pg.fill('#f-audience', 'after failed delete');
    await sleep(1100);
    const d = await L.mockDoc(pg, 'Sticky');
    L.check('edits after failed delete still save', d && d.audience === 'after failed delete', d && d.audience);
    console.log('errors4', errs);
    await pg.context().close();
  }

  // 5. downloads failures
  for (const code of ['declined', 'rate_limited', 'not_granted']) {
    const init = (c) => {
      let real;
      Object.defineProperty(window, 'claude', {
        configurable: true, get() { return real; },
        set(v) { real = Object.freeze({ use: async (n) => { const x = await v.use(n); if (n !== 'downloads') return x; return Object.freeze({ save: async () => { throw { code: c, message: 'mock' }; } }); } }); },
      });
    };
    const { pg, errs } = await L.open(b, 'mocked.html', { init: `(${init})(${JSON.stringify(code)})` });
    await L.newProject(pg, 'Dl', 'x');
    await pg.click('[data-act="tab"][data-k="claudemd"]');
    await pg.click('[data-act="download-md"]');
    await sleep(150);
    console.log(`download ${code}: toast=`, await toastOf(pg), '| download button still shown:', (await pg.$$('[data-act="download-md"]')).length);
    console.log('errors5', errs);
    await pg.context().close();
  }

  // 6. keyboard-only create with Claude
  {
    const { pg, errs } = await L.open(b, 'mocked.html');
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.keyboard.type('Keys');
    await pg.keyboard.press('Enter');
    await pg.keyboard.type('An idea typed with keys');
    await pg.keyboard.press('Control+Enter');
    await sleep(700);
    L.check('ctrl+enter creates with Claude', (await L.active(pg)) === 'Keys' && (await pg.inputValue('#f-audience')) !== '', await pg.inputValue('#f-pitch'));
    console.log('errors6', errs);
    await pg.context().close();
  }
  await b.close();
})();
