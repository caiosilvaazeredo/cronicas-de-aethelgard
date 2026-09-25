/**
 * Gera o relatório .docx dos experimentos de validação.
 *
 *   node analise/gerar_docx.cjs experimentos/validacao
 *
 * Entradas: <raiz>/analise/resultados.json (de analise/validacao.py), as
 * figuras .png da mesma pasta e <raiz>/analise/textos.json (interpretação e
 * debriefing, redigidos depois de ler os resultados).
 * Saída: <raiz>/analise/relatorio-validacao-claude.docx
 */

const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, ImageRun, LevelFormat, PageBreak, Footer, PageNumber,
  TableOfContents,
} = require('docx');

const raiz = process.argv[2] || 'experimentos/validacao';
const dirA = path.join(raiz, 'analise');
const R = JSON.parse(fs.readFileSync(path.join(dirA, 'resultados.json'), 'utf8'));
const T = JSON.parse(fs.readFileSync(path.join(dirA, 'textos.json'), 'utf8'));

const CURTO = {
  'claude-haiku-4-5-20251001': 'Haiku 4.5', 'claude-sonnet-4-6': 'Sonnet 4.6', 'claude-sonnet-5': 'Sonnet 5',
  'claude-opus-4-8': 'Opus 4.8', 'claude-opus-5': 'Opus 5', 'claude-opus-5-5': 'Opus 5.5',
};
const curto = (m) => CURTO[m] || m;
const LARGURA = 9360; // A4 com margens de 1": 11906 - 2*1273 ≈ 9360
const FONTE = 'Arial';

const n = (x, c = 2) => (x === null || x === undefined || Number.isNaN(x) ? '–' : Number(x).toFixed(c));
const pct = (x, c = 1) => (x === null || x === undefined ? '–' : `${(100 * x).toFixed(c)}%`);
const md = (x, c = 2) => (!x || x.media === null || x.media === undefined ? '–' : `${n(x.media, c)} ± ${n(x.dp, c)}`);

// texto com **negrito** simples
function runs(texto, extra = {}) {
  return String(texto)
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((p) => (p.startsWith('**') ? new TextRun({ text: p.slice(2, -2), bold: true, ...extra }) : new TextRun({ text: p, ...extra })));
}
const P = (texto, o = {}) => new Paragraph({ children: runs(texto, o.run), spacing: { after: 120, line: 276 }, ...o.par });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });
const B = (t, nivel = 0) => new Paragraph({ numbering: { reference: 'marcadores', level: nivel }, children: runs(t), spacing: { after: 60 } });
const paragrafos = (lista) => (lista || []).map((t) => P(t));
const marcadores = (lista) => (lista || []).map((t) => B(t));

const borda = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
const bordas = { top: borda, bottom: borda, left: borda, right: borda };

function tabela(cabecalho, linhas, larguras) {
  const total = larguras.reduce((a, b) => a + b, 0);
  const celula = (t, i, cab) =>
    new TableCell({
      borders: bordas,
      width: { size: larguras[i], type: WidthType.DXA },
      shading: cab ? { fill: 'DCE6F0', type: ShadingType.CLEAR, color: 'auto' } : undefined,
      margins: { top: 60, bottom: 60, left: 90, right: 90 },
      children: [new Paragraph({ children: [new TextRun({ text: String(t), bold: cab, size: 17 })] })],
    });
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: larguras,
    rows: [
      new TableRow({ tableHeader: true, children: cabecalho.map((t, i) => celula(t, i, true)) }),
      ...linhas.map((l) => new TableRow({ children: l.map((t, i) => celula(t, i, false)) })),
    ],
  });
}

function figura(nome, legenda, largura = 620) {
  const f = path.join(dirA, nome);
  if (!fs.existsSync(f)) return [];
  const buf = fs.readFileSync(f);
  // dimensões do PNG (cabeçalho IHDR)
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({ type: 'png', data: buf, transformation: { width: largura, height: Math.round((largura * h) / w) } })],
    }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: legenda, italics: true, size: 18 })] }),
  ];
}

const corpo = [];
const add = (...xs) => corpo.push(...xs.flat());

