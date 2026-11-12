#!/usr/bin/env python3
"""
Gera public/fonts/anak-manja-pt.ttf a partir da fonte Anak Manja (Khurasan Studio),
acrescentando as letras acentuadas do português, que a fonte original não tem.

As letras são glifos compostos: letra base + sinal já existente na fonte
(` espelhado vira acento agudo, ~ e ^ reduzidos, vírgula vira cedilha).

Uso: python3 scripts/build-font.py "caminho/Anak Manja.ttf"
Requer: pip install fonttools
"""
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphComponent

src = Path(sys.argv[1])
out = Path(__file__).resolve().parent.parent / "public" / "fonts" / "anak-manja-pt.ttf"
out.parent.mkdir(parents=True, exist_ok=True)

font = TTFont(str(src))
glyf = font["glyf"]
hmtx = font["hmtx"]
cmap = font.getBestCmap()


def bounds(name):
    g = glyf[name]
    g.recalcBounds(glyf)
    return g.xMin, g.yMin, g.xMax, g.yMax


# Sinal: (glifo de origem, escala, espelhar)
MARKS = {
    "acute": ("grave", 0.75, True),
    "grave": ("grave", 0.75, False),
    "tilde": ("asciitilde", 0.6, False),
    "circumflex": ("asciicircum", 0.6, False),
}

# letra -> (base, sinal)
LETTERS = {
    "Á": ("A", "acute"), "À": ("A", "grave"), "Â": ("A", "circumflex"), "Ã": ("A", "tilde"),
    "É": ("E", "acute"), "Ê": ("E", "circumflex"), "Í": ("I", "acute"),
    "Ó": ("O", "acute"), "Ô": ("O", "circumflex"), "Õ": ("O", "tilde"), "Ú": ("U", "acute"),
    "á": ("a", "acute"), "à": ("a", "grave"), "â": ("a", "circumflex"), "ã": ("a", "tilde"),
    "é": ("e", "acute"), "ê": ("e", "circumflex"), "í": ("i", "acute"),
    "ó": ("o", "acute"), "ô": ("o", "circumflex"), "õ": ("o", "tilde"), "ú": ("u", "acute"),
}
CEDILLA = {"Ç": "C", "ç": "c"}

GAP = 40
top_extent = font["hhea"].ascent


def add_composite(char, comps, base_name):
    name = f"uni{ord(char):04X}"
    g = Glyph()
    g.numberOfContours = -1
    g.components = []
    for comp_name, dx, dy, sx in comps:
        c = GlyphComponent()
        c.glyphName = comp_name
        c.x, c.y = int(round(dx)), int(round(dy))
        c.flags = 0x4  # ROUND_XY_TO_GRID
        if sx != (1, 1):
            c.transform = [[sx[0], 0], [0, sx[1]]]
        g.components.append(c)
    glyf[name] = g
    hmtx[name] = hmtx[base_name]
    font.setGlyphOrder(font.getGlyphOrder() + [name] if name not in font.getGlyphOrder() else font.getGlyphOrder())
    for table in font["cmap"].tables:
        if table.isUnicode():
            table.cmap[ord(char)] = name
    return g


for char, (base, mark) in LETTERS.items():
    base_name = cmap[ord(base)]
    src_name, scale, mirror = MARKS[mark]
    bx0, by0, bx1, by1 = bounds(base_name)
    mx0, my0, mx1, my1 = bounds(src_name)
    sx = -scale if mirror else scale
    sy = scale
    # largura e base do sinal depois da escala
    mw = (mx1 - mx0) * scale
    # posição: centralizado sobre a letra, logo acima do topo dela
    cx = (bx0 + bx1) / 2
    if mirror:
        dx = cx + mw / 2 + mx0 * scale
    else:
        dx = cx - mw / 2 - mx0 * scale
    dy = by1 + GAP - my0 * sy
    add_composite(char, [(base_name, 0, 0, (1, 1)), (src_name, dx, dy, (sx, sy))], base_name)
    top_extent = max(top_extent, int(dy + my1 * sy))

comma = cmap[ord(",")]
for char, base in CEDILLA.items():
    base_name = cmap[ord(base)]
    bx0, by0, bx1, by1 = bounds(base_name)
    cx0, cy0, cx1, cy1 = bounds(comma)
    s = 0.8
    dx = (bx0 + bx1) / 2 - (cx0 + cx1) / 2 * s
    dy = by0 - cy1 * s + 30
    add_composite(char, [(base_name, 0, 0, (1, 1)), (comma, dx, dy, (s, s))], base_name)

# Espaço para os acentos nas maiúsculas (evita corte no topo).
font["hhea"].ascent = max(font["hhea"].ascent, top_extent)
os2 = font["OS/2"]
os2.usWinAscent = max(os2.usWinAscent, top_extent)
os2.sTypoAscender = max(os2.sTypoAscender, top_extent)
font["maxp"].maxComponentElements = max(getattr(font["maxp"], "maxComponentElements", 0), 2)
font["maxp"].maxComponentDepth = max(getattr(font["maxp"], "maxComponentDepth", 0), 1)

font.save(str(out))
print(f"Fonte gerada: {out}")
