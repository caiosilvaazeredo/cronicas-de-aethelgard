// Percorre as telas e várias fases num idioma e lista os textos que ficaram sem tradução.
// node scripts/i18n/check.cjs <idioma> [pasta de capturas]
const { chromium } = require('playwright');
const lang = process.argv[2] || 'en'; const shots = process.argv[3];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  p.on('pageerror', (e) => console.log('ERRO', e.message));
  await p.goto('http://localhost:5173/?lang=' + lang);
  await p.waitForFunction(() => window.__skullshift?.scene.isActive('menu'), null, { timeout: 180000 });
  await p.evaluate(async () => { const m = await import('/src/game/progress.ts'); m.setFreePlay(true); });
  const go = (key, data) => p.evaluate(([key, data]) => { const g = window.__skullshift; g.scene.getScenes(false).forEach((s) => s.scene.key !== key && (s.scene.isActive() || s.scene.isPaused()) && s.scene.stop()); g.scene.start(key, data); }, [key, data]);
  let n = 0; const snap = async (name) => { if (shots) await p.screenshot({ path: `${shots}/${String(n++).padStart(2, '0')}_${name}.jpg`, type: 'jpeg', quality: 80 }); };
  await sleep(1500); await snap('menu');
  for (const [key, data] of [['language'], ['settings', { from: 'menu' }], ['slots'], ['controls', { mode: 'story' }], ['howto', { mode: 'versus', devices: ['kb-left', 'kb-right'] }], ['loadout', { devices: ['kb-left', 'kb-right'] }], ['world'], ['map', { area: 'mare' }], ['shop', { devices: ['kb-full'] }], ['journal'], ['credits', { next: 'menu', data: {} }], ['memory', { index: 0 }], ['vn', { level: 0 }]]) {
    await go(key, data); await sleep(1300); await snap(key);
    if (key === 'journal') { await p.keyboard.press('ArrowRight'); await sleep(500); await snap('journal2'); }
  }
  const total = await p.evaluate(async () => (await import('/src/game/level.ts')).LEVELS.length);
  for (let lv = 0; lv < total; lv += (process.env.ALL ? 1 : 7)) {
    await go('game', { mode: 'story', devices: ['kb-full'], level: lv }); await sleep(1200);
    await p.keyboard.down('d'); for (let i = 0; i < 8; i++) { await p.keyboard.press('j'); await sleep(250); } await p.keyboard.up('d');
    if (lv % 21 === 0) await snap('lv' + lv);
    if (lv === 0) { await p.keyboard.press('Escape'); await sleep(500); await snap('pause'); }
  }
  await go('game', { mode: 'versus', devices: ['kb-left', 'kb-right'] }); await sleep(2500); await snap('versus');
  const miss = await p.evaluate(async () => [...(await import('/src/i18n/index.ts')).missing]);
  console.log('SEM TRADUÇÃO:', miss.length); for (const m of miss) console.log(' ', JSON.stringify(m));
  await b.close();
})();
