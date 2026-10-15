// Round 53: review 11a, the starting points as today's tools need them
const { launch, open, check, results } = require('../r48/lib');
const docs = (pg) => pg.evaluate(() => [...window.__mockDocs.values()]);
const tasks = (p) => p.milestones.flatMap((m) => m.tasks);
const task = (p, re) => tasks(p).find((t) => re.test(t.title)) || { title: '', notes: '' };
(async () => {
  const b = await launch();
  const { pg, errs } = await open(b, 'mocked.html', { init: `localStorage.setItem('shipyard.seen.v1', '99');`, wait: 700 });
  const made = {};
  for (const k of ['web', 'mobile', 'ai', 'game', 'extension', 'cli', 'script', 'api', 'bot']) {
    await pg.click('[data-act="new-project"] >> visible=true');
    await pg.fill('#np-name', 'Try ' + k);
    await pg.check('#np-st-' + k);
    await pg.click('[data-act="create"]');
    await pg.waitForTimeout(150);
  }
  await pg.waitForTimeout(1200);
  for (const p of await docs(pg)) made[p.starter] = p;
  check('all nine starting points made a project', Object.keys(made).length === 9, Object.keys(made));
  const { web, mobile, ai, game, extension, cli, script, api, bot } = made;
  // mobile
  const m1 = task(mobile, /^Create an Expo app/).notes;
  check("Expo's scaffold leaves .claude alone", /--yes --no-agents-md/.test(m1) && /never replacing CLAUDE\.md or anything in \.claude/.test(m1), m1);
  check('...and the phone check is the owner\'s own step, with an Expo account', /Do not start the dev server: tell me to run npx expo start in a second terminal myself/.test(m1) && /npx expo login/.test(m1) && /--tunnel/.test(m1) && !/then run npx expo start\./.test(m1));
  check('screens go in src/app', /src\/app/.test(mobile.conventions) && /src\/lib/.test(mobile.conventions));
  check('iPhones are added before the build, and testers get TestFlight or Play testing', /eas device:create/.test(task(mobile, /^Build a preview with EAS/).notes) && !!task(mobile, /TestFlight/).title);
  // AI app
  const a1 = task(ai, /^Set up a uv project with anthropic/).notes;
  check('the AI app pins Python 3.12, runs Streamlit headless and says where the key comes from', /uv init --no-package --python 3\.12/.test(a1) && /headless = true/.test(a1) && /platform\.claude\.com, billed apart from any Claude plan/.test(a1), a1);
  check('...names a current model and keeps tone out of temperature', /claude-sonnet-5-5/.test(ai.conventions) && /not with temperature/.test(ai.conventions));
  // Python
  check('every Python starter pins 3.12', [cli, script, api].every((p) => tasks(p).some((t) => /uv init (--package|--no-package) --python 3\.12/.test(t.notes))));
  check('...and the ones started inside git get a .gitignore', [ai, script, api].every((p) => tasks(p).some((t) => /__pycache__\/, \.pytest_cache\/, \.venv\/ and \.env/.test(t.notes))));
  // Node
  check('Node 22.12 or newer', [web, game, extension].every((p) => /Node\.js 22\.12 or newer/.test(p.stack)));
  check('Vitest finishes', /"vitest run"/.test(task(web, /^Add Vitest/).notes) && /"vitest run"/.test(task(game, /^Add Vitest/).notes));
  // deploys
  check('deploys start from GitHub', [web, ai, api, bot].every((p) => { const t = tasks(p).map((x) => x.title); const g = t.indexOf('Put the code on GitHub'); return g >= 0 && t.slice(g + 1).some((x) => /^(Deploy|Host)/.test(x)); }));
  check('SQLite survives a deploy', /persistent disk or volume/.test(task(api, /^Deploy it to a host/).notes) && /still there after a redeploy/.test(task(api, /^Deploy it to a host/).notes));
  check('the game is zipped for itch.io', /zip what is inside dist \(index\.html at the top of the zip\)/.test(task(game, /^Publish it on itch/).notes));
  check('the extension is published', /one-time fee/.test(task(extension, /^Publish it on the Chrome Web Store/).notes));
  // bot
  const b1 = task(bot, /^Set up a Node project/).notes; const b2 = task(bot, /^Create the bot/).notes;
  check('the bot asks for its token once the bot exists, with its ids', /CLIENT_ID= and GUILD_ID=/.test(b1) && !/paste my token/.test(b1) && /paste in the bot's token, its application ID \(CLIENT_ID\) and your test server's ID \(GUILD_ID/.test(b2));
  check('...and registers its commands for every server', /applicationCommands with CLIENT_ID/.test(task(bot, /^Register the commands for every server/).notes));
  // Start Claude Code lists the accounts
  await pg.click('#plist li >> text=Try ai');
  await pg.waitForTimeout(150);
  await pg.click('#tab-claudemd');
  await pg.evaluate(() => document.querySelector('[data-act="cc-setup"]').click());
  await pg.waitForTimeout(150);
  const acc = await pg.$$eval('.cc-needs li', (x) => x.map((e) => e.textContent.trim()));
  check('Start Claude Code lists the accounts the AI app uses', acc.some((t) => /^Claude Console \(for the API key, billed apart from your Claude plan/.test(t)) && acc.some((t) => /^GitHub \(free;/.test(t)), acc);
  await pg.keyboard.press('Escape');
  await pg.click('#plist li >> text=Try cli');
  await pg.waitForTimeout(150);
  await pg.click('#tab-claudemd');
  await pg.evaluate(() => document.querySelector('[data-act="cc-setup"]').click());
  await pg.waitForTimeout(150);
  check('...and none for a command-line tool', !(await pg.$$eval('.cc-for', (x) => x.map((e) => e.textContent))).includes('Accounts it uses'));
  check('no page errors', !errs.length, errs);
  await b.close();
  const fails = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - fails} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})();
