# Log dos experimentos de validação com modelos Claude

Chamadas ao Claude: **8**; itens julgados pelos juízes: 0; custo total informado pelo CLI: US$ 0.40.

| método | chamadas |
|---|---|
| M1 Cidade Viva | 0 |
| M2 Controle três atos | 0 |
| M3 Teste-reteste | 8 |
| M4 Juiz causal | 0 |
| M5 Juiz de relatos | 0 |

| modelo | chamadas | custo (US$) |
|---|---|---|
| Haiku 4.5 | 8 | 0.40 |
## Método 3: teste-reteste

| modelo | válidas | cobertura | refs válidas | ligações/ação | Jaccard causal | Jaccard texto | mesmo local | custo médio | latência |
|---|---|---|---|---|---|---|---|---|---|
| Haiku 4.5 | 8/8 | 1.00 ± 0.00 | 1.00 | 1.90 ± 0.43 | 0.58 ± 0.32 | 0.13 ± 0.08 | 0.25 ± 0.43 | 0.050 | 88.4 s |
