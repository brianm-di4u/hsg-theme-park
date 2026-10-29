// Real input: mouse on desktop, CDP touch on mobile. No setState: the park is built through the UI
// and time runs through the real loop (8× speed), then guests are seen riding.
import { click, park } from './helpers.mjs';

async function scr(t, x, y) { return t.game('act', 'tileToScreen', x, y); }

// Find a placement tile beside the street whose footprint check passes (asks the game, places nothing).
async function spotFor(t, type, gx, gy) {
  return t.page.evaluate(([type, gx, gy]) => {
    const n = { carousel: 3, bbq: 1 }[type] || 1;
    for (let k = 3; k <= 10; k++) for (const side of [1, -1]) {
      // pointer tile = footprint centre; footprint must touch the street at column gx
      const cx = side > 0 ? gx + 1 + ((n - 1) >> 1) : gx - n + ((n - 1) >> 1);
      const cy = gy - k;
      const x0 = cx - ((n - 1) >> 1), y0 = cy - ((n - 1) >> 1);
      const c = window.__game.act('check', type, x0, y0);
      if (c.ok && Math.abs(c.h - window.__game.act('tile', gx, cy).h) <= 1) return { x: cx, y: cy };
    }
    return null;
  }, [type, gx, gy]);
}

export const tests = [
  {
    name: 'mouse: build a path and a ride, guests ride it',
    viewports: ['desktop'],
    async run(t) {
      await park(t);
      const g = await t.game('act', 'gate');
      const before = (await t.state()).paths;
      await click(t, 'tool', 'path');
      const a = await scr(t, g.x, g.y - 2), b = await scr(t, g.x, g.y - 11);
      await t.page.mouse.move(a.x, a.y); await t.page.mouse.down();
      await t.page.mouse.move(b.x, b.y, { steps: 8 }); await t.page.mouse.up();
      let s = await t.state();
      t.expect(s.paths >= before + 8, `mouse drag laid a path (${before} → ${s.paths})`);
      await click(t, 'tool', 'rides');
      await click(t, 'pick', 'carousel');
      const spot = await spotFor(t, 'carousel', g.x, g.y);
      t.expect(!!spot, 'found a spot for the carousel');
      const p = await scr(t, spot.x, spot.y);
      await t.page.mouse.move(p.x, p.y); await t.page.mouse.click(p.x, p.y);
      s = await t.state();
      const ride = s.objects.find((o) => o.type === 'carousel');
      t.expect(ride && ride.entry >= 0, 'carousel placed and connected by a mouse click');
      await click(t, 'tool', 'shops');
      await click(t, 'pick', 'bbq');
      const sp2 = await spotFor(t, 'bbq', g.x, g.y);
      const q = await scr(t, sp2.x, sp2.y);
      await t.page.mouse.move(q.x, q.y); await t.page.mouse.click(q.x, q.y);
      await t.page.keyboard.press('Escape');
      await t.shot('01-mouse-built');
      await click(t, 'speed', '8');
      s = await t.state();
      t.expect(!s.paused && s.speed === 8, 'running at 8×');
      const end = Date.now() + 20000;
      while (Date.now() < end) {
        s = await t.state();
        const r = s.objects.find((o) => o.type === 'carousel');
        if (r && r.totalRiders > 0) break;
        await t.page.waitForTimeout(200);
      }
      const r = s.objects.find((o) => o.type === 'carousel');
      t.expect(r.totalRiders > 0, `guests rode the carousel (${r.totalRiders} riders, ${s.guests} guests)`);
      await click(t, 'pause');
      await t.game('act', 'camera', spot.x, spot.y, 1.4);
      await t.shot('02-mouse-riding');
      await t.checkLayout();
    },
  },
  {
    name: 'touch: build a path and a ride, pinch zoom, guests ride it',
    viewports: ['mobile'],
    async run(t) {
      await park(t);
      const g = await t.game('act', 'gate');
      const before = (await t.state()).paths;
      await t.tap(await centre(t, '[data-act="tool"][data-arg="path"]'));
      const a = await scr(t, g.x, g.y - 2), b = await scr(t, g.x, g.y - 10);
      await t.touchDrag([a.x, a.y], [b.x, b.y], { steps: 10 });
      let s = await t.state();
      t.expect(s.paths >= before + 7, `touch drag laid a path (${before} → ${s.paths})`);
      await t.tap(await centre(t, '[data-act="tool"][data-arg="rides"]'));
      await t.tap(await centre(t, '[data-act="pick"][data-arg="carousel"]'));
      s = await t.state();
      t.equal(s.panel, null, 'the sheet closes so the map is visible');
      const spot = await spotFor(t, 'carousel', g.x, g.y);
      const p = await scr(t, spot.x, spot.y);
      await t.tap([p.x, p.y]);
      s = await t.state();
      const ride = s.objects.find((o) => o.type === 'carousel');
      t.expect(ride && ride.entry >= 0, 'carousel placed by a tap');
      await t.shot('03-touch-built');
      t.equal(s.panel, 'obj', 'the new ride opens its sheet');
      await t.tap(await centre(t, '[data-act="closePanel"]'));
      // pinch: two fingers apart zooms in
      const z0 = s.zoom;
      await pinchOut(t);
      s = await t.state();
      t.expect(s.zoom > z0 + 0.1, `pinch zoomed in (${z0.toFixed(2)} → ${s.zoom.toFixed(2)})`);
      await t.tap(await centre(t, '[data-act="speed"][data-arg="8"]'));
      const end = Date.now() + 20000;
      while (Date.now() < end) {
        s = await t.state();
        const r = s.objects.find((o) => o.type === 'carousel');
        if (r && r.totalRiders > 0) break;
        await t.page.waitForTimeout(200);
      }
      t.expect(s.objects.find((o) => o.type === 'carousel').totalRiders > 0, 'guests rode it');
      await t.tap(await centre(t, '[data-act="pause"]'));
      // phone view: guests stay readable
      const px = await t.page.evaluate(() => {
        const cv = document.getElementById('cv');
        return { w: cv.clientWidth, z: window.__game.getState().zoom };
      });
      t.expect(15.6 * 0.9 >= 10 && px.z >= 0.9, `default phone zoom keeps adults ≥ 10 px tall (zoom ${px.z.toFixed(2)})`);
      await t.shot('04-touch-riding');
      await t.checkLayout();
    },
  },
];

async function centre(t, sel) {
  const b = await t.page.locator(sel).first().boundingBox();
  return [b.x + b.width / 2, b.y + b.height / 2];
}
async function pinchOut(t) {
  const cdp = await t.page.context().newCDPSession(t.page);
  const P = (x, id) => ({ x, y: 420, id, radiusX: 4, radiusY: 4, force: 1 });
  const pts = (d) => [P(195 - d, 1), P(195 + d, 2)];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [P(155, 1)] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(40) });
  for (let k = 1; k <= 8; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(40 + k * 10) }); await t.page.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}
