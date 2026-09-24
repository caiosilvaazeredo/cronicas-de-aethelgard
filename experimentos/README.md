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
