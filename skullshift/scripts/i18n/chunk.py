#!/usr/bin/env python3
"""Mostra um trecho dos textos numerados (para traduzir): chunk.py <início> <fim>"""
import json, sys, os
s = json.load(open(os.path.join(os.path.dirname(__file__), '../../src/i18n/strings.json')))
a, b = int(sys.argv[1]), int(sys.argv[2])
for i in range(a, min(b, len(s))):
    print(f"{i}\t{s[i].replace(chr(10), '\\n')}")
