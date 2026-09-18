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
