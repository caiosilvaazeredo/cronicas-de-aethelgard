#!/usr/bin/env python3
"""Mostra textos de interface (fora dos diálogos da história) numerados: chunk_ui.py <início> <fim>"""
import json, sys, os
H = os.path.dirname(__file__)
s = json.load(open(os.path.join(H, '../../src/i18n/strings.json')))
story = set(json.load(open(os.path.join(H, 'story_idx.json'))))
ui = [i for i in range(len(s)) if i not in story]
a, b = int(sys.argv[1]), int(sys.argv[2])
print('# total UI', len(ui))
for i in ui[a:b]:
    print(f"{i}\t{s[i].replace(chr(10), '\\n')}")
