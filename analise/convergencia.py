"""Análise de convergência de uma campanha da Cidade Viva.

Uso:
    python analise/convergencia.py saida/<campanha> [--ks 2,3,5] [--bootstrap 10000]

Lê <campanha>/analise/reanalise.jsonl (gerado por `npm run reanalisar`; se não
existir, o script o gera chamando o reanalisador em TypeScript, que usa o
próprio services/arcos.ts) e os resumo.json de cada sessão. Para cada k:

- curvas médias de tramas abertas e de razão de amarração por dia, por nível
  de cada dimensão experimental, com IC de 95% por bootstrap sobre sessões;
- proporção de tramas fechadas POR ESTABILIDADE sobre tramas NASCIDAS por condição
  (métrica principal da emenda 1 do pre-registro.md, que separa fusão de
  fechamento); a proporção da versão 0.1 é mantida como secundária;
- proporção de sessões que convergem pela definição da emenda 1 (último terço:
  abertas não sobem, ao menos um fechamento por estabilidade e fechamentos >=
  fusões) e, como secundária, pela definição original da versão 0.1;
- Mann-Whitney U entre níveis de cada dimensão e entre Cidade Viva e o controle
  de três atos, com correção de Holm e correlação bisserial de postos.

Também grava a taxa de falha de estrutura, os descartes de causadoPor e o custo
por modelo, a partir dos resumo.json.

Saída em <campanha>/analise/: tabelas .csv e .md e figuras .png.
"""

from __future__ import annotations

import argparse
import itertools
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent

DIMENSOES = ["modelo", "estadoTramas", "numAgentes", "jogador", "mundo", "tipo"]


def rotulo_modelo(condicao: dict) -> str:
    m = condicao["modelos"]["agentes"]
    return f"{m['provedor']}/{m['modelo']}"


def carregar_reanalise(campanha: Path) -> pd.DataFrame:
    arquivo = campanha / "analise" / "reanalise.jsonl"
    if not arquivo.exists():
        print("reanalise.jsonl não encontrado; rodando o reanalisador...", file=sys.stderr)
        subprocess.run(
            ["npx", "tsx", "sim/reanalisar.ts", "--campanha", str(campanha)],
            cwd=RAIZ,
            check=True,
        )
    linhas = [json.loads(l) for l in arquivo.read_text(encoding="utf8").splitlines() if l.strip()]
    registros = []
    for l in linhas:
        c = l["condicao"]
        registros.append(
            {
                "sessao": l["sessao"],
                "k": l["k"],
                "variante": l.get("variante", "completo"),
                "celula": c["celula"],
                "modelo": rotulo_modelo(c),
                "estadoTramas": c["estadoTramas"],
                "numAgentes": c["numAgentes"],
                "jogador": c["jogador"],
                "mundo": c["mundo"],
                "tipo": "controle-tres-atos" if c["controle"] else "cidade-viva",
                "dias": c["dias"],
                "tramasSurgidas": l["tramasSurgidas"],
                "tramasFechadas": l["tramasFechadas"],
                "proporcaoTramasFechadas": l["proporcaoTramasFechadas"],
                "abertas": [m["componentesAbertos"] for m in l["metricas"]],
                "amarracao": [m["razaoAmarracao"] for m in l["metricas"]],
                # emenda 1 (2026-09-25): fusão separada de fechamento
                "nascidas": l["linhagem"]["nascidas"],
                "fechadasEstab": l["linhagem"]["fechadasPorEstabilidade"],
                "fundidas": l["linhagem"]["fundidasAntesDeFechar"],
                "propFechadasEstab": l["linhagem"]["proporcaoFechadasPorEstabilidade"],
                "propFundidas": l["linhagem"]["proporcaoFundidas"],
                "fechadasAcum": [d["fechadasAcum"] for d in l["linhagemDias"]],
                "fundidasAcum": [d["fundidasAcum"] for d in l["linhagemDias"]],
                "nascidasAcum": [d["nascidasAcum"] for d in l["linhagemDias"]],
            }
        )
    return pd.DataFrame(registros)


def inclinacao(serie: list[float]) -> float:
    if len(serie) < 2:
        return 0.0
    x = np.arange(len(serie), dtype=float)
    return float(np.polyfit(x, np.asarray(serie, dtype=float), 1)[0])


