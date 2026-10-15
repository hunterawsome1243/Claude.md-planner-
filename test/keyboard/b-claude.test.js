// Focus while and after Claude works in the sheet: ai-plan, ai-features, ai-review, ai-fill, Stop, proposals, review Add.
const { chromium, open, fa, kb, sleep, check, newProjectKb, failCount } = require('./k');
(async () => {
  const b = await chromium.launch();
  for (const w of [1280, 390]) {
    console.log(`\n===== width ${w} =====`);
    const vp = { width: w, height: w === 390 ? 844 : 900 };
    const { pg, errs } = await open(b, 'mocked.html', { viewport: vp });
    await pg.evaluate(() => { window.__SAMPLE_DELAY__ = 500; });
    await newProjectKb(pg, 'Recipe Box', 'Save recipes from links', true);
    await sleep(600);
    // ai-plan on Plan tab
    await kb(pg, '[data-act="tab"][data-k="plan"]');
    await kb(pg, '[data-act="ai-plan"]');
    await sleep(60);
    const f1 = await fa(pg);
    check(`[${w}] focus right after Enter on "Ask Claude for the next milestones" is not BODY`, f1 !== 'BODY', f1);
    await sleep(700);
    const f2 = await fa(pg);
    check(`[${w}] focus after the milestone proposal arrives is not BODY`, f2 !== 'BODY', f2);
    await pg.keyboard.press('Tab');
    console.log('  next Tab goes to:', await fa(pg));
    // proposal toggle + accept
    await kb(pg, '[data-act="prop-toggle"][data-kind="plan"][data-i="0"]', 'Space');
    console.log('  accept label after unticking one:', await pg.textContent('[data-act="prop-accept"]'));
    await kb(pg, '[data-act="prop-accept"]');
    const f3 = await fa(pg);
    check(`[${w}] focus after "Add N selected" goes to the Claude button`, /\[ai-plan\]/.test(f3), f3);
    // Stop
    await kb(pg, '[data-act="ai-plan"]');
    await sleep(60);
    await pg.focus('[data-act="stop"]');
    console.log('  focused Stop:', await fa(pg));
    await pg.keyboard.press('Enter');
    await sleep(100);
    const f4 = await fa(pg);
    check(`[${w}] focus after Enter on Stop is not BODY`, f4 !== 'BODY', f4);
    // Stop button focused when Claude finishes on its own
    await kb(pg, '[data-act="ai-plan"]');
    await sleep(60);
    await pg.focus('[data-act="stop"]');
    await sleep(700);
    const f4b = await fa(pg);
    check(`[${w}] focus on Stop when Claude finishes is not lost to BODY`, f4b !== 'BODY', f4b);
    // discard
    if (await pg.$('[data-act="prop-discard"]')) {
      await kb(pg, '[data-act="prop-discard"]');
      const f5 = await fa(pg);
      check(`[${w}] focus after Discard goes to the Claude button`, /\[ai-plan\]/.test(f5), f5);
    }
    // ai-features on Design
    await kb(pg, '[data-act="tab"][data-k="design"]');
    await kb(pg, '[data-act="ai-features"]');
    await sleep(60);
    const f6 = await fa(pg);
    check(`[${w}] focus right after Enter on "Ask Claude for feature ideas" is not BODY`, f6 !== 'BODY', f6);
    await sleep(700);
    const f7 = await fa(pg);
    check(`[${w}] focus after the feature proposal arrives is not BODY`, f7 !== 'BODY', f7);
    await kb(pg, '[data-act="prop-accept"][data-kind="features"]');
    const f8 = await fa(pg);
    check(`[${w}] focus after accepting features goes to the Claude button`, /\[ai-features\]/.test(f8), f8);
    // ai-review on Improve
    await kb(pg, '[data-act="tab"][data-k="improve"]');
    await kb(pg, '[data-act="ai-review"]');
    await sleep(60);
    const f9 = await fa(pg);
    check(`[${w}] focus right after Enter on "Review my project" is not BODY`, f9 !== 'BODY', f9);
    await sleep(700);
    const f10 = await fa(pg);
    check(`[${w}] focus after the review arrives is not BODY`, f10 !== 'BODY', f10);
    // review add buttons
    const n = await pg.locator('[data-act="review-add"]').count();
    for (let i = 0; i < n; i++) {
      await kb(pg, '[data-act="review-add"] >> nth=0');
      const f = await fa(pg);
      check(`[${w}] focus after review Add #${i + 1}`, i < n - 1 ? /\[review-add\]/.test(f) : /\[ai-review\]/.test(f), f);
    }
    // ai-fill on overview: blank project with a pitch
    await newProjectKb(pg, 'Blank', '', false);
    await pg.fill('#f-pitch', 'A habit tracker');
    await sleep(50);
    await kb(pg, '[data-act="ai-fill"]');
    await sleep(60);
    const f11 = await fa(pg);
    check(`[${w}] focus right after Enter on "Ask Claude to draft the brief…" is not BODY`, f11 !== 'BODY', f11);
    await sleep(700);
    const f12 = await fa(pg);
    check(`[${w}] focus after the brief is drafted is not BODY`, f12 !== 'BODY', f12);
    // overview "Ask Claude to draft a plan" (next-up) on a project with pitch but no milestones
    await newProjectKb(pg, 'Blank2', '', false);
    await pg.fill('#f-pitch', 'A plant reminder');
    await sleep(50);
    await kb(pg, '.next [data-act="ai-plan"]');
    await sleep(60);
    const f13 = await fa(pg);
    check(`[${w}] focus right after Enter on Next-up "Ask Claude to draft a plan" is not BODY`, f13 !== 'BODY', f13);
    console.log(`errors[${w}]`, errs);
    await pg.context().close();
  }
  console.log('\nfails:', failCount());
  await b.close();
})();
