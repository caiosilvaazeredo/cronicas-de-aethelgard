# Pré-registro: convergência de tramas na Cidade Viva

- **Versão:** 0.1 (RASCUNHO, a revisar e datar em definitivo pelo Caio antes da primeira campanha com modelo real)
- **Data do rascunho:** 2026-09-23
- **Autor:** Caio Silva Azeredo (PESC/COPPE/UFRJ), orientador Prof. Geraldo Xexéo
- **Instrumento:** modo Cidade Viva (`core/`, `sim/`), commit registrado no `manifesto.json` de cada campanha

O simulador copia este arquivo para cada campanha (`saida/<campanha>/pre-registro.md`).
Depois da primeira campanha real, este texto **não é sobrescrito**: qualquer mudança
entra como emenda datada na seção "Emendas", no fim do arquivo.

## 1. Hipótese

Uma história gerada livremente, sem arcabouço narrativo fixo, converge: tramas que
surgem tendem a se fechar, e início, meio e fim aparecem como propriedades do grafo
causal, não como fases declaradas antes da geração.

## 2. Definição de convergência

Numa sessão de D dias, seja A(d) o número de tramas abertas no dia d
(`componentesAbertos`) e R(d) a razão de amarração (`razaoAmarracao`, arestas causais
válidas sobre total de eventos). A sessão **converge** se, no último terço da sessão
(d de ⌈2D/3⌉ a D):

1. a curva de tramas abertas para de subir: a inclinação da regressão linear de A(d)
   sobre d é ≤ 0; e
2. a razão de amarração sobe: a inclinação da regressão linear de R(d) sobre d é > 0.

## 3. Métrica principal

**Proporção de tramas fechadas sobre tramas surgidas** ao fim da sessão
(`proporcaoTramasFechadas` em `resumo.json`). "Fechada" é toda trama cujo status
não é `aberta` (estável ou já narrada pelo curador) segundo `services/arcos.ts`.

Métricas secundárias: curvas A(d) e R(d); número de eventos fundadores; taxa de falha
de estrutura por modelo; referências `causadoPor` descartadas por sessão.

## 4. Condições

| Dimensão | Valores |
|---|---|
| Modelo dos agentes (variável principal) | lista de identificadores versionados, declarada na config da campanha |
| Estado das tramas no prompt | informa (condição A) · não informa (condição B) |
| Número de agentes | 4 · 6 · 8 |
| Jogador | nenhum · sintético (investigador, intrometido, passivo) |
| Mundo | porto-das-brumas · vale-silente |
| Controle | modo três atos existente, rodado pelo mesmo simulador com o jogador sintético |

Jogador sintético e curador ficam **fixos** num único modelo de referência em todas as
condições. O limiar de estabilidade k não é condição de geração (a geração usa k = 3);
a análise reaplica k = 2, 3 e 5 sobre as mesmas sessões (`npm run reanalisar`).

## 5. Coleta

- 40 dias por sessão; 30 repetições por célula.
- Temperatura fixa e declarada na config da campanha (padrão 0,7). Para modelos cuja
  API não aceita temperatura, o fato é registrado em `chamadas.jsonl`
  (`parametrosEfetivos.temperaturaOmitida`).
- Semente registrada por sessão; a repetição r de todas as células usa a mesma semente
  (sementeBase + r), de modo que as comparações entre condições são pareadas.
- Nenhuma sessão é descartada. Falhas de estrutura e erros de chamada são exportados e
  analisados como dado. Uma sessão só é refeita se foi interrompida antes de terminar
  (não gravada).

## 6. Análise prevista

- Curvas médias de A(d) e R(d) por condição, com intervalo de confiança de 95%
  (bootstrap sobre sessões, 10.000 reamostragens).
- Comparação da métrica principal entre condições com teste de Mann-Whitney U
  (bicaudal), para cada par relevante: A vs. B; cada modelo vs. os demais; 4 vs. 6 vs. 8
  agentes; com vs. sem jogador; cada condição vs. controle de três atos.
- Correção para comparações múltiplas por Holm-Bonferroni; nível α = 0,05.
- Tamanho de efeito: correlação bisserial de postos (rank-biserial).
- Proporção de sessões que convergem (definição da seção 2) por condição.
- Todas as análises repetidas para k = 2, 3 e 5.
- Validação do autorrelato causal: amostra estratificada de ligações `causadoPor` (por
  modelo e por mundo) anotada por dois anotadores humanos; concordância por kappa de
  Cohen (`analise/amostra_anotacao.py`).

## Emendas

(nenhuma)
