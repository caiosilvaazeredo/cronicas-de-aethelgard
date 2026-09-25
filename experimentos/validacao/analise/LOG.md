# Log dos experimentos de validação com modelos Claude

Chamadas ao Claude: **1056**; itens julgados pelos juízes: 1564; custo total informado pelo CLI: US$ 56.39.

| método | chamadas |
|---|---|
| M1 Cidade Viva | 365 |
| M2 Controle três atos | 187 |
| M3 Teste-reteste | 160 |
| M4 Juiz causal | 234 |
| M5 Juiz de relatos | 110 |

| modelo | chamadas | custo (US$) |
|---|---|---|
| Haiku 4.5 | 144 | 4.19 |
| Opus 4.8 | 172 | 9.35 |
| Opus 5 | 148 | 13.79 |
| Opus 5.5 | 204 | 5.66 |
| Sonnet 4.6 | 141 | 11.46 |
| Sonnet 5 | 247 | 11.95 |

## Métodos 1 e 2: sessões

| sessão | modelo | tipo | cond. | eventos | relatos | tramas | fechadas | razão | falhas | custo |
|---|---|---|---|---|---|---|---|---|---|---|
| porto-das-brumas_claude-cli-claude-haiku-4-5-20251001_informa_6ag_jog-nenhum_r01 | Haiku 4.5 | Cidade Viva | informa | 72 | 41 | 1 | 0 | 1.57 | 0/23 | 0.52 |
| porto-das-brumas_claude-cli-claude-haiku-4-5-20251001_nao-informa_6ag_jog-nenhum_r01 | Haiku 4.5 | Cidade Viva | nao-informa | 72 | 52 | 2 | 1 | 1.51 | 0/24 | 0.58 |
| porto-das-brumas_claude-cli-claude-opus-5_informa_6ag_jog-nenhum_r01 | Opus 5 | Cidade Viva | informa | 72 | 56 | 1 | 0 | 2.22 | 0/23 | 2.03 |
| porto-das-brumas_claude-cli-claude-opus-5_nao-informa_6ag_jog-nenhum_r01 | Opus 5 | Cidade Viva | nao-informa | 72 | 49 | 1 | 0 | 2.36 | 0/23 | 1.95 |
| porto-das-brumas_claude-cli-claude-sonnet-4-6_informa_6ag_jog-nenhum_r01 | Sonnet 4.6 | Cidade Viva | informa | 72 | 38 | 1 | 0 | 1.62 | 0/21 | 1.23 |
| porto-das-brumas_claude-cli-claude-sonnet-4-6_nao-informa_6ag_jog-nenhum_r01 | Sonnet 4.6 | Cidade Viva | nao-informa | 72 | 35 | 1 | 0 | 1.93 | 0/21 | 1.24 |
| porto-das-brumas_claude-cli-claude-sonnet-5_informa_6ag_jog-nenhum_r01 | Sonnet 5 | Cidade Viva | informa | 72 | 37 | 2 | 1 | 1.64 | 0/24 | 1.45 |
| porto-das-brumas_claude-cli-claude-sonnet-5_nao-informa_6ag_jog-nenhum_r01 | Sonnet 5 | Cidade Viva | nao-informa | 72 | 43 | 1 | 0 | 1.47 | 0/23 | 1.38 |
| vale-silente_claude-cli-claude-haiku-4-5-20251001_informa_6ag_jog-nenhum_r01 | Haiku 4.5 | Cidade Viva | informa | 72 | 33 | 5 | 2 | 1.11 | 0/24 | 0.40 |
| vale-silente_claude-cli-claude-haiku-4-5-20251001_nao-informa_6ag_jog-nenhum_r01 | Haiku 4.5 | Cidade Viva | nao-informa | 72 | 41 | 1 | 0 | 1.26 | 0/22 | 0.37 |
| vale-silente_claude-cli-claude-opus-5_informa_6ag_jog-nenhum_r01 | Opus 5 | Cidade Viva | informa | 72 | 45 | 1 | 0 | 2.04 | 0/23 | 1.97 |
| vale-silente_claude-cli-claude-opus-5_nao-informa_6ag_jog-nenhum_r01 | Opus 5 | Cidade Viva | nao-informa | 72 | 42 | 1 | 0 | 2.18 | 0/23 | 1.87 |
| vale-silente_claude-cli-claude-sonnet-4-6_informa_6ag_jog-nenhum_r01 | Sonnet 4.6 | Cidade Viva | informa | 72 | 39 | 1 | 0 | 1.86 | 0/21 | 1.77 |
| vale-silente_claude-cli-claude-sonnet-4-6_nao-informa_6ag_jog-nenhum_r01 | Sonnet 4.6 | Cidade Viva | nao-informa | 72 | 42 | 1 | 0 | 1.94 | 0/22 | 1.79 |
| vale-silente_claude-cli-claude-sonnet-5_informa_6ag_jog-nenhum_r01 | Sonnet 5 | Cidade Viva | informa | 72 | 47 | 2 | 1 | 1.64 | 0/24 | 1.44 |
| vale-silente_claude-cli-claude-sonnet-5_nao-informa_6ag_jog-nenhum_r01 | Sonnet 5 | Cidade Viva | nao-informa | 72 | 45 | 2 | 1 | 1.62 | 0/24 | 1.32 |
| porto-das-brumas_claude-cli-claude-haiku-4-5-20251001_controle-tres-atos_jog-investigador_r01 | Haiku 4.5 | três atos | nao-informa | 9 | 0 | 1 | 0 | 1.67 | 1/20 | 0.63 |
| porto-das-brumas_claude-cli-claude-opus-5_controle-tres-atos_jog-investigador_r01 | Opus 5 | três atos | nao-informa | 12 | 0 | 1 | 0 | 2.33 | 0/24 | 2.38 |
| porto-das-brumas_claude-cli-claude-sonnet-4-6_controle-tres-atos_jog-investigador_r01 | Sonnet 4.6 | três atos | nao-informa | 12 | 0 | 1 | 0 | 1.58 | 0/24 | 1.30 |
| porto-das-brumas_claude-cli-claude-sonnet-5_controle-tres-atos_jog-investigador_r01 | Sonnet 5 | três atos | nao-informa | 12 | 0 | 1 | 0 | 1.25 | 0/24 | 1.03 |
| vale-silente_claude-cli-claude-haiku-4-5-20251001_controle-tres-atos_jog-investigador_r01 | Haiku 4.5 | três atos | nao-informa | 11 | 0 | 1 | 0 | 2.36 | 1/24 | 0.54 |
| vale-silente_claude-cli-claude-opus-5_controle-tres-atos_jog-investigador_r01 | Opus 5 | três atos | nao-informa | 12 | 0 | 1 | 0 | 2.50 | 0/24 | 2.51 |
| vale-silente_claude-cli-claude-sonnet-4-6_controle-tres-atos_jog-investigador_r01 | Sonnet 4.6 | três atos | nao-informa | 12 | 0 | 1 | 0 | 1.67 | 0/24 | 1.50 |
| vale-silente_claude-cli-claude-sonnet-5_controle-tres-atos_jog-investigador_r01 | Sonnet 5 | três atos | nao-informa | 11 | 0 | 1 | 0 | 1.36 | 0/23 | 1.17 |