// ------------------------------------------------------------- capa
add(
  new Paragraph({ spacing: { before: 2400 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: T.titulo, bold: true, size: 40 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240 }, children: [new TextRun({ text: T.subtitulo, size: 26 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600 }, children: [new TextRun({ text: T.autoria, size: 22 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: T.data, size: 22 })] }),
  new Paragraph({ children: [new PageBreak()] }),
  new TableOfContents('Sumário', { hyperlink: true, headingStyleRange: '1-2' }),
  new Paragraph({ children: [new PageBreak()] })
);

// ------------------------------------------------------------- resumo
const C = R.contagem;
add(H1('Resumo executivo'), paragrafos(T.resumo));
add(
  tabela(
    ['Método', 'O que valida', 'Chamadas ao Claude'],
    [
      ['1. Sessões da Cidade Viva multimodelo', 'geração livre e convergência por modelo', C.porMetodo['M1 Cidade Viva']],
      ['2. Controle de três atos', 'comparação com estrutura fixa', C.porMetodo['M2 Controle três atos']],
      ['3. Teste-reteste', 'validade estrutural e estabilidade', C.porMetodo['M3 Teste-reteste']],
      ['4. Juiz cego do autorrelato causal', 'se as ligações causadoPor têm conteúdo', C.porMetodo['M4 Juiz causal']],
      ['5. Fidelidade dos relatos', 'material para o experimento de contradição', C.porMetodo['M5 Juiz de relatos']],
      ['Total', `${C.itensJulgados} itens julgados nos métodos 4 e 5`, C.total],
    ],
    [3200, 4060, 2100]
  ),
  P(''),
  P(`Custo total informado pelo CLI: **US$ ${n(C.custoTotal)}**.`)
);

// ------------------------------------------------------------- desenho
add(H1('1. Objetivo e desenho'), paragrafos(T.desenho));
add(H2('Modelos'), tabela(
  ['Modelo', 'Chamadas', 'Custo (US$)'],
  Object.entries(C.porModelo).sort().map(([m, k]) => [curto(m), k, n(C.custoPorModelo[m])]),
  [4000, 2680, 2680]
), P(''), paragrafos(T.modelos));

// ------------------------------------------------------------- M1 e M2
const S = R.sessoes;
if (S) {
  add(H1('2. Métodos 1 e 2: Cidade Viva e controle de três atos'), paragrafos(T.m1m2_metodo));
  add(H2('Resultados por modelo'));
  const linhas = [];
  for (const [m, tipos] of Object.entries(S.porModelo)) {
    for (const [tipo, x] of Object.entries(tipos)) {
      linhas.push([curto(m), tipo === 'controle' ? 'três atos' : 'Cidade Viva', x.sessoes, md(x.tramas, 1), md(x.proporcaoFechadas),
        md(x.razaoAmarracao), pct(x.taxaFalhaEstrutura), pct(x.taxaDescarte), n(x.latenciaPorDiaS, 0) + ' s', n(x.custoUsd)]);
    }
  }
  add(tabela(['Modelo', 'Tipo', 'Sessões', 'Tramas', 'Prop. fechadas', 'Razão amarr.', 'Falha estr.', 'Refs descart.', 'Tempo/dia', 'US$'],
    linhas, [1080, 1080, 720, 1000, 1080, 1080, 900, 900, 800, 720]));
  add(P(''), figura('m1_curvas.png', 'Figura 1. Cidade Viva: tramas abertas e razão de amarração por dia, média por modelo.'));
  add(figura('m2_curvas.png', 'Figura 2. Controle de três atos: as mesmas curvas.'));
  add(figura('m1m2_comparacao.png', 'Figura 3. Cidade Viva × três atos por modelo.'));
  add(H2('Testes estatísticos'));
  const ab = S.AvsB;
  const cc = S.cidadeVivaVsControle;
  add(tabela(['Comparação', 'Resultado'], [
    ab ? ['Condição A (informa) × B (não informa): proporção de tramas fechadas',
      `média A ${n(ab.media_A)} (n=${ab.n_A}) × B ${n(ab.media_B)} (n=${ab.n_B}); Mann-Whitney U=${n(ab.U, 1)}, p=${n(ab.p, 3)}`] : ['A × B', '–'],
    ab ? ['A × B: tramas surgidas (média)', `${n(ab.tramas_A, 1)} × ${n(ab.tramas_B, 1)}`] : ['', ''],
    cc ? ['Cidade Viva × três atos: proporção fechadas', `${n(cc.prop_cv)} × ${n(cc.prop_controle)}; U=${n(cc.U_prop, 1)}, p=${n(cc.p_prop, 3)}`] : ['CV × controle', '–'],
    cc ? ['Cidade Viva × três atos: razão de amarração', `${n(cc.razao_cv)} × ${n(cc.razao_controle)}; U=${n(cc.U_razao, 1)}, p=${n(cc.p_razao, 3)}`] : ['', ''],
    cc ? ['Cidade Viva × três atos: tramas surgidas', `${n(cc.tramas_cv, 1)} × ${n(cc.tramas_controle, 1)}`] : ['', ''],
    S.kruskalModelos ? ['Diferença entre modelos (Kruskal-Wallis, razão de amarração, Cidade Viva)', `H=${n(S.kruskalModelos.H)}, p=${n(S.kruskalModelos.p, 3)}`] : ['Modelos', '–'],
  ], [4200, 5160]));
  add(P(''), paragrafos(T.m1m2_resultados));
  const atos = Object.values(S.atosControle || {});
  if (atos.length) {
    add(H3('Progressão de atos no controle'), tabela(['Sessão (mestre)', 'Dia do ato 2', 'Dia do ato 3', 'Sequência'],
      Object.entries(S.atosControle).map(([s, a]) => [curto(a.modelo) + ' · ' + (s.includes('vale') ? 'Vale' : 'Porto'), a.diaAto2 ?? '–', a.diaAto3 ?? '–', a.atos.join('')]),
      [2600, 1300, 1300, 4160]), P(''), paragrafos(T.atos));
  }
}

// ------------------------------------------------------------- nulo
if (R.nulo) {
  add(H2('Modelo nulo: a estrutura vem do conteúdo das ligações?'), paragrafos(T.nulo_metodo));
  const rs = R.nulo.resumo;
  const nome = { tramas: 'Tramas surgidas', proporcaoFechadas: 'Proporção fechadas', fracaoKernel: 'Fração de eventos ligados', abertasMediaUltimoTerco: 'Abertas no último terço' };
  const linhas = [];
  for (const [k, v] of Object.entries(rs)) {
    for (const [tipo, x] of Object.entries(v)) {
      if (!x.n) continue;
      linhas.push([nome[k] || k, tipo === 'controle' ? 'três atos' : 'Cidade Viva', x.n, n(x.obsMedio), n(x.nuloMedio), `${x.acimaDoNulo}/${x.n}`, `${x.significativas}/${x.n}`]);
    }
  }
  add(tabela(['Métrica', 'Tipo', 'Sessões', 'Observado', 'Nulo', 'Acima do nulo', 'p<0,05'], linhas, [2300, 1260, 900, 1200, 1200, 1250, 1250]), P(''), paragrafos(T.nulo_resultados));
}

// ------------------------------------------------------------- M3
const M3 = R.reteste;
if (M3) {
  add(H1('3. Método 3: teste-reteste'), paragrafos(T.m3_metodo));
  add(tabela(['Modelo', 'Válidas', 'Cobertura', 'Refs válidas', 'Ligações/ação', 'Jaccard causal', 'Jaccard texto', 'Mesmo local', 'DP tensão', 'US$/cham.', 'Latência'],
    Object.entries(M3.porModelo).map(([m, x]) => [curto(m), `${x.validas}/${x.chamadas}`, md(x.cobertura), pct(x.taxaReferenciasValidas), md(x.ligacoesPorAcao),
      md(x.jaccardCausal), md(x.jaccardTexto), md(x.mesmoLocal), md(x.dpTensaoEntreRepeticoes), n(x.custoMedioUsd, 3), n(x.latenciaMediaS, 0) + ' s']),
    [980, 760, 900, 760, 940, 900, 900, 860, 820, 700, 740]));
  add(P(''), figura('m3_reteste.png', 'Figura 4. Teste-reteste: ligações por ação e estabilidade entre repetições do mesmo estado.'), paragrafos(T.m3_resultados));
}

// ------------------------------------------------------------- M4
const M4 = R.causal;
if (M4) {
  add(H1('4. Método 4: juiz cego do autorrelato causal'), paragrafos(T.m4_metodo));
  add(tabela(['Juiz', 'Reais', 'Distratores', 'Nota reais', 'Nota distrat.', 'Plausível (reais)', 'Plausível (distrat.)', 'AUC', 'p (reais > distrat.)'],
    Object.entries(M4.porJuiz).map(([j, x]) => [curto(j), x.reais, x.distratores, md(x.notaReais), md(x.notaDistratores), pct(x.plausivelReais), pct(x.plausivelDistratores), n(x.auc), x.p_reais_maior !== null && x.p_reais_maior < 1e-4 ? '< 0,0001' : n(x.p_reais_maior, 4)]),
    [1100, 800, 950, 1100, 1100, 1100, 1150, 800, 1260]));
  add(H3('Por modelo gerador'));
  const lin = [];
  for (const [j, x] of Object.entries(M4.porJuiz)) {
    for (const [g, y] of Object.entries(x.porGerador)) {
      lin.push([curto(j), curto(g.replace(' [controle]', '')) + (g.includes('controle') ? ' (três atos)' : ''), y.reais, y.distratores, md(y.notaReais), md(y.notaDistratores), pct(y.plausivelReais), n(y.auc)]);
    }
  }
  add(tabela(['Juiz', 'Gerador', 'Reais', 'Distrat.', 'Nota reais', 'Nota distrat.', 'Plausível', 'AUC'], lin, [1100, 1900, 800, 900, 1250, 1250, 1100, 1060]));
  const c = M4.concordancia;
  if (c) add(P(`Concordância entre os juízes ${c.juizes.map(curto).join(' e ')} em ${c.itens} itens: kappa de Cohen (plausível) = **${n(c.kappaPlausivel)}**, concordância bruta ${pct(c.concordanciaPlausivel)}, Spearman das notas = ${n(c.spearmanNotas)}.`));
  add(figura('m4_juiz_causal.png', 'Figura 5. Distribuição das notas dadas pelos juízes às ligações reais e aos distratores.'), paragrafos(T.m4_resultados));
}

// ------------------------------------------------------------- M5
const M5 = R.relatos;
if (M5) {
  add(H1('5. Método 5: fidelidade dos relatos'), paragrafos(T.m5_metodo));
  const cats = ['fiel', 'omissao', 'distorcao', 'contradicao', 'invencao'];
  const lin = [];
  for (const [j, x] of Object.entries(M5.porJuiz)) {
    for (const [g, y] of Object.entries(x.porGerador)) lin.push([curto(j), curto(g), y.n, ...cats.map((k) => pct(y.categorias[k], 0)), md(y.fidelidade)]);
  }
  add(tabela(['Juiz', 'Gerador', 'n', 'Fiel', 'Omissão', 'Distorção', 'Contradição', 'Invenção', 'Fidelidade (1-5)'], lin, [1000, 1100, 600, 900, 1000, 1050, 1150, 1000, 1560]));
  const c = M5.concordancia;
  if (c) add(P(`Concordância entre os juízes ${c.juizes.map(curto).join(' e ')} em ${c.itens} relatos: kappa (5 categorias) = **${n(c.kappaCategoria)}**, kappa (fiel × não fiel) = **${n(c.kappaFielVsNao)}**, concordância bruta ${pct(c.concordanciaCategoria)}, Spearman da fidelidade = ${n(c.spearmanFidelidade)}.`));
  add(figura('m5_relatos.png', 'Figura 6. Categorias atribuídas pelos juízes aos relatos, por modelo gerador.'), paragrafos(T.m5_resultados));
}

// ------------------------------------------------------------- amostras
if (S && S.narracoesAmostra && S.narracoesAmostra.length) {
  add(H1('6. Amostras de narrações do curador'), paragrafos(T.amostras_intro));
  for (const a of S.narracoesAmostra.slice(0, 6)) {
    add(H3(`${curto(a.modelo)} · ${a.controle ? 'três atos' : 'Cidade Viva'} · trama ${a.tramaId} (dia ${a.dia}, ${a.eventos} eventos)`),
      P(a.texto, { run: { italics: true, size: 20 } }));
  }
}

// ------------------------------------------------------------- limitações e debriefing
add(H1('7. Limitações'), marcadores(T.limitacoes));
add(H1('8. Debriefing'));
for (const secao of T.debriefing) add(H2(secao.titulo), paragrafos(secao.paragrafos), marcadores(secao.itens));
add(H1('Apêndice: reprodução'), paragrafos(T.reproducao_intro));
for (const cmd of T.comandos) add(new Paragraph({ children: [new TextRun({ text: cmd, font: 'Courier New', size: 17 })], spacing: { after: 40 } }));

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
  numbering: {
    config: [{ reference: 'marcadores', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1273, right: 1273, bottom: 1273, left: 1273 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18 })] })] }) },
    children: corpo,
  }],
});

const saida = path.join(dirA, 'relatorio-validacao-claude.docx');
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(saida, buf);
  console.log(`relatório gravado em ${saida}`);
});
