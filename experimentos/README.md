# Sessões de teste com modelos reais (2026-09-24)

Sessões curtas para validar o pipeline com modelos reais. **Não são resultado
estatístico**: uma sessão por condição, durações curtas. Cada pasta tem as
exportações completas (eventos, relatos, métricas, tramas, narrações e todas
as chamadas com prompt e resposta crua) e um `LOG.md` gerado por
`npm run relatorio`.

| pasta | modelo | sessão | dias | chamadas | falha de estrutura | tempo/dia | custo | tramas (fechadas) | razão de amarração |
|---|---|---|---|---|---|---|---|---|---|
| 2026-09-24-claude-sonnet-5 | claude-sonnet-5 via `claude -p` | Porto das Brumas, condição A, 6 agentes, jogador investigador | 15 | 43 | 0% | 71 s | US$ 1,96 | 1 (0) | 1,83 |
| 2026-09-24-claude-sonnet-5 | claude-sonnet-5 via `claude -p` | Vale Silente, condição B, 6 agentes, sem jogador | 15 | 27 | 0% | 54 s | US$ 1,36 | 2 (1) | 1,78 |
| 2026-09-24-claude-sonnet-5 | claude-sonnet-5 via `claude -p` | controle de três atos, Porto das Brumas, jogador investigador | 15 | 31 | 0% (1,13 tentativas médias) | 37 s | US$ 1,28 | 3 (1) | 1,47 |
| 2026-09-24-gemini-3.5-flash-lite | gemini-3.5-flash-lite (API, plano gratuito) | Porto das Brumas, condição A, 6 agentes, jogador investigador | 5 | 12 | 0% | 3,7 s | plano gratuito | 3 (0) | 1,26 |
| 2026-09-24-ollama-qwen2.5-1.5b | qwen2.5:1.5b local (Ollama, CPU) | Vale Silente, condição A, 4 agentes, jogador investigador | 5 | 10 | 0% | 40 s | US$ 0 | 0 | 0 |

Observações:

- **Claude (claude-sonnet-5)**: liga muito os eventos (razão de amarração perto
  de 1,8; nenhum `causadoPor` descartado nas sessões da Cidade Viva). Com 6
  agentes numa cidade pequena, quase tudo vira uma única trama grande que não
  para de receber eventos; no Porto das Brumas ela nunca ficou estável em 15
  dias. Os relatos já mostram versões seletivas e distorcidas do evento real
  (material para o experimento de contradição). O CLI não aceita temperatura
  nem semente, o que está registrado em cada chamada.
- **Gemini 3.5 Flash**: uma sessão de 10 dias parou no dia 7 porque a chave é do
  plano gratuito (20 chamadas por dia por modelo; erro 429 RESOURCE_EXHAUSTED).
  As respostas dos dias 1 a 6 ficaram no cache local e a sessão pode ser
  retomada sem custo quando a cota renovar. O Flash-Lite, com cota separada,
  completou 5 dias.
- **qwen2.5:1.5b local**: JSON sempre válido, mas o modelo é pequeno demais:
  nunca preencheu `causadoPor` (nenhuma trama), usou ids de agente e de local
  inválidos (16 ações e 8 locais descartados) e o jogador escreveu ações vagas.
  Para os experimentos, use modelos locais de 7B ou mais.

# Validação com modelos Claude (2026-09-24 e 25)

Pasta `validacao/`: **1.056 chamadas bem-sucedidas** a seis modelos Claude pelo
`claude -p` (Haiku 4.5, Sonnet 4.6, Sonnet 5, Opus 4.8, Opus 5, Opus 5.5),
1.564 itens julgados, US$ 56,39. Cinco métodos:

| método | pasta | chamadas |
|---|---|---|
| 1. Cidade Viva multimodelo (4 modelos × A/B × 2 mundos, 12 dias) | `validacao/v1-cidade-viva-claude/` | 365 |
| 2. Controle de três atos (mesmos 4 modelos como mestre) | `validacao/v2-controle-tres-atos-claude/` | 187 |
| 3. Teste-reteste (4 estados × 5 modelos × 8 repetições) | `validacao/m3-reteste/` | 160 |
| 4. Juiz cego do autorrelato causal (462 pares, 2 juízes) | `validacao/m4-juiz-causal/` | 234 |
| 5. Fidelidade dos relatos (320 relatos, 2 juízes) | `validacao/m5-juiz-relatos/` | 110 |
| complemento: modelo nulo (500 reembaralhamentos por sessão) | `validacao/nulo/` | 0 |

- Log consolidado: `validacao/analise/LOG.md`; logs por sessão: `LOG.md` em `v1-*` e `v2-*`.
- Números usados no relatório: `validacao/analise/resultados.json`; figuras na mesma pasta.
- **Relatório com análise e debriefing: `validacao/analise/relatorio-validacao-claude.docx`.**

Principal achado: com modelos que ligam muito os eventos, a detecção por
componentes conectados funde as linhas numa única trama, e a queda da curva
de tramas abertas passa a medir fusão, não fechamento. A métrica e o
pré-registro precisam separar os dois antes da campanha real.

# Rodada de grafos (2026-09-25)

Branch `claude/metrica-fusao-fechamento`. Métrica que separa fusão de
fechamento (emenda 1 do pré-registro), variantes de detecção (emenda 2),
teste de necessidade causal por intervenção e ligações tipadas:

| pasta | conteúdo | chamadas |
|---|---|---|
| `validacao/emenda1/` | reanálise das 24 sessões com a emenda 1 e as variantes de detecção | 0 |
| `validacao/m6-necessidade/` | necessidade causal: diretas 67, indiretas 44, não ligadas 21 (AUC 0,92) | 23 |
| `validacao/v3-ligacoes-tipadas-claude/` | método 7: 8 sessões com tipo e força, pareadas com o método 1 | 177 |
| `validacao/m6b-necessidade-tipadas/` | necessidade × tipo e força declarados | 25 |

- **Relatório: `validacao/analise-grafos/relatorio-grafos.docx`** (com debriefing e o log de todas as sessões no apêndice).
- Log geral de todos os experimentos: `LOG-GERAL.md` (`npm run log-experimentos`); detalhe por sessão no `LOG.md` de cada pasta.
