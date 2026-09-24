"""Análise consolidada dos 5 métodos de validação com modelos Claude.

Uso:
    python analise/validacao.py experimentos/validacao

Lê:
  <raiz>/v1-cidade-viva-claude/*        método 1 (sessões da Cidade Viva)
  <raiz>/v2-controle-tres-atos-claude/* método 2 (controle de três atos)
  <raiz>/m3-reteste/reteste.jsonl       método 3 (teste-reteste)
  <raiz>/m4-juiz-causal/julgamentos.jsonl método 4 (juiz cego do autorrelato causal)
  <raiz>/m5-juiz-relatos/julgamentos.jsonl método 5 (fidelidade dos relatos)
  <raiz>/nulo/nulo.jsonl                modelo nulo (complemento dos métodos 1 e 2)

Grava em <raiz>/analise/: resultados.json (tudo que o relatório .docx usa),
figuras .png e LOG.md (log legível de todos os experimentos).
"""

from __future__ import annotations

import itertools
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
from scipy import stats

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

CURTO = {
    "claude-haiku-4-5-20251001": "Haiku 4.5",
    "claude-sonnet-4-6": "Sonnet 4.6",
    "claude-sonnet-5": "Sonnet 5",
    "claude-opus-4-8": "Opus 4.8",
    "claude-opus-5": "Opus 5",
    "claude-opus-5-5": "Opus 5.5",
}
ORDEM = list(CURTO)
CORES = {"Haiku 4.5": "#2a78b5", "Sonnet 4.6": "#e08a2c", "Sonnet 5": "#3a9a5b", "Opus 5": "#c0453a",
         "Opus 5.5": "#7b5ea7", "Opus 4.8": "#8c6d46"}


def curto(m: str) -> str:
    return CURTO.get(m, m)


def ordenar(ms):
    return sorted(ms, key=lambda m: ORDEM.index(m) if m in ORDEM else 99)


def ler_jsonl(p: Path) -> list[dict]:
    if not p.exists():
        return []
    return [json.loads(l) for l in p.read_text(encoding="utf8").splitlines() if l.strip()]


def media_dp(v) -> dict:
    v = np.asarray([x for x in v if x is not None], dtype=float)
    if len(v) == 0:
        return {"n": 0, "media": None, "dp": None}
    return {"n": int(len(v)), "media": float(v.mean()), "dp": float(v.std(ddof=1)) if len(v) > 1 else 0.0}


def ic_prop(k: int, n: int) -> list[float]:
    """IC de Wilson a 95%."""
    if n == 0:
        return [0.0, 0.0]
    z = 1.96
    p = k / n
    den = 1 + z * z / n
    centro = (p + z * z / (2 * n)) / den
    meio = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den
    return [float(centro - meio), float(centro + meio)]


def kappa(a: list, b: list) -> float | None:
    pares = [(x, y) for x, y in zip(a, b) if x is not None and y is not None]
    if not pares:
        return None
    cats = sorted({x for p in pares for x in p}, key=str)
    n = len(pares)
    po = sum(x == y for x, y in pares) / n
    pe = sum((sum(x == c for x, _ in pares) / n) * (sum(y == c for _, y in pares) / n) for c in cats)
    return float((po - pe) / (1 - pe)) if pe < 1 else 1.0


def auc(pos, neg) -> float | None:
    if not pos or not neg:
        return None
    u = stats.mannwhitneyu(pos, neg, alternative="two-sided").statistic
    return float(u / (len(pos) * len(neg)))


# ---------------------------------------------------------------- sessões

def ler_sessoes(raiz: Path) -> list[dict]:
    sessoes = []
    for resumo in sorted(raiz.glob("*/resumo.json")):
        d = resumo.parent
        c = json.loads((d / "condicao.json").read_text(encoding="utf8"))
        r = json.loads(resumo.read_text(encoding="utf8"))
        chamadas = ler_jsonl(d / "chamadas.jsonl")
        mestre = ler_jsonl(d / "mestre.jsonl")
        sessoes.append({"dir": d, "condicao": c, "resumo": r, "chamadas": chamadas, "mestre": mestre,
                        "metricas": ler_jsonl(d / "metricas.jsonl"), "narracoes": ler_jsonl(d / "narracoes.jsonl"),
                        "relatos": ler_jsonl(d / "relatos.jsonl"), "eventos": ler_jsonl(d / "eventos.jsonl")})
    return sessoes


def duracao_real_s(c: dict) -> float:
    """Duração da chamada sem esperas externas (ex.: reset do limite de uso):
    usa duration_ms informado pelo claude-cli quando existe."""
    b = c.get("bruto")
    brutos = b if isinstance(b, list) else [b]
    ms = [x.get("duration_ms") for x in brutos if isinstance(x, dict) and isinstance(x.get("duration_ms"), (int, float))]
    return (sum(ms) if ms else c.get("latenciaMs", 0)) / 1000


