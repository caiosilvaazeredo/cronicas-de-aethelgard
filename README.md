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
3. Run the app:
   `npm run dev`

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
