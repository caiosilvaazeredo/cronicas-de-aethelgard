"""Eventos atratores: por que as linhas de acontecimento da Cidade Viva se fundem.

Uso:
    python analise/atratores.py experimentos/validacao

Lê as sessões Cidade Viva dos métodos 1, 7, 8 e 9 (44 sessões), refaz a
detecção dia a dia com o próprio services/arcos.ts (via core/experimento/
reanalise) e mede:

1. a bacia: quantas linhas seguem vivas (não absorvidas) a cada dia e quando a
   sessão chega a uma linha só;
2. fusões diretas e indiretas: o evento que funde duas linhas cita eventos das
   duas (direta) ou só de uma, e a junção passa por outro evento (indireta);
3. premissas: se as primeiras fusões entre linhas originais ligam personagens
   cujas premissas (objetivo, segredo, crenças em mundos/*.json) já se
   referiam um ao outro, comparado com a taxa de base entre todos os pares;
4. lugares: participação de cada local nos eventos e nos eventos de fusão;
5. objetos das premissas no texto dos eventos de fusão e dos demais;
6. concentração do grau de entrada (há "eventos-hub"?).

A codificação das premissas (PREMISSAS abaixo) foi feita à mão a partir dos
textos dos mundos, com o critério: o objetivo, o segredo ou uma crença de um
agente menciona outro agente (por nome, título ou papel único) ou algo que só
o outro possui ou controla. Ela está aqui para ser auditada.

Saída: <raiz>/analise-atratores/resultados.json e figuras .png.
"""

from __future__ import annotations

import itertools
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy import stats

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

RAIZ_REPO = Path(__file__).resolve().parent.parent
METODOS = ["v1-cidade-viva-claude", "v3-ligacoes-tipadas-claude", "v4-causas-maximas-claude", "v5-replicacao-claude"]
AZUL, LARANJA, CINZA, TINTA = "#2a78d6", "#eb6834", "#9a9a94", "#3b3b38"

# pares de agentes cujas premissas se referem um ao outro (ver docstring)
PREMISSAS = {
    "porto-das-brumas": {
        ("odete", "iracema"): "Odete quer o armazém de Vasco; Iracema é a viúva de Vasco",
        ("odete", "bras"): "Odete crê que o capitão Brás pode ser comprado",
        ("odete", "lia"): "Odete deve à Irmandade; Lia crê que Odete vai fugir da dívida",
        ("bras", "nuno"): "Brás crê que o novo fiscal veio vigiá-lo; Nuno investiga a guarda",
        ("bras", "lia"): "Lia entrega informações à guarda de Brás",
        ("tomas", "iracema"): "Tomás sabe quem esteve no armazém na noite da morte de Vasco",
        ("tomas", "bras"): "Tomás crê que o capitão Brás protege quem paga",
        ("odete", "celeste"): "Celeste quer tomar de Odete a presidência da Guilda",
        ("lia", "gaspar"): "Lia quer o lugar de Gaspar; Gaspar crê que Lia quer seu lugar",
        ("celeste", "nuno"): "Celeste crê que o novo fiscal é incorruptível",
    },
    "vale-silente": {
        ("anselmo", "marta"): "Anselmo crê que Marta quer seu lugar; Marta crê que ele esconde o grão",
        ("irma-clara", "joaquim"): "Irmã Clara crê que o moleiro tem algo a esconder",
        ("rui", "joaquim"): "Rui viu alguém saindo do moinho; crê que o forasteiro do moinho é um espírito",
        ("rui", "irma-clara"): "Rui crê que Irmã Clara sabe o que vai acontecer",
        ("benedita", "marta"): "Benedita viu rastros de botas perto dos rebanhos mortos (de Marta)",
        ("benedita", "anselmo"): "Benedita crê que esperar pelo conselho de Anselmo é perder tempo",
        ("custodia", "anselmo"): "Custódia é parente do mercador que comprou o grão de Anselmo",
        ("custodia", "benedita"): "Custódia crê que Benedita vai se perder na montanha",
        ("damiao", "marta"): "Damião deve a Marta e matou duas ovelhas dela",
        ("damiao", "irma-clara"): "Damião crê que a Irmã Clara exagera tudo",
    },
}
# objetos e lugares que aparecem nas premissas de mais de um agente
OBJETOS = {
    "porto-das-brumas": r"armaz|vasco|d[íi]vida|livros|contas|papé?e?is|suborno",
    "vale-silente": r"moinho|forasteiro|gr[ãa]o|ovelha|rebanho|lobo|sino",
}