def resumo_sessao(s: dict) -> dict:
    c, r = s["condicao"], s["resumo"]
    ch = s["chamadas"]
    return {
        "sessao": s["dir"].name,
        "modelo": c["modelos"]["agentes"]["modelo"],
        "controle": c["controle"],
        "mundo": c["mundo"],
        "estadoTramas": c["estadoTramas"],
        "dias": r["dias"],
        "eventos": r["eventos"],
        "relatos": r["relatos"],
        "tramas": r["tramasSurgidas"],
        "fechadas": r["tramasFechadas"],
        "proporcaoFechadas": r["proporcaoTramasFechadas"],
        "razaoAmarracao": r["razaoAmarracaoFinal"],
        "fundadores": r["eventosFundadores"],
        "curvaAbertas": r["curvaTramasAbertas"],
        "curvaAmarracao": r["curvaRazaoAmarracao"],
        "refs": r["causadoPor"]["referencias"],
        "descartadas": r["causadoPor"]["descartadas"],
        "chamadas": len(ch),
        "falhasEstrutura": r["estrutura"]["falhas"],
        "chamadasComEsquema": r["estrutura"]["chamadasComEsquema"],
        "tentativasMedias": r["estrutura"]["tentativasMedias"],
        "erros": r["errosDeChamada"],
        "acoesDescartadas": r["acoesDescartadas"],
        "agentesSemAcao": r["agentesSemAcao"],
        "locaisInvalidos": r["locaisInvalidos"],
        "custoUsd": r["custoUsd"],
        "latenciaS": sum(duracao_real_s(x) for x in ch if not x.get("erro")),
        "tokensEntrada": r["tokens"]["entrada"],
        "tokensSaida": r["tokens"]["saida"],
        "modelosEfetivos": r["modelosEfetivos"],
        "narracoes": [n for n in s["narracoes"] if n.get("texto")],
        "atos": [m["ato"] for m in s["mestre"]],
    }


def converge(abertas: list, amarracao: list) -> bool:
    d = len(abertas)
    i = int(np.ceil(2 * d / 3)) - 1
    x = np.arange(len(abertas[i:]))
    if len(x) < 2:
        return False
    return np.polyfit(x, abertas[i:], 1)[0] <= 0 and np.polyfit(x, amarracao[i:], 1)[0] > 0


