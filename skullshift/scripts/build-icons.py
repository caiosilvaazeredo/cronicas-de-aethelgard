#!/usr/bin/env python3
"""Ícones do app (PWA e computador) a partir do avatar da caveira.

Uso: python3 scripts/build-icons.py   (depois de importar os sprites com import-assets.sh)
Gera public/icons/. Como o avatar é do Tiny Swords (não pode ser redistribuído solto), a pasta
fica fora do git, igual a public/assets.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'public' / 'assets' / 'chars' / 'skull_avatar.png'
OUT = ROOT / 'public' / 'icons'
BG = (14, 26, 43, 255)
RIM = (255, 224, 102, 255)


def icon(size: int, pad: float, rounded: bool) -> Image.Image:
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if rounded:
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=size // 5, fill=BG, outline=RIM, width=max(2, size // 48))
    else:
        d.rectangle([0, 0, size, size], fill=BG)
    av = Image.open(SRC).convert('RGBA')
    av = av.crop(av.getbbox())
    inner = int(size * (1 - 2 * pad))
    k = inner / max(av.size)
    av = av.resize((max(1, round(av.width * k)), max(1, round(av.height * k))), Image.NEAREST)
    im.alpha_composite(av, ((size - av.width) // 2, (size - av.height) // 2))
    return im


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    icon(192, 0.12, True).save(OUT / 'icon-192.png')
    icon(512, 0.12, True).save(OUT / 'icon-512.png')
    # "maskable": o sistema recorta em círculo/gota, então a caveira fica bem no meio.
    icon(512, 0.22, False).save(OUT / 'maskable-512.png')
    icon(180, 0.14, False).save(OUT / 'apple-touch-icon.png')
    print('ícones em', OUT)


if __name__ == '__main__':
    main()
