# Log dos experimentos de validação com modelos Claude

Chamadas ao Claude: **506**; itens julgados pelos juízes: 0; custo total informado pelo CLI: US$ 28.42.

| método | chamadas |
|---|---|
| M1 Cidade Viva | 178 |
| M2 Controle três atos | 187 |
| M3 Teste-reteste | 141 |
| M4 Juiz causal | 0 |
| M5 Juiz de relatos | 0 |

| modelo | chamadas | custo (US$) |
|---|---|---|
| Haiku 4.5 | 144 | 4.19 |
| Opus 5 | 48 | 5.59 |
| Opus 5.5 | 24 | 1.06 |
| Sonnet 4.6 | 141 | 11.46 |
| Sonnet 5 | 149 | 6.13 |

## Métodos 1 e 2: sessões

| sessão | modelo | tipo | cond. | eventos | relatos | tramas | fechadas | razão | falhas | custo |
|---|---|---|---|---|---|---|---|---|---|---|
| porto-das-brumas_claude-cli-claude-haiku-4-5-20251001_informa_6ag_jog-nenhum_r01 | Haiku 4.5 | Cidade Viva | informa | 72 | 41 | 1 | 0 | 1.57 | 0/23 | 0.52 |
| porto-das-brumas_claude-cli-claude-haiku-4-5-20251001_nao-informa_6ag_jog-nenhum_r01 | Haiku 4.5 | Cidade Viva | nao-informa | 72 | 52 | 2 | 1 | 1.51 | 0/24 | 0.58 |
| porto-das-brumas_claude-cli-claude-sonnet-4-6_informa_6ag_jog-nenhum_r01 | Sonnet 4.6 | Cidade Viva | informa | 72 | 38 | 1 | 0 | 1.62 | 0/21 | 1.23 |
| porto-das-brumas_claude-cli-claude-sonnet-4-6_nao-informa_6ag_jog-nenhum_r01 | Sonnet 4.6 | Cidade Viva | nao-informa | 72 | 35 | 1 | 0 | 1.93 | 0/21 | 1.24 |
| vale-silente_claude-cli-claude-haiku-4-5-20251001_informa_6ag_jog-nenhum_r01 | Haiku 4.5 | Cidade Viva | informa | 72 | 33 | 5 | 2 | 1.11 | 0/24 | 0.40 |
| vale-silente_claude-cli-claude-haiku-4-5-20251001_nao-informa_6ag_jog-nenhum_r01 | Haiku 4.5 | Cidade Viva | nao-informa | 72 | 41 | 1 | 0 | 1.26 | 0/22 | 0.37 |
| vale-silente_claude-cli-claude-sonnet-4-6_informa_6ag_jog-nenhum_r01 | Sonnet 4.6 | Cidade Viva | informa | 72 | 39 | 1 | 0 | 1.86 | 0/21 | 1.77 |
| vale-silente_claude-cli-claude-sonnet-4-6_nao-informa_6ag_jog-nenhum_r01 | Sonnet 4.6 | Cidade Viva | nao-informa | 72 | 42 | 1 | 0 | 1.94 | 0/22 | 1.79 |
| porto-das-brumas_claude-cli-claude-haiku-4-5-20251001_controle-tres-atos_jog-investigador_r01 | Haiku 4.5 | três atos | nao-informa | 9 | 0 | 1 | 0 | 1.67 | 1/20 | 0.63 |
| porto-das-brumas_claude-cli-claude-opus-5_controle-tres-atos_jog-investigador_r01 | Opus 5 | três atos | nao-informa | 12 | 0 | 1 | 0 | 2.33 | 0/24 | 2.38 |
| porto-das-brumas_claude-cli-claude-sonnet-4-6_controle-tres-atos_jog-investigador_r01 | Sonnet 4.6 | três atos | nao-informa | 12 | 0 | 1 | 0 | 1.58 | 0/24 | 1.30 |
| porto-das-brumas_claude-cli-claude-sonnet-5_controle-tres-atos_jog-investigador_r01 | Sonnet 5 | três atos | nao-informa | 12 | 0 | 1 | 0 | 1.25 | 0/24 | 1.03 |
| vale-silente_claude-cli-claude-haiku-4-5-20251001_controle-tres-atos_jog-investigador_r01 | Haiku 4.5 | três atos | nao-informa | 11 | 0 | 1 | 0 | 2.36 | 1/24 | 0.54 |
| vale-silente_claude-cli-claude-opus-5_controle-tres-atos_jog-investigador_r01 | Opus 5 | três atos | nao-informa | 12 | 0 | 1 | 0 | 2.50 | 0/24 | 2.51 |
| vale-silente_claude-cli-claude-sonnet-4-6_controle-tres-atos_jog-investigador_r01 | Sonnet 4.6 | três atos | nao-informa | 12 | 0 | 1 | 0 | 1.67 | 0/24 | 1.50 |
| vale-silente_claude-cli-claude-sonnet-5_controle-tres-atos_jog-investigador_r01 | Sonnet 5 | três atos | nao-informa | 11 | 0 | 1 | 0 | 1.36 | 0/23 | 1.17 |