def analisar_sessoes(sessoes: list[dict], destino: Path) -> dict:
    linhas = [resumo_sessao(s) for s in sessoes]
    cv = [l for l in linhas if not l["controle"]]
    ct = [l for l in linhas if l["controle"]]
    modelos = ordenar({l["modelo"] for l in linhas})

    por_modelo = {}
    for m in modelos:
        grupo = {"cidade-viva": [l for l in cv if l["modelo"] == m], "controle": [l for l in ct if l["modelo"] == m]}
        por_modelo[m] = {}
        for tipo, g in grupo.items():
            if not g:
                continue
            ch = sum(l["chamadasComEsquema"] for l in g)
            fal = sum(l["falhasEstrutura"] for l in g)
            refs = sum(l["refs"] for l in g)
            por_modelo[m][tipo] = {
                "sessoes": len(g),
                "tramas": media_dp([l["tramas"] for l in g]),
                "proporcaoFechadas": media_dp([l["proporcaoFechadas"] for l in g]),
                "razaoAmarracao": media_dp([l["razaoAmarracao"] for l in g]),
                "eventos": media_dp([l["eventos"] for l in g]),
                "relatos": media_dp([l["relatos"] for l in g]),
                "taxaFalhaEstrutura": fal / ch if ch else None,
                "falhasEstrutura": fal,
                "chamadasComEsquema": ch,
                "taxaDescarte": (sum(l["descartadas"] for l in g) / refs) if refs else None,
                "acoesDescartadas": sum(l["acoesDescartadas"] for l in g),
                "locaisInvalidos": sum(l["locaisInvalidos"] for l in g),
                "custoUsd": sum(l["custoUsd"] for l in g),
                "latenciaPorDiaS": float(np.mean([l["latenciaS"] / max(1, l["dias"]) for l in g])),
                "convergem": sum(converge(l["curvaAbertas"], l["curvaAmarracao"]) for l in g),
            }

    # condição A vs B (todas as sessões da Cidade Viva)
    a = [l["proporcaoFechadas"] for l in cv if l["estadoTramas"] == "informa"]
    b = [l["proporcaoFechadas"] for l in cv if l["estadoTramas"] == "nao-informa"]
    ab = None
    if a and b:
        u, p = stats.mannwhitneyu(a, b, alternative="two-sided")
        ab = {"n_A": len(a), "n_B": len(b), "mediana_A": float(np.median(a)), "mediana_B": float(np.median(b)),
              "media_A": float(np.mean(a)), "media_B": float(np.mean(b)), "U": float(u), "p": float(p),
              "tramas_A": float(np.mean([l["tramas"] for l in cv if l["estadoTramas"] == "informa"])),
              "tramas_B": float(np.mean([l["tramas"] for l in cv if l["estadoTramas"] == "nao-informa"]))}

    # Cidade Viva vs controle
    cvc = None
    if cv and ct:
        x = [l["proporcaoFechadas"] for l in cv]
        y = [l["proporcaoFechadas"] for l in ct]
        u, p = stats.mannwhitneyu(x, y, alternative="two-sided")
        xr = [l["razaoAmarracao"] for l in cv]
        yr = [l["razaoAmarracao"] for l in ct]
        u2, p2 = stats.mannwhitneyu(xr, yr, alternative="two-sided")
        cvc = {"n_cv": len(x), "n_controle": len(y), "prop_cv": float(np.mean(x)), "prop_controle": float(np.mean(y)),
               "U_prop": float(u), "p_prop": float(p), "razao_cv": float(np.mean(xr)), "razao_controle": float(np.mean(yr)),
               "U_razao": float(u2), "p_razao": float(p2),
               "tramas_cv": float(np.mean([l["tramas"] for l in cv])), "tramas_controle": float(np.mean([l["tramas"] for l in ct]))}

    # modelos (Kruskal-Wallis na Cidade Viva)
    kw = None
    grupos = [[l["razaoAmarracao"] for l in cv if l["modelo"] == m] for m in modelos]
    grupos = [g for g in grupos if len(g) > 1]
    if len(grupos) >= 2:
        h, p = stats.kruskal(*grupos)
        kw = {"metrica": "razaoAmarracao", "H": float(h), "p": float(p)}

    # atos no controle
    atos = {}
    for l in ct:
        if l["atos"]:
            atos[l["sessao"]] = {"modelo": l["modelo"], "atos": l["atos"],
                                 "diaAto2": next((i + 1 for i, x in enumerate(l["atos"]) if x >= 2), None),
                                 "diaAto3": next((i + 1 for i, x in enumerate(l["atos"]) if x >= 3), None)}

    figs = []
    for tipo, grupo in [("cidade-viva", cv), ("controle", ct)]:
        if not grupo:
            continue
        fig, eixos = plt.subplots(1, 2, figsize=(11, 3.8))
        for m in modelos:
            g = [l for l in grupo if l["modelo"] == m]
            if not g:
                continue
            comp = min(len(l["curvaAbertas"]) for l in g)
            for eixo, chave in [(eixos[0], "curvaAbertas"), (eixos[1], "curvaAmarracao")]:
                mat = np.array([l[chave][:comp] for l in g], dtype=float)
                eixo.plot(range(1, comp + 1), mat.mean(axis=0), label=f"{curto(m)} (n={len(g)})", color=CORES.get(curto(m)))
        eixos[0].set_title("Tramas abertas (média por dia)")
        eixos[1].set_title("Razão de amarração (média por dia)")
        for e in eixos:
            e.set_xlabel("dia")
            e.grid(alpha=0.3)
        eixos[0].legend(fontsize=8)
        fig.suptitle("Cidade Viva" if tipo == "cidade-viva" else "Controle de três atos")
        fig.tight_layout()
        caminho = destino / f"m{'1' if tipo == 'cidade-viva' else '2'}_curvas.png"
        fig.savefig(caminho, dpi=140)
        plt.close(fig)
        figs.append(caminho.name)

    if cv and ct:
        fig, eixos = plt.subplots(1, 3, figsize=(12, 3.6))
        for e, chave, titulo in [(eixos[0], "tramas", "Tramas surgidas"), (eixos[1], "proporcaoFechadas", "Proporção fechadas"),
                                 (eixos[2], "razaoAmarracao", "Razão de amarração")]:
            x = np.arange(len(modelos))
            for k, (tipo, grupo, cor) in enumerate([("Cidade Viva", cv, "#3a7ca5"), ("Três atos", ct, "#d1495b")]):
                vals = [np.mean([l[chave] for l in grupo if l["modelo"] == m]) if any(l["modelo"] == m for l in grupo) else 0 for m in modelos]
                e.bar(x + (k - 0.5) * 0.38, vals, 0.38, label=tipo, color=cor)
            e.set_xticks(x, [curto(m) for m in modelos], rotation=20, fontsize=8)
            e.set_title(titulo)
            e.grid(axis="y", alpha=0.3)
        eixos[0].legend(fontsize=8)
        fig.tight_layout()
        fig.savefig(destino / "m1m2_comparacao.png", dpi=140)
        plt.close(fig)
        figs.append("m1m2_comparacao.png")

    amostras = []
    for l in sorted(cv + ct, key=lambda x: (x["controle"], ORDEM.index(x["modelo"]) if x["modelo"] in ORDEM else 9)):
        if l["narracoes"]:
            n = l["narracoes"][0]
            amostras.append({"sessao": l["sessao"], "modelo": l["modelo"], "controle": l["controle"],
                             "tramaId": n["tramaId"], "dia": n["dia"], "eventos": len(n["cadeia"]), "texto": n["texto"]})

    return {"sessoes": [{k: v for k, v in l.items() if k not in ("narracoes",)} for l in linhas],
            "porModelo": por_modelo, "AvsB": ab, "cidadeVivaVsControle": cvc, "kruskalModelos": kw,
            "atosControle": atos, "figuras": figs, "narracoesAmostra": amostras}


