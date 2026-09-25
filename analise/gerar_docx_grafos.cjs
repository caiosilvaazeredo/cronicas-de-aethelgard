/**
 * Relatório .docx da rodada de grafos (emendas 1 e 2, variantes de detecção,
 * necessidade causal, ligações tipadas, Mapa da Crônica) com o log das sessões.
 *
 *   node analise/gerar_docx_grafos.cjs experimentos/validacao experimentos/LOG-GERAL.md
 *
 * Entradas: <raiz>/analise-grafos/resultados.json e figuras (analise/grafos.py),
 * <raiz>/analise-grafos/textos.json (interpretação e debriefing) e o
 * LOG-GERAL.md (npm run log-experimentos).
 * Saída: <raiz>/analise-grafos/relatorio-grafos.docx
 */

const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, ImageRun, LevelFormat, PageBreak, Footer, PageNumber,
  TableOfContents, PageOrientation,
} = require('docx');

const raiz = process.argv[2] || 'experimentos/validacao';
const logGeral = process.argv[3] || 'experimentos/LOG-GERAL.md';
const dirA = path.join(raiz, 'analise-grafos');
const R = JSON.parse(fs.readFileSync(path.join(dirA, 'resultados.json'), 'utf8'));
const T = JSON.parse(fs.readFileSync(path.join(dirA, 'textos.json'), 'utf8'));
const FONTE = 'Arial';

const n = (x, c = 2) => (x === null || x === undefined || Number.isNaN(x) ? '–' : Number(x).toFixed(c).replace('.', ','));
const pct = (x, c = 0) => (x === null || x === undefined ? "–" : `${(100 * x).toFixed(Number.isInteger(Math.round(1000 * x) / 10) ? c : 1).replace(".", ",")}%`);
const pv = (p) => (p === null || p === undefined ? '–' : p < 0.001 ? '< 0,001' : n(p, 3));

function runs(texto, extra = {}) {
  return String(texto)
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((p) => (p.startsWith('**') ? new TextRun({ text: p.slice(2, -2), bold: true, ...extra }) : new TextRun({ text: p, ...extra })));
}
const P = (t, o = {}) => new Paragraph({ children: runs(t, o.run), spacing: { after: 120, line: 276 }, ...o.par });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });
const B = (t) => new Paragraph({ numbering: { reference: 'marcadores', level: 0 }, children: runs(t), spacing: { after: 60 } });
const Ps = (l) => (l || []).map((t) => P(t));
const Bs = (l) => (l || []).map((t) => B(t));

const borda = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
const bordas = { top: borda, bottom: borda, left: borda, right: borda };
function tabela(cab, linhas, larguras, tamanho = 17) {
  const total = larguras.reduce((a, b) => a + b, 0);
  const cel = (t, i, c) =>
    new TableCell({
      borders: bordas,
      width: { size: larguras[i], type: WidthType.DXA },
      shading: c ? { fill: 'DCE6F0', type: ShadingType.CLEAR, color: 'auto' } : undefined,
      margins: { top: 50, bottom: 50, left: 80, right: 80 },
      children: [new Paragraph({ children: runs(String(t), { bold: c, size: tamanho }) })],
    });
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: larguras,
    rows: [new TableRow({ tableHeader: true, children: cab.map((t, i) => cel(t, i, true)) }), ...linhas.map((l) => new TableRow({ children: l.map((t, i) => cel(t, i, false)) }))],
  });
}
function figura(nome, legenda, largura = 600) {
  const f = path.join(dirA, nome);
  if (!fs.existsSync(f)) return [];
  const buf = fs.readFileSync(f);
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'png', data: buf, transformation: { width: largura, height: Math.round((largura * h) / w) } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: legenda, italics: true, size: 18 })] }),
  ];
}

const C = [];
const add = (...xs) => C.push(...xs.flat());