A vs B: `{"n_A": 4, "n_B": 4, "mediana_A": 0.0, "mediana_B": 0.0, "media_A": 0.1, "media_B": 0.125, "U": 7.5, "p": 1.0, "tramas_A": 2.0, "tramas_B": 1.25}`

Cidade Viva vs controle: `{"n_cv": 8, "n_controle": 8, "prop_cv": 0.1125, "prop_controle": 0.0, "U_prop": 40.0, "p_prop": 0.17090352023079747, "razao_cv": 1.6024305555555554, "razao_controle": 1.8409090909090908, "U_razao": 23.0, "p_razao": 0.3716774469130736, "tramas_cv": 1.625, "tramas_controle": 1.0}`

## Modelo nulo

`{"tramas": {"cidadeViva": {"n": 7, "significativas": 2, "acimaDoNulo": 2, "obsMedio": 1.7142857142857142, "nuloMedio": 1.1064285714285715}, "controle": {"n": 8, "significativas": 0, "acimaDoNulo": 0, "obsMedio": 1.0, "nuloMedio": 1.0}}, "proporcaoFechadas": {"cidadeViva": {"n": 7, "significativas": 1, "acimaDoNulo": 2, "obsMedio": 0.1285714285714286, "nuloMedio": 0.05678571428571429}, "controle": {"n": 8, "significativas": 0, "acimaDoNulo": 0, "obsMedio": 0.0, "nuloMedio": 0.0}}, "fracaoKernel": {"cidadeViva": {"n": 7, "significativas": 1, "acimaDoNulo": 3, "obsMedio": 0.990079365079365, "nuloMedio": 0.9987301587301589}, "controle": {"n": 8, "significativas": 0, "acimaDoNulo": 0, "obsMedio": 1.0, "nuloMedio": 1.0}}, "abertasMediaUltimoTerco": {"cidadeViva": {"n": 7, "significativas": 2, "acimaDoNulo": 6, "obsMedio": 1.542857142857143, "nuloMedio": 1.0494285714285712}, "controle": {"n": 8, "significativas": 0, "acimaDoNulo": 0, "obsMedio": 1.0, "nuloMedio": 1.0}}}`

## Método 3: teste-reteste

| modelo | válidas | cobertura | refs válidas | ligações/ação | Jaccard causal | Jaccard texto | mesmo local | custo médio | latência |
|---|---|---|---|---|---|---|---|---|---|
| Haiku 4.5 | 32/32 | 1.00 ± 0.00 | 1.00 | 1.64 ± 0.42 | 0.66 ± 0.33 | 0.13 ± 0.08 | 0.45 ± 0.50 | 0.050 | 95.9 s |
| Sonnet 4.6 | 32/32 | 1.00 ± 0.00 | 1.00 | 1.83 ± 0.24 | 0.72 ± 0.30 | 0.14 ± 0.09 | 0.62 ± 0.49 | 0.105 | 94.9 s |
| Sonnet 5 | 29/29 | 1.00 ± 0.00 | 1.00 | 1.77 ± 0.31 | 0.73 ± 0.30 | 0.20 ± 0.12 | 0.69 ± 0.46 | 0.069 | 49.6 s |
| Opus 5 | 24/24 | 1.00 ± 0.00 | 1.00 | 1.96 ± 0.24 | 0.70 ± 0.28 | 0.17 ± 0.12 | 0.67 ± 0.47 | 0.060 | 30.2 s |
| Opus 5.5 | 24/24 | 1.00 ± 0.00 | 1.00 | 2.06 ± 0.43 | 0.78 ± 0.26 | 0.22 ± 0.12 | 0.74 ± 0.44 | 0.044 | 19.8 s |
