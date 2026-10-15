# Developing Shipyard Planner

## How it is put together

Shipyard is one page: `src/shell.html` holds the styles and static markup, and `src/app.js` is the whole script, plain JavaScript in one function with no framework and no dependencies. `npm run build` (`scripts/build.js`) puts the script into the shell where it says `/* @@APP_JS@@ */` and writes:

- `index.html`, a complete page that opens from disk or from any static host. It is committed, so people can use the app without building it.
- `dist/shipyard.html`, the same page without the `<html>`/`<head>` wrapper, which is the form claude.ai publishes. The tests are built from it.

`src/app.js` is in sections, each starting with a `/* ================= name` line:

| Section | What is in it |
| --- | --- |
| helpers, model | Small helpers; `normalize` turns any stored or imported project into the current shape; `blankProject`, `mkTask` and friends |
| generated text, starters | Prompts for Claude Code; the starting points (web app, CLI, game and so on) |
| import + backup | Reading a CLAUDE.md, README, export or backup; writing backups |
| repo files | CLAUDE.md, PLAN.md, the `/next` command, `.claude/settings.json`, subagents; reading PLAN.md back |
| looking back, session report, describing a project | Milestone recaps, reading a pasted Claude Code summary, the "describe my code" survey |
| health | The plan checks on Overview |
| state | `S`, the single object that holds what is on screen |
| storage | `Store`: saving, syncing and merging (below) |
| claude | `initCapabilities` and every request to Claude |
| rendering | `renderAll` → `renderRail`, `renderSheet`, `renderModal`; each tab is a function returning HTML |
| actions | One delegated click/input/key handler; buttons say what they do with `data-act` |
| boot | `renderAll(); Store.init(); initCapabilities();` |

Everything above the `health` line is pure (no DOM, no storage), so unit tests load that part of the file straight into Node.

### Storage

On claude.ai the page has a `window.claude` runtime. Shipyard asks it for `db` (a small document store: one document per project in the `projects` collection), `sample` (Claude's replies), `downloads` and `user` (who is looking). Anywhere else there is no `window.claude`, so:

- projects are saved to `localStorage` (`shipyard.projects.v1`) and the page says "Saved in this browser only";
- the buttons that ask Claude are hidden;
- Back up and Export download files through the browser.

With the db, the browser keeps a copy (`shipyard.mirror.v1`). Changes that cannot reach the account are kept in the browser and saved on the next visit that connects. Edits from two tabs or devices merge three ways, field by field, with list items matched by id.

Saves wait about 0.7 s after the last change.

### Notes that are easy to trip over

- Shipyard avoids regex lookbehind, because Safari before 16.4 rejects the whole script.
- `src/app.js` must not contain the text `</script` (the build checks).
- `normalize`, `mkChat` and `mkReview` keep fields this version does not know (`withRest`), so an older copy of the page never drops a newer one's data.
- Some estimates depend on the weekday (the pace counts the part of this week gone by), so tests compute their expectations from the current date.
- `WN_VER` is the version shown in What's new; raise it with each release that has something to tell.
- The Claude Code command names (`BUILTIN_CMDS`), install commands (`CC_INSTALL`) and settings.json rules were checked against code.claude.com in October 2026.

## Tests

```sh
npm install && npx playwright install chromium   # once
npm test                                          # build, then everything
node test/run.js unit                             # fast checks only
node test/run.js r19 storage                      # files whose path has one of these words
JOBS=2 node test/run.js                           # fewer files at once on a slow machine
```

`test/run.js` runs every `*.test.js` under `test/`, a few at a time, and prints one line per file. A file fails when it exits with an error, prints a line starting with `FAIL`, prints `fails: N` above 0, or the page throws an uncaught error. A failed file is run once more on its own (a few tests that reload pages can trip over a busy machine); `RETRY=0` turns that off. Each file's whole output goes to `test/out/`.

A few layout checks measure text in pixels. The tests block web fonts, so the page uses the system's sans-serif font, and those checks expect Inter. On macOS and Windows a handful may fail for that reason alone. On Linux, install Inter (`sudo apt-get install fonts-inter`) and copy `test/fonts/56-prefer-inter.conf` to `/etc/fonts/conf.d/`, as CI does.

The browser tests open pages built by `test/build-pages.js` (run by `npm run build`):

- `test/mocked.html` puts `test/mock.js` in front of the app. The mock stands in for claude.ai: an in-memory db (`window.__mockDocs`), canned Claude replies chosen by the first words of each prompt, and downloads. A test can seed projects with `window.__SEED__` or set who is looking with `window.__USER__`.
- `test/plain.html` has no runtime, like `index.html` opened from disk.

| Folder | What it covers |
| --- | --- |
| `test/features/rN/` | One folder per feature, numbered in the order they were added ([history.md](history.md) says what each added). `a-*.test.js` drive the browser, `u-*.test.js` check pure functions |
| `test/functional/` | The main flows end to end: creating, editing, syncing, Claude, browser-only mode, phones |
| `test/storage/` | Saving when the account store fails, is slow or is shared between tabs |
| `test/keyboard/` | Keys, focus and dialogs |
| `test/walkthrough/` | A first-time user's path, at phone and desktop widths, in light and dark |
| `test/fixtures/` | Sample data the tests read |

### Writing a test

Copy a test from the folder closest to what you changed. A browser test looks like this:

```js
const { launch, open, newProject, check } = require('../r12/lib');

(async () => {
  const b = await launch();
  const { pg, errs } = await open(b, 'mocked.html');
  await newProject(pg, 'Recipe Box', 'Save recipes and plan meals');
  check('the project is saved', (await pg.evaluate(() => window.__mockDocs.size)) === 1);
  check('no page errors', errs.length === 0, errs);
  await b.close();
})();
```

Save it as `something.test.js` and `test/run.js` picks it up.

## Publishing on claude.ai

On claude.ai, Shipyard saves to your Claude account and can ask Claude for help. To publish your own copy:

1. Run `npm run build`.
2. Ask Claude (with the Artifact tool, for example in Claude Code on the web) to publish `dist/shipyard.html` as an artifact with these capabilities: `db` (the `projects` collection, read and write limited to the owner), `sample`, `downloads` and `user`.
3. Open the link it gives you. Share it from claude.ai if others should see your projects; a guest who cannot edit gets a planner of their own in their browser.
