// Dialog open/close focus: opener restore, create, Ctrl+Enter, Tab wrap, inert, Escape, at 1280 and 390.
const { chromium, open, fa, kb, sleep, check, newProjectKb, failCount } = require('./k');
(async () => {
  const b = await chromium.launch();
  for (const w of [1280, 390]) {
    console.log(`\n===== width ${w} =====`);
    const vp = { width: w, height: w === 390 ? 844 : 900 };
    // 1. welcome screen: "Start a project" -> Escape
    {
      const { pg, errs } = await open(b, 'mocked.html', { viewport: vp });
      await kb(pg, '.welcome [data-act="new-project"]');
      await sleep(50);
      console.log('after Enter on welcome "Start a project":', await fa(pg));
      await pg.keyboard.press('Escape');
      await sleep(50);
      const f = await fa(pg);
      check(`[${w}] Escape from New project opened by welcome "Start a project" returns to it`, /Start a project/.test(f), f);
      // 2. mbar New (phone) or rail New project
      const opener = w === 390 ? '.mbar [data-act="new-project"]' : '#rail [data-act="new-project"]';
      await kb(pg, opener);
      await sleep(50);
      await pg.keyboard.press('Escape');
      await sleep(50);
      const f2 = await fa(pg);
      check(`[${w}] Escape from New project opened by ${opener} returns to it`, w === 390 ? /@mbar/.test(f2) && !/HIDDEN/.test(f2) : /@rail/.test(f2), f2);
      // Cancel button
      await kb(pg, opener);
      await sleep(50);
      await kb(pg, '[data-act="close-modal"]');
      await sleep(50);
      const f3 = await fa(pg);
      check(`[${w}] Cancel button returns focus to ${opener}`, w === 390 ? /@mbar/.test(f3) && !/HIDDEN/.test(f3) : /@rail/.test(f3), f3);
      // 3. keyboard create (no Claude): type name, Enter -> idea, Tab to Create, Enter
      await kb(pg, opener);
      await sleep(50);
      await pg.keyboard.type('Alpha');
      await pg.keyboard.press('Enter');
      const fIdea = await fa(pg);
      check(`[${w}] Enter in the new-project name moves to the idea`, /np-idea/.test(fIdea), fIdea);
      check(`[${w}] ...and does not create`, await pg.evaluate(() => !!document.querySelector('.modal')), '');
      await pg.keyboard.type('Plain idea');
      await pg.keyboard.press('Tab'); await pg.keyboard.press('Tab'); await pg.keyboard.press('Tab');
      console.log('  Tab x3 from idea lands on:', await fa(pg));
      await pg.focus('[data-act="create"]');
      await pg.keyboard.press('Enter');
      await sleep(250);
      const f4 = await fa(pg);
      check(`[${w}] focus after Create (keyboard) is not BODY`, f4 !== 'BODY', f4);
      await pg.keyboard.press('Tab');
      console.log('  next Tab after Create goes to:', await fa(pg));
      // 4. Ctrl+Enter create with Claude
      await kb(pg, opener);
      await sleep(50);
      await pg.keyboard.type('Beta'); await pg.keyboard.press('Enter'); await pg.keyboard.type('An idea for Claude');
      await pg.keyboard.press('Control+Enter');
      await sleep(80);
      const f5 = await fa(pg);
      const working = await pg.evaluate(() => !!document.querySelector('.working'));
      check(`[${w}] Ctrl+Enter in idea creates with Claude (working shown)`, working && !(await pg.$('.modal')), { working });
      check(`[${w}] focus right after Ctrl+Enter create is not BODY`, f5 !== 'BODY', f5);
      await sleep(700);
      const f6 = await fa(pg);
      check(`[${w}] focus after Claude finished drafting is not BODY`, f6 !== 'BODY', f6);
      // 5. Ctrl+Enter with empty idea -> error shown, focus to idea
      await kb(pg, opener); await sleep(50);
      await pg.keyboard.type('Gamma'); await pg.keyboard.press('Enter'); await pg.keyboard.press('Control+Enter'); await sleep(50);
      const err = await pg.evaluate(() => document.querySelector('.modal [role="alert"]')?.textContent);
      check(`[${w}] Ctrl+Enter with empty idea keeps dialog and shows error`, !!err, { err, focus: await fa(pg) });
      await pg.keyboard.press('Escape'); await sleep(50);
      // 6. prompt dialog from next-up: Enter does not insert newline; Tab wrap; inert; Escape returns
      const nextBtn = '.next [data-act="prompt"]';
      await kb(pg, nextBtn); await sleep(80);
      const ta = await pg.evaluate(() => ({ focus: document.activeElement.id, endsNL: /\n$/.test(document.querySelector('#m-prompt').value) }));
      check(`[${w}] Enter on "Get the Claude Code prompt" focuses textarea without inserting a newline`, ta.focus === 'm-prompt' && !ta.endsNL, ta);
      check(`[${w}] #app is inert while dialog open`, await pg.evaluate(() => document.getElementById('app').inert), '');
      const seq = [];
      for (let i = 0; i < 6; i++) { await pg.keyboard.press('Tab'); seq.push(await fa(pg)); }
      check(`[${w}] Tab cycles inside the prompt dialog`, seq.every((s) => /@modal/.test(s) || /^BUTTON\[undo\] "Undo"/.test(s)), seq.map((s) => s.split(' @')[0]).join(' > '));
      const back = [];
      for (let i = 0; i < 6; i++) { await pg.keyboard.press('Shift+Tab'); back.push(await fa(pg)); }
      check(`[${w}] Shift+Tab cycles inside the prompt dialog`, back.every((s) => /@modal/.test(s) || /^BUTTON\[undo\] "Undo"/.test(s)), back.map((s) => s.split(' @')[0]).join(' > '));
      await pg.keyboard.press('Escape'); await sleep(50);
      const f7 = await fa(pg);
      check(`[${w}] Escape from prompt dialog returns to Next-up prompt button`, /\[prompt\]/.test(f7) && /@sheet/.test(f7), f7);
      check(`[${w}] #app not inert after close`, await pg.evaluate(() => !document.getElementById('app').inert), '');
      // Tab after close is not trapped
      const after = [];
      for (let i = 0; i < 4; i++) { await pg.keyboard.press('Tab'); after.push(await fa(pg)); }
      check(`[${w}] Tab after dialog closes moves through the page`, after.every((s) => s !== 'BODY' && !/@modal/.test(s)), after.map((s) => s.split(' @')[0]).join(' > '));
      // 7. export dialog
      if (w === 390) { await kb(pg, '#more-btn'); await sleep(50); await kb(pg, '#more-list [data-act="export"]'); } else await kb(pg, '[data-act="export"]'); // on a phone Export is in More (round 48)
      await sleep(50);
      console.log('  export dialog first focus:', await fa(pg));
      await pg.keyboard.press('Escape'); await sleep(50);
      const f8 = await fa(pg);
      check(`[${w}] Escape from export returns to Export (on a phone, to More)`, (w === 390 ? /\[toggle-more\]/ : /\[export\]/).test(f8), f8);
      // 8. sharpen busy: Escape ignored, focus kept in dialog; Stop
      await pg.evaluate(() => { window.__SAMPLE_DELAY__ = 800; });
      await kb(pg, nextBtn); await sleep(50);
      await kb(pg, '[data-act="sharpen"]'); await sleep(60);
      const f9 = await fa(pg);
      check(`[${w}] focus after Enter on Sharpen stays in dialog`, /@modal/.test(f9), f9);
      await pg.keyboard.press('Escape'); await sleep(100);
      check(`[${w}] Escape while sharpening keeps the dialog and stops Claude`, !!(await pg.$('.modal')) && !(await pg.$('[data-act="stop-sharpen"]')), '');
      const f10 = await fa(pg);
      check(`[${w}] focus after Escape stops sharpening stays in dialog`, /@modal/.test(f10), f10);
      await kb(pg, '[data-act="sharpen"]'); await sleep(1000);
      const f11 = await fa(pg);
      check(`[${w}] focus after sharpening finished stays in dialog`, /@modal/.test(f11), f11);
      await pg.evaluate(() => { window.__SAMPLE_DELAY__ = 0; });
      await pg.keyboard.press('Escape'); await sleep(50);
      console.log('  after Escape:', await fa(pg));
      console.log(`errors[${w}]`, errs);
      await pg.context().close();
    }
  }
  console.log('\nfails:', failCount());
  await b.close();
})();