# ---------------------------------------------------------------- método 3

def jaccard(a: set, b: set) -> float | None:
    if not a and not b:
        return None
    return len(a & b) / len(a | b)


def palavras(t: str) -> set:
    return {w for w in "".join(ch.lower() if ch.isalnum() else " " for ch in t).split() if len(w) > 3}


def analisar_reteste(linhas: list[dict], destino: Path) -> dict | None:
    linhas = [l for l in linhas if "modelo" in l]
    if not linhas:
        return None
    modelos = ordenar({l["modelo"] for l in linhas})
    out = {}
    for m in modelos:
        g = [l for l in linhas if l["modelo"] == m]
        val = [l for l in g if l["valido"]]
        refs = sum(l["referencias"] for l in val)
        # estabilidade entre repetições do mesmo estado: por agente
        jac_causal, jac_texto, jac_local = [], [], []
        for snap in {l["snapshot"] for l in val}:
            reps = [l for l in val if l["snapshot"] == snap]
            for r1, r2 in itertools.combinations(reps, 2):
                a1 = {a["agenteId"]: a for a in r1["acoes"]}
                a2 = {a["agenteId"]: a for a in r2["acoes"]}
                for ag in set(a1) & set(a2):
                    j = jaccard(set(a1[ag]["causadoPor"]), set(a2[ag]["causadoPor"]))
                    if j is not None:
                        jac_causal.append(j)
                    jt = jaccard(palavras(a1[ag]["acao"]), palavras(a2[ag]["acao"]))
                    if jt is not None:
                        jac_texto.append(jt)
                    jac_local.append(1.0 if a1[ag]["local"] == a2[ag]["local"] else 0.0)
        # variância da tensão por agente entre repetições
        dps = []
        for snap in {l["snapshot"] for l in val}:
            reps = [l for l in val if l["snapshot"] == snap]
            por_ag = defaultdict(list)
            for r in reps:
                for a in r["acoes"]:
                    por_ag[a["agenteId"]].append(a["tensao"])
            dps += [float(np.std(v, ddof=1)) for v in por_ag.values() if len(v) > 1]
        custos = [l["chamada"]["custoUsd"] for l in g if l.get("chamada", {}).get("custoUsd") is not None]
        lat = [l["chamada"]["latenciaMs"] / 1000 for l in g if l.get("chamada")]
        out[m] = {
            "chamadas": len(g),
            "validas": len(val),
            "taxaValidade": len(val) / len(g),
            "icValidade": ic_prop(len(val), len(g)),
            "tentativasMedias": float(np.mean([l["chamada"]["tentativas"] for l in g if l.get("chamada")])),
            "cobertura": media_dp([l["cobertura"] for l in val]),
            "idsInvalidos": int(sum(l["idsInvalidos"] for l in val)),
            "locaisInvalidos": int(sum(l["locaisInvalidos"] for l in val)),
            "referencias": int(refs),
            "taxaReferenciasValidas": (sum(l["referenciasValidas"] for l in val) / refs) if refs else None,
            "ligacoesPorAcao": media_dp([l["ligacoesPorAcao"] for l in val]),
            "tensao": media_dp([l["tensaoMedia"] for l in val]),
            "dpTensaoEntreRepeticoes": media_dp(dps),
            "jaccardCausal": media_dp(jac_causal),
            "jaccardTexto": media_dp(jac_texto),
            "mesmoLocal": media_dp(jac_local),
            "custoMedioUsd": float(np.mean(custos)) if custos else None,
            "custoTotalUsd": float(np.sum(custos)) if custos else None,
            # mediana: algumas chamadas incluem a espera pelo reset do limite de uso
            "latenciaMediaS": float(np.median(lat)) if lat else None,
        }
    # figura
    fig, eixos = plt.subplots(1, 3, figsize=(12, 3.6))
    x = np.arange(len(modelos))
    cores = [CORES.get(curto(m), "#777") for m in modelos]
    eixos[0].bar(x, [out[m]["ligacoesPorAcao"]["media"] or 0 for m in modelos], color=cores,
                 yerr=[out[m]["ligacoesPorAcao"]["dp"] or 0 for m in modelos], capsize=3)
    eixos[0].set_title("Ligações causais por ação")
    eixos[1].bar(x, [out[m]["jaccardCausal"]["media"] or 0 for m in modelos], color=cores)
    eixos[1].set_title("Estabilidade das ligações (Jaccard)")
    eixos[1].set_ylim(0, 1)
    eixos[2].bar(x, [out[m]["jaccardTexto"]["media"] or 0 for m in modelos], color=cores)
    eixos[2].set_title("Sobreposição de vocabulário (Jaccard)")
    eixos[2].set_ylim(0, 1)
    for e in eixos:
        e.set_xticks(x, [curto(m) for m in modelos], rotation=20, fontsize=8)
        e.grid(axis="y", alpha=0.3)
    fig.tight_layout()
    fig.savefig(destino / "m3_reteste.png", dpi=140)
    plt.close(fig)
    return {"porModelo": out, "snapshots": sorted({l["snapshot"] for l in linhas}),
            "repeticoes": int(max(l["rep"] for l in linhas)), "figuras": ["m3_reteste.png"]}