// capa
add(
  new Paragraph({ spacing: { before: 2200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: T.titulo, bold: true, size: 40 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240 }, children: [new TextRun({ text: T.subtitulo, size: 26 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600 }, children: [new TextRun({ text: T.autoria, size: 22 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: T.data, size: 22 })] }),
  new Paragraph({ children: [new PageBreak()] }),
  new TableOfContents('Sumário', { hyperlink: true, headingStyleRange: '1-2' }),
  new Paragraph({ children: [new PageBreak()] })
);

add(H1('Resumo executivo'), Ps(T.resumo));
add(H1('1. O que mudou'), Ps(T.mudancas), Bs(T.mudancas_itens));

// 2. fusão × fechamento
const E = R.emenda1;
add(H1('2. Fusão × fechamento (emenda 1)'), Ps(T.emenda1_intro));
add(tabela(
  ['Grupo', 'Tramas nascidas', 'Fechadas por estab. / nascidas', 'Absorvidas por fusão / nascidas', 'Convergem (emenda 1)', 'Prop. fechadas (v0.1)', 'Convergem (v0.1)'],
  Object.entries(E.porTipo).map(([g, x]) => [g, n(x.tramas_nascidas_media, 2), pct(x.prop_fechadas_estab_media), pct(x.prop_fundidas_media), pct(x.sessoes_que_convergem_emenda1), pct(x.prop_fechadas_v01_media), pct(x.sessoes_que_convergem_v01)]),
  [1500, 1250, 1500, 1500, 1250, 1180, 1180]
));
add(P(''), H3('Cidade Viva por modelo gerador'), tabela(
  ['Modelo', 'Tramas nascidas', 'Fechadas por estab.', 'Absorvidas por fusão', 'Convergem (emenda 1)'],
  Object.entries(E.porModelo).map(([m, x]) => [m, n(x.tramas_nascidas_media, 2), pct(x.prop_fechadas_estab_media), pct(x.prop_fundidas_media), pct(x.sessoes_que_convergem_emenda1)]),
  [2200, 1790, 1790, 1790, 1790]
));
add(P(''), figura('curvas_emenda1.png', 'Figura 1. Tramas abertas, razão de amarração, fechadas por estabilidade (acumulado) e absorvidas por fusão (acumulado), Cidade Viva × três atos, k = 3.', 620), Ps(T.emenda1_resultados));

// 3. variantes
add(H1('3. Variantes de detecção e pontes de fusão'), Ps(T.variantes_intro));
add(tabela(
  ['Variante', 'Tipo', 'Tramas nascidas', 'Fechadas por estab.', 'Absorvidas por fusão', 'Convergem (emenda 1)'],
  R.variantes.map((x) => [x.variante, x.tipo === 'cidade-viva' ? 'Cidade Viva' : 'três atos', n(x.nascidas_media, 2), pct(x.prop_fechadas_estab), pct(x.prop_fundidas), pct(x.convergem_emenda1)]),
  [2100, 1300, 1400, 1500, 1500, 1560]
));
add(P(''), figura('variantes.png', 'Figura 2. Proporções de fechamento e fusão por variante de detecção (Cidade Viva, k = 3).', 520), Ps(T.variantes_resultados));
const G = R.grafoPorGrupo;
add(H2('Estrutura do grafo por grupo'), tabela(
  ['Grupo', 'Ligações por evento', 'Pontes', 'Pontes de fusão', 'Articulações', 'Fechadas (completo)', 'Fechadas (sem pontes de fusão)'],
  Object.entries(G).map(([g, x]) => [g, n(x.ligPorEvento), n(x.pontes, 1), n(x.pontesFusao, 1), n(x.articulacoes, 1), pct(x.propFechadas), pct(x.propFechadasSemPontes)]),
  [1900, 1200, 1000, 1200, 1200, 1300, 1560]
), P(''), Ps(T.grafo_resultados));

// 4. necessidade
const N = R.necessidade;
if (N) {
  add(H1('4. Necessidade causal por intervenção'), Ps(T.necessidade_intro));
  add(tabela(['Par (A → B)', 'n', 'Necessidade média (0-100)'],
    [['ligação direta declarada', N.porTipo.direta.n, n(N.porTipo.direta.necessidadeMedia, 1)], ['ancestral indireto', N.porTipo.indireta.n, n(N.porTipo.indireta.necessidadeMedia, 1)], ['não ligado (controle)', N.porTipo['nao-ligado'].n, n(N.porTipo['nao-ligado'].necessidadeMedia, 1)]],
    [4200, 1500, 3660]));
  add(P(`AUC direta × não ligado = **${n(N.aucDiretaVsNaoLigado)}**; indireta × não ligado = ${n(N.aucIndiretaVsNaoLigado)}; direta × indireta = ${n(N.aucDiretaVsIndireta)}. Correlação de Spearman entre o grau de saída de A e a necessidade = **${n(N.spearmanGrauSaidaNecessidade)}**.`));
  add(figura('necessidade.png', 'Figura 3. Necessidade média por tipo de par e modelo gerador.', 480), Ps(T.necessidade_resultados));
}

// 5. ligações tipadas
const TP = R.tipadas;
add(H1('5. Ligações tipadas (método 7)'), Ps(T.tipadas_intro));
if (TP) {
  const c = TP.comparacao;
  const nome = { ligPorEvento: 'Ligações por evento', nascidas: 'Tramas nascidas', propFechadas: 'Fechadas por estabilidade / nascidas', propFundidas: 'Absorvidas por fusão / nascidas', pontesFusao: 'Pontes de fusão' };
  add(tabela(['Métrica (média de ' + TP.pares + ' pares)', 'Sem tipos (método 1)', 'Com tipo e força (método 7)', 'Diferença', 'p (Wilcoxon)'],
    Object.entries(c).map(([k, x]) => [nome[k] || k, k.startsWith('prop') ? pct(x.sem) : n(x.sem), k.startsWith('prop') ? pct(x.com) : n(x.com), k.startsWith('prop') ? `${(100 * x.difMedia).toFixed(0)} p.p.` : n(x.difMedia), pv(x.p_wilcoxon)]),
    [3000, 1600, 1800, 1400, 1560]));
  add(P(''), figura('tipadas_pareado.png', 'Figura 4. Sessões pareadas sem e com ligações tipadas, por modelo (condição A, mesmos mundos e sementes).', 620));
  add(H3('Tipos declarados'), tabela(['Tipo', 'Fração das ligações'], Object.entries(TP.distribuicaoTipos).map(([t, f]) => [t, pct(f)]), [4680, 4680]),
    P(`Força média declarada: ${n(TP.forcaMedia)}. Detecção só com ligações fortes: tramas nascidas ${n(TP.variantes.nascidasCompleto, 1)} → ${n(TP.variantes.nascidasFortes, 1)}; fechadas por estabilidade ${pct(TP.variantes.completo)} → ${pct(TP.variantes.fortes)}; absorvidas por fusão ${pct(TP.variantes.fundidasCompleto)} → ${pct(TP.variantes.fundidasFortes)}; sem pontes de fusão: fechadas ${pct(TP.variantes.semPontes)}.`));
  add(Ps(T.tipadas_resultados));
}
const NT = R.necessidadeTipadas;
if (NT) {
  add(H2('Necessidade × tipo e força declarados'), Ps(T.necessidade_tipos_intro));
  add(tabela(['Tipo declarado', 'n', 'Necessidade média'], ['motivou', 'possibilitou', 'reagiu', 'lembrou'].map((t) => [t, NT.porTipoLigacao[t].n, n(NT.porTipoLigacao[t].necessidadeMedia, 1)]), [4000, 1500, 3860]));
  add(P(''), tabela(['Força declarada', 'n', 'Necessidade média'], ['1', '2', '3'].map((f) => [f, NT.porForca[f].n, n(NT.porForca[f].necessidadeMedia, 1)]), [4000, 1500, 3860]));
  add(P(`Spearman força × necessidade = **${n(NT.spearmanForcaNecessidade)}**; necessidade de pares não ligados (controle) = ${n(NT.porTipo['nao-ligado'].necessidadeMedia, 1)}.`));
  add(figura('necessidade_tipos.png', 'Figura 5. Necessidade avaliada pelo juiz conforme o tipo e a força que o próprio gerador declarou.', 540), Ps(T.necessidade_tipos_resultados));
}

// 6. mapa
add(H1('6. Mapa da Crônica com linhagem'), Ps(T.mapa), figura('mapa_linhagem.png', 'Figura 6. Mapa da Crônica da sessão do Sonnet 5 no Vale Silente (condição A), com o painel de linhagem.', 620));

add(H1('7. Limitações'), Bs(T.limitacoes));
add(H1('8. Debriefing'));
for (const s of T.debriefing) add(H2(s.titulo), Ps(s.paragrafos), Bs(s.itens));

// apêndice: log das sessões
add(new Paragraph({ children: [new PageBreak()] }), H1('Apêndice A. Log das sessões'), Ps(T.log_intro));
if (fs.existsSync(logGeral)) {
  const linhas = fs.readFileSync(logGeral, 'utf8').split('\n');
  let secao = null;
  let tab = [];
  const despejar = () => {
    if (secao && tab.length > 2) {
      const cab = tab[0].split('|').slice(1, -1).map((s) => s.trim());
      const corpo = tab.slice(2).map((l) => l.split('|').slice(1, -1).map((s) => s.trim()));
      // colunas mais úteis para o apêndice
      const quer = ['sessão', 'modelo (agentes)', 'tipo', 'cond.', 'dias', 'eventos', 'chamadas', 'falha estr.', 'custo US$', 'nasc./fech./fund.', 'ligações', 'tipadas', 'método', 'itens julgados'];
      const idx = cab.map((c, i) => [c, i]).filter(([c]) => quer.includes(c));
      const larg = idx.map(([c]) => (c === 'sessão' ? 3400 : c === 'modelo (agentes)' ? 1900 : c === 'método' ? 3400 : 820));
      add(H3(secao), tabela(idx.map(([c]) => c), corpo.map((l) => idx.map(([, i]) => (l[i] || '').replace(/`/g, '').replace(/^claude-cli\//, '').replace(/_r01$/, ''))), larg, 13), P(''));
    }
    tab = [];
  };
  for (const l of linhas) {
    if (l.startsWith('## ')) {
      despejar();
      secao = l.slice(3).trim();
    } else if (l.startsWith('|')) tab.push(l);
    else if (tab.length) despejar();
  }
  despejar();
  const total = linhas.find((l) => l.startsWith('**Total:**'));
  if (total) add(P(total));
}
add(H1('Apêndice B. Reprodução'), Ps(T.reproducao_intro));
for (const cmd of T.comandos) add(new Paragraph({ children: [new TextRun({ text: cmd, font: 'Courier New', size: 16 })], spacing: { after: 40 } }));

const doc = new Document({
  creator: 'Cidade Viva / Crônicas de Aethelgard',
  title: T.titulo,
  styles: {
    default: { document: { run: { font: FONTE, size: 21 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, font: FONTE, color: '1F3A5F' }, paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, font: FONTE, color: '2E5C8A' }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 22, bold: true, font: FONTE }, paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 } },
    ],
  },
  numbering: { config: [{ reference: 'marcadores', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18 })] })] }) },
    children: C,
  }],
});
Packer.toBuffer(doc).then((buf) => {
  const saida = path.join(dirA, 'relatorio-grafos.docx');
  fs.writeFileSync(saida, buf);
  console.log(`relatório gravado em ${saida}`);
});
