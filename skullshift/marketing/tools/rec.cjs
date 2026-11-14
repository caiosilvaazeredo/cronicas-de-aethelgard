// Gravador quadro a quadro: relógio falso (16 ms por quadro), captura 2560x1440.
const { chromium } = require('playwright');
const fs = require('fs');
const PREV = !!process.env.PREVIEW;
exports.PREV = PREV;
exports.open = async (opts = {}) => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const c = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: PREV ? 0.5 : 2 });
  const p = await c.newPage();
  p.on('pageerror', (e) => console.log('PAGEERR', e.message));
  await p.goto('http://localhost:5173');
  await p.waitForFunction(() => window.__skullshift?.scene.isActive('menu'), null, { timeout: 180000 });
  await p.evaluate(async () => { const m = await import('/src/game/progress.ts'); m.setFreePlay(true); const mu = await import('/src/game/music.ts'); mu.stopMusic?.(); });
  await p.clock.install();
  await p.clock.pauseAt(new Date(Date.now() + 500));
  const api = {
    b, p, n: 0, _taps: [],
    tap: async (k, n = 3) => { if (api._taps.some((t) => t[0] === k)) return; await p.keyboard.down(k); api._taps.push([k, n]); },
    _tick: async () => { for (const t of api._taps) if (--t[1] <= 0) await p.keyboard.up(t[0]); api._taps = api._taps.filter((t) => t[1] > 0); },
    start: (key, data) => p.evaluate(([key, data]) => { const g = window.__skullshift; g.scene.getScenes(false).forEach((s) => s.scene.key !== key && (s.scene.isActive() || s.scene.isPaused()) && s.scene.stop()); g.scene.start(key, data); }, [key, data]),
    // avança sem gravar
    skip: async (frames) => { for (let i = 0; i < frames; i++) { await p.clock.runFor(16); await api._tick(); } },
    // grava `frames` quadros em dir; fn(i) roda antes de cada quadro
    rec: async (dir, frames, fn) => {
      dir = (PREV ? 'prev/' : 'clips/') + dir; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); api.n = 0;
      for (let i = 0; i < frames; i++) {
        if (fn) await fn(i);
        await p.clock.runFor(16); await api._tick();
        if (PREV && i % 12) continue;
        await p.screenshot({ path: `${dir}/f${String(api.n++).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 97 });
      }
    },
    // estado do herói + proteção (não morre em cena)
    hero: (pi = 0, kill = false, noprot = false) => p.evaluate(([pi, kill, noprot]) => { const s = window.__skullshift.scene.getScene('game'); const pl = s.players?.[pi]; if (!pl) return null; if (!noprot) pl.protect(300);
      const dir = pl.sprite?.flipX ? -1 : 1; let near = 9999;
      let ne = null; for (const e of s.enemies ?? []) if (e.f.alive && e.f.team !== pl.team && Math.abs(e.f.feet - pl.feet) < 260) { const d = e.f.x - pl.x; if (Math.abs(d) < Math.abs(near)) { near = d; ne = e.f; } }
      if (kill && ne && Math.abs(near) < 150) ne.kill('hit', Math.sign(near) || 1);
      for (const o of s.players) if (o !== pl && o.alive && s.mode !== 'story') { const d = o.x - pl.x; if (Math.abs(d) < Math.abs(near)) near = d; }
      if (s.boss && s.boss.sprite?.visible && s.bossStarted) { const d = s.boss.x - pl.x; if (Math.abs(d) < Math.abs(near)) near = d; }
      const g = (x) => s.level.groundY(x);
      return { x: pl.x, feet: pl.feet, on: pl.onGround, vy: pl.body.velocity.y, gapR: g(pl.x + 70) == null, gapL: g(pl.x - 70) == null, near, cut: !!s.cutscene, char: pl.def.id, alive: pl.alive, deaths: s.deaths, w: s.level.width, screen: s.screen, boss: s.boss ? { x: s.boss.x, hp: s.boss.hp, f: s.boss.fighting } : null }; }, [pi, kill, noprot]),
    // um quadro de "jogador correndo para a direita e batendo"
    runner: async (i, o = {}) => { const st = await api.hero(); if (!st) return st; const kb = p.keyboard;
      if (st.cut) { if (i % 8 === 0) await api.tap('j'); return st; }
      if (i === 0 || i % 30 === 0) { await kb.down("d"); await kb.down("Shift"); }
      if (st.gapR && st.on) await api.tap('w'); else if (st.gapR && !st.on && st.vy > 120) await api.tap('w');
      if (Math.abs(st.near) < (o.reach ?? 150) && i % (o.rate ?? 12) === 0) await api.tap('j');
      return st; },
    // lutador: vai atrás do inimigo mais próximo e bate; sem inimigo, corre para a direita
    fighter: async (i, o = {}) => { const kill = o.kill !== false && api._killAt !== undefined && i >= api._killAt; if (kill) api._killAt = undefined; const st = await api.hero(o.pi ?? 0, kill, o.noprot); if (!st) return st; const kb = p.keyboard; const K = o.keys ?? { l: 'a', r: 'd', j: 'w', a: 'j', s: 'Shift' };
      if (st.cut) { if (i % 8 === 0) await api.tap(K.a); return st; }
      const has = Math.abs(st.near) < (o.sight ?? 700); const dir = has ? Math.sign(st.near) || 1 : 1; const reach = o.reach ?? 95;
      const far = !has || Math.abs(st.near) > reach;
      if (api['_dir'+(o.pi??0)] !== dir || api['_far'+(o.pi??0)] !== far || i === 0) { await kb.up(K.l); await kb.up(K.r); if (far) { await kb.down(dir > 0 ? K.r : K.l); if (K.s) await kb.down(K.s); } else { await api.tap(dir > 0 ? K.r : K.l); if (K.s) await kb.up(K.s); } api['_dir'+(o.pi??0)] = dir; api['_far'+(o.pi??0)] = far; }
      const gap = dir > 0 ? st.gapR : st.gapL;
      if (far && gap && st.on) await api.tap(K.j); else if (far && gap && !st.on && st.vy > 100) await api.tap(K.j);
      if (!far && i % (o.rate ?? 14) === 0) { await api.tap(K.a); if (api._killAt === undefined) api._killAt = i + (o.killDelay ?? 7); }
      if (o.hop && far && st.on && i % o.hop === 0) await api.tap(K.j);
      return st; },
    tp: (x, pi = 0) => p.evaluate(([x, pi]) => { const s = window.__skullshift.scene.getScene('game'); const pl = s.players[pi]; const gy = s.level.groundY(x) ?? 472; pl.respawn(x, gy); pl.protect(300); return gy; }, [x, pi]),
    ev: (fn, arg) => p.evaluate(fn, arg),
    keysUp: async () => { for (const k of ['a', 'd', 'w', 's', 'q', 'Shift', 'j', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'f']) await p.keyboard.up(k); },
    close: () => b.close(),
  };
  return api;
};