def ligados(mundo: str, a: str, b: str) -> bool:
    p = PREMISSAS[mundo]
    return (a, b) in p or (b, a) in p


def carregar(raiz: Path) -> list[dict]:
    """Eventos, condição e, por dia, o mapa evento -> trama e a linhagem."""
    script = r"""
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { detectarArcos } from './services/arcos';
import { atualizarLinhagem, linhagemVazia, mapaDeTramas } from './services/linhagem';
const saida = [];
for (const dir of process.argv.slice(2)) {
  if (!existsSync(dir)) continue;
  for (const s of readdirSync(dir).sort()) {
    const p = join(dir, s);
    if (!existsSync(join(p, 'resumo.json')) || !existsSync(join(p, 'condicao.json'))) continue;
    const c = JSON.parse(readFileSync(join(p, 'condicao.json'), 'utf8'));
    if (c.controle) continue;
    const ev = readFileSync(join(p, 'eventos.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const limpos = ev.map((e) => ({ ...e, tramaId: null, ehKernel: false }));
    let tramas = []; let lin = linhagemVazia(); let anot = []; const mapas = [];
    for (let d = 1; d <= c.dias; d++) {
      const antes = mapaDeTramas(anot);
      const r = detectarArcos(limpos.filter((e) => e.turno <= d), d, tramas, 3);
      lin = atualizarLinhagem(lin, d, antes, r.eventos, r.tramas);
      anot = r.eventos;
      mapas.push(Object.fromEntries(mapaDeTramas(anot)));
      tramas = r.tramas.map((t) => (t.status === 'estavel' ? { ...t, status: 'fechada' } : t));
    }
    saida.push({ sessao: s, metodo: dir.split('/').pop(), mundo: c.mundo, modelo: c.modelos.agentes.modelo, dias: c.dias,
      eventos: ev, mapas, linhagem: lin });
  }
}
console.log(JSON.stringify(saida));
"""
    arq = RAIZ_REPO / ".tmp-atratores.ts"
    arq.write_text(script, encoding="utf8")
    try:
        out = subprocess.run(["npx", "tsx", str(arq), *[str(raiz / m) for m in METODOS]], cwd=RAIZ_REPO,
                             check=True, capture_output=True, text=True).stdout
    finally:
        arq.unlink(missing_ok=True)
    return json.loads(out)


def gini(v: np.ndarray) -> float:
    v = np.sort(v)
    n = len(v)
    return float((2 * np.arange(1, n + 1) - n - 1).dot(v) / (n * v.sum())) if v.sum() else 0.0


