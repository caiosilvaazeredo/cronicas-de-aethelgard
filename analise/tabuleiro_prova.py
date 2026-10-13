"""Prova de conceito do modelo de mundo em tabuleiro (sem modelo de linguagem).

Uso:
    python analise/tabuleiro_prova.py [saida]   (padrão: experimentos/tabuleiro-prova)

Agentes sintéticos se movem numa grade e criam um evento por dia. Cada evento
cita causas sorteadas entre os eventos recentes (últimos 3 dias, como a janela
do prompt da Cidade Viva) que o autor CONHECE, com o mesmo número de causas
observado nas 44 sessões com modelos Claude (distribuição CAUSAS abaixo). O
que muda entre as condições é só quem conhece o quê:

- onisciente: todo agente conhece todos os eventos recentes (é o que acontece
  hoje na Cidade Viva, em que uma única chamada decide todos os personagens e
  vê todos os eventos);
- tabuleiro: o agente conhece o que fez, o que viu (eventos a até RAIO casas
  dele no mesmo dia) e o que ouviu (ao encontrar outro agente a até RAIO casas,
  cada evento que o outro conhece passa com probabilidade BOATO).

Tramas são componentes conectados do grafo causal (eventos com ao menos uma
ligação), como em services/arcos.ts; a linhagem é simplificada (nascimento =
componente sem eventos de tramas do dia anterior; fusão = trama do dia anterior
que passa a dividir componente com outra). Não há fechamento por estabilidade
aqui: o interesse é a fusão e o nascimento de linhas novas.

Isto isola o efeito estrutural da informação e do espaço. Não diz nada sobre o
conteúdo que um modelo de linguagem geraria nessas condições.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

# número de causas por evento depois do dia 1, observado nas 44 sessões
CAUSAS = {0: 0.0026, 1: 0.2652, 2: 0.5345, 3: 0.1727, 4: 0.0244, 5: 0.0006}
N = 12  # grade N x N
LUGARES = {"A": (2, 2), "B": (2, 9), "C": (6, 5), "D": (9, 2), "E": (9, 9), "F": (5, 0)}
ATRATORES = ["C", "A"]  # lugares citados por várias premissas
JANELA = 3
PASSOS = 3  # casas por dia
AGENTES = 6


def distancia(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def passo_para(pos, alvo, k):
    x, y = pos
    for _ in range(k):
        if (x, y) == alvo:
            break
        if x != alvo[0]:
            x += 1 if alvo[0] > x else -1
        elif y != alvo[1]:
            y += 1 if alvo[1] > y else -1
    return (x, y)


class UF:
    def __init__(self):
        self.p = {}

    def add(self, x):
        self.p.setdefault(x, x)

    def find(self, x):
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]
            x = self.p[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.p[ra] = rb


def simular(rng, dias=12, onisciente=False, raio=2, boato=0.5, atracao=0.5, cartas=0, foco=0.0):
    casas = list(LUGARES)
    pos = [LUGARES[casas[i]] for i in range(AGENTES)]
    casa = [casas[i] for i in range(AGENTES)]
    conhece = [set() for _ in range(AGENTES)]
    eventos = []  # (id, dia, autor, pos, causas)
    uf = UF()
    ligados = set()
    linhas_vivas, nascimentos_tarde, fusoes_em_atrator, fusoes = [], 0, 0, 0
    tramas_ontem: dict[int, int] = {}  # evento -> raiz no fim de ontem
    nascidas = 0
    k_vals, k_probs = list(CAUSAS), np.array(list(CAUSAS.values()))
    k_probs = k_probs / k_probs.sum()
    for d in range(1, dias + 1):
        # movimento: rumo a um atrator com prob. `atracao`, senão a um lugar qualquer
        for i in range(AGENTES):
            if rng.random() < atracao:
                alvo = LUGARES[ATRATORES[rng.integers(len(ATRATORES))]]
            else:
                alvo = LUGARES[casas[rng.integers(len(casas))]] if rng.random() < 0.5 else LUGARES[casa[i]]
            pos[i] = passo_para(pos[i], alvo, PASSOS)
        novos = []
        # cartas de acontecimento: eventos do mundo, sem causa, em casas sorteadas
        exogenos = [(len(eventos) + c, d, -1, (int(rng.integers(N)), int(rng.integers(N))), []) for c in range(cartas)]
        for i in range(AGENTES):
            eid = len(eventos) + len(exogenos) + len(novos)
            recentes = [e for e in eventos if e[1] >= d - JANELA]
            base = recentes if onisciente else [e for e in recentes if e[0] in conhece[i]]
            k = 0 if d == 1 else int(rng.choice(k_vals, p=k_probs))
            k = min(k, len(base))
            if k and rng.random() < foco:
                # foco (com probabilidade `foco`): a primeira causa é sorteada; as demais vêm da mesma trama
                primeira = base[int(rng.integers(len(base)))]
                r0 = uf.find(primeira[0]) if primeira[0] in uf.p else None
                mesma = [e for e in base if e is not primeira and e[0] in uf.p and r0 is not None and uf.find(e[0]) == r0]
                extra = [mesma[j][0] for j in rng.choice(len(mesma), size=min(k - 1, len(mesma)), replace=False)] if mesma and k > 1 else []
                causas = [primeira[0]] + extra
            else:
                causas = [base[j][0] for j in rng.choice(len(base), size=k, replace=False)] if k else []
            novos.append((eid, d, i, pos[i], causas))
        for e in exogenos:
            uf.add(e[0])
            for i in range(AGENTES):
                if onisciente or distancia(pos[i], e[3]) <= raio:
                    conhece[i].add(e[0])
        eventos += exogenos
        # cartas vistas hoje entram já nas escolhas de amanhã; hoje as ações já foram sorteadas
        eventos += novos
        for e in novos:
            uf.add(e[0])
            for c in e[4]:
                uf.union(e[0], c)
                ligados.update([e[0], c])
        # conhecimento: o que fez, o que viu, o que ouviu
        for i in range(AGENTES):
            for e in novos:
                if e[2] == i or distancia(pos[i], e[3]) <= raio:
                    conhece[i].add(e[0])
        if boato > 0:
            for i in range(AGENTES):
                for j in range(i + 1, AGENTES):
                    if distancia(pos[i], pos[j]) <= raio:
                        for a, b in ((i, j), (j, i)):
                            passa = {x for x in conhece[a] if rng.random() < boato}
                            conhece[b] |= passa
        # linhagem simplificada
        comp: dict[int, list[int]] = {}
        for e in eventos:
            if e[0] in ligados:
                comp.setdefault(uf.find(e[0]), []).append(e[0])
        raizes_ontem = {}
        for e, r in tramas_ontem.items():
            raizes_ontem.setdefault(r, []).append(e)
        # fusões: tramas de ontem cujos eventos caíram no mesmo componente de outra
        hoje_de_ontem: dict[int, set[int]] = {}
        for r_ontem, membros in raizes_ontem.items():
            hoje_de_ontem.setdefault(uf.find(membros[0]), set()).add(r_ontem)
        for r_hoje, grupo in hoje_de_ontem.items():
            if len(grupo) > 1:
                fusoes += len(grupo) - 1
                # o evento novo de hoje que liga as tramas: onde aconteceu?
                ponte = [e for e in novos if e[0] in ligados and uf.find(e[0]) == r_hoje and e[4]]
                if ponte and any(distancia(e[3], LUGARES[a]) <= 1 for e in ponte for a in ATRATORES):
                    fusoes_em_atrator += len(grupo) - 1
        for r, membros in comp.items():
            if not any(m in tramas_ontem for m in membros):
                nascidas += 1
                if d > 2:
                    nascimentos_tarde += 1
        tramas_ontem = {m: r for r, ms in comp.items() for m in ms}
        linhas_vivas.append(len(comp))
    return {"vivas": linhas_vivas, "nascidas": nascidas, "nascidasDepoisDoDia2": nascimentos_tarde,
            "fusoes": fusoes, "fusoesEmAtrator": fusoes_em_atrator}


CONDICOES = {
    "onisciente": dict(onisciente=True),
    "tabuleiro, raio 2, boatos": dict(raio=2, boato=0.5),
    "tabuleiro, raio 2, sem boatos": dict(raio=2, boato=0.0),
    "tabuleiro, raio 1, sem boatos": dict(raio=1, boato=0.0),
    "tabuleiro, raio 2, boatos, sem atratores": dict(raio=2, boato=0.5, atracao=0.0),
    "tabuleiro, raio 2, boatos, 2 cartas por dia": dict(raio=2, boato=0.5, cartas=2),
    "tabuleiro, raio 2, boatos, 2 cartas por dia, foco 80%": dict(raio=2, boato=0.5, cartas=2, foco=0.8),
    "tabuleiro, raio 2, boatos, sem atratores, 2 cartas, foco 80%": dict(raio=2, boato=0.5, atracao=0.0, cartas=2, foco=0.8),
    "onisciente, 2 cartas por dia, foco 80%": dict(onisciente=True, cartas=2, foco=0.8),
}


def main() -> None:
    destino = Path(sys.argv[1] if len(sys.argv) > 1 else "experimentos/tabuleiro-prova")
    destino.mkdir(parents=True, exist_ok=True)
    res = {"parametros": {"grade": N, "lugares": LUGARES, "atratores": ATRATORES, "agentes": AGENTES, "passos": PASSOS,
                          "janela": JANELA, "causas": CAUSAS, "repeticoes": 500}, "condicoes": {}}
    for dias in (12, 20):
        for nome, kw in CONDICOES.items():
            rng = np.random.default_rng(2026)
            runs = [simular(rng, dias=dias, **kw) for _ in range(500)]
            v = np.array([r["vivas"] for r in runs])
            res["condicoes"][f"{nome} | {dias} dias"] = {
                "vivasPorDia": v.mean(axis=0).round(3).tolist(),
                "vivasNoFim": float(v[:, -1].mean()),
                "umaLinhaNoFim": float((v[:, -1] == 1).mean()),
                "nascidas": float(np.mean([r["nascidas"] for r in runs])),
                "nascidasDepoisDoDia2": float(np.mean([r["nascidasDepoisDoDia2"] for r in runs])),
                "fusoes": float(np.mean([r["fusoes"] for r in runs])),
                "fracaoFusoesEmAtrator": float(np.sum([r["fusoesEmAtrator"] for r in runs]) / max(1, np.sum([r["fusoes"] for r in runs]))),
            }
    (destino / "resultados.json").write_text(json.dumps(res, ensure_ascii=False, indent=2), encoding="utf8")

    cores = {"onisciente": "#3b3b38", "tabuleiro, raio 1, sem boatos": "#2a78d6",
             "tabuleiro, raio 2, boatos, sem atratores": "#1baf7a", "tabuleiro, raio 2, boatos, 2 cartas por dia": "#eda100",
             "tabuleiro, raio 2, boatos, 2 cartas por dia, foco 80%": "#eb6834"}
    rot = {"onisciente": "omniscient (current simulator)", "tabuleiro, raio 1, sem boatos": "board: radius 1, no rumours",
           "tabuleiro, raio 2, boatos, sem atratores": "board (radius 2, rumours), no attractor places",
           "tabuleiro, raio 2, boatos, 2 cartas por dia": "board (radius 2, rumours) + 2 event cards/day",
           "tabuleiro, raio 2, boatos, 2 cartas por dia, foco 80%": "board + event cards + focus rule"}
    fig, e = plt.subplots(figsize=(6.4, 3.4))
    for nome, cor in cores.items():
        v = res["condicoes"][f"{nome} | 20 dias"]["vivasPorDia"]
        e.plot(range(2, 21), v[1:], color=cor, linewidth=2, marker="o", markersize=3, label=rot[nome])
    e.set_xlabel("day")
    e.set_ylabel("separate storylines (mean of 500 runs)")
    e.set_xticks(range(2, 21, 2))
    e.set_ylim(0, None)
    for lado in ["top", "right"]:
        e.spines[lado].set_visible(False)
    e.grid(axis="y", color="#e4e4e0")
    e.legend(frameon=False, fontsize=8)
    fig.tight_layout()
    fig.savefig(destino / "linhas_por_condicao.png", dpi=200)
    plt.close(fig)
    for k, x in res["condicoes"].items():
        print(f"{k:55s} fim {x['vivasNoFim']:.2f}  uma linha {x['umaLinhaNoFim']:.2f}  nascidas {x['nascidas']:.1f}  "
              f"depois do dia 2 {x['nascidasDepoisDoDia2']:.1f}  fusões em atrator {x['fracaoFusoesEmAtrator']:.2f}")


if __name__ == "__main__":
    main()
