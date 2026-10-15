// Round 17 (G6): schemas in documents become data model entities
const U = require('./unit-lib');
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); };
const ents = (md) => (U.parseDoc(md).entities || []).map((e) => `${e.name}: ${e.fields.split('\n').join(' ; ')}`);
const doc = (h, code, lang) => `# Recipes\n\nA recipe app.\n\n## ${h}\n\n\`\`\`${lang}\n${code}\n\`\`\`\n`;
const cases = [
  ['SQL ending in ;', doc('Data model', 'CREATE TABLE recipes (\n  id INTEGER PRIMARY KEY,\n  title TEXT NOT NULL,\n  price NUMERIC(10,2),\n  user_id INTEGER REFERENCES users(id)\n);', 'sql'), ['recipes: id: INTEGER PRIMARY KEY ; title: TEXT NOT NULL ; price: NUMERIC(10,2) ; user_id: INTEGER REFERENCES users(id)']],
  ['SQL without ;', doc('Database schema', 'CREATE TABLE recipes (\n  id INTEGER PRIMARY KEY,\n  title TEXT NOT NULL\n)', 'sql'), ['recipes: id: INTEGER PRIMARY KEY ; title: TEXT NOT NULL']],
  ['two SQL tables without ;', doc('Data model', 'CREATE TABLE a (\n  id INT\n)\n\nCREATE TABLE b (\n  id INT,\n  a_id INT\n)', 'sql'), ['a: id: INT', 'b: id: INT ; a_id: INT']],
  ['one-line SQL', doc('Data model', 'CREATE TABLE tags (id INT, name TEXT);', 'sql'), ['tags: id: INT ; name: TEXT']],
  ['under "Database"', doc('Database', 'CREATE TABLE recipes (\n  id INTEGER PRIMARY KEY,\n  title TEXT NOT NULL\n);', 'sql'), ['recipes: id: INTEGER PRIMARY KEY ; title: TEXT NOT NULL']],
  ['Prisma under "Models"', doc('Models', 'model Recipe {\n  id    Int    @id @default(autoincrement())\n  title String\n  authorId Int\n  @@index([authorId])\n}', 'prisma'), ['Recipe: id: Int @id @default(autoincrement()) ; title: String ; authorId: Int']],
  ['TypeScript under "Types"', doc('Types', 'export interface Recipe {\n  id: string;\n  title: string;\n  tags?: string[];\n}', 'ts'), ['Recipe: id: string ; title: string ; tags: string[] (optional)']],
  ['nested TypeScript object', doc('Data model', 'interface User {\n  id: string;\n  address: { street: string; city: string };\n  email: string;\n}', 'ts'), ['User: id: string ; address: { street: string; city: string } ; email: string']],
  ['multi-line nested object', doc('Data model', 'interface User {\n  id: string;\n  address: {\n    street: string;\n    city: string;\n  };\n  email: string;\n}', 'ts'), ['User: id: string ; address: { street: string; city: string; } ; email: string']],
  ['generics keep their commas', doc('Data model', 'type Stats = {\n  counts: Record<string, number>;\n  onPick: (id: string, n: number) => void;\n}', 'ts'), ['Stats: counts: Record<string, number> ; onPick: (id: string, n: number) => void']],
  ['Pydantic with a docstring and a method', doc('Data model', 'class Recipe(BaseModel):\n    """\n    A recipe saved from a link.\n    Keeps the original page title.\n    """\n    title: str\n    url: HttpUrl\n\n    def short(self):\n        return self.title[:20]', 'python'), ['Recipe: title: str ; url: HttpUrl']],
  ['dataclass with a blank line', doc('Data model', '@dataclass\nclass Recipe:\n    """A recipe."""\n\n    title: str\n    servings: int = 2', 'python'), ['Recipe: title: str ; servings: int']],
  ['Django', doc('Data model', 'class Recipe(models.Model):\n    title = models.CharField(max_length=200)\n    url = models.URLField()\n    author = models.ForeignKey(User, on_delete=models.CASCADE)\n\n    class Meta:\n        ordering = ["-created"]', 'python'), ['Recipe: title: CharField ; url: URLField ; author: ForeignKey']],
  ['SQLAlchemy', doc('Data model', 'class Recipe(Base):\n    __tablename__ = "recipes"\n    id = Column(Integer, primary_key=True)\n    title = Column(String(200))\n    owner_id = Column(sa.Integer, ForeignKey("users.id"))', 'python'), ['Recipe: id: Integer ; title: String(200) ; owner_id: Integer']],
];
for (const [name, md, want] of cases) { const got = ents(md); check(name, JSON.stringify(got) === JSON.stringify(want), got); }
console.log(fails ? `${fails} failed` : 'all unit checks pass');
