const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto('file://' + path.resolve('cards.html')); await p.evaluate(() => document.fonts.load('10px AM').then(() => document.fonts.load('10px MS'))); await p.evaluate(() => window.render('guide', 'avatar', 'pt', 1)); await p.waitForTimeout(500);
  for (const lang of ['pt', 'en']) {
    const dir = `cards/${lang}/guide_avatar`; fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < 90; i++) { await p.evaluate((a) => window.render(...a), ['guide', 'avatar', lang, i / 60]); await p.screenshot({ path: `${dir}/f${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 96 }); }
    await p.evaluate((a) => window.render(...a), ['guide', 'chip', lang, 0]); await p.screenshot({ path: `cards/${lang}/chips/f00008.png`, omitBackground: true });
  }
  await b.close(); })();
