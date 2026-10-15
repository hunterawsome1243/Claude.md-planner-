// Builds the pages the browser tests open, from dist/shipyard.html (run `npm run build` first):
//   test/mocked.html  with test/mock.js standing in for claude.ai (account storage in memory, canned Claude replies)
//   test/plain.html   with no claude.ai runtime at all (browser storage only), like index.html opened from disk
// The wrapper copies the skeleton claude.ai puts around a published page.
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'dist', 'shipyard.html'), 'utf8');
const head = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>';
const tail = '</body></html>';
const mock = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8');
fs.writeFileSync(path.join(__dirname, 'plain.html'), head + src + tail);
fs.writeFileSync(path.join(__dirname, 'mocked.html'), head + '<script>' + mock + '</script>' + src + tail);
// storage/opt.html: the mocked page with optimistic-concurrency db behaviour layered on
require('./storage/build-opt.js');
console.log('built test pages');