# ---------------------------------------------------------------- métodos 4 e 5

def julgamentos(linhas: list[dict]) -> tuple[list[dict], list[dict]]:
    chamadas, itens = [], []
    for l in linhas:
        if "julgamentos" not in l:
            chamadas.append({"id": l["id"], "erro": l.get("erro")})
            continue
        chamadas.append({"id": l["id"], "juiz": l["juiz"], **{k: l["chamada"].get(k) for k in ("tentativas", "falhaEstrutura", "custoUsd", "latenciaMs")}})
        for j in l["julgamentos"]:
            itens.append({**j, "juiz": l["juiz"]})
    return chamadas, itens


def analisar_causal(linhas: list[dict], destino: Path) -> dict | None:
    chamadas, itens = julgamentos(linhas)
    if not itens:
        return None
    juizes = ordenar({i["juiz"] for i in itens})
    geradores = sorted({i["gerador"] for i in itens})
    por_juiz = {}
    for j in juizes:
        g = [i for i in itens if i["juiz"] == j and i["avaliacao"]]
        reais = [i["avaliacao"]["nota"] for i in g if i["tipo"] == "real"]
        dist = [i["avaliacao"]["nota"] for i in g if i["tipo"] == "distrator"]
        pr = [i["avaliacao"]["plausivel"] for i in g if i["tipo"] == "real"]
        pd = [i["avaliacao"]["plausivel"] for i in g if i["tipo"] == "distrator"]
        por_ger = {}
        for ger in geradores:
            gr = [i for i in g if i["gerador"] == ger]
            r = [i["avaliacao"]["nota"] for i in gr if i["tipo"] == "real"]
            d = [i["avaliacao"]["nota"] for i in gr if i["tipo"] == "distrator"]
            rp = [i["avaliacao"]["plausivel"] for i in gr if i["tipo"] == "real"]
            por_ger[ger] = {"reais": len(r), "distratores": len(d), "notaReais": media_dp(r), "notaDistratores": media_dp(d),
                            "plausivelReais": (sum(rp) / len(rp)) if rp else None,
                            "icPlausivelReais": ic_prop(sum(rp), len(rp)), "auc": auc(r, d)}
        u_p = stats.mannwhitneyu(reais, dist, alternative="greater").pvalue if reais and dist else None
        por_juiz[j] = {"julgados": len(g), "reais": len(reais), "distratores": len(dist),
                       "notaReais": media_dp(reais), "notaDistratores": media_dp(dist),
                       "plausivelReais": sum(pr) / len(pr) if pr else None, "icPlausivelReais": ic_prop(sum(pr), len(pr)),
                       "plausivelDistratores": sum(pd) / len(pd) if pd else None, "icPlausivelDistratores": ic_prop(sum(pd), len(pd)),
                       "auc": auc(reais, dist), "p_reais_maior": float(u_p) if u_p is not None else None,
                       "porGerador": por_ger, "semAvaliacao": sum(1 for i in itens if i["juiz"] == j and not i["avaliacao"])}
    concord = None
    if len(juizes) >= 2:
        a = {i["item"]: i["avaliacao"] for i in itens if i["juiz"] == juizes[0] and i["avaliacao"]}
        b = {i["item"]: i["avaliacao"] for i in itens if i["juiz"] == juizes[1] and i["avaliacao"]}
        comuns = sorted(set(a) & set(b))
        rho = stats.spearmanr([a[k]["nota"] for k in comuns], [b[k]["nota"] for k in comuns]).statistic if len(comuns) > 2 else None
        concord = {"juizes": juizes[:2], "itens": len(comuns),
                   "kappaPlausivel": kappa([a[k]["plausivel"] for k in comuns], [b[k]["plausivel"] for k in comuns]),
                   "concordanciaPlausivel": float(np.mean([a[k]["plausivel"] == b[k]["plausivel"] for k in comuns])) if comuns else None,
                   "spearmanNotas": float(rho) if rho is not None else None}
    # figura: distribuição das notas reais x distratores por juiz
    fig, eixos = plt.subplots(1, len(juizes), figsize=(5 * len(juizes), 3.4), squeeze=False)
    for e, j in zip(eixos[0], juizes):
        g = [i for i in itens if i["juiz"] == j and i["avaliacao"]]
        for k, (tipo, cor) in enumerate([("real", "#3a7ca5"), ("distrator", "#d1495b")]):
            notas = [i["avaliacao"]["nota"] for i in g if i["tipo"] == tipo]
            cont = [notas.count(n) / max(1, len(notas)) for n in range(1, 6)]
            e.bar(np.arange(1, 6) + (k - 0.5) * 0.38, cont, 0.38, label=f"{tipo} (n={len(notas)})", color=cor)
        e.set_title(f"Juiz {curto(j)}: AUC {por_juiz[j]['auc']:.2f}" if por_juiz[j]["auc"] is not None else curto(j))
        e.set_xlabel("nota de plausibilidade causal")
        e.legend(fontsize=8)
        e.grid(axis="y", alpha=0.3)
    fig.tight_layout()
    fig.savefig(destino / "m4_juiz_causal.png", dpi=140)
    plt.close(fig)
    return {"chamadas": len(chamadas), "falhasChamada": sum(1 for c in chamadas if c.get("erro") or c.get("falhaEstrutura")),
            "itensJulgados": len(itens), "porJuiz": por_juiz, "concordancia": concord,
            "custoUsd": float(sum(c.get("custoUsd") or 0 for c in chamadas)), "figuras": ["m4_juiz_causal.png"]}


