// An init script that makes the page believe today is `day` (YYYY-MM-DD), with time still moving.
// For tests whose seed data has fixed dates, e.g. "the last session was 6 days ago".
exports.at = (day) => `(() => {
  const R = Date, off = R.parse('${day}T12:00:00') - R.now();
  function D(...a) { return a.length ? new R(...a) : new R(R.now() + off); }
  D.prototype = R.prototype; Object.setPrototypeOf(D, R);
  D.now = () => R.now() + off; D.parse = R.parse; D.UTC = R.UTC;
  window.Date = D;
})();\n`;