A vs B: `{"n_A": 8, "n_B": 8, "mediana_A": 0.0, "mediana_B": 0.0, "media_A": 0.175, "media_B": 0.125, "U": 35.0, "p": 0.746885633390364, "tramas_A": 1.75, "tramas_B": 1.25}`

Cidade Viva vs controle: `{"n_cv": 16, "n_controle": 8, "prop_cv": 0.15, "prop_controle": 0.0, "U_prop": 84.0, "p_prop": 0.09126743803551349, "razao_cv": 1.75, "razao_controle": 1.8409090909090908, "U_razao": 55.0, "p_razao": 0.6024668308963874, "tramas_cv": 1.5, "tramas_controle": 1.0}`

## Modelo nulo

`{"tramas": {"cidadeViva": {"n": 16, "significativas": 5, "acimaDoNulo": 5, "obsMedio": 1.5, "nuloMedio": 1.04925}, "controle": {"n": 8, "significativas": 0, "acimaDoNulo": 0, "obsMedio": 1.0, "nuloMedio": 1.0}}, "proporcaoFechadas": {"cidadeViva": {"n": 16, "significativas": 4, "acimaDoNulo": 5, "obsMedio": 0.15, "nuloMedio": 0.028249999999999997}, "controle": {"n": 8, "significativas": 0, "acimaDoNulo": 0, "obsMedio": 0.0, "nuloMedio": 0.0}}, "fracaoKernel": {"cidadeViva": {"n": 16, "significativas": 2, "acimaDoNulo": 11, "obsMedio": 0.9930555555555556, "nuloMedio": 0.999185763888889}, "controle": {"n": 8, "significativas": 0, "acimaDoNulo": 0, "obsMedio": 1.0, "nuloMedio": 1.0}}, "abertasMediaUltimoTerco": {"cidadeViva": {"n": 16, "significativas": 3, "acimaDoNulo": 6, "obsMedio": 1.25, "nuloMedio": 1.0222499999999994}, "controle": {"n": 8, "significativas": 0, "acimaDoNulo": 0, "obsMedio": 1.0, "nuloMedio": 1.0}}}`

