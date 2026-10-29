export const tests = [
  {
    name: 'boots and draws',
    async run(t) {
      await t.seed(42);
      const s = await t.state();
      t.equal(s.dots.length, 40, 'dot count');
      await t.shot('01-boot');
      await t.checkLayout({ allowScrollY: false });
      t.log('load ms', t.loadMs, 'fps', await t.fps(500));
    },
  },
  {
    name: 'scene switch via click',
    async run(t) {
      await t.page.click('#next');
      t.equal((await t.state()).scene, 1, 'scene after click');
      await t.shot('02-lake');
    },
  },
  {
    name: 'blank screenshot is detected',
    viewports: ['desktop'],
    async run(t) {
      await t.page.evaluate(() => { document.body.innerHTML = ''; document.body.style.background = '#fff'; });
      await t.shot('03-blank', { allowBlank: true }).then(({ stats }) => t.expect(stats.stddev < 2, 'blank page should have ~0 stddev'));
    },
  },
  {
    name: 'harness helpers: initScript, reload, tap, no-wait shot',
    viewports: ['mobile'],
    initScript: () => { window.__initRan = (window.__initRan || 0) + 1; },
    async run(t) {
      t.expect(await t.page.evaluate(() => window.__initRan === 1), 'initScript ran before load');
      t.expect(t.milestone && t.shotDir, 't.milestone and t.shotDir are set');
      const b = await t.page.locator('#next').boundingBox();
      await t.tap([b.x + b.width / 2, b.y + b.height / 2]);
      t.equal((await t.state()).scene, 1, 'scene after touch tap');
      await t.page.evaluate(() => { window.__game.isIdle = () => false; });
      const t0 = Date.now();
      await t.shot('04-no-wait', { wait: false });
      t.expect(Date.now() - t0 < 2000, 'wait:false does not wait for isIdle');
      await t.reload();
      t.equal((await t.state()).scene, 0, 'state resets after reload');
    },
  },
  {
    name: 'harness helpers: touchDrag holdEndMs, waitFrames',
    viewports: ['mobile'],
    async run(t) {
      await t.page.evaluate(() => {
        window.__touch = { down: 0, up: 0 };
        addEventListener('touchstart', () => { window.__touch.down = performance.now(); });
        addEventListener('touchend', () => { window.__touch.up = performance.now(); });
      });
      await t.touchDrag([100, 300], [200, 300], { steps: 4, holdEndMs: 300 });
      const held = await t.page.evaluate(() => window.__touch.up - window.__touch.down);
      t.expect(held >= 280, `finger held at the end (${Math.round(held)} ms)`);
      const f0 = await t.page.evaluate(() => { window.__frames = 0; const f = () => { window.__frames++; requestAnimationFrame(f); }; requestAnimationFrame(f); return 0; });
      await t.waitFrames(5);
      t.expect(await t.page.evaluate(() => window.__frames) >= 4 + f0, 'waitFrames ran the loop');
      const s = await t.stepUntil(() => (window.__checks = (window.__checks || 0) + 1) > 3, { max: 10, chunk: 1 });
      t.expect(s && s.dots, 'stepUntil returns the state');
      t.equal(await t.page.evaluate(() => window.__checks), 4, 'stepUntil checked until the predicate held');
    },
  },
];
