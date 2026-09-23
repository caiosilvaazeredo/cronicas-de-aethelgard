<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1ouGXGnBW2uLS4WVuvwCYYAfl-WpFALlj

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app **junto com as Netlify Functions**, não apenas o Vite puro:
   `npx netlify dev`
   (`npm run dev` sozinho só sobe o Vite e não expõe `/.netlify/functions/*`;
   como o cliente não fala mais direto com o Gemini - toda chamada passa
   pela function `netlify/functions/gemini.ts` - o modo RPG clássico
   também depende do `netlify dev` agora, não só o modo Investigação.)

## Modo RPG clássico: de atos fixos para arcos causais emergentes

O RPG clássico não usa mais uma estrutura de 3 atos. Em vez disso:

- Cada turno gera um `StoryEvent` (`eventoGerado` na resposta da IA) com
  `causadoPor` apontando para eventos anteriores que o tornaram possível.
- `services/arcos.ts` (lógica pura, sem I/O) detecta componentes conectados
  desse grafo causal a cada turno: cada componente é uma "trama"; início e
  fim são calculados pelo grau causal (entrada/saída zero), nunca
  declarados de antemão. Uma trama só vira candidata a fechamento depois
  de `LIMIAR_ESTABILIDADE` turnos sem novo evento (constante em `App.tsx`).
- O "Mapa da Crônica" (`components/MapaCronica.tsx`, botão 🗺️ durante o
  jogo) mostra o grafo agrupado por trama e permite pedir ao curador
  (`action: "curador"` na function) para narrar o fechamento de uma trama
  estável. Tramas fechadas não reabrem.
- As métricas de convergência (`gameState.metricas`, uma por turno) são
  exportáveis em JSON pelo botão "Exportar métricas" na barra lateral.
- Nenhum prompt do mestre, do curador ou do validador menciona atos,
  fases, estágios ou jornada do herói/heroína - só fatos causais e
  temporais. A restrição é auditável por grep: `grep -rniE '\bato\b|\bfase\b|jornada do her' netlify/functions/gemini.ts`.

A conversa com o Gemini é **sem estado no servidor**: como Netlify
Functions não garantem reuso de instância entre requisições, cada chamada
de `makeChoice` reenvia um recap curto da história recente
(`historiaRecente`) em vez de depender de um objeto de chat guardado em
memória entre turnos.

### Sobre o modelo usado

`netlify/functions/gemini.ts` usa `gemini-flash-lite-latest` para texto.
Em testes, `gemini-flash-latest` e `gemini-3.6-flash` estavam retornando
503 "high demand" com frequência - se isso mudar, `MODELO_TEXTO` é a
única constante que precisa trocar. A geração de imagem
(`gemini-3-pro-image-preview`) já tem fallback automático para uma imagem
de placeholder se a cota da chave for excedida.

## Modo Investigação

O modo "Investigação" (fios narrativos paralelos, tabuleiro + grafo de
auditoria) roda inteiramente via Netlify Functions (`netlify/functions/
investigacao-*.ts`) e usa Firestore para persistir casos, suspeitos,
eventos e sessões. Para rodá-lo (localmente com `netlify dev`, ou em
produção no Netlify), configure estas variáveis de ambiente além de
`GEMINI_API_KEY`:

- `FIREBASE_SERVICE_ACCOUNT_JSON`: o JSON completo (como string) de uma
  service account do projeto Firebase/Firestore, com permissão de
  leitura/escrita no Firestore. Gere em
  Firebase Console → Configurações do Projeto → Contas de Serviço → Gerar
  nova chave privada.
- `FIREBASE_PROJECT_ID`: opcional; se omitido, usa o `project_id` contido
  na própria service account.

Sem essas variáveis, as telas de RPG clássico continuam funcionando
normalmente, mas o botão "Investigação" retornará erro ao tentar gerar um
caso (a função Netlify não conseguirá inicializar o Firestore).

## Modo Cidade Viva: simulador em lote multimodelo

