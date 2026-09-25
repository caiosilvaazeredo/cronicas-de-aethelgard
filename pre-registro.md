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

### Emenda 1 (2026-09-25): fusão separada de fechamento

**Motivação.** A rodada de validação com seis modelos Claude (24 sessões de 12 dias,
em `experimentos/validacao/`, anterior a qualquer campanha real) mostrou que, com
modelos que ligam muitos eventos (1,3 a 2,4 ligações por evento), as linhas de
acontecimento que surgem nos primeiros dias se **fundem** num único componente
conectado. A curva de tramas abertas A(d) cai, mas por fusão, não por fechamento.
A definição de convergência da seção 2 foi satisfeita em 15 de 16 sessões, inclusive
em sessões que nunca fecharam trama nenhuma. Sem esta emenda, o teste principal da
hipótese ficaria confundido.

**O que muda.** O texto original das seções 2 e 3 permanece como está e continua
sendo calculado e reportado, como análise secundária, para comparabilidade. Passam a
valer, como análise principal, as definições abaixo, calculadas por
`services/linhagem.ts` sobre a mesma detecção do `services/arcos.ts` (que não muda):

- **Nascimento**: surge uma trama cujos eventos não pertenciam a nenhuma trama no dia
  anterior. Um id novo que herda eventos de tramas anteriores (renomeação) não é
  nascimento.
- **Fusão**: uma trama deixa de existir porque seus eventos passaram a pertencer a
  outra trama.
- **Fechamento por estabilidade**: a trama fica sem consequência por k dias
  (status estável) pela primeira vez.

**Nova métrica principal (substitui a da seção 3 como principal):** proporção de
tramas **fechadas por estabilidade** sobre tramas **nascidas**
(`linhagem.proporcaoFechadasPorEstabilidade` em `resumo.json`). Métricas associadas,
sempre reportadas junto: proporção de tramas absorvidas por fusão antes de fechar
(`proporcaoFundidas`) e fração das saídas que ocorreram por fechamento
(`fracaoSaidaPorFechamento`).

**Nova definição de convergência (substitui a da seção 2 como principal):** a sessão
converge se, no último terço (dias ⌈2D/3⌉ a D):

1. a curva de tramas abertas não sobe (inclinação da regressão linear ≤ 0);
2. ao menos uma trama fecha por estabilidade; e
3. as tramas que fecham por estabilidade são ao menos tantas quanto as absorvidas
   por fusão.

**Curvas reportadas por condição:** A(d), razão de amarração R(d), nascidas
acumuladas, fechadas por estabilidade acumuladas e absorvidas por fusão acumuladas,
todas com IC de 95% por bootstrap.

**O que não muda.** Condições, número de repetições, coleta, testes estatísticos
(Mann-Whitney com correção de Holm, curvas com IC por bootstrap) e reanálise com
k = 2, 3 e 5 seguem as seções 4 a 6, agora aplicados às métricas desta emenda.

**Momento.** Emenda feita antes da primeira campanha com modelo real. As sessões de
validação que a motivaram não entram na análise confirmatória.

### Emenda 2 (2026-09-25): análises de sensibilidade da detecção e validação causal

**Motivação.** A reanálise da validação com a emenda 1 mostrou que parte
relevante das fusões é feita por uma única ligação entre duas linhas: nas 24
sessões houve 56 pontes de fusão, e cortá-las elevou a proporção de tramas
fechadas por estabilidade de 0,08 para 0,33. Um teste de necessidade causal
por intervenção (`sim/validacao/necessidade.ts`) mostrou que as ligações
declaradas são causalmente necessárias segundo um juiz independente
(necessidade 67 para ligações diretas, 44 para indiretas, 21 para pares não
ligados), mas que o grau de saída de um evento não prevê sua necessidade
(Spearman 0,09).

**O que muda.** Nada na análise principal (emenda 1). Passam a ser reportadas,
como **análises de sensibilidade pré-especificadas**, as mesmas métricas da
emenda 1 recalculadas com as variantes de detecção de `services/grafo.ts`, sem
alterar `services/arcos.ts`:

1. `sem-pontes-de-fusao`: remove as pontes cujos dois lados têm 3 ou mais
   eventos (uma única ligação unindo duas linhas);
2. `fortes`: considera só ligações tipadas de força 2 ou 3 que não sejam do
   tipo "lembrou" (aplicável só às campanhas com `ligacoesTipadas`);
3. `janela3`: ligações que atravessam mais de 3 dias não unem tramas. Com a
   janela de eventos recentes do prompt em 3 dias (`janelaDias`), esta variante
   é inócua por construção e só será reportada se a janela do prompt mudar.

A conclusão principal só será considerada robusta se a direção dos efeitos for
a mesma na detecção completa e em `sem-pontes-de-fusao`.

**Validação causal.** Em cada campanha real, uma amostra de ligações será
submetida ao teste de necessidade por intervenção (ao menos 30 pares diretos,
30 indiretos e 30 não ligados por modelo gerador), com juiz fora do conjunto
de geradores, como complemento (não substituto) da anotação humana prevista na
seção 6.

**Ligações tipadas.** Se a campanha real usar `ligacoesTipadas`, isso vale para
todas as condições, e o efeito de pedir tipo e força sobre a densidade de
ligações será medido primeiro numa rodada de validação pareada (método 7 em
`experimentos/validacao/`).

**Momento.** Emenda feita antes da primeira campanha com modelo real.
