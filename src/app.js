(() => {
'use strict';

/* ================= helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = (p) => p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const arr = (v) => (Array.isArray(v) ? v : []);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
// an item as compared for "changed since": its fields in a fixed order, nested ones too
const sigOf = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((y) => [y, x[y]])) : x));
const dayOf = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); // the date on the user's own calendar
const today = () => dayOf(new Date());
// "2026-02-30" is not a day; checked on the calendar itself, so the time zone cannot shift it
const realDay = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(s)); if (!m) return false; const d = new Date(Date.UTC(+m[1], m[2] - 1, +m[3])); return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === m[2] - 1 && d.getUTCDate() === +m[3]; };
const localDay = (iso) => { const t = new Date(str(iso)); return Number.isNaN(t.getTime()) ? str(iso).slice(0, 10) : dayOf(t); };
const nowISO = () => new Date().toISOString();
const clone = (o) => JSON.parse(JSON.stringify(o));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
let LS_DATA = 'shipyard.projects.v1'; // someone who may only view a shared planner keeps theirs apart, in LS_GUEST
const LS_GUEST = 'shipyard.guest.v1';
const LS_UI = 'shipyard.ui.v1';
const MAX_BYTES = 250000; // the largest project the account store takes
function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }

const ICON = {
  trash: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5"/></svg>',
  up: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10l4-4 4 4"/></svg>',
  down: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>',
  notes: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 4h10M3 8h10M3 12h6"/></svg>',
  check: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.2l2.3 2.3 4.7-5"/></svg>',
  dash: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h6"/></svg>',
  menu: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2.5 4h11M2.5 8h11M2.5 12h11"/></svg>',
  search: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.25"/><path d="M10.2 10.2L13.5 13.5"/></svg>',
};

const STAGES = [
  { k: 'idea', label: 'Idea' },
  { k: 'designing', label: 'Designing' },
  { k: 'building', label: 'Building' },
  { k: 'polishing', label: 'Polishing' },
  { k: 'shipped', label: 'Shipped' },
];
const STATUS = { todo: 'To do', doing: 'In progress', done: 'Done' };
const NEXT_STATUS = { todo: 'doing', doing: 'done', done: 'todo' };
const PRIORITIES = [
  { k: 'must', label: 'Must have', note: 'The first version cannot ship without these.', codeNote: 'What has to keep working, or the project is no use without it.' },
  { k: 'should', label: 'Should have', note: 'Important, but the first version can live without them.', codeNote: 'Planned, once the must-haves work well.' },
  { k: 'could', label: 'Could have', note: 'Nice ideas for later.' },
];
const TABS = [
  { k: 'overview', label: 'Overview' },
  { k: 'design', label: 'Design' },
  { k: 'plan', label: 'Plan' },
  { k: 'claudemd', label: 'Project files' },
  { k: 'improve', label: 'Improve' },
];
const HABITS = [
  { k: 'claudemd', group: 'Setup', label: "CLAUDE.md is in your project's folder and up to date", hint: 'It is the notes Claude Code reads first. The setup prompt on the Project files tab puts it there, or run /init in Claude Code and merge the two.' },
  { k: 'git', group: 'Setup', label: 'The project is in git, with a saved version after each step', hint: 'Ask Claude Code to commit (save a version) after each working step, so you can always go back.' },
  { k: 'tests', group: 'Setup', label: 'There are tests or checks Claude Code can run', hint: 'Even one quick test that the app starts lets Claude Code catch its own mistakes.' },
  { k: 'planmode', group: 'Each session', label: 'Big changes start in plan mode', hint: 'Type /plan before the request, or press Shift+Tab until Claude Code shows plan mode (in the desktop app, pick Plan in the mode menu). Agree on the approach, then let it edit.' },
  { k: 'clear', group: 'Each session', label: 'Use /clear between unrelated tasks', hint: 'It starts Claude Code afresh, so what it remembers from the last task does not get in the way of the next.' },
  { k: 'diff', group: 'Each session', label: 'Review what changed before moving on', hint: 'Type /diff in Claude Code after each task and ask about anything you do not follow. /rewind takes back edits from a step that went wrong.' },
  { k: 'lessons', group: 'Afterwards', label: 'Repeated mistakes become CLAUDE.md rules', hint: "Log what went wrong below and add the fix as a rule with one click. Then paste the prompt from the Project files tab into Claude Code, so your project's folder has the new CLAUDE.md." },
];

/* ================= model ================= */
// which of Shipyard's files the project's folder already had when it was imported
const REPO_HAS = [['claudemd', /\bCLAUDE\.md\b/i], ['plan', /\bPLAN\.md\b/i], ['settings', /(?:^|[^\w.-])settings\.json\b/i], ['commands', /\.claude\/commands\b/i], ['agents', /\.claude\/agents\b/i]];
const repoHasList = (v) => { const s = new Set(str(v).split(/\s+/)); return REPO_HAS.map(([k]) => k).filter((k) => s.has(k)).join(' '); };
const repoHas = (p, k) => str(p?.repoHas).split(' ').includes(k);
function blankProject(name, pitch) {
  const t = nowISO();
  return {
    kind: 'project', name: name || 'Untitled project', pitch: pitch || '', stage: 'idea', starter: '',
    audience: '', problem: '', doneWhen: '', targetDate: '', stack: '', commands: '', conventions: '', constraints: '', repo: '',
    features: [], screens: [], entities: [], decisions: [], milestones: [], checks: {}, lessons: [], sessions: [], bugs: [], prompts: [], chat: [],
    claudeMd: '', claudeMdEdited: false, claudeMdOwn: false, fromCode: false, repoHas: '', lastReview: null, archived: false, guideHidden: false, guideAgain: false, example: false, copied: {}, folder: { files: {}, plan: null }, checked: {}, createdAt: t, updatedAt: t,
  };
}
const FIELDS = Object.keys(blankProject());
const LIST_FIELDS = FIELDS.filter((k) => Array.isArray(blankProject()[k]));
// a stored project, including one written without its kind by another app
const looksLikeProject = (d) => isPlain(d) && (d.kind === 'project' || (d.kind == null && (typeof d.name === 'string' || Array.isArray(d.milestones))));
const oneOf = (v, list, d) => { if (list.includes(v)) return v; const s = typeof v === 'string' ? v.trim().toLowerCase() : ''; return (s && list.find((x) => x.toLowerCase() === s)) || d; }; // "Must" and "s" read as must and S
// a password or token in a link ("https://me:ghp_...@github.com/...", as git prints for a repo cloned with one) is taken out
const CREDS = /\b([a-z][a-z0-9+.-]*:\/\/)([^\/@\s]*:[^\/@\s]*|[^\/@\s]*(?:ghp_|gho_|ghs_|github_pat_|glpat-|x-access-token|oauth2)[^\/@\s]*)@/gi;
const noCreds = (v) => str(v).replace(CREDS, '$1');
// keys, tokens and passwords: well-known shapes, and NAME_KEY=value style settings (also inside JSON, where quotes are escaped)
const SECRET_RES = [
  /\b[rsp]k_(?:live|test)_[A-Za-z0-9]{10,}/g, /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}/g, /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{20,})/g,
  /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, /\bxox[abposr]-[A-Za-z0-9-]{10,}/g, /\bAIza[0-9A-Za-z_-]{30,}/g, /\b[a-z]{2}\.eyJ[A-Za-z0-9_.-]{20,}/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, /\b(Bearer\s+)[A-Za-z0-9._~+\/=-]{16,}/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g,
];
const SECRET_SET = /\b([A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD|PWD|PASS)[A-Z0-9_]*)(\s*[=:]\s*)(\\?["']?)(?![$<\[])([^\s"'`\\]{6,})\3/g;
const SECRET_MARK = '[hidden by Shipyard]';
const maskSecrets = (s) => SECRET_RES.reduce((t, re) => t.replace(re, (x, pre) => (typeof pre === 'string' && /^Bearer/.test(pre) ? pre : '') + SECRET_MARK), noCreds(s))
  .replace(SECRET_SET, (x, k, eq, q, v) => (/^(process|os|import|env)\b|\(/.test(v) ? x : `${k}${eq}${q}${SECRET_MARK}${q}`));
const hasSecret = (s) => maskSecrets(s) !== str(s);
const inLine = (v) => str(v).replace(/[\r\n]+/g, ' '); // a name or title is one line: one with line breaks (imported, or from another app) would add lines to every file it is written into
function cleanId(v, prefix, seen) {
  let id = typeof v === 'string' && ID_RE.test(v) ? v : '';
  if (seen?.repair && (!id || seen.has(id))) { // a stored project with a missing or repeated id: the same new id every time it is read
    let n = seen.size;
    do id = `${prefix}-r${++n}`; while (seen.has(id));
  }
  if (!id) id = uid(prefix);
  if (seen) { while (seen.has(id)) id = uid(prefix); seen.add(id); }
  return id;
}
// fields this version does not know (written by a newer version or another app) are kept, after the ones it knows
const withRest = (o, x) => { for (const k of Object.keys(x)) if (!(k in o) && k !== '__proto__') o[k] = x[k]; return o; };
const mkFeature = (f, seen) => { f = obj(f); return withRest({ id: cleanId(f.id, 'f', seen), title: inLine(f.title), detail: str(f.detail), priority: oneOf(f.priority, ['must', 'should', 'could'], 'should'), status: oneOf(f.status, ['todo', 'doing', 'done'], 'todo') }, f); };
const mkTask = (t, seen) => { t = obj(t); return withRest({ id: cleanId(t.id, 't', seen), title: inLine(t.title), notes: str(t.notes), size: oneOf(t.size, ['S', 'M', 'L'], 'M'), status: oneOf(t.status, ['todo', 'doing', 'done'], 'todo'), feat: str(t.feat), splitFrom: str(t.splitFrom).split(/\s+/).filter((x) => ID_RE.test(x)).slice(0, 5).join(' '), doneAt: /^\d{4}-\d{2}-\d{2}$/.test(str(t.doneAt)) ? str(t.doneAt) : '', startedAt: /^\d{4}-\d{2}-\d{2}$/.test(str(t.startedAt)) ? str(t.startedAt) : '' }, t); };
const mkMilestone = (m, seen) => { m = obj(m); return withRest({ id: cleanId(m.id, 'm', seen), title: inLine(m.title), goal: str(m.goal), tasks: arr(m.tasks).map((t) => mkTask(t, seen)) }, m); };
const mkEntity = (e, seen) => { e = obj(e); return withRest({ id: cleanId(e.id, 'e', seen), name: inLine(e.name), fields: str(e.fields), notes: str(e.notes) }, e); };
const clipText = (s, n, mark) => (s.length > n && !s.endsWith(mark) ? s.slice(0, n) + mark : s);
const SUMMARY_MAX = 20000; // a pasted session report; the oldest sessions are trimmed before a project gets too large
const SUMMARY_CUT = '\n\n(The rest of this summary was too long to keep.)';
const mkChat = (x, seen) => { x = obj(x); const { by, ...rest } = x; return withRest({ id: cleanId(x.id, 'c', seen), q: clipText(str(x.q), 4000, ' …'), a: clipText(str(x.a), 20000, '\n\n(The rest of this answer was too long to keep.)'), stopped: !!x.stopped, failed: !!x.failed, at: x.at == null ? nowISO() : str(x.at), ...(by === 'owner' || by === 'editor' ? { by } : {}) }, rest); };
const mkPrompt = (x, seen) => { x = obj(x); return withRest({ id: cleanId(x.id, 'q', seen), title: inLine(x.title), text: str(x.text) }, x); };
const mkScreen = (s, seen) => { s = obj(s); return withRest({ id: cleanId(s.id, 's', seen), name: inLine(s.name), notes: str(s.notes) }, s); };
const mkDecision = (d, seen) => { d = obj(d); return withRest({ id: cleanId(d.id, 'd', seen), date: d.date == null ? today() : str(d.date), text: str(d.text), why: str(d.why) }, d); };
const OUTCOMES = [
  { k: 'done', label: 'Done, it works', short: 'Done' },
  { k: 'partly', label: 'Partly done', short: 'Partly done' },
  { k: 'stuck', label: 'Stuck', short: 'Stuck' },
];
const mkSession = (x, seen) => { x = obj(x); return withRest({ id: cleanId(x.id, 'x', seen), date: x.date == null ? today() : str(x.date), mid: str(x.mid), tid: str(x.tid), bid: str(x.bid), task: str(x.task), outcome: oneOf(x.outcome, OUTCOMES.map((o) => o.k), 'done'), summary: clipText(str(x.summary), SUMMARY_MAX, SUMMARY_CUT), wrong: str(x.wrong) }, x); };
const mkLesson = (l, seen) => { l = obj(l); return withRest({ id: cleanId(l.id, 'l', seen), date: l.date == null ? today() : str(l.date), happened: str(l.happened), change: str(l.change), promoted: !!l.promoted, rule: str(l.rule), sid: str(l.sid) }, l); };
const SEVERITY = [
  { k: 'blocker', label: 'Blocker' },
  { k: 'major', label: 'Major' },
  { k: 'minor', label: 'Minor' },
];
const SEV_RANK = { blocker: 0, major: 1, minor: 2 };
// a bug marked fixed keeps the day; opened again, it keeps the old day until it is fixed again (so an undo gets it back)
const setBugStatus = (b, s) => { if (s === 'fixed' && b.status !== 'fixed') b.fixedAt = today(); b.status = s; };
// Undo for marking a bug fixed or open: puts the status back and focuses the button that changed it
const bugUndo = (p, b) => {
  const was = b.status === 'fixed' ? 'open' : 'fixed';
  return { pid: idOf(p), restore: (q) => { const x = q.bugs.find((y) => y.id === b.id); if (!x) return null; x.status = was; return S.tab === 'overview' ? 'next-bug-fixed' : fid(`bugs.${b.id}.st`); } };
};
const mkBug = (b, seen) => { b = obj(b); return withRest({ id: cleanId(b.id, 'b', seen), date: b.date == null ? today() : str(b.date), fixedAt: /^\d{4}-\d{2}-\d{2}$/.test(str(b.fixedAt)) ? str(b.fixedAt) : '', title: inLine(b.title), actual: str(b.actual), expected: str(b.expected), steps: str(b.steps), error: str(b.error), severity: oneOf(b.severity, ['blocker', 'major', 'minor'], 'major'), status: oneOf(b.status, ['open', 'fixed'], 'open') }, b); };
const openBugs = (p) => p.bugs.filter((b) => b.status === 'open' && b.title.trim()).sort((x, y) => SEV_RANK[x.severity] - SEV_RANK[y.severity]);
const lineOf = (x) => (typeof x === 'string' ? x : x && typeof x === 'object' ? str(x.text ?? x.title ?? x.point ?? x.risk ?? x.strength ?? '') : str(x)); // a review point, as text
function mkReview(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return null;
  return withRest({
    at: str(r.at) || nowISO(), headline: str(r.headline),
    strengths: arr(r.strengths).map(lineOf).filter(Boolean), risks: arr(r.risks).map(lineOf).filter(Boolean),
    suggestions: arr(r.suggestions).map((s) => (typeof s === 'string' ? { title: s } : obj(s))).map((s) => withRest({ title: str(s.title), why: str(s.why), type: oneOf(s.type, ['task', 'feature', 'rule'], 'task'), added: !!s.added }, s)).filter((s) => s.title),
  }, r);
}
// what the project's folder was last given, as far as Shipyard knows: a fingerprint of each file handed over (copied,
// downloaded or in the setup prompt), and which tasks and bugs its PLAN.md has, ticked (1) or not (0), from the last
// hand-over or Update from PLAN.md. `setup` is set once the setup prompt was used, so a file added later counts as missing.
function folderOf(raw) {
  const f = obj(raw);
  const out = { files: {}, plan: null };
  for (const [k, v] of Object.entries(obj(f.files)).slice(0, 200)) if (typeof v === 'string' && v.length <= 16 && /^(?:[a-z]+|cmd:[A-Za-z0-9_-]{1,40})$/.test(k)) out.files[k] = v;
  if (f.setup === true) out.setup = true;
  if (isPlain(f.plan)) {
    const ticks = (o) => { const m = {}; for (const [id, v] of Object.entries(obj(o)).slice(0, 5000)) if (/^[A-Za-z0-9_-]{1,40}$/.test(id) && (v === 0 || v === 1)) m[id] = v; return m; };
    out.plan = { at: realDay(f.plan.at) ? f.plan.at : '', tasks: ticks(f.plan.tasks), bugs: ticks(f.plan.bugs) };
  }
  return out;
}
function normalize(raw) {
  raw = obj(raw);
  const p = blankProject();
  const seen = new Set();
  seen.repair = true;
  for (const k of ['name', 'pitch', 'audience', 'problem', 'doneWhen', 'stack', 'commands', 'conventions', 'constraints', 'repo', 'claudeMd', 'createdAt', 'updatedAt']) {
    if (raw[k] != null) p[k] = str(raw[k]);
  }
  p.name = inLine(p.name);
  p.repo = noCreds(p.repo);
  p.targetDate = /^\d{4}-\d{2}-\d{2}$/.test(str(raw.targetDate)) ? str(raw.targetDate) : '';
  p.stage = oneOf(raw.stage, STAGES.map((s) => s.k), 'idea');
  p.starter = oneOf(raw.starter, STARTERS.map((s) => s.k), '');
  p.features = arr(raw.features).map((x) => mkFeature(x, seen));
  p.screens = arr(raw.screens).map((x) => mkScreen(x, seen));
  p.decisions = arr(raw.decisions).map((x) => mkDecision(x, seen));
  p.milestones = arr(raw.milestones).map((x) => mkMilestone(x, seen));
  p.checks = {};
  // kept as explicit true/false: update() merges nested objects, so a dropped key would never clear on the server
  for (const [k, v] of Object.entries(obj(raw.checks))) if (typeof v === 'boolean' && HABITS.some((h) => h.k === k)) p.checks[k] = v;
  p.lessons = arr(raw.lessons).map((x) => mkLesson(x, seen));
  p.sessions = arr(raw.sessions).map((x) => mkSession(x, seen));
  p.bugs = arr(raw.bugs).map((x) => mkBug(x, seen));
  p.entities = arr(raw.entities).map((x) => mkEntity(x, seen));
  p.prompts = arr(raw.prompts).map((x) => mkPrompt(x, seen));
  p.chat = arr(raw.chat).map((x) => mkChat(x, seen)).slice(-6);
  p.claudeMdEdited = !!raw.claudeMdEdited;
  p.claudeMdOwn = p.claudeMdEdited && !!raw.claudeMdOwn; // the CLAUDE.md is the owner's own file, as imported
  p.fromCode = !!raw.fromCode; // brought in from code that already exists
  p.repoHas = repoHasList(raw.repoHas);
  p.archived = !!raw.archived;
  p.guideHidden = !!raw.guideHidden;
  p.guideAgain = !!raw.guideAgain;
  // examples made before round 27 have no flag: they are known by their first session
  p.example = !!raw.example || (/^(Example: )?Recipe Box$/.test(str(raw.name)) && arr(raw.sessions).some((s) => str(s?.summary).startsWith('Scaffolded in a temporary folder and moved it in, so CLAUDE.md was kept.')));
  p.copied = {};
  for (const [k, v] of Object.entries(obj(raw.copied))) if (typeof v === 'boolean' && ['claudemd', 'plan'].includes(k)) p.copied[k] = v;
  p.folder = folderOf(raw.folder);
  p.checked = {}; // guide steps the owner has looked over, for a project brought in from its code
  for (const [k, v] of Object.entries(obj(raw.checked))) if (v === true && ['brief', 'features'].includes(k)) p.checked[k] = v;
  p.lastReview = mkReview(raw.lastReview);
  return withRest(p, raw);
}
function newIds(p) { // a set holding every id already used in a project
  const s = new Set();
  for (const k of ['features', 'screens', 'entities', 'decisions', 'lessons', 'sessions', 'bugs', 'prompts', 'chat']) p[k].forEach((x) => s.add(x.id));
  p.milestones.forEach((m) => { s.add(m.id); m.tasks.forEach((t) => s.add(t.id)); });
  return s;
}
function resolveParent(o, path) {
  const segs = path.split('.');
  let cur = o;
  for (let i = 0; i < segs.length - 1; i++) {
    cur = Array.isArray(cur) ? cur.find((x) => x.id === segs[i]) : cur?.[segs[i]];
    if (cur == null) return [null, null];
  }
  return [cur, segs[segs.length - 1]];
}
function setPath(o, path, v) { const [t, k] = resolveParent(o, path); if (t) t[k] = v; }
const fid = (path) => 'f-' + path.replace(/\./g, '-');

const allTasks = (p) => p.milestones.flatMap((m) => m.tasks);
const leadDone = (m) => { let k = 0; while (k < m.tasks.length && m.tasks[k].status === 'done') k++; return k; };
const RUN_MIN = 3; // a shorter run of done tasks is not worth a row of its own
function nextUp(p) {
  for (const m of p.milestones) {
    const t = m.tasks.find((x) => x.status === 'doing') || m.tasks.find((x) => x.status === 'todo');
    if (t) return { m, t };
  }
  return null;
}
const msIndex = (p, m) => p.milestones.indexOf(m) + 1;
// moves a task one place up or down; past the end of its milestone it joins the next or previous one.
// Returns the milestone it ends up in, or null when it cannot move.
function moveTask(p, mid, tid, d) {
  const i = p.milestones.findIndex((x) => x.id === mid);
  const m = p.milestones[i];
  const j = m ? m.tasks.findIndex((t) => t.id === tid) : -1;
  if (j < 0) return null;
  if (d < 0 && j === 0) {
    const prev = p.milestones[i - 1];
    if (!prev) return null;
    prev.tasks.push(...m.tasks.splice(j, 1));
    return prev;
  }
  if (d > 0 && j === m.tasks.length - 1) {
    const next = p.milestones[i + 1];
    if (!next) return null;
    next.tasks.unshift(...m.tasks.splice(j, 1));
    return next;
  }
  const [t] = m.tasks.splice(j, 1);
  m.tasks.splice(j + (d < 0 ? -1 : 1), 0, t);
  return m;
}
// moves a task to the end of another milestone
function moveTaskTo(p, mid, tid, toMid) {
  const m = p.milestones.find((x) => x.id === mid);
  const to = p.milestones.find((x) => x.id === toMid);
  const j = m ? m.tasks.findIndex((t) => t.id === tid) : -1;
  if (!to || to === m || j < 0) return null;
  to.tasks.push(...m.tasks.splice(j, 1));
  return to;
}
// "Same setup as another project": what carries over to the next build. The plan, brief and history stay behind.
// Rules written into its CLAUDE.md by hand come too, into Conventions; the starter's first and last milestones start the plan.
// Copied lessons are dated today and say which project they come from. Returns how many CLAUDE.md rules came over.
function applySetupFrom(p, src) {
  if (!src) return 0;
  const seen = newIds(p);
  p.starter = src.starter;
  for (const f of ['stack', 'commands', 'conventions', 'constraints']) p[f] = src[f];
  const from = oneLine(src.name) || 'another project';
  p.lessons = src.lessons.filter((l) => l.promoted && l.change.trim()).map((l) => mkLesson({ ...l, id: null, date: today(), happened: `In ${from}: ${oneLine(l.happened)}`, sid: '' }, seen));
  p.prompts = src.prompts.filter((x) => x.text.trim()).map((x) => mkPrompt({ ...x, id: null }, seen));
  const have = new Set(lines(p.conventions).map((l) => ruleText(l).toLowerCase()));
  const extra = claudeMdRules(src).filter((r) => !have.has(ruleText(r).toLowerCase()));
  if (extra.length) p.conventions = [p.conventions.trim(), ...extra.map((r) => `- ${r}`)].filter(Boolean).join('\n');
  applyStarter(p, src.starter);
  return extra.length;
}
// list lines a hand-edited CLAUDE.md has, outside the sections about the project itself, that the one built from the project lacks
const PROJECT_HEADS = /^(about|repository|tech stack|stack|commands|first version|after the first version|core features|other features|features?|screens|data model|decisions|bugs|known issues|overview|status|roadmap|plan)\b/i;
function claudeMdRules(p) {
  if (!p.claudeMdEdited || !p.claudeMd.trim()) return [];
  const built = new Set(lines(buildClaudeMd(p)).map((l) => ruleText(l).toLowerCase()));
  const out = [];
  let on = false;
  let fence = false;
  for (const l of str(p.claudeMd).split('\n')) {
    if (FENCE.test(l) && fenceStep(fence, l) !== fence) { fence = fenceStep(fence, l); continue; }
    if (fence) continue;
    const hd = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(l);
    if (hd) { on = hd[1].length > 1 && !PROJECT_HEADS.test(hd[2]); continue; }
    const m = on && /^ ?[-*+]\s+(?!\[[ xX]\])(.+)$/.exec(l);
    if (m && !built.has(ruleText(m[1]).toLowerCase())) out.push(m[1].trim());
  }
  return [...new Set(out)];
}
// a full copy under a new name
function duplicateProject(src) {
  const c = normalize(JSON.parse(JSON.stringify(src)));
  const map = new Map();
  const seen = new Set();
  const fresh = (prefix) => (x) => { const id = cleanId(null, prefix, seen); map.set(x.id, id); x.id = id; };
  const remap = (id, prefix) => { if (!map.has(id)) map.set(id, cleanId(null, prefix, seen)); return map.get(id); };
  c.features.forEach(fresh('f'));
  c.milestones.forEach((m) => { fresh('m')(m); m.tasks.forEach(fresh('t')); });
  for (const [k, prefix] of [['screens', 's'], ['entities', 'e'], ['decisions', 'd'], ['lessons', 'l'], ['sessions', 'x'], ['bugs', 'b'], ['prompts', 'q'], ['chat', 'c']]) c[k].forEach(fresh(prefix));
  allTasks(c).forEach((x) => { x.feat = x.feat ? map.get(x.feat) || '' : ''; x.splitFrom = x.splitFrom ? x.splitFrom.split(' ').map((y) => remap(y, 't')).join(' ') : ''; });
  // the sessions and done dates are the original's history: the copy starts its own, so weeks are not counted twice
  c.sessions = [];
  allTasks(c).forEach((x) => { x.doneAt = ''; });
  if (src.sessions?.length) c.guideHidden = true;
  c.example = false; c.guideAgain = false; // a copy is your own project
  c.folder = folderOf(null); // and has a folder of its own
  const t = nowISO();
  Object.assign(c, { name: `${oneLine(src.name) || 'Untitled project'} (copy)`, archived: false, createdAt: t, updatedAt: t });
  return c;
}
// the project list, filtered by the search box; archived projects show on request or when searching
function railLists(entries, query, showArchived) {
  const q = str(query).trim().toLowerCase();
  const match = ([, p]) => !q || `${p.name}\n${p.pitch}`.toLowerCase().includes(q);
  const live = entries.filter(([, p]) => !p.archived && match([, p]));
  const archived = entries.filter(([, p]) => p.archived);
  return { live, archived: archived.filter(match), archivedCount: archived.length, showArchived: !!q || showArchived, q };
}
// a small, safe Markdown renderer for Claude's answers: everything is escaped first, then paragraphs, lists
// (numbered lists keep their numbers across blank lines, one level of nesting), headings, quotes, tables,
// code blocks, links (http and https only), bold, italics and inline code are added
function mdLite(src) {
  const out = [];
  let list = null; let code = null; let codeIn = 0; let codeFence = null; let para = []; let quote = []; let table = null; let gap = false;
  const inline = (s) => {
    const keep = [];
    const hold = (html) => `\u0000${keep.push(html) - 1}\u0000`;
    let t = esc(s).replace(/`([^`]+)`/g, (m, c) => hold(`<code>${c}</code>`));
    t = t.replace(/\[([^\]\n]+)\]\((https?:\/\/(?:[^\s()]|\([^\s()]*\))+)\)/g, (m, label, url) => hold(`<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>${linkHost(label, url)}`));
    t = t.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[\s(["'])__([^_\s][^_]*?)__(?=$|[\s)\]"',;:!?]|\.(?!\w))/g, '$1<b>$2</b>')
      .replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:!?]|$)/g, '$1<i>$2</i>');
    return t.replace(/\u0000(\d+)\u0000/g, (m, i) => keep[+i]);
  };
  const flushP = () => { if (para.length) { out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = []; } };
  const flushQ = () => { if (quote.length) { out.push(`<blockquote>${quote.map(inline).join('<br>')}</blockquote>`); quote = []; } };
  const items = (l) => l.items.map((x) => `<li>${inline(x.text)}${x.sub ? `<${x.sub.t}>${x.sub.items.map((y) => `<li>${inline(y)}</li>`).join('')}</${x.sub.t}>` : ''}</li>`).join('');
  const flushL = () => { if (list) { out.push(`<${list.t}${list.t === 'ol' && list.start !== 1 ? ` start="${list.start}"` : ''}>${items(list)}</${list.t}>`); list = null; } gap = false; };
  const cells = (row) => row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
  const flushT = () => {
    if (!table) return;
    const [head, , ...body] = table;
    out.push(`<div class="md-table"><table><thead><tr>${cells(head).map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
    table = null;
  };
  const flushAll = () => { flushP(); flushQ(); flushL(); flushT(); };
  const lines = str(src).replace(/\r\n?/g, '\n').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    let m;
    if (code) {
      if (!fenceStep(codeFence, raw)) { out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`); code = null; } else code.push(raw.replace(new RegExp(`^ {0,${codeIn}}`), '')); // code inside a list item loses the item's indent
      continue;
    }
    if ((m = /^( *)(`{3,}|~{3,})/.exec(raw))) { flushAll(); code = []; codeIn = m[1].length; codeFence = fenceStep(null, raw); continue; }
    const line = raw.trimEnd();
    if (!line.trim()) { flushP(); flushQ(); flushT(); if (list) gap = true; continue; }
    if (table) { if (/^\s*\|/.test(line)) { table.push(line); continue; } flushT(); }
    if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1] || '')) { flushAll(); table = [line]; continue; }
    if ((m = /^\s{0,3}#{1,6}\s+(.*)$/.exec(line))) { flushAll(); out.push(`<p class="md-h">${inline(m[1])}</p>`); continue; }
    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) { flushAll(); out.push('<hr>'); continue; }
    if ((m = /^\s{0,3}>\s?(.*)$/.exec(line))) { flushP(); flushL(); quote.push(m[1]); continue; }
    flushQ();
    if ((m = /^(\s*)(?:[-*+]|(\d+)[.)])\s+(.*)$/.exec(line))) {
      const t = m[2] ? 'ol' : 'ul';
      flushP();
      if (list && m[1].length >= 2 && list.items.length) { // one level of nesting
        const last = list.items[list.items.length - 1];
        if (!last.sub || last.sub.t !== t) last.sub = { t, items: [] };
        last.sub.items.push(m[3]); gap = false; continue;
      }
      if (list && list.t !== t) flushL();
      if (!list) list = { t, items: [], start: m[2] ? Math.min(+m[2], 99999) : 1 };
      list.items.push({ text: m[3] }); gap = false;
      continue;
    }
    if (list && /^\s{2,}\S/.test(raw)) { // a wrapped line, or a paragraph inside the item after a blank line
      const last = list.items[list.items.length - 1];
      if (last.sub && !gap) last.sub.items[last.sub.items.length - 1] += ' ' + line.trim(); else last.text += ' ' + line.trim();
      gap = false; continue;
    }
    if (list && !gap) { list.items[list.items.length - 1].text += ' ' + line.trim(); continue; } // lazy continuation
    flushL();
    para.push(line.trim());
  }
  if (code) out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
  flushAll();
  return out.join('');
}
// the conversation sent to Claude: project details go with the first question, older answers stay as context
function chatMessages(p, q, intro) {
  const hist = p.chat.slice(-CHAT_KEEP);
  const first = (x) => `${intro}\n\nQuestion: ${x}`;
  const msgs = [];
  const ans = (x) => (clipText(x.a.trim(), 6000, ' …') || '(no answer)') + (x.failed || x.stopped ? '\n\n(This answer broke off here.)' : '');
  hist.forEach((x, i) => { msgs.push({ role: 'user', content: i === 0 ? first(x.q) : x.q }, { role: 'assistant', content: ans(x) }); });
  msgs.push({ role: 'user', content: hist.length ? q : first(q) });
  return msgs;
}
// saved prompts become Claude Code slash commands: .claude/commands/<name>.md
const cmdSlug = (s) => str(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
const BUILTIN_CMDS = new Set(('add-dir advisor agents artifacts auto-mode-setup autocompact autofix-pr background batch branch btw bug cd chrome claude-api clear code-review color compact config context copy dataviz debug deep-research design desktop diff doctor effort exit export fast feedback focus fork goal help hooks ide import init insights install-github-app install-slack-app keybindings list-agents login logout loop mcp memory mobile model output-style passes permissions plan plugin powerup privacy-settings radio rate-limit-options recap release-notes reload-plugins reload-skills remote-control remote-env rename resume rewind run sandbox schedule scroll-speed security-review simplify skill-doctor skills slides status statusline stickers stop subtask tasks team-onboarding teleport terminal-setup theme tui ultrareview update-config upgrade usage verify voice web-setup workflows '
  + 'adddir artifact-capabilities artifact-diagramming claude-in-chrome design-login design-sync extra-usage fewer-permission-prompts plugin-authoring pr-comments run-skill-generator setup-bedrock setup-vertex usage-credits workflow-authoring '
  + 'app allowed-tools bashes bg checkpoint undo checkup continue cost stats ios android new reset peers proactive quit rc review routines settings share tp vim ultraplan heapdump').split(' '));
function promptCommands(p) {
  const used = new Set(['next']);
  return p.prompts.filter((x) => x.title.trim() && x.text.trim()).map((x) => {
    let base = cmdSlug(x.title) || 'prompt';
    const reserved = BUILTIN_CMDS.has(base) ? base : '';
    if (reserved) base += '-prompt'; // a project command would hide the built-in one
    let s = base;
    for (let n = 2; used.has(s); n++) s = `${base}-${n}`;
    used.add(s);
    return { id: x.id, slug: s, title: oneLine(x.title), text: x.text.trim(), reserved };
  });
}
// In a command file Claude Code replaces $0, $1, ... with the words typed after the command and runs !`...` as a shell
// command before Claude sees the text. A saved prompt means them literally: $1 is written \$1, and !` gets a space.
const plainCommandText = (t) => str(t).replace(/(^|[^\\])\$(?=\d)/g, '$1\\$').replace(/(^|\s)!`/g, '$1! `').replace(/(`{3,})!/g, '$1');
function commandMd(c) {
  const args = c.text.includes('$ARGUMENTS');
  return ['---', `description: ${JSON.stringify(c.title.slice(0, 120))}`, ...(args ? [] : ['argument-hint: [optional note]']), 'disable-model-invocation: true', '---', '',
    plainCommandText(c.text), ...(args ? [] : ['', 'Extra note from me, if any: $ARGUMENTS']), ''].join('\n');
}
// the getting-started steps for a new project, each checked off from what the project already has
function guideSteps(p) {
  const tasks = allTasks(p);
  const c = p.copied || {};
  const missing = [['audience', 'who it is for'], ['problem', 'the problem'], ['doneWhen', 'what the first version must do']].filter(([k]) => !p[k].trim());
  const un = unplannedMust(p);
  const steps = [
    { k: 'pitch', label: 'Say what you are building', hint: 'One sentence in the Pitch box below.', done: !!p.pitch.trim() },
    { k: 'brief', label: 'Fill in the brief', hint: missing.length && missing.length < 3 ? `Still to fill in: ${missing.map((x) => x[1]).join(missing.length === 2 ? ' and ' : ', ')}.` : 'Who it is for, the problem, and what the first version must do.', done: !missing.length || (p.fromCode && !!p.checked?.brief), field: missing[0]?.[0] || 'audience' },
    { k: 'features', label: 'List the must-haves', hint: 'The features the first version cannot ship without, on the Design tab.', done: p.features.some((f) => f.priority === 'must' && f.title.trim()) },
    { k: 'plan', label: 'Plan each must-have', hint: un.length ? `"${oneLine(un[0].title)}" has no tasks yet. Plan it turns a feature into small tasks that each fit in one Claude Code session.` : 'Small tasks that each fit in one Claude Code session, on the Plan tab.', done: ownTasks(p).length > 0 && !un.length, fid: un[0]?.id || '' },
    { k: 'files', label: "Save Shipyard's files in your project's folder", hint: c.claudemd && !c.plan ? 'CLAUDE.md is copied. Copy PLAN.md too, from the Project files tab.' : !c.claudemd && c.plan ? 'PLAN.md is copied. Copy CLAUDE.md too, from the Project files tab.' : 'Make a folder for the project if you have none yet and start Claude Code in it. Then paste the setup prompt, which saves every file, or copy the files one by one from the Project files tab.', done: !!(c.claudemd && c.plan) },
    { k: 'first', label: 'Do the first task with Claude Code', hint: 'Get its task prompt from Next up and paste it into Claude Code.', done: tasks.some((t) => t.status !== 'todo') },
    { k: 'log', label: 'Log how it went', hint: 'A minute after each session keeps the plan honest and turns mistakes into rules.', done: p.sessions.length > 0 },
  ];
  if (!p.fromCode) return steps;
  // brought in from its code: the files go into the folder it already has, before anything else
  const by = Object.fromEntries(steps.map((s) => [s.k, s]));
  Object.assign(by.files, { label: "Add Shipyard's files to your project's folder", hint: !!c.claudemd !== !!c.plan ? by.files.hint : "Start Claude Code in your project's folder and paste the setup prompt, which saves every file. It merges into a CLAUDE.md or PLAN.md already there instead of replacing it." });
  Object.assign(by.features, { label: 'Check the features Claude found', hint: 'Must have is what has to keep working. Planned work goes under Should have, on the Design tab. Choose They look right once you have been through them.', done: by.features.done && !!p.checked?.features });
  Object.assign(by.plan, { label: 'Plan the next milestone' });
  Object.assign(by.first, { label: 'Do the next task with Claude Code' });
  return ['pitch', 'files', 'brief', 'features', 'plan', 'first', 'log'].map((k) => by[k]);
}
// the Monday that starts the week of a YYYY-MM-DD date
function weekOf(d) {
  const t = new Date(str(d).slice(0, 10) + 'T00:00:00Z');
  if (Number.isNaN(t.getTime())) return '';
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
  return t.toISOString().slice(0, 10);
}
// tasks done and sessions per week, for the last n weeks up to the week of `now`
function weeklyProgress(p, now, n = 8) {
  const end = weekOf(now);
  const weeks = [];
  for (let i = n - 1; i >= 0; i--) { const t = new Date(end + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() - 7 * i); weeks.push({ week: t.toISOString().slice(0, 10), tasks: 0, sessions: 0 }); }
  const at = new Map(weeks.map((w) => [w.week, w]));
  const pts = new Map(weeks.map((w) => [w.week, 0])); // work done, with an M task counting twice an S and an L four times
  for (const t of allTasks(p)) if (t.status === 'done' && t.doneAt) { const w = at.get(weekOf(t.doneAt)); if (w) { w.tasks++; pts.set(w.week, pts.get(w.week) + (SIZE_PTS[t.size] || 2)); } }
  for (const s of p.sessions) { const w = at.get(weekOf(s.date)); if (w) w.sessions++; }
  // the pace: up to four whole weeks since the project's first day, plus the part of this week gone by
  const tasks = allTasks(p);
  const first = [localDay(p.createdAt), ...tasks.map((t) => (t.status === 'done' ? t.doneAt : '')), ...arr(p.sessions).map((s) => str(s.date).slice(0, 10))].filter((d) => weekOf(d)).sort()[0];
  const from = first ? weekOf(first) : end;
  const whole = weeks.slice(-5, -1).filter((w) => w.week >= from);
  const span = whole.length + Math.min(7, Math.max(1, daysBetween(end, str(now).slice(0, 10)) + 1)) / 7;
  const recent = [...whole, weeks[weeks.length - 1]];
  const pace = recent.reduce((a, w) => a + w.tasks, 0) / span;
  const left = tasks.filter((t) => t.status !== 'done').length;
  // one busy week is not a pace yet: estimate only once two of those weeks had tasks done
  const steady = recent.filter((w) => w.tasks > 0).length >= 2;
  const ptsDone = recent.reduce((s, w) => s + pts.get(w.week), 0);
  const ptsLeft = tasks.filter((t) => t.status !== 'done').reduce((s, t) => s + (SIZE_PTS[t.size] || 2), 0);
  const daysLeft = steady && left ? Math.max(1, Math.ceil((ptsLeft * span * 7) / ptsDone - 1e-9)) : null;
  return { weeks, pace, left, total: tasks.length, daysLeft, weeksLeft: daysLeft ? Math.max(1, Math.round(daysLeft / 7)) : null };
}
const SIZE_PTS = { S: 1, M: 2, L: 4 };
const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
// how the estimate compares with the date the owner aims to ship by
function targetCheck(g, target, now) {
  const days = g.daysLeft ?? (g.weeksLeft ? g.weeksLeft * 7 : 0);
  const finish = days ? addDays(now, days) : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str(target))) return { finish, late: 0, lateDays: 0, until: 0, state: finish ? 'estimate' : '' };
  const until = daysBetween(now, target);
  if (g.total === 0) return { finish, late: 0, lateDays: 0, until, state: until < 0 ? 'passed' : 'noplan' };
  if (!g.left) return { finish, late: 0, lateDays: 0, until, state: 'done' };
  if (until < 0) return { finish, late: 0, lateDays: 0, until, state: 'passed' };
  if (!finish) return { finish, late: 0, lateDays: 0, until, state: 'nopace' };
  const late = daysBetween(target, finish);
  return { finish, late: late > 0 ? Math.max(1, Math.round(late / 7)) : 0, lateDays: Math.max(0, late), until, state: late > 0 ? 'behind' : 'onpace' };
}
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
// how far behind, in days while under a week
const lateText = (tc) => (tc.lateDays < 7 ? plural(tc.lateDays, 'day', 'days') : `about ${plural(tc.late, 'week', 'weeks')}`);
// a short write-up of one week, to paste into notes, a standup or a changelog
// formatting a date is slow on a phone, and a project shows the same few hundred days again and again
const dayLabels = new Map();
const DAY_FMT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const YEAR_FMT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
let labelYear = '';
const dayLabel = (d) => { // "Sep 8", or "Sep 8, 2025" in another year
  const k = str(d).slice(0, 10);
  const y = String(new Date().getFullYear());
  if (y !== labelYear) { labelYear = y; dayLabels.clear(); }
  const hit = dayLabels.get(k);
  if (hit) return hit;
  const t = new Date(k + 'T00:00:00Z');
  if (Number.isNaN(t.getTime())) return str(d);
  const v = (k.slice(0, 4) === y ? DAY_FMT : YEAR_FMT).format(t);
  if (dayLabels.size > 2000) dayLabels.clear();
  dayLabels.set(k, v);
  return v;
};
function weekSummary(p, week, when = 'that week') { return rangeSummary(p, week, addDays(week, 6), `week of ${dayLabel(week)}`, when); }
// the same for any days, from and to included: "since Sep 28"
function rangeSummary(p, from, to, title, when) {
  const inWeek = (d) => { const x = str(d).slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(x) && x >= from && x <= to; };
  const L = [`# ${oneLine(p.name) || 'Untitled project'}: ${title}`, ''];
  const done = [];
  p.milestones.forEach((m, i) => m.tasks.forEach((t) => { if (t.status === 'done' && inWeek(t.doneAt)) done.push(`- ${oneLine(t.title) || 'Untitled task'} (Milestone ${i + 1}${oneLine(m.title) ? `: ${oneLine(m.title)}` : ''})`); }));
  L.push(done.length ? `Done (${done.length}):` : `Done: nothing marked done ${when}.`, ...done);
  const ss = p.sessions.filter((x) => inWeek(x.date));
  if (ss.length) {
    L.push('', `Claude Code sessions (${ss.length}):`);
    ss.forEach((x) => L.push(`- ${dayLabel(x.date)}, ${(OUTCOMES.find((o) => o.k === x.outcome)?.short || 'Done').toLowerCase()}: ${oneLine(x.task) || 'Untitled task'}${x.outcome !== 'done' && oneLine(x.wrong) ? `. What went wrong: ${oneLine(x.wrong)}` : ''}`));
  }
  const reported = p.bugs.filter((b) => b.title.trim() && inWeek(b.date));
  if (reported.length) L.push('', `Bugs reported (${reported.length}):`, ...reported.map((b) => `- ${dayLabel(b.date)}: ${oneLine(b.title)} (${b.severity}${b.status === 'fixed' ? ', fixed since' : ''})`));
  const fixedIn = p.bugs.filter((b) => b.title.trim() && b.status === 'fixed' && inWeek(b.fixedAt));
  if (fixedIn.length) L.push('', `Bugs fixed (${fixedIn.length}):`, ...fixedIn.map((b) => `- ${dayLabel(b.fixedAt)}: ${oneLine(b.title)}`));
  const nu = nextUp(p);
  const tasks = allTasks(p);
  L.push('', `Plan: ${tasks.filter((t) => t.status === 'done').length} of ${tasks.length} tasks done.${nu ? ` Next up: ${oneLine(nu.t.title) || 'Untitled task'}.` : ''}`);
  const open = p.bugs.filter((b) => b.status === 'open' && b.title.trim());
  if (open.length) L.push(`Open bugs: ${open.length}${open.some((b) => b.severity === 'blocker') ? `, ${open.filter((b) => b.severity === 'blocker').length} blocking` : ''}.`);
  return L.join('\n') + '\n';
}
// the summary dialog: one week, or everything since a day
function summaryOf(p, r, now = today()) {
  if (r.mode === 'since') {
    const from = /^\d{4}-\d{2}-\d{2}$/.test(str(r.since)) && r.since <= now ? r.since : addDays(now, -14);
    return { text: rangeSummary(p, from, now, `since ${dayLabel(from)}`, 'since then'), title: `Summary since ${dayLabel(from)}`, file: `since-${from}.md` };
  }
  const n = daysBetween(r.week, weekOf(now)) / 7;
  const when = n === 0 ? 'this week' : n === 1 ? 'last week' : 'that week';
  return { text: weekSummary(p, r.week, when), title: n === 0 ? "This week's summary" : n === 1 ? "Last week's summary" : `Summary for the week of ${dayLabel(r.week)}`, file: `week-of-${r.week}.md` };
}
const weekName = (week, now = today()) => { const n = daysBetween(week, weekOf(now)) / 7; return `Week of ${dayLabel(week)}${n === 0 ? ' (this week)' : n === 1 ? ' (last week)' : ''}`; };
// the week a summary is about: this one, or the last one while this week is still empty
function summaryWeek(p, now) {
  const wk = weekOf(now);
  const busy = allTasks(p).some((t) => t.status === 'done' && t.doneAt && weekOf(t.doneAt) === wk) || p.sessions.some((x) => weekOf(x.date) === wk);
  if (busy) return { week: wk, label: "this week's" };
  const t = new Date(wk + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() - 7);
  return { week: t.toISOString().slice(0, 10), label: "last week's" };
}
// one project at a glance, for the All projects page
function projectPulse(p, now) {
  const tasks = allTasks(p);
  const done = tasks.filter((t) => t.status === 'done').length;
  const wk = weekOf(now);
  const weekTasks = tasks.filter((t) => t.status === 'done' && t.doneAt && weekOf(t.doneAt) === wk).length;
  const weekSessions = p.sessions.filter((s) => weekOf(s.date) === wk).length;
  const dates = p.sessions.map((s) => str(s.date).slice(0, 10)).filter((d) => weekOf(d)).sort();
  const lastSession = dates.length ? dates[dates.length - 1] : '';
  const open = openBugs(p); // a row with no title yet is a draft, as on the Plan and Overview tabs
  const blockers = open.filter((b) => b.severity === 'blocker').length;
  const next = nextUp(p);
  const tried = blockers ? lastTry(p, null, open[0]) : next ? lastTry(p, next.t) : null;
  const idle = lastSession && done < tasks.length ? Math.round((Date.parse(str(now).slice(0, 10) + 'T00:00:00Z') - Date.parse(lastSession + 'T00:00:00Z')) / 864e5) : 0;
  const tc = targetCheck(weeklyProgress(p, now), p.targetDate, str(now).slice(0, 10));
  const attention = [];
  if (tc.state === 'passed') attention.push('The target date has passed');
  if (tc.state === 'behind') { const t = lateText(tc); attention.push(`${t[0].toUpperCase()}${t.slice(1)} behind the target`); }
  if (blockers) attention.push(`${blockers} blocking bug${blockers === 1 ? '' : 's'} open`);
  if (tried?.outcome === 'stuck') attention.push(`Stuck in the last session on ${blockers ? 'the blocking bug' : 'the next task'}`);
  if (!str(p.pitch).trim()) attention.push('No pitch yet');
  if (!tasks.length) attention.push('No plan yet');
  if (idle >= 14 && !p.example) attention.push(`No session for ${Math.floor(idle / 7)} weeks`);
  if (next && next.t.size === 'L' && next.t.status === 'todo') attention.push('Next task is large: split it first');
  return { target: p.targetDate, tc, done, total: tasks.length, next, weekTasks, weekSessions, lastSession, openBugs: open.length, blockers, idle, stuck: tried?.outcome === 'stuck', attention: attention.slice(0, 2) };
}
// weeks of several projects added together
function sumWeeks(list, now, n = 8) {
  const out = weeklyProgress({ milestones: [], sessions: [] }, now, n).weeks;
  for (const p of list) weeklyProgress(p, now, n).weeks.forEach((w, i) => { out[i].tasks += w.tasks; out[i].sessions += w.sessions; });
  return out;
}
// earlier sessions on a task that say something, oldest first: the last three
// the task and the larger tasks it was split from
const taskLineage = (t) => [t.id, ...str(t.splitFrom).split(' ').filter(Boolean)];
// the last session on a task (or the larger task it was split from), or on a bug, when it did not finish it
function lastTry(p, t, b) {
  const ids = t ? new Set(taskLineage(t)) : new Set();
  const s = p.sessions.filter((x) => (b ? x.bid === b.id : ids.has(x.tid))).at(-1);
  return s && s.outcome !== 'done' ? s : null;
}
function taskHistory(p, t) {
  if (!t?.id) return [];
  const ids = new Set(taskLineage(t));
  return p.sessions.filter((s) => ids.has(s.tid) && (s.summary.trim() || s.wrong.trim() || s.outcome !== 'done')).slice(-3);
}
// what other work found, for a prompt: the last two sessions on other tasks or bugs that say something, and the rules
// from lessons that are not in CLAUDE.md yet. A fresh Claude Code session knows none of it otherwise.
function learnedLines(p, own) {
  const clip = (x, n) => { const v = oneLine(x); return v.length > n ? v.slice(0, n - 1).trimEnd() + '…' : v; };
  const ses = p.sessions.filter((s) => !own(s) && (reportBody(s.summary) || s.wrong.trim())).slice(-2).map((s) => {
    const outcome = (OUTCOMES.find((o) => o.k === s.outcome)?.short || 'Done').toLowerCase();
    const body = reportBody(s.summary);
    const parts = [body && sentence(clip(body, 300)), s.wrong.trim() && `What went wrong: ${sentence(clip(s.wrong, 200))}`].filter(Boolean);
    return `- ${s.date ? `${dayLabel(s.date)}, ` : ''}"${clip(s.task, 80) || 'Something else'}", ${outcome}: ${parts.join(' ')}`;
  });
  const rules = p.lessons.filter((l) => !l.promoted && l.change.trim() && !hasRule(p, l.change)).slice(0, 3).map((l) => `- ${sentence(clip(l.change, 200))}`);
  return [...(ses.length ? ['', ses.length === 1 ? 'What the last session on other work found (it may matter here):' : 'What the last sessions on other work found (they may matter here):', ...ses] : []),
    ...(rules.length ? ['', 'Rules from earlier sessions, not in CLAUDE.md yet:', ...rules] : [])];
}
// one line per earlier session, for prompts: "- Oct 13, stuck: what happened. What went wrong: ..."
function historyLine(s) {
  const clip = (x, n) => { const v = oneLine(x); return v.length > n ? v.slice(0, n - 1).trimEnd() + '…' : v; };
  const outcome = (OUTCOMES.find((o) => o.k === s.outcome)?.short || 'Done').toLowerCase();
  const body = reportBody(s.summary);
  const parts = [body && sentence(clip(body, 400)), s.outcome !== 'done' && s.wrong.trim() && `What went wrong: ${sentence(clip(s.wrong, 300))}`].filter(Boolean);
  return `- ${s.date ? `${dayLabel(s.date)}, ` : ''}${outcome}${parts.length ? `: ${parts.join(' ')}` : '.'}`;
}
// "Smaller tasks, one per line" in the Split dialog: list markers go, and a trailing (S), (M) or (L) sets the size
function parseSplitLines(text) {
  return lines(text).map((l) => {
    let t = l.replace(/^(?:[-*+]|\d+[.)])\s+/, '').replace(/^\[[ xX]\]\s+/, '');
    let size = 'M';
    const m = /\s*[([]\s*(?:size\s+)?([SML])\s*[)\]]\s*$/i.exec(t);
    if (m) { size = m[1].toUpperCase(); t = t.slice(0, m.index); }
    return { title: t.trim().slice(0, 200), size };
  }).filter((x) => x.title).slice(0, 12);
}

/* ================= generated text ================= */
const lines = (s) => str(s).split('\n').map((x) => x.trim()).filter(Boolean);
const bullets = (s) => lines(s).map((x) => '- ' + x.replace(/^[-*]\s+/, ''));
const oneLine = (s) => lines(s).join(' ');
const sentence = (s) => { const t = oneLine(s); return !t || /[.!?…]$/.test(t) ? t : t + '.'; };
// whether Commands has a way to run tests; without one, prompts say to run the app and not to add a test setup unasked
const hasTests = (p) => lines(p.commands).some((c) => /\b(test|tests|pytest|vitest|jest|spec)\b/i.test(c));
// whether Commands starts something that keeps running (a dev server, a bot, a watcher); a command-line tool does not
const hasServer = (p) => lines(p.commands).some((c) => /(?:^|[^-])\b(?:dev|serve|server|start|runserver|preview|watch|uvicorn|gunicorn)\b|\bstreamlit run\b|\bflask run\b|--watch\b/i.test(c));
const SERVER_LINE = ' Only start the dev server if you need it, and stop it afterwards.';
// the two lines every prompt that does work ends with, so Log a session can read how it went
const LOG_ASK = 'End with two lines for my log: "Outcome: done" (or "partly done", or "stuck"), then "Went wrong:" and what went wrong, or "nothing". Put nothing after them.';
// how Claude Code ticks a task in PLAN.md; CLAUDE.md says it, and the setup prompt adds it to a CLAUDE.md the owner wrote
const PLAN_LINE = '- The plan is in PLAN.md, and its top says how to use it. When a task works, tick it there: "- [ ]" becomes "- [x]", and "(S)" becomes "(S, done YYYY-MM-DD)" with today\'s date.';
// CLAUDE.md's "How to work" lines. One go-ahead rule, the same as the prompts: (S) tasks and small fixes go ahead, the rest
// waits for an OK. A check whose script a later task adds (npm test before Vitest is set up) is not a failure
function workLines(p) {
  return [PLAN_LINE,
    '- Read the files a task touches before changing them.',
    '- Tasks marked (S) and small fixes: go ahead. Anything bigger: outline the plan first and wait for a go-ahead.',
    hasTests(p)
      ? '- Keep changes small. After each step run the tests from Commands and fix failures before moving on. A check that is not set up yet (a later task adds it) is not a failure: say so and go on.'
      : p.commands.trim()
        ? '- Keep changes small. After each step run the app (Commands says how) and check it works before moving on. There are no tests yet: do not add a test setup unless asked.'
        : '- Keep changes small. After each step run the app and check it works before moving on.',
    '- Ask before adding a new dependency or changing the tech stack.'];
}
// a later session on a task or bug: a try that did not finish may have left changes behind, so it looks before carrying on
function carryOn(hist) {
  if (!hist.some((x) => x.outcome !== 'done')) return 'Carry on from there.';
  const wrong = hist.some((x) => x.outcome !== 'done' && x.wrong.trim());
  return `Before you change anything, run git status and git diff (if this folder is in git) to see whether the last try left changes behind. Tell me what you find, and ask me before reverting any of it. Then carry on from there${wrong ? ', and learn from what went wrong before' : ''}.`;
}

function buildClaudeMd(p) {
  const L = [];
  const add = (...x) => L.push(...x);
  add(`# ${p.name || 'Untitled project'}`, '');
  if (p.pitch.trim()) add(sentence(p.pitch), '');
  const about = [['Who it is for', p.audience], ['Problem it solves', p.problem], ['Done when', p.doneWhen]].filter(([, v]) => v.trim());
  if (about.length) { add('## About this project'); about.forEach(([k, v]) => add(`- **${k}:** ${oneLine(v)}`)); add(''); }
  if (p.repo.trim()) add('## Repository', `- ${noCreds(p.repo).trim()}`, '');
  if (p.stack.trim()) add('## Tech stack', ...bullets(p.stack), '');
  if (p.commands.trim()) { const f = fenceFor(p.commands); add('## Commands', f + 'sh', p.commands.trim(), f, ''); }
  if (p.conventions.trim()) add('## Conventions', ...bullets(p.conventions), '');
  if (p.constraints.trim()) add('## Constraints', ...bullets(p.constraints), '');
  const featLine = (f) => `- ${f.title.trim()}${f.detail.trim() ? `: ${oneLine(f.detail)}` : ''}`; // what is built changes often, so PLAN.md tracks it
  const must = p.features.filter((f) => f.priority === 'must' && f.title.trim());
  const should = p.features.filter((f) => f.priority === 'should' && f.title.trim());
  if (must.length) add(p.fromCode ? '## Core features (must have)' : '## First version (must have)', ...must.map(featLine), '');
  if (should.length) add(p.fromCode ? '## Other features (should have)' : '## After the first version (should have)', ...should.map(featLine), '');
  const eg = new Set((starterOf(p.starter).build?.(p.name || 'app')?.screens || []).map(([n, x]) => `${n}\n${x}`));
  const screens = p.screens.filter((s) => s.name.trim() && !eg.has(`${s.name.trim()}\n${s.notes.trim()}`)); // the starter's examples, unchanged, say nothing yet
  if (screens.length) {
    add('## Screens and parts');
    screens.forEach((s) => add(`- **${s.name.trim()}**${s.notes.trim() ? `: ${oneLine(s.notes)}` : ''}`));
    add('');
  }
  if (p.entities.some((e) => e.name.trim())) {
    add('## Data model', 'Use these names in code, tables and types.');
    p.entities.filter((e) => e.name.trim()).forEach((e) => {
      const fl = lines(e.fields).map(fieldShown).join(', ');
      add(`- **${e.name.trim()}**${fl ? `: ${fl}` : ''}`);
      if (e.notes.trim()) add(`  ${oneLine(e.notes)}`);
    });
    add('');
  }
  if (p.decisions.some((d) => d.text.trim())) {
    add('## Decisions');
    p.decisions.filter((d) => d.text.trim()).forEach((d) => add(`- ${d.date ? d.date + ': ' : ''}${sentence(d.text)}${d.why.trim() ? ` Why: ${sentence(d.why)}` : ''}`));
    add('');
  }
  add('## How to work in this repo', ...workLines(p));
  return L.join('\n') + '\n';
}

function taskPrompt(p, m, t) {
  const L = [];
  L.push(p.pitch.trim() ? `I'm working on ${p.name || 'my project'}: ${sentence(p.pitch)}` : `I'm working on ${p.name || 'my project'}.`);
  if (m) L.push('', `Current milestone: ${oneLine(m.title) || 'Untitled'}`, ...(m.goal.trim() ? [`Milestone goal: ${sentence(m.goal)}`] : []));
  L.push('', `Task: ${t.title.trim() || 'Untitled task'}`);
  const feat = t.feat && p.features.find((x) => x.id === t.feat);
  if (feat && feat.title.trim()) L.push(`Part of the feature: ${oneLine(feat.title)}${feat.detail.trim() && !(m && sentence(m.goal) === sentence(feat.detail)) ? `. ${sentence(feat.detail)}` : ''}`);
  if (t.notes.trim()) L.push('', 'Details:', t.notes.trim());
  const hist = t.status !== 'done' ? taskHistory(p, t) : [];
  const own = hist.filter((s) => s.tid === t.id).length;
  if (hist.length) L.push('', own === hist.length ? (hist.length === 1 ? 'An earlier session on this task:' : 'Earlier sessions on this task:')
    : own ? 'Earlier sessions on this task and the larger task it was split from:' : hist.length === 1 ? 'An earlier session on the larger task this was split from:' : 'Earlier sessions on the larger task this was split from:', ...hist.map(historyLine), carryOn(hist));
  L.push(...learnedLines(p, (s) => taskLineage(t).includes(s.tid)));
  const done = m ? m.tasks.filter((x) => x.status === 'done' && x !== t && x.title.trim()).map((x) => x.title.trim()) : [];
  if (done.length) L.push('', 'Already done in this milestone:', ...done.slice(-5).map((x) => `- ${x}`));
  if (p.constraints.trim()) L.push('', 'Constraints:', ...bullets(p.constraints));
  L.push('', 'How to work:',
    `1. Read CLAUDE.md and the files this task touches.${t.notes.trim() ? '' : ' If anything about the task is unclear, ask me before you start.'}`,
    t.size === 'S'
      ? '2. This is a small task: make the change directly, in small steps.'
      : t.size === 'L'
        ? '2. This task is large. Tell me how you would split it into steps, wait for my OK, then do only the first step and stop so I can check it.'
        : '2. Tell me your plan in a few bullets and wait for my OK before you edit anything. Then make the change in small steps.',
    hasTests(p)
      ? `3. Check your work with the test or build command under Commands in CLAUDE.md before saying it is done. If one is not set up yet (a later task adds it), say so rather than setting it up now.${hasServer(p) ? SERVER_LINE : ''}`
      : p.commands.trim()
        ? `3. Check your work by running the app (Commands in CLAUDE.md says how) before saying it is done. There are no tests yet, so do not add a test setup unless I ask.${hasServer(p) ? SERVER_LINE : ''}`
        : '3. Check your work by running the app or its tests before saying it is done.',
    planTick(t, p, m),
    `5. Finish with a short summary of what changed and anything I should test by hand. ${LOG_ASK}`);
  return L.join('\n');
}

// the task prompt's PLAN.md step: tick the task's own line, found by its id; a large task gets its steps written under it
function planTick(t, p, m) {
  const line = `its line (the one ending in "<!-- id:${t.id} -->")`;
  const tick = t.size === 'L'
    ? `write your steps as indented "- [ ]" lines under ${line} and tick each step you finish. Tick the task itself, with "(L, done YYYY-MM-DD)" and today's date, only when every step is done.`
    : `tick this task there once it works: on ${line}, change "- [ ]" to "- [x]" and make its brackets "(${t.size}, done YYYY-MM-DD)" with today's date.`;
  const first = p && m ? planLineFix(p, m, t) : '';
  return `4. If this folder has PLAN.md, ${first ? `${first}\n   Then ${tick}` : tick}`;
}
// when the folder's PLAN.md may lack the task's line (added or split here since the folder last got PLAN.md): how to put it in
function planLineFix(p, m, t) {
  const fp = p.folder?.plan;
  if (fp && t.id in fp.tasks) return '';
  const ids = new Set(allTasks(p).map((x) => x.id));
  const parent = str(t.splitFrom).split(' ').find((id) => id && !ids.has(id) && (!fp || id in fp.tasks));
  if (!fp && !parent) return ''; // nothing known about the folder and nothing split: the line is there if PLAN.md is
  const lineOf = (x) => `   - [ ] ${planTitle(x.title) || 'Untitled task'} (${x.size}) <!-- id:${x.id} -->`;
  if (parent) {
    const parts = m.tasks.filter((x) => str(x.splitFrom).split(' ').includes(parent) && x.status !== 'done');
    return `it may still have the larger task this one was split from, on the line ending in "<!-- id:${parent} -->". If so, replace that line with these lines, keeping any lines indented under it:\n${(parts.length ? parts : [t]).map(lineOf).join('\n')}`;
  }
  const after = m.tasks.slice(m.tasks.indexOf(t) + 1).find((x) => x.id in fp.tasks);
  return `first make sure it has a line ending in "<!-- id:${t.id} -->". If not, add this line ${after ? `just above the line ending in "<!-- id:${after.id} -->"` : `at the end of the "## Milestone ${msIndex(p, m)}: ${oneLine(m.title) || 'Untitled'}" section`}:\n${lineOf(t)}`;
}
// the latest sessions on a bug that is still open, so its fix prompt carries on from them
const bugHistory = (p, b) => (b.status === 'open' ? p.sessions.filter((s) => s.bid === b.id).slice(-3) : []);
const bugNote = (p, b) => (bugHistory(p, b).length ? 'It includes what your earlier sessions on this bug got done and what went wrong, so Claude Code can carry on from there.' : '');
function bugPrompt(p, b) {
  const L = [];
  L.push(p.pitch.trim() ? `I'm working on ${p.name || 'my project'}: ${sentence(p.pitch)}` : `I'm working on ${p.name || 'my project'}.`);
  L.push('', `Bug to fix: ${oneLine(b.title) || 'Untitled bug'}${b.severity === 'blocker' ? ' (a blocker: nothing else matters until it is fixed)' : ''}`);
  if (b.actual.trim()) L.push('', 'What happens:', b.actual.trim());
  if (b.expected.trim()) L.push('', 'What should happen:', b.expected.trim());
  if (b.steps.trim()) L.push('', 'Steps to see it:', b.steps.trim());
  if (b.error.trim()) { const f = fenceFor(b.error); L.push('', 'Error message:', f, b.error.trim(), f); }
  const hist = bugHistory(p, b);
  if (hist.length) L.push('', hist.length === 1 ? 'An earlier session on this bug:' : 'Earlier sessions on this bug:', ...hist.map(historyLine), carryOn(hist));
  L.push(...learnedLines(p, (s) => s.bid === b.id));
  if (p.constraints.trim()) L.push('', 'Constraints:', ...bullets(p.constraints));
  const tests = hasTests(p);
  L.push('', 'How to work:',
    '1. Read CLAUDE.md, then find the code involved. Reproduce the bug if you can: with a failing test, a script or a browser tool. If you cannot, say so and work from the code.',
    '2. Find the cause before you change anything, and tell me in a sentence or two what it is.',
    tests ? '3. Add a test that fails because of this bug, next to the existing tests.' : '3. This project has no tests yet, so do not add a test setup unless I ask.',
    '4. Fix the cause with the smallest change that works. Do not refactor or restyle unrelated code.',
    `5. ${tests ? 'Run the tests from Commands in CLAUDE.md, then check' : 'Run the app and check'} ${b.steps.trim() ? 'that the steps above no longer show the bug' : b.actual.trim() ? 'that what happens above no longer happens' : 'that the bug is gone'}. If PLAN.md lists it under "Bugs to fix", change its "- [ ]" to "- [x]".`,
    `6. Finish with a short summary: the cause, the fix, and how I can check it myself. ${LOG_ASK}`);
  return L.join('\n');
}
// export text keeps one line per line; a list marker at the start of a line is escaped so it stays text
const escLine = (l) => l.replace(/^(\s*)([-*+#>|]|```|~~~)/, '$1\\$2').replace(/^(\s*\d+)([.)])(\s)/, '$1\\$2$3');
// free text under a list item: each line keeps its indentation (an error log, a snippet); blank lines go
const klines = (s) => { const ls = str(s).split('\n').map((x) => x.trimEnd()).filter((x) => x.trim()); if (ls.length) ls[0] = ls[0].trim(); return ls; };
const FEAT_SUFFIX = / \((in progress|to do|done)\)$/; // the status after a feature's title in an export
const escHash = (t) => t.replace(/(\s)(#+)$/, '$1\\$2'); // "Fix #" would lose its # as a heading
function projectMarkdown(p) {
  const L = [];
  const add = (...x) => L.push(...x);
  const more = (ls, pad) => ls.slice(1).map((l) => pad + escLine(l));
  const stage = STAGES.find((s) => s.k === p.stage)?.label || 'Idea';
  add(`# ${escHash(p.name || 'Untitled project')}`, '', `Stage: ${stage}`, EXPORT_MARK, '');
  if (p.pitch.trim()) add(...lines(p.pitch).map(escLine), '');
  const text = [['Who it is for', p.audience], ['Problem it solves', p.problem], ['Done when', p.doneWhen], ['Aim to ship by', p.targetDate], ['Repository', noCreds(p.repo)]].filter(([, v]) => v.trim());
  if (text.length || p.stack.trim() || p.commands.trim() || p.conventions.trim() || p.constraints.trim()) {
    add('## Brief', '');
    text.forEach(([k, v]) => { const ls = lines(v); add(`**${k}:** ${ls[0]}`, ...more(ls, ''), ''); });
    if (p.stack.trim()) add('**Tech stack**', '', ...bullets(p.stack), '');
    if (p.commands.trim()) { const f = fenceFor(p.commands); add('**How to run and test**', '', f + 'sh', p.commands.trim(), f, ''); }
    if (p.conventions.trim()) add('**Conventions**', '', ...bullets(p.conventions), '');
    if (p.constraints.trim()) add('**Constraints**', '', ...bullets(p.constraints), '');
  }
  if (p.features.length) {
    add('## Features', '');
    PRIORITIES.forEach((pr) => {
      const fs = p.features.filter((f) => f.priority === pr.k);
      if (!fs.length) return;
      add(`### ${pr.label}`, '');
      fs.forEach((f) => {
        const ft = f.title.trim() || 'Untitled feature';
        add(`- [${f.status === 'done' ? 'x' : ' '}] ${ft}${f.status === 'doing' ? ' (in progress)' : FEAT_SUFFIX.test(ft) ? (f.status === 'done' ? ' (done)' : ' (to do)') : ''}`);
        const ls = klines(f.detail);
        if (ls.length) add(`  - ${ls[0]}`, ...more(ls, '    '));
      });
      add('');
    });
  }
  if (p.screens.length) {
    add('## Screens and parts', '');
    p.screens.forEach((s) => { const ls = klines(s.notes); add(`- **${s.name.trim() || 'Untitled'}**${ls.length ? `: ${ls[0]}` : ''}`, ...more(ls, '  ')); });
    add('');
  }
  if (p.entities.length) {
    add('## Data model', '');
    p.entities.forEach((e) => {
      add(`- **${e.name.trim() || 'Untitled'}**`);
      [['Fields', e.fields], ['Notes', e.notes]].forEach(([k, v]) => { const ls = klines(v); if (ls.length) add(`  - ${k}: ${escLine(ls[0])}`, ...more(ls, '    ')); });
    });
    add('');
  }
  if (p.milestones.length) {
    add('## Plan', '');
    p.milestones.forEach((m, i) => {
      add(`### Milestone ${i + 1}: ${escHash(m.title.trim() || 'Untitled')}`, '');
      if (m.goal.trim()) add(...lines(m.goal).map(escLine), '');
      m.tasks.forEach((t) => {
        add(`- [${t.status === 'done' ? 'x' : ' '}] ${t.title.trim() || 'Untitled task'} (size ${t.size}${t.status === 'doing' ? ', in progress' : ''}${t.status === 'done' && /^\d{4}-\d{2}-\d{2}$/.test(t.doneAt) ? `, done ${t.doneAt}` : ''})`);
        const ft = t.feat && p.features.find((f) => f.id === t.feat);
        if (ft && oneLine(ft.title)) add(`  - Feature: ${oneLine(ft.title)}`);
        const ls = klines(t.notes);
        if (ls.length) add(`  - Notes: ${ls[0]}`, ...more(ls, '    '));
      });
      if (m.tasks.length) add('');
    });
  }
  if (p.bugs.length) {
    add('## Bugs', '');
    p.bugs.forEach((b) => {
      add(`- [${b.status === 'fixed' ? 'x' : ' '}] ${b.title.trim() || 'Untitled bug'} (${b.severity}${b.date ? ', ' + b.date : ''})`);
      [['What happens', b.actual], ['What should happen', b.expected], ['Steps', b.steps], ['Error', b.error]].forEach(([k, v]) => { const ls = klines(v); if (ls.length) add(`  - ${k}: ${ls[0]}`, ...more(ls, '    ')); });
    });
    add('');
  }
  if (p.prompts.length) {
    // each prompt verbatim in a fenced block, so blank lines and indentation survive
    add('## Prompts', '');
    p.prompts.forEach((x) => { add(`### ${escHash(x.title.trim() || 'Untitled')}`, '', '~~~~text', ...str(x.text).replace(/\s+$/, '').split('\n').map((l) => l.replace(/^(\s*)(```|~~~)/, '$1\\$2')), '~~~~', ''); });
  }
  if (p.decisions.length) { add('## Decisions', ''); p.decisions.forEach((d) => add(`- ${d.date ? d.date + ': ' : ''}${sentence(d.text)}${d.why.trim() ? ` Why: ${sentence(d.why)}` : ''}`)); add(''); }
  if (p.lessons.length) { add('## Lessons', ''); p.lessons.forEach((l) => add(`- ${l.date ? l.date + ': ' : ''}${oneLine(l.happened)}${l.change.trim() ? ` Next time: ${oneLine(l.change)}` : ''}${l.promoted ? ' (added to CLAUDE.md)' : ''}`)); add(''); }
  if (p.sessions.length) {
    add('## Sessions', '');
    p.sessions.forEach((x) => {
      add(`- ${x.date || 'No date'} (${OUTCOMES.find((o) => o.k === x.outcome)?.short || 'Done'}): ${oneLine(x.task) || 'Untitled task'}`);
      [['Summary', x.summary], ['Went wrong', x.wrong]].forEach(([k, v]) => { const ls = klines(v); if (ls.length) add(`  - ${k}: ${ls[0]}`, ...more(ls, '    ')); });
    });
    add('');
  }
  return L.join('\n');
}
const slug = (s) => (str(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project').slice(0, 60);

/* ================= starters ================= */
// A starter fills in a sensible stack, commands, conventions and the first and last milestones,
// so a new project is ready for its first Claude Code session without any typing.
const tk = (size, title, notes = '') => ({ size, title, notes });
// git comes first, so every later task's changes can be seen with git diff; milestone 1 ends with the first commit
const GIT_FIRST = 'First run git init, unless this folder is already in git. ';
const GIT_TASK = tk('S', 'Commit the setup to git', 'Check: git status shows nothing left to commit.');
const GIT_TASK_ENV = tk('S', 'Commit the setup to git', 'Check: .env is not in the commit, and git status shows nothing left to commit.');
// uv writes no .gitignore inside a folder that is already in git
const PY_IGNORE = ' uv makes no .gitignore in a folder that is already in git, so add one with __pycache__/, .pytest_cache/, .venv/ and .env.';
// hosts deploy from a repository, and nothing before this puts the code online
const GH_TASK = tk('S', 'Put the code on GitHub', 'You: make a free GitHub account if you have none. Claude Code: create a private repository with gh repo create (or tell me how on github.com) and push the code to it, asking me before you push. Check: the repository on github.com shows the code, and no .env file.');
// starter task titles from earlier versions, still recognised as the starter's own in projects made with them
const OLD_STOCK = ['Put the project in git and make the first commit'];
const pyName = (name) => { const s = slug(name).replace(/-/g, '_'); return /^[a-z]/.test(s) ? s : 'app_' + s; };
const STARTERS = [
  { k: '', label: 'Not sure yet', hint: 'Start blank and choose the tools later' },
  {
    k: 'web', label: 'Web app', hint: 'A website people use in their browser', tech: 'Vite, React, TypeScript',
    build: () => ({
      stack: 'Vite + React + TypeScript\nPlain CSS\nVitest for tests\nBrowser storage (localStorage) until a database is needed\nNode.js 22.12 or newer (24 LTS recommended)',
      commands: 'npm install\nnpm run dev\nnpm test\nnpm run build',
      conventions: '- Use TypeScript and avoid the any type\n- One component per file in src/components\n- Keep logic that is not about the screen in src/lib, with tests next to it',
      screens: [['Home', 'What people see first and the one main thing they can do there'], ['Main screen', 'Where the real work happens']],
      first: { goal: 'The app starts on your computer and shows its first screen.', tasks: [
        tk('S', 'Create a Vite React TypeScript project in this folder', GIT_FIRST + 'Scaffold in a temporary folder so CLAUDE.md is kept: run npm create vite@latest vite-tmp -- --template react-ts --no-interactive, move everything from vite-tmp into this folder (including hidden files such as .gitignore), delete vite-tmp, set "name" in package.json, then run npm install. Never use --overwrite: it deletes CLAUDE.md. Check: npm run dev shows the starter page.'),
        tk('S', 'Add Vitest with one passing test', 'Install vitest as a dev dependency, add the test script "vitest run" to package.json (so npm test finishes; use npx vitest while you work) and write one small test. Check: npm test passes.'),
        tk('M', "Replace the starter page with the app's real layout", 'A header, the main area and placeholder content for the main screen. Check: it looks right at laptop and phone widths.'),
        GIT_TASK] },
      last: { title: 'Ready to share', goal: 'Someone else can open it from a link and use it.', tasks: [
        tk('M', 'Handle empty, loading and error states', 'Every screen says something helpful when there is no data yet or something fails.'),
        tk('M', 'Check it on a phone and fix layout problems', "Use the browser's device toolbar. Check: nothing is cut off or needs sideways scrolling."),
        GH_TASK,
        tk('M', 'Deploy it to a free host such as Netlify or Vercel', "Ask Claude to walk you through your host's steps. Check: the live link works in a private window."),
        tk('S', 'Write a README: what it is, how to run it and the live link')] },
    }),
  },
  {
    k: 'mobile', label: 'Mobile app', hint: 'An app for iPhone and Android phones', tech: 'Expo, React Native',
    build: () => ({
      stack: 'Expo (React Native) with TypeScript\nExpo Router for screens\nJest with jest-expo for tests',
      commands: 'npm install\nnpx expo start\nnpm test',
      conventions: '- Use TypeScript and function components\n- One screen per file in src/app, the folder Expo Router reads in current templates\n- Keep logic that is not about the screen in src/lib, with tests\n- Try every change on a real phone with Expo Go before calling it done',
      screens: [['Home', 'What people see when they open the app'], ['Main screen', 'Where the real work happens'], ['Settings', 'Preferences and account, if needed']],
      first: { goal: 'The app opens on your phone and shows its first screen.', tasks: [
        tk('S', 'Create an Expo app in this folder', GIT_FIRST + 'Create it in a temporary folder so CLAUDE.md is kept: run npx create-expo-app@latest expo-tmp --yes --no-agents-md, move everything from expo-tmp into this folder (including hidden files such as .gitignore, but not a .git folder, and never replacing CLAUDE.md or anything in .claude), delete expo-tmp, then set the app name in app.json and package.json. Do not start the dev server: tell me to run npx expo start in a second terminal myself and scan its QR code with Expo Go. On an iPhone, Expo Go only opens it when I am logged in to the same free Expo account on both (npx expo login on the computer); if the phone is not on the same Wi-Fi, use npx expo start --tunnel. Check: the starter app opens on my phone.'),
        tk('M', "Replace the starter screens with the app's real layout", 'Check: every screen opens from the navigation on your phone.'),
        tk('M', 'Set up Jest with jest-expo and one passing test', 'Follow Expo\'s unit testing guide, but set the test script to "jest" (not "jest --watchAll") so npm test finishes; use npx jest --watch while you work. Check: npm test passes and exits.'),
        GIT_TASK] },
      last: { title: 'Ready to share', goal: 'Someone else can install it and use it.', tasks: [
        tk('M', 'Handle empty, loading and error states'),
        tk('M', 'Add an app icon and a splash screen'),
        tk('M', 'Build a preview with EAS and install it on your phone', 'Ask Claude for the eas build steps. On Android you can install the build directly. On an iPhone this needs a paid Apple Developer account, and each iPhone has to be added with eas device:create before the build. Check: the installed app opens without Expo Go.'),
        tk('M', 'Let testers install it with TestFlight or Google Play internal testing', 'Ask Claude for the eas submit steps for the store you use. Check: a tester installs it from their invite.'),
        tk('S', 'Write a README with how to run it')] },
    }),
  },
  {
    k: 'ai', label: 'AI app (Claude API)', hint: 'An app that asks Claude for answers', tech: 'Python, Streamlit',
    build: () => ({
      stack: 'Python 3.12 or newer\nuv to manage Python and packages\nAnthropic Python SDK\nStreamlit for the interface\npytest for tests',
      commands: 'uv sync\nuv run streamlit run app.py\nuv run pytest',
      constraints: '- The API key lives only in .env (ANTHROPIC_API_KEY), and .env is listed in .gitignore\n- Watch the cost: set max_tokens on every call and log token usage',
      conventions: "- Keep every call to Claude in one module, llm.py\n- Keep the model name in one setting: start with claude-sonnet-5-5 (claude-haiku-5-5 costs less), and check Anthropic's models page before changing it, since old models are retired\n- Set tone and style in the prompt, not with temperature or top_p\n- Keep prompts in constants or their own files, not scattered through the code\n- Tests mock the API instead of calling it",
      screens: [['Main screen', "Where you type or upload something and see Claude's answer"], ['Settings', 'Model, tone or other options, if needed']],
      first: { goal: 'You can ask a question in the app and see Claude answer.', tasks: [
        tk('S', 'Set up a uv project with anthropic, streamlit and python-dotenv', GIT_FIRST + 'Then run uv init --no-package --python 3.12 and rename the main.py it makes to app.py. Then uv add anthropic streamlit python-dotenv and uv add --dev pytest, and add [tool.pytest.ini_options] pythonpath = ["."] to pyproject.toml so tests can import llm.py. Add .streamlit/config.toml with [server] headless = true, so streamlit run starts without asking for an email (it prints the address to open).' + PY_IGNORE + ' Make .env.example with ANTHROPIC_API_KEY= in it, then tell me to copy it to .env and paste my key there myself. Tell me where the key comes from: a Claude Console account at platform.claude.com, billed apart from any Claude plan, with a little credit added and a spend limit set.'),
        tk('M', 'Make one call to Claude and show the answer in Streamlit', 'Check: uv run streamlit run app.py, open the address it prints, type a question and the answer appears.'),
        tk('S', 'Write a test for llm.py with the API mocked', 'Check: uv run pytest passes without an internet connection.'),
        GIT_TASK_ENV] },
      last: { title: 'Ready to share', goal: 'Someone else can use it without seeing your API key.', tasks: [
        tk('M', 'Show a friendly message when the API fails or is rate limited'),
        tk('M', 'Stream the answer as Claude writes it'),
        GH_TASK,
        tk('M', 'Deploy it, for example to Streamlit Community Cloud, with the key stored as a secret', 'Check: the live app works and the key is not in the repository.'),
        tk('S', 'Write a README with setup steps')] },
    }),
  },
  {
    k: 'game', label: 'Browser game', hint: 'A game that runs in the browser', tech: 'JavaScript, Canvas',
    build: () => ({
      stack: 'HTML canvas with plain JavaScript\nVite for the dev server\nVitest for game logic tests\nNode.js 22.12 or newer (24 LTS recommended)',
      commands: 'npm install\nnpm run dev\nnpm test\nnpm run build',
      conventions: '- One game loop: update the state, then draw it\n- Use requestAnimationFrame and the time since the last frame\n- Keep tunable numbers (speeds, sizes, colors) in config.js\n- Game rules are plain functions with tests; drawing code stays separate',
      screens: [['Title screen', 'Name of the game and how to start'], ['Play screen', 'The game itself, with score and lives'], ['Game over', 'Final score and restart']],
      first: { goal: 'Something moves on screen and responds to the keyboard.', tasks: [
        tk('S', 'Create a Vite project with a full-window canvas', GIT_FIRST + 'Scaffold in a temporary folder so CLAUDE.md is kept: run npm create vite@latest vite-tmp -- --template vanilla --no-interactive, move everything from vite-tmp into this folder (including hidden files such as .gitignore), delete vite-tmp, set "name" in package.json, run npm install, then replace the starter page with a full-window canvas. Never use --overwrite: it deletes CLAUDE.md. Check: npm run dev shows an empty canvas.'),
        tk('M', 'Add the game loop and a player you can move with the arrow keys', 'Check: the player moves smoothly and stops at the edges.'),
        tk('S', 'Add Vitest and test one game rule', 'Install vitest as a dev dependency and add the test script "vitest run" to package.json, so npm test finishes. Check: npm test passes.'),
        GIT_TASK] },
      last: { title: 'Ready to share', goal: 'Anyone can play it from a link.', tasks: [
        tk('M', 'Add a title screen and a game over screen with restart'),
        tk('M', 'Add sound effects with a mute button'),
        tk('M', 'Make it playable with touch on a phone'),
        tk('M', 'Publish it on itch.io or GitHub Pages', "Add a vite.config.js with base: './' so the built game works from any folder, then npm run build. For itch.io, zip what is inside dist (index.html at the top of the zip) and upload it as an HTML game. For GitHub Pages, put the code on GitHub and use the GitHub Actions workflow in Vite's deploy guide. Check: the live link works in a private window.")] },
    }),
  },
  {
    k: 'extension', label: 'Browser extension', hint: 'Adds something to Chrome', tech: 'Chrome, Manifest V3',
    build: () => ({
      stack: 'Chrome extension, Manifest V3\nPlain JavaScript, HTML and CSS\nNo build step to start\nnode:test for logic tests (Node.js 22.12 or newer)',
      commands: "# Load it: open chrome://extensions, turn on Developer mode, click Load unpacked and pick this folder\n# After a change: click the reload icon on the extension's card, then refresh pages that use content.js\n# Debug the popup: right-click it and choose Inspect\n# Debug content.js: open DevTools on the web page itself\n# Debug service-worker.js: click its link on the extension's card\nnode --test",
      conventions: '- Manifest V3 only\n- Ask for as few permissions as possible and explain each one in the README\n- Background logic in service-worker.js, page logic in content.js, popup in popup.html\n- Logic that does not need Chrome goes in lib/ as plain functions, with tests that node --test runs\n- No remote code: everything ships inside the extension',
      screens: [['Popup', 'What opens when you click the toolbar icon'], ['Page changes', 'What the extension adds to or changes on web pages'], ['Options', 'Settings page, if needed']],
      first: { goal: 'The extension loads in Chrome and its popup opens.', tasks: [
        tk('S', 'Create manifest.json and a popup that says hello', GIT_FIRST + 'Then write a Manifest V3 file with a name, version and action.default_popup. Check: Load unpacked works and the popup opens.'),
        tk('M', 'Add a content script for the sites it works on', 'Limit matches to the sites it needs. Check: a message logged from content.js shows in that page\'s console.'),
        tk('S', 'Add one test with node:test', 'Put one plain function the extension uses in lib/ and test it in a file ending in .test.mjs. Check: node --test passes.'),
        GIT_TASK] },
      last: { title: 'Ready to share', goal: 'Someone else can install it and trust it.', tasks: [
        tk('M', 'Add icons at 16, 48 and 128 pixels'),
        tk('S', 'Write a short privacy note: what it reads and where data goes'),
        tk('M', 'Zip it for the store and test a fresh install', 'Unzip the zip into a new folder and use Load unpacked on it in a new Chrome profile, so you test exactly what you upload. Check: it works and its card shows no errors.'),
        tk('S', 'Prepare the Chrome Web Store listing text and screenshots'),
        tk('M', 'Publish it on the Chrome Web Store', 'Register as a Chrome Web Store developer (there is a one-time fee), upload the zip, fill in the Privacy tab (its single purpose, each permission and what data it uses) and submit it for review. Check: the item shows as submitted; review can take a few days.')] },
    }),
  },
  {
    k: 'cli', label: 'Command-line tool', hint: 'A tool you run by typing in the terminal', tech: 'Python, Typer',
    build: (name) => {
      const pkg = pyName(name);
      return {
        stack: 'Python 3.12 or newer\nuv to manage Python and packages\nTyper for the command line\npytest for tests',
        commands: `uv sync\nuv run python -m ${pkg} --help\nuv run pytest`,
        conventions: '- Use type hints everywhere\n- Keep argument parsing in cli.py and the real work in plain functions that have tests\n- Show a clear message, not a stack trace, when the input is wrong',
        screens: [['Commands', 'Each command, its arguments and an example'], ['Output', 'What it prints, and the exit code on success and failure']],
        first: { goal: 'The command runs and prints its help.', tasks: [
          tk('S', `Set up a uv project with a ${pkg} package`, `Run uv init --package --python 3.12 --name ${pkg.replace(/_/g, '-')} (it also starts git, unless this folder is already in git), then uv add typer and uv add --dev pytest. The code goes in src/${pkg}. Check: uv run pytest starts (it says no tests ran yet).`),
          tk('S', `Add the Typer command line in src/${pkg}`, `Create the Typer app in src/${pkg}/cli.py with two commands, hello and version (with only one, Typer runs it without its name, so "hello" would be an unexpected argument), and src/${pkg}/__main__.py that runs it. In pyproject.toml, point the ${pkg.replace(/_/g, '-')} entry under [project.scripts] at "${pkg}.cli:app". Check: uv run python -m ${pkg} --help and uv run ${pkg.replace(/_/g, '-')} --help both print the help.`),
          tk('S', 'Write the first test', "Use Typer's CliRunner to run the hello command. Check: uv run pytest passes."),
          tk('S', 'Commit the setup to git', 'uv init already started a git repository. Check: git status shows nothing left to commit.')] },
        old: [`Add ${pkg}/__main__.py so python -m ${pkg} starts the command line`],
        last: { title: 'Ready to share', goal: 'Someone else can install it and use it.', tasks: [
          tk('M', 'Give every command helpful --help text with an example'),
          tk('M', 'Handle bad input with clear messages and exit codes'),
          tk('M', 'Make it installable with uv tool install', 'Check: after uv tool install . the command works by name from any folder.'),
          tk('S', 'Write a README with install and usage examples')] },
      };
    },
  },
  {
    k: 'script', label: 'Script or automation', hint: 'Does a chore on your computer for you', tech: 'Python',
    build: () => ({
      stack: 'Python 3.12 or newer\nuv to manage Python and packages\npytest for tests',
      commands: 'uv sync\nuv run python main.py --dry-run\nuv run pytest',
      conventions: '- Anything that changes files or sends messages supports --dry-run first\n- Safe to run twice: no duplicate work or data\n- Print what it did in plain words at the end\n- Keep settings in a config file or environment variables, not in the code',
      screens: [['Input', 'Where the data comes from'], ['Output', 'What it changes or produces'], ['Settings', 'What you can configure']],
      first: { goal: 'The script reads its input and shows what it would do.', tasks: [
        tk('S', 'Set up a uv project with main.py and pytest', GIT_FIRST + 'Then run uv init --no-package --python 3.12, then uv add --dev pytest and add [tool.pytest.ini_options] pythonpath = ["."] to pyproject.toml so tests can import main.py.' + PY_IGNORE + ' Check: uv run python main.py prints a hello message.'),
        tk('M', 'Read the input and print what the script would do (dry run)', 'Check: uv run python main.py --dry-run lists the planned changes and changes nothing.'),
        tk('S', 'Write a test for the core logic with sample data', 'Check: uv run pytest passes.'),
        GIT_TASK] },
      last: { title: 'Ready to rely on', goal: 'It runs on its own and you can trust the results.', tasks: [
        tk('M', 'Make it safe to run twice'),
        tk('M', 'Log each run to a file with the date and a summary'),
        tk('M', 'Schedule it with cron, Task Scheduler or a GitHub Action'),
        tk('S', 'Write a README with setup and how to run it')] },
    }),
  },
  {
    k: 'api', label: 'API or backend', hint: 'A server that other apps talk to', tech: 'Python, FastAPI',
    build: () => ({
      stack: 'Python 3.12 or newer\nuv to manage Python and packages\nFastAPI\nSQLite to start\npytest with FastAPI\'s TestClient',
      commands: 'uv sync\nuv run fastapi dev app/main.py\nuv run pytest',
      conventions: '- Every endpoint has a test\n- Validate input with Pydantic models\n- Keep database code in one module\n- Read secrets from environment variables, never from the code',
      screens: [['Endpoints', 'Each route, what it takes and what it returns'], ['Data', 'The tables or records and their fields']],
      first: { goal: 'The API starts and answers a health check.', tasks: [
        tk('S', 'Set up a uv project with FastAPI', GIT_FIRST + 'Then run uv init --no-package --python 3.12 and delete the main.py it makes. Then uv add "fastapi[standard]" and uv add --dev pytest, and add [tool.pytest.ini_options] pythonpath = ["."] to pyproject.toml so tests can import app.' + PY_IGNORE + ' Check: uv run pytest starts (it says no tests ran yet).'),
        tk('S', 'Add app/main.py with a GET /health endpoint', 'Check: run uv run fastapi dev app/main.py, open http://127.0.0.1:8000/docs and try it.'),
        tk('S', 'Write a test for /health with TestClient', 'Check: uv run pytest passes.'),
        GIT_TASK] },
      last: { title: 'Ready to share', goal: 'Others can call it safely.', tasks: [
        tk('M', 'Return clear error messages for bad requests'),
        tk('S', 'Read secrets and settings from environment variables'),
        GH_TASK,
        tk('M', 'Deploy it to a host such as Render or Fly.io', "Ask Claude for the steps. A free host's disk is wiped on every deploy, so SQLite needs a persistent disk or volume there, or move to the host's Postgres first. Check: /health answers on the live URL, and a record you add is still there after a redeploy."),
        tk('S', 'Write a README with how to run it and example requests')] },
    }),
  },
  {
    k: 'bot', label: 'Discord bot', hint: 'A helper that answers in your Discord server', tech: 'Node.js, discord.js',
    build: () => ({
      stack: 'Node.js 22 or newer (24 LTS recommended)\ndiscord.js\ndotenv for the bot token\nnode:test for tests',
      commands: 'npm install\nnode --watch src/index.js\nnode --test',
      constraints: '- The bot token lives only in .env, and .env is listed in .gitignore',
      conventions: '- One file per slash command in src/commands\n- Keep logic that is not about Discord in plain functions with tests\n- Reply within 3 seconds or defer the reply\n- Log errors instead of crashing',
      screens: [['Commands', 'Each slash command and what it replies'], ['Events', 'What the bot reacts to without a command']],
      first: { goal: 'The bot is online in a test server and answers /ping.', tasks: [
        tk('S', 'Set up a Node project with discord.js and dotenv', GIT_FIRST + 'Then run npm init -y, then npm install discord.js dotenv. Make .env.example with DISCORD_TOKEN=, CLIENT_ID= and GUILD_ID= in it, and a .gitignore with node_modules/ and .env.'),
        tk('M', 'Create the bot in the Discord developer portal and invite it to a test server', "Ask Claude for the exact steps. Then copy .env.example to .env and paste in the bot's token, its application ID (CLIENT_ID) and your test server's ID (GUILD_ID, from Copy Server ID with Developer Mode on) yourself. Check: the bot appears in the server's member list."),
        tk('M', 'Add a /ping command that replies pong', 'Register the command for the test server only (GUILD_ID), where changes show at once, then handle it. Check: /ping works in the test server.'),
        GIT_TASK_ENV] },
      last: { title: 'Ready to share', goal: 'The bot stays online and other servers can add it.', tasks: [
        tk('M', 'Add a /help command that lists every command'),
        tk('M', 'Handle errors so one failed command does not crash the bot'),
        tk('M', 'Register the commands for every server and make the invite link', 'Register them globally (applicationCommands with CLIENT_ID) instead of for the test server, and build the invite link with the bot and applications.commands scopes. Check: the bot joins a second server from the link and /help works there.'),
        GH_TASK,
        tk('M', 'Host it so it stays online, for example on Railway or a small server'),
        tk('S', 'Write a README with setup steps and the invite link')] },
    }),
  },
];
const starterOf = (k) => STARTERS.find((s) => s.k === k) || STARTERS[0];
// accounts a starting point needs besides Claude Code, shown under Start Claude Code
const GH_ACCOUNT = { name: 'GitHub', url: 'https://github.com/signup', what: 'free; it keeps your code online, and the sites that put the app online take it from there' };
const STARTER_ACCOUNTS = {
  web: [GH_ACCOUNT],
  mobile: [{ name: 'Expo', url: 'https://expo.dev/signup', what: 'free; log in to the Expo Go app on your phone with the same account' }],
  ai: [{ name: 'Claude Console', url: 'https://platform.claude.com/', what: 'for the API key, billed apart from your Claude plan; add a little credit and set a spend limit' }, GH_ACCOUNT],
  game: [GH_ACCOUNT],
  extension: [{ name: 'Chrome Web Store developer', url: 'https://chrome.google.com/webstore/devconsole', what: 'only to publish; a one-time fee' }],
  api: [GH_ACCOUNT],
  bot: [{ name: 'Discord', url: 'https://discord.com/developers/applications', what: 'for the developer portal, and a server of your own to test in' }, GH_ACCOUNT],
};
const starterAccounts = (p) => STARTER_ACCOUNTS[p?.starter] || [];
// fills an empty project from a starter; returns the id of its closing milestone, so Claude's milestones can go before it
function applyStarter(p, k) {
  const st = starterOf(k);
  if (!st.build) return null;
  const b = st.build(p.name);
  p.starter = st.k;
  for (const f of ['stack', 'commands', 'conventions', 'constraints']) if (b[f] && !p[f].trim()) p[f] = b[f];
  const seen = newIds(p);
  if (!p.screens.length) p.screens = b.screens.map(([name, notes]) => mkScreen({ name, notes }, seen));
  if (p.milestones.length) return null;
  const first = mkMilestone({ title: 'Bare-bones version running', ...b.first }, seen);
  const last = mkMilestone(b.last, seen);
  p.milestones = [first, last];
  return last.id;
}
// the tasks a starter adds itself: they set the project up and ship it, but build none of its features
function stockTitles(p) {
  const st = starterOf(p.starter);
  if (!st.build) return new Set();
  const b = st.build(p.name);
  return new Set([...[...b.first.tasks, ...b.last.tasks].map((t) => t.title), ...OLD_STOCK, ...(b.old || [])]);
}
const ownTasks = (p) => { const stock = stockTitles(p); return allTasks(p).filter((t) => t.title.trim() && !stock.has(t.title)); };
// must-haves still to build that no task builds yet. A plan whose tasks are linked to no feature at all
// (written on the Plan tab, or drafted before tasks were linked) is taken at its word
function unplannedMust(p) {
  const own = ownTasks(p);
  if (own.length && !own.some((t) => t.feat)) return [];
  return p.features.filter((f) => f.priority === 'must' && f.title.trim() && f.status !== 'done' && !own.some((t) => t.feat === f.id));
}
// the starting point an idea most likely needs, from its words; '' when nothing fits
const STARTER_WORDS = [
  ['extension', /\b(chrome|browser|firefox|edge)\s+(extension|add-?on|plug-?in)s?\b/i],
  ['bot', /\bdiscord\b/i],
  ['mobile', /\b(mobile|iphone|android|ios)\b|\bphone app\b|\bapp for (my|the|your) phone\b/i],
  ['game', /\bgames?\b/i],
  ['ai', /\b(chat ?bots?|llm|claude api|gpt|ai[- ](app|assistant|tool|helper|powered))\b/i],
  ['cli', /\b(command[- ]line|cli|terminal)\b/i],
  ['api', /\b(api|back ?end|rest api|graphql)\b/i],
  ['script', /\b(script|automat\w*|scrap\w*|cron)\b/i],
  ['web', /\b(web ?(app|site|page)s?|site|dashboard|in the browser)\b/i],
];
const starterGuess = (idea) => STARTER_WORDS.find(([, re]) => re.test(str(idea)))?.[0] || '';
// what a project's commands need on the computer besides Claude Code, with a command that shows each one is installed
const PREREQS = [
  { k: 'node', re: /(^|\s)(npm|npx|pnpm|yarn|node)\s/, name: 'Node.js', what: 'the version marked LTS, for long-term support', url: 'https://nodejs.org/en/download', check: 'node -v' },
  { k: 'uv', re: /(^|\s)uv\s/, name: 'uv', what: 'it installs Python too', url: 'https://docs.astral.sh/uv/getting-started/installation/', check: 'uv --version' },
  { k: 'python', re: /(^|\s)(python3?|pip3?|pytest|poetry)\s/, name: 'Python', what: '3.12 or newer', url: 'https://www.python.org/downloads/', check: 'python3 --version', win: 'python --version' },
  { k: 'rust', re: /(^|\s)cargo\s/, name: 'Rust', what: 'through rustup', url: 'https://rustup.rs', check: 'cargo --version' },
  { k: 'go', re: /(^|\s)go\s/, name: 'Go', what: '', url: 'https://go.dev/dl/', check: 'go version' },
  { k: 'git', name: 'Git', what: 'it keeps every version of your work', url: 'https://git-scm.com/downloads', check: 'git --version' },
];
function prereqs(p) {
  const text = '\n' + lines(p?.commands).filter((l) => !l.trim().startsWith('#')).join('\n') + '\n';
  const found = PREREQS.filter((x) => x.re && x.re.test(text));
  return [...found.filter((x) => x.k !== 'python' || !found.some((y) => y.k === 'uv')), PREREQS.at(-1)];
}

// a finished-looking project to explore: brief, features, a plan part done, sessions, a lesson and a bug, dated back from `now`
const EXAMPLE_NAME = 'Recipe Box';
function exampleProject(now) {
  const ago = (n) => addDays(now, -n);
  const p = blankProject(EXAMPLE_NAME, "Save recipes from any website and plan the week's meals.");
  applyStarter(p, 'web');
  const seen = newIds(p);
  Object.assign(p, {
    stage: 'building', guideHidden: true, example: true, copied: { claudemd: true, plan: true },
    audience: 'Me and my partner, cooking at home on weeknights.',
    problem: 'Our recipes are spread across bookmarks and screenshots, so we decide what to cook at six in the evening and shop twice.',
    doneWhen: 'We plan a whole week in ten minutes and shop from one list.',
    targetDate: addDays(now, 70),
    checks: { claudemd: true, git: true, tests: true, planmode: true, clear: true, lessons: true },
  });
  const f = (title, detail, priority, status) => mkFeature({ title, detail, priority, status }, seen);
  const save = f('Save a recipe from a link', 'Paste the link to a recipe page; the title, ingredients and steps are filled in.', 'must', 'done');
  const week = f('Plan the week', 'Put recipes on the days of this week. Past weeks are kept, for ideas.', 'must', 'doing');
  const shop = f('Shopping list', "One list from the week's recipes, with amounts added up.", 'must', 'todo');
  p.features = [save, week, shop, f('Tags and search', 'Tag recipes (quick, vegetarian) and find them by name or ingredient.', 'should', 'todo'), f('Share a week plan', 'Send the plan as a link someone else can open.', 'could', 'todo')];
  p.screens = [['Recipes', 'Every saved recipe as a card, newest first, with a box to paste a link'], ['Recipe', 'Ingredients on the left, steps on the right; big text for the kitchen'], ['This week', 'Seven days side by side (stacked on phones); recipes are dragged onto a day'], ['Shopping list', 'Everything to buy for the week, ticked off in the shop']]
    .map(([name, notes]) => mkScreen({ name, notes }, seen));
  p.entities = [
    mkEntity({ name: 'Recipe', fields: 'id: text\ntitle: text\nsource url: link\ningredients: list of Ingredient\nsteps: list of text\ntags: list of text\nsaved on: date' }, seen),
    mkEntity({ name: 'Ingredient', fields: 'name: text\namount: number\nunit: text', notes: 'Belongs to one recipe.' }, seen),
    mkEntity({ name: 'WeekPlan', fields: 'week start: date\ndays: recipe ids for each day', notes: 'One per week; older weeks are kept for ideas.' }, seen),
  ];
  p.decisions = [mkDecision({ date: ago(20), text: 'Keep everything in browser storage on one phone for now', why: 'We plan the week and shop with the same phone. Syncing between devices can wait until sharing is built.' }, seen)];
  // the starter's first milestone is done, plus saving from a link
  const [first, last] = p.milestones;
  first.tasks.push(mkTask({ title: 'Save a recipe from a pasted link', size: 'M', feat: save.id, notes: "Read the page's recipe data (schema.org Recipe) for the title, ingredients and steps. Check: three links from different sites each give a full recipe." }, seen));
  first.tasks.forEach((t, i) => { t.status = 'done'; t.doneAt = ago([20, 20, 19, 19, 13][i] ?? 13); });
  const t = (title, size, status, feat, notes = '', doneAt = '') => mkTask({ title, size, status, feat, notes, doneAt }, seen);
  const grid = t('Lay out the week grid', 'S', 'done', week.id, 'Seven columns, one per day, stacked on phones.', ago(6));
  const drag = t('Drag a recipe onto a day', 'M', 'doing', week.id, 'Works with a mouse and with touch. Check: the plan is still there after a reload.');
  const plan = mkMilestone({ title: 'Plan the week', goal: 'Recipes can be put on the days of this week and the plan is kept.', tasks: [] }, seen);
  plan.tasks = [grid, drag, t('Start a new week, keeping the old one', 'S', 'todo', week.id)];
  const list = mkMilestone({ title: 'Shopping list', goal: "One list for the week's shopping.", tasks: [] }, seen);
  list.tasks = [
    t("Build the shopping list from the week's recipes", 'M', 'todo', shop.id, 'Check: every ingredient of every planned recipe is on the list once per recipe.'),
    t('Add up amounts across recipes, converting units', 'L', 'todo', shop.id, '2 cups and 200 ml of milk become one line. Grams and ounces, cups and millilitres.'),
    t('Tick items off while shopping', 'S', 'todo', shop.id, 'Ticks survive a reload and clear when a new week starts.'),
  ];
  p.milestones = [first, plan, list, last];
  const lesson = 'Change only the files the task needs, and ask before rewriting code that works.';
  p.conventions = p.conventions.replace(/\s+$/, '') + '\n- ' + lesson;
  p.lessons = [
    mkLesson({ date: ago(1), happened: 'Touch drags scroll the page instead of moving the card.' }, seen),
    mkLesson({ date: ago(16), happened: 'Claude rewrote the whole parser when asked to fix one site.', change: lesson, promoted: true, rule: lesson }, seen),
  ];
  const s = (n, m, task, outcome, summary, wrong = '') => mkSession({ date: ago(n), mid: m.id, tid: task.id, task: task.title, outcome, summary, wrong }, seen);
  const linkTask = first.tasks.at(-1);
  p.sessions = [
    s(20, first, first.tasks[0], 'done', 'Scaffolded in a temporary folder and moved it in, so CLAUDE.md was kept. The starter page runs.'),
    s(16, first, linkTask, 'partly', 'Sites with recipe data work. Others only give a title.', 'Claude rewrote the whole parser when asked to fix one site.'),
    s(13, first, linkTask, 'done', 'Pages without recipe data now fall back to the largest list on the page.'),
    s(6, plan, grid, 'done', 'The grid works at laptop and phone widths.'),
    s(1, plan, drag, 'stuck', 'Dragging works with a mouse but not on a phone.', 'Touch drags scroll the page instead of moving the card.'),
  ];
  p.bugs = [
    mkBug({ date: ago(4), title: 'Recipes from some blogs have no ingredients', actual: 'Saving a link to a recipe on a personal blog gives an empty ingredient list.', expected: 'The ingredients are found, or I am asked to paste them.', steps: '1. Copy the link to a recipe on a personal blog\n2. Paste it into the box on Recipes\n3. Open the recipe', severity: 'major', status: 'open' }, seen),
    mkBug({ date: ago(9), title: 'Long recipe titles push the page sideways on phones', severity: 'minor', status: 'fixed' }, seen),
  ];
  p.prompts = [mkPrompt({ title: 'Write release notes', text: 'Read the git log since the last tag and write short release notes for the people who use the app, not for developers. Group them under New, Better and Fixed, one line each.' }, seen)];
  p.createdAt = p.updatedAt = nowISO();
  return normalize(p);
}

/* ================= import + backup ================= */
const BACKUP_APP = 'shipyard';
const backupJSON = (projects) => JSON.stringify({ app: BACKUP_APP, version: 1, exportedAt: nowISO(), projects }, null, 2) + '\n';
const EXPORT_MARK = '<!-- shipyard-export v2 -->'; // exports with this line keep line breaks and feature status
// what kind of text was pasted into Import
function detectImport(text) {
  const t = untermText(str(text).replace(/^﻿/, '')).trim();
  if (!t) return { type: 'empty' };
  if (t[0] === '{' || t[0] === '[') {
    let j;
    // only text that really opens like JSON counts as broken JSON: a README can start with a badge or a link
    try { j = JSON.parse(t); } catch { return /^(\{\s*"|\[\s*[{\]])/.test(t) ? { type: 'badjson' } : { type: 'doc' }; }
    const list = Array.isArray(j) ? j : j?.app === BACKUP_APP && Array.isArray(j.projects) ? j.projects : j?.kind === 'project' ? [j] : [];
    const ok = list.filter((x) => isPlain(x) && (x.kind === 'project' || Array.isArray(x.milestones)));
    return ok.length ? { type: 'backup', projects: ok } : { type: 'badjson' };
  }
  if (/^# \S/m.test(t) && /^Stage: (Idea|Designing|Building|Polishing|Shipped)\s*$/m.test(t)) return { type: 'shipyard' };
  return { type: 'doc', survey: isSurvey(t) };
}

// Markdown, read just well enough: sections by heading, then lists, tables, code and paragraphs inside each
const FENCE = /^\s*(```|~~~)/;
// a fence opens with three or more ` or ~, and only a run of at least as many of the same closes it: a shorter run inside is text
function fenceStep(f, l) {
  const m = /^\s*(`{3,}|~{3,})(.*)$/.exec(l);
  if (!m) return f;
  if (!f) return { ch: m[1][0], n: m[1].length };
  return m[1][0] === f.ch && m[1].length >= f.n && !m[2].trim() ? null : f;
}
// a fence longer than any run of backticks in the text, so nothing inside can close it
const fenceFor = (t) => '`'.repeat(Math.max(3, ...(str(t).match(/`+/g) || []).map((x) => x.length + 1)));
const LISTY = /^\s*(?:[-*+]|\d+[.)])\s+/;
const ATX = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const SETEXT = /^ {0,3}(={2,}|-{2,})[ \t]*$/;
function mdSections(text) {
  const src = str(text).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let cur = { level: 0, title: '', lines: [] };
  let fence = false;
  for (let i = 0; i < src.length; i++) {
    const raw = src[i];
    if (FENCE.test(raw) && fenceStep(fence, raw) !== fence) fence = fenceStep(fence, raw);
    else if (!fence) {
      const h = ATX.exec(raw);
      if (h) { out.push(cur); cur = { level: h[1].length, title: h[2].trim(), lines: [] }; continue; }
      // a line underlined with === or --- is a heading too
      const u = SETEXT.exec(src[i + 1] ?? '');
      if (u && raw.trim() && !LISTY.test(raw) && !/^\s*[>|<]|^ {4}/.test(raw) && !SETEXT.test(raw) && !(i > 0 && src[i - 1].trim())) {
        out.push(cur);
        cur = { level: u[1][0] === '=' ? 1 : 2, title: raw.trim(), lines: [] };
        i++;
        continue;
      }
    }
    cur.lines.push(raw);
  }
  out.push(cur);
  return out.filter((s) => s.title || s.lines.some((l) => l.trim()));
}
// a link whose words do not name its site says where it goes, so text from someone else cannot pass off another site
const linkHost = (label, url) => { let host = ''; try { host = new URL(url).host; } catch { return ''; } return label.toLowerCase().includes(host.replace(/^www\./, '').toLowerCase()) ? '' : ` <span class="link-host">(${esc(host)})</span>`; };
const unmd = (s) => str(s).replace(/\*\*(.+?)\*\*|__(.+?)__/g, '$1$2').replace(/`([^`]+)`/g, '$1').replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim();
const cleanTitle = (t) => unmd(t).replace(/^[\p{Extended_Pictographic}\p{S}️‍\s]+/u, '').replace(/[\s:]+$/, '');
function mdBlocks(lines) { // fenced code blocks with their language
  const out = [];
  let cur = null;
  for (const l of lines) {
    if (FENCE.test(l)) {
      if (!cur) { cur = { f: fenceStep(null, l), lang: (/^\s*(?:`{3,}|~{3,})\s*([\w+#.-]*)/.exec(l)[1] || '').toLowerCase(), lines: [] }; continue; }
      if (!fenceStep(cur.f, l)) { out.push(cur); cur = null; continue; }
    }
    if (cur) cur.lines.push(l);
  }
  if (cur) out.push(cur);
  return out;
}
function mdItems(lines) { // list items with their checkbox state; wrapped lines join their item (body keeps the line breaks)
  const out = [];
  let fence = false;
  let col = 0; // where the item's text starts: wrapped lines indented further keep the rest of their indentation
  for (const l of lines) {
    if (FENCE.test(l) && fenceStep(fence, l) !== fence) { fence = fenceStep(fence, l); continue; }
    if (fence) continue;
    const m = /^(\s*)(?:[-*+]|\d+[.)])\s+(?:\[([ xX])\](?:\s+|$))?(.*)$/.exec(l);
    if (m) { col = /^\s*(?:[-*+]|\d+[.)])\s+/.exec(l)[0].length; out.push({ depth: m[1].replace(/\t/g, '  ').length, box: m[2] != null, done: /x/i.test(m[2] || ''), parts: [m[3].trim()], keep: [m[3].trim()] }); continue; }
    if (out.length && /^\s+\S/.test(l)) { const it = out[out.length - 1]; it.parts.push(l.trim()); it.keep.push(l.slice(Math.min(/^\s*/.exec(l)[0].length, col)).trimEnd()); }
  }
  return out.map(({ parts, keep, ...x }) => ({ ...x, raw: parts.join(' '), body: parts.join('\n'), bodyKeep: keep.join('\n'), text: unmd(parts.join(' ')) })).filter((x) => x.text);
}
function mdParas(lines, raw = false) { // plain paragraphs, outside code, lists, quotes, tables and HTML
  const out = [];
  let cur = [];
  let fence = false;
  let list = false;
  const flush = () => { if (cur.length) out.push(raw ? cur.join('\n') : unmd(cur.join(' '))); cur = []; };
  for (const l of lines) {
    if (FENCE.test(l) && fenceStep(fence, l) !== fence) { fence = fenceStep(fence, l); flush(); continue; }
    if (fence) continue;
    if (LISTY.test(l)) { list = true; flush(); continue; }
    if (list && /^\s+\S/.test(l)) continue; // the wrapped end of a list item
    if (!l.trim()) { flush(); continue; }
    list = false;
    if (/^\s*[>|<]/.test(l) || /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l) || BADGES.test(l)) { flush(); continue; }
    cur.push(l.trim());
  }
  flush();
  return out.filter(Boolean);
}
const DONE_CELL = /^(done|yes|shipped|built|live|complete(d)?|finished|working|✅|✔️?|☑️?|\[x\])$/i;
const OPEN_CELL = /^(to ?do|planned|not started|later|future|idea|backlog|open|no|in progress|wip|doing|started|❌|⬜|🚧|\[ \])$/i;
function mdTableItems(lines) { // table rows as list items, "first cell: other cells"; a status column sets done
  const out = [];
  const SEP = /^\s*\|?(\s*:?-{2,}:?\s*\|)+\s*(:?-{2,}:?\s*)?$/;
  let fence = false;
  let inTable = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (FENCE.test(l) && fenceStep(fence, l) !== fence) { fence = fenceStep(fence, l); continue; }
    if (fence || !/^\s*\|.*\|\s*$/.test(l)) { inTable = false; continue; }
    if (SEP.test(l)) continue;
    const header = !inTable && SEP.test(lines[i + 1] || '');
    inTable = true;
    if (header) continue;
    const cells = l.trim().slice(1, -1).split('|').map(unmd);
    if (!cells[0]) continue;
    const st = cells.findIndex((c, j) => j > 0 && (DONE_CELL.test(c) || OPEN_CELL.test(c)));
    const rest = cells.slice(1).filter((c, j) => c && j + 1 !== st);
    out.push({ depth: 0, box: st > 0, done: st > 0 && DONE_CELL.test(cells[st]), doing: st > 0 && /progress|wip|doing|started|🚧/i.test(cells[st]), raw: cells.join(' | '), body: '', text: rest.length ? `${cells[0]}: ${rest.join('; ')}` : cells[0], table: true });
  }
  return out;
}
const inlineCode = (raw) => [...str(raw).matchAll(/`([^`\n]+)`/g)].map((m) => m[1].trim()).filter(Boolean);
const splitTitle = (t) => { const m = /^(.{2,90}?)(?::\s+|\s+[-–—]\s+)(.+)$/.exec(t); return m ? [m[1].trim(), m[2].trim()] : [t, '']; };
const firstSentence = (s) => { const t = oneLine(s); const m = /^(.{12,220}?[.!?])(\s|$)/.exec(t); return m ? m[1] : t.length <= 220 ? t : t.slice(0, 217).replace(/\s+\S*$/, '') + '…'; };
const BADGES = /^\s*(\[?!\[[^\]]*\]\([^)]*\)\]?(\([^)]*\))?\s*)+$/; // a line of images or badges
const CMD_LABEL = /^[*_]*(install|set ?up|run|start|dev|serve|test|tests|build|lint|check|format|typecheck|deploy)[*_]*\s*:[*_]*\s*`/i;
const COMMANDISH = /\s|^(npm|npx|pnpm|yarn|bun|bunx|pip|pipx|uv|uvx|poetry|python3?|py|node|deno|cargo|go|make|just|docker|docker-compose|podman|git|gh|rails|rake|bundle|ruby|mvn|gradle|dotnet|flutter|dart|expo|eas|pytest|mypy|ruff|black|flake8|pylint|tox|nox|jest|vitest|playwright|tsc|eslint|prettier|biome|swift|xcodebuild|php|composer|mix|terraform|kubectl|wrangler|vercel|netlify|firebase|supabase|prisma|uvicorn|gunicorn|streamlit|fastapi|flask|\.\/|bin\/)\b/;
const SHELL_LANG = /^(|sh|bash|shell|console|zsh|fish|powershell|pwsh|ps1?|cmd|bat|batch|terminal|shell-session|shellsession)$/;
function shellLines(block) { // the commands in a shell block; with "$ " prompts, only the prompted lines
  let ls = block.lines.map((l) => l.trim()).filter(Boolean);
  const PROMPT = /^(\$|%|>|PS [^>]*>)\s+/;
  if (ls.some((l) => PROMPT.test(l))) ls = ls.filter((l) => PROMPT.test(l)).map((l) => l.replace(PROMPT, ''));
  return ls;
}

// a pasted CLAUDE.md is kept as written; a README or notes usually are not meant to be one
const looksLikeReadme = (t) => /readme/i.test(t) || /^#{1,3}\s*(license|licence|contributing|installation)\b/im.test(t) || /^(license|licence|contributing|installation)\s*\n\s*[-=]{2,}\s*$/im.test(t) || /img\.shields\.io|badge\.fury\.io|\/badge\.svg/i.test(t);
const CLAUDE_SECTIONS = /^#{1,3}[ \t]*\W*[ \t]*(commands?|development commands|build and test|code style|conventions|architecture|rules|gotchas|important|workflow|testing)\b/gim;
const looksLikeClaudeMd = (t) => /^#{1,2}\s*(CLAUDE|AGENTS)(\.md)?\s*$/im.test(t) || /guidance to Claude|^#{1,3}\s*How to work in this repo\s*$/im.test(t)
  || (!looksLikeReadme(t) && new Set((str(t).match(CLAUDE_SECTIONS) || []).map((x) => x.replace(/^#+\W*/, '').trim().toLowerCase())).size >= 2);

// front matter (YAML or TOML) at the top of a note; its title can name the project
function splitFrontMatter(text) {
  const t = str(text).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const m = /^(---|\+\+\+)[ \t]*\n([\s\S]*?)\n\1[ \t]*(?:\n|$)/.exec(t);
  if (!m) return { body: t, title: '' };
  const tt = /^title\s*[:=]\s*["']?(.+?)["']?\s*$/m.exec(m[2]);
  return { body: t.slice(m[0].length), title: tt ? tt[1].trim() : '' };
}

// "Stack: Vite" or "**Who it is for:** cooks" on a line of its own fills in that field
const LABELS = [
  ['pitch', /^(idea|the idea|pitch|summary|tl;? ?dr|one[- ]liner|elevator pitch|description|what it is|concept)$/],
  ['audience', /^(who it is for|who it'?s for|who is it for|audience|target (users?|audience)|for whom|users)$/],
  ['problem', /^(problem( it solves)?|the problem|why|motivation|pain points?)$/],
  ['doneWhen', /^(done when|definition of done|success( criteria| looks like)?|finish line|goal)$/],
  ['stack', /^(stack|tech( stack)?|technology|built with|tools|platform)$/],
  ['repo', /^(repo(sitory)?|source( code)?|github)$/],
];
const LABEL_LINE = /^\s*(?:[-*+]\s+)?(?:\*\*|__)?([A-Za-z][A-Za-z ;'’-]{1,30}?)(?:\*\*|__)?\s*:\s*(?:\*\*|__)?\s*(\S.*)$/;
const labelOf = (l) => { const m = LABEL_LINE.exec(l); const k = m && LABELS.find(([, re]) => re.test(m[1].trim().toLowerCase()))?.[0]; return k ? [k, m[2]] : null; };
function takeLabels(lines) { // splits label lines from the rest; returns { rest, found: [[field, value]] }
  const rest = [];
  const found = [];
  let fence = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (FENCE.test(l) && fenceStep(fence, l) !== fence) fence = fenceStep(fence, l);
    const hit = !fence && labelOf(l);
    if (!hit) { rest.push(l); continue; }
    const parts = [hit[1]];
    const item = LISTY.test(l);
    while (i + 1 < lines.length) {
      const n = lines[i + 1];
      if (!n.trim() || LISTY.test(n) || FENCE.test(n) || /^\s*[|<>#]/.test(n) || labelOf(n) || (item && !/^\s+\S/.test(n))) break;
      parts.push(n.trim());
      i++;
    }
    found.push([hit[0], unmd(parts.join(' '))]);
  }
  return { rest, found };
}
function putLabel(p, k, v) {
  v = str(v).trim();
  if (!v) return;
  if (k === 'pitch') { if (!p.pitch) p.pitch = firstSentence(v[0].toUpperCase() + v.slice(1)); return; }
  if (k === 'repo') { const u = /https?:\/\/[^\s)>\]]+/.exec(v); if (!p.repo) p.repo = noCreds((u ? u[0] : v).replace(/[.,]+$/, '')); return; }
  if (k === 'stack') v = v.replace(/[.!]\s+.*$/, '').replace(/\.$/, '').split(/\s+\+\s+|,\s*|;\s*|\s+and\s+/).map((x) => x.trim()).filter(Boolean).join('\n');
  p[k] = p[k] ? p[k] + '\n' + v : v;
}

// the repository: a git clone URL, or else the GitHub, GitLab or Bitbucket project linked most often
function findRepo(text) {
  const HOST = '(?:www\\.)?(github\\.com|gitlab\\.com|bitbucket\\.org|codeberg\\.org)';
  const clone = new RegExp(`git clone\\s+(?:-\\S+\\s+)*https?://${HOST}/([\\w.-]+)/([\\w.-]+)`, 'i').exec(text);
  const counts = new Map();
  const NOT_OWNER = /^(sponsors|orgs|features|apps|marketplace|topics|settings|login|join|about|pricing|collections|trending|enterprise|users|site|contact|security|notifications|explore|search|issues|pulls|codespaces|readme|customer-stories|team|github|solutions|resources|blog|docs)$/i;
  const key = (m) => `https://${m[1].toLowerCase()}/${m[2]}/${m[3].replace(/\.git$/i, '').replace(/\.+$/, '')}`;
  if (clone) return key(clone);
  for (const m of str(text).matchAll(new RegExp(`https?://${HOST}/([\\w.-]+)/([\\w.-]+)`, 'gi'))) {
    if (NOT_OWNER.test(m[2]) || !m[3].replace(/\.git$/i, '').replace(/\.+$/, '')) continue;
    counts.set(key(m), (counts.get(key(m)) || 0) + 1);
  }
  let best = '';
  let n = 0;
  for (const [k, c] of counts) if (c > n) { best = k; n = c; }
  return best;
}

const DOC_RULES = [
  ['repo', /^(repo(sitory)?|source( code)?)$/],
  ['milestones', /\b(roadmap|to[ -]?dos?|backlog|next steps|milestones?|open work|phases?|sprints?|checklist|work left|what'?s next|up next|coming soon)\b/],
  ['bugs', /\b(known (issues|bugs|problems)|open (issues|bugs)|bug list)\b|^(bugs?|bugs to fix)$/],
  ['model', /\b(data ?models?|data structures?|domain models?|(database |db )?schemas?|entities|database tables)\b|^(database|db|models|types|tables)$/],
  ['decisions', /\b(decisions?|adrs?)\b/],
  ['constraints', /\b(constraints?|limitations?|non-?goals?|out of scope)\b/],
  ['features', /\b(features?|capabilit(y|ies)|what it does|functionality|(must|should|could|nice to) have|first version|mvp)\b/],
  ['stack', /\b(tech(nology|nologies)?( stack)?|stack|built with|dependencies|libraries|frameworks?|tools|requirements|prerequisites)\b/],
  ['conventions', /\b(conventions?|rules?|guidelines?|code style|style guide|coding style|standards|best practices|instructions|how to work|workflow|dos|don'?ts|important|gotchas|notes for claude|guidance|lessons( learned)?)\b/],
  ['commands', /\b(commands?|scripts?|getting started|set ?up|install(ation|ing)?|running|run|usage|develop(ment)?|build(ing)?|tests?|testing|quick ?start|deploy(ment|ing)?)\b/],
  ['screens', /\b(screens?|pages?|views?|user interface|ui)\b/],
  ['audience', /\b(audience|who it is for|who is it for|users?)\b/],
  ['problem', /\b(problem|motivation|background|why)\b/],
  ['doneWhen', /\b(done when|definition of done|success criteria|goals?)\b/],
];
const SKIP_TITLE = /^(how to work in this repo|table of contents|contents|toc|license|licence)$/;
// in a survey file the headings are Claude Code's own words, so near misses count too
const SURVEY_RULES = [
  ['repoHas', /^(already in (the|this) folder|already there|existing files|files already (there|here|in the folder))$/],
  ['bugs', /\b(issues?|problems?|bugs?)\b/],
  ['model', /^(data|data stored|stored data|storage|database|db|models?|data models?|what it stores)$/],
  ['features', /\b(what works|what it does|features?)\b/],
  ['milestones', /\b(next|to ?dos?|roadmap|planned|backlog)\b/],
  ['audience', /\b(who (it is|is it) for|who uses it|users?|audience)\b/],
];
const WEAK_PLAN = /\b(tasks?|plan|work items|steps|status|progress)\b/;
const HOWTO_TASKS = /\b(common|development|dev|frequent|typical|useful|everyday|routine|recurring)\s+tasks\b/;
const GENERIC_TITLE = /^(claude(\.md)?|agents(\.md)?|readme(\.md)?|project( overview| notes)?|overview|notes|untitled|introduction|about|home|index|docs|documentation)$/i;
const SECTION_TITLE = /^(to[ -]?dos?|tasks|plan|roadmap|backlog|features|stack|tech stack|commands|setup|installation|usage|conventions|rules|questions|ideas)$/i;
const JUNK = /guidance to Claude|^this file (provides|gives|contains|is)\b.*\b(claude|ai|agents?|assistants?)\b/i;
const ABOUT_TITLE = /\b(overview|about|description|introduction|intro|summary|what is|what it is|purpose|the idea|concept)\b/i;
const RULEISH = /^(always|never|don'?t|do not|must|make sure|prefer|avoid|before|after|only)\b/i;
const NAME_IS = /^([A-Za-z0-9][\w.+-]*(?: [A-Z0-9][\w.+-]*){0,3}) (?:is|are) (?:a|an|the)\b/;
const STRUCT = new Set(['milestones', 'features', 'decisions', 'screens', 'bugs', 'model', 'repoHas']);
// "- CLAUDE.md: no" or "None of them" says a file is missing
const NOT_THERE = /^(?:[-*+]\s+)?(?:no|none|not|missing|absent|neither)\b|:\s*(?:no|none|missing|absent|not)\b|\((?:no|none|missing|absent|not)\b|\b(?:does not|doesn't|do not|don't|is not|isn't) (?:exist|there)/i;
const PSEUDO_COLON = /^\s*(?:\*\*|__)?([A-Za-z][\w &/'’()-]{0,40}?)(?:\*\*|__)?\s*:\s*(?:\*\*|__)?\s*$/;
const PSEUDO_BOLD = /^\s*(\*\*|__)([^*_\n]{2,40}?)\1\s*$/;
// sections by heading, plus "TODO:" or "**Setup**" lines just above a list, table or code block; each knows its parent
function docSections(body) {
  const secs = mdSections(body);
  // notes without a title heading: a short first line is the title
  if (!secs.some((s) => s.level === 1) && secs[0]?.level === 0) {
    const ls = secs[0].lines;
    const i = ls.findIndex((l) => l.trim());
    const l = (ls[i] || '').trim();
    if (l && l.length <= 60 && !/[.,;:!?]$/.test(l) && !LISTY.test(l) && !/^[[<>|`#!*_~]/.test(l) && !labelOf(l) && ls.slice(i + 1).some((x) => x.trim())) secs[0] = { level: 1, title: l, lines: ls.slice(i + 1) };
  }
  const out = [];
  for (const s of secs) {
    let cur = { level: s.level, title: s.title, lines: [] };
    out.push(cur);
    let fence = false;
    s.lines.forEach((l, i) => {
      if (FENCE.test(l) && fenceStep(fence, l) !== fence) fence = fenceStep(fence, l);
      const m = !fence && !LISTY.test(l) && (PSEUDO_COLON.exec(l) || PSEUDO_BOLD.exec(l));
      const next = m ? s.lines.slice(i + 1).find((x) => x.trim()) || '' : '';
      if (m && (LISTY.test(next) || /^\s*\|/.test(next) || FENCE.test(next))) {
        cur = { level: Math.max(2, s.level + 1), title: (m[2] ?? m[1]).trim(), lines: [], pseudo: true };
        out.push(cur);
        return;
      }
      cur.lines.push(l);
    });
  }
  const open = [];
  for (const s of out) {
    while (open.length && open[open.length - 1].level >= s.level) open.pop();
    s.parent = s.level >= 2 ? open[open.length - 1] || null : null;
    if (s.level >= 1) open.push(s);
  }
  return out.filter((s) => s.title || s.lines.some((l) => l.trim()));
}
const priorityOf = (t) => (/\bmust\b/.test(t) ? 'must' : /\bshould\b/.test(t) ? 'should' : /\b(could|nice to have)\b/.test(t) ? 'could'
  : /\b(first version|mvp|v1|core|essential)\b/.test(t) ? 'must' : /\b(later|future|ideas?|wishlist|planned|someday|maybe|stretch)\b/.test(t) ? 'could' : '');
// "(built)", "(in progress)", a leading ✅ or ~~struck out~~ text set the status
function statusOf(x) {
  let t = x.text;
  let st = x.done ? 'done' : x.doing ? 'doing' : 'todo';
  if (/^(✅|✔️?|☑️?)\s*/.test(t)) { t = t.replace(/^(✅|✔️?|☑️?)\s*/, ''); st = 'done'; }
  if (/^~~(.+)~~$/.test(t)) { t = t.slice(2, -2); st = 'done'; }
  if (/^\[[~\/-]\]\s*/.test(t)) { t = t.replace(/^\[[~\/-]\]\s*/, ''); st = 'doing'; }
  t = t.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D]+\s*/u, ''); // "⚡ Fast" is the feature "Fast"
  if (/\s*\((built|done|shipped)\)(?=\s*(:|$))/i.test(t)) { t = t.replace(/\s*\((built|done|shipped)\)(?=\s*(:|$))/i, ''); st = 'done'; }
  else if (/\s*\((in progress|wip|started)\)(?=\s*(:|$))/i.test(t)) { t = t.replace(/\s*\((in progress|wip|started)\)(?=\s*(:|$))/i, ''); st = 'doing'; }
  return [t.trim(), st];
}

// reads a CLAUDE.md, README or similar notes into a new project
function parseDoc(text) {
  text = untermText(text);
  const survey = isSurvey(text);
  if (survey) text = surveyClean(surveyBody(text));
  else if (looksLikePlanMd(text)) return Object.assign(parsePlanFile(text), { fromCode: true, repoHas: 'plan' });
  const { body, title: fmTitle } = splitFrontMatter(text);
  const claudeShaped = !survey && looksLikeClaudeMd(body); // the survey has Commands and Conventions too, but its Known issues are bugs
  const secs = docSections(body);
  const p = blankProject('');
  p.name = '';
  const seen = new Set();
  const add = (k, v) => { v = str(v).trim(); if (v) p[k] = p[k] ? p[k] + '\n' + v : v; };
  const paras = (ls) => mdParas(ls).filter((x) => !JUNK.test(x));
  const first = secs.find((s) => s.level === 1);
  const titleSec = first && !SECTION_TITLE.test(cleanTitle(first.title)) ? first : null;
  if (titleSec && !GENERIC_TITLE.test(cleanTitle(titleSec.title))) p.name = cleanTitle(titleSec.title).slice(0, 120);
  else if (fmTitle) p.name = fmTitle.slice(0, 120);

  // the opening text: the pitch, plus lines such as "Stack: …"
  const intro = takeLabels(secs.filter((s) => s.level === 0 || s === titleSec).flatMap((s) => s.lines));
  intro.found.forEach(([k, v]) => putLabel(p, k, v));
  const introParas = paras(intro.rest);
  const aboutParas = secs.filter((s) => s.level >= 1 && s !== titleSec && ABOUT_TITLE.test(cleanTitle(s.title))).flatMap((s) => paras(takeLabels(s.lines).rest));
  // a README often puts its tagline in a quote right under the title
  const lead = intro.rest.find((l) => l.trim() && !BADGES.test(l) && !/^\s*</.test(l)) || '';
  const tagline = p.name && /^\s*>\s*\S/.test(lead) ? unmd(lead.replace(/^\s*>\s*/, '')) : '';
  const pitch = p.name ? tagline || introParas[0] || aboutParas[0] : aboutParas[0] || introParas[0];
  if (!p.pitch && pitch) p.pitch = firstSentence(pitch);
  if (!p.name) {
    for (const para of [...aboutParas, ...introParas]) {
      const m = NAME_IS.exec(para);
      if (m && !/^(the|this|it|our|my|that|these|there|here|which|what|we|i|you)\b/i.test(m[1])) { p.name = m[1]; break; }
    }
  }
  p.repo = p.repo || findRepo(body);

  const ruleOf = new Map();
  const take = (rule, s, title) => {
    const lines = s.lines;
    const items = [...mdItems(lines), ...mdTableItems(lines)];
    const base = items.length ? Math.min(...items.map((x) => x.depth)) : 0;
    const top = items.filter((x) => x.depth === base);
    switch (rule) {
      case 'commands': {
        const code = mdBlocks(lines).filter((b) => SHELL_LANG.test(b.lang)).flatMap(shellLines);
        // "Run the tests: `pytest`" takes the code as written; elsewhere only code that looks like a command
        const fromItems = items.filter((x) => !x.table).flatMap((x) => {
          const c = inlineCode(x.raw);
          const got = /^`|^[^`]{1,40}:\s*`/.test(x.raw) ? [...c.slice(0, 1), ...c.slice(1).filter((y) => COMMANDISH.test(y))] : c.filter((y) => COMMANDISH.test(y));
          const lab = CMD_LABEL.exec(x.raw);
          return lab && got.length === 1 && !got[0].includes('#') && !new RegExp(`\\b${lab[1].replace(/\s+/g, '\\s*')}`, 'i').test(got[0]) ? [`${got[0]}  # ${lab[1].toLowerCase()}`] : got;
        });
        const fromText = mdParas(lines, true).flatMap(inlineCode).filter((y) => COMMANDISH.test(y));
        const seenCmd = new Set();
        const cmds = [...code, ...fromItems, ...fromText].filter((c) => { const k = c.replace(/\s+#.*$/, ''); if (seenCmd.has(k)) return false; seenCmd.add(k); return true; });
        if (!cmds.length) return false;
        add('commands', cmds.join('\n'));
        if (claudeShaped) add('conventions', items.filter((x) => RULEISH.test(x.text)).map((x) => '- ' + x.text).join('\n'));
        return true;
      }
      case 'stack': {
        const v = top.length ? top.map((x) => x.text) : paras(lines);
        if (!v.length) return false;
        add('stack', v.join('\n'));
        return true;
      }
      case 'conventions': case 'constraints': {
        const v = items.length ? items.map((x) => x.text) : paras(lines);
        if (!v.length) return false;
        add(rule, v.map((x) => '- ' + x).join('\n'));
        return true;
      }
      case 'features': {
        const own = priorityOf(title.toLowerCase());
        const pr = own || (s.parent && ruleOf.get(s.parent) === 'features' ? priorityOf(cleanTitle(s.parent.title).toLowerCase()) : '');
        const prOf = (st) => pr || (survey && st === 'done' ? 'must' : 'should'); // in a survey, what works today has to keep working
        if (!top.length) {
          // "### Fast search" with a paragraph under "## Features" is one feature
          if (!s.parent || ruleOf.get(s.parent) !== 'features' || !title) return false;
          const [t, st] = statusOf({ text: title });
          p.features.push(mkFeature({ title: t.slice(0, 140), detail: firstSentence(paras(lines)[0] || ''), priority: prOf(st), status: st }, seen));
          return true;
        }
        top.forEach((x) => {
          const [t, st] = statusOf(x);
          const [ft, fd] = splitTitle(t);
          // the details keep their links and code, which Claude Code can use; only the title is plain text
          const kd = fd ? splitTitle(statusOf({ ...x, text: x.raw.replace(/\*\*(.+?)\*\*|__(.+?)__/g, '$1$2').replace(/\s+/g, ' ').trim() })[0])[1] : '';
          p.features.push(mkFeature({ title: ft.slice(0, 140), detail: kd && unmd(kd) === fd ? kd : fd, priority: prOf(st), status: st }, seen));
        });
        return true;
      }
      case 'milestones': {
        if (!items.length) return false;
        // a top item with sub-items and no checkbox ("Backend") is a group of its own; checkbox sub-items are tasks
        const loose = { title, tasks: [] };
        const made = [];
        let group = null;
        let groupDepth = 0;
        let task = null;
        const mk = (x) => { const [t, st] = statusOf(x); return { title: t.slice(0, 200), notes: '', size: 'M', status: st }; };
        items.forEach((x, i) => {
          const next = items[i + 1];
          if (x.depth === base) {
            if (next && next.depth > x.depth && !x.box && x.text.length <= 60 && !/[.!?]$/.test(x.text)) {
              group = { title: statusOf(x)[0], tasks: [] };
              groupDepth = next.depth;
              made.push(group);
              task = null;
              return;
            }
            group = null;
            task = mk(x);
            if (!made.includes(loose)) made.push(loose);
            loose.tasks.push(task);
            return;
          }
          if (group && x.depth <= groupDepth) { task = mk(x); group.tasks.push(task); return; }
          if (x.box && task) { task = mk(x); (group || loose).tasks.push(task); return; }
          if (task) task.notes = task.notes ? task.notes + '\n' + x.text : x.text;
        });
        const ms = made.filter((g) => g.tasks.length);
        ms.forEach((g) => p.milestones.push(mkMilestone({ title: (g.title || 'To do').slice(0, 120), tasks: g.tasks }, seen)));
        return !!ms.length;
      }
      case 'bugs': {
        if (claudeShaped) return take('conventions', s, title);
        if (!top.length) return false;
        // "Found a bug? Open an issue" is about reporting, not a list of bugs
        if (!survey && !/\bknown\b/i.test(title) && /\b(report|open|file|submit|raise|create)\b[^.\n]{0,30}\b(issues?|bugs?)\b|\/issues\b|found a bug/i.test(lines.join('\n'))) return false;
        let cur = null;
        items.forEach((x) => {
          if (x.depth === base) {
            const [t, st] = statusOf(x);
            cur = null;
            if (/^((none|n\/?a|tbd|nothing)( (yet|so far|at the moment|right now|currently|known))?|no known (issues|bugs)\b.*)[.!]?$/i.test(t)) return;
            const [bt, bd] = splitTitle(t);
            cur = mkBug({ title: bt.slice(0, 200), actual: bd, status: st === 'done' ? 'fixed' : 'open', date: '' }, seen);
            p.bugs.push(cur);
          } else if (cur) cur.actual = cur.actual ? cur.actual + '\n' + x.text : x.text;
        });
        return true;
      }
      case 'repoHas': {
        const has = new Set(p.repoHas.split(' '));
        lines.filter((l) => l.trim() && !NOT_THERE.test(l.trim())).forEach((l) => REPO_HAS.forEach(([k, re]) => { if (re.test(l)) has.add(k); }));
        p.repoHas = repoHasList([...has].join(' '));
        return true;
      }
      case 'decisions': {
        if (!top.length) return false;
        top.forEach((x) => { const m = /^(\d{4}-\d{2}-\d{2}):?\s+(.*)$/.exec(x.text); const [txt, why] = (m ? m[2] : x.text).split(/\s+(?:Why|Because|Reason):\s+/i); p.decisions.push(mkDecision({ date: m ? m[1] : '', text: txt, why: why || '' }, seen)); });
        return true;
      }
      case 'model': {
        let es = /^(database|db|models|types|tables)$/i.test(title.trim()) ? codeEntities(mdBlocks(lines)) : docEntities(s, title, items, base, lines, !!s.parent && ruleOf.get(s.parent) === 'model');
        if (!es.length && survey) es = docEntities(s, title, items, base, lines, false); // "## Database" with a list
        if (!es.length) return false;
        es.slice(0, 20).forEach((x) => p.entities.push(mkEntity({ name: x.name.slice(0, 80), fields: x.fields.filter(Boolean).slice(0, 40).join('\n'), notes: x.notes }, seen)));
        return true;
      }
      case 'screens': {
        if (!top.length) return false;
        top.forEach((x) => { const [n, d] = splitTitle(x.text); p.screens.push(mkScreen({ name: n.slice(0, 120), notes: d }, seen)); });
        return true;
      }
      case 'repo': {
        const u = findRepo(lines.join('\n')) || /https?:\/\/[^\s)>\]]+/.exec(lines.join('\n'))?.[0];
        if (!u) return false;
        p.repo = noCreds(u.replace(/[.,]+$/, ''));
        return true;
      }
      default: {
        const v = paras(lines);
        const t = v.length ? v : items.map((x) => x.text);
        if (!t.length) return false;
        add(rule, t.join('\n'));
        return true;
      }
    }
  };
  for (const s of secs) {
    if (s.level === 0 || s === titleSec) continue;
    const title = cleanTitle(s.title);
    const lower = title.toLowerCase();
    const par = s.parent && s.parent !== titleSec ? ruleOf.get(s.parent) || '' : '';
    let own = SKIP_TITLE.test(lower) ? 'skip' : (survey && SURVEY_RULES.find(([, re]) => re.test(lower))?.[0]) || DOC_RULES.find(([, re]) => re.test(lower))?.[0] || '';
    const boxes = () => mdItems(s.lines).some((x) => x.box) || mdTableItems(s.lines).some((x) => x.box);
    if (!own && WEAK_PLAN.test(lower) && !HOWTO_TASKS.test(lower) && (!claudeShaped || boxes())) own = 'milestones';
    if (!own && !HOWTO_TASKS.test(lower) && boxes()) own = 'milestones';
    const rule = s.pseudo ? par || own : STRUCT.has(par) ? par : own || (par === 'skip' ? '' : par);
    ruleOf.set(s, rule);
    if (rule === 'skip') continue;
    let sec = s;
    if (!STRUCT.has(rule)) { const lb = takeLabels(s.lines); lb.found.forEach(([k, v]) => putLabel(p, k, v)); sec = { ...s, lines: lb.rest }; }
    if (!rule || ABOUT_TITLE.test(title) && !own) continue;
    const took = take(rule, sec, title);
    // a "Testing" section in a CLAUDE.md with no commands in it holds rules
    if (!took && rule === 'commands' && claudeShaped) take('conventions', sec, title);
    else if (!took && par && par !== rule && par !== 'skip') take(par, sec, title);
  }
  // checkbox lists in the opening text are a to-do list
  const introBoxes = mdItems(intro.rest).filter((x) => x.box);
  if (introBoxes.length) take('milestones', { lines: introBoxes.map((x) => `- [${x.done ? 'x' : ' '}] ${x.raw}`), parent: null }, 'To do');

  const uniq = (s) => [...new Set(lines(s))].join('\n');
  for (const k of ['stack', 'commands', 'conventions', 'constraints']) p[k] = uniq(p[k]);
  const anyDone = p.features.some((f) => f.status === 'done') || allTasks(p).some((t) => t.status !== 'todo');
  p.stage = p.commands.trim() || anyDone ? 'building' : p.features.length || p.milestones.length ? 'designing' : 'idea';
  if (survey) { linkSurvey(p, seen); p.fromCode = true; }
  return p;
}
// how far an unfinished feature has got ("the endpoints exist, there is no page yet") says what is true today, not what the
// feature is: it goes on the task that finishes the feature, so CLAUDE.md does not keep saying it once it is built
const WIP_RE = /\b(?:(?:the|its|their) [\w -]{1,40}? (?:exists?|(?:is|are) (?:there|in place|done|built|working|written))|there (?:is|are) no|(?:is|are)n't (?:built|done|finished|wired|there|working)|not (?:yet|built|done|finished|wired|hooked up|implemented|working)|no [\w -]{1,30}? yet|(?:is|are) missing|half[- ](?:done|built|finished)|partly|partially|(?:is|was) started|in progress|stubbed|work in progress|wip|so far|for now)\b/i;
const LINK_STOP = new Set(['the', 'and', 'for', 'with', 'add', 'make', 'build', 'from', 'into', 'that', 'this', 'new', 'its', 'their', 'can', 'let', 'lets', 'use', 'via', 'get', 'set', 'all', 'more', 'some', 'when', 'what', 'how', 'who', 'our', 'your', 'finish', 'feature']);
const linkWords = (s) => [...new Set((str(s).toLowerCase().match(/[a-z0-9]{3,}/g) || []).map((w) => w.replace(/ies$/, 'y').replace(/([a-z]{3})s$/, '$1')).filter((w) => !LINK_STOP.has(w)))];
// the feature a task builds: the one most of whose name is in the task's title. None when two fit as well
function featureFor(p, title) {
  const T = new Set(linkWords(title));
  let best = null;
  let tie = false;
  for (const f of p.features) {
    const F = linkWords(f.title);
    const n = F.filter((w) => T.has(w)).length;
    if (!n || n / F.length < 0.6) continue;
    const s = n / F.length;
    if (!best || s > best.s || (s === best.s && n > best.n)) { best = { f, s, n }; tie = false; } else if (s === best.s && n === best.n) tie = true;
  }
  return best && !tie ? best.f : null;
}
// a next step that is the fix for a known issue ("Fix the crash on an empty file" for "Crash on an empty file"): the bug
// already stands for that work, so the task would only put it in the plan twice
const FIX_HEAD = /^(?:fix|handle|stop|resolve|repair|address)\b\s*(?:the\s+|a\s+|an\s+)?/i;
const fixOfBug = (p, t) => t.status !== 'done' && p.bugs.some((b) => b.status === 'open' && similar(t.title.replace(FIX_HEAD, ''), b.title) >= 0.6);
function linkSurvey(p, seen) {
  const emptied = new Set();
  p.milestones.forEach((m) => { const n = m.tasks.length; m.tasks = m.tasks.filter((t) => !fixOfBug(p, t)); if (n && !m.tasks.length) emptied.add(m); });
  p.milestones = p.milestones.filter((m) => !emptied.has(m));
  allTasks(p).forEach((t) => { if (!t.feat) t.feat = featureFor(p, t.title)?.id || ''; });
  for (const f of p.features) {
    if (f.status === 'done' || !f.detail.trim()) continue;
    // its clauses, each with the separator before it, so the ones kept read as they were written
    const bits = f.detail.replace(/([.;])(?=\s)/g, '$1\u0001').split(/(\u0001\s+|,\s+(?=(?:but|though|although|while|there|it|they|the|no|not|only)\b)|\s+(?=(?:but|though|although)\s))/i).map((x) => x.replace(/\u0001/g, ''));
    const parts = [];
    for (let i = 0; i < bits.length; i += 2) if (bits[i].trim()) parts.push({ x: bits[i].trim(), sep: i ? bits[i - 1] : '', wip: WIP_RE.test(bits[i]) });
    if (!parts.some((x) => x.wip)) continue;
    const glue = (want) => {
      let out = '';
      let prev = -2;
      parts.forEach((x, k) => { if (x.wip !== want) return; out += out ? (prev === k - 1 && x.sep.includes(',') ? ', ' : ' ') : ''; out += x.x; prev = k; });
      return out.replace(/^(?:but|and|though|although|while)\s+/i, '').replace(/[,;]\s*$/, '').trim();
    };
    f.detail = glue(false);
    const where = `Where it stood when imported: ${sentence(glue(true))}`;
    const t = allTasks(p).find((x) => x.feat === f.id && x.status !== 'done');
    if (t) { t.notes = t.notes ? `${where}\n${t.notes}` : where; continue; }
    let m = p.milestones.find((x) => /^next steps?$/i.test(x.title.trim()));
    if (!m) { m = mkMilestone({ title: 'Next steps' }, seen); p.milestones.push(m); }
    m.tasks.push(mkTask({ title: `Finish ${oneLine(f.title)}`, notes: where, feat: f.id, status: f.status === 'doing' ? 'doing' : 'todo' }, seen));
  }
}

// a plan made with Export plan, back into a project
// "text Why: why" whose text has a "Why:" of its own: the last one starts the why
const splitLast = (s, sep) => { const i = s.lastIndexOf(sep); return i < 0 ? [s] : [s.slice(0, i), s.slice(i + sep.length)]; };
const unesc = (s) => str(s).split('\n').map((l) => l.replace(/^(\s*)\\([-*+#>|]|```|~~~)/, '$1$2').replace(/^(\s*\d+)\\([.)])/, '$1$2')).join('\n');
function parseShipyardMd(text) {
  const v2 = str(text).includes(EXPORT_MARK);
  const p = blankProject('');
  const seen = new Set();
  let part = '';
  for (const s of mdSections(text)) {
    const title = v2 ? s.title.replace(/\\(#+)$/, '$1') : unmd(s.title);
    if (s.level === 1) {
      p.name = title;
      const st = /^Stage: (\w+)/m.exec(s.lines.join('\n'));
      if (st) p.stage = STAGES.find((x) => x.label === st[1])?.k || 'idea';
      const para = mdParas(s.lines, v2).filter((x) => !/^Stage: /.test(x));
      if (para[0]) p.pitch = v2 ? oneLine(unesc(para[0])) : para[0];
      continue;
    }
    if (s.level === 2) part = title;
    const items = mdItems(s.lines);
    if (s.level === 2 && part === 'Brief') {
      const LABEL = { 'Who it is for': 'audience', 'Problem it solves': 'problem', 'Done when': 'doneWhen', 'Aim to ship by': 'targetDate', Constraints: 'constraints', Repository: 'repo' };
      let sub = '';
      let textKey = '';
      let fence = false;
      for (const l of s.lines) {
        if (sub === 'commands' && FENCE.test(l) && fenceStep(fence, l) !== fence) { fence = fenceStep(fence, l); continue; }
        if (fence) { p.commands = p.commands ? p.commands + '\n' + l : l; continue; }
        const f = /^\*\*(Who it is for|Problem it solves|Done when|Aim to ship by|Constraints|Repository):\*\*\s*(.*)$/.exec(l.trim());
        if (f) { textKey = LABEL[f[1]]; p[textKey] = f[2].trim(); sub = ''; continue; }
        if (!l.trim()) { textKey = ''; continue; }
        if (v2 && textKey) { p[textKey] += '\n' + unesc(l.trim()); continue; }
        const h = /^\*\*(Tech stack|How to run and test|Conventions|Constraints)\*\*\s*$/.exec(l.trim());
        if (h) { sub = { 'Tech stack': 'stack', 'How to run and test': 'commands', Conventions: 'conventions', Constraints: 'constraints' }[h[1]]; continue; }
        const b = /^\s*[-*]\s+(.*)$/.exec(l);
        if (b && sub && sub !== 'commands') { const v = sub === 'stack' ? b[1].trim() : '- ' + b[1].trim(); p[sub] = p[sub] ? p[sub] + '\n' + v : v; }
      }
    } else if (s.level === 3 && part === 'Features') {
      const pr = PRIORITIES.find((x) => x.label === title)?.k || 'should';
      let last = null;
      for (const x of items) {
        if (x.depth >= 2) { if (v2 && last) last.detail = last.detail ? last.detail + '\n' + unesc(x.bodyKeep) : unesc(x.bodyKeep); continue; }
        if (v2) {
          const m = /^(.*?)(?: \((in progress|to do|done)\))?$/.exec(x.raw); // one status after the title; the title may end like one too
          last = mkFeature({ title: m[1] === 'Untitled feature' ? '' : m[1], detail: '', priority: pr, status: x.done ? 'done' : m[2] === 'in progress' ? 'doing' : 'todo' }, seen);
        } else {
          const u = /^Untitled feature(?:: (.*))?$/.exec(x.raw);
          const i = x.raw.indexOf(': ');
          const [t, d] = u ? ['', str(u[1])] : i > 0 ? [x.raw.slice(0, i), x.raw.slice(i + 2)] : [x.raw, ''];
          last = mkFeature({ title: t, detail: d, priority: pr, status: x.done ? 'done' : 'todo' }, seen);
        }
        p.features.push(last);
      }
    } else if (s.level === 2 && part === 'Data model') {
      let last = null;
      for (const x of items) {
        if (x.depth >= 2) { const m = /^(Fields|Notes): ([\s\S]*)$/.exec(v2 ? x.bodyKeep : x.body); if (last && m) last[m[1] === 'Fields' ? 'fields' : 'notes'] = unesc(m[2]); continue; }
        const m = /^\*\*(.+?)\*\*$/.exec(x.raw);
        const n = m ? m[1] : x.text;
        last = mkEntity({ name: n === 'Untitled' ? '' : n }, seen);
        p.entities.push(last);
      }
    } else if (s.level === 2 && part === 'Screens and parts') {
      items.forEach((x) => { const m = /^\*\*(.+?)\*\*(?::\s*([\s\S]*))?$/.exec(v2 ? x.bodyKeep : x.raw); p.screens.push(mkScreen({ name: m ? (m[1] === 'Untitled' ? '' : m[1]) : x.text, notes: m ? (v2 ? unesc(str(m[2])) : str(m[2])) : '' }, seen)); });
    } else if (s.level === 3 && part === 'Plan') {
      const mt = /^Milestone \d+: (.*)$/.exec(title);
      const tasks = [];
      for (const x of items) {
        if (x.depth >= 2) {
          const fm = /^Feature: (.+)$/.exec(v2 ? x.body : x.raw);
          if (fm && tasks.length) { tasks[tasks.length - 1].feat = '\u0001' + oneLine(v2 ? unesc(fm[1]) : fm[1]); continue; } // linked once the features are read
          const n = /^Notes: ([\s\S]*)$/.exec(v2 ? x.bodyKeep : x.raw); if (tasks.length) tasks[tasks.length - 1].notes = n ? (v2 ? unesc(n[1]) : n[1]) : x.raw; continue;
        }
        const m = /^(.*?) \(size ([SML])(, in progress)?(?:, done (\d{4}-\d{2}-\d{2}))?\)$/.exec(x.raw);
        const t = m ? m[1] : x.raw;
        tasks.push({ title: t === 'Untitled task' ? '' : t, size: m ? m[2] : 'M', notes: '', status: x.done ? 'done' : m?.[3] ? 'doing' : 'todo', doneAt: x.done && m?.[4] ? m[4] : '' });
      }
      const goal = v2 ? unesc(mdParas(s.lines, true)[0] || '') : mdParas(s.lines)[0] || '';
      const name = mt ? mt[1] : title;
      p.milestones.push(mkMilestone({ title: name === 'Untitled' ? '' : name, goal, tasks }, seen));
    } else if (s.level === 2 && part === 'Bugs') {
      const FIELD = { 'What happens': 'actual', 'What should happen': 'expected', Steps: 'steps', Error: 'error' };
      let last = null;
      for (const x of items) {
        if (x.depth >= 2) { const m = /^(What happens|What should happen|Steps|Error): ([\s\S]*)$/.exec(v2 ? x.bodyKeep : x.body); if (last && m) last[FIELD[m[1]]] = unesc(m[2]); continue; }
        const m = /^(.*?) \((blocker|major|minor)(?:, (\d{4}-\d{2}-\d{2}))?\)$/.exec(x.raw);
        const t = m ? m[1] : x.raw;
        last = mkBug({ title: t === 'Untitled bug' ? '' : t, severity: m ? m[2] : 'major', date: m?.[3] || '', status: x.done ? 'fixed' : 'open' }, seen);
        p.bugs.push(last);
      }
    } else if (s.level === 3 && part === 'Prompts') {
      const b = mdBlocks(s.lines)[0];
      p.prompts.push(mkPrompt({ title: title === 'Untitled' ? '' : title, text: b ? b.lines.map((l) => l.replace(/^(\s*)\\(```|~~~)/, '$1$2')).join('\n') : '' }, seen));
    } else if (s.level === 2 && part === 'Decisions') {
      items.forEach((x) => { const m = /^(\d{4}-\d{2}-\d{2}): (.*)$/.exec(x.raw); const [txt, why] = splitLast(m ? m[2] : x.raw, ' Why: '); p.decisions.push(mkDecision({ date: m ? m[1] : '', text: txt, why: why || '' }, seen)); });
    } else if (s.level === 2 && part === 'Sessions') {
      let last = null;
      for (const x of items) {
        if (x.depth >= 2) { const m = /^(Summary|Went wrong): ([\s\S]*)$/.exec(v2 ? x.bodyKeep : x.body); if (last && m) last[m[1] === 'Summary' ? 'summary' : 'wrong'] = unesc(m[2]); continue; }
        const m = /^(\d{4}-\d{2}-\d{2}|No date) \((Done|Partly done|Stuck)\): (.*)$/.exec(x.raw);
        if (!m) { last = null; continue; }
        last = mkSession({ date: m[1] === 'No date' ? '' : m[1], outcome: OUTCOMES.find((o) => o.short === m[2])?.k, task: m[3] === 'Untitled task' ? '' : m[3] }, seen);
        p.sessions.push(last);
      }
    } else if (s.level === 2 && part === 'Lessons') {
      items.forEach((x) => {
        const promoted = / \(added to CLAUDE\.md\)$/.test(x.raw);
        const raw = x.raw.replace(/ \(added to CLAUDE\.md\)$/, '');
        const m = /^(\d{4}-\d{2}-\d{2}): (.*)$/.exec(raw);
        const [hap, change] = splitLast(m ? m[2] : raw, ' Next time: ');
        p.lessons.push(mkLesson({ date: m ? m[1] : '', happened: hap, change: change || '', promoted, rule: promoted ? oneLine(change).replace(/^[-*]\s+/, '') : '' }, seen));
      });
    }
  }
  allTasks(p).forEach((t) => { if (t.feat.startsWith('\u0001')) { const name = t.feat.slice(1).toLowerCase(); t.feat = p.features.find((f) => oneLine(f.title).toLowerCase() === name)?.id || ''; } });
  // each session goes back on the task of the same name, the first one if names repeat
  for (const s of p.sessions) {
    const name = oneLine(s.task).toLowerCase();
    const ms = name && p.milestones.find((m) => m.tasks.some((t) => oneLine(t.title).toLowerCase() === name));
    if (ms) { s.mid = ms.id; s.tid = ms.tasks.find((t) => oneLine(t.title).toLowerCase() === name).id; }
  }
  return p;
}


/* ================= repo files: PLAN.md, the /next command, settings.json ================= */
// PLAN.md lets Claude Code work through the plan on its own and tick tasks off; pasting it back
// into Shipyard updates the plan. Each task line carries its id in an HTML comment, which Markdown
// viewers hide, so tasks still match after Claude rewords one.
const PLAN_HOWTO = [
  'How to use this file:',
  '- Fix any unchecked blocker under "Bugs to fix" first. Then take the first unchecked task under a "Milestone" heading, in the first milestone that still has one.',
  '- When a task or bug works and its checks pass, change its "- [ ]" to "- [x]". On a task, also add today\'s date to its brackets: "(S)" becomes "(S, done YYYY-MM-DD)".',
  '- Keep the hidden id comment at the end of each line. Do not reorder, rename or delete lines.',
  '- A large (L) task can be split into steps: indented "- [ ]" lines under it, done in order. Tick the task itself only when all its steps are ticked.',
  '- Put anything worth remembering on an indented "Notes:" line under the task. If you find extra work that is needed, add it as a new "- [ ]" line in the milestone it belongs to: just above the task that needs it done first, otherwise at the end.',
];
// a long plan sums up each finished milestone in one line, so Claude Code reads less on every /next
const PLAN_FULL = 40;
const planShort = (p) => allTasks(p).length > PLAN_FULL;
const PLAN_DONE = /<!--\s*done:\s*([A-Za-z0-9_-]+)\s*-->/;
function buildPlanMd(p) {
  const L = [`# Plan: ${p.name || 'Untitled project'}`, ''];
  const short = planShort(p);
  if (p.pitch.trim()) L.push(sentence(p.pitch), '');
  L.push(...PLAN_HOWTO, '');
  const bugs = openBugs(p);
  const fixed = p.bugs.filter((b) => b.status === 'fixed' && b.title.trim()); // ticked, so a merge into the folder ticks them there too
  if (bugs.length || fixed.length) {
    L.push('## Bugs to fix', '', 'Fix blockers before the next task. Fix the others when I ask, or when a task touches the same code. When a bug is fixed and its check passes, change its "- [ ]" to "- [x]".', '');
    bugs.forEach((b) => {
      L.push(`- [ ] ${planTitle(b.title) || 'Untitled bug'} (${b.severity}) <!-- id:${b.id} -->`);
      if (b.actual.trim()) L.push(`  What happens: ${oneLine(b.actual)}`);
      if (b.expected.trim()) L.push(`  What should happen: ${oneLine(b.expected)}`);
      if (b.steps.trim()) L.push(`  Steps: ${oneLine(b.steps)}`);
      const err = oneLine(b.error);
      if (err) L.push(`  Error: ${err.length > 300 ? err.slice(0, 299).trimEnd() + '…' : err}`);
      bugHistory(p, b).forEach((s) => L.push(`  Tried: ${historyLine(s).replace(/^- /, '')}`));
    });
    fixed.forEach((b) => L.push(`- [x] ${planTitle(b.title)} (${b.severity}) <!-- id:${b.id} -->`));
    L.push('');
  }
  p.milestones.forEach((m, i) => {
    L.push(`## Milestone ${i + 1}: ${oneLine(m.title) || 'Untitled'}`, '');
    if (short && m.tasks.length && m.tasks.every((t) => t.status === 'done')) {
      L.push(`Finished: ${m.tasks.length === 1 ? 'its one task is done, so it is' : `all ${m.tasks.length} tasks are done, so they are`} not listed. <!-- done:${m.id} -->`, '');
      return;
    }
    if (m.goal.trim()) L.push(`Goal: ${oneLine(m.goal)}`, '');
    m.tasks.forEach((t) => {
      L.push(`- [${t.status === 'done' ? 'x' : ' '}] ${planTitle(t.title) || 'Untitled task'} (${t.size}${t.status === 'doing' ? ', in progress' : ''}${t.status === 'done' && t.doneAt ? `, done ${t.doneAt}` : ''}) <!-- id:${t.id} -->`);
      if (t.notes.trim()) L.push(`  Notes: ${oneLine(t.notes)}`);
    });
    if (!m.tasks.length) L.push('No tasks yet.');
    L.push('');
  });
  if (!p.milestones.length) L.push('No milestones yet.', '');
  return L.join('\n');
}

// reads a PLAN.md back: which tasks moved forward, which are new, which notes grew, which bugs were fixed.
// Nothing is deleted and nothing moves backwards. Lines under other headings, and tasks whose id belongs
// to nothing here (deleted in Shipyard, or from another project), are skipped.
const PLAN_ID = /<!--\s*id:\s*([A-Za-z0-9_-]+)\s*-->/;
const planTitle = (t) => oneLine(str(t).replace(/<!--[\s\S]*?-->/g, ' '));
// the id comment Shipyard writes ends the line: an earlier one belongs to the title
const lastPlanId = (s) => { let m = null; for (const x of s.matchAll(new RegExp(PLAN_ID.source, 'g'))) m = x; return m; };
const PLAN_ITEM = /^(\s*)(?:[-*+]|\d+[.)])\s+\[([ xX])\]\s+(.*?)\s*$/;
const STOP_WORDS = new Set('the and for with from into onto that this then than when what which your you our its are was were has have had not but all any can will just also each per via add'.split(' '));
const wordSet = (s) => new Set((str(s).toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter((w) => !STOP_WORDS.has(w)));
function similar(a, b) { // share of words two titles have in common, 0 to 1
  const A = wordSet(a);
  const B = wordSet(b);
  if (!A.size || !B.size) return 0;
  let n = 0;
  A.forEach((w) => { if (B.has(w)) n++; });
  return n / Math.max(A.size, B.size);
}
// a PLAN.md copied from a narrow terminal has lines broken in two: they are joined back before reading
const SIZE_END = /\(([SML])(?:,\s*in progress|,\s*(?:[Dd]one|[Ff]inished)[:\s]+\d{4}-\d{2}-\d{2})?\)(?:\s*\((?:[Dd]one|[Ff]inished|[Ff]ixed)[:\s]+\d{4}-\d{2}-\d{2}\))?\s*(<!--.*)?$/;
// "Title (S)", "Title (M, in progress)", "Title (S, done 2026-10-08)" or "Title (S) (done 2026-10-08)": its title, size, and
// the day it was ticked, when that day is a real one and not in the future
const DONE_ON = /\s*\((?:[Dd]one|[Ff]inished)[:\s]+(\d{4}-\d{2}-\d{2})\)$/;
function planTaskTail(rest) {
  let at = '';
  const dm = DONE_ON.exec(rest);
  if (dm) { at = dm[1]; rest = rest.slice(0, dm.index).trim(); }
  const sm = /^(.*?)\s*\(([SML])(?:(,\s*in progress)|,\s*(?:[Dd]one|[Ff]inished)[:\s]+(\d{4}-\d{2}-\d{2}))?\)$/.exec(rest);
  if (sm?.[4]) at = sm[4];
  const real = at && realDay(at) && at <= today();
  return { title: (sm ? sm[1] : rest).trim(), size: sm ? sm[2] : '', doing: !!sm?.[3], at: real ? at : '' };
}
// a bug line's title and severity; "(major, fixed 2026-10-08)" and "(major) (fixed 2026-10-08)" read as "(major)"
const bugTail = (rest) => { const bm = /^(.*?)\s*\((blocker|major|minor)(?:,[^()]*)?\)(?:\s*\((?:[Dd]one|[Ff]ixed|[Ff]inished)[:\s]+\d{4}-\d{2}-\d{2}\))?$/i.exec(rest); return { title: (bm ? bm[1] : rest).trim(), severity: bm ? bm[2].toLowerCase() : '' }; };
function joinWrapped(rows) {
  const out = [];
  for (const raw of rows) {
    const k = out.length - 1;
    const prev = k >= 0 ? out[k] : '';
    const t = raw.trim();
    if (t && prev.lastIndexOf('<!--') > prev.lastIndexOf('-->')) { out[k] = prev.replace(/\s+$/, '') + t; continue; } // the rest of an id comment
    const plain = t && /^\s/.test(raw) && !PLAN_ITEM.test(raw) && !/^(?:[-*+]|\d+[.)])\s/.test(t) && !/^[A-Z][A-Za-z ]{0,30}:/.test(t) && !/^#/.test(t);
    if (plain && PLAN_ITEM.test(prev) && !PLAN_ID.test(prev) && !SIZE_END.test(prev) && (SIZE_END.test(t) || /<!--/.test(t))) { out[k] = prev.replace(/\s+$/, '') + ' ' + t; continue; } // the end of a task line
    if (plain && /^\s+(Notes|What happens|What should happen|Steps):/.test(prev) && !/[.!?]$/.test(prev.trim())) { out[k] = prev.replace(/\s+$/, '') + ' ' + t; continue; } // a note running on
    out.push(raw);
  }
  return out;
}
function readPlanMd(p, text) {
  text = untermText(text);
  const out = { done: [], doing: [], added: [], notes: [], fixed: [], newMs: [], split: [], newBugs: [], reworded: [], bugNotes: 0, unknown: 0, gone: 0, found: 0, seen: 0, ids: 0, ownIds: 0, name: '', foreign: false, state: { tasks: {}, bugs: {} } };
  // a PLAN.md that Shipyard did not make has no id comments: its headings become milestones and its tasks are added
  const foreign = out.foreign = !PLAN_ID.test(text) && /^\s*(?:[-*+]|\d+[.)])\s+\[[ xX]\]/m.test(text);
  const byId = new Map();
  p.milestones.forEach((m) => m.tasks.forEach((t) => byId.set(t.id, { m, t })));
  const splitParts = new Map(); // id of a task split here -> the smaller tasks that replaced it
  p.milestones.forEach((m) => m.tasks.forEach((t) => str(t.splitFrom).split(' ').filter((x) => x && !byId.has(x)).forEach((x) => { if (!splitParts.has(x)) splitParts.set(x, []); splitParts.get(x).push({ m, t }); })));
  const bugIds = new Set(p.bugs.map((b) => b.id));
  const noteOf = new Map();
  const addNote = (hit, extra, joiner = '\n') => {
    let e = noteOf.get(hit.t.id);
    if (!e) { e = { ...hit, notes: hit.t.notes.replace(/\s+$/, '') }; noteOf.set(hit.t.id, e); out.notes.push(e); }
    e.notes = e.notes ? e.notes + joiner + extra : extra;
  };
  let ms = null; // { m } for a milestone here, { nm } for one Claude added
  let pending = foreign ? { title: 'From PLAN.md', idx: 1e9, nm: null } : null; // a milestone heading whose title matches none here, until its first task says which it is
  let last = null; // the task or bug line just read
  let inBugs = false;
  const claimed = new Set();
  let waiting = []; // tasks added in the file since the last known one: they go in above the next known task of their milestone
  const anchor = (hit) => { waiting.forEach((w) => { if (w.m && w.m === hit.m) w.before = hit.t.id; }); waiting = []; };
  for (const raw of joinWrapped(str(text).replace(/\r\n?/g, '\n').split('\n'))) {
    const top = /^#\s+Plan:\s*(.*?)\s*$/.exec(raw);
    if (top) { out.name = top[1]; continue; }
    if (/^##\s+Bugs to fix\s*$/.test(raw)) { inBugs = true; ms = null; pending = null; last = null; continue; }
    const fh = foreign && /^(#{1,3})\s+(.*?)\s*#*\s*$/.exec(raw);
    if (fh) {
      last = null; ms = null;
      const title = fh[2].replace(/^Milestone\s+\d+\s*:\s*/i, '').trim();
      inBugs = /\bbugs?\b/i.test(title);
      const m = !inBugs && p.milestones.find((x) => oneLine(x.title).toLowerCase() === title.toLowerCase());
      if (m) { ms = { m }; pending = null; } else pending = inBugs ? null : { title: fh[1].length === 1 || !title ? 'From PLAN.md' : title, idx: 1e9, nm: null };
      continue;
    }
    const h = /^##\s+Milestone\s+(\d+)\s*:\s*(.*?)\s*$/.exec(raw);
    if (h) {
      inBugs = false; last = null; pending = null;
      const title = h[2].replace(/\s*<!--.*?-->\s*/g, ' ').trim();
      const m = p.milestones.find((x) => oneLine(x.title) === title);
      if (m) ms = { m };
      else if (!title || title === 'Untitled') { const byIdx = p.milestones[Number(h[1]) - 1]; ms = byIdx ? { m: byIdx } : null; }
      else { ms = null; pending = { title, idx: Number(h[1]) - 1, nm: null }; }
      continue;
    }
    if (/^#{1,2}\s/.test(raw)) { inBugs = false; ms = null; pending = null; last = null; continue; } // another section: its lines belong to no milestone
    if (/^\s*#{1,6}\s/.test(raw)) { last = null; continue; } // a smaller heading is never a note
    const fin = PLAN_DONE.exec(raw);
    if (fin) { // a finished milestone summed up in one line: its tasks are in the folder's plan, done
      last = null;
      p.milestones.find((x) => x.id === fin[1])?.tasks.forEach((t) => { if (!(t.id in out.state.tasks)) out.state.tasks[t.id] = 1; });
      continue;
    }
    const tm = PLAN_ITEM.exec(raw);
    const indent = tm ? tm[1].replace(/\t/g, '  ').length : 0;
    // an indented line under a task is a note; a ticked sub-step is noted as done
    if (last && (tm ? indent >= 2 : /^\s+\S/.test(raw))) {
      let line = tm ? `${tm[3].replace(PLAN_ID, '').trim()}${/x/i.test(tm[2]) ? ' (done)' : ''}` : raw.trim().replace(/^(?:[-*+]|\d+[.)])\s+/, '');
      const nm = /^Notes:\s*(.*)$/.exec(line);
      if (nm) line = nm[1].trim();
      line = line.replace(/<!--.*?-->/g, '').replace(/^[^<]*-->\s*/, '').trim(); // a piece of an id comment is not a note
      if (last.bug) { if (nm && line) out.bugNotes++; continue; }
      if (!line) continue;
      if (last.added) { last.added.notes = last.added.notes ? last.added.notes + '\n' + line : line; continue; }
      const had = oneLine(last.hit.t.notes);
      if (last.split) { // notes under a split task: keep only the words not already on its first smaller task
        const norm = (x) => x.toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim();
        const words = line.split(/\s+/);
        let k = words.length;
        while (k > 0 && !norm(had).includes(norm(words.slice(0, k).join(' ')))) k--;
        const extra = words.slice(k).join(' ').trim();
        if (extra && !oneLine(noteOf.get(last.hit.t.id)?.notes || '').includes(extra)) addNote(last.hit, extra);
        continue;
      }
      if (nm && !last.notesSeen) { // the first Notes line is the one Shipyard wrote: keep only what was added to it
        last.notesSeen = true;
        if (had && line.startsWith(had)) { const extra = line.slice(had.length).trim(); if (extra) addNote(last.hit, extra, /^[.,;:!?)]/.test(extra) ? '' : ' '); continue; }
        if (had && line.endsWith(had)) { const extra = line.slice(0, line.length - had.length).trim(); if (extra) addNote(last.hit, extra); continue; }
      }
      if (!had.includes(line) && !oneLine(noteOf.get(last.hit.t.id)?.notes || '').includes(line)) addNote(last.hit, line);
      continue;
    }
    if (!tm) continue;
    last = null;
    let rest = tm[3];
    const idm = lastPlanId(rest);
    if (idm) { rest = rest.replace(new RegExp(PLAN_ID.source, 'g'), ' ').replace(/\s+/g, ' ').trim(); out.ids++; }
    const checked = /x/i.test(tm[2]);
    if (inBugs) {
      const bt = bugTail(rest).title;
      const bsev = bugTail(rest).severity;
      if (idm && bugIds.has(idm[1])) out.ownIds++;
      const b = idm ? p.bugs.find((x) => x.id === idm[1]) : p.bugs.find((x) => oneLine(x.title).toLowerCase() === bt.toLowerCase());
      last = { bug: true };
      if (b) out.state.bugs[b.id] = checked ? 1 : 0;
      if (b && checked && b.status === 'open' && !out.fixed.includes(b)) out.fixed.push(b);
      else if (!b && !idm && bt && bt !== 'Untitled bug' && !out.newBugs.some((x) => x.title.toLowerCase() === bt.toLowerCase())) out.newBugs.push({ title: bt, severity: bsev || 'major', status: checked ? 'fixed' : 'open' }); // Claude Code found it
      continue;
    }
    const tail = planTaskTail(rest);
    const { title, doing, at } = tail;
    const ticked = (x) => (at ? { ...x, at } : x); // with the day it was ticked, when PLAN.md says
    out.seen++;
    let hit = null;
    if (idm) {
      hit = byId.get(idm[1]) || null;
      const parts = hit ? null : splitParts.get(idm[1]);
      out.state.tasks[idm[1]] = checked ? 1 : 0; // the folder has this line, whatever it is here
      if (parts) { // split into smaller tasks after this PLAN.md was saved: ticking it asks which parts are done
        out.ownIds++; out.found++;
        const left = parts.filter((x) => !claimed.has(x.t.id));
        left.forEach((x) => claimed.add(x.t.id));
        out.split.push({ title, n: parts.length, checked, at, parts: left.filter((x) => x.t.status !== 'done'), begun: parts.some((x) => x.t.status === 'done') });
        if (left.length) anchor(left[0]);
        last = left.length ? { hit: left[0], notesSeen: true, split: true } : null;
        continue;
      }
      if (!hit) { if (bugIds.has(idm[1])) out.ownIds++; else out.gone++; continue; }
      out.ownIds++;
    }
    if (hit && pending) { ms = { m: hit.m }; pending = null; }
    const here = ms?.m ? [ms.m] : [];
    const free = (m) => m.tasks.filter((x) => !claimed.has(x.id));
    if (!hit) for (const m of [...here, ...p.milestones]) { const t = free(m).find((x) => oneLine(x.title) === title); if (t) { hit = { m, t }; break; } }
    if (!hit && here.length) { // reworded and its id comment dropped: the closest task left in the same milestone, when it is close
      let best = null;
      let score = 0.8;
      for (const t of free(here[0])) { const s = similar(t.title, title); if (s >= score && wordSet(t.title).size >= 2) { best = t; score = s; } }
      if (best) { hit = { m: here[0], t: best }; out.reworded.push({ line: title, t: best }); }
    }
    if (hit) {
      out.found++;
      claimed.add(hit.t.id);
      anchor(hit);
      out.state.tasks[hit.t.id] = checked ? 1 : 0;
      last = { hit, notesSeen: false };
      if (checked && hit.t.status !== 'done') out.done.push(ticked(hit));
      else if (!checked && doing && hit.t.status === 'todo') out.doing.push(hit);
      continue;
    }
    if (!title || title === 'Untitled task') continue;
    let target = ms;
    if (!target && pending) {
      if (!pending.nm) { pending.nm = { title: pending.title, idx: pending.idx, tasks: [] }; out.newMs.push(pending.nm); }
      target = { nm: pending.nm };
    }
    if (!target) { out.unknown++; continue; }
    const added = { m: target.m || null, nm: target.nm || null, title, size: tail.size || 'M', status: checked ? 'done' : doing ? 'doing' : 'todo', notes: '', at: checked ? at : '' };
    if (added.nm) added.nm.tasks.push(added);
    out.added.push(added);
    if (added.m) waiting.push(added);
    last = { added };
  }
  return out;
}
// which tasks a PLAN.md marks, by name, and any line read as a reworded task, so a wrong match is seen before it is applied
function planNames(r) {
  const nm = (xs) => xs.slice(0, 4).map((x) => `"${oneLine(x.t.title)}"`).join(', ') + (xs.length > 4 ? ` and ${xs.length - 4} more` : '');
  const out = [];
  if (r.done.length) out.push(`Done: ${nm(r.done)}.`);
  if (r.doing.length) out.push(`In progress: ${nm(r.doing)}.`);
  r.reworded.slice(0, 3).forEach((x) => out.push(`"${x.line}" is read as "${oneLine(x.t.title)}".`));
  return out.length ? ' ' + out.join(' ') : '';
}
function planChangeCount(r) { return r.done.length + r.doing.length + r.added.length + r.notes.length + r.fixed.length + r.newMs.length + r.newBugs.length; }
function planChangeText(r) {
  const parts = [];
  const n = (k, one, many) => (k === 1 ? one : many.replace('#', k));
  if (r.done.length) parts.push(n(r.done.length, '1 task marked done', '# tasks marked done'));
  if (r.doing.length) parts.push(n(r.doing.length, '1 task marked in progress', '# tasks marked in progress'));
  if (r.newMs.length) parts.push(n(r.newMs.length, '1 new milestone', '# new milestones'));
  if (r.added.length) parts.push(n(r.added.length, '1 new task added', '# new tasks added'));
  if (r.notes.length) parts.push(n(r.notes.length, 'notes added to 1 task', 'notes added to # tasks'));
  if (r.fixed.length) parts.push(n(r.fixed.length, '1 bug marked fixed', '# bugs marked fixed'));
  if (r.newBugs.length) parts.push(n(r.newBugs.length, '1 new bug added', '# new bugs added'));
  return parts.join(', ');
}
// applies a read PLAN.md and returns what is needed to undo it
function applyPlanMd(p, r) {
  const seen = newIds(p);
  const u = { tasks: [], bugs: [], addedIds: [], msIds: [], bugIds: [] };
  const keep = (t) => { if (!u.tasks.some((x) => x.id === t.id)) u.tasks.push({ id: t.id, status: t.status, notes: t.notes, doneAt: t.doneAt, startedAt: t.startedAt }); };
  r.done.forEach(({ t, at }) => { keep(t); t.status = 'done'; if (at) t.doneAt = at; });
  r.doing.forEach(({ t }) => { keep(t); if (t.status !== 'doing') t.startedAt = today(); t.status = 'doing'; });
  r.notes.forEach(({ t, notes }) => { keep(t); t.notes = notes; });
  r.fixed.forEach((b) => { u.bugs.push(b.id); setBugStatus(b, 'fixed'); });
  r.newBugs.slice().reverse().forEach((x) => { const b = mkBug({ title: x.title, severity: x.severity, status: x.status }, seen); p.bugs.unshift(b); u.bugIds.push(b.id); });
  r.added.forEach((a) => {
    if (a.nm) return;
    const live = p.milestones.find((x) => x.id === a.m.id);
    if (!live) return;
    const t = mkTask({ title: a.title, size: a.size, status: a.status, notes: a.notes, doneAt: a.at || '' }, seen);
    const at = a.before ? live.tasks.findIndex((x) => x.id === a.before) : -1;
    if (at >= 0) live.tasks.splice(at, 0, t); else live.tasks.push(t);
    u.addedIds.push(t.id);
  });
  r.newMs.forEach((nm) => {
    const m = mkMilestone({ title: nm.title, tasks: nm.tasks.map((a) => ({ title: a.title, size: a.size, status: a.status, notes: a.notes, doneAt: a.at || '' })) }, seen);
    p.milestones.splice(Math.min(Math.max(nm.idx, 0), p.milestones.length), 0, m);
    u.msIds.push(m.id);
  });
  return u;
}
const undoPlanSync = (u) => (q) => {
  q.milestones = q.milestones.filter((m) => !u.msIds.includes(m.id));
  q.milestones.forEach((m) => {
    m.tasks = m.tasks.filter((t) => !u.addedIds.includes(t.id));
    m.tasks.forEach((t) => { const b = u.tasks.find((x) => x.id === t.id); if (b) { t.status = b.status; t.notes = b.notes; if (b.doneAt !== undefined) t.doneAt = b.doneAt; if (b.startedAt !== undefined) t.startedAt = b.startedAt; } });
  });
  q.bugs = q.bugs.filter((b) => !arr(u.bugIds).includes(b.id));
  q.bugs.forEach((b) => { if (u.bugs.includes(b.id)) b.status = 'open'; });
  return 'open-plansync';
};

// a PLAN.md opened with Import becomes a project of its own
const looksLikePlanMd = (text) => /^# Plan: .+$/m.test(text) && PLAN_ID.test(text);
function parsePlanFile(text) {
  const p = blankProject('');
  const seen = new Set();
  let ms = null;
  let last = null;
  let inBugs = false;
  let intro = false;
  for (const raw of str(text).replace(/\r\n?/g, '\n').split('\n')) {
    const top = /^#\s+Plan:\s*(.*?)\s*$/.exec(raw);
    if (top) { p.name = top[1]; intro = true; continue; }
    if (/^##\s+Bugs to fix\s*$/.test(raw)) { inBugs = true; ms = null; last = null; intro = false; continue; }
    const h = /^##\s+Milestone\s+\d+\s*:\s*(.*?)\s*$/.exec(raw);
    if (h) { inBugs = false; intro = false; last = null; ms = mkMilestone({ title: h[1] === 'Untitled' ? '' : h[1] }, seen); p.milestones.push(ms); continue; }
    if (/^#{1,6}\s/.test(raw)) { inBugs = false; intro = false; ms = null; last = null; continue; }
    const tm = PLAN_ITEM.exec(raw);
    if (tm && (!last || tm[1].length < 2)) {
      const rest = tm[3].replace(PLAN_ID, '').trim();
      const checked = /x/i.test(tm[2]);
      if (inBugs) {
        const bt = bugTail(rest);
        last = mkBug({ title: bt.title === 'Untitled bug' ? '' : bt.title, severity: bt.severity || 'major', status: checked ? 'fixed' : 'open' }, seen);
        p.bugs.push(last);
      } else if (ms) {
        const tt = planTaskTail(rest);
        last = mkTask({ title: tt.title === 'Untitled task' ? '' : tt.title, size: tt.size || 'M', status: checked ? 'done' : tt.doing ? 'doing' : 'todo', doneAt: checked ? tt.at : '' }, seen);
        ms.tasks.push(last);
      }
      continue;
    }
    const sub = /^\s+(?:(?:[-*+]|\d+[.)])\s+)?(?:\[[ xX]\]\s+)?(.*\S)\s*$/.exec(raw);
    if (sub && last) {
      const f = /^(Notes|What happens|What should happen|Steps):\s*(.*)$/.exec(sub[1]);
      const k = f ? { Notes: 'notes', 'What happens': 'actual', 'What should happen': 'expected', Steps: 'steps' }[f[1]] : 'notes';
      const v = (f ? f[2] : sub[1]).replace(PLAN_ID, '').trim();
      if (k in last && v) last[k] = last[k] ? last[k] + '\n' + v : v;
      continue;
    }
    const g = /^Goal:\s*(.*)$/.exec(raw);
    if (g && ms) { ms.goal = g[1].trim(); continue; }
    if (intro && raw.trim() && !p.pitch && !/^(How to use this file|-\s|When a task|If you find|Keep the)/.test(raw.trim())) p.pitch = raw.trim();
    else if (!raw.trim() && p.pitch) intro = false;
  }
  p.stage = allTasks(p).some((t) => t.status !== 'todo') ? 'building' : p.milestones.length ? 'designing' : 'idea';
  return p;
}

// the /next command for Claude Code: .claude/commands/next.md
function nextCommandMd(p) {
  const check = hasTests(p) ? 'Run the test or build command from the Commands section of CLAUDE.md and fix any failures. A check that is not set up yet (a later task adds it) is not a failure: say so.'
    : p.commands.trim() ? 'Check your work by running the app (Commands in CLAUDE.md says how), and fix any failures. There are no tests yet, so do not add a test setup unless I ask.'
      : 'Check your work by running the app or its tests, and fix any failures.';
  return [
    '---',
    'description: Do the next task from PLAN.md',
    'argument-hint: [optional note about the task]',
    'disable-model-invocation: true',
    '---',
    '',
    'Read CLAUDE.md and PLAN.md, then pick one thing to work on: the first unchecked blocker under "Bugs to fix" if there is one, otherwise the first unchecked task ("- [ ]") under a Milestone heading, in the first milestone that still has one.',
    'Extra note from me, if any: $ARGUMENTS',
    '',
    '1. Tell me what you picked. If it is a task with indented "- [ ]" steps under it, work on its first unchecked step. Unless it is marked (S), give me your plan in a few bullets and wait for my OK before you edit anything. If it is marked (L) and has no steps yet, tell me how you would split it into steps, wait for my OK, write them as indented "- [ ]" lines under it, then do only the first one.',
    '2. Make the change in small steps, touching only what it needs. For a bug, find the cause before changing code (reproduce it if you can), and if the project has tests, add one that fails because of the bug.',
    `3. ${check} If this project has a reviewer subagent (.claude/agents/reviewer.md), ask it to check the change and fix what it finds.`,
    '4. When it works, change its "- [ ]" to "- [x]" in PLAN.md, and for a task add today\'s date to its brackets: "(S)" becomes "(S, done YYYY-MM-DD)". For a step under a large task, tick the step, and tick the task itself only when all its steps are ticked. Put anything worth remembering on a short indented "Notes:" line under it, and add any extra work you found as a new "- [ ]" line at the end of its milestone. Do not reorder, rename or delete other lines.',
    `5. Finish with a short summary: what changed, what I should test by hand, and anything left over. ${LOG_ASK}`,
    '',
  ].join('\n');
}

// .claude/settings.json: lets Claude run the project's own checks without asking, and keeps secrets out of reach
const LONG_RUNNING = /\b(dev|start|serve|server|runserver|watch|preview|up)\b|--watch|streamlit run|expo start|fastapi dev|uvicorn/;
const RISKY = /\b(push|deploy|publish|release|rm|rmdir|sudo|curl|wget|ssh|scp|kill|reset|clean|prod|production|drop|migrate)\b|--prod\b|--force\b|-f\b/;
// an allowlist: commands that install, test, build or check, in the usual shapes for each stack
const SAFE_SHAPES = [
  /^(npm|pnpm|yarn|bun) (install|ci|i)$/,
  /^(npm|pnpm|yarn|bun) (test|t)( -- [\w =.:/-]+)?$/,
  /^(npm|pnpm|yarn|bun) run (test|build|lint|check|typecheck|format:check)(:[\w-]+)?( -- [\w =.:/-]+)?$/,
  /^(pnpm|yarn|bun) (build|lint|check|typecheck|format:check)(:[\w-]+)?( -- [\w =.:/-]+)?$/,
  /^(npx|bunx|pnpm exec|yarn) (vitest run|jest|tsc|eslint|prettier --check|playwright test)\b[\w =.:/-]*$/,
  /^node --test\b[\w =.:/-]*$/,
  /^(uv run |poetry run |python3? -m )?(pytest|mypy|ruff check|ruff format --check|black --check)\b[\w =.:/-]*$/,
  /^uv sync$/,
  /^(pip|pip3) install -r requirements(-dev)?\.txt$/,
  /^cargo (test|build|check|clippy|fmt --check)\b[\w =.:/-]*$/,
  /^go (test|build|vet)\b[\w =.:/-]*$/,
  /^(make|just) (test|build|lint|check)$/,
  /^dotnet (test|build)\b[\w =.:/-]*$/,
  /^flutter (test|analyze)$/,
];
const INSTALLS = /^((npm|pnpm|yarn|bun) (install|ci|i)|uv sync|(pip|pip3) install -r .*)$/;
function safeCommands(p) {
  return [...new Set(lines(p.commands).map((c) => c.replace(/\s+#.*$/, '').trim()).filter((c) => c && !c.startsWith('#') && !LONG_RUNNING.test(c) && !RISKY.test(c) && SAFE_SHAPES.some((re) => re.test(c))))];
}
function settingsJson(p) {
  // installs stay exact (no extra packages without asking); checks also run with arguments, such as one test file
  // on Windows without Git Bash, Claude Code runs commands with its PowerShell tool, which has rules of its own
  const allow = safeCommands(p).flatMap((c) => ['Bash', 'PowerShell'].map((t) => (INSTALLS.test(c) ? `${t}(${c})` : `${t}(${c} *)`)));
  // Claude Code starts in auto mode, which pushes and opens pull requests without asking unless a rule says to ask
  const ask = ['Bash', 'PowerShell'].flatMap((t) => [`${t}(git push *)`, `${t}(gh pr create *)`]);
  // bare patterns match at any depth; the ! line lets Claude read the example file that lists the variable names
  const deny = ['Read(.env)', 'Read(.env.*)', 'Read(!.env.example)', 'Read(secrets/**)'];
  return JSON.stringify({ $schema: 'https://json.schemastore.org/claude-code-settings.json', permissions: { allow, ask, deny } }, null, 2) + '\n';
}

// .claude/agents/*.md: subagents Claude Code can hand work to. Each runs in its own context and reports back.
const checkCommands = (p) => safeCommands(p).filter((c) => !INSTALLS.test(c));
function reviewerMd(p) {
  const checks = checkCommands(p);
  return [
    '---',
    'name: reviewer',
    'description: Reviews finished work in this project against CLAUDE.md, PLAN.md and the checks before a task is ticked off. Use it after finishing a task or before a commit.',
    'tools: Read, Grep, Glob, Bash, PowerShell',
    'model: inherit',
    '---',
    '',
    `You review changes to ${oneLine(p.name) || 'this project'}${p.pitch.trim() ? `: ${sentence(p.pitch)}` : '.'} You report what you find; you do not edit files.`,
    '',
    'How to review:',
    '1. Run `git status` and `git diff` to see what changed, and read the new files git status lists. If nothing changed since the last commit, review that commit with `git show`. If this folder is not in git yet, read the files the task names.',
    '2. Check the change follows the rules in CLAUDE.md, and stays within its constraints.',
    '3. If PLAN.md exists, check the change does what its task says, and nothing unrelated.',
    checks.length ? `4. Run the checks: ${checks.map((c) => `\`${c}\``).join(', ')}. One whose script or setup does not exist yet (a later task adds it) is "not set up yet", not a failure.` : '4. There are no test commands yet: read the changed code paths carefully instead, and say how to check them by hand.',
    '5. Look for bugs: errors and empty input that are not handled, wrong results, leftover debug output, and secrets in code.',
    '',
    'Reply briefly, in this order:',
    '- Verdict: ready, or needs changes',
    '- Must fix: anything that breaks something or a rule, with file and line',
    '- Worth fixing: smaller issues',
    '- Checks: what you ran and what happened',
    '',
  ].join('\n');
}
function testerMd(p) {
  const checks = checkCommands(p);
  return [
    '---',
    'name: test-runner',
    'description: Runs this project\'s tests and checks and reports what failed and why. Use it to run the checks after a change, or when a test fails, so long logs stay out of the main conversation.',
    'tools: Bash, PowerShell, Read, Grep, Glob',
    'model: inherit',
    '---',
    '',
    `You run the checks for ${oneLine(p.name) || 'this project'} and report back briefly. Do not change any files.`,
    '',
    'Run these, in order:',
    ...checks.map((c) => `- \`${c}\``),
    '',
    'For each failure, give the test or check, the error in a line or two, the file and line it points to, and the most likely cause. A command whose script or setup does not exist yet (such as "Missing script: test") is "not set up yet", not a failure. If everything passes, say so in one line. Do not paste whole logs.',
    '',
  ].join('\n');
}

/* ---------- data model: the things a project stores ---------- */
// fields are kept as text, one per line ("title: text"), so people can write them however they like
const splitFields = (s) => {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of str(s)) {
    if (ch === '(' || ch === '[' || ch === '{' || ch === '<') depth++;
    if (ch === ')' || ch === ']' || ch === '}' || ch === '>') depth = Math.max(0, depth - 1);
    if ((ch === ',' || ch === ';') && !depth) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim().replace(/\.$/, '').trim()).filter(Boolean);
};
// "title (text)" or "title - text" reads as "title: text"
const fieldOf = (t) => {
  t = unmd(t).replace(/^[-*]\s+/, '').trim();
  const m = /^([\w][\w .'-]{0,40}?)\s*\(([^()]+)\)$/.exec(t) || /^([\w][\w .'-]{0,40}?)\s+[-–—]\s+(.+)$/.exec(t);
  return m ? `${m[1].trim()}: ${m[2].trim()}` : t;
};
// one field as CLAUDE.md shows it: "title (text)"
const fieldShown = (l) => {
  const t = l.replace(/^[-*]\s+/, '').trim();
  const m = /^([^:()]{1,60}):\s*(.+)$/.exec(t);
  return m ? `${m[1].trim()} (${m[2].trim()})` : t;
};
// splits on commas, semicolons and (optionally) line ends that are not inside brackets
const splitTop = (s, newlines) => {
  const out = [];
  let d = 0; let ang = 0; let cur = ''; let prev = '';
  for (const ch of str(s)) {
    if ('([{'.includes(ch)) d++;
    else if (')]}'.includes(ch)) d = Math.max(0, d - 1);
    else if (ch === '<' && /\w/.test(prev)) ang++;
    else if (ch === '>' && ang && prev !== '=' && prev !== '-') ang--;
    if ((ch === ',' || ch === ';' || (newlines && ch === '\n')) && !d && !ang) { out.push(cur); cur = ''; } else cur += ch;
    prev = ch;
  }
  out.push(cur);
  return out.map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
};
// a line of a schema written as code: SQL, Prisma, TypeScript, Python (dataclass, Pydantic, Django, SQLAlchemy)
const codeField = (l) => {
  l = l.trim().replace(/[,;]+$/, '').trim();
  if (!l || /^(\/\/|#|--|@|\/\*|\*|"""|'''|\)|\}|primary\s+key|foreign\s+key|unique\b|constraint\b|index\b|key\s|check\s*\(|def\s|async\s+def\s|class\s|model_config|pass$|return\b|__\w+__)/i.test(l)) return '';
  let m = /^(?:(?:readonly|public|private|protected|export)\s+)*(\w+)(\?)?\s*:\s*(.+?)(?:\s*=(?!>)\s*.*)?$/.exec(l);
  if (m) return `${m[1]}: ${m[3].trim()}${m[2] ? ' (optional)' : ''}`;
  m = /^(\w+)\s*=\s*(?:\w+\.)*(\w+)\((.*)\)$/.exec(l); // title = models.CharField(max_length=200), id = Column(Integer, primary_key=True)
  if (m) { const first = splitTop(m[3])[0] || ''; return `${m[1]}: ${/^(Column|mapped_column)$/.test(m[2]) && first && !first.includes('=') ? first.replace(/^(\w+\.)+/, '') : m[2]}`; }
  m = /^[`"[]?(\w+)[`"\]]?\s+([A-Za-z][^=]*)$/.exec(l);
  return m ? `${m[1]}: ${m[2].trim()}` : '';
};
// the body between a { and its matching }
function braceBody(text, at) {
  let d = 0;
  for (let i = at; i < text.length; i++) { if (text[i] === '{') d++; else if (text[i] === '}' && --d === 0) return text.slice(at + 1, i); }
  return text.slice(at + 1);
}
const SQL_TABLE = /create\s+table\s+(?:if\s+not\s+exists\s+)?[`"[]?(?:\w+\.)?(\w+)[`"\]]?\s*\(([\s\S]*?)(?:\)\s*;|\n\s*\)[ \t]*(?=\n|$))/gi;
const BRACE_SHAPE = /\b(?:model\s+(\w+)\s*|(?:interface|class)\s+(\w+)[^{\n]*|type\s+(\w+)\s*=\s*)\{/g;
const PY_CLASS = /^class\s+(\w+)(?:\([^)]*\))?:[ \t]*\n((?:[ \t]+\S.*\n?|[ \t]*\n)+)/gm;
function codeEntities(blocks) {
  const out = [];
  const add = (name, body, newlines) => {
    if (out.length >= 20 || out.some((e) => e.name === name)) return;
    const fields = splitTop(body, newlines).filter((l) => !/^\s*create\s/i.test(l)).map(codeField).filter(Boolean);
    if (fields.length) out.push({ name, fields, notes: '' });
  };
  for (const b of blocks) {
    const text = b.lines.join('\n') + '\n';
    let m;
    SQL_TABLE.lastIndex = 0;
    while ((m = SQL_TABLE.exec(text))) add(m[1], m[2], true);
    BRACE_SHAPE.lastIndex = 0;
    while ((m = BRACE_SHAPE.exec(text))) add(m[1] || m[2] || m[3], braceBody(text, m.index + m[0].length - 1), true);
    PY_CLASS.lastIndex = 0;
    while ((m = PY_CLASS.exec(text))) {
      // fields come before the methods; docstrings are not fields
      const body = m[2].replace(/("""|''')[\s\S]*?\1/g, '').split('\n');
      const end = body.findIndex((l) => /^\s*(@|def\s|async\s+def\s|class\s)/.test(l));
      add(m[1], (end < 0 ? body : body.slice(0, end)).join('\n'), true);
    }
  }
  return out;
}
// the "Data model" section of a README, notes or a CLAUDE.md
function docEntities(s, title, items, base, lines, inModel) {
  const ents = codeEntities(mdBlocks(lines));
  if (ents.length) return ents;
  if (inModel && title) { // "### Recipe" under "## Data model" is one thing, its list its fields
    const fields = items.map((x) => fieldOf(x.text)).filter(Boolean);
    const notes = mdParas(lines).join(' ');
    return fields.length || notes ? [{ name: title, fields, notes: firstSentence(notes) }] : [];
  }
  let cur = null;
  for (const x of items) {
    if (x.depth === base) {
      cur = null;
      const [first, ...more] = (x.table ? x.text : x.body).split('\n');
      const [n, d] = splitTitle(unmd(first));
      if (!n || n.length > 40 || /[.!?]$/.test(n) || n.split(/\s+/).length > 4) continue;
      cur = { name: n, fields: splitFields(d).map(fieldOf), notes: more.map(unmd).join(' ').trim() };
      ents.push(cur);
    } else if (cur) cur.fields.push(fieldOf(x.text));
  }
  return ents.filter((e) => e.fields.length || e.notes);
}


// what an import found, in a few words for the toast
function importSummary(p) {
  const found = [];
  if (p.pitch.trim()) found.push('the pitch');
  if (p.stack.trim()) found.push('the stack');
  if (p.commands.trim()) found.push('commands');
  const rules = lines(p.conventions).length;
  if (rules) found.push(`${rules} ${rules === 1 ? 'rule' : 'rules'}`);
  if (p.features.length) found.push(`${p.features.length} ${p.features.length === 1 ? 'feature' : 'features'}`);
  const tasks = allTasks(p).length;
  if (tasks) found.push(`${tasks} ${tasks === 1 ? 'task' : 'tasks'}`);
  if (p.entities.length) found.push(`a data model of ${p.entities.length} ${p.entities.length === 1 ? 'thing' : 'things'}`);
  if (p.bugs.length) found.push(`${p.bugs.length} ${p.bugs.length === 1 ? 'bug' : 'bugs'}`);
  if (!found.length) return '';
  return found.length === 1 ? found[0] : found.slice(0, -1).join(', ') + ' and ' + found[found.length - 1];
}

/* ================= looking back on a milestone ================= */
// what happened while a milestone was built: when, its sessions, and what went wrong in them.
// Each problem is matched to the lesson its session made (same text), so a rule already added shows.
const ruleText = (rule) => oneLine(rule).replace(/^[-*]\s+/, '');
const hasRule = (p, rule) => { const r = ruleText(rule).toLowerCase(); return lines(p.conventions).some((l) => ruleText(l).toLowerCase() === r) || (p.claudeMdEdited && lines(p.claudeMd).some((l) => ruleText(l).toLowerCase() === r)); };
// a lesson whose rule CLAUDE.md has: added from here and unchanged since, or written there already
const lessonInMd = (p, l) => !!((l.promoted && (!l.rule || l.rule === ruleText(l.change))) || (!l.promoted && l.change.trim() && hasRule(p, l.change)));
const LESSON_FOLD_AT = 5; // this many lessons already in CLAUDE.md, and Improve folds them away
// older sessions keep only the start of a long note, ending in "…"
const sameNote = (full, kept) => { const a = str(full).trim(); const b = str(kept).trim(); return !!b && (a === b || (b.endsWith('…') && b.length > 20 && a.startsWith(b.slice(0, -1).trimEnd()))); };
const lessonOf = (p, s) => p.lessons.find((x) => x.sid === s.id) || p.lessons.find((x) => !x.sid && sameNote(x.happened, s.wrong));
function milestoneRecap(p, m) {
  const tids = new Set(m.tasks.flatMap(taskLineage)); // a session on a task that was split counts for the tasks it became
  const known = new Set(allTasks(p).flatMap(taskLineage));
  const sessions = p.sessions.filter((s) => (s.tid && known.has(s.tid) ? tids.has(s.tid) : s.mid === m.id));
  const days = [...m.tasks.map((t) => t.doneAt), ...sessions.map((s) => s.date)].filter(Boolean).sort();
  const n = (k) => sessions.filter((s) => s.outcome === k).length;
  const wrong = sessions.filter((s) => s.wrong.trim()).map((s) => {
    const l = lessonOf(p, s);
    return { sid: s.id, date: s.date, task: oneLine(s.task), text: oneLine(s.wrong), lesson: l?.id || '', rule: l?.promoted ? ruleText(l.rule || l.change) : '' };
  });
  return { tasks: m.tasks.length, titles: m.tasks.map((t) => oneLine(t.title)).filter(Boolean), from: days[0] || '', to: days.at(-1) || '', sessions: sessions.length, done: n('done'), partly: n('partly'), stuck: n('stuck'), wrong };
}
function recapLine(r) {
  const when = !r.from ? '' : r.from === r.to ? ` on ${dayLabel(r.from)}` : ` between ${dayLabel(r.from)} and ${dayLabel(r.to)}`;
  const how = [r.done && `${r.done} done`, r.partly && `${r.partly} partly done`, r.stuck && `${r.stuck} stuck`].filter(Boolean).join(', ');
  return `${plural(r.tasks, 'task', 'tasks')} done${when}. ${r.sessions ? `${plural(r.sessions, 'session', 'sessions')}: ${how}.` : 'No sessions logged.'}`;
}
// the recap as Markdown, for notes, a changelog or release notes
function milestoneRecapMd(p, m) {
  const r = milestoneRecap(p, m);
  const L = [`## Milestone ${p.milestones.indexOf(m) + 1}: ${oneLine(m.title) || 'Untitled'}`];
  const goal = sentence(oneLine(m.goal));
  if (goal) L.push('', goal[0].toUpperCase() + goal.slice(1));
  L.push('', recapLine(r));
  if (r.titles.length) L.push('', '### Done', ...r.titles.map((t) => `- ${t}`));
  if (r.wrong.length) L.push('', '### What went wrong', ...r.wrong.map((w) => `- ${w.date ? `${dayLabel(w.date)}, ` : ''}${w.task || 'a session'}: ${sentence(w.text)}${w.rule ? ` Rule since: ${sentence(w.rule)}` : ''}`));
  return L.join('\n') + '\n';
}

/* ================= text pasted from Claude Code ================= */
// In Claude Code's terminal each reply starts with ⏺ and every line under it is indented, so a copy carries both.
// The bullets go and the shared indent is taken off; anything else is left as it was.
function untermText(text) {
  const L = str(text).replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/^([ \t]*)[⏺●] ?/, '$1  '));
  const pads = L.filter((l) => l.trim()).map((l) => /^[ \t]*/.exec(l)[0].replace(/\t/g, '  ').length);
  const pad = pads.length ? Math.min(...pads) : 0;
  return pad ? L.map((l) => { let k = 0; let i = 0; while (i < l.length && k < pad && (l[i] === ' ' || l[i] === '\t')) { k += l[i] === '\t' ? 2 : 1; i++; } return l.slice(i); }).join('\n') : L.join('\n');
}

/* ================= session report ================= */
// "nothing", "None.", "Nothing major - it went fine", "No issues found": nothing went wrong. "None of the tests ran" is a problem,
// and so is "Nothing major. One flaky test needed a re-run." or "None, though npm audit warns": what follows says what happened
const NOTHING_HEAD = /^(?:nothing|none|no|n\/a|nil|-|—)(?:\s+(?:significant|major|notable|important|serious|much|really|in particular|of note|to report|went wrong|found|so far|this time|at all|issues|problems|errors|bugs))*\s*(?=[—–\-,:;.!(]|$)/i;
const FINE_WORDS = /\b(?:fine|well|smooth(?:ly)?|ok|okay|good|great|clean(?:ly)?|green|expected|planned|passed|pass(?:es|ing)?|worked|works)\b/i;
const NOT_FINE = /\b(?:but|though|although|however|except|apart|besides|aside|other than|only|fail\w*|flak\w*|errors?|warn\w*|re-?r[au]n\w*|retr\w+|broke\w*|vulnerab\w*|issues?|problems?|bugs?|slow\w*|timed? ?out|crash\w*|missing|skipp\w*|not|\w+n't|wrong|stuck|manual(?:ly)?|workaround)\b/i;
function saysNothing(x) {
  const m = NOTHING_HEAD.exec(x);
  if (!m) return /^[—–\-.!]*$/.test(x);
  const rest = x.slice(m[0].length).replace(/^[\s—–\-,:;.!(]+|[\s.!)]+$/g, '');
  return !rest || (FINE_WORDS.test(rest) && !NOT_FINE.test(rest));
}
// after "done": words that take some of it back ("done, but 2 tests fail", "done except the README")
const DONE_BUT = /\b(but|except|apart from|aside from|other than|not yet|yet to|still (?:fails?|failing|broken|missing|needs?|to do))\b|\b[1-9]\d*\s+(?:\w+\s+)?(?:fail\w*|errors?|broken|skipped)\b/i;
const OUTCOME_WORDS = [[/^(not done|not finished|not complete|not completed|incomplete|unfinished|blocked|stuck|failed)\b/i, 'stuck'], [/^(partly done|partially done|partially|partial|partly|mostly done|half done|in progress|ongoing|waiting|awaiting|pending|paused|on hold)\b/i, 'partly'], [/^(done|complete|completed|finished|succeeded|success|all done|fixed|resolved|shipped|works|working|task (?:is )?(?:done|complete|completed|finished))\b/i, 'done']];
// the "Outcome:" and "Went wrong:" lines prompts ask Claude Code to end with; Markdown bold and list markers are fine, the last of each wins
// the summary without its Outcome and Went wrong lines, which a history line gives in its own words
function reportBody(text) {
  const keep = [];
  let open = false;
  let outNext = false;
  let got = 0;
  for (const raw of untermText(text).split('\n')) {
    const l = raw.trim().replace(/^(?:[-*•>⏺●]\s*)+/, '').trim().replace(/^["'“‘`]+(?=[*_#\s]*(?:outcome|(?:what\s+)?went wrong)\b)/i, '');
    const head = /^(?:#{1,6}\s*|[*_]{2})\s*(outcome|(?:what\s+)?went wrong)\s*[*_]*\s*:?\s*[*_]*$/i.exec(l);
    if (head) { outNext = /outcome/i.test(head[1]); open = !outNext; got = 0; continue; }
    if (outNext && l) { outNext = false; continue; }
    if (/^[*_#\s]*outcome[*_]*\s*(?::|[-–—])/i.test(l)) { open = false; continue; }
    const w = /^[*_#\s]*(?:what\s+)?went wrong[*_]*\s*(?::|[-–—])(?:[*_]+(?=\s|$))?\s*(.*?)\s*$/i.exec(l);
    if (w) { open = true; got = w[1].replace(/^\*+|\*+$/g, '').trim() ? 1 : 0; continue; }
    if (open) { if (l) got++; else if (got) open = false; continue; }
    keep.push(raw);
  }
  return untermText(keep.join('\n')).trim();
}
function sessionReport(text) {
  let outcome = '';
  let wrong = null; // the "Went wrong" items: a line, the lines it wraps onto, or the bullets under it
  let open = false;
  let outNext = false; // "## Outcome" as a heading: the next line says how it went
  let unread = ''; // an Outcome line in words it does not know
  const done = () => { open = false; };
  const outcomeOf = (v) => {
    const x = v.replace(/^[\s*_`"'“”‘’\p{Extended_Pictographic}\uFE0F\u200D]+/u, '');
    const k = OUTCOME_WORDS.find(([re]) => re.test(x))?.[1] || '';
    return k === 'done' && DONE_BUT.test(x) ? 'partly' : k;
  };
  for (const raw of untermText(text).split('\n')) {
    const bullet = /^\s*(?:[-*•+]|\d+[.)])\s+/.test(raw);
    const l = raw.trim().replace(/^(?:[-*•>⏺●]\s*)+/, '').trim().replace(/^["'“‘`]+(?=[*_#\s]*(?:outcome|(?:what\s+)?went wrong)\b)/i, '');
    const head = /^(?:#{1,6}\s*|[*_]{2})\s*(outcome|(?:what\s+)?went wrong)\s*[*_]*\s*:?\s*[*_]*$/i.exec(l);
    if (head) { done(); if (/outcome/i.test(head[1])) outNext = true; else { wrong = []; open = true; } continue; }
    if (outNext && l) { outNext = false; outcome = outcomeOf(l) || outcome; continue; }
    const o = /^[*_#\s]*outcome[*_]*\s*(?::|[-–—])\s*(.*)$/i.exec(l);
    if (o) { outcome = outcomeOf(o[1]) || outcome; if (!outcomeOf(o[1]) && o[1].trim()) unread = o[1].trim(); done(); continue; }
    const w = /^[*_#\s]*(?:what\s+)?went wrong[*_]*\s*(?::|[-–—])(?:[*_]+(?=\s|$))?\s*(.*?)\s*$/i.exec(l);
    if (w) { const v = w[1].replace(/^\*+|\*+$/g, '').trim(); wrong = v ? [v] : []; open = true; continue; }
    if (!open) continue;
    if (!l) { if (wrong.length) done(); continue; } // a blank line ends it, unless nothing has been read yet
    // so does a question after it ("Want me to commit this?"), and a new sentence after "nothing"
    if (!bullet && wrong.length && /^[A-Z]/.test(l) && (/\?["'”’`*_)]*$/.test(l) || (wrong.length === 1 && saysNothing(wrong[0].trim().replace(/^["'“‘`]+|["'”’`]+$/g, ''))))) { done(); continue; }
    if (bullet || !wrong.length) wrong.push(l.replace(/^\*+|\*+$/g, ''));
    else wrong[wrong.length - 1] += ' ' + l; // the terminal wrapped the line
  }
  const items = (wrong || []).map((x) => x.trim().replace(/^["'“‘`]+|["'”’`]+$/g, '').trim()).filter((x) => x && !saysNothing(x));
  return { outcome, ...(!outcome && unread ? { unread } : {}), wrong: items.length > 1 ? items.map((x) => '- ' + x).join('\n') : items[0] || '' };
}

/* ================= what's new ================= */
const WN_VER = 15; // bump with each published version that has something to tell
const LS_SEEN = 'shipyard.seen.v1';
// a returning viewer who has not opened this version's list sees a dot; someone with no projects yet has nothing to compare with
function newDot(seen, ver, count) { return count > 0 && !(Number(seen) >= ver); }

/* ================= describing a project that already exists ================= */
// a prompt that has Claude Code read the code and write a description Shipyard imports; the mark tells the importer what it is
const SURVEY_MARK = '<!-- shipyard:survey -->';
const SURVEY_FILE = 'shipyard-import.md';
function surveyPrompt() {
  return [
    `Look through this project's code, docs and git history, then describe the project in a new file, ${SURVEY_FILE}, in this folder. I will import it into Shipyard Planner, the app I plan the project in. Do not change any other file.`,
    'Do not open .env files or other files that hold secrets, and never copy a key, token or password into the file.',
    '',
    'Write the file in exactly this shape, starting with the comment line as written. Replace each line with what you find, and leave out a section when you find nothing for it. Keep each line short, and write only what the code, docs or history show.',
    '',
    SURVEY_MARK,
    '# The project\'s name',
    '',
    'One sentence on what it is and what it does.',
    '',
    '## Who it is for',
    'One sentence, if the docs say.',
    '',
    '## Repository',
    'The address from `git remote get-url origin`, without any username or token in it, if there is one.',
    '',
    '## Already in the folder',
    '- Each of these that is already in this folder, one per line: CLAUDE.md, PLAN.md, .claude/settings.json, .claude/commands, .claude/agents',
    '',
    '## Tech stack',
    '- A language, framework, library or service it uses',
    '',
    '## Commands',
    '- Install: `the command`',
    '- Run: `the command`',
    '- Test: `the command`',
    '- Build: `the command`',
    '',
    '## Features',
    '- [x] A feature that works today: one line on what it does',
    '- [ ] A feature that is started or planned but does not work yet: one line on what it will do when it is finished (what is left to build goes under Next steps)',
    '',
    '## Data model',
    '- Thing it stores: field, field, field',
    '',
    '## Conventions',
    '- A rule the code follows, such as how files are named or where tests go',
    '',
    '## Known issues',
    '- A bug or problem you found: one line on what goes wrong',
    '',
    '## Next steps',
    '- [ ] A piece of work worth doing next, small enough for one Claude Code session (not the fix for a known issue: that stays under Known issues)',
    '',
    'When the file is saved, reply with one line saying so, and remind me to delete it once I have imported it.',
    '',
  ].join('\n');
}
const SURVEY_RE = /<!--\s*shipyard\s*:\s*survey\s*-->/i;
const SURVEY_H2 = ['who it is for', 'repository', 'already in the folder', 'tech stack', 'commands', 'features', 'data model', 'conventions', 'known issues', 'next steps'];
// by its first line, written loosely, or by most of its headings when that line is missing
const isSurvey = (text) => SURVEY_RE.test(str(text)) || new Set((str(text).match(/^\s*##[ \t]+.+$/gm) || []).map((x) => x.replace(/^\s*##[ \t]+/, '').trim().toLowerCase()).filter((x) => SURVEY_H2.includes(x))).size >= 6;
// "None found" and lines of the template left as they were say nothing about the project
const SURVEY_FILLER = /^\(?(?:(?:none|nothing|n\/a|nil|tbd|unknown|-|—)(?:\s+(?:found|identified|known|yet|so far|noted|to report|seen|detected|stored|at the moment))?|no(?:\s+known)?\s+(?:issues|bugs|problems|tests|features|commands|conventions|data|data model)(?:\s+(?:found|identified|known|yet|so far))?|not (?:found|known|applicable))(?:\s+in\s+[\w ,'-]+)?\.?\)?\.?$/i;
const surveyNorm = (l) => str(l).trim().replace(/^(?:[-*+]|\d+[.)])\s+/, '').replace(/^\[[ xX~]\]\s+/, '').trim().replace(/^([*_])\1?(.*?)\1\1?$/, '$2').trim().toLowerCase();
function surveyClean(text) {
  const tpl = new Set(surveyPrompt().split('\n').filter((l) => l.trim() && !/^##\s/.test(l)).map(surveyNorm));
  let fence = false;
  return str(text).split('\n').filter((l) => {
    if (FENCE.test(l) && fenceStep(fence, l) !== fence) fence = fenceStep(fence, l);
    if (fence || /^\s*#{2,6}\s/.test(l)) return true;
    const n = surveyNorm(l);
    return !n || !(tpl.has(n) || SURVEY_FILLER.test(n));
  }).join('\n');
}
// the description from the mark on; a reply that wraps it in a code block loses the block's last fence and anything after it
function surveyBody(text) {
  const t = str(text).replace(/\r\n?/g, '\n');
  const mk = SURVEY_RE.exec(t);
  if (!mk) return t;
  const i = mk.index;
  let b = t.slice(i + mk[0].length).replace(/^[ \t]*\n/, '');
  const before = t.slice(0, i).split('\n').filter((l) => l.trim());
  const open = before.length ? /^\s*(`{3,}|~{3,})[\w-]*\s*$/.exec(before.at(-1)) : null;
  if (open) {
    const L = b.split('\n');
    const close = L.findLastIndex((l) => l.trim().startsWith(open[1][0].repeat(open[1].length)) && /^\s*(`{3,}|~{3,})\s*$/.test(l));
    if (close >= 0) b = L.slice(0, close).join('\n');
  }
  return b.replace(/\s+$/, '') + '\n';
}

/* ================= health ================= */
function autoChecks(p) {
  const tasks = allTasks(p);
  const mustAll = p.features.filter((f) => f.priority === 'must');
  const must = p.fromCode ? mustAll.filter((f) => f.status !== 'done') : mustAll; // a project that exists counts only what is left to build
  const bigOpen = tasks.filter((t) => t.status !== 'done' && t.size === 'L').length;
  const doing = tasks.filter((t) => t.status === 'doing').length;
  const un = unplannedMust(p);
  return [
    { k: 'brief', ok: !!(p.pitch.trim() && p.audience.trim() && p.doneWhen.trim()), label: 'The brief says who it is for and when it is done', fix: 'Fill in Pitch, Who it is for and Done when on the Overview tab.', tab: 'overview' },
    { k: 'must', ok: mustAll.length > 0 && must.length <= 7, label: must.length > 7 ? `${must.length} must-have features ${p.fromCode ? 'still to build is a lot at once' : 'is a lot for a first version'}` : 'Must-have features are picked', fix: must.length > 7 ? 'Move some to Should have. Seven or fewer must-haves ships sooner.' : 'On the Design tab, mark what the first version cannot ship without as Must have.', tab: 'design' },
    { k: 'plan', ok: ownTasks(p).length > 0 && !un.length, label: un.length ? `${un.length} must-have ${un.length === 1 ? 'feature has' : 'features have'} no tasks yet` : 'The plan has tasks that build the project', fix: un.length ? `Press Plan it on ${un.length === 1 ? 'it' : 'each one'} on the Design tab, starting with "${oneLine(un[0].title)}".` : tasks.length ? 'The starting point only sets the project up and ships it. Add tasks that build its features: Plan it on the Design tab, or add them on the Plan tab.' : 'Add a milestone with a few tasks on the Plan tab.', tab: un.length ? 'design' : 'plan' },
    { k: 'size', ok: tasks.length > 0 && bigOpen === 0, label: bigOpen ? `${bigOpen} large ${bigOpen === 1 ? 'task is' : 'tasks are'} still unsplit` : 'No large tasks waiting to be split', fix: tasks.length ? 'Press Split on each large task to turn it into ones Claude Code can finish in a single session.' : 'Add a few tasks on the Plan tab first.', tab: 'plan' },
    { k: 'cmds', ok: !!p.commands.trim(), label: 'Run and test commands are written down', fix: 'Add them under How to run and test, so Claude can check its own work.', tab: 'overview' },
    { k: 'focus', ok: tasks.length > 0 && doing <= 2, label: doing > 2 ? `${doing} tasks are in progress at once` : 'Two or fewer tasks in progress', fix: tasks.length ? 'Finish them, or put the ones that stopped back in To do (Back to To do is on Next up, and in a task\'s notes on the Plan tab).' : 'Add a few tasks on the Plan tab first.', tab: 'plan' },
  ];
}
function health(p) {
  const a = autoChecks(p);
  const okA = a.filter((c) => c.ok).length;
  const okH = HABITS.filter((h) => p.checks[h.k]).length;
  return { auto: a, ok: okA + okH, total: a.length + HABITS.length };
}

/* ================= state ================= */
const ui = obj(lsGet(LS_UI));
const S = {
  chatLive: {}, askDraft: {},
  findQ: '', // the words last looked for in Find
  projects: new Map(),
  role: null, // who is looking: 'owner', 'editor' (shared with them to edit), 'guest' (to view only) or null (not told)
  activeId: typeof ui.activeId === 'string' ? ui.activeId : null,
  tab: TABS.some((t) => t.k === ui.tab) ? ui.tab : 'overview',
  repoFile: typeof ui.repoFile === 'string' ? ui.repoFile : 'claudemd',
  view: ui.view === 'all' ? 'all' : 'project',
  loaded: false,
  mode: 'loading',
  saveProblem: null,
  sample: null,
  claudeOff: false,
  downloads: null,
  busy: {},
  proposals: {},
  confirm: null,
  openNotes: new Set(),
  openSessions: new Set(), // sessions whose notes are shown in full
  allLessons: false, // lessons already in CLAUDE.md shown too
  promotedNow: new Set(), // lessons added to CLAUDE.md on this visit, kept in sight
  openMs: new Set(), // finished milestones shown open
  openRun: new Set(), // milestones whose first done tasks are shown
  runCap: new Map(), // how many leading done tasks may fold, per milestone: settled when the Plan first shows it, so nothing folds under the cursor
  // the task, bug or ready-made prompt copied last, so Log a session starts there, after a reload too
  lastPrompt: isPlain(ui.lastPrompt) && typeof ui.lastPrompt.pid === 'string' ? { pid: ui.lastPrompt.pid, mid: str(ui.lastPrompt.mid), tid: str(ui.lastPrompt.tid), bid: str(ui.lastPrompt.bid), what: str(ui.lastPrompt.what) } : null,
  modal: null,
  focusAfter: null,
};
const active = () => S.projects.get(S.activeId) || null;
const canAsk = () => !!S.sample && !S.claudeOff;
const filling = (id) => !!S.busy[id + ':fill'];
const drafting = (id) => !!(S.busy[id + ':plan'] || S.busy[id + ':features']);
function saveUI() { lsSet(LS_UI, { activeId: S.activeId, tab: S.tab, repoFile: S.repoFile, view: S.view, lastPrompt: S.lastPrompt || null }); }
// the example project already made, if it is still around and not archived
const exampleId = () => sortedProjects().find(([, x]) => x.example && !x.archived)?.[0] || '';
// the one changed most recently first, as on All projects. Each project keeps the place it had when it was first seen in
// this page, so the list does not jump while you work; a project made here goes to the top
const railAt = new Map();
function sortedProjects() {
  const at = ([id, p]) => { if (!railAt.has(id)) railAt.set(id, str(p.updatedAt) || str(p.createdAt)); return railAt.get(id); };
  return [...S.projects.entries()].sort((a, b) => at(b).localeCompare(at(a)) || str(b[1].createdAt).localeCompare(str(a[1].createdAt)));
}
function pickActive() {
  if (!S.projects.has(S.activeId)) { const all = sortedProjects(); S.activeId = (all.find(([, p]) => !p.archived) || all[0])?.[0] || null; }
}
function idOf(p) { for (const [id, x] of S.projects) if (x === p) return id; return null; }

/* ================= storage ================= */
// db mode: one document per project in the "projects" collection. For each project the page keeps
// a "base": the last version the store confirmed. Local edits are the differences from the base and
// are written with update(). When another device's change arrives, each field is merged three ways
// (base, local, incoming); lists of items with ids merge item by item, so two people editing
// different tasks or features both keep their changes.
const LS_PENDING = 'shipyard.pending.v1';
const LS_MIRROR = 'shipyard.mirror.v1'; // set once this browser keeps a copy of the account's projects
const LS_UNCLAIMED = 'shipyard.unclaimed.v1'; // projects made in this browser before it reached the account, until added or removed
const WRITE_LIMIT = 15000; // a write with no answer by then counts as failed and is tried again

// What came in from elsewhere (another device, or someone the project is shared with) since this browser last showed a
// project. Each project keeps the tasks, done tasks, sessions, bugs and fixed bugs this browser has seen, and what arrived
// since, until "Got it". Edits made here count as seen. A project seen here for the first time is measured against the
// copy this browser kept from its last visit, when there is one
const LS_AWAY = 'shipyard.away.v1';
const Away = {
  mem: null, // the stored records, as last read or written here
  seenSets: new Map(), // project id -> what it has seen, for the quick check on each edit
  kept: undefined, // this browser's copy of the projects from its last visit, read once
  read() { this.mem = obj(lsGet(LS_AWAY)); this.seenSets.clear(); return this.mem; },
  rec(id) { const r = (this.mem || this.read())[id]; return isPlain(r) ? r : null; },
  tokens(p) {
    const out = [];
    for (const t of allTasks(p)) { out.push('t:' + t.id); if (t.status === 'done') out.push('d:' + t.id); }
    for (const s of p.sessions) out.push('s:' + s.id);
    for (const b of p.bugs) { out.push('b:' + b.id); if (b.status === 'fixed') out.push('f:' + b.id); }
    return out;
  },
  save(id, r, now) {
    if (arr(r.seen).length > 2 * now.length + 200) r.seen = [...new Set([...now, ...arr(r.unseen)])]; // forget what was deleted long ago
    this.mem[id] = r;
    this.seenSets.delete(id);
    lsSet(LS_AWAY, this.mem);
  },
  // an edit made here: whatever it added has been seen
  mine(id, p) {
    if (!id || p.example) return;
    let seen = this.seenSets.get(id);
    if (!seen) { const r = this.rec(id); seen = new Set(r ? arr(r.seen).map(str) : []); this.seenSets.set(id, seen); }
    const now = this.tokens(p);
    if (now.every((k) => seen.has(k))) return;
    this.read(); // another tab may have written since
    const r = this.rec(id) || { seen: [], unseen: [] };
    r.seen = [...new Set([...arr(r.seen).map(str), ...now])];
    this.save(id, r, now);
  },
  // a project that arrived or changed from elsewhere: returns what is new
  check(id) {
    const p = S.projects.get(id);
    if (!p || p.example) return [];
    this.read();
    let r = this.rec(id);
    const now = this.tokens(p);
    if (!r) {
      if (this.kept === undefined) this.kept = obj(lsGet(LS_DATA));
      let old = null;
      try { old = this.kept[id] ? normalize(clone(this.kept[id])) : null; } catch { old = null; }
      r = { seen: old ? this.tokens(old) : now, unseen: [] };
    }
    const seen = new Set(arr(r.seen).map(str));
    const fresh = now.filter((k) => !seen.has(k));
    if (!fresh.length && this.mem[id] === r) return [];
    r.seen = [...seen, ...fresh];
    const un = arr(r.unseen).map(str);
    r.unseen = [...un, ...fresh.filter((k) => !un.includes(k))].slice(-80);
    this.save(id, r, now);
    return fresh;
  },
  // what came in that is still there, grouped
  news(id, p) {
    const r = p && !p.example && this.rec(id);
    if (!r || !arr(r.unseen).length) return null;
    const un = new Set(arr(r.unseen).map(str));
    const g = { done: [], added: [], sessions: [], bugs: [], fixed: [] };
    for (const t of allTasks(p)) { if (t.status === 'done' && un.has('d:' + t.id)) g.done.push(t); else if (un.has('t:' + t.id)) g.added.push(t); }
    for (const s of p.sessions) if (un.has('s:' + s.id)) g.sessions.push(s);
    for (const b of p.bugs) { if (b.status === 'fixed' && un.has('f:' + b.id)) g.fixed.push(b); else if (un.has('b:' + b.id)) g.bugs.push(b); }
    g.sessions.reverse(); // newest first, as on Improve
    const n = g.done.length + g.added.length + g.sessions.length + g.bugs.length + g.fixed.length;
    return n ? { ...g, n } : null;
  },
  has(id, k) { const r = this.rec(id); return !!r && arr(r.unseen).includes(k); },
  clear(id) { this.read(); const r = this.rec(id); if (r && arr(r.unseen).length) { r.unseen = []; this.save(id, r, arr(r.seen)); } },
  drop(id) { this.read(); if (id in this.mem) { delete this.mem[id]; this.seenSets.delete(id); lsSet(LS_AWAY, this.mem); } },
  put(id, r) { if (!r) return; this.read(); this.mem[id] = r; this.seenSets.delete(id); lsSet(LS_AWAY, this.mem); }, // Undo of a delete
};
window.addEventListener('storage', (e) => { if (e.key === LS_AWAY) Away.read(); }); // "Got it" in another tab
// "3 tasks done, 1 bug reported"
function awayParts(n) {
  return [n.done.length && plural(n.done.length, 'task done', 'tasks done'), n.sessions.length && plural(n.sessions.length, 'session logged', 'sessions logged'),
    n.bugs.length && plural(n.bugs.length, 'bug reported', 'bugs reported'), n.fixed.length && plural(n.fixed.length, 'bug fixed', 'bugs fixed'),
    n.added.length && plural(n.added.length, 'task added', 'tasks added')].filter(Boolean);
}
function awayHTML(p) {
  const n = Away.news(S.activeId, p);
  if (!n) return '';
  const names = (xs) => (xs.length <= 3 ? xs.join('; ') : `${xs.slice(0, 3).join('; ')} and ${xs.length - 3} more`);
  const li = (label, xs, f) => (xs.length ? `<li><b>${label} (${xs.length}):</b> ${esc(names(xs.map(f)))}</li>` : '');
  const task = (t) => oneLine(t.title) || 'Untitled task';
  const bug = (b) => oneLine(b.title) || 'Untitled bug';
  return `<section class="panel away" aria-labelledby="away-h">
      <div class="panel-head"><h2 id="away-h" tabindex="-1">New since you last looked</h2><p>Changed on another device, or by someone you share the project with, since this browser last showed it.</p></div>
      <ul class="away-list">
        ${li('Done', n.done, task)}
        ${li('Sessions logged', n.sessions, (s) => `${oneLine(s.task) || 'Untitled task'} (${(OUTCOMES.find((o) => o.k === s.outcome)?.short || '').toLowerCase()})`)}
        ${li('Bugs reported', n.bugs, bug)}
        ${li('Bugs fixed', n.fixed, bug)}
        ${li('Tasks added', n.added, task)}
      </ul>
      <div class="row"><button type="button" class="btn sm" data-act="away-ok">Got it</button></div>
    </section>`;
}
const newTag = '<span class="new-tag" title="New since you last looked">New</span>';
const NO_LOCAL_SAVE = 'Shipyard cannot save in this browser. Before you close this tab, use Back up all projects and copy or download the file.';
const UNREADABLE_KEPT = 'The projects saved in this browser could not be read. They were put aside unchanged, and this browser starts afresh.';
const UNREADABLE_STUCK = 'The projects saved in this browser could not be read, and there is no room to put them aside, so nothing new is saved here. Before you close this tab, use Back up all projects and copy or download the file.';
// when the browser is full, the project taking the most room is the one to move out
function roomNote() {
  let big = null; let all = 0;
  for (const p of S.projects.values()) { const n = JSON.stringify(p).length; all += n; if (!big || n > big.n) big = { p, n }; }
  return big && all > 1e6 ? ` "${oneLine(big.p.name) || 'Untitled project'}" takes the most room (${(big.n / 1e6).toFixed(1)} MB): export it, then delete it here.` : '';
}

function isItemList(v) { return Array.isArray(v) && v.every((x) => x && typeof x === 'object' && !Array.isArray(x) && typeof x.id === 'string'); }
function isPlain(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
// the ids x shares with y, in x's order
function sharedOrder(x, y) { const ys = new Set(arr(y).map((i) => i.id)); return arr(x).filter((i) => ys.has(i.id)).map((i) => i.id); }
function merge3(b, l, r) {
  if (same(l, r)) return clone(l);
  if (same(l, b)) return clone(r);
  if (same(r, b)) return clone(l);
  if (isItemList(l) && isItemList(r) && (b === undefined || b === null || isItemList(b))) {
    const bm = new Map(arr(b).map((x) => [x.id, x]));
    const lm = new Map(l.map((x) => [x.id, x]));
    const rm = new Map(r.map((x) => [x.id, x]));
    const pick = (id) => {
      const inB = bm.has(id); const inL = lm.has(id); const inR = rm.has(id);
      if (inL && inR) return merge3(bm.get(id), lm.get(id), rm.get(id));
      if (inL) return inB && same(lm.get(id), bm.get(id)) ? null : clone(lm.get(id)); // removed there unless edited here
      if (inR) return inB && same(rm.get(id), bm.get(id)) ? null : clone(rm.get(id)); // removed here unless edited there
      return null;
    };
    // keep the order of the side that rearranged the list; when neither or both did, this device's order
    const moved = (x) => b != null && !same(sharedOrder(x, b), sharedOrder(b, x));
    const [main, other, mainIds] = moved(r) && !moved(l) ? [r, l, rm] : [l, r, lm];
    const out = [];
    for (const x of main) { const v = pick(x.id); if (v) out.push(v); }
    other.forEach((x, i) => {
      if (mainIds.has(x.id)) return;
      const v = pick(x.id);
      if (!v) return;
      let at = 0;
      for (let j = i - 1; j >= 0; j--) { const k = out.findIndex((y) => y.id === other[j].id); if (k >= 0) { at = k + 1; break; } }
      out.splice(at, 0, v);
    });
    return out;
  }
  if (isPlain(l) && isPlain(r) && (b == null || isPlain(b))) {
    const o = {};
    for (const k of new Set([...Object.keys(l), ...Object.keys(r)])) {
      const v = merge3(b?.[k], l[k], r[k]);
      if (v !== undefined) o[k] = v;
    }
    return o;
  }
  return clone(l); // both sides changed the same value: this device's edit wins
}
// texts kept one item per line: when both devices changed one, each device's added lines are kept and its removed lines
// dropped, in this device's order, with the other device's new lines placed after the line they followed there
const LINE_FIELDS = new Set(['conventions', 'constraints', 'commands', 'stack', 'claudeMd']);
function mergeLines(b, l, r) {
  const split = (t) => String(t ?? '').split('\n');
  const B = split(b); const L = split(l); const R = split(r);
  const count = (xs) => xs.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map());
  const cb = count(B); const cl = count(L); const cr = count(R);
  const n = (m, x) => m.get(x) || 0;
  const out = [];
  const dropped = new Map();
  for (const x of L) { // a line the other device removed goes too, but not a copy this device added
    const can = Math.min(Math.max(0, n(cb, x) - n(cr, x)), Math.min(n(cl, x), n(cb, x)));
    if (n(dropped, x) < can) { dropped.set(x, n(dropped, x) + 1); continue; }
    out.push(x);
  }
  const seen = new Map();
  const mine = (x) => n(cl, x) > n(cb, x); // a line this device added
  R.forEach((x, i) => { // a line the other device added goes after the line it follows there, and after this device's new lines
    seen.set(x, n(seen, x) + 1);
    const addR = n(cr, x) - n(cb, x);
    if (!x.trim() || addR <= 0 || n(seen, x) <= n(cr, x) - addR) return; // blank, or it was there before
    if (n(seen, x) - (n(cr, x) - addR) <= Math.max(0, n(cl, x) - n(cb, x))) return; // this device added the same line
    let at = -1;
    for (let j = i - 1; j >= 0; j--) { if (!R[j].trim()) continue; const k = out.lastIndexOf(R[j]); if (k >= 0) { at = k + 1; break; } }
    if (at < 0) at = i === 0 ? 0 : out.length;
    while (at > 0 && at < out.length && out[at].trim() && mine(out[at]) && !R.includes(out[at])) at++;
    if (at === out.length) while (at > 0 && !out[at - 1].trim()) at--; // before the blank lines at the end
    if (/^#/.test(x) && at > 0 && out[at - 1].trim()) out.splice(at++, 0, ''); // a heading gets its blank line
    out.splice(at, 0, x);
  });
  return out.join('\n');
}
// where each task is, by id, across a project's milestones
function taskPlaces(ms) { const m = new Map(); for (const x of arr(ms)) for (const t of arr(x?.tasks)) if (t?.id) m.set(t.id, { mid: x.id, t }); return m; }
// after merging milestones: a task is in one place only (where a device moved it, with both devices' changes), and a task
// split on one device gives way to its parts
function oneTaskEach(out, b, l, r) {
  const B = taskPlaces(b); const L = taskPlaces(l); const R = taskPlaces(r);
  const at = new Map();
  for (const m of out) for (const t of arr(m.tasks)) { if (!at.has(t.id)) at.set(t.id, []); at.get(t.id).push(m); }
  for (const [id, list] of at) {
    if (list.length < 2) continue;
    const bm = B.get(id)?.mid; const lm = L.get(id)?.mid; const rm = R.get(id)?.mid;
    const where = lm && lm !== bm ? lm : rm && rm !== bm ? rm : lm || rm;
    const keep = list.find((m) => m.id === where) || list[0];
    const both = L.has(id) && R.has(id) ? merge3(B.get(id)?.t, L.get(id).t, R.get(id).t) : null;
    let kept = false;
    for (const m of list) {
      for (let k = m.tasks.length - 1; k >= 0; k--) {
        if (m.tasks[k].id !== id) continue;
        if (m === keep && !kept) { if (both) m.tasks[k] = both; kept = true; } else m.tasks.splice(k, 1);
      }
    }
  }
  const replaced = new Set();
  for (const m of out) for (const t of arr(m.tasks)) String(t.splitFrom || '').split(' ').filter(Boolean).forEach((x) => replaced.add(x));
  for (const m of out) if (Array.isArray(m.tasks)) m.tasks = m.tasks.filter((t) => !(replaced.has(t.id) && (!L.has(t.id) || !R.has(t.id))));
  return out;
}
// merges one field of a project changed on two devices
function mergeField(k, b, l, r) {
  if (LINE_FIELDS.has(k) && typeof l === 'string' && typeof r === 'string' && !same(l, r) && !same(l, b) && !same(r, b)) return mergeLines(b, l, r);
  const out = merge3(b, l, r);
  return k === 'milestones' && Array.isArray(out) && !same(l, r) && !same(l, b) && !same(r, b) ? oneTaskEach(out, b, l, r) : out;
}
const sameProject = (a, b) => !!a && !!b && FIELDS.every((k) => k === 'updatedAt' || same(a[k], b[k]));

// Who is looking. The store's rules let only the owner and editors read or write projects, so someone the planner is
// shared with to view gets a planner of their own in this browser. Only a definite "cannot write" makes a guest: a
// host that says nothing leaves things as they were
async function viewerRole() {
  try {
    const u = window.claude?.use ? await window.claude.use('user') : null;
    if (!u) return null;
    if (await u.isOwner()) return 'owner';
    if (await u.canEdit()) return 'editor';
    return (await u.can('data.write')) === false ? 'guest' : null;
  } catch { return null; }
}

const Store = {
  col: null, unsub: null, subTries: 0, fresh: true,
  base: {}, timers: {}, writing: {}, dirty: {}, firstDirty: {}, inflight: {}, retries: {}, sending: {}, touched: {}, problems: {}, writeLog: {},
  deleted: new Set(), pendingChecked: false, syncing: new Set(), mirrorTimer: null, parked: new Set(), parkFailed: false, removing: {},
  // browser-only mode: lsBase is the last copy of each project this tab read from or wrote to the browser;
  // offlineBase is what the store held when the connection went, kept to merge offline edits back later
  localTimer: null, localDirty: new Set(), localDeleted: new Map(), lsBase: {}, lsSeen: new Set(), offlineBase: {}, fallback: false,

  async init() {
    let db = null;
    const roleP = viewerRole();
    try { db = window.claude?.use ? await window.claude.use('db') : null; } catch { db = null; }
    if (!db) { this.offline(); return; }
    const role = await Promise.race([roleP, new Promise((r) => setTimeout(() => r('late'), 1500))]);
    S.role = role === 'late' ? null : role;
    if (role === 'late') roleP.then((r) => { S.role = r; if (r === 'guest' && S.mode === 'db' && !Object.keys(this.base).length) this.asGuest(); else renderStoreNote(); });
    try {
      this.col = db.collection('projects');
    } catch { this.offline(); return; }
    S.mode = 'db';
    this.subscribe();
    renderStoreNote();
    for (const id of Object.keys(this.dirty)) if (this.dirty[id]) this.flush(id); // made while connecting
  },

  // no store on this visit. When this browser keeps a copy of the account's projects, changes made now are marked to
  // sync, as when the connection drops during a visit, and the next visit that reaches the store saves them
  offline() {
    if (lsGet(LS_MIRROR)) {
      this.fallback = true;
      this.claims = obj(lsGet(LS_UNCLAIMED));
      toast('Could not reach your saved projects, so this shows the copy kept in this browser. Changes you make are kept here and saved to your account the next time the page connects.');
    }
    this.useLocal();
  },

  subscribe() {
    try { this.unsub?.(); } catch { /* already closed */ }
    this.fresh = true;
    this.unsub = this.col.onSnapshot((snap) => {
      this.subTries = 0;
      if (S.saveProblem === RECONNECTING) { S.saveProblem = null; renderStoreNote(); }
      this.onSnap(snap);
    }, (err) => this.onErr(err));
  },

  onSnap(snap) {
    if (S.mode !== 'db') return;
    let railChanged = !S.loaded;
    let sheetChanged = !S.loaded;
    const mark = (id) => { railChanged = true; if (id === S.activeId || S.view === 'all') sheetChanged = true; };
    for (const ch of snap.docChanges()) {
      const id = ch.doc.id;
      try {
        if (this.deleted.has(id)) continue;
        if (ch.type === 'removed') { if (this.dropRemoved(id)) mark(id); continue; }
        if (this.applyDoc(id, ch.doc)) mark(id);
      } catch (e) {
        console.warn('Skipped a saved project that could not be read:', id, e);
      }
    }
    const definitive = !snap.metadata?.fromCache;
    if (definitive && S.role === 'guest' && !snap.docs.length && !Object.keys(this.base).length) { this.asGuest(); return; }
    if (this.fresh && definitive) {
      // the first full copy after (re)connecting: projects deleted elsewhere in the meantime drop out
      this.fresh = false;
      const present = new Set(snap.docs.map((x) => x.id));
      for (const id of Object.keys(this.base)) if (!present.has(id) && !this.deleted.has(id) && this.dropRemoved(id)) mark(id);
    }
    S.loaded = true;
    if (!this.pendingChecked && definitive) { this.pendingChecked = true; if (this.claimCheck()) sheetChanged = true; if (this.syncPending()) { railChanged = true; sheetChanged = true; } }
    this.mirrorSoon();
    if (railChanged || sheetChanged) { const was = S.activeId; pickActive(); if (S.activeId !== was) sheetChanged = true; }
    if (railChanged) renderRail();
    if (sheetChanged) renderSheet();
    if (this.awayNote) {
      const aid = this.awayNote; this.awayNote = null;
      const n = Away.news(aid, S.projects.get(aid));
      if (n) announce(`From elsewhere: ${awayParts(n).join(', ')}. Overview lists them under New since you last looked.`);
    }
  },

  dropRemoved(id) {
    delete this.base[id];
    if (S.projects.has(id) && !this.dirty[id] && !this.writing[id]) { S.projects.delete(id); return true; }
    return false; // edited here meanwhile: the next save writes it again
  },

  // merges one stored copy of a project into this page; returns true when what is shown changed
  applyDoc(id, doc) {
    const d = doc.data();
    if (!looksLikeProject(d)) return false;
    // a list that arrives as something else (another app's bug) stays as it was here, rather than reading as emptied
    const raw = clone(d);
    const prev = this.base[id] || S.projects.get(id);
    for (const k of LIST_FIELDS) if (k in raw && !Array.isArray(raw[k])) { if (prev) raw[k] = clone(prev[k]); else delete raw[k]; }
    const incoming = normalize(raw);
    const local = S.projects.get(id);
    const base = this.base[id];
    const sending = this.sending[id];
    // a copy that includes our own unconfirmed write: only the fields we are not writing are the store's
    const pending = !!doc.metadata?.hasPendingWrites;
    if (pending && (!base || !sending || !local)) return false;
    const keys = pending ? FIELDS.filter((k) => !(k in sending)) : FIELDS;
    if (this.touched[id]) for (const k of keys) if (!base || !same(base[k], incoming[k])) this.touched[id].add(k);
    if (!local) { this.base[id] = clone(incoming); S.projects.set(id, incoming); Away.check(id); return true; }
    let adopted = false;
    if (!base) {
      if (!this.dirty[id] && !this.writing[id]) { Object.assign(local, clone(incoming)); adopted = true; }
    } else {
      for (const k of keys) {
        if (same(local[k], incoming[k])) continue;
        if (sending && k in sending && same(incoming[k], sending[k])) continue; // the echo of our own write
        const merged = mergeField(k, base[k], local[k], incoming[k]);
        if (!same(merged, local[k])) { local[k] = merged; adopted = true; }
      }
      if (local.chat.length > CHAT_KEEP) local.chat = local.chat.slice(-CHAT_KEEP); // two devices asked at once
    }
    if (pending) for (const k of keys) base[k] = clone(incoming[k]);
    else this.base[id] = clone(incoming);
    if (FIELDS.some((k) => !same(local[k], this.base[id][k]))) this.markDirty(id);
    if (adopted && Away.check(id).length && S.loaded && id === S.activeId && S.view !== 'all') this.awayNote = id; // said once the page shows it
    return adopted;
  },

  // keeps a copy of what the store holds in this browser, so a later visit that cannot reach the store
  // starts from recent data; copies of projects still waiting to sync from an offline visit are left alone
  mirrorSoon() {
    if (!this.pendingChecked) return;
    clearTimeout(this.mirrorTimer);
    this.mirrorTimer = setTimeout(() => this.mirror(), 1000);
  },
  mirror() {
    this.mirrorTimer = null;
    if (S.mode !== 'db' || this.holdMirror) return;
    const cur = obj(lsGet(LS_DATA));
    const pend = obj(lsGet(LS_PENDING));
    const out = {};
    for (const [id, b] of Object.entries(this.base)) out[id] = b;
    for (const [id, raw] of Object.entries(cur)) if (pend[id] && !pend[id].deleted) out[id] = raw;
    if (lsSet(LS_DATA, out)) lsSet(LS_MIRROR, 1);
  },

  // changes the store has not confirmed are also kept in this browser, marked to sync, so closing the page, a write
  // that gets no answer or a project too large to store loses nothing: the next visit saves them. The copy is written
  // before the mark, so a mark never points at an older copy
  park(ids) {
    if (S.mode !== 'db') return;
    ids = [...new Set(ids)].filter((id) => S.projects.has(id) && !this.deleted.has(id));
    if (!ids.length) return;
    const data = obj(lsGet(LS_DATA));
    const pend = obj(lsGet(LS_PENDING));
    for (const id of ids) { data[id] = S.projects.get(id); pend[id] = { base: this.base[id] ? clone(this.base[id]) : null }; }
    const ok = lsSet(LS_DATA, data) && lsSet(LS_PENDING, pend);
    if (ok) { for (const id of ids) this.parked.add(id); lsSet(LS_MIRROR, 1); }
    if (ok === this.parkFailed) { this.parkFailed = !ok; renderStoreNote(); }
  },
  // projects with changes the store has not confirmed
  unsaved() {
    const ids = new Set(Object.keys(this.problems));
    for (const id of S.projects.keys()) if (this.dirty[id] || this.writing[id] || this.syncing.has(id)) ids.add(id);
    return [...ids];
  },
  // leaving now would lose changes: they are neither in the store nor kept in this browser
  atRisk() {
    if (S.mode === 'local') return this.localDirty.size > 0 && (!!this.lsBlocked || S.saveProblem === NO_LOCAL_SAVE);
    return S.mode === 'db' && this.parkFailed && this.unsaved().length > 0;
  },

  // projects in this browser that did not come from the account (made while Shipyard ran without it) are put aside
  // before the browser's copy becomes the account's, and the page asks what to do with them. A copy of the account kept
  // by an earlier visit is not asked about: what it has and the account lacks was deleted elsewhere
  claims: null,
  claimCheck() {
    this.claims = obj(lsGet(LS_UNCLAIMED));
    if (!lsGet(LS_MIRROR)) {
      const saved = obj(lsGet(LS_DATA));
      const pend = obj(lsGet(LS_PENDING));
      let n = 0;
      for (const [id, raw] of Object.entries(saved)) {
        if (S.projects.has(id) || pend[id] || id in this.claims || !looksLikeProject(raw)) continue;
        try { normalize(clone(raw)); } catch { continue; }
        this.claims[id] = raw; n++;
      }
      if (n && !lsSet(LS_UNCLAIMED, this.claims)) this.holdMirror = true; // nowhere to put them: the browser's copy stays as it is
    }
    return Object.keys(this.claims).length > 0;
  },
  // adds the projects put aside to the account, as new projects
  claimAdd() {
    const ids = [];
    for (const raw of Object.values(this.claims || {})) {
      let p;
      try { p = normalize(clone(raw)); } catch { continue; }
      ids.push(this.create(p));
    }
    this.claimDrop();
    return ids;
  },
  claimDrop() { this.claims = {}; try { localStorage.removeItem(LS_UNCLAIMED); } catch { /* gone with the rest */ } this.holdMirror = false; },

  // edits made in this browser while the store was unreachable are merged into the stored copy once it is back
  syncPending() {
    const pend = obj(lsGet(LS_PENDING));
    const ids = Object.keys(pend);
    if (!ids.length) return false;
    const saved = obj(lsGet(LS_DATA));
    const finished = [];
    let n = 0;
    for (const id of ids) {
      const e = isPlain(pend[id]) ? pend[id] : {};
      let base = null;
      try { base = e.base ? normalize(clone(e.base)) : null; } catch { base = null; }
      const cur = S.projects.get(id);
      if (e.deleted) {
        // deleted while offline: delete it here too, unless someone changed it since
        if (cur && base && sameProject(cur, base)) {
          S.projects.delete(id);
          this.deleted.add(id);
          this.col.doc(id).delete().then(() => { delete this.base[id]; this.unpend(id); }, () => { this.deleted.delete(id); });
          n++;
        } else finished.push(id);
        continue;
      }
      let off = null;
      try { off = saved[id] ? normalize(clone(saved[id])) : null; } catch { off = null; }
      if (!off) { finished.push(id); continue; }
      if (!cur) S.projects.set(id, off); // made offline, or deleted elsewhere while it was being edited here
      else for (const k of FIELDS) cur[k] = base ? mergeField(k, base[k], off[k], cur[k]) : (str(off.updatedAt) > str(cur.updatedAt) ? off[k] : cur[k]);
      const p = S.projects.get(id);
      if (this.base[id] && FIELDS.every((k) => same(p[k], this.base[id][k]))) { finished.push(id); continue; }
      this.syncing.add(id);
      this.markDirty(id);
      n++;
    }
    for (const id of finished) this.unpend(id);
    if (n) toast(`Saving the changes to ${n === 1 ? 'a project' : n + ' projects'} that were kept in this browser last time.`);
    return n > 0;
  },
  unpend(id) { const p = obj(lsGet(LS_PENDING)); if (id in p) { delete p[id]; lsSet(LS_PENDING, p); } },

  onErr(err) {
    const code = err?.code;
    const fatal = ['revoked', 'not_granted', 'capability_disabled', 'capability_removed', 'invalid_argument'].includes(code);
    if (!fatal && this.subTries < 3) {
      this.subTries++;
      S.saveProblem = RECONNECTING;
      renderStoreNote();
      setTimeout(() => this.subscribe(), 1500 * this.subTries + Math.random() * 1000);
      return;
    }
    S.saveProblem = null;
    toast('Lost the connection to your saved projects. Changes you make now are kept in this browser and saved to your account the next time the page connects.');
    this.fallback = true;
    for (const id of S.projects.keys()) if (this.dirty[id] || this.writing[id]) this.localDirty.add(id);
    this.useLocal();
  },

  // someone who may only view the planner: what they made before this was known stays, in this browser, kept apart
  // from any copy of the owner's projects this browser holds
  asGuest() {
    S.role = 'guest';
    LS_DATA = LS_GUEST;
    for (const id of S.projects.keys()) this.localDirty.add(id);
    this.writing = {}; this.inflight = {}; this.retries = {};
    this.useLocal();
  },

  useLocal() {
    S.mode = 'local';
    try { this.unsub?.(); } catch { /* already closed */ }
    this.col = null;
    for (const t of Object.values(this.timers)) clearTimeout(t);
    const saved = obj(lsGet(LS_DATA));
    this.keepUnreadable();
    for (const [id, raw] of Object.entries(saved)) {
      if (!looksLikeProject(raw)) continue; // not a project
      let p;
      try { p = normalize(raw); } catch { continue; } // skip unreadable
      if (!S.projects.has(id)) S.projects.set(id, p);
      this.lsBase[id] = clone(p);
      this.lsSeen.add(id);
    }
    // for projects this tab got from the store, the store's copy is the common ancestor with what other tabs saved
    for (const [id, b] of Object.entries(this.base)) if (S.projects.has(id)) this.lsBase[id] = clone(b);
    if (this.fallback) for (const id of S.projects.keys()) this.offlineBase[id] = this.lsBase[id] ? clone(this.lsBase[id]) : null;
    this.dirty = {};
    this.problems = {};
    this.saveLocal(true);
    S.loaded = true;
    pickActive();
    renderAll();
  },

  touch(p) {
    p.updatedAt = nowISO();
    const id = idOf(p);
    if (!id) return;
    Away.mine(id, p);
    scheduleRail();
    if (S.mode === 'local') {
      this.localDirty.add(id);
      clearTimeout(this.localTimer);
      this.localTimer = setTimeout(() => this.saveLocal(), 300);
      return;
    }
    this.markDirty(id); // still connecting: init() writes it
  },

  markDirty(id) {
    this.dirty[id] = true;
    this.schedule(id);
  },

  // saves after a pause in typing, but no later than 3 s after the first unsaved change
  schedule(id) {
    if (!this.firstDirty[id]) this.firstDirty[id] = Date.now();
    if (S.mode !== 'db' || this.writing[id]) return; // a running write re-checks when it ends
    clearTimeout(this.timers[id]);
    const wait = Math.max(0, Math.min(700, this.firstDirty[id] + 3000 - Date.now()));
    this.timers[id] = setTimeout(() => this.flush(id), wait);
  },

  // another tab's copy of a project merges field by field with this tab's, against the last copy both saw
  mergeLocal(id, raw) {
    let next;
    try { next = normalize(raw); } catch { return false; }
    const cur = S.projects.get(id);
    const base = this.lsBase[id];
    this.lsBase[id] = clone(next);
    this.lsSeen.add(id);
    if (!cur) { S.projects.set(id, next); return true; }
    if (base && same(base, next)) return false;
    let changed = false;
    for (const k of FIELDS) {
      if (same(cur[k], next[k])) continue;
      const merged = base ? mergeField(k, base[k], cur[k], next[k]) : (this.localDirty.has(id) ? cur[k] : next[k]);
      if (!same(merged, cur[k])) { cur[k] = merged; changed = true; }
    }
    if (FIELDS.some((k) => !same(cur[k], next[k]))) this.localDirty.add(id);
    return changed;
  },

  // a project deleted in this tab stays deleted, unless another tab changed it after that
  takeStored(id, raw) {
    if (!looksLikeProject(raw)) return false; // not a project
    if (this.localDeleted.has(id)) {
      if (str(raw?.updatedAt) <= this.localDeleted.get(id)) return false;
      this.localDeleted.delete(id);
    }
    return this.mergeLocal(id, raw);
  },

  // tabs take turns, so two saving at once cannot overwrite each other; when the page is closing it saves at once
  saveLocal(now) {
    clearTimeout(this.localTimer);
    this.localTimer = null;
    if (!now && navigator.locks?.request) {
      navigator.locks.request('shipyard-save', () => this.saveLocalNow()).catch(() => this.saveLocalNow());
      return;
    }
    this.saveLocalNow();
  },

  // projects this browser holds that cannot be read are copied aside, unchanged, before anything is saved over them
  keepUnreadable() {
    let text = null;
    try { text = localStorage.getItem(LS_DATA); } catch { return; }
    if (text == null || isPlain(lsGet(LS_DATA))) return;
    const aside = `${LS_DATA}.unreadable.${Date.now()}`;
    let kept = false;
    try { localStorage.setItem(aside, text); kept = localStorage.getItem(aside) === text; } catch { kept = false; }
    this.lsBlocked = !kept; // nowhere to put them: nothing is saved over them
    S.saveProblem = kept ? UNREADABLE_KEPT : UNREADABLE_STUCK;
  },

  saveLocalNow() {
    if (S.mode !== 'local' || this.lsBlocked) return;
    const cur = obj(lsGet(LS_DATA));
    let changed = false;
    for (const [id, raw] of Object.entries(cur)) if (this.takeStored(id, raw)) changed = true;
    for (const id of [...S.projects.keys()]) { // deleted in another tab, and not edited here since
      if (!(id in cur) && this.lsSeen.has(id) && !this.localDirty.has(id)) { S.projects.delete(id); delete this.lsBase[id]; this.lsSeen.delete(id); changed = true; }
    }
    const out = {};
    for (const [id, p] of S.projects) out[id] = p;
    if (!lsSet(LS_DATA, out)) {
      if (!S.saveProblem) { S.saveProblem = NO_LOCAL_SAVE; renderStoreNote(); }
    } else {
      if (S.saveProblem === NO_LOCAL_SAVE) { S.saveProblem = null; renderStoreNote(); }
      for (const [id, p] of S.projects) this.lsBase[id] = clone(p);
      this.lsSeen = new Set(S.projects.keys());
      if (this.fallback && (this.localDirty.size || this.localDeleted.size)) {
        const pend = obj(lsGet(LS_PENDING));
        const known = (id) => (isPlain(pend[id]) && pend[id].base) || this.offlineBase[id] || null; // the oldest ancestor wins
        for (const id of this.localDirty) if (S.projects.has(id)) pend[id] = { base: known(id) };
        for (const id of this.localDeleted.keys()) pend[id] = { base: known(id), deleted: true };
        lsSet(LS_PENDING, pend);
      }
      this.localDirty.clear();
    }
    if (changed) { pickActive(); renderRail(); renderSheet(); }
    guardLeave();
  },

  onStorage() { // another tab changed the saved projects
    if (S.mode !== 'local') return;
    const data = obj(lsGet(LS_DATA));
    let changed = false;
    for (const [id, raw] of Object.entries(data)) if (this.takeStored(id, raw)) changed = true;
    for (const id of [...S.projects.keys()]) {
      if (!(id in data) && this.lsSeen.has(id) && !this.localDirty.has(id)) { S.projects.delete(id); delete this.lsBase[id]; this.lsSeen.delete(id); changed = true; }
    }
    if (this.localDirty.size && !this.localTimer) this.localTimer = setTimeout(() => this.saveLocal(), 300); // an earlier save already waiting keeps its turn
    if (changed) { pickActive(); renderRail(); renderSheet(); }
  },

  setProblem(id, msg) { this.problems[id] = msg; this.park([id]); renderStoreNote(); },
  clearProblem(id) { if (this.problems[id]) { delete this.problems[id]; renderStoreNote(); } },

  async flush(id, { force = false } = {}) {
    if (S.mode === 'local') { this.saveLocal(force); return; }
    if (S.mode !== 'db') return;
    clearTimeout(this.timers[id]);
    if ((this.writing[id] && !force) || this.deleted.has(id)) return;
    const p = S.projects.get(id);
    if (!p) { this.dirty[id] = false; return; }
    const base = this.base[id];
    const payload = {};
    if (base) for (const k of FIELDS) if (!same(p[k], base[k])) payload[k] = clone(p[k]);
    this.dirty[id] = false;
    delete this.firstDirty[id];
    if (base && !Object.keys(payload).length) { this.clearProblem(id); return; }
    const now = Date.now();
    const log = (this.writeLog[id] || []).filter((t) => now - t < 60000);
    log.push(now);
    this.writeLog[id] = log;
    if (log.length > 120) { // a safety stop in case two copies keep rewriting each other
      this.dirty[id] = true;
      this.writeLog[id] = [];
      this.setProblem(id, 'Saving paused for a project that changed too often. Edit anything in it to try again.');
      return;
    }
    const whole = base ? null : clone(p);
    if (sizeOf(p) > MAX_BYTES) {
      this.dirty[id] = true;
      this.setProblem(id, `"${oneLine(p.name) || 'Untitled project'}" is too large to save, so its latest changes are only on this page. Shorten long notes, old sessions on the Improve tab or the CLAUDE.md text, or undo the last big change.`);
      return;
    }
    this.writing[id] = (this.writing[id] || 0) + 1;
    const sent = whole || payload;
    this.sending[id] = sent;
    this.touched[id] = new Set();
    let run;
    try { const ref = this.col.doc(id); run = whole ? ref.set(whole) : ref.update(payload); } catch (e) { run = Promise.reject(e); }
    let limit;
    run = Promise.race([run, new Promise((res, rej) => { limit = setTimeout(() => rej({ code: 'timeout' }), WRITE_LIMIT); })]);
    this.inflight[id] = run.then(() => {}, () => {});
    let ok = false;
    let code = null;
    try { await run; ok = true; } catch (e) { code = e?.code || 'unavailable'; }
    clearTimeout(limit);
    const touched = this.touched[id] || new Set();
    if (this.sending[id] === sent) { delete this.sending[id]; delete this.touched[id]; }
    this.writing[id] = Math.max(0, (this.writing[id] || 1) - 1);
    if (this.deleted.has(id) || S.mode !== 'db') return;
    if (ok) {
      const b = this.base[id] || {};
      for (const k of Object.keys(sent)) if (!touched.has(k)) b[k] = clone(sent[k]);
      this.base[id] = b;
      this.retries[id] = 0;
      this.clearProblem(id);
      const kept = this.parked.delete(id);
      if (this.syncing.delete(id) || kept) this.unpend(id); // what is left unsaved is kept again if the page closes
      const cur = S.projects.get(id);
      this.dirty[id] = !!cur && FIELDS.some((k) => !same(cur[k], b[k]));
      if (this.dirty[id]) this.schedule(id);
      for (const other of Object.keys(this.problems)) if (other !== id && this.dirty[other] && !this.writing[other]) this.flush(other);
      this.mirrorSoon();
      return;
    }
    this.dirty[id] = true;
    this.retries[id] = (this.retries[id] || 0) + 1;
    if (code === 'invalid_argument' && !whole && this.retries[id] <= 1) {
      delete this.base[id]; // the document may be gone; write it whole
      this.flush(id);
      return;
    }
    if (code === 'invalid_argument') { this.setProblem(id, 'Changes cannot be saved. You may only have view access to this page.'); return; }
    if (code === 'quota_exceeded') { this.setProblem(id, 'Storage is full. Use Back up all projects first, then delete a project you no longer need and edit anything to retry.'); return; }
    if (this.retries[id] <= 3) {
      this.setProblem(id, 'Saving is taking longer than usual. Retrying…');
      clearTimeout(this.timers[id]);
      this.timers[id] = setTimeout(() => this.flush(id), 1200 * 2 ** this.retries[id] + Math.random() * 800);
      return;
    }
    this.setProblem(id, 'Some changes are not saved yet. Your next edit will try again.');
  },

  create(p) {
    const id = uid('p');
    S.projects.set(id, p);
    this.touch(p);
    if (S.mode === 'db') this.flush(id);
    if (S.mode === 'local') this.saveLocal();
    return id;
  },

  remove(id) {
    clearTimeout(this.timers[id]);
    const p = S.projects.get(id);
    S.projects.delete(id);
    this.dirty[id] = false;
    this.clearProblem(id);
    if (S.mode !== 'db') {
      this.localDeleted.set(id, str(p?.updatedAt));
      this.localDirty.delete(id);
      if (S.mode === 'local') this.saveLocal();
      return Promise.resolve();
    }
    this.deleted.add(id);
    const run = (async () => {
      try {
        await this.inflight[id];
        await this.col.doc(id).delete();
        delete this.base[id];
        this.parked.delete(id); this.syncing.delete(id); this.unpend(id); // a copy kept to sync would bring it back
        this.mirrorSoon();
      } catch {
        this.deleted.delete(id);
        if (S.projects.has(id)) return; // already put back with Undo
        if (p) { S.projects.set(id, p); S.activeId = id; S.view = 'project'; saveUI(); this.touch(p); }
        renderAll();
        toast('Could not delete the project. Try again.');
      }
    })();
    this.removing[id] = run;
    return run;
  },

  // a deleted project put back with Undo; in the store it is written again whole once the delete has finished
  restore(id, p) {
    if (S.projects.has(id)) return;
    S.projects.set(id, p);
    if (S.mode !== 'db') { this.localDeleted.delete(id); this.touch(p); return; }
    Promise.resolve(this.removing[id]).then(() => {
      if (S.projects.get(id) !== p) return;
      this.deleted.delete(id);
      delete this.base[id];
      this.touch(p);
    });
  },
};
const RECONNECTING = 'Reconnecting to your saved projects…';
function touch(p) { stampDone(p); Store.touch(p); }
function flushAll(closing) {
  if (S.mode === 'local') { if (Store.localDirty.size || Store.localDeleted.size) Store.saveLocal(closing); return; }
  if (S.mode !== 'db') return;
  if (Store.mirrorTimer) { clearTimeout(Store.mirrorTimer); Store.mirror(); } // the copy for a visit without the store
  Store.park(Store.unsaved()); // the page may not live to hear the answer
  for (const id of Object.keys(Store.dirty)) if (Store.dirty[id]) Store.flush(id, { force: closing });
}
// the browser asks before leaving only while leaving would lose something
const onLeave = (e) => { if (Store.atRisk()) { e.preventDefault(); e.returnValue = ''; } };
let leaveGuard = false;
function guardLeave() {
  const on = Store.atRisk();
  if (on === leaveGuard) return;
  leaveGuard = on;
  if (on) window.addEventListener('beforeunload', onLeave); else window.removeEventListener('beforeunload', onLeave);
}
window.addEventListener('pagehide', () => flushAll(true));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushAll(false); }); // a running write sends the rest when it ends
window.addEventListener('storage', (e) => { if (e.key === LS_DATA) Store.onStorage(); });

/* ================= claude ================= */
async function initCapabilities() {
  if (!window.claude?.use) return;
  try {
    const [sample, downloads] = await Promise.all([
      window.claude.use('sample').catch(() => null),
      window.claude.use('downloads').catch(() => null),
    ]);
    S.sample = sample ? guardSample(sample) : null;
    S.downloads = downloads || null;
  } catch { /* stay without */ }
  if (S.sample || S.downloads) renderAll();
}
// every request to Claude goes through here, so no key or password in the plan or in a pasted report is sent
function guardSample(s) {
  const clean = (input) => (Array.isArray(input) ? input.map((x) => ({ ...x, content: maskSecrets(str(x.content)) })) : maskSecrets(str(input)));
  const f = (input, opts) => s(clean(input), opts);
  f.json = (input, opts) => s.json(clean(input), opts);
  f.limits = (...x) => s.limits(...x);
  return Object.freeze(f);
}
const userStopped = (e, ctl) => e?.code === 'cancelled' && !!ctl?.signal.aborted; // Stop, or the dialog was closed
const PERMANENT = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'];
// what each request to Claude was, for a refusal: what Claude declined, and what the person can do instead
const ASKED = {
  fill: ['to draft this project', 'Try the idea in other words, or fill in the brief yourself.'],
  plan: ['to draft milestones', 'Add them yourself on the Plan tab.'],
  features: ['to suggest features', 'Add them yourself on the Design tab.'],
  review: ['to review the project', 'Try again later.'],
  model: ['to sketch the data model', 'Add it yourself on the Design tab.'],
  followups: ['to suggest what is next', 'The session is saved.'],
  sharpen: ['to sharpen the prompt', 'The original prompt is still here to copy.'],
  ask: ['that question', 'Try asking it another way.'],
  split: ['to split this task', 'Write the smaller tasks yourself.'],
  featplan: ['to plan this feature', 'Write the tasks yourself.'],
  retro: ['to look back on this milestone', 'Write the rules yourself on the Improve tab.'],
};
function claudeErrorCopy(code, why) {
  if (PERMANENT.includes(code)) return 'Claude help is not available on this page, so its buttons are now hidden.';
  switch (code) {
    case 'rate_limited': return 'Claude is busy or you have reached a usage limit. Try again in a little while.';
    case 'session_expired': return 'Sign in to Claude again, then try once more.';
    case 'invalid_json': return 'Claude answered in an unexpected shape. Try again.';
    case 'refused': return why ? `Claude declined ${why[0]}. ${why[1]}` : 'Claude declined that request. Try asking another way.';
    case 'prompt_too_large': return 'That is too much to send to Claude in one go. Shorten the longest text, such as a pasted log or long notes, and try again.';
    case 'overloaded': return 'Claude is busy right now. Try again in a minute.';
    case 'empty_completion': return 'Claude returned nothing. Try again.';
    default: return 'Could not reach Claude. Try again.';
  }
}
function onClaudeError(e, ctl, why) {
  const code = e?.code || 'upstream_error';
  if (code === 'cancelled') { if (ctl && !ctl.signal.aborted) toast('Claude stopped before it finished. Try again.'); return; } // only Stop or closing the dialog is quiet
  if (PERMANENT.includes(code) && !S.claudeOff) { S.claudeOff = true; setTimeout(renderAll, 0); }
  toast(claudeErrorCopy(code, why && ASKED[why]));
}
async function askJSON(key, label, prompt) {
  if (!canAsk() || S.busy[key]) return null;
  const ctl = new AbortController();
  S.busy[key] = { ctl, label };
  S.focusSel = [`[data-act="stop"][data-key="${CSS.escape(key)}"]`]; // the pressed button is disabled while Claude works
  renderSheet();
  try {
    return await S.sample.json(prompt, { signal: ctl.signal, cache: false });
  } catch (e) {
    onClaudeError(e, ctl, key.split(':').pop());
    return null;
  } finally {
    delete S.busy[key];
  }
}
// what Claude is told about the project, as JSON that is never cut off mid-way: the bugs, recent sessions and lessons come
// first, finished milestones are summed up, and when it is too long for a request the least needed parts shrink or go whole
function contextOf(p, max = 60000) {
  const isDone = (m) => m.tasks.length > 0 && m.tasks.every((t) => t.status === 'done');
  const full = (m) => ({ title: m.title, goal: m.goal, tasks: m.tasks.map((t) => ({ title: t.title, size: t.size, status: t.status, ...(t.status === 'done' && t.doneAt ? { done: t.doneAt } : {}), ...(startedOn(p, t) ? { started: startedOn(p, t) } : {}) })) });
  const titles = (m) => ({ title: m.title, goal: m.goal, done: true, tasks: m.tasks.map((t) => t.title) });
  const count = (m) => ({ title: m.title, goal: m.goal, tasks: `${m.tasks.filter((t) => t.status === 'done').length} of ${m.tasks.length} done` });
  const now = today();
  const g = weeklyProgress(p, now);
  const tc = targetCheck(g, p.targetDate, now);
  const c = {
    name: p.name, kind: p.starter ? starterOf(p.starter).label : '', pitch: p.pitch, stage: p.stage, audience: p.audience, problem: p.problem, doneWhen: p.doneWhen,
    // dates are YYYY-MM-DD. The pace and the finish estimate are the ones the app shows on Overview
    timing: { today: now, targetDate: p.targetDate || null, target: { estimate: 'no target date set', done: 'every task is done', passed: 'the target date has passed', noplan: 'no tasks yet', nopace: 'not enough finished work yet to estimate', behind: `about ${lateText(tc)} behind`, onpace: 'on pace' }[tc.state] || null,
      tasksDone: g.total - g.left, tasksLeft: g.left, tasksPerWeek: Math.round(g.pace * 10) / 10, estimatedFinish: tc.finish || null },
    stack: p.stack, commands: p.commands, conventions: p.conventions, constraints: p.constraints,
    openBugs: openBugs(p).slice(0, 12).map((b) => ({ title: b.title, severity: b.severity, reported: b.date, actual: b.actual.slice(0, 200) })),
    fixedBugs: p.bugs.filter((b) => b.status === 'fixed' && b.title.trim() && b.fixedAt).sort((x, y) => y.fixedAt.localeCompare(x.fixedAt)).slice(0, 6).map((b) => ({ title: b.title, fixed: b.fixedAt })),
    recentSessions: p.sessions.slice(-6).map((x) => ({ date: x.date, task: x.task, outcome: x.outcome, summary: x.summary.slice(0, 400), wrong: x.wrong.slice(0, 200) })),
    lessons: p.lessons.slice(0, 30).map((l) => ({ happened: l.happened.slice(0, 300), change: l.change.slice(0, 300) })),
    features: p.features.map((f) => ({ title: f.title, detail: f.detail.slice(0, 300), priority: f.priority, status: f.status })),
    milestones: p.milestones.map((m) => (isDone(m) ? titles(m) : full(m))),
    decisions: p.decisions.map((d) => ({ date: d.date, text: d.text, why: d.why })),
    screens: p.screens.map((s) => ({ name: s.name, notes: s.notes.slice(0, 300) })),
    entities: p.entities.map((e) => ({ name: e.name, fields: lines(e.fields).slice(0, 40), notes: e.notes.slice(0, 300) })),
  };
  const first = p.milestones.findIndex((m) => !isDone(m));
  const later = first < 0 ? [] : p.milestones.map((m, i) => i).filter((i) => i > first + 1 && !isDone(p.milestones[i])).reverse();
  const steps = [
    () => { c.screens = c.screens.map((s) => ({ name: s.name })); c.entities = c.entities.map((e) => ({ name: e.name, fields: e.fields.slice(0, 10) })); },
    () => { c.milestones = p.milestones.map((m, i) => (isDone(m) ? count(m) : c.milestones[i])); },
    () => { c.features = c.features.map((f) => ({ title: f.title, priority: f.priority, status: f.status })); c.decisions = c.decisions.map((d) => ({ date: d.date, text: d.text.slice(0, 200) })); },
    ...later.map((i) => () => { c.milestones[i] = count(p.milestones[i]); }), // the furthest first; the current and next stay whole
    () => { if (first > 0) { c.finishedMilestones = p.milestones.filter(isDone).map((m) => m.title); c.milestones = c.milestones.filter((x, i) => !isDone(p.milestones[i])); } }, // finished ones by name only
    () => { c.recentSessions = c.recentSessions.map((s) => ({ ...s, summary: s.summary.slice(0, 150) })); c.lessons = c.lessons.map((l) => ({ happened: l.happened.slice(0, 120), change: l.change.slice(0, 120) })); },
    () => { delete c.screens; delete c.entities; delete c.decisions; },
  ];
  let out = JSON.stringify(c);
  for (const step of steps) { if (out.length <= max) break; step(); out = JSON.stringify(c); }
  const lists = ['features', 'milestones', 'lessons', 'recentSessions', 'openBugs'];
  while (out.length > max) { // still too long: the last item of the longest list goes, whole
    const k = lists.filter((x) => c[x]?.length > (x === 'openBugs' || x === 'recentSessions' || x === 'milestones' ? 1 : 0)).sort((x, y) => JSON.stringify(c[y]).length - JSON.stringify(c[x]).length)[0];
    if (!k) break;
    c[k].pop();
    out = JSON.stringify(c);
  }
  return out;
}
const ABOUT = 'The project will be built with Claude Code, an AI coding agent that works in the terminal. The owner may not be a professional developer, so prefer simple, well-known tools and tasks small enough for one Claude Code session (roughly 15 to 45 minutes of work each).';
const MILESTONE_SHAPE = '{"title": string, "goal": string (one sentence: what works when it is done), "tasks": [{"title": string (starts with a verb), "size": "S" (under 15 minutes) | "M" (one Claude Code session, 15 to 45 minutes) | "L" (too big for one session; avoid it and split the work into S or M tasks instead), "notes": string (one or two sentences on what to do and how to check it works), "feature": string (the title of the feature it builds, exactly as listed, or "" for setup and other work)}]}';

// Claude's answers in the shapes it really sends: a title numbered, bulleted or in bold; "small" or "S (under 15 minutes)"
// for a size; notes as a list; the whole answer wrapped in one more object; "task" or "name" for a title
const answerTitle = (s) => oneLine(s).replace(/^(?:\d+[.)]|[-*+\u2022]|\[[ xX]\])\s+/, '').replace(/^\*\*(.+)\*\*$/, '$1').replace(/^__(.+)__$/, '$1').trim();
const answerSize = (v) => { const s = str(Array.isArray(v) ? v[0] : v).trim().toUpperCase(); return /^(XS|S)\b|^SMALL/.test(s) ? 'S' : /^(XL|L)\b|^LARGE/.test(s) ? 'L' : 'M'; };
const textOf = (v) => (Array.isArray(v) ? v.map((x) => oneLine(x)).filter(Boolean).join('\n') : str(v)).trim();
const unwrap = (r, keys) => { if (Array.isArray(r) || !r || typeof r !== 'object' || keys.some((k) => k in r)) return r; const vs = Object.values(r); return vs.length === 1 && vs[0] && typeof vs[0] === 'object' ? vs[0] : r; };
const oddShape = (r) => JSON.stringify(r ?? null).length > 40; // something came back, but not what was asked for
const SHAPE_MSG = "Claude's answer was not in the shape Shipyard reads. Try again.";
// a title as compared for repeats: no numbering, markdown or punctuation, any case
const titleKey = (s) => answerTitle(s).toLowerCase().replace(/[*_`~]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
// Claude's tasks less the ones the plan (or one earlier in the same answer) already has: [kept, how many were left out]
function newTasksOnly(p, tasks, skip = null, have = new Set(allTasks(p).filter((t) => t !== skip).map((t) => titleKey(t.title)).filter(Boolean))) {
  const kept = tasks.filter((t) => { const k = titleKey(t.title); if (!k || have.has(k)) return false; have.add(k); return true; });
  return [kept, tasks.length - kept.length];
}
const leftOut = (n) => (n ? `<p class="hint">Left out ${many(n, 'suggestion that is', 'suggestions that are')} already in the plan.</p>` : '');
function coerceFeatures(v, p) {
  const seen = newIds(p);
  return arr(v).map(obj).map((f) => mkFeature({ title: answerTitle(f.title ?? f.name), detail: textOf(f.detail ?? f.description), priority: f.priority, status: f.status }, seen)).filter((f) => f.title);
}
const featKey = (s) => oneLine(s).toLowerCase().replace(/[.!?:;,]+$/, '');
function coerceMilestones(v, p) {
  const seen = newIds(p);
  const byTitle = new Map(p.features.filter((f) => f.title.trim()).map((f) => [featKey(f.title), f.id]));
  return arr(v).map(obj).map((m) => {
    const tasks = arr(m.tasks).map((t) => (typeof t === 'string' ? { title: t } : obj(t))).map((t) => ({ title: answerTitle(t.title ?? t.task ?? t.name), size: answerSize(t.size), notes: textOf(t.notes ?? t.description), status: 'todo', feat: byTitle.get(featKey(t.feature)) || '' })).filter((t) => t.title);
    return mkMilestone({ title: answerTitle(m.title ?? m.name) || (tasks.length ? 'Next steps' : ''), goal: textOf(m.goal), tasks }, seen); // new work is to do, whatever the answer says
  }).filter((m) => m.title);
}

// the closing milestone of an untouched starter plan: Claude's milestones go just before it
function starterGap(p) {
  const st = starterOf(p.starter);
  if (!st.build || p.milestones.length !== 2) return null;
  const [a, b] = p.milestones;
  return a.title === 'Bare-bones version running' && b.title === st.build(p.name).last.title ? b.id : null;
}
// adds Claude's draft to a project without overwriting anything the owner wrote; returns what was added
// Claude sometimes answers a list as a JSON array: one item per line, rules as "- " bullets
const draftText = (k, v) => (Array.isArray(v) ? v.map((x) => oneLine(x)).filter(Boolean).map((x) => ((k === 'conventions' || k === 'constraints') && !/^[-*]\s/.test(x) ? '- ' + x : x)).join('\n') : str(v));
function applyDraft(q, r, before) {
  for (const k of ['pitch', 'audience', 'problem', 'doneWhen', 'stack', 'commands', 'conventions', 'constraints']) {
    const v = draftText(k, r[k]);
    if (!q[k].trim() && v.trim()) q[k] = k === 'pitch' ? oneLine(v) : v.trim();
  }
  const added = [];
  if (!q.features.length) { q.features.push(...coerceFeatures(r.features, q).slice(0, 12)); if (q.features.length) added.push('features'); }
  let ms = coerceMilestones(r.milestones, q).slice(0, 4);
  ms.forEach((m) => { m.tasks = m.tasks.slice(0, 8); }); // what was asked for, with room to spare
  if (before) { // the starter's own first and last milestones are already in the plan
    const st = starterOf(q.starter);
    const norm = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const own = new Set([norm('Bare-bones version running'), st.build ? norm(st.build(q.name).last.title) : '']);
    ms = ms.filter((m) => !own.has(norm(m.title)) && !/^bare ?bones\b/.test(norm(m.title)));
  }
  const at = before ? q.milestones.findIndex((m) => m.id === before) : -1;
  if (ms.length && at >= 0) { q.milestones.splice(at, 0, ...ms); added.push('plan'); }
  else if (ms.length && (before || !q.milestones.length)) { q.milestones.push(...ms); added.push('plan'); }
  else if (ms.length) added.push('kept'); // the project has its own plan: Claude's is not used
  return added;
}
// Undo for a draft: what it filled in goes back to how it was, unless edited since
const DRAFT_KEYS = ['pitch', 'audience', 'problem', 'doneWhen', 'stack', 'commands', 'conventions', 'constraints', 'stage'];
function draftUndo(q) {
  const was = Object.fromEntries(DRAFT_KEYS.map((k) => [k, q[k]]));
  const hadF = new Set(q.features.map((x) => x.id));
  const hadM = new Set(q.milestones.map((x) => x.id));
  return (q2) => {
    const set = DRAFT_KEYS.filter((k) => q2[k] !== was[k]).map((k) => [k, q2[k]]);
    const newF = q2.features.filter((x) => !hadF.has(x.id));
    const newM = q2.milestones.filter((x) => !hadM.has(x.id));
    if (!set.length && !newF.length && !newM.length) return undefined;
    const snaps = new Map([...newF, ...newM].map((x) => [x.id, sigOf(x)]));
    return {
      pid: idOf(q2),
      restore: (p) => {
        if (set.some(([k, v]) => p[k] !== v) || [...p.features, ...p.milestones].some((x) => snaps.has(x.id) && sigOf(x) !== snaps.get(x.id))) return null;
        set.forEach(([k]) => { p[k] = was[k]; });
        p.features = p.features.filter((x) => !snaps.has(x.id));
        p.milestones = p.milestones.filter((x) => !snaps.has(x.id));
        return 'f-pitch';
      },
    };
  };
}
async function aiFillBrief(id, idea, { fromCreate = false } = {}) {
  const p = S.projects.get(id);
  if (!p || !idea.trim() || drafting(id)) return;
  const st = starterOf(p.starter);
  const before = starterGap(p);
  const lastTitle = before ? p.milestones[1].title : '';
  const prompt = [
    'Help plan a new software project from a rough idea.', ABOUT,
    ...(st.build ? [`The owner picked a starting point: ${st.label}. Its tech stack is already chosen (${lines(p.stack).join(', ')}), so plan around it and reply with empty strings for stack, commands and conventions.`]
      : p.stack.trim() ? [`The owner reuses the setup of an earlier project. Its tech stack is already chosen (${lines(p.stack).join(', ')}), so plan around it and reply with empty strings for stack, commands and conventions.`] : []),
    '',
    'Reply with only one JSON object of this shape:',
    '{"pitch": string (one sentence), "audience": string, "problem": string, "doneWhen": string (what a working first version does, 1 to 3 sentences),',
    ' "stack": string (suggested tools, one per line), "commands": string (likely install, run and test commands, one per line), "conventions": string (3 to 5 lines, each starting with "- " and written as an instruction to Claude),',
    ' "constraints": string (may be empty), "features": [{"title": string, "detail": string, "priority": "must" | "should" | "could"}] (6 to 10 features, at most 5 must),',
    before
      ? ` "milestones": [${MILESTONE_SHAPE}] (2 or 3 milestones that build the features in order, 3 to 6 tasks each. The plan already starts with "Bare-bones version running", which sets up the project, and ends with "${lastTitle}", which covers polish and release, so leave setup and release work out)}`
      : ` "milestones": [${MILESTONE_SHAPE}] (3 or 4 milestones in build order, 3 to 6 tasks each; the first milestone gets a bare-bones version running)}`,
    '', `Project name: ${p.name}`, `Idea: ${idea}`,
  ].join('\n');
  const r = await askJSON(id + ':fill', 'Claude is writing your brief, features and first plan…', prompt);
  const q = S.projects.get(id);
  if (!q) return;
  if (id === S.activeId) S.focusSel = ['[data-act="ai-fill"]', '#f-pitch', '#f-name'];
  if (!r || typeof r !== 'object') { renderAll(); return; }
  const undo = draftUndo(q);
  if (fromCreate && q.pitch === oneLine(idea) && str(r.pitch).trim()) q.pitch = oneLine(r.pitch);
  const all = applyDraft(q, r, before);
  const added = all.filter((x) => x !== 'kept');
  if (q.stage === 'idea' && q.features.length) q.stage = 'designing';
  touch(q);
  renderAll();
  const what = added.length === 2 ? ', features and plan' : added[0] === 'features' ? ' and features' : added[0] === 'plan' ? ' and plan' : '';
  toast(`Brief${what} drafted. Edit anything that does not fit.${all.includes('kept') ? " Claude's plan was left out, as this project has milestones already; Ask Claude for the next milestones on the Plan tab instead." : ''}`, undo(q));
}

async function aiImport(id, text) {
  if (!S.projects.get(id) || drafting(id)) return;
  const long = str(text).length > 40000;
  const prompt = [
    'Turn this existing project document into a project plan.', ABOUT,
    'The document is a CLAUDE.md, a README or notes for a project that may already be partly built.',
    'Use only what the document says or clearly implies, and reply with an empty string for anything it does not say.', '',
    'Reply with only one JSON object of this shape:',
    '{"pitch": string (one sentence), "audience": string, "problem": string, "doneWhen": string, "stack": string (one per line), "commands": string (one per line),',
    ' "conventions": string (lines starting with "- ", written as instructions to Claude), "constraints": string,',
    ' "features": [{"title": string, "detail": string (one sentence), "priority": "must" | "should" | "could", "status": "todo" | "done"}] (what it does or should do; "done" when the document says it already works),',
    ` "milestones": [${MILESTONE_SHAPE}] (2 to 4 milestones for the work that is left, in order; leave out work the document says is finished)}`,
    '', 'Document:', str(text).slice(0, 40000),
  ].join('\n');
  const r = await askJSON(id + ':fill', 'Claude is reading the document and filling in the gaps…', prompt);
  const q = S.projects.get(id);
  if (!q) return;
  if (id === S.activeId) S.focusSel = ['[data-act="ai-fill-md"]', '#f-pitch', '#f-name'];
  if (!r || typeof r !== 'object') { renderAll(); return; }
  const undo = draftUndo(q);
  const added = applyDraft(q, r, null).filter((x) => x !== 'kept');
  touch(q);
  renderAll();
  const cut = long ? ' Claude read the first 40,000 characters only.' : '';
  toast((added.length ? `Claude filled in the gaps${added.length === 2 ? ' and drafted features and a plan' : added[0] === 'plan' ? ' and drafted a plan' : ' and listed the features'}. Check them over.` : 'Claude filled in the gaps. Check them over.') + cut, undo(q));
}

async function aiPlan(id) {
  const p = S.projects.get(id);
  if (!p || filling(id)) return;
  const prompt = [
    'Draft the next milestones of a build plan for this project.', ABOUT,
    p.milestones.length ? 'The plan already has milestones. Propose only NEW milestones that continue from where it stops, without repeating existing tasks.' : 'Start from nothing: the first milestone gets a bare-bones version running.',
    ...(closingAt(p) < p.milestones.length ? [`Its last milestone, "${oneLine(p.milestones.at(-1).title)}", is the release, and the new milestones go just before it, so plan only work that comes before the release.`] : []),
    'Cover must-have features first.', '',
    `Reply with only JSON: {"milestones": [${MILESTONE_SHAPE}]} with 2 to 4 milestones and 3 to 6 tasks each.`,
    '', 'Project:', contextOf(p),
  ].join('\n');
  const r = await askJSON(id + ':plan', 'Claude is drafting milestones…', prompt);
  const q = S.projects.get(id);
  if (!q) return;
  const have = new Set(allTasks(q).map((t) => titleKey(t.title)).filter(Boolean));
  let gone = 0;
  const ms = coerceMilestones(unwrap(r, ['milestones'])?.milestones, q).slice(0, 6).filter((m) => {
    const n = m.tasks.length;
    [m.tasks] = newTasksOnly(q, m.tasks.slice(0, 10), null, have);
    gone += Math.min(n, 10) - m.tasks.length;
    return m.tasks.length || !n;
  });
  if (ms.length) S.proposals[id + ':plan'] = { items: ms, sel: new Set(ms.map((_, i) => i)), dropped: gone };
  else if (r) toast(gone ? 'Everything Claude suggested is already in the plan.' : oddShape(r) && !arr(unwrap(r, ['milestones'])?.milestones).length ? SHAPE_MSG : 'Claude did not suggest any milestones. Add more to the brief and try again.');
  if (id === S.activeId) S.focusSel = ['#prop-plan-h', '[data-act="ai-plan"]'];
  renderSheet();
  if (ms.length) announce(`Claude suggests ${many(ms.length, 'milestone', 'milestones')}${id === S.activeId ? '' : ` for ${oneLine(q.name) || 'your project'}`}. Choose which to add.`);
}

async function aiFeatures(id) {
  const p = S.projects.get(id);
  if (!p || filling(id)) return;
  const prompt = [
    'Suggest features for this project that are not already on its list.', ABOUT,
    'Mark something "must" only if the first version is useless without it.', '',
    'Reply with only JSON: {"features": [{"title": string, "detail": string (one sentence), "priority": "must" | "should" | "could"}]} with 4 to 8 features.',
    '', 'Project:', contextOf(p),
  ].join('\n');
  const r = await askJSON(id + ':features', 'Claude is suggesting features…', prompt);
  const q = S.projects.get(id);
  if (!q) return;
  const all = coerceFeatures(unwrap(r, ['features'])?.features, q);
  const haveF = new Set(q.features.map((f) => titleKey(f.title)).filter(Boolean));
  const fs = all.filter((f) => { const k = titleKey(f.title); if (haveF.has(k)) return false; haveF.add(k); return true; }).slice(0, 10);
  if (fs.length) S.proposals[id + ':features'] = { items: fs, sel: new Set(fs.map((_, i) => i)), dropped: all.length - fs.length };
  else if (r) toast(all.length ? 'Every feature Claude suggested is already on the list.' : oddShape(r) ? SHAPE_MSG : 'Claude did not suggest any new features.');
  if (id === S.activeId) S.focusSel = ['#prop-features-h', '[data-act="ai-features"]'];
  renderSheet();
  if (fs.length) announce(`Claude suggests ${many(fs.length, 'feature', 'features')}${id === S.activeId ? '' : ` for ${oneLine(q.name) || 'your project'}`}. Choose which to add.`);
}

async function aiReview(id) {
  const p = S.projects.get(id);
  if (!p) return;
  const h = health(p);
  const prompt = [
    'Review this project plan like an experienced engineer who coaches people building with Claude Code.', ABOUT,
    'Look for: a vague brief, too much scope for a first version, tasks too big or too vague for one Claude Code session, missing ways to test,',
    'risky ordering, missing CLAUDE.md conventions, and lessons that should become rules. Be specific to this project and kind.', '',
    'Reply with only JSON: {"headline": string (two sentences on the overall state and the single most useful next move),',
    ' "strengths": [string] (2 or 3), "risks": [string] (2 to 4),',
    ' "suggestions": [{"title": string, "why": string (one sentence), "type": "task" | "feature" | "rule"}] (4 to 6).',
    'For "task" and "feature", title is a concrete action under 80 characters. For "rule", title is the exact line to add to CLAUDE.md,',
    'written as an instruction to Claude, for example "Run npm test before saying a task is done".}',
    '', `Health checks passed: ${h.ok} of ${h.total}.`,
    'Weigh the pace against the target date, if there is one, and how recent the work is (see timing and the dates).',
    'Project:', contextOf(p),
  ].join('\n');
  const r = await askJSON(id + ':review', 'Claude is reviewing your project…', prompt);
  const q = S.projects.get(id);
  if (!q) return;
  const rr = unwrap(r, ['headline', 'suggestions']);
  const rev = mkReview(rr && typeof rr === 'object' ? { ...rr, at: nowISO() } : null);
  if (rev && (rev.headline || rev.suggestions.length)) { q.lastReview = rev; touch(q); }
  else if (r) toast('Claude returned an empty review. Try again.');
  if (id === S.activeId) S.focusSel = ['#review-h', '[data-act="ai-review"]'];
  renderSheet();
  if (rev && q.lastReview === rev) announce(`Claude's review${id === S.activeId ? '' : ` of ${oneLine(q.name) || 'your project'}`} is ready, with ${many(rev.suggestions.length, 'suggestion', 'suggestions')}.`);
}

// the end of a long paste, where Claude Code's report is
const clipEnd = (s, n) => (s.length > n ? '…' + s.slice(-n) : s);
async function aiFollowUps(m) {
  const p = active();
  if (!p || !canAsk() || m.busy) return;
  const ctl = new AbortController();
  m.busy = { ctl };
  m.step = 'suggest';
  renderModal();
  const prompt = [
    'A Claude Code session on this project just ended. Suggest what should happen next.', ABOUT, '',
    'Reply with only JSON: {"followUps": [{"title": string (starts with a verb, under 80 characters), "size": "S" | "M" | "L", "notes": string (one sentence on what to do and how to check it)}] (0 to 4 tasks for work the session left unfinished or revealed; an empty list if nothing is left),',
    ' "rule": string (one line for CLAUDE.md, written as an instruction to Claude, that would have prevented a problem in this session; an empty string if there was no problem)}',
    '', `Task: ${m.taskTitle}`, `Outcome: ${OUTCOMES.find((o) => o.k === m.outcome)?.label}`,
    `What Claude Code said at the end: ${clipEnd(m.summary.trim(), SUMMARY_MAX) || '(nothing pasted)'}`, `What went wrong: ${clipText(m.wrong.trim(), 4000, ' …') || '(nothing noted)'}`,
    '', 'Project:', contextOf(p, 30000),
  ].join('\n');
  try {
    const r = await S.sample.json(prompt, { signal: ctl.signal, cache: false });
    if (S.modal !== m) return;
    const q = active();
    const u = unwrap(r, ['followUps', 'tasks', 'rule']);
    const all = coerceMilestones([{ title: 'x', tasks: Array.isArray(u) ? u : arr(u?.followUps ?? u?.tasks) }], q || p)[0]?.tasks || [];
    const [tasks, gone] = newTasksOnly(q || p, all.slice(0, 6));
    const rule = ruleText(str(Array.isArray(u?.rule) ? u.rule.find((x) => str(x).trim()) : u?.rule));
    m.suggest = { tasks, rule, dropped: gone, odd: !all.length && !rule && oddShape(r), sel: new Set([...tasks.map((_, i) => 't' + i), ...(rule ? ['rule'] : [])]) };
  } catch (e) {
    if (S.modal === m) m.suggest = { tasks: [], rule: '', sel: new Set(), failed: !userStopped(e, ctl), stopped: userStopped(e, ctl) };
    onClaudeError(e, ctl, 'followups');
  } finally {
    if (S.modal === m) { m.busy = null; renderModal(); const n = m.suggest ? m.suggest.tasks.length + (m.suggest.rule ? 1 : 0) : 0; claudeListed('#fu-h', `Claude suggests ${many(n, 'follow-up', 'follow-ups')}.`, ['#modal-root [data-act="close-modal"]']); }
  }
}

async function aiSharpen() {
  const m = S.modal;
  if (!m || m.kind !== 'prompt' || !canAsk() || m.busy) return;
  const p = active();
  if (!p) return;
  const ta = $('#m-prompt');
  const original = ta ? ta.value : m.text;
  const ctl = new AbortController();
  m.busy = { ctl };
  m.text = original;
  renderModal();
  const prompt = [
    'Improve this prompt that will be pasted into Claude Code, an AI coding agent working in the user\'s repository.',
    'Make it clearer and more specific: state the goal, what done looks like, how to check the work, and anything to avoid.',
    'Keep every concrete detail: file names, commands, checks, and warnings such as lines with Never, Do not or Ask before. Keep its last instruction, about the summary and the Outcome and Went wrong lines, word for word.',
    `Keep the user's intent and keep it under ${Math.max(300, Math.ceil(original.split(/\s+/).filter(Boolean).length * 1.15 / 50) * 50)} words. Reply with only the improved prompt, no preamble.`, '',
    'Project context:', contextOf(p, 8000), '', 'Prompt to improve:', original,
  ].join('\n');
  try {
    const { text, truncated } = await S.sample(prompt, {
      signal: ctl.signal, cache: false,
      onText: ({ text }) => { const el = $('#m-prompt'); if (el && S.modal === m) el.value = text; },
    });
    // Log a session reads the Outcome and Went wrong lines, so they come back if Claude dropped them
    const tail = original.split('\n').filter((l) => /Outcome:/.test(l)).pop();
    if (truncated) { if (S.modal === m) m.text = original; toast("Claude's version was cut off before the end, so your prompt is unchanged. Try again."); return; }
    if (S.modal === m) { m.text = tail && !/Outcome:/i.test(text) ? `${text.trimEnd()}\n\n${tail.replace(/^\d+\.\s*/, '')}` : text; m.sharpened = true; m.original = original; announce('Claude sharpened the prompt. Read it over, or use the original.'); }
  } catch (e) {
    if (S.modal === m) m.text = original; // keep the prompt the user had
    onClaudeError(e, ctl, 'sharpen');
  } finally {
    if (S.modal === m) { m.busy = null; renderModal(); }
  }
}

/* ================= rendering ================= */
function renderAll() { renderRail(); renderSheet(); renderModal(); }

let railQueued = false;
function scheduleRail() {
  if (railQueued) return;
  railQueued = true;
  setTimeout(() => { railQueued = false; renderRail(); }, 60);
}

function renderStoreNote() {
  const el = $('#store-note');
  const base = S.role === 'guest' ? 'Shared with you to view. Its owner\'s projects stay private to them; yours are saved in this browser only.'
    : S.mode === 'db' && S.role === 'editor' ? 'Shared with you to edit. Changes are saved to its owner\'s projects, for everyone who can edit them.'
    : S.mode === 'db' ? 'Saved to your Claude account. Only you and editors you add can see these plans.'
    : S.mode === 'local' && Store.fallback ? 'Not connected to your Claude account. Changes are kept in this browser and saved to your account the next time the page connects.'
    : S.mode === 'local' ? 'Saved in this browser only.'
    : 'Connecting to your saved projects…';
  const problem = S.saveProblem || Object.values(Store.problems)[0];
  el.innerHTML = esc(base) + (problem ? `<p class="save-problem">${esc(problem)}${S.mode === 'db' && Store.parkFailed ? esc(NO_COPY) : ''}</p>` : '');
  const sb = $('#save-banner'); // the project's own banner; its region stays, so a change is read out once
  const msg = saveBannerMsg(S.activeId);
  if (sb && sb.dataset.msg !== msg) { sb.dataset.msg = msg; sb.innerHTML = saveBannerInner(msg); }
  guardLeave();
}
const NO_COPY = ' This browser cannot keep a copy either, so keep this tab open until it saves.';
// projects made in this browser before it reached the account: add them, or remove them from this browser
const LS_KEEPNOTE = 'shipyard.keepnote.v1';
// on Overview, for a planner kept in this browser only: once, until "Got it"; while not connected, until it is
function keepNoteHTML() {
  if (S.mode !== 'local' || S.role === 'guest') return '';
  if (Store.fallback) return '<p class="keep-note"><span><b>Not connected to your Claude account.</b> Changes are kept in this browser and saved to your account the next time the page connects.</span></p>';
  if (lsGet(LS_KEEPNOTE)) return '';
  return `<div class="keep-note" id="keep-note"><p><b>Saved in this browser only.</b> Shipyard is not connected to a Claude account here. Clearing this browser's data for the site removes your projects, so back them up now and then.</p>
    <div class="row"><button type="button" class="btn sm" data-act="backup">Back up all projects</button><button type="button" class="btn sm ghost" data-act="keep-ok">Got it</button></div></div>`;
}
function claimHTML() {
  const c = Store.claims;
  if ((S.mode !== 'db' && !Store.fallback) || !c) return '';
  const names = Object.values(c).map((x) => oneLine(x?.name) || 'Untitled project');
  if (!names.length) return '';
  const n = names.length;
  const list = n <= 3 ? names.map((x) => `"${x}"`).join(n === 2 ? ' and ' : ', ') : `${names.slice(0, 2).map((x) => `"${x}"`).join(', ')} and ${n - 2} more`;
  return `<section class="panel claim" aria-labelledby="claim-h">
    <h2 id="claim-h" tabindex="-1">${n === 1 ? 'A project saved only in this browser' : `${n} projects saved only in this browser`}</h2>
    <p>${esc(list)} ${n === 1 ? 'was' : 'were'} made here while Shipyard was not connected to ${S.role === 'editor' ? 'these shared projects' : 'your Claude account'}, so ${n === 1 ? 'it is' : 'they are'} not with the others yet.</p>
    <div class="row"><button type="button" class="btn primary" data-act="claim-add">${S.role === 'editor' ? 'Add to the shared projects' : 'Add to my projects'}</button><button type="button" class="btn ghost" data-act="claim-drop">Remove from this browser</button></div>
  </section>`;
}
// what stops the open project being saved, shown on the project itself: on a phone the project list is shut away
const saveBannerMsg = (id) => (id && Store.problems[id] && Store.problems[id] + (Store.parkFailed ? NO_COPY : '')) || (S.saveProblem === NO_LOCAL_SAVE ? NO_LOCAL_SAVE + roomNote() : S.saveProblem === UNREADABLE_STUCK ? UNREADABLE_STUCK : '');
const saveBannerInner = (msg) => (msg ? `<p class="save-problem save-banner"><b>Not saved.</b> ${esc(msg)}</p>` : '');

let railAllHTML = null;
const wnDot = () => !!(S.loaded && !S.wnSeen && newDot(lsGet(LS_SEEN), WN_VER, S.projects.size));
// on a phone the project list is shut away, so its Projects button carries the dot too
const mbarProjects = (dot) => `${ICON.menu}<span>Projects</span>${dot ? '<span class="new-dot" aria-hidden="true"></span>' : ''}`;
const mbarLabel = (dot) => (dot ? "Show projects (What's new is unread)" : 'Show projects');
function renderRail() {
  const keep = captureFocus($('#rail'));
  renderStoreNote();
  if (S.loaded && !S.projects.size && lsGet(LS_SEEN) == null) lsSet(LS_SEEN, WN_VER); // a first visit starts with everything seen
  const dot = wnDot();
  const ob = $('.mbar [data-act="open-drawer"]');
  if (ob && !!ob.querySelector('.new-dot') !== dot) { ob.innerHTML = mbarProjects(dot); ob.setAttribute('aria-label', mbarLabel(dot)); }
  const tools = S.loaded ? `<button type="button" class="btn sm ghost" data-act="help" aria-keyshortcuts="Shift+?">Help</button><button type="button" class="btn sm ghost" data-act="open-import">Import</button>${S.projects.size ? '<button type="button" class="btn sm ghost" data-act="backup">Back up all projects</button>' : ''}<button type="button" class="btn sm ghost" data-act="whats-new">What's new${dot ? '<span class="new-dot" aria-hidden="true"></span><span class="sr"> (unread)</span>' : ''}</button>` : '';
  if ($('#rail-tools').innerHTML !== tools) $('#rail-tools').innerHTML = tools;
  const list = $('#plist');
  const items = S.loaded ? sortedProjects() : [];
  const showSearch = items.length >= 6 || !!S.query;
  const search = $('#rail-search');
  if (!!search.firstChild !== showSearch) search.innerHTML = showSearch ? `<label class="sr" for="psearch">Find a project</label><input class="in psearch" type="search" id="psearch" placeholder="Find a project" autocomplete="off" spellcheck="false" value="${esc(S.query || '')}">` : '';
  const L = railLists(items, S.query, S.showArchived);
  const dash = S.view === 'all' && canDash();
  let allBtn = '';
  if (canDash()) {
    const live = dashList();
    const wk = weekOf(today());
    const doneNow = live.filter(([, p]) => !p.example).reduce((n, [, p]) => n + allTasks(p).filter((t) => t.status === 'done' && t.doneAt && weekOf(t.doneAt) === wk).length, 0);
    allBtn = `<button type="button" class="pitem all" data-act="open-all" aria-current="${dash}"><span class="dot" aria-hidden="true"></span><span class="nm">All projects</span><span class="meta">${plural(live.length, 'project', 'projects')} · ${doneNow} done this week</span></button>`;
  }
  if (railAllHTML !== allBtn) { railAllHTML = allBtn; $('#rail-all').innerHTML = allBtn; }
  const item = ([id, p]) => {
    const tasks = allTasks(p);
    const done = tasks.filter((t) => t.status === 'done').length;
    const stage = STAGES.find((s) => s.k === p.stage)?.label || 'Idea';
    const news = Away.news(id, p);
    return `<li><button type="button" class="pitem${p.archived ? ' archived' : ''}" data-act="open" data-id="${esc(id)}" aria-current="${id === S.activeId && !dash}">
      <span class="dot" data-stage="${esc(p.stage)}"></span><span class="nm">${esc(p.name || 'Untitled project')}</span>
      <span class="meta">${p.archived ? 'Archived · ' : ''}${p.example ? 'Example · ' : ''}${esc(stage)}${tasks.length ? ` · ${done}/${tasks.length} tasks` : ''}${news ? ` · <span class="away-n">${news.n} new</span>` : ''}</span></button></li>`;
  };
  list.innerHTML = !S.loaded ? '' : !items.length ? '<li class="hint" style="padding-inline:8px">No projects yet.</li>'
    : (L.live.map(item).join('')
      + (L.q && !L.live.length && !L.archived.length ? `<li class="hint" style="padding-inline:8px">No project matches "${esc(S.query.trim())}".</li>` : '')
      + (!L.q && !L.live.length && L.archivedCount ? '<li class="hint" style="padding-inline:8px">Every project is archived.</li>' : '')
      + (L.showArchived && L.archived.length ? `<li class="plist-sub" aria-hidden="true">Archived</li>${L.archived.map(item).join('')}` : '')
      + (!L.q && L.archivedCount ? `<li><button type="button" class="btn sm ghost show-arch" data-act="toggle-archived" aria-expanded="${!!S.showArchived}">${S.showArchived ? 'Hide archived' : `Show ${L.archivedCount} archived`}</button></li>` : ''));
  restoreFocus(keep);
}

// Focus is remembered by element id, or for buttons by their action and data attributes,
// so a re-render puts the cursor or keyboard focus back where it was.
function focusSelector(el) {
  if (el.id) return '#' + CSS.escape(el.id);
  const a = el.dataset?.act;
  if (!a) return null;
  let sel = `[data-act="${CSS.escape(a)}"]`;
  for (const k of ['id', 'mid', 'tid', 'k', 'i', 'p', 'd', 'key', 'kind']) {
    if (el.dataset[k] != null) sel += `[data-${k}="${CSS.escape(el.dataset[k])}"]`;
  }
  return sel;
}
function captureFocus(container) {
  const el = document.activeElement;
  if (!el || el === document.body || !container.contains(el)) return null;
  const sel = focusSelector(el);
  if (!sel) return null;
  const f = { sel, container };
  try { f.s = el.selectionStart; f.e = el.selectionEnd; } catch { /* not a text field */ }
  return f;
}
function restoreFocus(f) {
  if (!f) return false;
  let el = null;
  try { el = f.container.querySelector(f.sel); } catch { el = null; }
  if (!el || !focusable(el)) return false;
  el.focus({ preventScroll: true });
  try { if (f.s != null) el.setSelectionRange(f.s, f.e); } catch { /* not a text field */ }
  if (document.activeElement !== el) return false;
  try { el.scrollIntoView({ block: 'nearest' }); } catch { /* old browser */ } // a moved control stays in view
  return true;
}
function focusable(el) {
  return !!el && el.isConnected && !el.disabled && !el.closest('[inert]') && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
}
function focusEl(el) {
  if (!focusable(el)) return false;
  el.focus({ preventScroll: true });
  if (document.activeElement !== el) return false;
  try { el.scrollIntoView({ block: 'nearest' }); } catch { /* old browser */ }
  return true;
}
function focusFirst(sels) { // first usable match wins
  for (const sel of sels || []) {
    if (!sel) continue;
    if (typeof sel !== 'string') { if (focusEl(sel)) return true; continue; }
    let list = [];
    try { list = document.querySelectorAll(sel); } catch { list = []; }
    for (const el of list) if (focusEl(el)) return true;
  }
  return false;
}

const FIELD_SIZING = !!window.CSS?.supports?.('field-sizing', 'content'); // the browser grows text boxes to fit, whatever the spacing
function growable(el) { return !FIELD_SIZING && el.tagName === 'TEXTAREA' && !!el.closest('#sheet'); }
document.addEventListener('focusin', (e) => { if (growable(e.target)) grow(e.target); }); // elsewhere, a field is measured again when used
function grow(el) {
  const sc = $('#sheet').scrollTop; const dc = document.scrollingElement?.scrollTop || 0;
  el.style.height = 'auto';
  if (el.scrollHeight) el.style.height = el.scrollHeight + el.offsetHeight - el.clientHeight + 'px';
  $('#sheet').scrollTop = sc; if (document.scrollingElement) document.scrollingElement.scrollTop = dc;
}
function growAll() {
  const els = [...$('#sheet').querySelectorAll('textarea')].filter(growable);
  if (!els.length) return;
  const sc = $('#sheet').scrollTop; const dc = document.scrollingElement?.scrollTop || 0;
  els.forEach((el) => { el.style.height = 'auto'; });
  const hs = els.map((el) => (el.scrollHeight ? el.scrollHeight + el.offsetHeight - el.clientHeight : 0));
  els.forEach((el, i) => { if (hs[i]) el.style.height = hs[i] + 'px'; });
  $('#sheet').scrollTop = sc; if (document.scrollingElement) document.scrollingElement.scrollTop = dc;
}
let growTimer = null;
window.addEventListener('resize', () => { clearTimeout(growTimer); growTimer = setTimeout(growAll, 120); });
document.fonts?.ready?.then(() => growAll());

function renderSheet() { renderSheet0(); sayWorking('sheet', $('#sheet-inner')); }
// Lays new markup over what is on the page: elements that stay are kept and only changed where they differ, so the
// browser lays out only what changed, and focus, the caret and scroll positions stay put. Elements are matched by id,
// a list item by what labels it, the rest by their place
let sheetKey = ''; // what the sheet shows: the same thing again is morphed
const morphKey = (n) => (n.nodeType === 1 ? n.id || (n.tagName === 'LI' && n.getAttribute('aria-labelledby')) || '' : '');
function morphInto(root, html) {
  const t = document.createElement('template');
  t.innerHTML = html;
  morphKids(root, t.content);
}
function morphKids(cur, next) {
  const want = [...next.childNodes];
  let keyed = null;
  for (let n = cur.firstChild; n; n = n.nextSibling) { const k = morphKey(n); if (k) (keyed || (keyed = new Map())).set(n.tagName + '#' + k, n); }
  let at = cur.firstChild;
  for (const w of want) {
    const k = morphKey(w);
    let m = null;
    if (k) { m = keyed?.get(w.tagName + '#' + k) || null; if (m) keyed.delete(w.tagName + '#' + k); }
    else if (at && !morphKey(at) && at.nodeType === w.nodeType && (w.nodeType !== 1 || at.tagName === w.tagName)) m = at;
    if (!m) { cur.insertBefore(w, at); continue; }
    if (m === at) at = at.nextSibling; else cur.insertBefore(m, at);
    morphNode(m, w);
  }
  while (at) { const nx = at.nextSibling; cur.removeChild(at); at = nx; }
}
function morphNode(c, w) {
  if (c.nodeType !== 1) { if (c.nodeValue !== w.nodeValue) c.nodeValue = w.nodeValue; return; }
  const tag = c.tagName;
  if (tag !== 'TEXTAREA' && tag !== 'INPUT' && tag !== 'SELECT' && c.isEqualNode(w)) return; // nothing in it changed
  const wa = w.attributes; const ca = c.attributes;
  for (let i = 0; i < wa.length; i++) { const x = wa[i]; if (c.getAttribute(x.name) !== x.value) c.setAttribute(x.name, x.value); }
  if (ca.length !== wa.length) for (let i = ca.length - 1; i >= 0; i--) { const n = ca[i].name; if (!w.hasAttribute(n)) c.removeAttribute(n); }
  if (tag === 'TEXTAREA') { const v = w.value; if (c.value !== v) c.value = v; if (c.defaultValue !== v) c.defaultValue = v; return; }
  if (tag === 'INPUT') {
    if (c.type === 'checkbox' || c.type === 'radio') c.checked = w.hasAttribute('checked');
    else if (c.type !== 'file') { const v = w.getAttribute('value') || ''; if (c.value !== v) c.value = v; }
    return;
  }
  morphKids(c, w);
  if (tag === 'SELECT') { const i = [...w.options].findIndex((o) => o.hasAttribute('selected')); const j = i < 0 ? 0 : i; if (c.selectedIndex !== j) c.selectedIndex = j; }
}
function renderSheet0() {
  const root = $('#sheet-inner');
  const f = captureFocus(root);
  const mbar = `<div class="mbar"><button type="button" class="btn sm" data-act="open-drawer" aria-label="${mbarLabel(wnDot())}" aria-controls="rail" aria-expanded="${$('#app').classList.contains('drawer')}">${mbarProjects(wnDot())}</button><b>Shipyard</b><button type="button" class="btn sm primary" data-act="new-project">New</button></div>`;
  if (!S.loaded) { root.innerHTML = mbar + '<div class="loading"><span class="pulse"></span>Loading your projects…</div>'; return; }
  const p = active();
  if (S.view === 'all' && !canDash()) S.view = 'project';
  const dash = S.view === 'all';
  if (p && !dash) primeSeen(p);
  const html = mbar + claimHTML() + (dash ? dashHTML() : p ? projectHTML(p) : welcomeHTML());
  const key = dash ? 'all' : p ? `${S.activeId}:${S.tab}` : 'welcome';
  if (key === sheetKey) morphInto(root, html); else root.innerHTML = html; // another tab or project: built afresh
  sheetKey = key;
  growAll();
  stageInView();
  fileTabInView();
  const fallback = S.focusSel;
  S.focusSel = null;
  if (S.focusAfter) {
    const el = document.getElementById(S.focusAfter);
    S.focusAfter = null;
    if (el) { el.focus(); return; }
  }
  if (!restoreFocus(f) && fallback && !S.modal) focusFirst(fallback);
}

// on a phone the stages scroll sideways in one line: the one set stays in sight
function stageInView() {
  const g = $('.stages');
  if (!g || !matchMedia('(max-width: 560px)').matches || g.scrollWidth <= g.clientWidth) return;
  const on = g.querySelector('[aria-pressed="true"]');
  if (!on || (g === stageSeen.g && on === stageSeen.on)) return;
  stageSeen.g = g; stageSeen.on = on;
  g.scrollLeft = Math.max(0, on.offsetLeft + on.offsetWidth / 2 - g.clientWidth / 2);
}
const stageSeen = { g: null, on: null };
// the same for the row of files on Project files
function fileTabInView() {
  const g = $('.file-tabs');
  if (!g || g.scrollWidth <= g.clientWidth) return;
  const on = g.querySelector('[aria-pressed="true"]');
  if (!on || (g === fileSeen.g && on === fileSeen.on)) return;
  fileSeen.g = g; fileSeen.on = on;
  const a = g.getBoundingClientRect(), r = on.getBoundingClientRect();
  if (r.left < a.left || r.right > a.right) g.scrollLeft += r.left + r.width / 2 - (a.left + a.width / 2);
}
const fileSeen = { g: null, on: null };

function welcomeHTML() {
  const ai = canAsk();
  return `<section class="welcome">
    <h1>Plan your next Claude Code build</h1>
    <p>Shipyard keeps each project's brief, features, step-by-step plan and CLAUDE.md (the notes Claude Code reads first) in one place, then turns any task into a ready-to-paste prompt for Claude Code.</p>
    ${S.mode === 'local' && S.role !== 'guest' ? `<p class="w-guest">${Store.fallback ? '<b>Not connected to your Claude account.</b> Changes are kept in this browser and saved to your account the next time the page connects.' : '<b>Saved in this browser only.</b> Shipyard is not connected to a Claude account here, so what you make stays in this browser. Back up all projects now and then to keep a copy.'}</p>` : ''}
    ${S.role === 'guest' ? '<p class="w-guest"><b>Someone shared this planner with you.</b> The projects in it belong to them and stay private. What you start here is yours, saved in this browser only, so use Back up all projects now and then to keep a copy.</p>' : ''}
    <p class="w-needs"><b>You will need Claude Code</b> to do the building. It comes with a paid Claude plan (Pro, Max, Team or Enterprise) and runs in a terminal or the Claude desktop app. <button type="button" class="linkish" data-act="cc-setup">See how to start it</button></p>
    <div class="row"><button type="button" class="btn primary" data-act="new-project">Start a project</button><button type="button" class="btn" data-act="open-import">Import a project</button><button type="button" class="btn ghost" data-act="example">Explore an example</button></div>
    <ol class="steps3">
      <li><b>Describe it</b><span>Say what you are building, who it is for and what done looks like.${ai ? ' Claude can draft it from a one-line idea.' : ''}</span></li>
      <li><b>Plan it</b><span>Pick the must-have features and turn each one into small tasks that each fit in one Claude Code session: one sitting, often 15 to 45 minutes.</span></li>
      <li><b>Build it</b><span>Save the project's files in its folder, paste each task's prompt into Claude Code, and log how it went. Lessons become rules in CLAUDE.md.</span></li>
    </ol>
  </section>`;
}

function gaugeHTML(p) {
  const tasks = allTasks(p);
  if (!tasks.length) {
    const msg = p.milestones.length ? 'No tasks yet. Add tasks on the Plan tab.' : 'No tasks yet. Add milestones on the Plan tab.';
    return `<div class="gauge"><div class="gauge-bar"><div class="seg" style="flex:1"></div></div><div class="gauge-legend"><span>${msg}</span></div></div>`;
  }
  const done = tasks.filter((t) => t.status === 'done').length;
  const msDone = p.milestones.filter((m) => m.tasks.length && m.tasks.every((t) => t.status === 'done')).length;
  const segs = p.milestones.map((m, i) => {
    const n = m.tasks.length;
    const d = m.tasks.filter((t) => t.status === 'done').length;
    const pct = n ? Math.round((d / n) * 100) : 0;
    return `<div class="seg${n && d === n ? ' done' : ''}" style="flex:${Math.max(n, 1)}" title="Milestone ${i + 1}: ${esc(m.title || 'Untitled')} (${d} of ${n} done)"><span style="width:${pct}%"></span></div>`;
  }).join('');
  const tw = tasks.length === 1 ? 'task' : 'tasks';
  return `<div class="gauge" role="img" aria-label="${done} of ${tasks.length} ${tw} done"><div class="gauge-bar">${segs}</div>
    <div class="gauge-legend" aria-hidden="true"><span><b>${done}</b> of ${tasks.length} ${tw} done</span><span><b>${msDone}</b> of ${p.milestones.length} ${p.milestones.length === 1 ? 'milestone' : 'milestones'} complete</span></div></div>`;
}

function projectHTML(p) {
  const id = S.activeId;
  const confirmDel = S.confirm?.kind === 'project' && S.confirm.id === id;
  const tabCount = { design: p.features.length, plan: allTasks(p).filter((t) => t.status !== 'done').length };
  return `<header class="phead">
    <div class="phead-top">
      <h1 class="sr" id="phead-h">${esc(p.name.trim() || 'Untitled project')}</h1>
      <label class="sr" for="f-name">Project name</label>
      <textarea class="pname one" id="f-name" data-path="name" rows="1" placeholder="Untitled project" autocomplete="off" spellcheck="false">${esc(p.name)}</textarea>
      <div class="phead-actions">
        <button type="button" class="btn sm ghost find-btn" data-act="find" aria-keyshortcuts="Control+K Meta+K /" title="Find in this project (Ctrl+K)">${ICON.search}<span>Find</span></button>
        <button type="button" class="btn sm export-main" data-act="export">Export plan</button>
        <div class="more">
          <button type="button" class="btn sm ghost" id="more-btn" data-act="toggle-more" aria-expanded="${!!S.moreOpen}" aria-controls="more-list">More<span class="caret" aria-hidden="true"></span></button>
          <div class="more-list" id="more-list" ${S.moreOpen ? '' : 'hidden'}>
            <button type="button" class="btn sm ghost more-only" data-act="export">Export plan</button>
            <button type="button" class="btn sm ghost" data-act="duplicate">Duplicate</button>
            ${p.archived ? '' : '<button type="button" class="btn sm ghost" data-act="archive">Archive</button>'}
            <button type="button" class="btn sm ghost danger" data-act="ask-delete">Delete</button>
          </div>
        </div>
      </div>
    </div>
    ${p.example ? '<div class="archived-note" role="note"><span>An example to explore. Its history is made up, so All projects leaves it out of your totals. Change anything, and delete it when you are done.</span></div>' : ''}
    ${p.archived ? '<div class="archived-note" role="note"><span>Archived. This project is hidden from the project list until you restore it.</span><button type="button" class="btn sm" id="unarchive" data-act="unarchive">Restore</button></div>' : ''}
    <div id="save-banner" role="alert" data-msg="${esc(saveBannerMsg(id))}">${saveBannerInner(saveBannerMsg(id))}</div>
    ${confirmDel ? `<div class="confirm" role="alert"><span>Delete <b>${esc(p.name.trim() || 'Untitled project')}</b> and everything in it? This cannot be undone.</span>
      <button type="button" class="btn sm danger solid" data-act="delete-project">Delete project</button><button type="button" class="btn sm" data-act="cancel-confirm">Keep it</button></div>` : ''}
    ${guideOpen(p) ? '' : `<div class="stage-row"><span class="stage-lbl" id="stage-lbl">Stage</span><div class="stages" role="group" aria-labelledby="stage-lbl">${STAGES.map((s) => `<button type="button" class="stage" data-act="stage" data-k="${s.k}" aria-pressed="${p.stage === s.k}"><span class="dot" data-stage="${s.k}"></span>${s.label}</button>`).join('')}</div></div>`}
    <div id="gauge">${gaugeHTML(p)}</div>
  </header>
  <div class="tabs" role="tablist" aria-label="Project sections">${TABS.map((t) => `<button type="button" role="tab" class="tab" id="tab-${t.k}" data-act="tab" data-k="${t.k}" aria-selected="${S.tab === t.k}" tabindex="${S.tab === t.k ? 0 : -1}" aria-controls="panel">${t.label}${tabCount[t.k] ? `<span class="count"><span class="sr">, </span>${tabCount[t.k]}</span>` : ''}</button>`).join('')}</div>
  <section id="panel" role="tabpanel" aria-labelledby="tab-${S.tab}">${panelHTML(p)}</section>`;
}

function panelHTML(p) {
  switch (S.tab) {
    case 'design': return guideBarHTML(p) + designHTML(p);
    case 'plan': return guideBarHTML(p) + planHTML(p);
    case 'claudemd': return guideBarHTML(p) + claudeMdHTML(p);
    case 'improve': return guideBarHTML(p) + improveHTML(p);
    default: return overviewHTML(p);
  }
}

function workingHTML(key) {
  const b = S.busy[key];
  if (!b) return '';
  return workingLine(b.label, `data-act="stop" data-key="${esc(key)}"`);
}
// "Claude is drafting milestones…" with a Stop button named "Stop drafting milestones". The line is redrawn often, so it is
// not a live region itself: sayWorking reads it out once, through the page's one status region, when it first appears
function workingLine(label, stopAttrs) {
  const what = str(label).replace(/^Claude is /, '').replace(/…$/, '');
  return `<div class="working"><span class="pulse"></span><span class="w-label">${esc(label)}</span><button type="button" class="btn sm" ${stopAttrs} aria-label="Stop ${esc(what)}">Stop</button></div>`;
}
const saidWorking = { sheet: [], modal: [] };
function sayWorking(where, root) {
  const now = root ? [...root.querySelectorAll('.working .w-label')].map((x) => x.textContent) : [];
  now.filter((t) => !saidWorking[where].includes(t)).forEach((t) => announce(t));
  saidWorking[where] = now;
}
// when Claude's suggestions arrive: focus goes to the list's heading, and a status line says how many there are
function claudeListed(headSel, msg, fallback) {
  const hd = $(headSel);
  if (hd) { hd.tabIndex = -1; hd.focus(); announce(msg); return true; }
  const note = $('#modal-root .empty-note');
  if (note) announce(note.textContent);
  focusFirst(fallback);
  return false;
}
const many = (n, one, more) => `${n} ${n === 1 ? one : more}`;

function field(p, path, label, o = {}) {
  const id = fid(path);
  const v = esc(p[path]);
  const cls = o.mono ? ' mono' : '';
  const ctl = o.one
    ? `<textarea class="in one${cls}" id="${id}" data-path="${path}" rows="1" placeholder="${esc(o.ph || '')}" autocomplete="off">${v}</textarea>`
    : o.rows
    ? `<textarea class="ta${cls}" id="${id}" data-path="${path}" rows="${o.rows}" placeholder="${esc(o.ph || '')}"${o.mono ? ' spellcheck="false"' : ''}>${v}</textarea>`
    : `<input class="in${cls}" id="${id}" data-path="${path}" value="${v}" placeholder="${esc(o.ph || '')}" autocomplete="off">`;
  return `<div class="${o.wide ? 'wide' : ''}"><label class="lbl" for="${id}">${esc(label)}</label>${ctl}${o.hint ? `<p class="hint">${esc(o.hint)}</p>` : ''}</div>`;
}

/* ---------- ask Claude about this project ---------- */
const CHAT_KEEP = 6;
const ASK_IDEAS = ['What should I build next, and why?', 'Is this plan realistic for one person with Claude Code?', 'What is most likely to go wrong?', 'How should I deploy this?'];
function chatIntro(p) {
  return ['You are helping the owner of a software project that is being built with Claude Code, an AI coding agent. The owner may not be a professional developer.',
    'Answer their question using the project details below. Be direct and practical, in plain words. Keep answers short (under 250 words) unless they ask for more, and use short paragraphs or lists.',
    'When you suggest work, phrase it as small tasks that each fit in one Claude Code session. If you need something the details do not say, say what you are assuming.',
    'The details give today\'s date, the target date, the pace and dates on sessions, bugs and finished tasks, so you can answer questions about timing and what changed lately.',
    '', 'Project details (JSON):', contextOf(p, 40000)].join('\n');
}
async function askClaude(id, q) {
  const p = S.projects.get(id);
  q = clipText(str(q).trim(), 4000, ' …'); // as it is kept
  if (!p || !q || !canAsk() || S.busy[id + ':chat']) return;
  const ctl = new AbortController();
  S.busy[id + ':chat'] = { ctl, label: 'Claude is answering…' };
  S.chatLive[id] = { q, a: '' };
  S.askDraft[id] = '';
  if (id === S.activeId) { S.focusAfter = 'ask-q'; renderSheet(); }
  let text = ''; let stopped = false; let failed = false;
  try {
    const r = await S.sample(chatMessages(p, q, chatIntro(p)), {
      signal: ctl.signal, cache: false,
      onText: ({ text: t }) => { S.chatLive[id].a = t; const el = document.getElementById('chat-live'); if (el && id === S.activeId) el.innerHTML = mdLite(t); },
    });
    text = str(r?.text);
    failed = !!r?.truncated; // cut short: shown as broken off
  } catch (e) {
    text = str(e?.text || S.chatLive[id]?.a);
    stopped = userStopped(e, ctl);
    failed = !stopped;
    onClaudeError(e, ctl, 'ask');
  } finally {
    delete S.busy[id + ':chat'];
    delete S.chatLive[id];
  }
  const cur = S.projects.get(id);
  if (!cur) return;
  if (text.trim() || stopped) {
    cur.chat.push(mkChat({ q, a: text, stopped, failed, by: S.role }, newIds(cur))); // in a shared planner, whether the owner or an editor asked
    if (cur.chat.length > CHAT_KEEP) cur.chat.splice(0, cur.chat.length - CHAT_KEEP);
    touch(cur);
  } else if (failed && !S.askDraft[id]) S.askDraft[id] = q; // nothing came back: the question is put back to try again
  if (id === S.activeId) { S.focusSel = ['#ask-q']; renderSheet(); }
  announce(failed ? 'Claude could not answer.' : stopped ? 'Stopped.' : 'Claude answered.');
}
// who asked: the owner and the people they share the planner with to edit see each other's questions
const askedBy = (x) => (x.by && S.role && x.by !== S.role && S.role !== 'guest' ? (x.by === 'editor' ? 'Someone you share with' : 'The owner') : 'You');
function askHTML(p) {
  if (!canAsk() && !p.chat.length) return '';
  const id = S.activeId;
  const busy = !!S.busy[id + ':chat'];
  const live = S.chatLive[id];
  const items = p.chat.map((x) => `<li class="q"><span class="who">${askedBy(x)}</span><p>${esc(x.q)}</p></li>
      <li class="a"><span class="who">Claude${x.at ? `<span class="when"> · ${esc(dayLabel(localDay(x.at)))}</span>` : ''}</span><div class="md" id="${fid(`chat.${x.id}.a`)}" tabindex="-1">${mdLite(x.a) || '<p class="hint">No answer.</p>'}</div>
        <div class="a-foot">${x.failed ? '<span class="hint">The answer broke off. Ask again for the rest.</span>' : x.stopped ? '<span class="hint">Stopped before the end.</span>' : '<span></span>'}<span class="a-tools">${canAsk() && x.a.trim() && !busy ? `<button type="button" class="btn sm ghost" id="${fid(`chat.${x.id}.tasks`)}" data-act="chat-tasks" data-id="${x.id}" aria-label="Turn into tasks: the answer to ${esc(oneLine(x.q).slice(0, 80))}">Turn into tasks</button>` : ''}<button type="button" class="btn sm ghost" id="${fid(`chat.${x.id}.copy`)}" data-act="chat-copy" data-id="${x.id}" aria-label="Copy the answer to: ${esc(oneLine(x.q).slice(0, 80))}">Copy</button></span></div></li>`).join('')
    + (live ? `<li class="q"><span class="who">You</span><p>${esc(live.q)}</p></li>
      <li class="a" aria-busy="true"><span class="who">Claude</span><div class="md" id="chat-live">${mdLite(live.a) || '<p class="hint">Thinking…</p>'}</div></li>` : '');
  return `<section class="panel ask" aria-labelledby="ask-h">
    <div class="panel-head"><h2 id="ask-h">Ask Claude about this project</h2><p>${canAsk() ? 'Claude sees your brief, features, plan, bugs, recent sessions and dates, so you can skip the background.' : 'Claude cannot be asked from this page right now. It can when Shipyard is open on claude.ai, signed in. Earlier answers stay here.'}</p>
      ${p.chat.length && !busy ? '<button type="button" class="btn sm ghost" data-act="chat-clear">Clear</button>' : ''}</div>
    ${items ? `<ol class="chat">${items}</ol>` : canAsk() ? `<div class="ask-ideas" role="group" aria-label="Questions to start with">${ASK_IDEAS.map((q) => `<button type="button" class="chip" data-act="chat-idea" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>` : ''}
    ${canAsk() ? `<div class="ask-row">
      <label class="sr" for="ask-q">Your question</label>
      <textarea class="ta" id="ask-q" rows="2" placeholder="Ask anything, for example: which must-have is riskiest?">${esc(S.askDraft[id] || '')}</textarea>
      ${busy ? '<button type="button" class="btn" data-act="chat-stop">Stop</button>' : '<button type="button" class="btn primary" data-act="chat-send">Ask</button>'}
    </div>
    <p class="hint"><span class="kbd-tip">${modKey()}+Enter sends. </span>The last ${CHAT_KEEP} questions and answers are kept with the project.</p>` : ''}
  </section>`;
}

/* ---------- find in a project ---------- */
const FIND_MAX = 60;
const BRIEF_FIELDS = [['pitch', 'Pitch'], ['audience', 'Who it is for'], ['problem', 'Problem it solves'], ['doneWhen', 'Done when'], ['stack', 'Tech stack'], ['commands', 'How to run and test'], ['conventions', 'Rules for Claude Code'], ['constraints', 'Constraints'], ['repo', 'GitHub link']];
const findWords = (q) => [...new Set(str(q).toLowerCase().split(/\s+/).filter(Boolean))].slice(0, 8);
// every item whose text holds all the words; the ones with the words in their name first
function findIn(p, q) {
  const words = findWords(q);
  if (!words.length) return [];
  const hits = [];
  const has = (t, w) => str(t).toLowerCase().includes(w);
  // fields: [field, text], the first being the item's name
  const add = (o, fields) => {
    if (!words.every((w) => fields.some(([, t]) => has(t, w)))) return;
    // the field to show and go to: the name when it holds every word, else the one holding most of the rest (a brief field: its text)
    const rest = words.filter((w) => !has(fields[0][1], w));
    let f = fields[0]; let best = 0;
    if (o.kind === 'brief') f = fields[1];
    else for (const x of fields.slice(1)) { const n = rest.filter((w) => has(x[1], w)).length; if (n > best) { best = n; f = x; } }
    hits.push({ ...o, field: f[0], nameField: fields[0][0], name: oneLine(fields[0][1]), text: str(f[1]), score: words.length - rest.length });
  };
  const ms = (m) => `Milestone ${p.milestones.indexOf(m) + 1}`;
  p.milestones.forEach((m) => {
    add({ kind: 'milestone', id: m.id, tab: 'plan', label: ms(m) }, [['title', m.title || 'Untitled milestone'], ['goal', m.goal]]);
    m.tasks.forEach((t) => add({ kind: 'task', id: t.id, mid: m.id, tab: 'plan', label: `Task · ${ms(m)} · ${STATUS[t.status]}` }, [['title', t.title || 'Untitled task'], ['notes', t.notes]]));
  });
  for (const b of p.bugs) add({ kind: 'bug', id: b.id, tab: 'plan', label: `Bug · ${b.status === 'fixed' ? 'Fixed' : `Open, ${(SEVERITY.find((s) => s.k === b.severity)?.label || '').toLowerCase()}`}` }, [['title', b.title || 'Untitled bug'], ['actual', b.actual], ['expected', b.expected], ['steps', b.steps], ['error', b.error]]);
  [...p.sessions].reverse().forEach((s) => add({ kind: 'session', id: s.id, tab: 'improve', label: `Session · ${dayLabel(s.date)} · ${(OUTCOMES.find((o) => o.k === s.outcome)?.short || '').toLowerCase()}` }, [['task', s.task || 'Untitled task'], ['summary', reportBody(untermText(s.summary))], ['wrong', s.wrong]]));
  for (const l of p.lessons) add({ kind: 'lesson', id: l.id, tab: 'improve', label: `Lesson · ${dayLabel(l.date)}` }, [['happened', l.happened || 'Untitled lesson'], ['change', l.change]]);
  for (const d of p.decisions) add({ kind: 'decision', id: d.id, tab: 'design', label: `Decision${d.date ? ` · ${dayLabel(d.date)}` : ''}` }, [['text', d.text || 'Untitled decision'], ['why', d.why]]);
  for (const f of p.features) add({ kind: 'feature', id: f.id, tab: 'design', label: `Feature · ${PRIORITIES.find((x) => x.k === f.priority)?.label || ''}` }, [['title', f.title || 'Untitled feature'], ['detail', f.detail]]);
  for (const s of p.screens) add({ kind: 'screen', id: s.id, tab: 'design', label: 'Screen' }, [['name', s.name || 'Untitled screen'], ['notes', s.notes]]);
  for (const e of p.entities) add({ kind: 'entity', id: e.id, tab: 'design', label: 'Data model' }, [['name', e.name || 'Untitled'], ['fields', e.fields], ['notes', e.notes]]);
  for (const [k, label] of BRIEF_FIELDS) if (str(p[k]).trim()) add({ kind: 'brief', id: k, tab: 'overview', label: 'Brief' }, [['label', label], [k, p[k]]]);
  for (const x of p.prompts) add({ kind: 'prompt', id: x.id, tab: 'improve', label: 'Your prompt' }, [['title', x.title || 'Untitled prompt'], ['text', x.text]]);
  [...p.chat].reverse().forEach((c) => add({ kind: 'chat', id: c.id, tab: 'overview', label: 'Asked Claude' }, [['q', c.q || 'A question'], ['a', c.a]]));
  return hits.map((x, i) => [x, i]).sort((x, y) => y[0].score - x[0].score || x[1] - y[1]).map(([x]) => x);
}
// the text with the words marked; a long text shows the part around the first one
function markHTML(text, words, max = 0) {
  let t = str(text).replace(/\s+/g, ' ').trim();
  let pre = ''; let post = '';
  if (max && t.length > max) {
    const low = t.toLowerCase();
    const at = Math.min(...words.map((w) => low.indexOf(w)).filter((i) => i >= 0), t.length);
    const from = Math.max(0, Math.min(at - Math.floor(max / 3), t.length - max));
    if (from > 0) { pre = '…'; t = t.slice(from); }
    if (t.length > max) { post = '…'; t = t.slice(0, max); }
  }
  const low = t.toLowerCase();
  const on = new Array(t.length).fill(false);
  for (const w of words) for (let i = low.indexOf(w); i >= 0; i = low.indexOf(w, i + 1)) for (let k = i; k < i + w.length; k++) on[k] = true;
  let out = ''; let i = 0;
  while (i < t.length) { let j = i; while (j < t.length && on[j] === on[i]) j++; out += on[i] ? `<mark>${esc(t.slice(i, j))}</mark>` : esc(t.slice(i, j)); i = j; }
  return pre + out + post;
}
function findResultsHTML(m) {
  const words = findWords(m.q);
  return m.hits.slice(0, FIND_MAX).map((x, i) => `<li><button type="button" class="find-hit" data-act="find-go" data-i="${i}">
      <span class="fk">${esc(x.label)}</span><b>${markHTML(x.name, words, 140)}</b>${x.field === x.nameField ? '' : `<span class="fs">${markHTML(x.text, words, 140)}</span>`}</button></li>`).join('');
}
function findCount(m) {
  const n = m.hits.length;
  if (!findWords(m.q).length) return 'Type a word or two.';
  if (!n) return 'Nothing matches. Try fewer or shorter words.';
  return n > FIND_MAX ? `${FIND_MAX} of ${n} matches shown. Add a word to narrow it.` : `${plural(n, 'match', 'matches')}.`;
}
function openFind() {
  const p = active();
  if (!p || S.view === 'all') return;
  const q = S.findQ || '';
  openModal({ kind: 'find', q, hits: findIn(p, q) });
  const el = $('#find-q');
  if (el) { el.focus(); el.select(); }
}
// opens the tab a result is on, unfolds what hides it, and puts the cursor on it
function goToHit(p, x) {
  let target = '';
  switch (x.kind) {
    case 'task': {
      const m = p.milestones.find((y) => y.id === x.mid);
      if (!m || !m.tasks.some((t) => t.id === x.id)) return;
      S.openMs.add(m.id);
      S.openRun.add(m.id);
      if (x.field === 'notes') S.openNotes.add(x.id);
      target = fid(`milestones.${m.id}.tasks.${x.id}.${x.field === 'notes' ? 'notes' : 'title'}`);
      break;
    }
    case 'milestone': S.openMs.add(x.id); target = fid(`milestones.${x.id}.${x.field === 'goal' ? 'goal' : 'title'}`); break;
    case 'bug': {
      const b = p.bugs.find((y) => y.id === x.id);
      if (!b) return;
      if (b.status !== 'open') S.showFixed = true;
      if (x.field !== 'title') S.openNotes.add(b.id);
      target = fid(`bugs.${b.id}.${x.field}`);
      break;
    }
    case 'session': {
      const i = p.sessions.findIndex((y) => y.id === x.id);
      if (i < 0) return;
      if (i < p.sessions.length - 20) S.allSessions = true;
      if (x.field !== 'task') S.openSessions.add(x.id);
      target = fid(`sessions.${x.id}.task`);
      break;
    }
    case 'lesson': if (lessonInMd(p, p.lessons.find((y) => y.id === x.id) || {})) S.allLessons = true; target = fid(`lessons.${x.id}.${x.field === 'change' ? 'change' : 'happened'}`); break;
    case 'decision': target = fid(`decisions.${x.id}.${x.field === 'why' ? 'why' : 'text'}`); break;
    case 'feature': target = fid(`features.${x.id}.${x.field === 'detail' ? 'detail' : 'title'}`); break;
    case 'screen': target = fid(`screens.${x.id}.${x.field === 'notes' ? 'notes' : 'name'}`); break;
    case 'entity': target = fid(`entities.${x.id}.${x.field}`); break;
    case 'brief': target = fid(x.id); break;
    case 'prompt': target = fid(`prompts.${x.id}.${x.field === 'text' ? 'text' : 'title'}`); break;
    case 'chat': target = fid(`chat.${x.id}.a`); break;
    default: return;
  }
  S.view = 'project'; S.tab = x.tab; S.confirm = null; saveUI();
  S.focusAfter = target;
  renderSheet();
  const el = document.getElementById(target);
  const row = el?.closest('.task, .bug, .session, .lesson, .own-prompt, li, .panel');
  if (row) { row.classList.remove('found'); void row.offsetWidth; row.classList.add('found'); }
  if (!el || document.activeElement !== el) announce(`${x.label}: ${x.name}.`);
}

/* ---------- getting started ---------- */
// breaks after each / and before a file's extension
const pathBits = (s) => { const out = str(s).replace(/\//g, '/\u0001').replace(/(\w)(?=\.\w)/g, '$1\u0001').split('\u0001'); if (out.length > 1 && !out[out.length - 1]) out.pop(); return out; };
const pathHTML = (s) => pathBits(s).map((x) => `<span class="nb">${esc(x)}</span>`).join('<wbr>');
const NEW_TO_CC = '<button type="button" class="btn sm ghost" data-act="cc-setup">New to Claude Code?</button>';
// shown until hidden or the first session, or again when asked for
const guideOpen = (p) => !p.guideHidden && (!p.sessions.length || p.guideAgain);
// the buttons for a getting-started step; on a tab other than Overview, a button that would only open that tab is left out
function guideAction(p, s, where = 'overview') {
  const nu = nextUp(p);
  const ai = canAsk();
  const skip = p.fromCode ? '<button type="button" class="btn sm ghost" data-act="guide-ok" data-k="brief">Skip for now</button>' : '';
  const cc = where === 'overview' ? NEW_TO_CC : '';
  switch (s.k) {
    case 'pitch': return '<button type="button" class="btn sm primary" data-act="guide-field" data-k="f-pitch">Write the pitch</button>';
    case 'brief': return ai && p.pitch.trim() && where === 'overview' ? `<button type="button" class="btn sm ai" data-act="ai-fill" ${S.busy[S.activeId + ':fill'] || drafting(S.activeId) ? 'disabled' : ''}>Ask Claude to draft it</button><button type="button" class="btn sm" data-act="guide-field" data-k="f-${s.field}">Write it myself</button>${skip}` : `<button type="button" class="btn sm primary" data-act="guide-field" data-k="f-${s.field}">Fill in the brief</button>${skip}`;
    case 'features': {
      const ok = p.fromCode && p.features.some((f) => f.priority === 'must' && f.title.trim()) ? '<button type="button" class="btn sm" data-act="guide-ok" data-k="features">They look right</button>' : '';
      if (where !== 'design') return `<button type="button" class="btn sm primary" data-act="tab" data-k="design">Open Design</button>${ok}`;
      return p.fromCode ? ok : '<button type="button" class="btn sm primary" data-act="add-feature" data-p="must">Add a must-have</button>';
    }
    case 'plan': {
      const open = where === 'plan' ? '' : `<button type="button" class="btn sm${s.fid ? '' : ' primary'}" data-act="tab" data-k="plan">Open Plan</button>`;
      return s.fid ? `<button type="button" class="btn sm primary" data-act="plan-feature" data-id="${s.fid}" aria-label="Plan ${esc(oneLine(p.features.find((f) => f.id === s.fid)?.title))}">Plan it</button>${open}` : open;
    }
    case 'files': return `<button type="button" class="btn sm primary" data-act="save-all">Get the setup prompt</button>${where === 'claudemd' ? '' : `<button type="button" class="btn sm" data-act="guide-files" data-k="${p.copied?.claudemd ? 'plan' : 'claudemd'}">Open Project files</button>`}${NEW_TO_CC}`; // the step that needs Claude Code: its help on every tab
    case 'first': return (nu ? `<button type="button" class="btn sm primary" data-act="prompt" data-mid="${nu.m.id}" data-tid="${nu.t.id}">Get the task prompt</button>` : where === 'plan' ? '' : '<button type="button" class="btn sm primary" data-act="tab" data-k="plan">Open Plan</button>') + cc;
    default: return '<button type="button" class="btn sm primary" data-act="log-session">Log a session</button>';
  }
}
// on the other tabs, the guide's next step in one line, so the way on is never only on Overview
function guideBarHTML(p) {
  if (!guideOpen(p)) return '';
  const steps = guideSteps(p);
  const i = steps.findIndex((s) => !s.done);
  if (i < 0) return '';
  const s = steps[i];
  const which = s.k === 'plan' && s.fid ? ` <span class="gb-d">Next: "${esc(oneLine(p.features.find((f) => f.id === s.fid)?.title))}"</span>` : '';
  return `<aside class="guide-bar" aria-label="Getting started">
    <p><span class="gb-n">Step ${i + 1} of ${steps.length}</span> <b>${esc(s.label)}</b>${which}</p>
    <div class="gb-act">${guideAction(p, s, S.tab)}<button type="button" class="btn sm ghost" data-act="guide-all">All steps</button></div>
  </aside>`;
}
function guideHTML(p) {
  if (!guideOpen(p)) return '';
  const steps = guideSteps(p);
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  const action = (s) => guideAction(p, s);
  return `<section class="panel guide" aria-labelledby="guide-h">
    <div class="panel-head"><h2 id="guide-h" tabindex="-1">Getting started</h2><p>${done} of ${steps.length} done. Each step makes the next one easier for Claude Code.</p>
      <button type="button" class="btn sm ghost" data-act="hide-guide">Hide</button></div>
    <ol class="guide-steps">${steps.map((s, i) => `<li data-done="${s.done}"${s === next ? ' aria-current="step"' : ''}>
      <span class="g-mark" aria-hidden="true">${s.done ? ICON.check || '✓' : i + 1}</span>
      <div class="g-body"><b>${s.done ? '<span class="sr">Done: </span>' : ''}${esc(s.label)}</b>${s === next ? `<small>${esc(s.hint)}</small>` : ''}</div>
      ${s === next ? `<div class="g-act">${action(s)}</div>` : ''}</li>`).join('')}</ol>
  </section>`;
}

/* ---------- weekly progress ---------- */
// a task gets the date it was finished, but only when this page saw it change to done
const seenStatus = new Map();
function primeSeen(p) { for (const t of allTasks(p)) if (!seenStatus.has(t.id)) seenStatus.set(t.id, t.status); }
// A feature's status follows its tasks when one of them changes here: In progress once one has started, Done when the
// last is done. It only moves forward by itself, unless Shipyard moved it (auto), so an Undo takes it back too. The stage
// moves on from Idea or Designing to Building when a task is finished.
const ST_RANK = { todo: 0, doing: 1, done: 2 };
function followTasks(p, feats, finished) {
  for (const f of p.features) {
    if (!feats.has(f.id)) continue;
    const ts = allTasks(p).filter((t) => t.feat === f.id);
    if (!ts.length) continue;
    const d = ts.every((t) => t.status === 'done') ? 'done' : ts.some((t) => t.status !== 'todo') ? 'doing' : 'todo';
    if (ST_RANK[d] > ST_RANK[f.status] || (f.auto && d !== f.status)) { f.status = d; f.auto = true; }
  }
  if (finished && (p.stage === 'idea' || p.stage === 'designing')) p.stage = 'building';
}
// the task prompt copied last tells Claude Code to tick its task in PLAN.md, so the folder's copy counts as ticked
function promptTicks(p, t) {
  const lp = S.lastPrompt;
  const fp = p.folder?.plan;
  if (!lp || lp.tid !== t.id || !fp || fp.tasks[t.id] !== 0 || lp.pid !== idOf(p)) return;
  p.folder = { ...p.folder, plan: { ...fp, tasks: { ...fp.tasks, [t.id]: 1 } } };
}
function stampDone(p) {
  const feats = new Set();
  let finished = false;
  for (const t of allTasks(p)) {
    const was = seenStatus.get(t.id);
    if (was !== undefined && was !== t.status) { if (t.feat) feats.add(t.feat); if (t.status === 'done') finished = true; }
    if (t.status === 'done' && !t.doneAt && was !== undefined && was !== 'done') { t.doneAt = today(); promptTicks(p, t); }
    else if (t.status !== 'done' && t.doneAt) t.doneAt = '';
    if (t.status !== 'doing' && t.startedAt) t.startedAt = ''; // kept only while it is in progress; each way of starting one dates it
    seenStatus.set(t.id, t.status);
  }
  if (feats.size || finished) followTasks(p, feats, finished);
}
const shortDate = (d) => dayLabel(d); // the same "Sep 8" as everywhere else, whatever the browser's language
// the day a task in progress was started: its own date, or for one started before Shipyard kept it, its first session
function startedOn(p, t) {
  if (t.status !== 'doing') return '';
  if (t.startedAt) return t.startedAt;
  return p.sessions.filter((x) => x.tid === t.id).map((x) => str(x.date).slice(0, 10)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()[0] || '';
}
// a task in progress for a week or more: since when, and for how long
function stuckFor(p, t, now = today()) {
  const d = startedOn(p, t);
  const n = d ? daysBetween(d, now) : 0;
  if (!(n >= 7)) return null;
  return { since: d, long: n < 63 ? plural(Math.round(n / 7), 'week', 'weeks') : plural(Math.round(n / 30.44), 'month', 'months') };
}
const statusText = (p, t) => { const s = stuckFor(p, t); return s ? `In progress for ${s.long}, since ${dayLabel(s.since)}` : STATUS[t.status]; };
function weekChartHTML(weeks, caption, hint) {
  const max = Math.max(1, ...weeks.map((w) => Math.max(w.tasks, w.sessions)));
  // the bars stretch to the panel's width; numbers sit in HTML above them so they never stretch
  const W = 320; const H = 110; const top = 18; const gap = W / weeks.length; const bw = Math.min(14, gap / 3);
  const y = (v) => H - (v / max) * (H - top);
  const bars = weeks.map((w, i) => {
    const x = i * gap + gap / 2;
    return `<rect class="b-task" x="${(x - bw - 1).toFixed(1)}" y="${y(w.tasks).toFixed(1)}" width="${bw.toFixed(1)}" height="${(H - y(w.tasks)).toFixed(1)}"/>`
      + `<rect class="b-sess" x="${(x + 1).toFixed(1)}" y="${y(w.sessions).toFixed(1)}" width="${bw.toFixed(1)}" height="${(H - y(w.sessions)).toFixed(1)}"/>`;
  }).join('');
  const num = (v, cx, cls) => (v ? `<span${cls} style="left:${((cx / W) * 100).toFixed(2)}%;bottom:${(H - y(v) + 2).toFixed(0)}px">${v}</span>` : '');
  const nums = weeks.map((w, i) => num(w.tasks, (i + 0.5) * gap - bw / 2 - 1, '') + num(w.sessions, (i + 0.5) * gap + bw / 2 + 1, ' class="v-sess"')).join('');
  const labels = weeks.map((w, i) => (i % 2 === 1 || weeks.length <= 4 ? `<span style="left:clamp(3.1ch, ${(((i + 0.5) / weeks.length) * 100).toFixed(2)}%, calc(100% - 3.1ch))">${esc(shortDate(w.week))}</span>` : '')).join('');
  return `<figure class="chart">
      <div class="chart-plot" aria-hidden="true"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" focusable="false"><line class="base" x1="0" y1="${H - 0.5}" x2="${W}" y2="${H - 0.5}"/>${bars}</svg><div class="chart-v">${nums}</div></div>
      <div class="chart-x" aria-hidden="true">${labels}</div>
      <figcaption class="chart-key"><span class="k-task">Tasks done</span><span class="k-sess">Sessions logged</span><span class="hint">${hint}</span></figcaption>
      <div class="sr"><table><caption>${esc(caption)}</caption><thead><tr><th scope="col">Week of</th><th scope="col">Tasks done</th><th scope="col">Sessions</th></tr></thead>
        <tbody>${weeks.map((w) => `<tr><th scope="row">${esc(shortDate(w.week))}</th><td>${w.tasks}</td><td>${w.sessions}</td></tr>`).join('')}</tbody></table></div>
    </figure>`;
}
function progressHTML(p) {
  const g = weeklyProgress(p, today());
  const total = g.weeks.reduce((a, w) => a + w.tasks + w.sessions, 0);
  const tc = targetCheck(g, p.targetDate, today());
  const tgt = p.targetDate ? shortDate(p.targetDate) : '';
  const away = (d) => (d === 0 ? 'today' : d === 1 ? 'tomorrow' : `${d < 14 ? plural(d, 'day', 'days') : plural(Math.round(d / 7), 'week', 'weeks')} away`);
  const when = {
    estimate: '', done: '',
    onpace: tc.finish === p.targetDate ? ` That is right on your target of ${tgt}.` : ` That is before your target of ${tgt}.`,
    behind: ` That is ${lateText(tc)} after your target of ${tgt}.`,
    passed: g.left ? ` Your target of ${tgt} has passed with ${plural(g.left, 'task', 'tasks')} left.` : ` Your target of ${tgt} has passed. Plan some tasks and pick a new date.`,
    nopace: ` Your target is ${tgt}, ${away(tc.until)}.`,
    noplan: ` Your target is ${tgt}, ${away(tc.until)}. Plan some tasks to see whether you are on pace.`,
  }[tc.state] || '';
  if (!total) return when && tc.state !== 'done' ? `<section class="panel progress" aria-labelledby="prog-h"><div class="panel-head"><h2 id="prog-h">Progress</h2><p>${allTasks(p).some((t) => t.status === 'done') ? 'Nothing marked done in the last 8 weeks.' : 'Nothing marked done yet.'}${when}</p></div></section>` : '';
  const now = g.weeks[g.weeks.length - 1];
  const sum8 = g.weeks.reduce((a, w) => a + w.tasks, 0);
  const sess8 = g.weeks.reduce((a, w) => a + w.sessions, 0);
  const pl = plural;
  return `<section class="panel progress" aria-labelledby="prog-h">
    <div class="panel-head"><h2 id="prog-h">Progress</h2><p>This week: ${pl(now.tasks, 'task', 'tasks')} done, ${pl(now.sessions, 'session', 'sessions')}. Last 8 weeks: ${pl(sum8, 'task', 'tasks')}, ${pl(sess8, 'session', 'sessions')}.${g.weeksLeft ? ` At your recent pace, the ${pl(g.left, 'task', 'tasks')} left ${g.left === 1 ? 'takes' : 'take'} about ${pl(g.weeksLeft, 'week', 'weeks')}, so you would finish around ${shortDate(tc.finish)}.` : ''}${when}</p></div>
    ${weekChartHTML(g.weeks, 'Tasks done and sessions per week', 'Weeks start on Monday. Tasks count from when they are marked done here. The estimate uses up to the last four weeks and counts an M task as two S tasks, and an L as four.')}
    <div class="prog-tools"><button type="button" class="btn sm" data-act="copy-week">${(() => { const l = summaryWeek(p, today()).label; return l[0].toUpperCase() + l.slice(1); })()} summary</button><span class="hint">Done tasks, sessions and what is next, for notes, a standup or a changelog.</span></div>
  </section>`;
}

/* ---------- all projects ---------- */
const canDash = () => S.loaded && S.projects.size >= 2;
const relDay = (d, now) => { const n = Math.round((Date.parse(now + 'T00:00:00Z') - Date.parse(d + 'T00:00:00Z')) / 864e5); return n <= 0 ? 'today' : n === 1 ? 'yesterday' : n < 7 ? `${n} days ago` : shortDate(d); };
// "Aug 20, 8 weeks ago"
const agoDay = (d, now) => { const n = daysBetween(d, now); if (!(n >= 7)) return relDay(d, now); return `${shortDate(d)}, ${n < 63 ? plural(Math.round(n / 7), 'week', 'weeks') : plural(Math.round(n / 30.44), 'month', 'months')} ago`; };
// projects that are not archived, the one changed most recently first
function dashList() { return [...S.projects.entries()].filter(([, p]) => !p.archived).sort((a, b) => str(b[1].updatedAt).localeCompare(str(a[1].updatedAt))); }
function dashCardHTML(id, p, x, now) {
  const n = `dc-${esc(id)}`;
  const stage = STAGES.find((s) => s.k === p.stage)?.label || 'Idea';
  const pct = x.total ? Math.round((x.done / x.total) * 100) : 0;
  const pitch = oneLine(p.pitch);
  const bug = blockerOf(p);
  const big = !bug && x.next && x.next.t.size === 'L' && x.next.t.status === 'todo';
  const next = bug ? `Fix first: ${esc(oneLine(bug.title))} <span class="dc-sub">Blocking bug${x.next ? `, then ${esc(oneLine(x.next.t.title) || 'Untitled task')}` : ''}</span>`
    : x.next ? `${esc(oneLine(x.next.t.title) || 'Untitled task')} <span class="dc-sub">Milestone ${msIndex(p, x.next.m)} · ${x.next.t.size}${x.next.t.status === 'doing' ? ` · in progress${(() => { const s = stuckFor(p, x.next.t); return s ? ` since ${esc(dayLabel(s.since))}` : ''; })()}` : ''}</span>` : x.total ? 'Every task is done' : 'No tasks yet';
  return `<li class="dcard" aria-labelledby="${n}-n">
    <div class="dc-top">
      <h2 class="dc-name"><button type="button" class="dc-open" id="${n}-n" data-act="open" data-id="${esc(id)}">${esc(p.name.trim() || 'Untitled project')}</button></h2>
      <span class="dc-stage"><span class="dot" data-stage="${esc(p.stage)}" aria-hidden="true"></span>${p.example ? 'Example · ' : ''}${esc(stage)}</span>
    </div>
    ${pitch ? `<p class="dc-pitch">${esc(pitch.length > 160 ? pitch.slice(0, 157).trimEnd() + '…' : pitch)}</p>` : ''}
    <div class="dc-bar" role="img" aria-label="${x.done} of ${x.total} tasks done"><span style="width:${pct}%"></span></div>
    <dl class="dc-facts">
      <div class="dc-next"><dt>Next up</dt><dd>${next}</dd></div>
      <div><dt>Tasks</dt><dd>${x.done} of ${x.total} done</dd></div>
      <div><dt>This week</dt><dd>${plural(x.weekTasks, 'task', 'tasks')}, ${plural(x.weekSessions, 'session', 'sessions')}</dd></div>
      <div><dt>Last session</dt><dd>${x.lastSession ? esc(relDay(x.lastSession, now)) : 'None yet'}</dd></div>
      <div><dt>Open bugs</dt><dd>${x.openBugs}${x.blockers ? ` (${x.blockers} blocking)` : ''}</dd></div>
      ${x.target ? `<div><dt>Target</dt><dd>${esc(shortDate(x.target))}${x.tc.state === 'onpace' ? ', on pace' : x.tc.state === 'behind' ? `, ${lateText(x.tc)} behind` : x.tc.state === 'passed' ? ', passed' : x.tc.state === 'done' ? ', all done' : ''}</dd></div>` : ''}
    </dl>
    ${x.attention.length ? `<p class="dc-flag"><span class="sr">Needs attention: </span>${x.attention.map(esc).join('. ')}.</p>` : ''}
    <div class="dc-actions"><button type="button" class="btn sm primary" id="${n}-o" data-act="open" data-id="${esc(id)}" aria-labelledby="${n}-o ${n}-n">Open</button>${big ? `<button type="button" class="btn sm" id="${n}-p" data-act="dash-split" data-id="${esc(id)}" data-mid="${x.next.m.id}" data-tid="${x.next.t.id}" aria-labelledby="${n}-p ${n}-n">Split the next task</button>`
      : bug || x.next ? `<button type="button" class="btn sm" id="${n}-p" data-act="dash-prompt" data-id="${esc(id)}" aria-labelledby="${n}-p ${n}-n">${bug ? 'Copy fix prompt' : 'Copy next prompt'}</button>` : ''}</div>
  </li>`;
}
function dashHTML() {
  const now = today();
  const live = dashList();
  const hidden = S.projects.size - live.length;
  const rows = live.map(([id, p]) => [id, p, projectPulse(p, now)]);
  const own = rows.filter((r) => !r[1].example); // the example's history is made up
  const weekT = own.reduce((a, r) => a + r[2].weekTasks, 0);
  const weekS = own.reduce((a, r) => a + r[2].weekSessions, 0);
  const need = own.filter((r) => r[2].attention.length).length;
  const weeks = sumWeeks(own.map((r) => r[1]), now);
  const any = weeks.some((w) => w.tasks || w.sessions);
  return `<section class="dash" aria-labelledby="dash-h">
    <header class="dash-head">
      <h1 id="dash-h" tabindex="-1">All projects</h1>
      <p>${plural(live.length, 'project', 'projects')}${hidden ? `, plus ${hidden} archived` : ''}. This week: ${plural(weekT, 'task', 'tasks')} done, ${plural(weekS, 'session', 'sessions')}.${need ? ` ${need === 1 ? 'One needs' : `${need} need`} attention.` : ''}</p>
    </header>
    ${any ? `<section class="panel" aria-labelledby="dash-prog-h"><div class="panel-head"><h2 id="dash-prog-h">Progress, all projects</h2></div>${weekChartHTML(weeks, 'Tasks done and sessions per week, all projects', `Weeks start on Monday. Archived projects${own.length < rows.length ? ' and the example' : ''} are left out.`)}</section>` : ''}
    ${live.length ? `<ul class="dash-list" aria-label="Projects">${rows.map(([id, p, x]) => dashCardHTML(id, p, x, now)).join('')}</ul>` : '<p class="hint">Every project is archived. Restore one from the project list.</p>'}
  </section>`;
}
// copies the next task's prompt straight from the All projects page; when copying is blocked it opens the prompt instead
const blockerOf = (p) => openBugs(p).find((b) => b.severity === 'blocker');
const historyNote = (p, t) => (t.status !== 'done' && taskHistory(p, t).length ? 'It includes what your earlier sessions on this task got done and what went wrong, so Claude Code can carry on from there.' : '');
function dashPrompt(id) {
  const p = S.projects.get(id);
  if (!p) return;
  const bug = blockerOf(p);
  const nu = !bug && nextUp(p);
  if (!bug && !nu) return;
  const text = bug ? bugPrompt(p, bug) : taskPrompt(p, nu.m, nu.t);
  const show = () => { S.activeId = id; S.view = 'project'; S.tab = 'overview'; S.confirm = null; saveUI(); renderAll(); openModal(bug ? { kind: 'prompt', text, bid: bug.id, note: bugNote(p, bug) } : { kind: 'prompt', text, mid: nu.m.id, tid: nu.t.id, note: historyNote(p, nu.t) }); };
  const label = oneLine(bug ? bug.title : nu.t.title) || (bug ? 'the blocking bug' : 'the next task');
  try {
    if (!navigator.clipboard?.writeText) { show(); return; }
    navigator.clipboard.writeText(text).then(() => {
      S.lastPrompt = bug ? { pid: id, mid: '', tid: '', bid: bug.id, what: '' } : { pid: id, mid: nu.m.id, tid: nu.t.id, bid: '', what: '' };
      saveUI();
      const msg = `${bug ? 'Fix prompt' : 'Prompt'} for "${label.length > 60 ? label.slice(0, 57) + '…' : label}" copied. Paste it into Claude Code.`;
      const q = S.projects.get(id); // the project as it is now: an update may have come in while copying
      const mid = nu ? nu.m.id : ''; const tid = nu ? nu.t.id : '';
      const t = !bug && q && findTask(q, mid, tid).t;
      if (!t || t.status !== 'todo') { toast(msg); return; }
      t.status = 'doing'; t.startedAt = today(); touch(q); renderAll(); // copying it starts it, as Copy prompt does
      toast(`${msg} It is now in progress.`, { pid: id, stay: true, focus: [`[data-act="dash-prompt"][data-id="${id}"]`], restore: (r) => { const y = findTask(r, mid, tid).t; if (!y || y.status !== 'doing') return null; y.status = 'todo'; return ''; } });
    }, show);
  } catch { show(); }
}

// the latest session on a task, when it got stuck or was only partly done
function lastTryHTML(p, t, b) {
  const s = lastTry(p, t, b);
  if (!s) return '';
  const what = oneLine(s.outcome === 'stuck' && s.wrong.trim() ? s.wrong : reportBody(s.summary) || s.wrong);
  return `<p class="from last-try"><b>Last session${t && s.tid !== t.id ? ' on the larger task' : ''}${s.date ? `, ${esc(dayLabel(s.date))}` : ''}: ${s.outcome === 'stuck' ? 'stuck' : 'partly done'}.</b>${what ? ` ${esc(what.length > 160 ? what.slice(0, 159).trimEnd() + '…' : what)}` : ''} The ${b ? 'fix prompt' : 'prompt'} includes it.</p>`;
}
function overviewHTML(p) {
  const id = S.activeId;
  const nu = nextUp(p);
  const tasks = allTasks(p);
  const open = tasks.filter((t) => t.status !== 'done').length;
  const must = p.features.filter((f) => f.priority === 'must');
  const h = health(p);
  const fillKey = id + ':fill';
  const briefThin = !p.audience.trim() && !p.doneWhen.trim() && !p.problem.trim();
  const guideOn = guideOpen(p); // its brief step offers the same button
  const ai = canAsk();
  const blocker = blockerOf(p);
  return `<div class="stack">
    ${workingHTML(fillKey)}
    ${guideHTML(p)}
    ${keepNoteHTML()}
    ${awayHTML(p)}
    <div class="grid-2">
      <section class="panel next" aria-labelledby="next-h">
        <h2 class="eyebrow" id="next-h" tabindex="-1">${blocker ? 'Fix first' : 'Next up'}</h2>
        ${blocker ? `<h3>${esc(blocker.title || 'Untitled bug')}</h3>
          <p class="from">Blocker bug${blocker.date ? ` · reported ${esc(dayLabel(blocker.date))}` : ''}${nu ? ` · then: ${esc(nu.t.title || 'Untitled task')}` : ''}</p>
          ${lastTryHTML(p, null, blocker)}
          <div class="row">
            <button type="button" class="btn primary" data-act="bug-prompt" data-id="${blocker.id}">Get the fix prompt</button>
            <button type="button" class="btn" id="next-bug-fixed" data-act="toggle-bug" data-id="${blocker.id}">Mark fixed</button>
            <button type="button" class="btn ghost" data-act="log-session" data-bid="${blocker.id}">Log a session</button>
            <button type="button" class="btn ghost" data-act="show-bugs">See all bugs</button>
          </div>`
        : nu ? `<h3>${esc(nu.t.title || 'Untitled task')}</h3>
          <p class="from">Milestone ${msIndex(p, nu.m)}: ${esc(nu.m.title || 'Untitled')} · ${{ S: 'Small', M: 'Medium', L: 'Large' }[nu.t.size]} task (${nu.t.size}) · ${esc(statusText(p, nu.t))}</p>
          ${nu.t.size === 'L' && nu.t.status === 'todo' ? '<p class="from big-note">This task is large. Split it first, so each part fits in one Claude Code session.</p>' : ''}
          ${lastTryHTML(p, nu.t)}
          ${(() => { const un = unplannedMust(p); const ci = closingAt(p); return un.length && ci < p.milestones.length && p.milestones[ci] === nu.m ? `<p class="from big-note">${un.length === 1 ? 'A must-have has' : `${un.length} must-haves have`} no tasks yet, starting with "${esc(oneLine(un[0].title))}". Plan ${un.length === 1 ? 'it' : 'them'} before the finishing touches. <button type="button" class="linkish" data-act="plan-feature" data-id="${un[0].id}">Plan it</button></p>` : ''; })()}
          <div class="row">
            ${nu.t.size === 'L' && nu.t.status === 'todo' ? `<button type="button" class="btn primary" id="next-split" data-act="split-task" data-mid="${nu.m.id}" data-tid="${nu.t.id}">Split it</button>
            <button type="button" class="btn" id="next-prompt" data-act="prompt" data-mid="${nu.m.id}" data-tid="${nu.t.id}">Get the task prompt</button>`
            : `<button type="button" class="btn${guideOn && guideSteps(p).some((s) => !s.done) ? '' : ' primary'}" id="next-prompt" data-act="prompt" data-mid="${nu.m.id}" data-tid="${nu.t.id}">Get the task prompt</button>
            ${nu.t.status === 'todo' ? `<button type="button" class="btn" data-act="set-task" data-mid="${nu.m.id}" data-tid="${nu.t.id}" data-s="doing">Mark started</button>` : `<button type="button" class="btn" data-act="set-task" data-mid="${nu.m.id}" data-tid="${nu.t.id}" data-s="done">Mark done</button>`}`}
            <button type="button" class="btn ghost" data-act="log-session" data-mid="${nu.m.id}" data-tid="${nu.t.id}" data-nu="1">Log a session</button>
            ${nu.t.status === 'doing' ? `<button type="button" class="btn ghost" data-act="set-task" data-mid="${nu.m.id}" data-tid="${nu.t.id}" data-s="todo">Back to To do</button>` : ''}
          </div>`
        : `<h3>${tasks.length ? 'Every task is done.' : S.busy[fillKey] || S.busy[id + ':plan'] ? 'Claude is drafting the plan…' : 'Nothing planned yet.'}</h3>
          <p class="from">${tasks.length ? `Add the next milestone on the Plan tab${ai ? ', or ask Claude for a review on the Improve tab' : ''}.` : 'Fill in the brief, then add milestones and tasks on the Plan tab.'}</p>
          <div class="row">
            <button type="button" class="btn" data-act="tab" data-k="plan">Open the plan</button>
            ${ai && !p.milestones.length && p.pitch.trim() ? `<button type="button" class="btn ai" data-act="ai-plan" ${S.busy[id + ':plan'] || filling(id) ? 'disabled' : ''}>Ask Claude to draft a plan</button>` : ''}
          </div>`}
        ${folderLineHTML(p)}
      </section>
      <section class="panel" aria-label="At a glance">
        <dl class="facts">
          <dt>Open tasks</dt><dd>${open}</dd>
          ${p.bugs.some((b) => b.title.trim()) ? `<dt>Open bugs</dt><dd>${openBugs(p).length}</dd>` : ''}
          <dt>Must-haves done</dt><dd>${must.filter((f) => f.status === 'done').length} / ${must.length}</dd>
          <dt>Plan checks passed</dt><dd><button type="button" class="linkish" data-act="tab" data-k="improve" aria-label="${h.auto.filter((c) => c.ok).length} / ${h.auto.length} plan checks passed: see them on Improve">${h.auto.filter((c) => c.ok).length} / ${h.auto.length}</button></dd>
          ${p.sessions.length ? (() => { const s = p.sessions[p.sessions.length - 1]; const d = str(s.date).slice(0, 10); const o = (OUTCOMES.find((x) => x.k === s.outcome)?.short || '').toLowerCase(); const when = /^\d{4}-\d{2}-\d{2}$/.test(d) ? agoDay(d, today()) : ''; return `<dt>Last session</dt><dd><button type="button" class="linkish" data-act="show-sessions" aria-label="${esc(`Last session ${when}, ${o}: ${oneLine(s.task) || 'Untitled task'}. See all sessions on Improve`)}">${esc(when ? `${when[0].toUpperCase()}${when.slice(1)} · ${o}` : o)}</button></dd>`; })() : ''}
          ${ai || p.lastReview ? `<dt>Last Claude review</dt><dd>${p.lastReview ? esc(agoDay(localDay(p.lastReview.at), today())) : 'None yet'}</dd>` : ''}
        </dl>
      </section>
    </div>
    ${progressHTML(p)}
    ${askHTML(p)}
    <section class="panel">
      <div class="panel-head"><h2>Brief</h2><p>The facts every prompt and your CLAUDE.md are built from. Short and specific beats long.</p>
        ${ai && briefThin && p.claudeMdEdited && p.claudeMd.trim() ? `<button type="button" class="btn ai" data-act="ai-fill-md" ${S.busy[fillKey] || drafting(id) ? 'disabled' : ''}>Ask Claude to fill the brief from your CLAUDE.md</button>`
          : ai && briefThin && p.pitch.trim() && !guideOn ? `<button type="button" class="btn ai" data-act="ai-fill" ${S.busy[fillKey] || drafting(id) ? 'disabled' : ''}>Ask Claude to draft the brief, features and plan</button>` : ''}</div>
      <div class="fields">
        ${field(p, 'pitch', 'Pitch', { wide: true, one: true, ph: 'One sentence: what it is and why it matters' })}
        ${field(p, 'audience', 'Who it is for', { rows: 2, ph: 'For example: me, to plan weekend coding projects' })}
        ${field(p, 'problem', 'Problem it solves', { rows: 2, ph: 'What is annoying or impossible today?' })}
        ${field(p, 'doneWhen', 'Done when', { wide: true, rows: 2, ph: 'What does a working first version let someone do?', hint: 'This is the finish line for the first version. Everything else can wait.' })}
        ${field(p, 'stack', 'Tech stack', { rows: 3, mono: true, ph: 'One per line, for example:\nNext.js\nSQLite', hint: 'The languages and tools it is built with. Claude Code sticks to these.' })}
        ${field(p, 'commands', 'How to run and test', { rows: 3, mono: true, ph: 'For example:\nnpm install\nnpm test', hint: 'The commands that start the app and run its tests. Claude Code uses them to check its own work.' })}
        ${field(p, 'conventions', 'Rules for Claude Code', { rows: 3, ph: 'For example:\n- Use TypeScript\n- Keep components small', hint: 'How the code should be written here. They go into CLAUDE.md, which Claude Code follows.' })}
        ${field(p, 'constraints', 'Constraints', { rows: 3, ph: 'Budget, deadlines, must run offline…' })}
        <div><label class="lbl" for="f-targetDate">Aim to ship by</label><input class="in date" type="date" id="f-targetDate" data-path="targetDate" value="${esc(p.targetDate)}"><p class="hint">Optional. Progress then says whether you are on pace for it.</p></div>
        ${field(p, 'repo', 'GitHub link', { ph: 'https://github.com/you/project', hint: 'Optional. Where the code is online, if it is.' })}
      </div>
    </section>
    ${!guideOpen(p) && guideSteps(p).some((s) => !s.done) ? '<p class="guide-back"><button type="button" class="linkish" data-act="show-guide">Show the getting started guide</button></p>' : ''}
  </div>`;
}

function proposalHTML(kind) {
  const pr = S.proposals[S.activeId + ':' + kind];
  if (!pr) return '';
  const title = kind === 'plan' ? 'Claude suggests these milestones' : kind === 'model' ? 'Claude suggests this data model' : 'Claude suggests these features';
  const items = pr.items.map((it, i) => {
    const body = kind === 'plan'
      ? `<b>${esc(it.title)}</b><small>${esc(it.goal)}</small><ol>${it.tasks.map((t) => `<li>${esc(t.title)} (${t.size})</li>`).join('')}</ol>`
      : kind === 'model' ? `<b>${esc(it.name)}</b><small>${esc(lines(it.fields).map(fieldShown).join(', '))}${it.notes ? `. ${esc(it.notes)}` : ''}</small>`
      : `<b>${esc(it.title)}</b><small>${esc(PRIORITIES.find((x) => x.k === it.priority)?.label)}. ${esc(it.detail)}</small>`;
    return `<li><label><input type="checkbox" data-act="prop-toggle" data-kind="${kind}" data-i="${i}" ${pr.sel.has(i) ? 'checked' : ''}><span>${body}</span></label></li>`;
  }).join('');
  return `<section class="proposal" aria-labelledby="prop-${kind}-h">
    <h3 id="prop-${kind}-h" tabindex="-1">${esc(title)}</h3>
    <ul class="prop-list">${items}</ul>${leftOut(pr.dropped)}
    <div class="prop-actions"><button type="button" class="btn primary" data-act="prop-accept" data-kind="${kind}" ${pr.sel.size ? '' : 'disabled'}>${propBtnText(kind, pr.sel.size)}</button><button type="button" class="btn" data-act="prop-discard" data-kind="${kind}">Discard</button></div>
  </section>`;
}

const propBtnText = (kind, n) => `Add ${kind === 'plan' ? many(n, 'milestone', 'milestones') : kind === 'model' ? `${many(n, 'thing', 'things')} to the data model` : many(n, 'feature', 'features')}`;
const fuBtnText = (sel) => { const t = [...sel].filter((k) => k !== 'rule').length; return !sel.size ? 'Add none' : `Add ${[t ? many(t, 'task', 'tasks') : '', sel.has('rule') ? 'the rule' : ''].filter(Boolean).join(' and ')}`; };
function stChip(s, attrs, id, nameId) { // named with its item: "To do Shelf view"
  return `<button type="button" class="st" data-s="${s}" ${attrs}${id ? ` id="${id}" aria-labelledby="${id} ${nameId}"` : ''} title="Click to mark ${STATUS[NEXT_STATUS[s]]}">${STATUS[s]}</button>`;
}

/* ---------- data model: Claude's sketch and the Design tab panel ---------- */
function coerceEntities(v, p) {
  const seen = newIds(p);
  const have = new Set(p.entities.map((e) => e.name.trim().toLowerCase()));
  return arr(v).map(obj).map((e) => mkEntity({
    name: str(e.name).trim().slice(0, 80),
    fields: (Array.isArray(e.fields) ? e.fields.map(str) : lines(e.fields)).map((x) => x.trim()).filter(Boolean).slice(0, 40).join('\n'),
    notes: oneLine(e.notes),
  }, seen)).filter((e) => e.name && !have.has(e.name.toLowerCase()));
}
async function aiModel(id) {
  const p = S.projects.get(id);
  if (!p || filling(id)) return;
  const prompt = [
    'Sketch the data model for this project: the things it stores and how they connect.', ABOUT,
    'Keep it as small as the first version needs (the must-have features). Use plain singular names a beginner understands, such as "Recipe" or "User". Leave out anything the project already lists under entities.',
    'Reply with only JSON: {"entities": [{"name": string, "fields": [string, each "name: type", where type is text, number, yes/no, date, date and time, link, a list of something, or the name of another entity], "notes": string (one sentence on how it connects to the others)}]} with 2 to 6 entities.',
    '', 'Project:', contextOf(p),
  ].join('\n');
  const r = await askJSON(id + ':model', 'Claude is sketching the data model…', prompt);
  const q = S.projects.get(id);
  if (!q) return;
  const es = coerceEntities(r?.entities, q);
  if (es.length) S.proposals[id + ':model'] = { items: es, sel: new Set(es.map((_, i) => i)) };
  else if (r) toast('Claude did not suggest anything new for the data model.');
  if (id === S.activeId) S.focusSel = ['#prop-model-h', '[data-act="ai-model"]'];
  renderSheet();
  if (es.length) announce(`Claude suggests ${many(es.length, 'thing', 'things')} for the data model${id === S.activeId ? '' : ` of ${oneLine(q.name) || 'your project'}`}. Choose which to add.`);
}
function modelHTML(p) {
  const id = S.activeId;
  const rows = p.entities.map((e) => {
    const base = `entities.${e.id}`;
    const nid = fid(base + '.name');
    const did = fid(base + '.del');
    return `<li class="row3 entity" aria-labelledby="${nid}">
      <input class="in" id="${nid}" data-path="${base}.name" value="${esc(e.name)}" placeholder="Name, like Recipe" aria-label="Name" autocomplete="off">
      <textarea class="ta mono" id="${fid(base + '.fields')}" data-path="${base}.fields" rows="${Math.max(3, Math.min(10, lines(e.fields).length + 1))}" placeholder="${esc('title: text\nurl: link\nsaved on: date')}" aria-label="Fields, one per line" spellcheck="false">${esc(e.fields)}</textarea>
      <textarea class="ta" id="${fid(base + '.notes')}" data-path="${base}.notes" rows="2" placeholder="How it connects, like: belongs to a user" aria-label="How it connects to the others">${esc(e.notes)}</textarea>
      <button type="button" class="icon-btn del" id="${did}" data-act="del-entity" data-id="${e.id}" aria-label="Delete" aria-labelledby="${did} ${nid}">${ICON.trash}</button></li>`;
  }).join('');
  const busy = S.busy[id + ':model'] || filling(id);
  return `<section class="panel" aria-labelledby="model-h">
    <div class="panel-head"><h2 id="model-h">Data model</h2><p>The things your app stores, their fields, and how they connect. Claude Code uses these names for tables, types and variables, so they stay the same everywhere.</p>
      <div class="head-btns">${canAsk() ? `<button type="button" class="btn sm ai" data-act="ai-model" ${busy ? 'disabled' : ''}>Ask Claude to sketch it</button>` : ''}<button type="button" class="btn sm" data-act="add-entity">Add a thing</button></div></div>
    ${workingHTML(id + ':model')}
    ${proposalHTML('model')}
    ${p.entities.length ? `<div class="cols-head" aria-hidden="true"><span>Name</span><span>Fields, one per line</span><span>How it connects</span></div><ul class="rows">${rows}</ul>`
      : '<p class="empty-note">Nothing yet. List what the app keeps, such as Recipe or User, with a field per line. Skip this if the app stores no data.</p>'}
  </section>`;
}

function planRowHTML(p, f) {
  const ts = featTasks(p, f.id);
  const d = ts.filter((t) => t.status === 'done').length;
  const bid = fid(`features.${f.id}.plan`);
  if (!ts.length && f.status === 'done') return '';
  return `<div class="f-plan">${ts.length ? `<span class="f-prog">${d} of ${ts.length} ${ts.length === 1 ? 'task' : 'tasks'} done</span>` : '<span></span>'}${f.status !== 'done' ? `<button type="button" class="btn sm ghost" id="${bid}" data-act="plan-feature" data-id="${f.id}" aria-labelledby="${bid} ${fid(`features.${f.id}.title`)}">${ts.length ? 'Plan more' : 'Plan it'}</button>` : ''}</div>`;
}
function designHTML(p) {
  const id = S.activeId;
  const lanes = PRIORITIES.map((pr) => {
    const fs = p.features.filter((f) => f.priority === pr.k);
    const cards = fs.map((f) => `<div class="fcard" data-s="${f.status}">
        <label class="sr" for="${fid(`features.${f.id}.title`)}">Feature name</label>
        <textarea class="in flat f-title one" id="${fid(`features.${f.id}.title`)}" data-path="features.${f.id}.title" rows="1" placeholder="Feature name" autocomplete="off">${esc(f.title)}</textarea>
        <label class="sr" for="${fid(`features.${f.id}.detail`)}">Details</label>
        <textarea class="ta flat" id="${fid(`features.${f.id}.detail`)}" data-path="features.${f.id}.detail" rows="2" placeholder="What it does, in a sentence">${esc(f.detail)}</textarea>
        ${planRowHTML(p, f)}
        <div class="fcard-foot">
          ${stChip(f.status, `data-act="cycle-feature" data-id="${f.id}"`, fid(`features.${f.id}.st`), fid(`features.${f.id}.title`))}
          <label class="sr" for="${fid(`features.${f.id}.priority`)}">Priority</label>
          <select class="sel" id="${fid(`features.${f.id}.priority`)}" data-path="features.${f.id}.priority" data-rerender>${PRIORITIES.map((x) => `<option value="${x.k}" ${x.k === f.priority ? 'selected' : ''}>${x.label}</option>`).join('')}</select>
          <button type="button" class="icon-btn del" data-act="del-feature" data-id="${f.id}" aria-label="Delete feature ${esc(f.title)}">${ICON.trash}</button>
        </div>
      </div>`).join('');
    return `<div class="lane" data-p="${pr.k}">
      <div class="lane-head"><h3>${pr.label}</h3><span>${fs.length}</span></div>
      <p class="lane-note">${p.fromCode && pr.codeNote ? pr.codeNote : pr.note}</p>
      ${cards}
      <button type="button" class="btn sm ghost" data-act="add-feature" data-p="${pr.k}" style="justify-content:flex-start" aria-label="Add feature to ${esc(pr.label)}">Add feature</button>
    </div>`;
  }).join('');
  const screens = p.screens.map((s) => `<li class="row2">
      <input class="in" id="${fid(`screens.${s.id}.name`)}" data-path="screens.${s.id}.name" value="${esc(s.name)}" placeholder="Screen or part" aria-label="Screen or part name" autocomplete="off">
      <textarea class="ta" id="${fid(`screens.${s.id}.notes`)}" data-path="screens.${s.id}.notes" rows="2" placeholder="What is on it, what you can do there" aria-label="Notes">${esc(s.notes)}</textarea>
      <button type="button" class="icon-btn del" data-act="del-screen" data-id="${s.id}" aria-label="Delete ${esc(s.name || 'screen')}">${ICON.trash}</button></li>`).join('');
  const decisions = p.decisions.map((d) => `<li class="row3">
      <input class="in mono" id="${fid(`decisions.${d.id}.date`)}" data-path="decisions.${d.id}.date" value="${esc(d.date)}" aria-label="Date" autocomplete="off">
      <textarea class="ta" id="${fid(`decisions.${d.id}.text`)}" data-path="decisions.${d.id}.text" rows="2" placeholder="What you decided" aria-label="Decision">${esc(d.text)}</textarea>
      <textarea class="ta" id="${fid(`decisions.${d.id}.why`)}" data-path="decisions.${d.id}.why" rows="2" placeholder="Why" aria-label="Why">${esc(d.why)}</textarea>
      <button type="button" class="icon-btn del" id="${fid(`decisions.${d.id}.del`)}" data-act="del-decision" data-id="${d.id}" aria-label="Delete decision" aria-labelledby="${fid(`decisions.${d.id}.del`)} ${fid(`decisions.${d.id}.text`)}">${ICON.trash}</button></li>`).join('');
  return `<div class="stack">
    <div class="toolbar"><p>${p.fromCode ? 'Sort features by how much the project needs them.' : 'Sort features by how much the first version needs them.'} ${tapWord()} a status to change it; it also follows the feature's tasks.${p.claudeMdEdited ? ` Your CLAUDE.md is ${p.claudeMdOwn ? 'your own, as imported' : 'hand-edited'}, so changes here are not added to it. Add them there yourself, or rebuild it on the Project files tab.` : ''}</p>
      ${canAsk() ? `<button type="button" class="btn ai" data-act="ai-features" ${S.busy[id + ':features'] || filling(id) ? 'disabled' : ''}>Ask Claude for feature ideas</button>` : ''}</div>
    ${workingHTML(id + ':fill')}
    ${workingHTML(id + ':features')}
    ${proposalHTML('features')}
    <section class="panel" aria-labelledby="feat-h"><h2 class="sr" id="feat-h">Features</h2><div class="board">${lanes}</div></section>
    <section class="panel">
      <div class="panel-head"><h2>Screens and parts</h2><p>The pages, views or pieces the app is made of. Claude reads these to understand how it fits together.</p>
        <button type="button" class="btn sm" data-act="add-screen">Add screen</button></div>
      ${p.screens.length ? `<ul class="rows">${screens}</ul>` : '<p class="empty-note">No screens yet. A web app usually starts with a home screen and one main working screen.</p>'}
    </section>
    ${modelHTML(p)}
    <section class="panel">
      <div class="panel-head"><h2>Decisions</h2><p>Write down choices as you make them, with the reason, so Claude doesn't undo them later.</p>
        <button type="button" class="btn sm" data-act="add-decision">Add decision</button></div>
      ${p.decisions.length ? `<ul class="rows">${decisions}</ul>` : '<p class="empty-note">No decisions logged yet.</p>'}
    </section>
  </div>`;
}

function planHTML(p) {
  const id = S.activeId;
  const ms = p.milestones.map((m, i) => {
    const d = m.tasks.filter((t) => t.status === 'done').length;
    const complete = m.tasks.length && d === m.tasks.length;
    const folded = complete && !S.openMs.has(m.id);
    const confirm = S.confirm?.kind === 'milestone' && S.confirm.id === m.id;
    if (!S.runCap.has(m.id)) S.runCap.set(m.id, complete ? 0 : leadDone(m));
    const run = complete ? 0 : Math.min(leadDone(m), S.runCap.get(m.id));
    const runOpen = run >= RUN_MIN && S.openRun.has(m.id);
    const hide = run >= RUN_MIN && !runOpen ? run : 0;
    const runRow = run >= RUN_MIN ? `<li class="done-run"><button type="button" class="btn sm ghost" id="${fid(`milestones.${m.id}.run`)}" data-act="toggle-run" data-id="${m.id}" aria-expanded="${runOpen}"><span class="dr-mark" aria-hidden="true">${ICON.check}</span>${runOpen ? `Hide the first ${run} tasks, all done` : `Show the first ${run} tasks, all done`}</button></li>` : '';
    const tasks = m.tasks.map((t, j) => {
      if (j < hide) return '';
      const base = `milestones.${m.id}.tasks.${t.id}`;
      const notesOpen = S.openNotes.has(t.id);
      const tid = fid(base + '.title');
      const big = t.size === 'L' && t.status !== 'done';
      const stale = stuckFor(p, t);
      return `<li class="task" data-s="${t.status}" aria-labelledby="${tid}">
        ${stChip(t.status, `data-act="cycle-task" data-mid="${m.id}" data-tid="${t.id}"`, fid(base + '.st'), tid)}
        <textarea class="in flat t-title one" id="${fid(base + '.title')}" data-path="${base}.title" data-mid="${m.id}" data-tid="${t.id}" rows="1" placeholder="Describe the task, starting with a verb" aria-label="Task" autocomplete="off">${esc(t.title)}</textarea>
        ${stale ? `<span class="t-age" title="${esc(`In progress for ${stale.long}`)}">since ${esc(dayLabel(stale.since))}</span>` : ''}
        <select class="sel size" id="${fid(base + '.size')}" data-path="${base}.size" data-l="${t.size}" data-rerender aria-label="Size" title="Size: S is under 15 minutes, M is one session, L should be split">${['S', 'M', 'L'].map((s) => `<option ${s === t.size ? 'selected' : ''}>${s}</option>`).join('')}</select>
        <div class="t-tools">
          <button type="button" class="icon-btn" id="${fid(base + '.nt')}" data-act="toggle-notes" data-tid="${t.id}" aria-labelledby="${fid(base + '.nt')} ${tid}" aria-label="${notesOpen ? 'Hide' : 'Show'} notes and moving${t.notes.trim() ? ' (has notes)' : ''}" aria-expanded="${notesOpen}" title="Notes and moving"${t.notes.trim() ? ' data-has="1"' : ''}>${ICON.notes}</button>
          ${big ? `<button type="button" class="btn sm split" id="${fid(base + '.split')}" data-act="split-task" data-mid="${m.id}" data-tid="${t.id}" aria-labelledby="${fid(base + '.split')} ${tid}" title="Split into smaller tasks">Split</button>` : ''}
          <button type="button" class="btn sm" id="${fid(base + '.prompt')}" data-act="prompt" data-mid="${m.id}" data-tid="${t.id}" aria-labelledby="${fid(base + '.prompt')} ${tid}"><span><span class="lbl-wide">Task </span><span class="cap-narrow">prompt</span></span></button>
          <button type="button" class="icon-btn del" id="${fid(base + '.del')}" data-act="del-task" data-mid="${m.id}" data-tid="${t.id}" aria-label="Delete task" aria-labelledby="${fid(base + '.del')} ${tid}">${ICON.trash}</button>
        </div>
        ${notesOpen ? `<textarea class="ta t-notes" id="${fid(base + '.notes')}" data-path="${base}.notes" rows="3" placeholder="For Claude Code (they go into the task prompt): details, files to touch, how to check it works" aria-label="Notes for Claude Code">${esc(t.notes)}</textarea>
        <div class="t-move">
          ${(() => { const f = t.feat && p.features.find((x) => x.id === t.feat); return f && f.title.trim() ? `<span class="t-feat">Feature: <b>${esc(oneLine(f.title))}</b></span>` : ''; })()}
          ${p.milestones.length > 1 ? `<label class="lbl" for="${fid(base + '.ms')}">Milestone</label>
          <select class="sel" id="${fid(base + '.ms')}" data-act="move-task-to" data-mid="${m.id}" data-tid="${t.id}">${p.milestones.map((x, k) => `<option value="${x.id}" ${x.id === m.id ? 'selected' : ''}>Milestone ${k + 1}: ${esc(oneLine(x.title) || 'Untitled')}</option>`).join('')}</select>
          <button type="button" class="btn sm" id="${fid(base + '.msgo')}" data-act="move-to-ms" data-mid="${m.id}" data-tid="${t.id}" aria-labelledby="${fid(base + '.msgo')} ${tid}" disabled>Move</button>` : ''}
          ${t.status === 'doing' ? `<button type="button" class="btn sm" id="${fid(base + '.back')}" data-act="set-task" data-s="todo" data-row="1" data-mid="${m.id}" data-tid="${t.id}" aria-labelledby="${fid(base + '.back')} ${tid}">Back to To do</button>` : ''}
          <button type="button" class="btn sm" id="${fid(base + '.up')}" data-act="move-task" data-d="-1" data-mid="${m.id}" data-tid="${t.id}" ${i === 0 && j === 0 ? 'disabled' : ''}>Move up</button>
          <button type="button" class="btn sm" id="${fid(base + '.down')}" data-act="move-task" data-d="1" data-mid="${m.id}" data-tid="${t.id}" ${i === p.milestones.length - 1 && j === m.tasks.length - 1 ? 'disabled' : ''}>Move down</button>
        </div>` : ''}
      </li>`;
    }).join('');
    const fold = complete ? `<div class="ms-fold"><span>${folded ? (m.tasks.length === 1 ? 'Its one task is done.' : `All ${m.tasks.length} tasks done.`) : 'Every task here is done.'}</span><span class="ms-fold-tools"><button type="button" class="btn sm ghost" id="${fid(`milestones.${m.id}.retro`)}" data-act="ms-retro" data-id="${m.id}" aria-label="Look back on milestone ${i + 1}">Look back</button><button type="button" class="btn sm ghost" id="${fid(`milestones.${m.id}.fold`)}" data-act="toggle-ms" data-id="${m.id}" aria-expanded="${!folded}" aria-label="${folded ? 'Show' : 'Hide'} tasks of milestone ${i + 1}">${folded ? 'Show tasks' : 'Hide tasks'}</button></span></div>` : '';
    return `<article class="ms${complete ? ' complete' : ''}${folded ? ' folded' : ''}" aria-label="Milestone ${i + 1}">
      <h2 class="sr">Milestone ${i + 1}: ${esc(oneLine(m.title) || 'Untitled')}${complete ? ', done' : ''}</h2>
      <div class="ms-head">
        <span class="ms-num" aria-hidden="true">M${i + 1}</span>
        <textarea class="in flat ms-title one" id="${fid(`milestones.${m.id}.title`)}" data-path="milestones.${m.id}.title" rows="1" placeholder="Milestone name" aria-label="Milestone ${i + 1} name" autocomplete="off">${esc(m.title)}</textarea>
        ${folded ? fold : `<span class="ms-count">${d}/${m.tasks.length} done</span>`}
        <div class="ms-tools">
          <button type="button" class="icon-btn" data-act="ms-move" data-id="${m.id}" data-d="-1" aria-label="Move milestone ${i + 1} up" ${i === 0 ? 'disabled' : ''}>${ICON.up}</button>
          <button type="button" class="icon-btn" data-act="ms-move" data-id="${m.id}" data-d="1" aria-label="Move milestone ${i + 1} down" ${i === p.milestones.length - 1 ? 'disabled' : ''}>${ICON.down}</button>
          <button type="button" class="icon-btn del" data-act="ask-del-ms" data-id="${m.id}" aria-label="Delete milestone ${i + 1}">${ICON.trash}</button>
        </div>
      </div>
      ${folded ? '' : `<textarea class="in flat ms-goal one" id="${fid(`milestones.${m.id}.goal`)}" data-path="milestones.${m.id}.goal" rows="1" placeholder="Goal: what works when this milestone is done" aria-label="Milestone goal" autocomplete="off">${esc(m.goal)}</textarea>`}
      ${confirm ? `<div class="confirm" role="alert"><span>${m.tasks.length ? `Delete this milestone and its ${m.tasks.length} ${m.tasks.length === 1 ? 'task' : 'tasks'}?` : 'Delete this empty milestone?'}</span><button type="button" class="btn sm danger solid" data-act="del-ms" data-id="${m.id}">Delete milestone</button><button type="button" class="btn sm" data-act="cancel-confirm">Keep it</button></div>` : ''}
      ${folded ? '' : fold}
      ${folded ? '' : m.tasks.length ? `<ul class="tasks">${runRow}${tasks}</ul>` : '<p class="empty-note">No tasks yet. Aim for 3 to 6 tasks that each fit in one Claude Code session.</p>'}
      ${folded ? '' : `<div class="ms-foot"><button type="button" class="btn sm ghost" data-act="add-task" data-mid="${m.id}" aria-label="Add task to milestone ${i + 1}">Add task</button></div>`}
    </article>`;
  }).join('');
  return `<div class="stack">
    <div class="toolbar">
      <p>Milestones run in order. Keep tasks small: S is under 15 minutes, M is one session, L should be split. ${tapWord()} a status to change it.<span class="kbd-tip"> Press Enter in a task to add the next one; Alt+↑ and Alt+↓ move it.</span></p>
      <div class="panel-tools">
        ${canAsk() ? `<button type="button" class="btn ai" data-act="ai-plan" ${S.busy[id + ':plan'] || filling(id) ? 'disabled' : ''}>${p.milestones.length ? 'Ask Claude for the next milestones' : 'Ask Claude to draft a plan'}</button>` : ''}
        <button type="button" class="btn" data-act="add-ms">Add milestone</button>
        <button type="button" class="btn" id="open-plansync" data-act="open-plansync">Update from PLAN.md</button>
      </div>
    </div>
    ${workingHTML(id + ':fill')}
    ${workingHTML(id + ':plan')}
    ${proposalHTML('plan')}
    ${ms || '<p class="empty-note">No milestones yet. Start with one called "Bare-bones version running" that gets something on screen.</p>'}
    ${bugsHTML(p)}
  </div>`;
}

/* ---------- bugs ---------- */
const bugField = (b, k, label, ph, rows, mono) => {
  const id = fid(`bugs.${b.id}.${k}`);
  return `<div><label class="lbl" for="${id}">${label}</label><textarea class="ta${mono ? ' mono' : ''}" id="${id}" data-path="bugs.${b.id}.${k}" rows="${rows}" placeholder="${esc(ph)}"${mono ? ' spellcheck="false"' : ''}>${esc(b[k])}</textarea></div>`;
};
function bugsHTML(p) {
  const open = p.bugs.filter((b) => b.status === 'open').sort((x, y) => SEV_RANK[x.severity] - SEV_RANK[y.severity]); // blockers first; newest first within each
  const fixed = p.bugs.filter((b) => b.status !== 'open');
  const showFixed = S.showFixed || fixed.length <= 3;
  const row = (b) => {
    const base = `bugs.${b.id}`;
    const det = S.openNotes.has(b.id);
    const has = !!(b.actual.trim() || b.expected.trim() || b.steps.trim() || b.error.trim());
    const isFixed = b.status === 'fixed';
    const tid = fid(base + '.title');
    return `<li class="bug" data-s="${b.status}" aria-labelledby="${tid}">
      <button type="button" class="st" id="${fid(base + '.st')}" data-s="${isFixed ? 'done' : 'todo'}" data-act="toggle-bug" data-id="${b.id}" aria-label="${isFixed ? 'Fixed. Mark open again:' : 'Open. Mark fixed:'}" aria-labelledby="${fid(base + '.st')} ${tid}" title="${isFixed ? 'Click to mark open again' : 'Click to mark fixed'}">${isFixed ? 'Fixed' : 'Open'}</button>
      <textarea class="in flat b-title one" id="${fid(base + '.title')}" data-path="${base}.title" rows="1" placeholder="What is broken, in a few words" aria-label="Bug" autocomplete="off">${esc(b.title)}</textarea>
      <select class="sel sev" id="${fid(base + '.severity')}" data-path="${base}.severity" data-l="${b.severity}" data-rerender aria-label="How bad" title="Blocker: stops you using or building the app. Major: something important is wrong. Minor: annoying but easy to live with.">${SEVERITY.map((s) => `<option value="${s.k}" ${s.k === b.severity ? 'selected' : ''}>${s.label}</option>`).join('')}</select>
      ${(() => { const d = isFixed && b.fixedAt ? b.fixedAt : b.date; const nw = Away.has(S.activeId, (isFixed ? 'f:' : 'b:') + b.id) ? newTag : ''; const when = /^\d{4}-\d{2}-\d{2}$/.test(d) ? `<span class="b-when" title="Reported ${esc(dayLabel(b.date) || 'on an unknown day')}${b.fixedAt && isFixed ? `, fixed ${esc(dayLabel(b.fixedAt))}` : ''}">${isFixed && b.fixedAt ? 'Fixed' : 'Reported'} ${esc(dayLabel(d))}</span>` : ''; return nw || when ? `<span class="b-meta">${nw}${when}</span>` : ''; })()}
      <div class="t-tools">
        <button type="button" class="icon-btn" id="${fid(base + '.dt')}" data-act="toggle-bug-details" data-id="${b.id}" aria-labelledby="${fid(base + '.dt')} ${tid}" aria-label="${det ? 'Hide' : 'Show'} details${has ? ' (has details)' : ''}" aria-expanded="${det}" title="Details"${has ? ' data-has="1"' : ''}>${ICON.notes}</button>
        ${isFixed ? '' : `<button type="button" class="btn sm" id="${fid(base + '.fix')}" data-act="bug-prompt" data-id="${b.id}" aria-labelledby="${fid(base + '.fix')} ${tid}">Fix prompt</button>`}
        <button type="button" class="icon-btn del" id="${fid(base + '.del')}" data-act="del-bug" data-id="${b.id}" aria-label="Delete bug" aria-labelledby="${fid(base + '.del')} ${tid}">${ICON.trash}</button>
      </div>
      ${det ? `<div class="bug-details">
        ${bugField(b, 'actual', 'What happens', 'For example: the list goes blank after I press Save', 2)}
        ${bugField(b, 'expected', 'What should happen', 'For example: the new item shows at the top of the list', 2)}
        ${bugField(b, 'steps', 'Steps to see it', '1. Open the app\n2. Add an item\n3. Press Save', 3)}
        ${bugField(b, 'error', 'Error message or log', 'Paste any error from the browser console or the terminal', 3, true)}
      </div>` : ''}
    </li>`;
  };
  const list = (bs, cls) => `<ul class="bugs${cls}">${bs.map(row).join('')}</ul>`;
  return `<section class="panel" aria-labelledby="bugs-h">
    <div class="panel-head"><h2 id="bugs-h">Bugs</h2><p>${openBugs(p).length ? `${openBugs(p).length} open. ` : ''}Note what is broken and what should happen, then give Claude Code the fix prompt. A blocker stops you using or building the app, a major bug gets something important wrong, and a minor one is easy to live with.</p>
      <button type="button" class="btn sm" data-act="add-bug">Report a bug</button></div>
    ${!p.bugs.length ? '<p class="empty-note">No bugs logged. When something breaks, add it here with what happens and what should happen, then use Fix prompt.</p>'
      : `${open.length ? list(open, '') : '<p class="empty-note">No open bugs.</p>'}
      ${fixed.length && showFixed ? list(fixed, ' fixed') : ''}
      ${fixed.length > 3 ? `<button type="button" class="btn sm ghost" data-act="toggle-fixed-bugs" aria-expanded="${showFixed}">${showFixed ? 'Hide fixed bugs' : `Show ${fixed.length} fixed bugs`}</button>` : ''}`}
  </section>`;
}

const REPO_FILES = [
  { k: 'claudemd', name: 'CLAUDE.md', path: 'CLAUDE.md', file: 'CLAUDE.md', what: 'The notes Claude Code reads first in every session: the goal, the tools and the rules.' },
  { k: 'plan', name: 'PLAN.md', path: 'PLAN.md', file: 'PLAN.md', what: 'The plan as a checklist that Claude Code ticks off as it works.' },
  { k: 'next', name: '/next command', path: '.claude/commands/next.md', file: 'next.md', what: 'Type /next in Claude Code to do the next task from PLAN.md.' },
  { k: 'settings', name: 'Permissions', path: '.claude/settings.json', file: 'settings.json', what: 'Lets Claude Code run your checks without asking, asks you before it sends code to GitHub, and keeps it out of .env files, where keys go.' },
  { k: 'reviewer', name: 'Reviewer agent', path: '.claude/agents/reviewer.md', file: 'reviewer.md', what: 'A helper (a subagent) that Claude Code asks to check finished work against CLAUDE.md, the plan and your checks. It reports and does not edit.' },
  { k: 'tester', name: 'Test runner agent', path: '.claude/agents/test-runner.md', file: 'test-runner.md', what: 'A helper (a subagent) that runs your checks and reports failures briefly, so long logs do not crowd out the work.', needsChecks: true },
];
const repoFiles = (p) => [...REPO_FILES.filter((f) => !f.needsChecks || (p && checkCommands(p).length)), ...(p ? promptCommands(p) : []).map((c) => ({ k: 'cmd:' + c.id, name: '/' + c.slug, path: `.claude/commands/${c.slug}.md`, file: `${c.slug}.md`, what: `Type /${c.slug} in Claude Code to run your saved prompt.${c.reserved ? ` It is not called /${c.reserved} because Claude Code already has that command.` : ''}${plainCommandText(c.text) !== c.text ? ' Dollar signs before numbers and !` are escaped, so Claude Code reads them as plain text.' : ''}`, cmd: c }))];
const repoFileOf = (k, p) => repoFiles(p).find((f) => f.k === k) || REPO_FILES[0];
// one prompt that saves every repo file; each sits in a fence longer than any run of backticks inside it
function saveAllPrompt(p, keys) {
  const files = keys ? repoFiles(p).filter((f) => keys.includes(f.k)) : repoFiles(p);
  const has = (k) => files.some((f) => f.k === k);
  const L = [
    keys ? `Update ${files.length === 1 ? 'this file' : `these ${files.length} files`} in this project's folder, making folders as needed. A file that is not there yet gets exactly the text between its fences.`
      : `Save these ${files.length} files in this project's folder, making folders as needed. A file that is not there yet gets exactly the text between its fences.`,
    'A file that is already there gets merged, not replaced:',
    ...(has('claudemd') ? [claudeMergeLine(p)] : []),
    ...(has('plan') ? [`- PLAN.md: a line with an id comment ("<!-- id:... -->") follows mine: my wording, milestone and order. Remove a line whose id mine does not have, since it was deleted here. A task or bug ticked in either file stays ticked, and Notes lines in either are kept. Keep the lines without an id that you added, unless one is the same task as a line of mine: then keep mine. Add the milestones, tasks and bugs from mine that it lacks.${planShort(p) ? ' A milestone that mine sums up in one "Finished:" line has every task done: put that line in place of its task lines.' : ''}`] : []),
    ...(has('settings') ? ['- .claude/settings.json: add any missing allow, ask and deny rules to the lists already there.'] : []),
    '- Any other file: if it is different, show me what would change and ask before replacing it.',
    'Change nothing else. When you are done, list the files you created, merged or changed. If the .claude/agents or .claude/commands folder is new, tell me to restart Claude Code (type /exit, then run claude again) so it loads them.',
  ];
  for (const f of files) {
    const text = repoFileText(p, f.k).replace(/\s+$/, '');
    const fence = '`'.repeat(Math.max(3, ...(text.match(/`{3,}/g) || []).map((r) => r.length + 1)));
    L.push('', `File: ${f.path}`, fence, text, fence);
  }
  return L.join('\n') + '\n';
}
// how the setup prompt merges CLAUDE.md. One Shipyard made is an older copy of the one here, so its sections are replaced and
// lines added there by hand come back; one the owner had before keeps what it says, and is told how to use PLAN.md
function claudeMergeLine(p) {
  if (!p.claudeMdOwn && !repoHas(p, 'claudemd')) return '- CLAUDE.md: mine is a newer version of the one Shipyard Planner made. Where a section (a "## " heading) is in both, use mine, then add back any line of the existing section that mine lacks and does not contradict, since I may have added it by hand. Keep the sections only the existing file has. Tell me which lines you added back.';
  const plan = /\bPLAN\.md\b/.test(repoFileText(p, 'claudemd')) ? '' : ` If it does not say how to use PLAN.md yet, add this line under a "## How to work in this repo" heading: ${PLAN_LINE}`;
  return `- CLAUDE.md: keep everything it already says. Add the sections and lines from mine that it lacks.${plan} Where the two disagree, keep the existing text and tell me.`;
}
function repoFileText(p, k) {
  if (str(k).startsWith('cmd:')) { const f = repoFileOf(k, p); return f.cmd ? commandMd(f.cmd) : buildClaudeMd(p); }
  switch (k) {
    case 'plan': return buildPlanMd(p);
    case 'next': return nextCommandMd(p);
    case 'settings': return settingsJson(p);
    case 'reviewer': return reviewerMd(p);
    case 'tester': return testerMd(p);
    default: return p.claudeMdEdited ? p.claudeMd : buildClaudeMd(p);
  }
}
function repoHowHTML(p, k, f) {
  const steps = f?.cmd ? [
    `Easiest: paste it into Claude Code and say "save this as ${esc(f.path)}".`,
    `Or save it yourself as <code>${esc(f.path)}</code> in your project, next to <code>next.md</code>.`,
    `In Claude Code, type <code>/${esc(f.cmd.slug)}</code>, and add a note after it if you like.`,
    'To change it, edit the prompt under Your prompts on the Improve tab, then give this file to Claude Code again. Ask Claude Code to commit it (save it in git) so it works on every computer.',
  ] : {
    claudemd: repoHas(p, 'claudemd') || p.claudeMdOwn ? [
      'Your project already has a CLAUDE.md, so merge this into it rather than replace it: start Claude Code in the project\'s folder, paste this and say "merge this into CLAUDE.md, keeping what is already there".',
      'No Claude Code yet? <span class="nw"><button type="button" class="linkish" data-act="cc-setup">See how to start</button>.</span>',
      'Claude Code reads it at the start of every session, so it always knows the goal, stack and rules.',
      `When Claude Code repeats a mistake, log it on the Improve tab and add the fix as a rule. Then paste ${folderPrompt(p)} from this tab into Claude Code.`,
    ] : [
      'Easiest: start Claude Code in your project\'s folder, paste this and say "save this as CLAUDE.md". Or save it yourself as <code>CLAUDE.md</code> in that folder.',
      'No folder or Claude Code yet? <span class="nw"><button type="button" class="linkish" data-act="cc-setup">See how to start</button>.</span>',
      'Claude Code reads it at the start of every session, so it always knows the goal, stack and rules.',
      'No file yet? You can also run <code>/init</code> in Claude Code and paste the useful parts of this into what it writes.',
      `When Claude Code repeats a mistake, log it on the Improve tab and add the fix as a rule. Then paste ${folderPrompt(p)} from this tab into Claude Code.`,
    ],
    plan: repoHas(p, 'plan') ? [
      'Your project already has a PLAN.md. First bring Shipyard up to date with it: choose <b>Update from PLAN.md</b> on the Plan tab and paste the file. If Shipyard did not make it, its tasks are added to the plan.',
      'Then paste this into Claude Code and say "merge this into PLAN.md, keeping its ticks and notes".',
      'In Claude Code, type <code>/next</code> (see the next file) or ask it to "do the next task in PLAN.md".',
      'Claude Code ticks off each task when it works. Back here, use Update from PLAN.md again to bring Shipyard up to date.',
    ] : [
      'Paste it into Claude Code and say "save this as PLAN.md", or save it yourself as <code>PLAN.md</code> next to CLAUDE.md.',
      'In Claude Code, type <code>/next</code> (see the next file) or ask it to "do the next task in PLAN.md".',
      'Claude Code ticks off each task when it works, and adds any extra work it finds.',
      'Back here, choose <b>Update from PLAN.md</b> on the Plan tab and paste the file to bring Shipyard up to date.',
    ],
    next: [
      'Easiest: paste it into Claude Code and say "save this as .claude/commands/next.md". Folders whose names start with a dot are hidden on a Mac, so this beats making it by hand.',
      'Or, in a terminal in your project\'s folder, run <code>mkdir -p .claude/commands</code> and save the file there as <code>next.md</code>.',
      'In Claude Code, type <code>/next</code>. If it is not in the list yet, restart Claude Code (type <code>/exit</code>, then <code>claude</code>). Add a note if you like, for example <code>/next keep it simple</code>.',
      'It works from <code>PLAN.md</code>, so save that file too.',
    ],
    settings: [
      'Save this as <code>.claude/settings.json</code> in your project. If the file already exists, add these lines to its allow, ask and deny lists instead.',
      safeCommands(p).length ? 'Claude Code can then run your install, test, build and style-check (lint) commands without asking each time, on a Mac, Linux or Windows, and the checks also with extra arguments, such as a single test file.' : 'Add your test and build commands under How to run and test on the Overview tab, and they show up here so Claude Code can run them without asking.',
      'Claude Code may run in auto mode, where a safety check lets most commands run without asking. The ask rules make it stop and ask you before it sends code to GitHub (a push) or asks to merge changes there (a pull request).',
      'It also keeps Claude Code\'s file tools away from <code>.env</code> files (all but <code>.env.example</code>) and <code>secrets</code> folders anywhere in the project: Claude cannot read, create or edit them, so you paste keys into <code>.env</code> yourself.',
      'Ask Claude Code to commit this file (save it in git), so the same rules apply on every computer.',
    ],
    reviewer: [
      'Easiest: paste it into Claude Code and say "save this as .claude/agents/reviewer.md".',
      'Start a new Claude Code session, so it loads the new folder. To check, type <code>@</code> and pick reviewer from the list, or say "use the reviewer subagent".',
      'After a task, say "ask the reviewer to check this". The <code>/next</code> command asks it too, before ticking a task off.',
      'It reports and does not edit, so you decide what gets fixed. Ask Claude Code to commit the file (save it in git) so it works on every computer.',
    ],
    tester: [
      'Easiest: paste it into Claude Code and say "save this as .claude/agents/test-runner.md".',
      'Start a new Claude Code session, so it loads the new folder.',
      'After a change, say "use the test runner". Claude Code gets a short report instead of pages of test output, which leaves more room for the work.',
      'It runs the checks from How to run and test on the Overview tab. After changing those, copy this file again.',
    ],
  }[k];
  return `<ol class="how">${steps.map((s) => `<li><span>${s}</span></li>`).join('')}</ol>`;
}
function claudeMdHTML(p) {
  const f = repoFileOf(S.repoFile, p);
  const k = f.k;
  const md = k === 'claudemd';
  const confirm = md && S.confirm?.kind === 'rebuild';
  const save = S.downloads ? 'copy or download' : 'copy';
  const gap = folderGap(p);
  const behind = gap && (k === 'plan' ? gap.plan > 0 : gap.files.includes(k));
  const folder = !gap ? ` After changes, ${save} it again and give it to Claude Code, so your project's folder has the new version.`
    : behind ? (k === 'plan' ? ` <b class="behind">Your project's folder is behind:</b> its PLAN.md ${esc(folderGapText(gap))}.` : ` <b class="behind">Changed since you last gave it to Claude Code:</b> your project's folder still has the old one.`)
    : ' Your project\'s folder has this version, as far as Shipyard knows.';
  const state = (md
    ? (p.claudeMdEdited ? (p.claudeMdOwn ? '<b>Your own CLAUDE.md, as imported.</b> Changes to the brief, features, screens and decisions do not flow in. Rules you add from the Improve tab do.' : '<b>Edited by you.</b> Changes to the brief, features, screens and decisions no longer flow in. Rules you add from the Improve tab still do.') : `<b>Built from your project.</b> ${esc(f.what)}`)
    : `<b>Built from your project.</b> ${esc(f.what)}`) + folder;
  const tools = md
    ? `${p.claudeMdEdited ? '<button type="button" class="btn sm" data-act="ask-rebuild">Rebuild from project</button>' : ''}
          <button type="button" class="btn sm" data-act="copy-md">Copy</button>
          ${S.downloads ? '<button type="button" class="btn sm" data-act="download-md">Download</button>' : ''}`
    : `<button type="button" class="btn sm" data-act="copy-file" data-k="${k}">Copy</button>
          ${S.downloads ? `<button type="button" class="btn sm" data-act="download-file" data-k="${k}">Download</button>` : ''}`;
  return `<div class="stack">
    <div class="file-tabs" role="group" aria-label="Files for your project's folder">${repoFiles(p).map((x) => `<button type="button" class="file-tab" data-act="repo-file" data-k="${x.k}" aria-pressed="${x.k === k}"><b>${esc(x.name)}</b>${gap && (x.k === 'plan' ? gap.plan : gap.files.includes(x.k)) ? '<span class="ft-flag"><span class="sr">, </span>changed</span>' : ''}<code>${pathHTML(x.path)}</code></button>`).join('')}</div>
    <div class="md-layout">
    <section class="panel" aria-label="${esc(f.path)}">
      <div class="md-bar">
        <code class="md-path">${pathHTML(f.path)}</code>
        <span class="md-state">${state}</span>
        <div class="panel-tools">${behind ? '<button type="button" class="btn sm" data-act="update-folder">Get the update prompt</button>' : ''}${tools}</div>
      </div>
      ${confirm ? `<div class="confirm" role="alert" style="margin-bottom:10px"><span>${p.claudeMdOwn ? 'Replace your own CLAUDE.md with one built from the project? Anything only your file says will be gone.' : 'Replace your edits with a fresh copy built from the project?'}</span><button type="button" class="btn sm danger solid" data-act="rebuild-md">Replace</button><button type="button" class="btn sm" data-act="cancel-confirm">${p.claudeMdOwn ? 'Keep mine' : 'Keep my edits'}</button></div>` : ''}
      ${md
        ? '<label class="sr" for="f-claudeMd">CLAUDE.md contents</label>'
          + `<textarea class="ta mono md-text" id="f-claudeMd" data-path="claudeMd" spellcheck="false">${esc(repoFileText(p, k))}</textarea>`
        : `<label class="sr" for="repo-text">${esc(f.path)} contents</label><textarea class="ta mono md-text" id="repo-text" readonly spellcheck="false">${esc(repoFileText(p, k))}</textarea>`}
    </section>
    <div class="md-side">
    <div class="save-all"><p><b>All ${repoFiles(p).length} files at once.</b> The setup prompt has Claude Code save them in your project's folder. It merges into a CLAUDE.md or PLAN.md already there, and asks before replacing any other file.</p><button type="button" class="btn sm primary" data-act="save-all">Get the setup prompt</button></div>
    <aside class="panel">
      <div class="panel-head"><h2>How to use it</h2></div>
      ${repoHowHTML(p, k, f)}
    </aside>
    </div>
    </div>
  </div>`;
}

// how large a project is, worked out once per change
const sizeSeen = new WeakMap();
function projectSize(p) {
  const hit = sizeSeen.get(p);
  if (hit && hit.at === p.updatedAt) return hit.n;
  const n = sizeOf(p);
  sizeSeen.set(p, { at: p.updatedAt, n });
  return n;
}
// past this, Sessions says the project is getting large and offers a backup, unless one was made in the last 30 days
const SIZE_NOTE_AT = MAX_BYTES * 0.6;
const LS_BACKUP_AT = 'shipyard.backup.v1';
function sizeNoteHTML(p) {
  const n = projectSize(p);
  const last = str(lsGet(LS_BACKUP_AT));
  if (n <= SIZE_NOTE_AT || (realDay(last) && daysBetween(last, today()) < 30)) return '';
  return `<div class="keep-note size-note" id="size-note"><p><b>This project is getting large.</b> It takes ${Math.ceil(n / 1000)} KB of the ${MAX_BYTES / 1000} KB one project can hold. Near that, logging a session shortens the notes of the oldest sessions to make room, so back up now and then to keep a whole copy.</p>
    <div class="row"><button type="button" class="btn sm" data-act="backup">Back up all projects</button></div></div>`;
}
// a backup was copied or downloaded: the note can go
function backedUp() { lsSet(LS_BACKUP_AT, today()); $('#size-note')?.remove(); }
function sessionsHTML(p) {
  const all = p.sessions;
  const count = (k) => all.filter((x) => x.outcome === k).length;
  const shown = (S.allSessions ? all.slice() : all.slice(-20)).reverse();
  // long notes show their start; "Show all" opens the rest in place
  const items = shown.map((x) => {
    const sum = reportBody(untermText(x.summary)).trim();
    const wrong = x.wrong.trim();
    const long = sum.length > 280 || wrong.length > 200;
    const open = long && S.openSessions.has(x.id);
    const cut = (t, n) => (open || t.length <= n ? t : t.slice(0, n).trimEnd() + '…');
    const tid = fid(`sessions.${x.id}.task`);
    return `<li class="session">
      <span class="date">${esc(dayLabel(x.date))}</span>
      <span class="oc" data-o="${x.outcome}">${esc(OUTCOMES.find((o) => o.k === x.outcome)?.short)}</span>
      <div class="s-body" id="${fid(`sessions.${x.id}.body`)}">${Away.has(S.activeId, 's:' + x.id) ? newTag : ''}<b id="${tid}" tabindex="-1">${esc(x.task || 'Untitled task')}</b>${sum ? `<p>${esc(cut(sum, 280))}</p>` : ''}${wrong ? `<p class="s-wrong">Went wrong: ${esc(cut(wrong, 200))}</p>` : ''}${long ? `<button type="button" class="linkish s-more" id="${fid(`sessions.${x.id}.more`)}" data-act="toggle-session" data-id="${x.id}" aria-expanded="${open}" aria-controls="${fid(`sessions.${x.id}.body`)}" aria-labelledby="${fid(`sessions.${x.id}.more`)} ${tid}">${open ? 'Show less' : 'Show all'}</button>` : ''}</div>
      <button type="button" class="icon-btn del" id="${fid(`sessions.${x.id}.del`)}" data-act="del-session" data-id="${x.id}" aria-label="Delete session ${esc(dayLabel(x.date))}: ${esc(x.task || 'Untitled task')}">${ICON.trash}</button></li>`;
  }).join('');
  return `<section class="panel">
      <div class="panel-head"><h2 id="sessions-h" tabindex="-1">Sessions</h2><p>${all.length ? `${all.length} logged: ${count('done')} done, ${count('partly')} partly done, ${count('stuck')} stuck.${all.length > 20 && !S.allSessions ? ' Showing the latest 20.' : ''}` : 'After each Claude Code session, note what you worked on and how it went.'}</p>
        <button type="button" class="btn sm" data-act="log-session">Log a session</button></div>
      ${sizeNoteHTML(p)}
      ${all.length ? `<ul class="rows">${items}</ul>${all.length > 20 ? `<button type="button" class="btn sm ghost" data-act="toggle-all-sessions" aria-expanded="${!!S.allSessions}" style="margin-top:8px">${S.allSessions ? 'Show the latest 20' : `Show all ${all.length}`}</button>` : ''}` : '<p class="empty-note">No sessions logged yet. Log one from the Claude Code prompt dialog or the Next up panel after you finish a task, or after a ready-made prompt.</p>'}
    </section>`;
}

/* ---------- ready-made prompts for jobs beyond the plan ---------- */
const UI_STARTERS = new Set(['web', 'game', 'mobile', 'extension', 'ai']);
const promptIntro = (p) => (p.pitch.trim() ? `I'm working on ${p.name || 'my project'}: ${sentence(p.pitch)}` : `I'm working on ${p.name || 'my project'}.`);
const runTests = (p) => (hasTests(p) ? 'run the tests from Commands in CLAUDE.md' : 'run the app and check it still works');
const QUICK = [
  {
    k: 'bugs', label: 'Find bugs', hint: 'A careful read for mistakes, with a list before any fix.',
    build: (p) => ['Look for bugs in this project and fix the real ones.', '', 'How to work:',
      '1. Read CLAUDE.md. Then read the code, starting with what changed most recently (git log -p -5 shows it).',
      '2. Look for crashes, wrong results, missing error handling, empty or unexpected input that is not handled, and code that does not do what CLAUDE.md says the app should do.',
      '3. Stop and show me a list: what goes wrong, where (file and line), how to see it, and how sure you are. Do not change anything yet.',
      `4. When I say which to fix, fix each one with the smallest change${hasTests(p) ? ', add a test that would have caught it,' : ''} and ${runTests(p)}.${hasTests(p) ? '' : ' There is no test setup yet, so do not add one unless I ask.'}`],
  },
  {
    k: 'tests', label: 'Add missing tests', hint: 'Covers the important logic first. Never bends code to pass.',
    build: (p) => {
      const must = p.features.filter((f) => f.priority === 'must' && f.title.trim()).map((f) => f.title.trim());
      return ['Add tests for the parts of this project that have none.', '', 'How to work:',
        hasTests(p) ? '1. Read CLAUDE.md and run the tests from Commands to see what exists and that it passes.' : '1. Read CLAUDE.md and find out how this project is tested. If it has no test setup yet, propose the simplest one for this stack and wait for my go-ahead.',
        `2. Find the most important logic that has no tests${must.length ? `, starting with the must-have features: ${must.slice(0, 6).join('; ')}` : ''}.`,
        '3. Add focused tests a few at a time. Test what the code does, not how it does it.',
        '4. Do not change app code to make a test pass. If a test shows a bug, stop and tell me.',
        '5. Run all the tests. Finish with what is now covered and what still is not.'];
    },
  },
  {
    k: 'explain', label: 'Explain the code', hint: 'A plain-words tour for you. Changes nothing.',
    build: (p) => {
      const ex = p.features.find((f) => f.priority === 'must' && f.title.trim()) || p.features.find((f) => f.title.trim());
      return ['Explain this codebase to me. I may not be a professional developer, so use plain words. Do not change any files.', '', 'Cover:',
        '- what each top-level folder and main file is for',
        `- how one real action flows through the code, from the screen or command to where data is saved${ex ? ` (use "${ex.title.trim()}" as the example)` : ''}`,
        '- where data is stored, and how to run and test the project',
        '- the three things most likely to confuse someone new to it',
        '', 'Keep it to about a page, and name file paths so I can look for myself.'];
    },
  },
  {
    k: 'tidy', label: 'Tidy up safely', hint: 'Cleaner code with the same behaviour, tests first.',
    build: (p) => ['Tidy up the code without changing what the app does.', '', 'How to work:',
      hasTests(p) ? '1. Read CLAUDE.md and run the tests from Commands. They must pass before you start.' : '1. Read CLAUDE.md and work out how the app behaves now.',
      '2. Pick the few changes that help most, such as duplicated code, very long functions, unclear names and dead code. List them, say which of those parts have no tests, and wait for my go-ahead. Do not change any files yet.',
      hasTests(p) ? '3. After my go-ahead, first add tests for the parts you will change that have none.' : '3. After my go-ahead, tell me how you will check each part still works, since there are no tests yet.',
      `4. Make one change at a time, and after each one ${runTests(p)}.`,
      '5. Do not change behaviour, the tech stack or the code style. Finish with what you changed and why.'],
  },
  {
    k: 'security', label: 'Check security', hint: 'Secrets, user input, logins and packages. Reports first.',
    build: () => ['Check this project for the security problems small apps commonly have. Report before you fix anything.', '', 'Look for:',
      '- secrets or API keys in the code, in config files or in git history',
      '- user input that reaches a database query, a shell command, HTML or a file path without being checked',
      '- pages or endpoints that should need a login or permission and do not',
      '- packages with known vulnerabilities, using the usual audit tool for this stack (for example npm audit or pip-audit)',
      '- personal data that is stored, logged or sent when it does not need to be',
      '', 'For each problem, say where it is, how serious it is (high, medium or low) and how you would fix it. Do not change anything until I say which to fix.'],
  },
  {
    k: 'plan', label: 'Check the plan against the code', hint: 'Ticks what is really built in PLAN.md, for Update from PLAN.md.',
    note: 'This one also needs the current PLAN.md in your project, so copy it from the Project files tab first. Afterwards, paste the updated PLAN.md into Update from PLAN.md on the Plan tab.',
    build: () => ['Compare PLAN.md with the code and bring PLAN.md up to date. Do not change any code.', '', 'How to work:',
      '1. Read CLAUDE.md and PLAN.md. If there is no PLAN.md, stop and ask me to add it.',
      '2. For each task that is not checked, look in the code and decide whether it is done. Check it ("- [x]") only if it is built and works. Run the tests if that helps you decide.',
      '   This work was done earlier, so do not give it today\'s date: add "done YYYY-MM-DD" to its brackets only when git log shows the day it was finished, and otherwise tick it without a date.',
      '3. If a task is half done, leave it unchecked and add an indented line under it saying what is left.',
      '4. Keep every <!-- id --> marker and the order of the tasks. Finish with a list of what you checked.'],
  },
  {
    k: 'claudemd', label: 'Improve CLAUDE.md', hint: 'Adds what the code shows that CLAUDE.md misses.',
    note: 'When Claude Code has changed CLAUDE.md, paste the new file into Project files, CLAUDE.md, here in Shipyard. Otherwise copying CLAUDE.md from Shipyard again would undo the changes.',
    build: () => ['Improve CLAUDE.md so it helps you more next time. Keep it short: every line should earn its place.', '', 'How to work:',
      '1. Read CLAUDE.md, then look at the code: the folder layout, the scripts in package.json or its equivalent, the test setup and the config files.',
      '2. Suggest what would have saved you time: commands that are missing or wrong, where things live, conventions the code follows, and traps to avoid. Remove anything that is no longer true.',
      '3. Show me the changes as a diff and wait for my go-ahead before you write the file.'],
  },
  {
    k: 'look', label: 'Polish the look', hint: 'Layout, states and small screens, in the existing style.',
    when: (p) => UI_STARTERS.has(p.starter) || (!p.starter && p.screens.length > 0), // a starter's "parts" are not screens
    build: (p) => {
      const sc = p.screens.map((s) => s.name.trim()).filter(Boolean);
      const sizes = p.starter === 'mobile' ? 'small and large phones' : p.starter === 'extension' ? 'the size of its popup or panel' : 'phone and desktop widths';
      return ['Make the app look and feel more finished, without changing what it does.', '', 'How to work:',
        `1. Read CLAUDE.md, then the code for ${sc.length ? `each screen (${sc.slice(0, 8).join(', ')})` : 'each screen'}. If you have a browser or screenshot tool, use it to look at them at ${sizes}; otherwise work from the code and the styles.`,
        '2. List the most noticeable problems: cramped or misaligned layout, text that is hard to read, buttons with no hover or focus style, missing empty, loading and error states, and anything that would break on a small screen. Wait for my go-ahead.',
        '3. Fix them a few at a time, keeping the existing style and components.',
        `4. Finish with what to check by hand, screen by screen, at ${sizes}.`];
    },
  },
  {
    k: 'share', label: 'Get it ready to share', hint: 'A README, no secrets in the code, and a build that works.',
    build: (p) => ['Get this project ready for someone else to use.', '', 'How to work:',
      `1. Read CLAUDE.md. ${hasTests(p) ? 'Run the tests and the build from Commands, and fix anything that fails before going on.' : p.commands.trim() ? 'Run the app, and its build if Commands has one, and fix anything that fails before going on.' : 'Run the app and fix anything that fails before going on.'}`,
      '2. Write or update README.md: what it is, how to install and run it, and how to use it, in steps a newcomer can follow.',
      '3. List the debug output, leftover test data and unused files you would remove, and wait for my OK before removing them. Check that no secrets are committed and that .gitignore covers build output and local env files.',
      '4. Finish with anything that still stands in the way of sharing it, such as a step that needs my accounts.'],
  },
];
const quickFor = (p) => QUICK.filter((q) => !q.when || q.when(p));
function quickPrompt(p, q) {
  const L = [promptIntro(p), '', ...q.build(p)];
  if (p.constraints.trim() && q.k !== 'explain') L.push('', 'Constraints:', ...bullets(p.constraints));
  L.push('', `When the work is done, e${LOG_ASK.slice(1)}`);
  return L.join('\n');
}
// "Tap" on a touch screen, "Click" with a mouse
const tapWord = () => (typeof matchMedia === 'function' && matchMedia('(hover: none) and (pointer: coarse)').matches ? 'Tap' : 'Click');
const modKey = () => (/Mac|iPhone|iPad/.test((typeof navigator !== 'undefined' && (navigator.platform || navigator.userAgent)) || '') ? 'Cmd' : 'Ctrl');
const cmdLinkHTML = (id, slug) => `<button type="button" class="linkish cmd-link" data-act="open-cmd" data-id="${id}" title="See it as a Claude Code command on the Project files tab">/${esc(slug)}</button>`;
const cmdLineHTML = (id, slug) => `Slash command in Claude Code: ${cmdLinkHTML(id, slug)}`;
// keeps each saved prompt's /command line in step with its name and text, without re-rendering the fields being typed in
function syncCmdLinks(p) {
  const cmds = new Map(promptCommands(p).map((c) => [c.id, c.slug]));
  for (const x of p.prompts) {
    const line = document.getElementById(fid(`prompts.${x.id}.cmd`));
    if (!line) continue;
    const link = line.querySelector('.cmd-link');
    if (!cmds.has(x.id)) { if (line.firstChild) line.textContent = ''; }
    else if (link) link.textContent = '/' + cmds.get(x.id);
    else line.innerHTML = cmdLineHTML(x.id, cmds.get(x.id));
  }
}
function promptsHTML(p) {
  const cards = quickFor(p).map((q) => `<li><button type="button" class="qp" data-act="quick-prompt" data-k="${q.k}"><b>${esc(q.label)}</b><span>${esc(q.hint)}</span></button></li>`).join('');
  const cmds = new Map(promptCommands(p).map((c) => [c.id, c.slug]));
  const own = p.prompts.map((x) => {
    const base = `prompts.${x.id}`;
    const tid = fid(base + '.title');
    const did = fid(base + '.del');
    return `<li class="own-prompt" aria-labelledby="${tid}">
      <input class="in" id="${tid}" data-path="${base}.title" value="${esc(x.title)}" placeholder="Name, like Write release notes" aria-label="Name" autocomplete="off">
      <div class="own-tools">
        <button type="button" class="btn sm" id="${fid(base + '.use')}" data-act="own-prompt" data-id="${x.id}" aria-labelledby="${fid(base + '.use')} ${tid}"><span>Open<span class="lbl-wide"> prompt</span></span></button>
        <button type="button" class="icon-btn del" id="${did}" data-act="del-prompt" data-id="${x.id}" aria-label="Delete" aria-labelledby="${did} ${tid}">${ICON.trash}</button>
      </div>
      <textarea class="ta" id="${fid(base + '.text')}" data-path="${base}.text" rows="${Math.max(3, Math.min(10, str(x.text).split('\n').length + 1))}" placeholder="The prompt, as you would type it into Claude Code" aria-label="Prompt">${esc(x.text)}</textarea>
      <p class="hint own-cmd" id="${fid(base + '.cmd')}">${cmds.has(x.id) ? cmdLineHTML(x.id, cmds.get(x.id)) : ''}</p></li>`;
  }).join('');
  return `<section class="panel" aria-labelledby="qp-h">
    <div class="panel-head"><h2 id="qp-h">Ask Claude Code to…</h2><p>Ready-made prompts for jobs outside the plan. Each one tells Claude Code how to work and when to stop and check with you.</p></div>
    <ul class="qp-grid">${cards}</ul>
    <div class="own-head"><h3>Your prompts</h3><button type="button" class="btn sm" data-act="add-prompt">Add prompt</button></div>
    ${p.prompts.length ? `<ul class="rows">${own}</ul>` : '<p class="empty-note">Save prompts you use again and again here, such as "Write release notes" or "Update the screenshots". Each one also becomes a slash command for Claude Code on the Project files tab.</p>'}
  </section>`;
}

function improveHTML(p) {
  const id = S.activeId;
  const h = health(p);
  const pct = Math.round((h.ok / h.total) * 100);
  const ai = canAsk();
  const autoList = h.auto.map((c, i) => `<li class="check">
      <span class="mark ${c.ok ? 'ok' : 'no'}" role="img" aria-label="${c.ok ? 'Passing' : 'Needs work'}">${c.ok ? ICON.check : ICON.dash}</span>
      <div><b id="ck-${i}">${esc(c.label)}</b>${c.ok ? '' : `<span class="h">${esc(c.fix)}</span>`}</div>
      ${c.ok ? '<span></span>' : `<button type="button" class="btn sm ghost" id="ck-${i}-go" data-act="tab" data-k="${c.tab}" aria-labelledby="ck-${i}-go ck-${i}">Open ${TABS.find((t) => t.k === c.tab)?.label || 'tab'}</button>`}</li>`).join('');
  let lastGroup = '';
  const habits = HABITS.map((hb) => {
    const g = hb.group !== lastGroup ? `<li class="group-label">${esc(hb.group)}</li>` : '';
    lastGroup = hb.group;
    const cid = fid('checks.' + hb.k);
    return `${g}<li class="check"><input type="checkbox" id="${cid}" data-path="checks.${hb.k}" data-rerender ${p.checks[hb.k] ? 'checked' : ''}>
      <label for="${cid}"><b>${esc(hb.label)}</b><span class="h">${esc(hb.hint)}</span></label><span></span></li>`;
  }).join('');
  const r = p.lastReview;
  const review = r ? `<div class="review">
      <p class="headline">${esc(r.headline)}</p>
      <div class="grid-2">
        ${r.strengths.length ? `<div><span class="lbl">Going well</span><ul>${r.strengths.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        ${r.risks.length ? `<div><span class="lbl">Watch out for</span><ul>${r.risks.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      </div>
      ${r.suggestions.length ? `<div><span class="lbl">Suggestions</span><ul class="sugg">${r.suggestions.map((s, i) => `<li>
        <span class="kind">${s.type === 'rule' ? 'CLAUDE.md rule' : s.type}</span>
        <div><b id="sg-${i}">${esc(s.title)}</b><span class="w">${esc(s.why)}</span></div>
        ${s.added ? '<span class="promoted">Added</span>' : `<button type="button" class="btn sm" id="sg-${i}-add" data-act="review-add" data-i="${i}" aria-labelledby="sg-${i}-add sg-${i}">${s.type === 'task' ? 'Add to plan' : s.type === 'feature' ? 'Add feature' : 'Add rule'}</button>`}
      </li>`).join('')}</ul></div>` : ''}
      <p class="hint">Reviewed ${esc(agoDay(localDay(r.at), today()))}.</p>
    </div>` : `<p class="empty-note">${ai ? 'Claude reads the whole project and points out risks, vague tasks and missing rules. You choose which suggestions to add.' : 'Claude reviews are not available here.'}</p>`;
  const tucked = p.lessons.filter((l) => lessonInMd(p, l) && !S.promotedNow.has(l.id)); // one added this visit stays in sight
  const fold = tucked.length >= LESSON_FOLD_AT && !S.allLessons ? new Set(tucked) : null;
  const lessons = p.lessons.filter((l) => !fold?.has(l)).map((l) => `<li class="lesson">
      <span class="date">${esc(dayLabel(l.date))}</span>
      <textarea class="ta l-a" id="${fid(`lessons.${l.id}.happened`)}" data-path="lessons.${l.id}.happened" rows="2" placeholder="What happened" aria-label="What happened">${esc(l.happened)}</textarea>
      <textarea class="ta l-b" id="${fid(`lessons.${l.id}.change`)}" data-path="lessons.${l.id}.change" rows="2" placeholder="What to do differently, as a rule for Claude Code" aria-label="What to do differently">${esc(l.change)}</textarea>
      <div class="lesson-actions">
        ${lessonInMd(p, l) ? '<span class="promoted">In CLAUDE.md</span>' : `<button type="button" class="btn sm" id="${fid(`lessons.${l.id}.pr`)}" data-act="promote" data-id="${l.id}" aria-labelledby="${fid(`lessons.${l.id}.pr`)} ${fid(`lessons.${l.id}.happened`)}">${l.promoted ? 'Update in CLAUDE.md' : 'Add to CLAUDE.md'}</button>`}
        <button type="button" class="icon-btn del" id="${fid(`lessons.${l.id}.del`)}" data-act="del-lesson" data-id="${l.id}" aria-label="Delete lesson" aria-labelledby="${fid(`lessons.${l.id}.del`)} ${fid(`lessons.${l.id}.happened`)}">${ICON.trash}</button>
      </div></li>`).join('');
  return `<div class="stack">
    <section class="panel">
      <div class="score">
        <div class="score-num">${h.ok}<small>/${h.total}</small></div>
        <div class="score-meta"><span class="lbl" style="margin:0">Project health</span><div class="meter" role="img" aria-label="${pct} percent"><span style="width:${pct}%"></span></div>
          <p class="hint" style="margin:0">Plan checks update on their own. Tick the habits you actually follow.</p></div>
      </div>
    </section>
    ${promptsHTML(p)}
    <div class="grid-2">
      <section class="panel"><div class="panel-head"><h2>Plan checks</h2></div><ul class="checks">${autoList}</ul></section>
      <section class="panel"><div class="panel-head"><h2>Habits</h2></div><ul class="checks">${habits}</ul></section>
    </div>
    <section class="panel">
      <div class="panel-head"><h2 id="review-h" tabindex="-1">Claude review</h2>
        ${ai ? `<button type="button" class="btn ai" data-act="ai-review" ${S.busy[id + ':review'] ? 'disabled' : ''}>${r ? 'Review again' : 'Review my project'}</button>` : ''}</div>
      ${workingHTML(id + ':review') || review}
    </section>
    ${sessionsHTML(p)}
    <section class="panel">
      <div class="panel-head"><h2>Lessons</h2><p>After a session that went sideways, note what happened and the rule that would have prevented it.</p>
        <button type="button" class="btn sm" data-act="add-lesson">Add lesson</button></div>
      ${p.lessons.length ? `${lessons ? `<ul class="rows">${lessons}</ul>` : '<p class="empty-note">The rule of every lesson is in CLAUDE.md already.</p>'}${tucked.length >= LESSON_FOLD_AT ? `<button type="button" class="btn sm ghost" data-act="toggle-all-lessons" aria-expanded="${!!S.allLessons}" style="margin-top:8px">${S.allLessons ? 'Hide the lessons already in CLAUDE.md' : `Show the ${tucked.length} lessons already in CLAUDE.md`}</button>` : ''}` : '<p class="empty-note">No lessons yet. Example: "Claude Code rewrote the whole page when I asked for a button." Rule: "Only change the files the task names."</p>'}
    </section>
  </div>`;
}

/* ---------- modals ---------- */
/* ---------- split a large task ---------- */
const splitBtnText = (n) => `Replace with ${n} ${n === 1 ? 'task' : 'tasks'}`;
const splitCountText = (n, text) => (n ? `${n} ${n === 1 ? 'task' : 'tasks'}.` : 'No tasks yet.') + (n >= 12 && lines(text).length > 12 ? ' Only the first 12 lines are used.' : '');
function openSplit(mid, tid) {
  const p = active();
  const { t } = p ? findTask(p, mid, tid) : {};
  if (!t) return;
  const m = { kind: 'split', mid, tid, title: t.title, mode: canAsk() ? 'ai' : 'manual', text: '', suggest: null, busy: null };
  openModal(m);
  if (m.mode === 'ai') aiSplit(m);
}
async function aiSplit(m) {
  const p = active();
  if (!p || !canAsk() || m.busy) return;
  const { m: ms, t } = findTask(p, m.mid, m.tid);
  if (!t) return;
  const ctl = new AbortController();
  m.busy = { ctl };
  m.mode = 'ai';
  m.suggest = null;
  renderModal();
  const others = ms.tasks.filter((x) => x !== t && x.title.trim()).map((x) => `- ${oneLine(x.title)}${x.status === 'done' ? ' (done)' : ''}`);
  const prompt = [
    'Split one task from this project\'s plan into smaller tasks.', ABOUT, '',
    'Reply with only JSON: {"tasks": [{"title": string (starts with a verb, under 80 characters), "size": "S" (under 15 minutes) | "M" (one Claude Code session, 15 to 45 minutes), "notes": string (one or two sentences on what to do and how to check it works)}]}',
    'Give 2 to 5 tasks in the order to do them. Together they do everything the original task asks and nothing more. Each one leaves the app working and ends with something the owner can see or test. Leave out work that other tasks in this milestone already cover.',
    '', `Task to split: ${oneLine(t.title) || '(untitled)'}`, `Its notes: ${oneLine(t.notes) || '(none)'}`,
    `Milestone ${msIndex(p, ms)}: ${oneLine(ms.title) || 'Untitled'}${ms.goal.trim() ? `. Goal: ${oneLine(ms.goal)}` : ''}`,
    ...(others.length ? ['Other tasks in this milestone:', ...others] : []),
    '', 'Project:', contextOf(p, 30000),
  ].join('\n');
  try {
    const r = await S.sample.json(prompt, { signal: ctl.signal, cache: false });
    if (S.modal !== m) return;
    const u = unwrap(r, ['tasks']);
    const all = (coerceMilestones([{ title: 'x', tasks: Array.isArray(u) ? u : arr(u?.tasks) }], active() || p)[0]?.tasks || []).slice(0, 6);
    const [tasks, gone] = newTasksOnly(active() || p, all, findTask(active() || p, m.mid, m.tid).t);
    m.suggest = { tasks, dropped: gone, odd: !all.length && oddShape(r), sel: new Set(tasks.map((_, i) => i)) };
  } catch (e) {
    if (S.modal === m) m.suggest = { tasks: [], sel: new Set(), failed: !userStopped(e, ctl), stopped: userStopped(e, ctl) };
    onClaudeError(e, ctl, 'split');
  } finally {
    if (S.modal === m) { m.busy = null; renderModal(); claudeListed('#sp-h', `Claude suggests ${many(m.suggest?.tasks.length || 0, 'smaller task', 'smaller tasks')}.`, ['#modal-root [data-act="split-ai"]']); }
  }
}
function splitModalHTML(m) {
  const p = active();
  const { t } = p ? findTask(p, m.mid, m.tid) : {};
  const ai = canAsk();
  const head = `<h2 id="m-title">Split a large task</h2>
    <p class="sub">A large task rarely fits in one Claude Code session. Smaller ones are easier to check, and each can be its own commit.</p>
    <p class="split-from"><span class="lbl">Task</span><b>${esc(oneLine(t ? t.title : m.title) || 'Untitled task')}</b></p>${t && t.notes.trim() ? '<p class="hint">Its notes move to the first smaller task.</p>' : ''}
    ${t && t.status === 'done' ? `<p class="hint" id="sp-warn" tabindex="-1" role="alert">This task is marked done${t.doneAt ? ` (${esc(t.doneAt)})` : ''}. Replacing it puts its work back to do.${m.sure ? ' Choose Replace again to split it anyway.' : ''}</p>` : ''}`;
  if (!t) return `${head}<p class="empty-note">This task is no longer in the plan.</p><div class="modal-actions"><button type="button" class="btn left" data-act="close-modal">Close</button></div>`;
  if (m.mode === 'manual') {
    const n = parseSplitLines(m.text).length;
    return `${head}<div><label class="lbl" for="sp-text">Smaller tasks, one per line</label>
      <textarea class="ta" id="sp-text" rows="6" aria-describedby="sp-hint sp-count" placeholder="Lay out the week grid (S)&#10;Drag a recipe onto a day (M)&#10;Save the week plan (M)">${esc(m.text)}</textarea>
      <p class="hint" id="sp-hint">Start each with a verb, in the order to do them. End a line with (S) or (M) to set its size; the rest are M.</p>
      <p class="hint" id="sp-count" role="status">${splitCountText(n, m.text)}</p></div>
      <div class="modal-actions">
        <button type="button" class="btn left" data-act="close-modal">Cancel</button>
        ${ai ? '<button type="button" class="btn ai" data-act="split-ai">Ask Claude instead</button>' : ''}
        <button type="button" class="btn primary" data-act="split-accept" ${n ? '' : 'disabled'}>${splitBtnText(n)}</button>
      </div>`;
  }
  const s = m.suggest;
  const rows = s ? s.tasks.map((x, i) => `<li><label><input type="checkbox" data-act="split-pick" data-k="${i}" ${s.sel.has(i) ? 'checked' : ''}><span><b>${esc(x.title)}</b><small>Size ${x.size}${x.notes ? `. ${esc(x.notes)}` : ''}</small></span></label></li>`).join('') : '';
  const body = !s ? workingLine('Claude is splitting the task…', 'data-act="stop-split"')
    : rows ? `<section class="proposal" aria-labelledby="sp-h"><h3 id="sp-h" tabindex="-1">Claude suggests, in this order</h3><ul class="prop-list">${rows}</ul>${leftOut(s.dropped)}</section>`
    : `<p class="empty-note">${s.stopped ? 'Stopped.' : s.failed ? 'Claude could not split the task this time.' : s.odd ? SHAPE_MSG.replace(' Try again.', '') : s.dropped ? 'The smaller tasks Claude suggested are already in the plan.' : 'Claude did not suggest a split.'} ${ai ? 'Try again, or write' : 'Write'} the smaller tasks yourself.</p>`;
  return `${head}${body}
    <div class="modal-actions">
      <button type="button" class="btn left" data-act="close-modal">Cancel</button>
      ${s ? `<button type="button" class="btn" data-act="split-manual">${rows ? 'Edit them myself' : 'Write them myself'}</button>
      ${ai ? `<button type="button" class="btn ai" data-act="split-ai">${rows ? 'Ask again' : 'Try again'}</button>` : ''}` : ''}
      ${rows ? `<button type="button" class="btn primary" data-act="split-accept" ${s.sel.size ? '' : 'disabled'}>${splitBtnText(s.sel.size)}</button>` : ''}
    </div>`;
}
function acceptSplit(p) {
  const m = S.modal;
  if (m?.kind !== 'split') return;
  const { m: ms, t } = findTask(p, m.mid, m.tid);
  if (!ms || !t) { closeModal(); toast('That task is no longer in the plan.'); return; }
  if (t.status === 'done' && !m.sure) { m.sure = true; renderModal(); focusFirst(['#sp-warn']); return; } // finished meanwhile, maybe on another device
  const fromClaude = new Map((m.suggest?.tasks || []).map((x) => [oneLine(x.title).toLowerCase(), x]));
  const picked = m.mode === 'manual'
    ? parseSplitLines($('#sp-text')?.value ?? m.text).map((x) => ({ ...x, notes: fromClaude.get(oneLine(x.title).toLowerCase())?.notes || '' }))
    : (m.suggest?.tasks || []).filter((_, i) => m.suggest.sel.has(i));
  if (!picked.length) return;
  const seen = newIds(p);
  const lineage = [t.id, ...str(t.splitFrom).split(' ').filter(Boolean)].slice(0, 5).join(' ');
  const ctx = t.notes.trim() ? `Part of the larger task "${oneLine(t.title) || 'Untitled task'}": do only this part. Its notes, for context:\n${t.notes.trim()}` : '';
  const fresh = picked.map((x) => mkTask({ title: x.title, size: x.size, notes: [x.notes, ctx].filter(Boolean).join('\n'), status: 'todo', feat: t.feat, splitFrom: lineage }, seen));
  const at = ms.tasks.indexOf(t);
  ms.tasks.splice(at, 1, ...fresh);
  S.openNotes.delete(t.id);
  const mid = ms.id;
  S.modal = null; $('#app').inert = false; renderModal();
  if (S.tab === 'plan') S.focusAfter = fid(`milestones.${mid}.tasks.${fresh[0].id}.title`);
  else S.focusSel = ['#next-prompt', '[data-act="tab"][data-k="plan"]'];
  touch(p); renderSheet();
  const snaps = new Map(fresh.map((x) => [x.id, sigOf(x)]));
  toast(`Split into ${fresh.length} ${fresh.length === 1 ? 'task' : 'tasks'}.${p.folder?.plan && t.id in p.folder.plan.tasks ? " The PLAN.md in your project's folder still has the old task: each part's prompt tells Claude Code to swap the parts in." : ''}`, {
    pid: idOf(p),
    restore: (q) => {
      const qm = q.milestones.find((x) => x.id === mid);
      if (!qm || qm.tasks.some((x) => x.id === t.id)) return null;
      const ids = new Set(fresh.map((x) => x.id));
      if (allTasks(q).some((x) => ids.has(x.id) && sigOf(x) !== snaps.get(x.id))) return null; // edited since: leave them
      let i = qm.tasks.findIndex((x) => ids.has(x.id));
      if (i < 0) i = Math.min(at, qm.tasks.length);
      for (let k = qm.tasks.length - 1; k >= 0; k--) if (ids.has(qm.tasks[k].id)) qm.tasks.splice(k, 1);
      qm.tasks.splice(Math.min(i, qm.tasks.length), 0, t);
      return S.tab === 'overview' ? 'next-prompt' : fid(`milestones.${mid}.tasks.${t.id}.title`);
    },
  });
}

/* ---------- plan one feature ---------- */
const featTasks = (p, id) => allTasks(p).filter((t) => t.feat === id);
// a new milestone goes before the starter's closing one ("Ready to share" and the like), otherwise at the end
function closingAt(p) {
  const st = starterOf(p.starter);
  const last = p.milestones[p.milestones.length - 1];
  return st.build && last && p.milestones.length > 1 && last.title === st.build(p.name).last.title ? p.milestones.length - 1 : p.milestones.length;
}
function openFeatPlan(id) {
  const p = active();
  const f = p?.features.find((x) => x.id === id);
  if (!f) return;
  if (!f.title.trim()) { toast('Name the feature first.'); $('#' + fid(`features.${f.id}.title`))?.focus(); return; }
  const linked = featTasks(p, id).at(-1);
  const to = linked ? p.milestones.find((x) => x.tasks.includes(linked))?.id : 'new';
  const m = { kind: 'featplan', id, title: f.title, mode: canAsk() ? 'ai' : 'manual', text: '', suggest: null, busy: null, to: to || 'new' };
  openModal(m);
  if (m.mode === 'ai') aiFeatPlan(m);
}
function openChatPlan(cid) {
  const p = active();
  const x = p?.chat.find((c) => c.id === cid);
  if (!x || !canAsk()) return;
  const m = { kind: 'featplan', cid, title: oneLine(x.q), mode: 'ai', text: '', suggest: null, busy: null, to: nextUp(p)?.m.id || p.milestones.at(-1)?.id || 'new' };
  openModal(m);
  aiFeatPlan(m);
}
async function aiFeatPlan(m) {
  const p = active();
  if (!p || !canAsk() || m.busy) return;
  const f = m.cid ? null : p.features.find((x) => x.id === m.id);
  const c = m.cid ? p.chat.find((x) => x.id === m.cid) : null;
  if (!f && !c) return;
  const ctl = new AbortController();
  m.busy = { ctl };
  m.mode = 'ai';
  m.suggest = null;
  renderModal();
  const have = allTasks(p).filter((t) => t.title.trim()).slice(0, 80).map((t) => `- ${oneLine(t.title)}${t.status === 'done' ? ' (done)' : ''}`);
  const prompt = c ? [
    'Turn the advice in an answer about this project into tasks for Claude Code.', ABOUT, '',
    'Reply with only JSON: {"milestone": string (a short name for these tasks, under 40 characters, used if they go into a new milestone), "fits": string (the exact title of the unfinished milestone listed below that these tasks belong in, or "" if they need a new milestone), "tasks": [{"title": string (starts with a verb, under 80 characters), "size": "S" (under 15 minutes) | "M" (one Claude Code session, 15 to 45 minutes), "notes": string (one or two sentences on what to do and how to check it works)}]}',
    'Give only the concrete work the answer recommends, 1 to 6 tasks in the order to build them. Leave out advice that is not work for Claude Code, and work the plan already has: its tasks are listed below. If the answer recommends no work, reply {"tasks": []}.',
    '', `Question: ${oneLine(c.q)}`, 'Answer:', c.a.slice(0, 8000),
    '', 'Tasks already in the plan:', ...(have.length ? have : ['(none yet)']),
    '', 'Unfinished milestones:', ...(p.milestones.filter((x) => x.tasks.some((t) => t.status !== 'done')).map((x) => `- ${oneLine(x.title) || 'Untitled'}`).slice(0, 20)),
    '', 'Project:', contextOf(p, 20000),
  ].join('\n') : [
    'Plan how to build one feature of this project, as tasks for Claude Code.', ABOUT, '',
    'Reply with only JSON: {"tasks": [{"title": string (starts with a verb, under 80 characters), "size": "S" (under 15 minutes) | "M" (one Claude Code session, 15 to 45 minutes), "notes": string (one or two sentences on what to do and how to check it works)}]}',
    'Give 2 to 6 tasks in the order to build them. Each one leaves the app working and ends with something the owner can see or test. Leave out work the plan already has: its tasks are listed below.',
    '', `Feature: ${oneLine(f.title)}`, `What it does: ${oneLine(f.detail) || '(not described)'}`, `Priority: ${PRIORITIES.find((x) => x.k === f.priority)?.label}`,
    'Tasks already in the plan:', ...(have.length ? have : ['(none yet)']),
    '', 'Project:', contextOf(p, 30000),
  ].join('\n');
  try {
    const r = await S.sample.json(prompt, { signal: ctl.signal, cache: false });
    if (S.modal !== m) return;
    const u = unwrap(r, ['tasks', 'milestone']);
    const all = (coerceMilestones([{ title: 'x', tasks: Array.isArray(u) ? u : arr(u?.tasks) }], active() || p)[0]?.tasks || []).slice(0, 8);
    const [tasks, gone] = newTasksOnly(active() || p, all);
    const name = answerTitle(u?.milestone).slice(0, 60);
    m.suggest = { tasks, dropped: gone, odd: !all.length && oddShape(r), sel: new Set(tasks.map((_, i) => i)), milestone: c ? name : '' };
    if (c && typeof u?.fits === 'string') { // Claude names the unfinished milestone the work belongs in, or "" for a new one
      const hit = (active() || p).milestones.find((x) => u.fits.trim() && titleKey(x.title) === titleKey(u.fits));
      m.to = hit ? hit.id : u.fits.trim() ? m.to : 'new';
    }
  } catch (e) {
    if (S.modal === m) m.suggest = { tasks: [], sel: new Set(), failed: !userStopped(e, ctl), stopped: userStopped(e, ctl) };
    onClaudeError(e, ctl, 'featplan');
  } finally {
    if (S.modal === m) { m.busy = null; renderModal(); claudeListed('#fp-h', `Claude suggests ${many(m.suggest?.tasks.length || 0, 'task', 'tasks')}.`, ['#modal-root [data-act="fp-ai"]']); }
  }
}
const fpBtnText = (n) => `Add ${n} ${n === 1 ? 'task' : 'tasks'}`;
function featPlanModalHTML(m) {
  const p = active();
  const ai = canAsk();
  if (m.cid) return chatPlanModalHTML(m, p, ai);
  const f = p?.features.find((x) => x.id === m.id);
  const head = `<h2 id="m-title">Plan a feature</h2>
    <p class="sub">${m.mode === 'manual' ? 'Write the tasks that build this feature. Keep each one small enough for one Claude Code session.' : 'Claude breaks the feature into tasks that each fit in one Claude Code session.'}</p>
    <p class="split-from"><span class="lbl">Feature</span><b>${esc(oneLine(f ? f.title : m.title) || 'Untitled feature')}</b></p>`;
  if (!f) return `${head}<p class="empty-note">This feature is no longer in the project.</p><div class="modal-actions"><button type="button" class="btn left" data-act="close-modal">Close</button></div>`;
  const to = `<div><label class="lbl" for="fp-to">Add the tasks to</label><select class="in" id="fp-to">
      <option value="new" ${m.to === 'new' ? 'selected' : ''}>A new milestone: ${esc(oneLine(f.title))}</option>
      ${p.milestones.map((x, k) => `<option value="${x.id}" ${x.id === m.to ? 'selected' : ''}>Milestone ${k + 1}: ${esc(oneLine(x.title) || 'Untitled')}</option>`).join('')}</select></div>`;
  if (m.mode === 'manual') {
    const n = parseSplitLines(m.text).length;
    return `${head}<div><label class="lbl" for="fp-text">Tasks, one per line</label>
      <textarea class="ta" id="fp-text" rows="6" aria-describedby="fp-hint fp-count" placeholder="Add the recipe form (S)&#10;Save recipes from a link (M)&#10;Show saved recipes in a list (M)">${esc(m.text)}</textarea>
      <p class="hint" id="fp-hint">Start each with a verb, in the order to build them. End a line with (S) or (M) to set its size; the rest are M.</p>
      <p class="hint" id="fp-count" role="status">${splitCountText(n, m.text)}</p></div>
      ${to}
      <div class="modal-actions">
        <button type="button" class="btn left" data-act="close-modal">Cancel</button>
        ${ai ? '<button type="button" class="btn ai" data-act="fp-ai">Ask Claude instead</button>' : ''}
        <button type="button" class="btn primary" data-act="fp-accept" ${n ? '' : 'disabled'}>${fpBtnText(n)}</button>
      </div>`;
  }
  const s = m.suggest;
  const rows = s ? s.tasks.map((x, i) => `<li><label><input type="checkbox" data-act="fp-pick" data-k="${i}" ${s.sel.has(i) ? 'checked' : ''}><span><b>${esc(x.title)}</b><small>Size ${x.size}${x.notes ? `. ${esc(x.notes)}` : ''}</small></span></label></li>`).join('') : '';
  const body = !s ? workingLine('Claude is planning the feature…', 'data-act="stop-fp"')
    : rows ? `<section class="proposal" aria-labelledby="fp-h"><h3 id="fp-h" tabindex="-1">Claude suggests, in build order</h3><ul class="prop-list">${rows}</ul>${leftOut(s.dropped)}</section>${to}`
    : `<p class="empty-note">${s.stopped ? 'Stopped.' : s.failed ? 'Claude could not plan the feature this time.' : s.odd ? SHAPE_MSG.replace(' Try again.', '') : s.dropped ? 'The tasks Claude suggested are already in the plan.' : 'Claude did not suggest any tasks.'} ${ai ? 'Try again, or write' : 'Write'} the tasks yourself.</p>`;
  return `${head}${body}
    <div class="modal-actions">
      <button type="button" class="btn left" data-act="close-modal">Cancel</button>
      ${s ? `<button type="button" class="btn" data-act="fp-manual">${rows ? 'Edit them myself' : 'Write them myself'}</button>
      ${ai ? `<button type="button" class="btn ai" data-act="fp-ai">${rows ? 'Ask again' : 'Try again'}</button>` : ''}` : ''}
      ${rows ? `<button type="button" class="btn primary" data-act="fp-accept" ${s.sel.size ? '' : 'disabled'}>${fpBtnText(s.sel.size)}</button>` : ''}
    </div>`;
}
// the same dialog, for the tasks in one of Claude's answers
function chatPlanModalHTML(m, p, ai) {
  const c = p?.chat.find((x) => x.id === m.cid);
  const q = oneLine(c ? c.q : m.title);
  const head = `<h2 id="m-title">Turn the answer into tasks</h2>
    <p class="sub">${m.mode === 'manual' ? 'Write the tasks, one per line. Keep each one small enough for one Claude Code session.' : 'Claude picks out the work the answer recommends, as tasks that each fit in one Claude Code session.'}</p>
    <p class="split-from"><span class="lbl">Question</span><b>${esc(q.length > 140 ? q.slice(0, 139).trimEnd() + '…' : q) || 'Untitled'}</b></p>`;
  if (!c) return `${head}<p class="empty-note">This answer is no longer in the project.</p><div class="modal-actions"><button type="button" class="btn left" data-act="close-modal">Close</button></div>`;
  const newName = m.suggest?.milestone || 'Next steps';
  const to = `<div><label class="lbl" for="fp-to">Add the tasks to</label><select class="in" id="fp-to">
      ${p.milestones.map((x, k) => `<option value="${x.id}" ${x.id === m.to ? 'selected' : ''}>Milestone ${k + 1}: ${esc(oneLine(x.title) || 'Untitled')}</option>`).join('')}
      <option value="new" ${m.to === 'new' ? 'selected' : ''}>A new milestone: ${esc(newName)}</option></select></div>`;
  if (m.mode === 'manual') {
    const n = parseSplitLines(m.text).length;
    return `${head}<div><label class="lbl" for="fp-text">Tasks, one per line</label>
      <textarea class="ta" id="fp-text" rows="6" aria-describedby="fp-hint fp-count">${esc(m.text)}</textarea>
      <p class="hint" id="fp-hint">Start each with a verb, in the order to build them. End a line with (S) or (M) to set its size; the rest are M.</p>
      <p class="hint" id="fp-count" role="status">${splitCountText(n, m.text)}</p></div>
      ${to}
      <div class="modal-actions">
        <button type="button" class="btn left" data-act="close-modal">Cancel</button>
        ${ai ? '<button type="button" class="btn ai" data-act="fp-ai">Ask Claude instead</button>' : ''}
        <button type="button" class="btn primary" data-act="fp-accept" ${n ? '' : 'disabled'}>${fpBtnText(n)}</button>
      </div>`;
  }
  const s = m.suggest;
  const rows = s ? s.tasks.map((x, i) => `<li><label><input type="checkbox" data-act="fp-pick" data-k="${i}" ${s.sel.has(i) ? 'checked' : ''}><span><b>${esc(x.title)}</b><small>Size ${x.size}${x.notes ? `. ${esc(x.notes)}` : ''}</small></span></label></li>`).join('') : '';
  const body = !s ? workingLine('Claude is reading the answer…', 'data-act="stop-fp"')
    : rows ? `<section class="proposal" aria-labelledby="fp-h"><h3 id="fp-h" tabindex="-1">Claude suggests, in build order</h3><ul class="prop-list">${rows}</ul>${leftOut(s.dropped)}</section>${to}`
    : `<p class="empty-note" role="status">${s.stopped ? 'Stopped.' : s.failed ? 'Claude could not read the answer this time.' : s.odd ? SHAPE_MSG.replace(' Try again.', '') : s.dropped ? 'The work in this answer is already in the plan.' : 'Claude found no work for Claude Code in this answer.'} ${ai ? 'Try again, or write' : 'Write'} the tasks yourself.</p>`;
  return `${head}${body}
    <div class="modal-actions">
      <button type="button" class="btn left" data-act="close-modal">Cancel</button>
      ${s ? `<button type="button" class="btn" data-act="fp-manual">${rows ? 'Edit them myself' : 'Write them myself'}</button>
      ${ai ? `<button type="button" class="btn ai" data-act="fp-ai">${rows ? 'Ask again' : 'Try again'}</button>` : ''}` : ''}
      ${rows ? `<button type="button" class="btn primary" data-act="fp-accept" ${s.sel.size ? '' : 'disabled'}>${fpBtnText(s.sel.size)}</button>` : ''}
    </div>`;
}
function acceptFeatPlan(p) {
  const m = S.modal;
  if (m?.kind !== 'featplan') return;
  const f = m.cid ? null : p.features.find((x) => x.id === m.id);
  const c = m.cid ? p.chat.find((x) => x.id === m.cid) : null;
  if (!f && !c) { closeModal(); toast(m.cid ? 'That answer is no longer in the project.' : 'That feature is no longer in the project.'); return; }
  const back = f ? fid(`features.${f.id}.plan`) : fid(`chat.${c.id}.tasks`);
  const fromClaude = new Map((m.suggest?.tasks || []).map((x) => [oneLine(x.title).toLowerCase(), x]));
  const picked = m.mode === 'manual'
    ? parseSplitLines($('#fp-text')?.value ?? m.text).map((x) => ({ ...x, notes: fromClaude.get(oneLine(x.title).toLowerCase())?.notes || '' }))
    : (m.suggest?.tasks || []).filter((_, i) => m.suggest.sel.has(i));
  if (!picked.length) return;
  const seen = newIds(p);
  const fresh = picked.map((x) => mkTask({ title: x.title, size: x.size, notes: x.notes, status: 'todo', feat: f ? f.id : '' }, seen));
  const want = $('#fp-to')?.value || m.to;
  let ms = want !== 'new' && p.milestones.find((x) => x.id === want);
  let made = null;
  if (!ms) { ms = made = mkMilestone(f ? { title: oneLine(f.title) } : { title: m.suggest?.milestone || 'Next steps' }, seen); p.milestones.splice(closingAt(p), 0, ms); }
  ms.tasks.push(...fresh);
  S.modal = null; $('#app').inert = false; renderModal();
  S.focusAfter = back;
  S.focusSel = f ? ['#' + fid(`features.${f.id}.title`), '.guide [aria-current="step"] .btn', '#guide-h'] : ['#ask-q'];
  touch(p); renderSheet();
  const n = fresh.length;
  const snaps = new Map(fresh.map((x) => [x.id, sigOf(x)]));
  toast(`Added ${n} ${n === 1 ? 'task' : 'tasks'} to Milestone ${msIndex(p, ms)}: ${oneLine(ms.title) || 'Untitled'}.`, {
    pid: idOf(p),
    restore: (q) => {
      const ids = new Set(fresh.map((x) => x.id));
      if (allTasks(q).some((x) => ids.has(x.id) && sigOf(x) !== snaps.get(x.id))) return null; // edited since: leave them
      let any = false;
      q.milestones.forEach((x) => { for (let k = x.tasks.length - 1; k >= 0; k--) if (ids.has(x.tasks[k].id)) { x.tasks.splice(k, 1); any = true; } });
      if (made) { const k = q.milestones.findIndex((x) => x.id === made.id); if (k >= 0 && !q.milestones[k].tasks.length) q.milestones.splice(k, 1); }
      return any ? back : null;
    },
  });
}

// "Look back" on a finished milestone: the recap, and rules Claude suggests from what went wrong
const rtBtnText = (n) => `Add ${n} ${n === 1 ? 'rule' : 'rules'}`;
function retroModalHTML(m) {
  const p = active();
  const ms = p?.milestones.find((x) => x.id === m.mid);
  if (!ms) return '<h2 id="m-title">Look back</h2><p class="empty-note">This milestone is no longer in the project.</p><div class="modal-actions"><button type="button" class="btn left" data-act="close-modal">Close</button></div>';
  const r = milestoneRecap(p, ms);
  const open = r.wrong.filter((w) => !w.rule);
  const ai = canAsk() && open.length > 0;
  const s = m.suggest;
  const rows = s ? s.rules.map((x, k) => `<li><label><input type="checkbox" data-act="rt-pick" data-k="${k}" ${s.sel.has(k) ? 'checked' : ''}><span><b>${esc(x.rule)}</b>${x.why ? `<small>${esc(x.why)}</small>` : ''}</span></label></li>`).join('') : '';
  const claude = !ai ? '' : m.busy ? workingLine('Claude is reading what went wrong…', 'data-act="stop-rt"')
    : !s ? '' : rows ? `<section class="proposal" aria-labelledby="rt-h"><h3 id="rt-h" tabindex="-1">Rules Claude suggests for CLAUDE.md</h3><ul class="prop-list">${rows}</ul></section>`
    : `<p class="empty-note" role="status">${s.stopped ? 'Stopped.' : s.failed ? 'Claude could not suggest rules this time.' : 'Claude found no rule that would prevent these problems: they look like one-offs.'}</p>`;
  const wrongList = r.wrong.map((w) => `<li><span class="rt-when">${esc([w.date && dayLabel(w.date), w.task].filter(Boolean).join(', ') || 'A session')}:</span> ${esc(sentence(w.text))}${w.rule ? `<small class="rt-rule">Rule since: ${esc(w.rule)}</small>` : ''}</li>`).join('');
  return `<h2 id="m-title" tabindex="-1" data-autofocus>Look back</h2>
    <p class="split-from"><span class="lbl">Milestone ${p.milestones.indexOf(ms) + 1}</span><b>${esc(oneLine(ms.title) || 'Untitled')}</b></p>
    <div class="rt-recap" id="rt-recap" data-copy-name="recap">
      <p>${esc(recapLine(r))}</p>
      ${r.wrong.length ? `<h3>What went wrong</h3><ul class="rt-list">${wrongList}</ul>
        ${open.length ? `<p class="hint">${ai ? 'Claude can suggest rules for CLAUDE.md so these do not happen again.' : 'A rule in CLAUDE.md stops a problem coming back: add one from its lesson on the Improve tab.'}</p>` : '<p class="hint">Each of these has a rule in CLAUDE.md now.</p>'}`
      : `<p class="hint">${r.sessions ? 'Nothing went wrong in its sessions, or nothing was noted.' : 'No sessions were logged for it. Log sessions as you work, and the next look back can say what went wrong.'}</p>`}
    </div>
    ${claude}
    <div class="modal-actions">
      <button type="button" class="btn left" data-act="close-modal">Close</button>
      <button type="button" class="btn" data-act="rt-copy">Copy recap</button>
      ${ai && !m.busy ? (rows ? `<button type="button" class="btn ai" data-act="rt-ai">Ask again</button><button type="button" class="btn primary" data-act="rt-accept" ${s.sel.size ? '' : 'disabled'}>${rtBtnText(s.sel.size)}</button>`
        : `<button type="button" class="btn ai" data-act="rt-ai">${s ? 'Try again' : 'Suggest rules with Claude'}</button>`) : ''}
    </div>`;
}
async function aiRetro(m) {
  const p = active();
  const ms = p?.milestones.find((x) => x.id === m.mid);
  if (!ms || !canAsk() || m.busy) return;
  const open = milestoneRecap(p, ms).wrong.filter((w) => !w.rule);
  if (!open.length) return;
  const ctl = new AbortController();
  m.busy = { ctl };
  m.suggest = null;
  renderModal();
  const clip = (x, n) => (x.length > n ? x.slice(0, n - 1).trimEnd() + '…' : x);
  const have = lines(p.conventions).map(ruleText).filter(Boolean).slice(0, 60);
  const prompt = [
    'Suggest rules for CLAUDE.md from what went wrong while one milestone of this project was built.', ABOUT, '',
    'Reply with only JSON: {"rules": [{"rule": string (one instruction for Claude Code, starting with a verb, under 120 characters), "why": string (one short sentence on the problem it prevents), "fixes": [number] (the numbers of the problems below it prevents)}]}',
    'Give 0 to 3 rules. Each one must stop a problem below from coming back in later sessions. Leave out one-off problems that no rule would prevent, and rules CLAUDE.md already has (listed below). If nothing calls for a rule, reply {"rules": []}.',
    '', `Milestone: ${oneLine(ms.title) || 'Untitled'}`,
    'Where a problem has my draft rule, keep what it asks for and make it a clear rule.',
    'What went wrong in its sessions:', ...open.map((w, i) => { const d = p.lessons.find((l) => l.id === w.lesson && !l.promoted)?.change.trim(); return `${i + 1}. ${w.date || 'Undated'}, ${w.task || 'a session'}: ${clip(w.text, 400)}${d ? ` (my draft rule: ${clip(oneLine(d), 200)})` : ''}`; }),
    '', 'Rules CLAUDE.md already has:', ...(have.length ? have.map((x) => `- ${x}`) : ['(none yet)']),
    '', 'Project:', contextOf(p, 8000),
  ].join('\n');
  try {
    const out = await S.sample.json(prompt, { signal: ctl.signal, cache: false });
    if (S.modal !== m) return;
    const seen = new Set();
    const rules = arr(Array.isArray(out) ? out : out?.rules).map((x) => ({
      rule: ruleText(str(x?.rule)).slice(0, 200),
      why: oneLine(str(x?.why)).slice(0, 300),
      fixes: [...new Set(arr(x?.fixes).map(Number).filter((k) => Number.isInteger(k) && k >= 1 && k <= open.length))].map((k) => open[k - 1]),
    })).filter((x) => x.rule && !hasRule(p, x.rule) && !seen.has(x.rule.toLowerCase()) && seen.add(x.rule.toLowerCase())).slice(0, 3);
    m.suggest = { rules, sel: new Set(rules.map((_, k) => k)) };
  } catch (e) {
    if (S.modal === m) m.suggest = { rules: [], sel: new Set(), failed: !userStopped(e, ctl), stopped: userStopped(e, ctl) };
    onClaudeError(e, ctl, 'retro');
  } finally {
    if (S.modal === m) { m.busy = null; renderModal(); claudeListed('#rt-h', `Claude suggests ${many(m.suggest?.rules.length || 0, 'rule', 'rules')}.`, ['#modal-root [data-act="rt-ai"]', '#modal-root [data-act="rt-copy"]']); }
  }
}
// each rule goes into the conventions (and an edited CLAUDE.md), and onto the lesson of a problem it fixes, or a new lesson
function acceptRetro(p) {
  const m = S.modal;
  const ms = p.milestones.find((x) => x.id === m?.mid);
  const s = m?.suggest;
  if (!ms || !s) return;
  const picked = s.rules.filter((_, k) => s.sel.has(k)).filter((x) => !hasRule(p, x.rule));
  const before = { conventions: p.conventions, claudeMd: p.claudeMd };
  const changed = []; // [lesson id, its fields before]
  const made = [];
  const seen = newIds(p);
  const n = p.milestones.indexOf(ms) + 1;
  for (const x of picked) {
    appendRule(p, x.rule);
    let put = 0;
    for (const w of x.fixes) { // the lesson of each problem it fixes gets the rule; a problem without one gets a lesson
      const l = p.lessons.find((y) => y.id === w.lesson);
      if (l?.promoted) continue;
      if (l) {
        changed.push([l.id, { change: l.change, promoted: l.promoted, rule: l.rule }]);
        Object.assign(l, { change: x.rule, promoted: true, rule: ruleText(x.rule) });
      } else {
        const nl = mkLesson({ date: w.date || today(), happened: w.text, change: x.rule, promoted: true, rule: ruleText(x.rule), sid: w.sid }, seen);
        p.lessons.unshift(nl);
        made.push(nl.id);
      }
      put++;
    }
    if (!put) {
      const nl = mkLesson({ happened: x.why || `Looking back on Milestone ${n}`, change: x.rule, promoted: true, rule: ruleText(x.rule) }, seen);
      p.lessons.unshift(nl);
      made.push(nl.id);
    }
  }
  const after = { conventions: p.conventions, claudeMd: p.claudeMd };
  touch(p); closeModal(); renderAll();
  if (!picked.length) { toast('Those rules are already in Rules for Claude Code.'); return; }
  const back = fid(`milestones.${ms.id}.retro`);
  toast(`Added ${plural(picked.length, 'rule', 'rules')} to Rules for Claude Code${p.claudeMdEdited ? ' and CLAUDE.md' : ''}, with ${picked.length === 1 ? 'its lesson' : 'their lessons'} on Improve. ${seesNew(picked.length === 1 ? 'it' : 'them', p)}`, {
    pid: idOf(p),
    restore: (q) => {
      if (q.conventions !== after.conventions || q.claudeMd !== after.claudeMd) return null; // edited since: leave it alone
      q.conventions = before.conventions; q.claudeMd = before.claudeMd;
      q.lessons = q.lessons.filter((x) => !made.includes(x.id));
      for (const [id, was] of changed) { const l = q.lessons.find((x) => x.id === id); if (l) Object.assign(l, was); }
      return back;
    },
  });
}

// "Start Claude Code": install it, make the project's folder and start it there, for someone who has not used it yet.
// Install lines as on code.claude.com/docs/en/setup, checked 2026-10-14.
const CC_INSTALL = [
  { k: 'unix', label: 'Mac or Linux', cmd: 'curl -fsSL https://claude.ai/install.sh | bash' },
  { k: 'ps', label: 'Windows PowerShell', cmd: 'irm https://claude.ai/install.ps1 | iex' },
];
function ccCommands(p) {
  const dir = slug(p?.name || 'my-project');
  return { unix: CC_INSTALL[0].cmd, ps: CC_INSTALL[1].cmd, folder: `mkdir ${dir}\ncd ${dir}`, start: 'claude', dir };
}
function setupModalHTML(m) {
  const p = active();
  const c = ccCommands(p);
  const there = m.back?.kind === 'new' || !!p?.fromCode; // the code exists, so go to its folder rather than make one
  const give = m.back?.kind === 'new' ? `Paste the prompt you came from. Claude Code reads the project and writes ${SURVEY_FILE} for Shipyard to import.`
    : m.back?.kind === 'prompt' ? 'Go back to your prompt and paste it into Claude Code. It relies on CLAUDE.md, so if the folder has none yet, first paste the setup prompt from the Project files tab, which saves every file.'
    : m.back?.kind === 'export' ? 'Go back to the setup prompt and paste it into Claude Code. When it has saved the files, restart Claude Code (type /exit, then claude) so it loads them. Then paste the task prompt from Next up.'
    : p?.fromCode ? 'On the Project files tab, Get the setup prompt adds CLAUDE.md, PLAN.md and the .claude files, merging into any that are already there: paste it into Claude Code, then restart it (type /exit, then claude) so it loads them. Then paste the task prompt from Next up.'
    : 'On the Project files tab, Get the setup prompt saves CLAUDE.md, PLAN.md and the .claude files in one go: paste it into Claude Code, then restart it (type /exit, then claude) so it loads them. Then paste the task prompt from Next up.';
  const win = /Windows/i.test(navigator.userAgent || '');
  const cmd = (k, text, label) => `<div class="cc-cmd"><pre class="cc-code" id="cc-${k}" data-copy-name="command"><code>${esc(text).replace(/(\/\/?)(?=\w)/g, '$1<wbr>')}</code></pre><button type="button" class="btn sm" data-act="copy-cmd" data-k="${k}" aria-label="Copy ${esc(label)}">Copy</button></div>`;
  const installs = (win ? [...CC_INSTALL].reverse() : CC_INSTALL).map((x) => `<p class="cc-for">${esc(x.label)}</p>${cmd(x.k, x.cmd, `the install command for ${x.label}`)}`).join('');
  const link = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
  const needs = p ? prereqs(p) : [];
  const accounts = starterAccounts(p);
  const none = !p && !m.back; // from the welcome page: there is no project, so no folder name, yet
  return `<h2 id="m-title" tabindex="-1" data-autofocus>Start Claude Code</h2>
    <p class="sub">Claude Code works in a terminal, inside your project's folder. ${none ? 'Install it once, now. The folder comes later, with a project.' : there ? 'Step 1 is once only; after that, every session starts at step 2.' : 'Steps 1 and 2 are once only; after that, every session starts at step 3.'}</p>
    <ol class="cc-steps">
      <li><h3>Install it</h3>
        <p>Open a terminal (Terminal on a Mac, PowerShell on Windows) and run the line for your computer. Then open a new terminal and run <code>claude --version</code> to check it worked.</p>
        ${installs}
        ${needs.length ? `<p class="cc-for">This project also needs</p><ul class="cc-needs">${needs.map((x) => `<li><b>${link(x.url, esc(x.name))}</b>${x.what ? ` (${esc(x.what)})` : ''}. To check it is there, run <code>${esc(x.check)}</code>${x.win ? ` (on Windows, <code>${esc(x.win)}</code>)` : ''}: it prints a version number.</li>`).join('')}</ul>` : ''}
        ${accounts.length ? `<p class="cc-for">Accounts it uses</p><ul class="cc-needs cc-accounts">${accounts.map((x) => `<li><b>${link(x.url, esc(x.name))}</b> (${esc(x.what)}).</li>`).join('')}</ul>` : ''}
        <p class="hint">It needs a paid Claude plan (Pro, Max, Team or Enterprise) or a Claude Console account; the free plan does not include it. Rather not use a terminal? The ${link('https://code.claude.com/docs/en/desktop-quickstart', 'Claude desktop app')} runs Claude Code too.</p></li>
      ${none ? '' : there ? `<li><h3>Go to the project's folder</h3>
        <p>Type <code>cd</code> and a space, then drag the project's folder from Finder or File Explorer into the terminal and press Enter. Or type the folder's path after <code>cd</code>.</p></li>` : `<li><h3>Make the project's folder</h3>
        <p>This makes a folder called <code>${esc(c.dir)}</code> where the terminal is (usually your home folder) and moves into it. Already made a folder for this project, or the code already exists? Move into that folder with <code>cd</code> instead, and use its name wherever this says <code>${esc(c.dir)}</code>.</p>
        ${cmd('folder', c.folder, 'the commands that make the folder')}</li>`}
      ${none ? '' : `<li><h3>Start Claude Code there</h3>
        <p>The first time, it opens your browser to log in. ${there ? 'Next time, open a terminal and go to the folder the same way, then run this.' : `Next time, open a terminal, run <code>cd ${esc(c.dir)}</code>, then this.`}</p>
        ${cmd('start', c.start, 'the command that starts Claude Code')}
        <p class="hint">Learning as you go? Type <code>/output-style explanatory</code> in Claude Code, and it adds short notes on why it wrote the code that way.</p></li>
      <li><h3>Give it the project</h3>
        <p>${give}</p></li>`}
    </ol>
    ${none ? '<p class="cc-later">Once you start a project, <b>New to Claude Code?</b> in its Getting started steps shows how to make its folder and start Claude Code there.</p>' : ''}
    <p class="hint">New to terminals? The ${link('https://code.claude.com/docs/en/terminal-guide', 'terminal guide')} shows how to open one and paste a command. Stuck? See the ${link('https://code.claude.com/docs/en/setup', 'full setup guide')}.</p>
    <div class="modal-actions">
      <button type="button" class="btn left" data-act="close-modal">Close</button>
      ${m.back ? '<button type="button" class="btn primary" data-act="cc-back">Back to the prompt</button>' : p ? '<button type="button" class="btn primary" data-act="cc-files">Open Project files</button>' : ''}
    </div>`;
}

// fills how it went and what went wrong from the report lines in a pasted summary, without overriding what the owner chose or typed
const SS_HINT = 'If it ends with "Outcome:" and "Went wrong:" lines, as Shipyard\'s prompts ask, they fill in the rest. In Claude Code, /copy copies its last reply.';
const looksPasted = (t) => str(t).trim().length >= 120 || /\n\s*\S/.test(str(t).trim());
function fillFromReport(m) {
  const r = sessionReport(m.summary);
  const said = [];
  let ask = false;
  if (!m.outcomeSet) {
    ask = !r.outcome && looksPasted(m.summary);
    const want = r.outcome || (ask ? '' : 'done');
    if (m.outcome !== want) {
      m.outcome = want;
      document.querySelectorAll('#modal-root input[name="ss-outcome"]').forEach((x) => { x.checked = x.value === want; });
    }
    if (r.outcome) said.push(`how it went (${OUTCOMES.find((o) => o.k === r.outcome).short.toLowerCase()})`);
  }
  if (!m.wrong.trim() || m.wrongAuto) {
    m.wrong = r.wrong; m.wrongAuto = !!r.wrong;
    const w = $('#ss-wrong'); if (w && w.value !== r.wrong) w.value = r.wrong;
    if (r.wrong) said.push('what went wrong');
  }
  m.autoNote = ask ? `${r.unread ? `The "Outcome:" line says "${clipText(r.unread, 60, '…')}", which does not say done, partly done or stuck` : 'There is no "Outcome:" line in it'}, so choose how it went above.${said.length ? ` Filled in ${said.join(' and ')}.` : ''}`
    : said.length ? `Filled in from the summary: ${said.join(' and ')}. Change them if they are not right.` : '';
  const n = $('#ss-auto'); if (n) n.textContent = m.autoNote || SS_HINT;
}
function sessionModalHTML(m) {
  const p = active();
  const ai = canAsk();
  // a long plan: finished milestones stay out of the list until asked for, unless the session's task is in one
  const withTasks = p ? p.milestones.filter((x) => x.tasks.length) : [];
  const chosen = !m.other && !m.bid ? m.tid : '';
  let tuck = m.showDone || withTasks.reduce((n, x) => n + x.tasks.length, 0) <= SS_FOLD_AT ? [] : withTasks.filter((x) => x.tasks.every((t) => t.status === 'done') && !x.tasks.some((t) => t.id === chosen));
  if (tuck.length === withTasks.length) tuck = [];
  const tucked = tuck.reduce((n, x) => n + x.tasks.length, 0);
  const opts = withTasks.filter((x) => !tuck.includes(x)).map((x, i) => `<optgroup label="${esc(`Milestone ${p.milestones.indexOf(x) + 1}: ${x.title || 'Untitled'}`)}">${x.tasks.map((t) => `<option value="${x.id}:${t.id}" ${t.id === m.tid && !m.other && !m.bid ? 'selected' : ''}>${esc(t.title || 'Untitled task')}${t.status === 'done' ? ' (done)' : t.status === 'doing' ? ' (in progress)' : ''}</option>`).join('')}</optgroup>`).join('');
  if (m.step === 'suggest') {
    const s = m.suggest;
    const rows = s ? [
      ...s.tasks.map((t, i) => `<li><label><input type="checkbox" data-act="session-pick" data-k="t${i}" ${s.sel.has('t' + i) ? 'checked' : ''}><span><b>${esc(t.title)}</b><small>Task, size ${t.size}. ${esc(t.notes)}</small></span></label></li>`),
      ...(s.rule ? [`<li><label><input type="checkbox" data-act="session-pick" data-k="rule" ${s.sel.has('rule') ? 'checked' : ''}><span><b>${esc(s.rule)}</b><small>Rule for CLAUDE.md</small></span></label></li>`] : []),
    ].join('') : '';
    return `<h2 id="m-title">Session logged</h2>
      <p class="sub">${esc(m.savedNote || '')}</p>
      ${m.busy ? workingLine('Claude is reading the session…', 'data-act="stop-followups"')
        : s && rows ? `<section class="proposal" aria-labelledby="fu-h"><h3 id="fu-h" tabindex="-1">Claude suggests</h3><ul class="prop-list">${rows}</ul>${leftOut(s.dropped)}</section>`
        : `<p class="empty-note">${s?.stopped ? 'Stopped. The session is saved.' : s?.failed ? 'Claude could not suggest follow-ups this time. The session is saved.' : s?.odd ? `${SHAPE_MSG.replace(' Try again.', '')} The session is saved.` : s?.dropped ? 'What Claude suggested is already in the plan. The session is saved.' : 'Claude found nothing left to do after this session.'}</p>`}
      <div class="modal-actions">
        <button type="button" class="btn left" data-act="close-modal" ${m.busy ? 'disabled' : ''}>${s && rows ? 'Skip' : 'Close'}</button>
        ${s && rows && !m.busy ? `<button type="button" class="btn primary" data-act="session-accept" ${s.sel.size ? '' : 'disabled'}>${fuBtnText(s.sel)}</button>` : ''}
      </div>`;
  }
  const bugs = p ? [...openBugs(p), ...p.bugs.filter((b) => b.id === m.bid && b.status !== 'open')] : [];
  const bugOpts = bugs.length ? `<optgroup label="Bugs">${bugs.map((b) => `<option value="bug:${b.id}" ${b.id === m.bid && !m.other ? 'selected' : ''}>Fix: ${esc(oneLine(b.title) || 'Untitled bug')}${b.status === 'fixed' ? ' (fixed)' : ''}</option>`).join('')}</optgroup>` : '';
  const other = m.other || !(opts || bugOpts);
  return `<h2 id="m-title">Log a session</h2>
    <p class="sub" id="m-sub">${esc(sessionSub(m, p, other))}</p>
    ${altHTML(m, p)}
    <div><label class="lbl" for="ss-task">${bugOpts ? 'Task or bug' : 'Task'}</label><select class="in" id="ss-task"${errAttrs(m, 'ss-task')}>${m.pick ? '<option value="" selected disabled>Choose the task or bug</option>' : ''}${opts}${bugOpts}<option value="other" ${other ? 'selected' : ''}>Something else, not a task in the plan</option></select>${fieldError(m, 'ss-task')}${tucked ? `<p class="hint ss-more"><button type="button" class="linkish" data-act="ss-show-done">Show the ${tucked === 1 ? 'task' : `${tucked} tasks`} of finished milestones</button></p>` : ''}</div>
    ${other ? `<div><label class="lbl" for="ss-what">What did you ask Claude Code to do?</label><input class="in" id="ss-what" autocomplete="off" placeholder="For example: Find bugs" value="${esc(m.what || '')}"${errAttrs(m, 'ss-what')}>${fieldError(m, 'ss-what')}</div>` : ''}
    <div class="ss-when"><label class="lbl" for="ss-date">Day of the session</label><input type="date" class="in" id="ss-date" value="${esc(realDay(m.date) ? m.date : today())}" max="${today()}"></div>
    <fieldset class="starters"><legend class="lbl">How did it go?</legend>
      <div class="choice-row">${OUTCOMES.map((o) => `<label class="starter"><input type="radio" name="ss-outcome" value="${o.k}" ${o.k === m.outcome ? 'checked' : ''}${errAttrs(m, 'ss-outcome')}><span><b>${esc(o.label)}</b></span></label>`).join('')}</div>${fieldError(m, 'ss-outcome')}</fieldset>
    <div><label class="lbl" for="ss-summary">What Claude Code said (optional)</label><textarea class="ta" id="ss-summary" rows="4" placeholder="Paste the summary Claude wrote at the end of the session" aria-describedby="ss-auto">${esc(m.summary)}</textarea>
      <p class="hint" id="ss-auto" role="status">${esc(m.autoNote || SS_HINT)}</p></div>
    <div><label class="lbl" for="ss-wrong">Anything that went wrong? (optional)</label><textarea class="ta" id="ss-wrong" rows="2" placeholder="For example: it changed files I did not ask about">${esc(m.wrong)}</textarea></div>
    <div><label class="lbl" for="ss-rule">Rule for Claude Code (optional)</label><textarea class="ta" id="ss-rule" rows="2" placeholder="For example: Only change the files the task names">${esc(m.rule)}</textarea></div>
    <div class="modal-actions">
      <button type="button" class="btn left" data-act="close-modal">Cancel</button>
      <button type="button" class="btn${ai ? '' : ' primary'}" data-act="save-session">Save</button>
      ${ai ? '<button type="button" class="btn primary" data-act="save-session-ai">Save and ask Claude what is next</button>' : ''}
    </div>`;
}
// Log a session on Next up, when the prompt copied last was for something else: why, and the Next up task one click away
function altHTML(m, p) {
  const t = m.alt && p ? findTask(p, m.alt.mid, m.alt.tid).t : null;
  if (!t) return '';
  const why = { bug: 'Its fix prompt is the one you copied last.', what: 'It is the prompt you copied last.', task: 'Its prompt is the one you copied last.' }[m.alt.why];
  return `<p class="hint ss-alt" id="ss-alt">${why} <button type="button" class="linkish" data-act="ss-alt">Log it for "${esc(oneLine(t.title) || 'Untitled task')}" instead</button></p>`;
}
// the session dialog's sub line names the task or bug the session will be filed under, so nobody saves it blind
function sessionSub(m, p, other = m.other) {
  const t = !other && !m.bid && m.tid && p ? findTask(p, m.mid, m.tid).t : null;
  const bug = !other && m.bid && p ? p.bugs.find((x) => x.id === m.bid) : null;
  if (m.pick && !other) return 'Back from Claude Code? Choose what the session was about, then note how it went. Anything that went wrong becomes a lesson on the Improve tab.';
  if (bug) return `Back from Claude Code? Note how the fix for "${oneLine(bug.title) || 'Untitled bug'}" went. Done marks the bug fixed, and anything that went wrong becomes a lesson on the Improve tab.`;
  if (t) return `Back from Claude Code? Note how "${oneLine(t.title) || 'Untitled task'}" went. Shipyard updates the task, and anything that went wrong becomes a lesson on the Improve tab.`;
  return 'Back from Claude Code? Note how it went. Anything that went wrong becomes a lesson on the Improve tab.';
}
// what was typed in Log a session is kept when it closes unsaved, and comes back for the same task or bug
const ssKind = (m) => (m.other ? 'other' : m.bid ? 'bug' : 'task');
const ssKey = (m) => `${S.activeId}|${m.other ? 'other' : m.bid ? 'bug:' + m.bid : m.tid}`;
const SS_FOLD_AT = 25; // more tasks than this and Log a session leaves finished milestones out of its list
const SS_DRAFT = ['summary', 'wrong', 'rule', 'what', 'outcome', 'outcomeSet', 'wrongAuto', 'date'];
const ssTyped = (m) => ['summary', 'wrong', 'rule'].some((k) => str(m[k]).trim()) || (m.other && !!str(m.what).trim());
function keepDraft(m) {
  if (m.saved || m.step === 'suggest') return;
  if (ssTyped(m)) S.ssDraft = { key: ssKey(m), ...Object.fromEntries(SS_DRAFT.map((k) => [k, m[k]])) };
  else if (S.ssDraft?.key === ssKey(m)) S.ssDraft = null;
}
function restoreDraft(m) {
  const d = S.ssDraft;
  if (!d || d.key !== ssKey(m) || ['summary', 'wrong', 'rule'].some((k) => str(m[k]).trim())) return false;
  SS_DRAFT.forEach((k) => { if (d[k] !== undefined) m[k] = d[k]; });
  m.autoNote = 'What you typed before is back.';
  return true;
}
// near: the task the button sits with (Next up), used when no prompt was copied since, and offered when one was
function openSession(mid, tid, what, bid, near) {
  const p = active();
  const prev = S.modal;
  // with nothing named: the task, bug or ready-made prompt whose prompt was copied last, or the one task in progress. Otherwise the
  // owner picks, so a session is never put on a task or bug by guesswork (done would mark it done or fixed)
  if (p && !mid && !tid && !what && !bid) {
    const lp = S.lastPrompt?.pid === S.activeId ? S.lastPrompt : null;
    const lt = lp?.tid ? findTask(p, lp.mid, lp.tid).t : null;
    const doing = allTasks(p).filter((t) => t.status === 'doing');
    if (lp?.bid && p.bugs.some((x) => x.id === lp.bid && x.status === 'open')) bid = lp.bid;
    else if (lt && lt.status !== 'done') { mid = lp.mid; tid = lp.tid; }
    else if (lp?.what) what = lp.what; // a ready-made or saved prompt was copied last
    else if (near && findTask(p, near.mid, near.tid).t) { mid = near.mid; tid = near.tid; }
    else if (doing.length === 1) { tid = doing[0].id; mid = p.milestones.find((x) => x.tasks.includes(doing[0])).id; }
  }
  const alt = near && p && (bid || what || tid !== near.tid) && findTask(p, near.mid, near.tid).t ? { ...near, why: bid ? 'bug' : what ? 'what' : 'task' } : null;
  const bug = p && bid ? p.bugs.find((x) => x.id === bid) : null;
  const pick = !!p && !bug && !what && !(mid && tid) && (allTasks(p).length > 0 || openBugs(p).length > 0);
  const m = { kind: 'session', mid: bug || pick ? '' : mid || '', tid: bug || pick ? '' : tid || '', bid: bug ? bug.id : '', pick, outcome: 'done', summary: '', wrong: '', rule: '', other: !!what && !bug, what: bug ? '' : what || '' };
  if (!m.tid && !m.bid && !pick) m.other = true;
  if (alt && !pick) m.alt = alt;
  restoreDraft(m);
  if (prev) { // replaces the prompt dialog; focus later returns to what opened that one
    if (prev.busy) prev.busy.ctl.abort();
    m.opener = prev.opener; m.openerEl = prev.openerEl;
    S.modal = m; renderModal();
  } else openModal(m);
  focusFirst(['#modal-root input[name="ss-outcome"]:checked', '#ss-task']);
}
// sessions keep their full text until a project nears what the store takes. Then the oldest notes are shortened. Only
// if the project is still about to be too large to save do the oldest sessions go, and only when that is enough to bring
// it under the line. The latest 10 are never touched. Returns what changed, with the sessions as they were, or null.
const SESSIONS_FULL = 10;
const TRIM_AT = MAX_BYTES * 0.8;
const DROP_AT = MAX_BYTES * 0.95;
const sizeOf = (x) => new Blob([JSON.stringify(x)]).size;
function trimSessions(p) {
  let size = sizeOf(p);
  if (size <= TRIM_AT) return null;
  const before = clone(p.sessions);
  const cut = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);
  let short = 0;
  for (const x of p.sessions.slice(0, -SESSIONS_FULL)) {
    if (size <= TRIM_AT) break;
    const s = cut(x.summary, 500);
    const w = cut(x.wrong, 200);
    if (s === x.summary && w === x.wrong) continue;
    size -= sizeOf(x.summary) + sizeOf(x.wrong) - sizeOf(s) - sizeOf(w);
    x.summary = s; x.wrong = w; short++;
  }
  let dropped = 0;
  if (size > DROP_AT && size - sizeOf(p.sessions.slice(0, -SESSIONS_FULL)) <= DROP_AT) {
    while (size > DROP_AT && p.sessions.length > SESSIONS_FULL) { size -= sizeOf(p.sessions.shift()) + 1; dropped++; }
  }
  return short || dropped ? { short, dropped, before } : null;
}
const trimNote = (tr) => (!tr ? '' : `To keep the project small enough to save, ${[
  tr.short ? `the notes of ${tr.short === 1 ? 'the oldest session were' : `the ${tr.short} oldest sessions were`} shortened` : '',
  tr.dropped ? `${tr.dropped === 1 ? 'the oldest session was' : `the ${tr.dropped} oldest sessions were`} removed` : '',
].filter(Boolean).join(' and ')}.`);
function saveSession(withAI) {
  const m = S.modal;
  const p = active();
  if (!m || !p) return;
  const val = str($('#ss-task')?.value || (m.other ? 'other' : m.bid ? `bug:${m.bid}` : `${m.mid}:${m.tid}`));
  Object.assign(m, { summary: $('#ss-summary')?.value ?? m.summary, wrong: $('#ss-wrong')?.value ?? m.wrong, rule: $('#ss-rule')?.value ?? m.rule, date: $('#ss-date')?.value ?? m.date, error: null, errorFor: null });
  const when = realDay(m.date) && m.date <= today() ? m.date : today(); // a day in the future, or none, is today
  if (m.pick && !$('#ss-task')?.value) { Object.assign(m, { error: 'Choose the task or bug this session was about, or Something else.', errorFor: 'ss-task' }); renderModal(); $('#ss-task')?.focus(); return; }
  let t = null;
  let bug = null;
  if (val === 'other') { // work outside the plan, such as a ready-made prompt
    const what = oneLine($('#ss-what')?.value ?? m.what);
    if (!what) { Object.assign(m, { other: true, what: '', error: 'Say what you asked Claude Code to do.', errorFor: 'ss-what' }); renderModal(); $('#ss-what')?.focus(); return; }
    Object.assign(m, { other: true, what, mid: '', tid: '', bid: '' });
  } else if (val.startsWith('bug:')) { // fixing a bug: done marks it fixed
    bug = p.bugs.find((x) => x.id === val.slice(4));
    if (!bug) { toast('That bug is gone. Pick another one.'); return; }
    Object.assign(m, { other: false, bid: bug.id, mid: '', tid: '' });
  } else {
    const [mid, tid] = val.split(':');
    t = findTask(p, mid, tid).t;
    if (!t) { toast('That task is gone. Pick another one.'); return; }
    Object.assign(m, { other: false, mid, tid, bid: '' });
  }
  if (!OUTCOMES.some((o) => o.k === m.outcome)) {
    Object.assign(m, { error: 'Choose how it went: done, partly done or stuck.', errorFor: 'ss-outcome' });
    renderModal(); $('#modal-root input[name="ss-outcome"]')?.focus(); return;
  }
  const title = t ? t.title : bug ? `Fix: ${oneLine(bug.title) || 'Untitled bug'}` : m.what;
  const seen = newIds(p);
  const was = t ? { status: t.status, doneAt: t.doneAt, startedAt: t.startedAt } : null;
  const bugWas = bug ? bug.status : '';
  const ses = mkSession({ date: when, mid: m.mid, tid: m.tid, bid: m.bid, task: title, outcome: m.outcome, summary: reportBody(untermText(m.summary)).trim(), wrong: m.wrong.trim() }, seen);
  const at = p.sessions.findIndex((x) => str(x.date) > when);
  if (at < 0) p.sessions.push(ses); else p.sessions.splice(at, 0, ses);
  const tr = trimSessions(p);
  const wasDone = t?.status === 'done';
  if (t) t.status = m.outcome === 'done' || wasDone ? 'done' : 'doing';
  if (t && !wasDone && t.status === 'done') t.doneAt = when; // finished on the day of the session
  if (t && t.status === 'doing' && was.status !== 'doing') t.startedAt = when;
  if (bug && m.outcome === 'done') setBugStatus(bug, 'fixed');
  let lesson = false;
  if (m.wrong.trim() || m.rule.trim()) {
    const l = mkLesson({ happened: m.wrong.trim() || `While working on: ${title}`, change: oneLine(m.rule), sid: ses.id }, seen);
    p.lessons.unshift(l);
    m.lessonId = l.id;
    lesson = true;
  }
  touch(p);
  m.taskTitle = title || 'Untitled task';
  const lessonNote = lesson ? (m.rule.trim() ? 'A lesson with your rule was added on the Improve tab. Use Add to CLAUDE.md there to make Claude Code follow it.' : 'A lesson was added on the Improve tab.') : '';
  const ms = t && !wasDone && t.status === 'done' ? p.milestones.find((x) => x.id === m.mid) : null;
  const finished = ms && ms.tasks.every((x) => x.status === 'done') ? ` Milestone ${p.milestones.indexOf(ms) + 1} is finished: look back on it from the Plan tab.` : '';
  m.savedNote = t ? `"${m.taskTitle}" ${wasDone ? 'stays done' : t.status === 'done' ? 'is now done' : 'is now in progress'}.${finished}${lessonNote ? ` ${lessonNote}` : ''}`
    : bug ? `"${oneLine(bug.title) || 'Untitled bug'}" ${bugWas === 'fixed' ? 'stays fixed' : bug.status === 'fixed' ? 'is now fixed' : 'is still open'}.${lessonNote ? ` ${lessonNote}` : ''}`
    : lessonNote || 'It is listed under Sessions on the Improve tab.';
  if (tr) m.savedNote += ` ${trimNote(tr)}`;
  const lid = m.lessonId; const tid = t?.id; const bid = bug?.id;
  const after = tr ? new Map(p.sessions.map((x) => [x.id, JSON.stringify(x)])) : null;
  m.undo = {
    pid: idOf(p),
    restore: (q) => { // takes the session and its lesson out, puts the task back as it was, and the history the save shortened
      if (!q.sessions.some((x) => x.id === ses.id)) return null;
      let rest = q.sessions.filter((x) => x.id !== ses.id);
      if (tr) { // whole again, unless edited since; the ones removed come back first, as the oldest
        const full = new Map(tr.before.map((x) => [x.id, x]));
        const have = new Set(rest.map((x) => x.id));
        rest = [...tr.before.filter((x) => !after.has(x.id) && !have.has(x.id)).map(clone),
          ...rest.map((x) => (full.has(x.id) && after.get(x.id) === JSON.stringify(x) ? clone(full.get(x.id)) : x))];
      }
      q.sessions = rest;
      if (lid) q.lessons = q.lessons.filter((x) => x.id !== lid);
      const qm = tid && q.milestones.find((x) => x.tasks.some((y) => y.id === tid));
      const qt = qm && qm.tasks.find((x) => x.id === tid);
      if (qt && was) Object.assign(qt, was);
      const qb = bid && q.bugs.find((x) => x.id === bid);
      if (qb) qb.status = bugWas;
      return qt ? fid(`milestones.${qm.id}.tasks.${qt.id}.title`) : qb ? fid(`bugs.${qb.id}.st`) : '';
    },
  };
  m.saved = true; S.ssDraft = null;
  renderSheet();
  if (withAI && canAsk()) { aiFollowUps(m); return; } // its Undo comes when the dialog closes
  m.toasted = true;
  closeModal();
  toast(`Session logged. ${m.savedNote}${tr ? ' Undo puts them back.' : ''}`, m.undo);
}
// a project from a backup that is already here, unchanged (the backup was made in this browser): importing it again
// would only make a copy called "(imported)"
const canon = (x) => (Array.isArray(x) ? x.map(canon) : isPlain(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])])) : x);
const sameKey = (p) => JSON.stringify(canon({ ...p, updatedAt: '' }));
function hereAlready(list) {
  const keys = new Set([...S.projects.values()].map(sameKey));
  return list.map((p) => keys.has(sameKey(p)));
}
function importNote(d) {
  switch (d.type) {
    case 'backup': {
      const n = d.projects.length;
      const same = hereAlready(d.projects.map((x) => normalize(x))).filter(Boolean).length;
      const rest = n - same;
      return `A Shipyard backup with ${plural(n, 'project', 'projects')}. ${!same ? `Importing adds ${n === 1 ? 'it' : 'them'} next to your current projects.`
        : !rest ? `${n === 1 ? 'It is' : 'They are all'} already here, unchanged, so there is nothing to import.`
        : `${same} of them ${same === 1 ? 'is' : 'are'} already here, unchanged, and will be skipped. Importing adds the other ${rest === 1 ? 'one' : rest} next to your current projects.`}`;
    }
    case 'shipyard': return 'A plan exported from Shipyard. Importing brings back the brief, features, data model, plan, bugs, decisions, lessons, sessions and your prompts. A backup keeps more, such as an edited CLAUDE.md and how sessions link to lessons and bugs.';
    case 'badjson': return 'This looks like JSON, but not a Shipyard backup.';
    case 'doc': return d.survey ? `A description from Claude Code's ${SURVEY_FILE}. Shipyard fills in the pitch, stack, commands, features, data model, rules, known bugs and next steps.` : 'Shipyard picks out the name, pitch, stack, commands, rules, features and to-do lists it can find.';
    default: return 'Or open a .md, .txt or .json file.';
  }
}
// on for text shaped like a CLAUDE.md; a README or notes get a CLAUDE.md built from the project
// a task ticked in the folder's PLAN.md that was split here: which of its parts are done (the first, unless told)
function splitPickHTML(r) {
  const ss = r ? r.split.filter((s) => s.checked && s.parts.length) : [];
  const picks = S.modal?.parts;
  return ss.map((s) => `<fieldset class="ps-split"><legend>Which parts of "${esc(s.title)}" are done?</legend>${s.parts.map((x, i) => `<label class="check-line"><input type="checkbox" class="ps-part" value="${esc(x.t.id)}" ${(picks ? picks.has(x.t.id) : i === 0 && !s.begun) ? 'checked' : ''}><span>${esc(oneLine(x.t.title) || 'Untitled task')}</span></label>`).join('')}</fieldset>`).join('');
}
function readPlanFile(file) {
  const m = S.modal;
  if (!file || m?.kind !== 'plansync') return;
  const fail = (t) => { const n = $('#ps-note'); if (n) { n.textContent = t; n.classList.add('field-error'); } };
  if (file.size > 2e6) { fail("That file is too large for a PLAN.md. Pick the PLAN.md in your project's folder."); return; }
  const rd = new FileReader();
  rd.onload = () => { if (S.modal !== m) return; m.text = str(rd.result); renderModal(); focusFirst(['[data-act="apply-plansync"]:not([disabled])', '#ps-text']); };
  rd.onerror = () => { if (S.modal === m) fail('Could not read that file. Try pasting its text instead.'); };
  rd.readAsText(file);
}
function planSyncState(text) {
  const p = active();
  if (!p || !str(text).trim()) return { ok: false, note: 'Paste the file to see what will change.' };
  const r = readPlanMd(p, text);
  const name = oneLine(p.name) || 'this project';
  if (!r.ownIds && r.name && r.name.toLowerCase() !== name.toLowerCase()) return { ok: false, note: `This file is the plan for "${r.name}", not "${name}". Is this the PLAN.md for another project?` };
  if (r.ids && !r.ownIds) return { ok: false, note: `None of the tasks in this file belong to ${name}. Is this the PLAN.md for another project?` };
  if (r.foreign && planChangeCount(r)) return { ok: true, r, note: `Shipyard did not make this PLAN.md, so this adds what it has that the plan lacks: ${planChangeText(r)}. A task with the same name as one in the plan is matched, not added twice.` };
  if (!r.found && !r.seen && !r.fixed.length && !r.newBugs.length) return { ok: false, note: 'No tasks found. Paste the whole PLAN.md, including its "- [ ]" lines.' };
  if (!r.found && !r.fixed.length && !r.ownIds) return { ok: false, note: `None of these tasks are in ${name}'s plan. Is this the PLAN.md for another project?` };
  const picks = S.modal?.kind === 'plansync' ? S.modal.parts : null;
  r.split.filter((s) => s.checked).forEach((s) => s.parts.forEach((x, i) => { if (picks ? picks.has(x.t.id) : i === 0 && !s.begun) r.done.push(s.at ? { ...x, at: s.at } : x); }));
  const n = planChangeCount(r);
  const split = r.split.filter((s) => s.checked && s.parts.length).map((s) => `"${s.title}" is ticked there, but you split it here into ${s.n} smaller tasks: tick the ones that are done below.`).join(' ');
  const skipped = [
    split,
    r.gone ? `${r.gone === 1 ? '1 task' : `${r.gone} tasks`} you deleted here will stay deleted.` : '',
    r.unknown ? `${r.unknown === 1 ? '1 new line' : `${r.unknown} new lines`} outside a milestone will be skipped.` : '',
    r.bugNotes ? `${r.bugNotes === 1 ? 'A Notes line' : `${r.bugNotes} Notes lines`} under bugs will not be kept: log a session on the bug to keep what was found.` : '',
  ].filter(Boolean).join(' ');
  return { ok: n > 0, r, note: (n ? `This will update the plan: ${planChangeText(r)}.` : 'Already up to date. Nothing to change.') + planNames(r) + (skipped ? ' ' + skipped : '') };
}
const keepMd = (m) => (typeof m.keepMd === 'boolean' ? m.keepMd : !isSurvey(m.text) && looksLikeClaudeMd(splitFrontMatter(m.text || '').body));
const importGuess = (text) => (detectImport(text).type === 'doc' ? parseDoc(text).name : '');
// an error shown under the field it is about
const fieldError = (m, id) => (m.error && m.errorFor === id ? `<p class="field-error" id="${id}-err" role="alert">${esc(m.error)}</p>` : '');
const errAttrs = (m, id) => (m.error && m.errorFor === id ? ` aria-invalid="true" aria-describedby="${id}-err"` : '');
const formError = (m) => (m.error && !m.errorFor ? `<p class="hint" role="alert" style="color:var(--bad)">${esc(m.error)}</p>` : '');
function importActionsHTML(doc) {
  const ai = canAsk() && doc;
  return `${S.modal?.direct ? '<button type="button" class="btn left" data-act="close-modal">Cancel</button>' : '<button type="button" class="btn left" data-act="np-mode" data-k="new">Back</button>'}
        <button type="button" class="btn${ai ? '' : ' primary'}" data-act="import">Import</button>
        ${ai ? '<button type="button" class="btn primary" data-act="import-ai">Import and fill gaps with Claude</button>' : ''}`;
}
// keeps the import dialog in step with the text without rebuilding the text box, so undo keeps working
let guessTimer = 0;
function syncImportDialog(text) {
  const m = S.modal;
  const d = detectImport(text);
  const note = importNote(d);
  const n = $('#np-detect');
  if (n && n.textContent !== note) n.textContent = note;
  if (m.errorFor === 'np-text') { m.error = null; m.errorFor = null; $('#np-text-err')?.remove(); const t = $('#np-text'); t?.removeAttribute('aria-invalid'); t?.removeAttribute('aria-describedby'); }
  const doc = d.type === 'doc';
  if (d.type !== m.detType) {
    m.detType = d.type;
    const o = $('#np-docopts');
    if (o) o.hidden = !doc;
    const act = $('#np-actions');
    if (act) act.innerHTML = importActionsHTML(doc);
  }
  if (!doc) return;
  const c = $('#np-keepmd');
  if (c && typeof m.keepMd !== 'boolean') c.checked = keepMd(m);
  clearTimeout(guessTimer);
  guessTimer = setTimeout(() => { const i = $('#np-name'); if (i && S.modal === m) i.placeholder = importGuess(m.text) || 'Project name'; }, 250);
}
// newest first; `go` names a shortcut in the 'wn-go' action, shown only where it can work
const WHATS_NEW = [
  { v: 15, h: 'Help, in one place', t: 'Help, in the project list, shows how Shipyard and Claude Code work together in six steps, where your projects are kept and how to keep a copy, and the keys that save time. Press ? anywhere outside a text box to open it.', go: 'help', btn: 'Open Help' },
  { v: 15, h: 'Nothing lost when the connection drops', t: 'Changes your account has not saved yet are kept in this browser too, so closing the page right after typing, a save that never answers or a full store loses nothing: the next visit saves them. A visit that cannot reach your account works on this browser\'s copy, and projects made here before you used your account are offered to it, not replaced.' },
  { v: 15, h: 'Undo a deleted project', t: 'Deleting a project now offers Undo, and Ctrl+Z (Cmd+Z on a Mac) brings it back whole, even after you clicked into another project. Right after you delete a task, Ctrl+Z undoes that too, until you start typing.' },
  { v: 15, h: 'Calm after months of work', t: 'Log a session leaves finished milestones out of its list until you ask for them, Improve folds the lessons already in CLAUDE.md, and PLAN.md sums up each finished milestone in one line, so Claude Code reads less on every task. A project nearing the most one project can hold says so, with Back up.' },
  { v: 15, h: 'Works in more browsers', t: 'Shipyard now runs in Safari 15.4 and later, and says what to do in a browser too old for it. A large backup opens at once. With a keyboard, Skip to project jumps past the project list, and with a screen reader each message is read out with how to undo it. Dates from another year show the year.' },
  { v: 14, h: 'Your project\'s folder stays in step', t: 'Shipyard now remembers which version of each file you last gave Claude Code. When the plan or CLAUDE.md changes after that, Project files marks what your project\'s folder is missing and has one update prompt for all of it. Adding a rule, adding tasks or splitting one says how the change reaches Claude Code.', go: 'files', btn: 'Open Project files' },
  { v: 14, h: 'Prompts that learn from earlier sessions', t: 'A task or fix prompt now passes on what the last sessions found and what went wrong, and any rule not yet in CLAUDE.md. The parts of a split task keep the larger task\'s notes. Prompts mention a dev server only when the project has one, and a report that says done, but with failures, counts as partly done.' },
  { v: 14, h: 'A plainer first hour', t: 'Before you have a project, Start Claude Code is only the install, and it says how to use a folder you already have. Back up says how to bring your projects into another browser, and Import skips projects already here and can be undone. When Claude declines something, the message says what it declined and what to do instead.', go: 'setup', btn: 'Open Start Claude Code' },
  { v: 14, h: 'One name for each thing', t: 'The words are plainer and the same everywhere: Project files for the files Claude Code needs, Rules for Claude Code for how the code should be written, the setup prompt, Task prompt and Fix prompt. CLAUDE.md, a session, a commit and a subagent are explained where you first meet them.' },
  { v: 14, h: 'A plan that keeps itself up to date', t: 'A feature\'s status now follows its tasks, and the stage moves on to Building with the first finished task. Click any status to change it; a finished task clicked back says so, with Undo. Import from your code keeps a known issue as one bug, and longer messages stay up long enough to read.' },
  { v: 13, h: 'Starters that work with today\'s tools', t: 'Every kind of project starts on the current versions of its tools, so the first tasks work as written. Plans now include the steps people miss, such as putting the code on GitHub, testing with TestFlight or Google Play, the Chrome Web Store, and adding a bot to every server. Start Claude Code lists the accounts each kind of project needs, with where to sign up.', go: 'setup', btn: 'Open Start Claude Code' },
  { v: 13, h: 'Safer with odd or damaged data', t: 'A backup made by an older or newer Shipyard, or edited by hand, now comes in whole, with nothing dropped. Session notes keep up to 20,000 characters. If what this browser saved cannot be read, Shipyard keeps it aside instead of writing over it, and when the browser is out of room it says how much is left.' },
  { v: 13, h: 'Cleaner PLAN.md, import and export', t: 'Update from PLAN.md matches tasks Claude Code reworded a little, and says which ones it read that way. A password in a GitHub link is taken out before it reaches CLAUDE.md or an export. Error logs and other pasted text keep their lines through export and import, and links show which site they open.' },
  { v: 13, h: 'Claude\'s help, more careful', t: 'Passwords, keys and tokens in a project are hidden before anything goes to Claude, and typing one warns you. Claude\'s answers are read whatever their shape, suggestions already in the plan are left out and counted, and new milestones go before the release. Undo after a Claude result keeps what you changed since.' },
  { v: 13, h: 'A calmer page', t: 'Finished tasks at the top of a milestone fold behind one row, so the next open task shows on the first screen. Task and bug rows line up, a project card opens with a click anywhere on it, Project files shows the file first, and no text is smaller than 12px.', go: 'all', btn: 'Open All projects' },
  { v: 12, h: 'Find anything in a project', t: 'Find, at the top of a project, or Ctrl+K (Cmd+K on a Mac), searches tasks and their notes, bugs, sessions, lessons, decisions, features, the brief, your prompts and answers from Claude. Pick a result and it opens where it is, even in a finished milestone or an old session.', go: 'find', btn: 'Find in this project' },
  { v: 12, h: 'What came in while you were away', t: 'When work on a project came in from another device, or from someone you share it with, Overview lists it: tasks done, sessions logged, bugs reported and fixed. The project list counts it, and new sessions and bugs are marked New until you choose Got it.' },
  { v: 12, h: 'Sharing the planner', t: 'Someone you share Shipyard with to view gets a planner of their own, saved in their browser, and your projects stay private to you. Someone you share it with to edit works on your projects with you, and is told so.' },
  { v: 12, h: 'Old work looks old', t: 'A task in progress for a week or more says since when, and Back to To do puts it back. Overview shows your last session. Bugs show when they were reported or fixed, open ones most serious first. Ask Claude and Review my project know the date, your target and your pace.' },
  { v: 12, h: 'A summary for any week', t: "The summary can cover any week, or every day since a date you pick, with the bugs reported and fixed. Long session notes open in full on Improve. Same setup as another project brings the rules written in that project's CLAUDE.md too." },
  { v: 12, h: 'Better files for Claude Code', t: 'Every starter puts the project in git first. Task prompts tick their own line in PLAN.md with the day, a later try checks what the last one left before it carries on, and every prompt, the ready-made ones too, ends with the two lines Log a session reads.' },
  { v: 12, h: 'Quicker on a phone', t: 'A change now updates only what it touches, so ticking a task or opening its notes is about twice as fast on a phone, and the cursor and scroll position stay put. The header is shorter, so Next up shows without scrolling.' },
  { v: 11, h: 'Easier to see and to hear', t: 'Text boxes have clearer edges and a stronger focus ring, and text follows the text size set in your browser. With a screen reader, you hear when Claude starts and what it comes back with, every button names the task, bug or lesson it acts on, and lists read as lists.' },
  { v: 10, h: 'Sessions on the right task and day', t: 'Log a session starts on the task whose prompt you copied, and the dialog names it. Copy next prompt on All projects starts the task too. A session can have the day it happened, which also dates the task it finished. On a large project, Claude still sees your open bugs, recent sessions and lessons.' },
  { v: 10, h: 'Undo within reach', t: 'Ctrl+Z (Cmd+Z on a Mac) undoes the last change when you are not typing in a field, even after its message has gone. In a dialog, Tab reaches Undo. After a delete, the cursor goes to the item above, so pressing Enter twice cannot delete two things.' },
  { v: 10, h: 'Your history stays whole', t: 'Logging a session keeps every earlier session as you wrote it. Only when a project nears the most one project can hold are the oldest notes shortened, and Shipyard says so, with Undo. Mark done, Claude\'s milestones and features, review suggestions and Add to CLAUDE.md can be undone too, and a project that cannot be saved says so at the top.' },
  { v: 10, h: 'A plan that builds what you asked for', t: "The guide now asks you to plan each must-have, with Plan it on the step itself, and Claude's drafts link each task to the feature it builds. Next up says so when must-haves still have no tasks before the finishing touches." },
  { v: 10, h: 'PLAN.md stays in step', t: 'Fixed bugs stay in PLAN.md, ticked, and the setup prompt follows the ids in it, so the folder matches Shipyard. Claude Code adds the day to each tick, and Update from PLAN.md dates the task by it. Update from PLAN.md also takes a PLAN.md Shipyard did not make, and adds the bugs Claude Code listed.', go: 'plansync', btn: 'Update from PLAN.md' },
  { v: 10, h: 'One step at a time', t: "The guide's next step shows at the top of every tab. Duplicate, Archive and Delete are under More, and the stage row waits until the guide is done. Start Claude Code now lists what your project needs besides it, such as Node.js or Python, with a command to check each." },
  { v: 9, h: 'Ready for auto mode', t: 'Claude Code now starts in auto mode, where it can push to GitHub without asking. The settings file Shipyard makes now has it ask you first, and works on Windows too. Copy it again, or use the setup prompt on Project files, to get it.', go: 'settings', btn: 'Open the settings file' },
  { v: 8, h: 'Your own files are kept', t: 'The setup prompt now merges into a CLAUDE.md, PLAN.md or settings.json already in your folder instead of replacing it, and keeps the tasks Claude Code ticked. A project brought in from its code starts its guide there.' },
  { v: 8, h: 'Log how a bug fix went', t: "A bug's fix prompt has Log how it went. Done marks the bug fixed; if it is not fixed yet, the next fix prompt says what earlier tries found and what went wrong." },
  { h: 'Bring in a project you already have', t: `Import has a prompt that has Claude Code read your code and write ${SURVEY_FILE}: the stack, commands, features built and not yet built, data model, known issues and next steps. Import the file and the project is filled in.`, go: 'survey', btn: 'Get the prompt' },
  { h: 'One setup prompt for every file', t: "Project files has one prompt that has Claude Code save CLAUDE.md, PLAN.md and the .claude files in your project's folder, asking before it replaces any that are different.", go: 'saveall', btn: 'Get the setup prompt' },
  { h: 'Logging a session takes a paste', t: 'Prompts now ask Claude Code to end with an Outcome line and a Went wrong line. Paste its summary into Log a session and both are filled in for you.' },
  { h: 'Look back on a milestone', t: 'A finished milestone on Plan has Look back: when it was built, how its sessions went and what went wrong, as a recap to copy. Claude can suggest rules for CLAUDE.md so the same problems do not come back.' },
  { h: 'Help starting Claude Code', t: 'New to Claude Code? A short guide shows how to install it, make the project\'s folder and start it there, with each command ready to copy.', go: 'setup', btn: 'See how to start' },
  { h: 'Turn answers into tasks', t: 'Under each answer from Ask Claude, Turn into tasks picks out the work it recommends. Tick what to keep and choose the milestone it goes in.', go: 'ask', btn: 'Go to Ask Claude', ai: true },
  { h: 'Prompts remember earlier sessions', t: 'When a task took more than one session, its prompt says what the earlier ones got done and what went wrong, so Claude Code picks up from there. Next up shows a stuck last session too.' },
  { h: 'All projects on one page', t: 'With two or more projects, All projects at the top of the list shows the next task in each, the work done this week, open bugs and anything that needs you.', go: 'all', btn: 'Open All projects' },
  { h: 'Aim to ship by', t: 'Give the project a date in its brief. Progress then says whether you are on pace, counting large tasks as more work than small ones.', go: 'target', btn: 'Set a date' },
  { h: 'A tidier plan and a weekly summary', t: "Finished milestones fold to one line on Plan. Progress has the week's summary to paste into notes, a standup or a changelog." },
  { h: 'Reviewer and test runner', t: 'Project files has two subagents for .claude/agents: one checks finished work against CLAUDE.md and the plan, one runs your checks. The /next command asks the reviewer.', go: 'agents', btn: 'Open the reviewer' },
  { h: 'Saved prompts that never clash', t: 'A saved prompt named like a built-in command, such as /review, is saved as /review-prompt, and $1 or !` in its text stays plain text.' },
  { h: 'An example to explore', t: 'A Recipe Box project part way through its plan, with sessions, a lesson and a bug, to see what a filled-in project looks like.', go: 'example', btn: 'Explore the example' },
];
// how Shipyard works, in one dialog: the loop, where projects are kept, and the keys
function helpHTML() {
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  const key = (k) => `<kbd>${mac ? 'Cmd' : 'Ctrl'}+${k}</kbd>`;
  const kept = S.role === 'guest' ? 'The projects you start here are yours and are saved in this browser only. The owner\'s projects stay private to them.'
    : S.mode === 'db' && S.role === 'editor' ? 'These are the projects of the person who shared Shipyard with you. Your changes are saved to their projects, for everyone who can edit them.'
    : S.mode === 'db' ? 'Your projects are saved to your Claude account, and only you and editors you add can see them. This browser keeps a copy too, so changes made while the connection is down are saved the next time the page connects.'
    : Store.fallback ? 'Shipyard cannot reach your Claude account right now, so changes are kept in this browser and saved to your account the next time the page connects.'
    : 'Your projects are saved in this browser only. Clearing the browser\'s data for this site removes them, so keep a backup.';
  return `<h2 id="m-title" tabindex="-1" data-autofocus>How Shipyard works</h2>
    <p class="sub">Shipyard is where you plan a project, and Claude Code is where it gets built. You go back and forth between the two, one task at a time.</p>
    <ol class="help-steps">
      <li><b>Describe it.</b> On Overview, say what you are building, who it is for and what done looks like. Design holds the features, screens and data model.</li>
      <li><b>Plan it.</b> On Plan, break the work into milestones and small tasks that each fit in one Claude Code session. Split a large task before you start it.</li>
      <li><b>Set up the folder.</b> Project files has CLAUDE.md and PLAN.md, the files Claude Code reads. Its setup prompt puts them in your project's folder; Start Claude Code shows how to open Claude Code there.</li>
      <li><b>Build one task.</b> Task prompt, on any task, gives a prompt to paste into Claude Code. Fix prompt does the same for a bug.</li>
      <li><b>Log how it went.</b> After each sitting, Log a session: done, partly done or stuck, and what went wrong. Shipyard suggests what is next and turns mistakes into Rules for Claude Code.</li>
      <li><b>Improve.</b> Improve keeps the session log, bugs and lessons, and Claude's review of the whole project.</li>
    </ol>
    <h3 class="help-h">Where your projects are kept</h3>
    <p class="help-p">${esc(kept)} Back up all projects, in the project list, gives one file with everything; Import brings a backup, or a project's notes or PLAN.md, into Shipyard.</p>
    <h3 class="help-h">Keys</h3>
    <ul class="help-keys">
      <li>${key('K')} or <kbd>/</kbd> finds anything in the open project.</li>
      <li>${key('Z')} undoes the last change that offered Undo, such as a delete.</li>
      <li><kbd>Esc</kbd> closes a dialog, or stops Claude while it works.</li>
      <li><kbd>?</kbd> opens this help.</li>
    </ul>
    <div class="modal-actions">
      <button type="button" class="btn left" data-act="whats-new">What's new</button>
      <button type="button" class="btn" data-act="cc-setup">Start Claude Code</button>
      <button type="button" class="btn primary" data-act="close-modal">Close</button>
    </div>`;
}
function whatsNewHTML() {
  const inProject = S.view === 'project' && !!active();
  const can = (x) => x.go === 'all' ? canDash() : x.go === 'example' || x.go === 'setup' || x.go === 'survey' || x.go === 'help' ? true : inProject && (x.go !== 'ask' || canAsk());
  const items = WHATS_NEW.filter((x) => !x.ai || canAsk());
  const prev = Number(S.wnPrev);
  const isNew = (x) => S.wnPrev != null && Number.isFinite(prev) && (x.v || 7) > prev;
  const fresh = items.filter(isNew);
  const li = (x) => { const i = items.indexOf(x); return `<li><h3 id="wn-${i}">${esc(x.h)}${isNew(x) ? ' <span class="wn-new">New</span>' : ''}</h3><p>${esc(x.t)}</p>${x.go && can(x) ? `<button type="button" class="btn sm" data-act="wn-go" data-k="${x.go}" aria-describedby="wn-${i}">${x.go === 'example' && exampleId() ? 'Open the example' : x.btn}</button>` : ''}</li>`; };
  const older = items.filter((x) => !isNew(x));
  const top = Math.max(...items.map((x) => x.v || 7));
  const latest = items.filter((x) => (x.v || 7) === top);
  const past = items.filter((x) => (x.v || 7) !== top);
  return `<h2 id="m-title" tabindex="-1" data-autofocus>What's new</h2>
    <p class="sub">${fresh.length ? `${fresh.length === 1 ? 'One change' : `${fresh.length} changes`} since you last looked.` : 'Recent changes to Shipyard.'}</p>
    ${fresh.length ? `<ul class="wn-list">${fresh.map(li).join('')}</ul>
    ${older.length ? `<details class="wn-older"><summary>Earlier changes (${older.length})</summary><ul class="wn-list">${older.map(li).join('')}</ul></details>` : ''}`
    : `<ul class="wn-list">${latest.map(li).join('')}</ul>
    ${past.length ? `<details class="wn-past"><summary>Earlier changes (${past.length})</summary><ul class="wn-list">${past.map(li).join('')}</ul></details>` : ''}`}
    <div class="modal-actions"><button type="button" class="btn primary" data-act="close-modal">Close</button></div>`;
}
function renderModal() { renderModal0(); sayWorking('modal', S.modal ? $('#modal-root') : null); }
function renderModal0() {
  const root = $('#modal-root');
  const m = S.modal;
  if (!m) { root.innerHTML = ''; $('#app').inert = false; return; }
  const f = captureFocus(root);
  let body = '';
  if (m.kind === 'new' && m.mode === 'survey') {
    body = `<h2 id="m-title">Import from your code</h2>
      <p class="sub">Paste this prompt into Claude Code, started in the project's folder. It reads the code and writes what it finds to ${SURVEY_FILE}, changing nothing else. <button type="button" class="linkish" data-act="cc-setup">New to Claude Code?</button></p>
      <div><label class="lbl" for="m-prompt">Prompt for Claude Code</label><textarea class="ta mono" id="m-prompt" rows="12" readonly spellcheck="false" aria-describedby="sv-next">${esc(surveyPrompt())}</textarea></div>
      <p class="hint" id="sv-next">When Claude Code says the file is saved, choose Import the file and open ${SURVEY_FILE}, or paste its text. You can delete the file afterwards.</p>
      <div class="modal-actions">
        <button type="button" class="btn left" data-act="close-modal">Cancel</button>
        <button type="button" class="btn" data-act="copy-prompt">Copy prompt</button>
        <button type="button" class="btn primary" data-act="np-mode" data-k="import">Import the file</button>
      </div>`;
  } else if (m.kind === 'new' && m.mode === 'import') {
    const d = detectImport(m.text);
    m.detType = d.type;
    const doc = d.type === 'doc';
    body = `<h2 id="m-title">Import a project</h2>
      <p class="sub">Paste a CLAUDE.md, a README, a plan exported from Shipyard or a Shipyard backup. Shipyard fills in what it can find, and you can edit everything afterwards. For code that already exists, <button type="button" class="linkish" data-act="np-mode" data-k="survey">have Claude Code describe it</button> instead: it reads the code itself, so the features, known bugs and next steps come in too.</p>
      <div><label class="lbl" for="np-text">Text to import</label><textarea class="ta mono import-text" id="np-text" rows="10" spellcheck="false" placeholder="# My project&#10;&#10;A one-line description…&#10;&#10;## Commands&#10;…"${errAttrs(m, 'np-text')}>${esc(m.text || '')}</textarea>
        ${fieldError(m, 'np-text')}
        <div class="file-row"><button type="button" class="btn sm" data-act="np-file">Open a file…</button><input type="file" id="np-file" accept=".md,.markdown,.txt,.json,text/markdown,text/plain,application/json" hidden>
        <p class="hint" id="np-detect" role="status">${esc(importNote(d))}</p></div></div>
      <div class="doc-opts" id="np-docopts"${doc ? '' : ' hidden'}>
        <div><label class="lbl" for="np-name">Name</label><input class="in" id="np-name" autocomplete="off" placeholder="${esc((doc && importGuess(m.text)) || 'Project name')}" value="${esc(m.name || '')}"></div>
        <div class="check-line"><input type="checkbox" id="np-keepmd" aria-describedby="np-keepmd-h${m.error && m.errorFor === 'np-keepmd' ? ' np-keepmd-err" aria-invalid="true' : ''}" ${keepMd(m) ? 'checked' : ''}>
          <div><label for="np-keepmd">Use this text as the project's CLAUDE.md</label><p class="h" id="np-keepmd-h">On: kept word for word, as for a CLAUDE.md you already use. Off: Shipyard writes one from what it imports, which suits a README or notes.</p>${fieldError(m, 'np-keepmd')}</div></div>
      </div>
      ${formError(m)}
      <div class="modal-actions" id="np-actions">${importActionsHTML(doc)}</div>`;
  } else if (m.kind === 'new') {
    const ai = canAsk();
    const pick = m.starter || '';
    body = `<h2 id="m-title">New project</h2>
      <p class="sub">Give it a name and describe the idea in a sentence or two. You can change everything later. Already started? <span class="nw"><button type="button" class="linkish" data-act="np-mode" data-k="survey">Have Claude Code describe your code</button>,</span> even if you have a CLAUDE.md, or <button type="button" class="linkish" data-act="np-mode" data-k="import">import a CLAUDE.md, README or backup</button>${exampleId() ? '' : '. Want to see a filled-in project first? <button type="button" class="linkish" data-act="example">Open an example</button>'}</p>
      <div><label class="lbl" for="np-name">Name</label><input class="in" id="np-name" autocomplete="off" placeholder="For example: Recipe Box" value="${esc(m.name || '')}"${errAttrs(m, 'np-name')}>${fieldError(m, 'np-name')}</div>
      <div><label class="lbl" for="np-idea">Idea</label><textarea class="ta" id="np-idea" rows="3" placeholder="For example: a small web app where I save recipes from links and plan meals for the week"${errAttrs(m, 'np-idea')}>${esc(m.idea || '')}</textarea>
        ${fieldError(m, 'np-idea')}
        ${ai ? '<p class="hint">With an idea filled in, Claude can draft the brief, features and a first plan for you.</p>' : ''}</div>
      <fieldset class="starters"><legend class="lbl">Starting point</legend>
        <p class="hint st-what">A starting point fills in a tech stack, run and test commands, rules for Claude, and the first and last milestones.${ai ? ' Claude plans the rest around it.' : ' You plan the features in between.'}</p>
        <div class="starter-grid">${STARTERS.map((s) => `<label class="starter"><input type="radio" name="np-starter" id="np-st-${s.k || 'none'}" value="${s.k}" ${s.k === pick ? 'checked' : ''}><span><b>${esc(s.label)}</b><small>${esc(s.hint)}${s.tech ? `<span class="st-tech">Built with ${esc(s.tech)}</span>` : ''}</small></span></label>`).join('')}
          ${S.projects.size ? `<label class="starter"><input type="radio" name="np-starter" id="np-st-like" value="like" ${pick === 'like' ? 'checked' : ''}><span><b>Same setup as another project</b><small>Its stack, commands, Rules for Claude Code and your prompts</small></span></label>` : ''}</div>
        ${pick === 'like' && S.projects.size ? `<div class="like-pick"><label class="lbl" for="np-like">Copy the setup of</label><select class="in" id="np-like">${sortedProjects().map(([pid, x]) => `<option value="${esc(pid)}" ${pid === (m.like || S.activeId) ? 'selected' : ''}>${esc(x.name || 'Untitled project')}${x.archived ? ' (archived)' : ''}</option>`).join('')}</select></div>` : ''}
        <p class="hint" id="np-guess" role="status">${m.starterAuto && m.starter ? esc(guessNote(m.starter)) : ''}</p>
      </fieldset>
      ${formError(m)}
      <div class="modal-actions">
        <button type="button" class="btn left" data-act="close-modal">Cancel</button>
        <button type="button" class="btn${ai ? '' : ' primary'}" data-act="create">Create</button>
        ${ai ? '<button type="button" class="btn primary" data-act="create-ai">Create and draft with Claude</button>' : ''}
      </div>`;
  } else if (m.kind === 'find') {
    const p = active();
    body = `<h2 id="m-title">Find in ${esc(oneLine(p?.name) || 'this project')}</h2>
      <p class="sub" id="find-sub">Tasks and their notes, bugs, sessions, lessons, decisions, features, screens, the brief, your prompts and answers from Claude.</p>
      <div><label class="lbl" for="find-q">Words to find</label><input type="search" class="in" id="find-q" value="${esc(m.q)}" autocomplete="off" spellcheck="false" placeholder="For example: share link" aria-describedby="find-n"></div>
      <p class="hint" id="find-n" role="status">${esc(findCount(m))}</p>
      <ul class="find-list" id="find-results">${findResultsHTML(m)}</ul>
      <div class="modal-actions"><button type="button" class="btn left" data-act="close-modal">Close</button></div>`;
  } else if (m.kind === 'prompt') {
    body = `<h2 id="m-title">${m.bid ? 'Fix prompt' : m.tid ? 'Task prompt' : 'Claude Code prompt'}</h2>
      <p class="sub">${m.sharpened ? 'Sharpened by Claude. Read it over before you paste it into Claude Code, or use the original.' : `Paste this into Claude Code, started in your project's folder.${active()?.copied?.claudemd ? '' : ' It relies on CLAUDE.md, so save that file there first (Project files tab).'} Edit the prompt if something is missing.${m.busy ? '' : ' New to Claude Code? <span class="nw"><button type="button" class="linkish" data-act="cc-setup">See how to start it</button>.</span>'}`}${m.what && !m.own ? (m.saved ? ' Saved to your prompts.' : ' <button type="button" class="linkish" data-act="save-quick">Save it to your prompts</button> to reuse it or run it as a slash command.') : ''}</p>
      ${m.note ? `<p class="note-box">${esc(m.note)}</p>` : ''}
      <label class="sr" for="m-prompt">Prompt</label>
      <textarea class="ta mono prompt-text" id="m-prompt" spellcheck="false" ${m.busy ? 'readonly' : ''}>${esc(m.text)}</textarea>
      ${m.busy ? workingLine('Claude is sharpening the prompt…', 'data-act="stop-sharpen"') : ''}
      <div class="modal-actions">
        <button type="button" class="btn" data-act="close-modal">Close</button>
        ${m.bid ? `<button type="button" class="btn ghost left" data-act="log-session" data-bid="${esc(m.bid)}" ${m.busy ? 'disabled' : ''}>Log how it went</button><button type="button" class="btn ghost" data-act="bug-fixed" data-id="${esc(m.bid)}" ${m.busy ? 'disabled' : ''}>Mark fixed</button>` : m.tid ? `<button type="button" class="btn ghost left" data-act="log-session" data-mid="${esc(m.mid)}" data-tid="${esc(m.tid)}" ${m.busy ? 'disabled' : ''}>Log how it went</button>`
          : m.what ? `<button type="button" class="btn ghost left" data-act="log-session" data-what="${esc(m.what)}" ${m.busy ? 'disabled' : ''}>Log how it went</button>` : '<span class="left"></span>'}
        ${m.sharpened && m.original ? '<button type="button" class="btn" data-act="unsharpen">Use the original</button>' : canAsk() ? `<button type="button" class="btn ai" data-act="sharpen" ${m.busy ? 'disabled' : ''}>Sharpen with Claude</button>` : ''}
        <button type="button" class="btn primary" data-act="copy-prompt" ${m.busy ? 'disabled' : ''}>Copy prompt</button>
      </div>`;
  } else if (m.kind === 'plansync') {
    const r = planSyncState(m.text);
    body = `<h2 id="m-title">Update from PLAN.md</h2>
      <p class="sub">Paste the PLAN.md from your project after Claude Code has worked on it. Shipyard marks finished tasks done and fixed bugs fixed, and adds the tasks, bugs and notes Claude added. Nothing is deleted, and nothing moves backwards. You can undo it afterwards.</p>
      <div><label class="lbl" for="ps-text">PLAN.md</label><textarea class="ta mono import-text" id="ps-text" rows="10" spellcheck="false" placeholder="# Plan: …&#10;&#10;## Milestone 1: …&#10;- [x] …">${esc(m.text || '')}</textarea>
        <div class="file-row"><button type="button" class="btn sm" data-act="ps-file">Open a file…</button><input type="file" id="ps-file" accept=".md,.markdown,.txt,text/markdown,text/plain" hidden>
        <p class="hint">Or in Claude Code, ask it to show PLAN.md, type /copy and paste it here.</p></div>
        <p class="hint" id="ps-note" role="status">${esc(r.note)}</p>
        <div id="ps-split">${splitPickHTML(r.r)}</div></div>
      <div class="modal-actions">
        <button type="button" class="btn left" data-act="close-modal">Cancel</button>
        <button type="button" class="btn primary" data-act="apply-plansync" ${r.ok ? '' : 'disabled'}>Update the plan</button>
      </div>`;
  } else if (m.kind === 'session') {
    body = sessionModalHTML(m);
  } else if (m.kind === 'split') {
    body = splitModalHTML(m);
  } else if (m.kind === 'featplan') {
    body = featPlanModalHTML(m);
  } else if (m.kind === 'backup') {
    const big = m.text.length > BACKUP_SHOWN && !m.showAll;
    body = `<h2 id="m-title">Back up all projects</h2>
      <p class="sub">Every project in one file. Keep it somewhere safe${S.mode === 'local' && !Store.fallback && S.role !== 'guest' ? ': these projects are kept only in this browser, so this file is your only other copy' : ''}. To bring these projects into another browser or account, use Import there (under New project) and paste this or open the file. Import adds copies next to the projects already there and never replaces them.</p>
      ${big ? `<p class="backup-size" id="backup-size">This backup is ${(m.text.length / 1e6).toFixed(1)} MB, too long to show here without slowing the page. ${S.downloads ? 'Download it or copy it.' : 'Copy it, then paste it somewhere safe.'}</p>`
    : `<label class="sr" for="m-backup">Backup</label>
      <textarea class="ta mono prompt-text" id="m-backup" spellcheck="false" readonly>${esc(m.text)}</textarea>`}
      <div class="modal-actions">
        <button type="button" class="btn left" data-act="close-modal">Close</button>${big ? '<button type="button" class="btn" data-act="show-backup">Show the text</button>' : ''}
        ${S.downloads ? '<button type="button" class="btn" data-act="download-backup">Download .json</button>' : ''}
        <button type="button" class="btn primary" data-act="copy-backup">Copy</button>
      </div>`;
  } else if (m.kind === 'setup') {
    body = setupModalHTML(m);
  } else if (m.kind === 'retro') {
    body = retroModalHTML(m);
  } else if (m.kind === 'whatsnew') {
    body = whatsNewHTML();
  } else if (m.kind === 'help') {
    body = helpHTML();
  } else if (m.kind === 'export') {
    body = `<h2 id="m-title">${esc(m.title || 'Export plan')}</h2>
      <p class="sub">${esc(m.sub || 'The project as Markdown, to paste into a doc, a GitHub issue, or a chat with Claude. Shipyard can import it again, but to move a project with everything in it, such as an edited CLAUDE.md and how sessions link to lessons and bugs, use Back up all projects.')}</p>
      ${m.saveAll ? '<p class="hint">New to Claude Code? <button type="button" class="linkish" data-act="cc-setup">See how to start it</button>.</p>' : ''}
      ${m.range ? `<fieldset class="sum-range"><legend class="sr">Which days</legend>
        <div class="sum-modes">${[['week', 'One week'], ['since', 'Everything since a day']].map(([k, l]) => `<label><input type="radio" name="sum-mode" value="${k}" ${m.range.mode === k ? 'checked' : ''}> ${l}</label>`).join('')}</div>
        <div class="row sum-week" id="sum-week-row" ${m.range.mode === 'week' ? '' : 'hidden'}><button type="button" class="btn sm" data-act="sum-week" data-d="-1">Earlier week</button><span id="sum-week-label">${esc(weekName(m.range.week))}</span><button type="button" class="btn sm" data-act="sum-week" data-d="1" ${m.range.week >= weekOf(today()) ? 'disabled' : ''}>Later week</button></div>
        <div class="sum-since" id="sum-since-row" ${m.range.mode === 'since' ? '' : 'hidden'}><label class="lbl" for="sum-since">From</label><input type="date" class="in" id="sum-since" value="${esc(m.range.since)}" max="${today()}"></div>
      </fieldset>` : ''}
      <label class="sr" for="m-export">${esc(m.label || 'Markdown')}</label>
      <textarea class="ta mono prompt-text" id="m-export" spellcheck="false" readonly>${esc(m.text)}</textarea>
      <div class="modal-actions">
        <button type="button" class="btn left" data-act="close-modal">Close</button>
        ${S.downloads ? '<button type="button" class="btn" data-act="download-export">Download .md</button>' : ''}
        <button type="button" class="btn primary" data-act="copy-export">Copy</button>
      </div>`;
  }
  root.innerHTML = `<div class="modal-wrap" data-act="backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title">${body}</div></div>`;
  const sub = root.querySelector('.modal > .sub'); // a dialog is described by the line under its heading
  const note = root.querySelector('.modal > .note-box');
  if (note) note.id = note.id || 'm-note';
  if (sub || note) root.querySelector('.modal').setAttribute('aria-describedby', [sub && (sub.id = sub.id || 'm-sub'), note?.id].filter(Boolean).join(' '));
  $('#app').inert = true;
  if (restoreFocus(f)) return;
  if (!m.focused || !root.contains(document.activeElement)) {
    m.focused = true;
    // on touch screens a focused text box opens the keyboard over the dialog, so start on its main button
    const touchFirst = m.kind !== 'new' && window.matchMedia?.('(pointer: coarse)').matches;
    const el = root.querySelector('[data-autofocus]') || (touchFirst && root.querySelector('.modal-actions .primary'))
      || shownIn(root, 'textarea:not([readonly]), input:not([type="radio"]):not([type="checkbox"]):not([type="file"])')
      || shownIn(root, 'textarea, .modal-actions button, button');
    if (el) el.focus();
  }
}
const shownIn = (root, sel) => [...root.querySelectorAll(sel)].find((e) => e.getClientRects().length) || null;
function openModal(m) {
  const a = document.activeElement;
  m.opener = a && a !== document.body ? focusSelector(a) : null;
  m.openerEl = a && a !== document.body ? a : null;
  m.menu = a?.closest?.('#more-list') ? '#more-btn' : null;
  S.modal = m;
  modalOpenedAt = Date.now();
  renderModal();
}
let modalOpenedAt = 0;
// redraws the summary in place, so focus stays where it is
function sumRefresh(p) {
  const m = S.modal;
  if (!m?.range || !p) return;
  Object.assign(m, summaryOf(p, m.range));
  const ta = $('#m-export'); if (ta) ta.value = m.text;
  const hd = $('#m-title'); if (hd) hd.textContent = m.title;
  const wk = $('#sum-week-row'); if (wk) wk.hidden = m.range.mode !== 'week';
  const sn = $('#sum-since-row'); if (sn) sn.hidden = m.range.mode !== 'since';
  const lb = $('#sum-week-label'); if (lb) lb.textContent = weekName(m.range.week);
  const later = $('[data-act="sum-week"][data-d="1"]'); if (later) later.disabled = m.range.week >= weekOf(today());
  announce(m.title);
}
function closeModal() {
  const m = S.modal;
  if (m?.busy) m.busy.ctl.abort();
  if (m?.kind === 'session') keepDraft(m);
  S.modal = null;
  $('#app').inert = false;
  renderModal();
  focusFirst([m?.openerEl, m?.opener, m?.menu, '#f-name', '[data-act="new-project"]']);
  if (m?.kind === 'session' && m.saved && m.undo && !m.toasted) { m.toasted = true; toast(`Session logged. ${m.savedNote}`, m.undo); }
}

/* ---------- toast + copy + files ---------- */
const noBidi = (s) => str(s).replace(/[\u202A-\u202E\u2066-\u2069]/g, ''); // direction overrides in a name, in Shipyard's own sentences
let toastTimer = null;
let undoState = null;
let lastUndo = null; // Ctrl+Z (Cmd+Z) still undoes the last change after its toast has gone
// a delete just moved focus, perhaps into a text box: Ctrl+Z there undoes the delete until the person types or clicks
let undoFresh = false;
document.addEventListener('input', () => { undoFresh = false; }, true);
document.addEventListener('pointerdown', () => { undoFresh = false; }, true);
function toast(msg, undo) {
  undoFresh = false;
  msg = noBidi(msg);
  const el = $('#toast');
  el.textContent = '';
  const span = document.createElement('span');
  span.textContent = msg;
  announce(undo ? `${msg} To undo, press ${/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '') ? 'Cmd+Z' : 'Ctrl+Z'}.` : msg);
  el.append(span);
  undoState = undo || null;
  if (undo) {
    lastUndo = undo;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'toast-btn'; b.dataset.act = 'undo'; b.textContent = 'Undo';
    b.title = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '') ? 'Undo (Cmd+Z)' : 'Undo (Ctrl+Z)';
    b.setAttribute('aria-keyshortcuts', 'Control+Z Meta+Z');
    el.append(b);
  }
  el.hidden = false;
  hideToastLater();
}
// where the mouse is, for a toast that waits while it is pointed at (a touch is not pointing)
let pointerAt = null;
document.addEventListener('pointermove', (e) => { pointerAt = e.pointerType === 'touch' ? null : [e.clientX, e.clientY]; }, { passive: true });
document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) pointerAt = null; });
function pointedAt(el) {
  if (!pointerAt || el.hidden) return false;
  const r = el.getBoundingClientRect();
  return pointerAt[0] >= r.left && pointerAt[0] <= r.right && pointerAt[1] >= r.top && pointerAt[1] <= r.bottom;
}
function hideToastLater() {
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    const el = $('#toast');
    if ((pointedAt(el) && !S.modal) || el.contains(document.activeElement)) { hideToastLater(); return; } // over a dialog it does not linger
    el.hidden = true; undoState = null;
  }, Math.max(undoState ? 8000 : 4500, 1500 + ($('#toast span')?.textContent.split(/\s+/).length || 0) * 330));
}
// removes an item from a project's list and offers to put it back; the list is looked up again on undo
function undoable(p, list, id, what, getList, focusField) {
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) return;
  const [item] = list.splice(i, 1);
  const name = oneLine(item.title || item.name || item.text || item.happened || item.task || '');
  toast(name ? `${what} deleted: "${name.length > 60 ? name.slice(0, 59) + '…' : name}".` : `${what} deleted.`, {
    pid: idOf(p),
    restore: (q) => {
      const target = getList(q);
      if (!target || target.some((x) => x.id === item.id)) return null;
      target.splice(Math.min(i, target.length), 0, item);
      return focusField(item);
    },
  });
  undoFresh = true;
}
// a backup longer than this is only put in a text box when asked for
const BACKUP_SHOWN = 400000;
function showBackup() { if (S.modal?.kind !== 'backup' || S.modal.showAll) return; S.modal.showAll = true; renderModal(); }
// fallbackEl: what to select when copying is refused, or a function that makes it then
function copyText(text, fallbackEl, doneMsg = 'Copied.', then = null) {
  const fallback = () => {
    if (typeof fallbackEl === 'function') fallbackEl = fallbackEl();
    if (fallbackEl && !fallbackEl.select) { const r = document.createRange(); r.selectNodeContents(fallbackEl); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast(`Copy did not work here. The ${fallbackEl.dataset?.copyName || 'answer'} is selected: press Ctrl+C or Cmd+C, or use Copy in your phone's menu.`); }
    else if (fallbackEl) { fallbackEl.focus(); fallbackEl.select(); toast('Copy did not work here. The text is selected: press Ctrl+C or Cmd+C, or use Copy in your phone\'s menu.'); }
    else toast('Copy was blocked here. Select the text and copy it yourself.');
  };
  try {
    if (!navigator.clipboard?.writeText) { fallback(); return; }
    navigator.clipboard.writeText(text).then(() => (then ? then() : toast(doneMsg)), fallback);
  } catch { fallback(); }
}
async function saveFile(filename, data) {
  if (!S.downloads) return;
  try {
    await S.downloads.save({ filename, data });
    toast('Saved.');
  } catch (e) {
    const code = e?.code;
    if (code === 'declined') return;
    if (code === 'rate_limited') { toast('A save is already waiting for your answer.'); return; }
    if (['unavailable', 'not_granted', 'capability_disabled', 'capability_removed'].includes(code)) { S.downloads = null; renderAll(); }
    toast('Could not save the file here. Use Copy instead.');
  }
}

/* ================= actions ================= */
function addTaskAfter(p, mid, afterTid) {
  const m = p.milestones.find((x) => x.id === mid);
  if (!m) return;
  const t = mkTask({}, newIds(p));
  const i = afterTid ? m.tasks.findIndex((x) => x.id === afterTid) : -1;
  if (i >= 0) m.tasks.splice(i + 1, 0, t); else m.tasks.push(t);
  S.focusAfter = fid(`milestones.${mid}.tasks.${t.id}.title`);
  touch(p);
}
// swaps an earlier rule line for its new wording; false when the old line is no longer there
function replaceRule(p, oldRule, rule) {
  const from = '- ' + oldRule;
  const to = '- ' + ruleText(rule);
  const swap = (text) => { const ls = text.split('\n'); const i = ls.findIndex((x) => x.trim() === from); if (i < 0) return null; ls[i] = to; return ls.join('\n'); };
  const conv = swap(p.conventions);
  if (conv == null) return false;
  p.conventions = conv;
  if (p.claudeMdEdited) { const md = swap(p.claudeMd); if (md != null) p.claudeMd = md; }
  return true;
}
// a change to CLAUDE.md reaches Claude Code only through the file in the project's folder
// with no record of what the folder was given, the setup prompt, which merges, is the one to use
const folderPrompt = (p) => (folderGap(p) ? 'the update prompt' : 'the setup prompt');
const seesNew = (it, p) => `Claude Code follows ${it} once your project's folder has the new CLAUDE.md: Project files has ${p ? folderPrompt(p) : 'the update prompt'}.`;
function appendRule(p, rule) {
  if (hasRule(p, rule)) return 'That rule is already in Rules for Claude Code.';
  const line = '- ' + ruleText(rule);
  p.conventions = p.conventions.trim() ? p.conventions.replace(/\s+$/, '') + '\n' + line : line;
  if (!p.claudeMdEdited) return `Added to Rules for Claude Code, in CLAUDE.md. ${seesNew('it', p)}`;
  const heading = '## Lessons learned';
  const ls = p.claudeMd.replace(/\s+$/, '').split('\n');
  const h = ls.findIndex((l) => l.trim() === heading);
  if (h < 0) ls.push('', heading, line);
  else {
    let j = h + 1;
    while (j < ls.length && !/^#{1,6}\s/.test(ls[j])) j++;
    let k = j;
    while (k > h + 1 && !ls[k - 1].trim()) k--;
    ls.splice(k, 0, line);
  }
  p.claudeMd = ls.join('\n') + '\n';
  return `Added under Lessons learned in your CLAUDE.md. ${seesNew('it', p)}`;
}
// runs a change to the rule texts and returns how to undo it: the texts go back as they were if nothing changed them
// since, otherwise `fallback` takes out just this change
function rulesChange(p, change, fallback) {
  const was = { conventions: p.conventions, claudeMd: p.claudeMd };
  const msg = change();
  const now = { conventions: p.conventions, claudeMd: p.claudeMd };
  const changed = was.conventions !== now.conventions || was.claudeMd !== now.claudeMd;
  const undo = (q) => {
    if (!changed) return false;
    if (q.conventions === now.conventions && q.claudeMd === now.claudeMd) { Object.assign(q, was); return true; }
    return fallback(q);
  };
  return { msg, undo, changed };
}
function dropRuleLine(q, rule) {
  const line = '- ' + ruleText(rule);
  let any = false;
  for (const k of ['conventions', 'claudeMd']) {
    if (k === 'claudeMd' && !q.claudeMdEdited) continue;
    const ls = q[k].split('\n');
    const i = ls.findIndex((x) => x.trim() === line);
    if (i >= 0) { ls.splice(i, 1); q[k] = ls.join('\n'); any = true; }
  }
  return any;
}
// after a delete, focus goes to the item above (or below) by its first field, never to another Delete button, so a
// second Enter cannot delete again; with nothing left, to the list's Add button
const DEL_FIELD = { 'del-feature': 'features.$.title', 'del-screen': 'screens.$.name', 'del-decision': 'decisions.$.text', 'del-bug': 'bugs.$.title', 'del-prompt': 'prompts.$.title', 'del-lesson': 'lessons.$.happened', 'del-entity': 'entities.$.name' };
// puts back what an Undo button or Ctrl+Z refers to
function runUndo(u) {
  if (u?.run) { u.run(); return; } // an undo that is not about one project, such as an import
  const p = u && S.projects.get(u.pid);
  if (!p) return;
  const focusId = u.restore(p);
  if (focusId == null) { toast('Nothing to undo: that part was changed again since.'); return; }
  if (S.modal) { // undone from inside a dialog: the page behind it catches up, and focus stays in the dialog
    touch(p); renderSheet();
    focusFirst(['#modal-root .modal-actions .primary:not([disabled])', '#m-title']);
    toast('Undone.');
    return;
  }
  if (u.stay && S.view === 'all') { touch(p); renderAll(); focusFirst(u.focus); toast('Undone.'); return; } // undone on All projects: stay there
  if (S.activeId !== u.pid || S.view === 'all') { S.activeId = u.pid; S.view = 'project'; saveUI(); renderRail(); }
  S.focusAfter = focusId;
  if (!focusId) S.focusSel = [...(u.focus || []), '#tab-' + S.tab];
  touch(p); renderSheet();
  if (focusId && !document.getElementById(focusId)) { // it came back on another tab: show that tab
    const here = S.tab;
    const k = TABS.map((x) => x.k).find((x) => { if (x === here) return false; S.tab = x; renderSheet(); return !!document.getElementById(focusId); });
    if (k) { saveUI(); document.getElementById(focusId).focus(); } else { S.tab = here; renderSheet(); document.getElementById('tab-' + here)?.focus(); }
  }
  toast('Undone.');
}
function nextDel(list, id, act, addSel) {
  const i = list.findIndex((x) => x.id === id);
  const near = list[i - 1] || list[i + 1];
  const f = DEL_FIELD[act];
  return [near && f && '#' + fid(f.replace('$', near.id)), addSel];
}
// moves a task and keeps focus with it; says where it went for screen readers
function moveTaskUI(p, mid, tid, d, toMid) {
  const from = p.milestones.find((x) => x.id === mid);
  const to = toMid ? moveTaskTo(p, mid, tid, toMid) : moveTask(p, mid, tid, d);
  if (!to) return null;
  const base = `milestones.${to.id}.tasks.${tid}`;
  const first = p.milestones[0].tasks[0]?.id === tid;
  const last = p.milestones[p.milestones.length - 1].tasks.at(-1)?.id === tid;
  S.focusAfter = fid(base + (toMid ? '.ms' : S.keyMove ? '.title' : d < 0 ? (first ? '.down' : '.up') : (last ? '.up' : '.down')));
  for (const m of [from, to]) if (m && m.tasks.length && m.tasks.every((t) => t.status === 'done')) S.openMs.add(m.id); // nothing folds under the cursor
  touch(p); renderSheet();
  const k = to.tasks.findIndex((x) => x.id === tid);
  announce(to !== from ? `Moved to Milestone ${msIndex(p, to)}${to.title.trim() ? `: ${oneLine(to.title)}` : ''}, task ${k + 1} of ${to.tasks.length}.` : `Moved ${d < 0 ? 'up' : 'down'}: task ${k + 1} of ${to.tasks.length}.`);
  return to;
}
function announce(msg) {
  const el = $('#sr-live');
  if (!el) return;
  el.textContent = '';
  setTimeout(() => { el.textContent = noBidi(msg); }, 50);
}
const fingerprint = (s) => { const t = str(s); let x = 0x811c9dc5; for (let i = 0; i < t.length; i++) { x ^= t.charCodeAt(i); x = Math.imul(x, 0x01000193); } return (x >>> 0).toString(36) + '.' + t.length.toString(36); };
// the tasks and bugs Shipyard's PLAN.md lists, and whether each is ticked
function planState(p) {
  const tasks = {};
  const bugs = {};
  allTasks(p).forEach((t) => { tasks[t.id] = t.status === 'done' ? 1 : 0; });
  p.bugs.filter((b) => b.title.trim()).forEach((b) => { bugs[b.id] = b.status === 'fixed' ? 1 : 0; });
  return { tasks, bugs };
}
// the folder now has these files as Shipyard makes them; `all`: the setup prompt was used
function handOver(p, keys, all) {
  const f = folderOf(p.folder);
  for (const k of keys) {
    if (k === 'plan') f.plan = { at: today(), ...planState(p) };
    else f.files[k] = fingerprint(repoFileText(p, k));
  }
  if (all) f.setup = true;
  if (same(f, p.folder)) return;
  p.folder = f;
  touch(p);
}
// the setup prompt (or the update prompt, with `keys`) was copied or downloaded
function gaveFiles(p, keys) {
  handOver(p, keys || repoFiles(p).map((f) => f.k), !keys);
  (keys || ['claudemd', 'plan']).filter((k) => ['claudemd', 'plan'].includes(k)).forEach((k) => markCopied(p, k));
}
// how far the folder is behind Shipyard: PLAN.md's tasks added, removed or split, and marked done here (not by a session,
// whose prompt has Claude Code tick it), bugs reported or fixed here, and the other files changed since they were handed
// over. Null when Shipyard has never given the folder anything.
const gapCache = new WeakMap();
function folderGap(p) {
  const f = p.folder || {};
  if (!f.setup && !f.plan && !Object.keys(f.files || {}).length) return null;
  const key = `${p.updatedAt}|${JSON.stringify(f).length}`;
  const hit = gapCache.get(p);
  if (hit && hit.key === key) return hit.g;
  const g = { files: [], add: 0, gone: 0, tick: 0, bugs: 0, blockers: 0, fixed: 0, plan: 0, n: 0 };
  g.files = repoFiles(p).filter((x) => x.k !== 'plan' && (f.files?.[x.k] ? f.files[x.k] !== fingerprint(repoFileText(p, x.k)) : !!f.setup)).map((x) => x.k);
  const fp = f.plan;
  if (fp) {
    const here = new Map(allTasks(p).map((t) => [t.id, t]));
    const logged = new Set(p.sessions.filter((s) => s.outcome === 'done').flatMap((s) => [s.tid, s.bid]).filter(Boolean));
    here.forEach((t) => { if (!(t.id in fp.tasks)) g.add++; else if (t.status === 'done' && !fp.tasks[t.id] && !logged.has(t.id)) g.tick++; });
    Object.entries(fp.tasks).forEach(([id, v]) => { if (!v && !here.has(id)) g.gone++; });
    p.bugs.filter((b) => b.title.trim()).forEach((b) => {
      if (!(b.id in fp.bugs)) { if (b.status === 'open') { g.bugs++; if (b.severity === 'blocker') g.blockers++; } } else if (b.status === 'fixed' && !fp.bugs[b.id] && !logged.has(b.id)) g.fixed++;
    });
    g.plan = g.add + g.gone + g.tick + g.bugs + g.fixed;
  }
  g.n = g.plan + g.files.length;
  gapCache.set(p, { key, g });
  return g;
}
// what the folder's PLAN.md lacks or still has wrong, as a phrase after "its PLAN.md"
function folderGapText(g) {
  const and = (xs) => (xs.length > 1 ? xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1] : xs.join(''));
  const lacks = [];
  if (g.add) lacks.push(`${plural(g.add, 'task', 'tasks')} added here`);
  if (g.bugs) lacks.push(`${plural(g.bugs, 'bug', 'bugs')} reported here${g.blockers ? (g.blockers === g.bugs ? (g.bugs === 1 ? ' (a blocker)' : ' (all blockers)') : ` (${g.blockers} blocking)`) : ''}`);
  const out = [];
  if (lacks.length) out.push(`lacks ${and(lacks)}`);
  if (g.gone) out.push(`still lists ${plural(g.gone, 'task', 'tasks')} you split or deleted here`);
  const undone = [...(g.tick ? [plural(g.tick, 'task', 'tasks')] : []), ...(g.fixed ? [plural(g.fixed, 'bug', 'bugs')] : [])];
  if (undone.length) out.push(`has ${and(undone)} finished here still unticked`);
  return and(out);
}
const fileNames = (p, keys) => { const ns = keys.map((k) => repoFileOf(k, p).name); return ns.length <= 2 ? ns.join(' and ') : `${ns[0]} and ${ns.length - 1} other files`; };
// on Overview: the folder is behind, in one line, with the way to catch it up
function folderLineHTML(p) {
  const g = folderGap(p);
  if (!g?.n) return '';
  const files = g.files.filter((k) => k !== 'plan');
  return `<p class="from big-note folder-behind"><b>Your project's folder is behind.</b> ${g.plan ? `Its PLAN.md ${folderGapText(g)}.${p.copied?.plan ? ' /next works from that file.' : ''}` : ''}${g.plan && files.length ? ' ' : ''}${files.length ? `${esc(fileNames(p, files))} changed here since you last gave ${files.length === 1 ? 'it' : 'them'} to Claude Code.` : ''} <button type="button" class="linkish" data-act="update-folder">Get the update prompt</button></p>`;
}
// the getting-started guide ticks "Save Shipyard's files in your project's folder" once both were copied or downloaded
function markCopied(p, k) {
  handOver(p, [k]);
  if (!['claudemd', 'plan'].includes(k) || p.copied[k]) return;
  p.copied = { ...p.copied, [k]: true };
  touch(p);
}
function findTask(p, mid, tid) {
  const m = p.milestones.find((x) => x.id === mid);
  return { m, t: m?.tasks.find((x) => x.id === tid) };
}
function closeDrawer() {
  $('#app').classList.remove('drawer');
  $('#scrim').hidden = true;
  $('#sheet').inert = false;
  $('[data-act="open-drawer"]')?.setAttribute('aria-expanded', 'false');
}
window.matchMedia('(min-width: 821px)').addEventListener?.('change', (e) => { if (e.matches) closeDrawer(); });

const guessNote = (k) => `${starterOf(k).label} is picked from your idea. Choose another if it fits better.`;
function guessStarter(m, idea) {
  const g = starterGuess(idea);
  if ((!g && !m.starterAuto) || g === m.starter) return;
  m.starter = g; m.starterAuto = !!g;
  const r = document.getElementById('np-st-' + (g || 'none')); if (r) r.checked = true;
  const n = $('#np-guess'); if (n) n.textContent = g ? guessNote(g) : '';
}
function createProject(withAI) {
  const name = ($('#np-name')?.value || '').trim();
  const idea = ($('#np-idea')?.value || '').trim();
  if (!name) { Object.assign(S.modal, { name, idea, error: 'Give the project a name first.', errorFor: 'np-name' }); renderModal(); $('#np-name')?.focus(); return; }
  if (withAI && !idea) { Object.assign(S.modal, { name, idea, error: 'Describe the idea so Claude has something to work from.', errorFor: 'np-idea' }); renderModal(); $('#np-idea')?.focus(); return; }
  const p = blankProject(name, oneLine(idea));
  const src = S.modal.starter === 'like' ? S.projects.get($('#np-like')?.value || S.modal.like || S.activeId) : null;
  const rules = src ? applySetupFrom(p, src) : (applyStarter(p, S.modal.starter), 0);
  openCreated([p], ['#guide-h', '#f-name']);
  if (rules) toast(`${plural(rules, 'rule', 'rules')} written in the CLAUDE.md of ${oneLine(src.name) || 'that project'} ${rules === 1 ? 'is' : 'are'} in Rules for Claude Code too.`);
  if (withAI) aiFillBrief(S.activeId, idea, { fromCreate: true });
}
// stores new projects and opens the first one
// Undo for an import: the projects it made go again, unless one was changed since
function importUndo(ids) {
  const stamp = new Map(ids.map((id) => [id, S.projects.get(id)?.updatedAt]));
  return {
    run: () => {
      const gone = ids.filter((id) => S.projects.has(id) && S.projects.get(id).updatedAt === stamp.get(id));
      if (!gone.length) { toast('Nothing to undo: those projects were changed since.'); return; }
      for (const id of gone) {
        for (const [k, b] of Object.entries(S.busy)) if (k.startsWith(id + ':')) b.ctl.abort();
        Store.remove(id); Away.drop(id);
      }
      if (!S.projects.has(S.activeId)) pickActive();
      saveUI();
      S.focusSel = ['#f-name', '.welcome [data-act="new-project"]', '[data-act="new-project"]'];
      renderAll();
      toast(gone.length === ids.length ? 'Undone.' : `Undone for ${gone.length} of ${ids.length} projects: the others were changed since.`);
    },
  };
}
function openCreated(list, focus = ['#f-name']) {
  const ids = list.map((p) => Store.create(p));
  S.activeId = ids[0];
  S.view = 'project';
  S.tab = 'overview';
  S.confirm = null;
  saveUI();
  S.modal = null;
  closeDrawer();
  renderAll();
  $('#sheet').scrollTop = 0;
  focusFirst(focus);
  return ids;
}
function importProjects(withAI) {
  const m = S.modal;
  const text = $('#np-text')?.value ?? m.text ?? '';
  const d = detectImport(text);
  const fail = (error, field = 'np-text') => { Object.assign(m, { text, error, errorFor: field, name: $('#np-name')?.value ?? m.name }); renderModal(); $('#' + field)?.focus(); };
  if (d.type === 'empty') { fail('Paste something to import first, or open a file.'); return; }
  if (d.type === 'badjson') { fail('This JSON is not a Shipyard backup. Paste a backup made with Back up all projects, or Markdown text.'); return; }
  let list;
  let skipped = 0;
  if (d.type === 'backup') {
    list = d.projects.map((x) => normalize(x));
    const same = hereAlready(list);
    skipped = same.filter(Boolean).length;
    list = list.filter((_, i) => !same[i]);
    if (!list.length) { fail(`${skipped === 1 ? 'The project in this backup is' : `All ${skipped} projects in this backup are`} already here, unchanged. Nothing to import.`); return; }
  }
  else if (d.type === 'shipyard') list = [parseShipyardMd(untermText(text))];
  else {
    const p = parseDoc(text);
    p.name = ($('#np-name')?.value || m.name || '').trim() || p.name || 'Imported project';
    if (keepMd({ ...m, text })) { p.claudeMd = untermText(text).trim() + '\n'; p.claudeMdEdited = true; p.claudeMdOwn = true; p.fromCode = true; p.repoHas = repoHasList(p.repoHas + ' claudemd'); }
    list = [p];
  }
  const names = new Set([...S.projects.values()].map((x) => x.name));
  for (const p of list) {
    if (!p.name.trim()) p.name = 'Imported project';
    if (names.has(p.name)) { // "Name (imported)", then "Name (imported 2)" and so on
      const base = p.name.replace(/ \(imported(?: \d+)?\)$/, '');
      let n = 1;
      let next = `${base} (imported)`;
      while (names.has(next)) next = `${base} (imported ${++n})`;
      p.name = next;
    }
    names.add(p.name);
  }
  { // the account store refuses large projects, and a browser holds only a few MB for all of them: say so now, not after a reload
    const big = list.find((p) => new Blob([JSON.stringify(p)]).size > MAX_BYTES);
    if (big && d.type === 'doc' && big.claudeMdEdited) { fail("This text is too long to keep as the project's CLAUDE.md here. Turn this option off, or shorten the text.", 'np-keepmd'); return; }
    if (big) { fail(list.length > 1 ? `"${big.name}" is too large to save here. Shorten its notes or CLAUDE.md where you made the backup, then back up again.` : 'This is too large to save here. Shorten it, then try again.'); return; }
  }
  const ids = openCreated(list);
  const [id] = ids;
  const found = list.length === 1 ? importSummary(list[0]) : '';
  const undo = importUndo(ids);
  const also = skipped ? ` ${plural(skipped, 'project was', 'projects were')} already here, unchanged, so ${skipped === 1 ? 'it was' : 'they were'} skipped.` : '';
  if (list.length > 1) toast(`Imported ${list.length} projects.${also}`, undo);
  else if (withAI && d.type === 'doc') aiImport(id, text);
  else toast(found ? `Imported. Found ${found}.${also}` : `Imported. Fill in the brief on this tab.${also}`, undo);
}

const actions = {
  'undo': () => {
    const u = undoState;
    undoState = null;
    if (lastUndo === u) lastUndo = null;
    $('#toast').hidden = true;
    runUndo(u);
  },
  'example': () => {
    const id = exampleId();
    if (!id) {
      openCreated([exampleProject(today())], ['#guide-h', '#next-h']);
      toast('This example is part way through its plan. Look around and change anything; delete it when you are done.');
      return;
    }
    S.activeId = id; S.view = 'project'; S.tab = 'overview'; S.confirm = null; S.modal = null; S.openNotes.clear(); S.openMs.clear(); S.openRun.clear(); S.runCap.clear();
    saveUI(); closeDrawer(); renderAll();
    $('#sheet').scrollTop = 0;
    focusFirst(['#guide-h', '#next-h']);
    toast('Here is the example you opened before.');
  },
  'new-project': () => openModal({ kind: 'new' }),
  'open-import': () => openModal({ kind: 'new', mode: 'import', direct: true }), // opened on its own: Cancel, not Back
  'np-mode': (el) => {
    const m = S.modal;
    if (!m) return;
    const name = $('#np-name')?.value;
    if (name != null) m.name = name;
    m.mode = el.dataset.k; m.error = null; m.errorFor = null;
    if (m.mode !== 'import') m.direct = false; // from here, Back leads to New project
    renderModal();
    focusFirst([m.mode === 'import' ? '#np-text' : m.mode === 'survey' ? '#modal-root [data-act="copy-prompt"]' : '#np-name']);
  },
  'np-file': () => $('#np-file')?.click(),
  'import': () => importProjects(false),
  'import-ai': () => importProjects(true),
  'backup': () => openModal({ kind: 'backup', text: backupJSON(sortedProjects().map(([, p]) => p)) }),
  'copy-backup': () => (backedUp(), copyText(S.modal?.text || '', () => { if (!$('#m-backup')) showBackup(); return $('#m-backup'); }, 'Backup copied. Paste it somewhere safe.')),
  'show-backup': () => { showBackup(); $('#m-backup')?.focus(); },
  'download-backup': () => (backedUp(), saveFile(`shipyard-backup-${today()}.json`, S.modal?.text || '')),
  'create': () => createProject(false),
  'create-ai': () => createProject(true),
  'close-modal': closeModal,
  'backdrop': (el, e) => { if (e.target === el && pressedOnBackdrop && !S.modal?.busy && Date.now() - modalOpenedAt > 500) closeModal(); }, // the second click of a double click lands here
  'open-drawer': () => {
    $('#app').classList.add('drawer'); $('#scrim').hidden = false; $('#sheet').inert = true;
    $('[data-act="open-drawer"]')?.setAttribute('aria-expanded', 'true');
    setTimeout(() => focusFirst(['#plist [aria-current="true"]', '#plist button', '#rail [data-act="new-project"]', '#rail [data-act="close-drawer"]']), 30);
  },
  'close-drawer': () => { closeDrawer(); $('[data-act="open-drawer"]')?.focus(); },
  'open': (el) => {
    const fromDrawer = $('#app').classList.contains('drawer');
    const fromDash = S.view === 'all' && !!el.closest('#sheet');
    S.activeId = el.dataset.id; S.view = 'project'; S.confirm = null; S.openNotes.clear(); S.openMs.clear(); S.openRun.clear(); S.runCap.clear();
    saveUI(); closeDrawer();
    if (fromDrawer) S.focusSel = ['[data-act="open-drawer"]'];
    else if (fromDash) S.focusSel = ['#tab-' + S.tab, '#f-name'];
    renderAll();
    $('#sheet').scrollTop = 0;
  },
  'cc-setup': () => {
    const prev = S.modal;
    const m = { kind: 'setup', back: prev && !prev.busy && (prev.kind === 'prompt' || prev.kind === 'export' && prev.saveAll || prev.kind === 'new' && prev.mode === 'survey') ? prev : null };
    if (prev) { if (prev.busy) prev.busy.ctl.abort(); m.opener = prev.opener; m.openerEl = prev.openerEl; S.modal = m; renderModal(); } // the prompt waits behind it
    else openModal(m);
  },
  'cc-back': () => { const b = S.modal?.back; if (!b) return; b.focused = false; S.modal = b; renderModal(); focusFirst(['#modal-root [data-act="copy-prompt"]', '#modal-root [data-act="copy-export"]']); },
  'cc-files': (el, e, p) => { closeModal(); document.activeElement?.blur?.(); S.view = 'project'; S.tab = 'claudemd'; S.repoFile = 'claudemd'; S.confirm = null; saveUI(); closeDrawer(); S.focusSel = ['[data-act="repo-file"][data-k="claudemd"]']; renderAll(); },
  'copy-cmd': (el) => { const k = el.dataset.k; const c = ccCommands(active())[k]; if (c && k !== 'dir') copyText(c, $('#cc-' + k), 'Copied. Paste it into your terminal.'); },
  'ms-retro': (el, e, p) => { if (p.milestones.some((x) => x.id === el.dataset.id)) openModal({ kind: 'retro', mid: el.dataset.id, suggest: null, busy: null }); },
  'rt-ai': () => { if (S.modal?.kind === 'retro') aiRetro(S.modal); },
  'stop-rt': () => S.modal?.busy?.ctl.abort(),
  'rt-copy': (el, e, p) => { const ms = p.milestones.find((x) => x.id === S.modal?.mid); if (ms) copyText(milestoneRecapMd(p, ms), $('#rt-recap'), 'Recap copied as Markdown.'); },
  'rt-accept': (el, e, p) => acceptRetro(p),
  'help': () => openModal({ kind: 'help' }),
  'keep-ok': () => { lsSet(LS_KEEPNOTE, 1); S.focusSel = ['#next-h']; renderSheet(); },
  'claim-add': () => {
    const ids = Store.claimAdd();
    if (ids.length) { S.activeId = ids[0]; S.view = 'project'; S.tab = 'overview'; saveUI(); }
    S.focusSel = ['#f-name', '#tab-overview'];
    renderAll();
    toast(ids.length === 1 ? 'Added to your saved projects.' : `Added ${ids.length} projects to your saved projects.`);
  },
  'claim-drop': () => {
    const kept = Store.claims;
    Store.claimDrop();
    S.focusSel = ['#f-name', '.welcome [data-act="new-project"]', '[data-act="new-project"]'];
    renderAll();
    toast(Object.keys(kept || {}).length === 1 ? 'Removed from this browser.' : 'Removed them from this browser.', {
      run: () => { if (lsSet(LS_UNCLAIMED, kept)) { Store.claims = kept; Store.holdMirror = false; } else { Store.claims = kept; Store.holdMirror = true; } S.focusSel = ['#claim-h']; renderAll(); toast('Undone.'); },
    });
  },
  'whats-new': () => {
    if (S.wnPrev === undefined) S.wnPrev = lsGet(LS_SEEN); // what this browser had seen before, to mark what is new
    S.wnSeen = true; lsSet(LS_SEEN, WN_VER);
    openModal({ kind: 'whatsnew' });
    renderRail();
  },
  'wn-go': (el) => {
    const k = el.dataset.k;
    closeModal();
    if (k === 'all') { if (canDash()) { actions['open-all'](); focusFirst(['#dash-h']); } return; }
    if (k === 'example') { actions.example(); return; }
    if (k === 'setup') { actions['cc-setup'](); return; }
    if (k === 'help') { openModal({ kind: 'help' }); return; }
    if (k === 'survey') { openModal({ kind: 'new', mode: 'survey' }); focusFirst(['#modal-root [data-act="copy-prompt"]']); return; }
    if (k === 'saveall') { if (active()) actions['save-all'](el, null, active()); return; }
    if (k === 'plansync') { if (active()) { S.view = 'project'; closeDrawer(); renderAll(); actions['open-plansync'](); } return; }
    if (k === 'find') { if (active()) { S.view = 'project'; closeDrawer(); renderAll(); openFind(); } return; }
    const [tab, sel, file] = { files: ['claudemd', '.file-tab[aria-pressed="true"]'], target: ['overview', '#f-targetDate'], ask: ['overview', '#ask-q'], agents: ['claudemd', '[data-act="repo-file"][data-k="reviewer"]', 'reviewer'], settings: ['claudemd', '[data-act="repo-file"][data-k="settings"]', 'settings'] }[k] || [];
    if (!tab || !active()) return;
    S.view = 'project'; S.tab = tab; S.confirm = null;
    if (file) S.repoFile = file;
    saveUI(); closeDrawer(); renderAll();
    const t = $(sel);
    if (t) { t.scrollIntoView?.({ block: 'center' }); t.focus(); }
  },
  'open-all': () => {
    const fromDrawer = $('#app').classList.contains('drawer');
    S.view = 'all'; S.confirm = null;
    saveUI(); closeDrawer();
    S.focusSel = fromDrawer ? ['[data-act="open-drawer"]'] : null;
    renderAll();
    $('#sheet').scrollTop = 0;
  },
  'dash-prompt': (el) => dashPrompt(el.dataset.id),
  'dash-split': (el) => {
    const id = el.dataset.id;
    if (!S.projects.has(id)) return;
    S.activeId = id; S.view = 'project'; S.tab = 'overview'; S.confirm = null; S.openNotes.clear(); S.openMs.clear(); S.openRun.clear(); S.runCap.clear();
    saveUI(); closeDrawer(); renderAll();
    $('#sheet').scrollTop = 0;
    openSplit(el.dataset.mid, el.dataset.tid);
  },
  'copy-week': (el, e, p) => {
    const range = { mode: 'week', week: summaryWeek(p, today()).week, since: addDays(today(), -14) };
    openModal({ kind: 'export', range, ...summaryOf(p, range), sub: 'Done tasks, sessions, bugs and what is next, for one week or for everything since a day. Paste it into your notes, a standup or a changelog.' });
  },
  'sum-week': (el, e, p) => {
    const m = S.modal;
    if (!m?.range) return;
    const top = weekOf(today());
    m.range.week = addDays(m.range.week, 7 * Number(el.dataset.d));
    if (m.range.week > top) m.range.week = top;
    sumRefresh(p);
    if (el.disabled) $('[data-act="sum-week"][data-d="-1"]')?.focus();
  },
  'tab': (el) => {
    S.tab = el.dataset.k; S.confirm = null; saveUI(); renderSheet();
    document.getElementById('tab-' + S.tab)?.focus();
  },
  'stage': (el, e, p) => { p.stage = el.dataset.k; touch(p); renderSheet(); },
  'archive': (el, e, p) => {
    p.archived = true; touch(p);
    S.focusSel = ['#unarchive'];
    renderAll();
    toast('Archived. Find it under Show archived at the end of the project list.', { pid: idOf(p), restore: (q) => { if (!q.archived) return null; q.archived = false; renderRail(); return 'f-name'; } });
  },
  'unarchive': (el, e, p) => { p.archived = false; touch(p); S.focusSel = ['#more-btn', '#f-name']; renderAll(); toast('Restored to the project list.'); },
  'skip-to-sheet': () => {
    if ($('#app').classList.contains('drawer')) closeDrawer();
    focusFirst(['#tab-' + S.tab, '#sheet [tabindex="-1"]', '#sheet a[href], #sheet button:not([disabled]), #sheet input, #sheet textarea']);
  },
  'toggle-archived': () => { S.showArchived = !S.showArchived; renderRail(); $('#plist [data-act="toggle-archived"]')?.focus(); },
  'duplicate': (el, e, p) => {
    const c = duplicateProject(p);
    openCreated([c]);
    toast(`Made a copy called "${c.name}". You are in the copy now; the original is unchanged${p.sessions.length ? ' and keeps the session log' : ''}.`);
  },
  'ask-delete': () => { S.confirm = { kind: 'project', id: S.activeId, opener: '#more-btn' }; S.focusSel = ['.phead .confirm [data-act="cancel-confirm"]']; renderSheet(); },
  'cancel-confirm': () => { S.focusSel = [S.confirm?.opener]; S.confirm = null; renderSheet(); },
  'delete-project': () => {
    const id = S.activeId; S.confirm = null;
    const p = S.projects.get(id);
    const seen = Away.rec(id);
    const tab = S.tab;
    for (const [k, b] of Object.entries(S.busy)) if (k.startsWith(id + ':')) b.ctl.abort();
    for (const k of Object.keys(S.proposals)) if (k.startsWith(id + ':')) delete S.proposals[k];
    Store.remove(id); Away.drop(id); pickActive(); saveUI();
    S.focusSel = ['#f-name', '.welcome [data-act="new-project"]', '[data-act="new-project"]'];
    renderAll();
    const name = oneLine(p?.name || '');
    toast(name ? `Project deleted: "${name.length > 60 ? name.slice(0, 59) + '…' : name}".` : 'Project deleted.', p && {
      run: () => {
        if (S.projects.has(id)) return;
        Store.restore(id, p); Away.put(id, seen);
        S.activeId = id; S.view = 'project'; S.tab = tab; S.confirm = null; saveUI();
        S.focusSel = ['#more-btn', '#f-name'];
        renderAll();
        toast('Undone.');
      },
    });
    undoFresh = true;
  },
  'export': (el, e, p) => openModal({ kind: 'export', text: projectMarkdown(p) }),
  'update-folder': (el, e, p) => {
    const g = folderGap(p);
    const keys = g ? [...(g.plan ? ['plan'] : []), ...g.files] : [];
    if (!keys.length) { toast("Your project's folder has everything, as far as Shipyard knows."); return; }
    openModal({ kind: 'export', saveAll: true, keys, text: saveAllPrompt(p, keys), title: "Update your project's folder", label: 'The update prompt, for Claude Code', file: 'update-files-prompt.md',
      sub: `Paste it into Claude Code, started in your project's folder. It updates ${fileNames(p, keys)} there${keys.includes('plan') ? ', keeping the tasks Claude Code ticked and the notes and tasks it added' : ''}. ${keys.some((k) => k !== 'plan' && k !== 'claudemd') ? 'Restart Claude Code afterwards (type /exit, then claude) so it loads the new commands and agents.' : ''}`.trim() });
  },
  'copy-export': (el, e, p) => {
    if (S.modal?.saveAll && p) { gaveFiles(p, S.modal.keys); renderSheet(); } // the guide's step ticks, and the folder is up to date
    copyText(S.modal?.text || '', $('#m-export'), S.modal?.saveAll ? `${S.modal.keys ? 'Update' : 'Setup'} prompt copied. Paste it into Claude Code, started in your project's folder.` : undefined);
  },
  'save-all': (el, e, p) => openModal({ kind: 'export', saveAll: true, text: saveAllPrompt(p), title: 'Setup prompt', label: 'The setup prompt, for Claude Code', file: 'setup-prompt.md',
    sub: `The setup prompt. Paste it into Claude Code, started in your project's folder. It saves ${repoFiles(p).map((f) => f.path).join(', ')}. A CLAUDE.md, PLAN.md or settings.json already there is merged, keeping what it says, and Claude asks before replacing any other file. Restart Claude Code afterwards (type /exit, then run claude) so it loads new commands and subagents.${p.copied?.plan || repoHas(p, 'plan') ? ' If Claude Code has ticked tasks in PLAN.md since, use Update from PLAN.md on the Plan tab first, so Shipyard has them too.' : ''} Copy it again after you change the project.` }),
  'download-export': (el, e, p) => (S.modal?.saveAll ? gaveFiles(p, S.modal.keys) : 0, saveFile(`${slug(p.name)}-${S.modal?.file || 'plan.md'}`, S.modal?.text || projectMarkdown(p))),

  'add-feature': (el, e, p) => { const f = mkFeature({ priority: el.dataset.p }, newIds(p)); p.features.push(f); S.focusAfter = fid(`features.${f.id}.title`); touch(p); renderSheet(); },
  'del-feature': (el, e, p) => {
    const f = p.features.find((x) => x.id === el.dataset.id);
    S.focusSel = f ? nextDel(p.features.filter((x) => x.priority === f.priority), f.id, 'del-feature', `[data-act="add-feature"][data-p="${f.priority}"]`) : [];
    undoable(p, p.features, el.dataset.id, 'Feature', (q) => q.features, (x) => fid(`features.${x.id}.title`));
    touch(p); renderSheet();
  },
  'cycle-feature': (el, e, p) => { const f = p.features.find((x) => x.id === el.dataset.id); if (f) { f.status = NEXT_STATUS[f.status]; delete f.auto; touch(p); renderSheet(); } }, // set by hand: tasks only move it forward
  'add-screen': (el, e, p) => { const s = mkScreen({}, newIds(p)); p.screens.push(s); S.focusAfter = fid(`screens.${s.id}.name`); touch(p); renderSheet(); },
  'del-screen': (el, e, p) => { S.focusSel = nextDel(p.screens, el.dataset.id, 'del-screen', '[data-act="add-screen"]'); undoable(p, p.screens, el.dataset.id, 'Screen', (q) => q.screens, (x) => fid(`screens.${x.id}.name`)); touch(p); renderSheet(); },
  'add-decision': (el, e, p) => { const d = mkDecision({}, newIds(p)); p.decisions.push(d); S.focusAfter = fid(`decisions.${d.id}.text`); touch(p); renderSheet(); },
  'del-decision': (el, e, p) => { S.focusSel = nextDel(p.decisions, el.dataset.id, 'del-decision', '[data-act="add-decision"]'); undoable(p, p.decisions, el.dataset.id, 'Decision', (q) => q.decisions, (x) => fid(`decisions.${x.id}.text`)); touch(p); renderSheet(); },

  'add-ms': (el, e, p) => { const m = mkMilestone({}, newIds(p)); p.milestones.splice(closingAt(p), 0, m); S.focusAfter = fid(`milestones.${m.id}.title`); touch(p); renderSheet(); },
  'ask-del-ms': (el) => { S.confirm = { kind: 'milestone', id: el.dataset.id, opener: `[data-act="ask-del-ms"][data-id="${el.dataset.id}"]` }; renderSheet(); },
  'del-ms': (el, e, p) => {
    const i = p.milestones.findIndex((m) => m.id === el.dataset.id);
    const next = p.milestones[i + 1] || p.milestones[i - 1];
    undoable(p, p.milestones, el.dataset.id, 'Milestone', (q) => q.milestones, (x) => fid(`milestones.${x.id}.title`)); S.confirm = null;
    S.focusSel = [next && '#' + fid(`milestones.${next.id}.title`), '[data-act="add-ms"]'];
    touch(p); renderSheet();
  },
  'ms-move': (el, e, p) => {
    const id = el.dataset.id;
    const i = p.milestones.findIndex((m) => m.id === id);
    const j = i + Number(el.dataset.d);
    if (i < 0 || j < 0 || j >= p.milestones.length) return;
    [p.milestones[i], p.milestones[j]] = [p.milestones[j], p.milestones[i]];
    S.focusSel = [`[data-act="ms-move"][data-id="${id}"]`, '#' + fid(`milestones.${id}.title`)];
    touch(p); renderSheet();
  },
  'add-task': (el, e, p) => { addTaskAfter(p, el.dataset.mid, null); renderSheet(); },
  'move-task': (el, e, p) => moveTaskUI(p, el.dataset.mid, el.dataset.tid, Number(el.dataset.d)),
  'move-to-ms': (el, e, p) => { const s = document.getElementById(el.id.replace(/-msgo$/, '-ms')); if (s && s.value !== el.dataset.mid) moveTaskUI(p, el.dataset.mid, el.dataset.tid, 0, s.value); },
  'del-task': (el, e, p) => {
    const { m } = findTask(p, el.dataset.mid, el.dataset.tid);
    if (!m) return;
    const i = m.tasks.findIndex((t) => t.id === el.dataset.tid);
    const near = m.tasks[i - 1] || m.tasks[i + 1];
    const mid = m.id;
    undoable(p, m.tasks, el.dataset.tid, 'Task', (q) => q.milestones.find((x) => x.id === mid)?.tasks, (t) => fid(`milestones.${mid}.tasks.${t.id}.title`));
    S.focusSel = [near && '#' + fid(`milestones.${mid}.tasks.${near.id}.title`), `[data-act="add-task"][data-mid="${m.id}"]`];
    touch(p); renderSheet();
  },
  'cycle-task': (el, e, p) => {
    const { m, t } = findTask(p, el.dataset.mid, el.dataset.tid);
    if (!t) return;
    const was = { status: t.status, doneAt: t.doneAt, startedAt: t.startedAt };
    t.status = NEXT_STATUS[t.status];
    if (t.status === 'doing') t.startedAt = today();
    if (m.tasks.every((x) => x.status === 'done')) S.openMs.add(m.id); // finishing it here keeps it open under your cursor
    touch(p); renderSheet();
    if (was.status !== 'done') return;
    const chip = fid(`milestones.${m.id}.tasks.${t.id}.st`); // done to To do loses the day it was done: say so, and offer it back
    toast(`"${oneLine(t.title) || 'Untitled task'}" is To do again.`, { pid: idOf(p), restore: (q) => { const qt = findTask(q, m.id, t.id).t; if (!qt || qt.status !== 'todo') return null; Object.assign(qt, was); return chip; } });
  },
  'toggle-ms': (el) => { const k = el.dataset.id; if (S.openMs.has(k)) S.openMs.delete(k); else S.openMs.add(k); S.focusAfter = el.id; renderSheet(); },
  'toggle-run': (el) => { const k = el.dataset.id; if (S.openRun.has(k)) S.openRun.delete(k); else S.openRun.add(k); S.focusAfter = el.id; renderSheet(); },
  'set-task': (el, e, p) => {
    const { m, t } = findTask(p, el.dataset.mid, el.dataset.tid);
    if (!t) return;
    const was = { status: t.status, doneAt: t.doneAt, startedAt: t.startedAt };
    t.status = el.dataset.s;
    if (t.status === 'doing' && was.status !== 'doing') t.startedAt = today();
    const done = t.status === 'done' && was.status !== 'done';
    const back = t.status === 'todo' && was.status === 'doing';
    const chip = fid(`milestones.${m.id}.tasks.${t.id}.st`);
    S.focusSel = done ? ['#next-prompt', '.next [data-act="tab"]', '[data-act="tab"][data-k="plan"]'] : back && el.dataset.row ? ['#' + chip] : ['[data-act="set-task"]', '.next [data-act="prompt"]', '[data-act="tab"][data-k="plan"]'];
    touch(p); renderSheet();
    if (back) {
      toast(`"${oneLine(t.title) || 'Untitled task'}" is back in To do.`, { pid: idOf(p), restore: (q) => { const qt = findTask(q, m.id, t.id).t; if (!qt || qt.status !== 'todo') return null; Object.assign(qt, was); return el.dataset.row ? chip : 'next-prompt'; } });
      return;
    }
    if (!done) return;
    const nu = nextUp(p);
    toast(`"${oneLine(t.title) || 'Untitled task'}" is done.${nu ? ` Next up: ${oneLine(nu.t.title) || 'Untitled task'}.` : ' Every task is done.'}`, {
      pid: idOf(p),
      restore: (q) => { const qt = findTask(q, m.id, t.id).t; if (!qt || qt.status !== 'done') return null; Object.assign(qt, was); return 'next-prompt'; },
    });
  },
  'toggle-notes': (el) => {
    const id = el.dataset.tid;
    if (S.openNotes.has(id)) S.openNotes.delete(id);
    else { S.openNotes.add(id); const mid = el.closest('.task')?.querySelector('.t-title')?.dataset.mid; if (mid) S.focusAfter = fid(`milestones.${mid}.tasks.${id}.notes`); }
    renderSheet();
  },
  'add-bug': (el, e, p) => { const b = mkBug({}, newIds(p)); p.bugs.unshift(b); S.openNotes.add(b.id); S.focusAfter = fid(`bugs.${b.id}.title`); touch(p); renderSheet(); },
  'del-bug': (el, e, p) => {
    const shown = [...p.bugs.filter((b) => b.status === 'open'), ...p.bugs.filter((b) => b.status !== 'open')];
    S.focusSel = nextDel(shown, el.dataset.id, 'del-bug', '[data-act="add-bug"]');
    undoable(p, p.bugs, el.dataset.id, 'Bug', (q) => q.bugs, (x) => fid(`bugs.${x.id}.title`));
    touch(p); renderSheet();
  },
  'toggle-bug': (el, e, p) => {
    const b = p.bugs.find((x) => x.id === el.dataset.id);
    if (!b) return;
    setBugStatus(b, b.status === 'open' ? 'fixed' : 'open');
    if (b.status === 'fixed') S.openNotes.delete(b.id);
    S.focusSel = [`.bugs [data-act="toggle-bug"][data-id="${b.id}"]`, '.next .row > .btn', '[data-act="add-bug"]'];
    touch(p); renderSheet();
    toast(b.status === 'fixed' ? 'Bug marked fixed.' : 'Bug opened again.', bugUndo(p, b));
  },
  'toggle-bug-details': (el) => {
    const id = el.dataset.id;
    if (S.openNotes.has(id)) S.openNotes.delete(id);
    else { S.openNotes.add(id); S.focusAfter = fid(`bugs.${id}.actual`); }
    renderSheet();
  },
  'find': () => openFind(),
  'find-go': (el) => {
    const m = S.modal; const p = active();
    const x = m?.kind === 'find' ? m.hits[+el.dataset.i] : null;
    if (!x || !p) return;
    clearTimeout(m.sayTimer);
    S.modal = null; $('#app').inert = false; renderModal();
    goToHit(p, x);
  },
  'away-ok': () => { Away.clear(S.activeId); S.focusSel = ['#next-prompt', '.next .btn', '#tab-overview']; renderAll(); },
  'show-sessions': () => { S.tab = 'improve'; S.confirm = null; saveUI(); S.focusSel = ['#sessions-h']; renderSheet(); },
  'show-bugs': () => { S.tab = 'plan'; S.confirm = null; saveUI(); S.focusSel = ['.bugs [data-act="toggle-bug"]', '[data-act="add-bug"]']; renderSheet(); },
  'toggle-fixed-bugs': () => { S.showFixed = !S.showFixed; S.focusSel = ['[data-act="toggle-fixed-bugs"]']; renderSheet(); },
  'bug-prompt': (el, e, p) => { const b = p.bugs.find((x) => x.id === el.dataset.id); if (b) openModal({ kind: 'prompt', text: bugPrompt(p, b), bid: b.id, note: bugNote(p, b) }); },
  'bug-fixed': (el, e, p) => {
    const b = p.bugs.find((x) => x.id === el.dataset.id);
    if (!b) return;
    setBugStatus(b, 'fixed');
    S.openNotes.delete(b.id);
    touch(p);
    closeModal();
    S.focusSel = [`.bugs [data-act="toggle-bug"][data-id="${b.id}"]`, '.next .row > .btn', '[data-act="add-bug"]'];
    renderSheet();
    toast('Bug marked fixed.', bugUndo(p, b));
  },
  'prompt': (el, e, p) => { const { m, t } = findTask(p, el.dataset.mid, el.dataset.tid); if (t) openModal({ kind: 'prompt', text: taskPrompt(p, m, t), mid: m.id, tid: t.id, note: historyNote(p, t) }); },
  'copy-prompt': () => {
    const ta = $('#m-prompt');
    const m = S.modal;
    if (m?.kind === 'prompt' && (m.tid || m.bid || m.what)) { S.lastPrompt = { pid: S.activeId, mid: m.mid || '', tid: m.tid || '', bid: m.bid || '', what: m.tid || m.bid ? '' : m.what }; saveUI(); } // Log a session starts there
    const msg = 'Prompt copied. Paste it into Claude Code.';
    const todo = () => { const p = active(); const t = m?.kind === 'prompt' && m.tid && p ? findTask(p, m.mid, m.tid).t : null; return t?.status === 'todo' ? { p, t } : null; };
    copyText(ta ? ta.value : m?.text || '', ta, msg, todo() && (() => {
      const x = todo();
      if (!x) { toast(msg); return; }
      const { p, t } = x;
      t.status = 'doing'; t.startedAt = today(); touch(p); renderSheet();
      toast(`${msg} "${oneLine(t.title) || 'Untitled task'}" is now in progress.`, { pid: idOf(p), restore: (q) => { const y = findTask(q, m.mid, m.tid).t; if (!y || y.status !== 'doing') return null; y.status = 'todo'; return ''; } });
    }));
  },
  'unsharpen': () => { const m = S.modal; if (m?.kind !== 'prompt' || !m.original) return; m.text = m.original; m.sharpened = false; m.original = ''; renderModal(); focusFirst(['#m-prompt']); },
  'sharpen': () => aiSharpen(),
  'quick-prompt': (el, e, p) => { const q = quickFor(p).find((x) => x.k === el.dataset.k); if (q) openModal({ kind: 'prompt', text: quickPrompt(p, q), what: q.label, note: q.note }); },
  'own-prompt': (el, e, p) => {
    const x = p.prompts.find((y) => y.id === el.dataset.id);
    if (!x) return;
    if (!x.text.trim()) { toast('Write the prompt first.'); $('#' + fid(`prompts.${x.id}.text`))?.focus(); return; }
    openModal({ kind: 'prompt', text: x.text.trim(), what: oneLine(x.title) || 'Your prompt', own: true });
  },
  'add-prompt': (el, e, p) => { const x = mkPrompt({}, newIds(p)); p.prompts.push(x); S.focusAfter = fid(`prompts.${x.id}.title`); touch(p); renderSheet(); },
  'del-prompt': (el, e, p) => {
    S.focusSel = nextDel(p.prompts, el.dataset.id, 'del-prompt', '[data-act="add-prompt"]');
    undoable(p, p.prompts, el.dataset.id, 'Prompt', (q) => q.prompts, (x) => fid(`prompts.${x.id}.title`));
    touch(p); renderSheet();
  },
  'stop-sharpen': () => S.modal?.busy?.ctl.abort(),

  'repo-file': (el) => { S.repoFile = el.dataset.k; S.confirm = null; saveUI(); renderSheet(); },
  'copy-file': (el, e, p) => markCopied(p, el.dataset.k) || copyText(repoFileText(p, el.dataset.k), $('#repo-text'), `${repoFileOf(el.dataset.k, p).name} copied.`),
  'download-file': (el, e, p) => markCopied(p, el.dataset.k) || saveFile(repoFileOf(el.dataset.k, p).file, repoFileText(p, el.dataset.k)),
  'open-cmd': (el) => { S.tab = 'claudemd'; S.repoFile = 'cmd:' + el.dataset.id; S.confirm = null; saveUI(); S.focusSel = [`[data-act="repo-file"][data-k="cmd:${el.dataset.id}"]`]; renderSheet(); },
  'save-quick': (el, e, p) => {
    const m = S.modal;
    if (!m || m.kind !== 'prompt' || !m.what || m.saved) return;
    const text = ($('#m-prompt')?.value ?? m.text).trim();
    const x = mkPrompt({ title: m.what, text }, newIds(p));
    p.prompts.push(x); touch(p);
    m.saved = true; m.text = text; renderModal(); renderSheet();
    const c = promptCommands(p).find((y) => y.id === x.id);
    toast(`Saved to your prompts on the Improve tab${c ? `. In Claude Code it can be /${c.slug} (see Project files)` : ''}.`);
  },
  'open-plansync': () => openModal({ kind: 'plansync', text: '' }),
  'ps-file': () => $('#ps-file')?.click(),
  'apply-plansync': (el, e, p) => {
    const text = $('#ps-text')?.value ?? S.modal?.text ?? '';
    const st = planSyncState(text);
    if (!st.ok) return;
    const trial = clone(p); // tried on a copy first: a change too large to save is refused, not shown as done
    applyPlanMd(trial, readPlanMd(trial, text));
    const size = sizeOf(trial);
    if (size > MAX_BYTES) {
      if (S.modal) S.modal.text = text;
      const n = $('#ps-note');
      if (n) { n.textContent = `This adds too much to save: the project would take ${Math.ceil(size / 1000)} KB, and one project can hold ${MAX_BYTES / 1000} KB. Paste a shorter PLAN.md, or move part of the work into a new project.`; n.classList.add('field-error'); }
      el.disabled = true;
      $('#ps-text')?.focus();
      return;
    }
    const u = applyPlanMd(p, st.r);
    { // the folder's PLAN.md has what it said, and now so does Shipyard: the tasks and bugs it added are in both
      const fs = { tasks: { ...st.r.state.tasks }, bugs: { ...st.r.state.bugs } };
      const made = new Set([...u.addedIds, ...p.milestones.filter((x) => u.msIds.includes(x.id)).flatMap((x) => x.tasks.map((t) => t.id))]);
      allTasks(p).forEach((t) => { if (made.has(t.id)) fs.tasks[t.id] = t.status === 'done' ? 1 : 0; });
      p.bugs.forEach((b) => { if (u.bugIds.includes(b.id)) fs.bugs[b.id] = b.status === 'fixed' ? 1 : 0; });
      p.folder = { ...folderOf(p.folder), plan: { at: today(), ...fs } };
    }
    touch(p);
    closeModal();
    renderAll();
    toast(`Plan updated: ${planChangeText(st.r)}.`, { pid: idOf(p), restore: undoPlanSync(u) });
  },
  'log-session': (el) => (el.dataset.nu ? openSession('', '', '', '', { mid: el.dataset.mid, tid: el.dataset.tid }) : openSession(el.dataset.mid, el.dataset.tid, el.dataset.what, el.dataset.bid)),
  'ss-show-done': () => { const m = S.modal; if (m?.kind !== 'session') return; m.showDone = true; renderModal(); $('#ss-task')?.focus(); },
  'ss-alt': () => {
    const m = S.modal;
    if (m?.kind !== 'session' || !m.alt) return;
    Object.assign(m, { mid: m.alt.mid, tid: m.alt.tid, bid: '', other: false, pick: false, alt: null, error: null, errorFor: null });
    restoreDraft(m); renderModal(); focusFirst(['#ss-task']);
  },
  'split-task': (el) => openSplit(el.dataset.mid, el.dataset.tid),
  'guide-field': (el) => {
    let f = document.getElementById(el.dataset.k);
    if (!f && S.tab !== 'overview') { S.tab = 'overview'; S.confirm = null; saveUI(); renderSheet(); f = document.getElementById(el.dataset.k); } // the brief is on Overview
    if (f) { f.focus(); f.scrollIntoView({ block: 'center' }); }
  },
  'guide-all': () => { S.tab = 'overview'; S.confirm = null; saveUI(); S.focusSel = ['#guide-h']; renderSheet(); },
  'guide-ok': (el, e, p) => {
    p.checked = { ...p.checked, [el.dataset.k]: true };
    touch(p);
    S.focusSel = ['.guide [aria-current="step"] .btn', '#guide-h'];
    renderSheet();
  },
  'toggle-more': (el) => {
    S.moreOpen = !S.moreOpen;
    const l = $('#more-list');
    if (l) l.hidden = !S.moreOpen;
    el.setAttribute('aria-expanded', String(S.moreOpen));
  },
  'guide-files': (el) => { S.tab = 'claudemd'; S.repoFile = el.dataset.k; S.confirm = null; saveUI(); S.focusSel = [`[data-act="repo-file"][data-k="${el.dataset.k}"]`]; renderSheet(); },
  'show-guide': (el, e, p) => { p.guideHidden = false; p.guideAgain = p.sessions.length > 0; touch(p); S.focusSel = ['#guide-h']; renderSheet(); },
  'hide-guide': (el, e, p) => {
    p.guideHidden = true; p.guideAgain = false; touch(p);
    S.focusSel = ['.next .row > .btn', '#f-pitch'];
    renderSheet();
    toast('Guide hidden. Show it again from the end of Overview.', { pid: idOf(p), restore: (q) => { if (!q.guideHidden) return null; q.guideHidden = false; q.guideAgain = q.sessions.length > 0; return 'guide-h'; } });
  },
  'chat-send': () => { const q = $('#ask-q')?.value || ''; if (!q.trim()) { $('#ask-q')?.focus(); toast('Type a question first.'); return; } askClaude(S.activeId, q); },
  'chat-idea': (el) => askClaude(S.activeId, el.dataset.q),
  'chat-stop': () => S.busy[S.activeId + ':chat']?.ctl.abort(),
  'chat-copy': (el, e, p) => { const x = p.chat.find((y) => y.id === el.dataset.id); if (x) copyText(x.a, document.getElementById(fid(`chat.${x.id}.a`)), 'Answer copied.'); },
  'chat-clear': (el, e, p) => {
    const was = p.chat.slice();
    p.chat = []; touch(p);
    S.focusSel = ['#ask-q', '#tab-' + S.tab];
    renderSheet();
    toast('Conversation cleared.', { pid: idOf(p), restore: (q) => { if (q.chat.length) return null; q.chat = was; return 'ask-q'; } });
  },
  'plan-feature': (el) => openFeatPlan(el.dataset.id),
  'chat-tasks': (el) => openChatPlan(el.dataset.id),
  'fp-ai': () => { if (S.modal?.kind === 'featplan') aiFeatPlan(S.modal); },
  'stop-fp': () => S.modal?.busy?.ctl.abort(),
  'fp-manual': () => {
    const m = S.modal;
    if (m?.kind !== 'featplan') return;
    if (!m.text.trim() && m.suggest) m.text = m.suggest.tasks.filter((_, i) => m.suggest.sel.has(i)).map((x) => `${x.title} (${x.size})`).join('\n');
    m.mode = 'manual'; renderModal();
    const ta = $('#fp-text'); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  },
  'fp-accept': (el, e, p) => acceptFeatPlan(p),
  'split-ai': () => { if (S.modal?.kind === 'split') aiSplit(S.modal); },
  'stop-split': () => S.modal?.busy?.ctl.abort(),
  'split-manual': () => {
    const m = S.modal;
    if (m?.kind !== 'split') return;
    if (!m.text.trim() && m.suggest) m.text = m.suggest.tasks.filter((_, i) => m.suggest.sel.has(i)).map((x) => `${x.title} (${x.size})`).join('\n');
    m.mode = 'manual'; renderModal();
    const ta = $('#sp-text'); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  },
  'split-accept': (el, e, p) => acceptSplit(p),
  'save-session': () => saveSession(false),
  'save-session-ai': () => saveSession(true),
  'stop-followups': () => S.modal?.busy?.ctl.abort(),
  'session-accept': (el, e, p) => {
    const m = S.modal;
    const s = m?.suggest;
    if (!s) return;
    const seen = newIds(p);
    let ms = p.milestones.find((x) => x.id === m.mid) || ((m.other || m.bid) && nextUp(p)?.m) || p.milestones[p.milestones.length - 1];
    const have = new Set(allTasks(p).map((x) => titleKey(x.title)));
    const picked = s.tasks.filter((t, i) => s.sel.has('t' + i) && !have.has(titleKey(t.title))).map((t) => mkTask({ ...t, id: null, status: 'todo' }, seen));
    let made = null;
    if (!ms && picked.length) { ms = made = mkMilestone({ title: 'Next steps' }, seen); p.milestones.push(ms); }
    if (ms && picked.length) { const i = ms.tasks.findIndex((x) => x.id === m.tid); ms.tasks.splice(i >= 0 ? i + 1 : ms.tasks.length, 0, ...picked); }
    const msgs = [];
    if (picked.length) msgs.push(`Added ${picked.length} ${picked.length === 1 ? 'task' : 'tasks'} to the plan.`);
    let said = '';
    let undoRule = null;
    const l = p.lessons.find((x) => x.id === m.lessonId);
    const lessonWas = l && { change: l.change, promoted: l.promoted, rule: l.rule };
    if (s.rule && s.sel.has('rule')) {
      ({ msg: said, undo: undoRule } = rulesChange(p, () => appendRule(p, s.rule), (q) => dropRuleLine(q, s.rule)));
      // the lesson from this session now has its rule
      if (l && !l.promoted) { l.change = s.rule; l.promoted = true; l.rule = ruleText(s.rule); } // Claude's rule, as added, replaces a draft
      msgs.push(said);
    }
    if (picked.length) msgs.push(/(update|setup) prompt/.test(said) ? `${folderPrompt(p).replace(/^t/, 'T')} adds the new tasks to PLAN.md too.` : `The PLAN.md in your project's folder does not have the new tasks yet: Project files has ${folderPrompt(p)}.`);
    m.toasted = true;
    touch(p); closeModal(); renderAll();
    const undoSession = m.undo?.restore;
    const ids = new Set(picked.map((x) => x.id));
    const snaps = new Map(picked.map((x) => [x.id, sigOf(x)]));
    const ruleAdded = !!undoRule;
    toast(`Session logged. ${msgs.join(' ') || m.savedNote}`, {
      pid: idOf(p),
      restore: (q) => { // what Add put in, when Claude's suggestions were added; otherwise the session itself
        if (!ids.size && !ruleAdded) return undoSession ? undoSession(q) : null;
        const now = allTasks(q).filter((x) => ids.has(x.id));
        if (now.some((x) => sigOf(x) !== snaps.get(x.id))) return null; // edited since: leave them
        let any = false;
        q.milestones.forEach((x) => { for (let k = x.tasks.length - 1; k >= 0; k--) if (ids.has(x.tasks[k].id)) { x.tasks.splice(k, 1); any = true; } });
        if (made) { const k = q.milestones.findIndex((x) => x.id === made.id); if (k >= 0 && !q.milestones[k].tasks.length) q.milestones.splice(k, 1); }
        if (undoRule && undoRule(q)) {
          any = true;
          const ql = lessonWas && q.lessons.find((x) => x.id === m.lessonId);
          if (ql && ql.change === s.rule) Object.assign(ql, lessonWas); // the lesson goes back to what was written in the dialog
        }
        return any ? '' : null;
      },
    });
  },
  'del-session': (el, e, p) => { S.focusSel = nextDel(p.sessions.slice().reverse(), el.dataset.id, 'del-session', '[data-act="log-session"]'); undoable(p, p.sessions, el.dataset.id, 'Session', (q) => q.sessions, (x) => fid(`sessions.${x.id}.del`)); touch(p); renderSheet(); },
  'toggle-session': (el) => {
    const id = el.dataset.id;
    if (S.openSessions.has(id)) S.openSessions.delete(id); else S.openSessions.add(id);
    S.focusSel = [`[data-act="toggle-session"][data-id="${id}"]`];
    renderSheet();
  },
  'toggle-all-lessons': () => { S.allLessons = !S.allLessons; S.focusSel = ['[data-act="toggle-all-lessons"]']; renderSheet(); },
  'toggle-all-sessions': () => { S.allSessions = !S.allSessions; S.focusSel = ['[data-act="toggle-all-sessions"]']; renderSheet(); },
  'copy-md': (el, e, p) => { markCopied(p, 'claudemd'); copyText(p.claudeMdEdited ? p.claudeMd : buildClaudeMd(p), $('#f-claudeMd'), 'CLAUDE.md copied.'); },
  'download-md': (el, e, p) => { markCopied(p, 'claudemd'); saveFile('CLAUDE.md', p.claudeMdEdited ? p.claudeMd : buildClaudeMd(p)); },
  'ask-rebuild': () => { S.confirm = { kind: 'rebuild', opener: '[data-act="ask-rebuild"]' }; renderSheet(); },
  'rebuild-md': (el, e, p) => {
    const was = { claudeMd: p.claudeMd, claudeMdEdited: p.claudeMdEdited, claudeMdOwn: p.claudeMdOwn };
    p.claudeMdEdited = false; p.claudeMd = ''; p.claudeMdOwn = false; S.confirm = null; S.focusSel = ['[data-act="copy-md"]']; touch(p); renderSheet();
    toast('CLAUDE.md is built from the project again.', { pid: idOf(p), restore: (q) => { if (q.claudeMdEdited) return null; Object.assign(q, was); S.repoFile = 'claudemd'; return 'f-claudeMd'; } });
  },

  'add-lesson': (el, e, p) => { const l = mkLesson({}, newIds(p)); p.lessons.unshift(l); S.focusAfter = fid(`lessons.${l.id}.happened`); touch(p); renderSheet(); },
  'del-lesson': (el, e, p) => { S.focusSel = nextDel(p.lessons, el.dataset.id, 'del-lesson', '[data-act="add-lesson"]'); undoable(p, p.lessons, el.dataset.id, 'Lesson', (q) => q.lessons, (x) => fid(`lessons.${x.id}.happened`)); touch(p); renderSheet(); },
  'promote': (el, e, p) => {
    const l = p.lessons.find((x) => x.id === el.dataset.id);
    if (!l) return;
    if (!l.change.trim()) { toast('First write what to do differently. That line becomes the rule.'); document.getElementById(fid(`lessons.${l.id}.change`))?.focus(); return; }
    const was = { promoted: l.promoted, rule: l.rule };
    let swapped = false;
    const r = rulesChange(p, () => ((swapped = !!(l.promoted && l.rule && replaceRule(p, l.rule, l.change))) ? `Rule updated in CLAUDE.md. ${seesNew('it', p)}` : appendRule(p, l.change)),
      (q) => (swapped ? replaceRule(q, ruleText(l.change), was.rule) : dropRuleLine(q, l.change)));
    l.promoted = true; l.rule = ruleText(l.change); S.promotedNow.add(l.id); S.focusSel = [`[data-act="promote"][data-id="${l.id}"]`, `[data-act="del-lesson"][data-id="${l.id}"]`]; touch(p); renderSheet();
    toast(r.msg, r.changed ? { pid: idOf(p), restore: (q) => { if (!r.undo(q)) return null; const ql = q.lessons.find((x) => x.id === l.id); if (ql) Object.assign(ql, was); return ql ? fid(`lessons.${ql.id}.change`) : ''; } } : undefined);
  },
  'review-add': (el, e, p) => {
    const s = p.lastReview?.suggestions[Number(el.dataset.i)];
    if (!s || s.added) return;
    const i = Number(el.dataset.i);
    let msg;
    let undo;
    if (s.type === 'feature') {
      const f = mkFeature({ title: s.title, detail: s.why, priority: 'should' }, newIds(p));
      p.features.push(f); msg = 'Added to Should have on the Design tab.';
      undo = (q) => { const k = q.features.findIndex((x) => x.id === f.id); if (k < 0) return false; q.features.splice(k, 1); return true; };
    } else if (s.type === 'rule') {
      const r = rulesChange(p, () => appendRule(p, s.title), (q) => dropRuleLine(q, s.title));
      msg = r.msg; undo = r.changed ? r.undo : null;
    } else {
      let m = p.milestones.find((x) => x.title === 'Improvements');
      let made = null;
      if (!m) { m = made = mkMilestone({ title: 'Improvements', goal: 'Fixes and upgrades suggested in reviews.' }, newIds(p)); p.milestones.splice(closingAt(p), 0, m); }
      const t = mkTask({ title: s.title, notes: s.why, size: 'S' }, newIds(p));
      m.tasks.push(t);
      msg = 'Added to the Improvements milestone on the Plan tab.';
      undo = (q) => {
        let any = false;
        q.milestones.forEach((x) => { const k = x.tasks.findIndex((y) => y.id === t.id); if (k >= 0) { x.tasks.splice(k, 1); any = true; } });
        if (made) { const k = q.milestones.findIndex((x) => x.id === made.id); if (k >= 0 && !q.milestones[k].tasks.length) q.milestones.splice(k, 1); }
        return any;
      };
    }
    s.added = true; S.focusSel = ['[data-act="review-add"]', '[data-act="ai-review"]']; touch(p); renderSheet();
    toast(msg, undo ? { pid: idOf(p), focus: ['[data-act="review-add"]', '[data-act="ai-review"]'], restore: (q) => { if (!undo(q)) return null; const qs = q.lastReview?.suggestions?.[i]; if (qs && qs.title === s.title) qs.added = false; return ''; } } : undefined);
  },

  'ai-fill': (el, e, p) => aiFillBrief(S.activeId, [p.pitch, p.problem].filter((x) => x.trim()).join('\n')),
  'ai-fill-md': (el, e, p) => aiImport(S.activeId, p.claudeMd),
  'ai-plan': () => { if (S.tab !== 'plan') { S.tab = 'plan'; saveUI(); } aiPlan(S.activeId); },
  'ai-features': () => aiFeatures(S.activeId),
  'ai-model': () => aiModel(S.activeId),
  'add-entity': (el, e, p) => { const x = mkEntity({}, newIds(p)); p.entities.push(x); S.focusAfter = fid(`entities.${x.id}.name`); touch(p); renderSheet(); },
  'del-entity': (el, e, p) => {
    S.focusSel = nextDel(p.entities, el.dataset.id, 'del-entity', '[data-act="add-entity"]');
    undoable(p, p.entities, el.dataset.id, 'Thing', (q) => q.entities, (x) => fid(`entities.${x.id}.name`));
    touch(p); renderSheet();
  },
  'ai-review': () => aiReview(S.activeId),
  'stop': (el) => S.busy[el.dataset.key]?.ctl.abort(),
  'prop-accept': (el, e, p) => {
    const kind = el.dataset.kind;
    const key = S.activeId + ':' + kind;
    const pr = S.proposals[key];
    if (!pr) return;
    const picked = pr.items.filter((_, i) => pr.sel.has(i));
    const seen = newIds(p);
    // ids were minted when the answer arrived; re-check them against edits made since
    const fresh = kind === 'plan' ? picked.map((m) => mkMilestone(m, seen)) : kind === 'model' ? picked.map((x) => mkEntity(x, seen)) : picked.map((f) => mkFeature(f, seen));
    if (kind === 'plan') p.milestones.splice(closingAt(p), 0, ...fresh); else if (kind === 'model') p.entities.push(...fresh); else p.features.push(...fresh);
    delete S.proposals[key]; S.focusSel = [`[data-act="ai-${kind}"]`]; touch(p); renderSheet();
    const noun = { plan: ['milestone', 'milestones'], model: ['thing to the data model', 'things to the data model'] }[kind] || ['feature', 'features'];
    const ids = new Set(fresh.map((x) => x.id));
    const snaps = new Map(fresh.map((x) => [x.id, sigOf(x)]));
    toast(`Added ${fresh.length} ${noun[fresh.length === 1 ? 0 : 1]}.`, {
      pid: idOf(p), focus: [`[data-act="ai-${kind}"]`],
      restore: (q) => {
        const list = kind === 'plan' ? q.milestones : kind === 'model' ? q.entities : q.features;
        if (list.some((x) => ids.has(x.id) && sigOf(x) !== snaps.get(x.id))) return null; // edited since: leave them
        const n = list.length;
        for (let k = list.length - 1; k >= 0; k--) if (ids.has(list[k].id)) list.splice(k, 1);
        return list.length < n ? '' : null;
      },
    });
  },
  'prop-discard': (el) => { delete S.proposals[S.activeId + ':' + el.dataset.kind]; S.focusSel = [`[data-act="ai-${el.dataset.kind}"]`]; renderSheet(); },
};
const NO_PROJECT_NEEDED = new Set(['cc-setup', 'cc-back', 'copy-cmd', 'stop-rt', 'whats-new', 'help', 'claim-add', 'claim-drop', 'keep-ok', 'wn-go', 'dash-split', 'example', 'open-all', 'dash-prompt', 'chat-stop', 'stop-fp', 'toggle-archived', 'stop-followups', 'stop-split', 'undo', 'new-project', 'open-import', 'np-mode', 'np-file', 'import', 'import-ai', 'backup', 'copy-backup', 'show-backup', 'download-backup', 'skip-to-sheet', 'create', 'create-ai', 'close-modal', 'backdrop', 'open-drawer', 'close-drawer', 'open', 'tab', 'cancel-confirm', 'copy-export', 'copy-prompt', 'unsharpen', 'sharpen', 'stop-sharpen', 'stop', 'prop-discard', 'ask-del-ms', 'ask-rebuild', 'ask-delete', 'toggle-notes']);

let pressedOnBackdrop = false;
document.addEventListener('pointerdown', (e) => { pressedOnBackdrop = !!e.target.classList?.contains('modal-wrap'); });
// the project's More menu closes on any other click, and on Escape
function closeMore() {
  S.moreOpen = false;
  const l = $('#more-list');
  if (l) l.hidden = true;
  $('#more-btn')?.setAttribute('aria-expanded', 'false');
}
document.addEventListener('focusout', (e) => {
  if (S.moreOpen && e.target.closest?.('.more') && e.relatedTarget && !e.relatedTarget.closest?.('.more')) closeMore();
});
document.addEventListener('click', (e) => {
  if (S.moreOpen && !e.target.closest('[data-act="toggle-more"]')) closeMore();
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const act = el.dataset.act;
  if (act === 'prop-toggle' || act === 'session-pick' || act === 'split-pick' || act === 'fp-pick' || act === 'rt-pick') return; // handled on change
  const fn = actions[act];
  if (!fn) return;
  const p = active();
  if (!NO_PROJECT_NEEDED.has(act) && !p) return;
  fn(el, e, p);
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.matches?.('[data-act="prop-toggle"]')) {
    const pr = S.proposals[S.activeId + ':' + el.dataset.kind];
    if (!pr) return;
    const i = Number(el.dataset.i);
    if (el.checked) pr.sel.add(i); else pr.sel.delete(i);
    const btn = $(`[data-act="prop-accept"][data-kind="${el.dataset.kind}"]`);
    if (btn) { btn.textContent = propBtnText(el.dataset.kind, pr.sel.size); btn.disabled = !pr.sel.size; }
    return;
  }
  if (S.modal && el.name === 'np-starter') {
    const was = S.modal.starter;
    S.modal.starter = el.value;
    S.modal.starterSet = true; S.modal.starterAuto = false;
    const gn = $('#np-guess'); if (gn) gn.textContent = '';
    if ((was === 'like') !== (el.value === 'like')) renderModal();
    return;
  }
  if (S.modal && el.id === 'np-like') { S.modal.like = el.value; return; }
  if (S.modal?.range && el.name === 'sum-mode') { S.modal.range.mode = el.value; sumRefresh(active()); return; }
  if (S.modal?.range && el.id === 'sum-since') { if (el.value) { S.modal.range.since = el.value; sumRefresh(active()); } return; }
  if (S.modal && el.name === 'ss-outcome') { S.modal.outcome = el.value; S.modal.outcomeSet = true; return; } // chosen by hand: a pasted report no longer changes it
  if (S.modal && el.id === 'ss-task') {
    const m = S.modal;
    const was = ssKind(m);
    const wasPick = m.pick;
    m.pick = false;
    if (m.alt) { m.alt = null; $('#ss-alt')?.remove(); } // chosen by hand
    m.other = el.value === 'other';
    m.bid = el.value.startsWith('bug:') ? el.value.slice(4) : '';
    if (!m.other && !m.bid) [m.mid, m.tid] = el.value.split(':');
    const back = restoreDraft(m);
    if (wasPick || was !== ssKind(m) || back) { m.error = null; m.errorFor = null; renderModal(); if (m.other && was !== 'other') $('#ss-what')?.focus(); }
    else { const sub = $('#m-sub'); if (sub) sub.textContent = sessionSub(m, active()); }
    return;
  }
  if (S.modal?.suggest && el.matches?.('[data-act="session-pick"]')) {
    const sel = S.modal.suggest.sel;
    if (el.checked) sel.add(el.dataset.k); else sel.delete(el.dataset.k);
    const b = $('[data-act="session-accept"]'); if (b) { b.textContent = fuBtnText(sel); b.disabled = !sel.size; }
    return;
  }
  if (S.modal?.kind === 'featplan' && S.modal.suggest && el.matches?.('[data-act="fp-pick"]')) {
    const sel = S.modal.suggest.sel;
    const k = Number(el.dataset.k);
    if (el.checked) sel.add(k); else sel.delete(k);
    const b = $('[data-act="fp-accept"]'); if (b) { b.textContent = fpBtnText(sel.size); b.disabled = !sel.size; }
    return;
  }
  if (S.modal?.kind === 'featplan' && el.id === 'fp-to') { S.modal.to = el.value; return; }
  if (S.modal?.kind === 'retro' && S.modal.suggest && el.matches?.('[data-act="rt-pick"]')) {
    const sel = S.modal.suggest.sel;
    const k = Number(el.dataset.k);
    if (el.checked) sel.add(k); else sel.delete(k);
    const b = $('[data-act="rt-accept"]'); if (b) { b.textContent = rtBtnText(sel.size); b.disabled = !sel.size; }
    return;
  }
  if (S.modal?.kind === 'split' && S.modal.suggest && el.matches?.('[data-act="split-pick"]')) {
    const sel = S.modal.suggest.sel;
    const k = Number(el.dataset.k);
    if (el.checked) sel.add(k); else sel.delete(k);
    const b = $('[data-act="split-accept"]'); if (b) { b.textContent = splitBtnText(sel.size); b.disabled = !sel.size; }
    return;
  }
  if (S.modal && el.id === 'np-keepmd') { S.modal.keepMd = el.checked; return; }
  if (el.matches?.('[data-act="move-task-to"]')) { const b = document.getElementById(el.id.replace(/-ms$/, '-msgo')); if (b) b.disabled = el.value === el.dataset.mid; return; } // arrow keys fire change: move only on Move
  if (S.modal && el.id === 'np-file') { readImportFile(el.files?.[0]); return; }
  if (S.modal?.kind === 'plansync' && el.id === 'ps-file') { readPlanFile(el.files?.[0]); return; }
  if (S.modal?.kind === 'plansync' && el.classList?.contains('ps-part')) {
    S.modal.parts = new Set([...document.querySelectorAll('.ps-part:checked')].map((x) => x.value));
    const st = planSyncState($('#ps-text')?.value ?? S.modal.text);
    const n = $('#ps-note'); if (n) n.textContent = st.note;
    const b = $('[data-act="apply-plansync"]'); if (b) b.disabled = !st.ok;
    return;
  }
  if (el.matches?.('select[data-path], input[type="checkbox"][data-path]')) bindValue(el, true);
});
function readImportFile(file) {
  const m = S.modal;
  if (!file || !m) return;
  if (file.size > 2e6) { m.error = 'That file is too large to import. Pick a file under 2 MB.'; m.errorFor = 'np-text'; renderModal(); return; }
  const r = new FileReader();
  r.onload = () => {
    if (S.modal !== m) return;
    m.text = str(r.result); m.error = null; m.errorFor = null;
    renderModal();
    focusFirst(['#np-name', '[data-act="import"]']);
  };
  r.onerror = () => { if (S.modal === m) { m.error = 'Could not read that file. Try pasting its text instead.'; m.errorFor = 'np-text'; renderModal(); } };
  r.readAsText(file);
}
const MODAL_FIELDS = { 'np-name': 'name', 'np-idea': 'idea', 'm-prompt': 'text', 'np-text': 'text', 'ps-text': 'text', 'ss-summary': 'summary', 'ss-wrong': 'wrong', 'ss-rule': 'rule', 'ss-date': 'date', 'sp-text': 'text', 'ss-what': 'what', 'fp-text': 'text' };
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.id === 'psearch') { S.query = el.value; renderRail(); return; }
  if (el.id === 'ask-q') { S.askDraft[S.activeId] = el.value; return; }
  if (el.id === 'find-q' && S.modal?.kind === 'find') {
    const m = S.modal; const p = active();
    m.q = el.value; S.findQ = el.value; m.hits = p ? findIn(p, m.q) : [];
    $('#find-results').innerHTML = findResultsHTML(m);
    const n = findCount(m); const st = $('#find-n');
    clearTimeout(m.sayTimer); // said once typing pauses
    m.sayTimer = setTimeout(() => { if (st && st.textContent !== n) st.textContent = n; }, 400);
    return;
  }
  if (S.modal && MODAL_FIELDS[el.id]) {
    S.modal[MODAL_FIELDS[el.id]] = el.value;
    if (el.id === 'np-text') syncImportDialog(el.value);
    if (el.id === 'np-idea' && S.modal.kind === 'new' && !S.modal.starterSet) guessStarter(S.modal, el.value);
    if (el.id === 'ss-summary') fillFromReport(S.modal);
    if (el.id === 'ss-wrong') S.modal.wrongAuto = false;
    if (el.id === 'fp-text') {
      const n = parseSplitLines(el.value).length;
      const c = $('#fp-count'); if (c) c.textContent = splitCountText(n, el.value);
      const b = $('[data-act="fp-accept"]'); if (b) { b.textContent = fpBtnText(n); b.disabled = !n; }
    }
    if (el.id === 'sp-text') {
      const n = parseSplitLines(el.value).length;
      const c = $('#sp-count'); if (c) c.textContent = splitCountText(n, el.value);
      const b = $('[data-act="split-accept"]'); if (b) { b.textContent = splitBtnText(n); b.disabled = !n; }
    }
    if (el.id === 'ps-text') {
      const st = planSyncState(el.value);
      const n = $('#ps-note'); if (n) { n.textContent = st.note; n.classList.remove('field-error'); }
      const sp = $('#ps-split'); if (sp) sp.innerHTML = splitPickHTML(st.r);
      const b = $('[data-act="apply-plansync"]'); if (b) b.disabled = !st.ok;
    }
    return;
  }
  if (!el.matches?.('[data-path]') || el.matches('select, input[type="checkbox"]')) return;
  if (el.classList.contains('one') && /\n/.test(el.value)) el.value = el.value.replace(/\s*\n+\s*/g, ' ').trim(); // pasted lines join up
  if (growable(el)) grow(el);
  bindValue(el, false);
});
function bindValue(el, isChange) {
  const p = active();
  if (!p) return;
  const path = el.dataset.path;
  const val = el.type === 'checkbox' ? el.checked : el.value;
  const hadPitch = !!p.pitch.trim();
  const guideSig = () => (guideOpen(p) ? guideSteps(p).map((s) => (s.done ? '1' : `0${s.hint}`)).join('|') : '');
  const hadGuide = guideSig();
  const lessonBefore = /^lessons\.[^.]+\.change$/.test(path) ? p.lessons.find((x) => x.id === path.split('.')[1])?.change || '' : '';
  setPath(p, path, val);
  if (path === 'repo' && noCreds(val) !== val) { // pasted with a password or token in it
    p.repo = noCreds(val); el.value = p.repo;
    toast('Took the password or token out of the GitHub link. Keep those out of the plan: everyone who can open it sees them, and CLAUDE.md is committed.');
  }
  if (path !== 'repo' && hasSecret(val) && !(S.secretWarned ||= new Set()).has(path)) { // once per field
    S.secretWarned.add(path);
    toast('That looks like a key or password. Shipyard hides it from Claude, but it stays in the plan, where anyone you share it with sees it, and in files you commit. Keep it in a .env file instead.');
  }
  if (p.fromCode && /^features\./.test(path) && !p.checked?.features) p.checked = { ...p.checked, features: true }; // editing them is checking them
  let rerender = isChange && el.hasAttribute('data-rerender');
  if (path === 'claudeMd') {
    // only a real change counts as an edit; typing it back to the generated text undoes the edit
    const was = p.claudeMdEdited;
    p.claudeMdEdited = val !== buildClaudeMd(p);
    if (!p.claudeMdEdited) { p.claudeMd = ''; p.claudeMdOwn = false; }
    if (was !== p.claudeMdEdited) rerender = true;
  }
  const lm = /^lessons\.([^.]+)\.change$/.exec(path);
  if (lm) { const l = p.lessons.find((x) => x.id === lm[1]); if (l?.promoted && l.rule && (l.rule === ruleText(val)) !== (l.rule === ruleText(lessonBefore))) rerender = true; }
  if (path === 'pitch' && hadPitch !== !!p.pitch.trim() && S.tab === 'overview') rerender = true; // shows or hides the Claude buttons
  if (path === 'targetDate' && S.tab === 'overview' && !rerender) { // only Progress changes: the date field keeps its place
    const old = $('#panel .progress'); const html = progressHTML(p);
    if (old) { if (html) old.outerHTML = html; else old.remove(); } else if (html) $('#panel .stack > .grid-2')?.insertAdjacentHTML('afterend', html);
  }
  if (/^prompts\./.test(path)) syncCmdLinks(p);
  if (!rerender && hadGuide !== guideSig()) { // ticks a step, such as "Fill in the brief" or "List the must-haves"
    const g = $('#panel .guide'); if (g) g.outerHTML = guideHTML(p);
    const gb = $('#panel .guide-bar'); if (gb) gb.outerHTML = guideBarHTML(p);
  }
  if (path === 'name') { const t = $('#phead-h'); if (t) t.textContent = p.name.trim() || 'Untitled project'; }
  touch(p);
  if (rerender) renderSheet();
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (S.modal) { if (!S.modal.busy) closeModal(); else $('#modal-root [data-act^="stop"]:not([disabled])')?.click(); return; }
    if (S.moreOpen) { closeMore(); $('#more-btn')?.focus(); return; }
    if (e.target.id === 'psearch' && e.target.value) { e.target.value = ''; S.query = ''; renderRail(); return; }
    if ($('#app').classList.contains('drawer')) { closeDrawer(); $('[data-act="open-drawer"]')?.focus(); return; }
    if (S.confirm) { S.focusSel = [S.confirm.opener]; S.confirm = null; renderSheet(); }
    return;
  }
  if (e.key === 'Tab') { // keep Tab inside the open dialog or phone drawer; a dialog's Tab also reaches the toast's Undo
    const box = S.modal ? $('#modal-root .modal') : $('#app').classList.contains('drawer') ? $('#rail') : null;
    if (box) {
      const list = [...box.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter((x) => !x.disabled && x.getClientRects().length);
      const tb = S.modal && $('#toast:not([hidden]) .toast-btn');
      if (tb) list.push(tb);
      if (!list.length) { e.preventDefault(); return; }
      const first = list[0]; const last = list[list.length - 1]; const at = document.activeElement;
      if (!list.includes(at) || (e.shiftKey ? at === first : at === last)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
      return;
    }
  }
  if (!S.modal && active() && S.view !== 'all' && !e.altKey && !e.shiftKey && (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.target.matches?.('input, textarea, select, [contenteditable="true"]')))) {
    e.preventDefault(); openFind(); return;
  }
  if (e.key === '?' && !S.modal && !e.ctrlKey && !e.metaKey && !e.altKey && !e.target.matches?.('input, textarea, select, [contenteditable="true"]')) {
    e.preventDefault(); openModal({ kind: 'help' }); return;
  }
  if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'z' && lastUndo && (undoFresh || !e.target.matches?.('input, textarea, select, [contenteditable="true"]'))) {
    e.preventDefault(); // typing keeps the browser's own undo
    const u = lastUndo;
    lastUndo = null; undoState = null; $('#toast').hidden = true;
    runUndo(u);
    return;
  }
  const el = e.target;
  if (el.matches?.('.tab') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
    e.preventDefault();
    const i = TABS.findIndex((t) => t.k === el.dataset.k);
    const n = TABS.length;
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + n) % n;
    S.tab = TABS[j].k; S.confirm = null; saveUI(); renderSheet();
    document.getElementById('tab-' + S.tab)?.focus();
    return;
  }
  if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && el.matches?.('.t-title')) {
    e.preventDefault();
    const p = active(); if (!p) return;
    const [s0, s1] = [el.selectionStart, el.selectionEnd];
    const tid = el.dataset.tid;
    S.keyMove = true;
    const to = moveTaskUI(p, el.dataset.mid, tid, e.key === 'ArrowUp' ? -1 : 1);
    S.keyMove = false;
    const ta = document.getElementById(fid(`milestones.${(to || { id: el.dataset.mid }).id}.tasks.${tid}.title`));
    if (ta) { ta.focus(); try { ta.setSelectionRange(s0, s1); } catch { /* gone */ } }
    return;
  }
  if (e.key === 'Enter' && !e.isComposing && el.matches?.('.t-title')) {
    e.preventDefault();
    const p = active(); if (!p) return;
    addTaskAfter(p, el.dataset.mid, el.dataset.tid);
    renderSheet();
    return;
  }
  if (e.key === 'Enter' && !e.isComposing && el.matches?.('textarea.one')) { e.preventDefault(); return; } // one-line fields wrap but take no line breaks
  // Enter and Ctrl+Enter do what the dialog's main button does
  const importMain = () => importProjects(canAsk() && S.modal?.detType === 'doc');
  if (e.key === 'Enter' && !e.isComposing && el.id === 'find-q') { e.preventDefault(); $('#find-results .find-hit')?.click(); return; }
  if (e.key === 'ArrowDown' && el.id === 'find-q') { const f = $('#find-results .find-hit'); if (f) { e.preventDefault(); f.focus(); } return; }
  if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && el.matches?.('.find-hit')) {
    e.preventDefault();
    const all = [...document.querySelectorAll('#find-results .find-hit')]; const i = all.indexOf(el);
    const to = e.key === 'ArrowDown' ? all[i + 1] : i > 0 ? all[i - 1] : $('#find-q');
    to?.focus();
    return;
  }
  if (e.key === 'Enter' && !e.isComposing && el.id === 'np-name') { e.preventDefault(); if (S.modal?.mode === 'import') importMain(); else $('#np-idea')?.focus(); return; }
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && el.id === 'np-idea') { e.preventDefault(); createProject(canAsk()); }
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && el.id === 'np-text') { e.preventDefault(); importMain(); }
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && el.id === 'ask-q') { e.preventDefault(); if (!S.busy[S.activeId + ':chat']) actions['chat-send'](); return; }
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && el.id === 'fp-text') { e.preventDefault(); $('[data-act="fp-accept"]:not([disabled])')?.click(); }
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && el.id === 'sp-text') { e.preventDefault(); $('[data-act="split-accept"]:not([disabled])')?.click(); }
});

/* ================= boot ================= */
renderAll();
Store.init();
initCapabilities();
})();
