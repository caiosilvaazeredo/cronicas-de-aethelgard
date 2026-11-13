// Uso: com o jogo rodando em http://localhost:5173 (npx vite --port 5173), rode `node scripts/check-reach.cjs`.
// Troque vx = 384 por 240 para checar sem pique (fases que exigem corrida aparecem como falha).
// Verificador de alcance: para cada fase, monta as superfícies e vê se dá para ir do início ao fim
// com pulo, pulo duplo, molas, cogumelos, vento, escadas e caixotes. Roda dentro do jogo (dados reais).
const { chromium } = require('playwright');
const only = process.argv[2] ? process.argv[2].split(',') : null;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto('http://localhost:5173'); await p.waitForTimeout(3500);
  const results = [];
  const total = await p.evaluate(() => window.__skullshift.scene.getScene("game").sys.game.registry.get("levels") ?? 97);
  for (let lv = 0; lv < total; lv++) {
    await p.evaluate((lv) => { window.__skullshift.scene.getScenes(true)[0].scene.start('game', { mode: 'story', devices: ['kb-full'], level: lv }); }, lv);
    await p.waitForTimeout(700);
    const r = await p.evaluate(() => {
      const s = window.__skullshift.scene.getScene('game');
      const L = s.level, def = L.def;
      if (def.shmup || def.undersea || def.chase || def.secret) return { id: def.id, skip: true };
      const T = 64, FLOOR = 472, top = (h) => FLOOR - h * T;
      const X = (sc, t) => sc * 1280 + t * T + T / 2;
      const surf = [];
      for (const [a, n, h] of L.segments) surf.push({ x0: a * T, x1: (a + n) * T, y: top(h), kind: 'seg' });
      for (const [a, n, h] of L.floats) surf.push({ x0: a * T, x1: (a + n) * T, y: top(h), kind: 'float' });
      const sea = def.sea || {};
      for (const [sc, t, n, h] of sea.planks || []) surf.push({ x0: X(sc, t) - T / 2, x1: X(sc, t) - T / 2 + n * T, y: top(h), kind: 'plank' });
      const high = sea.tide ? sea.tide.high : 0;
      for (const [sc, t, n] of sea.crates || []) {
        surf.push({ x0: X(sc, t) - T / 2, x1: X(sc, t) - T / 2 + n * T, y: 500 - 30, kind: 'crate' });
        if (high) surf.push({ x0: X(sc, t) - T / 2, x1: X(sc, t) - T / 2 + n * T, y: 500 - high - 30, kind: 'crateHigh' });
      }
      // Pontes de árvore (machado), escadas, molas (puzzle).
      const pz = def.puzzle || {};
      for (const [sc, t, h, len] of pz.trees || []) surf.push({ x0: X(sc, t) - len * T, x1: X(sc, t) + len * T, y: top(h), kind: 'tree' });
      const lifts = []; // [x, fromY, toY]
      for (const [sc, t, fh, th] of pz.ladders || []) lifts.push({ x: X(sc, t), from: top(fh), up: top(fh) - top(th) + 10 });
      for (const [sc, t, h] of pz.springs || []) lifts.push({ x: X(sc, t), from: top(h), up: 380 });
      for (const [sc, t, h] of (def.field || {}).mushrooms || []) lifts.push({ x: X(sc, t), from: top(h), up: 360 });
      // Vento: sobe até y≈150 dentro da coluna e plana depois.
      const winds = (def.winds || []).map(([sc, t, w]) => [sc * 1280 + t * T, sc * 1280 + (t + w) * T]);
      // Pulo: v1=580, duplo 0.88, g=1500, corrida 384 px/s (pique).
      const g = 1500, v1 = 580, v2 = 510, vx = 384;
      const best = (t) => {
        // maior altura no instante t escolhendo quando dar o pulo duplo
        let m = -1e9;
        for (let k = 0; k <= 40; k++) {
          const tau = (t * k) / 40;
          const y1 = v1 * tau - (g * tau * tau) / 2;
          const d = t - tau;
          const y = y1 + v2 * d - (g * d * d) / 2;
          if (y > m) m = y;
        }
        return m;
      };
      const canJump = (D, H, boost = 0) => {
        // D distância horizontal (>=0), H subida (positiva para cima). boost: altura extra (mola).
        if (boost) return H <= boost && D <= 380;
        // Dá para andar mais devagar: vale qualquer instante a partir de D/vx (até ~1,2 s depois).
        const t0 = D / vx;
        let m = -1e9;
        for (let k = 0; k <= 24; k++) m = Math.max(m, best(t0 + k * 0.05));
        return m >= H - 4 || (H <= 0 && D < 40);
      };
      const n = surf.length;
      const start = (() => {
        const [sc, t] = def.storyStart;
        const x = X(sc, t);
        let bi = 0, by = 1e9;
        surf.forEach((u, i) => { if (u.x0 <= x && u.x1 >= x && u.kind === 'seg' && u.y < by) { by = u.y; bi = i; } });
        return bi;
      })();
      const seen = new Array(n).fill(false);
      const q = [start];
      seen[start] = true;
      while (q.length) {
        const i = q.shift();
        const A = surf[i];
        for (let j = 0; j < n; j++) {
          if (seen[j]) continue;
          const B = surf[j];
          const D = Math.max(0, Math.max(A.x0, B.x0) - Math.min(A.x1, B.x1));
          const H = A.y - B.y;
          let ok = canJump(D, H);
          // molas/escadas/cogumelos sobre A
          for (const l of lifts) if (l.x >= A.x0 - 10 && l.x <= A.x1 + 10 && Math.abs(l.from - A.y) < 8) {
            const D2 = Math.max(0, Math.max(l.x - 40, B.x0) - Math.min(l.x + 40, B.x1));
            if (canJump(D2, H, l.up + 110)) ok = true;
          }
          // vento: se A encosta numa coluna, sobe até y=150 e plana ~ 420px
          for (const [w0, w1] of winds) {
            const near = Math.max(0, Math.max(A.x0, w0) - Math.min(A.x1, w1)) <= 200;
            if (!near) continue;
            const D3 = Math.max(0, Math.max(w0, B.x0) - Math.min(w1, B.x1));
            if (B.y >= 150 && D3 <= 460) ok = true;
          }
          if (ok) { seen[j] = true; q.push(j); }
        }
      }
      const maxX = Math.max(...surf.filter((u, i) => seen[i]).map((u) => u.x1));
      let goalX = L.width - 70;
      if (def.puzzle) goalX = X(def.puzzle.door[0], def.puzzle.door[1]);
      if (def.haunt && def.haunt.doors) { const e = def.haunt.doors.find((d) => d.exit); if (e) goalX = X(e.screen, e.tile); }
      const reached = surf.some((u, i) => seen[i] && u.x0 <= goalX && u.x1 >= goalX - 1);
      // primeira superfície (em x) não alcançada, para depurar
      const firstMiss = surf.filter((u, i) => !seen[i] && u.kind === 'seg').sort((a, b) => a.x0 - b.x0)[0];
      return { id: def.id, reached, maxX: Math.round(maxX), goalX: Math.round(goalX), miss: firstMiss ? [Math.floor(firstMiss.x0 / 1280), Math.round((firstMiss.x0 % 1280) / 64), (FLOOR - firstMiss.y) / 64] : null };
    });
    if (only && !only.includes(r.id)) continue;
    results.push(r);
  }
  for (const r of results) if (!r.skip && !r.reached) console.log('FALHA', JSON.stringify(r));
  console.log('ok', results.filter((r) => r.reached).length, 'falhas', results.filter((r) => !r.skip && !r.reached).length, 'puladas', results.filter((r) => r.skip).map((r) => r.id).join(','));
  await b.close();
})();
