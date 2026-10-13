"""LaTeX (main.tex) -> Markdown limpo para o Word da IJGSI.

Uso: python word/preparar_md.py artigo_bruto.md artigo.md
(artigo_bruto.md vem de: pandoc main.tex -t markdown-simple_tables-multiline_tables-grid_tables+pipe_tables --wrap=none)

- monta a primeira página (título, resumo, palavras-chave) a partir do main.tex;
- resolve as referências cruzadas (Table 1, Figure 2);
- tabelas e figuras no estilo APA 7: número em negrito e título em itálico acima;
- remove matemática das tabelas (o Word recebe texto editável).
"""
import re
import sys
from pathlib import Path

bruto, saida = Path(sys.argv[1]), Path(sys.argv[2])
tex = Path(__file__).resolve().parent.parent.joinpath("main.tex").read_text(encoding="utf8")
md = bruto.read_text(encoding="utf8")


def limpa_tex(t: str) -> str:
    t = re.sub(r"\\textbf\{|\\textit\{|\}", "", t)
    t = t.replace(r"\%", "%").replace("vs.\\ ", "vs. ")
    return " ".join(t.split())


titulo = limpa_tex(re.search(r"\\title\{(.*?)\}\}\}", tex, re.S).group(1))
resumo = limpa_tex(re.search(r"\\begin\{abstract\}\s*\\noindent(.*?)\\end\{abstract\}", tex, re.S).group(1))
palavras = re.search(r"\\textit\{Keywords: (.*?)\}", tex).group(1)
assert len(resumo) < 1000 and len(resumo.split()) < 300, (len(resumo), len(resumo.split()))

# corpo: tudo a partir da Introdução
md = md[md.index("# Introduction"):]

# números de tabelas e figuras na ordem em que aparecem
rotulos = {}
for tipo, prefixo in (("tab", "Table"), ("fig", "Figure")):
    for n, rot in enumerate(re.findall(r"\{#(" + tipo + r":[^ }]+)", md), 1):
        rotulos[rot] = f"{prefixo} {n}"
md = re.sub(r"(?:Table|Figure)[ \xa0]\[\d+\]\(#([^)]+)\)\{reference-type=\"ref\" reference=\"[^\"]+\"\}",
            lambda m: rotulos[m.group(1)].replace(" ", "\xa0"), md)

# tabelas: ::: {#tab:x} ... : legenda ::: -> **Table n** / *legenda* / tabela
def tabela(m):
    rot, corpo = m.group(1), m.group(2)
    leg = re.search(r"^: (.*)$", corpo, re.M).group(1)
    corpo = re.sub(r"^: .*$", "", corpo, flags=re.M).strip()
    leg = leg.strip().replace("*", "").replace("$", "")  # a legenda já é toda em itálico
    return f"**{rotulos[rot]}**\n\n*{leg}*\n\n{corpo}\n"
md = re.sub(r":{3,} \{#(tab:[^}]+)\}\n(.*?)\n:{3,}", tabela, md, flags=re.S)

# figuras: ![legenda](arq){#fig:x width=..} -> **Figure n** / *legenda* / imagem
def figura(m):
    leg, arq, rot = m.group(1), m.group(2), m.group(3)
    largura = "9cm" if ("premissas" in arq or "tabuleiro" in arq) else "15cm"
    return f"**{rotulos[rot]}**\n\n*{leg.strip()}*\n\n![]({arq}){{width=\"{largura}\"}}"
md = re.sub(r"!\[(.*?)\]\(([^)]+)\)\{#(fig:[^ }]+)[^}]*\}", figura, md)

# matemática dentro das tabelas -> texto
linhas = []
for l in md.split("\n"):
    if l.startswith("|"):
        l = l.replace(r"$\rightarrow$", "→").replace("$p$", "*p*")
        l = re.sub(r"\$n = (\d+)\$", r"*n* = \1", l)
    linhas.append(l)
md = "\n".join(linhas)
# a linha vazia da tabela 2 era o subtítulo "Descriptive, no null comparison"
md = re.sub(r"^\|\s+\|\s+\|\s+\|\s+\|$", "| *Descriptive measures (no null comparison)* | | | |", md, count=1, flags=re.M)

# matemática em linha -> texto com itálico e subscrito (estilo APA: *p* = .036)
def sem_math(m):
    t = m.group(1)
    t = t.replace(r"\dots", "…").replace(r"\in", "∈").replace(r"\rightarrow", "→").replace(r"\times", "×")
    t = t.replace(r"\left", "").replace(r"\right", "")
    t = re.sub(r"\^\{([^}]*)\}", r"^\1^", t)
    t = re.sub(r"\^(\w)", r"^\1^", t)
    t = re.sub(r"_\{([^}]*)\}", lambda x: "~" + x.group(1).replace("-", "−") + "~", t)
    t = re.sub(r"_(\w)", r"~\1~", t)
    t = re.sub(r"(?<![A-Za-z])([A-Za-z])(?![A-Za-z])", r"*\1*", t)
    t = t.replace(" ", "\\ ") if False else t
    assert "\\" not in t, t
    return t
md = re.sub(r"(?<!\$)\$([^$]+)\$(?!\$)", sem_math, md)  # $$...$$ (equações em destaque) fica para o pandoc

md = md.replace("{#data-and-code-availability .unnumbered}", "")
md = md.replace(r"\[link removed for review\]", r"\[repository link removed for anonymous review\]")
assert "reference-type" not in md and "#fig:" not in md and "#tab:" not in md

frente = f"""---
title: ""
---

::: {{custom-style="Titulo IJGSI"}}
{titulo}
:::

::: {{custom-style="Rotulo resumo"}}
Abstract
:::

::: {{custom-style="Resumo IJGSI"}}
{resumo}
:::

::: {{custom-style="Palavras-chave IJGSI"}}
Keywords: {palavras}
:::

"""
saida.write_text(frente + md + "\n\n# References\n\n::: {#refs}\n:::\n", encoding="utf8")
print("título:", titulo, f"({len(titulo)} caracteres)")
print("resumo:", len(resumo), "caracteres,", len(resumo.split()), "palavras")
