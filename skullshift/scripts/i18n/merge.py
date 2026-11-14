#!/usr/bin/env python3
"""Junta as traduções numeradas (scripts/i18n/tr/<idioma>/*.txt, linhas "índice<TAB>tradução")
em src/i18n/locales/<idioma>.json e confere se os moldes {0}, {1}... batem."""
import json, glob, os, re, sys
H = os.path.dirname(__file__)
src = json.load(open(os.path.join(H, '../../src/i18n/strings.json')))
for d in sorted(glob.glob(os.path.join(H, 'tr/*/'))):
    lang = os.path.basename(d.rstrip('/')); out = {}; bad = 0
    for f in sorted(glob.glob(d + '*.txt')):
        for line in open(f, encoding='utf-8'):
            line = line.rstrip('\n')
            if not line.strip() or '\t' not in line: continue
            i, t = line.split('\t', 1)
            if not i.strip().isdigit() or int(i) >= len(src): bad += 1; continue
            pt = src[int(i)]; t = t.replace('\\n', '\n')
            if sorted(re.findall(r'\{\d+\}', pt)) != sorted(re.findall(r'\{\d+\}', t)):
                print(f'  [{lang}] molde diferente em {i}: {pt!r} -> {t!r}'); bad += 1; continue
            out[pt] = t
    json.dump(out, open(os.path.join(H, f'../../src/i18n/locales/{lang}.json'), 'w'), ensure_ascii=False, indent=0, sort_keys=True)
    done = sum(1 for s in src if s in out)
    print(f'{lang}: {done}/{len(src)} traduzidos, {bad} com problema')
