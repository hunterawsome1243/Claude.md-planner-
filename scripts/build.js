// Builds the app from src/: splices src/app.js into src/shell.html.
//   dist/shipyard.html  the page body as claude.ai publishes it (no <html>/<head> wrapper)
//   index.html          a complete page you can open from disk or host anywhere
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MARK = '/* @@APP_JS@@ */';
const shell = fs.readFileSync(path.join(ROOT, 'src', 'shell.html'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'src', 'app.js'), 'utf8').replace(/\n+$/, '');
if (shell.split(MARK).length !== 2) throw new Error('src/shell.html must contain ' + MARK + ' exactly once');
if (js.includes('</script')) throw new Error('src/app.js must not contain "</script"');
new Function(js); // fails the build on a syntax error

const body = shell.replace(MARK, () => js);
const page = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
  + '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
  + '<style>body{margin:0}[hidden]{display:none!important}</style>\n</head>\n<body>\n'
  + body + '</body>\n</html>\n';

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist', 'shipyard.html'), body);
fs.writeFileSync(path.join(ROOT, 'index.html'), page);
console.log('built index.html and dist/shipyard.html (' + Math.round(page.length / 1024) + ' KB)');
