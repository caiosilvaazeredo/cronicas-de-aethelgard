// Copia o build da web (../dist, gerado por `npm run build` na pasta do jogo) para ./game.
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'dist');
const dst = path.join(__dirname, 'game');
if (!fs.existsSync(path.join(src, 'index.html'))) {
  console.error('Rode antes `npm run build` na pasta skullshift (não achei ../dist/index.html).');
  process.exit(1);
}
fs.rmSync(dst, { recursive: true, force: true });
fs.cpSync(src, dst, { recursive: true });
// O service worker (PWA) não serve para o app de computador.
fs.rmSync(path.join(dst, 'sw.js'), { force: true });
console.log('Jogo copiado para', dst);
