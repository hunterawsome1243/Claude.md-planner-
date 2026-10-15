// Builds Alex's state: ten projects (two archived). The main one, "Trailhead", has six milestones, 80 tasks,
// 70 sessions over three months, 20 lessons, 15 bugs, decisions, a data model, saved prompts and a slipped target.
// `after` is the state once a teammate's device changed it while Alex was away; `before` is how Alex left it.
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const iso = (d, h = 10) => `${d}T${String(h).padStart(2, '0')}:00:00.000Z`;

const MS = [
  { id: 'm1', title: 'Bare-bones version running', goal: 'The app starts on your computer and shows its first screen.', from: '2026-07-13', to: '2026-07-20', feat: '', tasks: [
    ['S', 'Create a Vite React TypeScript project in this folder'], ['S', 'Add Vitest with one passing test'], ['M', "Replace the starter page with the app's real layout"], ['S', 'Put the project in git and make the first commit'],
    ['S', 'Add a header with the app name'], ['M', 'Set up routing between pages'], ['S', 'Add a 404 page'], ['M', 'Add ESLint and Prettier and fix what they find']] },
  { id: 'm2', title: 'Trip list and details', goal: 'I can add trips, see them in a list and open one.', from: '2026-07-21', to: '2026-08-10', feat: 'f1', tasks: [
    ['M', 'Add a trip form with name, dates and trailhead'], ['M', 'Save trips in localStorage'], ['S', 'Show trips in a list, newest first'], ['M', 'Open a trip page from the list'], ['S', 'Delete a trip with a confirm step'],
    ['M', 'Edit a trip in place'], ['S', 'Sort trips by start date'], ['M', 'Add a difficulty rating to trips'], ['S', 'Show an empty state when there are no trips'], ['M', 'Validate the trip form'],
    ['S', 'Add a trip count to the header'], ['M', 'Group past and upcoming trips'], ['S', 'Add a search box for trips'], ['M', 'Write tests for the trip store']] },
  { id: 'm3', title: 'Map view', goal: 'Each trip shows its route on a map.', from: '2026-08-11', to: '2026-08-31', feat: 'f3', tasks: [
    ['M', 'Add Leaflet and show a base map'], ['M', 'Import a GPX file into a trip'], ['M', 'Draw the GPX route on the map'], ['S', 'Fit the map to the route'], ['M', 'Show distance and elevation gain'],
    ['L', 'Draw an elevation profile under the map'], ['S', 'Mark the trailhead with a pin'], ['M', 'Cache map tiles for slow connections'], ['S', 'Add a full-screen map button'], ['M', 'Show waypoints from the GPX file'],
    ['S', 'Let people pick the map style'], ['M', 'Handle GPX files with several tracks'], ['S', 'Show an error for broken GPX files'], ['M', 'Write tests for the GPX parser']] },
  { id: 'm4', title: 'Packing lists', goal: 'Each trip has a packing list I can tick off.', from: '2026-09-01', to: '2026-09-22', feat: 'f4', tasks: [
    ['M', 'Add a packing list to each trip'], ['S', 'Tick items off the list'], ['M', 'Start a list from a template'], ['S', 'Add and remove items'], ['M', 'Group items by category'],
    ['S', 'Show how many items are packed'], ['M', 'Save my own templates'], ['S', 'Reorder items by dragging'], ['M', 'Suggest items from the weather and length of the trip'], ['S', 'Copy a list from an earlier trip'],
    ['S', 'Clear all ticks'], ['M', 'Share a list as text'], ['S', 'Warn when the list is empty before a trip'], ['M', 'Print a packing list'], ['S', 'Add weights to items']] },
  { id: 'm5', title: 'Sharing', goal: 'Friends can see a trip from a link.', from: '2026-09-23', to: '2026-10-08', feat: 'f5', tasks: [
    ['M', 'Add a share button to the trip page'], ['M', 'Generate a share link with expiry'], ['M', 'Show a read-only trip page for a shared link'], ['S', 'Copy the share link to the clipboard'], ['M', 'Let friends add themselves to a trip'],
    ['S', 'Show who is coming on the trip page'], ['M', 'Send an email invite'], ['S', 'Revoke a share link'], ['M', 'Show the map on the shared page'], ['S', 'Add an Open Graph preview image'],
    ['M', 'Let friends comment on a trip'], ['S', 'Hide private notes on the shared page'], ['M', 'Rate-limit the share endpoint'], ['S', 'Show when a link expires'], ['M', 'Write tests for sharing']] },
  { id: 'm6', title: 'Ready to share', goal: 'Someone else can open it from a link and use it.', from: '', to: '', feat: '', tasks: [
    ['M', 'Handle empty, loading and error states'], ['M', 'Check it on a phone and fix layout problems'], ['M', 'Deploy it to a free host such as Netlify or Vercel'], ['S', 'Write a README: what it is, how to run it and the live link'],
    ['M', 'Add an about page'], ['S', 'Add a favicon and app icon'], ['L', 'Make it work offline as a PWA'], ['M', 'Run a Lighthouse check and fix the worst issues'], ['S', 'Add a privacy note'], ['M', 'Back up and restore trips as a file'],
    ['S', 'Set up error reporting'], ['M', 'Test it with two friends and note what confused them'], ['S', 'Add a changelog'], ['M', 'Tidy the code before the first release']] },
];

