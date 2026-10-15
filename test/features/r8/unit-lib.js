// Loads the pure parts of an app.js into Node for fast checks.
const fs = require('fs'); const path = require('path');
const file = process.env.APPJS || path.join(__dirname, '..', '..', '..', 'src', 'app.js');
const src = fs.readFileSync(file, 'utf8').split('\n');
const end = src.findIndex((l) => l.startsWith('/* ================= health'));
const body = src.slice(3, end).join('\n') + '\nfunction isPlain(v) { return !!v && typeof v === "object" && !Array.isArray(v); }\n'
  + 'return { parseSplitLines, readPlanMd, applyPlanMd, undoPlanSync, buildPlanMd, nextCommandMd, safeCommands, settingsJson, parseDoc, parseShipyardMd, projectMarkdown, normalize, blankProject, applyStarter, mkTask, mkMilestone, mkBug, planChangeText };';
module.exports = new Function('localStorage', 'document', 'window', body)({}, {}, {});
