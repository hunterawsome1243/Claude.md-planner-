// Contrast of the real rendered text/background pairs in both themes (computed styles, walks up for the background).
const L = require('./lib');
(async () => {
  const b = await L.launch();
  for (const scheme of ['light', 'dark']) {
    const { pg, ctx } = await L.openPage(b, { width: 1280, height: 900, scheme });
    await L.seed(pg);
    await pg.click('[data-act="open"][data-id="p-shipyard"]');
    await pg.waitForTimeout(200);
    const res = [];
    for (const k of ['overview', 'design', 'plan', 'claudemd', 'improve']) {
      await L.tab(pg, k);
      if (k === 'improve') { await pg.click('[data-act="ai-review"]'); await pg.waitForTimeout(600); }
      res.push(...await pg.evaluate((k) => {
        const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] == null ? 1 : p[3] }; };
        const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
        const bgOf = (el) => { const stack = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; } } let out = { r: 255, g: 255, b: 255, a: 1 }; for (const c of stack.reverse()) out = blend(c, out); return out; };
        const out = [];
        const seen = new Set();
        for (const el of document.querySelectorAll('#app *')) {
          const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
          if (!own && !(el.matches('input,textarea') && (el.value || el.placeholder))) continue;
          const r = el.getBoundingClientRect(); if (!r.width) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden') continue;
          let fg = parse(cs.color); const bg = bgOf(el);
          let op = 1; for (let e = el; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
          fg = blend({ ...fg, a: fg.a * op }, bg);
          const l1 = lum(fg), l2 = lum(bg); const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
          const size = parseFloat(cs.fontSize); const bold = Number(cs.fontWeight) >= 600;
          const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
          const key = el.className + '|' + cs.color + '|' + Math.round(ratio * 10);
          if (ratio < need && !seen.has(key)) { seen.add(key); out.push(`${k}: ${el.tagName.toLowerCase()}.${String(el.className).replace(/ /g, '.')} "${(el.textContent || el.value || '').trim().slice(0, 30)}" ${ratio.toFixed(2)} (need ${need}, ${size}px)${el.disabled ? ' disabled' : ''}`); }
        }
        // placeholders
        for (const el of document.querySelectorAll('input[placeholder], textarea[placeholder]')) {
          if (el.value) continue;
          const cs = getComputedStyle(el, '::placeholder');
          const fg = parse(cs.color); const bg = bgOf(el);
          if (!fg) continue;
          const l1 = lum(fg), l2 = lum(bg); const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
          const key = 'ph' + Math.round(ratio * 10);
          if (!seen.has(key)) { seen.add(key); out.push(`${k}: placeholder "${el.placeholder.slice(0, 20)}" ${ratio.toFixed(2)}`); }
        }
        return out;
      }, k));
    }
    console.log('==', scheme); console.log(res.join('\n'));
    await ctx.close();
  }
  await b.close();
})();