## Método 3: teste-reteste

| modelo | válidas | cobertura | refs válidas | ligações/ação | Jaccard causal | Jaccard texto | mesmo local | custo médio | latência |
|---|---|---|---|---|---|---|---|---|---|
| Haiku 4.5 | 32/32 | 1.00 ± 0.00 | 1.00 | 1.64 ± 0.42 | 0.66 ± 0.33 | 0.13 ± 0.08 | 0.45 ± 0.50 | 0.050 | 95.9 s |
| Sonnet 4.6 | 32/32 | 1.00 ± 0.00 | 1.00 | 1.83 ± 0.24 | 0.72 ± 0.30 | 0.14 ± 0.09 | 0.62 ± 0.49 | 0.105 | 94.9 s |
| Sonnet 5 | 32/32 | 1.00 ± 0.00 | 1.00 | 1.81 ± 0.33 | 0.71 ± 0.30 | 0.20 ± 0.12 | 0.67 ± 0.47 | 0.069 | 49.8 s |
| Opus 5 | 32/32 | 1.00 ± 0.00 | 1.00 | 2.06 ± 0.34 | 0.70 ± 0.28 | 0.18 ± 0.12 | 0.65 ± 0.48 | 0.057 | 29.0 s |
| Opus 5.5 | 32/32 | 1.00 ± 0.00 | 1.00 | 2.05 ± 0.39 | 0.79 ± 0.26 | 0.25 ± 0.15 | 0.74 ± 0.44 | 0.043 | 19.3 s |

## Método 4: juiz cego do autorrelato causal

