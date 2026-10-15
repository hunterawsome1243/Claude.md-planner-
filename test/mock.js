// Mock of the artifact runtime: db (in-memory, live snapshots), sample (canned JSON / text), downloads.
(function () {
  const docs = new Map(); // path -> body
  const listeners = new Set();
  const seed = window.__SEED__ || null;
  window.__mockLog = [];
  const freeze = (o) => JSON.parse(JSON.stringify(o));
  function snapOf(id, body) { return { id, exists: true, data: () => freeze(body), metadata: { fromCache: false, hasPendingWrites: false } }; }
  let last = new Map();
  // who is looking (window.__USER__ = { owner, edit, write }): as on claude.ai, someone below the store's admin-only
  // rules reads no projects and cannot save
  const U = window.__USER__ || null;
  const blind = !!(U && !U.owner && !U.edit);
  const NO = { code: 'invalid_argument', message: 'not allowed' };
  function emit() {
    const docs0 = docs;
    for (const l of listeners) {
      const docs = blind ? new Map() : docs0;
      const changes = [];
      for (const [id, body] of docs) {
        const prev = l.seen.get(id);
        const s = snapOf(id, body);
        if (!prev) changes.push({ type: 'added', doc: s }); else if (prev !== body) changes.push({ type: 'modified', doc: s });
      }
      for (const [id, body] of l.seen) if (!docs.has(id)) changes.push({ type: 'removed', doc: snapOf(id, body) });
      l.seen = new Map(docs);
      const all = [...docs].map(([id, b]) => snapOf(id, b));
      l.next({ docs: all, size: all.length, empty: !all.length, docChanges: () => changes, metadata: { fromCache: false, hasPendingWrites: false } });
    }
  }
  const col = {
    path: 'projects',
    doc(id) {
      return {
        id, path: 'projects/' + id,
        async set(data) { await new Promise((r) => setTimeout(r, 30)); if (blind) throw NO; docs.set(id, freeze(data)); window.__mockLog.push(['set', id]); setTimeout(emit, 10); },
        async update(data) {
          await new Promise((r) => setTimeout(r, 30));
          if (blind) throw NO;
          if (!docs.has(id)) throw { code: 'invalid_argument', message: 'document does not exist' };
          const merge = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b)) o[k] = (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) ? merge(a[k], v) : v; return o; };
          docs.set(id, freeze(merge(docs.get(id), freeze(data)))); window.__mockLog.push(['update', id, Object.keys(data).join(',')]); setTimeout(emit, 10);
        },
        async delete() { docs.delete(id); window.__mockLog.push(['delete', id]); setTimeout(emit, 10); },
        async get() { return docs.has(id) ? snapOf(id, docs.get(id)) : { id, exists: false, data: () => undefined }; },
      };
    },
    onSnapshot(next, err) { const l = { next, err, seen: new Map() }; listeners.add(l); setTimeout(emit, 50); return () => listeners.delete(l); },
  };
  const db = Object.freeze({ collection: (p) => { if (p !== 'projects') throw new TypeError('unexpected ' + p); return col; }, doc: () => { throw new Error('no'); } });
  window.__mockDocs = docs;
  window.__mockEmitExternal = (id, body) => { docs.set(id, freeze(body)); emit(); };

  const FILL = {
    pitch: 'A web app that turns saved recipe links into a weekly meal plan.', audience: 'Me and my partner', problem: 'Recipes are scattered across tabs.', doneWhen: 'I can paste a link, save it, and drag recipes into a week.',
    stack: 'Next.js\nSQLite', commands: 'npm install\nnpm run dev\nnpm test', conventions: '- Use TypeScript\n- Small components', constraints: '',
    features: [{ title: 'Save recipe from link', detail: 'Paste a URL and keep the title', priority: 'must' }, { title: 'Week planner', detail: 'Seven day grid', priority: 'must' }, { title: 'Shopping list', detail: 'From the week', priority: 'should' }],
    milestones: [{ title: 'Bare-bones version running', goal: 'App starts and shows a list', tasks: [{ title: 'Set up Next.js app', size: 'S', notes: 'Run create-next-app' }, { title: 'Add recipe list page', size: 'M', notes: '' }] }, { title: 'Planner', goal: 'Plan a week', tasks: [{ title: 'Build week grid', size: 'L', notes: '' }] }],
  };
  async function delay(signal, ms) {
    await new Promise((res, rej) => { const t = setTimeout(res, ms); signal?.addEventListener('abort', () => { clearTimeout(t); rej({ code: 'cancelled', message: 'aborted' }); }); });
  }
  function sample(input, opts = {}) {
    window.__mockLog.push(['sample', String(input).slice(0, 60)]);
    return (async () => {
      const isChat = Array.isArray(input);
      if (isChat) (window.__chatInputs = window.__chatInputs || []).push(JSON.parse(JSON.stringify(input)));
      if (isChat && window.__CHAT_PARTIAL__) opts.onText && setTimeout(() => opts.onText({ text: window.__CHAT_PARTIAL__, delta: window.__CHAT_PARTIAL__ }), 100);
      await delay(opts.signal, window.__SAMPLE_DELAY__ || 300);
      if (isChat && window.__CHAT_FAIL__) throw { code: window.__CHAT_FAIL__, message: 'mock failure' };
      const text = isChat ? (window.__CHAT_TEXT__ || 'Build the **week grid** next.\n\n- Split it first\n- Then run `npm test`') : 'Sharpened: do the task carefully and run npm test.';
      opts.onText && opts.onText({ text, delta: text });
      return { text, truncated: !!window.__TRUNCATED__, modelTierApplied: 'default' };
    })();
  }
  sample.json = function (input, opts = {}) {
    const s = String(input);
    window.__mockLog.push(['json', s.slice(0, 60)]);
    (window.__prompts = window.__prompts || []).push(s);
    return (async () => {
      await delay(opts.signal, window.__SAMPLE_DELAY__ || 300);
      if (window.__SAMPLE_FAIL__) throw { code: window.__SAMPLE_FAIL__, message: 'mock failure' };
      if (s.startsWith('Help plan a new software project')) return FILL;
      if (s.startsWith('A Claude Code session on this project just ended')) return window.__FOLLOW_REPLY__ || { followUps: [{ title: 'Add error message for empty list', size: 'S', notes: 'Show a hint when there are no recipes.' }, { title: 'Write a test for parsing', size: 'M', notes: 'Cover links without titles.' }], rule: '- Run npm test before saying a task is done' };
      if (s.startsWith('Turn this existing project document')) return window.__IMPORT_REPLY__ || { pitch: 'Claude pitch', audience: 'Claude audience', problem: 'Claude problem', doneWhen: 'Claude done', stack: 'Claude stack', commands: 'claude cmd', conventions: '- Claude rule', constraints: '', features: [{ title: 'Works offline', detail: 'Already built', priority: 'must', status: 'done' }, { title: 'Sync', detail: 'Later', priority: 'should', status: 'todo' }], milestones: [{ title: 'Finish sync', goal: 'Two devices agree', tasks: [{ title: 'Add sync endpoint', size: 'M', notes: 'n' }] }] };
      if (s.startsWith('Draft the next milestones')) return { milestones: [{ title: 'Polish', goal: 'Looks good', tasks: [{ title: 'Add dark mode', size: 'S', notes: 'Toggle' }, { title: 'Fix spacing', size: 'S', notes: '' }] }, { title: 'Share', goal: 'Others can use it', tasks: [{ title: 'Deploy to Render', size: 'M', notes: '' }] }] };
      if (s.startsWith('Suggest rules for CLAUDE.md from what went wrong')) return window.__RULES_REPLY__ || { rules: [{ rule: 'Test drag and drop with touch as well as a mouse', why: 'Touch drags scrolled the page instead of moving the card.', fixes: [1] }, { rule: 'Ask before rewriting code that works', why: 'A one-site fix became a rewrite of the parser.', fixes: [9] }] };
      if (s.startsWith('Turn the advice in an answer')) return window.__ADVICE_REPLY__ || { milestone: 'Safer saving', tasks: [{ title: 'Back up recipes to a file', size: 'S', notes: 'A Download button saves every recipe as JSON.' }, { title: 'Warn before leaving with unsaved changes', size: 'M', notes: 'Check: closing the tab with a draft asks first.' }] };
      if (s.startsWith('Plan how to build one feature')) return window.__FEAT_REPLY__ || { tasks: [{ title: 'Add a shopping list page', size: 'S', notes: 'Empty list with a heading.' }, { title: 'Collect ingredients from the week plan', size: 'M', notes: 'Every recipe in the week adds its ingredients.' }] };
      if (s.startsWith('Split one task')) return window.__SPLIT_REPLY__ || { tasks: [{ title: 'Lay out the week grid', size: 'S', notes: 'Seven columns, one per day.' }, { title: 'Drag a recipe onto a day', size: 'M', notes: 'Drop a recipe card on a day; it stays after reload.' }, { title: 'Save the week plan', size: 'M', notes: 'Reload and the plan is still there.' }] };
      if (s.startsWith('Sketch the data model')) return window.__MODEL_REPLY__ || { entities: [{ name: 'Recipe', fields: ['title: text', 'url: link', 'tags: list of text'], notes: 'Belongs to a user; has many ingredients.' }, { name: 'Week plan', fields: ['week starts: date', 'days: list of Recipe'], notes: 'Points at recipes.' }, { name: '', fields: ['x: text'] }] };
      if (s.startsWith('Suggest features')) return { features: [{ title: 'Import from photo', detail: 'Snap a cookbook page', priority: 'could' }, { title: 'Tags', detail: 'Filter by tag', priority: 'should' }] };
      if (s.startsWith('Review this project')) return { headline: 'The plan is clear. Next, split the large week grid task.', strengths: ['Tight scope', 'Clear done line'], risks: ['No tests yet', 'Large task'], suggestions: [{ title: 'Add a smoke test', why: 'Lets Claude check itself', type: 'task' }, { title: 'Offline mode', why: 'Use in kitchen', type: 'feature' }, { title: 'Only change files the task names', why: 'Avoid sprawling diffs', type: 'rule' }] };
      return {};
    })();
  };
  sample.limits = async () => ({ maxPromptBytes: 262144 });
  const sampleF = Object.freeze(sample);
  const downloads = Object.freeze({ save: async (r) => { window.__mockLog.push(['save', r.filename, String(r.data).length]); return { status: 'saved' }; } });
  const caps = { db, sample: sampleF, downloads };
  if (U) caps.user = Object.freeze({ isOwner: async () => !!U.owner, canEdit: async () => !!U.edit, can: async (n) => (n === 'data.write' ? (U.write === undefined ? !!(U.owner || U.edit) : U.write) : null) });
  window.claude = Object.freeze({ use: (name) => new Promise((res) => setTimeout(() => res(caps[name] || null), (name === 'user' && U && U.delay) || 80)) });
  if (seed) for (const [id, body] of Object.entries(seed)) docs.set(id, body);
})();
