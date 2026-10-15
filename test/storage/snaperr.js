// init script: capture the onSnapshot error callback so tests can fire terminal errors
module.exports = (seed) => `
${seed ? `window.__SEED__=${JSON.stringify(seed)};` : ''}
Object.defineProperty(window, 'claude', { configurable: true, set(real) {
  const wrapped = Object.freeze({ use: async (n) => {
    const c = await real.use(n);
    if (n !== 'db' || !c) return c;
    const col = c.collection('projects');
    const o = col.onSnapshot;
    window.__subs = 0;
    col.onSnapshot = (next, err) => { window.__subs++; window.__snapErr = err; return o.call(col, next, err); };
    return c;
  } });
  Object.defineProperty(window, 'claude', { value: wrapped, configurable: true, writable: false });
} });`;
