"""Análise da rodada de grafos: fusão × fechamento, variantes de detecção,
necessidade causal e ligações tipadas.

Uso:
    python analise/grafos.py experimentos/validacao

Entradas (todas geradas pelos scripts do repositório):
  <raiz>/emenda1/condicoes_k3.csv, variantes.csv, reanalise.jsonl   (reanálise da emenda 1)
  <raiz>/v1-cidade-viva-claude/*        método 1 (sem ligações tipadas)
  <raiz>/v3-ligacoes-tipadas-claude/*   método 7 (com ligações tipadas, pareado com o 1)
  <raiz>/m6-necessidade/                necessidade causal (sessões sem tipos)
  <raiz>/m6b-necessidade-tipadas/       necessidade × tipo e força

Saída: <raiz>/analise-grafos/resultados.json e figuras .png.
"""

from __future__ import annotations

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

RAIZ_REPO = Path(__file__).resolve().parent.parent
CURTO = {"claude-haiku-4-5-20251001": "Haiku 4.5", "claude-sonnet-4-6": "Sonnet 4.6", "claude-sonnet-5": "Sonnet 5",
         "claude-opus-5": "Opus 5", "claude-opus-5-5": "Opus 5.5", "claude-opus-4-8": "Opus 4.8"}
ORDEM = list(CURTO)
CORES = {"Haiku 4.5": "#2a78b5", "Sonnet 4.6": "#e08a2c", "Sonnet 5": "#3a9a5b", "Opus 5": "#c0453a"}


def curto(m: str) -> str:
    return CURTO.get(m, m)


def ler_jsonl(p: Path) -> list[dict]:
    return [json.loads(l) for l in p.read_text(encoding="utf8").splitlines() if l.strip()] if p.exists() else []


def metricas_sessoes(dirs: list[Path]) -> pd.DataFrame:
    """Métricas de grafo e linhagem por sessão, calculadas pelo próprio TypeScript
    (services/grafo.ts e services/linhagem.ts) para não reimplementar nada."""
    script = r"""
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { reanalisar } from './core/experimento/reanalise';
import { resumirLinhagem } from './services/linhagem';
import { metricasDoGrafo, VARIANTES_DETECCAO } from './services/grafo';
const saida = [];
for (const dir of process.argv.slice(2)) {
  for (const s of readdirSync(dir).sort()) {
    const p = join(dir, s);
    if (!existsSync(join(p, 'resumo.json')) || !existsSync(join(p, 'condicao.json'))) continue;
    const c = JSON.parse(readFileSync(join(p, 'condicao.json'), 'utf8'));
    const ev = readFileSync(join(p, 'eventos.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const k = c.limiarEstabilidade ?? 3;
    const completo = resumirLinhagem(reanalisar(ev, c.dias, k).linhagem);
    const semPontes = resumirLinhagem(reanalisar(ev, c.dias, k, VARIANTES_DETECCAO['sem-pontes-de-fusao']).linhagem);
    const fortes = resumirLinhagem(reanalisar(ev, c.dias, k, VARIANTES_DETECCAO['fortes']).linhagem);
    const g = metricasDoGrafo(ev);
    saida.push({ sessao: s, pasta: dir, modelo: c.modelos.agentes.modelo, mundo: c.mundo, controle: c.controle,
      estadoTramas: c.estadoTramas, tipadas: !!c.ligacoesTipadas, semente: c.semente, eventos: ev.length,
      grafo: g, completo, semPontes, fortes });
  }
}
console.log(JSON.stringify(saida));
"""
    arq = RAIZ_REPO / ".tmp-metricas-grafos.ts"
    arq.write_text(script, encoding="utf8")
    try:
        out = subprocess.run(["npx", "tsx", str(arq), *map(str, dirs)], cwd=RAIZ_REPO, check=True, capture_output=True, text=True).stdout
    finally:
        arq.unlink(missing_ok=True)
    linhas = []
    for r in json.loads(out):
        g, c, sp, f = r["grafo"], r["completo"], r["semPontes"], r["fortes"]
        linhas.append({
            "sessao": r["sessao"], "modelo": r["modelo"], "mundo": r["mundo"], "controle": r["controle"],
            "estadoTramas": r["estadoTramas"], "tipadas": r["tipadas"], "semente": r["semente"], "eventos": r["eventos"],
            "ligacoes": g["ligacoes"], "ligPorEvento": g["ligacoes"] / max(1, g["eventos"]), "pontes": g["pontes"],
            "pontesFusao": g["pontesDeFusao"], "articulacoes": g["articulacoes"], "porTipo": g["porTipo"],
            "forcaMedia": g["forcaMedia"],
            "nascidas": c["nascidas"], "fechadas": c["fechadasPorEstabilidade"], "fundidas": c["fundidasAntesDeFechar"],
            "propFechadas": c["proporcaoFechadasPorEstabilidade"], "propFundidas": c["proporcaoFundidas"],
            "propFechadasSemPontes": sp["proporcaoFechadasPorEstabilidade"], "propFundidasSemPontes": sp["proporcaoFundidas"],
            "propFechadasFortes": f["proporcaoFechadasPorEstabilidade"], "propFundidasFortes": f["proporcaoFundidas"],
            "nascidasFortes": f["nascidas"],
        })
    return pd.DataFrame(linhas)


