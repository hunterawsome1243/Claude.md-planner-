// Round 29: one prompt that saves every repo file
const { launch, open, check } = require('./lib');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
const seed = { 'p-a': { kind: 'project', name: 'Recipe Box', pitch: 'Plan meals.', audience: 'Me', problem: 'Meal planning is a chore.', doneWhen: 'I can plan a week.', commands: 'npm install\nnpm test', conventions: '- Use plain CSS',
  features: [{ id: 'f1', title: 'Save a recipe', priority: 'must' }],
  milestones: [{ id: 'm1', title: 'Week', tasks: [{ id: 't1', title: 'Drag a recipe onto a day' }] }],
  prompts: [{ id: 'q1', title: 'Explain a file', text: 'Explain $1 to me.\n\n```\nexample\n```\n\nKeep it short.' }] } };
// splits the prompt into { path: text } by its File: lines and fences
const parse = (t) => { const out = {}; const L = t.split('\n'); for (let i = 0; i < L.length; i++) { const m = /^File: (.+)$/.exec(L[i]); if (!m) continue; const fence = L[i + 1]; let j = i + 2; const body = []; while (j < L.length && L[j] !== fence) body.push(L[j++]); out[m[1]] = { fence, text: body.join('\n') }; i = j; } return out; };
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(seed)};`, wait: 700 });
    check('the guide\'s file step offers the prompt first', (await pg.textContent('.guide [aria-current="step"] .btn.primary')) === 'Get the setup prompt' && /paste the setup prompt, which saves every file/.test(await pg.textContent('.guide [aria-current="step"]')));
    await pg.click('#tab-claudemd');
    check('Repo files says how many files', /All 7 files at once\./.test(await pg.textContent('.save-all')), await pg.textContent('.save-all'));
    const want = {};
    for (const k of ['claudemd', 'settings', 'cmd:q1', 'next']) {
      await pg.click(`[data-act="repo-file"][data-k="${k}"]`);
      want[k] = await pg.inputValue(k === 'claudemd' ? '#f-claudeMd' : '#repo-text');
    }
    await pg.click('.save-all [data-act="save-all"]');
    await pg.waitForTimeout(100);
    const t = await pg.inputValue('#m-export');
    const files = parse(t);
    check('the dialog is named and says what it saves', (await pg.textContent('#m-title')) === 'Setup prompt' && /It saves CLAUDE\.md, PLAN\.md, \.claude\/commands\/next\.md, \.claude\/settings\.json, \.claude\/agents\/reviewer\.md, \.claude\/agents\/test-runner\.md, \.claude\/commands\/explain-a-file\.md/.test(await pg.textContent('.modal .sub')));
    check('the prompt starts with what to do', t.startsWith('Save these 7 files in this project\'s folder, making folders as needed. A file that is not there yet gets exactly the text between its fences.') && /ask before replacing it/.test(t) && /add any missing allow, ask and deny rules/.test(t));
    check('all 7 files are in it', Object.keys(files).length === 7, Object.keys(files));
    check('each file is word for word what Repo files shows', files['CLAUDE.md'].text === want.claudemd.replace(/\s+$/, '') && files['.claude/settings.json'].text === want.settings.replace(/\s+$/, '') && files['.claude/commands/next.md'].text === want.next.replace(/\s+$/, ''));
    const xf = files['.claude/commands/explain-a-file.md'], cm = files['CLAUDE.md'], runs = (s) => Math.max(0, ...(s.match(/`{3,}/g) || []).map((r) => r.length));
    check('a file with ``` inside gets a longer fence', xf.fence === '````' && xf.text === want['cmd:q1'].replace(/\s+$/, '') && cm.fence.length === Math.max(3, runs(cm.text) + 1), JSON.stringify([xf.fence, cm.fence, runs(cm.text), xf.text === want['cmd:q1'].replace(/\s+$/, '')]));
    await pg.click('[data-act="copy-export"]');
    await pg.waitForTimeout(100);
    await pg.keyboard.press('Escape');
    check('focus returns to Get the prompt', (await fa(pg)) === 'BUTTON[save-all]', await fa(pg));
    await pg.click('#tab-overview');
    check('copying it ticks the guide\'s file step', (await pg.textContent('.guide [aria-current="step"] b')) === 'Do the first task with Claude Code', await pg.textContent('.guide [aria-current="step"] b'));
    await pg.waitForTimeout(1600);
    const d = await pg.evaluate(() => window.__mockDocs.get('p-a'));
    check('and is saved', d.copied.claudemd === true && d.copied.plan === true);
    await pg.click('#rail [data-act="whats-new"]');
    check('What\'s new lists it with a shortcut', (await pg.$$eval('.wn-list li h3', (x) => x.map((e) => e.textContent))).includes('One setup prompt for every file') && (await pg.$$('[data-act="wn-go"][data-k="saveall"]')).length === 1);
    await pg.evaluate(() => document.querySelectorAll('details.wn-past').forEach((d) => { d.open = true; }));
    await pg.click('[data-act="wn-go"][data-k="saveall"]');
    await pg.waitForTimeout(100);
    check('the shortcut opens the prompt', (await pg.textContent('#m-title')) === 'Setup prompt');
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    const { pg, errs } = await open(b, 'plain.html', { init: `localStorage.setItem('shipyard.projects.v1', ${JSON.stringify(JSON.stringify(seed))});`, wait: 600, viewport: { width: 360, height: 780 } });
    await pg.click('.guide [data-act="save-all"]');
    await pg.waitForTimeout(100);
    const fit = await pg.evaluate(() => { const m = document.querySelector('.modal'); const r = m.getBoundingClientRect(); return { l: r.left, r: r.right, w: innerWidth, sw: document.documentElement.scrollWidth }; });
    check('on a phone, without the runtime, it opens and fits', (await pg.textContent('#m-title')) === 'Setup prompt' && fit.l >= 0 && fit.r <= fit.w && fit.sw <= fit.w, fit);
    await pg.keyboard.press('Escape');
    await pg.click('#tab-claudemd');
    const row = await pg.evaluate(() => { const r = document.querySelector('.save-all'); return { w: r.scrollWidth, c: r.clientWidth }; });
    check('the Repo files line wraps on a phone', row.w <= row.c, row);
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  await b.close();
})();
