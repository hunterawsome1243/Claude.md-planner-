// Round 23: the last session on Next up and in the prompt
const { launch, open, check } = require('./lib');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
(async () => {
  const b = await launch();
  for (const w of [1200, 360]) {
    const { pg, errs } = await open(b, 'mocked.html', { viewport: { width: w, height: 900 } });
    await pg.click('.welcome [data-act="example"]');
    await pg.waitForTimeout(300);
    const note = await pg.textContent('.next .last-try').catch(() => null);
    check(`${w}px: Next up shows the stuck last session`, /^Last session, \w+ \d+: stuck\. Touch drags scroll the page instead of moving the card\. The prompt includes it\.$/.test((note || '').trim()), note);
    await pg.click('#next-prompt');
    await pg.waitForTimeout(150);
    const text = await pg.inputValue('#m-prompt');
    check(`${w}px: the prompt carries it and the dialog says so`, /An earlier session on this task:\n- \w+ \d+, stuck: Dragging works with a mouse but not on a phone\. What went wrong: Touch drags scroll the page instead of moving the card\.\nBefore you change anything, run git status and git diff \(if this folder is in git\) to see whether the last try left changes behind\. Tell me what you find, and ask me before reverting any of it\. Then carry on from there, and learn from what went wrong before\./.test(text) && /earlier sessions on this task/.test(await pg.textContent('.modal .note-box')), text.slice(0, 400));
    await pg.keyboard.press('Escape');
    check(`${w}px: no sideways scroll`, await pg.evaluate(() => document.scrollingElement.scrollWidth <= window.innerWidth));
    if (w === 360) await pg.screenshot({ path: __dirname + '/history-360.png' });
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  await b.close();
})();
