# Artigos

| artigo | destino | prazo | pasta |
|---|---|---|---|
| Narrative attractors: why stories converge in a shared-world RPG played by language-model agents | IJGSI vol. 5, n. 4 (games, media literacy and education) | resumo 20/11/2026; completo 28/02/2027 | `ijgsi-atratores/` |
| From board to graph: a grid-based world model for hybrid human-AI role-play | Play4Change 2027, categoria Scientific Research | 31/12/2026 | `p4c-tabuleiro/` |
| From board to graph: a hybrid human-AI role-playing board for critical media and AI literacy | IJGSI vol. 5, n. 4 (versão para educação e letramento midiático) | resumo 20/11/2026; completo 28/02/2027 | `ijgsi-tabuleiro/` |

Todos usam a mesma bibliografia (`referencias-base.bib`, copiada para cada pasta como
`referencias.bib`, porque o Overleaf trata cada projeto separadamente). Entradas com DOI
vieram do Crossref; as demais foram conferidas na fonte.

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