function buildMain() {
  seed = 7;
  const feats = [
    { id: 'f1', title: 'Trip list', detail: 'Add, edit and list hiking trips with dates and trailhead.', priority: 'must', status: 'done' },
    { id: 'f2', title: 'Trip details', detail: 'One page per trip with everything about it.', priority: 'must', status: 'done' },
    { id: 'f3', title: 'Map of the route', detail: 'Show the GPX route, distance and elevation on a map.', priority: 'must', status: 'done' },
    { id: 'f4', title: 'Packing lists', detail: 'A list per trip, from templates, ticked off while packing.', priority: 'must', status: 'doing' },
    { id: 'f5', title: 'Share a trip by link', detail: 'Friends open a read-only trip page from a link.', priority: 'must', status: 'todo' },
    { id: 'f6', title: 'Weather forecast', detail: 'Forecast for the trailhead on the trip days.', priority: 'should', status: 'todo' },
    { id: 'f7', title: 'Offline mode', detail: 'Works on the trail with no signal.', priority: 'should', status: 'todo' },
    { id: 'f8', title: 'Photo journal', detail: 'Photos pinned to the route after the trip.', priority: 'could', status: 'todo' },
  ];
  // done tasks and dates
  const milestones = MS.map((m) => {
    const n = m.tasks.length;
    return {
      id: m.id, title: m.title, goal: m.goal,
      tasks: m.tasks.map(([size, title], i) => {
        const id = `t${m.id.slice(1)}-${String(i + 1).padStart(2, '0')}`;
        let status = 'todo'; let doneAt = '';
        if (['m1', 'm2', 'm3'].includes(m.id)) { status = 'done'; doneAt = addDays(m.from, Math.floor((i / n) * (Date.parse(m.to) - Date.parse(m.from)) / 864e5)); }
        if (m.id === 'm4') {
          if (i < 13) { status = 'done'; doneAt = addDays(m.from, Math.floor((i / 13) * 21)); }
          if (i === 13) status = 'doing'; // Print a packing list: started Sept 8, never finished
        }
        if (m.id === 'm5') {
          if (i === 0) status = 'doing'; // share button, last session Sept 29
          if (i === 1) status = 'doing'; // share link with expiry, stuck Sept 26
          if (i === 3) { status = 'done'; doneAt = '2026-09-24'; }
          if (i === 7) { status = 'done'; doneAt = '2026-09-25'; }
        }
        const notes = i % 3 === 0 ? `Check: ${title.toLowerCase()} works after a reload, and npm test passes.` : '';
        return { id, title, notes, size, status, feat: m.feat, splitFrom: '', doneAt };
      }),
    };
  });
  const T = (mid, k) => milestones.find((m) => m.id === mid).tasks[k - 1];
  // sessions
  const S = [];
  let sx = 0;
  const sess = (date, mid, tid, task, outcome, summary, wrong = '', bid = '') => S.push({ id: `x${String(++sx).padStart(3, '0')}`, date, mid, tid, bid, task, outcome, summary, wrong });
  const SUMS = [
    'Added the component and wired it to the store. Ran npm test: 14 passing. Checked it by hand at laptop and phone widths. Nothing else changed.',
    'Implemented the change in two small steps, with a test for the edge case of an empty trip. npm test and npm run build both pass. You may want to check the layout on a narrow phone.',
    'Read the files the task touches, proposed a plan, then made the change. Added two tests. Lint is clean. One thing to test by hand: reload the page and the data should still be there.',
    'Refactored the helper into src/lib and covered it with tests. The page now uses it. Build passes; please check the dark mode colours by hand.',
  ];
  const WRONGS = [
    'It rewrote the whole TripForm component when I asked for one field.',
    'It added a new date library without asking.',
    'The tests passed but the page broke on reload because localStorage was read before it was set.',
    'It started the dev server and left it running, then got confused by the port being in use.',
    'It edited PLAN.md and ticked two tasks that were not finished.',
    'Leaflet CSS was missing so the map tiles were scattered; it took three tries to see why.',
    'The GPX parser choked on files from Garmin with extensions; it guessed instead of reading the file.',
    'It changed the test to make it pass instead of fixing the code.',
    'Drag to reorder scrolled the page on touch screens instead of moving the item.',
    'It forgot to run the tests before saying it was done.',
    'It used any in three places to make TypeScript happy.',
    'The share link used the local dev URL, so the link only worked on my laptop.',
    'It could not decide where to store the expiry and kept going back and forth.',
    'The print stylesheet hid the whole page; it tried to fix it with !important everywhere.',
  ];
  let wi = 0;
  // done sessions for done tasks (not all), plus partly/stuck tries before some of them
  const doneTasks = milestones.flatMap((m) => m.tasks.filter((t) => t.status === 'done').map((t) => [m, t])).sort((a, b) => a[1].doneAt.localeCompare(b[1].doneAt));
  let k = 0;
  for (const [m, t] of doneTasks) {
    k++;
    if (k % 6 === 0) continue; // a few done without a session logged
    if (k % 4 === 1 && wi < 12) sess(addDays(t.doneAt, -1), m.id, t.id, t.title, k % 8 === 1 ? 'stuck' : 'partly', 'Got part of the way. ' + pick(SUMS), WRONGS[wi++]);
    sess(t.doneAt, m.id, t.id, t.title, 'done', pick(SUMS), k % 7 === 0 ? WRONGS[(wi + 3) % WRONGS.length] : '');
  }
  // the stale in-progress task in M4, and the two in M5
  sess('2026-09-08', 'm4', T('m4', 14).id, T('m4', 14).title, 'partly', 'Added a print button and a print stylesheet, but the stylesheet hides the map and the list together. Left it for now.\n\nOutcome: partly done\nWent wrong: the print stylesheet hid the whole page', WRONGS[13]);
  sess('2026-09-26', 'm5', T('m5', 2).id, T('m5', 2).title, 'stuck', 'Tried three ways to store the expiry (in the link, in localStorage, on a tiny server). None works without a backend.', WRONGS[12]);
  // bug fix sessions
  sess('2026-08-05', '', '', 'Fix: Trip dates shift by a day in some time zones', 'done', 'The date was parsed as UTC. Now parsed as a local date, with a test in a UTC-7 zone.', '', 'b02');
  sess('2026-08-27', '', '', 'Fix: Map is blank after switching tabs', 'done', 'Called invalidateSize when the tab shows. Test added.', '', 'b05');
  // outside the plan
  sess('2026-08-15', '', '', 'Find bugs', 'done', 'Found four issues: two date bugs, an unhandled empty GPX file and a missing key in a list. Fixed the two date bugs.', '');
  sess('2026-09-12', '', '', 'Check security', 'partly', 'No secrets in the repo. npm audit shows two moderate issues in dev dependencies only. Did not change anything yet.', '');
  // Alex's last session before going away: Sept 29, partly done on the share button
  sess('2026-09-29', 'm5', T('m5', 1).id, T('m5', 1).title, 'partly', 'Added the Share button and a sheet that opens from it. The link it shows is a placeholder until the share link task is done. npm test passes (52 tests).\n\nOutcome: partly done\nWent wrong: nothing', '');
  S.sort((a, b) => a.date.localeCompare(b.date));
  // pad or trim to 70 before the teammate's sessions
  while (S.length > 68) S.splice(5, 1);
  let pad = 0;
  while (S.length < 68) { const d = addDays('2026-07-15', pad * 9); sess(d, '', '', pick(['Explain the code', 'Tidy up safely', 'Add missing tests']), 'done', pick(SUMS)); pad++; S.sort((a, b) => a.date.localeCompare(b.date)); }

  // lessons: from sessions that went wrong
  const wrongSess = S.filter((s) => s.wrong.trim());
  const RULES = ['Only change the files the task names', 'Ask before adding a new dependency', 'Read localStorage only after it is set up, and test a reload', 'Stop the dev server when you are done with it',
    'Never tick a task in PLAN.md until it works and the tests pass', 'Import Leaflet CSS with the map component', 'Read a sample GPX file before changing the parser', 'Never change a test to make it pass; fix the code',
    'Test drag and drop with touch as well as a mouse', 'Run npm test before saying a task is done', 'Do not use the any type', 'Build share links from the configured site URL, never localhost',
    'Ask before choosing where data is stored', 'Do not use !important in stylesheets'];
  const lessons = [];
  let li = 0;
  for (const s of wrongSess) {
    if (lessons.length >= 20) break;
    const r = RULES[li % RULES.length]; li++;
    const promoted = lessons.length < 12;
    lessons.unshift({ id: `l${String(lessons.length + 1).padStart(2, '0')}`, date: s.date, happened: s.wrong, change: lessons.length < 16 ? r : '', promoted, rule: promoted ? r : '', sid: s.id });
  }
  while (lessons.length < 20) lessons.unshift({ id: `l${String(lessons.length + 1).padStart(2, '0')}`, date: addDays('2026-08-01', lessons.length), happened: 'Claude kept asking which folder to use for shared code.', change: 'Shared code lives in src/lib', promoted: false, rule: '', sid: '' });
  const promotedRules = lessons.filter((l) => l.promoted).map((l) => '- ' + l.rule);
  const conventions = ['- Use TypeScript and avoid the any type', '- One component per file in src/components', '- Keep logic that is not about the screen in src/lib, with tests next to it', '- Ask before adding a new library', ...promotedRules.filter((x, i, a) => a.indexOf(x) === i)].join('\n');

  const bugs = [
    ['b01', '2026-07-24', 'Trip list flickers on load', 'fixed', 'minor'],
    ['b02', '2026-08-03', 'Trip dates shift by a day in some time zones', 'fixed', 'major'],
    ['b03', '2026-08-09', 'Deleting a trip leaves its packing list behind', 'fixed', 'minor'],
    ['b04', '2026-08-14', 'GPX import fails on files over 5 MB', 'open', 'major'],
    ['b05', '2026-08-25', 'Map is blank after switching tabs', 'fixed', 'major'],
    ['b06', '2026-08-30', 'Elevation profile labels overlap on phones', 'fixed', 'minor'],
    ['b07', '2026-09-03', 'Search box ignores accents', 'open', 'minor'],
    ['b08', '2026-09-06', 'Template items duplicate when applied twice', 'fixed', 'major'],
    ['b09', '2026-09-10', 'Packed count is off by one after clearing ticks', 'fixed', 'minor'],
    ['b10', '2026-09-14', 'Drag to reorder does nothing on iPad', 'open', 'major'],
    ['b11', '2026-09-17', 'Print view cuts off long lists', 'open', 'minor'],
    ['b12', '2026-09-19', 'Trip page crashes when a trip has no dates', 'fixed', 'major'],
    ['b13', '2026-09-22', 'Dark mode map tiles are too bright', 'fixed', 'minor'],
    ['b14', '2026-09-27', 'Share sheet does not close with Escape', 'open', 'minor'],
  ].map(([id, date, title, status, severity]) => ({ id, date, title, actual: `${title}.`, expected: 'It should just work.', steps: '1. Open the app\n2. Try it', error: '', severity, status }));

  const decisions = [
    ['d1', '2026-07-13', 'Use Vite, React and TypeScript', 'The web starter, and I know React a little.'],
    ['d2', '2026-07-22', 'Keep trips in localStorage for now', 'No backend to run until sharing needs one.'],
    ['d3', '2026-08-11', 'Use Leaflet for maps instead of Mapbox', 'No API key, free tiles, good GPX plugins.'],
    ['d4', '2026-08-19', 'Store GPX files as text inside the trip', 'Simpler than a file store; files are small.'],
    ['d5', '2026-09-01', 'Packing templates are plain lists, not nested', 'Nested lists were confusing in the first try.'],
    ['d6', '2026-09-15', 'No accounts in the first version', 'Sharing by link is enough for friends.'],
    ['d7', '2026-09-26', 'Share links expire after 30 days', 'Old trips should not stay public forever.'],
    ['d8', '2026-09-28', 'Use a tiny Cloudflare Worker for share links', 'Links need a server; Workers are free at this size.'],
  ].map(([id, date, text, why]) => ({ id, date, text, why }));

  const entities = [
    { id: 'e1', name: 'Trip', fields: 'name: text\nstarts: date\nends: date\ntrailhead: text\ndifficulty: number\ngpx: text', notes: 'Has one packing list and many waypoints.' },
    { id: 'e2', name: 'Waypoint', fields: 'name: text\nlat: number\nlon: number', notes: 'Belongs to a trip.' },
    { id: 'e3', name: 'Packing list', fields: 'items: a list of Item', notes: 'Belongs to a trip.' },
    { id: 'e4', name: 'Item', fields: 'name: text\ncategory: text\npacked: yes/no\nweight: number', notes: 'In a packing list or a template.' },
    { id: 'e5', name: 'Share link', fields: 'trip: Trip\ncode: text\nexpires: date', notes: 'Points at a trip; read-only.' },
  ];
  const prompts = [
    { id: 'q1', title: 'Write release notes', text: 'Read git log since the last tag and write release notes for people who use the app, not developers. Group by New, Fixed and Changed.' },
    { id: 'q2', title: 'Update the screenshots', text: 'Run the app, take screenshots of the trip list, a trip page and a packing list at phone and laptop widths, and save them in docs/screens.' },
    { id: 'q3', title: 'Check the GPX parser', text: 'Run the parser against every file in fixtures/gpx and report any that fail, with the error. Do not change code.' },
  ];
  const chat = [
    { id: 'c1', q: 'Is this plan realistic for one person with Claude Code?', a: 'Mostly. The sharing milestone needs a server, which is new territory. Split the share link task first.', at: '2026-09-20T18:00:00.000Z' },
    { id: 'c2', q: 'How should I store share links?', a: 'Use a tiny serverless function with a key-value store. Keep the trip data in the link payload only if it is small.', at: '2026-09-27T19:00:00.000Z' },
  ];
  const before = {
    kind: 'project', name: 'Trailhead', pitch: 'A web app that plans hiking trips: the route, a packing list, and a link to share with friends.', stage: 'building', starter: 'web',
    audience: 'Me and the friends I hike with', problem: 'Trip plans are spread over chat, GPX files and paper lists.', doneWhen: 'I can plan a trip with its route and packing list and send friends a link.',
    targetDate: '2026-10-01', stack: 'Vite + React + TypeScript\nPlain CSS\nVitest for tests\nLeaflet for maps\nNode.js 22 or newer', commands: 'npm install\nnpm run dev\nnpm test\nnpm run build\nnpm run lint',
    conventions, constraints: '- Free hosting only\n- Must work on an old iPhone', repo: 'https://github.com/alex/trailhead',
    features: feats, screens: [{ id: 's1', name: 'Trip list', notes: 'All trips, upcoming first' }, { id: 's2', name: 'Trip page', notes: 'Map, details and packing list' }, { id: 's3', name: 'Shared trip', notes: 'Read-only page from a link' }],
    entities, decisions, milestones, checks: { claudemd: true, git: true, tests: true, planmode: true, clear: false, diff: true, lessons: true }, lessons, sessions: S, bugs, prompts, chat,
    claudeMd: '', claudeMdEdited: false, claudeMdOwn: false, fromCode: false, repoHas: '', lastReview: { at: '2026-08-20T17:00:00.000Z', headline: 'A clear plan with good habits. Next, split the elevation profile task.', strengths: ['Small tasks', 'Tests from day one'], risks: ['Sharing needs a server', 'No offline plan yet'], suggestions: [{ title: 'Add a smoke test for the map', why: 'Maps break silently', type: 'task', added: true }] },
    archived: false, guideHidden: true, guideAgain: false, example: false, copied: { claudemd: true, plan: true }, checked: {}, createdAt: '2026-07-12T09:00:00.000Z', updatedAt: '2026-09-29T21:10:00.000Z',
  };
  // the teammate's device, Oct 1 to 9: three tasks done, two sessions, a new bug, a renamed milestone
  const after = JSON.parse(JSON.stringify(before));
  const m5 = after.milestones.find((m) => m.id === 'm5');
  m5.title = 'Share trips with friends';
  const td = [[3, '2026-10-02'], [6, '2026-10-06'], [9, '2026-10-08']];
  for (const [i, d] of td) Object.assign(m5.tasks[i - 1], { status: 'done', doneAt: d });
  after.sessions.push({ id: 'x901', date: '2026-10-02', mid: 'm5', tid: m5.tasks[2].id, bid: '', task: m5.tasks[2].title, outcome: 'done', summary: 'Built the read-only page for /s/:code. It loads the trip from the Worker. Tests pass.', wrong: '' });
  after.sessions.push({ id: 'x902', date: '2026-10-08', mid: 'm5', tid: m5.tasks[8].id, bid: '', task: m5.tasks[8].title, outcome: 'done', summary: 'The shared page shows the map, read-only. Tests pass.', wrong: '' });
  after.bugs.unshift({ id: 'b15', date: '2026-10-07', title: 'Shared link shows a blank page on iPhone Safari', actual: 'Blank white page, no error shown.', expected: 'The read-only trip page.', steps: '1. Share a trip\n2. Open the link on an iPhone', error: 'TypeError: undefined is not an object (evaluating \'trip.gpx.length\')', severity: 'major', status: 'open' });
  after.updatedAt = '2026-10-08T16:30:00.000Z';
  return { before, after };
}

