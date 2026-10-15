// Round 33: projects that already exist, in the browser
const path = require('path'); const fs = require('fs');
const { launch, open, check } = require('./lib');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
const SAMPLE = fs.readFileSync(path.join(__dirname, 'sample.md'), 'utf8');
const byName = (pg, n) => pg.evaluate((n) => [...window.__mockDocs.values()].find((d) => d.name === n), n);
const importText = async (pg, text, keep) => {
  await pg.click('[data-act="open-import"] >> visible=true').catch(() => {});
  if (!(await pg.$('#np-text'))) { await pg.click('[data-act="new-project"] >> visible=true'); await pg.click('[data-act="np-mode"][data-k="import"]'); }
  await pg.fill('#np-text', text);
  await pg.waitForTimeout(300);
  if (keep != null && (await pg.isChecked('#np-keepmd')) !== keep) await pg.click('#np-keepmd');
  await pg.click('[data-act="import"]');
  await pg.waitForTimeout(400);
};
const CLAUDE_MD = '# Budget Bot\n\nA Telegram bot that tracks spending.\n\n## Architecture\n- handlers/ holds one file per command\n- The ledger is a SQLite file, never edited by hand\n\n## Commands\n```sh\nnpm test\n```\n\n## Conventions\n- Always run npm test before committing\n';
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html', { wait: 700 });
    await importText(pg, SAMPLE);
    const d = await byName(pg, 'Tide Log');
    check('the import is saved as existing code, with the files the folder has', d.fromCode === true && d.repoHas === 'claudemd plan settings' && !d.claudeMdOwn, [d.fromCode, d.repoHas]);
    check('the guide starts at adding the files', (await pg.textContent('.guide [aria-current="step"] b')) === "Add Shipyard's files to your project's folder" && /merges into a CLAUDE\.md or PLAN\.md already there/.test(await pg.textContent('.guide [aria-current="step"] small')), await pg.textContent('.guide [aria-current="step"]'));
    check('its button says which prompt', (await pg.textContent('.guide [aria-current="step"] [data-act="save-all"]')) === 'Get the setup prompt');
    check('the features step waits for the owner to check them', /Check the features Claude found/.test(await pg.textContent('.guide')) && !/Done: Check the features Claude found/.test(await pg.textContent('.guide')));
    // Start Claude Code from the guide: go to the folder, not make one
    await pg.click('.guide [aria-current="step"] [data-act="cc-setup"]');
    const st = await pg.textContent('.cc-steps');
    check('Start Claude Code goes to the folder that exists', (await pg.textContent('.cc-steps li:nth-child(2) h3')) === "Go to the project's folder" && !(await pg.$('#cc-folder')) && !/mkdir/.test(st) && /drag the project's folder/.test(st), (await pg.textContent('.cc-steps li:nth-child(2)')).slice(0, 120));
    check('every session starts at step 2', /Step 1 is once only; after that, every session starts at step 2\./.test(await pg.textContent('.modal .sub')) && /go to the folder the same way/.test(await pg.textContent('.cc-steps li:nth-child(3)')));
    check('step 4 says the prompt merges', /merging into any that are already there/.test(await pg.textContent('.cc-steps li:nth-child(4)')), await pg.textContent('.cc-steps li:nth-child(4)'));
    await pg.keyboard.press('Escape');
    // Design lanes
    await pg.click('#tab-design');
    check('built features are must-haves', (await pg.$$('.lane[data-p="must"] .fcard')).length === 2 && (await pg.$$('.lane[data-p="should"] .fcard')).length === 2, [(await pg.$$('.lane[data-p="must"] .fcard')).length]);
    check('the lanes speak of what has to keep working', /What has to keep working/.test(await pg.textContent('.lane[data-p="must"] .lane-note')) && /Sort features by how much the project needs them/.test(await pg.textContent('.toolbar')));
    // Repo files
    await pg.click('#tab-claudemd');
    check('the files bar says it merges', /It merges into a CLAUDE\.md or PLAN\.md already there, and asks before replacing any other file\./.test(await pg.textContent('.save-all')), await pg.textContent('.save-all'));
    check('CLAUDE.md says to merge it into the one the project has', /merge this into CLAUDE\.md, keeping what is already there/.test(await pg.textContent('.how')) && !/save this as CLAUDE\.md/.test(await pg.textContent('.how')));
    check('and lists core features', /## Core features \(must have\)/.test(await pg.inputValue('#f-claudeMd')));
    await pg.click('[data-act="repo-file"][data-k="plan"]');
    check('PLAN.md says to update Shipyard from it first, then merge', /already has a PLAN\.md\. First bring Shipyard up to date with it/.test(await pg.textContent('.how')) && /merge this into PLAN\.md, keeping its ticks and notes/.test(await pg.textContent('.how')));
    // Save every file
    await pg.click('.save-all [data-act="save-all"]');
    await pg.waitForTimeout(100);
    const t = await pg.inputValue('#m-export');
    check('the text box is named for what it holds', (await pg.textContent('label[for="m-export"]')) === 'The setup prompt, for Claude Code');
    check('the prompt merges CLAUDE.md, PLAN.md and settings', /A file that is already there gets merged, not replaced:\n- CLAUDE\.md: keep everything it already says\./.test(t) && /- PLAN\.md: a line with an id comment \("<!-- id:\.\.\. -->"\) follows mine: my wording, milestone and order\. Remove a line whose id mine does not have, since it was deleted here\. A task or bug ticked in either file stays ticked, and Notes lines in either are kept\./.test(t) && /- \.claude\/settings\.json: add any missing allow, ask and deny rules/.test(t) && /- Any other file: if it is different, show me what would change and ask before replacing it\./.test(t), t.split('\n').slice(0, 8));
    check('the dialog says to update from PLAN.md first', /use Update from PLAN\.md on the Plan tab first/.test(await pg.textContent('.modal .sub')) && /already there is merged, keeping what it says/.test(await pg.textContent('.modal .sub')));
    await pg.keyboard.press('Escape');
    // the export dialog keeps its name
    await pg.click('#tab-overview');
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    // a real CLAUDE.md, kept as it is
    const { pg, errs } = await open(b, 'mocked.html', { wait: 700 });
    await importText(pg, CLAUDE_MD, true);
    let d = await byName(pg, 'Budget Bot');
    check('a kept CLAUDE.md is the owner\'s own, in a folder that has one', d.claudeMdOwn === true && d.claudeMdEdited === true && d.fromCode === true && d.repoHas === 'claudemd', [d.claudeMdOwn, d.fromCode, d.repoHas]);
    await pg.click('#tab-claudemd');
    check('Repo files calls it your own', /Your own CLAUDE\.md, as imported\./.test(await pg.textContent('.md-state')) && /merge this into CLAUDE\.md/.test(await pg.textContent('.how')), await pg.textContent('.md-state'));
    await pg.click('[data-act="ask-rebuild"]');
    check('the confirm says it replaces your own file', /Replace your own CLAUDE\.md with one built from the project\? Anything only your file says will be gone\./.test(await pg.textContent('.confirm')) && (await pg.textContent('.confirm [data-act="cancel-confirm"]')) === 'Keep mine');
    await pg.click('[data-act="rebuild-md"]');
    check('replacing it offers Undo', /CLAUDE\.md is built from the project again\./.test(await pg.textContent('#toast')) && !!(await pg.$('#toast [data-act="undo"]')) && !/## Architecture/.test(await pg.inputValue('#f-claudeMd')));
    await pg.click('#toast [data-act="undo"]');
    await pg.waitForTimeout(200);
    check('Undo brings the file back, as your own, with focus in it', /## Architecture\n- handlers\/ holds one file per command/.test(await pg.inputValue('#f-claudeMd')) && /Your own CLAUDE\.md/.test(await pg.textContent('.md-state')) && (await fa(pg)) === 'TEXTAREA#f-claudeMd', await fa(pg));
    await pg.waitForTimeout(1600);
    d = await byName(pg, 'Budget Bot');
    check('and it is saved', d.claudeMdOwn === true && /## Architecture/.test(d.claudeMd));
    await pg.click('#tab-design');
    check('Design says the CLAUDE.md is your own', /Your CLAUDE\.md is your own, as imported, so changes here are not added to it/.test(await pg.textContent('.toolbar')));
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    // a project made here: milestone Undo, follow-ups, Look back, setup from a prompt
    const seed = { 'p-a': { kind: 'project', name: 'Plant Pal', pitch: 'Water plants on time.', commands: 'npm test',
      bugs: [{ id: 'b1', title: 'Crash on empty list', severity: 'major' }],
      milestones: [{ id: 'm1', title: 'Basics', tasks: [{ id: 't1', title: 'List plants', status: 'done' }, { id: 't2', title: 'Water reminder' }] }, { id: 'm2', title: 'Sharing', tasks: [{ id: 't3', title: 'Share a plant' }] }] } };
    const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(seed)};`, wait: 700 });
    const doc = () => pg.evaluate(() => window.__mockDocs.get('p-a'));
    check('a project made here keeps the usual guide', (await pg.textContent('.guide')).includes("Save Shipyard's files in your project's folder") && (await pg.textContent('.guide [aria-current="step"] b')) !== "Add Shipyard's files to your project's folder");
    // setup from a bug's prompt
    await pg.click('#tab-plan');
    await pg.click('[data-act="bug-prompt"][data-id="b1"] >> visible=true');
    await pg.click('.modal .sub [data-act="cc-setup"]');
    check('from a prompt, step 4 says to go back to it', /Go back to your prompt and paste it into Claude Code\./.test(await pg.textContent('.cc-steps li:nth-child(4)')) && !/Next up/.test(await pg.textContent('.cc-steps li:nth-child(4)')), await pg.textContent('.cc-steps li:nth-child(4)'));
    check('and a new project still makes its folder', (await pg.textContent('#cc-folder')) === 'mkdir plant-pal\ncd plant-pal');
    await pg.keyboard.press('Escape');
    await pg.keyboard.press('Escape').catch(() => {});
    // the survey from here goes to an existing folder
    await pg.evaluate(() => document.querySelector('[data-act="whats-new"]')?.click());
    await pg.evaluate(() => document.querySelectorAll('details.wn-past').forEach((d) => { d.open = true; }));
    await pg.click('.wn-list [data-act="wn-go"][data-k="survey"]');
    await pg.click('.modal .sub [data-act="cc-setup"]');
    check('from the survey, step 2 goes to the folder even with a new project open', (await pg.textContent('.cc-steps li:nth-child(2) h3')) === "Go to the project's folder" && !(await pg.$('#cc-folder')));
    await pg.keyboard.press('Escape');
    await pg.keyboard.press('Escape').catch(() => {});
    // Look back hint when a session finishes a milestone
    await pg.click('#tab-plan');
    await pg.click('[data-act="prompt"][data-tid="t2"]');
    await pg.click('#modal-root [data-act="log-session"]');
    await pg.fill('#ss-summary', 'Added the reminder.\n\nOutcome: done\nWent wrong: nothing');
    await pg.click('[data-act="save-session"]');
    await pg.waitForTimeout(200);
    check('finishing a milestone points at Look back', /"Water reminder" is now done\. Milestone 1 is finished: look back on it from the Plan tab\./.test(await pg.textContent('#toast')), await pg.textContent('#toast'));
    // follow-ups say what to copy again
    await pg.click('[data-act="prompt"][data-tid="t3"]');
    await pg.click('#modal-root [data-act="log-session"]');
    await pg.fill('#ss-summary', 'Started sharing.\n\nOutcome: partly done\nWent wrong: nothing');
    await pg.click('[data-act="save-session-ai"]');
    await pg.waitForTimeout(900);
    await pg.click('[data-act="session-accept"]');
    await pg.waitForTimeout(200);
    check('accepting follow-ups says to copy both files again, with Undo', (await pg.textContent('#toast')) === "Session logged. Added 2 tasks to the plan. Added to Rules for Claude Code, in CLAUDE.md. Claude Code follows it once your project's folder has the new CLAUDE.md: Project files has the setup prompt. The setup prompt adds the new tasks to PLAN.md too.Undo", await pg.textContent('#toast'));
    // milestone delete with Undo
    await pg.waitForTimeout(1600);
    let d = await doc();
    const before = JSON.stringify(d.milestones.map((m) => [m.id, m.tasks.length]));
    await pg.click('[data-act="ask-del-ms"][data-id="m2"]');
    await pg.click('[data-act="del-ms"][data-id="m2"]');
    check('deleting a milestone offers Undo', /Milestone deleted: "/.test(await pg.textContent('#toast')) && !!(await pg.$('#toast [data-act="undo"]')) && !(await pg.$('[data-act="ask-del-ms"][data-id="m2"]')));
    await pg.waitForTimeout(1600);
    check('it is gone from the saved project', (await doc()).milestones.length === 1);
    await pg.click('#tab-plan');
    await pg.evaluate(() => document.querySelector('#toast [data-act="undo"]')?.click());
    await pg.waitForTimeout(300);
    const mt = await pg.evaluate(() => document.activeElement?.id || '');
    check('Undo brings it back with its tasks, at its title', /milestones\.m2\.title|m2/.test(mt) && !!(await pg.$('[data-act="ask-del-ms"][data-id="m2"]')), mt);
    await pg.waitForTimeout(1600);
    d = await doc();
    check('and it is saved in its place', JSON.stringify(d.milestones.map((m) => [m.id, m.tasks.length])) === before, [before, d.milestones.map((m) => [m.id, m.tasks.length])]);
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  {
    // an existing project with many working features is not told it has too much scope
    const feats = Array.from({ length: 9 }, (_, i) => ({ id: 'f' + i, title: 'Feature ' + i, priority: 'must', status: 'done' }));
    const seed = { 'p-a': { kind: 'project', name: 'Big App', pitch: 'Lots of parts.', fromCode: true, features: [...feats, { id: 'fx', title: 'New thing', priority: 'must' }], milestones: [{ id: 'm1', title: 'Next', tasks: [{ id: 't1', title: 'Do it' }] }] },
      'p-b': { kind: 'project', name: 'Big New', pitch: 'Lots of parts.', features: feats } };
    const { pg, errs } = await open(b, 'mocked.html', { init: `window.__SEED__ = ${JSON.stringify(seed)};`, wait: 700 });
    await pg.click('[data-act="open"][data-id="p-a"] >> visible=true');
    await pg.waitForTimeout(200);
    await pg.click('#tab-improve');
    const checks = async () => pg.$$eval('.checks li', (x) => x.map((e) => e.textContent.replace(/\s+/g, ' ').trim()).join(' | '));
    const c1 = await checks();
    check('built must-haves are not counted as scope', /Must-have features are picked/.test(c1) && !/is a lot/.test(c1), c1.slice(0, 300));
    await pg.click('[data-act="open"][data-id="p-b"] >> visible=true').catch(async () => { await pg.click('[data-act="open-drawer"]'); await pg.click('[data-act="open"][data-id="p-b"]'); });
    await pg.waitForTimeout(200);
    await pg.click('#tab-improve');
    check('a new project with nine must-haves still is', /9 must-have features is a lot for a first version/.test(await checks()));
    check('no page errors', errs.length === 0, errs);
    await pg.context().close();
  }
  await b.close();
})();
