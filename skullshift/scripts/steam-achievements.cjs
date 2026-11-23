// Lista as conquistas do jogo com o nome de API da Steam (ACH_<ID>), para cadastrar no
// painel do Steamworks. Gera desktop/achievements.csv. Uso: node scripts/steam-achievements.cjs
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'game', 'achievements.ts'), 'utf8');
const re = /\{ id: '([^']+)', name: '([^']+)', desc: '([^']+)'/g;
const rows = [];
for (let m; (m = re.exec(src)); ) rows.push([`ACH_${m[1].toUpperCase()}`, m[2], m[3]]);
const csv = ['api,nome,descricao', ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n') + '\n';
fs.writeFileSync(path.join(__dirname, '..', 'desktop', 'achievements.csv'), csv);
console.log(`${rows.length} conquistas → desktop/achievements.csv`);
