const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ids = ['story', 'shift', 'parry', 'boss', 'flight', 'versus', 'shop', 'finale'];
const test = process.argv[2] === 'test';
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto('file://' + path.resolve('cards.html')); await p.evaluate(() => document.fonts.load('10px AM').then(() => document.fonts.load('10px MS')));
  await p.evaluate(() => window.render('story', 'title', 'pt', 1)); await p.waitForTimeout(500);
  const shot = async (dir, i, args, png) => { fs.mkdirSync(dir, { recursive: true }); await p.evaluate((a) => window.render(...a), args); await p.screenshot({ path: `${dir}/f${String(i).padStart(5, '0')}.${png ? 'png' : 'jpg'}`, ...(png ? { omitBackground: true } : { type: 'jpeg', quality: 96 }) }); };
  if (test) { let k = 0; for (const id of ids) { await shot('cardtest', k++, [id, 'title', 'pt', 1.2]); await shot('cardtest', k++, [id, 'avatar', 'en', 1.2]); } await shot('cardtest', k++, ['', 'end', 'pt', 2]); await b.close(); return; }
  for (const lang of ['pt', 'en']) {
    for (const id of ids) {
      for (let i = 0; i < 90; i++) await shot(`cards/${lang}/${id}_title`, i, [id, 'title', lang, i / 60]);
      for (let i = 0; i < 90; i++) await shot(`cards/${lang}/${id}_avatar`, i, [id, 'avatar', lang, i / 60]);
      await shot(`cards/${lang}/chips`, ids.indexOf(id), [id, 'chip', lang, 0], true);
    }
    for (let i = 0; i < 150; i++) await shot(`cards/${lang}/logo`, i, ['', 'logo', lang, i / 60]);
    for (let i = 0; i < 270; i++) await shot(`cards/${lang}/end`, i, ['', 'end', lang, i / 60]);
  }
  await b.close();
})();
