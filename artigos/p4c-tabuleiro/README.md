# Artigo 2 — From board to graph (Play4Change 2027)

**Chamada:** Play4Change 2027 (Game Science Research Center, Play – Festival del Gioco,
Game in Lab), categoria **C. Scientific Research**. Não é revista: é um prêmio com júri e
avaliação cega; premiação em Bolonha, 25/04/2027.

| etapa | prazo |
|---|---|
| abertura | 30/09/2026 |
| **encerramento** | **31/12/2026** |
| resultado | 25/04/2027 |

## O que a chamada pede (categoria C)

- Resumo de **até 1.800 caracteres com espaços** (no formulário).
- **Até 3 palavras-chave.**
- Texto completo em **PDF**, **anônimo** (sem nomes nem nada que identifique os autores).
- Critérios: metodologia, coerência com o tema de mudança social, grau de inovação,
  relevância e qualidade (validade externa, publicações), acessibilidade da apresentação.
- Formulário: https://forms.gle/H4BUvboLnJKLEQAx5 · dúvidas: info@play4change.it

Não há template nem limite de páginas; o `main.tex` usa A4, Times 11 pt e APA 7.

## Para o formulário

**Resumo (1.375 caracteres):**

> Whose story becomes the story of a community depends on who is where, who knows what and
> who controls the places everyone needs. Games can make these forces tangible. We present the
> design of a world model for role-playing in which the world is a board, represented as a
> matrix, and in which human players and generative-AI characters can share the same table.
> The model connects three graphs: the spatial graph of the board, the temporal graph of
> encounters between characters and the causal graph of the events they produce. A character
> can only build on events it witnessed or heard about, so the board decides which stories can
> meet. The design responds to an empirical finding: when language-model agents share an
> unrestricted world, their storylines merge into a single story within days, pulled by
> "attractors" written into the premises. A proof of concept with synthetic agents shows that
> space and information alone only delay this convergence, that attractor places decide where
> it happens, and that two simple mechanics, world-event cards and a focus rule, keep several
> stories alive. We describe a physical kit in which causal links are drawn with yarn between
> event cards, the hybrid human-AI protocol, and a research plan to test whether playing on such
> a board helps groups see how space, information and power shape the stories a community ends
> up telling.

**Palavras-chave (3):** hybrid human-AI role-play; board game design; narrative power

## Arquivos

- `main.tex` — texto anônimo, inglês, `biblatex-apa`; figuras 1 e 2 em TikZ (editáveis no próprio .tex).
- `figuras/linhas_por_condicao.png` — gerada por `python analise/tabuleiro_prova.py`
  (resultados em `experimentos/tabuleiro-prova/resultados.json`).
- `referencias.bib` — cópia de `../referencias-base.bib`.

## Atenção antes de submeter

- O texto cita o artigo de atratores como "companion study, currently under review",
  sem referência, para não quebrar o anonimato. Se o resumo do IJGSI for aceito antes de
  31/12, dá para citar como "[Anonymised, 2026]".
- A prova de conceito usa agentes sintéticos (escolhas aleatórias, sem modelo de
  linguagem). O texto diz isso; não é resultado com LLM nem com pessoas.
- O kit físico ainda não foi testado com jogadores. Um playtest antes de 31/12, mesmo
  pequeno, fortaleceria muito o critério "relevância e qualidade".