function small(name, o) {
  const t = o.created;
  const ms = (o.ms || []).map((m, i) => ({ id: `${o.key}m${i}`, title: m[0], goal: '', tasks: m[1].map((x, j) => ({ id: `${o.key}t${i}-${j}`, title: x[1], notes: '', size: x[0], status: x[2] || 'todo', feat: '', splitFrom: '', doneAt: x[3] || '' })) }));
  return {
    kind: 'project', name, pitch: o.pitch || '', stage: o.stage || 'building', starter: o.starter || '', audience: o.audience || '', problem: '', doneWhen: o.doneWhen || '', targetDate: o.target || '',
    stack: o.stack || '', commands: o.commands || '', conventions: o.conventions || '', constraints: '', repo: '', features: o.features || [], screens: [], entities: [], decisions: [], milestones: ms, checks: {}, lessons: [],
    sessions: o.sessions || [], bugs: o.bugs || [], prompts: [], chat: [], claudeMd: '', claudeMdEdited: false, claudeMdOwn: false, fromCode: false, repoHas: '', lastReview: null, archived: !!o.archived,
    guideHidden: !!o.guideHidden, guideAgain: false, example: false, copied: {}, checked: {}, createdAt: t + 'T09:00:00.000Z', updatedAt: (o.updated || t) + 'T12:00:00.000Z',
  };
}
const D = (n, start, status, step = 3) => Array.from({ length: n }, (_, i) => ['M', `Task ${i + 1}`, status, status === 'done' ? addDays(start, i * step) : '']);

