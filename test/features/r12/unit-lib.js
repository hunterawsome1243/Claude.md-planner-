// Loads the pure parts of an app.js into Node for fast checks.
const fs = require('fs'); const path = require('path');
const file = process.env.APPJS || path.join(__dirname, '..', '..', '..', 'src', 'app.js');
const src = fs.readFileSync(file, 'utf8').split('\n');
const end = src.findIndex((l) => l.startsWith('/* ================= health'));
// CHAT_KEEP (how many exchanges are kept) sits further down app.js; bring it along
const keep = src.find((l) => /^const CHAT_KEEP = \d+;$/.test(l)) || 'const CHAT_KEEP = 6;';
const body = keep + '\n' + src.slice(3, end).join('\n') + '\nfunction isPlain(v) { return !!v && typeof v === "object" && !Array.isArray(v); }\n'
  + 'return { CHAT_KEEP, mdLite, chatMessages, moveTask, moveTaskTo, parseSplitLines, readPlanMd, applyPlanMd, undoPlanSync, buildPlanMd, nextCommandMd, safeCommands, settingsJson, parseDoc, parseShipyardMd, projectMarkdown, normalize, blankProject, applyStarter, mkTask, mkMilestone, mkBug, planChangeText };';
module.exports = new Function('localStorage', 'document', 'window', body)({}, {}, {});
