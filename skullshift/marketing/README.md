# Material de divulgação (Steam)

- `trailer/` — trailer de ~90 s, 1920×1080 a 60 fps, em português (`_pt_`) e inglês (`_en_`).
  Os arquivos `_leve` são uma cópia mais comprimida (cabem no GitHub); os originais (≈120 MB) não entram no repositório.
- `steam/` — cápsulas nos tamanhos da loja (header, small, main, vertical, library, hero, logo, fundo da página).
- `steam/screenshots/` — 14 capturas de gameplay em 1920×1080, sem texto por cima.
- `tools/` — como tudo foi gerado (com `npx vite --port 5173` no ar):
  - `rec.cjs` grava o jogo quadro a quadro (relógio falso de 16 ms, captura 2560×1440); `clips.cjs <cena...>` são as cenas ensaiadas; `final.sh` grava todas.
  - `cards.html` + `cards.cjs`/`chips.cjs`: cartelas de título e avatar (PT/EN) na fonte do jogo.
  - `audio.cjs` grava a música do próprio jogo em tempo real.
  - `build.py pt|en` monta o trailer com ffmpeg. `caps.html` + `caps.cjs` geram as cápsulas.