function build() {
  const { before, after } = buildMain();
  const others = {
    pApi: small('Trailhead API', { key: 'ap', created: '2026-08-02', updated: '2026-10-09', starter: 'api', stage: 'building', pitch: 'The small server behind Trailhead share links.', commands: 'npm install\nnpm test', guideHidden: true,
      ms: [['Endpoints', [['M', 'Create a share link endpoint', 'done', '2026-09-28'], ['M', 'Read a shared trip', 'done', '2026-10-01'], ['S', 'Expire old links', 'done', '2026-10-09'], ['M', 'Rate limit requests'], ['M', 'Add request logging']]]],
      sessions: [{ id: 'apx1', date: '2026-10-09', mid: 'apm0', tid: 'apt0-2', bid: '', task: 'Expire old links', outcome: 'done', summary: 'Done.', wrong: '' }] }),
    pCli: small('Trail notes CLI', { key: 'cl', created: '2026-07-25', updated: '2026-08-30', starter: 'cli', stage: 'shipped', pitch: 'A command-line tool that turns GPX files into trip notes.', guideHidden: true,
      ms: [['Everything', D(6, '2026-08-01', 'done')]], sessions: [{ id: 'clx1', date: '2026-08-16', mid: 'clm0', tid: 'clt0-5', bid: '', task: 'Task 6', outcome: 'done', summary: 'Done.', wrong: '' }] }),
    pBudget: small('Budget buddy', { key: 'bu', created: '2026-08-15', updated: '2026-09-10', starter: 'web', stage: 'polishing', pitch: 'A tiny budget tracker for shared trips.', guideHidden: true,
      ms: [['Core', D(8, '2026-08-16', 'done', 2)], ['Polish', [['M', 'Polish the totals page'], ['L', 'Import bank CSV files']]]], sessions: [{ id: 'bux1', date: '2026-09-10', mid: 'bum0', tid: 'but0-7', bid: '', task: 'Task 8', outcome: 'done', summary: 'Done.', wrong: '' }] }),
    pRecipe: small('Family recipe site', { key: 're', created: '2026-09-01', updated: '2026-09-21', starter: 'web', stage: 'building', target: '2026-11-30', pitch: 'A site for Grandma\'s recipes.', guideHidden: true,
      ms: [['Start', [['S', 'Set up the site', 'done', '2026-09-02'], ['M', 'Add the recipe page', 'done', '2026-09-09'], ['M', 'Add search'], ['M', 'Add photos']]]], sessions: [{ id: 'rex1', date: '2026-09-09', mid: 'rem0', tid: 'ret0-1', bid: '', task: 'Add the recipe page', outcome: 'done', summary: 'Done.', wrong: '' }] }),
    pBot: small('Discord dice bot', { key: 'bo', created: '2026-09-20', updated: '2026-09-20', starter: 'bot', stage: 'idea', pitch: '' }),
    pPhoto: small('Photo sorter script', { key: 'ph', created: '2026-09-05', updated: '2026-09-18', starter: 'script', stage: 'building', pitch: 'Sorts trip photos into folders by date and place.', guideHidden: true,
      ms: [['First run', [['S', 'Read EXIF dates', 'done', '2026-09-06'], ['M', 'Move files into date folders', 'doing'], ['M', 'Group by place']]]], sessions: [{ id: 'phx1', date: '2026-09-18', mid: 'phm0', tid: 'pht0-1', bid: '', task: 'Move files into date folders', outcome: 'stuck', summary: 'Permissions error on the photos folder.', wrong: 'It tried to chmod my whole home folder.' }] }),
    pHabit: small('Habit tracker app', { key: 'ha', created: '2026-10-01', updated: '2026-10-02', starter: 'mobile', stage: 'designing', pitch: 'A phone app to track daily stretches.' }),
    pOld: small('Old portfolio', { key: 'ol', created: '2026-07-01', updated: '2026-07-10', starter: 'web', stage: 'shipped', archived: true, pitch: 'My old portfolio site.', ms: [['All', D(3, '2026-07-02', 'done')]] }),
    pJam: small('Weekend game jam', { key: 'ja', created: '2026-07-20', updated: '2026-07-22', starter: 'game', stage: 'shipped', archived: true, pitch: 'A tiny platformer from a game jam.', ms: [['Jam', D(4, '2026-07-20', 'done', 1)]] }),
  };
  return { before, after, others, mainId: 'pMain' };
}
function seedOf(main, extra = {}) { const b = build(); return { pMain: main, ...b.others, ...extra }; }
// a script for addInitScript: the seed, plus what Alex's laptop browser remembers
function initScript(seedObj, { ui = { activeId: 'pMain', tab: 'overview', repoFile: 'claudemd', view: 'project' }, seen = 10 } = {}) {
  return `window.__SEED__ = ${JSON.stringify(seedObj)};
  try { if (!sessionStorage.getItem('__inited')) { sessionStorage.setItem('__inited', '1'); ${ui ? `localStorage.setItem('shipyard.ui.v1', ${JSON.stringify(JSON.stringify(ui))});` : "localStorage.removeItem('shipyard.ui.v1');"} ${seen != null ? `localStorage.setItem('shipyard.seen.v1', '${seen}');` : ''} } } catch (e) {}`;
}
module.exports = { build, seedOf, initScript, addDays };
if (require.main === module) {
  const b = build();
  const c = (x) => x.milestones.flatMap((m) => m.tasks);
  console.log('tasks', c(b.after).length, 'done', c(b.after).filter((t) => t.status === 'done').length, 'doing', c(b.after).filter((t) => t.status === 'doing').length);
  console.log('sessions', b.after.sessions.length, 'lessons', b.after.lessons.length, 'bugs', b.after.bugs.length, 'open', b.after.bugs.filter((x) => x.status === 'open').length);
  console.log('bytes', Buffer.byteLength(JSON.stringify(b.after)));
  console.log('first/last session', b.after.sessions[0].date, b.after.sessions.at(-1).date, 'promoted', b.after.lessons.filter((l) => l.promoted).length);
}
