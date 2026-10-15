// Round 12: Ask Claude about this project (Overview).
const { launch, open, check } = require('./lib');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
async function newWeb(pg, name) {
  await pg.click('[data-act="new-project"] >> visible=true');
  await pg.fill('#np-name', name);
  await pg.check('input[name="np-starter"][value="web"]');
  await pg.click('[data-act="create"]');
  await pg.waitForTimeout(300);
}
const doc = (pg, n) => pg.evaluate((n) => { for (const [, d] of window.__mockDocs) if (d.name === n) return d; return null; }, n);
const noScroll = (pg) => pg.evaluate(() => document.scrollingElement.scrollWidth <= window.innerWidth);
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html');
    await newWeb(pg, 'Recipe Box');
    await pg.fill('#f-pitch', 'Plan meals for the week');
    check('the panel offers questions to start with', await pg.isVisible('#ask-h') && await pg.locator('.ask-ideas [data-act="chat-idea"]').count() === 4);
    await pg.click('[data-act="chat-send"]');
    check('an empty question is caught', /Type a question first\./.test(await pg.textContent('#toast')) && (await fa(pg)) === 'TEXTAREA#ask-q');
    await pg.evaluate(() => { window.__SAMPLE_DELAY__ = 700; window.__CHAT_PARTIAL__ = 'Build the **week'; });
    await pg.click('[data-act="chat-idea"] >> nth=0');
    await pg.waitForTimeout(300);
    check('while Claude answers: the question shows, the partial answer streams, Stop is offered', /What should I build next, and why\?/.test(await pg.textContent('.chat')) && /Build the \*\*week/.test(await pg.textContent('#chat-live')) && await pg.isVisible('[data-act="chat-stop"]') && (await fa(pg)) === 'TEXTAREA#ask-q');
    await pg.waitForTimeout(700);
    const html = await pg.innerHTML('.chat .a .md');
    check('the answer is formatted', html === '<p>Build the <b>week grid</b> next.</p><ul><li>Split it first</li><li>Then run <code>npm test</code></li></ul>', html);
    check('it is announced, and focus stays in the box', (await pg.textContent('#sr-live')) === 'Claude answered.' && (await fa(pg)) === 'TEXTAREA#ask-q');
    const first = await pg.evaluate(() => window.__chatInputs.at(-1));
    check('the first question carries the project', first.length === 1 && /You are helping the owner/.test(first[0].content) && /"name":"Recipe Box"/.test(first[0].content) && /Question: What should I build next, and why\?$/.test(first[0].content), first[0].content.slice(0, 200));
    await pg.evaluate(() => { window.__CHAT_PARTIAL__ = null; window.__SAMPLE_DELAY__ = 200; window.__CHAT_TEXT__ = 'Netlify is the simplest.'; });
    await pg.fill('#ask-q', 'And where do I host it?');
    await pg.keyboard.press('Control+Enter');
    await pg.waitForTimeout(500);
    const second = await pg.evaluate(() => window.__chatInputs.at(-1));
    check('a follow-up sends the conversation so far', second.length === 3 && second[1].role === 'assistant' && /week grid/.test(second[1].content) && second[2].content === 'And where do I host it?', second.map((x) => x.content.slice(0, 40)));
    check('both answers are listed and the box is empty', await pg.locator('.chat .a').count() === 2 && (await pg.inputValue('#ask-q')) === '');
    await pg.waitForTimeout(1600);
    let d = await doc(pg, 'Recipe Box');
    check('the conversation is saved with the project', d.chat.length === 2 && d.chat[1].q === 'And where do I host it?' && d.chat[1].a === 'Netlify is the simplest.');
    // stop keeps the partial answer
    await pg.evaluate(() => { window.__SAMPLE_DELAY__ = 3000; window.__CHAT_PARTIAL__ = 'Half an ans'; });
    await pg.fill('#ask-q', 'Long question');
    await pg.click('[data-act="chat-send"]');
    await pg.waitForTimeout(300);
    await pg.click('[data-act="chat-stop"]');
    await pg.waitForTimeout(200);
    check('Stop keeps what came so far, marked', await pg.locator('.chat .a').count() === 3 && /Half an ans/.test(await pg.textContent('.chat .a >> nth=2')) && /Stopped before the end\./.test(await pg.textContent('.chat .a >> nth=2')));
    // a failure puts the question back
    await pg.evaluate(() => { window.__SAMPLE_DELAY__ = 100; window.__CHAT_PARTIAL__ = null; window.__CHAT_FAIL__ = 'upstream_error'; });
    await pg.fill('#ask-q', 'Will this fail?');
    await pg.click('[data-act="chat-send"]');
    await pg.waitForTimeout(400);
    check('a failed question comes back to the box', (await pg.inputValue('#ask-q')) === 'Will this fail?' && /Could not reach Claude/.test(await pg.textContent('#toast')) && await pg.locator('.chat .a').count() === 3);
    await pg.evaluate(() => { window.__CHAT_FAIL__ = null; window.__CHAT_TEXT__ = null; });
    // only the last 6 are kept
    for (let i = 0; i < 4; i++) { await pg.fill('#ask-q', 'Q' + i); await pg.click('[data-act="chat-send"]'); await pg.waitForTimeout(250); }
    check('only the last 6 are kept', await pg.locator('.chat .a').count() === 6 && /Q3/.test(await pg.textContent('.chat .q >> nth=5')) && !/What should I build next/.test(await pg.textContent('.chat')));
    // copy and clear
    await pg.click('[data-act="chat-copy"] >> nth=0');
    await pg.waitForTimeout(200);
    const sel = await pg.evaluate(() => String(getSelection()));
    check('Copy copies, or selects the answer when it cannot', /Answer copied\./.test(await pg.textContent('#toast')) || (/The answer is selected/.test(await pg.textContent('#toast')) && sel.length > 0), [await pg.textContent('#toast'), sel.slice(0, 40)]);
    await pg.click('[data-act="chat-clear"]');
    await pg.waitForTimeout(150);
    check('Clear empties it, with Undo', await pg.locator('.chat').count() === 0 && await pg.isVisible('.ask-ideas') && /Conversation cleared\./.test(await pg.textContent('#toast')) && (await fa(pg)) === 'TEXTAREA#ask-q');
    await pg.click('#toast [data-act="undo"]');
    await pg.waitForTimeout(150);
    check('Undo brings it back', await pg.locator('.chat .a').count() === 6);
    // the draft survives a tab switch; answers go to the project that asked
    await pg.fill('#ask-q', 'Half-typed');
    await pg.click('#tab-plan'); await pg.click('#tab-overview');
    check('a half-typed question survives a tab switch', (await pg.inputValue('#ask-q')) === 'Half-typed');
    await pg.evaluate(() => { window.__SAMPLE_DELAY__ = 800; });
    await pg.fill('#ask-q', 'Which project?');
    await pg.click('[data-act="chat-send"]');
    await newWeb(pg, 'Other');
    await pg.waitForTimeout(900);
    check('switching projects mid-answer keeps the answer with the right project', await pg.locator('.chat').count() === 0);
    await pg.waitForTimeout(1600);
    d = await doc(pg, 'Recipe Box');
    check('...and saved there', d.chat.at(-1).q === 'Which project?' && (await doc(pg, 'Other')).chat.length === 0);
    check('no page errors', !errs.length, errs);
    await pg.context().close();
  }
  {
    const { pg, errs } = await open(b, 'plain.html');
    await newWeb(pg, 'Offline');
    check('without Claude there is no Ask panel', await pg.locator('#ask-h').count() === 0);
    check('no page errors (plain)', !errs.length, errs);
    await pg.context().close();
  }
  {
    const { pg, errs } = await open(b, 'mocked.html', { viewport: { width: 390, height: 800 } });
    await newWeb(pg, 'Phone');
    await pg.evaluate(() => { window.__CHAT_TEXT__ = 'A long answer with code:\n```\nnpm run build && npx netlify-cli deploy --prod --dir=dist --site=very-long-site-name-here\n```\nThen check https://example.com/a/very/long/path/that/should/wrap/somewhere'; });
    await pg.click('[data-act="chat-idea"] >> nth=3');
    await pg.waitForTimeout(500);
    const fit = await pg.evaluate(() => { const a = document.querySelector('.chat .a').getBoundingClientRect(); const pre = document.querySelector('.chat .a pre').getBoundingClientRect(); const cp = document.querySelector('.chat [data-act="chat-copy"]').getBoundingClientRect(); return pre.right <= a.right + 1 && cp.right <= a.right + 1; });
    check('390px: answers with long code fit their box and the page', fit && await noScroll(pg));
    await pg.locator('#ask-h').scrollIntoViewIfNeeded();
    await pg.screenshot({ path: __dirname + '/ask-390.png' });
    check('390px: no page errors', !errs.length, errs);
    await pg.context().close();
  }
  await b.close();
})();