def media(v):
    v = [x for x in v if x is not None and not (isinstance(x, float) and np.isnan(x))]
    return float(np.mean(v)) if v else None


def main() -> None:
    raiz = Path(sys.argv[1] if len(sys.argv) > 1 else "experimentos/validacao")
    destino = raiz / "analise-grafos"
    destino.mkdir(parents=True, exist_ok=True)
    res: dict = {}

    # 1. emenda 1 e variantes (reanálise das 24 sessões)
    cond = pd.read_csv(raiz / "emenda1" / "condicoes_k3.csv")
    cond["tipoCurto"] = cond["tipo"].map({"cidade-viva": "Cidade Viva", "controle-tres-atos": "três atos"})
    res["emenda1"] = {
        "porTipo": cond.groupby("tipoCurto")[["tramas_nascidas_media", "prop_fechadas_estab_media", "prop_fundidas_media",
                                              "sessoes_que_convergem_emenda1", "prop_fechadas_v01_media", "sessoes_que_convergem_v01"]].mean().round(3).to_dict("index"),
        "porModelo": cond[cond["tipo"] == "cidade-viva"].assign(m=lambda d: d["modelo"].str.split("/").str[-1].map(curto))
        .groupby("m")[["tramas_nascidas_media", "prop_fechadas_estab_media", "prop_fundidas_media", "sessoes_que_convergem_emenda1"]].mean().round(3).to_dict("index"),
    }
    var = pd.read_csv(raiz / "emenda1" / "variantes.csv")
    var = var[var["k"] == 3]
    res["variantes"] = var.groupby(["variante", "tipo"])[["nascidas_media", "prop_fechadas_estab", "prop_fundidas", "convergem_emenda1"]].mean().round(3).reset_index().to_dict("records")

    # 2. métricas de grafo das sessões (métodos 1, 2 e 7)
    dirs = [raiz / "v1-cidade-viva-claude", raiz / "v2-controle-tres-atos-claude", raiz / "v3-ligacoes-tipadas-claude"]
    df = metricas_sessoes([d for d in dirs if d.exists()])
    df.to_csv(destino / "sessoes.csv", index=False)
    cv = df[~df["controle"]]
    res["grafoPorGrupo"] = (df.assign(grupo=np.where(df["controle"], "três atos", np.where(df["tipadas"], "Cidade Viva tipada", "Cidade Viva")))
                            .groupby("grupo")[["ligPorEvento", "pontes", "pontesFusao", "articulacoes", "nascidas", "propFechadas", "propFundidas", "propFechadasSemPontes"]]
                            .mean().round(3).to_dict("index"))

    # 3. método 7: pareado com o método 1 (mesmo modelo, mundo, condição A e semente)
    base = cv[(~cv["tipadas"]) & (cv["estadoTramas"] == "informa")].set_index(["modelo", "mundo"])
    tip = cv[cv["tipadas"]].set_index(["modelo", "mundo"])
    pares = base.join(tip, lsuffix="_sem", rsuffix="_com", how="inner").reset_index()
    if len(pares):
        comp = {}
        for m in ["ligPorEvento", "nascidas", "propFechadas", "propFundidas", "pontesFusao"]:
            a, b = pares[f"{m}_sem"].to_numpy(float), pares[f"{m}_com"].to_numpy(float)
            try:
                w = stats.wilcoxon(a, b) if np.any(a != b) else None
            except ValueError:
                w = None
            comp[m] = {"sem": float(a.mean()), "com": float(b.mean()), "difMedia": float((b - a).mean()),
                       "p_wilcoxon": float(w.pvalue) if w is not None else None}
        tipos = {}
        for _, r in tip.reset_index().iterrows():
            for t, n in (r["porTipo"] or {}).items():
                tipos[t] = tipos.get(t, 0) + n
        total = sum(tipos.values()) or 1
        res["tipadas"] = {
            "pares": int(len(pares)), "comparacao": comp,
            "porModelo": pares.assign(m=pares["modelo"].map(curto)).groupby("m")[["ligPorEvento_sem", "ligPorEvento_com", "propFechadas_sem", "propFechadas_com", "propFundidas_sem", "propFundidas_com"]].mean().round(3).to_dict("index"),
            "distribuicaoTipos": {t: n / total for t, n in sorted(tipos.items())},
            "forcaMedia": media(tip["forcaMedia"].tolist()),
            "variantes": {"completo": media(tip["propFechadas"].tolist()), "fortes": media(tip["propFechadasFortes"].tolist()),
                          "semPontes": media(tip["propFechadasSemPontes"].tolist()),
                          "fundidasCompleto": media(tip["propFundidas"].tolist()), "fundidasFortes": media(tip["propFundidasFortes"].tolist()),
                          "nascidasCompleto": media(tip["nascidas"].tolist()), "nascidasFortes": media(tip["nascidasFortes"].tolist())},
            "porModeloTipos": {curto(m): _somar_tipos(g["porTipo"]) for m, g in tip.reset_index().groupby("modelo")},
        }
        fig, eixos = plt.subplots(1, 3, figsize=(13, 3.8))
        ms = [m for m in ORDEM if m in set(pares["modelo"])]
        x = np.arange(len(ms))
        for e, chave, titulo in [(eixos[0], "ligPorEvento", "Ligações por evento"), (eixos[1], "propFechadas", "Fechadas por estabilidade / nascidas"),
                                 (eixos[2], "propFundidas", "Absorvidas por fusão / nascidas")]:
            sem = [pares[pares["modelo"] == m][f"{chave}_sem"].mean() for m in ms]
            com = [pares[pares["modelo"] == m][f"{chave}_com"].mean() for m in ms]
            e.bar(x - 0.2, sem, 0.4, label="sem tipos (método 1)", color="#9ca3af")
            e.bar(x + 0.2, com, 0.4, label="com tipo e força (método 7)", color="#3a7ca5")
            e.set_xticks(x, [curto(m) for m in ms], fontsize=8)
            e.set_title(titulo, fontsize=10)
            e.grid(axis="y", alpha=0.3)
        eixos[0].legend(fontsize=7)
        fig.suptitle("Cidade Viva, condição A: sessões pareadas (mesmo modelo, mundo e semente)")
        fig.tight_layout()
        fig.savefig(destino / "tipadas_pareado.png", dpi=140)
        plt.close(fig)

    # 4. necessidade causal (m6) e necessidade × tipo (m6b)
    for chave, pasta in [("necessidade", "m6-necessidade"), ("necessidadeTipadas", "m6b-necessidade-tipadas")]:
        arq = raiz / pasta / "resumo.json"
        if arq.exists():
            res[chave] = json.loads(arq.read_text(encoding="utf8"))
    if "necessidade" in res:
        n = res["necessidade"]["porGerador"]
        ms = [m for m in ORDEM if m in n]
        fig, e = plt.subplots(figsize=(7.5, 3.6))
        x = np.arange(len(ms))
        for i, (t, cor) in enumerate([("direta", "#3a7ca5"), ("indireta", "#8fb8d6"), ("nao-ligado", "#d1495b")]):
            e.bar(x + (i - 1) * 0.27, [n[m][t] for m in ms], 0.27, label=t.replace("nao-ligado", "não ligado"), color=cor)
        e.set_xticks(x, [curto(m) for m in ms])
        e.set_ylabel("necessidade (0-100)")
        e.set_title("Necessidade de A para B, por modelo gerador (juiz Opus 5.5)")
        e.legend(fontsize=8)
        e.grid(axis="y", alpha=0.3)
        fig.tight_layout()
        fig.savefig(destino / "necessidade.png", dpi=140)
        plt.close(fig)
    if "necessidadeTipadas" in res:
        nt = res["necessidadeTipadas"]
        fig, eixos = plt.subplots(1, 2, figsize=(10, 3.4))
        tipos = [t for t in ["motivou", "possibilitou", "reagiu", "lembrou"] if nt["porTipoLigacao"][t]["n"]]
        eixos[0].bar(tipos, [nt["porTipoLigacao"][t]["necessidadeMedia"] for t in tipos], color="#3a7ca5")
        for i, t in enumerate(tipos):
            eixos[0].text(i, 2, f"n={nt['porTipoLigacao'][t]['n']}", ha="center", color="white", fontsize=8)
        eixos[0].set_title("Necessidade por tipo declarado")
        fs = [f for f in ["1", "2", "3"] if nt["porForca"][f]["n"]]
        eixos[1].bar([f"força {f}" for f in fs], [nt["porForca"][f]["necessidadeMedia"] for f in fs], color="#e08a2c")
        for i, f in enumerate(fs):
            eixos[1].text(i, 2, f"n={nt['porForca'][f]['n']}", ha="center", color="white", fontsize=8)
        eixos[1].set_title("Necessidade por força declarada")
        for e in eixos:
            e.set_ylim(0, 100)
            e.grid(axis="y", alpha=0.3)
        fig.tight_layout()
        fig.savefig(destino / "necessidade_tipos.png", dpi=140)
        plt.close(fig)

    # 5. figura das variantes
    v = pd.DataFrame(res["variantes"])
    v = v[v["tipo"] == "cidade-viva"]
    fig, e = plt.subplots(figsize=(7.5, 3.4))
    x = np.arange(len(v))
    e.bar(x - 0.2, v["prop_fechadas_estab"], 0.4, label="fechadas por estabilidade / nascidas", color="#3a9a5b")
    e.bar(x + 0.2, v["prop_fundidas"], 0.4, label="absorvidas por fusão / nascidas", color="#f59e0b")
    e.set_xticks(x, v["variante"], fontsize=8)
    e.set_title("Variantes de detecção, Cidade Viva (k = 3)")
    e.legend(fontsize=8)
    e.grid(axis="y", alpha=0.3)
    fig.tight_layout()
    fig.savefig(destino / "variantes.png", dpi=140)
    plt.close(fig)

    # figura da emenda: reaproveita a curva por tipo
    fonte = raiz / "emenda1" / "curvas_k3_tipo.png"
    if fonte.exists():
        (destino / "curvas_emenda1.png").write_bytes(fonte.read_bytes())
    mapa = raiz / "emenda1" / "mapa-linhagem-sonnet5-vale.png"
    if mapa.exists():
        (destino / "mapa_linhagem.png").write_bytes(mapa.read_bytes())

    (destino / "resultados.json").write_text(json.dumps(res, ensure_ascii=False, indent=1, default=float), encoding="utf8")
    print(f"análise gravada em {destino}")


def _somar_tipos(col) -> dict:
    tot: dict = {}
    for d in col:
        for t, n in (d or {}).items():
            tot[t] = tot.get(t, 0) + n
    return tot


if __name__ == "__main__":
    main()
