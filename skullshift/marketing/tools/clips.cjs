const R = require('./rec.cjs');
const which = process.argv.slice(2);
const G = "window.__skullshift.scene.getScene('game')";
const game = (r, lv, extra = {}) => r.start('game', { mode: 'story', devices: ['kb-full'], level: lv, ...extra });
const C = {
  async menu(r) { await r.start('menu'); await r.skip(20); await r.rec('menu', 420); },
  async world(r) { await r.start('world'); await r.skip(40); await r.rec('world', 200); },
};
// passeio pelos mundos (bloco 2)
for (const [name, lv, ch] of [['t_mare', 27, 'skull'], ['t_forja', 48, 'skull'], ['t_bosque', 59, 'skull'], ['t_ceu', 81, 'skull']])
  C[name] = async (r) => { await game(r, lv); await r.skip(170); let st; await r.rec(name, 220, async (i) => { st = await r.fighter(i, { hop: 45 }); }); console.log(name, JSON.stringify(st)); };
// transformações (bloco 3)
for (const [name, lv, item, fly] of [['s_gnoll', 33, 'bone'], ['s_shark', 31, 'harpoon'], ['s_spider', 3, 'web'], ['s_mino', 46, 'horn'], ['s_bat', 87, 'wing', true]])
  C[name] = async (r) => {
    await game(r, lv); await r.skip(170);
    await r.ev(([item]) => { const s = window.__skullshift.scene.getScene('game'); const pl = s.players[0]; s.spawnItem(pl.x + 130, item, false); }, [item]);
    let st, picked = -1;
    await r.rec(name, 260, async (i) => {
      if (picked < 0) { st = await r.hero(); if (i === 0) await r.p.keyboard.down('d'); if (i === 28) { await r.p.keyboard.up('d'); await r.p.keyboard.down('e'); } if (st.char !== 'skull') { picked = i; await r.p.keyboard.up('e'); } return; }
      if (i < picked + 70) { st = await r.hero(); return; }
      st = await r.fighter(i, { hop: fly ? 0 : 50 });
      if (fly && i % 6 === 0) await r.tap('w');
    });
    console.log(name, JSON.stringify(st));
  };
// contra + reserva (bloco 4)
C.parry = async (r) => {
  await game(r, 33); await r.skip(170);
  let log = [];
  await r.rec('parry', 420, async (i) => {
    const st = await r.ev(() => { const s = window.__skullshift.scene.getScene('game'); const pl = s.players[0]; let d = 9999; for (const pr of s.projectiles) if (pr.owner !== pl && pr.owner?.team !== pl.team) { const dx = pr.sprite.x - pl.x; if (Math.abs(dx) < Math.abs(d)) d = dx; } let near = 9999; for (const e of s.enemies) if (e.f.alive) { const dx = e.f.x - pl.x; if (Math.abs(dx) < Math.abs(near)) near = dx; } return { d, near, x: pl.x, alive: pl.alive, n: s.projectiles.length }; });
    if (i === 0) await r.p.keyboard.down('d');
    if (Math.abs(st.near) < 380) await r.p.keyboard.up('d'); else if (i % 20 === 0) await r.p.keyboard.down('d');
    if (Math.abs(st.d) < 62 && i > (r._pc ?? 0)) { await r.p.keyboard.up('d'); await r.tap(st.d > 0 ? 'a' : 'd', 14); r._pc = i + 40; log.push([i, Math.round(st.d)]); }
    await r.ev(() => window.__skullshift.scene.getScene('game').players[0].protect(0));
    if (i % 30 === 0) log.push(['st', i, Math.round(st.near), st.n, st.alive]);
  });
  console.log('parry', JSON.stringify(log));
};
C.reserve = async (r) => {
  await game(r, 46); await r.skip(170);
  await r.ev(() => { const s = window.__skullshift.scene.getScene('game'); s.setReserve(0, 'horn'); });
  let st;
  await r.rec('reserve', 260, async (i) => {
    if (i === 20) await r.tap('r');
    if (i < 150) { st = await r.hero(); if (i > 60 && i % 6 === 0) await r.tap('e'); return; }
    st = await r.fighter(i);
  });
  console.log('reserve', JSON.stringify(st));
};
// chefes (bloco 5)
for (const [name, lv] of [['b_spider', 4], ['b_mino', 7], ['b_shark', 32]])
  C[name] = async (r) => {
    await game(r, lv); await r.skip(60);
    const w = await r.ev(() => { const s = window.__skullshift.scene.getScene('game'); return [s.level.width, s.level.screenCount]; });
    let st;
    for (let i = 0; i < 1500; i++) { await r.ev(() => { const s = window.__skullshift.scene.getScene('game'); for (const e of s.enemies) if (e.f.alive && e.f.team !== s.players[0].team) e.f.kill('hit', 1); }); st = await r.runner(i); await r.skip(1); if (st?.boss?.f) break; }
    console.log(name, 'pre', JSON.stringify(st));
    await r.rec(name, 360, async (i) => { st = await r.fighter(i, { kill: false, reach: 130, rate: 16 }); });
    console.log(name, JSON.stringify(st));
  };
