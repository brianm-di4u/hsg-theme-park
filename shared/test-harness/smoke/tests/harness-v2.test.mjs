// Self-tests for the second round of harness helpers.
export const tests = [
  {
    name: 'frameCost, cpuThrottle, contrastReport',
    viewports: ['desktop'],
    async run(t) {
      const c = await t.frameCost(500);
      t.expect(c.frames > 5 && c.taskMs >= 0 && c.taskMs < 50, `frameCost sane: ${JSON.stringify(c)}`);
      t.log('frameCost', JSON.stringify(c));
      await t.cpuThrottle(4);
      await t.cpuThrottle(1);
      const r = await t.contrastReport();
      t.expect(r.checked > 0, `contrast checked ${r.checked} elements`);
      await t.page.evaluate(() => {
        const d = document.createElement('p'); d.id = 'faint'; d.textContent = 'faint text';
        d.style.cssText = 'color:#bbb;background:#fff;font-size:14px;position:fixed;top:0;left:0';
        const h = d.cloneNode(true); h.id = 'decor'; h.setAttribute('aria-hidden', 'true');
        document.body.append(d, h);
      });
      const r2 = await t.contrastReport();
      t.expect(r2.fails.some((f) => f.includes('#faint')), 'low-contrast text is reported');
      t.expect(!r2.fails.some((f) => f.includes('#decor')), 'aria-hidden text is skipped');
    },
  },
  {
    name: 'shot waits for finite CSS animations; waitIdle alias',
    viewports: ['desktop'],
    async run(t) {
      await t.waitIdle();
      await t.page.evaluate(() => {
        const d = document.createElement('div'); d.textContent = 'toast';
        d.style.cssText = 'position:fixed;top:40px;left:40px;padding:20px;background:#222;color:#fff';
        document.body.append(d);
        d.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600 });
        const p = document.createElement('div'); p.style.cssText = 'position:fixed;top:0;right:0;width:20px;height:20px;background:red';
        document.body.append(p);
        p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, iterations: Infinity });
      });
      const t0 = Date.now();
      await t.shot('05-after-toast', { animations: true });
      const waited = Date.now() - t0;
      t.expect(waited >= 400 && waited < 3000, `waited for the toast but not the infinite pulse (${waited} ms)`);
    },
  },
  {
    name: 'file:// mode loads the game from disk',
    viewports: ['desktop'],
    fileUrl: true,
    url: 'index.html?x=1',
    async run(t) {
      t.expect(t.fileUrl, 't.fileUrl is set');
      t.expect(await t.page.evaluate(() => location.protocol === 'file:' && location.search === '?x=1'), 'page is on file:// with its query');
      await t.shot('06-file-url');
    },
  },
  {
    name: 'node-only check',
    node: true,
    async run(t) { t.equal(1 + 1, 2, 'arithmetic'); t.log('ran without a browser'); },
  },
  {
    name: 'slow test is skipped without --slow',
    slow: true,
    viewports: ['desktop'],
    async run(t) { t.log('slow test ran'); },
  },
];