CATS = ["fiel", "omissao", "distorcao", "contradicao", "invencao"]


def analisar_relatos(linhas: list[dict], destino: Path) -> dict | None:
    chamadas, itens = julgamentos(linhas)
    if not itens:
        return None
    juizes = ordenar({i["juiz"] for i in itens})
    geradores = sorted({i["gerador"] for i in itens})
    por_juiz = {}
    for j in juizes:
        g = [i for i in itens if i["juiz"] == j and i["avaliacao"]]
        por_ger = {}
        for ger in geradores:
            gr = [i["avaliacao"] for i in g if i["gerador"] == ger]
            c = Counter(a["categoria"] for a in gr)
            por_ger[ger] = {"n": len(gr), "categorias": {k: c.get(k, 0) / max(1, len(gr)) for k in CATS},
                            "fidelidade": media_dp([a["fidelidade"] for a in gr]),
                            "naoFiel": (len(gr) - c.get("fiel", 0)) / max(1, len(gr))}
        c = Counter(i["avaliacao"]["categoria"] for i in g)
        por_juiz[j] = {"julgados": len(g), "categorias": {k: c.get(k, 0) / max(1, len(g)) for k in CATS},
                       "fidelidade": media_dp([i["avaliacao"]["fidelidade"] for i in g]), "porGerador": por_ger,
                       "semAvaliacao": sum(1 for i in itens if i["juiz"] == j and not i["avaliacao"])}
    concord = None
    if len(juizes) >= 2:
        a = {i["item"]: i["avaliacao"] for i in itens if i["juiz"] == juizes[0] and i["avaliacao"]}
        b = {i["item"]: i["avaliacao"] for i in itens if i["juiz"] == juizes[1] and i["avaliacao"]}
        comuns = sorted(set(a) & set(b))
        fiel_a = [a[k]["categoria"] == "fiel" for k in comuns]
        fiel_b = [b[k]["categoria"] == "fiel" for k in comuns]
        rho = stats.spearmanr([a[k]["fidelidade"] for k in comuns], [b[k]["fidelidade"] for k in comuns]).statistic if len(comuns) > 2 else None
        concord = {"juizes": juizes[:2], "itens": len(comuns),
                   "kappaCategoria": kappa([a[k]["categoria"] for k in comuns], [b[k]["categoria"] for k in comuns]),
                   "kappaFielVsNao": kappa(fiel_a, fiel_b),
                   "concordanciaCategoria": float(np.mean([a[k]["categoria"] == b[k]["categoria"] for k in comuns])) if comuns else None,
                   "spearmanFidelidade": float(rho) if rho is not None else None}
    fig, eixos = plt.subplots(1, len(juizes), figsize=(5.5 * len(juizes), 3.6), squeeze=False)
    cores = ["#3a9a5b", "#e0b12c", "#e08a2c", "#c0453a", "#7b5ea7"]
    for e, j in zip(eixos[0], juizes):
        base = np.zeros(len(geradores))
        for cat, cor in zip(CATS, cores):
            vals = np.array([por_juiz[j]["porGerador"][g]["categorias"][cat] for g in geradores])
            e.bar(range(len(geradores)), vals, bottom=base, label=cat, color=cor)
            base += vals
        e.set_xticks(range(len(geradores)), [curto(g.replace(" [controle]", "")) for g in geradores], rotation=20, fontsize=8)
        e.set_title(f"Juiz {curto(j)}")
        e.set_ylim(0, 1)
    eixos[0][-1].legend(fontsize=7, loc="upper right", bbox_to_anchor=(1.32, 1))
    fig.tight_layout()
    fig.savefig(destino / "m5_relatos.png", dpi=140)
    plt.close(fig)
    return {"chamadas": len(chamadas), "falhasChamada": sum(1 for c in chamadas if c.get("erro") or c.get("falhaEstrutura")),
            "itensJulgados": len(itens), "porJuiz": por_juiz, "concordancia": concord,
            "custoUsd": float(sum(c.get("custoUsd") or 0 for c in chamadas)), "figuras": ["m5_relatos.png"]}