def main() -> None:
    raiz = Path(sys.argv[1] if len(sys.argv) > 1 else "experimentos/validacao")
    destino = raiz / "analise-atratores"
    destino.mkdir(parents=True, exist_ok=True)
    sessoes = carregar(raiz)

    res: dict = {"sessoes": len(sessoes), "porMetodo": {}}
    vivas_por_dia: dict[int, list[list[int]]] = {12: [], 20: []}
    dia_uma_linha, uma_no_fim = [], 0
    primeiras, base = [], []
    exemplos_primeiras: list[dict] = []
    fusoes = {"direta": 0, "indireta": 0}
    coloc_fus, coloc_base = [], []
    obj_fus, obj_out = [], []
    loc = {m: {"todos": {}, "fusao": {}} for m in PREMISSAS}
    ginis, top5 = [], []
    dias_fusao = []
    entropia_dia: dict[int, list[float]] = {}

    for s in sessoes:
        res["porMetodo"][s["metodo"]] = res["porMetodo"].get(s["metodo"], 0) + 1
        m, ev = s["mundo"], {e["id"]: e for e in s["eventos"]}
        T = s["linhagem"]["tramas"]
        autor = lambda tid: ev[tid]["autorId"] if tid in ev else None  # noqa: E731

        # 1. bacia: linhas vivas (nascidas e ainda não absorvidas) por dia
        vivas = []
        for d in range(1, s["dias"] + 1):
            vivas.append(sum(1 for r in T.values() if r["nasceuEm"] <= d and (r["fundiuEm"] is None or r["fundiuEm"] > d)))
        if s["dias"] in vivas_por_dia:
            vivas_por_dia[s["dias"]].append(vivas)
        um = next((d + 1 for d, v in enumerate(vivas) if d >= 1 and v == 1), None)
        dia_uma_linha.append(um)
        uma_no_fim += vivas[-1] == 1

        # 3. premissas nas primeiras fusões entre linhas originais
        origens = [t for t, r in T.items() if r["origem"] == "nascimento"]
        autores = sorted({autor(t) for t in origens if autor(t)})
        base += [ligados(m, a, b) for a, b in itertools.combinations(autores, 2)]
        tocadas: set[str] = set()
        for r in sorted(T.values(), key=lambda r: (r["fundiuEm"] or 999, r["id"])):
            if r["fundiuEm"] is None:
                continue
            dias_fusao.append(r["fundiuEm"])
            a, b = r["id"], r["absorvidaPor"]
            orig_b = T.get(b, {}).get("origem") == "nascimento"
            if r["origem"] == "nascimento" and orig_b and a not in tocadas and b not in tocadas:
                ra, rb = autor(a), autor(b)
                if ra and rb and ra != rb:
                    primeiras.append(ligados(m, ra, rb))
                    if len(exemplos_primeiras) < 400:
                        exemplos_primeiras.append({"sessao": s["sessao"], "mundo": m, "dia": r["fundiuEm"], "a": ra, "b": rb,
                                                   "premissa": PREMISSAS[m].get((ra, rb)) or PREMISSAS[m].get((rb, ra))})
            tocadas.update([a, b])

            # 2. direta × indireta, com o mapa de tramas do dia anterior
            antes = s["mapas"][r["fundiuEm"] - 2] if r["fundiuEm"] >= 2 else {}
            membros_a = {e for e, t in antes.items() if t == a}
            for f in r["fundidaPorEventos"]:
                e = ev[f]
                causas = [c for c in e.get("causadoPor") or [] if c in ev]
                tr = {antes.get(c) for c in causas} - {None}
                fusoes["direta" if len(tr) >= 2 else "indireta"] += 1
                # local da fusão igual ao de algum evento citado da linha absorvida?
                da_absorvida = [ev[c] for c in causas if c in membros_a]
                if da_absorvida:
                    coloc_fus.append(any(c.get("local") == e.get("local") for c in da_absorvida))

        # base de co-localização: toda ligação causal válida
        for e in ev.values():
            for c in e.get("causadoPor") or []:
                if c in ev and ev[c]["turno"] <= e["turno"] and c != e["id"]:
                    coloc_base.append(ev[c].get("local") == e.get("local"))

        # 4 e 5. lugares e objetos das premissas
        fus = {f for r in T.values() for f in r["fundidaPorEventos"]}
        for e in ev.values():
            lugar = e.get("local") or "?"
            loc[m]["todos"][lugar] = loc[m]["todos"].get(lugar, 0) + 1
            if e["id"] in fus:
                loc[m]["fusao"][lugar] = loc[m]["fusao"].get(lugar, 0) + 1
            (obj_fus if e["id"] in fus else obj_out).append(bool(re.search(OBJETOS[m], e["conteudo"], re.I)))

        # 4b. entropia dos lugares por dia (bits): o espaço se contrai?
        por_dia: dict[int, list[str]] = {}
        for e in ev.values():
            por_dia.setdefault(e["turno"], []).append(e.get("local") or "?")
        for d, ls in por_dia.items():
            _, cont = np.unique(ls, return_counts=True)
            q = cont / cont.sum()
            entropia_dia.setdefault(d, []).append(float(-(q * np.log2(q)).sum()))

        # 6. concentração do grau de entrada
        grau = {i: 0 for i in ev}
        for e in ev.values():
            for c in e.get("causadoPor") or []:
                if c in grau:
                    grau[c] += 1
        v = np.array(sorted(grau.values(), reverse=True), float)
        ginis.append(gini(v))
        k = max(1, round(0.05 * len(v)))
        top5.append(float(v[:k].sum() / v.sum()) if v.sum() else 0.0)

    validos = [d for d in dia_uma_linha if d is not None]
    res["bacia"] = {
        "sessoesQueChegamAUmaLinha": len(validos), "umaLinhaNoFim": uma_no_fim,
        "diaUmaLinha": {"mediana": float(np.median(validos)), "q1": float(np.percentile(validos, 25)), "q3": float(np.percentile(validos, 75))},
        "diaDasFusoes": {"n": len(dias_fusao), "mediana": float(np.median(dias_fusao)), "q1": float(np.percentile(dias_fusao, 25)),
                         "q3": float(np.percentile(dias_fusao, 75)), "ate5": float(np.mean(np.array(dias_fusao) <= 5))},
        "vivasMedias": {str(k): np.mean(np.array(v), axis=0).round(3).tolist() for k, v in vivas_por_dia.items() if v},
    }
    bt = stats.binomtest(sum(primeiras), len(primeiras), float(np.mean(base)))
    res["premissas"] = {"primeirasFusoes": len(primeiras), "ligadasPorPremissa": float(np.mean(primeiras)),
                        "taxaBase": float(np.mean(base)), "paresBase": len(base), "p_binomial": float(bt.pvalue),
                        "razao": float(np.mean(primeiras) / np.mean(base))}
    res["fusoes"] = {**fusoes, "fracaoDireta": fusoes["direta"] / max(1, sum(fusoes.values()))}
    res["colocalizacao"] = {"fusao": float(np.mean(coloc_fus)), "nFusao": len(coloc_fus),
                            "todasAsLigacoes": float(np.mean(coloc_base)), "nLigacoes": len(coloc_base)}
    f = [[sum(obj_fus), len(obj_fus) - sum(obj_fus)], [sum(obj_out), len(obj_out) - sum(obj_out)]]
    res["objetos"] = {"fusao": float(np.mean(obj_fus)), "nFusao": len(obj_fus), "demais": float(np.mean(obj_out)),
                      "nDemais": len(obj_out), "p_fisher": float(stats.fisher_exact(f).pvalue)}
    res["lugares"] = {}
    for m, x in loc.items():
        tt, tf = sum(x["todos"].values()), sum(x["fusao"].values())
        res["lugares"][m] = sorted([{"local": l, "eventos": n / tt, "fusao": x["fusao"].get(l, 0) / max(1, tf)}
                                    for l, n in x["todos"].items()], key=lambda r: -r["eventos"])
    res["entropiaLugares"] = {"porDia": {str(d): float(np.mean(v)) for d, v in sorted(entropia_dia.items())},
                              "dias1a2": float(np.mean([x for d in (1, 2) for x in entropia_dia.get(d, [])])),
                              "dias6a12": float(np.mean([x for d in range(6, 13) for x in entropia_dia.get(d, [])])),
                              "maximo6Lugares": float(np.log2(6)), "maximo5Lugares": float(np.log2(5))}
    res["grau"] = {"gini": float(np.mean(ginis)), "top5": float(np.mean(top5))}
    (destino / "resultados.json").write_text(json.dumps(res, ensure_ascii=False, indent=2), encoding="utf8")
    (destino / "primeiras_fusoes.json").write_text(json.dumps(exemplos_primeiras, ensure_ascii=False, indent=2), encoding="utf8")
    (destino / "premissas.json").write_text(json.dumps({m: {f"{a}-{b}": t for (a, b), t in p.items()} for m, p in PREMISSAS.items()},
                                                       ensure_ascii=False, indent=2), encoding="utf8")
    figuras(res, destino)
    print(json.dumps({k: res[k] for k in ["sessoes", "bacia", "premissas", "fusoes", "colocalizacao", "objetos", "grau"]},
                     ensure_ascii=False, indent=1)[:3000])


