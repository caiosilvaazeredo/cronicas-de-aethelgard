# Artigo 3 — From board to graph (versão IJGSI)

Versão do artigo do tabuleiro para a **IJGSI vol. 5, n. 4** (games, gamification, media literacy and
transformation in educational contexts). Mesmo modelo e mesma prova de conceito do texto do
Play4Change (`../p4c-tabuleiro/`), reescrito para o tema do número:

- enquadramento em letramento midiático e desordem informacional (tópico da chamada), com jogos
  de inoculação como trabalho relacionado;
- exemplo trabalhado com a sessão real do Opus 5 (do artigo dos atratores) refeita no tabuleiro;
- tabela que liga cada achado a uma mecânica e a um ponto de aprendizagem;
- protocolo de aula de 100 minutos, papel do facilitador, banco de perguntas de debriefing;
- versão low-tech sem IA (tópico da chamada: contextos periféricos) e acessibilidade;
- uso seguro de IA com estudantes (sem dados pessoais, modelos locais);
- plano de avaliação com hipóteses para simulação e para sala de aula.

Prazos iguais aos do artigo 1: resumo até **20/11/2026**, completo até **28/02/2027**.

## Arquivos

- `main.tex` — fonte única, anônima, inglês, `biblatex-apa`.
- `figuras/tabuleiro.tex`, `figuras/camadas.tex` — fontes TikZ das figuras 1 e 2 (compile com
  pdflatex e gere o PNG; os PNGs já estão na pasta). `linhas_por_condicao.png` vem de
  `python analise/tabuleiro_prova.py`.
- `word/submissao/` — **o que vai para a revista**: `manuscript-anonymous.docx`, `title-page.docx`
  e `figures/Figure1-3.png`. Gerado por `bash word/gerar.sh` (o aviso do pandoc sobre "TeX math"
  vem da etapa intermediária e não afeta o .docx: as três equações saem como equações do Word).

Conferido: 6.180 palavras com referências (6.000–8.000); título de 92 caracteres (duas linhas);
resumo de 134 palavras e 815 caracteres; 7 palavras-chave; Times 12, 1,5, margens 2,54 cm, página
no canto superior direito; tabelas editáveis; referências APA 7 em página nova com recuo
deslocado; nenhum nome, instituição ou nome de projeto no manuscrito; os dois .docx passam no
validador OOXML. Falta preencher a folha de rosto (ORCID, bios, e-mail, papéis, uso de IA).

## Atenção

- **Originalidade:** a IJGSI exige texto "not under consideration by other publications". O
  Play4Change é um prêmio, não uma publicação, mas o texto dele é muito próximo deste. Vale
  perguntar aos editores (ijgsi@ulusofona.pt) ou ao Play4Change se submeter os dois é aceitável.
- **Dois artigos no mesmo número:** este e o dos atratores citam um ao outro como "companion study"
  sem referência, para não quebrar o anonimato. Se a revista preferir um só, os dois podem virar
  um artigo único ou ir para números diferentes.