def converge(abertas: list[float], amarracao: list[float]) -> bool:
    """Definição original do pré-registro (v0.1), mantida como secundária."""
    d = len(abertas)
    inicio = int(np.ceil(2 * d / 3)) - 1  # dia ceil(2D/3), índice base 0
    return inclinacao(abertas[inicio:]) <= 0 and inclinacao(amarracao[inicio:]) > 0


def converge_emenda1(abertas: list[float], fechadas_acum: list[float], fundidas_acum: list[float]) -> bool:
    """Definição da emenda 1 (2026-09-25). No último terço da sessão:
    (a) a curva de tramas abertas não sobe (inclinação <= 0);
    (b) ao menos uma trama fecha por estabilidade;
    (c) as saídas por fechamento são ao menos tantas quanto as saídas por fusão.
    """
    d = len(abertas)
    i = int(np.ceil(2 * d / 3)) - 1
    base_f = fechadas_acum[i - 1] if i > 0 else 0
    base_u = fundidas_acum[i - 1] if i > 0 else 0
    fechou = fechadas_acum[-1] - base_f
    fundiu = fundidas_acum[-1] - base_u
    return inclinacao(abertas[i:]) <= 0 and fechou >= 1 and fechou >= fundiu


def bootstrap_ic(matriz: np.ndarray, n: int, rng: np.random.Generator) -> tuple[np.ndarray, np.ndarray]:
    """IC de 95% da média por coluna, reamostrando linhas (sessões)."""
    if matriz.shape[0] < 2:
        return matriz.mean(axis=0), matriz.mean(axis=0)
    idx = rng.integers(0, matriz.shape[0], size=(n, matriz.shape[0]))
    medias = matriz[idx].mean(axis=1)
    return np.percentile(medias, 2.5, axis=0), np.percentile(medias, 97.5, axis=0)


def ic_media(valores: np.ndarray, n: int, rng: np.random.Generator) -> tuple[float, float]:
    lo, hi = bootstrap_ic(valores.reshape(-1, 1), n, rng)
    return float(lo[0]), float(hi[0])


def holm(pvalores: list[float]) -> list[float]:
    m = len(pvalores)
    ordem = np.argsort(pvalores)
    ajustados = np.empty(m)
    acumulado = 0.0
    for posicao, i in enumerate(ordem):
        acumulado = max(acumulado, (m - posicao) * pvalores[i])
        ajustados[i] = min(1.0, acumulado)
    return ajustados.tolist()


def bisserial_postos(u: float, n1: int, n2: int) -> float:
    return 1 - 2 * u / (n1 * n2)


def comparacoes(df: pd.DataFrame, k: int) -> pd.DataFrame:
    linhas = []
    cv = df[df["tipo"] == "cidade-viva"]
    for dim in ["modelo", "estadoTramas", "numAgentes", "jogador", "mundo"]:
        niveis = sorted(cv[dim].unique(), key=str)
        for a, b in itertools.combinations(niveis, 2):
            xa = cv.loc[cv[dim] == a, "propFechadasEstab"].to_numpy()
            xb = cv.loc[cv[dim] == b, "propFechadasEstab"].to_numpy()
            if len(xa) == 0 or len(xb) == 0:
                continue
            u, p = stats.mannwhitneyu(xa, xb, alternative="two-sided")
            linhas.append(
                {"k": k, "dimensao": dim, "a": a, "b": b, "n_a": len(xa), "n_b": len(xb),
                 "mediana_a": np.median(xa), "mediana_b": np.median(xb), "U": u, "p": p,
                 "bisserial_postos": bisserial_postos(u, len(xa), len(xb))}
            )
    controle = df[df["tipo"] == "controle-tres-atos"]
    if len(controle) > 0 and len(cv) > 0:
        # cada modelo na Cidade Viva contra o controle do mesmo modelo
        for modelo in sorted(cv["modelo"].unique()):
            xa = cv.loc[cv["modelo"] == modelo, "propFechadasEstab"].to_numpy()
            xb = controle.loc[controle["modelo"] == modelo, "propFechadasEstab"].to_numpy()
            if len(xa) == 0 or len(xb) == 0:
                continue
            u, p = stats.mannwhitneyu(xa, xb, alternative="two-sided")
            linhas.append(
                {"k": k, "dimensao": "tipo", "a": f"cidade-viva [{modelo}]", "b": f"controle-tres-atos [{modelo}]",
                 "n_a": len(xa), "n_b": len(xb), "mediana_a": np.median(xa), "mediana_b": np.median(xb),
                 "U": u, "p": p, "bisserial_postos": bisserial_postos(u, len(xa), len(xb))}
            )
    tabela = pd.DataFrame(linhas)
    if len(tabela) > 0:
        tabela["p_holm"] = holm(tabela["p"].tolist())
        tabela["significativo_0.05"] = tabela["p_holm"] < 0.05
    return tabela


