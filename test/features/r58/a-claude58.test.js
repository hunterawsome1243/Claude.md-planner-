// Round 58: review 12b, part 1. Secrets never reach Claude; Claude's milestones go before the release; Undo after adding
// follow-ups keeps the session; long pastes are not sent whole; cut-off answers are not taken as whole; Undo of a Claude
// result leaves later edits alone.
const { launch, open, check, results, newProject } = require('../r48/lib');
const click = (pg, sel) => pg.evaluate((s) => { const e = document.querySelector(s); if (!e) throw new Error('no ' + s); e.click(); }, sel);
const doc = (pg, name) => pg.evaluate((n) => { for (const [, d] of window.__mockDocs) if (d.name === n) return d; return null; }, name);
const toastText = (pg) => pg.evaluate(() => document.querySelector('#toast')?.textContent || '');
// a made-up key, split so secret scanners do not mistake the test for a leak
const STRIPE = 'sk_' + 'live_51HxABCDEF1234567890abcd';
const proj = {
  kind: 'project', name: 'Trail Log', pitch: 'Log hikes.', stack: 'Vite\nReact', commands: `STRIPE_SECRET_KEY=${STRIPE} npm run dev\nnpm test`,
  milestones: [{ id: 'm1', title: 'Basics', tasks: [{ id: 't1', title: 'List hikes', size: 'S', status: 'doing' }, { id: 't2', title: 'Add the hike form and map view', size: 'L' }, { id: 't3', title: 'Show totals', size: 'S' }] }],
};
const seen = "localStorage.setItem('shipyard.seen.v1', '99');";
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify({ p1: proj })}; ${seen}`, wait: 1200 });
    // secrets: Ask Claude, a review, follow-ups with a pasted token
    await pg.fill('#ask-q', 'How do I deploy? My key is OPENAI_API_KEY="sk-proj-abcdefghijklmnopqrstuvwxyz123"');
    await click(pg, '[data-act="chat-send"]');
    await pg.waitForTimeout(900);
    await click(pg, '.next [data-act="log-session"]'); await pg.waitForTimeout(300);
    const big = 'x'.repeat(300000);
    await pg.fill('#ss-summary', big + '\nI set export MAPBOX_TOKEN=pk.eyJ1IjoiYWxleCIsImEiOiJja3h5In0.abcdefghij in the shell.\n\nOutcome: done\nWent wrong: nothing');
    await click(pg, '#modal-root [data-act="save-session-ai"]'); await pg.waitForTimeout(1200);
    const sent = await pg.evaluate(() => [...(window.__prompts || []), ...(window.__chatInputs || []).flat().map((x) => x.content)]);
    check('nothing sent to Claude holds the Stripe key, the OpenAI key or the Mapbox token', sent.length >= 2 && !sent.some((s) => s.includes(STRIPE) || /sk-proj-abc|pk\.eyJ1/.test(s)), sent.length);
    check('...they read [hidden by Shipyard] instead', sent.some((s) => s.includes('STRIPE_SECRET_KEY=[hidden by Shipyard]')) && sent.some((s) => s.includes('MAPBOX_TOKEN=[hidden by Shipyard]')));
    const fu = (await pg.evaluate(() => window.__prompts)).find((s) => s.startsWith('A Claude Code session on this project just ended'));
    check('a 300,000-character paste is sent as its last 20,000 characters', fu && fu.length < 60000 && fu.includes('in the shell'), fu && fu.length);
    // H2: add the follow-ups, then Undo: the session stays
    const before = (await doc(pg, 'Trail Log')).sessions.length;
    await click(pg, '#modal-root [data-act="session-accept"]'); await pg.waitForTimeout(1700);
    const added = await doc(pg, 'Trail Log');
    check('the follow-ups are added', added.sessions.length === before && added.milestones[0].tasks.length > 3, added.milestones[0].tasks.map((t) => t.title));
    await click(pg, '#toast [data-act="undo"]'); await pg.waitForTimeout(1700);
    const undone = await doc(pg, 'Trail Log');
    check('Undo takes the follow-ups back and keeps the session just logged', undone.milestones[0].tasks.length === 3 && undone.sessions.length === before, { tasks: undone.milestones[0].tasks.length, sessions: undone.sessions.length, before });
    check('no page errors', !errs.length, errs);
    await pg.context().close();
  }
  {
    // a key typed into a field
    const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify({ p1: { ...proj, commands: 'npm test' } })}; ${seen}`, wait: 1200 });
    const tabs = ['overview', 'design', 'plan', 'improve', 'claudemd'];
    let where = null;
    for (const t of tabs) { await click(pg, '#tab-' + t); await pg.waitForTimeout(100); if (await pg.$('#f-commands')) { where = t; break; } }
    await pg.fill('#f-commands', 'npm test\nDB_PASSWORD=hunter22 npm start');
    await pg.waitForTimeout(200);
    check(`typing a password into Commands (on ${where}) warns that it is kept in the plan and in committed files`, /looks like a key or password/.test(await toastText(pg)), await toastText(pg));
    check('no page errors (field)', !errs.length, errs);
    await pg.context().close();
  }
  {
    // H1: next milestones go before the release
    const { pg, errs } = await open(b, 'mocked.html', { init: seen, wait: 900 });
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Tide Clock');
    await pg.check('input[name="np-starter"][value="web"]');
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(400);
    await click(pg, '#tab-plan');
    await click(pg, '[data-act="ai-plan"]'); await pg.waitForTimeout(900);
    const pr = (await pg.evaluate(() => window.__prompts)).find((s) => s.startsWith('Draft the next milestones'));
    check('the prompt says the last milestone is the release', /Its last milestone, "Ready to share", is the release/.test(pr), pr && pr.slice(0, 600));
    await click(pg, '[data-act="prop-accept"][data-kind="plan"]'); await pg.waitForTimeout(1700);
    const d = await doc(pg, 'Tide Clock');
    check("Claude's milestones go before Ready to share", d.milestones.map((m) => m.title).join('|') === 'Bare-bones version running|Polish|Share|Ready to share', d.milestones.map((m) => m.title));
    check('no page errors (plan)', !errs.length, errs);
    await pg.context().close();
  }
  {
    // M5: a cut-off chat answer and a cut-off sharpen
    const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify({ p1: proj })}; window.__TRUNCATED__ = true; ${seen}`, wait: 1200 });
    await pg.fill('#ask-q', 'What next?');
    await click(pg, '[data-act="chat-send"]'); await pg.waitForTimeout(2000);
    const c = (await doc(pg, 'Trail Log')).chat.at(-1);
    check('a cut-off answer is kept as broken off, and says so', c.failed === true && /broke off/.test(await pg.textContent('.ask .chat')), c);
    await click(pg, '#next-prompt');
    await pg.waitForTimeout(300);
    const hasSharpen = await pg.$('#modal-root [data-act="sharpen"]');
    if (hasSharpen) {
      const orig = await pg.inputValue('#m-prompt');
      await click(pg, '#modal-root [data-act="sharpen"]'); await pg.waitForTimeout(900);
      check('a cut-off sharpen leaves the prompt as it was, and says why', (await pg.inputValue('#m-prompt')) === orig && /cut off/.test(await toastText(pg)), await toastText(pg));
    } else check('the task prompt dialog has Sharpen', false, await pg.evaluate(() => document.querySelector('#modal-root')?.innerHTML.slice(0, 300)));
    check('no page errors (cut off)', !errs.length, errs);
    await pg.context().close();
  }
  {
    // M8: split with Claude, edit a new task, Undo refuses
    const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify({ p1: proj })}; ${seen}`, wait: 1200 });
    await click(pg, '#tab-plan');
    await click(pg, '[data-act="split-task"][data-tid="t2"]'); await pg.waitForTimeout(900);
    await click(pg, '#modal-root [data-act="split-accept"]'); await pg.waitForTimeout(1700);
    let d = await doc(pg, 'Trail Log');
    const nt = d.milestones[0].tasks.find((t) => /week grid/i.test(t.title)) || d.milestones[0].tasks[1];
    await pg.fill(`#f-milestones-m1-tasks-${nt.id}-title`, 'Lay out the hike grid by hand');
    await pg.waitForTimeout(200);
    await pg.locator('[data-act="ai-plan"]').focus();
    await pg.keyboard.press('Control+z'); await pg.waitForTimeout(1700);
    d = await doc(pg, 'Trail Log');
    const titles = d.milestones[0].tasks.map((t) => t.title);
    check('Undo of a split after editing one of its tasks keeps the edit, and says why', titles.includes('Lay out the hike grid by hand') && !titles.includes('Add the hike form and map view') && /changed again since/.test(await toastText(pg)), { titles, toast: await toastText(pg) });
    check('no page errors (split)', !errs.length, errs);
    await pg.context().close();
  }
  await b.close();
  const fails = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - fails} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})();
