# Teste de necessidade causal por intervenção (2026-09-25)

`sim/validacao/necessidade.ts`: para 90 pares (A, B) das 24 sessões de
validação, o juiz (Opus 5.5, que não foi gerador) recebeu a história que leva
a B e estimou a chance de B acontecer se A NÃO tivesse acontecido.
Necessidade = 100 − chance. 23 chamadas, US$ 0,96.

| par (A → B) | n | necessidade média |
|---|---|---|
| ligação direta declarada pelo gerador | 30 | 67 |
| ancestral indireto (2+ ligações) | 30 | 44 |
| não ligado (controle) | 30 | 21 |

AUC direta × não ligado = 0,92; indireta × não ligado = 0,82; direta ×
indireta = 0,74. A gradação direta > indireta > não ligado aparece nos quatro
modelos geradores (Haiku 4.5: 46/35/15; Sonnet 4.6: 63/40/13; Sonnet 5:
69/48/24; Opus 5: 76/55/28).

**O grau de saída de A não prevê a necessidade** (Spearman 0,09): classificar
eventos como núcleo (kernel) pelo número de ligações, como faz o arcos.ts, é
uma aproximação fraca; a intervenção traz informação que o grafo sozinho não
tem. Os modelos maiores declaram ligações com necessidade maior (Opus 5 >
Sonnet 5 > Sonnet 4.6 > Haiku 4.5).

Arquivos: `julgamentos.jsonl` (prompt, resposta e julgamento por par) e
`resumo.json`.
