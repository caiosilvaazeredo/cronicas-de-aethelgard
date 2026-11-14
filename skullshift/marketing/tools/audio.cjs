// Grava a música do próprio jogo em tempo real (MediaRecorder sobre a saída do AudioContext).
const { chromium } = require('playwright'); const fs = require('fs');
const TL = [[0, 'menu'], [8.0, 'world'], [19.7, 'mare'], [31.4, 'pradaria'], [40.25, 'boss'], [50.75, 'flight'], [58.75, 'versus'], [70.75, 'pradaria', 'emporio'], [77.4, 'final'], [84.4, 'menu']];
const TOTAL = 93;
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage(); p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.addInitScript(() => {
    const oc = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (dst, ...r) {
      if (dst instanceof AudioDestinationNode) { const ctx = this.context; if (!ctx.__tap) { ctx.__tap = ctx.createMediaStreamDestination(); window.__tapCtx = ctx; } oc.call(this, ctx.__tap); }
      return oc.call(this, dst, ...r);
    };
  });
  await p.goto('http://localhost:5173');
  await p.waitForFunction(() => window.__skullshift?.scene.isActive('menu'), null, { timeout: 180000 });
  await p.evaluate(async () => { const s = await import('/src/game/settings.ts'); console.log(Object.keys(s)); });
  await p.evaluate(async () => { const m = await import('/src/game/music.ts'); window.__m = m; m.playMusic('menu'); });
  await p.waitForTimeout(9000);
  console.log('ctx', await p.evaluate(() => window.__tapCtx ? window.__tapCtx.state : 'none'));
  await p.evaluate(() => { window.__m.stopMusic(); });
  await p.waitForTimeout(1500);
  await p.evaluate(() => { const rec = new MediaRecorder(window.__tapCtx.__tap.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 256000 }); window.__chunks = []; rec.ondataavailable = (e) => window.__chunks.push(e.data); rec.start(1000); window.__rec = rec; });
  const t0 = Date.now();
  for (const [t, track, variant] of TL) { const w = t * 1000 - (Date.now() - t0); if (w > 0) await p.waitForTimeout(w); await p.evaluate(([tr, v]) => window.__m.playMusic(tr, v), [track, variant]); console.log('t', (Date.now() - t0) / 1000, track); }
  await p.waitForTimeout(TOTAL * 1000 - (Date.now() - t0));
  const b64 = await p.evaluate(() => new Promise((res) => { window.__rec.onstop = async () => { const blob = new Blob(window.__chunks, { type: 'audio/webm' }); const buf = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode.apply(null, buf.subarray(i, i + 32768)); res(btoa(s)); }; window.__rec.stop(); }));
  fs.writeFileSync('music.webm', Buffer.from(b64, 'base64')); console.log('bytes', fs.statSync('music.webm').size);
  await b.close();
})();