def por_condicao(df: pd.DataFrame, k: int, n_boot: int, rng: np.random.Generator) -> pd.DataFrame:
    linhas = []
    for celula, g in df.groupby("celula"):
        props = g["propFechadasEstab"].to_numpy()
        lo, hi = ic_media(props, n_boot, rng)
        conv = [converge(a, r) for a, r in zip(g["abertas"], g["amarracao"])]
        conv1 = [converge_emenda1(a, f, u) for a, f, u in zip(g["abertas"], g["fechadasAcum"], g["fundidasAcum"])]
        primeira = g.iloc[0]
        linhas.append(
            {"k": k, "celula": celula, **{d: primeira[d] for d in DIMENSOES}, "sessoes": len(g),
             "prop_fechadas_estab_media": props.mean(), "ic95_inf": lo, "ic95_sup": hi,
             "prop_fechadas_estab_mediana": np.median(props),
             "prop_fundidas_media": g["propFundidas"].mean(),
             "tramas_nascidas_media": g["nascidas"].mean(),
             "sessoes_que_convergem_emenda1": float(np.mean(conv1)),
             # métricas da versão 0.1, mantidas como secundárias
             "prop_fechadas_v01_media": g["proporcaoTramasFechadas"].mean(),
             "sessoes_que_convergem_v01": float(np.mean(conv))}
        )
    return pd.DataFrame(linhas).sort_values("celula")


def figuras(df: pd.DataFrame, k: int, destino: Path, n_boot: int, rng: np.random.Generator) -> list[Path]:
    gerados = []
    for dim in DIMENSOES:
        niveis = sorted(df[dim].unique(), key=str)
        if len(niveis) < 2:
            continue
        fig, eixos = plt.subplots(1, 4, figsize=(20, 4.2))
        for nivel in niveis:
            g = df[df[dim] == nivel]
            for eixo, coluna, titulo in [
                (eixos[0], "abertas", "Tramas abertas"),
                (eixos[1], "amarracao", "Razão de amarração"),
                (eixos[2], "fechadasAcum", "Fechadas por estabilidade (acum.)"),
                (eixos[3], "fundidasAcum", "Absorvidas por fusão (acum.)"),
            ]:
                comprimento = min(len(s) for s in g[coluna])
                matriz = np.array([s[:comprimento] for s in g[coluna]], dtype=float)
                media = matriz.mean(axis=0)
                lo, hi = bootstrap_ic(matriz, n_boot, rng)
                dias = np.arange(1, comprimento + 1)
                eixo.plot(dias, media, label=f"{nivel} (n={len(g)})")
                eixo.fill_between(dias, lo, hi, alpha=0.2)
                eixo.set_title(f"{titulo} (k={k})")
                eixo.set_xlabel("dia")
                terco = int(np.ceil(2 * comprimento / 3))
                eixo.axvline(terco, color="grey", linestyle=":", linewidth=1)
        eixos[0].legend(fontsize=7)
        fig.suptitle(f"Curvas médias por {dim}, IC 95% (bootstrap)")
        fig.tight_layout()
        caminho = destino / f"curvas_k{k}_{dim}.png"
        fig.savefig(caminho, dpi=130)
        plt.close(fig)
        gerados.append(caminho)
    return gerados


def resumo_modelos(campanha: Path) -> pd.DataFrame:
    linhas = []
    for resumo in sorted(campanha.glob("*/resumo.json")):
        r = json.loads(resumo.read_text(encoding="utf8"))
        c = json.loads((resumo.parent / "condicao.json").read_text(encoding="utf8"))
        linhas.append(
            {"modelo": rotulo_modelo(c), "tipo": "controle-tres-atos" if c["controle"] else "cidade-viva",
             "chamadas_com_esquema": r["estrutura"]["chamadasComEsquema"], "falhas_estrutura": r["estrutura"]["falhas"],
             "tentativas_medias": r["estrutura"]["tentativasMedias"], "erros_chamada": r["errosDeChamada"],
             "causadoPor_refs": r["causadoPor"]["referencias"], "causadoPor_descartadas": r["causadoPor"]["descartadas"],
             "tokens_entrada": r["tokens"]["entrada"], "tokens_saida": r["tokens"]["saida"], "custo_usd": r["custoUsd"]}
        )
    if not linhas:
        return pd.DataFrame()
    df = pd.DataFrame(linhas)
    g = df.groupby(["modelo", "tipo"]).sum(numeric_only=True).reset_index()
    g["sessoes"] = df.groupby(["modelo", "tipo"]).size().to_numpy()
    g["taxa_falha_estrutura"] = g["falhas_estrutura"] / g["chamadas_com_esquema"].where(g["chamadas_com_esquema"] > 0)
    g["taxa_descarte_causadoPor"] = g["causadoPor_descartadas"] / g["causadoPor_refs"].where(g["causadoPor_refs"] > 0)
    g["tentativas_medias"] = df.groupby(["modelo", "tipo"])["tentativas_medias"].mean().to_numpy()
    return g


