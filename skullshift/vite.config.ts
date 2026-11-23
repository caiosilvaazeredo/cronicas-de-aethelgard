import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * PWA: depois do build, gera dist/sw.js com a lista de todos os arquivos do jogo. O service
 * worker guarda tudo na primeira visita, e o jogo abre sem internet. A versão do cache é o hash
 * da lista + conteúdo, então cada build novo troca o cache sozinho.
 */
function serviceWorker(): Plugin {
  let outDir = 'dist';
  return {
    name: 'skullshift-sw',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir;
    },
    closeBundle() {
      const files: string[] = [];
      const walk = (d: string) => {
        for (const n of readdirSync(d)) {
          const p = join(d, n);
          if (statSync(p).isDirectory()) walk(p);
          else files.push(relative(outDir, p).split('\\').join('/'));
        }
      };
      walk(outDir);
      const list = files.filter((f) => f !== 'sw.js' && !f.endsWith('.map') && !f.endsWith('LICENSE.txt')).sort();
      const h = createHash('sha1');
      for (const f of list) h.update(f).update(readFileSync(join(outDir, f)));
      const version = h.digest('hex').slice(0, 12);
      const tpl = readFileSync('src/sw-template.js', 'utf8');
      writeFileSync(join(outDir, 'sw.js'), tpl.replace('__VERSION__', version).replace('__FILES__', JSON.stringify(['./', ...list.map((f) => `./${f}`)])));
    },
  };
}

// base relativa: o build funciona tanto em hospedagem web quanto empacotado (Electron/Steam).
export default defineConfig({
  base: './',
  server: { port: 5173, host: true },
  plugins: [serviceWorker()],
  // Phaser sem o Matter.js (o jogo só usa a física Arcade): ~110 KB a menos.
  resolve: { alias: [{ find: /^phaser$/, replacement: 'phaser/dist/phaser-arcade-physics.min.js' }] },
  build: {
    rollupOptions: {
      output: {
        // Phaser num arquivo à parte: baixa em paralelo com o jogo e, como quase nunca muda,
        // continua no cache quando sai uma versão nova do jogo.
        manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : id.includes('node_modules/') ? 'vendor' : undefined),
      },
    },
  },
});
