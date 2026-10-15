// Round 35: the generated Claude Code files after review 8a, unit checks
const U = require('./unit-lib');
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); };
const p = U.normalize({ name: 'Plant Pal', pitch: 'Water plants on time.', commands: 'npm install\nnpm run dev\nnpm test\nnpx eslint .\ngit push origin main',
  features: [{ title: 'Plant list', priority: 'must', status: 'done' }, { title: 'Reminders', priority: 'must' }, { title: 'Photos', priority: 'should', status: 'done' }] });

// A1, A2: settings.json
const s = JSON.parse(U.settingsJson(p));
check('allow has a PowerShell rule next to every Bash rule', JSON.stringify(s.permissions.allow) === JSON.stringify(['Bash(npm install)', 'PowerShell(npm install)', 'Bash(npm test *)', 'PowerShell(npm test *)', 'Bash(npx eslint . *)', 'PowerShell(npx eslint . *)']), s.permissions.allow);
check('ask covers git push and pull requests in both shells', JSON.stringify(s.permissions.ask) === JSON.stringify(['Bash(git push *)', 'Bash(gh pr create *)', 'PowerShell(git push *)', 'PowerShell(gh pr create *)']), s.permissions.ask);
check('deny is unchanged', JSON.stringify(s.permissions.deny) === JSON.stringify(['Read(.env)', 'Read(.env.*)', 'Read(!.env.example)', 'Read(secrets/**)']));
check('the keys run allow, ask, deny', Object.keys(s.permissions).join() === 'allow,ask,deny');
const none = JSON.parse(U.settingsJson(U.normalize({ name: 'X' })));
check('with no commands, allow is empty but ask is still there', none.permissions.allow.length === 0 && none.permissions.ask.length === 4);
check('the reviewer can use PowerShell', /\ntools: Read, Grep, Glob, Bash, PowerShell\n/.test(U.reviewerMd(p)));
check('so can the test runner', /\ntools: Bash, PowerShell, Read, Grep, Glob\n/.test(U.testerMd(p)));

// A3: ```! anywhere
const pc = U.plainCommandText;
check('a ```! fence at the start of a line is defused', pc('```!\nls\n```') === '```\nls\n```', pc('```!\nls\n```'));
check('also one in the middle of a line', pc('see ```!ls``` here') === 'see ```ls``` here', pc('see ```!ls``` here'));
check('and a four-backtick fence', pc('````!\nls\n````') === '````\nls\n````', pc('````!\nls\n````'));
check('ordinary fences are left alone', pc('```js\nx\n```') === '```js\nx\n```');

// A4: the starters leave .env to the owner
const tasks = (k) => { const st = U.STARTERS.find((x) => x.k === k).build(); return [...st.first.tasks, ...(st.last?.tasks || [])].map((t) => `${t.title} ${t.notes}`).join('\n'); };
const ai = tasks('ai'), bot = tasks('bot');
check('the AI starter makes .env.example and asks me to paste the key', /Make \.env\.example with ANTHROPIC_API_KEY= in it, then tell me to copy it to \.env and paste my key there myself\./.test(ai) && /add one with __pycache__\/, \.pytest_cache\/, \.venv\/ and \.env\./.test(ai), ai.split('\n').filter((l) => /env/i.test(l)));
check('the Discord starter does the same for the token', /Make \.env\.example with DISCORD_TOKEN=, CLIENT_ID= and GUILD_ID= in it, and a \.gitignore with node_modules\/ and \.env\./.test(bot) && /copy \.env\.example to \.env and paste in the bot's token[^.]*yourself\./.test(bot), bot.split('\n').filter((l) => /env/i.test(l)));
const anyPut = U.STARTERS.filter((x) => x.build).some((x) => /Put [A-Z_]+ in \.env/.test(tasks(x.k)));
check('no starter asks Claude to write .env', !anyPut);

// A6: CLAUDE.md
const md = U.buildClaudeMd(p);
check('features carry no "(built)"', !/\(built\)/.test(md) && /\n- Plant list\n- Reminders\n/.test(md), md.split('\n').filter((l) => /Plant|Remind|Photo/.test(l)));
check('How to work points at PLAN.md, with the day (round 46: /next is the owner\'s, so not named)', /## How to work in this repo\n- The plan is in PLAN\.md, and its top says how to use it\. When a task works, tick it there: "- \[ \]" becomes "- \[x\]", and "\(S\)" becomes "\(S, done YYYY-MM-DD\)" with today's date\.\n- Read the files a task touches before changing them\.\n/.test(md), md.slice(md.indexOf('## How to work')).split('\n').slice(0, 4));
check('and no longer says "Read this file"', !/Read this file/.test(md));

// A7, A11: habits
const H = Object.fromEntries(U.HABITS.map((h) => [h.k, h]));
check('plan mode: /plan, Shift+Tab or the desktop menu', /Type \/plan before the request, or press Shift\+Tab/.test(H.planmode.hint) && /desktop app, pick Plan/.test(H.planmode.hint), H.planmode.hint);
check('the diff habit fits auto mode', H.diff.label === 'Review what changed before moving on' && /\/diff/.test(H.diff.hint) && /\/rewind/.test(H.diff.hint), H.diff);

// A8: /next
const nx = U.nextCommandMd(p);
check('/next splits a large task into steps in PLAN.md (round 46)', /If it is marked \(L\) and has no steps yet, tell me how you would split it into steps, wait for my OK, write them as indented "- \[ \]" lines under it, then do only the first one\./.test(nx));
check('/next finds a bug\'s cause first and adds a failing test', /For a bug, find the cause before changing code \(reproduce it if you can\), and if the project has tests, add one that fails because of the bug\./.test(nx));

// A10: quoted report lines
const r1 = U.sessionReport('Added the list.\n\n"Outcome: partly done"\n`Went wrong: the test timed out`');
check('a report line in quotes still counts', r1.outcome === 'partly', r1);
check('one in backticks too', /test timed out/.test(r1.wrong || ''), r1.wrong);
const r2 = U.sessionReport('Did it.\n> “Outcome: done”\n> ‘Went wrong: nothing’');
check('curly quotes after a quote mark', r2.outcome === 'done', r2);
check('a quoted line that is not a report line is left alone', U.sessionReport('"Outcomes vary," it said.\nOutcome: stuck').outcome === 'stuck');
check('history lines drop quoted report lines', U.reportBody('Did it.\n"Outcome: done"\n`Went wrong: nothing`') === 'Did it.', U.reportBody('Did it.\n"Outcome: done"\n`Went wrong: nothing`'));

// A12: the bug prompt keeps going without a repro
const bp = U.bugPrompt(U.normalize({ name: 'X', bugs: [{ id: 'b', title: 'Crash' }] }), U.normalize({ name: 'X', bugs: [{ id: 'b', title: 'Crash' }] }).bugs[0]);
check('reproduce if you can, else work from the code', /Reproduce the bug if you can: with a failing test, a script or a browser tool\. If you cannot, say so and work from the code\./.test(bp) && !/tell me what you tried and stop/.test(bp));

// A13: no token from the remote
check('the survey keeps tokens out of the repo address', /without any username or token in it/.test(U.surveyPrompt()));
console.log(fails ? `fails: ${fails}` : 'fails: 0');
process.exitCode = fails ? 1 : 0;
