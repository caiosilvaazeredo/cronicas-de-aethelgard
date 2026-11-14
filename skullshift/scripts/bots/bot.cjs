// Robô jogador: node bot.cjs <perfil> [segundos por fase]
// Perfis: agressivo, cauteloso, explorador, caotico, retrato (celular em pé)
const { chromium, devices } = require('playwright');
const fs = require('fs');
const profile = process.argv[2] || 'agressivo';
const SECS = Number(process.argv[3] || 9);
const OFFSET = Number(process.argv[4] || 0);
const COUNT = Number(process.argv[5] || 0);
const TAG = process.argv[6] || profile;
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const b = await chromium.launch();
  const ctx = profile === 'retrato' ? { ...devices['iPhone 13'] } : { viewport: { width: 1280, height: 720 } };
  const c = await b.newContext(ctx);
  const p = await c.newPage();
  let errs = [];
  p.on('pageerror', (e) => errs.push(e.message + ' | ' + (e.stack || '').split('\n').slice(1, 3).join(' / ')));
  await p.goto('http://localhost:5173');
  await p.waitForFunction(() => window.__skullshift?.scene.isActive('menu'), null, { timeout: 180000 });
  await p.evaluate(async () => { const m = await import('/src/game/progress.ts'); m.setFreePlay(true); });
  const total = await p.evaluate(async () => (await import('/src/game/level.ts')).LEVELS.length);
  const kb = p.keyboard;
  const state = () =>
    p.evaluate(() => {
      const s = window.__skullshift.scene.getScene('game');
      const pl = s?.players?.[0];
      if (!pl || !s.level) return null;
      let near = 9999;
      for (const e of s.enemies ?? []) if (e.f.alive && e.f.team !== pl.team) near = Math.min(near, Math.abs(e.f.x - pl.x) * Math.sign(e.f.x - pl.x || 1));
      return { x: pl.x, w: s.level.width, alive: pl.alive, deaths: s.deaths, ended: !!s.ended, char: pl.def.id, near, cut: !!s.cutscene, boss: !!s.boss };
    });

  // Um "turno" de cada perfil (~0,25–0,5 s de entradas).
  const turns = {
    async agressivo() {
      await kb.down('d'); await kb.down('Shift');
      await kb.press('j'); await sleep(120); await kb.press('j');
      if (Math.random() < 0.3) await kb.press('w');
      await sleep(150);
    },
    async cauteloso(st) {
      if (st && Math.abs(st.near) < 170) {
        // Inimigo perto: toca para trás (contra), defende um pouco e contra-ataca.
        const away = st.near > 0 ? 'a' : 'd';
        await kb.up('d');
        await kb.press(away); await kb.down('q'); await sleep(220); await kb.up('q');
        await kb.press('j');
      } else {
        await kb.down('d'); await sleep(260); await kb.up('d');
        if (Math.random() < 0.25) await kb.press('w');
      }
      await sleep(80);
    },
    async explorador() {
      await kb.down('d');
      await kb.press('w'); await sleep(140); await kb.press('w'); // pulo duplo
      if (Math.random() < 0.4) await kb.press('e');
      if (Math.random() < 0.2) { await kb.down('s'); await kb.press('e'); await kb.up('s'); } // guardar item
      if (Math.random() < 0.15) await kb.press('r'); // soltar reserva
      if (Math.random() < 0.2) { await kb.down('w'); await sleep(250); await kb.up('w'); } // escadas / voo
      await sleep(120);
    },
    async caotico() {
      const keys = ['a', 'd', 'w', 's', 'j', 'k', 'q', 'e', 'r', 'Shift', 'Space', 'ArrowUp', 'ArrowDown'];
      for (let i = 0; i < 4; i++) {
        const k = rnd(keys);
        if (Math.random() < 0.5) await kb.press(k);
        else { await kb.down(k); await sleep(Math.random() * 200); await kb.up(k); }
      }
      await sleep(60);
    },
    async retrato() {
      await kb.down('d'); await kb.press('j');
      if (Math.random() < 0.35) await kb.press('w');
      await sleep(250);
    },
  };
  const turn = turns[profile] ?? turns.agressivo;

  const report = [];
  for (let n = 0; n < (COUNT || total); n++) {
    const lv = (n + OFFSET) % total;
    errs = [];
    await p.evaluate((lv) => (window.__skullshift.scene.getScenes(false).forEach(s => s.scene.key !== 'game' && s.scene.isActive() && s.scene.stop()), window.__skullshift.scene.start('game', { mode: 'story', devices: ['kb-full'], level: lv })), lv);
    await sleep(1300);
    const t0 = Date.now();
    let maxX = 0, startX = null, lastX = null, stuckFor = 0, maxStuck = 0, st = null;
    while (Date.now() - t0 < SECS * 1000) {
      st = await state().catch(() => null);
      if (st) {
        if (startX === null) startX = st.x;
        maxX = Math.max(maxX, st.x);
        if (!st.cut && st.alive && lastX !== null && Math.abs(st.x - lastX) < 2) stuckFor += 1; else stuckFor = 0;
        maxStuck = Math.max(maxStuck, stuckFor);
        lastX = st.x;
        if (st.cut) await kb.press('j'); // passa as falas
      }
      await turn(st);
    }
    for (const k of ['d', 'a', 'Shift', 'q', 's', 'w']) await kb.up(k).catch(() => {});
    const fin = (await state().catch(() => null)) ?? st ?? {};
    const id = await p.evaluate(() => window.__skullshift.scene.getScene('game').level?.def.id).catch(() => '?');
    report.push({
      lv, id,
      progresso: fin.w ? Math.round(((maxX - (startX ?? 0)) / fin.w) * 100) : 0,
      mortes: fin.deaths ?? 0,
      terminou: !!fin.ended,
      travadoMax: maxStuck, // turnos seguidos sem sair do lugar
      forma: fin.char,
      erros: [...new Set(errs)].slice(0, 3),
    });
    fs.writeFileSync(`rel_${TAG}.json`, JSON.stringify(report, null, 1));
  }
  await b.close();
  console.log('fim', profile, report.length);
})();