Instrumento dos experimentos da tese: o mundo age sozinho, dia após dia, por
meio de agentes (NPCs e facções); o jogador é só mais um agente, humano ou
sintético; tudo vai para um grafo causal, e as tramas e seus fechamentos são
detectados depois pelo `services/arcos.ts`, sem nenhuma alteração nele.

### Estrutura

```
core/                 TypeScript puro (sem React, sem Netlify, sem I/O de disco)
  llm/                interface ProvedorLLM, provedores gemini, openai, anthropic,
                      compativel-openai e simulado; esquemas zod; registro
  mundo/              tipos, motor de um dia, propagação de relatos
  prompts/            agentes, jogador sintético, relatos, curador, conversa
  experimento/        condições, execução, exportação, reanálise por k e o
                      adaptador do controle de três atos
sim/                  CLIs em Node: rodar, campanha, reanalisar (+ cache, limite de taxa)
mundos/               porto-das-brumas.json e vale-silente.json (variantes de 4, 6 e 8 agentes)
campanhas/            configs de campanha (convergencia-v1, numero-agentes-v1, demo-simulado)
analise/              Python: convergencia.py, amostra_anotacao.py, requirements.txt
tests/                npm test (node:test), tudo com o provedor simulado
pre-registro.md       pré-especificação copiada para cada campanha
components/CidadeViva.tsx + netlify/functions/cidade-viva.ts   modo jogável
```

### Comandos

```bash
npm test                  # todos os testes, sem rede e sem chave
npm run typecheck

# uma sessão com o provedor simulado (sem custo)
npm run sim -- --mundo porto-das-brumas --provedor simulado --dias 40 --semente 1

# uma sessão com modelo real (identificador versionado; aliases são recusados)
GEMINI_API_KEY=... npm run sim -- --mundo porto-das-brumas --provedor gemini --modelo gemini-3.5-flash --dias 40

# controle de três atos pelo mesmo simulador
npm run sim -- --controle --jogador investigador --dias 40

# campanha: sem --confirmar só imprime a estimativa de chamadas e custo
npm run campanha -- --config campanhas/convergencia-v1.json
npm run campanha -- --config campanhas/convergencia-v1.json --confirmar --orcamento-usd 50

# reanálise com k = 2, 3 e 5 e análise estatística
npm run reanalisar -- --campanha saida/convergencia-v1
pip install -r analise/requirements.txt
python analise/convergencia.py saida/convergencia-v1
python analise/amostra_anotacao.py sortear saida/convergencia-v1 --por-estrato 50
python analise/amostra_anotacao.py kappa anotacao_A.csv anotacao_B.csv
```

Outras opções de `sim`: `--estado-tramas informa|nao-informa`, `--agentes 4|6|8`,
`--jogador nenhum|investigador|intrometido|passivo`, `--temperatura`, `--limiar`,
`--provedor-jogador/--modelo-jogador`, `--provedor-curador/--modelo-curador`,
`--sem-cache`, `--falha-simulada sempre|primeira-tentativa|0.2`.

