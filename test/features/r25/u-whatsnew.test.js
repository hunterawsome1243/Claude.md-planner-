// Round 25: when What's new shows its dot
const U = require('./unit-lib');
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); };
const V = U.WN_VER;
check('the version is a whole number past 6', Number.isInteger(V) && V >= 7, V);
check('never looked, with projects: dot', U.newDot(null, V, 2) === true);
check('saw an older version: dot', U.newDot(V - 1, V, 1) === true && U.newDot(String(V - 1), V, 1) === true);
check('saw this version: no dot', U.newDot(V, V, 3) === false && U.newDot(String(V), V, 3) === false);
check('saw a newer version (another tab): no dot', U.newDot(V + 1, V, 3) === false);
check('no projects: no dot', U.newDot(null, V, 0) === false);
check('junk in storage counts as never looked', U.newDot('x', V, 1) === true && U.newDot({}, V, 1) === true);
console.log(`unit-whatsnew fails: ${fails}`);
