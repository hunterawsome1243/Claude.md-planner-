const fs = require('fs'); const path = require('path');
const T = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(T, 'mocked.html'), 'utf8');
const opt = fs.readFileSync(path.join(__dirname, 'opt-db.js'), 'utf8');
// insert the override right after the mock script (before the app's markup)
const i = page.indexOf('</script>') + '</script>'.length;
fs.writeFileSync(path.join(__dirname, 'opt.html'), page.slice(0, i) + '<script>' + opt + '</script>' + page.slice(i));
console.log('built opt.html');