# ---------------------------------------------------------------- modelo nulo

def analisar_nulo(linhas: list[dict]) -> dict | None:
    if not linhas:
        return None
    out = []
    for l in linhas:
        m = l["metricas"]
        out.append({"sessao": l["sessao"], "gerador": l["gerador"], "controle": l["controle"],
                    **{f"{k}_obs": m[k]["observado"] for k in m}, **{f"{k}_nulo": m[k]["mediaNula"] for k in m},
                    **{f"{k}_p": m[k]["pBilateral"] for k in m}})
    def frac(chave, cond):
        g = [o for o in out if cond(o)]
        return {"n": len(g), "significativas": sum(o[f"{chave}_p"] < 0.05 for o in g),
                "acimaDoNulo": sum(o[f"{chave}_obs"] > o[f"{chave}_nulo"] for o in g),
                "obsMedio": float(np.mean([o[f"{chave}_obs"] for o in g])) if g else None,
                "nuloMedio": float(np.mean([o[f"{chave}_nulo"] for o in g])) if g else None}
    resumo = {}
    for chave in ["tramas", "proporcaoFechadas", "fracaoKernel", "abertasMediaUltimoTerco"]:
        resumo[chave] = {"cidadeViva": frac(chave, lambda o: not o["controle"]), "controle": frac(chave, lambda o: o["controle"])}
    return {"sessoes": out, "resumo": resumo, "n": linhas[0]["n"]}


# ---------------------------------------------------------------- contagem e log

def contar_chamadas(sessoes, m3, m4, m5) -> dict:
    por_metodo = {
        "M1 Cidade Viva": sum(1 for s in sessoes if not s["condicao"]["controle"] for c in s["chamadas"] if not c.get("erro")),
        "M2 Controle três atos": sum(1 for s in sessoes if s["condicao"]["controle"] for c in s["chamadas"] if not c.get("erro")),
        "M3 Teste-reteste": len([l for l in m3 if "chamada" in l]),
        "M4 Juiz causal": len([l for l in m4 if "chamada" in l]),
        "M5 Juiz de relatos": len([l for l in m5 if "chamada" in l]),
    }
    por_modelo = Counter()
    custo = Counter()
    for s in sessoes:
        for c in s["chamadas"]:
            if c.get("erro"):
                continue
            por_modelo[c["modeloSolicitado"]] += 1
            custo[c["modeloSolicitado"]] += c.get("custoUsd") or 0
    for l in m3:
        if "chamada" in l:
            por_modelo[l["chamada"]["modeloSolicitado"]] += 1
            custo[l["chamada"]["modeloSolicitado"]] += l["chamada"].get("custoUsd") or 0
    for l in m4 + m5:
        if "chamada" in l:
            por_modelo[l["chamada"]["modeloSolicitado"]] += 1
            custo[l["chamada"]["modeloSolicitado"]] += l["chamada"].get("custoUsd") or 0
    itens = sum(len(l.get("julgamentos", [])) for l in m4 + m5)
    return {"porMetodo": por_metodo, "total": sum(por_metodo.values()), "porModelo": dict(por_modelo),
            "custoPorModelo": {k: float(v) for k, v in custo.items()}, "custoTotal": float(sum(custo.values())),
            "itensJulgados": itens}


def fmt(x, casas=2):
    if x is None:
        return "–"
    if isinstance(x, dict) and "media" in x:
        return "–" if x["media"] is None else f"{x['media']:.{casas}f} ± {x['dp']:.{casas}f}"
    if isinstance(x, float):
        return f"{x:.{casas}f}"
    return str(x)


