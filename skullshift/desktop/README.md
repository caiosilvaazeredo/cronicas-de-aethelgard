# Skullshift para computador (Steam)

Esta pasta empacota o build da web num app de computador com **Electron** e liga a **Steam**
com **steamworks.js**. O mesmo build roda na web, no celular (PWA) e aqui; o jogo descobre que
está no computador pela ponte `window.skullshiftSteam` (ver `src/game/platform.ts`).

## Rodar

```bash
cd skullshift && npm run build
cd desktop && npm install
npm start
```

`npm start` copia `../dist` para `desktop/game` e abre a janela. Sem a Steam aberta o jogo roda
normalmente, só sem conquistas e sem o nome da conta.

## Gerar os executáveis

```bash
npm run dist       # Windows e Linux (pasta pronta para subir no SteamPipe)
npm run dist:mac   # macOS (precisa rodar num Mac)
```

A saída fica em `desktop/dist/`. Suba a pasta de cada sistema como um depot no SteamPipe.

## O que a ponte faz

| No jogo | Na Steam |
|---|---|
| Conquista ganha (`announceAchievements`) | `achievement.activate('ACH_<ID>')` |
| Abrir o jogo com conquistas já no save | repassa todas uma vez por sessão |
| Nome do jogador "STEAM" na tela de controles | `localplayer.getName()` |
| Ajustes → Tela → Resolução da janela | redimensiona a janela (fora da tela cheia) |
| Botão "✕ SAIR" no menu inicial | fecha o app |
| F11 | tela cheia |
| Shift+Tab | overlay da Steam |

## Antes de publicar

1. Troque `480` em `steam_appid.txt` pelo App ID do jogo (480 é o Spacewar, o app de teste da Valve).
2. Cadastre as conquistas no painel do Steamworks com os nomes de API de `achievements.csv`
   (gerado por `node scripts/steam-achievements.cjs`, na pasta do jogo).
3. Ícones: o build da web já tem `icons/icon-512.png`; para Windows, gere um `.ico` e aponte em `build.win.icon`.
4. Os sprites do Tiny Swords permitem uso comercial, mas não redistribuir os arquivos soltos:
   o empacotamento em `asar` atende a isso.
