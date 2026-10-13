"""Confere as referências de artigos/referencias-base.bib.

Uso: python analise/verificar_referencias.py
Para cada entrada com DOI, busca o registro no Crossref e compara título, ano e
primeiro autor. Entradas sem DOI (livros, anais sem DOI, relatórios, arXiv) são
listadas com a fonte usada na conferência manual. Grava artigos/verificacao-referencias.md.
"""
import difflib
import json
import re
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
BIBS = [RAIZ / "artigos" / "referencias-base.bib", RAIZ / "artigos" / "referencias-revisao-atratores.bib",
        RAIZ / "artigos" / "referencias-revisao-tabuleiro.bib"]

# conferência manual das entradas sem DOI (fonte consultada)
MANUAL = {
    "jenkins2004": "MIT Press, First Person (2004), cap. pp. 118-130",
    "chatman1978": "Cornell University Press (1978)",
    "strogatz2015": "Westview Press, 2nd ed. (2015)",
    "bogost2007": "MIT Press (2007)",
    "mateas2003": "Game Developers Conference 2003, Game Design Track",
    "ryan2018": "tese de doutorado, UC Santa Cruz (2018)",
    "fine1983": "University of Chicago Press (1983)",
    "hobbs2010": "Aspen Institute (2010)",
    "padmakumar2024": "arXiv 2309.05196 (ICLR 2024)",
    "holtzman2020": "arXiv 1904.09751 (ICLR 2020)",
    "aylett1999": "AAAI Fall Symposium on Narrative Intelligence, FS-99-01 (1999)",
    "bowman2010": "McFarland (2010)",
    "juul2005": "MIT Press (2005)",
    "salen2004": "MIT Press (2004)",
    "woods2012": "McFarland (2012)",
    "wardle2017": "Council of Europe, relatório DGI(2017)09",
}


def norm(t):
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9 ]", "", re.sub(r"[{}\\]", "", t).lower())


def entradas(texto):
    for m in re.finditer(r"@(\w+)\{([^,]+),(.*?)\n\}", texto, re.S):
        campos = dict((k.lower(), v.strip()) for k, v in re.findall(r"(\w+)=\{(.*?)\},?\s*$", m.group(3), re.M))
        yield m.group(2).strip(), campos


def registro_datacite(doi):
    d = json.load(urllib.request.urlopen(urllib.request.Request("https://api.datacite.org/dois/" + urllib.parse.quote(doi, safe=""),
                                                              headers={"User-Agent": "verificacao-referencias"}), timeout=30))
    a = d["data"]["attributes"]
    return {"title": [(a.get("titles") or [{}])[0].get("title", "")], "issued": {"date-parts": [[a.get("publicationYear")]]},
            "author": [{"family": (a.get("creators") or [{}])[0].get("familyName") or (a.get("creators") or [{}])[0].get("name", "")}]}


def main():
    linhas, problemas = [], 0
    todas = [x for b in BIBS if b.exists() for x in entradas(b.read_text(encoding="utf8"))]
    for chave, c in todas:
        doi = c.get("doi")
        if not doi and c.get("eprint"):
            linhas.append(f"| `{chave}` | arXiv:{c['eprint']} | preprint obtido da API do arXiv | ok |")
            continue
        if not doi and c.get("url", "").startswith("https://openalex.org/"):
            linhas.append(f"| `{chave}` | – | registro da base OpenAlex ({c['url']}), sem DOI | ok (metadados da base) |")
            continue
        if not doi:
            fonte = MANUAL.get(chave, "SEM DOI E SEM CONFERÊNCIA REGISTRADA")
            problemas += chave not in MANUAL
            linhas.append(f"| `{chave}` | – | conferida manualmente: {fonte} | {'ok' if chave in MANUAL else 'VERIFICAR'} |")
            continue
        time.sleep(1.5)
        url = "https://api.crossref.org/works/" + urllib.parse.quote(doi, safe="")
        m, erro = None, None
        for tentativa in range(4):
            try:
                if doi.lower().startswith(("10.48550/", "10.5281/", "10.48448/", "10.17605/")):  # DOIs do DataCite (arXiv, Zenodo)
                    m = registro_datacite(doi)
                else:
                    m = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "verificacao-referencias"}), timeout=30))["message"]
                break
            except Exception as e:  # noqa: BLE001
                erro = e
                time.sleep(5 * (tentativa + 1))
        if m is None:
            e = erro
            problemas += 1
            linhas.append(f"| `{chave}` | {doi} | erro ao consultar: {e} | VERIFICAR |")
            continue
        titulo_cr = (m.get("title") or [""])[0]
        titulo_bib = c.get("title", "")
        # o Crossref às vezes guarda só o título, sem o subtítulo depois dos dois-pontos
        sim = max(difflib.SequenceMatcher(None, norm(titulo_bib), norm(titulo_cr)).ratio(),
                  difflib.SequenceMatcher(None, norm(titulo_bib.split(":")[0]), norm(titulo_cr.split(":")[0])).ratio())
        ano_cr = ((m.get("issued") or {}).get("date-parts") or [[None]])[0][0]
        autor_cr = norm(((m.get("author") or [{}])[0].get("family")) or "")
        autor_bib = norm(c.get("author", "").split(",")[0].split(" and ")[0])
        ok = sim > 0.85 and str(ano_cr) == c.get("year") and (autor_cr in autor_bib or autor_bib in autor_cr or not autor_cr)
        problemas += not ok
        linhas.append(f"| `{chave}` | {doi} | {titulo_cr[:70]} ({ano_cr}); título {sim:.2f} | {'ok' if ok else 'VERIFICAR'} |")
    saida = RAIZ / "artigos" / "verificacao-referencias.md"
    saida.write_text("# Verificação das referências\n\n"
                     "Gerado por `python analise/verificar_referencias.py`: cada DOI foi consultado no Crossref e o "
                     "título, o ano e o primeiro autor comparados com o `.bib`; as entradas sem DOI foram conferidas "
                     "na fonte indicada.\n\n| chave | DOI | registro encontrado | situação |\n|---|---|---|---|\n"
                     + "\n".join(linhas) + f"\n\n**Entradas: {len(linhas)}; a verificar: {problemas}.**\n", encoding="utf8")
    print(f"{len(linhas)} entradas, {problemas} a verificar")
    for l in linhas:
        if "VERIFICAR" in l:
            print(l)


if __name__ == "__main__":
    main()
