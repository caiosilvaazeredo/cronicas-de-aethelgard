#!/usr/bin/env python3
"""
Monta a logo do Skullshift (SVG) a partir de:
  - Skull_frame1.svg e Hex_Shaman_frame1.svg (pixel art em <rect>, 192x192)
  - a fonte Anak Manja (o nome vira contorno, então a logo não depende da fonte instalada)

Composição: halo de magia roxo, o xamã atrás conjurando, o esqueleto na frente virado
para ele, faíscas de pixel entre os dois e o nome embaixo: "SKULL" creme e "SHIFT" no
lilás da magia (a troca de forma), com contorno escuro e sombra.

Uso:
  python3 scripts/build-logo.py <Skull_frame1.svg> <Hex_Shaman_frame1.svg> <fonte.ttf> [saida.svg]
Requer: pip install fonttools
"""
import re
import sys
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont

skull_src, shaman_src, font_src = sys.argv[1:4]
root = Path(__file__).resolve().parent.parent
out = Path(sys.argv[4]) if len(sys.argv) > 4 else root / "public" / "assets" / "logo" / "logo.svg"
out.parent.mkdir(parents=True, exist_ok=True)

W, H = 1200, 640
INK = "#10223a"


def sprite(path: str, prefix: str):
    """Conteúdo interno do SVG (com ids prefixados) e a caixa dos pixels."""
    s = Path(path).read_text()
    inner = re.sub(r"^.*?<svg[^>]*>|</svg>\s*$", "", s, flags=re.S)
    inner = re.sub(r'id="([^"]+)"', lambda m: f'id="{prefix}-{m.group(1)}"', inner)
    xs, ys = [], []
    for m in re.finditer(r'<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"', s):
        x, y, w, h = map(int, m.groups())
        xs += [x, x + w]
        ys += [y, y + h]
    return inner, (min(xs), min(ys), max(xs), max(ys))


def place(inner, box, cx, bottom, scale, flip=False):
    """Posiciona o sprite: centro x e base (pés/sombra) na coordenada pedida."""
    x0, y0, x1, y1 = box
    mid = (x0 + x1) / 2
    sx = -scale if flip else scale
    tx = cx - mid * sx
    ty = bottom - y1 * scale
    return f'<g transform="translate({tx:.1f} {ty:.1f}) scale({sx} {scale})" shape-rendering="crispEdges">{inner}</g>'


def text_path(font: TTFont, text: str, size: float):
    """Converte o texto em um único path (unidades da fonte -> px) e devolve (path, largura)."""
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    upm = font["head"].unitsPerEm
    hmtx = font["hmtx"]
    s = size / upm
    parts, x = [], 0.0
    for ch in text:
        name = cmap.get(ord(ch))
        if not name:
            continue
        pen = SVGPathPen(gs)
        gs[name].draw(pen)
        d = pen.getCommands()
        if d:
            parts.append(f'<path transform="translate({x:.1f} 0) scale({s:.4f} {-s:.4f})" d="{d}"/>')
        x += hmtx[name][0] * s
    return "".join(parts), x


skull, skull_box = sprite(skull_src, "skull")
shaman, shaman_box = sprite(shaman_src, "shaman")
font = TTFont(font_src)

size = 190
skull_word, skull_w = text_path(font, "SKULL", size)
shift_word, shift_w = text_path(font, "SHIFT", size)
gap = 6
total = skull_w + gap + shift_w
scale_t = min(1.0, (W - 80) / total)
tx = (W - total * scale_t) / 2
base = 585


def word(paths, x, fill):
    t = f"translate({x:.1f} {base}) scale({scale_t:.4f})"
    return (
        f'<g transform="translate(0 12) {t}" fill="{INK}">{paths}</g>'  # sombra
        f'<g transform="{t}" fill="{fill}" stroke="{INK}" stroke-width="{14 / scale_t:.1f}" '
        f'stroke-linejoin="round" paint-order="stroke">{paths}</g>'
    )


# Faíscas de pixel (cruzinhas) entre o xamã e o esqueleto.
sparks = []
for x, y, s, c in [
    (640, 150, 10, "#fff7dc"), (700, 210, 7, "#f2c6ff"), (585, 95, 6, "#f2c6ff"),
    (760, 120, 8, "#fff7dc"), (520, 175, 5, "#ffe066"), (690, 300, 6, "#ffe066"),
    (820, 250, 5, "#f2c6ff"), (450, 110, 6, "#fff7dc"),
]:
    sparks.append(
        f'<g fill="{c}"><rect x="{x - s / 2}" y="{y - s * 1.5}" width="{s}" height="{s * 3}"/>'
        f'<rect x="{x - s * 1.5}" y="{y - s / 2}" width="{s * 3}" height="{s}"/></g>'
    )

svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  <defs>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#d9a6ff" stop-opacity="0.95"/>
      <stop offset="0.55" stop-color="#9b6bf0" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#6b3fc2" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="shift" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4d7ff"/>
      <stop offset="0.55" stop-color="#c58cff"/>
      <stop offset="1" stop-color="#8a5ae8"/>
    </linearGradient>
  </defs>
  <ellipse cx="610" cy="250" rx="330" ry="230" fill="url(#halo)"/>
  <ellipse cx="610" cy="250" rx="250" ry="175" fill="none" stroke="#f2c6ff" stroke-width="5"
           stroke-dasharray="18 14" opacity="0.7"/>
  {place(shaman, shaman_box, 790, 395, 3.3, flip=True)}
  {place(skull, skull_box, 450, 420, 4.3)}
  {''.join(sparks)}
  {word(skull_word, tx, "#fff7dc")}
  {word(shift_word, tx + (skull_w + gap) * scale_t, "url(#shift)")}
</svg>
"""
out.write_text(svg)
print(f"Logo gerada: {out}")
