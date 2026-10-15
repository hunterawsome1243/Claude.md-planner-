// Focus after row actions: stage, chips, notes, move/delete milestones, delete tasks/features/screens/decisions/lessons,
// promote, rebuild, confirms (button + Escape), delete project, Enter in task title. Run at 1280 and 390.
const { chromium, open, fa, kb, sleep, check, newProjectKb, failCount } = require('./k');
const okf = (f) => f !== 'BODY' && !/HIDDEN|INERT/.test(f);
(async () => {
  const b = await chromium.launch();
  for (const w of [1280, 390]) {
    console.log(`\n===== width ${w} =====`);
    const vp = { width: w, height: w === 390 ? 844 : 900 };
    const { pg, errs } = await open(b, 'mocked.html', { viewport: vp });
    await newProjectKb(pg, 'Recipe Box', 'Save recipes from links', true);
    await sleep(600);
    const T = async (name, sel, expect, key) => { await kb(pg, sel, key); await sleep(30); const f = await fa(pg); check(`[${w}] ${name}`, okf(f) && (!expect || expect.test(f)), f); return f; };
    // stage buttons
    if (await pg.$('[data-act="hide-guide"]')) { await pg.click('[data-act="hide-guide"]'); await pg.waitForTimeout(100); }
    await T('stage button keeps focus + aria-pressed', '[data-act="stage"][data-k="building"]', /\[stage\]/);
    console.log('  aria-pressed building =', await pg.getAttribute('[data-act="stage"][data-k="building"]', 'aria-pressed'), ' designing =', await pg.getAttribute('[data-act="stage"][data-k="designing"]', 'aria-pressed'));
    await T('stage via Space', '[data-act="stage"][data-k="polishing"]', /\[stage\]/, 'Space');
    // set-task in next up
    await T('Next-up Start it -> Mark done keeps focus', '.next [data-act="set-task"]', /Mark done/);
    await T('Next-up Mark done moves to the next task\'s prompt (round 41)', '.next [data-act="set-task"]', /#next-prompt/);
    // Plan tab
    await kb(pg, '[data-act="tab"][data-k="plan"]');
    console.log('  tab aria-selected plan =', await pg.getAttribute('#tab-plan', 'aria-selected'), ' overview =', await pg.getAttribute('#tab-overview', 'aria-selected'));
    await T('cycle-task chip keeps focus', '[data-act="cycle-task"] >> nth=0', /\[cycle-task\]/);
    await T('cycle-task chip via Space', '[data-act="cycle-task"] >> nth=0', /\[cycle-task\]/, 'Space');
    await T('toggle-notes opens and focuses notes', '[data-act="toggle-notes"] >> nth=0', /t-notes|notes/);
    const exp = await pg.getAttribute('[data-act="toggle-notes"] >> nth=0', 'aria-expanded');
    check(`[${w}] toggle-notes aria-expanded true when open`, exp === 'true', exp);
    await T('toggle-notes closes and keeps focus', '[data-act="toggle-notes"] >> nth=0', /\[toggle-notes\]/);
    console.log('  aria-expanded after close =', await pg.getAttribute('[data-act="toggle-notes"] >> nth=0', 'aria-expanded'));
    // Enter in a task title adds the next task right below and focuses it
    const before = await pg.locator('.task').count();
    await pg.focus('.t-title >> nth=0');
    const firstMid = await pg.getAttribute('.t-title >> nth=0', 'data-mid');
    await pg.keyboard.press('Enter');
    await sleep(30);
    const after = await pg.locator('.task').count();
    const fTask = await pg.evaluate(() => { const a = document.activeElement; const all = [...document.querySelectorAll('.t-title')]; return { idx: all.indexOf(a), val: a.value, cls: a.className }; });
    check(`[${w}] Enter in a task title adds an empty task right after it and focuses it`, after === before + 1 && fTask.idx === 1 && fTask.val === '', fTask);
    await pg.keyboard.type('Typed into new task');
    await pg.keyboard.press('Enter');
    const fTask2 = await pg.evaluate(() => { const all = [...document.querySelectorAll('.t-title')]; return { idx: all.indexOf(document.activeElement), vals: all.slice(0, 4).map((x) => x.value) }; });
    check(`[${w}] second Enter adds another after the typed one`, fTask2.idx === 2 && fTask2.vals[1] === 'Typed into new task', fTask2);
    // delete tasks: middle, then the last in the milestone
    await T('delete task moves focus to the task above, not a Delete (round 42)', '[data-act="del-task"] >> nth=1', /f-milestones-.*-title/);
    // delete all tasks of milestone 2 -> add-task
    const m2 = await pg.evaluate(() => document.querySelectorAll('.ms')[1].querySelector('[data-act="add-task"]').dataset.mid);
    while (await pg.locator(`[data-act="del-task"][data-mid="${m2}"]`).count() > 1) await kb(pg, `[data-act="del-task"][data-mid="${m2}"] >> nth=0`);
    await T('delete the only task -> Add task of that milestone', `[data-act="del-task"][data-mid="${m2}"]`, /\[add-task\]/);
    // add milestone, add task via button
    await T('Add milestone focuses new milestone name', '[data-act="add-ms"]', /ms-title|milestones/);
    await pg.keyboard.type('Third');
    await T('Add task focuses new task title', '[data-act="add-task"] >> nth=-1', /(INPUT|TEXTAREA)#f-milestones-[^ ]*-title/);
    // move milestones
    await T('move first milestone down (to middle) keeps focus on its move-down', '[data-act="ms-move"][data-d="1"] >> nth=0', /Move milestone \d down/);
    await T('move last-but-one down into last slot -> its move-up', '[data-act="ms-move"][data-d="1"] >> nth=1', /Move milestone \d up/);
    await T('move second milestone up into first slot', '[data-act="ms-move"][data-d="-1"] >> nth=1', /ms-title|Move milestone/);
    // milestone delete confirm: Escape cancels and returns to trash
    await T('ask delete milestone keeps focus on trash', '[data-act="ask-del-ms"] >> nth=0', /\[ask-del-ms\]/);
    check(`[${w}] milestone confirm shown`, !!(await pg.$('.ms .confirm')), '');
    await pg.keyboard.press('Escape'); await sleep(30);
    const fe = await fa(pg);
    check(`[${w}] Escape cancels milestone confirm and focuses its trash`, !(await pg.$('.ms .confirm')) && /\[ask-del-ms\]/.test(fe), fe);
    await kb(pg, '[data-act="ask-del-ms"] >> nth=0');
    await pg.focus('.ms .confirm [data-act="del-ms"]'); await pg.keyboard.press('Escape'); await sleep(30);
    const fe2 = await fa(pg);
    check(`[${w}] Escape while focus is on "Delete milestone" cancels and returns to trash`, /\[ask-del-ms\]/.test(fe2), fe2);
    await kb(pg, '[data-act="ask-del-ms"] >> nth=-1');
    await T('Keep it returns to trash', '.ms .confirm [data-act="cancel-confirm"]', /\[ask-del-ms\]/);
    await kb(pg, '[data-act="ask-del-ms"] >> nth=-1');
    await T('delete last milestone -> previous milestone name', '.ms .confirm [data-act="del-ms"]', /(INPUT|TEXTAREA)#f-milestones-[^ ]*-title/);
    await kb(pg, '[data-act="ask-del-ms"] >> nth=0');
    await T('delete first milestone -> next milestone name', '.ms .confirm [data-act="del-ms"]', /(INPUT|TEXTAREA)#f-milestones-[^ ]*-title/);
    await kb(pg, '[data-act="ask-del-ms"] >> nth=0');
    await T('delete only milestone -> Add milestone', '.ms .confirm [data-act="del-ms"]', /\[add-ms\]/);
    // Design tab
    await kb(pg, '[data-act="tab"][data-k="design"]');
    await T('cycle-feature keeps focus', '[data-act="cycle-feature"] >> nth=0', /\[cycle-feature\]/);
    const pri = await pg.getAttribute('select[data-path$=".priority"] >> nth=0', 'id');
    await pg.focus('#' + pri); await pg.selectOption('#' + pri, 'could'); await sleep(30);
    const fp = await fa(pg);
    check(`[${w}] priority change keeps focus on the moved select`, fp.includes(pri), fp);
    await T('delete feature', '[data-act="del-feature"] >> nth=0', /\[del-feature\]|\[add-feature\]/);
    await T('add screen focuses its name', '[data-act="add-screen"]', /screens/); await pg.keyboard.type('Home');
    await kb(pg, '[data-act="add-screen"]'); await pg.keyboard.type('List');
    await T('delete first screen -> next screen\'s name (round 42)', '[data-act="del-screen"] >> nth=0', /f-screens-.*-name/);
    await T('delete last screen -> Add screen', '[data-act="del-screen"] >> nth=0', /\[add-screen\]/);
    await T('add decision focuses its text', '[data-act="add-decision"]', /decisions/);
    await T('delete only decision -> Add decision', '[data-act="del-decision"] >> nth=0', /\[add-decision\]/);
    // Improve
    await kb(pg, '[data-act="tab"][data-k="improve"]');
    await T('habit checkbox keeps focus after Space', '#f-checks-git', /f-checks-git/, 'Space');
    console.log('  habit checked =', await pg.isChecked('#f-checks-git'));
    await T('add lesson focuses What happened', '[data-act="add-lesson"]', /lessons/); await pg.keyboard.type('Oops');
    await T('promote with empty change focuses the change field', '[data-act="promote"] >> nth=0', /change/);
    await pg.keyboard.type('Only change named files');
    await T('promote moves focus to the lesson delete', '[data-act="promote"] >> nth=0', /\[del-lesson\]/);
    await kb(pg, '[data-act="add-lesson"]'); await pg.keyboard.type('Second');
    await T('delete first lesson -> next lesson\'s text (round 42)', '[data-act="del-lesson"] >> nth=0', /f-lessons-.*-happened/);
    await T('delete last lesson -> Add lesson', '[data-act="del-lesson"] >> nth=0', /\[add-lesson\]/);
    // Fix button in plan checks -> tab
    if (await pg.$('.check [data-act="tab"]')) await T('Fix button moves to the tab', '.check [data-act="tab"] >> nth=0', /role|\[tab\]/);
    // CLAUDE.md rebuild
    await kb(pg, '[data-act="tab"][data-k="claudemd"]');
    await pg.focus('#f-claudeMd'); await pg.keyboard.press('Control+End'); await pg.keyboard.type('\nmy edit'); await sleep(30);
    const fm = await fa(pg);
    check(`[${w}] typing into CLAUDE.md (becomes edited, re-render) keeps focus`, /f-claudeMd/.test(fm), fm);
    await T('ask rebuild keeps focus', '[data-act="ask-rebuild"]', /\[ask-rebuild\]/);
    await pg.keyboard.press('Escape'); await sleep(30);
    const fr = await fa(pg);
    check(`[${w}] Escape cancels rebuild confirm and returns to its button`, !(await pg.$('.confirm')) && /\[ask-rebuild\]/.test(fr), fr);
    await kb(pg, '[data-act="ask-rebuild"]');
    await T('Replace (rebuild) -> Copy', '[data-act="rebuild-md"]', /\[copy-md\]/);
    // project delete: confirm, Escape, Keep it, Delete (two projects, then last)
    await kb(pg, '[data-act="tab"][data-k="overview"]');
    await kb(pg, '#more-btn'); await T('ask delete project focuses Keep it', '[data-act="ask-delete"]', /\[cancel-confirm\]/);
    await pg.keyboard.press('Escape'); await sleep(30);
    check(`[${w}] Escape cancels project confirm, focus on More`, /#more-btn/.test(await fa(pg)), await fa(pg));
    await kb(pg, '#more-btn'); await kb(pg, '[data-act="ask-delete"]');
    await T('Delete the only project -> Start a project', '[data-act="delete-project"]', /new-project/);
    // only project now? create check
    const count = await pg.locator('#plist .pitem').count();
    console.log('  projects left:', count);
    while (await pg.locator('#plist .pitem').count() > 0) {
      await kb(pg, '#more-btn'); await kb(pg, '[data-act="ask-delete"]');
      await kb(pg, '[data-act="delete-project"]');
      await sleep(80);
    }
    const fd = await fa(pg);
    check(`[${w}] focus after deleting the last project is a visible control`, okf(fd), fd);
    console.log(`errors[${w}]`, errs);
    await pg.context().close();
  }
  console.log('\nfails:', failCount());
  await b.close();
})();
