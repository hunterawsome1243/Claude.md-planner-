// Round 2: Claude actions, failures, Stop, proposals per project.
const L = require('./lib');
L.buildVariant();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toastOf = async (pg) => ((await pg.isHidden('#toast')) ? null : (await pg.textContent('#toast')));

(async () => {
  const b = await L.launch();

  // 1. create-with-Claude failure paths keep the idea
  for (const code of ['rate_limited', 'not_granted', 'cancelled', 'refused']) {
    const { pg, errs } = await L.open(b, 'mocked.html');
    if (code !== 'cancelled') await pg.evaluate((c) => { window.__SAMPLE_FAIL__ = c; }, code);
    else await pg.evaluate(() => { window.__SAMPLE_DELAY__ = 2000; });
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Fails');
    await pg.fill('#np-idea', 'My carefully written idea about a habit tracker\nwith streaks');
    await pg.click('[data-act="create-ai"]');
    await sleep(100);
    L.check(`create-ai ${code}: working indicator`, (await pg.$$('.working')).length === 1);
    if (code === 'cancelled') await pg.click('[data-act="stop"]');
    await sleep(500);
    const pitch = await pg.inputValue('#f-pitch');
    L.check(`create-ai ${code}: idea kept as pitch`, pitch.includes('habit tracker') && pitch.includes('streaks'), { pitch, toast: await toastOf(pg) });
    L.check(`create-ai ${code}: no spinner`, (await pg.$$('.working')).length === 0);
    if (code === 'not_granted') {
      L.check('not_granted: AI buttons hidden everywhere', (await pg.$$('.btn.ai')).length === 0);
      await pg.click('[data-act="new-project"] >> visible=true');
      L.check('not_granted: create-ai gone, Create primary', (await pg.$$('[data-act="create-ai"]')).length === 0 && (await pg.getAttribute('[data-act="create"]', 'class')).includes('primary'));
      await pg.keyboard.press('Escape');
    } else if (code !== 'cancelled') {
      L.check(`create-ai ${code}: ai-fill retry offered`, (await pg.$$('[data-act="ai-fill"]')).length === 1);
      await pg.evaluate(() => { window.__SAMPLE_FAIL__ = null; });
      if (await pg.$('[data-act="ai-fill"]')) {
        await pg.click('[data-act="ai-fill"]');
        await sleep(500);
        L.check(`create-ai ${code}: retry fill works`, (await pg.inputValue('#f-audience')) !== '' && (await pg.inputValue('#f-pitch')).includes('habit tracker'), { a: await pg.inputValue('#f-audience'), p: await pg.inputValue('#f-pitch') });
      }
    }
    console.log('errors', code, errs);
    await pg.context().close();
  }

  // 2. each AI action with rate_limited, then not_granted
  {
    const { pg, errs } = await L.open(b, 'mocked.html');
    await L.newProject(pg, 'Errs', 'pitch here');
    await pg.evaluate(() => { window.__SAMPLE_FAIL__ = 'rate_limited'; });
    for (const [tab, act] of [['plan', 'ai-plan'], ['design', 'ai-features'], ['improve', 'ai-review']]) {
      await pg.click(`[data-act="tab"][data-k="${tab}"]`);
      await pg.click(`[data-act="${act}"]`);
      await sleep(450);
      L.check(`rate_limited ${act}: toast + recovers`, /busy|usage limit/.test(await toastOf(pg) || '') && (await pg.$$('.working')).length === 0 && !(await pg.isDisabled(`[data-act="${act}"]`)), await toastOf(pg));
    }
    await pg.evaluate(() => { window.__SAMPLE_FAIL__ = 'not_granted'; });
    await pg.click('[data-act="ai-review"]');
    await sleep(450);
    L.check('not_granted: toast', /not available/.test(await toastOf(pg) || ''), await toastOf(pg));
    L.check('not_granted: review button gone', (await pg.$$('[data-act="ai-review"]')).length === 0);
    for (const t of ['overview', 'design', 'plan']) { await pg.click(`[data-act="tab"][data-k="${t}"]`); }
    L.check('not_granted: no AI buttons on plan', (await pg.$$('.btn.ai')).length === 0);
    await pg.click('[data-act="tab"][data-k="plan"]');
    await pg.click('[data-act="add-ms"]');
    await pg.click('[data-act="add-task"]');
    await pg.keyboard.type('Task');
    await pg.click('[data-act="prompt"]');
    L.check('not_granted: no Sharpen in prompt modal', (await pg.$$('[data-act="sharpen"]')).length === 0);
    await pg.keyboard.press('Escape');
    console.log('errors2', errs);
    await pg.context().close();
  }

  // 3. Overview "Ask Claude to draft a plan" + Overview "fill in the brief"
  {
    const { pg, errs } = await L.open(b, 'mocked.html');
    await L.newProject(pg, 'Plan me', 'A pitch line');
    L.check('overview: fill-brief button', (await pg.$$('[data-act="ai-fill"]')).length === 1);
    await pg.click('.next [data-act="ai-plan"]');
    await sleep(80);
    L.check('overview ai-plan switches to Plan with progress', (await pg.getAttribute('#tab-plan', 'aria-selected')) === 'true' && (await pg.$$('.working')).length === 1);
    await sleep(500);
    L.check('plan proposal shown', (await pg.$$('.proposal')).length === 1);
    await pg.click('[data-act="tab"][data-k="overview"]');
    await pg.click('[data-act="ai-fill"]');
    await sleep(80);
    L.check('ai-fill working', (await pg.$$('.working')).length === 1 && (await pg.isDisabled('[data-act="ai-fill"]')));
    await sleep(500);
    L.check('ai-fill keeps pitch, fills rest', (await pg.inputValue('#f-pitch')) === 'A pitch line' && (await pg.inputValue('#f-audience')) === 'Me and my partner');
    // proposals survive project switches
    await L.newProject(pg, 'Other', 'x');
    await pg.click('.pitem:has-text("Plan me")');
    await pg.click('[data-act="tab"][data-k="plan"]');
    L.check('proposal survives switching', (await pg.$$('.proposal')).length === 1);
    // in-flight plan when switching
    await pg.click('[data-act="prop-discard"]');
    await pg.evaluate(() => { window.__SAMPLE_DELAY__ = 700; });
    await pg.click('[data-act="ai-plan"]');
    await pg.click('.pitem:has-text("Other")');
    await sleep(900);
    L.check('Other project has no proposal from Plan me', (await pg.$$('.proposal')).length === 0);
    await pg.click('.pitem:has-text("Plan me")');
    await pg.click('[data-act="tab"][data-k="plan"]');
    L.check('in-flight plan proposal visible after switching back', (await pg.$$('.proposal')).length === 1);
    // features proposal for one project + plan proposal for same project: both stay
    await pg.evaluate(() => { window.__SAMPLE_DELAY__ = 0; });
    await pg.click('[data-act="tab"][data-k="design"]');
    await pg.click('[data-act="ai-features"]');
    await sleep(400);
    await pg.click('[data-act="tab"][data-k="plan"]');
    L.check('features request does not replace the plan proposal', (await pg.$$('.proposal')).length === 1);
    console.log('errors3', errs);
    await pg.context().close();
  }

  // 4. Sharpen failures and Stop (variant page)
  {
    const { pg, errs } = await L.open(b, L.OUT + '/variant.html');
    await L.newProject(pg, 'Sharp', 'x', true);
    await sleep(400);
    await pg.click('.next [data-act="prompt"]');
    await pg.fill('#m-prompt', 'My own carefully edited prompt');
    for (const code of ['rate_limited', 'upstream_error']) {
      await pg.evaluate((c) => { window.__TEXT_FAIL__ = c; window.__TEXT_FAIL_PARTIAL__ = 'partial junk'; }, code);
      await pg.click('[data-act="sharpen"]');
      await sleep(150);
      L.check(`sharpen ${code}: keeps prompt`, (await pg.inputValue('#m-prompt')) === 'My own carefully edited prompt', await pg.inputValue('#m-prompt'));
      L.check(`sharpen ${code}: buttons back`, !(await pg.isDisabled('[data-act="copy-prompt"]')));
    }
    await pg.evaluate(() => { window.__TEXT_FAIL__ = null; window.__STREAM__ = true; });
    await pg.click('[data-act="sharpen"]');
    await sleep(300);
    await pg.click('[data-act="stop-sharpen"]');
    await sleep(100);
    L.check('stop mid-stream restores prompt', (await pg.inputValue('#m-prompt')) === 'My own carefully edited prompt', await pg.inputValue('#m-prompt'));
    // escape mid-sharpen with a confirm behind
    await pg.keyboard.press('Escape');
    await pg.click('#more-btn'); await pg.click('[data-act=\"ask-delete\"]');
    await pg.click('.next [data-act="prompt"]');
    await pg.click('[data-act="sharpen"]');
    await sleep(50);
    await pg.keyboard.press('Escape');
    L.check('escape during sharpen keeps modal + confirm', (await pg.$$('.modal')).length === 1 && (await pg.$$('.phead .confirm')).length === 1);
    await pg.click('[data-act="close-modal"]');
    await sleep(2200);
    L.check('closing during sharpen leaves no modal', (await pg.$$('.modal')).length === 0);
    await pg.evaluate(() => { window.__STREAM__ = false; window.__TEXT_FAIL__ = 'not_granted'; });
    await pg.click('.next [data-act="prompt"]');
    await pg.click('[data-act="sharpen"]');
    await sleep(150);
    L.check('sharpen not_granted hides Sharpen', (await pg.$$('[data-act="sharpen"]')).length === 0);
    console.log('errors4', errs);
    await pg.context().close();
  }
  await b.close();
})();
