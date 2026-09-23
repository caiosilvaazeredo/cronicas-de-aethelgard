"""Amostra de ligações causadoPor para anotação humana (validação do
autorrelato causal).

Uso:
    python analise/amostra_anotacao.py sortear saida/<campanha> [--por-estrato 50] [--distratores 0.1] [--semente 7]
    python analise/amostra_anotacao.py kappa anotacao_A.csv anotacao_B.csv

`sortear` pega as ligações válidas (as que viraram aresta no grafo: a causa
existe e não é posterior ao efeito), estratifica por modelo dos agentes e por
mundo, sorteia até N por estrato e grava em <campanha>/anotacao/:

- planilha_anotador_A.csv/.xlsx e planilha_anotador_B.csv/.xlsx: mesmas
  ligações, em ordem embaralhada diferente, SEM modelo, mundo ou sessão (cegas);
  o anotador preenche "plausivel" com s ou n;
- chave.csv: o que liga cada id ao estrato, à sessão e a se é distrator.

Distratores: uma fração de pares causa-efeito sorteados entre eventos da mesma
sessão que NÃO foram ligados pelo modelo, misturados às ligações reais, para
estimar o quanto os anotadores aprovam qualquer par.

`kappa` calcula a concordância (kappa de Cohen) entre as duas planilhas
preenchidas e a proporção de ligações julgadas plausíveis por estrato.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

COLUNAS_PLANILHA = ["id", "causa_dia", "causa", "efeito_dia", "efeito", "plausivel", "observacao"]


def ler_jsonl(caminho: Path) -> list[dict]:
    return [json.loads(l) for l in caminho.read_text(encoding="utf8").splitlines() if l.strip()]


def ligacoes_da_sessao(dir_sessao: Path) -> tuple[list[dict], list[dict]]:
    condicao = json.loads((dir_sessao / "condicao.json").read_text(encoding="utf8"))
    eventos = ler_jsonl(dir_sessao / "eventos.jsonl")
    por_id = {e["id"]: e for e in eventos}
    modelo = f"{condicao['modelos']['agentes']['provedor']}/{condicao['modelos']['agentes']['modelo']}"
    estrato = f"{modelo} | {condicao['mundo']}"
    reais, ligados = [], set()
    for efeito in eventos:
        vistos = set()
        for origem in efeito.get("causadoPor", []):
            causa = por_id.get(origem)
            # mesmas regras de construirArestas em services/arcos.ts
            if origem == efeito["id"] or origem in vistos or causa is None or causa["turno"] > efeito["turno"]:
                continue
            vistos.add(origem)
            ligados.add((origem, efeito["id"]))
            reais.append({"estrato": estrato, "sessao": dir_sessao.name, "causa_id": origem, "efeito_id": efeito["id"],
                          "causa_dia": causa["dia"], "causa": causa["conteudo"],
                          "efeito_dia": efeito["dia"], "efeito": efeito["conteudo"], "distrator": False})
    candidatos = []
    for efeito in eventos:
        for causa in eventos:
            if causa["turno"] < efeito["turno"] and (causa["id"], efeito["id"]) not in ligados:
                candidatos.append({"estrato": estrato, "sessao": dir_sessao.name, "causa_id": causa["id"],
                                   "efeito_id": efeito["id"], "causa_dia": causa["dia"], "causa": causa["conteudo"],
                                   "efeito_dia": efeito["dia"], "efeito": efeito["conteudo"], "distrator": True})
    return reais, candidatos


def gravar_planilha(df: pd.DataFrame, caminho: Path) -> None:
    df.to_csv(caminho.with_suffix(".csv"), index=False)
    try:
        df.to_excel(caminho.with_suffix(".xlsx"), index=False)
    except ImportError:
        print("openpyxl não instalado: só o .csv foi gerado", file=sys.stderr)


def sortear(campanha: Path, por_estrato: int, frac_distratores: float, semente: int) -> None:
    rng = np.random.default_rng(semente)
    reais, falsos = [], []
    for resumo in sorted(campanha.glob("*/resumo.json")):
        r, f = ligacoes_da_sessao(resumo.parent)
        reais += r
        falsos += f
    if not reais:
        sys.exit("nenhuma ligação causadoPor válida encontrada")
    reais_df = pd.DataFrame(reais)
    falsos_df = pd.DataFrame(falsos)

    amostras = []
    for estrato, g in reais_df.groupby("estrato"):
        n = min(por_estrato, len(g))
        amostras.append(g.iloc[rng.choice(len(g), size=n, replace=False)])
        n_dist = int(round(n * frac_distratores))
        pool = falsos_df[falsos_df["estrato"] == estrato] if len(falsos_df) else falsos_df
        if n_dist > 0 and len(pool) > 0:
            amostras.append(pool.iloc[rng.choice(len(pool), size=min(n_dist, len(pool)), replace=False)])
    amostra = pd.concat(amostras, ignore_index=True)
    amostra.insert(0, "id", [f"L{i:05d}" for i in rng.permutation(len(amostra))])
    amostra = amostra.sort_values("id").reset_index(drop=True)

    destino = campanha / "anotacao"
    destino.mkdir(parents=True, exist_ok=True)
    amostra[["id", "estrato", "sessao", "causa_id", "efeito_id", "distrator"]].to_csv(destino / "chave.csv", index=False)
    planilha = amostra.assign(plausivel="", observacao="")[COLUNAS_PLANILHA]
    for anotador, s in [("A", semente + 1), ("B", semente + 2)]:
        ordem = np.random.default_rng(s).permutation(len(planilha))
        gravar_planilha(planilha.iloc[ordem], destino / f"planilha_anotador_{anotador}")
    contagem = amostra.groupby(["estrato", "distrator"]).size().unstack(fill_value=0)
    print(contagem.to_string())
    print(f"\n{len(amostra)} ligações gravadas em {destino}")


def normalizar(v) -> str | None:
    s = str(v).strip().lower()
    if s in {"s", "sim", "1", "true", "y", "yes"}:
        return "s"
    if s in {"n", "nao", "não", "0", "false", "no"}:
        return "n"
    return None


def kappa(a_path: Path, b_path: Path) -> None:
    ler = lambda p: pd.read_excel(p) if p.suffix == ".xlsx" else pd.read_csv(p)  # noqa: E731
    a, b = ler(a_path), ler(b_path)
    m = a[["id", "plausivel"]].merge(b[["id", "plausivel"]], on="id", suffixes=("_a", "_b"))
    m["a"] = m["plausivel_a"].map(normalizar)
    m["b"] = m["plausivel_b"].map(normalizar)
    m = m.dropna(subset=["a", "b"])
    if m.empty:
        sys.exit("nenhuma linha anotada pelos dois anotadores")
    po = float((m["a"] == m["b"]).mean())
    pe = sum(float((m["a"] == c).mean()) * float((m["b"] == c).mean()) for c in ["s", "n"])
    k = (po - pe) / (1 - pe) if pe < 1 else 1.0
    print(f"linhas anotadas pelos dois: {len(m)}")
    print(f"concordância observada: {po:.3f}; kappa de Cohen: {k:.3f}")

    chave = a_path.parent / "chave.csv"
    if chave.exists():
        c = pd.read_csv(chave).merge(m, on="id")
        c["plausivel_ambos"] = (c["a"] == "s") & (c["b"] == "s")
        print("\nproporção julgada plausível pelos dois anotadores:")
        print(c.groupby(["estrato", "distrator"])["plausivel_ambos"].mean().to_string())


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="comando", required=True)
    s = sub.add_parser("sortear")
    s.add_argument("campanha", type=Path)
    s.add_argument("--por-estrato", type=int, default=50)
    s.add_argument("--distratores", type=float, default=0.1)
    s.add_argument("--semente", type=int, default=7)
    k = sub.add_parser("kappa")
    k.add_argument("a", type=Path)
    k.add_argument("b", type=Path)
    args = ap.parse_args()
    if args.comando == "sortear":
        sortear(args.campanha, args.por_estrato, args.distratores, args.semente)
    else:
        kappa(args.a, args.b)


if __name__ == "__main__":
    main()
