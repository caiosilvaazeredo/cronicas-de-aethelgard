# Artigo 1 — Narrative attractors (IJGSI)

**Revista:** The International Journal of Games and Social Impact (IJGSI), Vol. 5, No. 4,
"Games, Gamification, Media Literacy and Transformation in Educational Contexts".

| etapa | prazo |
|---|---|
| resumo | **20/11/2026** |
| aceite do resumo | 21/12/2026 |
| artigo completo | 28/02/2027 |
| decisão | 28/07/2027 |

## Arquivos

- `main.tex` — manuscrito **anonimizado** (revisão duplo-cega), em inglês, APA 7 via `biblatex-apa`.
- `titlepage.tex` — folha de rosto com autores, afiliação, ORCID, bios (separada, exigência da revista).
- `referencias.bib` — cópia de `../referencias-base.bib` (entradas com DOI geradas do Crossref).
- `figuras/` — geradas por `python analise/atratores.py experimentos/validacao`.

## Overleaf

Suba a pasta inteira (ou importe o repositório). Compilador pdfLaTeX; a bibliografia
usa **biber** (o Overleaf escolhe sozinho). Citações: `\textcite{}` (narrativa) e
`\parencite{}` (entre parênteses).

## Exigências da revista que o LaTeX não cobre

- **A revista aceita só Word ou RTF**, sem template próprio. Para submeter, converta:
  ```bash
  pandoc main.tex --citeproc --bibliography=referencias.bib \
    --csl=apa.csl -o main.docx
  ```
  (baixe `apa.csl` de https://www.zotero.org/styles/apa) e confira tabelas e figuras no Word.
  As imagens também vão como arquivos separados (PNG), numeradas na ordem de aparição.
- Times New Roman 12, espaço 1,5, margens 2,54 cm, número de página no canto superior direito:
  já configurado no `main.tex`.
- Título em negrito, itálico e maiúsculas, até duas linhas (o atual ocupa quatro na
  capa do LaTeX: considere encurtar, p. ex. "NARRATIVE ATTRACTORS IN SHARED-WORLD
  ROLE-PLAY WITH LANGUAGE-MODEL AGENTS").
- Resumo com menos de 300 palavras; as instruções também citam **menos de 1.000 caracteres**.
  O resumo do `main.tex` tem 193 palavras e 1.185 caracteres. Versão curta (787 caracteres)
  para o formulário, se o limite de caracteres valer:

  > Generative AI is entering classrooms as co-author and game master. We asked whether a
  > shared fictional world where language-model agents act freely produces many storylines
  > or collapses into one. From the causal graphs of 44 simulated sessions (3,744 events,
  > four models, two worlds), storylines vanish by fusion, not closure: 64% merge into
  > another and under 5% reach a stable end. Almost all are born on day two, and most sessions
  > keep a single story by day five. Convergence is driven by density, as almost every
  > event cites a cause, and its path is shaped by attractors: first fusions join
  > characters whose premises already referred to each other (75% vs. 61% under a null
  > model) in the places those premises name. We discuss implications for critical AI
  > literacy and educational role-play.

- Palavras-chave: 5 a 7 (o manuscrito tem 7).
- Contagem: 6.000–8.000 palavras **incluindo referências**. Versão atual: ≈ 6.300.

## De onde vem cada número

Todos os números saem de `experimentos/validacao/analise-atratores/resultados.json`
(script `analise/atratores.py`), de `experimentos/validacao/analise-grafos/resultados.json`
e de `experimentos/validacao/analise/resultados.json` (validação: juiz cego e modelo nulo).
A codificação das premissas está em `analise-atratores/premissas.json`.
