// Robô das dungeons: joga salas de luta geradas com o jogador abaixo, no e acima do nível
// sugerido e mede vitória, tempo e corações perdidos (para calibrar a dificuldade).
// Uso (com o jogo em http://localhost:5173): node scripts/bots/dungeon-bot.cjs [áreas] [segundos]
const { chromium } = require('playwright');
const areas = (process.argv[2] || 'mare,pradaria,forja,minas').split(',');
const SECS = Number(process.argv[3] || 75);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:5173/?lang=pt-BR');
  await p.waitForFunction(() => window.__skullshift?.scene.isActive('menu'), null, { timeout: 180000 });
  const kb = p.keyboard;
  const rows = [];
  for (const area of areas) {
    for (const delta of [-4, 0, 6]) {
      const info = await p.evaluate(
        async ([area, delta]) => {
          const pr = await import('/src/game/progress.ts');
          const ar = await import('/src/game/areas.ts');
          const d = await import('/src/game/dungeon.ts');
          pr.newSlot(3, 'normal');
          const rec = ar.recommendedLevel(ar.areaById(area));
          const want = Math.max(1, rec + delta);
          pr.addXp(pr.xpForLevel(want));
          const r = d.startRun(area, 'map', false);
          const n = r.nodes.find((x) => x.kind === 'fight' && x.col <= 2) || r.nodes.find((x) => x.kind === 'fight');
          r.at = n.id;
          const idx = d.prepareRoom(r, n);
          const g = window.__skullshift;
          g.scene.getScenes(true).forEach((s) => s.scene.key !== 'fade' && s.scene.stop());
          g.scene.start('game', { mode: 'story', devices: ['kb-full'], level: idx });
          return { rec, lvl: pr.getLevel(), hearts: r.hearts };
        },
        [area, delta],
      );
      await sleep(1500);
      const t0 = Date.now();
      let res = 'tempo esgotado';
      while (Date.now() - t0 < SECS * 1000) {
        const st = await p
          .evaluate(async () => {
            const g = window.__skullshift;
            const d = await import('/src/game/dungeon.ts');
            const r = d.getRun();
            const s = g.scene.getScene('game');
            const active = g.scene.getScenes(true).map((x) => x.scene.key);
            let near = 9999;
            if (s?.players?.[0]) for (const e of s.enemies ?? []) if (e.f.alive) near = Math.min(near, Math.abs(e.f.x - s.players[0].x));
            return { r: r ? { hearts: r.hearts, last: r.lastFight, over: r.over } : null, active, near };
          })
          .catch(() => null);
        if (st && (!st.r || st.r.over === 'lose')) {
          res = 'derrota';
          break;
        }
        if (st && st.r?.last === 'win') {
          res = 'vitória';
          break;
        }
        if (st && !st.active.includes('game')) {
          await sleep(500);
          continue;
        }
        // Agressivo com cabeça: corre, ataca, pula de vez em quando, defende quando alguém chega muito perto.
        await kb.down('d');
        if (st && st.near < 120 && Math.random() < 0.3) {
          await kb.down('q'); await sleep(200); await kb.up('q');
        }
        await kb.press('j'); await sleep(110); await kb.press('j');
        if (Math.random() < 0.35) await kb.press('w');
        await sleep(140);
      }
      for (const k of ['d', 'q']) await kb.up(k).catch(() => {});
      const after = await p.evaluate(async () => (await import('/src/game/dungeon.ts')).getRun()?.hearts ?? 0).catch(() => 0);
      rows.push({ area, rec: info.rec, nivel: info.lvl, resultado: res, segundos: Math.round((Date.now() - t0) / 1000), coracoes: `${after}/${info.hearts}` });
      console.log(JSON.stringify(rows[rows.length - 1]));
    }
  }
  if (errs.length) console.log('ERROS', [...new Set(errs)].slice(0, 5));
  await b.close();
})();