def escrever_log(res: dict, destino: Path) -> None:
    L = ["# Log dos experimentos de validação com modelos Claude\n",
         f"Chamadas ao Claude: **{res['contagem']['total']}**; itens julgados pelos juízes: {res['contagem']['itensJulgados']}; "
         f"custo total informado pelo CLI: US$ {res['contagem']['custoTotal']:.2f}.\n",
         "| método | chamadas |", "|---|---|"]
    L += [f"| {k} | {v} |" for k, v in res["contagem"]["porMetodo"].items()]
    L += ["", "| modelo | chamadas | custo (US$) |", "|---|---|---|"]
    L += [f"| {curto(m)} | {n} | {res['contagem']['custoPorModelo'].get(m, 0):.2f} |" for m, n in sorted(res["contagem"]["porModelo"].items())]
    s = res.get("sessoes")
    if s:
        L += ["\n## Métodos 1 e 2: sessões\n", "| sessão | modelo | tipo | cond. | eventos | relatos | tramas | fechadas | razão | falhas | custo |", "|---|---|---|---|---|---|---|---|---|---|---|"]
        for x in s["sessoes"]:
            L.append(f"| {x['sessao']} | {curto(x['modelo'])} | {'três atos' if x['controle'] else 'Cidade Viva'} | {x['estadoTramas']} | {x['eventos']} | {x['relatos']} | {x['tramas']} | {x['fechadas']} | {x['razaoAmarracao']:.2f} | {x['falhasEstrutura']}/{x['chamadasComEsquema']} | {x['custoUsd']:.2f} |")
        L += ["", f"A vs B: `{json.dumps(s['AvsB'], ensure_ascii=False)}`", "",
              f"Cidade Viva vs controle: `{json.dumps(s['cidadeVivaVsControle'], ensure_ascii=False)}`", ""]
    if res.get("nulo"):
        L += ["## Modelo nulo\n", f"`{json.dumps(res['nulo']['resumo'], ensure_ascii=False)}`", ""]
    if res.get("reteste"):
        L += ["## Método 3: teste-reteste\n", "| modelo | válidas | cobertura | refs válidas | ligações/ação | Jaccard causal | Jaccard texto | mesmo local | custo médio | latência |", "|---|---|---|---|---|---|---|---|---|---|"]
        for m, x in res["reteste"]["porModelo"].items():
            L.append(f"| {curto(m)} | {x['validas']}/{x['chamadas']} | {fmt(x['cobertura'])} | {fmt(x['taxaReferenciasValidas'])} | {fmt(x['ligacoesPorAcao'])} | {fmt(x['jaccardCausal'])} | {fmt(x['jaccardTexto'])} | {fmt(x['mesmoLocal'])} | {fmt(x['custoMedioUsd'], 3)} | {fmt(x['latenciaMediaS'], 1)} s |")
    for chave, titulo in [("causal", "Método 4: juiz cego do autorrelato causal"), ("relatos", "Método 5: fidelidade dos relatos")]:
        if res.get(chave):
            L += [f"\n## {titulo}\n", f"```json\n{json.dumps({k: v for k, v in res[chave].items() if k != 'figuras'}, ensure_ascii=False, indent=1)[:6000]}\n```"]
    (destino / "LOG.md").write_text("\n".join(L) + "\n", encoding="utf8")


def main() -> None:
    raiz = Path(sys.argv[1] if len(sys.argv) > 1 else "experimentos/validacao")
    destino = raiz / "analise"
    destino.mkdir(parents=True, exist_ok=True)
    sessoes = ler_sessoes(raiz / "v1-cidade-viva-claude") + ler_sessoes(raiz / "v2-controle-tres-atos-claude")
    m3 = ler_jsonl(raiz / "m3-reteste" / "reteste.jsonl")
    m4 = ler_jsonl(raiz / "m4-juiz-causal" / "julgamentos.jsonl")
    m5 = ler_jsonl(raiz / "m5-juiz-relatos" / "julgamentos.jsonl")
    res = {
        "contagem": contar_chamadas(sessoes, m3, m4, m5),
        "sessoes": analisar_sessoes(sessoes, destino) if sessoes else None,
        "reteste": analisar_reteste(m3, destino),
        "causal": analisar_causal(m4, destino),
        "relatos": analisar_relatos(m5, destino),
        "nulo": analisar_nulo(ler_jsonl(raiz / "nulo" / "nulo.jsonl")),
    }
    (destino / "resultados.json").write_text(json.dumps(res, ensure_ascii=False, indent=1, default=str), encoding="utf8")
    escrever_log(res, destino)
    print(f"análise gravada em {destino} ({res['contagem']['total']} chamadas)")


if __name__ == "__main__":
    main()
