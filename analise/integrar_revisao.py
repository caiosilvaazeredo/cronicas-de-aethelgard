"""Leva os estudos incluídos nas revisões PRISMA para os artigos.

Uso: python analise/integrar_revisao.py

- limpa o BibTeX dos incluídos (experimentos/revisao/<id>/incluidos.bib), protege
  siglas do minúsculo automático do APA e grava artigos/referencias-revisao-<id>.bib;
- quando um incluído já está na bibliografia base (mesmo DOI ou título), usa a
  chave da base e não duplica a entrada;
- grava artigos/<artigo>/referencias.bib = base + revisão do artigo;
- grava artigos/<artigo>/figuras/prisma.png e artigos/<artigo>/revisao_incluidos.json
  (chave, ano, título, veículo e categoria) para o apêndice do Word completo.
"""
import json
import re
import shutil
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ART = RAIZ / "artigos"
REVISAO = RAIZ / "experimentos" / "revisao"
ARTIGO_DA_REVISAO = {"atratores": "ijgsi-atratores", "tabuleiro": "ijgsi-tabuleiro"}
# correções conferidas no registro Crossref quando o BibTeX coletado veio incompleto
CORRECOES = {
    "revtab44": ("inproceedings", {"booktitle": "Proceedings of the 10th Workshop on Games and Natural Language Processing @ LREC-COLING 2024",
                                   "doi": "10.63317/53phvu862rxj", "howpublished": ""}),
}


def norm(t):
    t = unicodedata.normalize("NFKD", t or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", re.sub(r"[{}\\]", "", t)).strip()


def entradas(texto):
    """Divide um .bib em (tipo, chave, corpo) respeitando chaves aninhadas."""
    i = 0
    while True:
        m = re.search(r"@(\w+)\s*\{\s*([^,\s]+)\s*,", texto[i:])
        if not m:
            return
        ini = i + m.start()
        prof, j = 0, ini + m.group(0).index("{")
        while j < len(texto):
            if texto[j] == "{":
                prof += 1
            elif texto[j] == "}":
                prof -= 1
                if prof == 0:
                    break
            j += 1
        yield m.group(1).lower(), m.group(2), texto[i + m.end():j]
        i = j + 1


def campos(corpo):
    out, i = {}, 0
    while True:
        m = re.search(r"(\w+)\s*=\s*", corpo[i:])
        if not m:
            return out
        k, j = m.group(1).lower(), i + m.end()
        if j < len(corpo) and corpo[j] == "{":
            prof, n = 0, j
            while n < len(corpo):
                prof += corpo[n] == "{"
                prof -= corpo[n] == "}"
                if prof == 0:
                    break
                n += 1
            out[k], i = corpo[j + 1:n], n + 1
        elif j < len(corpo) and corpo[j] == '"':
            n = corpo.index('"', j + 1)
            out[k], i = corpo[j + 1:n], n + 1
        else:
            n = re.search(r"[,\n]|$", corpo[j:]).start() + j
            out[k], i = corpo[j:n].strip(), n + 1


def proteger_siglas(t):
    # palavras com duas ou mais maiúsculas (LLM, RPG, AI, GPT-4, CORE) ficam entre chaves
    return re.sub(r"(?<![{\w])([A-Za-z0-9]*[A-Z]{2}[A-Za-z0-9+()-]*)(?![\w}])", r"{\1}", t)


def limpar(tipo, chave, c):
    manter = ["author", "title", "journal", "booktitle", "year", "volume", "number", "pages", "publisher", "doi",
              "eprint", "eprinttype", "howpublished", "url", "eid"]
    if c.get("doi", "").lower().startswith("10.48550/arxiv."):
        tipo = "misc"
        c.setdefault("eprint", c["doi"].lower().split("arxiv.", 1)[1])
        c["eprinttype"] = "arxiv"
        c["howpublished"] = "arXiv preprint"
        c.pop("publisher", None)
    if tipo == "inbook" and "booktitle" in c:
        tipo = "incollection"
    linhas = []
    for k in manter:
        v = c.get(k)
        if not v:
            continue
        v = " ".join(str(v).split()).replace("–", "--").replace("’", "'")
        if k == "title":
            v = proteger_siglas(v)
        if k != "url":
            v = re.sub(r"(?<!\\)&", r"\\&", v)
        if k == "url" and c.get("doi"):
            continue
        linhas.append(f"  {k}={{{v}}}")
    return f"@{tipo}{{{chave},\n" + ",\n".join(linhas) + "\n}"


def main():
    base_txt = (ART / "referencias-base.bib").read_text(encoding="utf8")
    base = {}
    for tipo, chave, corpo in entradas(base_txt):
        c = campos(corpo)
        if c.get("doi"):
            base["doi:" + c["doi"].lower()] = chave
        base["t:" + norm(c.get("title", ""))] = chave
    for rid, artigo in ARTIGO_DA_REVISAO.items():
        pasta = REVISAO / rid
        if not (pasta / "incluidos.json").exists():
            continue
        incluidos = json.loads((pasta / "incluidos.json").read_text(encoding="utf8"))
        cats = json.loads((pasta / "categorias.json").read_text(encoding="utf8"))["categorias"] if (pasta / "categorias.json").exists() else {}
        cat_de = {c: k for k, v in cats.items() for c in v}
        bib = {chave: (tipo, campos(corpo)) for tipo, chave, corpo in entradas((pasta / "incluidos.bib").read_text(encoding="utf8"))}
        saida, lista = [], []
        for r in incluidos:
            chave = r.get("chave")
            ja = base.get("doi:" + (r.get("doi") or "").lower()) or base.get("t:" + norm(r["titulo"]))
            if ja:
                usada = ja
            elif chave in bib:
                tipo, c = bib[chave]
                if chave in CORRECOES:
                    tipo, extra = CORRECOES[chave]
                    c = {**c, **extra}
                saida.append(limpar(tipo, chave, c))
                usada = chave
            else:
                continue
            lista.append({"chave": usada, "categoria": cat_de.get(chave, ""), "ano": r["ano"], "titulo": r["titulo"],
                          "veiculo": CORRECOES.get(chave, ("", {}))[1].get("booktitle") or r["veiculo"],
                          "doi": r.get("doi") or "", "arxiv": r.get("arxiv") or ""})
        (ART / f"referencias-revisao-{rid}.bib").write_text(
            f"% Estudos incluídos na revisão PRISMA '{rid}' (experimentos/revisao/{rid}); BibTeX obtido do doi.org\n"
            "% (Crossref/DataCite) ou do arXiv e limpo por analise/integrar_revisao.py.\n\n" + "\n\n".join(saida) + "\n",
            encoding="utf8")
        (ART / artigo / "referencias.bib").write_text(base_txt + "\n\n" + (ART / f"referencias-revisao-{rid}.bib").read_text(encoding="utf8"),
                                                     encoding="utf8")
        shutil.copy(pasta / "prisma.png", ART / artigo / "figuras" / "prisma.png")
        (ART / artigo / "revisao_incluidos.json").write_text(json.dumps(lista, ensure_ascii=False, indent=2), encoding="utf8")
        print(f"{rid}: {len(lista)} incluídos, {len(saida)} entradas novas, {len(lista) - len(saida)} já na base")


if __name__ == "__main__":
    main()
