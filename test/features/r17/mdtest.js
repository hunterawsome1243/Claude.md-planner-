// quick check of r17/md.js on its own
const fs = require('fs');
const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
eval(fs.readFileSync(__dirname + '/../md.js', 'utf8') + '\nglobal.M = mdLite;');
const cases = [
  ['1. Run `npm run build` first.\n2. Then **deploy** it.', '<ol><li>Run <code>npm run build</code> first.</li><li>Then <b>deploy</b> it.</li></ol>'],
  ['1. One\n\n2. Two\n\n3. Three', '<ol><li>One</li><li>Two</li><li>Three</li></ol>'],
  ['3. c\n4. d', '<ol start="3"><li>c</li><li>d</li></ol>'],
  ['- a\n  - a1\n  - a2\n- b', '<ul><li>a<ul><li>a1</li><li>a2</li></ul></li><li>b</li></ul>'],
  ['- a\n- b\n1. c\n2) d', '<ul><li>a</li><li>b</li></ul><ol><li>c</li><li>d</li></ol>'],
  ['- first\n  more\n- second', '<ul><li>first more</li><li>second</li></ul>'],
  ['- a\n\nAfter', '<ul><li>a</li></ul><p>After</p>'],
  ['See [the docs](https://code.claude.com/docs) now', '<p>See <a href="https://code.claude.com/docs" target="_blank" rel="noopener noreferrer">the docs</a> now</p>'],
  ['[x](javascript:alert(1))', '<p>[x](javascript:alert(1))</p>'],
  ['[x](https://a.b/"onmouseover=alert(1))', null],
  ['Use __this__ please', '<p>Use <b>this</b> please</p>'],
  ['`a **b** c`', '<p><code>a **b** c</code></p>'],
  ['| Name | Type |\n|---|---|\n| id | `int` |\n| title | text |', '<div class="md-table"><table><thead><tr><th>Name</th><th>Type</th></tr></thead><tbody><tr><td>id</td><td><code>int</code></td></tr><tr><td>title</td><td>text</td></tr></tbody></table></div>'],
  ['> Note this\n> and that\n\nok', '<blockquote>Note this<br>and that</blockquote><p>ok</p>'],
  ['a\n\n---\n\nb', '<p>a</p><hr><p>b</p>'],
  ['Use **npm test** and *then* `git commit`', '<p>Use <b>npm test</b> and <i>then</i> <code>git commit</code></p>'],
  ['2 * 3 * 4', '<p>2 * 3 * 4</p>'],
  ['1. Step\n\n   ```\n   npm test\n   ```\n2. Next', null],
];
let f = 0;
for (const [i, o] of cases) { const r = M(i); const ok = o == null ? !/"onmouseover/.test(r) : r === o; if (!ok) f++; console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(i) + ' -> ' + r); }
console.log(f ? f + ' failed' : 'all pass');
