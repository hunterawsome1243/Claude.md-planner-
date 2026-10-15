// Round 27: review 5 fixes and the Claude Code start guide, in the browser
const { launch, open, check, OUT } = require('./lib');
const path = require('path');
const day = (n) => { const t = new Date(); t.setDate(t.getDate() - n); return t.toISOString().slice(0, 10); };
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
const garden = { kind: 'project', name: 'Garden Log', pitch: 'Track what I plant and when.', problem: 'I forget what I planted.', doneWhen: 'I can log a planting.', createdAt: day(3) + 'T09:00:00Z', updatedAt: day(0) + 'T09:00:00Z',
  features: [{ id: 'f1', title: 'Log a planting', priority: 'must' }],
  milestones: [{ id: 'm1', title: 'First version', tasks: [{ id: 't1', title: 'Set up the project', status: 'todo' }, { id: 't2', title: 'Add the planting form', status: 'todo' }] }] };
const panelText = (pg) => pg.evaluate(() => { const c = document.querySelector('#panel').cloneNode(true); c.querySelectorAll('textarea,input').forEach((x) => x.replaceWith(x.value)); return c.textContent.replace(/\s+/g, ' '); });
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify({ 'p-a': garden })};`, wait: 700 });
    // L8
    check('L8 the project view has an h1 with the name', (await pg.textContent('h1#phead-h')) === 'Garden Log');
    check('L8 Next up is a heading, the task under it', (await pg.evaluate(() => document.querySelector('.next h2')?.textContent)) === 'Next up' && (await pg.getAttribute('.panel.next', 'aria-labelledby')) === 'next-h');
    // L4: the brief ticks while typing
    check('L4 the guide starts at the brief', /3 of 7 done/.test(await pg.textContent('.guide')) && (await pg.textContent('.guide [aria-current="step"] b')) === 'Fill in the brief');
    await pg.click('#f-audience');
    await pg.keyboard.type('Me');
    await pg.waitForTimeout(100);
    check('L4 typing in the brief ticks it at once, and the cursor stays', /4 of 7 done/.test(await pg.textContent('.guide')) && (await fa(pg)) === 'TEXTAREA#f-audience' && (await pg.inputValue('#f-audience')) === 'Me', await fa(pg));
    // M3: the start guide from the guide's step
    const step = await pg.textContent('.guide [aria-current="step"]');
    check('M3 the folder step says to make one', /Make a folder for the project if you have none yet/.test(step), step);
    await pg.click('.guide [data-act="cc-setup"]');
    await pg.waitForTimeout(100);
    const m = await pg.textContent('.modal');
    check('M3 the start guide opens at its heading', (await pg.textContent('#m-title')) === 'Start Claude Code' && (await fa(pg)) === 'H2#m-title');
    check('M3 install lines as the docs give them', (await pg.textContent('#cc-unix')) === 'curl -fsSL https://claude.ai/install.sh | bash' && (await pg.textContent('#cc-ps')) === 'irm https://claude.ai/install.ps1 | iex');
    check('M3 the folder is named after the project', (await pg.textContent('#cc-folder')) === 'mkdir garden-log\ncd garden-log' && /cd garden-log/.test(m) && (await pg.textContent('#cc-start')) === 'claude');
    check('M3 it says what plan it needs, and links the docs', /paid Claude plan \(Pro, Max, Team or Enterprise\)/.test(m) && (await pg.$$eval('.modal a[target="_blank"]', (x) => x.map((e) => e.href).filter((h) => h.includes('code.claude.com')))).join() === 'https://code.claude.com/docs/en/desktop-quickstart,https://code.claude.com/docs/en/terminal-guide,https://code.claude.com/docs/en/setup');
    check('M3 each Copy button names its command', (await pg.getAttribute('[data-act="copy-cmd"][data-k="folder"]', 'aria-label')) === 'Copy the commands that make the folder');
    await pg.click('[data-act="copy-cmd"][data-k="start"]');
    await pg.waitForTimeout(100);
    check('M3 Copy copies, or selects the command', /Copied\. Paste it into your terminal\.|The command is selected/.test(await pg.textContent('#toast')), await pg.textContent('#toast'));
    await pg.click('[data-act="cc-files"]');
    await pg.waitForTimeout(150);
    check('M3 Open Repo files lands on CLAUDE.md', !(await pg.$('.modal')) && (await pg.getAttribute('#tab-claudemd', 'aria-selected')) === 'true' && (await fa(pg)) === 'BUTTON[repo-file]', [!!(await pg.$('.modal')), await pg.getAttribute('#tab-claudemd', 'aria-selected'), await fa(pg)]);
    const how = await pg.textContent('.how');
    check('M3 CLAUDE.md can be saved by Claude Code too, with a link for first-timers', /say "save this as CLAUDE\.md"/.test(how) && (await pg.$$('.how [data-act="cc-setup"]')).length === 1, how);
    // from the prompt, and back
    await pg.click('#tab-overview');
    await pg.click('.next [data-act="prompt"]');
    await pg.waitForTimeout(100);
    const before = await pg.inputValue('#m-prompt');
    await pg.click('.modal .sub [data-act="cc-setup"]');
    await pg.waitForTimeout(100);
    check('M3 from a prompt, the guide offers the way back', (await pg.textContent('#m-title')) === 'Start Claude Code' && (await pg.textContent('[data-act="cc-back"]')) === 'Back to the prompt');
    await pg.click('[data-act="cc-back"]');
    await pg.waitForTimeout(100);
    check('M3 Back returns to the same prompt, on Copy prompt', (await pg.inputValue('#m-prompt')) === before && (await fa(pg)) === 'BUTTON[copy-prompt]', await fa(pg));
    await pg.keyboard.press('Escape');
    // L4: hide and show; the link is at the end of Overview
    await pg.click('[data-act="hide-guide"]');
    await pg.waitForTimeout(100);
    check('L4 the show link is the last thing on Overview, as the toast says', /end of Overview/.test(await pg.textContent('#toast')) && (await pg.evaluate(() => document.querySelector('#panel .stack').lastElementChild.className)) === 'guide-back');
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    // L4: after the first session the guide can come back; L8 headings on Plan and session dates
    const p = { ...garden, sessions: [{ id: 'x1', date: '2026-10-13', mid: 'm1', tid: 't1', task: 'Set up the project', outcome: 'done' }] };
    const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify({ 'p-a': p })};`, wait: 700 });
    check('L4 after a session the guide is closed, with a link while steps are left', (await pg.$$('.guide')).length === 0 && (await pg.$$('[data-act="show-guide"]')).length === 1);
    await pg.click('[data-act="show-guide"]');
    await pg.waitForTimeout(1600);
    check('L4 it comes back, on its heading', (await pg.$$('.guide')).length === 1 && (await fa(pg)) === 'H2#guide-h');
    const saved = await pg.evaluate(() => window.__mockDocs.get('p-a'));
    check('L4 and is saved to stay open', saved.guideAgain === true && !saved.guideHidden, { a: saved.guideAgain, h: saved.guideHidden });
    await pg.click('#tab-plan');
    check('L8 each milestone has a heading', (await pg.$$eval('#panel h2.sr', (x) => x.map((e) => e.textContent))).includes('Milestone 1: First version'));
    await pg.click('#tab-improve');
    const sd = await pg.textContent('.session .date');
    check('L8 session dates read like the rest', sd === 'Oct 13', sd);
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    // M1 + L2 + L1: the example next to your own project
    const { pg, errs } = await open(b, 'mocked.html', { wait: 700 });
    await pg.click('[data-act="example"] >> visible=true');
    await pg.waitForTimeout(300);
    check('M1 the example says what it is', /An example to explore\. Its history is made up/.test(await pg.textContent('.phead')) && /Example · /.test(await pg.textContent('#plist [aria-current="true"] .meta')));
    check('L7 it is called Recipe Box', (await pg.inputValue('#f-name')) === 'Recipe Box');
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Garden Log');
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(300);
    check('M1 the rail\'s All projects leaves the example out', /2 projects · 0 done this week/.test(await pg.textContent('#rail-all')), await pg.textContent('#rail-all'));
    await pg.click('[data-act="open-all"]');
    await pg.waitForTimeout(200);
    const head = await pg.textContent('.dash-head');
    check('M1 All projects: this week counts only your own work', /This week: 0 tasks done, 0 sessions\./.test(head) && (await pg.$$('.dash .week-chart, .dash [aria-labelledby="dash-prog-h"]')).length === 0, head);
    check('M1 the example\'s card is marked', /Example · Building/.test(await pg.textContent('.dcard:has-text("Recipe Box") .dc-stage')));
    // L2: a copy of the example has done tasks but no dates
    await pg.click('.dcard:has-text("Recipe Box") [data-act="open"]');
    await pg.click('#more-btn');
    await pg.click('[data-act="duplicate"]');
    await pg.waitForTimeout(300);
    const prog = await pg.textContent('.progress');
    check('L2 a copy says nothing was marked done lately, not "yet"', /Nothing marked done in the last 8 weeks\./.test(prog) && !/An example to explore/.test(await pg.textContent('.phead')), prog);
    // L1
    await pg.click('[data-act="open"] >> text=Garden Log');
    await pg.fill('#f-targetDate', '2026-01-05');
    await pg.waitForTimeout(150);
    const p2 = await pg.textContent('.progress');
    check('L1 a past target with no plan has passed, no negative days', /Your target of Jan 5 has passed\. Plan some tasks and pick a new date\./.test(p2) && !/-\d+ days/.test(p2), p2);
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    // Windows puts PowerShell first; the guide fits a phone
    const ctx = await b.newContext({ viewport: { width: 360, height: 780 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' });
    const { pg, errs } = await open(b, 'mocked.html', { ctx, init: `window.__SEED__ = ${JSON.stringify({ 'p-a': garden })};`, wait: 700 });
    await pg.click('[data-act="open-drawer"]');
    await pg.click('#rail [data-act="whats-new"]');
    await pg.$$eval('.modal details', (x) => x.forEach((d) => { d.open = true; })); // Version 14 is under Earlier changes
    await pg.click('[data-act="wn-go"][data-k="setup"]');
    await pg.waitForTimeout(150);
    check('What\'s new opens the start guide', (await pg.textContent('#m-title')) === 'Start Claude Code');
    check('on Windows, PowerShell comes first', (await pg.$$eval('.cc-for', (x) => x.map((e) => e.textContent))).slice(0, 2).join() === 'Windows PowerShell,Mac or Linux');
    const fit = await pg.evaluate(() => { const m = document.querySelector('.modal'); const r = m.getBoundingClientRect(); return { l: r.left, r: r.right, w: innerWidth, sw: document.documentElement.scrollWidth, ms: m.scrollWidth, mc: m.clientWidth }; });
    check('it fits a phone; long lines scroll in their box', fit.l >= 0 && fit.r <= fit.w && fit.sw <= fit.w && fit.ms <= fit.mc, fit);
    await pg.screenshot({ path: path.join(OUT, 'setup-360.png'), fullPage: false });
    check('no page errors', errs.length === 0, errs);
    await ctx.close();
  }
  {
    // no Claude, plain page: the guide still works
    const { pg, errs } = await open(b, 'plain.html', { init: `localStorage.setItem('shipyard.projects.v1', ${JSON.stringify(JSON.stringify({ 'p-a': garden }))});`, wait: 600 });
    await pg.click('[data-act="guide-field"]');
    await pg.keyboard.type('Me');
    check('without the runtime the brief still ticks', /4 of 7 done/.test(await pg.textContent('.guide')));
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  await b.close();
})();
