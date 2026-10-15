// Round 5: data model on the Design tab, Claude's sketch, CLAUDE.md, export/import, layout.
const { launch, open, check, mockDoc, OUT } = require('./lib');
const path = require('path');
const fa = (pg) => pg.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[' + e.dataset.act + ']' : '') : null; });
(async () => {
  const b = await launch();
  {
    const { pg, errs } = await open(b, 'mocked.html');
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Recipe Box');
    await pg.check('input[name="np-starter"][value="web"]');
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(300);
    await pg.click('#tab-design');
    const empty = await pg.textContent('section[aria-labelledby="model-h"]');
    check('empty panel explains itself', /Nothing yet\. List what the app keeps/.test(empty), empty.replace(/\s+/g, ' ').trim());
    const order = await pg.$$eval('.panel h2', (e) => e.map((x) => x.textContent));
    check('panel sits between Screens and Decisions', order.join('|') === 'Features|Screens and parts|Data model|Decisions', order);
    await pg.click('[data-act="add-entity"]');
    let f = await fa(pg);
    check('focus on the new name', /^INPUT#f-entities-e[a-z0-9]+-name$/.test(f), f);
    await pg.keyboard.type('Recipe');
    await pg.fill('.entity textarea >> nth=0', 'title: text\nurl: link\nstatus: todo, cooked');
    await pg.fill('.entity textarea >> nth=1', 'Belongs to a user.');
    await pg.waitForTimeout(1600);
    let d = await mockDoc(pg, 'Recipe Box');
    check('stored', d.entities.length === 1 && d.entities[0].name === 'Recipe' && d.entities[0].fields === 'title: text\nurl: link\nstatus: todo, cooked' && d.entities[0].notes === 'Belongs to a user.', d.entities);
    const labels = await pg.$$eval('.entity [aria-label]', (e) => e.map((x) => x.getAttribute('aria-label')));
    check('fields are labelled', labels.join('|') === 'Name|Fields, one per line|How it connects to the others|Delete', labels);
    check('group and delete take the name as typed', (await pg.getByRole('listitem', { name: 'Recipe' }).count()) === 1 && (await pg.getByRole('button', { name: 'Delete Recipe' }).count()) === 1);
    // CLAUDE.md
    await pg.click('#tab-claudemd');
    const md = await pg.inputValue('#f-claudeMd');
    check('CLAUDE.md has the data model', /## Data model\nUse these names in code, tables and types\.\n- \*\*Recipe\*\*: title \(text\), url \(link\), status \(todo, cooked\)\n  Belongs to a user\.\n/.test(md), md.slice(0, 1200));
    // Claude sketch
    await pg.click('#tab-design');
    await pg.click('[data-act="ai-model"]');
    await pg.waitForTimeout(100);
    check('working note while Claude sketches', /Claude is sketching the data model/.test(await pg.textContent('section[aria-labelledby="model-h"]')));
    await pg.waitForTimeout(600);
    const items = await pg.$$eval('.proposal .prop-list li', (e) => e.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
    check('proposal skips things already there and blank names', items.length === 1 && /^Week plan ?week starts \(date\), days \(list of Recipe\)\. Points at recipes\.$/.test(items[0]), items);
    check('proposal heading', (await pg.textContent('.proposal h3')) === 'Claude suggests this data model');
    f = await fa(pg);
    check('focus on the heading of Claude\'s list (round 45)', f === 'H3#prop-model-h', f);
    await pg.click('[data-act="prop-accept"][data-kind="model"]');
    await pg.waitForTimeout(1600);
    d = await mockDoc(pg, 'Recipe Box');
    check('accepted', d.entities.map((e) => e.name).join('|') === 'Recipe|Week plan' && d.entities[1].fields === 'week starts: date\ndays: list of Recipe', d.entities);
    check('toast', (await pg.textContent('#toast')).startsWith('Added 1 thing to the data model.'), await pg.textContent('#toast'));
    f = await fa(pg);
    check('focus back on Ask Claude', f === 'BUTTON[ai-model]', f);
    // the prompt Claude got carries the existing model
    const prompt = await pg.evaluate(() => window.__prompts.find((x) => x.startsWith('Sketch the data model')));
    check('prompt includes current entities', /"entities":\[\{"name":"Recipe","fields":\["title: text"/.test(prompt), prompt.slice(-400));
    // delete + undo
    await pg.click('[data-act="del-entity"] >> nth=0');
    await pg.waitForTimeout(100);
    f = await fa(pg);
    check('focus moves to the thing next to it, by its name (round 42)', /^INPUT#f-entities-.*-name$/.test(f), f);
    await pg.click('#toast [data-act="undo"]');
    await pg.waitForTimeout(1600);
    d = await mockDoc(pg, 'Recipe Box');
    check('undo restores it first', d.entities.map((e) => e.name).join('|') === 'Recipe|Week plan', d.entities.map((e) => e.name));
    // export -> import
    await pg.click('[data-act="export"]');
    const ex = await pg.inputValue('#m-export');
    check('export has the data model', /## Data model\n\n- \*\*Recipe\*\*\n  - Fields: title: text\n    url: link\n/.test(ex), ex.slice(ex.indexOf('## Data model'), ex.indexOf('## Data model') + 300));
    await pg.click('[data-act="close-modal"]');
    await pg.click('#rail [data-act="open-import"]');
    await pg.fill('#np-text', ex);
    await pg.waitForTimeout(100);
    await pg.click('[data-act="import"]');
    await pg.waitForTimeout(1600);
    const imp = await mockDoc(pg, 'Recipe Box (imported)');
    const pick = (x) => x.entities.map((e) => [e.name, e.fields, e.notes]);
    check('round trip keeps the data model', imp && JSON.stringify(pick(imp)) === JSON.stringify(pick(d)), imp && pick(imp));
    // layout
    await pg.click('#tab-design');
    for (const [w, scheme] of [[1280, 'light'], [390, 'dark']]) {
      await pg.setViewportSize({ width: w, height: 900 });
      await pg.emulateMedia({ colorScheme: scheme });
      await pg.waitForTimeout(150);
      const hs = await pg.evaluate(() => ({ doc: document.documentElement.scrollWidth, vw: innerWidth }));
      check(`no sideways scroll at ${w}`, hs.doc <= hs.vw, hs);
      await pg.locator('section[aria-labelledby="model-h"]').screenshot({ path: path.join(OUT, `model-${w}-${scheme}.png`) });
    }
    check('no page errors', !errs.length, errs);
  }
  {
    const { pg, errs } = await open(b, 'plain.html');
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Offline');
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(200);
    await pg.click('#tab-design');
    check('no Claude button without Claude', !(await pg.$('[data-act="ai-model"]')) && !!(await pg.$('[data-act="add-entity"]')));
    check('no page errors (plain)', !errs.length, errs);
  }
  await b.close();
})();
