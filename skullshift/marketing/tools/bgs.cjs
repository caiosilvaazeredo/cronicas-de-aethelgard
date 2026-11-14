const R = require('./rec.cjs');
(async () => {
  const r = await R.open();
  for (const [name, lv] of [['shore', 0], ['forge', 48], ['sky', 12], ['forest', 59], ['prairie', 33], ['haunt', 20]]) {
    await r.start('game', { mode: 'story', devices: ['kb-full'], level: lv }); await r.skip(260);
    await r.ev(() => { const g = window.__skullshift; g.scene.getScene('ui').scene.setVisible(false); const s = g.scene.getScene('game'); for (const pl of s.players) { pl.sprite.setVisible(false); pl.setMarkersVisible(false); pl.sprite.setAlpha(0); } for (const o of s.children.list) if (o.type === 'Text') o.setVisible(false); });
    await r.skip(2);
    await r.ev(() => { const s = window.__skullshift.scene.getScene('game'); for (const pl of s.players) pl.sprite.setAlpha(0); });
    await r.p.screenshot({ path: `bg/raw_${name}.png` });
  }
  await r.close();
})();
