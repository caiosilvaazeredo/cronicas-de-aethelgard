#!/usr/bin/env python3
"""Extrai os textos do jogo (em português) para src/i18n/strings.json.
Literais com ${...} viram moldes com {0}, {1}... A ordem é estável: textos novos entram no fim."""
import re, glob, json, os, sys
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
SKIP_FILES = ('src/i18n/', 'src/ui/pixelart.ts', 'src/game/music.ts', 'src/game/sfx.ts')

# Textos que o filtro automático descarta (uma palavra só, em minúsculas).
EXTRA = ['{0} ouro']

def scan(src):
    """Devolve os literais de string do arquivo (sem comentários), com moldes normalizados."""
    out = []; i = 0; n = len(src)
    while i < n:
        c = src[i]
        if c == '/' and i + 1 < n and src[i + 1] == '/':
            i = src.find('\n', i); i = n if i < 0 else i; continue
        if c == '/' and i + 1 < n and src[i + 1] == '*':
            j = src.find('*/', i + 2); i = n if j < 0 else j + 2; continue
        if c in '\'"':
            j = i + 1; buf = []
            while j < n and src[j] != c and src[j] != '\n':
                if src[j] == '\\' and j + 1 < n:
                    buf.append(src[j:j + 2]); j += 2
                else:
                    buf.append(src[j]); j += 1
            out.append((unesc(''.join(buf)), src[max(0, i - 40):i])); i = j + 1; continue
        if c == '`':
            j = i + 1; buf = []; k = 0
            while j < n and src[j] != '`':
                if src[j] == '\\' and j + 1 < n:
                    buf.append(src[j:j + 2]); j += 2
                elif src[j] == '$' and j + 1 < n and src[j + 1] == '{':
                    d = 1; j += 2; e0 = j
                    while j < n and d:
                        if src[j] == '{': d += 1
                        elif src[j] == '}': d -= 1
                        elif src[j] == '`':  # molde aninhado: pula
                            j = src.find('`', j + 1)
                        j += 1
                    out.extend(scan(src[e0:j - 1]))  # textos dentro da expressão (ternários etc.)
                    buf.append('{%d}' % k); k += 1
                else:
                    buf.append(src[j]); j += 1
            out.append((unesc(''.join(buf)), src[max(0, i - 40):i])); i = j + 1; continue
        i += 1
    return out

def unesc(s):
    return s.replace("\\'", "'").replace('\\"', '"').replace('\\n', '\n').replace('\\`', '`').replace('\\\\', '\\')

LET = r'A-Za-zÀ-ÖØ-öø-ÿ'
def shown(s, before):
    bare = re.sub(r'\{\d+\}', '', s)
    if not re.search('[%s]{2,}' % LET, bare): return False
    if re.search(r"(import|from|require\()\s*$", before): return False
    if re.fullmatch(r'[a-z0-9_\-./:#@%+*=<>!?,;()\[\] ]*', bare) and ' ' not in bare.strip(): return False
    if re.fullmatch(r'[A-Za-z]+\.[A-Za-z.]+', bare): return False            # Sine.easeInOut
    if re.search(r'\d+px|rgba?\(|^#[0-9a-fA-F]{3,8}$|^\s*bold\b|Arial|sans-serif|^skullshift[.:]', s): return False
    if re.fullmatch(r'[a-z][A-Za-z0-9]*', bare): return False                # identificadores (camelCase)
    if re.fullmatch(r'[a-z0-9_\-]+( [a-z0-9_\-]+)*', bare) and not re.search('[À-ÿ]', bare) and len(bare.split()) <= 2 and '_' in bare: return False
    if re.fullmatch(r'[A-Z][a-z]+(?:[A-Z][a-z]+)+', bare): return False      # PascalCase (cenas, eventos)
    if re.fullmatch(r'[A-Z_]{2,}', bare) and '_' in bare: return False       # CONSTANTES_ASSIM
    if s.startswith('keydown-') or s in ('pt-BR', 'Linear', 'LEFT', 'RIGHT', 'UP', 'DOWN', 'SPACE', 'TAB', 'ESC', 'ENTER', 'Enter', 'Escape', 'Shift', 'SELECT', 'OK', 'STEAM', 'SKULLSHIFT'): return False
    return True

def main():
    path = os.path.join(ROOT, 'src/i18n/strings.json')
    old = json.load(open(path)) if os.path.exists(path) else []
    seen = set(old); new = []
    for f in sorted(glob.glob(os.path.join(ROOT, 'src/**/*.ts'), recursive=True)):
        rel = os.path.relpath(f, ROOT)
        if rel.startswith(SKIP_FILES): continue
        for s, before in scan(open(f).read()):
            if s not in seen and shown(s, before):
                seen.add(s); new.append(s)
    for s in EXTRA:
        if s not in seen: seen.add(s); new.append(s)
    allS = old + new
    json.dump(allS, open(path, 'w'), ensure_ascii=False, indent=0)
    print('textos', len(allS), 'novos', len(new), 'palavras', sum(len(s.split()) for s in allS))

main()
