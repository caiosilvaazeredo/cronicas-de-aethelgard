# Skullshift

Jogo de duelo 2D de ação, feito com Phaser 3, TypeScript e Vite. Você começa como um esqueleto e corre até o fim do mapa. Qualquer golpe mata. Pegue o item de outro personagem para se transformar nele.

## Como rodar

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Importe os sprites (eles não ficam no Git, veja **Sprites** abaixo):

   ```bash
   scripts/import-assets.sh caminho/Tiny_Swords_Enemy_Pack.zip caminho/Tiny_Swords_Free_Pack.zip
   ```

3. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

O comando `npm run build` gera a versão final em `dist/`. Os caminhos são relativos, então o build pode ser hospedado na web ou empacotado com Electron para a Steam.

## Modos

- **História (1 jogador):** atravesse a fase 1 da esquerda para a direita enfrentando os inimigos. Ao morrer, você volta ao último checkpoint, que é a última plataforma em que pisou.
- **Versus (2 jogadores locais):** o P1 (esqueleto) corre para a direita e o P2 (lagarto) para a esquerda. Quem mata ganha a vez de avançar. O outro renasce à frente dele e a câmera segue quem tem a vez. Vence quem chegar ao fim do mapa do seu lado.

## Controles

| Ação | História | Versus P1 | Versus P2 | Controle |
|---|---|---|---|---|
| Mover | A/D ou ←/→ | A/D | ←/→ | Analógico ou direcional |
| Pular | W, ↑ ou Espaço | W | ↑ | A |
| Defender | S ou ↓ | S | ↓ | B, LB ou RB |
| Atacar | F ou J | F | Enter ou 0 (teclado numérico) | X ou Y |

Com um oponente por perto, o personagem fica virado para ele. Segurar para **trás** faz o personagem andar devagar com o escudo levantado, como em jogo de luta. O escudo bloqueia golpes e projéteis que vêm pela frente.

## Transformações (fase 1, até 3 por mapa)

| Item | Vira | Ataque |
|---|---|---|
| Osso | Gnoll | Arremessa ossos |
| Arpão | Tubarão-Arpão | Arremessa arpão (rápido) |
| Lança | Goblin Lanceiro | Golpe de lança de longo alcance (frente e trás) |

Os itens aparecem no mapa e também caem de inimigos ou jogadores transformados quando eles morrem. Ao morrer, você volta ao personagem base. O avatar do HUD acompanha a transformação.

## Estrutura

- `src/config.ts` — medidas do mundo e constantes de física.
- `src/game/characters.ts` — dados de cada personagem: quadros, velocidade, golpe ou projétil e item que solta.
- `src/game/level.ts` — layout das fases em tiles. Novas fases entram aqui.
- `src/game/Fighter.ts` — estados, ataque, defesa, morte e transformação.
- `src/game/ai.ts` — IA dos inimigos.
- `src/game/Hud.ts` — avatares, indicador "VAI" e barra de progresso.
- `src/scenes/` — carregamento, menu e partida.

## Sprites

Os sprites vêm do pacote **Tiny Swords** de Pixel Frog (Free Pack e Enemy Pack). A licença permite usar os sprites em projetos, inclusive comerciais, mas não permite redistribuir os arquivos. Por isso `public/assets/` está no `.gitignore` e os sprites são importados pelo script.