def estilo(e):
    for lado in ["top", "right"]:
        e.spines[lado].set_visible(False)
    e.spines["left"].set_color(CINZA)
    e.spines["bottom"].set_color(CINZA)
    e.tick_params(colors=TINTA, labelsize=9)
    e.grid(axis="y", color="#e4e4e0", linewidth=0.8)
    e.set_axisbelow(True)


def figuras(res: dict, destino: Path) -> None:
    plt.rcParams.update({"font.family": "DejaVu Sans", "text.color": TINTA, "axes.labelcolor": TINTA})
    # bacia de atração
    fig, e = plt.subplots(figsize=(6.4, 3.4))
    for k, cor, rot in [("12", AZUL, "12-day sessions (n=32)"), ("20", LARANJA, "20-day sessions (n=12)")]:
        v = res["bacia"]["vivasMedias"].get(k)
        if v:
            e.plot(range(2, len(v) + 1), v[1:], color=cor, linewidth=2, marker="o", markersize=4, label=rot)
    e.axhline(1, color=CINZA, linewidth=1, linestyle="--")
    e.text(20, 0.92, "single storyline", ha="right", va="top", fontsize=8, color=TINTA)
    e.set_xticks(range(2, 21, 2))
    e.set_xlabel("day (storylines are born on day 2)")
    e.set_ylabel("storylines not yet absorbed (mean)")
    e.set_ylim(0, None)
    estilo(e)
    e.legend(frameon=False, fontsize=8)
    fig.tight_layout()
    fig.savefig(destino / "bacia.png", dpi=200)
    plt.close(fig)

    # premissas: primeiras fusões × base
    p = res["premissas"]
    fig, e = plt.subplots(figsize=(4.2, 3.2))
    e.bar([0, 1], [p["taxaBase"], p["ligadasPorPremissa"]], width=0.55, color=[CINZA, AZUL])
    for x, y, n in [(0, p["taxaBase"], p["paresBase"]), (1, p["ligadasPorPremissa"], p["primeirasFusoes"])]:
        e.text(x, y + 0.02, f"{100 * y:.0f}%\n(n={n})", ha="center", va="bottom", fontsize=8)
    e.set_xticks([0, 1], ["all pairs of\nstorylines", "pairs that\nfused first"])
    e.set_ylabel("share linked in the premises")
    e.set_ylim(0, 1)
    estilo(e)
    fig.tight_layout()
    fig.savefig(destino / "premissas.png", dpi=200)
    plt.close(fig)

    # lugares
    fig, eixos = plt.subplots(1, 2, figsize=(8.4, 3.2), sharey=True)
    nomes = {"porto-das-brumas": "Porto das Brumas", "vale-silente": "Vale Silente"}
    for e, (m, linhas) in zip(eixos, res["lugares"].items()):
        x = np.arange(len(linhas))
        e.bar(x - 0.19, [r["eventos"] for r in linhas], 0.36, color=CINZA, label="all events")
        e.bar(x + 0.19, [r["fusao"] for r in linhas], 0.36, color=LARANJA, label="fusion events")
        e.set_xticks(x, [r["local"] for r in linhas], rotation=25, ha="right")
        e.set_title(nomes[m], fontsize=10)
        estilo(e)
    eixos[0].set_ylabel("share of events")
    eixos[0].legend(frameon=False, fontsize=8)
    fig.tight_layout()
    fig.savefig(destino / "lugares.png", dpi=200)
    plt.close(fig)


if __name__ == "__main__":
    main()
