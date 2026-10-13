# Artigos

| artigo | destino | prazo | pasta |
|---|---|---|---|
| Narrative attractors: why stories converge in a shared-world RPG played by language-model agents | IJGSI vol. 5, n. 4 (games, media literacy and education) | resumo 20/11/2026; completo 28/02/2027 | `ijgsi-atratores/` |
| From board to graph: a grid-based world model for hybrid human-AI role-play | Play4Change 2027, categoria Scientific Research | 31/12/2026 | `p4c-tabuleiro/` |
| From board to graph: a hybrid human-AI role-playing board for critical media and AI literacy | IJGSI vol. 5, n. 4 (versão para educação e letramento midiático) | resumo 20/11/2026; completo 28/02/2027 | `ijgsi-tabuleiro/` |

Todos usam a mesma bibliografia base (`referencias-base.bib`). Os artigos da IJGSI somam
a ela os estudos incluídos na sua revisão PRISMA (`referencias-revisao-atratores.bib`,
`referencias-revisao-tabuleiro.bib`); `referencias.bib` de cada pasta é essa junção, porque o
Overleaf trata cada projeto separadamente. Todas as 161 entradas foram conferidas por
`python analise/verificar_referencias.py` (Crossref/DataCite pelo DOI, arXiv pelo
identificador, as demais na fonte); o resultado está em `verificacao-referencias.md`.

## Revisões sistemáticas (PRISMA 2020)

Cada artigo da IJGSI tem uma seção "Systematic literature review" com critérios de
elegibilidade (I1–I3, E1–E5) e diagrama de fluxo (`figuras/prisma.png`).

| revisão | identificados | triados | avaliados | incluídos |
|---|---|---|---|---|
| atratores (artigo 1) | 388 | 181 | 97 | 44 |
| tabuleiro (artigo 2) | 477 | 259 | 106 | 69 |

```bash
python analise/revisao_prisma.py coletar todas    # OpenAlex, arXiv, Semantic Scholar
python analise/revisao_prisma.py triar todas      # triagem e elegibilidade assistidas por modelo
python analise/revisao_prisma.py relatorio todas  # contagens, diagrama, registros.csv
python analise/integrar_revisao.py                # BibTeX e figura para os artigos
python analise/suplemento_revisao.py              # word/submissao/supplementary-S1.docx
```

Tudo fica em `experimentos/revisao/<id>/`. Em `registros.csv` está a decisão de cada registro,
com o critério e a justificativa. Correções do segundo revisor ficam em `revisao_manual.json`.

## Word completo

`completo/artigos-completos.docx` reúne os dois artigos com autoria, figuras, referências
e um apêndice por artigo (strings de busca, critérios e lista dos incluídos). Para gerar:
`python artigos/completo/gerar_completo.py`.

## Overleaf

Cada pasta é um projeto: suba `main.tex`, `referencias.bib` e `figuras/`. Compilador
pdfLaTeX; a bibliografia roda com **biber** (o Overleaf detecta sozinho). Citações:
`\textcite{chave}` → "Trabasso and van den Broek (1985)"; `\parencite{chave}` →
"(Trabasso & van den Broek, 1985)"; várias chaves: `\parencite{a,b}`.

Localmente: `latexmk -pdf main.tex`.

## Reprodução dos números

```bash
python analise/atratores.py experimentos/validacao     # artigo 1
python analise/tabuleiro_prova.py                      # artigo 2
```

Os artigos da IJGSI têm versão Word (a revista só aceita Word/RTF) em `word/submissao/` de cada pasta, gerada por `bash word/gerar.sh`.
