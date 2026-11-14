import json, glob, collections
perfis = {}
for f in sorted(glob.glob('rel_*.json')):
    perfis[f[4:-5]] = json.load(open(f))
print('perfil       fases  com_erro  travou(>=8)  progresso_medio  mortes')
for k, d in perfis.items():
    er = sum(1 for r in d if r['erros'])
    tr = sum(1 for r in d if r['travadoMax'] >= 8)
    pm = sum(r['progresso'] for r in d) / max(1, len(d))
    mo = sum(r['mortes'] for r in d)
    print(f'{k:12} {len(d):5} {er:9} {tr:12} {pm:15.0f}% {mo:7}')
errs = collections.defaultdict(set)
for k, d in perfis.items():
    for r in d:
        for e in r['erros']:
            errs[e.split(' | ')[0]].add(f"{r['id']}({k})")
print('\nERROS:')
for e, where in errs.items():
    print('-', e, '->', sorted(where)[:8])
stuck = collections.defaultdict(list)
for k, d in perfis.items():
    for r in d:
        if r['travadoMax'] >= 8 and r['progresso'] < 15:
            stuck[r['id']].append(k)
print('\nPOUCO PROGRESSO E PARADO (fase -> perfis):')
for i, ks in sorted(stuck.items(), key=lambda x: -len(x[1])):
    print('-', i, ks)
