// Override for mock.js: a db that behaves as db.d.ts documents latency compensation:
// "Your own writes appear immediately (hasPendingWrites: true until confirmed)".
// A rejected write is rolled back and the listener gets the server state again.
// Controls: window.__FAIL_NEXT__ = [code, ...] (each write shifts one; null = succeed),
//           window.__WRITE_MS__ (server latency, default 120), window.__NO_ROLLBACK_EMIT__.
(function () {
  const orig = window.claude;
  const server = window.__mockDocs; // reuse the same Map so helpers keep working
  const pending = []; // {seq, id, kind, data}
  let seq = 0;
  const listeners = new Set();
  const freeze = (o) => JSON.parse(JSON.stringify(o));
  const merge = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b)) o[k] = (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) ? merge(a[k], v) : v; return o; };
  function view() {
    const m = new Map(server);
    for (const p of pending) {
      if (p.kind === 'set') m.set(p.id, freeze(p.data));
      else if (p.kind === 'update') { if (m.has(p.id)) m.set(p.id, merge(m.get(p.id), p.data)); }
      else if (p.kind === 'delete') m.delete(p.id);
    }
    return m;
  }
  const snapOf = (id, body, pend) => ({ id, exists: true, data: () => freeze(body), metadata: { fromCache: false, hasPendingWrites: pend } });
  function emit() {
    const v = view();
    for (const l of listeners) {
      const changes = [];
      for (const [id, body] of v) {
        const prev = l.seen.get(id);
        const pend = pending.some((p) => p.id === id);
        if (prev === undefined) changes.push({ type: 'added', doc: snapOf(id, body, pend) });
        else if (JSON.stringify(prev) !== JSON.stringify(body)) changes.push({ type: 'modified', doc: snapOf(id, body, pend) });
      }
      for (const [id, body] of l.seen) if (!v.has(id)) changes.push({ type: 'removed', doc: snapOf(id, body, false) });
      l.seen = new Map([...v].map(([k, b]) => [k, freeze(b)]));
      if (!changes.length && l.started) continue;
      l.started = true;
      const all = [...v].map(([id, b]) => snapOf(id, b, false));
      l.next({ docs: all, size: all.length, empty: !all.length, docChanges: () => changes, metadata: { fromCache: false, hasPendingWrites: pending.length > 0 } });
    }
  }
  window.__optEmit = emit;
  function write(id, kind, data) {
    const p = { seq: ++seq, id, kind, data: data && freeze(data) };
    if (kind === 'update' && !view().has(id)) return Promise.reject({ code: 'invalid_argument', message: 'document does not exist' });
    pending.push(p);
    window.__mockLog.push([kind + '-sent', id, data ? Object.keys(data).join(',') : '']);
    setTimeout(emit, 0); // latency compensation: own write shows immediately
    const fail = (window.__FAIL_NEXT__ || []).shift();
    return new Promise((res, rej) => setTimeout(() => {
      pending.splice(pending.indexOf(p), 1);
      if (fail) {
        window.__mockLog.push([kind + '-rejected', id, fail]);
        if (!window.__NO_ROLLBACK_EMIT__) emit();
        rej({ code: fail, message: 'mock ' + fail });
        return;
      }
      if (kind === 'set') server.set(id, freeze(data));
      else if (kind === 'update') { if (!server.has(id)) { emit(); rej({ code: 'invalid_argument', message: 'gone' }); return; } server.set(id, merge(server.get(id), p.data)); }
      else server.delete(id);
      window.__mockLog.push([kind + '-ok', id]);
      emit();
      res();
    }, window.__WRITE_MS__ ?? 120));
  }
  const col = {
    path: 'projects',
    doc: (id) => ({ id, path: 'projects/' + id, set: (d) => write(id, 'set', d), update: (d) => write(id, 'update', d), delete: () => write(id, 'delete', null), get: async () => { const v = view(); return v.has(id) ? snapOf(id, v.get(id), false) : { id, exists: false, data: () => undefined }; } }),
    onSnapshot(next, err) { const l = { next, err, seen: new Map(), started: false }; listeners.add(l); window.__optErr = err; setTimeout(emit, 50); return () => listeners.delete(l); },
  };
  const db = Object.freeze({ collection: () => col });
  window.__mockEmitExternal = (id, body) => { server.set(id, freeze(body)); emit(); };
  window.claude = Object.freeze({ use: async (n) => (n === 'db' ? (await new Promise((r) => setTimeout(r, 80)), db) : orig.use(n)) });
})();