def para_markdown(df: pd.DataFrame) -> str:
    if df.empty:
        return "(vazio)\n"
    colunas = list(df.columns)
    linhas = ["| " + " | ".join(colunas) + " |", "|" + "---|" * len(colunas)]
    for _, l in df.iterrows():
        celulas = []
        for c in colunas:
            v = l[c]
            celulas.append(f"{v:.4g}" if isinstance(v, (float, np.floating)) else str(v))
        linhas.append("| " + " | ".join(celulas) + " |")
    return "\n".join(linhas) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("campanha", type=Path)
    ap.add_argument("--ks", default="2,3,5")
    ap.add_argument("--bootstrap", type=int, default=10000)
    ap.add_argument("--semente", type=int, default=12345)
    args = ap.parse_args()

    rng = np.random.default_rng(args.semente)
    destino = args.campanha / "analise"
    destino.mkdir(parents=True, exist_ok=True)
    dados = carregar_reanalise(args.campanha)
    ks = [int(k) for k in args.ks.split(",")]

    relatorio = [f"# Análise de convergência: {args.campanha.name}\n"]
    todas = dados
    dados = todas[todas["variante"] == "completo"]
    for k in ks:
        df = dados[dados["k"] == k]
        if df.empty:
            print(f"sem dados para k={k}; rode a reanálise com esse k", file=sys.stderr)
            continue
        cond = por_condicao(df, k, args.bootstrap, rng)
        comp = comparacoes(df, k)
        cond.to_csv(destino / f"condicoes_k{k}.csv", index=False)
        comp.to_csv(destino / f"mann_whitney_k{k}.csv", index=False)
        figs = figuras(df, k, destino, min(args.bootstrap, 2000), rng)
        relatorio += [
            f"\n## k = {k}\n",
            "\n### Proporção de tramas fechadas por condição\n",
            para_markdown(cond.drop(columns=["k"])),
            "\n### Mann-Whitney U (bicaudal, Holm)\n",
            para_markdown(comp.drop(columns=["k"])) if not comp.empty else "(sem pares)\n",
            "\n### Figuras\n",
            "".join(f"- ![{f.name}]({f.name})\n" for f in figs),
        ]

    # variantes de detecção (services/grafo.ts): quanto cada filtro muda o resultado
    if todas["variante"].nunique() > 1:
        linhas = []
        for (variante, k, tipo, modelo), g in todas.groupby(["variante", "k", "tipo", "modelo"]):
            conv1 = [converge_emenda1(a, f, u) for a, f, u in zip(g["abertas"], g["fechadasAcum"], g["fundidasAcum"])]
            linhas.append({"variante": variante, "k": k, "tipo": tipo, "modelo": modelo, "sessoes": len(g),
                           "nascidas_media": g["nascidas"].mean(), "prop_fechadas_estab": g["propFechadasEstab"].mean(),
                           "prop_fundidas": g["propFundidas"].mean(), "convergem_emenda1": float(np.mean(conv1))})
        tab = pd.DataFrame(linhas)
        tab.to_csv(destino / "variantes.csv", index=False)
        resumo_v = tab.groupby(["variante", "k", "tipo"])[["nascidas_media", "prop_fechadas_estab", "prop_fundidas", "convergem_emenda1"]].mean().reset_index()
        relatorio += ["\n## Variantes de detecção (média por tipo)\n", para_markdown(resumo_v)]

    modelos = resumo_modelos(args.campanha)
    modelos.to_csv(destino / "modelos.csv", index=False)
    relatorio += ["\n## Estrutura, descartes e custo por modelo\n", para_markdown(modelos)]
    (destino / "relatorio.md").write_text("".join(relatorio), encoding="utf8")
    print(f"análise gravada em {destino}")


if __name__ == "__main__":
    main()
