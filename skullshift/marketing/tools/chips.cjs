const { chromium } = require('playwright'); const path = require('path');
const ids = ['story', 'shift', 'parry', 'boss', 'flight', 'versus', 'shop', 'finale'];
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto('file://' + path.resolve('cards.html')); await p.evaluate(() => document.fonts.load('10px AM')); await p.evaluate(() => window.render('story', 'chip', 'pt', 0)); await p.waitForTimeout(400);
  for (const lang of ['pt', 'en']) for (const id of ids) { await p.evaluate((a) => window.render(...a), [id, 'chip', lang, 0]); await p.screenshot({ path: `cards/${lang}/chips/f${String(ids.indexOf(id)).padStart(5, '0')}.png`, omitBackground: true }); }
  await b.close(); })();
