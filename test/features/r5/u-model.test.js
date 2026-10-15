const U = require('./unit-lib');
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); };
const ents = (p) => p.entities.map((e) => [e.name, e.fields, e.notes]);
// list form
let p = U.parseDoc('# Recipe Box\n\nA place for recipes.\n\n## Data model\n\n- **Recipe**: title (text), url (link), status (todo, cooked)\n  Belongs to a user.\n- User - name, email\n  - joined: date\n');
check('list form', JSON.stringify(ents(p)) === JSON.stringify([['Recipe', 'title: text\nurl: link\nstatus: todo, cooked', 'Belongs to a user.'], ['User', 'name\nemail\njoined: date', '']]), ents(p));
// sub-sections
p = U.parseDoc('# App\n\n## Schema\n\n### Recipe\n\n- `title`: string\n- `url`: string\n\nA saved recipe.\n\n### Tag\n\n| Field | Type |\n|---|---|\n| name | text |\n');
check('sub-sections are one thing each', JSON.stringify(ents(p)) === JSON.stringify([['Recipe', 'title: string\nurl: string', 'A saved recipe.'], ['Tag', 'name: text', '']]), ents(p));
// SQL
p = U.parseDoc('# App\n\n## Database schema\n\n```sql\nCREATE TABLE IF NOT EXISTS recipes (\n  id INTEGER PRIMARY KEY,\n  title TEXT NOT NULL,\n  price REAL DEFAULT 0,\n  user_id INTEGER REFERENCES users(id),\n  FOREIGN KEY (user_id) REFERENCES users(id)\n);\nCREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT UNIQUE);\n```\n');
check('SQL tables', JSON.stringify(ents(p)) === JSON.stringify([['recipes', 'id: INTEGER PRIMARY KEY\ntitle: TEXT NOT NULL\nprice: REAL DEFAULT 0\nuser_id: INTEGER REFERENCES users(id)', ''], ['users', 'id: INTEGER PRIMARY KEY\nemail: TEXT UNIQUE', '']]), ents(p));
// Prisma
p = U.parseDoc('# App\n\n## Data model\n\n```prisma\nmodel Recipe {\n  id    Int    @id @default(autoincrement())\n  title String\n  tags  Tag[]\n  @@index([title])\n}\n```\n');
check('Prisma', JSON.stringify(ents(p)) === JSON.stringify([['Recipe', 'id: Int @id @default(autoincrement())\ntitle: String\ntags: Tag[]', '']]), ents(p));
// TypeScript
p = U.parseDoc('# App\n\n## Data model\n\n```ts\nexport interface Recipe {\n  readonly id: string;\n  title: string;\n  notes?: string;\n}\ntype Tag = { name: string; color: string }\n```\n');
check('TypeScript', JSON.stringify(ents(p)) === JSON.stringify([['Recipe', 'id: string\ntitle: string\nnotes: string (optional)', ''], ['Tag', 'name: string\ncolor: string', '']]), ents(p));
// Python
p = U.parseDoc('# App\n\n## Data model\n\n```python\nclass Recipe(BaseModel):\n    """A recipe."""\n    title: str\n    url: str = ""\n    def short(self):\n        return self.title[:10]\n```\n');
check('Python', JSON.stringify(ents(p)) === JSON.stringify([['Recipe', 'title: str\nurl: str', '']]), ents(p));
// not a model: an LLM "Models" section and a prose schema note
p = U.parseDoc('# Chat\n\n## Models\n\n- GPT-5: fast\n- Claude: careful\n\n## Data model\n\nWe store everything in one JSON file.\n');
check('LLM models and prose are not entities', p.entities.length === 0, ents(p));
// CLAUDE.md written by Shipyard reads back
const q = U.normalize({ name: 'Recipe Box', entities: [{ name: 'Recipe', fields: 'title: text\nurl: link\nstatus: todo, cooked', notes: 'Belongs to a user.' }, { name: 'User', fields: 'email', notes: '' }] });
const md = U.buildClaudeMd(q);
check('CLAUDE.md section', /## Data model\nUse these names in code, tables and types\.\n- \*\*Recipe\*\*: title \(text\), url \(link\), status \(todo, cooked\)\n  Belongs to a user\.\n- \*\*User\*\*: email\n/.test(md), md);
p = U.parseDoc(md);
check('Shipyard CLAUDE.md reads back', JSON.stringify(ents(p)) === JSON.stringify(ents(q)), ents(p));
// export round trip
const ex = U.projectMarkdown(U.normalize({ name: 'X', entities: [{ name: 'Recipe', fields: 'title: text\n- odd: line\n1. numbered', notes: 'Line one\nline two' }, { name: '', fields: '', notes: '' }] }));
check('export section', /## Data model\n\n- \*\*Recipe\*\*\n  - Fields: title: text\n    \\- odd: line\n    1\\\. numbered\n  - Notes: Line one\n    line two\n- \*\*Untitled\*\*\n/.test(ex), ex);
const back = U.parseShipyardMd(ex);
check('export round trip', JSON.stringify(ents(back)) === JSON.stringify([['Recipe', 'title: text\n- odd: line\n1. numbered', 'Line one\nline two'], ['', '', '']]), ents(back));
check('summary counts things', /a data model of 2 things/.test(U.importSummary(back)), U.importSummary(back));
// old data without entities still loads
check('normalize adds entities', Array.isArray(U.normalize({ name: 'old' }).entities));
console.log('fails:', fails);