Variáveis de ambiente: `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,
`OPENAI_COMPAT_BASE_URL` (+ opcionais `OPENAI_COMPAT_API_KEY` e
`OPENAI_COMPAT_SAIDA=json_object` para servidores sem json_schema). No modo
jogável: `CIDADE_VIVA_PROVEDOR` (padrão `gemini`) e `CIDADE_VIVA_MODELO`
(padrão `gemini-3.5-flash`).

### Ciclo de um dia (`core/mundo/motor.ts`)

1. **Ações dos agentes**: uma chamada por dia devolve uma ação por agente
   (`AcoesDoDia`). Condição A (`informa`): o prompt traz o resumo das tramas
   abertas (`resumoTramasAbertas`) e os demais eventos recentes; condição B
   (`nao-informa`): só os eventos recentes brutos. "Recentes" são os dos
   últimos 3 dias (`janelaDias`).
2. **Jogador**: humano (modo jogável) ou sintético (investigador, intrometido,
   passivo), que recebe só o que viu e o que lhe contaram. Sem jogador, o passo
   é pulado.
3. **Relatos**: cada agente pode contar a alguém no mesmo local um evento
   recente que conhece e que o outro não conhece (sorteio com a semente); a
   versão contada é gerada pelo modelo dos agentes e guardada ligada ao
   evento real.
4. **Detecção**: `detectarArcos` com o k da sessão e a métrica do dia.
5. **Curadoria**: cada trama que ficou estável no dia é narrada pelo curador
   e passa a `fechada`.

Quem estava no mesmo local ao fim do dia testemunha o que aconteceu lá.

### Multimodelo e reprodutibilidade

- O modelo dos agentes (ações e relatos) é a variável; jogador sintético e
  curador ficam fixos na campanha (`modelosFixos`).
- Toda resposta estruturada usa o modo nativo do provedor, é validada com zod
  e, se inválida, é reenviada com os erros até 2 vezes; persistindo, o turno é
  registrado como falha e a sessão segue. O esquema enviado a todos os
  provedores é o mesmo, sem palavras-chave que algum modo estrito recusa
  (`maxLength`, `minimum`...); essas restrições são checadas pelo zod.
- Identificadores com `latest`, sem versão ou que são alias de snapshot
  datado são recusados (`core/llm/registro.ts`). `fixadoConfirmado: true` na
  referência do modelo é a declaração explícita, registrada no manifesto, de
  que um nome sem data é fixo segundo a documentação.
- Modelos da Anthropic que não aceitam `temperature` (Opus 4.7+, Sonnet 5,
  Fable) rodam sem ela, e isso fica em `parametrosEfetivos` de cada chamada.
- Sementes: a repetição r de todas as células usa `sementeBase + r`
  (comparações pareadas). Cada chamada recebe uma semente derivada, usada
  pelos provedores que a aceitam.
- Retomada: cada sessão é gravada num diretório temporário renomeado no fim;
  ao retomar, sessões com `resumo.json` são puladas.
- Cache de respostas em `.cache-llm/` por hash de (provedor, modelo, prompt,
  temperatura, semente, esquema, maxTokens); `--sem-cache` desliga.
- Espera exponencial em 429/503, limite de chamadas por minuto por provedor
  (`limitesTaxa`) e concorrência limitada (`concorrencia`).
- Orçamento (`orcamentoUsd` ou `--orcamento-usd`) com preços declarados em
  `precos`; a campanha para ao atingi-lo e a sessão em curso é refeita na
  retomada.

### Exportação

```
saida/<campanha>/
  manifesto.json     config, commit do git (e se havia alterações), versões
                     dos SDKs, sementes, modelos pedidos e efetivos, execuções
  pre-registro.md
  <sessao>/
    condicao.json eventos.jsonl relatos.jsonl metricas.jsonl tramas.json
    narracoes.jsonl chamadas.jsonl resumo.json  (+ mestre.jsonl no controle)
```

### Controle de três atos

`core/experimento/controle-tres-atos.ts` roda o modo de três atos da branch
`main` (prompt do mestre copiado literalmente) pelo mesmo simulador, com o
jogador sintético. Adaptações, marcadas no arquivo: a resposta inclui
`eventoGerado` (para existir o grafo) e, no lugar do histórico de chat em
memória do servidor, o prompt recebe o recapitulado das últimas narrações e
os eventos recentes com ids. É o único arquivo com termos de estrutura
narrativa, e fica fora de `core/prompts/`, que é o diretório auditado.

### Modo jogável

Botão "🏘️ Cidade Viva" no menu (`npx netlify dev`). Diário com o que o
jogador viu e ouviu, conversa com quem está no mesmo local, escolha de
local, ação e dos eventos que a motivaram, e o Mapa da Crônica. O estado fica
no cliente e é reenviado a cada dia. Um dia faz várias chamadas de IA (ações,
relatos, curadoria); se passar do tempo limite das Netlify Functions, aumente
o limite no plano ou use um modelo mais rápido.
