"""Figuras demonstrativas dos artigos (em inglês).

Uso:
    python analise/figuras_artigos.py

Gera em artigos/ijgsi-atratores/figuras/:
  grafo_sessao.png   grafo causal de uma sessão real (Opus 5, Porto das Brumas, condição A),
                     dia a dia e por personagem, com as tramas em cores e os eventos de fusão marcados;
  necessidade.png    necessidade causal estimada pelo juiz, por modelo gerador e tipo de par;
  interface.png      recorte da tela do Mapa da Crônica (interface do simulador).
e em artigos/ijgsi-tabuleiro/figuras/:
  mesa.png           como fica a mesa depois de 8 turnos, com o barbante entre as cartas, em duas
                     condições da prova de conceito (agentes sintéticos).
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import numpy as np

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import FancyArrowPatch, Rectangle  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "analise"))

# paleta categórica validada (skill dataviz, ordem fixa) e tintas neutras
SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"]
CINZA, TINTA, GRADE = "#9a9a94", "#3b3b38", "#e4e4e0"
plt.rcParams.update({"font.family": "DejaVu Sans", "text.color": TINTA, "axes.labelcolor": TINTA,
                     "xtick.color": TINTA, "ytick.color": TINTA})

PAPEIS = {"odete": "Odete, merchant", "bras": "Brás, guard captain", "lia": "Lia, smuggler",
          "tomas": "Tomás, chaplain", "iracema": "Iracema, widow", "nuno": "Nuno, inspector"}
LUGAR_EN = {"armazens": "warehouse", "alfandega": "customs", "capela": "chapel", "cais": "dock",
            "taverna": "tavern", "mercado": "market"}


def estilo(e):
    for lado in ("top", "right"):
        e.spines[lado].set_visible(False)
    for lado in ("left", "bottom"):
        e.spines[lado].set_color(CINZA)


# ---------------------------------------------------------------------------
# 1. grafo causal de uma sessão real
# ---------------------------------------------------------------------------
def grafo_sessao(destino: Path) -> None:
    os.environ["N_NULO"] = "0"
    import atratores  # noqa: E402  (refaz a detecção dia a dia com services/arcos.ts)

    alvo = "porto-das-brumas_claude-cli-claude-opus-5_informa_6ag_jog-nenhum_r01"
    sess = [s for s in atratores.carregar(RAIZ / "experimentos" / "validacao") if s["sessao"] == alvo][0]
    ev = {e["id"]: e for e in sess["eventos"]}
    T = sess["linhagem"]["tramas"]
    autores = list(PAPEIS)
    nascidas = sorted([t for t, r in T.items() if r["origem"] == "nascimento"], key=lambda t: autores.index(ev[t]["autorId"]))
    cor_trama = {t: SERIES[i % len(SERIES)] for i, t in enumerate(nascidas)}
    fusoes = {f for r in T.values() for f in r["fundidaPorEventos"]}

    def trama_no_dia(eid):
        d = ev[eid]["turno"]
        return sess["mapas"][d - 1].get(eid)

    pos = {}
    for e in ev.values():
        pos[e["id"]] = (e["turno"], -autores.index(e["autorId"]))
    fig, ax = plt.subplots(figsize=(10.5, 4.6))
    for e in ev.values():
        for c in e.get("causadoPor") or []:
            if c not in ev:
                continue
            (x0, y0), (x1, y1) = pos[c], pos[e["id"]]
            cruza = e["id"] in fusoes and sess["mapas"][e["turno"] - 2].get(c) is not None  # ligação que funde tramas
            ax.add_patch(FancyArrowPatch((x0, y0), (x1, y1), arrowstyle="-|>", mutation_scale=7,
                                         connectionstyle="arc3,rad=0.12", lw=0.6 if not cruza else 1.1,
                                         color="#c8c8c2" if not cruza else TINTA, alpha=0.9, zorder=1))
    for e in ev.values():
        t = trama_no_dia(e["id"])
        cor = cor_trama.get(t, CINZA if t is None else TINTA)
        x, y = pos[e["id"]]
        if e["id"] in fusoes:
            ax.scatter([x], [y], s=210, facecolor="white", edgecolor=TINTA, linewidth=1.8, zorder=2)
        ax.scatter([x], [y], s=95, color=cor, edgecolor="white", linewidth=1.2, zorder=3)
    ax.set_yticks([-i for i in range(len(autores))], [PAPEIS[a] for a in autores])
    ax.set_xticks(range(1, max(e["turno"] for e in ev.values()) + 1))
    ax.set_xlabel("day")
    ax.set_xlim(0.5, 12.5)
    estilo(ax)
    ax.grid(axis="x", color=GRADE, linewidth=0.8)
    ax.set_axisbelow(True)
    # anotação da primeira fusão (o capitão lacra o armazém, dia 3)
    if "D3.bras" in pos:
        x, y = pos["D3.bras"]
        ax.annotate("day 3: the captain seals the warehouse,\nciting the bribe and the inspector's inquiry",
                    xy=(x + 0.12, y - 0.08), xytext=(5.3, -1.55), fontsize=8, color=TINTA,
                    bbox=dict(boxstyle="round,pad=0.3", fc="white", ec=GRADE),
                    arrowprops=dict(arrowstyle="-", color=TINTA, lw=0.8), zorder=5)
    hand = [plt.Line2D([], [], marker="o", ls="", markersize=8, color=cor_trama[t],
                       label=f"storyline started by {PAPEIS[ev[t]['autorId']].split(',')[0]}") for t in nascidas]
    hand.append(plt.Line2D([], [], marker="o", ls="", markersize=8, color=CINZA, label="event not yet in a storyline"))
    hand.append(plt.Line2D([], [], marker="o", ls="", markersize=11, markerfacecolor="white",
                           markeredgecolor=TINTA, markeredgewidth=1.6, label="event that merged storylines"))
    hand.append(plt.Line2D([], [], color=TINTA, lw=1.1, label="link that merges storylines"))
    ax.legend(handles=hand, frameon=False, fontsize=7.5, loc="upper left", bbox_to_anchor=(1.0, 1.0))
    fig.tight_layout()
    fig.savefig(destino / "grafo_sessao.png", dpi=220)
    plt.close(fig)
    print("grafo_sessao.png:", len(ev), "eventos,", len(nascidas), "tramas nascidas,", len(fusoes), "eventos de fusão")


# ---------------------------------------------------------------------------
# 2. necessidade causal por modelo (em inglês)
# ---------------------------------------------------------------------------
def necessidade(destino: Path) -> None:
    r = json.loads((RAIZ / "experimentos/validacao/m6-necessidade/resumo.json").read_text(encoding="utf8"))
    modelos = [("claude-haiku-4-5-20251001", "Haiku 4.5"), ("claude-sonnet-4-6", "Sonnet 4.6"),
               ("claude-sonnet-5", "Sonnet 5"), ("claude-opus-5", "Opus 5")]
    tipos = [("direta", "declared direct link"), ("indireta", "indirect ancestor"), ("nao-ligado", "unlinked pair (control)")]
    fig, ax = plt.subplots(figsize=(7.2, 3.4))
    x = np.arange(len(modelos))
    larg = 0.26
    for i, (t, rot) in enumerate(tipos):
        vals = [r["porGerador"][m][t] for m, _ in modelos]
        ax.bar(x + (i - 1) * larg, vals, larg - 0.02, color=SERIES[i], label=rot)
    ax.set_xticks(x, [n for _, n in modelos])
    ax.set_ylabel("necessity of A for B (0-100)")
    ax.set_ylim(0, 100)
    estilo(ax)
    ax.grid(axis="y", color=GRADE)
    ax.set_axisbelow(True)
    ax.legend(frameon=False, fontsize=8, ncol=3, loc="upper left")
    fig.tight_layout()
    fig.savefig(destino / "necessidade.png", dpi=220)
    plt.close(fig)


# ---------------------------------------------------------------------------
# 3. recorte da interface (Mapa da Crônica)
# ---------------------------------------------------------------------------
def interface(destino: Path) -> None:
    """Tela inteira do Mapa da Crônica (o recorte deixava o texto ilegível)."""
    import shutil
    shutil.copy(RAIZ / "experimentos/validacao/analise-grafos/mapa_linhagem.png", destino / "interface.png")


# ---------------------------------------------------------------------------
# 4. a mesa depois de 8 turnos (prova de conceito sintética)
# ---------------------------------------------------------------------------
def mesa(destino: Path) -> None:
    import tabuleiro_prova as tp

    def rodada(kw, alvo_linhas, semente):
        rng = np.random.default_rng(semente)
        for _ in range(400):
            r = tp.simular(rng, dias=8, devolver=True, **kw)
            if r["vivas"][-1] == alvo_linhas:
                return r
        return r

    casos = [("Board rules only (radius 2, rumours)", dict(raio=2, boato=0.5), 1, 11),
             ("Board + world-event cards + focus rule", dict(raio=2, boato=0.5, cartas=2, foco=0.8), 5, 12)]
    fig, eixos = plt.subplots(1, 2, figsize=(11, 5.4))
    for e, (titulo, kw, alvo, semente) in zip(eixos, casos):
        r = rodada(kw, alvo, semente)
        n = tp.N
        e.set_xlim(-0.5, n - 0.5)
        e.set_ylim(-0.5, n - 0.5)
        e.set_aspect("equal")
        e.invert_yaxis()
        for i in range(n + 1):
            e.plot([-0.5, n - 0.5], [i - 0.5, i - 0.5], color=GRADE, lw=0.5, zorder=0)
            e.plot([i - 0.5, i - 0.5], [-0.5, n - 0.5], color=GRADE, lw=0.5, zorder=0)
        for nome, (cx, cy) in tp.LUGARES.items():
            cor = "#f6c9b5" if nome in tp.ATRATORES else "#e6eefb"
            e.add_patch(Rectangle((cy - 1.5, cx - 1.5), 3, 3, color=cor, zorder=0.5))
        # cores por trama final, na ordem de tamanho
        comps = {}
        for eid, raiz in r["trama"].items():
            comps.setdefault(raiz, []).append(eid)
        ordem = sorted(comps, key=lambda k: -len(comps[k]))
        cor_de = {raiz: SERIES[i % len(SERIES)] for i, raiz in enumerate(ordem)}
        jit = np.random.default_rng(5)
        xy = {}
        for (eid, dia, autor, (cx, cy), causas) in r["eventos"]:
            xy[eid] = (cy + jit.uniform(-0.38, 0.38), cx + jit.uniform(-0.38, 0.38))
        for (eid, dia, autor, casa, causas) in r["eventos"]:
            for c in causas:
                (x0, y0), (x1, y1) = xy[c], xy[eid]
                cor = cor_de.get(r["trama"].get(eid), CINZA)
                e.add_patch(FancyArrowPatch((x0, y0), (x1, y1), arrowstyle="-", connectionstyle="arc3,rad=0.25",
                                            lw=1.1, color=cor, alpha=0.75, zorder=1))
        for (eid, dia, autor, casa, causas) in r["eventos"]:
            x, y = xy[eid]
            cor = cor_de.get(r["trama"].get(eid), "#ffffff")
            if autor == -1:  # carta de acontecimento do mundo
                e.scatter([x], [y], marker="D", s=46, color="white", edgecolor=TINTA, linewidth=1.1, zorder=3)
                e.scatter([x], [y], marker="D", s=14, color=cor if eid in r["trama"] else CINZA, zorder=4)
            else:
                e.add_patch(Rectangle((x - 0.17, y - 0.23), 0.34, 0.46, facecolor="white", edgecolor=cor, lw=1.6, zorder=3))
        for nome, (cx, cy) in tp.LUGARES.items():
            e.text(cy, cx - 1.75, "attractor place" if nome in tp.ATRATORES else "place", ha="center", va="bottom",
                   fontsize=6.5, color=TINTA)
        e.set_xticks([])
        e.set_yticks([])
        for lado in e.spines.values():
            lado.set_color(CINZA)
        e.set_title(f"{titulo}\n{len(comps)} storyline(s) after 8 turns", fontsize=9.5)
    hand = [Rectangle((0, 0), 1, 1, facecolor="white", edgecolor=TINTA, lw=1.4, label="event card (character action)"),
            plt.Line2D([], [], marker="D", ls="", markersize=6, markerfacecolor="white", markeredgecolor=TINTA,
                       label="world-event card (no cause)"),
            plt.Line2D([], [], color=SERIES[0], lw=1.4, label="yarn: declared cause (colour = storyline)")]
    fig.legend(handles=hand, loc="lower center", ncol=3, frameon=False, fontsize=8)
    fig.tight_layout(rect=(0, 0.06, 1, 1))
    fig.savefig(destino / "mesa.png", dpi=220)
    plt.close(fig)


def main() -> None:
    a1 = RAIZ / "artigos/ijgsi-atratores/figuras"
    a2 = RAIZ / "artigos/ijgsi-tabuleiro/figuras"
    grafo_sessao(a1)
    necessidade(a1)
    interface(a1)
    mesa(a2)


if __name__ == "__main__":
    main()