```json
{
 "chamadas": 234,
 "falhasChamada": 0,
 "itensJulgados": 924,
 "porJuiz": {
  "claude-opus-4-8": {
   "julgados": 462,
   "reais": 309,
   "distratores": 153,
   "notaReais": {
    "n": 309,
    "media": 4.320388349514563,
    "dp": 0.7671873774193745
   },
   "notaDistratores": {
    "n": 153,
    "media": 3.2287581699346406,
    "dp": 1.054418847331152
   },
   "plausivelReais": 0.9676375404530745,
   "icPlausivelReais": [
    0.9414618846874572,
    0.9823283017839075
   ],
   "plausivelDistratores": 0.7254901960784313,
   "icPlausivelDistratores": [
    0.6499065559213393,
    0.7900277472227246
   ],
   "auc": 0.7853501702730715,
   "p_reais_maior": 2.3823392692516053e-26,
   "porGerador": {
    "claude-haiku-4-5-20251001": {
     "reais": 40,
     "distratores": 20,
     "notaReais": {
      "n": 40,
      "media": 4.1,
      "dp": 0.9281909617845141
     },
     "notaDistratores": {
      "n": 20,
      "media": 2.95,
      "dp": 0.8870412083230168
     },
     "plausivelReais": 0.9,
     "icPlausivelReais": [
      0.7694792561952611,
      0.9604211124044252
     ],
     "auc": 0.806875
    },
    "claude-haiku-4-5-20251001 [controle]": {
     "reais": 40,
     "distratores": 15,
     "notaReais": {
      "n": 40,
      "media": 3.85,
      "dp": 0.8929926637077695
     },
     "notaDistratores": {
      "n": 15,
      "media": 2.933333333333333,
      "dp": 1.162919151265879
     },
     "plausivelReais": 0.9,
     "icPlausivelReais": [
      0.7694792561952611,
      0.9604211124044252
     ],
     "auc": 0.7283333333333334
    },
    "claude-opus-5": {
     "reais": 40,
     "distratores": 20,
     "notaReais": {
      "n": 40,
      "media": 4.525,
      "dp": 0.6788942744621109
     },
     "notaDistratores": {
      "n": 20,
      "media": 3.4,
      "dp": 0.7539370349250518
     },
     "plausivelReais": 0.975,
     "icPlausivelReais": [
      0.8711834051199223,
      0.9955732825922052
     ],
     "auc": 0.863125
    },
    "claude-opus-5 [controle]": {
     "reais": 40,
     "distratores": 18,
     "notaReais": {
      "n": 40,
      "media": 4.1,
      "dp": 0.6324555320336759
     },
     "notaDistratores": {
      "n": 18,
      "media": 3.5555555555555554,
      "dp": 0.9217771979249535
     },
     "plausivelReais": 1.0,
     "icPlausivelReais": [
      0.9123754607496077,
      1.0
     ],
     "auc": 0.6611111111111111
    },
    "claude-sonnet-4-6": {
     "reais": 40,
     "distratores": 20,
     "notaReais": {
      "n": 40,
      "media": 4.4,
      "dp": 0.6324555320336759
     },
     "notaDistratores": {
      "n": 20,
      "media": 2.6,
      "dp": 1.0462967275611939
     },
     "plausivelReais": 1.0,
     "icPlausivelReais": [
      0.9123754607496077,
      1.0
     ],
     "auc": 0.9075
    },
    "claude-sonnet-4-6 [controle]": {
     "reais": 39,
     "distratores": 20,
     "notaReais": {
      "n": 39,
      "media": 4.538461538461538,
      "dp": 0.6002698448528596
     },
     "notaDistratores": {
      "n": 20,
      "media": 3.65,
      "dp": 0.9880869341680844
     },
     "plausivelReais": 1.0,
     "icPlausivelReais": [
      0.9103301463997611,
      1.0
     ],
     "auc": 0.7557692307692307
    },
    "claude-sonnet-5": {
     "reais": 40,
     "distratores": 20,
     "notaReais": {
      "n": 40,
      "media": 4.6,
      "dp": 0.7442084075352506
     },
     "notaDistratores": {
      "n": 20,
      "media": 2.75,
      "dp": 1.164157703189193
     },
     "plausivelReais": 0.975,
     "icPlausivelReais": [
      0.8711834051199223,
      0.9955732825922052
     ],
     "auc": 0.9
    },
    "claude-sonnet-5 [controle]": {
     "reais": 30,
     "distratores": 20,
     "notaReais": {
      "n": 30,
      "media": 4.5,
      "dp": 0.6297235299224025
     },
     "notaDistratores": {
      "n": 20,
      "media": 3.95,
      "dp": 0.8255779474818964
     },
     "plausivelReais": 1.0,
     "icPlausivelReais": [
      0.8864829086095221,
      1.0
     ],
     "auc": 0.6891666666666667
    }
   },
   "semAvaliacao": 0
  },
  "claude-opus-5-5": {
   "julgados": 462,
   "reais": 309,
   "distratores": 153,
   "notaReais": {
    "n": 309,
    "media": 4.171521035598706,
    "dp": 0.8862392913522771
   },
   "notaDistratores": {
    "n": 153,
    "media": 2.9215686274509802,
    "dp": 0.9902778169780244
   },
   "plausivelReais": 0.9352750809061489,
   "icPlausivelReais": [
    0.9021464357593588,
    0.9577136340011846
   ],
   "plausivelDistratores": 0.6209150326797386,
   "icPlausivelDistratores": [
    0.5419662906820014,
    0.6939405095546706
   ],
   "auc": 0.8138947056708336,
   "p_reais_maior": 1.4423688218530638e-30,
   "porGerador": {
    "claude-haiku-4-5-20251001": {
     "reais": 40,
     "distratores": 20,
     "notaReais": {
      "n": 40,
      "media": 3.875,
      "dp": 1.0174755084307485
     },
     "notaDistratores": {
      "n": 20,
      "media": 2.25,
      "dp": 0.6386663736585051
     },
     "plausivelReais": 0.875,
     "icPlausivelReais": [
      0.7388757932976187,
      0.9454058022645873
     ],
     "auc": 0.885
    },
    "claude-haiku-4-5-20251001 [controle]": {
     "reais": 40,
     "distratores": 15,
     "notaReais": {
      "n": 40,
      "media": 3.55,
      "dp": 1.0114726506816303
     },
     "notaDistratores": {
      "n": 15,
      "media": 2.8666666666666667,
      "dp": 0.8338093878327919
     },
     "plausivelReais": 0.775,
     "icPlausivelReais": [
      0.6249660359590695,
      0.8768404674532148
     ],
     "auc": 0.6916666666666667
    },
    "claude-opus-5": {
     "reais": 40,
     "distratores": 20,
     "notaReais": {
      "n": 40,
      "media": 4.475,
      "dp": 0.6788942744621108
     },
     "notaDistratores": {
      "n": 20,
      "media": 2.95,
      "dp": 0.7591546545162482
     },
     "plausivelReais": 1.0,
     "icPlausivelReais": [
      0.9123754607496077,
      1.0
     ],
     "auc": 0.911875
    },
    "claude-opus-5 [controle]": {
     "reais": 40,
     "dis
```

## Método 5: fidelidade dos relatos