// voo (bloco 6)
for (const [name, lv, pact] of [['f_bat', 11, 'bat'], ['f_bee', 15, 'bee']])
  C[name] = async (r) => {
    await r.ev(async (pact) => { (await import('/src/game/progress.ts')).setPact(pact); }, pact);
    await game(r, lv); await r.skip(200);
    await r.ev(() => { const s = window.__skullshift.scene.getScene('game'); s.shmup.hits = () => false; });
    await r.p.keyboard.down('j');
    await r.rec(name, 300, async (i) => { const k = Math.floor(i / 35) % 4; if (i % 35 === 0) { await r.p.keyboard.up('w'); await r.p.keyboard.up('s'); if (k === 0) await r.p.keyboard.down('w'); if (k === 2) await r.p.keyboard.down('s'); } if (i % 90 === 60) await r.tap('k'); });
  };
// versus (bloco 7)
C.loadout = async (r) => { await r.start('loadout', { devices: ['kb-left', 'kb-right'] }); await r.skip(30); await r.rec('loadout', 150, async (i) => { if (i % 30 === 15) await r.tap('s'); if (i % 30 === 0 && i) await r.tap('ArrowDown'); }); };
C.versus = async (r) => {
  await r.start('game', { mode: 'versus', devices: ['kb-left', 'kb-right'], loadouts: [['deflect', 'stubborn', 'reflex'], ['deflect', 'cloak']] });
  await r.skip(150);
  const K0 = { l: 'a', r: 'd', j: 'w', a: 'f', s: null }, K1 = { l: 'ArrowLeft', r: 'ArrowRight', j: 'ArrowUp', a: 'Enter', s: null };
  let st;
  await r.rec('versus', 660, async (i) => {
    if (i === 30) await r.ev(() => { const s = window.__skullshift.scene.getScene('game'); s.dropItem('horn'); s.dropItem('bone'); });
    if (i === 200) await r.ev(() => { const s = window.__skullshift.scene.getScene('game'); s.dropAssist(); s.dropItem('web'); });
    if (i === 330) await r.ev(() => { const s = window.__skullshift.scene.getScene('game'); s.chaos.nextEvent = 0; });
    if (i === 420) await r.ev(() => { const s = window.__skullshift.scene.getScene('game'); s.summonAssist(0); });
    st = await r.fighter(i, { pi: 0, keys: K0, kill: false, noprot: true, rate: 22, hop: 70 });
    await r.fighter(i + 11, { pi: 1, keys: K1, kill: false, noprot: true, rate: 26, hop: 90 });
    if (i % 12 === 0) { await r.tap('e'); await r.tap('.'); }
  });
  console.log('versus', JSON.stringify(st));
};
// empório (bloco 8)
C.shop = async (r) => { await r.start('shop', { devices: ['kb-full'] }); await r.skip(40); await r.rec('shop', 300, async (i) => { if (i % 50 === 40) await r.tap('d'); }); };
// luta final (bloco 9)
C.finale = async (r) => {
  await game(r, 23, { finalePhase: 4 }); let st;
  for (let i = 0; i < 2500; i++) { st = await r.fighter(i, { kill: false }); await r.skip(1); if (st?.boss?.f) break; }
  console.log('finale pre', JSON.stringify(st)); await r.skip(120);
  await r.rec('finale', 360, async (i) => { st = await r.fighter(i, { kill: false, reach: 110 }); });
  console.log('finale', JSON.stringify(st));
};
(async () => {
  for (const n of which) {
    const r = await R.open();
    try { await C[n](r); } catch (e) { console.log(n, 'FALHOU', e.message.split('\n')[0]); }
    await r.keysUp().catch(() => {}); await r.close();
  }
})();
