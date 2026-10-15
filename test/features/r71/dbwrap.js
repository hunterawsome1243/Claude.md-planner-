// An init script that wraps the mock runtime's db so a test can make it fail, hang, slow down or go missing.
// window.__DB = { mode: null | <error code> | 'hang', delay: ms, useNull: bool, calls: [] }; window.__DB.snapErr(e) fails the
// live subscription; window.__wroteSync, when exposed by the test, hears every write the moment the page starts it.
module.exports = (cfg = {}) => `window.__DB = Object.assign({ mode: null, delay: 0, useNull: false, calls: [] }, ${JSON.stringify(cfg)});
(() => { let real;
  Object.defineProperty(window, 'claude', { configurable: true, get() { return real; }, set(v) {
    real = Object.freeze({ use: async (n) => {
      const D = window.__DB;
      if (n === 'db' && D.useNull) return null;
      const c = await v.use(n);
      if (n !== 'db' || !c) return c;
      return Object.freeze({ doc: c.doc, collection: (p) => { const col = c.collection(p); return {
        path: col.path,
        doc: (id) => { const d = col.doc(id);
          const w = (name) => async (data) => {
            D.calls.push([name, id, Object.keys(data || {}).join(','), Date.now()]);
            try { window.__wroteSync && window.__wroteSync(name + ' ' + id + ' ' + Object.keys(data || {}).join(',')); } catch (e) {}
            if (D.mode === 'hang') return new Promise(() => {});
            if (D.delay) await new Promise((r) => setTimeout(r, D.delay));
            if (D.mode) throw { code: D.mode, message: 'mock ' + D.mode };
            return d[name](data);
          };
          return { id: d.id, path: d.path, set: w('set'), update: w('update'), delete: () => { D.calls.push(['delete', id]); return d.delete(); }, get: () => d.get() }; },
        onSnapshot: (next, err) => { D.snapErr = err; if (D.snapFail) { setTimeout(() => err({ code: D.snapFail, message: 'mock' }), 20); return () => {}; } return col.onSnapshot(next, err); },
      }; } });
    } });
  } });
})();`;