```json
{
 "chamadas": 110,
 "falhasChamada": 0,
 "itensJulgados": 640,
 "porJuiz": {
  "claude-opus-4-8": {
   "julgados": 320,
   "categorias": {
    "fiel": 0.546875,
    "omissao": 0.0875,
    "distorcao": 0.3,
    "contradicao": 0.04375,
    "invencao": 0.021875
   },
   "fidelidade": {
    "n": 320,
    "media": 3.5875,
    "dp": 1.1549946056951752
   },
   "porGerador": {
    "claude-haiku-4-5-20251001": {
     "n": 80,
     "categorias": {
      "fiel": 0.4375,
      "omissao": 0.1375,
      "distorcao": 0.375,
      "contradicao": 0.0125,
      "invencao": 0.0375
     },
     "fidelidade": {
      "n": 80,
      "media": 3.4,
      "dp": 1.1092248405239773
     },
     "naoFiel": 0.5625
    },
    "claude-opus-5": {
     "n": 80,
     "categorias": {
      "fiel": 0.6,
      "omissao": 0.0625,
      "distorcao": 0.2375,
      "contradicao": 0.1,
      "invencao": 0.0
     },
     "fidelidade": {
      "n": 80,
      "media": 3.625,
      "dp": 1.2566279974800152
     },
     "naoFiel": 0.4
    },
    "claude-sonnet-4-6": {
     "n": 80,
     "categorias": {
      "fiel": 0.575,
      "omissao": 0.0375,
      "distorcao": 0.3125,
      "contradicao": 0.0375,
      "invencao": 0.0375
     },
     "fidelidade": {
      "n": 80,
      "media": 3.6,
      "dp": 1.186421062148199
     },
     "naoFiel": 0.425
    },
    "claude-sonnet-5": {
     "n": 80,
     "categorias": {
      "fiel": 0.575,
      "omissao": 0.1125,
      "distorcao": 0.275,
      "contradicao": 0.025,
      "invencao": 0.0125
     },
     "fidelidade": {
      "n": 80,
      "media": 3.725,
      "dp": 1.0551261248023889
     },
     "naoFiel": 0.425
    }
   },
   "semAvaliacao": 0
  },
  "claude-opus-5-5": {
   "julgados": 320,
   "categorias": {
    "fiel": 0.58125,
    "omissao": 0.13125,
    "distorcao": 0.21875,
    "contradicao": 0.053125,
    "invencao": 0.015625
   },
   "fidelidade": {
    "n": 320,
    "media": 3.55,
    "dp": 1.1214634415725282
   },
   "porGerador": {
    "claude-haiku-4-5-20251001": {
     "n": 80,
     "categorias": {
      "fiel": 0.575,
      "omissao": 0.2,
      "distorcao": 0.175,
      "contradicao": 0.0125,
      "invencao": 0.0375
     },
     "fidelidade": {
      "n": 80,
      "media": 3.4625,
      "dp": 0.9405593541792976
     },
     "naoFiel": 0.425
    },
    "claude-opus-5": {
     "n": 80,
     "categorias": {
      "fiel": 0.5625,
      "omissao": 0.1125,
      "distorcao": 0.2375,
      "contradicao": 0.0875,
      "invencao": 0.0
     },
     "fidelidade": {
      "n": 80,
      "media": 3.5625,
      "dp": 1.2613409581307615
     },
     "naoFiel": 0.4375
    },
    "claude-sonnet-4-6": {
     "n": 80,
     "categorias": {
      "fiel": 0.5375,
      "omissao": 0.1125,
      "distorcao": 0.275,
      "contradicao": 0.05,
      "invencao": 0.025
     },
     "fidelidade": {
      "n": 80,
      "media": 3.4,
      "dp": 1.1757033984014242
     },
     "naoFiel": 0.4625
    },
    "claude-sonnet-5": {
     "n": 80,
     "categorias": {
      "fiel": 0.65,
      "omissao": 0.1,
      "distorcao": 0.1875,
      "contradicao": 0.0625,
      "invencao": 0.0
     },
     "fidelidade": {
      "n": 80,
      "media": 3.775,
      "dp": 1.0670555725625115
     },
     "naoFiel": 0.35
    }
   },
   "semAvaliacao": 0
  }
 },
 "concordancia": {
  "juizes": [
   "claude-opus-4-8",
   "claude-opus-5-5"
  ],
  "itens": 320,
  "kappaCategoria": 0.6057132666461309,
  "kappaFielVsNao": 0.6382387941293138,
  "concordanciaCategoria": 0.7625,
  "spearmanFidelidade": 0.7785695388110215
 },
 "custoUsd": 6.399395200000002
}
```
