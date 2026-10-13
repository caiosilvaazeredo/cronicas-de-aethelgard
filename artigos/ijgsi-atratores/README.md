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

- `main.tex` — manuscrito **anonimizado** (revisão duplo-cega), em inglês, APA 7 via `biblatex-apa`. Fonte única: a versão Word é gerada dele.
- `titlepage.tex` — folha de rosto com autores, afiliação, ORCID, bios (separada, exigência da revista).
- `referencias.bib` — cópia de `../referencias-base.bib` (entradas com DOI geradas do Crossref).
- `figuras/` — geradas por `python analise/atratores.py experimentos/validacao`.

## Overleaf

Suba a pasta inteira (ou importe o repositório). Compilador pdfLaTeX; a bibliografia
usa **biber** (o Overleaf escolhe sozinho). Citações: `\textcite{}` (narrativa) e
`\parencite{}` (entre parênteses).

## Versão Word para submissão (a revista só aceita Word/RTF)

Pronta em `word/submissao/` (e compactada em `../ijgsi-submissao-word.zip`):

| arquivo | o que é |
|---|---|
| `manuscript-anonymous.docx` | manuscrito anônimo (propriedades do arquivo sem autor) |
| `title-page.docx` | folha de rosto separada: autores, afiliação, e-mail, ORCID, bios, conflito de interesse, autoria (CRediT) |
| `figures/Figure1.png` … `Figure4.png` | figuras como arquivos separados, na ordem de aparição |

Gerada a partir do `main.tex` por `bash word/gerar.sh` (pandoc + citeproc com APA 7 + ajustes de
formato em `word/montar_docx.py`). Edite o `main.tex` e rode o script de novo; não edite o .docx à
mão se ainda for mudar o texto.

Conferido contra o checklist da IJGSI:

- 6.232 palavras incluindo referências (exigido: 6.000–8.000);
- Times New Roman 12, espaço 1,5, margens de 2,54 cm, A4, número de página no canto superior direito;
- título em negrito, itálico, maiúsculas e justificado, em até duas linhas (96 caracteres);
- resumo com 130 palavras e 794 caracteres (exigido: < 300 palavras e < 1.000 caracteres);
- 7 palavras-chave em itálico, espaço simples, justificadas;
- tabelas como texto editável, no estilo APA (número em negrito e título em itálico acima);
- referências APA 7 em página nova, espaço duplo, recuo deslocado de 1,25 cm;
- nenhum nome, instituição ou nome do projeto no manuscrito; link do repositório substituído por
  "[repository link removed for anonymous review]";
- os dois .docx passam no validador de esquema OOXML.

**Falta preencher na folha de rosto:** ORCIDs, e-mail do orientador, minibiografias (100–150
palavras), agradecimentos/financiamento, papéis de autoria (confirmar) e a declaração sobre uso de
IA generativa na escrita e na análise.

Não consegui abrir o .docx no LibreOffice neste ambiente; a verificação visual foi feita por
conversão para HTML. Vale abrir no Word uma vez antes de enviar para conferir quebras de página e o
tamanho das figuras.

## De onde vem cada número

Todos os números saem de `experimentos/validacao/analise-atratores/resultados.json`
(script `analise/atratores.py`), de `experimentos/validacao/analise-grafos/resultados.json`
e de `experimentos/validacao/analise/resultados.json` (validação: juiz cego e modelo nulo).
A codificação das premissas está em `analise-atratores/premissas.json`.
