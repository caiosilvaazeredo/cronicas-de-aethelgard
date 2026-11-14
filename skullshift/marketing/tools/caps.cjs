const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 3840, height: 1300 } })).newPage();
  await p.goto('file://' + path.resolve('caps.html')); await p.evaluate(() => document.fonts.load('10px AM'));
  const sizes = await p.evaluate(() => window.sizes); fs.mkdirSync('steam', { recursive: true });
  for (const [k, [w, h]] of Object.entries(sizes)) { await p.evaluate((k) => window.render(k), k); await p.waitForTimeout(400); await p.screenshot({ path: `steam/${k}_${w}x${h}.png`, clip: { x: 0, y: 0, width: w, height: h }, omitBackground: true }); }
  await b.close();
})();
