// Shared helpers for the Spa City Thrills tests (imported by *.test.mjs; not a test file itself).

export async function click(t, act, arg) {
  const sel = arg != null ? `[data-act="${act}"][data-arg="${arg}"]` : `[data-act="${act}"]`;
  await t.page.click(sel);
  await t.page.waitForTimeout(40);
}

// A paused park: scenario n (default the sandbox with $250k) without the tutorial.
export async function park(t, o = {}) {
  await t.seed(o.seed ?? 7);
  return t.game('newGame', { mode: 'sandbox', hills: 'rolling', cash: '250000', tutorial: false, ...o });
}

// Build a small working park through actions (same code path as the UI): a street, rides, stalls.
export async function starter(t, extra = []) {
  const s = await t.state();
  const gate = await t.page.evaluate(() => { const S = window.__game.getState(true); return { w: S.map.w, gate: (() => { const g = S.map.gate; return typeof g === 'number' ? g : 0; })() }; });
  const gx = gate.gate % gate.w, gy = Math.floor(gate.gate / gate.w);
  await t.page.evaluate(([gx, gy]) => {
    const G = window.__game;
    G.act('path', gx, gy - 2, gx, gy - 14);
    G.act('path', gx - 6, gy - 6, gx + 6, gy - 6);
    G.act('path', gx - 6, gy - 11, gx + 6, gy - 11);
  }, [gx, gy]);
  void s;
  return { gx, gy };
}

// Place an item next to the nearest path tile where it fits (uses the game's own planner via act).
export async function autoPlace(t, type) {
  return t.page.evaluate((type) => window.__game.act('autoPlace', type), type);
}

export async function waitFor(t, pred, ms = 8000, label = 'condition') {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const s = await t.state();
    if (pred(s)) return s;
    await t.page.waitForTimeout(40);
  }
  t.fail(`timed out waiting for ${label}`);
  return t.state();
}

// WCAG contrast of every visible text element against its nearest opaque background.
export async function contrastReport(page) {
  return page.evaluate(() => {
    const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(',').map((x) => parseFloat(x)); return { r: v[0], g: v[1], b: v[2], a: v[3] == null ? 1 : v[3] }; };
    const lum = ({ r, g, b }) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.9) return c; const bi = getComputedStyle(e).backgroundImage; if (bi && bi.includes('gradient')) { const m = bi.match(/rgba?\([^)]+\)/g); if (m) { const cs = m.map(parse); const dark = cs.reduce((a, b) => (lum(a) > lum(b) ? a : b)); return dark; } } } return { r: 31, g: 51, b: 36, a: 1 }; };
    const fails = []; let checked = 0;
    for (const el of document.querySelectorAll('body *')) {
      if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const st = getComputedStyle(el);
      if (st.visibility === 'hidden' || st.display === 'none' || el.closest('[hidden]') || el.closest('.sr-only') || el.closest('[aria-hidden="true"]')) continue;
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const fg = parse(st.color), bg = bgOf(el);
      if (!fg) continue;
      const L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      checked++;
      const op = parseFloat(st.opacity);
      if (ratio < 4.5 && op > 0.5 && !el.closest('[disabled]')) fails.push(`${el.tagName}.${el.className} "${el.textContent.trim().slice(0, 30)}" ${ratio.toFixed(2)}`);
    }
    return { checked, fails };
  });
}
